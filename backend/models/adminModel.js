import mongoose from "mongoose";

// Single-admin model. In practice there will only ever be one document here,
// but modeling it as a normal collection (rather than keeping credentials in
// env vars) is what makes self-service password reset possible — env vars
// can't be rewritten by a running Node process in any durable way.
const adminSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: { type: String, required: true }, // bcrypt hash, never plaintext

    // ── Login lockout ──────────────────────────────────────────────────────
    // Mirrors the same fields/logic used on the regular User model, so
    // lockout now survives server restarts (the previous in-memory version
    // didn't).
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },

    // ── Password reset OTP ────────────────────────────────────────────────
    resetPasswordOTP: { type: String, default: null },
    resetPasswordOTPExpires: { type: Date, default: null },
    resetPasswordOTPResendCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const Admin = mongoose.models.admin || mongoose.model("Admin", adminSchema);

export default Admin;
