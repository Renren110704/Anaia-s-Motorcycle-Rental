import mongoose from "mongoose";

const { Schema } = mongoose;

const motorcycleBookingSubSchema = new Schema(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true },
    traccarDeviceId: { type: String, default: "" },
    pickupDate: { type: Date, required: true },
    returnDate: { type: Date, required: true },

    status: {
      type: String,
      enum: [
        "pending",
        "pending_reservation",
        "pending_full_payment",
        "active",
        "inspection",
        "completed",
        "cancelled",
      ],
      default: "pending_reservation",
    },
  },
  { _id: false }
);

const checkoutLockSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    acquiredAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  { _id: false },
);

const motorcycleSchema = new Schema({
  unitId: { type: String, trim: true, default: "" }, // e.g. "UNIT-01", plate number, etc.
  make: { type: String, required: true, trim: true },
  model: { type: String, required: true, trim: true },
  year: { type: Number, required: true },
  description: {
    type: String,
    trim: true,
    default: "",
  },
  color: { type: String, default: "" },
  category: { type: String, default: "Scooter" }, // Scooter, Naked, Underbone
  engineSize: { type: Number, default: 150 }, // in cc
  transmission: { type: String, default: "Manual" }, // Manual, Automatic, Semi-Automatic
  fuelType: { type: String, default: "Unleaded" }, // Unleaded, Premium
  mileage: { type: Number, default: 0 },
  dailyRate: { type: Number, required: true },
  hasABS: { type: Boolean, default: false },
  hasHelmet: { type: Boolean, default: true },
  status: {
    type: String,
    enum: [
      "available",
      "pending",
      "rented",
      "maintenance",
      "inspection",
      "under_review",
      "repair_needed",
    ],
    default: "available",
  },
  image: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },

  // Soft delete fields
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },

  bookings: { type: [motorcycleBookingSubSchema], default: [] },
  traccarDeviceId: { type: String, default: "" },
  checkoutLock: { type: checkoutLockSchema, default: null },
});

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart <= bEnd && bStart <= aEnd;
}

motorcycleSchema.methods.isAvailableForRange = function (
  requestedPickup,
  requestedReturn,
  blockingStatuses = [
    "pending",
    "pending_reservation",
    "pending_full_payment",
    "active",
    "inspection",
  ]
) {
  if (!requestedPickup || !requestedReturn) return false;

  const start = new Date(requestedPickup);
  const end = new Date(requestedReturn);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
    return false;
  if (start > end) return false;

  for (const b of this.bookings || []) {
    if (!blockingStatuses.includes(b.status)) continue;
    const bStart = new Date(b.pickupDate);
    const bEnd = new Date(b.returnDate);

    if (rangesOverlap(start, end, bStart, bEnd)) return false;
  }

  return true;
};

motorcycleSchema.methods.getAvailabilitySummary = function (nowDate = new Date()) {
  const now = new Date(nowDate);

  const blockable = (this.bookings || [])
    .filter((b) =>
      [
        "pending",
        "pending_reservation",
        "pending_full_payment",
        "active",
          "inspection",
      ].includes(b.status),
    )
    .map((b) => ({
      ...b,
      pickupDate: new Date(b.pickupDate),
      returnDate: new Date(b.returnDate),
    }))
    .sort((x, y) => x.pickupDate - y.pickupDate);

  const active = blockable.find(
    (b) => b.pickupDate <= now && now <= b.returnDate
  );
  if (active) {
    const msLeft = active.returnDate - now;
    const daysRemaining = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
    return {
      state: "booked",
      daysRemaining: Math.max(daysRemaining, 0),
      until: active.returnDate,
      bookingId: active.bookingId,
    };
  }

  const next = blockable.find((b) => b.pickupDate > now);
  if (next) {
    const msAvailable = next.pickupDate - now;
    const daysAvailable = Math.floor(msAvailable / (1000 * 60 * 60 * 24));
    return {
      state: "available_until_reservation",
      daysAvailable: Math.max(daysAvailable, 0),
      nextBookingStarts: next.pickupDate,
      bookingId: next.bookingId,
    };
  }

  return { state: "fully_available" };
};

// Soft delete method
motorcycleSchema.methods.softDelete = function (userId = null) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  return this.save();
};

// Restore method
motorcycleSchema.methods.restore = function () {
  this.isDeleted = false;
  this.deletedAt = null;
  this.deletedBy = null;
  return this.save();
};

motorcycleSchema.statics.computeAvailabilityForMotorcycles = function (
  motorcycles,
  nowDate = new Date()
) {
  const now = new Date(nowDate);
  return motorcycles.map((motorcycle) => {
    const bookings = (motorcycle.bookings || [])
      .filter((b) =>
        [
          "pending",
          "pending_reservation",
          "pending_full_payment",
          "active",
          "inspection",
        ].includes(b.status),
      )
      .map((b) => ({
        ...b,
        pickupDate: new Date(b.pickupDate),
        returnDate: new Date(b.returnDate),
      }))
      .sort((x, y) => x.pickupDate - y.pickupDate);

    const active = bookings.find(
      (b) => b.pickupDate <= now && now <= b.returnDate
    );
    if (active) {
      const msLeft = active.returnDate - now;
      const daysRemaining = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
      motorcycle.availability = {
        state: "booked",
        daysRemaining: Math.max(daysRemaining, 0),
        until: active.returnDate,
        bookingId: active.bookingId,
      };
      return motorcycle;
    }

    const next = bookings.find((b) => b.pickupDate > now);
    if (next) {
      const msAvailable = next.pickupDate - now;
      const daysAvailable = Math.floor(msAvailable / (1000 * 60 * 60 * 24));
      motorcycle.availability = {
        state: "available_until_reservation",
        daysAvailable: Math.max(daysAvailable, 0),
        nextBookingStarts: next.pickupDate,
        bookingId: next.bookingId,
      };
      return motorcycle;
    }

    motorcycle.availability = { state: "fully_available" };
    return motorcycle;
  });
};

motorcycleSchema.index({ "bookings.bookingId": 1 });
motorcycleSchema.index({ isDeleted: 1 });
motorcycleSchema.index({ unitId: 1 });

const Motorcycle = mongoose.models.Motorcycle || mongoose.model("Motorcycle", motorcycleSchema);

export default Motorcycle;