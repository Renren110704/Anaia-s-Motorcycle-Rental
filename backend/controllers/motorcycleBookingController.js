import mongoose from "mongoose";
import MotorcycleBooking from "../models/motorcycleBookingModel.js";
import Motorcycle from "../models/motorcycleModel.js";
import InspectionMatrixSetting from "../models/inspectionMatrixSettingModel.js";
import LocationSnapshot from "../models/locationSnapshotModel.js";
import { sendBookingReceiptEmail } from "../utils/emailService.js";
import { verifyDigitalReceipt } from "../utils/receiptVerifier.js";
import { createSystemLog } from "../utils/systemLogService.js";
import { evaluateLoyaltyAfterCompletion } from "../services/loyaltyService.js";
import User from "../models/userModel.js";
import { generateRentalAgreementPDF } from "../utils/rentalAgreementPDF.js";
import { v2 as cloudinary } from "cloudinary";
import {
  notifyBookingCreated,
  notifyBookingStatusChange,
  notifyPaymentConfirmed,
  notifyPenaltyRequired,
  notifyPenaltySettled,
  notifyVehicleCleared,
  notifyProofReuploadRequested,
} from "../services/notificationService.js";
import { TRACCAR_BASE_URL, buildTraccarHeaders } from "../config/traccar.js";

// Fetch current Traccar stats for a device and save as booking baseline
async function captureBookingBaseline(bookingId, motorcycleDbId) {
  try {
    const moto =
      await Motorcycle.findById(motorcycleDbId).select("traccarDeviceId");
    const deviceId = moto?.traccarDeviceId?.trim();
    if (!deviceId) return;

    const devRes = await fetch(
      `${TRACCAR_BASE_URL}/api/devices?uniqueId=${encodeURIComponent(deviceId)}&limit=1`,
      { headers: buildTraccarHeaders(), cache: "no-store" },
    );
    const devJson = await devRes.json().catch(() => []);
    const device = Array.isArray(devJson)
      ? devJson[0]
      : devJson?.devices?.[0] || null;
    if (!device) return;

    const posRes = await fetch(
      `${TRACCAR_BASE_URL}/api/positions?deviceId=${device.id}&limit=1`,
      { headers: buildTraccarHeaders(), cache: "no-store" },
    );
    const positions = await posRes.json().catch(() => []);
    const pos = Array.isArray(positions) ? positions[0] : null;
    if (!pos) return;

    const totalDistanceKm = Number(
      pos.attributes?.totalDistance ? pos.attributes.totalDistance / 1000 : 0,
    );
    const stopsMade = Number(pos.attributes?.stops || 0);

    await MotorcycleBooking.findByIdAndUpdate(bookingId, {
      $set: {
        trackingBaseline: {
          totalDistanceKm,
          stopsMade,
          capturedAt: new Date(),
        },
      },
    });
  } catch {
    // best-effort — don't break the status update flow
  }
}

// Resolve numeric Traccar device ID from a uniqueId string
async function resolveTraccarDeviceId(uniqueId) {
  const res = await fetch(
    `${TRACCAR_BASE_URL}/api/devices?uniqueId=${encodeURIComponent(uniqueId)}&limit=1`,
    { headers: buildTraccarHeaders(), cache: "no-store" },
  );
  const json = await res.json().catch(() => []);
  const device = Array.isArray(json) ? json[0] : json?.devices?.[0] || null;
  return device ?? null;
}

// Build a trackingSummary object using Traccar's summary report API
// from = ISO string of baseline capture time, to = ISO string of completion time
async function fetchTraccarSummary(traccarDeviceId, from, to) {
  const url =
    `${TRACCAR_BASE_URL}/api/reports/summary` +
    `?deviceId=${traccarDeviceId}` +
    `&from=${encodeURIComponent(from)}` +
    `&to=${encodeURIComponent(to)}`;
  const res = await fetch(url, {
    headers: { ...buildTraccarHeaders(), Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = await res.json().catch(() => null);
  const row = Array.isArray(json) ? json[0] : null;
  if (!row) return null;
  return {
    totalDistanceKm: Number(row.distance ?? 0) / 1000,
    avgSpeedKmh: Number(row.averageSpeed ?? 0),
    maxSpeedKmh: Number(row.maxSpeed ?? 0),
    stopsMade: Number(row.engineHours != null ? 0 : 0), // Traccar summary has no stop count; default 0
    lastUpdatedAt: new Date(),
  };
}

// Fetch final Traccar stats at booking completion and save as trackingSummary
async function captureTrackingSummaryOnCompletion(bookingId, motorcycleDbId) {
  try {
    const booking = await MotorcycleBooking.findById(bookingId)
      .select("trackingBaseline")
      .lean();
    const baseline = booking?.trackingBaseline;

    const moto =
      await Motorcycle.findById(motorcycleDbId).select("traccarDeviceId");
    const uniqueId = moto?.traccarDeviceId?.trim();
    if (!uniqueId) return;

    const device = await resolveTraccarDeviceId(uniqueId);
    if (!device) return;

    const from = baseline?.capturedAt
      ? new Date(baseline.capturedAt).toISOString()
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // fallback: 7 days ago
    const to = new Date().toISOString();

    const summary = await fetchTraccarSummary(device.id, from, to);
    if (!summary) return;

    await MotorcycleBooking.findByIdAndUpdate(bookingId, {
      $set: { trackingSummary: summary },
    });
    console.log(
      `[Tracking] Saved summary for booking ${bookingId}: ${summary.totalDistanceKm.toFixed(2)} km`,
    );
  } catch (err) {
    console.error(
      "[Tracking] captureTrackingSummaryOnCompletion error:",
      err.message,
    );
  }
}

import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");
const BLOCKING_STATUSES = [
  "pending",
  "pending_reservation",
  "pending_full_payment",
  "active",
  "inspection",
];
const MAX_RETRIES = 3;
const REQUIRED_DOWNPAYMENT = 200;
const CHECKOUT_LOCK_MINUTES = Number(process.env.CHECKOUT_LOCK_MINUTES || 10);
const CHECKOUT_LOCK_MS = CHECKOUT_LOCK_MINUTES * 60 * 1000;
const RECEIPT_VERIFY_TIMEOUT_MS = Number(
  process.env.RECEIPT_VERIFY_TIMEOUT_MS || 4000,
);
const CLEARANCE_STATUSES = [
  "pending_inspection",
  "cleared",
  "penalty_required",
];

// ── Standardized return-inspection penalty / repair matrix ────────────────
// Default per-item rates. Admins can override any non-"custom" rate via the
// InspectionMatrixSetting collection (see getInspectionMatrix /
// updateInspectionMatrixRates below); these defaults are the fallback used
// whenever no override — or no DB connection yet — is available. The client
// sends which items were selected (and quantities/custom amounts where
// applicable); the server always recomputes each line and the total against
// the current effective rates so a tampered client payload can't change the
// charged amount.
//
// `repair: true` marks the items that represent actual vehicle repair costs
// (as opposed to soft/behavioral penalties like Dirty, Late Return, or
// Geofence Exceeded) — used by analytics to split "Expenses (Repairs)" out
// from general "Penalties".
const INSPECTION_MATRIX_DEFAULTS = {
  dirty: { label: "Dirty", rate: 200, kind: "flat", repair: false },
  minor_scratches: {
    label: "Minor Scratches",
    rate: 500,
    kind: "flat",
    repair: true,
  },
  major_damage: {
    label: "Major Damage",
    kind: "custom",
    repair: true,
  }, // actual repair cost, entered per-incident
  tire_damage: {
    label: "Tire worn or damaged",
    rate: 500,
    kind: "per_unit",
    repair: true,
  },
  mirror_damage: {
    label: "Mirror missing or broken",
    rate: 300,
    kind: "per_unit",
    repair: true,
  },
  helmet_damage: {
    label: "Helmet missing or damaged",
    rate: 1000,
    kind: "flat",
    repair: true,
  },
  late_return: {
    label: "Late Return",
    rate: 100,
    kind: "per_hour",
    repair: false,
  },
  geofence_exceeded: {
    label: "Geofence Exceeded",
    kind: "custom",
    repair: false,
  },
};

// Keys whose rate is meaningfully customizable (i.e. not "custom" kind,
// which is priced per-incident by the admin at inspection time).
const CUSTOMIZABLE_MATRIX_KEYS = Object.keys(INSPECTION_MATRIX_DEFAULTS).filter(
  (key) => INSPECTION_MATRIX_DEFAULTS[key].kind !== "custom",
);

// There is always a single settings document. Fetches it and returns the
// effective matrix — defaults merged with any admin overrides. Falls back
// to pure defaults if the settings doc doesn't exist yet or the DB read
// fails, so booking creation/inspection flows never break on this.
const getEffectiveInspectionMatrix = async () => {
  let doc;
  try {
    doc = await InspectionMatrixSetting.findOne();
  } catch {
    doc = null;
  }
  const overrides = doc?.rates instanceof Map ? doc.rates : new Map();

  const matrix = {};
  for (const [key, def] of Object.entries(INSPECTION_MATRIX_DEFAULTS)) {
    if (def.kind === "custom") {
      matrix[key] = { ...def };
      continue;
    }
    const override = overrides.get(key);
    const rate =
      typeof override === "number" && Number.isFinite(override) && override >= 0
        ? override
        : def.rate;
    matrix[key] = { ...def, rate };
  }
  return matrix;
};

// Recomputes a trusted violations array + total from raw client input.
// `rawViolations` is expected to be an array of
// { key, quantity?, customAmount? } objects (already JSON-parsed).
// `matrix` should be the effective (defaults + admin overrides) matrix,
// fetched fresh via getEffectiveInspectionMatrix() before calling this, so
// the charged amount always reflects the currently configured rates.
const computeViolations = (
  rawViolations,
  matrix = INSPECTION_MATRIX_DEFAULTS,
) => {
  if (!Array.isArray(rawViolations)) return { violations: [], total: 0 };

  const violations = [];
  let total = 0;

  for (const raw of rawViolations) {
    const key = raw?.key;
    const def = key && matrix[key];
    if (!def) continue;

    let unitAmount = 0;
    let quantity = 1;
    let amount = 0;

    if (def.kind === "flat") {
      unitAmount = def.rate;
      amount = def.rate;
    } else if (def.kind === "per_unit" || def.kind === "per_hour") {
      quantity = Math.max(1, Math.floor(Number(raw?.quantity)) || 1);
      unitAmount = def.rate;
      amount = def.rate * quantity;
    } else if (def.kind === "custom") {
      const custom = Number(raw?.customAmount);
      amount = Number.isFinite(custom) && custom > 0 ? custom : 0;
      unitAmount = amount;
    }

    if (amount <= 0 && def.kind === "custom") continue; // skip unpriced custom items

    violations.push({ key, label: def.label, unitAmount, quantity, amount });
    total += amount;
  }

  return { violations, total };
};

// ── GET /api/motorcycle-bookings/inspection-matrix ─────────────────────────
// Returns the effective (defaults + admin overrides) matrix so the admin UI
// can render current rates and let staff edit them.
export const getInspectionMatrix = async (req, res, next) => {
  try {
    const matrix = await getEffectiveInspectionMatrix();
    res.json({ matrix });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/motorcycle-bookings/inspection-matrix ──────────────────────────
// Admin-only. Body: { rates: { [key]: number, ... } }. Only accepts keys that
// exist in INSPECTION_MATRIX_DEFAULTS and are not "custom" kind; silently
// ignores anything else so a bad payload can't inject new violation types.
export const updateInspectionMatrixRates = async (req, res, next) => {
  try {
    const rawRates = req.body?.rates;
    if (!rawRates || typeof rawRates !== "object" || Array.isArray(rawRates)) {
      return res.status(400).json({ message: "rates object is required." });
    }

    const sanitized = {};
    for (const key of CUSTOMIZABLE_MATRIX_KEYS) {
      if (!(key in rawRates)) continue;
      const value = Number(rawRates[key]);
      if (!Number.isFinite(value) || value < 0) {
        return res.status(400).json({
          message: `Invalid rate for "${key}" — must be a non-negative number.`,
        });
      }
      sanitized[key] = value;
    }

    if (!Object.keys(sanitized).length) {
      return res.status(400).json({ message: "No valid rates provided." });
    }

    const doc =
      (await InspectionMatrixSetting.findOne()) ||
      new InspectionMatrixSetting();
    for (const [key, value] of Object.entries(sanitized)) {
      doc.rates.set(key, value);
    }
    doc.updatedBy = req.user?._id || req.user?.id || null;
    await doc.save();

    const matrix = await getEffectiveInspectionMatrix();
    res.json({ message: "Inspection matrix rates updated.", matrix });
  } catch (err) {
    next(err);
  }
};
const INSPECTION_VEHICLE_STATUSES = [
  "inspection",
  "under_review",
  "repair_needed",
  "available",
  "maintenance",
  "pending",
  "rented",
];

// ── Cloudinary Configuration ──────────────────────────────────────────
const CLOUDINARY_FOLDER =
  process.env.CLOUDINARY_UPLOAD_FOLDER || "anaiasmotorcyclerental";
const CLOUDINARY_PAYMENT_PROOF_FOLDER = "paymentproof";
const CLOUDINARY_RETURN_INSPECTION_FOLDER = "returninspection";
const CLOUDINARY_REPAIR_ESTIMATE_FOLDER = "repair-estimates";
const CLOUDINARY_ENABLED = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET,
);

if (CLOUDINARY_ENABLED) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const normalizeUrl = (value = "") => {
  const normalized = String(value || "").trim();
  return normalized.replace(/^http:\/\//i, "https://");
};

const uploadFileToCloudinary = async (
  filePath,
  targetFolder = CLOUDINARY_FOLDER,
) => {
  if (!filePath || !CLOUDINARY_ENABLED) {
    console.error(
      "[CLOUDINARY] Upload skipped - filePath:",
      !!filePath,
      "enabled:",
      CLOUDINARY_ENABLED,
    );
    return null;
  }

  const MAX_RETRIES = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(
        `[CLOUDINARY] Attempt ${attempt}/${MAX_RETRIES}: uploading ${filePath} to folder: ${targetFolder}`,
      );
      const result = await cloudinary.uploader.upload(filePath, {
        folder: targetFolder,
        resource_type: "image",
        use_filename: true,
        unique_filename: true,
        overwrite: false,
        quality: "auto",
        fetch_format: "auto",
        timeout: 30000,
      });

      const url = normalizeUrl(
        result.secure_url || result.url || result.secureUrl || "",
      );
      if (!url) {
        console.error("[CLOUDINARY] No URL in response:", result);
        lastError = new Error("No URL in Cloudinary response");
        if (attempt < MAX_RETRIES) continue;
        return null;
      }

      console.log("[CLOUDINARY] Success on attempt", attempt, ":", url);
      return url;
    } catch (err) {
      lastError = err;
      console.error(
        `[CLOUDINARY] Attempt ${attempt} failed:`,
        err?.message || err,
      );
      if (attempt < MAX_RETRIES) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  console.error("[CLOUDINARY] Failed after all retries:", lastError?.message);
  return null;
};

const getUploadedPaymentProofUrl = async (file) => {
  if (!file) {
    console.error("[PAYMENTPROOF] No file provided");
    return null;
  }

  const absolutePath = path.resolve(file.path);
  console.log("[PAYMENTPROOF] Resolving file:", absolutePath);

  const exists = fs.existsSync(absolutePath);
  if (!exists) {
    console.error("[PAYMENTPROOF] File does not exist:", absolutePath);
    return null;
  }

  console.log(
    "[PAYMENTPROOF] File exists, uploading to Cloudinary folder:",
    CLOUDINARY_PAYMENT_PROOF_FOLDER,
  );
  const cloudUrl = await uploadFileToCloudinary(
    absolutePath,
    CLOUDINARY_PAYMENT_PROOF_FOLDER,
  );

  if (cloudUrl) {
    console.log("[PAYMENTPROOF] Got Cloudinary URL:", cloudUrl);
    return cloudUrl;
  }

  console.error(
    "[PAYMENTPROOF] Cloudinary upload failed, using local fallback",
  );
  const filename = path.basename(absolutePath);
  const localPath = `/uploads/${filename}`;
  console.log("[PAYMENTPROOF] Returning local path:", localPath);
  return localPath;
};

const getUploadedInspectionUrls = async (
  files = [],
  targetFolder = CLOUDINARY_RETURN_INSPECTION_FOLDER,
) => {
  if (!Array.isArray(files) || files.length === 0) return [];

  const urls = [];
  for (const file of files) {
    const absolutePath = path.resolve(file.path);
    const cloudUrl = await uploadFileToCloudinary(absolutePath, targetFolder);
    if (cloudUrl) {
      urls.push(cloudUrl);
    } else {
      const filename = path.basename(absolutePath);
      urls.push(`/uploads/${filename}`);
    }
  }
  return urls;
};

const tryParseJSON = (v) => {
  if (typeof v !== "string") return v;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
};

const buildMotorcycleSummary = (src = {}) => {
  const id = src._id?.toString?.() || src.id || null;

  return {
    id,
    unitId: src.unitId || "",
    make: src.make,
    model: src.model || "",
    year: src.year ? Number(src.year) : null,
    dailyRate: src.dailyRate ? Number(src.dailyRate) : 0,
    engineSize: src.engineSize ? Number(src.engineSize) : 150,
    transmission: src.transmission,
    fuelType: src.fuelType,
    mileage: src.mileage ? Number(src.mileage) : 0,
    hasABS: src.hasABS || false,
    hasHelmet: src.hasHelmet !== false,
    image: src.image || src.motorcycleImage || "",
  };
};

const deleteLocalFileIfPresent = (filePath) => {
  if (!filePath) return;
  const filename = filePath.replace(/^\/uploads\//, "");
  const full = path.join(UPLOADS_DIR, filename);
  fs.unlink(full, (err) => {
    if (err) console.warn("Failed to delete file: ", full, err);
  });
};

const getUploadedImagePath = (file) => {
  if (!file) return "";
  return (
    file.path?.trim() ||
    file.secure_url?.trim() ||
    file.url?.trim() ||
    file.secureUrl?.trim() ||
    ""
  );
};

const retryOperation = async (operation, maxRetries = MAX_RETRIES) => {
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;
      if (err.code === 112 || err.message?.includes("Write conflict")) {
        await new Promise((resolve) =>
          setTimeout(resolve, 100 * Math.pow(2, attempt)),
        );
        continue;
      }
      throw err;
    }
  }
  throw lastError;
};

const getRequesterUserId = (req) =>
  (req?.user?._id || req?.user?.id || "").toString();

const getLockWindow = (now = new Date()) => {
  const expiresAt = new Date(now.getTime() + CHECKOUT_LOCK_MS);
  return { now, expiresAt };
};

const isCheckoutLockActive = (motorcycle, now = new Date()) => {
  const lock = motorcycle?.checkoutLock;
  if (!lock?.expiresAt) return false;
  const expiresAt = new Date(lock.expiresAt);
  if (Number.isNaN(expiresAt.getTime())) return false;
  return expiresAt > now;
};

const startOfLocalDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const addMonths = (d, months) => {
  const x = new Date(d);
  x.setMonth(x.getMonth() + months);
  return x;
};

const combineDateAndTime = (dateValue, timeValue) => {
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime()) || typeof timeValue !== "string") return null;
  const [hourStr, minuteStr] = timeValue.split(":");
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  d.setHours(hour, minute, 0, 0);
  return d;
};

const hasMinimumRentalDuration = (
  pickupDate,
  pickupTime,
  returnDate,
  returnTime,
  minimumHours = 24,
) => {
  const pickupAt = combineDateAndTime(pickupDate, pickupTime);
  const returnAt = combineDateAndTime(returnDate, returnTime);
  if (!pickupAt || !returnAt) return false;
  return (
    returnAt.getTime() - pickupAt.getTime() >= minimumHours * 60 * 60 * 1000
  );
};

const computeRentalDays = (pickupDate, pickupTime, returnDate, returnTime) => {
  const pickupAt = combineDateAndTime(pickupDate, pickupTime);
  const returnAt = combineDateAndTime(returnDate, returnTime);
  if (!pickupAt || !returnAt) return 0;
  const diffMs = returnAt.getTime() - pickupAt.getTime();
  if (diffMs <= 0) return 0;
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
};

const buildBookingLabel = (booking) => {
  const make = booking?.motorcycle?.make || "";
  const model = booking?.motorcycle?.model || "";
  const customer = booking?.customer || "Unknown customer";
  return `${customer} - ${`${make} ${model}`.trim() || "Motorcycle"}`;
};

const pendingReceiptVerification = (reason) => ({
  status: "pending",
  score: 0,
  provider: "gcash-ocr-timeout",
  reasons: [reason],
  checkedAt: new Date(),
});

const verifyReceiptWithTimeout = async (payload) => {
  const timeoutPromise = new Promise((resolve) => {
    setTimeout(() => {
      resolve(
        pendingReceiptVerification(
          "Receipt verification deferred due to processing timeout.",
        ),
      );
    }, RECEIPT_VERIFY_TIMEOUT_MS);
  });

  try {
    const result = await Promise.race([
      verifyDigitalReceipt(payload),
      timeoutPromise,
    ]);

    if (result?.status === "needs_review") {
      return {
        ...result,
        status: "pending",
      };
    }

    return (
      result || pendingReceiptVerification("Receipt verification deferred.")
    );
  } catch {
    return pendingReceiptVerification(
      "Receipt verification failed temporarily; queued for manual review.",
    );
  }
};

// Any active booking = rented, regardless of date
// Any pending booking (reservation/full payment) = pending
const updateMotorcycleStatus = async (motorcycleId) => {
  try {
    const motorcycle = await Motorcycle.findById(motorcycleId);
    if (!motorcycle) {
      console.log(`Motorcycle ${motorcycleId} not found`);
      return;
    }

    const bookings = motorcycle.bookings || [];

    const hasActiveBooking = bookings.some(
      (b) => (b.status || "").toLowerCase() === "active",
    );

    const hasInspectionBooking = bookings.some(
      (b) => (b.status || "").toLowerCase() === "inspection",
    );

    const hasPendingBooking = bookings.some((b) => {
      const status = (b.status || "").toLowerCase();
      return (
        ["pending_reservation", "pending_full_payment"].includes(status) ||
        status === "pending"
      );
    });
    const hasActiveCheckoutLock = isCheckoutLockActive(motorcycle);

    if (hasActiveBooking && motorcycle.status !== "rented") {
      motorcycle.status = "rented";
      await motorcycle.save();
      return;
    }

    if (hasInspectionBooking) {
      if (!["under_review", "repair_needed"].includes(motorcycle.status)) {
        motorcycle.status = "inspection";
        await motorcycle.save();
      }
      return;
    }

    if (
      !hasActiveBooking &&
      (hasPendingBooking || hasActiveCheckoutLock) &&
      motorcycle.status !== "pending"
    ) {
      motorcycle.status = "pending";
      await motorcycle.save();
      return;
    }

    if (
      !hasActiveBooking &&
      !hasPendingBooking &&
      !hasActiveCheckoutLock &&
      [
        "rented",
        "pending",
        "inspection",
        "under_review",
        "repair_needed",
      ].includes(motorcycle.status)
    ) {
      motorcycle.status = "available";
      await motorcycle.save();
    }
  } catch (err) {
    console.error("Error updating motorcycle status:", err);
  }
};

export const acquireCheckoutLock = async (req, res) => {
  try {
    // 1. Accept pickupDate and returnDate from the frontend request
    const { motorcycleId, pickupDate, returnDate } = req.body;
    const userId = getRequesterUserId(req);

    if (!motorcycleId || !mongoose.Types.ObjectId.isValid(motorcycleId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid motorcycle ID" });
    }

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // 2. NEW: Explicitly check if the requested dates overlap with existing bookings
    if (pickupDate && returnDate) {
      const pickup = new Date(pickupDate);
      const ret = new Date(returnDate);

      const overlappingCount = await MotorcycleBooking.countDocuments({
        "motorcycle.id": motorcycleId,
        status: { $in: BLOCKING_STATUSES },
        pickupDate: { $lte: ret },
        returnDate: { $gte: pickup },
        isDeleted: { $ne: true },
      });

      if (overlappingCount > 0) {
        return res.status(409).json({
          success: false,
          code: "MOTORCYCLE_NOT_AVAILABLE",
          message: "This motorcycle is already booked for your selected dates.",
        });
      }
    }

    const requesterObjectId = new mongoose.Types.ObjectId(userId);
    const { now, expiresAt } = getLockWindow();

    // 3. FIXED: Removed the global `{ status: "available" }` constraint.
    // Now you can lock it for future dates even if it is currently rented today.
    const updated = await Motorcycle.findOneAndUpdate(
      {
        _id: motorcycleId,
        isDeleted: false,
        $or: [
          { "checkoutLock.userId": requesterObjectId },
          { checkoutLock: null },
          { "checkoutLock.expiresAt": { $exists: false } },
          { "checkoutLock.expiresAt": { $lte: now } },
        ],
      },
      {
        $set: {
          checkoutLock: {
            userId: requesterObjectId,
            acquiredAt: now,
            expiresAt,
          },
        },
      },
      { new: true },
    ).lean();

    if (!updated) {
      const current = await Motorcycle.findById(motorcycleId)
        .select("checkoutLock")
        .lean();

      if (!current) {
        return res
          .status(404)
          .json({ success: false, message: "Motorcycle not found" });
      }

      const lockActive = isCheckoutLockActive(current, now);
      const isHeldByRequester =
        current?.checkoutLock?.userId?.toString?.() === userId;

      if (lockActive && !isHeldByRequester) {
        return res.status(409).json({
          success: false,
          code: "MOTORCYCLE_LOCKED",
          message: "Another user is currently checking out this motorcycle.",
          lockExpiresAt: current.checkoutLock.expiresAt,
        });
      }

      return res.status(409).json({
        success: false,
        code: "MOTORCYCLE_NOT_AVAILABLE",
        message: "This motorcycle cannot be locked right now.",
      });
    }

    return res.status(200).json({
      success: true,
      motorcycleId,
      lockMinutes: CHECKOUT_LOCK_MINUTES,
      lockExpiresAt: updated.checkoutLock?.expiresAt,
    });
  } catch (err) {
    console.error("Acquire checkout lock error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const releaseCheckoutLock = async (req, res) => {
  try {
    const motorcycleId = req.body?.motorcycleId;
    const userId = getRequesterUserId(req);

    if (!motorcycleId || !mongoose.Types.ObjectId.isValid(motorcycleId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid motorcycle ID" });
    }

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    await Motorcycle.findOneAndUpdate(
      {
        _id: motorcycleId,
        "checkoutLock.userId": new mongoose.Types.ObjectId(userId),
      },
      { $unset: { checkoutLock: "" } },
    );

    await updateMotorcycleStatus(motorcycleId);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Release checkout lock error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const createMotorcycleBooking = async (req, res) => {
  let session = null;

  try {
    let {
      customer,
      email,
      phone,
      motorcycle,
      pickupDate,
      pickupTime,
      returnDate,
      returnTime,
      destination,
      amount,
      details,
      address,
      motorcycleImage,
      reservationPaymentMethod,
      paymentReferenceId,
      paymentSentAt,
      paymentSentAmount,
    } = req.body;

    if (
      !customer ||
      !email ||
      !motorcycle ||
      !pickupDate ||
      !returnDate ||
      !pickupTime ||
      !returnTime ||
      !destination ||
      !paymentReferenceId ||
      !paymentSentAt ||
      !paymentSentAmount
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Payment proof image is required",
      });
    }

    const pickup = new Date(pickupDate);
    const ret = new Date(returnDate);

    if (
      Number.isNaN(pickup.getTime()) ||
      Number.isNaN(ret.getTime()) ||
      pickup > ret
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid pickup and return date" });
    }

    if (
      !hasMinimumRentalDuration(pickupDate, pickupTime, returnDate, returnTime)
    ) {
      return res.status(400).json({
        success: false,
        message: "Minimum rental duration is 24 hours",
      });
    }

    let motorcycleSummary = null;
    if (
      typeof motorcycle === "string" &&
      /^[0-9a-fA-F]{24}$/.test(motorcycle)
    ) {
      const motorcycleDoc = await Motorcycle.findById(motorcycle).lean();
      if (!motorcycleDoc) {
        return res
          .status(404)
          .json({ success: false, message: "Motorcycle not found" });
      }
      motorcycleSummary = buildMotorcycleSummary(motorcycleDoc);
    } else {
      const parsed = tryParseJSON(motorcycle) || motorcycle;
      motorcycleSummary = buildMotorcycleSummary(parsed);
      if (!motorcycleSummary.id) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid motorcycle payload" });
      }
      const motorcycleExists = await Motorcycle.exists({
        _id: motorcycleSummary.id,
      });
      if (!motorcycleExists) {
        return res
          .status(404)
          .json({ success: false, message: "Motorcycle not found" });
      }
    }

    const motorcycleId = motorcycleSummary.id;

    const requesterUserId = getRequesterUserId(req);
    if (requesterUserId && mongoose.Types.ObjectId.isValid(requesterUserId)) {
      const hasOpenInspection = await MotorcycleBooking.exists({
        userId: new mongoose.Types.ObjectId(requesterUserId),
        status: "inspection",
        isDeleted: { $ne: true },
      });

      if (hasOpenInspection) {
        return res.status(409).json({
          success: false,
          code: "INSPECTION_BLOCKED",
          message:
            "You cannot rent another motorcycle while you still have an unresolved inspection booking.",
        });
      }
    }

    const motorcycleForLockCheck = await Motorcycle.findById(motorcycleId)
      .select("checkoutLock")
      .lean();
    const lockOwnerId =
      motorcycleForLockCheck?.checkoutLock?.userId?.toString?.() || "";
    const hasValidLock =
      requesterUserId &&
      requesterUserId === lockOwnerId &&
      isCheckoutLockActive(motorcycleForLockCheck);

    if (!hasValidLock) {
      return res.status(409).json({
        success: false,
        code: "LOCK_REQUIRED",
        message:
          "Your checkout session expired or was not acquired. Please restart from step 1.",
      });
    }

    const parsedPaymentSentAt = new Date(paymentSentAt);
    if (Number.isNaN(parsedPaymentSentAt.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment sent time",
      });
    }

    const numericPaymentSentAmount = Number(paymentSentAmount);
    if (
      !Number.isFinite(numericPaymentSentAmount) ||
      numericPaymentSentAmount !== REQUIRED_DOWNPAYMENT
    ) {
      return res.status(400).json({
        success: false,
        message: `Payment sent amount must be exactly ₱${REQUIRED_DOWNPAYMENT}`,
      });
    }

    const receiptVerification = await verifyReceiptWithTimeout({
      referenceId: paymentReferenceId,
      sentAmount: numericPaymentSentAmount,
      expectedAmount: 200,
      sentAt: parsedPaymentSentAt,
      file: req.file,
    });

    const overlappingCount = await MotorcycleBooking.countDocuments({
      "motorcycle.id": motorcycleId,
      status: { $in: BLOCKING_STATUSES },
      pickupDate: { $lte: ret },
      returnDate: { $gte: pickup },
    });

    if (overlappingCount > 0) {
      return res.status(409).json({
        success: false,
        message: "Motorcycle already booked for selected dates",
      });
    }

    // ── Check for scheduled maintenance conflicts ────────────────────────
    const motorcycleWithMaintenance = await Motorcycle.findById(motorcycleId)
      .select(
        "maintenanceScheduleAt maintenanceScheduleStartAt maintenanceScheduleEndAt status",
      )
      .lean();

    if (
      motorcycleWithMaintenance &&
      motorcycleWithMaintenance.status !== "maintenance"
    ) {
      const rawStart =
        motorcycleWithMaintenance.maintenanceScheduleStartAt ||
        motorcycleWithMaintenance.maintenanceScheduleAt ||
        null;
      const rawEnd =
        motorcycleWithMaintenance.maintenanceScheduleEndAt ||
        motorcycleWithMaintenance.maintenanceScheduleAt ||
        null;
      if (rawStart && rawEnd) {
        const maintenanceStart = new Date(rawStart);
        maintenanceStart.setHours(0, 0, 0, 0);
        const maintenanceEnd = new Date(rawEnd);
        maintenanceEnd.setHours(23, 59, 59, 999);

        const pickupDay = new Date(pickup);
        pickupDay.setHours(0, 0, 0, 0);
        const returnDay = new Date(ret);
        returnDay.setHours(0, 0, 0, 0);

        // Overlap if maintenance window intersects booking range
        if (!(returnDay < maintenanceStart || pickupDay > maintenanceEnd)) {
          return res.status(409).json({
            success: false,
            message: `Motorcycle is scheduled for maintenance between ${maintenanceStart.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })} and ${maintenanceEnd.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}. Please select different dates.`,
          });
        }
      }
    }

    // ── Upload payment proof image ────────────────────────────────────────
    const paymentProofUrl = await getUploadedPaymentProofUrl(req.file);
    if (!paymentProofUrl) {
      return res.status(500).json({
        success: false,
        message: "Failed to process payment proof image",
      });
    }

    const bookingData = {
      userId: req?.user?.id || req.user?._id || null,
      customer,
      email,
      phone,
      motorcycle: motorcycleSummary,
      motorcycleImage: motorcycleImage || motorcycleSummary.image || "",
      pickupDate: pickup,
      pickupTime: pickupTime,
      returnDate: ret,
      returnTime: returnTime,
      destination: destination,
      amount: Number(amount || 0),
      reservationFee: 200,
      reservationFeePaid: false,
      reservationPaymentMethod: reservationPaymentMethod || "Cash",
      details: tryParseJSON(details),
      address: tryParseJSON(address),
      paymentStatus: "pending_verification",
      status: "pending_reservation",
      paymentProofImage: paymentProofUrl,
      paymentReferenceId: String(paymentReferenceId || "").trim(),
      paymentSentAt: parsedPaymentSentAt,
      paymentSentAmount: numericPaymentSentAmount,
      receiptVerification,
    };

    const result = await retryOperation(async () => {
      session = await mongoose.startSession();
      session.startTransaction();

      try {
        const createdArr = await MotorcycleBooking.create([bookingData], {
          session,
        });
        const createdBooking = createdArr[0];

        const bookingEntry = {
          bookingId: createdBooking._id,
          pickupDate: createdBooking.pickupDate,
          returnDate: createdBooking.returnDate,
          status: createdBooking.status,
        };

        await Motorcycle.findByIdAndUpdate(
          motorcycleId,
          {
            $push: { bookings: bookingEntry },
            $unset: { checkoutLock: "" },
            $set: { status: "pending" },
          },
          { session, new: true },
        );

        await session.commitTransaction();
        return createdBooking._id;
      } catch (err) {
        await session.abortTransaction();
        throw err;
      } finally {
        session.endSession();
      }
    });

    await updateMotorcycleStatus(motorcycleId);

    const saved = await MotorcycleBooking.findById(result).lean();

    await createSystemLog({
      req,
      actorType: req?.user ? "user" : "admin",
      action: "booking_created",
      targetType: "booking",
      targetId: saved?._id,
      summary: `Booking created: ${buildBookingLabel(saved)}`,
      metadata: {
        status: saved?.status,
        paymentStatus: saved?.paymentStatus,
      },
    });

    notifyBookingCreated(saved.userId).catch((e) =>
      console.error("[Push] notifyBookingCreated:", e.message),
    );

    return res.status(201).json({
      success: true,
      booking: saved,
    });
  } catch (err) {
    if (session) {
      try {
        await session.abortTransaction();
        session.endSession();
      } catch (sessionErr) {
        console.error("Session cleanup error:", sessionErr);
      }
    }
    console.error("Create Motorcycle Booking Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const createWalkInMotorcycleBooking = async (req, res) => {
  let session = null;

  try {
    let {
      user,
      userId,
      customer,
      phone,
      motorcycle,
      pickupDate,
      pickupTime,
      returnDate,
      returnTime,
      destination,
      amount,
      details,
      address,
      motorcycleImage,
      email,
      paymentMethod,
      reservationPaymentMethod,
    } = req.body;

    if (
      !customer ||
      !email ||
      !phone ||
      !motorcycle ||
      !pickupDate ||
      !pickupTime ||
      !returnDate ||
      !returnTime ||
      !destination
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const phoneStr = String(phone || "").trim();
    const emailStr = String(email || "").trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) {
      return res.status(400).json({
        success: false,
        message: "A valid renter email address is required",
      });
    }

    if (!/^09\d{9}$/.test(phoneStr)) {
      return res.status(400).json({
        success: false,
        message: "Phone number must be exactly 11 digits and start with 09",
      });
    }

    const pickup = new Date(pickupDate);
    const ret = new Date(returnDate);
    if (Number.isNaN(pickup.getTime()) || Number.isNaN(ret.getTime())) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid pickup or return date" });
    }

    const pickupDay = startOfLocalDay(pickup);
    const returnDay = startOfLocalDay(ret);
    const today = startOfLocalDay(new Date());
    const maxReturn = addMonths(pickupDay, 6);

    // if (pickupDay.getTime() !== today.getTime()) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Walk-in pickup date must be today",
    //   });
    // }

    if (pickupDay.getTime() < today.getTime()) {
      return res.status(400).json({
        success: false,
        message: "Walk-in pickup date cannot be in the past",
      });
    }

    if (returnDay < pickupDay) {
      return res.status(400).json({
        success: false,
        message: "Return date cannot be before pickup date",
      });
    }

    // if (returnDay > maxReturn) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Return date must be within 6 months from pickup date",
    //   });
    // }

    if (
      !hasMinimumRentalDuration(pickupDate, pickupTime, returnDate, returnTime)
    ) {
      return res.status(400).json({
        success: false,
        message: "Minimum rental duration is 24 hours",
      });
    }

    let motorcycleSummary = null;
    if (
      typeof motorcycle === "string" &&
      /^[0-9a-fA-F]{24}$/.test(motorcycle)
    ) {
      const motorcycleDoc = await Motorcycle.findById(motorcycle).lean();
      if (!motorcycleDoc) {
        return res
          .status(404)
          .json({ success: false, message: "Motorcycle not found" });
      }
      motorcycleSummary = buildMotorcycleSummary(motorcycleDoc);
    } else {
      const parsed = tryParseJSON(motorcycle) || motorcycle;
      motorcycleSummary = buildMotorcycleSummary(parsed);
      if (!motorcycleSummary.id) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid motorcycle payload" });
      }
      const motorcycleExists = await Motorcycle.exists({
        _id: motorcycleSummary.id,
      });
      if (!motorcycleExists) {
        return res
          .status(404)
          .json({ success: false, message: "Motorcycle not found" });
      }
    }

    const motorcycleId = motorcycleSummary.id;

    const allowedPaymentMethods = ["Cash", "GCash", "PayMaya", "Bank Transfer"];
    const selectedPaymentMethod = allowedPaymentMethods.includes(
      String(paymentMethod || reservationPaymentMethod || "Cash").trim(),
    )
      ? String(paymentMethod || reservationPaymentMethod || "Cash").trim()
      : "Cash";

    const overlappingCount = await MotorcycleBooking.countDocuments({
      "motorcycle.id": motorcycleId,
      status: { $in: BLOCKING_STATUSES },
      pickupDate: { $lte: ret },
      returnDate: { $gte: pickup },
      isDeleted: { $ne: true },
    });

    if (overlappingCount > 0) {
      return res.status(409).json({
        success: false,
        message: "Motorcycle already booked for selected dates",
      });
    }

    // A walk-in rental cannot proceed if the loaded customer already has
    // a booking that is Pending (any variant), Active, or Inspection —
    // regardless of which motorcycle or dates that other booking involves.
    const effectiveUserId = user || userId || null;
    if (effectiveUserId) {
      const existingUserBooking = await MotorcycleBooking.findOne({
        userId: effectiveUserId,
        status: { $in: BLOCKING_STATUSES },
        isDeleted: { $ne: true },
      })
        .select({ status: 1 })
        .lean();

      if (existingUserBooking) {
        return res.status(409).json({
          success: false,
          message: `This customer already has a booking with "${existingUserBooking.status}" status. A walk-in rental cannot be created until that booking is resolved.`,
        });
      }
    }

    const bookingData = {
      userId: user || userId || null,
      customer: String(customer).trim(),
      email: emailStr,
      phone: phoneStr,
      motorcycle: motorcycleSummary,
      motorcycleImage: motorcycleImage || motorcycleSummary.image || "",
      pickupDate: pickup,
      pickupTime,
      returnDate: ret,
      returnTime,
      destination: String(destination).trim(),
      amount: Number(amount || 0),

      reservationFee: 0,
      reservationFeePaid: true,
      reservationPaymentMethod: selectedPaymentMethod,
      paymentMethod: selectedPaymentMethod,
      fullPaymentMethod: selectedPaymentMethod,
      details: tryParseJSON(details),
      address: tryParseJSON(address),
      paymentStatus: req.body.paymentStatus || "pending_verification",
      status: req.body.status || "pending_reservation",

      paymentProofImage: "",
      paymentReferenceId: "",
      paymentSentAt: null,
      paymentSentAmount: 0,
      requiresProofReupload: false,
      adminReviewComment: "Walk-in rental",
      adminReviewedAt: new Date(),
      reservationConfirmedAt: new Date(),
      fullPaymentConfirmedAt: null,
      receiptVerification: {
        status: "verified",
        score: 1,
        provider: "walk-in",
        reasons: ["Walk-in booking"],
        checkedAt: new Date(),
      },
    };

    const result = await retryOperation(async () => {
      session = await mongoose.startSession();
      session.startTransaction();

      try {
        const createdArr = await MotorcycleBooking.create([bookingData], {
          session,
        });
        const createdBooking = createdArr[0];

        const bookingEntry = {
          bookingId: createdBooking._id,
          pickupDate: createdBooking.pickupDate,
          returnDate: createdBooking.returnDate,
          status: createdBooking.status,
        };

        await Motorcycle.findByIdAndUpdate(
          motorcycleId,
          {
            $push: { bookings: bookingEntry },
            $unset: { checkoutLock: "" },
            $set: {
              status: req.body.status === "active" ? "rented" : "pending",
            },
          },
          { session, new: true },
        );

        await session.commitTransaction();
        return createdBooking._id;
      } catch (err) {
        await session.abortTransaction();
        throw err;
      } finally {
        session.endSession();
      }
    });

    await updateMotorcycleStatus(motorcycleId);

    const saved = await MotorcycleBooking.findById(result).lean();

    await createSystemLog({
      req,
      actorType: "admin",
      action: "walk_in_booking_created",
      targetType: "booking",
      targetId: saved?._id,
      summary: `Walk-in booking created: ${buildBookingLabel(saved)}`,
      metadata: {
        status: saved?.status,
        paymentStatus: saved?.paymentStatus,
      },
    });

    return res.status(201).json({ success: true, booking: saved });
  } catch (err) {
    if (session) {
      try {
        await session.abortTransaction();
        session.endSession();
      } catch (sessionErr) {
        console.error("Session cleanup error:", sessionErr);
      }
    }
    console.error("Create Walk-In Booking Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getMotorcycleBookings = async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 12, 200);
    const search = req.query.search?.trim() || "";
    const status = req.query.status?.trim() || "";
    const motorcycleFilter = req.query.motorcycle?.trim() || "";
    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;
    const includeDeleted = req.query.includeDeleted === "true";

    const query = {};

    if (!includeDeleted) {
      query.isDeleted = { $ne: true };
    }

    if (search) {
      const q = { $regex: search, $options: "i" };
      query.$or = [
        { customer: q },
        { email: q },
        { "motorcycle.make": q },
        { "motorcycle.model": q },
        { "motorcycle.unitId": q },
      ];
    }

    if (status) query.status = status;
    if (motorcycleFilter) {
      if (/^[0-9a-fA-F]{24}$/.test(motorcycleFilter))
        query["motorcycle.id"] = motorcycleFilter;
      else
        query.$or = [
          ...(query.$or || []),
          { "motorcycle.make": { $regex: motorcycleFilter, $options: "i" } },
          { "motorcycle.model": { $regex: motorcycleFilter, $options: "i" } },
          { "motorcycle.unitId": { $regex: motorcycleFilter, $options: "i" } },
        ];
    }

    if (from || to) {
      query.pickupDate = {};
      if (from) query.pickupDate.$gte = from;
      if (to) query.pickupDate.$lte = to;
    }

    const total = await MotorcycleBooking.countDocuments(query);
    const bookings = await MotorcycleBooking.find(query)
      .sort({ bookingDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({
      page,
      pages: Math.ceil(total / limit),
      total,
      data: bookings,
    });
  } catch (err) {
    next(err);
  }
};

export const getMyMotorcycleBookings = async (req, res, next) => {
  try {
    if (!req.user || (!req.user.id && !req.user._id))
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const userId = req.user._id || req.user.id;
    const bookings = await MotorcycleBooking.find({ userId })
      .select({
        userId: 1,
        customer: 1,
        email: 1,
        phone: 1,
        motorcycle: 1,
        motorcycleImage: 1,
        pickupDate: 1,
        pickupTime: 1,
        returnDate: 1,
        returnTime: 1,
        destination: 1,
        bookingDate: 1,
        status: 1,
        amount: 1,
        reservationFee: 1,
        reservationFeePaid: 1,
        reservationPaymentMethod: 1,
        paymentStatus: 1,
        paymentProofImage: 1,
        paymentReferenceId: 1,
        paymentSentAt: 1,
        paymentSentAmount: 1,
        requiresProofReupload: 1,
        adminReviewComment: 1,
        adminReviewedAt: 1,
        receiptVerification: 1,
        returnInspection: 1,
        securityDeposit: 1,
        details: 1,
        address: 1,
        extensions: 1,
        reschedules: 1,
        isDeleted: 1,
        deletedAt: 1,
        createdAt: 1,
        updatedAt: 1,
      })
      .sort({ bookingDate: -1 })
      .lean();

    // Ensure motorcycleImage is set from motorcycle.image if not present
    const enrichedBookings = bookings.map((booking) => ({
      ...booking,
      motorcycleImage:
        booking.motorcycleImage || booking.motorcycle?.image || "",
    }));

    res.json(enrichedBookings);
  } catch (err) {
    next(err);
  }
};

export const updateMotorcycleBooking = async (req, res, next) => {
  try {
    const booking = await MotorcycleBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (req.file) {
      if (
        booking.motorcycleImage &&
        booking.motorcycleImage.startsWith("/uploads/")
      )
        deleteLocalFileIfPresent(booking.motorcycleImage);
      booking.motorcycleImage = getUploadedImagePath(req.file);
    } else if (req.body.motorcycleImage !== undefined) {
      if (
        req.body.motorcycleImage &&
        !String(req.body.motorcycleImage).startsWith("/uploads/") &&
        booking.motorcycleImage &&
        booking.motorcycleImage.startsWith("/uploads/")
      ) {
        deleteLocalFileIfPresent(booking.motorcycleImage);
      }
      booking.motorcycleImage =
        req.body.motorcycleImage || booking.motorcycleImage;
    }

    const updatable = [
      "customer",
      "email",
      "phone",
      "motorcycle",
      "pickupDate",
      "pickupTime",
      "returnDate",
      "returnTime",
      "destination",
      "bookingDate",
      "status",
      "amount",
      "details",
      "address",
      "paymentStatus",
      "reservationFeePaid",
      "paymentProofImage",
      "paymentReferenceId",
      "paymentSentAt",
      "paymentSentAmount",
      "receiptVerification",
      "requiresProofReupload",
      "adminReviewComment",
      "adminReviewedAt",
      "reservationPaymentMethod", // <-- Added
      "fullPaymentMethod", // <-- Added
    ];
    for (const f of updatable) {
      if (req.body[f] === undefined) continue;
      if (["pickupDate", "returnDate", "bookingDate"].includes(f))
        booking[f] = new Date(req.body[f]);
      else if (f === "amount") booking[f] = Number(req.body[f]);
      else if (f === "details" || f === "address")
        booking[f] = tryParseJSON(req.body[f]);
      else if (f === "motorcycle") {
        const m = tryParseJSON(req.body.motorcycle);
        if (m) {
          const summary = buildMotorcycleSummary(m);
          if (!summary.id && booking.motorcycle?.id)
            summary.id = booking.motorcycle.id;
          booking.motorcycle = summary;
        }
      } else booking[f] = req.body[f];
    }

    const pickupDateForCheck = req.body.pickupDate || booking.pickupDate;
    const pickupTimeForCheck = req.body.pickupTime || booking.pickupTime;
    const returnDateForCheck = req.body.returnDate || booking.returnDate;
    const returnTimeForCheck = req.body.returnTime || booking.returnTime;

    if (
      (req.body.pickupDate !== undefined ||
        req.body.pickupTime !== undefined ||
        req.body.returnDate !== undefined ||
        req.body.returnTime !== undefined) &&
      !hasMinimumRentalDuration(
        pickupDateForCheck,
        pickupTimeForCheck,
        returnDateForCheck,
        returnTimeForCheck,
      )
    ) {
      return res.status(400).json({
        message: "Minimum rental duration is 24 hours",
      });
    }

    const updated = await booking.save();
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

export const extendMotorcycleBooking = async (req, res, next) => {
  try {
    if (!req.user || (!req.user.id && !req.user._id)) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const booking = await MotorcycleBooking.findById(req.params.id);
    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }

    const userId = String(req.user._id || req.user.id);
    if (!booking.userId || String(booking.userId) !== userId) {
      return res
        .status(403)
        .json({ success: false, message: "You cannot extend this booking." });
    }

    if (booking.isDeleted) {
      return res
        .status(400)
        .json({ success: false, message: "This booking is not active." });
    }

    if (booking.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Only active bookings can be extended.",
      });
    }

    const returnDate = req.body?.returnDate;
    const returnTime = String(req.body?.returnTime || "").trim();
    if (!returnDate || !returnTime) {
      return res.status(400).json({
        success: false,
        message: "returnDate and returnTime are required.",
      });
    }

    const currentReturnAt = combineDateAndTime(
      booking.returnDate,
      booking.returnTime,
    );
    const newReturnAt = combineDateAndTime(returnDate, returnTime);
    if (!currentReturnAt || !newReturnAt) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid return date/time." });
    }

    if (newReturnAt.getTime() <= currentReturnAt.getTime()) {
      return res.status(400).json({
        success: false,
        message: "New return time must be later than the current return time.",
      });
    }

    const motorcycleId = booking.motorcycle?.id;
    if (!motorcycleId) {
      return res.status(400).json({
        success: false,
        message: "Booking has no motorcycle assigned.",
      });
    }

    const overlappingCount = await MotorcycleBooking.countDocuments({
      _id: { $ne: booking._id },
      "motorcycle.id": motorcycleId,
      status: { $in: BLOCKING_STATUSES },
      isDeleted: { $ne: true },
      pickupDate: { $lte: newReturnAt },
      returnDate: { $gte: booking.returnDate },
    });

    if (overlappingCount > 0) {
      return res.status(409).json({
        success: false,
        message:
          "Extension conflicts with another booking for this motorcycle.",
      });
    }

    // Total scheduled rental length AFTER this extension (original pickup
    // through the newly requested return).
    const days = computeRentalDays(
      booking.pickupDate,
      booking.pickupTime,
      returnDate,
      returnTime,
    );
    if (!days) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid extension duration." });
    }

    // Total scheduled rental length BEFORE this extension, so we can isolate
    // just the incremental days being added. Diffing two independently
    // re-priced full-duration totals (as this used to do) would silently
    // re-introduce or cancel out whatever discount applied to the *original*
    // booking — the extension fee must be based solely on the motorcycle's
    // daily rate for the incremental days, not on the original pricing.
    const previousDays = computeRentalDays(
      booking.pickupDate,
      booking.pickupTime,
      booking.returnDate,
      booking.returnTime,
    );
    const extensionDays = Math.max(0, days - previousDays);
    if (extensionDays <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid extension duration." });
    }

    const dailyRate = Number(booking.motorcycle?.dailyRate || 0);
    const previousAmount = Number(booking.amount || 0);

    // Base extension cost: just the incremental days at the daily rate.
    // One-time fees (distance/helmet) were already charged on the original
    // booking and are not repeated here.
    let extensionAmount = dailyRate > 0 ? dailyRate * extensionDays : 0;

    // ── Promo/loyalty code for THIS extension only ──────────────────────────
    // Promo codes are only meant to be redeemed at checkout on the Motorcycle
    // Detail page, so the discount originally applied to the booking
    // (booking.details.appliedDiscount) must NOT be carried over here
    // automatically. A user may still manually supply another valid code
    // when requesting an extension, via req.body.promoCode.
    let extensionDiscount = null;
    const promoCodeInput = String(req.body?.promoCode || "")
      .trim()
      .toUpperCase();

    if (dailyRate > 0 && promoCodeInput) {
      const Discount = mongoose.model("Discount");
      const promo = await Discount.findOne({ code: promoCodeInput }).lean();

      if (promo) {
        const now = new Date();
        const isActive = promo.isActive !== false;
        const isStarted = !promo.startDate || new Date(promo.startDate) <= now;
        const isNotExpired = !promo.endDate || new Date(promo.endDate) >= now;
        const underMaxUses =
          promo.maxUses == null || promo.usedCount < promo.maxUses;

        if (!isActive || !isStarted || !isNotExpired || !underMaxUses) {
          return res.status(400).json({
            success: false,
            message: "This promo code has expired or is no longer active.",
          });
        }
        if (promo.minRentalDays && extensionDays < promo.minRentalDays) {
          return res.status(400).json({
            success: false,
            message: `This code requires a minimum rental of ${promo.minRentalDays} day(s).`,
          });
        }

        extensionDiscount = {
          source: "promo",
          refId: promo._id,
          code: promo.code,
          discountType: promo.discountType,
          discountValue: promo.discountValue,
        };
      } else {
        const codeOwner = await User.findById(userId);
        const loyaltyEntry = (codeOwner?.loyaltyCodes || []).find(
          (c) => c.code === promoCodeInput,
        );

        if (!loyaltyEntry) {
          return res
            .status(404)
            .json({ success: false, message: "Promo code not found." });
        }
        if (loyaltyEntry.usedAt) {
          return res.status(400).json({
            success: false,
            message: "This code has already been used.",
          });
        }
        if (
          loyaltyEntry.expiresAt &&
          new Date(loyaltyEntry.expiresAt) < new Date()
        ) {
          return res
            .status(400)
            .json({ success: false, message: "This code has expired." });
        }
        if (
          loyaltyEntry.minRentalDays &&
          extensionDays < loyaltyEntry.minRentalDays
        ) {
          return res.status(400).json({
            success: false,
            message: `This code requires a minimum rental of ${loyaltyEntry.minRentalDays} day(s).`,
          });
        }

        extensionDiscount = {
          source: "loyalty",
          refId: loyaltyEntry._id,
          code: loyaltyEntry.code,
          discountType: loyaltyEntry.discountType,
          discountValue: loyaltyEntry.discountValue,
        };
      }

      const discountAmount =
        extensionDiscount.discountType === "percentage"
          ? (extensionAmount * extensionDiscount.discountValue) / 100
          : Math.min(extensionDiscount.discountValue, extensionAmount);

      extensionAmount = Math.max(0, extensionAmount - discountAmount);
    }

    const additionalAmount = extensionAmount;
    const newAmount = previousAmount + additionalAmount;

    const previousReturnDate = booking.returnDate;
    const previousReturnTime = booking.returnTime;

    booking.returnDate = new Date(newReturnAt);
    booking.returnTime = returnTime;
    booking.amount = newAmount;
    booking.extensions = booking.extensions || [];
    booking.extensions.push({
      requestedAt: new Date(),
      requestedBy: new mongoose.Types.ObjectId(userId),
      previousReturnDate,
      previousReturnTime,
      newReturnDate: booking.returnDate,
      newReturnTime: booking.returnTime,
      previousAmount,
      newAmount,
      additionalAmount,
      // Scoped to THIS extension only — intentionally not copied from
      // booking.details.appliedDiscount.
      appliedDiscount: extensionDiscount || null,
    });

    const updated = await booking.save();

    // Mark the extension's promo/loyalty code as used now that the
    // extension has been saved successfully.
    if (extensionDiscount) {
      if (extensionDiscount.source === "promo") {
        await mongoose
          .model("Discount")
          .findByIdAndUpdate(extensionDiscount.refId, {
            $inc: { usedCount: 1 },
          });
      } else if (extensionDiscount.source === "loyalty") {
        await User.updateOne(
          { _id: userId, "loyaltyCodes._id": extensionDiscount.refId },
          {
            $set: {
              "loyaltyCodes.$.usedAt": new Date(),
              "loyaltyCodes.$.usedOnBookingId": updated._id,
            },
          },
        );
      }
    }

    await Motorcycle.findOneAndUpdate(
      {
        _id: motorcycleId,
        "bookings.bookingId": booking._id,
      },
      {
        $set: {
          "bookings.$.returnDate": booking.returnDate,
        },
      },
    );

    await updateMotorcycleStatus(motorcycleId);

    await createSystemLog({
      req,
      actorType: "user",
      action: "booking_extended",
      targetType: "booking",
      targetId: updated._id,
      summary: `Booking extended: ${buildBookingLabel(updated)}`,
      metadata: {
        previousReturnDate,
        previousReturnTime,
        newReturnDate: booking.returnDate,
        newReturnTime: booking.returnTime,
        previousAmount,
        newAmount,
        additionalAmount,
        appliedDiscount: extensionDiscount || null,
      },
    });

    return res.json({
      success: true,
      booking: updated,
      additionalAmount,
      newAmount,
      appliedDiscount: extensionDiscount || null,
      days,
    });
  } catch (err) {
    next(err);
  }
};

export const rescheduleMotorcycleBooking = async (req, res, next) => {
  try {
    if (!req.user || (!req.user.id && !req.user._id)) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const booking = await MotorcycleBooking.findById(req.params.id);
    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }

    const userId = String(req.user._id || req.user.id);
    if (!booking.userId || String(booking.userId) !== userId) {
      return res.status(403).json({
        success: false,
        message: "You cannot reschedule this booking.",
      });
    }

    if (booking.isDeleted) {
      return res
        .status(400)
        .json({ success: false, message: "This booking is not active." });
    }

    // Reschedule replaces the ORIGINAL, not-yet-started booking's dates —
    // unlike an extension (which adds days to an already-active rental),
    // this must only be allowed before pickup happens.
    if (
      !["pending", "pending_reservation", "pending_full_payment"].includes(
        booking.status,
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Only upcoming bookings can be rescheduled.",
      });
    }

    const pickupDate = req.body?.pickupDate;
    const pickupTime = String(req.body?.pickupTime || "").trim();
    const returnDate = req.body?.returnDate;
    const returnTime = String(req.body?.returnTime || "").trim();
    if (!pickupDate || !pickupTime || !returnDate || !returnTime) {
      return res.status(400).json({
        success: false,
        message:
          "pickupDate, pickupTime, returnDate, and returnTime are required.",
      });
    }

    const newPickupAt = combineDateAndTime(pickupDate, pickupTime);
    const newReturnAt = combineDateAndTime(returnDate, returnTime);
    if (!newPickupAt || !newReturnAt) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid pickup/return date-time." });
    }
    if (newReturnAt.getTime() <= newPickupAt.getTime()) {
      return res.status(400).json({
        success: false,
        message: "Return must be after pickup.",
      });
    }

    const currentPickupAt = combineDateAndTime(
      booking.pickupDate,
      booking.pickupTime,
    );
    const currentReturnAt = combineDateAndTime(
      booking.returnDate,
      booking.returnTime,
    );
    if (
      currentPickupAt &&
      currentReturnAt &&
      newPickupAt.getTime() === currentPickupAt.getTime() &&
      newReturnAt.getTime() === currentReturnAt.getTime()
    ) {
      return res.status(400).json({
        success: false,
        message: "Please select new dates to reschedule your booking.",
      });
    }

    const motorcycleId = booking.motorcycle?.id;
    if (!motorcycleId) {
      return res.status(400).json({
        success: false,
        message: "Booking has no motorcycle assigned.",
      });
    }

    const overlappingCount = await MotorcycleBooking.countDocuments({
      _id: { $ne: booking._id },
      "motorcycle.id": motorcycleId,
      status: { $in: BLOCKING_STATUSES },
      isDeleted: { $ne: true },
      pickupDate: { $lte: newReturnAt },
      returnDate: { $gte: newPickupAt },
    });
    if (overlappingCount > 0) {
      return res.status(409).json({
        success: false,
        message:
          "Reschedule conflicts with another booking for this motorcycle.",
      });
    }

    const days = computeRentalDays(
      pickupDate,
      pickupTime,
      returnDate,
      returnTime,
    );
    if (!days) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid rental duration." });
    }

    // True original pickup/return BEFORE any reschedule was ever made for
    // this booking. Used to cap how many days of the ORIGINAL checkout
    // discount can continue to apply — see promo/loyalty block below.
    const firstRescheduleRecord =
      Array.isArray(booking.reschedules) && booking.reschedules.length > 0
        ? booking.reschedules[0]
        : null;
    const originalPickupDate =
      firstRescheduleRecord?.previousPickupDate || booking.pickupDate;
    const originalPickupTime =
      firstRescheduleRecord?.previousPickupTime || booking.pickupTime;
    const originalReturnDate =
      firstRescheduleRecord?.previousReturnDate || booking.returnDate;
    const originalReturnTime =
      firstRescheduleRecord?.previousReturnTime || booking.returnTime;
    const originalDays =
      computeRentalDays(
        originalPickupDate,
        originalPickupTime,
        originalReturnDate,
        originalReturnTime,
      ) || days;

    const dailyRate = Number(booking.motorcycle?.dailyRate || 0);
    const distanceFee = Number(booking.details?.distanceFee || 0);
    const helmetFee = Number(booking.details?.helmetFee || 0);
    const previousAmount = Number(booking.amount || 0);

    // ── Promo/loyalty code for THIS reschedule ──────────────────────────────
    // Two ways a discount can apply:
    //  1. Manual override (req.body.promoCode): a freshly-entered code,
    //     applied in full to the entire new duration — same as extend.
    //  2. Carryover (default, no promoCode given): the ORIGINAL checkout
    //     discount keeps applying automatically (since reschedule edits the
    //     same not-yet-started booking, not a new transaction) — but only
    //     up to the number of days it was originally applied to. Any extra
    //     days beyond that are charged at the regular rate. If it's no
    //     longer valid (deactivated/expired promo), no discount applies.
    let rescheduleDiscount = null;
    let newAmount =
      dailyRate > 0
        ? dailyRate * days + distanceFee + helmetFee
        : previousAmount;
    const promoCodeInput = String(req.body?.promoCode || "")
      .trim()
      .toUpperCase();

    if (dailyRate > 0 && promoCodeInput) {
      const Discount = mongoose.model("Discount");
      const promo = await Discount.findOne({ code: promoCodeInput }).lean();

      if (promo) {
        const now = new Date();
        const isActive = promo.isActive !== false;
        const isStarted = !promo.startDate || new Date(promo.startDate) <= now;
        const isNotExpired = !promo.endDate || new Date(promo.endDate) >= now;
        const underMaxUses =
          promo.maxUses == null || promo.usedCount < promo.maxUses;

        if (!isActive || !isStarted || !isNotExpired || !underMaxUses) {
          return res.status(400).json({
            success: false,
            message: "This promo code has expired or is no longer active.",
          });
        }
        if (promo.minRentalDays && days < promo.minRentalDays) {
          return res.status(400).json({
            success: false,
            message: `This code requires a minimum rental of ${promo.minRentalDays} day(s).`,
          });
        }

        rescheduleDiscount = {
          source: "promo",
          refId: promo._id,
          code: promo.code,
          discountType: promo.discountType,
          discountValue: promo.discountValue,
        };
      } else {
        const codeOwner = await User.findById(userId);
        const loyaltyEntry = (codeOwner?.loyaltyCodes || []).find(
          (c) => c.code === promoCodeInput,
        );

        if (!loyaltyEntry) {
          return res
            .status(404)
            .json({ success: false, message: "Promo code not found." });
        }
        if (loyaltyEntry.usedAt) {
          return res.status(400).json({
            success: false,
            message: "This code has already been used.",
          });
        }
        if (
          loyaltyEntry.expiresAt &&
          new Date(loyaltyEntry.expiresAt) < new Date()
        ) {
          return res
            .status(400)
            .json({ success: false, message: "This code has expired." });
        }
        if (loyaltyEntry.minRentalDays && days < loyaltyEntry.minRentalDays) {
          return res.status(400).json({
            success: false,
            message: `This code requires a minimum rental of ${loyaltyEntry.minRentalDays} day(s).`,
          });
        }

        rescheduleDiscount = {
          source: "loyalty",
          refId: loyaltyEntry._id,
          code: loyaltyEntry.code,
          discountType: loyaltyEntry.discountType,
          discountValue: loyaltyEntry.discountValue,
        };
      }

      const baseRental = dailyRate * days;
      const discountAmount =
        rescheduleDiscount.discountType === "percentage"
          ? (baseRental * rescheduleDiscount.discountValue) / 100
          : Math.min(rescheduleDiscount.discountValue, baseRental);

      newAmount = Math.max(0, newAmount - discountAmount);
    } else if (dailyRate > 0 && booking.details?.appliedDiscount) {
      const original = booking.details.appliedDiscount;
      let stillValid = true;

      if (!original.isLoyaltyCode) {
        // Global promo codes can be deactivated/expired after the original
        // booking was made — re-check current validity before continuing to
        // honor it. (Loyalty codes were redeemed specifically for this
        // booking already, so they stay honored on it regardless of the
        // code's live state elsewhere.)
        const Discount = mongoose.model("Discount");
        const promoDoc = original.id
          ? await Discount.findById(original.id).lean()
          : original.code
            ? await Discount.findOne({ code: original.code }).lean()
            : null;
        if (promoDoc) {
          const now = new Date();
          const isActive = promoDoc.isActive !== false;
          const isStarted =
            !promoDoc.startDate || new Date(promoDoc.startDate) <= now;
          const isNotExpired =
            !promoDoc.endDate || new Date(promoDoc.endDate) >= now;
          stillValid = isActive && isStarted && isNotExpired;
        } else {
          stillValid = false;
        }
      }

      if (
        stillValid &&
        original.discountType &&
        original.discountValue != null
      ) {
        const cappedDays = Math.min(days, originalDays);
        const extraDays = Math.max(0, days - cappedDays);
        const cappedBaseRental = dailyRate * cappedDays;
        const discountAmount =
          original.discountType === "percentage"
            ? (cappedBaseRental * original.discountValue) / 100
            : Math.min(original.discountValue, cappedBaseRental);
        const discountedCappedRental = Math.max(
          0,
          cappedBaseRental - discountAmount,
        );
        const extraAmount = dailyRate * extraDays;

        newAmount =
          discountedCappedRental + extraAmount + distanceFee + helmetFee;
        rescheduleDiscount = {
          source: "carryover",
          refId: original.id || null,
          code: original.code || "",
          discountType: original.discountType,
          discountValue: original.discountValue,
        };
      }
    }

    const previousPickupDate = booking.pickupDate;
    const previousPickupTime = booking.pickupTime;
    const previousReturnDate = booking.returnDate;
    const previousReturnTime = booking.returnTime;

    booking.pickupDate = new Date(newPickupAt);
    booking.pickupTime = pickupTime;
    booking.returnDate = new Date(newReturnAt);
    booking.returnTime = returnTime;
    booking.amount = newAmount;
    booking.reschedules = booking.reschedules || [];
    booking.reschedules.push({
      requestedAt: new Date(),
      requestedBy: new mongoose.Types.ObjectId(userId),
      previousPickupDate,
      previousPickupTime,
      previousReturnDate,
      previousReturnTime,
      newPickupDate: booking.pickupDate,
      newPickupTime: booking.pickupTime,
      newReturnDate: booking.returnDate,
      newReturnTime: booking.returnTime,
      previousAmount,
      newAmount,
      additionalAmount: newAmount - previousAmount,
      // "promo"/"loyalty" = freshly entered code for this reschedule;
      // "carryover" = original checkout discount auto-continuing (capped);
      // null = no discount applies.
      appliedDiscount: rescheduleDiscount || null,
    });

    const updated = await booking.save();

    // Only a freshly-entered code counts as a new redemption — a carried-
    // over discount was already marked used at the original booking.
    if (rescheduleDiscount) {
      if (rescheduleDiscount.source === "promo") {
        await mongoose
          .model("Discount")
          .findByIdAndUpdate(rescheduleDiscount.refId, {
            $inc: { usedCount: 1 },
          });
      } else if (rescheduleDiscount.source === "loyalty") {
        await User.updateOne(
          { _id: userId, "loyaltyCodes._id": rescheduleDiscount.refId },
          {
            $set: {
              "loyaltyCodes.$.usedAt": new Date(),
              "loyaltyCodes.$.usedOnBookingId": updated._id,
            },
          },
        );
      }
    }

    await Motorcycle.findOneAndUpdate(
      {
        _id: motorcycleId,
        "bookings.bookingId": booking._id,
      },
      {
        $set: {
          "bookings.$.pickupDate": booking.pickupDate,
          "bookings.$.returnDate": booking.returnDate,
        },
      },
    );

    await updateMotorcycleStatus(motorcycleId);

    await createSystemLog({
      req,
      actorType: "user",
      action: "booking_rescheduled",
      targetType: "booking",
      targetId: updated._id,
      summary: `Booking rescheduled: ${buildBookingLabel(updated)}`,
      metadata: {
        previousPickupDate,
        previousPickupTime,
        previousReturnDate,
        previousReturnTime,
        newPickupDate: booking.pickupDate,
        newPickupTime: booking.pickupTime,
        newReturnDate: booking.returnDate,
        newReturnTime: booking.returnTime,
        previousAmount,
        newAmount,
        appliedDiscount: rescheduleDiscount || null,
      },
    });

    return res.json({
      success: true,
      booking: updated,
      newAmount,
      appliedDiscount: rescheduleDiscount || null,
      days,
    });
  } catch (err) {
    next(err);
  }
};

export const requestBookingProofReupload = async (req, res, next) => {
  try {
    const comment = String(req.body?.comment || "").trim();
    if (!comment) {
      return res.status(400).json({
        success: false,
        message: "Comment is required when requesting proof re-upload.",
      });
    }

    const booking = await MotorcycleBooking.findById(req.params.id);
    if (!booking)
      return res
        .status(404)
        .json({ success: false, message: "Booking not found." });

    booking.status = "pending_reservation";
    booking.paymentStatus = "rejected";
    booking.reservationFeePaid = false;
    booking.requiresProofReupload = true;
    booking.adminReviewComment = comment;
    booking.adminReviewedAt = new Date();
    booking.receiptVerification = {
      ...(booking.receiptVerification || {}),
      status: "failed",
      checkedAt: new Date(),
      reasons: [
        ...(booking.receiptVerification?.reasons || []),
        `Admin requested re-upload: ${comment}`,
      ],
    };

    const updated = await booking.save();

    const motorcycleId = booking.motorcycle?.id;
    if (motorcycleId) {
      await Motorcycle.findOneAndUpdate(
        {
          _id: motorcycleId,
          "bookings.bookingId": booking._id,
        },
        {
          $set: {
            "bookings.$.status": "pending_reservation",
          },
        },
      );
      await updateMotorcycleStatus(motorcycleId);
    }

    notifyProofReuploadRequested(
      updated.userId,
      updated._id,
      comment,
      updated.adminReviewedAt,
    ).catch((e) =>
      console.error("[Push] notifyProofReuploadRequested:", e.message),
    );

    return res.json({
      success: true,
      message: "Re-upload request sent to renter.",
      booking: updated,
    });
  } catch (err) {
    next(err);
  }
};

export const reuploadBookingPaymentProof = async (req, res, next) => {
  try {
    const booking = await MotorcycleBooking.findById(req.params.id);
    if (!booking)
      return res
        .status(404)
        .json({ success: false, message: "Booking not found." });

    if (!req.user || (!req.user.id && !req.user._id)) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const userId = String(req.user._id || req.user.id);
    if (String(booking.userId) !== userId) {
      return res
        .status(403)
        .json({ success: false, message: "You cannot update this booking." });
    }

    if (!booking.requiresProofReupload) {
      return res.status(400).json({
        success: false,
        message: "This booking does not currently require proof re-upload.",
      });
    }

    const paymentReferenceId = String(
      req.body?.paymentReferenceId || "",
    ).trim();
    const paymentSentAt = req.body?.paymentSentAt;
    const paymentSentAmount = Number(req.body?.paymentSentAmount);

    if (
      !paymentReferenceId ||
      !paymentSentAt ||
      !Number.isFinite(paymentSentAmount)
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required re-upload fields.",
      });
    }

    if (paymentSentAmount !== REQUIRED_DOWNPAYMENT) {
      return res.status(400).json({
        success: false,
        message: `Payment sent amount must be exactly ₱${REQUIRED_DOWNPAYMENT}`,
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Payment proof image is required.",
      });
    }

    const parsedSentAt = new Date(paymentSentAt);
    if (Number.isNaN(parsedSentAt.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment sent time.",
      });
    }

    const receiptVerification = await verifyReceiptWithTimeout({
      referenceId: paymentReferenceId,
      sentAmount: paymentSentAmount,
      expectedAmount: REQUIRED_DOWNPAYMENT,
      sentAt: parsedSentAt,
      file: req.file,
    });

    if (booking.paymentProofImage?.startsWith("/uploads/")) {
      deleteLocalFileIfPresent(booking.paymentProofImage);
    }

    // ── Upload payment proof image ────────────────────────────────────────
    const paymentProofUrl = await getUploadedPaymentProofUrl(req.file);
    if (!paymentProofUrl) {
      return res.status(500).json({
        success: false,
        message: "Failed to process payment proof image",
      });
    }

    booking.paymentProofImage = paymentProofUrl;
    booking.paymentReferenceId = paymentReferenceId;
    booking.paymentSentAt = parsedSentAt;
    booking.paymentSentAmount = paymentSentAmount;
    booking.receiptVerification = receiptVerification;
    booking.status = "pending_reservation";
    booking.paymentStatus = "pending_verification";
    booking.requiresProofReupload = false;
    booking.adminReviewComment = "";
    booking.adminReviewedAt = new Date();

    const updated = await booking.save();

    return res.json({
      success: true,
      message: "Payment proof re-uploaded successfully.",
      booking: updated,
    });
  } catch (err) {
    next(err);
  }
};

export const updateMotorcycleBookingStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: "Status is required" });

    const booking = await MotorcycleBooking.findById(req.params.id);
    if (!booking)
      return res.status(404).json({ message: "Booking not found." });

    const motorcycleId = booking.motorcycle?.id;
    const previousStatus = booking.status;

    if (status === "inspection") {
      if (booking.status !== "active") {
        return res.status(400).json({
          message: "Only active bookings can move to inspection.",
        });
      }
      booking.returnInspection = {
        ...booking.returnInspection,
        clearanceStatus:
          booking.returnInspection?.clearanceStatus || "pending_inspection",
        vehicleStatus: "inspection",
        startedAt: booking.returnInspection?.startedAt || new Date(),
        updatedAt: new Date(),
      };
    }

    if (status === "completed") {
      if (booking.status !== "inspection") {
        return res.status(400).json({
          message: "Booking must be in inspection before completing.",
        });
      }

      const clearanceStatus = booking.returnInspection?.clearanceStatus;
      if (clearanceStatus !== "cleared") {
        return res.status(400).json({
          message:
            "Return inspection must be cleared before completing the booking.",
        });
      }

      if (
        booking.returnInspection?.clearanceStatus === "penalty_required" &&
        !booking.returnInspection?.penaltySettled
      ) {
        return res.status(400).json({
          message: "Penalty settlement required before completion.",
        });
      }

      booking.returnInspection = {
        ...booking.returnInspection,
        clearedAt: booking.returnInspection?.clearedAt || new Date(),
        updatedAt: new Date(),
      };
    }

    booking.status = status;
    const updated = await booking.save();

    if (status === "active") {
      captureBookingBaseline(updated._id, motorcycleId).catch(() => {});
    }

    if (status === "completed" && motorcycleId) {
      captureTrackingSummaryOnCompletion(updated._id, motorcycleId).catch(
        () => {},
      );
    }

    if (
      status === "completed" &&
      previousStatus !== "completed" &&
      updated.userId
    ) {
      evaluateLoyaltyAfterCompletion(updated.userId).catch((e) =>
        console.error("[Loyalty] evaluateLoyaltyAfterCompletion:", e.message),
      );
    }

    if (motorcycleId) {
      await Motorcycle.findOneAndUpdate(
        {
          _id: motorcycleId,
          "bookings.bookingId": booking._id,
        },
        {
          $set: {
            "bookings.$.status": status,
          },
        },
      );

      await updateMotorcycleStatus(motorcycleId);
    }

    await createSystemLog({
      req,
      actorType: "admin",
      action: "booking_status_updated",
      targetType: "booking",
      targetId: updated._id,
      summary: `Booking status changed (${previousStatus} -> ${status}): ${buildBookingLabel(updated)}`,
      metadata: {
        previousStatus,
        newStatus: status,
      },
    });

    notifyBookingStatusChange(updated.userId, status, updated._id).catch((e) =>
      console.error("[Push] notifyBookingStatusChange:", e.message),
    );

    res.json(updated);
  } catch (err) {
    next(err);
  }
};

export const updateReturnInspection = async (req, res, next) => {
  try {
    const booking = await MotorcycleBooking.findById(req.params.id);
    if (!booking)
      return res.status(404).json({ message: "Booking not found." });

    if (booking.status !== "inspection") {
      return res.status(400).json({
        message: "Booking must be in inspection before updating clearance.",
      });
    }

    const motorcycleId = booking.motorcycle?.id;
    const previousBookingStatus = booking.status;

    const {
      clearanceStatus,
      inspectionDate,
      penaltyAmount,
      penaltySummary,
      penaltySettled,
      vehicleStatus,
      violations: rawViolationsInput,
    } = req.body || {};
    const previousClearance = booking.returnInspection?.clearanceStatus;

    const inspection = {
      ...(booking.returnInspection || {}),
    };
    const wasPenaltySettled = Boolean(booking.returnInspection?.penaltySettled);

    if (clearanceStatus) {
      if (!CLEARANCE_STATUSES.includes(clearanceStatus)) {
        return res.status(400).json({ message: "Invalid clearance status." });
      }
      inspection.clearanceStatus = clearanceStatus;
    }

    if (inspectionDate) {
      const parsedDate = new Date(inspectionDate);
      if (!Number.isNaN(parsedDate.getTime())) {
        inspection.inspectionDate = parsedDate;
      }
    }

    // Only include fields relevant to clearance status
    if (inspection.clearanceStatus === "penalty_required") {
      const parsedRawViolations = tryParseJSON(rawViolationsInput);
      if (Array.isArray(parsedRawViolations)) {
        const effectiveMatrix = await getEffectiveInspectionMatrix();
        const { violations, total } = computeViolations(
          parsedRawViolations,
          effectiveMatrix,
        );
        inspection.violations = violations;
        inspection.penaltyAmount = total;
        inspection.penaltySummary =
          typeof penaltySummary === "string" && penaltySummary
            ? penaltySummary
            : violations.length
              ? violations
                  .map((v) =>
                    v.quantity > 1
                      ? `${v.label} x${v.quantity} (₱${v.amount})`
                      : `${v.label} (₱${v.amount})`,
                  )
                  .join(", ")
              : "No violations found";
      } else {
        // Fallback for older clients that still send a raw amount/summary.
        if (typeof penaltySummary === "string")
          inspection.penaltySummary = penaltySummary;
        if (penaltyAmount !== undefined) {
          const parsed = Number(penaltyAmount);
          if (!Number.isNaN(parsed)) inspection.penaltyAmount = parsed;
        }
      }
      inspection.vehicleStatus = "maintenance";
    } else if (inspection.clearanceStatus === "pending_inspection") {
      inspection.vehicleStatus = "inspection";
    } else if (inspection.clearanceStatus === "cleared") {
      inspection.vehicleStatus = "available";
    }

    // If we are no longer in penalty_required, remove penalty fields
    if (inspection.clearanceStatus !== "penalty_required") {
      delete inspection.penaltyAmount;
      delete inspection.penaltySummary;
      delete inspection.penaltySettled;
      delete inspection.violations;
    }

    if (penaltySettled !== undefined) {
      inspection.penaltySettled =
        String(penaltySettled).toLowerCase() === "true" ||
        penaltySettled === true;
    }

    const penaltyFiles = req.files?.penaltyPhotos || [];

    if (inspection.clearanceStatus === "penalty_required") {
      const penaltyUrls = await getUploadedInspectionUrls(
        penaltyFiles,
        CLOUDINARY_RETURN_INSPECTION_FOLDER,
      );

      if (penaltyUrls.length) {
        inspection.penaltyPhotos = [
          ...(inspection.penaltyPhotos || []),
          ...penaltyUrls,
        ];
      }
    }

    inspection.updatedAt = new Date();

    if (inspection.clearanceStatus === "cleared") {
      inspection.clearedAt = inspection.clearedAt || new Date();
      booking.status = "completed";
    }

    // If penalty is settled, mark inspection as completed
    if (
      inspection.penaltySettled &&
      inspection.clearanceStatus === "penalty_required"
    ) {
      if (!wasPenaltySettled) {
        const penaltyTotal = Number(inspection.penaltyAmount || 0);
        if (penaltyTotal > 0) {
          booking.amount = Number(booking.amount || 0) + penaltyTotal;
        }
      }

      inspection.clearedAt = inspection.clearedAt || new Date();
      inspection.vehicleStatus = "available";
      booking.status = "completed";
    }

    // ── Security deposit refund handling ──────────────────────────────────
    // Fully automatic, no manual admin entry:
    //   • Cleared          → full ₱ deposit refunded immediately, no
    //                        deductions (there were no violations).
    //   • Settle Penalty   → the server-recomputed penalty total is
    //                        deducted (capped at the deposit amount) and the
    //                        remaining balance is refunded in the same
    //                        action. Any penalty beyond the deposit is
    //                        recorded as a balance the customer still owes.
    let depositRefundInfo = null;
    if (
      booking.securityDeposit?.collected &&
      !booking.securityDeposit?.returned
    ) {
      const deposit = {
        ...(booking.securityDeposit?.toObject?.() ||
          booking.securityDeposit ||
          {}),
      };
      const depositCap = Number(deposit.amount || 1000);

      if (inspection.clearanceStatus === "cleared") {
        deposit.deductions = 0;
        deposit.balanceDue = 0;
        deposit.returned = true;
        deposit.returnedAt = new Date();
        deposit.returnedAmount = depositCap;
        deposit.deductionNotes = "";
        deposit.refundReason =
          "Full refund — no violations found during inspection.";
        booking.securityDeposit = deposit;
        depositRefundInfo = {
          type: "full",
          deducted: 0,
          refunded: depositCap,
          balanceDue: 0,
        };
      } else if (
        inspection.clearanceStatus === "penalty_required" &&
        inspection.penaltySettled &&
        !wasPenaltySettled
      ) {
        const penaltyTotal = Number(inspection.penaltyAmount || 0);
        const deduction = Math.min(depositCap, Math.max(0, penaltyTotal));
        const balanceDue = Math.max(0, penaltyTotal - depositCap);
        deposit.deductions = deduction;
        deposit.balanceDue = balanceDue;
        deposit.deductionNotes = inspection.penaltySummary || "";
        deposit.returned = true;
        deposit.returnedAt = new Date();
        deposit.returnedAmount = Math.max(0, depositCap - deduction);
        deposit.refundReason =
          balanceDue > 0
            ? `Partial refund — ₱${deduction.toLocaleString()} deducted for violations (${
                inspection.penaltySummary || "see inspection details"
              }). Customer still owes ₱${balanceDue.toLocaleString()}.`
            : deduction > 0
              ? `Partial refund — ₱${deduction.toLocaleString()} deducted for violations (${
                  inspection.penaltySummary || "see inspection details"
                }).`
              : "Full refund — no deductions applied.";
        booking.securityDeposit = deposit;
        depositRefundInfo = {
          type: "settlement",
          deducted: deduction,
          refunded: deposit.returnedAmount,
          balanceDue,
        };
      }
    }

    booking.returnInspection = inspection;
    const updated = await booking.save();

    if (
      previousBookingStatus !== "completed" &&
      updated.status === "completed" &&
      updated.userId
    ) {
      evaluateLoyaltyAfterCompletion(updated.userId).catch((e) =>
        console.error("[Loyalty] evaluateLoyaltyAfterCompletion:", e.message),
      );
    }

    // Notify customer when clearance status changes to penalty_required,
    // when the vehicle is cleared with no penalties, or when an existing
    // penalty gets settled.
    if (updated.userId) {
      if (
        inspection.clearanceStatus === "penalty_required" &&
        previousClearance !== "penalty_required"
      ) {
        notifyPenaltyRequired(
          updated.userId,
          updated._id,
          inspection.penaltyAmount,
          inspection.penaltySummary,
        ).catch((e) =>
          console.error("[Push] notifyPenaltyRequired:", e.message),
        );
      } else if (
        inspection.clearanceStatus === "cleared" &&
        previousClearance !== "cleared"
      ) {
        notifyVehicleCleared(updated.userId, updated._id).catch((e) =>
          console.error("[Push] notifyVehicleCleared:", e.message),
        );
      } else if (
        inspection.clearanceStatus === "penalty_required" &&
        inspection.penaltySettled &&
        !wasPenaltySettled
      ) {
        notifyPenaltySettled(
          updated.userId,
          updated._id,
          depositRefundInfo?.type === "settlement" ? depositRefundInfo : {},
        ).catch((e) =>
          console.error("[Push] notifyPenaltySettled:", e.message),
        );
      }
    }

    if (motorcycleId) {
      const nextMotorcycleStatus = inspection.vehicleStatus || null;

      if (nextMotorcycleStatus) {
        await Motorcycle.findByIdAndUpdate(motorcycleId, {
          $set: { status: nextMotorcycleStatus },
        });
      }

      if (booking.status === "completed") {
        await Motorcycle.findOneAndUpdate(
          {
            _id: motorcycleId,
            "bookings.bookingId": booking._id,
          },
          {
            $set: { "bookings.$.status": "completed" },
          },
        );
        captureTrackingSummaryOnCompletion(updated._id, motorcycleId).catch(
          () => {},
        );
      }

      await updateMotorcycleStatus(motorcycleId);
    }

    await createSystemLog({
      req,
      actorType: "admin",
      action: "return_inspection_updated",
      targetType: "booking",
      targetId: updated._id,
      summary: `Return inspection updated: ${buildBookingLabel(updated)}`,
      metadata: {
        clearanceStatus: updated.returnInspection?.clearanceStatus,
        penaltySettled: updated.returnInspection?.penaltySettled,
        bookingStatus: updated.status,
        securityDepositReturned: updated.securityDeposit?.returned || false,
        securityDepositReturnedAmount:
          updated.securityDeposit?.returnedAmount || 0,
        securityDepositDeductions: updated.securityDeposit?.deductions || 0,
      },
    });

    // Dedicated audit-trail entry for the deposit refund itself, so the
    // refund is clearly recorded in booking history independent of the
    // general inspection-update log above.
    if (depositRefundInfo) {
      await createSystemLog({
        req,
        actorType: "admin",
        action: "security_deposit_refunded",
        targetType: "booking",
        targetId: updated._id,
        summary:
          depositRefundInfo.type === "full"
            ? `Full security deposit refunded (₱${depositRefundInfo.refunded.toLocaleString()}): ${buildBookingLabel(updated)}`
            : `Security deposit settled — ₱${depositRefundInfo.deducted.toLocaleString()} deducted, ₱${depositRefundInfo.refunded.toLocaleString()} refunded${
                depositRefundInfo.balanceDue > 0
                  ? `, ₱${depositRefundInfo.balanceDue.toLocaleString()} balance due`
                  : ""
              }: ${buildBookingLabel(updated)}`,
        metadata: {
          refundType: depositRefundInfo.type,
          deducted: depositRefundInfo.deducted,
          refunded: depositRefundInfo.refunded,
          balanceDue: depositRefundInfo.balanceDue,
          refundReason: updated.securityDeposit?.refundReason || "",
        },
      });
    }

    return res.json({ success: true, booking: updated });
  } catch (err) {
    next(err);
  }
};

export const confirmFullPayment = async (req, res, next) => {
  try {
    const booking = await MotorcycleBooking.findById(req.params.id);
    if (!booking)
      return res.status(404).json({ message: "Booking not found." });

    if (booking.paymentStatus === "fully_paid" && booking.status === "active") {
      return res
        .status(400)
        .json({ message: "Payment already confirmed for this booking." });
    }

    const motorcycleId = booking.motorcycle?.id;

    // Stage 1: Admin confirms reservation payment proof.
    if (booking.status === "pending_reservation") {
      booking.reservationFeePaid = true;
      booking.paymentStatus = "reservation_paid";
      booking.status = "pending_full_payment";
      booking.reservationConfirmedAt = new Date();
      const updated = await booking.save();

      if (motorcycleId) {
        await Motorcycle.findOneAndUpdate(
          {
            _id: motorcycleId,
            "bookings.bookingId": booking._id,
          },
          {
            $set: {
              "bookings.$.status": "pending_full_payment",
            },
          },
        );

        await updateMotorcycleStatus(motorcycleId);
      }

      sendBookingReceiptEmail(updated.email, {
        customerName: updated.customer,
        bookingId: updated._id?.toString(),
        motorcycleName:
          `${updated.motorcycle?.make || ""} ${updated.motorcycle?.model || ""}`.trim(),
        motorcycleYear: updated.motorcycle?.year || new Date().getFullYear(),
        pickupDate: updated.pickupDate?.toISOString?.().split("T")[0] || "—",
        returnDate: updated.returnDate?.toISOString?.().split("T")[0] || "—",
        destination:
          updated.destination || updated.details?.destinationCity || "—",
        pickupLocation:
          updated.details?.pickupLocation ||
          "Soldiers Hills IV, Block 9 Lot 1 PH2 Lily, Bacoor, 4102 Cavite",
        referenceId: updated.paymentReferenceId,
        downpayment: updated.reservationFee || 200,
        totalAmount: updated.amount || 0,
        distanceFee: updated.details?.distanceFee || 0,
        helmetFee: updated.details?.helmetFee || 0,
        baseRental: updated.motorcycle?.dailyRate || 0,
      }).catch((err) => {
        console.error("Receipt email send failed:", err);
      });

      await createSystemLog({
        req,
        actorType: "admin",
        action: "reservation_confirmed",
        targetType: "booking",
        targetId: updated._id,
        summary: `Pending reservation confirmed: ${buildBookingLabel(updated)}`,
        metadata: {
          status: updated.status,
          paymentStatus: updated.paymentStatus,
        },
      });

      notifyBookingStatusChange(
        updated.userId,
        "pending_full_payment",
        updated._id,
      ).catch((e) =>
        console.error(
          "[Push] notifyBookingStatusChange pending_full_payment:",
          e.message,
        ),
      );

      return res.json({
        success: true,
        message:
          "Reservation payment confirmed. Digital receipt sent. Booking is now pending full payment.",
        booking: updated,
      });
    }

    // Stage 2: Admin confirms full payment during pickup and activates booking.
    // A ₱1,000 refundable security deposit must be collected before the
    // motorcycle is released — this cannot be skipped.
    const depositAlreadyCollected = Boolean(booking.securityDeposit?.collected);
    const depositCollectedNow =
      req.body.securityDepositCollected === true ||
      String(req.body.securityDepositCollected).toLowerCase() === "true";

    if (!depositAlreadyCollected && !depositCollectedNow) {
      return res.status(400).json({
        success: false,
        message:
          "A ₱1,000 refundable security deposit must be collected before the motorcycle can be picked up.",
      });
    }

    booking.paymentStatus = "fully_paid";
    booking.status = "active";
    booking.fullPaymentConfirmedAt = new Date();

    // 👉 THIS IS THE MISSING FIX: Save the payment method from the request
    if (req.body.fullPaymentMethod) {
      booking.fullPaymentMethod = req.body.fullPaymentMethod;
    }

    if (!depositAlreadyCollected) {
      booking.securityDeposit = {
        ...(booking.securityDeposit?.toObject?.() ||
          booking.securityDeposit ||
          {}),
        required: true,
        amount: 1000,
        collected: true,
        collectedAt: new Date(),
        collectionMethod:
          req.body.securityDepositMethod ||
          req.body.fullPaymentMethod ||
          "Cash",
        receivedBy: req.user?._id || req.user?.id || null,
      };
    }

    const updated = await booking.save();

    captureBookingBaseline(updated._id, motorcycleId).catch(() => {});

    if (motorcycleId) {
      await Motorcycle.findOneAndUpdate(
        {
          _id: motorcycleId,
          "bookings.bookingId": booking._id,
        },
        {
          $set: {
            "bookings.$.status": "active",
          },
        },
      );

      await updateMotorcycleStatus(motorcycleId);
    }

    await createSystemLog({
      req,
      actorType: "admin",
      action: "full_payment_confirmed",
      targetType: "booking",
      targetId: updated._id,
      summary: `Pending full payment confirmed: ${buildBookingLabel(updated)}`,
      metadata: {
        status: updated.status,
        paymentStatus: updated.paymentStatus,
        fullPaymentMethod: updated.fullPaymentMethod, // Log it too
        securityDepositCollected: updated.securityDeposit?.collected || false,
        securityDepositAmount: updated.securityDeposit?.amount || 1000,
        securityDepositMethod: updated.securityDeposit?.collectionMethod || "",
      },
    });

    notifyPaymentConfirmed(updated.userId).catch((e) =>
      console.error("[Push] notifyPaymentConfirmed:", e.message),
    );
    notifyBookingStatusChange(updated.userId, "active", updated._id).catch(
      (e) =>
        console.error("[Push] notifyBookingStatusChange active:", e.message),
    );

    res.json({
      success: true,
      message: "Full payment confirmed and booking activated",
      booking: updated,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteMotorcycleBooking = async (req, res, next) => {
  try {
    const booking = await MotorcycleBooking.findById(req.params.id);
    if (!booking)
      return res.status(404).json({ message: "Booking not found." });

    booking.isDeleted = true;
    booking.deletedAt = new Date();
    await booking.save();

    await createSystemLog({
      req,
      actorType: "admin",
      action: "booking_rejected",
      targetType: "booking",
      targetId: booking._id,
      summary: `Booking rejected: ${buildBookingLabel(booking)}`,
      metadata: {
        deletedAt: booking.deletedAt,
      },
    });

    res.json({ message: "Motorcycle booking deleted successfully", booking });
  } catch (err) {
    next(err);
  }
};

export const deleteMotorcycleBookingLocationLog = async (req, res, next) => {
  try {
    const bookingId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid booking ID." });
    }

    const updated = await MotorcycleBooking.findByIdAndUpdate(
      bookingId,
      {
        $unset: {
          "details.lastKnownLocation": "",
          "details.location": "",
          "details.locationText": "",
        },
        $set: {
          "details.locationLogDeletedAt": new Date(),
        },
      },
      { new: true },
    );

    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found." });
    }

    await LocationSnapshot.deleteMany({
      $or: [
        { bookingId: String(updated._id) },
        { motorcycleId: String(updated.motorcycle?.id || "") },
        { unitId: String(updated.motorcycle?.unitId || "") },
      ],
    });

    await createSystemLog({
      req,
      actorType: "admin",
      action: "location_log_deleted",
      targetType: "booking",
      targetId: updated._id,
      summary: `Location log deleted: ${buildBookingLabel(updated)}`,
      metadata: {
        locationLogDeletedAt:
          updated.details?.locationLogDeletedAt || new Date(),
      },
    });

    return res.json({
      success: true,
      message: "Location log deleted successfully.",
      booking: updated,
    });
  } catch (err) {
    return next(err);
  }
};

export const restoreMotorcycleBooking = async (req, res, next) => {
  try {
    const booking = await MotorcycleBooking.findById(req.params.id);
    if (!booking)
      return res.status(404).json({ message: "Booking not found." });

    booking.isDeleted = false;
    booking.deletedAt = null;
    await booking.save();

    await createSystemLog({
      req,
      actorType: "admin",
      action: "booking_restored",
      targetType: "booking",
      targetId: booking._id,
      summary: `Booking restored: ${buildBookingLabel(booking)}`,
      metadata: {
        status: booking.status,
      },
    });

    res.json({ message: "Motorcycle booking restored successfully", booking });
  } catch (err) {
    next(err);
  }
};

export const permanentDeleteMotorcycleBooking = async (req, res, next) => {
  try {
    const booking = await MotorcycleBooking.findById(req.params.id);
    if (!booking)
      return res.status(404).json({ message: "Booking not found." });

    await MotorcycleBooking.deleteOne({ _id: booking._id });

    await createSystemLog({
      req,
      actorType: "admin",
      action: "booking_permanently_deleted",
      targetType: "booking",
      targetId: booking._id,
      summary: `Booking permanently deleted: ${buildBookingLabel(booking)}`,
    });

    res.json({ message: "Motorcycle booking permanently deleted" });
  } catch (err) {
    console.error("Permanent delete error:", err);
    next(err);
  }
};

export const downloadRentalAgreement = async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    if (!bookingId) {
      return res.status(400).json({ message: "Booking ID is required" });
    }

    const booking = await MotorcycleBooking.findById(bookingId).lean();
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Generate the PDF
    const doc = generateRentalAgreementPDF(booking);

    // Set response headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="RentalAgreement_${booking.customer.replace(/\s+/g, "_")}_${booking._id}.pdf"`,
    );

    // Pipe the PDF to response
    doc.pipe(res);
    doc.end();

    await createSystemLog({
      req,
      actorType: "user",
      action: "rental_agreement_downloaded",
      targetType: "booking",
      targetId: booking._id,
      summary: `Rental agreement downloaded for booking: ${buildBookingLabel(booking)}`,
    });
  } catch (err) {
    console.error("Error downloading rental agreement:", err);
    next(err);
  }
};

export const updateTrackingSummary = async (req, res, next) => {
  try {
    const { totalDistanceKm, avgSpeedKmh, maxSpeedKmh, stopsMade } = req.body;
    const booking = await MotorcycleBooking.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          trackingSummary: {
            totalDistanceKm: Number(totalDistanceKm || 0),
            avgSpeedKmh: Number(avgSpeedKmh || 0),
            maxSpeedKmh: Number(maxSpeedKmh || 0),
            stopsMade: Number(stopsMade || 0),
            lastUpdatedAt: new Date(),
          },
        },
      },
      { new: true },
    );
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    res.json({ success: true, trackingSummary: booking.trackingSummary });
  } catch (err) {
    next(err);
  }
};

// POST /api/motorcycle-bookings/backfill-tracking-summaries
// Retroactively compute and save trackingSummary for completed bookings that have a baseline but no summary
export const backfillTrackingSummaries = async (req, res, next) => {
  try {
    const bookings = await MotorcycleBooking.find({
      status: "completed",
      trackingBaseline: { $exists: true },
      trackingSummary: { $exists: false },
    })
      .select("_id motorcycle trackingBaseline")
      .lean();

    if (!bookings.length) {
      return res.json({ message: "No bookings need backfill", processed: 0 });
    }

    const results = [];
    for (const booking of bookings) {
      try {
        const moto = await Motorcycle.findById(booking.motorcycle).select(
          "traccarDeviceId",
        );
        const uniqueId = moto?.traccarDeviceId?.trim();
        if (!uniqueId) {
          results.push({
            id: booking._id,
            status: "skipped",
            reason: "no traccarDeviceId",
          });
          continue;
        }

        const device = await resolveTraccarDeviceId(uniqueId);
        if (!device) {
          results.push({
            id: booking._id,
            status: "skipped",
            reason: "device not found in Traccar",
          });
          continue;
        }

        const baseline = booking.trackingBaseline;
        const from = baseline?.capturedAt
          ? new Date(baseline.capturedAt).toISOString()
          : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const to = new Date().toISOString();

        const summary = await fetchTraccarSummary(device.id, from, to);
        if (!summary) {
          results.push({
            id: booking._id,
            status: "skipped",
            reason: "no Traccar summary data",
          });
          continue;
        }

        await MotorcycleBooking.findByIdAndUpdate(booking._id, {
          $set: { trackingSummary: summary },
        });
        results.push({
          id: booking._id,
          status: "saved",
          distanceKm: summary.totalDistanceKm.toFixed(2),
        });
      } catch (err) {
        results.push({ id: booking._id, status: "error", reason: err.message });
      }
    }

    res.json({ processed: results.length, results });
  } catch (err) {
    next(err);
  }
};
