import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    barangay: { type: String, default: "" },
    city: { type: String, default: "" },
    province: { type: String, default: "" },
    region: { type: String, default: "" },
    zipCode: { type: String, default: "" },
  },
  { _id: false, default: {} }
);

const userSchema = new mongoose.Schema(
  {
    // ── Name fields ──────────────────────────────────────────────────────────
    firstName: { type: String, required: true, trim: true },
    middleName: { type: String, default: "", trim: true },
    lastName: { type: String, required: true, trim: true },

    // Legacy "name" kept as a virtual for backwards compatibility
    // (computed from firstName + middleName + lastName)

    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true },

    // ── Address ──────────────────────────────────────────────────────────────
    address: { type: addressSchema, default: () => ({}) },

    isVerified: { type: Boolean, default: false },

    profilePicture: { type: String, default: "" },

    // OTP fields
    verificationOTP: { type: String, default: null },
    verificationOTPExpires: { type: Date, default: null },
    loginOTP: { type: String, default: null },
    loginOTPExpires: { type: Date, default: null },
    resetPasswordOTP: { type: String, default: null },
    resetPasswordOTPExpires: { type: Date, default: null },
    emailChangeOTP: { type: String, default: null },
    emailChangeOTPExpires: { type: Date, default: null },
    pendingEmail: { type: String, default: null },
  },
  { timestamps: true }
);

// Virtual: full name (for backwards-compat with existing code that reads user.name)
userSchema.virtual("name").get(function () {
  const parts = [this.firstName, this.middleName, this.lastName].filter(Boolean);
  return parts.join(" ");
});

userSchema.set("toJSON", { virtuals: true });
userSchema.set("toObject", { virtuals: true });

const userModel = mongoose.models.user || mongoose.model("User", userSchema);

export default userModel;