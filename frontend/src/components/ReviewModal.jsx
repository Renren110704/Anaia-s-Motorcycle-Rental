import React, { useState, useRef, useMemo } from "react";
import {
  FaStar,
  FaTimes,
  FaImage,
  FaTrash,
  FaSpinner,
  FaCheckCircle,
} from "react-icons/fa";
import axios from "axios";
import API_BASE_URL from "../apiBase";

const API_BASE = API_BASE_URL;

// Reusable StarRating component for categories
const StarRating = ({
  rating,
  hover,
  onRate,
  onHover,
  label,
  question,
  error,
}) => (
  <div
    className={`mb-5 bg-white p-4 rounded-xl border shadow-sm ${
      error ? "border-[#b50002] bg-[#FDF0F0]" : "border-[#171717]/5"
    }`}
  >
    {label && (
      <label className="text-sm font-bold text-[#171717]/80 uppercase tracking-wide block mb-1">
        {label}
      </label>
    )}
    {question && (
      <p className="text-xs text-[#171717]/60 mb-3 italic">{question}</p>
    )}
    <div className="flex items-center gap-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onRate(star)}
          onMouseEnter={() => onHover(star)}
          onMouseLeave={() => onHover(0)}
          className="transform transition-transform hover:scale-125 focus:outline-none"
        >
          <FaStar
            className={`text-2xl ${
              star <= (hover || rating)
                ? "text-[#fbbf24] drop-shadow-lg"
                : "text-[#d1d5db]"
            }`}
          />
        </button>
      ))}
      <span className="ml-3 text-sm font-bold text-[#171717] bg-[#171717]/5 px-2 py-1 rounded-md">
        {rating > 0 ? `${rating}/5` : "Unrated"}
      </span>
    </div>
    {error && (
      <p className="text-xs font-semibold text-[#b50002] mt-2">{error}</p>
    )}
  </div>
);

const ReviewModal = ({ booking, onClose, onSuccess }) => {
  // Categorized Ratings State
  const [ratings, setRatings] = useState({
    performance: 0,
    cleanliness: 0,
    customerService: 0,
    value: 0,
    experience: 0,
  });

  const [hoverRatings, setHoverRatings] = useState({
    performance: 0,
    cleanliness: 0,
    customerService: 0,
    value: 0,
    experience: 0,
  });

  const [feedbackDescription, setFeedbackDescription] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isRenterPublic, setIsRenterPublic] = useState(true);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const fileInputRef = useRef(null);

  const motorcycleName = booking
    ? `${booking.motorcycle?.make || ""} ${booking.motorcycle?.model || ""}`.trim()
    : "Motorcycle";

  // Calculate the overall rating automatically based on the categories
  const overallRating = useMemo(() => {
    const values = Object.values(ratings).filter((val) => val > 0);
    if (values.length === 0) return 0;
    const sum = values.reduce((a, b) => a + b, 0);
    return (sum / values.length).toFixed(1);
  }, [ratings]);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    const maxFiles = 5;
    const remaining = maxFiles - selectedFiles.length;

    if (files.length > remaining) {
      setError(
        `Maximum ${maxFiles} images allowed. You can select ${remaining} more.`,
      );
      return;
    }

    setSelectedFiles((prev) => [...prev, ...files]);
    setError("");

    // Create preview URLs
    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls((prev) => [...prev, ...newPreviews]);
  };

  const removeImage = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const nextFieldErrors = {};
    Object.entries(ratings).forEach(([key, val]) => {
      if (val === 0) nextFieldErrors[key] = "Please provide a rating";
    });
    if (!feedbackDescription.trim()) {
      nextFieldErrors.feedbackDescription =
        "Please provide a feedback description";
    }

    setFieldErrors(nextFieldErrors);

    if (Object.keys(nextFieldErrors).length > 0) {
      setError("Please fill in all required fields before submitting.");
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      // Round the calculated overall rating for the schema requirement
      formData.append("rating", Math.round(overallRating));

      // Map criteria to existing schema endpoints
      formData.append("performance", ratings.performance);
      formData.append("condition", ratings.cleanliness);
      formData.append("customerService", ratings.customerService);
      formData.append("rideComfort", ratings.experience);
      formData.append("valueForMoney", ratings.value);

      formData.append("feedbackDescription", feedbackDescription);
      formData.append("isRenterPublic", isRenterPublic);

      selectedFiles.forEach((file) => {
        formData.append("reviewImages", file);
      });

      const token = localStorage.getItem("token");
      const headers = {
        ...(token && { Authorization: `Bearer ${token}` }),
      };

      await axios.post(`${API_BASE}/api/reviews/${booking._id}`, formData, {
        headers,
      });

      setSubmitted(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);
    } catch (err) {
      console.error("Error submitting review:", err);
      setError(
        err.response?.data?.message ||
          "Error submitting review. Please try again.",
      );
      setSubmitting(false);
    }
  };

  const handleRate = (category, value) => {
    setRatings((prev) => ({ ...prev, [category]: value }));
    setFieldErrors((prev) => {
      if (!(category in prev)) return prev;
      const next = { ...prev };
      delete next[category];
      return next;
    });
  };

  const handleHover = (category, value) => {
    setHoverRatings((prev) => ({ ...prev, [category]: value }));
  };

  const criteriaList = [
    {
      id: "performance",
      label: "Motorcycle Performance",
      question: "How's the performance of the vehicle?",
    },
    {
      id: "cleanliness",
      label: "Cleanliness",
      question: "How clean was the vehicle upon pickup?",
    },
    {
      id: "customerService",
      label: "Customer Service",
      question: "How was the customer service?",
    },
    {
      id: "value",
      label: "Value for Money",
      question: "Did you get good value for your money?",
    },
    {
      id: "experience",
      label: "Overall Experience",
      question: "How's the overall experience?",
    },
  ];

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
        <div className="bg-[#f4f3f3] rounded-3xl shadow-2xl max-w-md w-full p-6 border border-[#171717]/10 text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 mb-4">
            <FaCheckCircle className="h-8 w-8 text-emerald-600" />
          </div>
          <h3 className="text-xl font-bold text-[#171717] mb-2">
            Review Submitted!
          </h3>
          <p className="text-[#171717]/70 mb-4 text-sm">
            Thank you for your transparent feedback.
          </p>
          <div className="text-xs text-[#171717]/50">
            Redirecting in a moment...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#f4f3f3] rounded-3xl shadow-2xl w-full max-w-2xl my-8 border border-[#171717]/10">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#171717]/10">
          <div>
            <h2 className="text-2xl font-bold text-[#171717]">
              Review Your Rental
            </h2>
            <p className="text-sm text-[#171717]/60 mt-1">{motorcycleName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#171717]/10 rounded-lg transition-colors"
            disabled={submitting}
          >
            <FaTimes className="text-[#171717]" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="px-6 py-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto"
        >
          {/* Automatically Calculated Overall Rating Display */}
          <div className="bg-[#171717]/5 rounded-2xl p-6 border border-[#171717]/10 flex flex-col items-center justify-center">
            <span className="text-xs font-black text-[#171717]/60 uppercase tracking-[0.15em] mb-2">
              Calculated Overall Rating
            </span>
            <div className="text-5xl font-black text-[#b50002] drop-shadow-sm">
              {overallRating > 0 ? `${overallRating}` : "0.0"}
              <span className="text-2xl text-[#171717]/30">/5</span>
            </div>
            <p className="text-xs text-[#171717]/50 mt-3 font-medium">
              Based on the average of your criteria ratings below
            </p>
          </div>

          {/* Category Ratings */}
          <div className="border-t border-[#171717]/10 pt-6">
            <p className="text-sm font-bold text-[#171717] uppercase tracking-wide mb-4">
              Rate by Criteria *
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
              {criteriaList.map((criteria) => (
                <StarRating
                  key={criteria.id}
                  rating={ratings[criteria.id]}
                  hover={hoverRatings[criteria.id]}
                  onRate={(val) => handleRate(criteria.id, val)}
                  onHover={(val) => handleHover(criteria.id, val)}
                  label={criteria.label}
                  question={criteria.question}
                  error={fieldErrors[criteria.id]}
                />
              ))}
            </div>
          </div>

          {/* Feedback Description */}
          <div className="border-t border-[#171717]/10 pt-6">
            <label className="text-sm font-bold text-[#171717]/70 uppercase tracking-wide block mb-2">
              Feedback Description *
            </label>
            <textarea
              value={feedbackDescription}
              onChange={(e) => {
                setFeedbackDescription(e.target.value);
                if (fieldErrors.feedbackDescription) {
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.feedbackDescription;
                    return next;
                  });
                }
              }}
              placeholder="Share your detailed feedback about your rental experience..."
              className={`w-full px-4 py-3 rounded-xl border text-sm text-[#171717]
                       focus:outline-none focus:ring-2 focus:ring-[#b50002] focus:border-transparent
                       resize-none ${
                         fieldErrors.feedbackDescription
                           ? "border-[#b50002] bg-[#FDF0F0]"
                           : "border-[#171717]/15 bg-white"
                       }`}
              rows={4}
              maxLength={2000}
            />
            {fieldErrors.feedbackDescription && (
              <p className="text-xs font-semibold text-[#b50002] mt-1.5">
                {fieldErrors.feedbackDescription}
              </p>
            )}
            <p className="text-xs text-[#171717]/50 mt-1">
              {feedbackDescription.length}/2000 characters
            </p>
            <div className="mt-3 flex items-center gap-3">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRenterPublic}
                  onChange={(e) => setIsRenterPublic(e.target.checked)}
                  className="w-4 h-4 rounded text-[#b50002] focus:ring-[#b50002]"
                />
                <span className="text-sm font-medium text-[#171717]">
                  Show my name publicly
                </span>
              </label>
            </div>
          </div>

          {/* Image Upload */}
          <div className="border-t border-[#171717]/10 pt-6">
            <label className="text-sm font-bold text-[#171717]/70 uppercase tracking-wide block mb-2">
              Upload Images (Up to 5)
            </label>
            <div className="border-2 border-dashed border-[#171717]/20 bg-white rounded-xl p-6 text-center hover:border-[#b50002]/40 transition-colors">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 mx-auto px-5 py-2.5 bg-[#171717] text-white text-sm font-bold rounded-lg hover:brightness-110 transition-all"
                disabled={submitting || selectedFiles.length >= 5}
              >
                <FaImage className="text-sm" />
                Choose Images
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={submitting || selectedFiles.length >= 5}
              />
              <p className="text-xs font-medium text-[#171717]/50 mt-3">
                {selectedFiles.length}/5 images selected
              </p>
            </div>

            {/* Image Previews */}
            {previewUrls.length > 0 && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {previewUrls.map((url, index) => (
                  <div
                    key={index}
                    className="relative group rounded-lg overflow-hidden bg-[#171717]/5 border border-[#171717]/10"
                  >
                    <img
                      src={url}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-24 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      disabled={submitting}
                    >
                      <FaTrash className="text-white text-lg drop-shadow-md" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm font-medium text-red-700 flex items-center gap-3">
              <FaTimes className="flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-3 pt-6 border-t border-[#171717]/10">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-4 py-3 bg-[#171717]/10 text-[#171717] text-sm font-bold rounded-xl
                       hover:bg-[#171717]/20 transition-all disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#b50002] text-white text-sm font-bold rounded-xl
                       shadow-lg shadow-[#b50002]/30 hover:brightness-110 disabled:opacity-60 transition-all"
            >
              {submitting && <FaSpinner className="animate-spin text-sm" />}
              {submitting ? "Submitting..." : "Submit Review"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewModal;
