import mongoose from "mongoose";

const contactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    message: { type: String, required: true },
    adminReplyMessage: { type: String, default: "" },
    adminRepliedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.model("ContactMessage", contactMessageSchema);
