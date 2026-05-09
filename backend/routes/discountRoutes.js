import express from "express";
import mongoose from "mongoose";

const router = express.Router();

// ─── Mongoose Schema ──────────────────────────────────────────────────────────
const discountSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true, uppercase: true, default: "" },
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

// Unique index on code (sparse so empty codes are allowed)
discountSchema.index({ code: 1 }, { sparse: true, unique: true });

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
router.get("/", async (req, res) => {
  try {
    const promos = await Discount.find().sort({ createdAt: -1 }).lean();
    res.json(promos);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/discounts/:id  — admin
router.get("/:id", async (req, res) => {
  try {
    const promo = await Discount.findById(req.params.id).lean();
    if (!promo) return res.status(404).json({ message: "Discount not found" });
    res.json(promo);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/discounts  — admin create
router.post("/", async (req, res) => {
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
      code: code ? code.toUpperCase().trim() : "",
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

    res.status(201).json(promo);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/discounts/:id  — admin update
router.put("/:id", async (req, res) => {
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
      promo.code = newCode;
    }

    const updated = await promo.save();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/discounts/:id/toggle  — admin toggle active
router.patch("/:id/toggle", async (req, res) => {
  try {
    const promo = await Discount.findById(req.params.id);
    if (!promo) return res.status(404).json({ message: "Discount not found" });
    promo.isActive = !promo.isActive;
    const updated = await promo.save();
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
router.delete("/:id", async (req, res) => {
  try {
    const promo = await Discount.findByIdAndDelete(req.params.id);
    if (!promo) return res.status(404).json({ message: "Discount not found" });
    res.json({ message: "Discount deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
