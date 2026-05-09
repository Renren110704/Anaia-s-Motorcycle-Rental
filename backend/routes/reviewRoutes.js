import express from "express";
import authMiddleware from "../middlewares/auth.js";
import {
  createReview,
  getReviewByBookingId,
  getUserReviews,
  getAllReviews,
  updateReviewStatus,
  replyToReview,
  deleteReview,
  getMotorcycleReviews,
  setReviewFeatured,
  getFeaturedTestimonials,
  voteOnReview,
} from "../controllers/reviewController.js";
import { uploads } from "../middlewares/uploads.js";

const reviewRouter = express.Router();

// Create review for a booking (with image uploads)
reviewRouter.post(
  "/:bookingId",
  authMiddleware,
  uploads.array("reviewImages", 5),
  createReview
);

// Get review for a specific booking
reviewRouter.get("/booking/:bookingId", getReviewByBookingId);

// Get all reviews for logged-in user
reviewRouter.get("/user/my-reviews", authMiddleware, getUserReviews);

// Get reviews for a specific motorcycle (public)
reviewRouter.get("/motorcycle/:motorcycleId", getMotorcycleReviews);

// Authenticated helpful vote on a review
reviewRouter.patch("/:reviewId/vote", authMiddleware, voteOnReview);

// Get public testimonials (featured approved reviews)
reviewRouter.get("/testimonials", getFeaturedTestimonials);

// Admin: Get all reviews
reviewRouter.get("/", getAllReviews);

// Admin: Update review status
reviewRouter.patch("/:reviewId/status", updateReviewStatus);

// Admin: Reply to review
reviewRouter.patch("/:reviewId/reply", replyToReview);

// Admin: Feature/unfeature review for testimonials
reviewRouter.patch("/:reviewId/featured", setReviewFeatured);

// Admin: Delete review
reviewRouter.delete("/:reviewId", deleteReview);

export default reviewRouter;
