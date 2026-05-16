import mongoose from "mongoose";

const chatbotLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // Null if it's a guest/unauthenticated user
    },
    userMessage: {
      type: String,
      required: true,
    },
    botReply: {
      type: String,
      required: true,
    },
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt
);

const ChatbotLog = mongoose.model("ChatbotLog", chatbotLogSchema);
export default ChatbotLog;