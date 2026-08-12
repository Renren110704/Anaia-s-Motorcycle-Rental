import mongoose from "mongoose";

const { Schema } = mongoose;

// ── Return-inspection penalty/repair matrix settings (singleton) ───────────
// Lets admins customize the peso rate charged for each standardized
// inspection-matrix violation (Dirty, Minor Scratches, Tire Damage, etc.)
// without a code deploy. Only items with a fixed "flat" / "per_unit" /
// "per_hour" rate are stored here — "custom" items (Major Damage, Geofence
// Exceeded) are priced by the admin per-incident and have no stored rate.
//
// There is always exactly one document in this collection (findOneAndUpdate
// with upsert is used everywhere this is read/written), so callers can treat
// it like a key/value settings blob.
const inspectionMatrixSettingSchema = new Schema(
  {
    // Rates keyed by violation key (see INSPECTION_MATRIX_DEFAULTS in the
    // controller for the canonical list of keys/labels/kinds).
    rates: {
      type: Map,
      of: Number,
      default: () => ({}),
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

export default mongoose.models.InspectionMatrixSetting ||
  mongoose.model("InspectionMatrixSetting", inspectionMatrixSettingSchema);
