import Motorcycle from "../models/motorcycleModel.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { v2 as cloudinary } from "cloudinary";
import { createSystemLog } from "../utils/systemLogService.js";
import {
  getDefaultMaintenanceScheduleAt,
  normalizeMaintenanceScheduleAt,
} from "../utils/maintenanceScheduler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");
const CLOUDINARY_FOLDER =
  process.env.CLOUDINARY_UPLOAD_FOLDER || "anaiasmotorcyclerental";
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

const verifyCloudinaryResource = async (publicId) => {
  if (!publicId) return false;

  try {
    const resource = await cloudinary.api.resource(publicId);
    const hasUrl = Boolean(
      resource &&
      ((typeof resource.secure_url === "string" &&
        resource.secure_url.trim()) ||
        (typeof resource.url === "string" && resource.url.trim())),
    );
    return hasUrl;
  } catch (err) {
    fs.appendFileSync(
      "/tmp/cloudinary-upload.log",
      `[UPLOAD] resource validation FAILED for ${publicId}: ${err?.error?.message || err?.message || err}\n`,
    );
    return false;
  }
};

const uploadFileToCloudinary = async (filePath) => {
  const logMsg = (msg) => {
    fs.appendFileSync("/tmp/cloudinary-upload.log", `${msg}\n`);
  };
  logMsg(`[UPLOAD] filePath: ${filePath}`);
  logMsg(`[UPLOAD] CLOUDINARY_ENABLED: ${CLOUDINARY_ENABLED}`);

  if (!filePath || !CLOUDINARY_ENABLED) {
    logMsg(
      `[UPLOAD] skipped: filePath=${!!filePath}, enabled=${CLOUDINARY_ENABLED}`,
    );
    return null;
  }

  // Retry logic for resilience
  const MAX_RETRIES = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      logMsg(
        `[UPLOAD] attempt ${attempt}/${MAX_RETRIES}: calling cloudinary.uploader.upload...`,
      );
      const result = await cloudinary.uploader.upload(filePath, {
        folder: CLOUDINARY_FOLDER,
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
        logMsg(
          `[UPLOAD] invalid response, missing url: ${JSON.stringify(result)}`,
        );
        lastError = new Error("No URL in Cloudinary response");
        if (attempt < MAX_RETRIES) continue;
        return null;
      }

      logMsg(`[UPLOAD] SUCCESS on attempt ${attempt}: ${url}`);
      return url;
    } catch (err) {
      lastError = err;
      logMsg(`[UPLOAD] attempt ${attempt} FAILED: ${err?.message || err}`);
      if (attempt < MAX_RETRIES) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        logMsg(`[UPLOAD] retrying after ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  logMsg(
    `[UPLOAD] FAILED after ${MAX_RETRIES} attempts: ${lastError?.message || lastError}`,
  );
  return null;
};

const BLOCKING_BOOKING_STATUSES = [
  "pending",
  "pending_reservation",
  "pending_full_payment",
  "active",
];

const isExternalImage = (value = "") =>
  value.startsWith("http://") || value.startsWith("https://");

const isDataImage = (value = "") => /^data:image\//i.test(value);

const normalizeUploadPath = (value = "") =>
  value.replace(/^\/+/, "").replace(/^uploads\//, "");

const toUploadsPath = (value = "") => `/uploads/${normalizeUploadPath(value)}`;

const removeLocalUploadIfPresent = (storedImagePath = "") => {
  if (!storedImagePath) return;
  if (isDataImage(storedImagePath)) return;
  if (isExternalImage(storedImagePath)) return;

  const cleanPath = normalizeUploadPath(
    String(storedImagePath).replace(/^\/uploads\//, ""),
  );
  if (!cleanPath) return;

  const filePath = path.join(UPLOADS_DIR, cleanPath);
  fs.unlink(filePath, (err) => {
    if (err) console.warn("Failed to delete image file:", err.message || err);
  });
};

const deriveStatusFromBookings = (motorcycleLike) => {
  const bookings = motorcycleLike?.bookings || [];

  const hasActiveBooking = bookings.some(
    (b) => (b.status || "").toLowerCase() === "active",
  );

  const hasPendingBooking = bookings.some((b) => {
    const bookingStatus = (b.status || "").toLowerCase();
    return ["pending_reservation", "pending_full_payment", "pending"].includes(
      bookingStatus,
    );
  });

  if (hasActiveBooking) return "rented";
  if (hasPendingBooking) return "pending";
  return "available";
};

const releaseExpiredCheckoutLocks = async () => {
  const now = new Date();

  await Motorcycle.updateMany(
    { "checkoutLock.expiresAt": { $lte: now } },
    { $unset: { checkoutLock: "" } },
  );

  await Motorcycle.updateMany(
    {
      status: "pending",
      $or: [{ checkoutLock: null }, { checkoutLock: { $exists: false } }],
      bookings: {
        $not: {
          $elemMatch: {
            status: { $in: BLOCKING_BOOKING_STATUSES },
          },
        },
      },
    },
    { $set: { status: "available" } },
  );
};

const getRelativeImagePath = (filename) => {
  if (!filename) return "";
  if (isDataImage(filename)) return filename;
  if (isExternalImage(filename)) return filename;
  return toUploadsPath(filename);
};

const getUploadedUrl = async (file) => {
  if (!file) {
    console.error("[GETURL] no file");
    return null;
  }

  const absolutePath = path.resolve(file.path);
  const exists = fs.existsSync(absolutePath);
  console.error("[GETURL] path:", absolutePath, "exists:", exists);

  if (!exists) {
    console.error("[GETURL] file does not exist");
    return null;
  }

  console.error("[GETURL] CLOUDINARY_ENABLED:", CLOUDINARY_ENABLED);
  const cloudUrl = await uploadFileToCloudinary(absolutePath);
  console.error(
    "[GETURL] cloudinary result:",
    cloudUrl ? "success" : "failed",
    "value:",
    cloudUrl,
  );

  if (cloudUrl) {
    if (!/^https?:\/\//i.test(cloudUrl)) {
      const cleaned = String(cloudUrl).trim().replace(/^\/+/, "");
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "dxta0nmdy";
      let normalizedUrl;

      if (/^dxta0nmdy\/image\/upload\//i.test(cleaned)) {
        normalizedUrl = `https://res.cloudinary.com/${cloudName}/${cleaned.replace(/^dxta0nmdy\//i, "")}`;
      } else if (/^dxta0nmdy\//i.test(cleaned)) {
        normalizedUrl = `https://res.cloudinary.com/${cloudName}/image/upload/${cleaned.replace(/^dxta0nmdy\//i, "")}`;
      } else if (/^anaiasmotorcyclerental\/image\/upload\//i.test(cleaned)) {
        normalizedUrl = `https://res.cloudinary.com/${cloudName}/${cleaned}`;
      } else if (/^anaiasmotorcyclerental\//i.test(cleaned)) {
        normalizedUrl = `https://res.cloudinary.com/${cloudName}/image/upload/${cleaned}`;
      } else if (/^image\/upload\//i.test(cleaned)) {
        normalizedUrl = `https://res.cloudinary.com/${cloudName}/${cleaned}`;
      } else {
        normalizedUrl = `https://res.cloudinary.com/${cloudName}/image/upload/${cleaned}`;
      }

      console.error("[GETURL] normalized cloudinary URL:", normalizedUrl);
      return normalizedUrl;
    }
    return cloudUrl;
  }

  console.error("[GETURL] Cloudinary upload failed, using local fallback");
  const filename = path.basename(absolutePath);
  const localPath = `https://anaias-motorcycle-rental.onrender.com/uploads/${filename}`;
  console.error("[GETURL] returning local fallback:", localPath);
  return localPath;
};

export const createMotorcycle = async (req, res, next) => {
  try {
    const {
      unitId,
      make,
      model,
      dailyRate,
      category,
      description,
      year,
      color,
      engineSize,
      transmission,
      fuelType,
      mileage,
      hasABS,
      hasHelmet,
      status,
      maintenanceScheduleAt,
      maintenanceScheduleStartAt,
      maintenanceScheduleEndAt,
    } = req.body;

    console.error("===== [MOTORCYCLE CREATE] =====");
    console.error(
      "[FILE]",
      req.file
        ? {
            originalname: req.file.originalname,
            path: req.file.path,
            size: req.file.size,
          }
        : "NO FILE",
    );

    fs.writeFileSync(
      "/tmp/motorcycle-create-called.txt",
      `CALLED at ${new Date().toISOString()}\nreq.file: ${req.file ? req.file.path : "null"}\n`,
    );

    if (!make || !model || !dailyRate) {
      return res.status(400).json({
        message: "Make, model and dailyRate are required.",
      });
    }

    if (unitId && unitId.trim()) {
      const existing = await Motorcycle.findOne({ unitId: unitId.trim() });
      if (existing) {
        return res.status(409).json({
          message: `Unit ID "${unitId.trim()}" is already in use.`,
        });
      }
    }

    let imageFilename = "";

    console.error(
      "[UPLOADING] calling getUploadedUrl with file:",
      req.file ? "yes" : "no",
    );
    let uploadedUrl = null;
    if (req.file) {
      uploadedUrl = await getUploadedUrl(req.file);
    } else if (req.body.image && req.body.image.startsWith("data:image")) {
      // Handle base64 image from mobile
      const base64Data = req.body.image.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const filename = req.body.imageName || `mobile-${Date.now()}.jpg`;
      const filePath = path.join(UPLOADS_DIR, filename);
      fs.writeFileSync(filePath, buffer);
      console.error("[BASE64] saved to:", filePath);
      // Create a mock file object for getUploadedUrl
      const mockFile = { path: filePath };
      uploadedUrl = await getUploadedUrl(mockFile);
    }
    console.error("[UPLOADED] result:", uploadedUrl);
    if (uploadedUrl) {
      imageFilename = uploadedUrl;
    }

    const motorcycle = new Motorcycle({
      unitId: unitId ? String(unitId).trim() : "",
      make,
      model,
      year: year ? Number(year) : undefined,
      color: color || "",
      category: category || "Scooter",
      engineSize: engineSize ? Number(engineSize) : 150,
      transmission: transmission || "Manual",
      fuelType: fuelType || "Unleaded",
      mileage: mileage ? Number(mileage) : 0,
      dailyRate: Number(dailyRate),
      hasABS: hasABS === true || hasABS === "true",
      hasHelmet: hasHelmet === false || hasHelmet === "false" ? false : true,
      status: status || "available",
      // Prefer explicit start/end when provided. Fall back to legacy single date.
      maintenanceScheduleAt:
        normalizeMaintenanceScheduleAt(maintenanceScheduleAt) ||
        getDefaultMaintenanceScheduleAt(new Date()),
      maintenanceScheduleStartAt:
        normalizeMaintenanceScheduleAt(maintenanceScheduleStartAt) ||
        normalizeMaintenanceScheduleAt(maintenanceScheduleAt) ||
        getDefaultMaintenanceScheduleAt(new Date()),
      maintenanceScheduleEndAt:
        normalizeMaintenanceScheduleAt(maintenanceScheduleEndAt) ||
        normalizeMaintenanceScheduleAt(maintenanceScheduleAt) ||
        normalizeMaintenanceScheduleAt(maintenanceScheduleStartAt) ||
        getDefaultMaintenanceScheduleAt(new Date()),
      image: imageFilename || "",
      description: description || "",
      traccarDeviceId: req.body.traccarDeviceId || "",
    });

    const saved = await motorcycle.save();

    await createSystemLog({
      req,
      actorType: "admin",
      action: "unit_created", // <-- Changed
      targetType: "unit", // <-- Changed
      targetId: saved._id,
      summary: `Unit added: ${saved.make} ${saved.model}`,
      metadata: {
        unitId: saved.unitId || "",
        status: saved.status,
        dailyRate: saved.dailyRate,
      },
    });

    res.status(201).json(saved);
  } catch (err) {
    next(err);
  }
};

export const getMotorcycles = async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 12;
    const search = (req.query.search || "").trim();
    const category = req.query.category || "";
    const status = req.query.status || "";
    const includeDeleted = req.query.includeDeleted === "true";

    if (!includeDeleted) {
      await releaseExpiredCheckoutLocks();
    }

    const query = {};

    if (!includeDeleted) {
      query.isDeleted = false;
      // query.status = "available";
    }

    if (search) {
      const words = search.split(/\s+/);
      query.$and = words.map((word) => ({
        $or: [
          { make: { $regex: word, $options: "i" } },
          { model: { $regex: word, $options: "i" } },
          { color: { $regex: word, $options: "i" } },
          { category: { $regex: word, $options: "i" } },
          { unitId: { $regex: word, $options: "i" } },
        ],
      }));
    }

    if (category) query.category = category;
    if (status) query.status = status;

    const total = await Motorcycle.countDocuments(query);
    const motorcycles = await Motorcycle.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const DEFAULT_IMAGE =
      process.env.DEFAULT_MOTORCYCLE_IMAGE ||
      "https://res.cloudinary.com/demo/image/upload/v1710000000/default-motorcycle.png";

    const motorcyclesWithAvailability = motorcycles.map((m) => {
      const plain = m.toObject ? m.toObject() : m;
      plain.availability = m.getAvailabilitySummary();
      if (
        !plain.image ||
        typeof plain.image !== "string" ||
        !plain.image.trim()
      ) {
        plain.image = DEFAULT_IMAGE;
      } else if (
        !/^https?:\/\//i.test(plain.image) &&
        !/^data:image\//i.test(plain.image)
      ) {
        plain.image = getRelativeImagePath(plain.image);
      }
      if (m.status !== "maintenance") {
        plain.status = deriveStatusFromBookings(m);
      }
      return plain;
    });

    res.json({
      page,
      pages: Math.ceil(total / limit),
      total,
      data: motorcyclesWithAvailability,
    });
  } catch (err) {
    next(err);
  }
};

export const getMotorcycleById = async (req, res, next) => {
  try {
    const includeDeleted = req.query.includeDeleted === "true";
    if (!includeDeleted) {
      await releaseExpiredCheckoutLocks();
    }
    const query = { _id: req.params.id };

    if (!includeDeleted) {
      query.isDeleted = false;
    }

    const motorcycle = await Motorcycle.findOne(query);
    if (!motorcycle) return res.status(404).json({ message: "Unit not found" });

    const plain = motorcycle.toObject();
    plain.availability = motorcycle.getAvailabilitySummary();
    plain.image = getRelativeImagePath(plain.image);
    if (motorcycle.status !== "maintenance") {
      plain.status = deriveStatusFromBookings(motorcycle);
    }

    res.json(plain);
  } catch (err) {
    next(err);
  }
};

export const getMotorcycleByUnitId = async (req, res, next) => {
  try {
    const includeDeleted = req.query.includeDeleted === "true";
    if (!includeDeleted) {
      await releaseExpiredCheckoutLocks();
    }
    const unitId = String(req.params.unitId || "").trim();
    if (!unitId) {
      return res.status(400).json({ message: "Unit ID is required" });
    }

    const query = {
      unitId: {
        $regex: `^${unitId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        $options: "i",
      },
    };

    if (!includeDeleted) {
      query.isDeleted = false;
    }

    const motorcycle = await Motorcycle.findOne(query);
    if (!motorcycle) {
      return res.status(404).json({ message: "Unit not found" });
    }

    const plain = motorcycle.toObject();
    plain.availability = motorcycle.getAvailabilitySummary();
    plain.image = getRelativeImagePath(plain.image);
    if (motorcycle.status !== "maintenance") {
      plain.status = deriveStatusFromBookings(motorcycle);
    }

    res.json(plain);
  } catch (err) {
    next(err);
  }
};

export const updateMotorcycle = async (req, res, next) => {
  try {
    const motorcycle = await Motorcycle.findOne({
      _id: req.params.id,
      isDeleted: false,
    });

    if (!motorcycle) return res.status(404).json({ message: "Unit not found" });

    if (req.body.unitId && String(req.body.unitId).trim()) {
      const duplicate = await Motorcycle.findOne({
        unitId: String(req.body.unitId).trim(),
        isDeleted: false,
        _id: { $ne: req.params.id },
      });
      if (duplicate) {
        return res.status(409).json({
          message: `Unit ID "${String(req.body.unitId).trim()}" is already in use.`,
        });
      }
    }

    const oldImagePath = motorcycle.image;
    const previousStatus = motorcycle.status;

    const uploadedUrl = await getUploadedUrl(req.file);
    if (uploadedUrl) {
      if (oldImagePath && !isExternalImage(oldImagePath)) {
        removeLocalUploadIfPresent(oldImagePath);
      }
      motorcycle.image = uploadedUrl;
    } else if (req.body.image !== undefined) {
      if (!req.body.image) {
        motorcycle.image = "";
      } else if (req.body.image && req.body.image !== oldImagePath) {
        motorcycle.image = req.body.image; // Assume it's a Cloudinary URL or external
      }
    }

    const fields = [
      "unitId",
      "make",
      "model",
      "year",
      "color",
      "category",
      "engineSize",
      "transmission",
      "fuelType",
      "mileage",
      "dailyRate",
      "hasABS",
      "hasHelmet",
      "status",
      "maintenanceScheduleAt",
      "maintenanceScheduleStartAt",
      "maintenanceScheduleEndAt",
      "description",
      "traccarDeviceId",
    ];

    fields.forEach((f) => {
      if (req.body[f] !== undefined) {
        if (["year", "engineSize", "mileage", "dailyRate"].includes(f)) {
          motorcycle[f] = Number(req.body[f]);
        } else if (["hasABS", "hasHelmet"].includes(f)) {
          motorcycle[f] = req.body[f] === true || req.body[f] === "true";
        } else if (f === "maintenanceScheduleAt") {
          motorcycle[f] = normalizeMaintenanceScheduleAt(req.body[f]);
        } else if (f === "maintenanceScheduleStartAt") {
          motorcycle.maintenanceScheduleStartAt =
            normalizeMaintenanceScheduleAt(req.body[f]);
        } else if (f === "maintenanceScheduleEndAt") {
          motorcycle.maintenanceScheduleEndAt = normalizeMaintenanceScheduleAt(
            req.body[f],
          );
        } else {
          motorcycle[f] = req.body[f];
        }
      }
    });

    if (
      req.body.status === "available" &&
      previousStatus === "maintenance" &&
      req.body.maintenanceScheduleStartAt === undefined &&
      req.body.maintenanceScheduleAt === undefined
    ) {
      const defaultDate = getDefaultMaintenanceScheduleAt(new Date());
      motorcycle.maintenanceScheduleAt =
        motorcycle.maintenanceScheduleAt || defaultDate;
      motorcycle.maintenanceScheduleStartAt =
        motorcycle.maintenanceScheduleStartAt || defaultDate;
      motorcycle.maintenanceScheduleEndAt =
        motorcycle.maintenanceScheduleEndAt ||
        motorcycle.maintenanceScheduleStartAt ||
        defaultDate;
    }

    const updated = await motorcycle.save();

    await createSystemLog({
      req,
      actorType: "admin",
      action: "unit_updated", // <-- Changed
      targetType: "unit", // <-- Changed
      targetId: updated._id,
      summary: `Unit updated: ${updated.make} ${updated.model}`,
      metadata: {
        unitId: updated.unitId || "",
        status: updated.status,
      },
    });

    const plain = updated.toObject();
    plain.availability = updated.getAvailabilitySummary
      ? updated.getAvailabilitySummary()
      : null;
    plain.image = getRelativeImagePath(plain.image);

    res.json(plain);
  } catch (err) {
    console.error("Error updating motorcycle:", err);
    next(err);
  }
};

export const deleteMotorcycle = async (req, res, next) => {
  try {
    const motorcycle = await Motorcycle.findOne({
      _id: req.params.id,
      isDeleted: false,
    });

    if (!motorcycle) return res.status(404).json({ message: "Unit not found" });

    const userId = req.user?.id || null;
    await motorcycle.softDelete(userId);

    await createSystemLog({
      req,
      actorType: "admin",
      action: "unit_deleted", // <-- Changed
      targetType: "unit", // <-- Changed
      targetId: motorcycle._id,
      summary: `Unit deleted: ${motorcycle.make} ${motorcycle.model}`,
      metadata: {
        unitId: motorcycle.unitId || "",
        deletedAt: motorcycle.deletedAt,
      },
    });

    res.json({
      message: "Unit deleted successfully",
      deletedAt: motorcycle.deletedAt,
      canRestore: true,
    });
  } catch (err) {
    next(err);
  }
};

export const hardDeleteMotorcycle = async (req, res, next) => {
  try {
    const motorcycle = await Motorcycle.findById(req.params.id);
    if (!motorcycle) return res.status(404).json({ message: "Unit not found" });

    // Note: Cloudinary images are left in cloud storage

    await Motorcycle.findByIdAndDelete(req.params.id);

    await createSystemLog({
      req,
      actorType: "admin",
      action: "unit_permanently_deleted", // <-- Changed
      targetType: "unit", // <-- Changed
      targetId: motorcycle._id,
      summary: `Unit permanently deleted: ${motorcycle.make} ${motorcycle.model}`,
      metadata: {
        unitId: motorcycle.unitId || "",
      },
    });

    res.json({ message: "Unit permanently deleted" });
  } catch (err) {
    next(err);
  }
};

export const restoreMotorcycle = async (req, res, next) => {
  try {
    const motorcycle = await Motorcycle.findOne({
      _id: req.params.id,
      isDeleted: true,
    });

    if (!motorcycle) {
      return res.status(404).json({ message: "Deleted unit not found" });
    }

    await motorcycle.restore();

    await createSystemLog({
      req,
      actorType: "admin",
      action: "unit_restored", // <-- Changed
      targetType: "unit", // <-- Changed
      targetId: motorcycle._id,
      summary: `Unit restored: ${motorcycle.make} ${motorcycle.model}`,
      metadata: {
        unitId: motorcycle.unitId || "",
      },
    });

    const plain = motorcycle.toObject();
    plain.availability = motorcycle.getAvailabilitySummary();
    plain.image = getRelativeImagePath(plain.image);

    res.json({
      message: "Unit restored successfully",
      data: plain,
    });
  } catch (err) {
    next(err);
  }
};

export const getDeletedMotorcycles = async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 12;

    const query = { isDeleted: true };

    const total = await Motorcycle.countDocuments(query);
    const motorcycles = await Motorcycle.find(query)
      .populate("deletedBy", "name email")
      .sort({ deletedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const data = motorcycles.map((m) => {
      const plain = m.toObject();
      plain.image = getRelativeImagePath(plain.image);
      return plain;
    });

    res.json({
      page,
      pages: Math.ceil(total / limit),
      total,
      data,
    });
  } catch (err) {
    next(err);
  }
};
