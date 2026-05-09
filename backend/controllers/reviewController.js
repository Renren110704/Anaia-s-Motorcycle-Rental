import mongoose from "mongoose";
import Review from "../models/reviewModel.js";
import MotorcycleBooking from "../models/motorcycleBookingModel.js";
import { createSystemLog } from "../utils/systemLogService.js";
import { v2 as cloudinary } from "cloudinary";

// Cloudinary Configuration
const CLOUDINARY_FOLDER = process.env.CLOUDINARY_UPLOAD_FOLDER || "anaiasmotorcyclerental";
const CLOUDINARY_REVIEWS_FOLDER = "reviews";
const CLOUDINARY_ENABLED = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET,
);

if (CLOUDINARY_ENABLED) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const normalizeUrl = (value = "") => {
  const normalized = String(value || "").trim();
  return normalized.replace(/^http:\/\//i, "https://");
};

const summarizeHelpfulVotes = (helpfulVotes = []) => {
  const summary = {
    helpfulLikeCount: 0,
    helpfulDislikeCount: 0,
    helpfulVoteCount: 0,
  };

  for (const entry of helpfulVotes) {
    if (entry?.vote === 1) summary.helpfulLikeCount += 1;
    if (entry?.vote === -1) summary.helpfulDislikeCount += 1;
  }

  summary.helpfulVoteCount = summary.helpfulLikeCount - summary.helpfulDislikeCount;
  return summary;
};

const uploadFileToCloudinary = async (filePath, targetFolder = CLOUDINARY_REVIEWS_FOLDER) => {
  if (!filePath || !CLOUDINARY_ENABLED) {
    console.error("[CLOUDINARY] Upload skipped - filePath:", !!filePath, "enabled:", CLOUDINARY_ENABLED);
    return null;
  }

  const MAX_RETRIES = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[CLOUDINARY] Attempt ${attempt}/${MAX_RETRIES}: uploading ${filePath} to folder: ${targetFolder}`);
      const result = await cloudinary.uploader.upload(filePath, {
        folder: `${CLOUDINARY_FOLDER}/${targetFolder}`,
        resource_type: "image",
        use_filename: true,
        unique_filename: true,
        overwrite: false,
        quality: "auto",
        fetch_format: "auto",
        timeout: 30000,
      });

      const url = normalizeUrl(result.secure_url || result.url || result.secureUrl || "");
      if (!url) {
        console.error("[CLOUDINARY] No URL in response:", result);
        lastError = new Error("No URL in Cloudinary response");
        if (attempt < MAX_RETRIES) continue;
        return null;
      }

      console.log("[CLOUDINARY] Upload successful:", url);
      return url;
    } catch (err) {
      lastError = err;
      console.error(`[CLOUDINARY] Attempt ${attempt} failed:`, err.message);
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  console.error("[CLOUDINARY] All upload attempts failed:", lastError?.message);
  return null;
};

/**
 * Create a new review for a completed booking
 */
export const createReview = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const {
      rating,
      feedbackDescription,
      rideComfort,
      condition,
      performance,
      customerService,
    } = req.body;
    const isRenterPublic = typeof req.body.isRenterPublic !== "undefined"
      ? String(req.body.isRenterPublic) === "true" || req.body.isRenterPublic === true
      : true;

    // Validate booking exists and is completed
    const booking = await MotorcycleBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.status !== "completed") {
      return res.status(400).json({ message: "Only completed bookings can be reviewed" });
    }

    // Check if review already exists
    const existingReview = await Review.findOne({ bookingId });
    if (existingReview) {
      return res.status(400).json({ message: "Review already exists for this booking" });
    }

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    // Upload images if provided
    let reviewImages = [];
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        try {
          const uploadedUrl = await uploadFileToCloudinary(file.path, CLOUDINARY_REVIEWS_FOLDER);
          if (uploadedUrl) {
            reviewImages.push(uploadedUrl);
          }
        } catch (err) {
          console.error("Image upload error:", err);
        }
      }
    }

    const newReview = new Review({
      bookingId,
      userId: req.user?._id || booking.userId || null,
      motorcycleId: booking.motorcycle?.id || null,
      renterName: booking.customer,
      renterEmail: booking.email,
      isRenterPublic,
      rating: Math.min(5, Math.max(1, parseInt(rating, 10))),
      feedbackDescription: feedbackDescription || "",
      reviewImages,
      rideComfort: rideComfort ? Math.min(5, Math.max(1, parseInt(rideComfort, 10))) : null,
      condition: condition ? Math.min(5, Math.max(1, parseInt(condition, 10))) : null,
      performance: performance ? Math.min(5, Math.max(1, parseInt(performance, 10))) : null,
      customerService: customerService ? Math.min(5, Math.max(1, parseInt(customerService, 10))) : null,
      status: "pending",
    });

    await newReview.save();

    // Create system log
    await createSystemLog({
      action: "REVIEW_SUBMITTED",
      targetType: "Review",
      targetId: newReview._id,
      description: `New review submitted for booking ${bookingId} with rating ${rating}`,
      details: {
        bookingId,
        rating,
        hasImages: reviewImages.length > 0,
      },
    });

    res.status(201).json({
      message: "Review submitted successfully",
      review: newReview,
    });
  } catch (err) {
    console.error("Error creating review:", err);
    res.status(500).json({
      message: "Error creating review",
      error: err.message,
    });
  }
};

/**
 * Get a specific review by booking ID
 */
export const getReviewByBookingId = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const review = await Review.findOne({
      bookingId,
      isDeleted: false,
    });

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    res.json(review);
  } catch (err) {
    console.error("Error fetching review:", err);
    res.status(500).json({
      message: "Error fetching review",
      error: err.message,
    });
  }
};

/**
 * Get all reviews for a user
 */
export const getUserReviews = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const reviews = await Review.find({
      userId,
      isDeleted: false,
    })
      .populate("bookingId")
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (err) {
    console.error("Error fetching user reviews:", err);
    res.status(500).json({
      message: "Error fetching user reviews",
      error: err.message,
    });
  }
};

/**
 * Get all reviews (admin view)
 */
export const getAllReviews = async (req, res) => {
  try {
    const { status, isFeatured, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const query = { isDeleted: false };
    if (status) {
      query.status = status;
    }
    if (typeof isFeatured !== "undefined") {
      query.isFeatured = String(isFeatured).toLowerCase() === "true";
    }

    const reviews = await Review.find(query)
      .populate("bookingId")
      .populate("motorcycleId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    const total = await Review.countDocuments(query);

    res.json({
      reviews,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / parseInt(limit, 10)),
      },
    });
  } catch (err) {
    console.error("Error fetching reviews:", err);
    res.status(500).json({
      message: "Error fetching reviews",
      error: err.message,
    });
  }
};

/**
 * Update review status (admin only)
 */
export const updateReviewStatus = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { status, adminNotes } = req.body;

    if (!["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const existingReview = await Review.findById(reviewId);
    if (!existingReview) {
      return res.status(404).json({ message: "Review not found" });
    }

    const review = await Review.findByIdAndUpdate(
      reviewId,
      {
        status,
        adminNotes: adminNotes || "",
      },
      { new: true }
    );

    // Create system log
    await createSystemLog({
      action: "REVIEW_STATUS_UPDATED",
      targetType: "Review",
      targetId: reviewId,
      description: `Review status updated to ${status}`,
      details: {
        previousStatus: existingReview.status,
        newStatus: status,
      },
    });

    res.json({
      message: "Review status updated",
      review,
    });
  } catch (err) {
    console.error("Error updating review status:", err);
    res.status(500).json({
      message: "Error updating review status",
      error: err.message,
    });
  }
};

/**
 * Admin reply to a review
 */
export const replyToReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { adminReplyMessage, adminRepliedBy } = req.body;

    const message = String(adminReplyMessage || "").trim();
    if (!message) {
      return res.status(400).json({ message: "Reply message is required" });
    }

    const review = await Review.findByIdAndUpdate(
      reviewId,
      {
        adminReplyMessage: message,
        adminRepliedBy: String(adminRepliedBy || "Admin").trim() || "Admin",
        adminRepliedAt: new Date(),
      },
      { new: true },
    );

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    await createSystemLog({
      action: "REVIEW_REPLIED",
      targetType: "Review",
      targetId: reviewId,
      description: "Admin replied to review",
      details: {
        reviewId,
      },
    });

    res.json({ message: "Reply saved", review });
  } catch (err) {
    console.error("Error replying to review:", err);
    res.status(500).json({
      message: "Error replying to review",
      error: err.message,
    });
  }
};

/**
 * Admin toggle review as featured testimonial
 */
export const setReviewFeatured = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { isFeatured } = req.body;

    if (typeof isFeatured !== "boolean") {
      return res.status(400).json({ message: "isFeatured must be boolean" });
    }

    const existingReview = await Review.findById(reviewId);
    if (!existingReview) {
      return res.status(404).json({ message: "Review not found" });
    }

    if (isFeatured && existingReview.status !== "approved") {
      return res.status(400).json({
        message: "Only approved reviews can be featured in testimonials",
      });
    }

    const review = await Review.findByIdAndUpdate(
      reviewId,
      {
        isFeatured,
        featuredAt: isFeatured ? new Date() : null,
      },
      { new: true },
    );

    await createSystemLog({
      action: isFeatured ? "REVIEW_FEATURED" : "REVIEW_UNFEATURED",
      targetType: "Review",
      targetId: reviewId,
      description: isFeatured
        ? "Review marked as testimonial"
        : "Review removed from testimonials",
      details: { reviewId, isFeatured },
    });

    res.json({
      message: isFeatured
        ? "Review added to testimonials"
        : "Review removed from testimonials",
      review,
    });
  } catch (err) {
    console.error("Error setting review featured flag:", err);
    res.status(500).json({
      message: "Error updating featured flag",
      error: err.message,
    });
  }
};

/**
 * Public testimonials from featured approved reviews
 */
export const getFeaturedTestimonials = async (req, res) => {
  try {
    const limit = Math.min(12, Math.max(1, parseInt(req.query.limit || "6", 10)));

    const reviews = await Review.find({
      status: "approved",
      isFeatured: true,
      isDeleted: false,
    })
      .populate("motorcycleId", "make model")
      .sort({ featuredAt: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    const mapped = reviews.map((review) => ({
      id: review._id,
      name: review.isRenterPublic ? (review.renterName || "Verified Renter") : "Anonymous",
      role: "Verified Renter",
      comment: review.feedbackDescription || "",
      rating: Number(review.rating || 0),
      motorcycle:
        review?.motorcycleId?.make || review?.motorcycleId?.model
          ? `${review.motorcycleId.make || ""} ${review.motorcycleId.model || ""}`.trim()
          : "Rented Motorcycle",
      reviewImages: Array.isArray(review.reviewImages) ? review.reviewImages : [],
      adminReplyMessage: review.adminReplyMessage || "",
      adminRepliedBy: review.adminRepliedBy || "",
      adminRepliedAt: review.adminRepliedAt || null,
    }));

    res.json({
      testimonials: mapped,
      count: mapped.length,
    });
  } catch (err) {
    console.error("Error fetching featured testimonials:", err);
    res.status(500).json({
      message: "Error fetching featured testimonials",
      error: err.message,
    });
  }
};

/**
 * Delete a review (soft delete)
 */
export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const review = await Review.findByIdAndDelete(reviewId);

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Create system log for hard delete
    await createSystemLog({
      action: "REVIEW_DELETED",
      targetType: "Review",
      targetId: reviewId,
      description: "Review permanently removed",
      details: { deletedReview: reviewId },
    });

    res.json({ message: "Review permanently deleted" });
  } catch (err) {
    console.error("Error deleting review:", err);
    res.status(500).json({
      message: "Error deleting review",
      error: err.message,
    });
  }
};

/**
 * Get reviews for a specific motorcycle
 */
export const getMotorcycleReviews = async (req, res) => {
  try {
    const { motorcycleId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const reviews = await Review.find({
      motorcycleId,
      status: "approved",
      isDeleted: false,
    })
      .populate("userId", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    const total = await Review.countDocuments({
      motorcycleId,
      status: "approved",
      isDeleted: false,
    });

    // Calculate average rating
    const avgResult = await Review.aggregate([
      {
        $match: {
          motorcycleId: mongoose.Types.ObjectId.createFromHexString(motorcycleId),
          status: "approved",
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          avgRideComfort: { $avg: "$rideComfort" },
          avgCondition: { $avg: "$condition" },
          avgPerformance: { $avg: "$performance" },
          avgCustomerService: { $avg: "$customerService" },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    const stats = avgResult[0] || {
      avgRating: 0,
      avgRideComfort: 0,
      avgCondition: 0,
      avgPerformance: 0,
      avgCustomerService: 0,
      totalReviews: 0,
    };

    const reviewList = reviews.map((review) => ({
      ...review.toObject(),
      ...summarizeHelpfulVotes(review.helpfulVotes || []),
    }));

    res.json({
      reviews: reviewList,
      stats,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / parseInt(limit, 10)),
      },
    });
  } catch (err) {
    console.error("Error fetching motorcycle reviews:", err);
    res.status(500).json({
      message: "Error fetching motorcycle reviews",
      error: err.message,
    });
  }
};

/**
 * Vote on whether a review is helpful or not
 */
export const voteOnReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { vote } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const normalizedVote = vote === "like" ? 1 : vote === "dislike" ? -1 : null;
    if (!normalizedVote) {
      return res.status(400).json({ message: "Invalid vote value" });
    }

    const review = await Review.findOne({
      _id: reviewId,
      status: "approved",
      isDeleted: false,
    });

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    const votes = Array.isArray(review.helpfulVotes) ? [...review.helpfulVotes] : [];
    const existingIndex = votes.findIndex((entry) => String(entry.userId) === String(userId));

    if (existingIndex >= 0) {
      if (votes[existingIndex].vote === normalizedVote) {
        votes.splice(existingIndex, 1);
      } else {
        votes[existingIndex] = {
          userId,
          vote: normalizedVote,
          votedAt: new Date(),
        };
      }
    } else {
      votes.push({ userId, vote: normalizedVote, votedAt: new Date() });
    }

    review.helpfulVotes = votes;
    await review.save();

    const summarized = summarizeHelpfulVotes(review.helpfulVotes);

    return res.json({
      message: "Vote saved",
      review: {
        ...review.toObject(),
        ...summarized,
      },
    });
  } catch (err) {
    console.error("Error voting on review:", err);
    res.status(500).json({
      message: "Error saving vote",
      error: err.message,
    });
  }
};
