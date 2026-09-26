import mongoose from "mongoose";

const { Schema } = mongoose;

// ── Address sub-document ──────────────────────────────────────────────────────
const addressSchema = new Schema(
  {
    barangay: { type: String, default: "" },
    street: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    region: { type: String, default: "" },
    zipCode: { type: String, default: "" },
  },
  { _id: false, default: {} },
);

// ── Motorcycle snapshot sub-document ─────────────────────────────────────────
const motorcycleSummarySchema = new Schema(
  {
    id: { type: Schema.Types.ObjectId, ref: "Motorcycle", required: true },
    unitId: { type: String, default: "" },
    make: { type: String, default: "" },
    model: { type: String, default: "" },
    year: Number,
    dailyRate: { type: Number, default: 0 },
    category: { type: String, default: "Scooter" },
    engineSize: { type: Number, default: 150 },
    transmission: { type: String, default: "Manual" },
    fuelType: { type: String, default: "Unleaded" },
    mileage: { type: Number, default: 0 },
    hasABS: { type: Boolean, default: false },
    hasHelmet: { type: Boolean, default: true },
    image: { type: String, default: "" },
  },
  { _id: false },
);

// ── Security deposit sub-document ────────────────────────────────────────────
// Tracks the refundable ₱1,000 security deposit that must be collected before
// the renter can pick up the motorcycle, and whether/how much was returned.
const securityDepositSchema = new Schema(
  {
    required: { type: Boolean, default: true },
    amount: { type: Number, default: 1000 },
    collected: { type: Boolean, default: false },
    collectedAt: { type: Date, default: null },
    collectionMethod: {
      type: String,
      enum: ["Cash", "GCash", "PayMaya", "Bank Transfer", ""],
      default: "",
    },
    receivedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    returned: { type: Boolean, default: false },
    returnedAt: { type: Date, default: null },
    returnedAmount: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    deductionNotes: { type: String, default: "" },
    // Amount still owed by the customer when a penalty exceeds the deposit.
    balanceDue: { type: Number, default: 0 },
    // Human-readable record of why the refund was full/partial — shown to
    // both the admin and the renter as the refund's "booking history".
    refundReason: { type: String, default: "" },
  },
  { _id: false, default: () => ({}) },
);

// ── Return inspection sub-document ─────────────────────────────────────────
const returnInspectionSchema = new Schema(
  {
    inspectionDate: { type: Date, default: null },
    clearanceStatus: {
      type: String,
      enum: ["pending_inspection", "cleared", "penalty_required"],
      default: "pending_inspection",
    },
    damageNotes: { type: String, default: "" },
    mechanicNotes: { type: String, default: "" },
    repairEstimateAmount: { type: Number, default: 0 },
    repairEstimateNotes: { type: String, default: "" },
    repairAttachments: { type: [String], default: [] },
    damagePhotos: { type: [String], default: [] },
    penaltyPhotos: { type: [String], default: [] },
    penaltyAmount: { type: Number, default: 0 },
    penaltySummary: { type: String, default: "" },
    penaltySettled: { type: Boolean, default: false },
    // Standardized inspection-matrix violations selected by the admin during
    // return inspection (e.g. Dirty, Minor Scratches, Late Return). Each
    // entry captures enough detail to reconstruct the penalty breakdown later.
    violations: {
      type: [
        {
          key: { type: String, required: true },
          label: { type: String, required: true },
          unitAmount: { type: Number, default: 0 },
          quantity: { type: Number, default: 1 },
          amount: { type: Number, default: 0 },
        },
      ],
      default: () => [],
      _id: false,
    },
    vehicleStatus: {
      type: String,
      enum: [
        "inspection",
        "under_review",
        "repair_needed",
        "available",
        "maintenance",
        "pending",
        "rented",
      ],
      default: "inspection",
    },
    startedAt: { type: Date, default: null },
    clearedAt: { type: Date, default: null },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false, default: {} },
);

// ── Booking details sub-document (fees, extras, pickup location) ──────────────
// Previously missing — caused helmet fee & distance fee to be silently dropped.
const bookingDetailsSchema = new Schema(
  {
    pickupLocation: { type: String, default: "" },
    distanceFee: { type: Number, default: 0 },
    distanceTierLabel: { type: String, default: "" },
    helmetRequested: { type: Boolean, default: false },
    helmetFee: { type: Number, default: 0 },
    destinationCity: { type: String, default: "" },
    // legacy / extra fields — store anything else sent from the frontend
    engineSize: { type: Number, default: null },
    transmission: { type: String, default: "" },
    fuelType: { type: String, default: "" },
    fuel: { type: String, default: "" },
    hasABS: { type: Boolean, default: null },
    dailyRate: { type: Number, default: null },
  },
  {
    _id: false,
    // Allow any extra keys the frontend might send in the future
    strict: false,
  },
);

const motorcycleBookingSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    customer: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    phone: { type: String, default: "" },
    motorcycle: { type: motorcycleSummarySchema, required: true },
    motorcycleImage: { type: String, default: "" },

    pickupDate: { type: Date, required: true },
    pickupTime: {
      type: String,
      required: true,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, "pickupTime must be HH:mm"],
      default: "08:00",
    },
    returnDate: { type: Date, required: true },
    returnTime: {
      type: String,
      required: true,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, "returnTime must be HH:mm"],
      default: "08:00",
    },

    destination: { type: String, required: true, trim: true },

    // bookingDate is set explicitly so we always capture exact creation time.
    // We rely on createdAt from timestamps as a fallback, but keep bookingDate
    // for backwards-compatibility with existing records.
    bookingDate: { type: Date, default: Date.now },

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

    amount: { type: Number, default: 0 },
    reservationFee: { type: Number, default: 200 },
    reservationFeePaid: { type: Boolean, default: false },
    paymentStatus: {
      type: String,
      enum: [
        "pending_verification",
        "reservation_paid",
        "fully_paid",
        "rejected",
      ],
      default: "pending_verification",
    },
    paymentMethod: {
      type: String,
      enum: ["Cash", "GCash", "PayMaya", "Bank Transfer"],
      default: "Cash",
    },
    reservationPaymentMethod: { type: String, default: "" },
    fullPaymentMethod: { type: String, default: "" },
    // The actual amount paid at the full-payment/pickup stage, captured at
    // the moment confirmFullPayment succeeds (alongside transactionId) so
    // it stays accurate for that transaction even if the booking's total
    // amount changes later (e.g. via an extension).
    fullPaymentAmount: { type: Number, default: 0 },

    paymentProofImage: { type: String, default: "" },
    paymentReferenceId: { type: String, default: "" },
    // System-generated ID assigned automatically the moment a full payment
    // is successfully confirmed (see confirmFullPayment in the booking
    // controller). Unique across all bookings; sparse so bookings that
    // haven't reached full payment yet (field left unset, not null) don't
    // collide against the unique index. IMPORTANT: no `default` here on
    // purpose — a default of null would still count as "present" for a
    // sparse index and break uniqueness across untouched bookings.
    transactionId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    paymentSentAt: { type: Date, default: null },
    paymentSentAmount: { type: Number, default: 0 },
    requiresProofReupload: { type: Boolean, default: false },
    adminReviewComment: { type: String, default: "" },
    adminReviewedAt: { type: Date, default: null },
    reservationConfirmedAt: { type: Date, default: null },
    fullPaymentConfirmedAt: { type: Date, default: null },
    receiptVerification: {
      status: {
        type: String,
        enum: ["pending", "verified", "suspected_fake", "failed"],
        default: "pending",
      },
      score: { type: Number, default: 0 },
      provider: { type: String, default: "local-rule-engine" },
      reasons: { type: [String], default: [] },
      checkedAt: { type: Date, default: Date.now },
    },

    // ── The previously-missing details field ──────────────────────────────────
    details: { type: bookingDetailsSchema, default: () => ({}) },

    // ── ₱1,000 refundable security deposit, collected at pickup ────────────
    securityDeposit: { type: securityDepositSchema, default: () => ({}) },

    returnInspection: { type: returnInspectionSchema, default: () => ({}) },

    extensions: {
      type: [
        {
          requestedAt: { type: Date, default: Date.now },
          requestedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
          },
          previousReturnDate: { type: Date, default: null },
          previousReturnTime: { type: String, default: "" },
          newReturnDate: { type: Date, default: null },
          newReturnTime: { type: String, default: "" },
          previousAmount: { type: Number, default: 0 },
          newAmount: { type: Number, default: 0 },
          additionalAmount: { type: Number, default: 0 },
          // Promo/loyalty code applied to THIS extension specifically —
          // intentionally separate from (and never copied from) the
          // original booking's details.appliedDiscount. null when no code
          // was entered for this extension.
          appliedDiscount: {
            type: {
              source: { type: String, enum: ["promo", "loyalty"] },
              refId: { type: Schema.Types.ObjectId, default: null },
              code: { type: String, default: "" },
              discountType: {
                type: String,
                enum: ["percentage", "fixed"],
              },
              discountValue: { type: Number, default: 0 },
            },
            default: null,
            _id: false,
          },
        },
      ],
      default: () => [],
    },

    reschedules: {
      type: [
        {
          requestedAt: { type: Date, default: Date.now },
          requestedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
          },
          previousPickupDate: { type: Date, default: null },
          previousPickupTime: { type: String, default: "" },
          previousReturnDate: { type: Date, default: null },
          previousReturnTime: { type: String, default: "" },
          newPickupDate: { type: Date, default: null },
          newPickupTime: { type: String, default: "" },
          newReturnDate: { type: Date, default: null },
          newReturnTime: { type: String, default: "" },
          previousAmount: { type: Number, default: 0 },
          newAmount: { type: Number, default: 0 },
          additionalAmount: { type: Number, default: 0 },
          // Promo/loyalty code applied to THIS reschedule specifically —
          // either a freshly-entered code ("promo"/"loyalty", applied in
          // full to the new duration) or the ORIGINAL checkout discount
          // automatically continuing to apply ("carryover", capped to the
          // original booking's duration). null when no discount applies.
          appliedDiscount: {
            type: {
              source: {
                type: String,
                enum: ["promo", "loyalty", "carryover"],
              },
              refId: { type: Schema.Types.ObjectId, default: null },
              code: { type: String, default: "" },
              discountType: {
                type: String,
                enum: ["percentage", "fixed"],
              },
              discountValue: { type: Number, default: 0 },
            },
            default: null,
            _id: false,
          },
        },
      ],
      default: () => [],
    },

    address: { type: addressSchema, default: () => ({}) },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },

    trackingSummary: {
      type: {
        totalDistanceKm: { type: Number, default: 0 },
        avgSpeedKmh: { type: Number, default: 0 },
        maxSpeedKmh: { type: Number, default: 0 },
        stopsMade: { type: Number, default: 0 },
        lastUpdatedAt: { type: Date, default: null },
      },
      default: null,
    },
    trackingBaseline: {
      type: {
        totalDistanceKm: { type: Number, default: 0 },
        stopsMade: { type: Number, default: 0 },
        capturedAt: { type: Date, default: null },
      },
      default: null,
    },
  },
  { timestamps: true },
);

// ── Pre-validate: populate motorcycle snapshot from DB if fields are missing ──
motorcycleBookingSchema.pre("validate", async function (next) {
  if (!this.motorcycle?.id) return next();

  const { make, model, dailyRate } = this.motorcycle;
  if (make || model || dailyRate) return next();

  try {
    const Motorcycle =
      mongoose.models.Motorcycle || mongoose.model("Motorcycle");
    const motorcycleDoc = await Motorcycle.findById(this.motorcycle.id).lean();
    if (motorcycleDoc) {
      Object.assign(this.motorcycle, {
        unitId: motorcycleDoc.unitId ?? this.motorcycle.unitId ?? "",
        make: motorcycleDoc.make ?? this.motorcycle.make,
        model: motorcycleDoc.model ?? this.motorcycle.model,
        year: motorcycleDoc.year ?? this.motorcycle.year,
        dailyRate: motorcycleDoc.dailyRate ?? this.motorcycle.dailyRate,
        engineSize: motorcycleDoc.engineSize ?? this.motorcycle.engineSize,
        transmission:
          motorcycleDoc.transmission ?? this.motorcycle.transmission,
        fuelType: motorcycleDoc.fuelType ?? this.motorcycle.fuelType,
        mileage: motorcycleDoc.mileage ?? this.motorcycle.mileage,
        hasABS: motorcycleDoc.hasABS ?? this.motorcycle.hasABS,
        hasHelmet: motorcycleDoc.hasHelmet ?? this.motorcycle.hasHelmet,
        image: motorcycleDoc.image ?? this.motorcycle.image,
      });
      if (!this.motorcycleImage)
        this.motorcycleImage = motorcycleDoc.image || "";
    }
    next();
  } catch (err) {
    next(err);
  }
});

// Speeds up "My Bookings" list fetch by user with newest-first sort.
motorcycleBookingSchema.index({ userId: 1, bookingDate: -1 });
// Speeds up overlap checks used during booking creation and walk-in booking.
motorcycleBookingSchema.index({
  "motorcycle.id": 1,
  status: 1,
  pickupDate: 1,
  returnDate: 1,
  isDeleted: 1,
});

export default mongoose.models.MotorcycleBooking ||
  mongoose.model("MotorcycleBooking", motorcycleBookingSchema);
