import Settings from "../models/settingsModel.js";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import { createSystemLog } from "../utils/systemLogService.js";

// Cloudinary Configuration
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

// Helper to upload to Cloudinary
const uploadToCloudinary = async (filePath) => {
  if (!filePath || !CLOUDINARY_ENABLED) return null;

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: CLOUDINARY_FOLDER,
      resource_type: "image",
      use_filename: true,
      unique_filename: true,
      overwrite: false,
    });

    return result.secure_url || result.url;
  } catch (err) {
    console.error("Cloudinary upload failed:", err);
    return null;
  }
};

const getOrCreateSettings = async () => {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({});
  }
  return settings;
};

// GET /api/settings/payment-methods
// Add ?activeOnly=true to only get enabled methods (used by the public checkout flow).
export const getPaymentMethods = async (req, res, next) => {
  try {
    const settings = await getOrCreateSettings();
    const { activeOnly } = req.query;

    let methods = settings.paymentMethods;
    if (activeOnly === "true") {
      methods = methods.filter((m) => m.enabled);
    }

    res.status(200).json({ success: true, data: methods });
  } catch (err) {
    next(err);
  }
};

// POST /api/settings/payment-methods
// multipart/form-data — fields: name, image (required)
export const addPaymentMethod = async (req, res, next) => {
  try {
    const trimmedName = (req.body?.name || "").trim();

    if (!trimmedName) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res
        .status(400)
        .json({ message: "Payment method name is required." });
    }
    if (trimmedName.length > 40) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res
        .status(400)
        .json({ message: "Payment method name is too long." });
    }
    if (!req.file) {
      return res.status(400).json({ message: "A QR code image is required." });
    }

    const settings = await getOrCreateSettings();

    const exists = settings.paymentMethods.some(
      (m) => m.name.toLowerCase() === trimmedName.toLowerCase(),
    );
    if (exists) {
      fs.unlink(req.file.path, () => {});
      return res
        .status(409)
        .json({ message: "A payment method with this name already exists." });
    }

    // 1. Upload to Cloudinary
    const cloudUrl = await uploadToCloudinary(req.file.path);

    // 2. Delete the temporary local file processed by multer
    fs.unlink(req.file.path, (err) => {
      if (err) console.warn("Failed to delete temp image file:", err.message);
    });

    if (!cloudUrl) {
      return res
        .status(500)
        .json({ message: "Failed to upload image to Cloudinary." });
    }

    // 3. Save the new method with its QR code already attached
    settings.paymentMethods.push({
      name: trimmedName,
      qrCode: cloudUrl,
      enabled: true,
      isDefault: false,
    });
    await settings.save();

    const created = settings.paymentMethods[settings.paymentMethods.length - 1];

    await createSystemLog({
      req,
      actorType: "admin",
      action: "payment_method_added",
      targetType: "settings",
      targetId: settings._id,
      summary: `Payment method "${trimmedName}" added`,
      metadata: { name: trimmedName, url: cloudUrl },
    });

    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
};

// POST /api/settings/payment-methods/:id/qr
// multipart/form-data, field "image"
export const updatePaymentMethodQR = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: "No image file provided." });
    }

    const settings = await getOrCreateSettings();
    const method = settings.paymentMethods.id(id);

    if (!method) {
      fs.unlink(req.file.path, () => {});
      return res.status(404).json({ message: "Payment method not found." });
    }

    // 1. Upload to Cloudinary
    const cloudUrl = await uploadToCloudinary(req.file.path);

    // 2. Delete the temporary local file processed by multer
    fs.unlink(req.file.path, (err) => {
      if (err) console.warn("Failed to delete temp image file:", err.message);
    });

    if (!cloudUrl) {
      return res
        .status(500)
        .json({ message: "Failed to upload image to Cloudinary." });
    }

    // 3. Update database
    method.qrCode = cloudUrl;
    await settings.save();

    // 4. Create System Log
    await createSystemLog({
      req,
      actorType: "admin",
      action: "qr_code_updated",
      targetType: "settings",
      targetId: settings._id,
      summary: `${method.name} QR Code updated`,
      metadata: { method: method.name, url: cloudUrl },
    });

    res.status(200).json({
      success: true,
      path: cloudUrl,
      data: method,
      message: `${method.name} QR Code updated successfully!`,
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/settings/payment-methods/:id/toggle
export const togglePaymentMethod = async (req, res, next) => {
  try {
    const { id } = req.params;
    const settings = await getOrCreateSettings();
    const method = settings.paymentMethods.id(id);

    if (!method) {
      return res.status(404).json({ message: "Payment method not found." });
    }

    const enabledCount = settings.paymentMethods.filter(
      (m) => m.enabled,
    ).length;
    if (method.enabled && enabledCount <= 1) {
      return res.status(400).json({
        message:
          "At least one payment method must stay enabled so customers can check out.",
      });
    }

    method.enabled = !method.enabled;
    await settings.save();

    await createSystemLog({
      req,
      actorType: "admin",
      action: "payment_method_toggled",
      targetType: "settings",
      targetId: settings._id,
      summary: `${method.name} ${method.enabled ? "enabled" : "disabled"}`,
      metadata: { method: method.name, enabled: method.enabled },
    });

    res.status(200).json({ success: true, data: method });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/settings/payment-methods/:id
// Any method — including the built-in GCash / PayMaya / Bank Transfer — can be
// permanently removed, as long as at least one payment method remains so
// customers always have something to pay with.
export const deletePaymentMethod = async (req, res, next) => {
  try {
    const { id } = req.params;
    const settings = await getOrCreateSettings();
    const method = settings.paymentMethods.id(id);

    if (!method) {
      return res.status(404).json({ message: "Payment method not found." });
    }

    if (settings.paymentMethods.length <= 1) {
      return res.status(400).json({
        message: "At least one payment method must remain.",
      });
    }

    const name = method.name;
    method.deleteOne();
    await settings.save();

    await createSystemLog({
      req,
      actorType: "admin",
      action: "payment_method_deleted",
      targetType: "settings",
      targetId: settings._id,
      summary: `Payment method "${name}" deleted`,
      metadata: { name },
    });

    res.status(200).json({ success: true, message: `${name} removed.` });
  } catch (err) {
    next(err);
  }
};
