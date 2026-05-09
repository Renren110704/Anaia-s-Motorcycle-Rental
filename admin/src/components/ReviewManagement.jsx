import React, { useCallback, useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import axios from "axios";
import {
  FaSearch,
  FaTimes,
  FaStar,
  FaRegStar,
  FaMotorcycle,
  FaChevronDown,
  FaTrash,
  FaReply,
  FaCheckCircle,
} from "react-icons/fa";
import {
  AlertTriangle,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
} from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import API_BASE_URL from "../apiBase";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { Accept: "application/json" },
});

// ── Shared style tokens ────────────────────────────────────────────────────
const labelCls =
  "block text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase mb-1.5";

const STATUS_OPTIONS = ["pending", "approved", "rejected"];

// ── Helpers ────────────────────────────────────────────────────────────────
const formatDateTime = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

// ── Confirm Modal ──────────────────────────────────────────────────────────
const ConfirmModal = ({
  message,
  detail,
  onConfirm,
  onCancel,
  confirmLabel,
}) => (
  <div
    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
    onClick={onCancel}
  >
    <div
      className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-100"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="text-center">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
          <AlertTriangle className="w-6 h-6 text-[#b50002]" />
        </div>
        <h3 className="text-lg font-black text-[#171717] mb-2">
          Confirm Delete
        </h3>
        <p className="text-slate-500 text-sm mb-2">{message}</p>
        {detail && <p className="text-slate-400 text-xs mb-6">{detail}</p>}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-[#b50002] text-white font-bold text-sm shadow-md shadow-[#b50002]/30 hover:brightness-110 transition-all"
          >
            {confirmLabel ?? "Delete"}
          </button>
        </div>
      </div>
    </div>
  </div>
);

const confirmModal = (message, detail) =>
  new Promise((resolve) => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const root = ReactDOM.createRoot(el);
    const cleanup = (r) => {
      root.unmount();
      document.body.removeChild(el);
      resolve(r);
    };
    root.render(
      <ConfirmModal
        message={message}
        detail={detail}
        onConfirm={() => cleanup(true)}
        onCancel={() => cleanup(false)}
      />,
    );
  });

// ── Stars ──────────────────────────────────────────────────────────────────
const StarRating = ({ rating }) => {
  const value = Math.max(0, Math.min(5, Number(rating || 0)));
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) =>
        i < value ? (
          <FaStar key={i} className="text-amber-400 text-[11px]" />
        ) : (
          <FaRegStar key={i} className="text-slate-200 text-[11px]" />
        ),
      )}
      <span className="text-[11px] font-bold text-slate-400 ml-1">
        {value}/5
      </span>
    </div>
  );
};

// ── Status badge ───────────────────────────────────────────────────────────
const STATUS_STYLE = {
  pending: "bg-violet-50 text-violet-600 border-violet-200",
  approved: "bg-emerald-50 text-emerald-600 border-emerald-200",
  rejected: "bg-red-50 text-[#b50002] border-red-200",
};

const StatusBadge = ({ status }) => {
  const cls =
    STATUS_STYLE[status] ?? "bg-slate-50 text-slate-500 border-slate-200";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${cls}`}
    >
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : "Pending"}
    </span>
  );
};

// ── Stat Card ──────────────────────────────────────────────────────────────
const StatCard = ({
  label,
  value,
  sub,
  subColor,
  icon: Icon,
  accent,
  onClick,
  isActive,
  loading,
}) => (
  <button
    onClick={onClick}
    className={`relative text-left bg-white rounded-2xl border shadow-sm p-5 overflow-hidden group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 w-full
      ${isActive ? "border-[#b50002]/30" : "border-slate-100"}`}
  >
    <div
      className={`absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-10 blur-xl ${accent}`}
    />
    <div className="flex items-start justify-between mb-3">
      <p className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase">
        {label}
      </p>
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent} bg-opacity-10`}
      >
        <Icon className={`w-4 h-4 ${accent.replace("bg-", "text-")}`} />
      </div>
    </div>
    <p className="text-[2.2rem] font-black text-[#171717] leading-none mb-2">
      {loading ? (
        <span className="inline-block w-10 h-7 bg-slate-100 rounded-lg animate-pulse" />
      ) : (
        value
      )}
    </p>
    <p className={`text-[11px] font-semibold ${subColor}`}>{sub}</p>
  </button>
);

// ── Skeleton card ──────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
    <div className="flex items-start justify-between">
      <div className="space-y-2">
        <div className="h-4 bg-slate-100 rounded-lg animate-pulse w-32" />
        <div className="h-3 bg-slate-100 rounded-lg animate-pulse w-48" />
      </div>
      <div className="h-4 bg-slate-100 rounded-lg animate-pulse w-20" />
    </div>
    <div className="h-3 bg-slate-100 rounded-lg animate-pulse w-full" />
    <div className="h-3 bg-slate-100 rounded-lg animate-pulse w-3/4" />
  </div>
);

// ── Main Component ─────────────────────────────────────────────────────────
const ReviewManagement = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [replyDrafts, setReplyDrafts] = useState({});
  const [statusDrafts, setStatusDrafts] = useState({});
  const [expandedReply, setExpandedReply] = useState({});

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 200 };
      if (activeStatus !== "all") params.status = activeStatus;
      const { data } = await api.get("/api/reviews", { params });
      const rows = Array.isArray(data) ? data : data.reviews || [];
      setReviews(rows);
      const nextReplies = {};
      const nextStatuses = {};
      rows.forEach((row) => {
        nextReplies[row._id] = row.adminReplyMessage || "";
        nextStatuses[row._id] = row.status || "pending";
      });
      setReplyDrafts(nextReplies);
      setStatusDrafts(nextStatuses);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, [activeStatus]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const counts = useMemo(() => {
    const result = {
      all: reviews.length,
      pending: 0,
      approved: 0,
      rejected: 0,
      featured: 0,
    };
    reviews.forEach((r) => {
      if (r.status === "pending") result.pending += 1;
      if (r.status === "approved") result.approved += 1;
      if (r.status === "rejected") result.rejected += 1;
      if (r.isFeatured) result.featured += 1;
    });
    return result;
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    if (!searchTerm.trim()) return reviews;
    const q = searchTerm.toLowerCase();
    return reviews.filter(
      (r) =>
        (r.renterName || "").toLowerCase().includes(q) ||
        (r.renterEmail || "").toLowerCase().includes(q) ||
        (r.feedbackDescription || "").toLowerCase().includes(q) ||
        `${r.motorcycleId?.make || ""} ${r.motorcycleId?.model || ""}`
          .toLowerCase()
          .includes(q),
    );
  }, [reviews, searchTerm]);

  const handleSetStatus = async (reviewId) => {
    const status = statusDrafts[reviewId] || "pending";
    setSavingId(reviewId + "_status");
    try {
      await api.patch(`/api/reviews/${reviewId}/status`, { status });
      await fetchReviews();
      toast.success("Status updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update status");
    } finally {
      setSavingId("");
    }
  };

  const handleSaveReply = async (reviewId) => {
    const adminReplyMessage = String(replyDrafts[reviewId] || "").trim();
    if (!adminReplyMessage) {
      toast.error("Reply message cannot be empty");
      return;
    }
    setSavingId(reviewId + "_reply");
    try {
      await api.patch(`/api/reviews/${reviewId}/reply`, {
        adminReplyMessage,
        adminRepliedBy: "Admin",
      });
      await fetchReviews();
      toast.success("Reply saved");
      setExpandedReply((prev) => ({ ...prev, [reviewId]: false }));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save reply");
    } finally {
      setSavingId("");
    }
  };

  const handleToggleFeatured = async (reviewId, isFeatured) => {
    setSavingId(reviewId + "_featured");
    try {
      await api.patch(`/api/reviews/${reviewId}/featured`, { isFeatured });
      await fetchReviews();
      toast.success(
        isFeatured ? "Added to testimonials" : "Removed from testimonials",
      );
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update");
    } finally {
      setSavingId("");
    }
  };

  const handleDelete = async (review) => {
    const motorcycleName =
      `${review.motorcycleId?.make || ""} ${review.motorcycleId?.model || ""}`.trim();
    const confirmed = await confirmModal(
      "This will permanently remove the review.",
      `Reviewer: ${review.renterName || "Renter"}${motorcycleName ? ` · ${motorcycleName}` : ""}`,
    );
    if (!confirmed) return;
    setSavingId(review._id + "_delete");
    try {
      await api.delete(`/api/reviews/${review._id}`);
      await fetchReviews();
      toast.success("Review deleted");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete review");
    } finally {
      setSavingId("");
    }
  };

  const statCards = [
    {
      label: "All Reviews",
      value: counts.all,
      sub: "Total submitted",
      subColor: "text-slate-500",
      icon: MessageSquare,
      accent: "bg-slate-500",
      status: "all",
    },
    {
      label: "Pending",
      value: counts.pending,
      sub: "Awaiting review",
      subColor: "text-violet-500",
      icon: Clock,
      accent: "bg-violet-500",
      status: "pending",
    },
    {
      label: "Approved",
      value: counts.approved,
      sub: "Published reviews",
      subColor: "text-emerald-500",
      icon: CheckCircle2,
      accent: "bg-emerald-500",
      status: "approved",
    },
    {
      label: "Rejected",
      value: counts.rejected,
      sub: "Hidden from public",
      subColor: "text-[#b50002]",
      icon: XCircle,
      accent: "bg-red-500",
      status: "rejected",
    },
    {
      label: "Featured",
      value: counts.featured,
      sub: "In testimonials",
      subColor: "text-amber-500",
      icon: Sparkles,
      accent: "bg-amber-500",
      status: null, // non-filterable
    },
  ];

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pt-36">
        {/* Header */}
        <div className="mb-7">
          <h1 className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight">
            Review Management
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Moderate renter feedback and choose which approved reviews appear in
            testimonials.
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 sm:gap-4 mb-6">
          {statCards.map((s) => (
            <StatCard
              key={s.label}
              {...s}
              loading={loading}
              isActive={s.status !== null && activeStatus === s.status}
              onClick={() => s.status !== null && setActiveStatus(s.status)}
            />
          ))}
        </div>

        {/* Search toolbar */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-4">
          <div className="relative">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 text-sm" />
            <input
              type="text"
              placeholder="Search reviewer, motorcycle, or feedback..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 text-sm text-[#171717] placeholder-slate-300 focus:outline-none focus:border-[#b50002]/30"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
              >
                <FaTimes className="text-sm" />
              </button>
            )}
          </div>
        </div>

        {/* Result count */}
        <div className="flex items-center px-1 mb-4">
          <p className="text-[11px] text-slate-400 font-semibold">
            Showing{" "}
            <span className="text-[#171717] font-black">
              {filteredReviews.length}
            </span>{" "}
            {activeStatus === "all" ? (
              ""
            ) : (
              <span className="capitalize">{activeStatus}</span>
            )}{" "}
            review{filteredReviews.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Review cards */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="text-slate-200 w-7 h-7" />
            </div>
            <h3 className="font-black text-[#171717] text-sm mb-1">
              No reviews found
            </h3>
            <p className="text-slate-400 text-xs">
              Try adjusting your search or status filter
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReviews.map((review) => {
              const isSavingStatus = savingId === review._id + "_status";
              const isSavingReply = savingId === review._id + "_reply";
              const isSavingFeatured = savingId === review._id + "_featured";
              const isSavingDelete = savingId === review._id + "_delete";
              const anySaving =
                isSavingStatus ||
                isSavingReply ||
                isSavingFeatured ||
                isSavingDelete;
              const replyDraft = replyDrafts[review._id] || "";
              const statusDraft = statusDrafts[review._id] || "pending";
              const replyOpen = expandedReply[review._id];
              const motorcycleName =
                `${review.motorcycleId?.make || review.motorcycleId?.name || ""} ${review.motorcycleId?.model || ""}`.trim();

              return (
                <div
                  key={review._id}
                  className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all duration-200
                    ${review.isFeatured ? "border-amber-200" : "border-slate-100"}`}
                >
                  {/* Featured ribbon */}
                  {review.isFeatured && (
                    <div className="bg-amber-50 border-b border-amber-100 px-5 py-2 flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-[11px] font-bold text-amber-600 tracking-wide uppercase">
                        Featured in Testimonials
                      </span>
                    </div>
                  )}

                  <div className="p-5">
                    {/* Top row: reviewer + rating + status */}
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-xl bg-[#b50002]/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-[#b50002] font-black text-sm">
                            {(review.renterName || "R").charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-black text-[14px] text-[#171717] leading-tight">
                            {review.renterName || "Renter"}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {review.renterEmail || "No email"}
                          </p>
                          <p className="text-[10px] text-slate-300 mt-0.5">
                            {formatDateTime(review.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <StarRating rating={review.rating} />
                        <StatusBadge status={review.status} />
                      </div>
                    </div>

                    {/* Motorcycle info */}
                    {review.motorcycleId && (
                      <div className="flex items-center gap-3 mb-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="w-10 h-9 rounded-lg overflow-hidden bg-white border border-slate-200 flex-shrink-0">
                          {review.motorcycleId.image ? (
                            <img
                              src={review.motorcycleId.image}
                              alt={motorcycleName}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <FaMotorcycle className="text-slate-200 text-sm" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-black text-[12px] text-[#171717] leading-tight">
                            {motorcycleName || "Motorcycle"}
                          </p>
                          {review.motorcycleId.unitId && (
                            <span className="text-[10px] font-bold text-[#b50002] tracking-wider uppercase">
                              {review.motorcycleId.unitId}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Feedback text */}
                    <p className="text-sm text-slate-600 leading-relaxed mb-4">
                      {review.feedbackDescription || "No feedback description."}
                    </p>

                    {/* Review images */}
                    {Array.isArray(review.reviewImages) &&
                      review.reviewImages.length > 0 && (
                        <div className="grid grid-cols-4 gap-2 mb-4">
                          {review.reviewImages.slice(0, 4).map((img, idx) => (
                            <img
                              key={`${review._id}-img-${idx}`}
                              src={img}
                              alt="Review attachment"
                              className="w-full h-20 object-cover rounded-xl border border-slate-100"
                            />
                          ))}
                        </div>
                      )}

                    {/* Existing admin reply */}
                    {review.adminReplyMessage && (
                      <div className="mb-4 p-3 bg-[#b50002]/5 rounded-xl border border-[#b50002]/10">
                        <p className="text-[10px] font-bold tracking-[0.15em] text-[#b50002] uppercase mb-1">
                          Admin Reply
                        </p>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {review.adminReplyMessage}
                        </p>
                        {review.adminRepliedAt && (
                          <p className="text-[10px] text-slate-400 mt-1">
                            {formatDateTime(review.adminRepliedAt)}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Actions row */}
                    <div className="pt-4 border-t border-slate-50 space-y-3">
                      {/* Status + Featured row */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Status select */}
                        <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                          <div className="relative flex-1">
                            <select
                              value={statusDraft}
                              onChange={(e) =>
                                setStatusDrafts((prev) => ({
                                  ...prev,
                                  [review._id]: e.target.value,
                                }))
                              }
                              disabled={anySaving}
                              className="w-full appearance-none px-3 py-2 rounded-xl border border-slate-200 bg-white text-[#171717] text-xs font-bold focus:outline-none focus:border-[#b50002]/30 pr-7"
                            >
                              {STATUS_OPTIONS.map((s) => (
                                <option key={s} value={s}>
                                  {s.charAt(0).toUpperCase() + s.slice(1)}
                                </option>
                              ))}
                            </select>
                            <FaChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 text-[9px] pointer-events-none" />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSetStatus(review._id)}
                            disabled={anySaving}
                            className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:brightness-110 transition-all disabled:opacity-60 whitespace-nowrap"
                          >
                            {isSavingStatus ? "Saving..." : "Set Status"}
                          </button>
                        </div>

                        {/* Reply toggle */}
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedReply((prev) => ({
                              ...prev,
                              [review._id]: !prev[review._id],
                            }))
                          }
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all
                            ${
                              replyOpen
                                ? "bg-[#b50002] border-[#b50002] text-white shadow-sm shadow-[#b50002]/30"
                                : "border-slate-200 text-slate-500 hover:border-[#b50002]/20 hover:text-[#b50002]"
                            }`}
                        >
                          <FaReply className="text-[10px]" />
                          {review.adminReplyMessage ? "Edit Reply" : "Reply"}
                        </button>

                        {/* Featured toggle */}
                        <button
                          type="button"
                          onClick={() =>
                            handleToggleFeatured(review._id, !review.isFeatured)
                          }
                          disabled={anySaving || statusDraft !== "approved"}
                          title={
                            statusDraft !== "approved"
                              ? "Approve the review first to feature it"
                              : ""
                          }
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all disabled:opacity-50
                            ${
                              review.isFeatured
                                ? "bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100"
                                : "border-slate-200 text-slate-500 hover:border-amber-200 hover:text-amber-600"
                            }`}
                        >
                          <Sparkles className="w-3 h-3" />
                          {isSavingFeatured
                            ? "..."
                            : review.isFeatured
                              ? "Unfeature"
                              : "Feature"}
                        </button>

                        {/* Delete (rejected only) */}
                        {(review.status === "rejected" ||
                          statusDraft === "rejected") && (
                          <button
                            type="button"
                            onClick={() => handleDelete(review)}
                            disabled={anySaving}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 text-[#b50002] border border-red-200 text-xs font-bold hover:bg-red-100 transition-colors disabled:opacity-60"
                          >
                            <FaTrash className="text-[10px]" />
                            {isSavingDelete ? "Deleting..." : "Delete"}
                          </button>
                        )}
                      </div>

                      {/* Reply textarea (collapsible) */}
                      {replyOpen && (
                        <div className="bg-slate-50 rounded-xl border border-slate-100 p-3 space-y-2">
                          <label className={labelCls}>Admin Reply</label>
                          <textarea
                            value={replyDraft}
                            onChange={(e) =>
                              setReplyDrafts((prev) => ({
                                ...prev,
                                [review._id]: e.target.value,
                              }))
                            }
                            rows={3}
                            placeholder="Write your response to this review..."
                            disabled={anySaving}
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[#171717] text-sm placeholder-slate-300 focus:outline-none focus:border-[#b50002]/30 resize-none"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleSaveReply(review._id)}
                              disabled={anySaving}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#b50002] text-white font-bold text-xs shadow-md shadow-[#b50002]/30 hover:brightness-110 transition-all disabled:opacity-60"
                            >
                              <FaCheckCircle className="text-[10px]" />
                              {isSavingReply ? "Saving..." : "Save Reply"}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedReply((prev) => ({
                                  ...prev,
                                  [review._id]: false,
                                }))
                              }
                              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        theme="light"
        icon={false}
      />
    </div>
  );
};

export default ReviewManagement;
