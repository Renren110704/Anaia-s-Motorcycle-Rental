import mongoose from "mongoose";

const favoriteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    motorcycle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Motorcycle",
      required: true,
    },
  },
  { timestamps: true },
);

// Prevent duplicate favorites for the same user + motorcycle
favoriteSchema.index({ user: 1, motorcycle: 1 }, { unique: true });

export default mongoose.model("Favorite", favoriteSchema);
