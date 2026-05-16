import Settings from "../models/settingsModel.js";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import { createSystemLog } from "../utils/systemLogService.js";

// Cloudinary Configuration
const CLOUDINARY_FOLDER = process.env.CLOUDINARY_UPLOAD_FOLDER || "anaiasmotorcyclerental";
const CLOUDINARY_ENABLED = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
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

// GET /api/settings/qrs
export const getQRCodes = async (req, res, next) => {
  try {
    let settings = await Settings.findOne();
    
    if (!settings) {
      settings = await Settings.create({});
    }
    
    res.status(200).json({ success: true, data: settings.qrCodes });
  } catch (err) {
    next(err);
  }
};

// POST /api/settings/qrs
export const updateQRCode = async (req, res, next) => {
  try {
    const { method } = req.body;

    if (!method || !["GCash", "PayMaya", "Bank Transfer"].includes(method)) {
      return res.status(400).json({ message: "Invalid payment method specified." });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No image file provided." });
    }

    // 1. Upload to Cloudinary
    const cloudUrl = await uploadToCloudinary(req.file.path);

    // 2. Delete the temporary local file processed by multer
    fs.unlink(req.file.path, (err) => {
      if (err) console.warn("Failed to delete temp image file:", err.message);
    });

    if (!cloudUrl) {
      return res.status(500).json({ message: "Failed to upload image to Cloudinary." });
    }

    // 3. Update database
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }

    settings.qrCodes[method] = cloudUrl;
    await settings.save();

    // 4. Create System Log
    await createSystemLog({
      req,
      actorType: "admin",
      action: "qr_code_updated",
      targetType: "settings",
      targetId: settings._id,
      summary: `${method} QR Code updated`,
      metadata: { method, url: cloudUrl },
    });

    res.status(200).json({ 
      success: true, 
      path: cloudUrl, 
      message: `${method} QR Code updated successfully!` 
    });
  } catch (err) {
    next(err);
  }
};