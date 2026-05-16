import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    qrCodes: {
      GCash: { type: String, default: "" },
      PayMaya: { type: String, default: "" },
      "Bank Transfer": { type: String, default: "" },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Settings", settingsSchema);