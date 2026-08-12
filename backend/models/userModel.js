import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    barangay: { type: String, default: "" },
    city: { type: String, default: "" },
    province: { type: String, default: "" },
    region: { type: String, default: "" },
    zipCode: { type: String, default: "" },
  },
  { _id: false, default: {} },
);

// ── Loyalty reward code sub-document ────────────────────────────────────────
// Represents a single-use promo code issued to a user as part of the loyalty
// rewards program (tier-up bonuses, milestone rewards, periodic Gold/Platinum
// perks). These are validated/redeemed the same way as normal Discount codes,
// but are scoped to a single user instead of being globally shared.
const loyaltyCodeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true, uppercase: true },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      default: "percentage",
    },
    discountValue: { type: Number, required: true, min: 0 },
    minRentalDays: { type: Number, default: 0, min: 0 }, // 0 = no minimum
    tier: {
      type: String,
      enum: ["Silver", "Gold", "Platinum"],
      default: "Silver",
    },
    reason: {
      // What earned the user this code, e.g. "tier_upgrade", "milestone_10",
      // "periodic_reward"
      type: String,
      default: "tier_upgrade",
    },
    description: { type: String, default: "" },
    issuedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: null }, // null = no expiry
    usedAt: { type: Date, default: null },
    usedOnBookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MotorcycleBooking",
      default: null,
    },
  },
  { _id: true, timestamps: false },
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

    // Add this inside your userSchema definition (e.g., right under isVerified)
    isActive: { type: Boolean, default: true },

    profilePicture: { type: String, default: "" },

    // ── Login lockout ────────────────────────────────────────────────────────
    // Tracks consecutive failed password attempts so we can temporarily lock
    // the account out after too many failures, instead of allowing unlimited
    // brute-force guesses.
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },

    // OTP fields
    verificationOTP: { type: String, default: null },
    verificationOTPExpires: { type: Date, default: null },
    loginOTP: { type: String, default: null },
    loginOTPExpires: { type: Date, default: null },
    // Counts resends of the current login-OTP cycle (reset whenever a fresh
    // OTP cycle starts or the pending OTP is successfully verified/expires).
    loginOTPResendCount: { type: Number, default: 0 },
    resetPasswordOTP: { type: String, default: null },
    resetPasswordOTPExpires: { type: Date, default: null },
    // Counts resends of the current password-reset OTP cycle (reset when a
    // fresh cycle starts or the pending OTP is used/expires).
    resetPasswordOTPResendCount: { type: Number, default: 0 },
    emailChangeOTP: { type: String, default: null },
    emailChangeOTPExpires: { type: Date, default: null },
    // Counts resends of the current email-change OTP cycle (reset when a
    // fresh cycle starts — including targeting a different new email — or
    // the pending OTP is verified/expires).
    emailChangeOTPResendCount: { type: Number, default: 0 },
    pendingEmail: { type: String, default: null },

    // Push notification tokens (one per device)
    expoPushTokens: { type: [String], default: [] },

    // ── Loyalty rewards program ─────────────────────────────────────────────
    completedRentalsCount: { type: Number, default: 0 },
    loyaltyTier: {
      type: String,
      enum: ["None", "Silver", "Gold", "Platinum"],
      default: "None",
    },
    loyaltyTierUpdatedAt: { type: Date, default: null },
    // Completed-rental count at the time the user last received a periodic
    // (Gold/Platinum) reward code — used to space out recurring rewards.
    lastPeriodicRewardAtCount: { type: Number, default: 0 },
    loyaltyCodes: { type: [loyaltyCodeSchema], default: [] },
  },
  { timestamps: true },
);

// Virtual: full name (for backwards-compat with existing code that reads user.name)
userSchema.virtual("name").get(function () {
  const parts = [this.firstName, this.middleName, this.lastName].filter(
    Boolean,
  );
  return parts.join(" ");
});

userSchema.set("toJSON", { virtuals: true });
userSchema.set("toObject", { virtuals: true });

const userModel = mongoose.models.user || mongoose.model("User", userSchema);

export default userModel;
