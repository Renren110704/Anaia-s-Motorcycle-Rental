import mongoose from "mongoose";

// Loyalty program configuration is a SINGLETON document — there is only ever
// one, fetched/created via getLoyaltyConfig() in loyaltyService.js. Storing
// it in the DB (rather than hardcoding) lets admins tune the program from
// the Discount Management UI without a deploy.

const tierBenefitSchema = new mongoose.Schema(
  {
    threshold: { type: Number, required: true, min: 0 }, // completed rentals needed
    minRentalDays: { type: Number, default: 0, min: 0 }, // 0 = no minimum
    discountPercent: { type: Number, required: true, min: 0, max: 100 },
    periodicEveryRentals: { type: Number, default: null, min: 0 }, // null/0 = no recurring codes
    codeExpiryDays: { type: Number, default: 90, min: 0 }, // 0 = never expires
    description: { type: String, default: "" },
  },
  { _id: false },
);

const milestoneSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: true },
    rentals: { type: Number, default: 10, min: 1 },
    minRentalDays: { type: Number, default: 0, min: 0 }, // 0 = no minimum
    discountPercent: { type: Number, default: 50, min: 0, max: 100 },
    codeExpiryDays: { type: Number, default: 180, min: 0 },
    description: { type: String, default: "" },
  },
  { _id: false },
);

const loyaltyConfigSchema = new mongoose.Schema(
  {
    // Fixed key so there's always exactly one config document.
    key: { type: String, default: "default", unique: true },

    tiers: {
      Silver: {
        type: tierBenefitSchema,
        default: () => ({
          threshold: 3,
          minRentalDays: 0,
          discountPercent: 10,
          periodicEveryRentals: null,
          codeExpiryDays: 90,
          description: "Basic discounts and occasional promo codes.",
        }),
      },
      Gold: {
        type: tierBenefitSchema,
        default: () => ({
          threshold: 6,
          minRentalDays: 0,
          discountPercent: 20,
          periodicEveryRentals: 3,
          codeExpiryDays: 90,
          description: "Higher discounts and more frequent reward codes.",
        }),
      },
      Platinum: {
        type: tierBenefitSchema,
        default: () => ({
          threshold: 10,
          minRentalDays: 0,
          discountPercent: 30,
          periodicEveryRentals: 2,
          codeExpiryDays: 90,
          description:
            "The best discounts, exclusive promo codes, and additional loyalty perks.",
        }),
      },
    },

    milestone: {
      type: milestoneSchema,
      default: () => ({
        enabled: true,
        rentals: 10,
        minRentalDays: 0,
        discountPercent: 50,
        codeExpiryDays: 180,
        description:
          "You've completed 10 rentals! Here's a reward for your loyalty.",
      }),
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

export default mongoose.models.LoyaltyConfig ||
  mongoose.model("LoyaltyConfig", loyaltyConfigSchema);
