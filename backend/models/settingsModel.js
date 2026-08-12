import mongoose from "mongoose";

const paymentMethodSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    qrCode: { type: String, default: "" },
    enabled: { type: Boolean, default: true },
    // Built-in methods (GCash / PayMaya / Bank Transfer) can be disabled but not deleted.
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: false },
);

const settingsSchema = new mongoose.Schema(
  {
    paymentMethods: {
      type: [paymentMethodSchema],
      default: () => [
        { name: "GCash", qrCode: "", enabled: true, isDefault: true },
        { name: "PayMaya", qrCode: "", enabled: true, isDefault: true },
        { name: "Bank Transfer", qrCode: "", enabled: true, isDefault: true },
      ],
    },
  },
  { timestamps: true },
);

export default mongoose.model("Settings", settingsSchema);
