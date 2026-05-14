import mongoose from "mongoose";
import User from "../models/userModel.js";
import validator from "validator";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  generateOTP,
  sendVerificationEmail,
  sendLoginOTP,
  sendPasswordResetOTP,
} from "../utils/emailService.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { v2 as cloudinary } from "cloudinary";

// --- Cloudinary Setup ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

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

const normalizeUrl = (value = "") => {
  const normalized = String(value || "").trim();
  return normalized.replace(/^http:\/\//i, "https://");
};

const uploadFileToCloudinary = async (filePath) => {
  if (!filePath || !CLOUDINARY_ENABLED) return null;
  const MAX_RETRIES = 3;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: CLOUDINARY_FOLDER,
        resource_type: "image",
        quality: "auto",
        fetch_format: "auto",
      });
      const url = normalizeUrl(result.secure_url || result.url || "");
      if (url) return url;
    } catch (err) {
      if (attempt < MAX_RETRIES) await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
  return null;
};

const getUploadedUrl = async (file) => {
  if (!file) return null;
  const absolutePath = path.resolve(file.path);
  if (!fs.existsSync(absolutePath)) return null;

  const cloudUrl = await uploadFileToCloudinary(absolutePath);
  if (cloudUrl) return cloudUrl;

  // Local fallback
  const filename = path.basename(absolutePath);
  return `https://anaias-motorcycle-rental.onrender.com/uploads/${filename}`;
};

const TOKEN_EXPIRES_IN = "24h";
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_here";

const createToken = (userId) => {
  if (!JWT_SECRET) throw new Error("JWT_SECRET is not defined");
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });
};

const normalizeEmail = (emailRaw) => {
  const trimmed = String(emailRaw || "").trim();
  return validator.normalizeEmail(trimmed) || trimmed.toLowerCase();
};

// ── Helper: build safe user response object ──────────────────────────────────
const safeUser = (user) => ({
  id: user._id,
  firstName: user.firstName,
  middleName: user.middleName || "",
  lastName: user.lastName,
  name: user.name, // virtual
  email: user.email,
  phone: user.phone,
  address: user.address || {},
  isVerified: user.isVerified,
  profilePicture: user.profilePicture || "",
  createdAt: user.createdAt,
});

// In-memory storage for pending registrations (use Redis in production)
global.pendingRegistrations = global.pendingRegistrations || new Map();

setInterval(
  () => {
    const now = new Date();
    for (const [email, data] of global.pendingRegistrations.entries()) {
      if (now - data.createdAt > 60 * 60 * 1000) {
        global.pendingRegistrations.delete(email);
      }
    }
  },
  5 * 60 * 1000,
);

// ── Register ─────────────────────────────────────────────────────────────────
export async function register(req, res) {
  try {
    const firstName = String(req.body.firstName || "").trim();
    const middleName = String(req.body.middleName || "").trim();
    const lastName = String(req.body.lastName || "").trim();
    const email = normalizeEmail(req.body.email);
    const phone = String(req.body.phone || "").trim();
    const password = String(req.body.password || "");
    const address = req.body.address || {};

    if (!firstName || !lastName || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message:
          "First name, last name, email, phone and password are required.",
      });
    }

    // Validate address required fields
    if (!address.barangay || !address.city) {
      return res.status(400).json({
        success: false,
        message: "City/municipality and barangay are required.",
      });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ success: false, message: "Invalid email" });
    }

    const phoneRegex = /^09\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Phone number must be in format 09xxxxxxxxx (11 digits)",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters.",
      });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail && existingEmail.isVerified) {
      return res.status(409).json({
        success: false,
        message: "Email already exists and is verified. Please login instead.",
      });
    }

    const existingPhone = await User.findOne({ phone });
    if (existingPhone && existingPhone.isVerified) {
      return res
        .status(409)
        .json({ success: false, message: "Phone number already exists" });
    }

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000);
    const hashedPassword = await bcrypt.hash(password, 10);

    global.pendingRegistrations.set(email, {
      firstName,
      middleName,
      lastName,
      email,
      phone,
      password: hashedPassword,
      address,
      otp,
      otpExpires,
      createdAt: new Date(),
    });

    const fullName = [firstName, middleName, lastName]
      .filter(Boolean)
      .join(" ");
    const emailResult = await sendVerificationEmail(email, otp, fullName);
    if (!emailResult.success) {
      global.pendingRegistrations.delete(email);
      return res
        .status(500)
        .json({ success: false, message: "Failed to send verification email" });
    }

    return res.status(200).json({
      success: true,
      message: "Registration initiated! Please check your email for the OTP.",
      email,
    });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
}

// ── Verify Email ──────────────────────────────────────────────────────────────
export async function verifyEmail(req, res) {
  try {
    const email = normalizeEmail(req.body.email);
    const { otp } = req.body;

    if (!email || !otp) {
      return res
        .status(400)
        .json({ success: false, message: "Email and OTP are required" });
    }

    const pendingReg = global.pendingRegistrations.get(email);
    if (!pendingReg) {
      return res.status(404).json({
        success: false,
        message: "No pending registration found. Please register again.",
      });
    }

    if (pendingReg.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    if (new Date() > pendingReg.otpExpires) {
      global.pendingRegistrations.delete(email);
      return res
        .status(400)
        .json({
          success: false,
          message: "OTP has expired. Please register again.",
        });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail && existingEmail.isVerified) {
      global.pendingRegistrations.delete(email);
      return res
        .status(409)
        .json({ success: false, message: "Email already registered" });
    }

    const existingPhone = await User.findOne({ phone: pendingReg.phone });
    if (existingPhone && existingPhone.isVerified) {
      global.pendingRegistrations.delete(email);
      return res
        .status(409)
        .json({ success: false, message: "Phone number already registered" });
    }

    const user = new User({
      firstName: pendingReg.firstName,
      middleName: pendingReg.middleName || "",
      lastName: pendingReg.lastName,
      email: pendingReg.email,
      phone: pendingReg.phone,
      password: pendingReg.password,
      address: pendingReg.address || {},
      isVerified: true,
      verificationOTP: null,
      verificationOTPExpires: null,
    });

    await user.save();
    global.pendingRegistrations.delete(email);

    const token = createToken(user._id.toString());

    return res.status(201).json({
      success: true,
      message: "Account created successfully!",
      token,
      user: safeUser(user),
    });
  } catch (err) {
    console.error("Verify email error:", err);
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(409).json({
        success: false,
        message: `${field === "phone" ? "Phone number" : "Email"} already exists`,
      });
    }
    return res.status(500).json({ success: false, message: "Server Error" });
  }
}

// ── Resend Verification OTP ───────────────────────────────────────────────────
export async function resendVerificationOTP(req, res) {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }

    const pendingReg = global.pendingRegistrations.get(email);
    if (!pendingReg) {
      return res.status(404).json({
        success: false,
        message: "No pending registration found. Please register again.",
      });
    }

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000);
    pendingReg.otp = otp;
    pendingReg.otpExpires = otpExpires;
    global.pendingRegistrations.set(email, pendingReg);

    const fullName = [
      pendingReg.firstName,
      pendingReg.middleName,
      pendingReg.lastName,
    ]
      .filter(Boolean)
      .join(" ");
    const emailResult = await sendVerificationEmail(email, otp, fullName);
    if (!emailResult.success) {
      return res
        .status(500)
        .json({ success: false, message: "Failed to send verification email" });
    }

    return res
      .status(200)
      .json({ success: true, message: "Verification OTP resent successfully" });
  } catch (err) {
    console.error("Resend OTP error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
}

// ── Login step 1 ──────────────────────────────────────────────────────────────
export async function login(req, res) {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before logging in",
        needsVerification: true,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);
    user.loginOTP = otp;
    user.loginOTPExpires = otpExpires;
    await user.save();

    const emailResult = await sendLoginOTP(email, otp, user.name);
    if (!emailResult.success) {
      return res
        .status(500)
        .json({ success: false, message: "Failed to send login OTP" });
    }

    return res.status(200).json({
      success: true,
      message: "OTP sent to your email. Please verify to complete login.",
      requiresOTP: true,
      email: user.email,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
}

// ── Login step 2 ──────────────────────────────────────────────────────────────
export async function verifyLoginOTP(req, res) {
  try {
    const email = normalizeEmail(req.body.email);
    const { otp } = req.body;

    if (!email || !otp) {
      return res
        .status(400)
        .json({ success: false, message: "Email and OTP are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (
      !user.loginOTP ||
      user.loginOTP !== otp ||
      new Date() > user.loginOTPExpires
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired OTP" });
    }

    user.loginOTP = null;
    user.loginOTPExpires = null;
    await user.save();

    const token = createToken(user._id.toString());

    return res.status(200).json({
      success: true,
      message: "Login successful!",
      token,
      user: safeUser(user),
    });
  } catch (err) {
    console.error("Verify login OTP error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
}

// ── Logout ───────────────────────────────────────────────────────────────────
export async function logout(req, res) {
  try {
    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (err) {
    console.error("Logout error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
}

// ── Request password reset ────────────────────────────────────────────────────
export async function requestPasswordReset(req, res) {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000);
    user.resetPasswordOTP = otp;
    user.resetPasswordOTPExpires = otpExpires;
    await user.save();

    const emailResult = await sendPasswordResetOTP(email, otp, user.name);
    if (!emailResult.success) {
      return res
        .status(500)
        .json({
          success: false,
          message: "Failed to send password reset email",
        });
    }

    return res
      .status(200)
      .json({
        success: true,
        message: "Password reset OTP sent to your email",
      });
  } catch (err) {
    console.error("Request password reset error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
}

// ── Reset password ────────────────────────────────────────────────────────────
export async function resetPassword(req, res) {
  try {
    const email = normalizeEmail(req.body.email);
    const { otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Password must be at least 8 characters",
        });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (
      !user.resetPasswordOTP ||
      user.resetPasswordOTP !== otp ||
      new Date() > user.resetPasswordOTPExpires
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired OTP" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordOTP = null;
    user.resetPasswordOTPExpires = null;
    await user.save();

    return res
      .status(200)
      .json({ success: true, message: "Password reset successfully" });
  } catch (err) {
    console.error("Reset password error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
}

// ── Get user profile ──────────────────────────────────────────────────────────
export async function getUserProfile(req, res) {
  try {
    return res.status(200).json({ success: true, user: safeUser(req.user) });
  } catch (err) {
    console.error("Get profile error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
}

// ── Update profile ────────────────────────────────────────────────────────────
export async function updateProfile(req, res) {
  try {
    const userId = req.user._id;
    const { firstName, middleName, lastName, phone, address } = req.body;

    if (!firstName && !middleName && !lastName && !phone && !address) {
      return res
        .status(400)
        .json({ success: false, message: "At least one field is required" });
    }

    const updateData = {};
    if (firstName) updateData.firstName = String(firstName).trim();
    if (middleName !== undefined)
      updateData.middleName = String(middleName || "").trim();
    if (lastName) updateData.lastName = String(lastName).trim();

    if (phone) {
      const phoneStr = String(phone).trim();
      const phoneRegex = /^09\d{9}$/;
      if (!phoneRegex.test(phoneStr)) {
        return res.status(400).json({
          success: false,
          message: "Phone number must be in format 09xxxxxxxxx (11 digits)",
        });
      }
      const existingPhone = await User.findOne({
        phone: phoneStr,
        _id: { $ne: userId },
      });
      if (existingPhone) {
        return res
          .status(409)
          .json({ success: false, message: "Phone number is already in use" });
      }
      updateData.phone = phoneStr;
    }

    if (address && typeof address === "object") {
      updateData.address = {
        barangay: String(address.barangay || "").trim(),
        city: String(address.city || "").trim(),
        province: String(address.province || "").trim(),
        region: String(address.region || "").trim(),
        zipCode: String(address.zipCode || "").trim(),
      };
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: safeUser(updatedUser),
    });
  } catch (err) {
    console.error("Update profile error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
}

// ── Change password ───────────────────────────────────────────────────────────
export async function changePassword(req, res) {
  try {
    const userId = req.user._id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({
          success: false,
          message: "New password must be at least 8 characters",
        });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Current password is incorrect" });
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res
        .status(400)
        .json({
          success: false,
          message: "New password must be different from current password",
        });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res
      .status(200)
      .json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
}

// ── Request email change OTP ──────────────────────────────────────────────────
export async function requestEmailChangeOTP(req, res) {
  try {
    const userId = req.user._id;
    const newEmail = normalizeEmail(req.body.newEmail);

    if (!newEmail) {
      return res
        .status(400)
        .json({ success: false, message: "New email is required" });
    }

    if (!validator.isEmail(newEmail)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email format" });
    }

    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (currentUser.email === newEmail) {
      return res
        .status(400)
        .json({
          success: false,
          message: "New email is the same as current email",
        });
    }

    const existingUser = await User.findOne({
      email: newEmail,
      _id: { $ne: userId },
    });
    if (existingUser) {
      return res
        .status(409)
        .json({
          success: false,
          message: "Email is already in use by another account",
        });
    }

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000);
    currentUser.emailChangeOTP = otp;
    currentUser.emailChangeOTPExpires = otpExpires;
    currentUser.pendingEmail = newEmail;
    await currentUser.save();

    const emailResult = await sendVerificationEmail(
      newEmail,
      otp,
      currentUser.name,
    );
    if (!emailResult.success) {
      return res
        .status(500)
        .json({
          success: false,
          message: "Failed to send verification email to new address",
        });
    }

    return res
      .status(200)
      .json({
        success: true,
        message: "Verification OTP sent to your new email address",
      });
  } catch (err) {
    console.error("Request email change OTP error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
}

// ── Verify email change OTP ───────────────────────────────────────────────────
export async function verifyEmailChangeOTP(req, res) {
  try {
    const userId = req.user._id;
    const { newEmail, otp } = req.body;

    if (!newEmail || !otp) {
      return res
        .status(400)
        .json({ success: false, message: "New email and OTP are required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (
      !user.emailChangeOTP ||
      user.emailChangeOTP !== otp ||
      new Date() > user.emailChangeOTPExpires ||
      user.pendingEmail !== normalizeEmail(newEmail)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired OTP" });
    }

    user.email = normalizeEmail(newEmail);
    user.emailChangeOTP = null;
    user.emailChangeOTPExpires = null;
    user.pendingEmail = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Email updated successfully",
      user: safeUser(user),
    });
  } catch (err) {
    console.error("Verify email change OTP error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
}

// ── Upload Profile Picture ────────────────────────────────────────────────────
export async function uploadProfilePicture(req, res) {
  try {
    const userId = req.user._id;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image file provided" });
    }

    const uploadedUrl = await getUploadedUrl(req.file);
    if (!uploadedUrl) {
      return res.status(500).json({ success: false, message: "Failed to upload image" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.profilePicture = uploadedUrl;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile picture updated successfully",
      user: safeUser(user),
    });
  } catch (err) {
    console.error("Upload profile picture error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
}

export async function removeProfilePicture(req, res) {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Clear the profile picture URL
    user.profilePicture = "";
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile picture removed successfully",
      user: safeUser(user),
    });
  } catch (err) {
    console.error("Remove profile picture error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
}
