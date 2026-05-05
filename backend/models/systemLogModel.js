import mongoose from "mongoose";

const { Schema } = mongoose;

const systemLogSchema = new Schema(
  {
    actorType: {
      type: String,
      enum: ["admin", "user", "system", "unknown"],
      default: "unknown",
    },
    actorId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    actorName: { type: String, default: "" },
    actorEmail: { type: String, default: "" },
    action: { type: String, required: true, trim: true },
    targetType: { type: String, required: true, trim: true },
    targetId: { type: String, default: "" },
    summary: { type: String, required: true, trim: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

systemLogSchema.index({ createdAt: -1 });
systemLogSchema.index({ action: 1 });
systemLogSchema.index({ targetType: 1 });
systemLogSchema.index({ actorType: 1 });

const SystemLog =
  mongoose.models.SystemLog || mongoose.model("SystemLog", systemLogSchema);

export default SystemLog;
