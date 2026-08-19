import express from "express";
import mongoose from "mongoose";
import {
  notifyNewPromo,
  removePromoNotifications,
} from "../services/notificationService.js";
import User from "../models/userModel.js";
import LoyaltyConfig from "../models/loyaltyConfigModel.js";
import {
  getLoyaltyConfig,
  invalidateLoyaltyConfigCache,
  getTierForCount,
  getNextTierProgress,
  getTierThresholds,
} from "../services/loyaltyService.js";
import adminAuth from "../middlewares/adminAuth.js";

const router = express.Router();

// ─── Mongoose Schema ──────────────────────────────────────────────────────────
const discountSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true, uppercase: true },
    description: { type: String, trim: true, default: "" },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },
    discountValue: { type: Number, required: true, min: 0 },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    maxUses: { type: Number, default: null }, // null = unlimited
    usedCount: { type: Number, default: 0 },
    minRentalDays: { type: Number, default: 0 }, // 0 = no minimum
    applicableVehicleIds: [{ type: String }], // [] = all vehicles
    applicableCategories: [{ type: String }], // [] = all categories
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// Unique index on code. Uses a partial filter (rather than just `sparse`) so
// that it only applies to documents with a real, non-empty code — `sparse`
// alone only excludes documents missing the field entirely, and would still
// treat every promo with code: "" as a duplicate of every other one.
discountSchema.index(
  { code: 1 },
  {
    unique: true,
    partialFilterExpression: { code: { $type: "string", $ne: "" } },
  },
);

const Discount =
  mongoose.models.Discount || mongoose.model("Discount", discountSchema);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const isPromoCurrentlyActive = (promo) => {
  if (!promo.isActive) return false;
  const now = new Date();
  if (promo.startDate && new Date(promo.startDate) > now) return false;
  if (promo.endDate && new Date(promo.endDate) < now) return false;
  if (promo.maxUses != null && promo.usedCount >= promo.maxUses) return false;
  return true;
};

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/discounts/active  — public, user-facing
router.get("/active", async (req, res) => {
  try {
    const now = new Date();
    const promos = await Discount.find({
      isActive: true,
      $and: [
        { $or: [{ startDate: null }, { startDate: { $lte: now } }] },
        { $or: [{ endDate: null }, { endDate: { $gte: now } }] },
      ],
    }).lean();
    res.json(promos.filter(isPromoCurrentlyActive));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/discounts  — admin
router.get("/", adminAuth, async (req, res) => {
  try {
    const promos = await Discount.find().sort({ createdAt: -1 }).lean();
    res.json(promos);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Loyalty rewards program ──────────────────────────────────────────────────

const isLoyaltyCodeUsable = (entry) => {
  if (!entry) return false;
  if (entry.usedAt) return false;
  if (entry.expiresAt && new Date(entry.expiresAt) < new Date()) return false;
  return true;
};

// GET /api/discounts/loyalty/status/:userId — user's tier, progress, and codes
router.get("/loyalty/status/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }
    const [user, config] = await Promise.all([
      User.findById(userId).lean(),
      getLoyaltyConfig(),
    ]);
    if (!user) return res.status(404).json({ message: "User not found" });

    const completedRentalsCount = user.completedRentalsCount || 0;
    const tier =
      user.loyaltyTier || getTierForCount(completedRentalsCount, config);
    const progress = getNextTierProgress(completedRentalsCount, config);
    const activeCodes = (user.loyaltyCodes || []).filter(isLoyaltyCodeUsable);
    const codeHistory = (user.loyaltyCodes || [])
      .slice()
      .sort((a, b) => new Date(b.issuedAt) - new Date(a.issuedAt));

    res.json({
      completedRentalsCount,
      tier,
      tierBenefits: tier !== "None" ? config.tiers[tier] : null,
      tierThresholds: getTierThresholds(config),
      nextTier: progress.nextTier,
      rentalsUntilNextTier: progress.rentalsRemaining,
      activeCodes,
      codeHistory,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/discounts/loyalty/config — admin: read the loyalty program settings
router.get("/loyalty/config", async (req, res) => {
  try {
    const config = await getLoyaltyConfig({ skipCache: true });
    res.json(config);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/discounts/loyalty/config — admin: update tier thresholds, discounts,
// periodic reward frequency, and the milestone reward.
router.put("/loyalty/config", adminAuth, async (req, res) => {
  try {
    const { tiers, milestone } = req.body;

    const validTierNames = ["Silver", "Gold", "Platinum"];
    if (tiers) {
      for (const name of Object.keys(tiers)) {
        if (!validTierNames.includes(name)) {
          return res.status(400).json({ message: `Unknown tier "${name}"` });
        }
        const t = tiers[name];
        if (t.threshold != null && Number(t.threshold) < 0) {
          return res
            .status(400)
            .json({ message: `${name} threshold must be 0 or greater` });
        }
        if (
          t.discountPercent != null &&
          (Number(t.discountPercent) < 0 || Number(t.discountPercent) > 100)
        ) {
          return res.status(400).json({
            message: `${name} discount percent must be between 0 and 100`,
          });
        }
      }
      // Enforce ascending thresholds Silver < Gold < Platinum if all provided
      const thresholds = validTierNames.map((n) =>
        tiers[n]?.threshold != null ? Number(tiers[n].threshold) : null,
      );
      if (thresholds.every((t) => t != null)) {
        const [s, g, p] = thresholds;
        if (!(s < g && g < p)) {
          return res.status(400).json({
            message: "Tier thresholds must increase: Silver < Gold < Platinum",
          });
        }
      }
    }

    if (
      milestone?.discountPercent != null &&
      (Number(milestone.discountPercent) < 0 ||
        Number(milestone.discountPercent) > 100)
    ) {
      return res.status(400).json({
        message: "Milestone discount percent must be between 0 and 100",
      });
    }
    if (milestone?.rentals != null && Number(milestone.rentals) < 1) {
      return res
        .status(400)
        .json({ message: "Milestone rental count must be at least 1" });
    }

    const update = {};
    if (tiers) {
      for (const name of validTierNames) {
        if (!tiers[name]) continue;
        const t = tiers[name];
        if (t.threshold != null)
          update[`tiers.${name}.threshold`] = Number(t.threshold);
        if (t.minRentalDays != null)
          update[`tiers.${name}.minRentalDays`] = Number(t.minRentalDays);
        if (t.discountPercent != null)
          update[`tiers.${name}.discountPercent`] = Number(t.discountPercent);
        if (t.periodicEveryRentals !== undefined)
          update[`tiers.${name}.periodicEveryRentals`] =
            t.periodicEveryRentals === "" || t.periodicEveryRentals == null
              ? null
              : Number(t.periodicEveryRentals);
        if (t.codeExpiryDays != null)
          update[`tiers.${name}.codeExpiryDays`] = Number(t.codeExpiryDays);
        if (t.description !== undefined)
          update[`tiers.${name}.description`] = t.description;
      }
    }
    if (milestone) {
      if (milestone.enabled !== undefined)
        update["milestone.enabled"] = !!milestone.enabled;
      if (milestone.rentals != null)
        update["milestone.rentals"] = Number(milestone.rentals);
      if (milestone.minRentalDays != null)
        update["milestone.minRentalDays"] = Number(milestone.minRentalDays);
      if (milestone.discountPercent != null)
        update["milestone.discountPercent"] = Number(milestone.discountPercent);
      if (milestone.codeExpiryDays != null)
        update["milestone.codeExpiryDays"] = Number(milestone.codeExpiryDays);
      if (milestone.description !== undefined)
        update["milestone.description"] = milestone.description;
    }
    update.updatedBy = req.user?._id || null;

    const config = await LoyaltyConfig.findOneAndUpdate(
      { key: "default" },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();

    invalidateLoyaltyConfigCache();

    res.json(config);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/discounts/validate-code — validate a code entered at checkout.
// Checks global promo codes first, then the user's personal loyalty codes.
router.post("/validate-code", async (req, res) => {
  try {
    const { code, userId, rentalDays } = req.body;
    const trimmedCode = String(code || "")
      .trim()
      .toUpperCase();
    if (!trimmedCode) {
      return res.status(400).json({ message: "Promo code is required" });
    }
    const days = Number(rentalDays || 1);

    // 1) Check global discount codes
    const promo = await Discount.findOne({ code: trimmedCode }).lean();
    if (promo) {
      if (!isPromoCurrentlyActive(promo)) {
        return res.status(400).json({
          message: "This promo code has expired or is no longer active.",
        });
      }
      if (promo.minRentalDays && days < promo.minRentalDays) {
        return res.status(400).json({
          message: `This code requires a minimum rental of ${promo.minRentalDays} day(s).`,
        });
      }
      return res.json({
        source: "promo",
        isLoyaltyCode: false,
        _id: promo._id,
        name: promo.name,
        code: promo.code,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        minRentalDays: promo.minRentalDays,
      });
    }

    // 2) Check user's personal loyalty codes
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(404).json({ message: "Promo code not found." });
    }
    const user = await User.findById(userId).lean();
    const loyaltyEntry = (user?.loyaltyCodes || []).find(
      (c) => c.code === trimmedCode,
    );
    if (!loyaltyEntry) {
      return res.status(404).json({ message: "Promo code not found." });
    }
    if (loyaltyEntry.usedAt) {
      return res
        .status(400)
        .json({ message: "This code has already been used." });
    }
    if (
      loyaltyEntry.expiresAt &&
      new Date(loyaltyEntry.expiresAt) < new Date()
    ) {
      return res.status(400).json({ message: "This code has expired." });
    }
    if (loyaltyEntry.minRentalDays && days < loyaltyEntry.minRentalDays) {
      return res.status(400).json({
        message: `This code requires a minimum rental of ${loyaltyEntry.minRentalDays} day(s).`,
      });
    }

    return res.json({
      source: "loyalty",
      isLoyaltyCode: true,
      _id: loyaltyEntry._id,
      name: `${loyaltyEntry.tier} Loyalty Reward`,
      code: loyaltyEntry.code,
      discountType: loyaltyEntry.discountType,
      discountValue: loyaltyEntry.discountValue,
      minRentalDays: loyaltyEntry.minRentalDays || 0,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/discounts/loyalty/redeem — mark a personal loyalty code as used.
// Called after a booking using that code has been successfully created.
router.patch("/loyalty/redeem", async (req, res) => {
  try {
    const { userId, code, bookingId } = req.body;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }
    const trimmedCode = String(code || "")
      .trim()
      .toUpperCase();
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const entry = user.loyaltyCodes.find((c) => c.code === trimmedCode);
    if (!entry) {
      return res.status(404).json({ message: "Loyalty code not found." });
    }
    if (entry.usedAt) {
      return res
        .status(400)
        .json({ message: "This code has already been used." });
    }

    entry.usedAt = new Date();
    if (bookingId && mongoose.Types.ObjectId.isValid(bookingId)) {
      entry.usedOnBookingId = bookingId;
    }
    await user.save();

    res.json({ success: true, code: entry });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/discounts/:id  — admin
router.get("/:id", adminAuth, async (req, res) => {
  try {
    const promo = await Discount.findById(req.params.id).lean();
    if (!promo) return res.status(404).json({ message: "Discount not found" });
    res.json(promo);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/discounts  — admin create
router.post("/", adminAuth, async (req, res) => {
  try {
    const {
      name,
      code,
      description,
      discountType,
      discountValue,
      startDate,
      endDate,
      maxUses,
      minRentalDays,
      applicableVehicleIds,
      applicableCategories,
      isActive,
    } = req.body;

    if (!name || !discountType || discountValue == null) {
      return res
        .status(400)
        .json({ message: "name, discountType and discountValue are required" });
    }
    if (
      discountType === "percentage" &&
      (discountValue <= 0 || discountValue > 100)
    ) {
      return res
        .status(400)
        .json({ message: "Percentage discount must be between 1 and 100" });
    }
    if (discountType === "fixed" && discountValue <= 0) {
      return res
        .status(400)
        .json({ message: "Fixed discount must be greater than 0" });
    }
    if (code) {
      const exists = await Discount.exists({ code: code.toUpperCase().trim() });
      if (exists)
        return res.status(409).json({ message: "Promo code already exists" });
    }

    const promo = await Discount.create({
      name: name.trim(),
      code: code ? code.toUpperCase().trim() : undefined,
      description: description?.trim() || "",
      discountType,
      discountValue: Number(discountValue),
      startDate: startDate || null,
      endDate: endDate || null,
      maxUses: maxUses != null ? Number(maxUses) : null,
      usedCount: 0,
      minRentalDays: Number(minRentalDays || 0),
      applicableVehicleIds: applicableVehicleIds || [],
      applicableCategories: applicableCategories || [],
      isActive: isActive !== false,
      createdBy: req.user?._id || null,
    });

    if (promo.isActive) notifyNewPromo(promo).catch(() => {});

    res.status(201).json(promo);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/discounts/:id  — admin update
router.put("/:id", adminAuth, async (req, res) => {
  try {
    const promo = await Discount.findById(req.params.id);
    if (!promo) return res.status(404).json({ message: "Discount not found" });

    const fields = [
      "name",
      "description",
      "discountType",
      "discountValue",
      "startDate",
      "endDate",
      "maxUses",
      "minRentalDays",
      "applicableVehicleIds",
      "applicableCategories",
      "isActive",
    ];
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        if (["startDate", "endDate"].includes(f))
          promo[f] = req.body[f] || null;
        else if (["discountValue", "maxUses", "minRentalDays"].includes(f))
          promo[f] = req.body[f] != null ? Number(req.body[f]) : null;
        else promo[f] = req.body[f];
      }
    }

    // Handle code update with uniqueness check
    if (req.body.code !== undefined) {
      const newCode = (req.body.code || "").toUpperCase().trim();
      if (newCode && newCode !== promo.code) {
        const exists = await Discount.exists({
          code: newCode,
          _id: { $ne: promo._id },
        });
        if (exists)
          return res.status(409).json({ message: "Promo code already exists" });
      }
      promo.code = newCode || undefined;
    }

    const updated = await promo.save();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/discounts/:id/toggle  — admin toggle active
router.patch("/:id/toggle", adminAuth, async (req, res) => {
  try {
    const promo = await Discount.findById(req.params.id);
    if (!promo) return res.status(404).json({ message: "Discount not found" });
    promo.isActive = !promo.isActive;
    const updated = await promo.save();
    if (updated.isActive) {
      notifyNewPromo(updated).catch(() => {});
    } else {
      removePromoNotifications(updated._id).catch(() => {});
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/discounts/:id/increment-usage  — called when a booking with promo is confirmed
router.patch("/:id/increment-usage", async (req, res) => {
  try {
    const updated = await Discount.findByIdAndUpdate(
      req.params.id,
      { $inc: { usedCount: 1 } },
      { new: true },
    );
    if (!updated)
      return res.status(404).json({ message: "Discount not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/discounts/:id  — admin delete
router.delete("/:id", adminAuth, async (req, res) => {
  try {
    const promo = await Discount.findByIdAndDelete(req.params.id);
    if (!promo) return res.status(404).json({ message: "Discount not found" });
    removePromoNotifications(promo._id).catch(() => {});
    res.json({ message: "Discount deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
