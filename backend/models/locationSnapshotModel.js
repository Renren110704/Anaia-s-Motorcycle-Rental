import mongoose from "mongoose";

const { Schema } = mongoose;

const locationSnapshotSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    id: { type: String, default: "" },
    motorcycleId: { type: String, default: "" },
    bookingId: { type: String, default: "" },
    unitId: { type: String, default: "" },
    motorcycleName: { type: String, default: "Unknown unit" },
    customer: { type: String, default: "" },
    status: { type: String, default: "" },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    locationText: { type: String, default: "" },
    lastUpdatedAt: { type: Date, default: Date.now },
    source: { type: String, default: "GPS Snapshot" },
    resolvedLocation: { type: String, default: "" },
  },
  { timestamps: true },
);

export default mongoose.models.LocationSnapshot ||
  mongoose.model("LocationSnapshot", locationSnapshotSchema);
