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
  FaMoneyBillWave,
  FaBan,
  FaRoad,
  FaTachometerAlt,
} from "react-icons/fa";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  CreditCard,
  RotateCcw,
  Trash2,
  XCircle,
  ClipboardList,
  Upload,
  Square,
  CheckSquare,
  MinusSquare,
  ListChecks,
} from "lucide-react";

const baseURL = API_BASE_URL;
const api = axios.create({ baseURL, headers: { Accept: "application/json" } });

const ITEMS_PER_PAGE = 10;

// ── Shared styles (matching ManageMotorcycle) ─────────────────────────────────
const labelCls =
  "block text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase mb-1.5";

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

const formatDate = (s) => {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d)) return "—";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

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
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("/dxta0nmdy/") || s.startsWith("dxta0nmdy/"))
    return `https://res.cloudinary.com/${s.replace(/^\/+/, "")}`;
  const cleanPath = s.replace(/^\/+/, "").replace(/^uploads\//, "");
  return `${API_BASE_URL}/uploads/${cleanPath}`;
};

const normalizeDetails = (d = {}, motorcycle = {}) => ({
  fuel: d.fuelType || d.fuel || motorcycle.fuel || motorcycle.fuelType || "",
  engineSize: d.engineSize ?? motorcycle.engineSize ?? "",
  transmission: d.transmission || motorcycle.transmission || "",
  hasABS: d.hasABS ?? motorcycle.hasABS ?? false,
  distanceFee: d.distanceFee != null ? Number(d.distanceFee) : null,
  distanceTierLabel: d.distanceTierLabel ?? "",
  helmetRequested: !!d.helmetRequested,
  helmetFee: d.helmetFee != null ? Number(d.helmetFee) : null,
  destinationCity: d.destinationCity ?? "",
  appliedDiscount: d.appliedDiscount || null,
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

const getAllowedNextStatuses = (currentStatus) => {
  switch (currentStatus) {
    case "pending_reservation":
    case "pending_full_payment":
    case "pending":
      return ["cancelled"];
    case "active":
      return ["inspection"];
    default:
      return [];
  }
};

// ── Bulk actions available per status tab ──────────────────────────────────
// Keyed by the `selectedStatus` tab (isDeleted rows use "rejected").
const getBulkActionsForStatus = (statusTab) => {
  switch (statusTab) {
    case "pending_reservation":
      return ["confirm", "cancel", "reject"];
    case "pending_full_payment":
      return ["cancel", "reject"];
    case "active":
      return ["inspection"];
    case "cancelled":
      return ["reject"];
    case "rejected":
      return ["restore", "cancel"];
    default:
      return [];
  }
};

const BULK_ACTION_CONFIG = {
  confirm: {
    label: "Confirm Reservation",
    icon: CheckCircle2,
    cls: "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-100",
  },
  cancel: {
    label: "Cancel",
    icon: FaBan,
    cls: "bg-amber-50 text-amber-600 hover:bg-amber-100 border-amber-100",
  },
  reject: {
    label: "Reject",
    icon: Trash2,
    cls: "bg-red-50 text-[#b50002] hover:bg-red-100 border-red-100",
  },
  inspection: {
    label: "Move to Inspection",
    icon: ClipboardList,
    cls: "bg-violet-50 text-violet-600 hover:bg-violet-100 border-violet-100",
  },
  restore: {
    label: "Restore",
    icon: RotateCcw,
    cls: "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-100",
  },
};

// ── Modals ────────────────────────────────────────────────────────────────────
const ConfirmModal = ({
  message,
  onConfirm,
  onCancel,
  isPermanent,
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
          {isPermanent ? "Permanent Action" : "Confirm Action"}
        </h3>
        <p className="text-slate-500 text-sm mb-6">{message}</p>
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
            {confirmLabel ?? (isPermanent ? "Delete Forever" : "Confirm")}
          </button>
        </div>
      </div>
    </div>
  </div>
);

const SECURITY_DEPOSIT_AMOUNT = 1000;

const FullPaymentConfirmModal = ({
  customer,
  amount,
  reservationFee,
  onConfirm,
  onCancel,
}) => {
  const [method, setMethod] = useState("Cash");
  const [depositMethod, setDepositMethod] = useState("Cash");
  const [depositCollected, setDepositCollected] = useState(false);
  const due = Math.max(0, (amount || 0) - (reservationFee || 200));

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4 mx-auto">
          <CheckCircle2 className="w-6 h-6 text-emerald-600" />
        </div>
        <h3 className="text-lg font-black text-[#171717] mb-2 text-center">
          Confirm Full Payment
        </h3>
        <p className="text-slate-500 text-sm mb-6 text-center">
          Confirm full payment for <strong>{customer}</strong>?
          <br />
          Amount Due:{" "}
          <span className="text-[#171717] font-black">
            ₱{due.toLocaleString()}
          </span>
        </p>

        <div className="mb-6">
          <label className="block text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase mb-2">
            Payment Method (Full)
          </label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-[#171717] focus:outline-none focus:border-[#b50002]/30"
          >
            <option value="Cash">Cash</option>
            <option value="GCash">GCash</option>
            <option value="PayMaya">PayMaya</option>
            <option value="Bank Transfer">Bank Transfer</option>
          </select>
        </div>

        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={depositCollected}
              onChange={(e) => setDepositCollected(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-[#b50002]"
            />
            <span className="text-sm text-[#171717]">
              <span className="font-bold">
                Collected ₱{SECURITY_DEPOSIT_AMOUNT.toLocaleString()} refundable
                security deposit
              </span>
              <br />
              <span className="text-slate-500 text-xs">
                Required before releasing the motorcycle to the renter.
              </span>
            </span>
          </label>

          {depositCollected && (
            <div className="mt-3">
              <label className="block text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase mb-2">
                Deposit Collection Method
              </label>
              <select
                value={depositMethod}
                onChange={(e) => setDepositMethod(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-[#171717] focus:outline-none focus:border-[#b50002]/30"
              >
                <option value="Cash">Cash</option>
                <option value="GCash">GCash</option>
                <option value="PayMaya">PayMaya</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={!depositCollected}
            onClick={() => onConfirm(method, depositMethod)}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all ${
              depositCollected
                ? "bg-emerald-600 text-white shadow-emerald-600/30 hover:brightness-110"
                : "bg-slate-200 text-slate-400 shadow-none cursor-not-allowed"
            }`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

const AlertModal = ({ message, onClose, isError }) => (
  <div
    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
    onClick={onClose}
  >
    <div
      className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-100"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="text-center">
        <div
          className={`mx-auto w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${isError ? "bg-red-50" : "bg-emerald-50"}`}
        >
          {isError ? (
            <AlertTriangle className="w-6 h-6 text-[#b50002]" />
          ) : (
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          )}
        </div>
        <h3 className="text-lg font-black text-[#171717] mb-2">
          {isError ? "Error" : "Notice"}
        </h3>
        <p className="text-slate-500 text-sm mb-6">{message}</p>
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-[#171717] text-white font-bold text-sm hover:brightness-110 transition-all"
        >
          OK
        </button>
      </div>
    </div>
  </div>
);

const ReuploadCommentModal = ({
  defaultValue,
  onCancel,
  onSubmit,
  submitting,
}) => {
  const [comment, setComment] = useState(defaultValue || "");
  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      onClick={!submitting ? onCancel : undefined}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center mb-4">
          <Upload className="w-6 h-6 text-orange-500" />
        </div>
        <h3 className="text-lg font-black text-[#171717] mb-1">
          Request Re-upload
        </h3>
        <p className="text-slate-400 text-sm mb-4">
          Enter a clear reason so the renter knows what to fix.
        </p>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[#171717] text-sm placeholder-slate-300 focus:outline-none focus:border-[#b50002]/30 resize-none mb-4"
          placeholder="Please re-upload a clearer payment receipt."
        />
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(comment)}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl bg-[#b50002] text-white font-bold text-sm shadow-md shadow-[#b50002]/30 hover:brightness-110 transition-all disabled:opacity-60"
          >
            {submitting ? "Sending..." : "Send Request"}
          </button>
        </div>
      </div>
    </div>
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

// ── Stat Card ─────────────────────────────────────────────────────────────────
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

// ── Sort Icon ─────────────────────────────────────────────────────────────────
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

// ── Skeleton Row ──────────────────────────────────────────────────────────────
const SkeletonRow = () => (
  <tr>
    {[...Array(8)].map((_, i) => (
      <td key={i} className="px-5 py-3.5">
        <div
          className="h-4 bg-slate-100 rounded-lg animate-pulse"
          style={{ width: `${50 + i * 6}%` }}
        />
      </td>
    ))}
  </tr>
);

// ── Pagination ────────────────────────────────────────────────────────────────
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
        className="p-2 rounded-xl border border-slate-100 bg-white text-slate-400 disabled:opacity-30 hover:border-[#b50002]/20 hover:text-[#b50002] transition-all shadow-sm"
      >
        <FaChevronLeft className="text-xs" />
      </button>
      {withEllipsis.map((item, idx) =>
        item === "..." ? (
          <span key={`e-${idx}`} className="px-2 text-slate-400 text-sm">
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
        className="p-2 rounded-xl border border-slate-100 bg-white text-slate-400 disabled:opacity-30 hover:border-[#b50002]/20 hover:text-[#b50002] transition-all shadow-sm"
      >
        <FaChevronRight className="text-xs" />
      </button>
    </div>
  );
};

// ── Status Badge ──────────────────────────────────────────────────────────────
const STATUS_STYLE = {
  pending_reservation: "bg-amber-50 text-amber-600 border-amber-200",
  pending_full_payment: "bg-orange-50 text-orange-600 border-orange-200",
  pending: "bg-amber-50 text-amber-600 border-amber-200",
  active: "bg-blue-50 text-blue-600 border-blue-200",
  inspection: "bg-violet-50 text-violet-600 border-violet-200",
  completed: "bg-emerald-50 text-emerald-600 border-emerald-200",
  cancelled: "bg-slate-50 text-slate-500 border-slate-200",
  rejected: "bg-red-50 text-[#b50002] border-red-200",
};

const STATUS_LABEL = {
  pending_reservation: "Pending Reservation",
  pending_full_payment: "Pending Full Payment",
  active: "Active",
  inspection: "Inspection",
  completed: "Completed",
  cancelled: "Cancelled",
  rejected: "Rejected",
};

const StatusBadge = ({ status, isDeleted }) => {
  const key = isDeleted ? "rejected" : status;
  const cls =
    STATUS_STYLE[key] ?? "bg-slate-50 text-slate-500 border-slate-200";
  const label = isDeleted
    ? "Rejected"
    : (STATUS_LABEL[status] ??
      String(status).charAt(0).toUpperCase() + String(status).slice(1));
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${cls}`}
    >
      {label}
    </span>
  );
};

// ── Payment Badge ─────────────────────────────────────────────────────────────
const PAYMENT_STYLE = {
  fully_paid: "bg-emerald-50 text-emerald-600 border-emerald-200",
  reservation_paid: "bg-orange-50 text-orange-600 border-orange-200",
  pending_verification: "bg-amber-50 text-amber-600 border-amber-200",
  pending: "bg-slate-50 text-slate-500 border-slate-200",
};

const PaymentBadge = ({ paymentStatus }) => {
  const cls = PAYMENT_STYLE[paymentStatus] ?? PAYMENT_STYLE.pending;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${cls}`}
    >
      {paymentLabel(paymentStatus)}
    </span>
  );
};

// ── Empty State ───────────────────────────────────────────────────────────────
const EmptyState = ({ onReset }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
      <FaSearch className="text-slate-200 text-3xl" />
    </div>
    <h3 className="font-black text-[#171717] text-lg mb-1">
      No bookings found
    </h3>
    <p className="text-slate-400 text-sm mb-4">
      Try adjusting your filters or search term
    </p>
    <button
      onClick={onReset}
      className="px-5 py-2 rounded-xl bg-[#b50002] text-white font-bold text-sm shadow-md shadow-[#b50002]/30 hover:brightness-110 transition-all"
    >
      Clear Filters
    </button>
  </div>
);

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

  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setPreviewImage(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const details = booking.details || {};
  // const latestExtension = Array.isArray(booking.extensions)
  //   ? booking.extensions[booking.extensions.length - 1]
  //   : null;
  // const originalReturnDate = latestExtension?.previousReturnDate || null;
  // const originalReturnTime = latestExtension?.previousReturnTime || "";
  const isEditLocked = ["completed", "cancelled", "inspection"].includes(
    booking.status,
  );
  const allowedStatusOptions = getAllowedNextStatuses(booking.status);

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

  // True original return date BEFORE any extensions were made. The promo
  // code applied at checkout must stay pinned to the amount it actually
  // discounted at the time — `days`/`baseRental` above reflect the CURRENT
  // (post-extension) duration and grow with every extension, so computing
  // the original discount against them made it look like it was
  // stacking/accumulating even though it was only ever applied once.
  const firstExtensionRecord =
    Array.isArray(booking.extensions) && booking.extensions.length > 0
      ? booking.extensions[0]
      : null;
  const originalReturnDateForDiscount = firstExtensionRecord?.previousReturnDate
    ? new Date(firstExtensionRecord.previousReturnDate)
    : returnDate;
  const originalBookingDays =
    pickupDate && originalReturnDateForDiscount
      ? Math.max(
          1,
          Math.ceil(
            (originalReturnDateForDiscount - pickupDate) /
              (1000 * 60 * 60 * 24),
          ),
        )
      : days;
  const originalBookingBaseRental = dailyRate * originalBookingDays;
  const reservationFee = booking.reservationFee || 200;
  const storedDistanceFee = details.distanceFee;
  const storedHelmetFee = details.helmetFee;
  const helmetRequested = details.helmetRequested;
  const knownExtras =
    (storedDistanceFee != null ? storedDistanceFee : 0) +
    (helmetRequested && storedHelmetFee != null ? storedHelmetFee : 0);
  const derivedExtra = Math.max(
    0,
    (booking.amount || 0) - baseRental - reservationFee - knownExtras,
  );
  const distanceFee =
    storedDistanceFee != null
      ? storedDistanceFee
      : derivedExtra > 0
        ? derivedExtra
        : 0;
  const helmetFee =
    storedHelmetFee != null ? storedHelmetFee : helmetRequested ? 100 : 0;

  const handleSave = async () => {
    if (!allowedStatusOptions.includes(newStatus)) return;
    await onEditStatus(booking.id, newStatus);
    setIsEditing(false);
  };

  const Section = ({ title, children }) => (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-50">
        <h3 className="text-[10px] font-black tracking-[0.15em] text-slate-400 uppercase">
          {title}
        </h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );

  const Row = ({ icon: Icon, label, value, valueClass = "" }) => (
    <div className="flex items-start gap-3">
      <Icon className="text-[#b50002] text-sm flex-shrink-0 mt-0.5" />
      <span className="text-slate-400 text-xs w-28 flex-shrink-0 font-medium pt-0.5">
        {label}
      </span>
      <span
        className={`text-[#171717] text-sm font-semibold flex-1 ${valueClass}`}
      >
        {value}
      </span>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#f7f8fa] max-h-[90vh] overflow-y-auto shadow-2xl rounded-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between shadow-sm rounded-t-2xl">
          {/* ... existing header content ... */}
          <div>
            <p className="text-[10px] font-bold tracking-[0.15em] text-[#b50002] uppercase mb-0.5">
              Booking Detail
            </p>
            <h2 className="font-black text-[#171717] text-lg leading-tight">
              {booking.customer}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {booking.motorcycle}
              {booking.unitId ? ` · ${booking.unitId}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* ... existing action buttons ... */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors"
            >
              <FaTimes />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Status + Amount row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <p className={labelCls}>Status</p>
              <div className="flex flex-col gap-2">
                <StatusBadge
                  status={booking.status}
                  isDeleted={booking.isDeleted}
                />
                <PaymentBadge paymentStatus={booking.paymentStatus} />
              </div>
              {!booking.isDeleted &&
                !isEditLocked &&
                allowedStatusOptions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-50">
                    {isEditing ? (
                      <div className="flex gap-2">
                        <select
                          value={newStatus}
                          onChange={(e) => setNewStatus(e.target.value)}
                          className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-slate-200 text-[#171717] focus:outline-none focus:border-[#b50002]/30"
                        >
                          {allowedStatusOptions.map((opt) => (
                            <option value={opt} key={opt}>
                              {opt.charAt(0).toUpperCase() + opt.slice(1)}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={handleSave}
                          className="px-2 py-1.5 rounded-lg bg-[#b50002] text-white font-bold text-xs"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setIsEditing(false)}
                          className="px-2 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setNewStatus(allowedStatusOptions[0]);
                          setIsEditing(true);
                        }}
                        className="flex items-center gap-1.5 text-[11px] font-bold text-[#b50002] hover:underline"
                      >
                        <FaEdit className="text-[10px]" /> Edit Status
                      </button>
                    )}
                  </div>
                )}
            </div>
            <div className="bg-[#171717] rounded-2xl p-4 flex flex-col justify-between">
              <p className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase mb-1">
                Total Amount
              </p>
              <p className="text-3xl font-black text-white">
                {/* Wrap in Math.round() below */}₱
                {Math.round(booking.amount || 0).toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Due at pickup:{" "}
                <span className="text-white font-bold">
                  ₱{/* Wrap in Math.round() below */}
                  {Math.round(
                    Math.max(0, (booking.amount || 0) - reservationFee),
                  ).toLocaleString()}
                </span>
              </p>
            </div>
          </div>

          {/* Fee Breakdown */}
          <Section title="Fee Breakdown">
            <div className="space-y-2.5 text-sm">
              {/* Base Rental */}
              {dailyRate > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">
                    Rate/day (₱{Math.round(dailyRate).toLocaleString("en-US")} ×{" "}
                    {days}d)
                  </span>
                  <span className="font-bold text-[#171717]">
                    ₱{Math.round(baseRental).toLocaleString("en-US")}
                  </span>
                </div>
              )}

              {/* Applied Discount */}
              {details.appliedDiscount && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">
                    Promo ({details.appliedDiscount.code || "Discount"})
                  </span>
                  <span className="font-bold text-emerald-600">
                    -₱
                    {Math.round(
                      details.appliedDiscount.discountType === "percentage"
                        ? (originalBookingBaseRental *
                            details.appliedDiscount.discountValue) /
                            100
                        : Math.min(
                            details.appliedDiscount.discountValue,
                            originalBookingBaseRental,
                          ),
                    ).toLocaleString("en-US")}
                  </span>
                </div>
              )}

              {/* Distance Fee */}
              {distanceFee > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <FaMapMarkerAlt className="text-orange-400 text-xs" />
                    Distance Fee
                    {details.distanceTierLabel && (
                      <span className="text-[11px] text-slate-400">
                        ({details.distanceTierLabel})
                      </span>
                    )}
                  </span>
                  <span className="font-bold text-orange-500">
                    +₱{Math.round(distanceFee).toLocaleString("en-US")}
                  </span>
                </div>
              )}

              {/* Helmet Fee */}
              {(helmetRequested || helmetFee > 0) && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <FaHardHat className="text-[#b50002] text-xs" /> Additional
                    Helmet
                  </span>
                  <span className="font-bold text-[#b50002]">
                    +₱{Math.round(helmetFee).toLocaleString("en-US")}
                  </span>
                </div>
              )}

              {/* Extension Fee */}
              {((booking.extensionFee || details.extensionFee) > 0 ||
                booking.extensions?.length > 0) && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Extension Fee</span>
                  <span className="font-bold text-orange-500">
                    +₱
                    {Math.round(
                      booking.extensionFee ||
                        details.extensionFee ||
                        (booking.extensions || []).reduce(
                          (sum, ext) =>
                            sum +
                            (ext.additionalAmount || ext.extensionFee || 0),
                          0,
                        ),
                    ).toLocaleString("en-US")}
                  </span>
                </div>
              )}

              {/* Promo code(s) used specifically on an extension — kept
                  separate from the original checkout promo shown above,
                  since it isn't carried over/reapplied automatically. */}
              {(booking.extensions || [])
                .filter((ext) => ext.appliedDiscount?.code)
                .map((ext, idx) => (
                  <div
                    key={ext._id || idx}
                    className="flex items-center justify-between pl-4"
                  >
                    <span className="text-slate-400 text-[11px]">
                      ↳ Promo ({ext.appliedDiscount.code}) on extension
                    </span>
                    <span className="font-semibold text-emerald-600 text-[11px]">
                      {ext.appliedDiscount.discountType === "percentage"
                        ? `${ext.appliedDiscount.discountValue}% off`
                        : `-₱${Math.round(
                            ext.appliedDiscount.discountValue,
                          ).toLocaleString("en-US")}`}
                    </span>
                  </div>
                ))}

              {/* Reschedule Fee */}
              {((booking.rescheduleFee || details.rescheduleFee) > 0 ||
                booking.reschedules?.length > 0) && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Reschedule Fee</span>
                  <span className="font-bold text-orange-500">
                    +₱
                    {Math.round(
                      booking.rescheduleFee ||
                        details.rescheduleFee ||
                        (booking.reschedules || []).reduce(
                          (sum, res) =>
                            sum +
                            (res.rescheduleFee || res.additionalAmount || 0),
                          0,
                        ),
                    ).toLocaleString("en-US")}
                  </span>
                </div>
              )}

              {/* Penalty */}
              {booking.returnInspection?.clearanceStatus ===
                "penalty_required" &&
                booking.returnInspection?.penaltyAmount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Penalty</span>
                    <span
                      className={`font-bold ${booking.returnInspection?.penaltySettled ? "text-emerald-600" : "text-[#b50002]"}`}
                    >
                      +₱
                      {Math.round(
                        booking.returnInspection.penaltyAmount,
                      ).toLocaleString("en-US")}
                    </span>
                  </div>
                )}

              <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
                <span className="font-bold text-[#171717]">Total</span>
                <span className="font-black text-[#171717]">
                  ₱{Math.round(booking.amount || 0).toLocaleString("en-US")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <FaCreditCard className="text-[#b50002] text-xs" />{" "}
                  Downpayment (paid)
                </span>
                <span className="font-bold text-emerald-600">
                  −₱{Math.round(reservationFee).toLocaleString("en-US")}
                </span>
              </div>
              <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
                <span className="font-bold text-[#171717]">Due at Pickup</span>
                <span className="font-black text-[#b50002]">
                  ₱
                  {Math.round(
                    Math.max(0, (booking.amount || 0) - reservationFee),
                  ).toLocaleString("en-US")}
                </span>
              </div>
              {!["active", "inspection", "completed"].includes(
                booking.status,
              ) &&
                !booking.securityDeposit?.collected && (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Plus a ₱1,000 refundable security deposit collected at
                    pickup.
                  </p>
                )}
            </div>
          </Section>

          {/* Extension */}
          {/* {latestExtension && (
            <Section title="Extension Details">
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Original Pickup</span>
                  <span className="font-semibold text-[#171717]">
                    {formatDate(booking.pickupDate)}
                    {booking.pickupTime &&
                      ` · ${formatTime(booking.pickupTime)}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Original Return</span>
                  <span className="font-semibold text-[#171717]">
                    {formatDate(originalReturnDate || booking.returnDate)}
                    {(originalReturnTime || booking.returnTime) &&
                      ` · ${formatTime(originalReturnTime || booking.returnTime)}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Extended Return</span>
                  <span className="font-semibold text-[#171717]">
                    {formatDate(booking.returnDate)}
                    {booking.returnTime &&
                      ` · ${formatTime(booking.returnTime)}`}
                  </span>
                </div>
                <div className="border-t border-slate-100 pt-2 flex justify-between">
                  <span className="font-bold text-[#171717]">
                    Additional Due
                  </span>
                  <span className="font-black text-[#b50002]">
                    +₱
                    {Number(
                      latestExtension.additionalAmount || 0,
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
            </Section>
          )} */}

          {/* Motorcycle */}
          <Section title="Unit Details">
            <div className="flex items-center gap-4 mb-4">
              {booking.motorcycleImage && (
                <div className="w-20 h-14 flex-shrink-0 rounded-xl overflow-hidden bg-slate-50 border border-slate-100">
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
                <p className="font-black text-[#171717]">
                  {booking.motorcycle}
                </p>
                {booking.unitId && (
                  <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-red-50 border border-red-100 text-[11px] font-bold text-[#b50002]">
                    <FaIdBadge className="text-[10px]" /> {booking.unitId}
                  </span>
                )}
                {booking.dailyRate > 0 && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    ₱{booking.dailyRate.toLocaleString()}/day
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                {
                  icon: FaGasPump,
                  val: details.fuel || booking.motorcycleFuel || "—",
                },
                {
                  icon: FaCog,
                  val:
                    details.engineSize || booking.motorcycleEngineSize
                      ? `${details.engineSize || booking.motorcycleEngineSize}cc`
                      : "—",
                },
                {
                  icon: FaCog,
                  val:
                    details.transmission ||
                    booking.motorcycleTransmission ||
                    "—",
                },
                {
                  icon: FaShieldAlt,
                  val: `ABS: ${(details.hasABS ?? booking.motorcycleHasABS) ? "Yes" : "No"}`,
                },
              ].map(({ icon: Icon, val }, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Icon className="text-[#b50002] text-xs flex-shrink-0" />
                  <span className="text-xs text-slate-600 font-medium">
                    {val}
                  </span>
                </div>
              ))}
            </div>
          </Section>

          {/* Customer */}
          <Section title="Customer">
            <div className="space-y-2.5">
              <Row icon={FaUser} label="Name" value={booking.customer} />
              <Row
                icon={FaEnvelope}
                label="Email"
                value={booking.email || "—"}
              />
              <Row icon={FaPhone} label="Phone" value={booking.phone || "—"} />
              <Row
                icon={FaMapMarkerAlt}
                label="Address"
                value={buildFullAddress(booking.address)}
              />
            </div>
          </Section>

          {/* Payment Proof */}
          <Section title="Payment Proof">
            <div className="space-y-2.5">
              <Row
                icon={FaReceipt}
                label="Reference ID"
                value={booking.paymentReferenceId || "—"}
              />
              <Row
                icon={FaMoneyBillWave}
                label="Amount Sent"
                value={
                  booking.paymentSentAmount
                    ? `₱${Number(booking.paymentSentAmount).toLocaleString()}`
                    : "—"
                }
              />
              <Row
                icon={FaClock}
                label="Payment Time"
                value={
                  booking.paymentSentAt
                    ? formatDateTime(booking.paymentSentAt)
                    : "—"
                }
              />
              <Row
                icon={FaCheckCircle}
                label="Receipt Check"
                value={`${booking.receiptVerification?.status || "pending"}${typeof booking.receiptVerification?.score === "number" ? ` (${booking.receiptVerification.score}%)` : ""}`}
              />
              <Row
                icon={FaInfoCircle}
                label="Admin Review"
                value={`${booking.requiresProofReupload ? "Re-upload requested" : "No action needed"}${booking.adminReviewComment ? `: ${booking.adminReviewComment}` : ""}`}
              />
              {booking.paymentProofImage && (
                <div className="pt-2">
                  <img
                    src={makeImageUrl(booking.paymentProofImage)}
                    alt="Payment proof"
                    onClick={() =>
                      setPreviewImage(makeImageUrl(booking.paymentProofImage))
                    }
                    className="max-h-64 w-full object-contain rounded-xl border border-slate-100 bg-slate-50 cursor-pointer hover:opacity-80 transition-opacity"
                  />
                </div>
              )}
            </div>
          </Section>

          {/* Booking Details */}
          <Section title="Booking Details">
            <div className="space-y-2.5">
              <Row
                icon={FaCalendarAlt}
                label="Pickup"
                value={`${formatDate(booking.pickupDate)}${booking.pickupTime ? ` · ${formatTime(booking.pickupTime)}` : ""}`}
              />
              <Row
                icon={FaCalendarAlt}
                label="Return"
                value={`${formatDate(booking.returnDate)}${booking.returnTime ? ` · ${formatTime(booking.returnTime)}` : ""}`}
              />
              <Row
                icon={FaClock}
                label="Duration"
                value={`${days} ${days === 1 ? "day" : "days"}`}
              />
              <Row
                icon={FaCalendarAlt}
                label="Booked on"
                value={formatDateTime(booking.bookingDate)}
              />
              <Row
                icon={FaMapMarkerAlt}
                label="Destination"
                value={booking.destination || "—"}
              />
              <Row
                icon={FaCreditCard}
                label="Reservation"
                value={`₱${booking.reservationFee || 200} — ${booking.reservationFeePaid ? "Paid" : "Unpaid"}`}
              />
              {booking.reservationPaymentMethod && (
                <Row
                  icon={FaCreditCard}
                  label="Payment Method (Res)"
                  value={booking.reservationPaymentMethod}
                />
              )}
              {booking.fullPaymentMethod && (
                <Row
                  icon={FaCreditCard}
                  label="Payment Method (Full)"
                  value={booking.fullPaymentMethod}
                />
              )}
              {booking.isDeleted && booking.deletedAt && (
                <Row
                  icon={FaBan}
                  label="Rejected on"
                  value={formatDate(booking.deletedAt)}
                  valueClass="text-[#b50002]"
                />
              )}
            </div>
          </Section>

          {/* Security Deposit */}
          {booking.securityDeposit?.collected && (
            <Section title="Security Deposit">
              <div
                className={`rounded-xl border p-4 ${
                  !booking.securityDeposit.returned
                    ? "bg-amber-50 border-amber-200"
                    : booking.securityDeposit.deductions > 0
                      ? "bg-orange-50 border-orange-200"
                      : "bg-emerald-50 border-emerald-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FaShieldAlt
                      className={
                        !booking.securityDeposit.returned
                          ? "text-amber-600"
                          : booking.securityDeposit.deductions > 0
                            ? "text-orange-600"
                            : "text-emerald-600"
                      }
                    />
                    <span
                      className={`text-xs font-bold ${
                        !booking.securityDeposit.returned
                          ? "text-amber-800"
                          : booking.securityDeposit.deductions > 0
                            ? "text-orange-800"
                            : "text-emerald-800"
                      }`}
                    >
                      Security Deposit (₱
                      {(
                        booking.securityDeposit.amount || 1000
                      ).toLocaleString()}
                      )
                    </span>
                  </div>
                  <span
                    className={`text-xs font-black ${
                      !booking.securityDeposit.returned
                        ? "text-amber-700"
                        : booking.securityDeposit.deductions > 0
                          ? "text-orange-700"
                          : "text-emerald-700"
                    }`}
                  >
                    {!booking.securityDeposit.returned
                      ? "Held (Refundable)"
                      : booking.securityDeposit.deductions > 0
                        ? "Partially Refunded"
                        : "Fully Refunded"}
                  </span>
                </div>

                {!booking.securityDeposit.returned && (
                  <p className="text-[11px] text-slate-500 mt-2 pl-6">
                    Collected via{" "}
                    {booking.securityDeposit.collectionMethod || "Cash"}
                  </p>
                )}

                {/* Breakdown once the return inspection has settled the deposit */}
                {booking.securityDeposit.returned && (
                  <div
                    className={`mt-3 pt-3 border-t space-y-1.5 ${
                      booking.securityDeposit.deductions > 0
                        ? "border-orange-200"
                        : "border-emerald-200"
                    }`}
                  >
                    {booking.securityDeposit.deductions > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-orange-800">
                          Deducted for violations
                        </span>
                        <span className="text-[11px] font-bold text-orange-700">
                          −₱
                          {Number(
                            booking.securityDeposit.deductions,
                          ).toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">
                        Refunded to customer
                      </span>
                      <span
                        className={`text-xs font-black ${
                          booking.securityDeposit.deductions > 0
                            ? "text-orange-700"
                            : "text-emerald-700"
                        }`}
                      >
                        ₱
                        {Number(
                          booking.securityDeposit.returnedAmount || 0,
                        ).toLocaleString()}
                      </span>
                    </div>
                    {booking.securityDeposit.balanceDue > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[#b50002]">
                          Balance still owed
                        </span>
                        <span className="text-xs font-black text-[#b50002]">
                          ₱
                          {Number(
                            booking.securityDeposit.balanceDue,
                          ).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {booking.securityDeposit.refundReason && (
                      <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                        {booking.securityDeposit.refundReason}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Tracking Summary */}
          <Section title="Trip Tracking Summary">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <FaRoad className="text-[#b50002] text-sm flex-shrink-0" />
                  <span className="text-slate-400 text-xs font-medium">
                    Total Distance
                  </span>
                </div>
                <span className="text-[#171717] text-sm font-semibold pl-6">
                  {booking.trackingSummary
                    ? `${(booking.trackingSummary.totalDistanceKm ?? 0).toFixed(2)} km`
                    : "—"}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <FaTachometerAlt className="text-[#b50002] text-sm flex-shrink-0" />
                  <span className="text-slate-400 text-xs font-medium">
                    Avg Speed
                  </span>
                </div>
                <span className="text-[#171717] text-sm font-semibold pl-6">
                  {booking.trackingSummary
                    ? `${(booking.trackingSummary.avgSpeedKmh ?? 0).toFixed(1)} km/h`
                    : "—"}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <FaTachometerAlt className="text-[#b50002] text-sm flex-shrink-0" />
                  <span className="text-slate-400 text-xs font-medium">
                    Max Speed
                  </span>
                </div>
                <span className="text-[#171717] text-sm font-semibold pl-6">
                  {booking.trackingSummary
                    ? `${(booking.trackingSummary.maxSpeedKmh ?? 0).toFixed(1)} km/h`
                    : "—"}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <FaMapMarkerAlt className="text-[#b50002] text-sm flex-shrink-0" />
                  <span className="text-slate-400 text-xs font-medium">
                    Stops Made
                  </span>
                </div>
                <span className="text-[#171717] text-sm font-semibold pl-6">
                  {booking.trackingSummary
                    ? (booking.trackingSummary.stopsMade ?? 0)
                    : "—"}
                </span>
              </div>
            </div>
            {booking.trackingSummary?.lastUpdatedAt && (
              <p className="text-[10px] text-slate-400 mt-3 text-right">
                Last updated:{" "}
                {formatDateTime(booking.trackingSummary.lastUpdatedAt)}
              </p>
            )}
            {!booking.trackingSummary && (
              <p className="text-[11px] text-slate-400 mt-1">
                No tracking data recorded for this booking.
              </p>
            )}
          </Section>
        </div>
        {previewImage && (
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation(); // Prevents closing the DetailDrawer
              setPreviewImage(null);
            }}
          >
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-6 right-8 text-white hover:text-slate-300 transition-colors text-3xl"
            >
              <FaTimes />
            </button>
            <img
              src={previewImage}
              alt="Full screen preview"
              className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
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
  selectionMode = false,
  selectedIds,
  onToggleSelectRow,
  onToggleSelectAll,
  allVisibleSelected = false,
  someVisibleSelected = false,
}) => {
  const cols = [
    { label: "Customer", key: "customer", sortable: true },
    { label: "Unit", key: "motorcycle", sortable: true },
    { label: "Pickup", key: "pickupDate", sortable: true },
    { label: "Return", key: "returnDate", sortable: true },
    { label: "Booked", key: "bookingDate", sortable: true },
    { label: "Amount", key: "amount", sortable: true },
    { label: "Payment", key: "paymentStatus", sortable: true },
    { label: "Status", key: null, sortable: false },
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
                  className={`text-left text-[10px] font-black tracking-[0.15em] text-slate-300 uppercase px-5 py-3 whitespace-nowrap
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
            {bookings.map((booking) => (
              <tr
                key={booking.id}
                onClick={() => onRowClick(booking)}
                className={`hover:bg-slate-50/60 transition-colors cursor-pointer ${booking.isDeleted ? "opacity-50" : ""} ${selectionMode && selectedIds?.has(booking.id) ? "bg-red-50/40" : ""}`}
              >
                {selectionMode && (
                  <td
                    className="px-5 py-3.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => onToggleSelectRow?.(booking.id)}
                      className="flex items-center justify-center"
                    >
                      {selectedIds?.has(booking.id) ? (
                        <CheckSquare className="w-4 h-4 text-[#b50002]" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-300" />
                      )}
                    </button>
                  </td>
                )}
                {/* Customer */}
                <td className="px-5 py-3.5">
                  <p className="font-black text-[13px] text-[#171717] leading-tight">
                    {booking.customer}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate max-w-[140px]">
                    {booking.email}
                  </p>
                </td>

                {/* Motorcycle */}
                <td className="px-5 py-3.5">
                  <p className="font-bold text-[13px] text-[#171717]">
                    {booking.motorcycle}
                  </p>
                  {booking.unitId && (
                    <span className="text-[11px] font-black text-[#b50002] tracking-wider uppercase">
                      {booking.unitId}
                    </span>
                  )}
                </td>

                {/* Pickup */}
                <td className="px-5 py-3.5">
                  <p className="text-[13px] text-slate-600">
                    {formatDate(booking.pickupDate)}
                  </p>
                  {booking.pickupTime && (
                    <p className="text-[11px] text-[#b50002] font-bold">
                      {formatTime(booking.pickupTime)}
                    </p>
                  )}
                </td>

                {/* Return */}
                <td className="px-5 py-3.5">
                  <p className="text-[13px] text-slate-600">
                    {formatDate(booking.returnDate)}
                  </p>
                  {booking.returnTime && (
                    <p className="text-[11px] text-[#b50002] font-bold">
                      {formatTime(booking.returnTime)}
                    </p>
                  )}
                </td>

                {/* Booked */}
                <td className="px-5 py-3.5">
                  <p className="text-[13px] text-slate-500">
                    {formatDateTime(booking.bookingDate)}
                  </p>
                </td>

                {/* Amount */}
                <td className="px-5 py-3.5">
                  <span className="font-black text-[13px] text-[#171717]">
                    {/* Wrap in Math.round() below */}₱
                    {Math.round(booking.amount || 0).toLocaleString()}
                  </span>
                </td>

                {/* Payment */}
                <td className="px-5 py-3.5">
                  <PaymentBadge paymentStatus={booking.paymentStatus} />
                </td>

                {/* Status */}
                <td className="px-5 py-3.5">
                  <StatusBadge
                    status={booking.status}
                    isDeleted={booking.isDeleted}
                  />
                </td>

                {/* Actions */}
                <td
                  className="px-5 py-3.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-1.5">
                    {booking.isDeleted ? (
                      <>
                        <button
                          onClick={(e) => onRestore(e, booking.id)}
                          title="Restore"
                          className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => onDelete(e, booking.id, true)}
                          title="Reject Forever"
                          className="p-1.5 rounded-lg bg-red-50 text-[#b50002] hover:bg-red-100 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
                            title={
                              booking.status === "pending_reservation"
                                ? "Confirm Reservation"
                                : "Confirm Full Payment"
                            }
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {booking.status === "pending_reservation" && (
                          <button
                            onClick={(e) => onRequestReupload(e, booking.id)}
                            title="Request Re-upload"
                            className="p-1.5 rounded-lg bg-orange-50 text-orange-500 hover:bg-orange-100 transition-colors"
                          >
                            <Upload className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {!["completed", "cancelled", "inspection"].includes(
                          booking.status,
                        ) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditStatus(
                                booking.id,
                                booking.status,
                                booking.paymentStatus,
                              );
                            }}
                            title="Edit Status"
                            className="p-1.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors"
                          >
                            <FaEdit className="text-sm" />
                          </button>
                        )}
                        {!["active", "completed", "inspection"].includes(
                          booking.status,
                        ) && (
                          <button
                            onClick={(e) => onDelete(e, booking.id, false)}
                            title="Reject"
                            className="p-1.5 rounded-lg bg-red-50 text-[#b50002] hover:bg-red-100 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

// ── Edit Status Modal ─────────────────────────────────────────────────────────
const EditStatusModal = ({
  bookingId,
  currentStatus,
  paymentStatus,
  onSave,
  onCancel,
}) => {
  const filteredStatuses = getAllowedNextStatuses(currentStatus);
  const [newStatus, setNewStatus] = useState(
    filteredStatuses[0] || currentStatus,
  );

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
          <FaEdit className="text-[#b50002] text-lg" />
        </div>
        <h3 className="text-lg font-black text-[#171717] mb-1">
          Edit Booking Status
        </h3>
        <p className="text-slate-400 text-sm mb-4">
          Select the new status for this booking.
        </p>
        <select
          value={newStatus}
          onChange={(e) => setNewStatus(e.target.value)}
          disabled={filteredStatuses.length === 0}
          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-[#171717] focus:outline-none focus:border-[#b50002]/30 mb-4"
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
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(bookingId, newStatus)}
            disabled={filteredStatuses.length === 0}
            className="flex-1 py-2.5 rounded-xl bg-[#b50002] text-white font-bold text-sm shadow-md shadow-[#b50002]/30 hover:brightness-110 transition-all disabled:opacity-60"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const MotorcycleBooking = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
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

  // Custom Modal Data for Full Payment
  const [fullPaymentData, setFullPaymentData] = useState(null);

  // ── Bulk selection state ──────────────────────────────────────────────────
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

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
          extensions: Array.isArray(b.extensions) ? b.extensions : [],
          destination: b.destination || "Not specified",
          bookingDate: b.bookingDate || b.createdAt || "",
          status: normalizedStatus.toString(),
          amount: b.amount ?? b.total ?? 0,
          reservationFee: b.reservationFee || 200,
          reservationFeePaid: b.reservationFeePaid || false,
          paymentStatus: b.paymentStatus || "pending_verification",
          reservationPaymentMethod: b.reservationPaymentMethod || "",
          fullPaymentMethod: b.fullPaymentMethod || "",
          securityDeposit: b.securityDeposit || null,
          paymentProofImage: b.paymentProofImage || "",
          paymentReferenceId: b.paymentReferenceId || "",
          paymentSentAmount: Number(b.paymentSentAmount || 0),
          paymentSentAt: b.paymentSentAt || "",
          receiptVerification: b.receiptVerification || null,
          requiresProofReupload: !!b.requiresProofReupload,
          adminReviewComment: b.adminReviewComment || "",
          adminReviewedAt: b.adminReviewedAt || null,
          details,
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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedStatus, colSort]);

  // Clear any bulk selection whenever the visible set of rows changes, so we
  // never act on rows the admin can no longer see.
  useEffect(() => {
    setSelectedIds(new Set());
  }, [searchTerm, selectedStatus, colSort, currentPage]);

  useEffect(() => {
    if (!selectionMode) setSelectedIds(new Set());
  }, [selectionMode]);

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
      inspection: bookings.filter(
        (b) => !b.isDeleted && b.status === "inspection",
      ).length,
      completed: bookings.filter(
        (b) => !b.isDeleted && b.status === "completed",
      ).length,
      cancelled: bookings.filter(
        (b) => !b.isDeleted && b.status === "cancelled",
      ).length,
      rejected: bookings.filter((b) => b.isDeleted).length,
    }),
    [bookings],
  );

  const handleColSort = (key) =>
    setColSort((prev) => {
      if (prev.key !== key) return { key, dir: "asc" };
      const next = nextSortState(prev.dir);
      return next === null ? { key: null, dir: null } : { key, dir: next };
    });

  const filteredBookings = useMemo(() => {
    let list = [...bookings];
    if (selectedStatus === "rejected") list = list.filter((b) => b.isDeleted);
    else list = list.filter((b) => !b.isDeleted && b.status === selectedStatus);
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
        let aVal = a[colSort.key],
          bVal = b[colSort.key];
        if (typeof aVal === "number" || (!isNaN(Number(aVal)) && aVal !== ""))
          return colSort.dir === "asc"
            ? Number(aVal) - Number(bVal)
            : Number(bVal) - Number(aVal);
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
        confirmLabel: permanent ? "Delete Forever" : "Yes, Reject",
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

  // Submits the Full Payment with chosen payment method, plus the required
  // security deposit collection details captured at pickup.
  const submitFullPayment = async (method, depositMethod) => {
    const { id, bookingId } = fullPaymentData;
    try {
      const response = await api.patch(
        `/api/motorcycle-bookings/${id}/confirm-payment`,
        {
          fullPaymentMethod: method,
          securityDepositCollected: true,
          securityDepositMethod: depositMethod || method,
        },
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
                fullPaymentMethod: updated.fullPaymentMethod || method,
                securityDeposit: updated.securityDeposit || b.securityDeposit,
              }
            : b,
        ),
      );

      if (drawerBooking?.id === bookingId) {
        setDrawerBooking((prev) => ({
          ...prev,
          status: updated.status || prev.status,
          paymentStatus: updated.paymentStatus || prev.paymentStatus,
          reservationFeePaid:
            updated.reservationFeePaid ?? prev.reservationFeePaid,
          fullPaymentMethod: updated.fullPaymentMethod || method,
          securityDeposit: updated.securityDeposit || prev.securityDeposit,
        }));
      }

      await alertModal(
        response?.data?.message || "Full payment confirmed successfully.",
      );
    } catch (err) {
      await alertModal(
        `Error: ${err.response?.data?.message || err.message || "Failed"}`,
        { isError: true },
      );
    } finally {
      setFullPaymentData(null);
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

    const isReservationStage =
      booking.status === "pending_reservation" || booking.status === "pending";

    // If it's a full payment, open our custom modal to choose payment method
    if (!isReservationStage) {
      setFullPaymentData({
        id: booking._id,
        bookingId: booking.id,
        customer: booking.customer,
        amount: booking.amount,
        reservationFee: booking.reservationFee || 200,
      });
      return;
    }

    // Otherwise, confirm the reservation as usual
    const confirmText = `Confirm reservation payment for ${booking.customer}? This will move the booking to Pending Full Payment and send a digital receipt.`;
    const confirmed = await confirmModal(confirmText, {
      confirmLabel: "Confirm Reservation",
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
        paginated.length > 0 && paginated.every((b) => prev.has(b.id));
      if (allSelected) return new Set();
      return new Set(paginated.map((b) => b.id));
    });
  };

  const allVisibleSelected =
    paginated.length > 0 && paginated.every((b) => selectedIds.has(b.id));
  const someVisibleSelected = paginated.some((b) => selectedIds.has(b.id));

  const handleBulkAction = async (actionKey) => {
    const config = BULK_ACTION_CONFIG[actionKey];
    const targets = bookings.filter((b) => selectedIds.has(b.id));
    if (!config || targets.length === 0) return;

    const plural = targets.length > 1;
    const confirmed = await confirmModal(
      `${config.label} ${targets.length} selected booking${plural ? "s" : ""}? This action will be applied to all of them.`,
      { confirmLabel: config.label },
    );
    if (!confirmed) return;

    setBulkProcessing(true);
    try {
      const results = await Promise.allSettled(
        targets.map((booking) => {
          if (!booking._id)
            return Promise.reject(new Error("Missing booking id"));
          switch (actionKey) {
            case "confirm":
              return api.patch(
                `/api/motorcycle-bookings/${booking._id}/confirm-payment`,
              );
            case "cancel":
              return api.patch(
                `/api/motorcycle-bookings/${booking._id}/status`,
                { status: "cancelled" },
              );
            case "inspection":
              return api.patch(
                `/api/motorcycle-bookings/${booking._id}/status`,
                { status: "inspection" },
              );
            case "reject":
              return api.delete(`/api/motorcycle-bookings/${booking._id}`);
            case "restore":
              return api.patch(
                `/api/motorcycle-bookings/${booking._id}/restore`,
              );
            default:
              return Promise.reject(new Error("Unknown action"));
          }
        }),
      );

      const failed = results.filter((r) => r.status === "rejected").length;
      const succeeded = results.length - failed;

      await fetchBookings();
      setSelectedIds(new Set());
      setSelectionMode(false);

      if (failed === 0) {
        await alertModal(
          `${succeeded} booking${succeeded > 1 ? "s" : ""} updated successfully.`,
        );
      } else {
        await alertModal(
          `${succeeded} booking${succeeded === 1 ? "" : "s"} updated, ${failed} failed. Please retry the failed booking${failed === 1 ? "" : "s"} individually.`,
          { isError: succeeded === 0 },
        );
      }
    } finally {
      setBulkProcessing(false);
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

  const statCards = [
    {
      label: "Pending Reservation",
      value: counts.pendingReservation,
      sub: "Awaiting confirmation",
      subColor: "text-amber-500",
      icon: Clock,
      accent: "bg-amber-500",
      status: "pending_reservation",
    },
    {
      label: "Pending Full Payment",
      value: counts.pendingFullPayment,
      sub: "Awaiting full payment",
      subColor: "text-orange-500",
      icon: CreditCard,
      accent: "bg-orange-500",
      status: "pending_full_payment",
    },
    {
      label: "Active",
      value: counts.active,
      sub: "Currently rented",
      subColor: "text-blue-500",
      icon: CheckCircle2,
      accent: "bg-blue-500",
      status: "active",
    },
    {
      label: "Inspection",
      value: counts.inspection,
      sub: "Under review",
      subColor: "text-violet-500",
      icon: ClipboardList,
      accent: "bg-violet-500",
      status: "inspection",
    },
    {
      label: "Completed",
      value: counts.completed,
      sub: "Successfully closed",
      subColor: "text-emerald-500",
      icon: CheckCircle2,
      accent: "bg-emerald-500",
      status: "completed",
    },
    {
      label: "Cancelled",
      value: counts.cancelled,
      sub: "Cancelled by user",
      subColor: "text-slate-400",
      icon: XCircle,
      accent: "bg-slate-400",
      status: "cancelled",
    },
    {
      label: "Rejected",
      value: counts.rejected,
      sub: "Soft rejected",
      subColor: "text-slate-400",
      icon: Trash2,
      accent: "bg-slate-400",
      status: "rejected",
    },
  ];

  const selectedStatusLabel =
    statCards.find((s) => s.status === selectedStatus)?.label ?? selectedStatus;

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pt-36">
        {/* Header */}
        <div className="mb-7">
          <h1 className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight">
            Booking Dashboard
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Monitor payment flow, verify receipts, and manage booking lifecycle.
          </p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 xl:grid-cols-7 gap-3 sm:gap-4 mb-6">
          {statCards.map((s) => (
            <StatCard
              key={s.label}
              {...s}
              loading={loading}
              isActive={selectedStatus === s.status}
              onClick={() => setSelectedStatus(s.status)}
            />
          ))}
        </div>

        {/* Search + toolbar */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 text-sm" />
              <input
                type="text"
                placeholder="Search by customer, unit name, unit ID, or email..."
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
                disabled={paginated.length === 0}
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
                  <span className="text-xs font-bold text-slate-400">
                    {selectedIds.size} selected
                  </span>
                  {getBulkActionsForStatus(selectedStatus).map((actionKey) => {
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
                </div>
              )}
            </div>
          )}
        </div>

        {/* Result count */}
        <div className="flex items-center justify-between px-1 mb-4">
          <p className="text-[11px] text-slate-400 font-semibold">
            Showing{" "}
            {filteredBookings.length === 0
              ? 0
              : Math.min(
                  (currentPage - 1) * ITEMS_PER_PAGE + 1,
                  filteredBookings.length,
                )}
            –{Math.min(currentPage * ITEMS_PER_PAGE, filteredBookings.length)}{" "}
            of{" "}
            <span className="text-[#171717] font-black">
              {filteredBookings.length}
            </span>{" "}
            <span>{selectedStatusLabel}</span> bookings
            {searchTerm && " (filtered)"}
          </p>
        </div>

        {/* Table */}
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
        ) : paginated.length === 0 ? (
          <EmptyState onReset={() => setSearchTerm("")} />
        ) : (
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

      {/* Edit Status Modal */}
      {editingId && (
        <EditStatusModal
          bookingId={editingId}
          currentStatus={editingCurrentStatus}
          paymentStatus={editingPaymentStatus}
          onSave={handleSaveStatus}
          onCancel={() => setEditingId(null)}
        />
      )}

      {/* Reupload Modal */}
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

      {/* Full Payment Modal */}
      {fullPaymentData && (
        <FullPaymentConfirmModal
          customer={fullPaymentData.customer}
          amount={fullPaymentData.amount}
          reservationFee={fullPaymentData.reservationFee}
          onCancel={() => setFullPaymentData(null)}
          onConfirm={submitFullPayment}
        />
      )}
    </div>
  );
};

export default MotorcycleBooking;
