import mongoose from "mongoose";

const { Schema } = mongoose;

const reviewSchema = new Schema(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "MotorcycleBooking",
      required: true,
      unique: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    motorcycleId: {
      type: Schema.Types.ObjectId,
      ref: "Motorcycle",
      default: null,
    },
    renterName: {
      type: String,
      required: true,
      trim: true,
    },
    renterEmail: {
      type: String,
      required: true,
      trim: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    feedbackDescription: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },
    reviewImages: {
      type: [String],
      default: [],
    },
    // Categories for detailed ratings
    rideComfort: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    condition: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    performance: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    customerService: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    // Status tracking
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    adminNotes: {
      type: String,
      default: "",
    },
    adminReplyMessage: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },
    adminRepliedBy: {
      type: String,
      default: "Admin",
      trim: true,
    },
    adminRepliedAt: {
      type: Date,
      default: null,
    },
    helpfulVotes: {
      type: [
        {
          userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
          },
          vote: {
            type: Number,
            enum: [1, -1],
            required: true,
          },
          votedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
    },
    // Whether the renter allows their name to be shown publicly (testimonials)
    isRenterPublic: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    featuredAt: {
      type: Date,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Index for faster queries
reviewSchema.index({ bookingId: 1 });
reviewSchema.index({ userId: 1 });
reviewSchema.index({ motorcycleId: 1 });
reviewSchema.index({ createdAt: -1 });
reviewSchema.index({ "helpfulVotes.userId": 1 });

const Review = mongoose.model("Review", reviewSchema);

export default Review;
