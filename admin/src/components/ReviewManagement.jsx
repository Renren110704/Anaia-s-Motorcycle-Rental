import React, { useCallback, useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import axios from "axios";
import {
  FaSearch,
  FaTimes,
  FaStar,
  FaMotorcycle,
  FaChevronDown,
  FaChevronLeft,
  FaChevronRight,
  FaChevronUp,
  FaSort,
  FaTrash,
  FaReply,
  FaCheckCircle,
  FaUser,
  FaEye,
} from "react-icons/fa";
import {
  AlertTriangle,
  MessageSquare,
  XCircle,
  Sparkles,
  Square,
  CheckSquare,
  MinusSquare,
  ListChecks,
} from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import API_BASE_URL from "../apiBase";
import { ADMIN_TOKEN_STORAGE_KEY } from "../constants/adminAuth";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { Accept: "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Shared style tokens ────────────────────────────────────────────────────
const labelCls =
  "block text-[10px] font-bold tracking-[0.12em] text-slate-500 uppercase mb-1.5";

const STATUS_OPTIONS = ["approved", "rejected"];
const ITEMS_PER_PAGE = 10;

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

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// Resolve a profile picture reference (relative path, Cloudinary path, or
// full URL) into a usable <img> src — same convention used in UserManagement.
const makeImageUrl = (filename) => {
  if (!filename) return "";
  const s = String(filename).trim();
  if (!s) return "";
  if (/^data:image\//i.test(s)) return s;
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("/dxta0nmdy/") || s.startsWith("dxta0nmdy/"))
    return `https://res.cloudinary.com/${s.replace(/^\/+/, "")}`;
  const cleanPath = s.replace(/^\/+/, "").replace(/^uploads\//, "");
  return `${API_BASE_URL}/uploads/${cleanPath}`;
};

// GET /api/reviews (getAllReviews) populates `userId` with the renter's
// profilePicture — that's the real source. The extra fallbacks just guard
// against reviews with no linked account (guest bookings, deleted users).
const getRenterProfilePicture = (review) =>
  review.userId?.profilePicture || review.renterProfilePicture || "";

const nextSortState = (cur) =>
  cur === null ? "asc" : cur === "asc" ? "desc" : null;

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
        {detail && <p className="text-slate-500 text-xs mb-6">{detail}</p>}
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

const confirmModal = (message, detail, options = {}) =>
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
        confirmLabel={options.confirmLabel}
        onConfirm={() => cleanup(true)}
        onCancel={() => cleanup(false)}
      />,
    );
  });

// ── Bulk actions ─────────────────────────────────────────────────────────
// Reject and Feature can be applied to any selection. Delete is only ever
// offered when every selected review is already rejected.
const getBulkActionsForSelection = (targets) => {
  if (targets.length === 0) return [];
  const actions = ["reject", "feature"];
  if (targets.every((r) => r.status === "rejected")) actions.push("delete");
  return actions;
};

const BULK_ACTION_CONFIG = {
  reject: {
    label: "Reject",
    icon: XCircle,
    cls: "bg-red-50 text-[#b50002] hover:bg-red-100 border-red-100",
  },
  feature: {
    label: "Feature",
    icon: Sparkles,
    cls: "bg-amber-50 text-amber-600 hover:bg-amber-100 border-amber-100",
  },
  delete: {
    label: "Delete",
    icon: FaTrash,
    cls: "bg-red-50 text-[#b50002] hover:bg-red-100 border-red-100",
  },
};

// ── Accurate fractional star rating ─────────────────────────────────────────
// Renders a background row of empty stars with a foreground row of filled
// stars clipped to a width proportional to the exact rating (e.g. 2.8/5 fills
// 56% of the star row) instead of just rounding to the nearest whole/half
// star. The numeric value is always shown alongside the stars.
// Each star is its own self-contained fill unit: a gray star underneath and
// an amber star clipped to that star's own fraction filled (0-100%). This
// avoids the row-level "clip the whole flex row at X%" approach, whose
// percentage math doesn't line up cleanly with individual star boundaries
// once a flex `gap` is involved — that mismatch was making stars look more
// (or less) filled than the actual rating.
const StarRating = ({ rating, size = 12, showValue = true }) => {
  const numericRating = Math.max(0, Math.min(5, Number(rating) || 0));

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => {
          const starFill = Math.max(0, Math.min(1, numericRating - (i - 1)));
          return (
            <span
              key={i}
              className="relative inline-block"
              style={{ width: size, height: size, lineHeight: 0 }}
            >
              <FaStar
                size={size}
                style={{ display: "block", color: "#e2e8f0" }}
              />
              <span
                className="absolute top-0 left-0 overflow-hidden"
                style={{ width: `${starFill * 100}%`, height: "100%" }}
              >
                <FaStar
                  size={size}
                  style={{ display: "block", color: "#fbbf24" }}
                />
              </span>
            </span>
          );
        })}
      </div>
      {showValue && (
        <span className="text-[11px] font-bold text-slate-500">
          {numericRating > 0 ? numericRating.toFixed(1) : "0.0"}/5.0
        </span>
      )}
    </div>
  );
};

// ── Status badge ───────────────────────────────────────────────────────────
const STATUS_STYLE = {
  pending: "bg-violet-50 text-violet-700 border-violet-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200", // Passes
  rejected: "bg-red-50 text-[#b50002] border-red-200",
};

const StatusBadge = ({ status }) => {
  const cls =
    STATUS_STYLE[status] ?? "bg-slate-50 text-slate-500 border-slate-200";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${cls}`}
    >
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : "Approved"}
    </span>
  );
};

// ── Avatar (profile picture w/ letter fallback) ────────────────────────────
const Avatar = ({ src, name, size = 40 }) => (
  <div
    className="rounded-full overflow-hidden bg-[#b50002]/10 border border-slate-200 flex-shrink-0 flex items-center justify-center"
    style={{ width: size, height: size }}
  >
    {src ? (
      <img
        src={src}
        alt={name || "Reviewer"}
        className="w-full h-full object-cover"
        onError={(e) => {
          e.currentTarget.style.display = "none";
          e.currentTarget.nextSibling.style.display = "flex";
        }}
      />
    ) : null}
    <span
      className="w-full h-full items-center justify-center text-[#b50002] font-black text-sm"
      style={{ display: src ? "none" : "flex" }}
    >
      {(name || "R").charAt(0).toUpperCase() || <FaUser />}
    </span>
  </div>
);

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
      <p className="text-[10px] font-bold tracking-[0.15em] text-slate-500 uppercase">
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

// ── Sort Icon ──────────────────────────────────────────────────────────────
const SortIcon = ({ state }) => {
  if (state === "asc")
    return (
      <FaChevronUp className="text-[#b50002] text-[10px] ml-1 flex-shrink-0" />
    );
  if (state === "desc")
    return (
      <FaChevronDown className="text-[#b50002] text-[10px] ml-1 flex-shrink-0" />
    );
  return <FaSort className="text-slate-300 text-[10px] ml-1 flex-shrink-0" />;
};

// ── Skeleton row ───────────────────────────────────────────────────────────
const SkeletonRow = () => (
  <tr>
    {[...Array(6)].map((_, i) => (
      <td key={i} className="px-5 py-3.5">
        <div
          className="h-4 bg-slate-100 rounded-lg animate-pulse"
          style={{ width: `${45 + i * 6}%` }}
        />
      </td>
    ))}
  </tr>
);

// ── Pagination ─────────────────────────────────────────────────────────────
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - 2 && i <= currentPage + 2)
    )
      pages.push(i);
  }
  const withEllipsis = [];
  let prev = null;
  for (const p of pages) {
    if (prev && p - prev > 1) withEllipsis.push("...");
    withEllipsis.push(p);
    prev = p;
  }
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-xl border border-slate-100 bg-white text-slate-500 disabled:opacity-30 hover:border-[#b50002]/20 hover:text-[#b50002] transition-all shadow-sm"
      >
        <FaChevronLeft className="text-xs" />
      </button>
      {withEllipsis.map((item, idx) =>
        item === "..." ? (
          <span key={`e-${idx}`} className="px-2 text-slate-500 text-sm">
            …
          </span>
        ) : (
          <button
            key={item}
            onClick={() => onPageChange(item)}
            className={`w-9 h-9 rounded-xl font-bold text-sm transition-all shadow-sm
              ${currentPage === item ? "bg-[#b50002] text-white shadow-[#b50002]/30" : "bg-white border border-slate-100 text-slate-500 hover:border-[#b50002]/20 hover:text-[#b50002]"}`}
          >
            {item}
          </button>
        ),
      )}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-xl border border-slate-100 bg-white text-slate-500 disabled:opacity-30 hover:border-[#b50002]/20 hover:text-[#b50002] transition-all shadow-sm"
      >
        <FaChevronRight className="text-xs" />
      </button>
    </div>
  );
};

// ── Empty state ────────────────────────────────────────────────────────────
const EmptyState = ({ onReset }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
      <MessageSquare className="text-slate-200 w-7 h-7" />
    </div>
    <h3 className="font-black text-[#171717] text-sm mb-1">No reviews found</h3>
    <p className="text-slate-500 text-xs mb-4">
      Try adjusting your search or status filter
    </p>
    <button
      onClick={onReset}
      className="px-5 py-2 rounded-xl bg-[#b50002] text-white font-bold text-sm shadow-md shadow-[#b50002]/30 hover:brightness-110 transition-all"
    >
      Clear Search
    </button>
  </div>
);

// ── Review Table ───────────────────────────────────────────────────────────
const ReviewTable = ({
  reviews,
  colSort,
  onColSort,
  onRowClick,
  onDelete,
  selectionMode = false,
  selectedIds,
  onToggleSelectRow,
  onToggleSelectAll,
  allVisibleSelected = false,
  someVisibleSelected = false,
}) => {
  const cols = [
    { label: "Reviewer", key: "renterName", sortable: true },
    { label: "Motorcycle", key: null, sortable: false },
    { label: "Rating", key: "rating", sortable: true },
    { label: "Status", key: "status", sortable: true },
    { label: "Date", key: "createdAt", sortable: true },
    { label: "Actions", key: null, sortable: false },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-50">
              {selectionMode && (
                <th className="px-5 py-3 w-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSelectAll?.();
                    }}
                    title="Select all on this page"
                    className="flex items-center justify-center"
                  >
                    {allVisibleSelected ? (
                      <CheckSquare className="w-4 h-4 text-[#b50002]" />
                    ) : someVisibleSelected ? (
                      <MinusSquare className="w-4 h-4 text-[#b50002]" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-300" />
                    )}
                  </button>
                </th>
              )}
              {cols.map((col) => (
                <th
                  key={col.label}
                  onClick={col.sortable ? () => onColSort(col.key) : undefined}
                  className={`text-left text-[10px] font-black tracking-[0.15em] text-slate-500 uppercase px-5 py-3 whitespace-nowrap
                    ${col.sortable ? "cursor-pointer hover:text-slate-500 transition-colors select-none" : ""}`}
                >
                  <span className="inline-flex items-center">
                    {col.label}
                    {col.sortable && (
                      <SortIcon
                        state={colSort.key === col.key ? colSort.dir : null}
                      />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {reviews.map((review) => {
              const motorcycleName =
                `${review.motorcycleId?.make || review.motorcycleId?.name || ""} ${review.motorcycleId?.model || ""}`.trim();
              return (
                <tr
                  key={review._id}
                  onClick={() => onRowClick(review)}
                  className={`hover:bg-slate-50/60 transition-colors cursor-pointer ${selectionMode && selectedIds?.has(review._id) ? "bg-red-50/40" : ""}`}
                >
                  {selectionMode && (
                    <td
                      className="px-5 py-3.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => onToggleSelectRow?.(review._id)}
                        className="flex items-center justify-center"
                      >
                        {selectedIds?.has(review._id) ? (
                          <CheckSquare className="w-4 h-4 text-[#b50002]" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300" />
                        )}
                      </button>
                    </td>
                  )}
                  {/* Reviewer (avatar + name) */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={makeImageUrl(getRenterProfilePicture(review))}
                        name={review.renterName}
                        size={40}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-black text-[13px] text-[#171717] leading-tight truncate max-w-[160px]">
                            {review.renterName || "Renter"}
                          </p>
                          {review.isFeatured && (
                            <Sparkles className="w-3 h-3 text-amber-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate max-w-[160px]">
                          {review.renterEmail || "No email"}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Motorcycle */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-7 rounded-lg overflow-hidden bg-slate-50 border border-slate-200 flex-shrink-0 flex items-center justify-center">
                        {review.motorcycleId?.image ? (
                          <img
                            src={review.motorcycleId.image}
                            alt={motorcycleName}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <FaMotorcycle className="text-slate-200 text-xs" />
                        )}
                      </div>
                      <p className="text-[12px] font-semibold text-slate-600 truncate max-w-[130px]">
                        {motorcycleName || "—"}
                      </p>
                    </div>
                  </td>

                  {/* Rating */}
                  <td className="px-5 py-3.5">
                    <StarRating rating={review.rating} />
                  </td>

                  {/* Status */}
                  <td className="px-5 py-3.5">
                    <StatusBadge status={review.status} />
                  </td>

                  {/* Date */}
                  <td className="px-5 py-3.5">
                    <p className="text-[13px] text-slate-600 whitespace-nowrap">
                      {formatDate(review.createdAt)}
                    </p>
                  </td>

                  {/* Actions */}
                  <td
                    className="px-5 py-3.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onRowClick(review)}
                        title="View & Manage"
                        className="p-1.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-[#171717] transition-colors"
                      >
                        <FaEye className="w-3.5 h-3.5" />
                      </button>
                      {review.status === "rejected" && (
                        <button
                          onClick={() => onDelete(review)}
                          title="Delete Review"
                          className="p-1.5 rounded-lg bg-red-50 text-[#b50002] hover:bg-red-100 transition-colors"
                        >
                          <FaTrash className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── Review Detail Drawer ────────────────────────────────────────────────────
const ReviewDetailDrawer = ({
  review,
  onClose,
  replyDraft,
  statusDraft,
  replyOpen,
  anySaving,
  isSavingStatus,
  isSavingReply,
  isSavingFeatured,
  isSavingDelete,
  onStatusDraftChange,
  onSetStatus,
  onToggleReply,
  onReplyDraftChange,
  onSaveReply,
  onToggleFeatured,
  onDelete,
  onPreviewImage,
}) => {
  const motorcycleName =
    `${review.motorcycleId?.make || review.motorcycleId?.name || ""} ${review.motorcycleId?.model || ""}`.trim();

  return (
    <div
      className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#f7f8fa] max-h-[90vh] overflow-y-auto shadow-2xl rounded-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between shadow-sm rounded-t-2xl">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar
              src={makeImageUrl(getRenterProfilePicture(review))}
              name={review.renterName}
              size={44}
            />
            <div className="min-w-0">
              <p className="text-[10px] font-bold tracking-[0.15em] text-[#b50002] uppercase mb-0.5">
                Review Detail
              </p>
              <h2 className="font-black text-[#171717] text-base leading-tight truncate">
                {review.renterName || "Renter"}
              </h2>
              <p className="text-[11px] text-slate-500">
                {formatDateTime(review.createdAt)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors flex-shrink-0"
          >
            <FaTimes />
          </button>
        </div>

        <div className="p-5">
          {/* Featured ribbon */}
          {review.isFeatured && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-2 flex items-center gap-2 mb-4">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[11px] font-bold text-amber-700 tracking-wide uppercase">
                Featured in Testimonials
              </span>
            </div>
          )}

          {/* Reviewer + overall rating + status */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div>
              <p className="text-[11px] text-slate-500">
                {review.renterEmail || "No email"}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  Overall
                </span>
                <StarRating rating={review.rating} />
              </div>
              <StatusBadge status={review.status} />
            </div>
          </div>

          {/* Motorcycle info */}
          {review.motorcycleId && (
            <div className="flex items-center gap-3 mb-4 p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
              <div className="w-10 h-9 rounded-lg overflow-hidden bg-slate-50 border border-slate-200 flex-shrink-0">
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
          <div className="mb-4 p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
            <p className={labelCls}>Feedback</p>
            <p className="text-sm text-slate-600 leading-relaxed">
              {review.feedbackDescription || "No feedback description."}
            </p>
          </div>

          {/* Detailed criteria breakdown */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-4 p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Performance
              </span>
              <StarRating rating={review.performance} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Condition
              </span>
              <StarRating rating={review.condition} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Customer Service
              </span>
              <StarRating rating={review.customerService} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Value for Money
              </span>
              <StarRating rating={review.valueForMoney} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Ride Comfort
              </span>
              <StarRating rating={review.rideComfort} />
            </div>
          </div>

          {/* Review images */}
          {Array.isArray(review.reviewImages) &&
            review.reviewImages.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mb-4">
                {review.reviewImages.slice(0, 4).map((img, idx) => (
                  <img
                    key={`${review._id}-img-${idx}`}
                    src={img}
                    alt="Review attachment"
                    className="w-full h-20 object-cover rounded-xl border border-slate-100 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => onPreviewImage(img)}
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
                <p className="text-[10px] text-slate-500 mt-1">
                  {formatDateTime(review.adminRepliedAt)}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Status select */}
              <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                <div className="relative flex-1">
                  <select
                    value={statusDraft}
                    onChange={(e) => onStatusDraftChange(e.target.value)}
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
                  onClick={onSetStatus}
                  disabled={anySaving}
                  className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:brightness-110 transition-all disabled:opacity-60 whitespace-nowrap"
                >
                  {isSavingStatus ? "Saving..." : "Set Status"}
                </button>
              </div>

              {/* Reply toggle */}
              <button
                type="button"
                onClick={onToggleReply}
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
                onClick={() => onToggleFeatured(!review.isFeatured)}
                disabled={anySaving || statusDraft !== "approved"}
                title={
                  statusDraft !== "approved"
                    ? "Approve the review first to feature it"
                    : ""
                }
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all disabled:opacity-50
                  ${
                    review.isFeatured
                      ? "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                      : "border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-700"
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
              {(review.status === "rejected" || statusDraft === "rejected") && (
                <button
                  type="button"
                  onClick={onDelete}
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
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 space-y-2">
                <label className={labelCls}>Admin Reply</label>
                <textarea
                  value={replyDraft}
                  onChange={(e) => onReplyDraftChange(e.target.value)}
                  rows={3}
                  placeholder="Write your response to this review..."
                  disabled={anySaving}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[#171717] text-sm placeholder-slate-300 focus:outline-none focus:border-[#b50002]/30 resize-none"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onSaveReply}
                    disabled={anySaving}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#b50002] text-white font-bold text-xs shadow-md shadow-[#b50002]/30 hover:brightness-110 transition-all disabled:opacity-60"
                  >
                    <FaCheckCircle className="text-[10px]" />
                    {isSavingReply ? "Saving..." : "Save Reply"}
                  </button>
                  <button
                    type="button"
                    onClick={onToggleReply}
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
    </div>
  );
};

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
  const [colSort, setColSort] = useState({ key: null, dir: null });
  const [currentPage, setCurrentPage] = useState(1);

  // Bulk selection
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Drawer + lightbox
  const [drawerReviewId, setDrawerReviewId] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 200 };
      if (activeStatus !== "all") params.status = activeStatus;
      let { data } = await api.get("/api/reviews", { params });
      let rows = Array.isArray(data) ? data : data.reviews || [];

      // ── Auto-Approve Interceptor ───────────────────────────────────────
      const pendingReviews = rows.filter(
        (r) => r.status === "pending" || !r.status,
      );

      if (pendingReviews.length > 0) {
        await Promise.all(
          pendingReviews.map((r) =>
            api.patch(`/api/reviews/${r._id}/status`, { status: "approved" }),
          ),
        );

        const updatedReq = await api.get("/api/reviews", { params });
        rows = Array.isArray(updatedReq.data)
          ? updatedReq.data
          : updatedReq.data.reviews || [];
      }
      // ───────────────────────────────────────────────────────────────────

      setReviews(rows);
      const nextReplies = {};
      const nextStatuses = {};
      rows.forEach((row) => {
        nextReplies[row._id] = row.adminReplyMessage || "";
        nextStatuses[row._id] = row.status || "approved";
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

  // Handle closing lightbox with escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setPreviewImage(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeStatus, colSort]);

  useEffect(() => {
    if (!selectionMode) setSelectedIds(new Set());
  }, [selectionMode]);

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

  const handleColSort = (key) =>
    setColSort((prev) => {
      if (prev.key !== key) return { key, dir: "asc" };
      const next = nextSortState(prev.dir);
      return next === null ? { key: null, dir: null } : { key, dir: next };
    });

  const filteredReviews = useMemo(() => {
    let list = [...reviews];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (r) =>
          (r.renterName || "").toLowerCase().includes(q) ||
          (r.renterEmail || "").toLowerCase().includes(q) ||
          (r.feedbackDescription || "").toLowerCase().includes(q) ||
          `${r.motorcycleId?.make || ""} ${r.motorcycleId?.model || ""}`
            .toLowerCase()
            .includes(q),
      );
    }

    if (colSort.key && colSort.dir) {
      list.sort((a, b) => {
        let aVal = a[colSort.key];
        let bVal = b[colSort.key];

        if (colSort.key === "createdAt") {
          const da = aVal ? new Date(aVal).getTime() : 0;
          const db = bVal ? new Date(bVal).getTime() : 0;
          return colSort.dir === "asc" ? da - db : db - da;
        }

        if (colSort.key === "rating") {
          const na = Number(aVal) || 0;
          const nb = Number(bVal) || 0;
          return colSort.dir === "asc" ? na - nb : nb - na;
        }

        const cmp = String(aVal ?? "").localeCompare(String(bVal ?? ""));
        return colSort.dir === "asc" ? cmp : -cmp;
      });
    } else {
      list.sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return db - da;
      });
    }

    return list;
  }, [reviews, searchTerm, colSort]);

  const totalPages = Math.ceil(filteredReviews.length / ITEMS_PER_PAGE);
  const paginatedReviews = filteredReviews.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const drawerReview = useMemo(
    () => reviews.find((r) => r._id === drawerReviewId) || null,
    [reviews, drawerReviewId],
  );

  // ── Bulk selection helpers ───────────────────────────────────────────────
  const toggleSelectRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const allSelected =
        paginatedReviews.length > 0 &&
        paginatedReviews.every((r) => prev.has(r._id));
      if (allSelected) return new Set();
      return new Set(paginatedReviews.map((r) => r._id));
    });
  };

  const allVisibleSelected =
    paginatedReviews.length > 0 &&
    paginatedReviews.every((r) => selectedIds.has(r._id));
  const someVisibleSelected = paginatedReviews.some((r) =>
    selectedIds.has(r._id),
  );

  const handleBulkAction = async (actionKey) => {
    const config = BULK_ACTION_CONFIG[actionKey];
    const targets = reviews.filter((r) => selectedIds.has(r._id));
    if (!config || targets.length === 0) return;

    if (
      actionKey === "delete" &&
      !targets.every((r) => r.status === "rejected")
    ) {
      toast.error("Only rejected reviews can be deleted.");
      return;
    }

    const plural = targets.length > 1;
    const confirmed = await confirmModal(
      `${config.label} ${targets.length} selected review${plural ? "s" : ""}?`,
      actionKey === "delete"
        ? "This will permanently remove the reviews."
        : "This action will be applied to all of them.",
      { confirmLabel: config.label },
    );
    if (!confirmed) return;

    setBulkProcessing(true);
    try {
      const results = await Promise.allSettled(
        targets.map((review) => {
          switch (actionKey) {
            case "reject":
              return api.patch(`/api/reviews/${review._id}/status`, {
                status: "rejected",
              });
            case "feature":
              return api.patch(`/api/reviews/${review._id}/featured`, {
                isFeatured: true,
              });
            case "delete":
              return api.delete(`/api/reviews/${review._id}`);
            default:
              return Promise.reject(new Error("Unknown action"));
          }
        }),
      );

      const failed = results.filter((r) => r.status === "rejected").length;
      const succeeded = results.length - failed;

      await fetchReviews();
      setSelectedIds(new Set());
      setSelectionMode(false);

      if (failed === 0) {
        toast.success(
          `${succeeded} review${succeeded > 1 ? "s" : ""} updated successfully.`,
        );
      } else {
        toast.error(
          `${succeeded} review${succeeded === 1 ? "" : "s"} updated, ${failed} failed. Please retry the failed review${failed === 1 ? "" : "s"} individually.`,
        );
      }
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleSetStatus = async (reviewId) => {
    const status = statusDrafts[reviewId] || "approved";
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
      if (drawerReviewId === review._id) setDrawerReviewId(null);
      toast.success("Review deleted");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete review");
    } finally {
      setSavingId("");
    }
  };

  const selectedTargets = useMemo(
    () => reviews.filter((r) => selectedIds.has(r._id)),
    [reviews, selectedIds],
  );
  const availableBulkActions = getBulkActionsForSelection(selectedTargets);

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
      subColor: "text-amber-700",
      icon: Sparkles,
      accent: "bg-amber-500",
      status: null,
    },
  ];

  return (
    <main className="min-h-screen bg-[#f7f8fa]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pt-36">
        {/* Header */}
        <div className="mb-7">
          <h1 className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight">
            Review Management
          </h1>
          <p className="text-slate-700 text-sm mt-1">
            Moderate renter feedback and choose which approved reviews appear in
            testimonials. (New reviews are automatically approved).
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
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
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
            <button
              onClick={() => setSelectionMode((prev) => !prev)}
              className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border text-sm font-bold transition-colors ${
                selectionMode
                  ? "bg-[#b50002] border-[#b50002] text-white"
                  : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
            >
              <ListChecks className="w-4 h-4" />
              {selectionMode ? "Cancel Select" : "Select"}
            </button>
          </div>

          {selectionMode && (
            <div className="mt-3 pt-3 border-t border-slate-50 flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={toggleSelectAllVisible}
                disabled={paginatedReviews.length === 0}
                className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-[#171717] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {allVisibleSelected ? (
                  <CheckSquare className="w-4 h-4 text-[#b50002]" />
                ) : someVisibleSelected ? (
                  <MinusSquare className="w-4 h-4 text-[#b50002]" />
                ) : (
                  <Square className="w-4 h-4 text-slate-300" />
                )}
                Select All on this page
              </button>

              {selectedIds.size > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">
                    {selectedIds.size} selected
                  </span>
                  {availableBulkActions.map((actionKey) => {
                    const cfg = BULK_ACTION_CONFIG[actionKey];
                    if (!cfg) return null;
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={actionKey}
                        onClick={() => handleBulkAction(actionKey)}
                        disabled={bulkProcessing}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${cfg.cls}`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {cfg.label}
                      </button>
                    );
                  })}
                  {!availableBulkActions.includes("delete") && (
                    <span className="text-[10px] font-semibold text-slate-300">
                      Delete available once all selected are rejected
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Result count */}
        <div className="flex items-center justify-between px-1 mb-4">
          <p className="text-[11px] text-slate-600 font-semibold">
            Showing{" "}
            {filteredReviews.length === 0
              ? 0
              : Math.min(
                  (currentPage - 1) * ITEMS_PER_PAGE + 1,
                  filteredReviews.length,
                )}
            –{Math.min(currentPage * ITEMS_PER_PAGE, filteredReviews.length)} of{" "}
            <span className="text-[#171717] font-black">
              {filteredReviews.length}
            </span>{" "}
            {activeStatus === "all" ? (
              "reviews"
            ) : (
              <span className="capitalize">{activeStatus} reviews</span>
            )}
            {searchTerm && " (filtered)"}
          </p>
        </div>

        {/* Review table */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full">
              <tbody className="divide-y divide-slate-50">
                {[...Array(5)].map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </tbody>
            </table>
          </div>
        ) : paginatedReviews.length === 0 ? (
          <EmptyState onReset={() => setSearchTerm("")} />
        ) : (
          <ReviewTable
            reviews={paginatedReviews}
            colSort={colSort}
            onColSort={handleColSort}
            onRowClick={(review) => setDrawerReviewId(review._id)}
            onDelete={handleDelete}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            onToggleSelectRow={toggleSelectRow}
            onToggleSelectAll={toggleSelectAllVisible}
            allVisibleSelected={allVisibleSelected}
            someVisibleSelected={someVisibleSelected}
          />
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Detail Drawer */}
      {drawerReview &&
        (() => {
          const reviewId = drawerReview._id;
          const isSavingStatus = savingId === reviewId + "_status";
          const isSavingReply = savingId === reviewId + "_reply";
          const isSavingFeatured = savingId === reviewId + "_featured";
          const isSavingDelete = savingId === reviewId + "_delete";
          const anySaving =
            isSavingStatus ||
            isSavingReply ||
            isSavingFeatured ||
            isSavingDelete;

          return (
            <ReviewDetailDrawer
              review={drawerReview}
              onClose={() => setDrawerReviewId(null)}
              replyDraft={replyDrafts[reviewId] || ""}
              statusDraft={statusDrafts[reviewId] || "approved"}
              replyOpen={!!expandedReply[reviewId]}
              anySaving={anySaving}
              isSavingStatus={isSavingStatus}
              isSavingReply={isSavingReply}
              isSavingFeatured={isSavingFeatured}
              isSavingDelete={isSavingDelete}
              onStatusDraftChange={(value) =>
                setStatusDrafts((prev) => ({ ...prev, [reviewId]: value }))
              }
              onSetStatus={() => handleSetStatus(reviewId)}
              onToggleReply={() =>
                setExpandedReply((prev) => ({
                  ...prev,
                  [reviewId]: !prev[reviewId],
                }))
              }
              onReplyDraftChange={(value) =>
                setReplyDrafts((prev) => ({ ...prev, [reviewId]: value }))
              }
              onSaveReply={() => handleSaveReply(reviewId)}
              onToggleFeatured={(isFeatured) =>
                handleToggleFeatured(reviewId, isFeatured)
              }
              onDelete={() => handleDelete(drawerReview)}
              onPreviewImage={setPreviewImage}
            />
          );
        })()}

      {/* Lightbox Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setPreviewImage(null)}
        >
          <button
            className="absolute top-4 right-6 text-white hover:text-slate-300 transition-colors"
            onClick={() => setPreviewImage(null)}
          >
            <FaTimes className="text-3xl" />
          </button>
          <img
            src={previewImage}
            alt="Full screen preview"
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

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
    </main>
  );
};

export default ReviewManagement;
