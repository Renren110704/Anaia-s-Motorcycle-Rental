import mongoose from "mongoose";
import MotorcycleBooking from "../models/motorcycleBookingModel.js";
import Motorcycle from "../models/motorcycleModel.js";
import LocationSnapshot from "../models/locationSnapshotModel.js";
import { sendBookingReceiptEmail } from "../utils/emailService.js";
import { verifyDigitalReceipt } from "../utils/receiptVerifier.js";
import { createSystemLog } from "../utils/systemLogService.js";
import { generateRentalAgreementPDF } from "../utils/rentalAgreementPDF.js";
import { v2 as cloudinary } from "cloudinary";

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
  "damage_found",
  "penalty_required",
];
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
const CLOUDINARY_FOLDER = process.env.CLOUDINARY_UPLOAD_FOLDER || "anaiasmotorcyclerental";
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

const uploadFileToCloudinary = async (filePath, targetFolder = CLOUDINARY_FOLDER) => {
  if (!filePath || !CLOUDINARY_ENABLED) {
    console.error("[CLOUDINARY] Upload skipped - filePath:", !!filePath, "enabled:", CLOUDINARY_ENABLED);
    return null;
  }

  const MAX_RETRIES = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[CLOUDINARY] Attempt ${attempt}/${MAX_RETRIES}: uploading ${filePath} to folder: ${targetFolder}`);
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

      const url = normalizeUrl(result.secure_url || result.url || result.secureUrl || "");
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
      console.error(`[CLOUDINARY] Attempt ${attempt} failed:`, err?.message || err);
      if (attempt < MAX_RETRIES) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delayMs));
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

  console.log("[PAYMENTPROOF] File exists, uploading to Cloudinary folder:", CLOUDINARY_PAYMENT_PROOF_FOLDER);
  const cloudUrl = await uploadFileToCloudinary(absolutePath, CLOUDINARY_PAYMENT_PROOF_FOLDER);
  
  if (cloudUrl) {
    console.log("[PAYMENTPROOF] Got Cloudinary URL:", cloudUrl);
    return cloudUrl;
  }

  console.error("[PAYMENTPROOF] Cloudinary upload failed, using local fallback");
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
  return returnAt.getTime() - pickupAt.getTime() >= minimumHours * 60 * 60 * 1000;
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

    return result || pendingReceiptVerification("Receipt verification deferred.");
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
      return ["pending_reservation", "pending_full_payment"].includes(
        status,
      ) || status === "pending";
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
      ["rented", "pending", "inspection", "under_review", "repair_needed"].includes(
        motorcycle.status,
      )
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

    const requesterObjectId = new mongoose.Types.ObjectId(userId);

    const { now, expiresAt } = getLockWindow();
    const updated = await Motorcycle.findOneAndUpdate(
      {
        _id: motorcycleId,
        isDeleted: false,
        $and: [
          {
            $or: [
              { "checkoutLock.userId": requesterObjectId },
              { checkoutLock: null },
              { "checkoutLock.expiresAt": { $exists: false } },
              { "checkoutLock.expiresAt": { $lte: now } },
            ],
          },
          {
            $or: [
              { status: "available" },
              { "checkoutLock.userId": requesterObjectId },
            ],
          },
        ],
      },
      {
        $set: {
          status: "pending",
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
        .select("status checkoutLock")
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
          message:
            "This motorcycle is currently being rented by someone else. Please choose another one.",
          lockExpiresAt: current.checkoutLock.expiresAt,
        });
      }

      return res.status(409).json({
        success: false,
        code: "MOTORCYCLE_NOT_AVAILABLE",
        message: "This motorcycle is not available right now.",
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
      !hasMinimumRentalDuration(
        pickupDate,
        pickupTime,
        returnDate,
        returnTime,
      )
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
      .select("maintenanceScheduleAt maintenanceScheduleStartAt maintenanceScheduleEndAt status")
      .lean();

    if (motorcycleWithMaintenance && motorcycleWithMaintenance.status !== "maintenance") {
      const rawStart = motorcycleWithMaintenance.maintenanceScheduleStartAt || motorcycleWithMaintenance.maintenanceScheduleAt || null;
      const rawEnd = motorcycleWithMaintenance.maintenanceScheduleEndAt || motorcycleWithMaintenance.maintenanceScheduleAt || null;
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

    if (pickupDay.getTime() !== today.getTime()) {
      return res.status(400).json({
        success: false,
        message: "Walk-in pickup date must be today",
      });
    }

    if (returnDay < pickupDay) {
      return res.status(400).json({
        success: false,
        message: "Return date cannot be before pickup date",
      });
    }

    if (returnDay > maxReturn) {
      return res.status(400).json({
        success: false,
        message: "Return date must be within 6 months from pickup date",
      });
    }

    if (
      !hasMinimumRentalDuration(
        pickupDate,
        pickupTime,
        returnDate,
        returnTime,
      )
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

    const bookingData = {
      userId: null,
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
      details: tryParseJSON(details),
      address: tryParseJSON(address),
      paymentStatus: "fully_paid",
      status: "active",
      paymentProofImage: "",
      paymentReferenceId: "",
      paymentSentAt: null,
      paymentSentAmount: 0,
      requiresProofReupload: false,
      adminReviewComment: "Walk-in rental",
      adminReviewedAt: new Date(),
      reservationConfirmedAt: new Date(),
      fullPaymentConfirmedAt: new Date(),
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
            $set: { status: "rented" },
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
        details: 1,
        address: 1,
        isDeleted: 1,
        deletedAt: 1,
        createdAt: 1,
        updatedAt: 1,
      })
      .sort({ bookingDate: -1 })
      .lean();
    
    // Ensure motorcycleImage is set from motorcycle.image if not present
    const enrichedBookings = bookings.map(booking => ({
      ...booking,
      motorcycleImage: booking.motorcycleImage || (booking.motorcycle?.image || ""),
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
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const userId = String(req.user._id || req.user.id);
    if (!booking.userId || String(booking.userId) !== userId) {
      return res.status(403).json({ success: false, message: "You cannot extend this booking." });
    }

    if (booking.isDeleted) {
      return res.status(400).json({ success: false, message: "This booking is not active." });
    }

    if (booking.status !== "active") {
      return res.status(400).json({ success: false, message: "Only active bookings can be extended." });
    }

    const returnDate = req.body?.returnDate;
    const returnTime = String(req.body?.returnTime || "").trim();
    if (!returnDate || !returnTime) {
      return res.status(400).json({ success: false, message: "returnDate and returnTime are required." });
    }

    const currentReturnAt = combineDateAndTime(booking.returnDate, booking.returnTime);
    const newReturnAt = combineDateAndTime(returnDate, returnTime);
    if (!currentReturnAt || !newReturnAt) {
      return res.status(400).json({ success: false, message: "Invalid return date/time." });
    }

    if (newReturnAt.getTime() <= currentReturnAt.getTime()) {
      return res.status(400).json({
        success: false,
        message: "New return time must be later than the current return time.",
      });
    }

    const motorcycleId = booking.motorcycle?.id;
    if (!motorcycleId) {
      return res.status(400).json({ success: false, message: "Booking has no motorcycle assigned." });
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
        message: "Extension conflicts with another booking for this motorcycle.",
      });
    }

    const days = computeRentalDays(
      booking.pickupDate,
      booking.pickupTime,
      returnDate,
      returnTime,
    );
    if (!days) {
      return res.status(400).json({ success: false, message: "Invalid extension duration." });
    }

    const dailyRate = Number(booking.motorcycle?.dailyRate || 0);
    const distanceFee = Number(booking.details?.distanceFee || 0);
    const helmetFee = Number(booking.details?.helmetFee || 0);
    const previousAmount = Number(booking.amount || 0);
    const newAmount = dailyRate > 0
      ? dailyRate * days + distanceFee + helmetFee
      : previousAmount;
    const additionalAmount = Math.max(0, newAmount - previousAmount);

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
    });

    const updated = await booking.save();

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
      },
    });

    return res.json({
      success: true,
      booking: updated,
      additionalAmount,
      newAmount,
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

    const paymentReferenceId = String(req.body?.paymentReferenceId || "").trim();
    const paymentSentAt = req.body?.paymentSentAt;
    const paymentSentAmount = Number(req.body?.paymentSentAmount);

    if (!paymentReferenceId || !paymentSentAt || !Number.isFinite(paymentSentAmount)) {
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

    const {
      clearanceStatus,
      damageNotes,
      mechanicNotes,
      repairEstimateAmount,
      repairEstimateNotes,
      penaltyAmount,
      penaltySummary,
      penaltySettled,
      vehicleStatus,
    } = req.body || {};
    const previousClearance = booking.returnInspection?.clearanceStatus;

    const inspection = {
      ...(booking.returnInspection || {}),
    };
    const wasRepairAdded = Boolean(booking.returnInspection?.repairEstimateAdded);
    const wasPenaltySettled = Boolean(booking.returnInspection?.penaltySettled);

    if (clearanceStatus) {
      if (!CLEARANCE_STATUSES.includes(clearanceStatus)) {
        return res
          .status(400)
          .json({ message: "Invalid clearance status." });
      }
      inspection.clearanceStatus = clearanceStatus;
    }

    // Only include fields relevant to clearance status
    if (inspection.clearanceStatus === "damage_found") {
      if (typeof damageNotes === "string") inspection.damageNotes = damageNotes;
      if (typeof mechanicNotes === "string") inspection.mechanicNotes = mechanicNotes;
      if (typeof repairEstimateNotes === "string")
        inspection.repairEstimateNotes = repairEstimateNotes;
      if (repairEstimateAmount !== undefined) {
        const parsed = Number(repairEstimateAmount);
        if (!Number.isNaN(parsed)) inspection.repairEstimateAmount = parsed;
      }
      inspection.vehicleStatus = "maintenance";
    } else if (inspection.clearanceStatus === "penalty_required") {
      if (typeof penaltySummary === "string") inspection.penaltySummary = penaltySummary;
      if (penaltyAmount !== undefined) {
        const parsed = Number(penaltyAmount);
        if (!Number.isNaN(parsed)) inspection.penaltyAmount = parsed;
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
    }

    if (penaltySettled !== undefined) {
      inspection.penaltySettled =
        String(penaltySettled).toLowerCase() === "true" || penaltySettled === true;
    }

    const damageFiles = req.files?.damagePhotos || [];

    // Only upload damage photos for damage_found status
    if (inspection.clearanceStatus === "damage_found") {
      const damageUrls = await getUploadedInspectionUrls(
        damageFiles,
        CLOUDINARY_RETURN_INSPECTION_FOLDER,
      );

      if (damageUrls.length) {
        inspection.damagePhotos = [
          ...(inspection.damagePhotos || []),
          ...damageUrls,
        ];
      }
    }

    inspection.updatedAt = new Date();

    // Add repair estimate amount to booking revenue when inspection is cleared
    if (
      inspection.clearanceStatus === "cleared" &&
      previousClearance === "damage_found" &&
      Number(inspection.repairEstimateAmount || 0) > 0 &&
      !wasRepairAdded
    ) {
      booking.amount = Number(booking.amount || 0) + Number(inspection.repairEstimateAmount || 0);
      inspection.repairEstimateAdded = true;
    }

    if (inspection.clearanceStatus === "cleared") {
      inspection.clearedAt = inspection.clearedAt || new Date();
      booking.status = "completed";
    }

    // If penalty is settled, mark inspection as completed
    if (
      inspection.penaltySettled &&
      (inspection.clearanceStatus === "damage_found" ||
        inspection.clearanceStatus === "penalty_required")
    ) {
      if (!wasPenaltySettled) {
        const penaltyTotal = Number(inspection.penaltyAmount || 0);
        if (penaltyTotal > 0) {
          booking.amount = Number(booking.amount || 0) + penaltyTotal;
        }
      }

      // If there is a repair estimate from damage_found, add it to revenue when settling
      if (
        inspection.clearanceStatus === "damage_found" &&
        Number(inspection.repairEstimateAmount || 0) > 0 &&
        !wasRepairAdded
      ) {
        booking.amount = Number(booking.amount || 0) + Number(inspection.repairEstimateAmount || 0);
        inspection.repairEstimateAdded = true;
      }

      inspection.clearedAt = inspection.clearedAt || new Date();
      inspection.vehicleStatus = "available";
      booking.status = "completed";
    }

    booking.returnInspection = inspection;
    const updated = await booking.save();

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
      },
    });

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
        motorcycleName: `${updated.motorcycle?.make || ""} ${updated.motorcycle?.model || ""}`.trim(),
        motorcycleYear: updated.motorcycle?.year || new Date().getFullYear(),
        pickupDate: updated.pickupDate?.toISOString?.().split("T")[0] || "—",
        returnDate: updated.returnDate?.toISOString?.().split("T")[0] || "—",
        destination: updated.destination || updated.details?.destinationCity || "—",
        pickupLocation: updated.details?.pickupLocation || "Soldiers Hills IV, Block 9 Lot 1 PH2 Lily, Bacoor, 4102 Cavite",
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

      return res.json({
        success: true,
        message:
          "Reservation payment confirmed. Digital receipt sent. Booking is now pending full payment.",
        booking: updated,
      });
    }

    // Stage 2: Admin confirms full payment during pickup and activates booking.
    booking.paymentStatus = "fully_paid";
    booking.status = "active";
    booking.fullPaymentConfirmedAt = new Date();
    const updated = await booking.save();

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
      },
    });

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
      return res.status(400).json({ success: false, message: "Invalid booking ID." });
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
      return res.status(404).json({ success: false, message: "Booking not found." });
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
        locationLogDeletedAt: updated.details?.locationLogDeletedAt || new Date(),
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
      `attachment; filename="RentalAgreement_${booking.customer.replace(/\s+/g, "_")}_${booking._id}.pdf"`
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
