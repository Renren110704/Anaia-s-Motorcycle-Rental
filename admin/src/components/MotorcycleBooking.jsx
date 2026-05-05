import React, { useEffect, useState, useCallback, useMemo } from "react";
import ReactDOM from "react-dom/client";
import axios from "axios";
import API_BASE_URL from "../apiBase";
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaChevronDown,
  FaChevronLeft,
  FaChevronRight,
  FaChevronUp,
  FaClock,
  FaCog,
  FaCreditCard,
  FaEdit,
  FaEnvelope,
  FaExclamationTriangle,
  FaGasPump,
  FaHardHat,
  FaIdBadge,
  FaInfoCircle,
  FaMapMarkerAlt,
  FaPhone,
  FaReceipt,
  FaSearch,
  FaShieldAlt,
  FaSort,
  FaTimes,
  FaUser,
  FaTrash,
  FaTrashRestore,
  FaMoneyBillWave,
  FaBan,
  FaUpload,
} from "react-icons/fa";

const baseURL = API_BASE_URL;
const api = axios.create({ baseURL, headers: { Accept: "application/json" } });

const ITEMS_PER_PAGE = 10;

// ── Helpers ───────────────────────────────────────────────────────────────────
const nextSortState = (cur) =>
  cur === null ? "asc" : cur === "asc" ? "desc" : null;

const formatTime = (timeStr) => {
  if (!timeStr) return null;
  const [hourStr, minStr] = timeStr.split(":");
  const hour = parseInt(hourStr, 10);
  const min = minStr || "00";
  if (isNaN(hour)) return timeStr;
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${min} ${period}`;
};

// ── Modal helpers ─────────────────────────────────────────────────────────────
const ModalShell = ({ onBackdropClick, children }) => (
  <div
    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
    onClick={onBackdropClick}
  >
    <div
      className="bg-[#f4f3f3] rounded-3xl shadow-2xl max-w-md w-full p-6 border border-[#171717]/10"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  </div>
);

const ConfirmModal = ({
  message,
  onConfirm,
  onCancel,
  isPermanent,
  confirmLabel,
}) => (
  <ModalShell onBackdropClick={onCancel}>
    <div className="text-center">
      <div className="mx-auto flex items-center justify-center h-16 w-16">
        <FaExclamationTriangle
          className={`h-8 w-8 ${isPermanent ? "text-[#b50002]" : "text-[#b50002]"}`}
        />
      </div>
      <h3 className="text-xl font-bold text-[#171717] mb-2">
        {isPermanent ? "Permanent Action" : "Confirm Action"}
      </h3>
      <p className="text-[#171717] mb-6">{message}</p>
      <div className="flex space-x-3">
        <button
          onClick={onCancel}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#b50002] text-white font-bold text-sm rounded-xl
                    shadow-lg shadow-[#b50002]/30 hover:brightness-110 hover:scale-[1.01] active:scale-[0.98] transition-all duration-200"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#171717] text-white font-bold text-sm rounded-xl
                    shadow-lg shadow-[#171717]/30 hover:brightness-110 hover:scale-[1.01] active:scale-[0.98] transition-all duration-200"
        >
          {confirmLabel ?? (isPermanent ? "Reject Forever" : "Confirm")}
        </button>
      </div>
    </div>
  </ModalShell>
);

const AlertModal = ({ message, onClose, isError }) => (
  <ModalShell onBackdropClick={onClose}>
    <div className="text-center">
      <div className="mx-auto flex items-center justify-center h-16 w-16">
        {isError ? (
          <FaExclamationTriangle className="h-8 w-8 text-[#b50002]" />
        ) : (
          <FaCheckCircle className="h-8 w-8 text-green-500" />
        )}
      </div>
      <h3 className="text-xl font-bold text-[#171717] mb-2">
        {isError ? "Error" : "Notice"}
      </h3>
      <p className="text-[#171717] mb-6">{message}</p>
      <button
        onClick={onClose}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#171717] text-white font-bold text-sm rounded-xl
                    shadow-lg shadow-[#171717]/30 hover:brightness-110 hover:scale-[1.01] active:scale-[0.98] transition-all duration-200"
      >
        OK
      </button>
    </div>
  </ModalShell>
);

const ReuploadCommentModal = ({
  defaultValue,
  onCancel,
  onSubmit,
  submitting,
}) => {
  const [comment, setComment] = useState(defaultValue || "");

  return (
    <ModalShell onBackdropClick={onCancel}>
      <h3 className="text-xl font-bold text-[#171717] mb-2">
        Request Proof Re-upload
      </h3>
      <p className="text-sm text-[#171717]/70 mb-3">
        Enter a clear reason so the renter knows what to fix.
      </p>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={4}
        className="w-full bg-[#c7c5c5] text-sm px-3 py-2 rounded-lg mb-4 focus:outline-none focus:ring-1 focus:ring-[#171717] text-[#171717] resize-none"
        placeholder="Please re-upload a clearer payment receipt."
      />
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#b50002] text-white font-bold text-sm rounded-xl
                    shadow-lg shadow-[#b50002]/30 hover:brightness-110 hover:scale-[1.01] active:scale-[0.98] transition-all duration-200 disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          onClick={() => onSubmit(comment)}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#171717] text-white font-bold text-sm rounded-xl
                    shadow-lg shadow-[#171717]/30 hover:brightness-110 hover:scale-[1.01] active:scale-[0.98] transition-all duration-200 disabled:opacity-60"
        >
          {submitting ? "Sending..." : "Send Request"}
        </button>
      </div>
    </ModalShell>
  );
};

const confirmModal = (message, { isPermanent = false, confirmLabel } = {}) =>
  new Promise((resolve) => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);
    const cleanup = (r) => {
      root.unmount();
      document.body.removeChild(container);
      resolve(r);
    };
    root.render(
      <ConfirmModal
        message={message}
        isPermanent={isPermanent}
        confirmLabel={confirmLabel}
        onConfirm={() => cleanup(true)}
        onCancel={() => cleanup(false)}
      />,
    );
  });

const alertModal = (message, { isError = false } = {}) =>
  new Promise((resolve) => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);
    const cleanup = () => {
      root.unmount();
      document.body.removeChild(container);
      resolve();
    };
    root.render(
      <AlertModal message={message} isError={isError} onClose={cleanup} />,
    );
  });

// ── Utilities ─────────────────────────────────────────────────────────────────
// Date only — used for pickup / return columns
const formatDate = (s) => {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d)) return "—";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

// Date + time — used for "Booked on" so the exact timestamp is visible
const formatDateTime = (s) => {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d)) return "—";
  const date = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  const hour = d.getHours();
  const min = String(d.getMinutes()).padStart(2, "0");
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${date} · ${displayHour}:${min} ${period}`;
};

const makeImageUrl = (filename) => {
  if (!filename) return "";
  const s = String(filename).trim();
  if (!s) return "";
  if (/^data:image\//i.test(s)) return s;
  if (/^https?:\/\//i.test(s)) return s; // Cloudinary full URLs pass through here ✅
  // Handle Cloudinary partial URLs
  if (s.startsWith('/dxta0nmdy/') || s.startsWith('dxta0nmdy/')) {
    return `https://res.cloudinary.com/${s.replace(/^\/+/, '')}`;
  }
  // For local fallback paths, use API_BASE_URL (same as client)
  const cleanPath = s.replace(/^\/+/, "").replace(/^uploads\//, "");
  return `${API_BASE_URL}/uploads/${cleanPath}`;
};

const normalizeDetails = (d = {}, motorcycle = {}) => ({
  // Spec fields: prefer details object, then fall back to motorcycle snapshot.
  // motorcycleInfo uses key "fuel" (mapped from fuelType), so check both.
  fuel: d.fuelType || d.fuel || motorcycle.fuel || motorcycle.fuelType || "",
  engineSize: d.engineSize ?? motorcycle.engineSize ?? "",
  transmission: d.transmission || motorcycle.transmission || "",
  hasABS: d.hasABS ?? motorcycle.hasABS ?? false,
  // Fee fields — stored in details by the booking form
  distanceFee: d.distanceFee != null ? Number(d.distanceFee) : null,
  distanceTierLabel: d.distanceTierLabel ?? "",
  helmetRequested: !!d.helmetRequested,
  helmetFee: d.helmetFee != null ? Number(d.helmetFee) : null,
  destinationCity: d.destinationCity ?? "",
});

const extractMotorcycleInfo = (b) => {
  const snap =
    b.motorcycleSnapshot &&
    typeof b.motorcycleSnapshot === "object" &&
    Object.keys(b.motorcycleSnapshot).length
      ? b.motorcycleSnapshot
      : null;
  const motorcycle =
    snap ||
    (b.motorcycle && typeof b.motorcycle === "object" ? b.motorcycle : null);
  if (motorcycle)
    return {
      title:
        `${motorcycle.make || ""} ${motorcycle.model || ""}`.trim() ||
        motorcycle.make ||
        motorcycle.model ||
        "",
      make: motorcycle.make || "",
      model: motorcycle.model || "",
      year: motorcycle.year ?? "",
      dailyRate: motorcycle.dailyRate ?? 0,
      transmission: motorcycle.transmission ?? "",
      fuel: motorcycle.fuelType ?? motorcycle.fuel ?? "",
      engineSize: motorcycle.engineSize ?? "",
      hasABS: motorcycle.hasABS || false,
      unitId: motorcycle.unitId || "",
      image: motorcycle.image || b.motorcycleImage || b.image || "",
    };
  return typeof b.motorcycle === "string"
    ? {
        title: b.motorcycle,
        unitId: "",
        image: b.motorcycleImage || b.image || "",
      }
    : {
        title: b.motorcycleName || b.vehicle || "",
        unitId: "",
        image: b.motorcycleImage || b.image || "",
      };
};

const buildFullAddress = (address = {}) => {
  const parts = [
    address.barangay,
    address.city,
    address.state,
    address.region,
    address.zipCode,
  ].filter(Boolean);
  if (parts.length === 0) {
    const legacy = [
      address.street,
      address.city,
      address.state,
      address.zipCode,
    ].filter(Boolean);
    return legacy.join(", ") || "—";
  }
  return parts.join(", ");
};

const paymentLabel = (ps) => {
  if (ps === "fully_paid") return "Fully Paid";
  if (ps === "reservation_paid") return "Pending Full Payment";
  if (ps === "pending_verification") return "Pending Reservation";
  return "Pending";
};

// ── Stat Tab ──────────────────────────────────────────────────────────────────
const StatTab = ({
  title,
  value,
  icon: Icon,
  isActive,
  onClick,
  accentColor,
  subtitle,
}) => (
  <button
    onClick={onClick}
    className={`
      flex-1 min-w-[130px] flex items-center justify-between px-5 py-4 rounded-2xl
      transition-all duration-200 cursor-pointer shadow-lg shadow-black/20
      ${
        isActive
          ? "bg-[#171717] scale-[1.02] shadow-xl shadow-black/30"
          : "bg-[#b9b9b9] hover:bg-[#a8a8a8] hover:scale-[1.01]"
      }
    `}
  >
    <div className="text-left">
      <p
        className={`text-xs font-bold uppercase tracking-widest mb-1 ${isActive ? "text-[#b9b9b9]" : "text-[#171717]/60"}`}
      >
        {title}
      </p>
      <p
        className={`text-2xl font-bold ${isActive ? "text-white" : "text-[#171717]"}`}
      >
        {value}
      </p>
      {subtitle && (
        <p
          className={`text-xs mt-0.5 font-semibold ${isActive ? "text-[#b9b9b9]/70" : "text-[#171717]/50"}`}
        >
          {subtitle}
        </p>
      )}
    </div>
    <div
      className={`p-3 rounded-xl ${isActive ? "bg-white/10" : "bg-[#171717]/5"}`}
    >
      <Icon
        className={`text-2xl ${isActive ? accentColor || "text-white" : "text-[#171717]"}`}
      />
    </div>
  </button>
);

// ── Sort icon ─────────────────────────────────────────────────────────────────
const SortIcon = ({ state }) => {
  if (state === "asc")
    return (
      <FaChevronUp className="text-[#b50002] text-xs ml-1 flex-shrink-0" />
    );
  if (state === "desc")
    return (
      <FaChevronDown className="text-[#b50002] text-xs ml-1 flex-shrink-0" />
    );
  return <FaSort className="text-[#b9b9b9]/40 text-xs ml-1 flex-shrink-0" />;
};

// ── Pagination ────────────────────────────────────────────────────────────────
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  const pages = [];
  const delta = 2;
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - delta && i <= currentPage + delta)
    )
      pages.push(i);
  }
  const withEllipsis = [];
  let prev = null;
  for (const page of pages) {
    if (prev && page - prev > 1) withEllipsis.push("...");
    withEllipsis.push(page);
    prev = page;
  }
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-lg bg-[#b9b9b9] text-[#171717] disabled:opacity-40 hover:bg-[#a0a0a0] transition-colors shadow-lg shadow-black/20"
      >
        <FaChevronLeft />
      </button>
      {withEllipsis.map((item, idx) =>
        item === "..." ? (
          <span key={`e-${idx}`} className="px-2 text-[#171717]">
            …
          </span>
        ) : (
          <button
            key={item}
            onClick={() => onPageChange(item)}
            className={`w-9 h-9 rounded-lg font-semibold text-sm transition-all shadow-lg shadow-black/20 ${currentPage === item ? "bg-[#b50002] text-white scale-105" : "bg-[#b9b9b9] text-[#171717] hover:bg-[#a0a0a0]"}`}
          >
            {item}
          </button>
        ),
      )}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-lg bg-[#b9b9b9] text-[#171717] disabled:opacity-40 hover:bg-[#a0a0a0] transition-colors shadow-lg shadow-black/20"
      >
        <FaChevronRight />
      </button>
    </div>
  );
};

// ── Status badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status, isDeleted }) => {
  if (isDeleted)
    return (
      <span className="inline-flex px-3 py-1 rounded-full text-sm font-semibold bg-red-900/30 text-red-800 border border-red-800/40">
        Rejected
      </span>
    );
  const map = {
    pending_reservation:
      "bg-yellow-900/30 text-yellow-800 border border-yellow-800/30",
    pending_full_payment:
      "bg-orange-900/30 text-orange-800 border border-orange-800/30",
    pending: "bg-yellow-900/30 text-yellow-800 border border-yellow-800/30",
    active: "bg-blue-900/30 text-blue-800 border border-blue-800/30",
    completed: "bg-green-900/30 text-green-800 border border-green-800/30",
    cancelled: "bg-red-900/30 text-red-800 border border-red-800/30",
  };
  const cls =
    map[status] || "bg-gray-700/30 text-gray-700 border border-gray-600/30";
  return (
    <span
      className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold  ${cls}`}
    >
      {(status === "pending_reservation" && "Pending Reservation") ||
        (status === "pending_full_payment" && "Pending Full Payment") ||
        String(status || "unknown")
          .charAt(0)
          .toUpperCase() + String(status || "unknown").slice(1)}
    </span>
  );
};

// ── Payment badge ─────────────────────────────────────────────────────────────
const PaymentBadge = ({ paymentStatus }) => {
  const map = {
    fully_paid: "bg-green-900/30 text-green-800 border border-green-800/30",
    reservation_paid:
      "bg-orange-900/30 text-orange-800 border border-orange-800/30",
    pending_verification:
      "bg-yellow-900/30 text-yellow-800 border border-yellow-800/30",
    pending: "bg-gray-700/30 text-gray-700 border border-gray-600/30",
  };
  const cls = map[paymentStatus] || map.pending;
  return (
    <span
      className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${cls}`}
    >
      {paymentLabel(paymentStatus)}
    </span>
  );
};

const getAllowedNextStatuses = (currentStatus) => {
  switch (currentStatus) {
    case "pending_reservation":
    case "pending_full_payment":
      return ["cancelled"];
    case "active":
      return ["completed"];
    default:
      return [];
  }
};

// ── Detail Drawer ─────────────────────────────────────────────────────────────
const DetailDrawer = ({
  booking,
  onClose,
  onEditStatus,
  onDelete,
  onRestore,
  onConfirmPayment,
  onRequestReupload,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newStatus, setNewStatus] = useState(booking.status);
  const details = booking.details || {};
  const isEditLocked = ["completed", "cancelled"].includes(booking.status);
  const allowedStatusOptions = getAllowedNextStatuses(booking.status);

  // Compute base rental for fee breakdown
  const dailyRate = booking.dailyRate || 0;
  const pickupDate = booking.pickupDate ? new Date(booking.pickupDate) : null;
  const returnDate = booking.returnDate ? new Date(booking.returnDate) : null;
  const days =
    pickupDate && returnDate
      ? Math.max(
          1,
          Math.ceil((returnDate - pickupDate) / (1000 * 60 * 60 * 24)),
        )
      : 1;
  const baseRental = dailyRate * days;

  // Use stored detail values; fall back to deriving from total amount
  const reservationFee = booking.reservationFee || 200;
  const storedDistanceFee = details.distanceFee;
  const storedHelmetFee = details.helmetFee;
  const helmetRequested = details.helmetRequested;

  // If details are missing but amount > baseRental + reservationFee, derive the extra
  const knownExtras =
    (storedDistanceFee != null ? storedDistanceFee : 0) +
    (helmetRequested && storedHelmetFee != null ? storedHelmetFee : 0);
  const derivedExtra = Math.max(
    0,
    (booking.amount || 0) - baseRental - reservationFee - knownExtras,
  );

  // Final resolved fees to display
  const distanceFee =
    storedDistanceFee != null
      ? storedDistanceFee
      : derivedExtra > 0
        ? derivedExtra
        : 0;
  const helmetFee =
    storedHelmetFee != null ? storedHelmetFee : helmetRequested ? 100 : 0;

  const handleSave = async () => {
    if (!allowedStatusOptions.includes(newStatus)) {
      return;
    }
    await onEditStatus(booking.id, newStatus);
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-[9990] flex" onClick={onClose}>
      <div className="flex-1 bg-black/50 backdrop-blur-sm" />
      <div
        className="w-full max-w-2xl bg-[#e3e3e3] h-full overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#171717] px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">{booking.customer}</h2>
            <p className="text-sm text-[#b9b9b9]">
              {booking.motorcycle}
              {booking.unitId ? ` · ${booking.unitId}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {booking.isDeleted ? (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRestore(e, booking.id);
                    onClose();
                  }}
                  className="p-2 rounded-lg bg-green-800 text-white hover:bg-green-700 transition-colors"
                  title="Restore"
                >
                  <FaTrashRestore />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(e, booking.id, true);
                    onClose();
                  }}
                  className="p-2 rounded-lg bg-red-800 text-white hover:bg-red-700 transition-colors"
                  title="Reject Forever"
                >
                  <FaTrash />
                </button>
              </>
            ) : (
              <>
                {[
                  "pending_reservation",
                  "pending_full_payment",
                  "pending",
                ].includes(booking.status) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onConfirmPayment(e, booking.id);
                    }}
                    className="p-2 rounded-lg bg-green-800 text-white hover:bg-green-700 transition-colors"
                    title={
                      booking.status === "pending_reservation"
                        ? "Confirm Reservation"
                        : "Confirm Full Payment"
                    }
                  >
                    <FaCheckCircle />
                  </button>
                )}
                {booking.status === "pending_reservation" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRequestReupload(e, booking.id);
                    }}
                    className="p-2 rounded-lg bg-orange-700 text-white hover:bg-orange-600 transition-colors"
                    title="Request Re-upload"
                  >
                    <FaUpload />
                  </button>
                )}
                {!["active", "completed"].includes(booking.status) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(e, booking.id, false);
                      onClose();
                    }}
                    className="p-2 rounded-lg bg-red-800 text-white hover:bg-red-700 transition-colors"
                    title="Reject"
                  >
                    <FaTrash />
                  </button>
                )}
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-[#b9b9b9]/20 text-[#b9b9b9] hover:bg-[#b9b9b9]/40 transition-colors"
            >
              <FaTimes />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Status row */}
          <div className="bg-[#b9b9b9] rounded-xl p-4 flex items-center justify-between shadow-lg shadow-black/20">
            <div className="flex items-center gap-3">
              <StatusBadge
                status={booking.status}
                isDeleted={booking.isDeleted}
              />
              <PaymentBadge paymentStatus={booking.paymentStatus} />
            </div>
            {!booking.isDeleted &&
              (isEditing ? (
                <div className="flex items-center gap-2">
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="bg-[#c7c5c5] text-sm px-2 py-1 rounded focus:outline-none focus:ring-1 focus:ring-[#171717] text-[#171717]"
                  >
                    {allowedStatusOptions.map((opt) => (
                      <option value={opt} key={opt}>
                        {opt.charAt(0).toUpperCase() + opt.slice(1)}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleSave}
                    className="px-3 py-1 rounded-lg bg-[#171717] text-white font-bold text-sm
                    shadow-lg shadow-[#171717]/30 hover:brightness-110 hover:scale-[1.01] active:scale-[0.98] transition-all duration-200"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1 rounded-lg bg-[#b50002] text-white font-bold text-sm
                    shadow-lg shadow-[#b50002]/30 hover:brightness-110 hover:scale-[1.01] active:scale-[0.98] transition-all duration-200"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                !isEditLocked &&
                allowedStatusOptions.length > 0 && (
                  <button
                    onClick={() => {
                      setNewStatus(allowedStatusOptions[0]);
                      setIsEditing(true);
                    }}
                    className="flex px-3 items-center justify-center gap-1.5 py-1.5 bg-[#171717] text-white font-bold text-sm rounded-xl
                    shadow-lg shadow-[#171717]/30 hover:brightness-110 hover:scale-[1.01] active:scale-[0.98] transition-all duration-200"
                  >
                    <FaEdit className="text-xs" /> Edit Status
                  </button>
                )
              ))}
          </div>

          {/* Amount highlight */}
          <div className="bg-[#171717] rounded-xl p-4 flex items-center justify-between shadow-lg shadow-black/20">
            <div>
              <p className="text-[#b9b9b9] text-xs uppercase tracking-widest font-bold mb-1">
                Total Amount
              </p>
              <p className="text-3xl font-black text-white">
                ₱{(booking.amount || 0).toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-white/10 rounded-xl">
              <FaMoneyBillWave className="text-white text-2xl" />
            </div>
          </div>

          {/* ── Fee Breakdown ── */}
          <div className="bg-[#b9b9b9] rounded-xl overflow-hidden shadow-lg shadow-black/20">
            <div className="px-4 py-3 bg-[#171717]/10 border-b border-[#171717]/10">
              <h3 className="text-sm font-bold text-[#171717] uppercase tracking-wider flex items-center gap-2">
                <FaReceipt className="text-[#b50002]" /> Fee Breakdown
              </h3>
            </div>
            <div className="p-4 space-y-2 text-sm">
              {/* Daily rate × days */}
              {dailyRate > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-[#171717]/70">
                    Rate/day (₱{dailyRate.toLocaleString()} × {days}{" "}
                    {days === 1 ? "day" : "days"})
                  </span>
                  <span className="font-semibold text-[#171717]">
                    ₱{baseRental.toLocaleString()}
                  </span>
                </div>
              )}

              {/* Distance fee */}
              {distanceFee > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-[#171717]/70 flex items-center gap-1.5">
                    <FaMapMarkerAlt className="text-orange-500 text-xs" />
                    Distance Fee
                    {details.distanceTierLabel && (
                      <span className="text-xs text-[#171717]/50">
                        ({details.distanceTierLabel})
                      </span>
                    )}
                  </span>
                  <span className="font-semibold text-orange-600">
                    +₱{distanceFee.toLocaleString()}
                  </span>
                </div>
              )}

              {/* Helmet fee */}
              {(helmetRequested || helmetFee > 0) && (
                <div className="flex items-center justify-between">
                  <span className="text-[#171717]/70 flex items-center gap-1.5">
                    <FaHardHat className="text-[#b50002] text-xs" />
                    Additional Helmet
                  </span>
                  <span className="font-semibold text-[#b50002]">
                    +₱{helmetFee.toLocaleString()}
                  </span>
                </div>
              )}

              {/* Gross total */}
              <div className="border-t border-[#171717]/15 pt-2 mt-1 flex items-center justify-between">
                <span className="font-bold text-[#171717]">Total</span>
                <span className="font-black text-[#171717] text-base">
                  ₱{(booking.amount || 0).toLocaleString()}
                </span>
              </div>

              {/* Downpayment — already collected */}
              <div className="flex items-center justify-between">
                <span className="text-[#171717]/70 flex items-center gap-1.5">
                  <FaCreditCard className="text-[#b50002] text-xs" />
                  Downpayment (paid)
                </span>
                <span className="font-semibold text-green-700">
                  −₱{reservationFee.toLocaleString()}
                </span>
              </div>

              {/* Due at pickup */}
              <div className="border-t border-[#171717]/15 pt-2 mt-1 flex items-center justify-between">
                <span className="font-bold text-[#171717]">Due at Pickup</span>
                <span className="font-black text-[#b50002] text-base">
                  ₱
                  {Math.max(
                    0,
                    (booking.amount || 0) - reservationFee,
                  ).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Motorcycle */}
          <div className="bg-[#b9b9b9] rounded-xl overflow-hidden shadow-lg shadow-black/20">
            <div className="px-4 py-3 bg-[#171717]/10 border-b border-[#171717]/10">
              <h3 className="text-sm font-bold text-[#171717] uppercase tracking-wider">
                Motorcycle
              </h3>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-4 mb-4">
                {booking.motorcycleImage && (
                  <div className="w-20 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-[#171717]/5">
                    <img
                      src={makeImageUrl(booking.motorcycleImage)}
                      alt={booking.motorcycle}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                )}
                <div>
                  <p className="text-base font-bold text-[#171717]">
                    {booking.motorcycle}
                  </p>
                  {booking.unitId && (
                    <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-[#171717]/10 border border-[#171717]/20 text-xs font-semibold text-[#171717]">
                      <FaIdBadge className="text-[#b50002]" /> {booking.unitId}
                    </span>
                  )}
                  {booking.dailyRate > 0 && (
                    <p className="text-xs text-[#171717]/60 mt-1">
                      ₱{booking.dailyRate.toLocaleString()}/day
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <FaGasPump className="text-[#b50002]" />
                  <span className="text-[#171717]">
                    {details.fuel || booking.motorcycleFuel || "—"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FaCog className="text-[#b50002]" />
                  <span className="text-[#171717]">
                    {details.engineSize || booking.motorcycleEngineSize
                      ? `${details.engineSize || booking.motorcycleEngineSize}cc`
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FaCog className="text-[#b50002]" />
                  <span className="text-[#171717]">
                    {details.transmission ||
                      booking.motorcycleTransmission ||
                      "—"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FaShieldAlt className="text-[#b50002]" />
                  <span className="text-[#171717]">
                    ABS:{" "}
                    {(details.hasABS ?? booking.motorcycleHasABS)
                      ? "Yes"
                      : "No"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Customer */}
          <div className="bg-[#b9b9b9] rounded-xl overflow-hidden shadow-lg shadow-black/20">
            <div className="px-4 py-3 bg-[#171717]/10 border-b border-[#171717]/10">
              <h3 className="text-sm font-bold text-[#171717] uppercase tracking-wider">
                Customer
              </h3>
            </div>
            <div className="p-4 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <FaUser className="text-[#b50002] flex-shrink-0" />
                <span className="text-[#171717]">{booking.customer}</span>
              </div>
              <div className="flex items-center gap-2">
                <FaEnvelope className="text-[#b50002] flex-shrink-0" />
                <span className="text-[#171717]">{booking.email || "—"}</span>
              </div>
              <div className="flex items-center gap-2">
                <FaPhone className="text-[#b50002] flex-shrink-0" />
                <span className="text-[#171717]">{booking.phone || "—"}</span>
              </div>
              <div className="flex items-start gap-2">
                <FaMapMarkerAlt className="text-[#b50002] flex-shrink-0 mt-0.5" />
                <span className="text-[#171717]">
                  {buildFullAddress(booking.address)}
                </span>
              </div>
            </div>
          </div>

          {/* Booking dates + times */}
          <div className="bg-[#b9b9b9] rounded-xl overflow-hidden shadow-lg shadow-black/20">
            <div className="px-4 py-3 bg-[#171717]/10 border-b border-[#171717]/10">
              <h3 className="text-sm font-bold text-[#171717] uppercase tracking-wider">
                Payment Proof
              </h3>
            </div>
            <div className="p-4 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <FaReceipt className="text-[#b50002]" />
                <span className="text-[#171717]/60 w-36 flex-shrink-0">
                  Reference ID
                </span>
                <span className="text-[#171717] font-medium">
                  {booking.paymentReferenceId || "—"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <FaMoneyBillWave className="text-[#b50002]" />
                <span className="text-[#171717]/60 w-36 flex-shrink-0">
                  Amount Sent
                </span>
                <span className="text-[#171717] font-medium">
                  {booking.paymentSentAmount
                    ? `₱${Number(booking.paymentSentAmount).toLocaleString()}`
                    : "—"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <FaClock className="text-[#b50002]" />
                <span className="text-[#171717]/60 w-36 flex-shrink-0">
                  Payment Time
                </span>
                <span className="text-[#171717] font-medium">
                  {booking.paymentSentAt
                    ? formatDateTime(booking.paymentSentAt)
                    : "—"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <FaCheckCircle className="text-[#b50002]" />
                <span className="text-[#171717]/60 w-36 flex-shrink-0">
                  Receipt Check
                </span>
                <span className="text-[#171717] font-medium">
                  {booking.receiptVerification?.status || "pending"}
                  {typeof booking.receiptVerification?.score === "number" &&
                    ` (${booking.receiptVerification.score}%)`}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <FaInfoCircle className="text-[#b50002] mt-0.5" />
                <span className="text-[#171717]/60 w-36 flex-shrink-0">
                  Admin Review
                </span>
                <span className="text-[#171717] font-medium">
                  {booking.requiresProofReupload
                    ? "Re-upload requested"
                    : "No action needed"}
                  {booking.adminReviewComment
                    ? `: ${booking.adminReviewComment}`
                    : ""}
                </span>
              </div>
              {booking.paymentProofImage && (
                <div className="pt-2">
                  <img
                    src={makeImageUrl(booking.paymentProofImage)}
                    alt="Payment proof"
                    className="max-h-72 w-full object-contain rounded-lg border border-[#171717]/10 bg-white"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Booking dates + times */}
          <div className="bg-[#b9b9b9] rounded-xl overflow-hidden shadow-lg shadow-black/20">
            <div className="px-4 py-3 bg-[#171717]/10 border-b border-[#171717]/10">
              <h3 className="text-sm font-bold text-[#171717] uppercase tracking-wider">
                Booking Details
              </h3>
            </div>
            <div className="p-4 space-y-2 text-sm">
              {/* Pickup date + time */}
              <div className="flex items-center gap-2">
                <FaCalendarAlt className="text-[#b50002]" />
                <span className="text-[#171717]/60 w-28 flex-shrink-0">
                  Pickup
                </span>
                <span className="text-[#171717] font-medium">
                  {formatDate(booking.pickupDate)}
                  {booking.pickupTime && (
                    <span className="ml-2 text-[#b50002] font-semibold">
                      · {formatTime(booking.pickupTime)}
                    </span>
                  )}
                </span>
              </div>

              {/* Return date + time */}
              <div className="flex items-center gap-2">
                <FaCalendarAlt className="text-[#b50002]" />
                <span className="text-[#171717]/60 w-28 flex-shrink-0">
                  Return
                </span>
                <span className="text-[#171717] font-medium">
                  {formatDate(booking.returnDate)}
                  {booking.returnTime && (
                    <span className="ml-2 text-[#b50002] font-semibold">
                      · {formatTime(booking.returnTime)}
                    </span>
                  )}
                </span>
              </div>

              {/* Duration */}
              <div className="flex items-center gap-2">
                <FaClock className="text-[#b50002]" />
                <span className="text-[#171717]/60 w-28 flex-shrink-0">
                  Duration
                </span>
                <span className="text-[#171717] font-medium">
                  {days} {days === 1 ? "day" : "days"}
                </span>
              </div>

              {/* Booked on */}
              <div className="flex items-center gap-2">
                <FaCalendarAlt className="text-[#b50002]" />
                <span className="text-[#171717]/60 w-28 flex-shrink-0">
                  Booked on
                </span>
                <span className="text-[#171717] font-medium">
                  {formatDateTime(booking.bookingDate)}
                </span>
              </div>

              {/* Destination */}
              <div className="flex items-center gap-2">
                <FaMapMarkerAlt className="text-[#b50002]" />
                <span className="text-[#171717]/60 w-28 flex-shrink-0">
                  Destination
                </span>
                <span className="text-[#171717] font-medium">
                  {booking.destination || "—"}
                </span>
              </div>

              {/* Reservation fee */}
              <div className="flex items-center gap-2">
                <FaCreditCard className="text-[#b50002]" />
                <span className="text-[#171717]/60 w-28 flex-shrink-0">
                  Reservation Fee
                </span>
                <span className="text-[#171717] font-medium">
                  ₱{booking.reservationFee || 200} —{" "}
                  {booking.reservationFeePaid ? "Paid" : "Unpaid"}
                </span>
              </div>

              {booking.reservationPaymentMethod && (
                <div className="flex items-center gap-2">
                  <FaCreditCard className="text-[#b50002]" />
                  <span className="text-[#171717]/60 w-28 flex-shrink-0">
                    Payment Method
                  </span>
                  <span className="text-[#171717] font-medium">
                    {booking.reservationPaymentMethod}
                  </span>
                </div>
              )}

              {booking.isDeleted && booking.deletedAt && (
                <div className="flex items-center gap-2">
                  <FaBan className="text-red-800" />
                  <span className="text-[#171717]/60 w-28 flex-shrink-0">
                    Rejected on
                  </span>
                  <span className="text-red-800 font-medium">
                    {formatDate(booking.deletedAt)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Booking Table ─────────────────────────────────────────────────────────────
const BookingTable = ({
  bookings,
  onRowClick,
  colSort,
  onColSort,
  onEditStatus,
  onDelete,
  onRestore,
  onConfirmPayment,
  onRequestReupload,
}) => {
  const cols = [
    { label: "Customer", key: "customer", width: "w-[180px]", sortable: true },
    {
      label: "Motorcycle",
      key: "motorcycle",
      width: "w-[200px]",
      sortable: true,
    },
    { label: "Pickup", key: "pickupDate", width: "w-[140px]", sortable: true },
    { label: "Return", key: "returnDate", width: "w-[140px]", sortable: true },
    { label: "Booked", key: "bookingDate", width: "w-[110px]", sortable: true },
    { label: "Amount", key: "amount", width: "w-[110px]", sortable: true },
    {
      label: "Payment",
      key: "paymentStatus",
      width: "w-[150px]",
      sortable: true,
    },
    { label: "Status", key: "status", width: "w-[120px]", sortable: false },
    { label: "Actions", key: null, width: "w-[110px]", sortable: false },
  ];

  return (
    <div className="rounded-2xl overflow-hidden shadow-lg shadow-black/20">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1200px] border-collapse">
          <thead>
            <tr className="bg-[#171717]">
              {cols.map((col) => (
                <th
                  key={col.label}
                  onClick={col.sortable ? () => onColSort(col.key) : undefined}
                  className={`${col.width} px-4 py-4 text-left text-sm font-bold uppercase tracking-wider text-[#b9b9b9] whitespace-nowrap first:pl-5 last:pr-5 ${col.sortable ? "cursor-pointer select-none hover:text-white transition-colors" : ""}`}
                >
                  <span className="inline-flex items-center gap-0.5">
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
          <tbody>
            {bookings.map((booking, idx) => (
              <tr
                key={booking.id}
                onClick={() => onRowClick(booking)}
                className={`
                  border-b border-[#171717]/10 cursor-pointer transition-all duration-150
                  ${idx % 2 === 0 ? "bg-[#b9b9b9]" : "bg-[#c4c4c4]"}
                  ${booking.isDeleted ? "opacity-55" : "hover:bg-[#a8a8a8]"}
                `}
              >
                {/* Customer */}
                <td className="px-4 py-4 pl-5">
                  <p className="text-base font-bold text-[#171717] truncate">
                    {booking.customer}
                  </p>
                  <p className="text-xs text-[#171717]/60 truncate">
                    {booking.email}
                  </p>
                </td>

                {/* Motorcycle */}
                <td className="px-4 py-4">
                  <p className="text-base text-[#171717] font-semibold truncate">
                    {booking.motorcycle}
                  </p>
                  {booking.unitId && (
                    <span className="inline-flex items-center gap-1 py-0.5 text-xs font-bold text-[#171717]">
                      {booking.unitId}
                    </span>
                  )}
                </td>

                {/* Pickup date + time */}
                <td className="px-4 py-4">
                  <span className="text-base text-[#171717]">
                    {formatDate(booking.pickupDate)}
                  </span>
                  {booking.pickupTime && (
                    <p className="text-xs text-[#b50002] font-semibold mt-0.5">
                      {formatTime(booking.pickupTime)}
                    </p>
                  )}
                </td>

                {/* Return date + time */}
                <td className="px-4 py-4">
                  <span className="text-base text-[#171717]">
                    {formatDate(booking.returnDate)}
                  </span>
                  {booking.returnTime && (
                    <p className="text-xs text-[#b50002] font-semibold mt-0.5">
                      {formatTime(booking.returnTime)}
                    </p>
                  )}
                </td>

                {/* Booked on */}
                <td className="px-4 py-4">
                  <span className="text-base text-[#171717]">
                    {formatDateTime(booking.bookingDate)}
                  </span>
                </td>

                {/* Amount */}
                <td className="px-4 py-4">
                  <span className="text-base font-bold text-[#171717]">
                    ₱{(booking.amount || 0).toLocaleString()}
                  </span>
                </td>

                {/* Payment */}
                <td className="px-4 py-4">
                  <PaymentBadge paymentStatus={booking.paymentStatus} />
                </td>

                {/* Status */}
                <td className="px-4 py-4">
                  <StatusBadge
                    status={booking.status}
                    isDeleted={booking.isDeleted}
                  />
                </td>

                {/* Actions */}
                <td
                  className="px-4 py-4 pr-5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-2">
                    {booking.isDeleted ? (
                      <>
                        <button
                          onClick={(e) => onRestore(e, booking.id)}
                          className="p-2 rounded-lg bg-green-800 text-white hover:bg-green-700 transition-colors"
                          title="Restore"
                        >
                          <FaTrashRestore className="text-xl" />
                        </button>
                        <button
                          onClick={(e) => onDelete(e, booking.id, true)}
                          className="p-2 rounded-lg bg-red-800 text-white hover:bg-red-700 transition-colors"
                          title="Reject Forever"
                        >
                          <FaTrash className="text-xl" />
                        </button>
                      </>
                    ) : (
                      <>
                        {[
                          "pending_reservation",
                          "pending_full_payment",
                          "pending",
                        ].includes(booking.status) && (
                          <button
                            onClick={(e) => onConfirmPayment(e, booking.id)}
                            className="p-2 rounded-lg bg-green-800 text-white hover:bg-green-700 transition-colors"
                            title={
                              booking.status === "pending_reservation"
                                ? "Confirm Reservation"
                                : "Confirm Full Payment"
                            }
                          >
                            <FaCheckCircle className="text-xl" />
                          </button>
                        )}
                        {booking.status === "pending_reservation" && (
                          <button
                            onClick={(e) => onRequestReupload(e, booking.id)}
                            className="p-2 rounded-lg bg-orange-700 text-white hover:bg-orange-600 transition-colors"
                            title="Request Re-upload"
                          >
                            <FaUpload className="text-xl" />
                          </button>
                        )}
                        {!['completed', 'cancelled'].includes(booking.status) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditStatus(
                                booking.id,
                                booking.status,
                                booking.paymentStatus,
                              );
                            }}
                            className="p-2 rounded-lg bg-[#171717] text-white hover:bg-green-800 transition-colors"
                            title="Edit Status"
                          >
                            <FaEdit className="text-xl" />
                          </button>
                        )}
                        {!["active", "completed"].includes(booking.status) && (
                          <button
                            onClick={(e) => onDelete(e, booking.id, false)}
                            className="p-2 rounded-lg bg-red-800 text-white hover:bg-red-700 transition-colors"
                            title="Reject"
                          >
                            <FaTrash className="text-xl" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── No results ────────────────────────────────────────────────────────────────
const NoBookingsView = ({ onResetFilters }) => (
  <div className="bg-[#b9b9b9] rounded-2xl p-12 text-center shadow-lg shadow-black/20">
    <FaSearch className="mx-auto text-5xl text-[#171717]/40 mb-4" />
    <h3 className="text-xl font-bold text-[#171717] mb-2">No Bookings Found</h3>
    <p className="text-[#171717]/70 mb-6">
      Try adjusting your search or filter criteria.
    </p>
    <button
      onClick={onResetFilters}
      className="w-40 py-2.5 px-4 rounded-xl mt-6 items-center justify-center gap-2 font-semibold text-sm text-white bg-[#b50002]
                    shadow-lg shadow-[#b50002]/30 hover:brightness-110 hover:scale-[1.01] active:scale-[0.98] transition-all duration-200"
    >
      Reset Filters
    </button>
  </div>
);

// ── Inline status-edit modal ──────────────────────────────────────────────────
const EditStatusModal = ({
  bookingId,
  currentStatus,
  paymentStatus,
  onSave,
  onCancel,
}) => {
  const filteredStatuses = getAllowedNextStatuses(currentStatus);
  const [newStatus, setNewStatus] = useState(filteredStatuses[0] || currentStatus);

  return (
    <ModalShell onBackdropClick={onCancel}>
      <h3 className="text-xl font-bold text-[#171717] mb-4">
        Edit Booking Status
      </h3>
      <select
        value={newStatus}
        onChange={(e) => setNewStatus(e.target.value)}
        className="w-full bg-[#c7c5c5] text-sm px-3 py-2 rounded-lg mb-4 focus:outline-none focus:ring-1 focus:ring-[#171717] text-[#171717]"
        disabled={filteredStatuses.length === 0}
      >
        {filteredStatuses.map((opt) => (
          <option value={opt} key={opt}>
            {opt.charAt(0).toUpperCase() + opt.slice(1)}
          </option>
        ))}
      </select>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#b50002] text-white font-bold text-sm rounded-xl
                    shadow-lg shadow-[#b50002]/30 hover:brightness-110 hover:scale-[1.01] active:scale-[0.98] transition-all duration-200"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(bookingId, newStatus)}
          disabled={filteredStatuses.length === 0}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#171717] text-white font-bold text-sm rounded-xl
                    shadow-lg shadow-[#171717]/30 hover:brightness-110 hover:scale-[1.01] active:scale-[0.98] transition-all duration-200 disabled:opacity-60"
        >
          Save
        </button>
      </div>
    </ModalShell>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const MotorcycleBooking = () => {
  const [bookings, setBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("pending_reservation");
  const [currentPage, setCurrentPage] = useState(1);
  const [colSort, setColSort] = useState({ key: null, dir: null });
  const [drawerBooking, setDrawerBooking] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingCurrentStatus, setEditingCurrentStatus] = useState("");
  const [editingPaymentStatus, setEditingPaymentStatus] = useState("");
  const [reuploadModalBookingId, setReuploadModalBookingId] = useState(null);
  const [reuploadModalDefaultComment, setReuploadModalDefaultComment] =
    useState("");
  const [sendingReuploadRequest, setSendingReuploadRequest] = useState(false);

  const fetchBookings = useCallback(async () => {
    try {
      const res = await api.get("/api/motorcycle-bookings", {
        params: { limit: 200, includeDeleted: "true" },
      });
      const raw = Array.isArray(res.data)
        ? res.data
        : res.data.data || res.data.bookings || [];
      const mapped = raw.map((b, i) => {
        const id = b._id || b.id || `local-${i + 1}`;
        const normalizedStatus =
          (b.status || "pending_reservation") === "pending"
            ? "pending_reservation"
            : b.status || "pending_reservation";
        const motorcycleInfo = extractMotorcycleInfo(b);
        const details = normalizeDetails(b.details || {}, motorcycleInfo);
        return {
          id,
          _id: b._id || b.id || null,
          customer: b.customer || b.customerName || "",
          email: b.email || "",
          phone: b.phone || "",
          motorcycle: motorcycleInfo.title || "",
          unitId: motorcycleInfo.unitId || "",
          motorcycleImage: motorcycleInfo.image || "",
          dailyRate: motorcycleInfo.dailyRate || 0,
          pickupDate: b.pickupDate || b.pickup || b.startDate || "",
          pickupTime: b.pickupTime || "",
          returnDate: b.returnDate || b.return || b.endDate || "",
          returnTime: b.returnTime || "",
          destination: b.destination || "Not specified",
          bookingDate: b.bookingDate || b.createdAt || "",
          status: normalizedStatus.toString(),
          amount: b.amount ?? b.total ?? 0,
          reservationFee: b.reservationFee || 200,
          reservationFeePaid: b.reservationFeePaid || false,
          paymentStatus: b.paymentStatus || "pending_verification",
          reservationPaymentMethod: b.reservationPaymentMethod || "",
          paymentProofImage: b.paymentProofImage || "",
          paymentReferenceId: b.paymentReferenceId || "",
          paymentSentAmount: Number(b.paymentSentAmount || 0),
          paymentSentAt: b.paymentSentAt || "",
          receiptVerification: b.receiptVerification || null,
          requiresProofReupload: !!b.requiresProofReupload,
          adminReviewComment: b.adminReviewComment || "",
          adminReviewedAt: b.adminReviewedAt || null,
          details,
          // Snapshot spec fields — fallback for old bookings where details is empty
          motorcycleFuel: motorcycleInfo.fuel || "",
          motorcycleTransmission: motorcycleInfo.transmission || "",
          motorcycleEngineSize: motorcycleInfo.engineSize || "",
          motorcycleHasABS: motorcycleInfo.hasABS ?? false,
          isDeleted: b.isDeleted || false,
          deletedAt: b.deletedAt || null,
          address: {
            barangay: b.address?.barangay || "",
            city: b.address?.city || "",
            state: b.address?.state || "",
            region: b.address?.region || "",
            zipCode: b.address?.zipCode || b.address?.postalCode || "",
            street: b.address?.street || b.address?.addressLine || "",
          },
        };
      });
      setBookings(mapped);
    } catch (err) {
      console.error("Failed to fetch bookings:", err);
      await alertModal("Failed to load bookings from server.", {
        isError: true,
      });
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedStatus, colSort]);

  // ── Counts ────────────────────────────────────────────────────────────────
  const counts = useMemo(
    () => ({
      pendingReservation: bookings.filter(
        (b) => !b.isDeleted && b.status === "pending_reservation",
      ).length,
      pendingFullPayment: bookings.filter(
        (b) => !b.isDeleted && b.status === "pending_full_payment",
      ).length,
      active: bookings.filter((b) => !b.isDeleted && b.status === "active")
        .length,
      completed: bookings.filter(
        (b) => !b.isDeleted && b.status === "completed",
      ).length,
      cancelled: bookings.filter(
        (b) => !b.isDeleted && b.status === "cancelled",
      ).length,
      rejected: bookings.filter((b) => b.isDeleted).length,
      totalRequests: bookings.filter((b) => !b.isDeleted).length,
    }),
    [bookings],
  );

  // ── Column sort ───────────────────────────────────────────────────────────
  const handleColSort = (key) => {
    setColSort((prev) => {
      if (prev.key !== key) return { key, dir: "asc" };
      const next = nextSortState(prev.dir);
      return next === null ? { key: null, dir: null } : { key, dir: next };
    });
  };

  // ── Filtered + sorted ─────────────────────────────────────────────────────
  const filteredBookings = useMemo(() => {
    let list = [...bookings];

    if (selectedStatus === "rejected") {
      list = list.filter((b) => b.isDeleted);
    } else {
      list = list.filter((b) => !b.isDeleted && b.status === selectedStatus);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (b) =>
          (b.customer || "").toLowerCase().includes(q) ||
          (b.motorcycle || "").toLowerCase().includes(q) ||
          (b.unitId || "").toLowerCase().includes(q) ||
          (b.email || "").toLowerCase().includes(q),
      );
    }

    if (colSort.key && colSort.dir) {
      list.sort((a, b) => {
        let aVal = a[colSort.key];
        let bVal = b[colSort.key];
        if (typeof aVal === "number" || (!isNaN(Number(aVal)) && aVal !== "")) {
          return colSort.dir === "asc"
            ? Number(aVal) - Number(bVal)
            : Number(bVal) - Number(aVal);
        }
        if (colSort.key.includes("Date")) {
          const da = aVal ? new Date(aVal).getTime() : 0;
          const db = bVal ? new Date(bVal).getTime() : 0;
          return colSort.dir === "asc" ? da - db : db - da;
        }
        const cmp = String(aVal ?? "").localeCompare(String(bVal ?? ""));
        return colSort.dir === "asc" ? cmp : -cmp;
      });
    } else {
      list.sort((a, b) => {
        const da = a.bookingDate ? new Date(a.bookingDate).getTime() : 0;
        const db = b.bookingDate ? new Date(b.bookingDate).getTime() : 0;
        return db - da;
      });
    }

    return list;
  }, [bookings, searchTerm, selectedStatus, colSort]);

  const totalPages = Math.ceil(filteredBookings.length / ITEMS_PER_PAGE);
  const paginated = filteredBookings.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleEditStatus = (id, currentStatus, paymentStatus = "") => {
    setEditingId(id);
    setEditingCurrentStatus(currentStatus);
    setEditingPaymentStatus(paymentStatus);
  };

  const handleSaveStatus = async (id, newStatus) => {
    try {
      const booking = bookings.find((b) => b.id === id || b._id === id);
      if (!booking || !booking._id) {
        setEditingId(null);
        return;
      }
      await api.patch(`/api/motorcycle-bookings/${booking._id}/status`, {
        status: newStatus,
      });
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: newStatus } : b)),
      );
      if (drawerBooking?.id === id)
        setDrawerBooking((prev) => ({ ...prev, status: newStatus }));
      setEditingId(null);
    } catch (err) {
      await alertModal(
        err.response?.data?.message || "Failed to update booking status",
        { isError: true },
      );
    }
  };

  const handleDelete = async (e, bookingId, permanent = false) => {
    e.stopPropagation();
    const booking = bookings.find(
      (b) => b.id === bookingId || b._id === bookingId,
    );
    if (!booking) {
      await alertModal("Booking not found", { isError: true });
      return;
    }

    const confirmed = await confirmModal(
      permanent
        ? `Permanently delete the booking for ${booking.customer}? This cannot be undone.`
        : `Reject the booking for ${booking.customer}?`,
      {
        isPermanent: permanent,
        confirmLabel: permanent ? "Reject Forever" : "Yes, Reject",
      },
    );
    if (!confirmed) return;

    try {
      if (!booking._id) {
        setBookings((prev) => prev.filter((p) => p.id !== bookingId));
        return;
      }
      if (permanent) {
        await api.delete(`/api/motorcycle-bookings/${booking._id}/permanent`);
        setBookings((prev) =>
          prev.filter((b) => b.id !== bookingId && b._id !== booking._id),
        );
      } else {
        await api.delete(`/api/motorcycle-bookings/${booking._id}`);
        setBookings((prev) =>
          prev.map((b) =>
            b.id === bookingId
              ? { ...b, isDeleted: true, deletedAt: new Date().toISOString() }
              : b,
          ),
        );
      }
      if (drawerBooking?.id === bookingId) setDrawerBooking(null);
    } catch (err) {
      await alertModal(
        `Error: ${err.response?.data?.message || err.message || "Failed"}`,
        { isError: true },
      );
    }
  };

  const handleRestore = async (e, bookingId) => {
    e.stopPropagation();
    const booking = bookings.find(
      (b) => b.id === bookingId || b._id === bookingId,
    );
    if (!booking?._id) {
      await alertModal("Cannot restore this booking", { isError: true });
      return;
    }
    try {
      await api.patch(`/api/motorcycle-bookings/${booking._id}/restore`);
      await alertModal("Booking restored successfully");
      fetchBookings();
      if (drawerBooking?.id === bookingId) setDrawerBooking(null);
    } catch (err) {
      await alertModal(
        err.response?.data?.message || "Failed to restore booking",
        { isError: true },
      );
    }
  };

  const handleConfirmPayment = async (e, bookingId) => {
    e.stopPropagation();
    const booking = bookings.find(
      (b) => b.id === bookingId || b._id === bookingId,
    );
    if (!booking) {
      await alertModal("Booking not found", { isError: true });
      return;
    }
    const isReservationStage = booking.status === "pending_reservation";
    const confirmText = isReservationStage
      ? `Confirm reservation payment proof for ${booking.customer}? This will move the booking to Pending Full Payment and send a digital receipt email.`
      : `Confirm full payment of ₱${booking.amount} for ${booking.customer}? This will activate the booking.`;
    const confirmed = await confirmModal(confirmText, {
      confirmLabel: isReservationStage
        ? "Confirm Reservation"
        : "Confirm Full Payment",
    });
    if (!confirmed) return;
    try {
      const response = await api.patch(
        `/api/motorcycle-bookings/${booking._id}/confirm-payment`,
      );
      const updated = response?.data?.booking || {};
      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId
            ? {
                ...b,
                status: updated.status || b.status,
                paymentStatus: updated.paymentStatus || b.paymentStatus,
                reservationFeePaid:
                  updated.reservationFeePaid ?? b.reservationFeePaid,
              }
            : b,
        ),
      );
      if (drawerBooking?.id === bookingId)
        setDrawerBooking((prev) => ({
          ...prev,
          status: updated.status || prev.status,
          paymentStatus: updated.paymentStatus || prev.paymentStatus,
          reservationFeePaid:
            updated.reservationFeePaid ?? prev.reservationFeePaid,
        }));
      await alertModal(
        response?.data?.message || "Payment status updated successfully.",
      );
    } catch (err) {
      await alertModal(
        `Error: ${err.response?.data?.message || err.message || "Failed"}`,
        { isError: true },
      );
    }
  };

  const handleRequestReupload = async (e, bookingId) => {
    e.stopPropagation();
    const booking = bookings.find(
      (b) => b.id === bookingId || b._id === bookingId,
    );
    if (!booking) {
      await alertModal("Booking not found", { isError: true });
      return;
    }

    setReuploadModalBookingId(booking.id);
    setReuploadModalDefaultComment(
      booking.adminReviewComment ||
        "Please re-upload a clearer payment receipt.",
    );
  };

  const submitReuploadRequest = async (commentText) => {
    const comment = String(commentText || "").trim();
    if (!comment) {
      await alertModal("Comment is required to request a re-upload.", {
        isError: true,
      });
      return;
    }

    const bookingId = reuploadModalBookingId;
    const booking = bookings.find(
      (b) => b.id === bookingId || b._id === bookingId,
    );
    if (!booking) {
      await alertModal("Booking not found", { isError: true });
      return;
    }

    try {
      setSendingReuploadRequest(true);
      const response = await api.patch(
        `/api/motorcycle-bookings/${booking._id}/request-reupload`,
        { comment },
      );
      const updated = response?.data?.booking || {};
      setBookings((prev) =>
        prev.map((b) =>
          b.id === booking.id
            ? {
                ...b,
                status: updated.status || b.status,
                paymentStatus: updated.paymentStatus || b.paymentStatus,
                requiresProofReupload:
                  updated.requiresProofReupload ?? b.requiresProofReupload,
                adminReviewComment:
                  updated.adminReviewComment ?? b.adminReviewComment,
                adminReviewedAt: updated.adminReviewedAt || b.adminReviewedAt,
              }
            : b,
        ),
      );
      if (drawerBooking?.id === booking.id)
        setDrawerBooking((prev) => ({
          ...prev,
          status: updated.status || prev.status,
          paymentStatus: updated.paymentStatus || prev.paymentStatus,
          requiresProofReupload:
            updated.requiresProofReupload ?? prev.requiresProofReupload,
          adminReviewComment:
            updated.adminReviewComment ?? prev.adminReviewComment,
          adminReviewedAt: updated.adminReviewedAt || prev.adminReviewedAt,
        }));

      setReuploadModalBookingId(null);
      setReuploadModalDefaultComment("");

      await alertModal(
        response?.data?.message || "Re-upload request sent successfully.",
      );
    } catch (err) {
      await alertModal(
        err.response?.data?.message || "Failed to request re-upload.",
        { isError: true },
      );
    } finally {
      setSendingReuploadRequest(false);
    }
  };

  const clearSearch = () => setSearchTerm("");
  const selectedStatusLabel =
    selectedStatus === "pending_reservation"
      ? "Pending Reservation"
      : selectedStatus === "pending_full_payment"
        ? "Pending Full Payment"
        : selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1);

  return (
    <div className="min-h-screen pt-32 bg-[#e3e3e3] py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-4 rounded-3xl bg-gradient-to-br from-[#171717] via-[#212121] to-[#b50002] p-4 sm:p-5 border border-white/10 mt-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] font-black text-[#b9b9b9]/80 mb-1">
              Booking Summary
            </p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white">
              Booking Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-[#b9b9b9]/80 mt-1.5 max-w-xl">
              Monitor payment flow, verify receipts, and manage booking
              lifecycle.
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-2xl mx-auto">
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[#171717]" />
          <input
            type="text"
            placeholder="Search by customer, motorcycle, unit ID, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-12 py-3 bg-[#c7c5c5] rounded-lg text-[#171717] placeholder-gray-500 focus:outline-none shadow-lg shadow-black/20 focus:ring-1 focus:ring-[#171717]"
          />
          {searchTerm && (
            <button
              onClick={clearSearch}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#171717]"
            >
              <FaTimes />
            </button>
          )}
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-3 mb-6">
        <StatTab
          title="Pending Reservation"
          value={counts.pendingReservation}
          icon={FaClock}
          isActive={selectedStatus === "pending_reservation"}
          onClick={() => setSelectedStatus("pending_reservation")}
          // subtitle={`All requests: ${counts.totalRequests}`}
          accentColor="text-white"
        />
        <StatTab
          title="Pending Full Payment"
          value={counts.pendingFullPayment}
          icon={FaCreditCard}
          isActive={selectedStatus === "pending_full_payment"}
          onClick={() => setSelectedStatus("pending_full_payment")}
          accentColor="text-white"
        />
        <StatTab
          title="Active"
          value={counts.active}
          icon={FaCheckCircle}
          isActive={selectedStatus === "active"}
          onClick={() => setSelectedStatus("active")}
          accentColor="text-white"
        />
        <StatTab
          title="Completed"
          value={counts.completed}
          icon={FaCalendarAlt}
          isActive={selectedStatus === "completed"}
          onClick={() => setSelectedStatus("completed")}
          accentColor="text-white"
        />
        <StatTab
          title="Cancelled"
          value={counts.cancelled}
          icon={FaBan}
          isActive={selectedStatus === "cancelled"}
          onClick={() => setSelectedStatus("cancelled")}
          accentColor="text-white"
        />
        <StatTab
          title="Rejected"
          value={counts.rejected}
          icon={FaTrash}
          isActive={selectedStatus === "rejected"}
          onClick={() => setSelectedStatus("rejected")}
          accentColor="text-white"
        />
      </div>

      {/* Result count */}
      <div className="text-center text-[#171717] mb-4 text-sm">
        Showing{" "}
        {filteredBookings.length === 0
          ? 0
          : Math.min(
              (currentPage - 1) * ITEMS_PER_PAGE + 1,
              filteredBookings.length,
            )}
        –{Math.min(currentPage * ITEMS_PER_PAGE, filteredBookings.length)} of{" "}
        {filteredBookings.length}{" "}
        <span className="font-semibold">{selectedStatusLabel}</span> bookings
        {searchTerm && " (filtered)"}
      </div>

      {/* Table */}
      {paginated.length > 0 ? (
        <>
          <BookingTable
            bookings={paginated}
            onRowClick={setDrawerBooking}
            colSort={colSort}
            onColSort={handleColSort}
            onEditStatus={handleEditStatus}
            onDelete={handleDelete}
            onRestore={handleRestore}
            onConfirmPayment={handleConfirmPayment}
            onRequestReupload={handleRequestReupload}
          />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
      ) : (
        <NoBookingsView onResetFilters={() => setSearchTerm("")} />
      )}

      {/* Detail Drawer */}
      {drawerBooking && (
        <DetailDrawer
          booking={drawerBooking}
          onClose={() => setDrawerBooking(null)}
          onEditStatus={handleSaveStatus}
          onDelete={handleDelete}
          onRestore={handleRestore}
          onConfirmPayment={handleConfirmPayment}
          onRequestReupload={handleRequestReupload}
        />
      )}

      {/* Inline Edit Status Modal */}
      {editingId && (
        <EditStatusModal
          bookingId={editingId}
          currentStatus={editingCurrentStatus}
          paymentStatus={editingPaymentStatus}
          onSave={handleSaveStatus}
          onCancel={() => setEditingId(null)}
        />
      )}

      {reuploadModalBookingId && (
        <ReuploadCommentModal
          defaultValue={reuploadModalDefaultComment}
          submitting={sendingReuploadRequest}
          onCancel={() => {
            if (sendingReuploadRequest) return;
            setReuploadModalBookingId(null);
            setReuploadModalDefaultComment("");
          }}
          onSubmit={submitReuploadRequest}
        />
      )}
    </div>
  );
};

export default MotorcycleBooking;
