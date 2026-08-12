import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
    },
    // Stable key so we never insert the same milestone notification twice,
    // e.g. "<bookingId>-approved-payment". Mirrors the ids Navbar.jsx used
    // to generate client-side.
    dedupeKey: {
      type: String,
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    screen: { type: String, default: "Bookings" },
    step: { type: Number, default: 0 },
    read: { type: Boolean, default: false },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// One notification per (user, dedupeKey) — safe to call the "create"
// helper multiple times for the same booking milestone.
notificationSchema.index({ user: 1, dedupeKey: 1 }, { unique: true });
notificationSchema.index({ user: 1, deleted: 1, createdAt: -1 });

export default mongoose.model("Notification", notificationSchema);
