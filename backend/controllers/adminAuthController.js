import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Admin from "../models/adminModel.js";
import { generateOTP, sendPasswordResetOTP } from "../utils/emailService.js";

// ── Config ────────────────────────────────────────────────────────────────
// Credentials now live in MongoDB (the Admin model) so they can be reset
// via email OTP, same as regular users. ADMIN_JWT_SECRET still comes from
// env — it signs tokens, it isn't a credential to look up.
//
// Required env var:
//   ADMIN_JWT_SECRET   a long random string, separate from the regular
//                      user JWT_SECRET so admin and user tokens can't be
//                      mixed up or forged from one another
//
// See scripts/seedAdmin.js to create the initial Admin document.

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;
const TOKEN_EXPIRES_IN = "12h";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 10 * 60 * 1000; // 10 minutes
const RESET_OTP_EXPIRES_MS = 15 * 60 * 1000; // 15 minutes
const MAX_RESET_OTP_RESENDS = 3;

const normalizeEmail = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

// Same rule set as the frontend's validateStrongPassword — enforced again
// here since client-side validation can always be bypassed.
const isStrongPassword = (password) =>
  typeof password === "string" &&
  password.length >= 8 &&
  /[A-Z]/.test(password) &&
  /[a-z]/.test(password) &&
  /[0-9]/.test(password) &&
  /[^A-Za-z0-9]/.test(password);

export async function adminLogin(req, res) {
  try {
    if (!ADMIN_JWT_SECRET) {
      console.error("ADMIN_JWT_SECRET (or JWT_SECRET) is not configured.");
      return res
        .status(500)
        .json({ success: false, message: "Admin login is not configured." });
    }

    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required." });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid admin email or password." });
    }

    if (admin.lockUntil && admin.lockUntil > new Date()) {
      return res.status(423).json({
        success: false,
        message:
          "Too many failed login attempts. Please try again after 10 minutes.",
        lockedUntil: admin.lockUntil,
      });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      admin.failedLoginAttempts = (admin.failedLoginAttempts || 0) + 1;

      if (admin.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        admin.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
        admin.failedLoginAttempts = 0;
        await admin.save();
        return res.status(423).json({
          success: false,
          message:
            "Too many failed login attempts. Please try again after 10 minutes.",
          lockedUntil: admin.lockUntil,
        });
      }

      await admin.save();
      return res
        .status(401)
        .json({ success: false, message: "Invalid admin email or password." });
    }

    // Success — clear lockout tracking.
    admin.failedLoginAttempts = 0;
    admin.lockUntil = null;
    await admin.save();

    const token = jwt.sign(
      { role: "admin", email: admin.email, id: admin._id },
      ADMIN_JWT_SECRET,
      { expiresIn: TOKEN_EXPIRES_IN },
    );

    return res.status(200).json({
      success: true,
      token,
      admin: { email: admin.email },
    });
  } catch (err) {
    console.error("Admin login error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
}

// Lets the frontend confirm on page load/refresh whether a stored token is
// still valid, instead of trusting a plain "true" flag in localStorage.
export async function verifyAdminToken(req, res) {
  // req.admin is populated by the adminAuth middleware, which already
  // rejected the request if the token was missing/invalid/expired.
  return res.status(200).json({ success: true, admin: req.admin });
}

// ── Step 1: request a reset OTP ──────────────────────────────────────────
export async function requestAdminPasswordReset(req, res) {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required." });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: "Admin not found." });
    }

    // A reset OTP is "pending" if one was already issued and hasn't
    // expired yet — in that case this call is a resend and counts against
    // the cap. Once the pending OTP expires (or there isn't one), it's a
    // fresh cycle and the counter resets. Mirrors requestPasswordReset in
    // userController.js.
    const hasPendingResetOTP =
      admin.resetPasswordOTP &&
      admin.resetPasswordOTPExpires &&
      admin.resetPasswordOTPExpires > new Date();

    if (hasPendingResetOTP) {
      if ((admin.resetPasswordOTPResendCount || 0) >= MAX_RESET_OTP_RESENDS) {
        return res.status(429).json({
          success: false,
          message:
            "OTP resend limit reached. Please wait for the current code to expire and try again.",
        });
      }
      admin.resetPasswordOTPResendCount =
        (admin.resetPasswordOTPResendCount || 0) + 1;
    } else {
      admin.resetPasswordOTPResendCount = 0;
    }

    const otp = generateOTP();
    admin.resetPasswordOTP = otp;
    admin.resetPasswordOTPExpires = new Date(Date.now() + RESET_OTP_EXPIRES_MS);
    await admin.save();

    const emailResult = await sendPasswordResetOTP(email, otp, "Admin");
    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to send password reset email.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Password reset code sent to your email.",
    });
  } catch (err) {
    console.error("Admin request password reset error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
}

// ── Step 2: verify the OTP and set a new password ────────────────────────
export async function resetAdminPassword(req, res) {
  try {
    const email = normalizeEmail(req.body.email);
    const { otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required." });
    }

    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 8 characters and include an uppercase letter, lowercase letter, number, and special character.",
      });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: "Admin not found." });
    }

    if (
      !admin.resetPasswordOTP ||
      admin.resetPasswordOTP !== otp ||
      !admin.resetPasswordOTPExpires ||
      new Date() > admin.resetPasswordOTPExpires
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired code." });
    }

    admin.password = await bcrypt.hash(newPassword, 10);
    admin.resetPasswordOTP = null;
    admin.resetPasswordOTPExpires = null;
    admin.resetPasswordOTPResendCount = 0;
    // A password reset is also a good moment to clear any active lockout.
    admin.failedLoginAttempts = 0;
    admin.lockUntil = null;
    await admin.save();

    return res
      .status(200)
      .json({ success: true, message: "Password reset successfully." });
  } catch (err) {
    console.error("Admin reset password error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
}
