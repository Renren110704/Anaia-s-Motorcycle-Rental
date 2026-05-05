import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import ReactDOM from "react-dom/client";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  FaMotorcycle,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaCreditCard,
  FaReceipt,
  FaArrowRight,
  FaHourglassHalf,
  FaPlayCircle,
  FaClock,
  FaHardHat,
  FaTrash,
  FaExclamationTriangle,
  FaInfoCircle,
  FaChevronLeft,
  FaChevronRight,
  FaChevronDown,
  FaChevronUp,
  FaFileDownload,
} from "react-icons/fa";
import Navbar from "../components/Navbar";
import API_BASE_URL from "../apiBase";

const API_BASE = API_BASE_URL;
const TIMEOUT = 30000;
const ITEMS_PER_PAGE = 8;
const DOWNPAYMENT = 200;
const BOOKINGS_CACHE_KEY = "my-bookings-cache-v1";
const ALL_TIME_SLOTS = [
  { value: "08:00", label: "8:00 AM" },
  { value: "09:00", label: "9:00 AM" },
  { value: "10:00", label: "10:00 AM" },
  { value: "11:00", label: "11:00 AM" },
  { value: "12:00", label: "12:00 PM" },
  { value: "13:00", label: "1:00 PM" },
  { value: "14:00", label: "2:00 PM" },
  { value: "15:00", label: "3:00 PM" },
  { value: "16:00", label: "4:00 PM" },
  { value: "17:00", label: "5:00 PM" },
  { value: "18:00", label: "6:00 PM" },
  { value: "19:00", label: "7:00 PM" },
  { value: "20:00", label: "8:00 PM" },
];

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

const ConfirmModal = ({ message, onConfirm, onCancel, confirmLabel }) => (
  <ModalShell onBackdropClick={onCancel}>
    <div className="text-center">
      <div className="mx-auto flex items-center justify-center h-16 w-16 mb-2">
        <FaExclamationTriangle className="h-8 w-8 text-[#b50002]" />
      </div>
      <h3 className="text-xl font-bold text-[#171717] mb-2">Confirm Action</h3>
      <p className="text-[#171717]/70 mb-6 text-sm">{message}</p>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#171717] text-white font-bold text-sm rounded-xl
                    shadow-lg shadow-[#171717]/30 hover:brightness-110 hover:scale-[1.01] active:scale-[0.98] transition-all duration-200"
        >
          No, Keep It
        </button>
        <button
          onClick={onConfirm}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#b50002] text-white font-bold text-sm rounded-xl
                    shadow-lg shadow-[#b50002]/30 hover:brightness-110 hover:scale-[1.01] active:scale-[0.98] transition-all duration-200"
        >
          {confirmLabel ?? "Confirm"}
        </button>
      </div>
    </div>
  </ModalShell>
);

const AlertModal = ({ message, onClose, isError }) => (
  <ModalShell onBackdropClick={onClose}>
    <div className="text-center">
      <div className="mx-auto flex items-center justify-center h-16 w-16 mb-2">
        {isError ? (
          <FaExclamationTriangle className="h-8 w-8 text-[#b50002]" />
        ) : (
          <FaInfoCircle className="h-8 w-8 text-[#171717]" />
        )}
      </div>
      <h3 className="text-xl font-bold text-[#171717] mb-2">
        {isError ? "Error" : "Notice"}
      </h3>
      <p className="text-[#171717]/70 mb-6 text-sm">{message}</p>
      <button
        onClick={onClose}
        className="w-full py-2.5 px-4 bg-[#b50002] hover:brightness-110 active:scale-[0.98] rounded-xl text-white text-sm font-bold shadow-lg shadow-[#b50002]/30 transition-all duration-200"
      >
        OK
      </button>
    </div>
  </ModalShell>
);

const confirmModal = (message, { confirmLabel } = {}) =>
  new Promise((resolve) => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);
    const cleanup = (result) => {
      root.unmount();
      document.body.removeChild(container);
      resolve(result);
    };
    root.render(
      <ConfirmModal
        message={message}
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
const safeAccess = (fn, fallback = "") => {
  try {
    const v = fn();
    return v === undefined || v === null ? fallback : v;
  } catch {
    return fallback;
  }
};

const formatDate = (dateString) => {
  if (!dateString) return "—";
  const d = new Date(dateString);
  return Number.isNaN(d.getTime())
    ? String(dateString)
    : d.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
};

const formatDateTime = (dateString) => {
  if (!dateString) return "—";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return String(dateString);
  const datePart = d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const hour = d.getHours();
  const min = String(d.getMinutes()).padStart(2, "0");
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${datePart} · ${displayHour}:${min} ${period}`;
};

const formatTime = (timeStr) => {
  if (!timeStr) return "";
  const [hourStr, minStr] = timeStr.split(":");
  const hour = parseInt(hourStr, 10);
  const min = minStr || "00";
  if (isNaN(hour)) return timeStr;
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${min} ${period}`;
};

const formatPrice = (price) => {
  const num = typeof price === "number" ? price : Number(price) || 0;
  return num.toLocaleString("en-US", {
    style: "currency",
    currency: "php",
    maximumFractionDigits: 0,
  });
};

const daysBetween = (start, end) => {
  try {
    const a = new Date(start);
    const b = new Date(end);
    if (Number.isNaN(a) || Number.isNaN(b)) return 0;
    return Math.ceil((b - a) / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
};

const toDateInput = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const parseLocalDateOnly = (dateStr) => {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map((n) => parseInt(n, 10));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 0, 0, 0, 0);
};

const formatDateInput = (dateObj) => {
  if (!(dateObj instanceof Date) || Number.isNaN(dateObj.getTime())) return "";
  return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;
};

const addDaysToDateInput = (dateStr, days) => {
  const d = parseLocalDateOnly(dateStr) || getTodayStart();
  d.setDate(d.getDate() + days);
  return formatDateInput(d);
};

const getTodayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const sevenDaysFromToday = () => {
  const d = getTodayStart();
  d.setDate(d.getDate() + 7);
  return d;
};

const sixMonthsFromToday = () => {
  const d = getTodayStart();
  d.setMonth(d.getMonth() + 6);
  return d;
};

const combineLocalDateTime = (dateStr, timeStr) => {
  const dateObj = parseLocalDateOnly(dateStr);
  if (!dateObj || !timeStr) return null;
  const [hourStr, minuteStr] = timeStr.split(":");
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr || "0", 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  dateObj.setHours(hour, minute, 0, 0);
  return dateObj;
};

const isTimeWithinRentalHours = (timeStr) => {
  if (!timeStr) return false;
  const [hourStr, minuteStr] = timeStr.split(":");
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr || "0", 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return false;
  const minutes = hour * 60 + minute;
  return minutes >= 8 * 60 && minutes <= 20 * 60;
};

const resolveImageUrl = (imagePath) => {
  if (!imagePath)
    return "https://via.placeholder.com/800x450.png?text=No+Image";
  if (/^data:image\//i.test(imagePath)) return imagePath;
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://"))
    return imagePath;
  // Handle Cloudinary partial URLs (starting with /dxta0nmdy/ or dxta0nmdy/)
  if (String(imagePath).startsWith('/dxta0nmdy/') || String(imagePath).startsWith('dxta0nmdy/')) {
    return `https://res.cloudinary.com/${String(imagePath).replace(/^\/+/, '')}`;
  }
  const cleanPath = imagePath.replace(/^\/+/, "").replace(/^uploads\//, "");
  return `${API_BASE}/uploads/${cleanPath}`;
};

const normalizeBooking = (booking) => {
  const getMotorcycleData = () => {
    if (!booking) return {};
    if (typeof booking.motorcycle === "string")
      return { name: booking.motorcycle };
    if (booking.motorcycle && typeof booking.motorcycle === "object") {
      const snapshot = { ...booking.motorcycle };
      if (snapshot.id && typeof snapshot.id === "object") {
        const populated = { ...snapshot.id };
        delete snapshot.id;
        return { ...snapshot, ...populated };
      }
      return snapshot;
    }
    return {};
  };

  const motorcycleObj = getMotorcycleData();
  const details = booking.details || {};
  const address = booking.address || {};
  const rawImage =
    safeAccess(() => booking.motorcycle?.image) ||
    safeAccess(() => motorcycleObj.image) ||
    safeAccess(() => booking.motorcycleImage) ||
    "";
  const resolveImageUrl = (image) => {
    if (!image) return "";
    if (Array.isArray(image)) image = image[0];
    if (typeof image !== "string") return "";
    const t = image.trim();
    if (!t) return "";
    if (/^data:image\//i.test(t)) return t;
    if (/^https?:\/\//i.test(t)) {
      // If it's a Cloudinary URL or any external URL, use as is
      return t;
    }
    if (t.includes("cloudinary")) return t;
    // Optionally, if you want to force all uploads to Cloudinary, build the URL here
    // return `${CLOUDINARY_BASE}/your-cloud-name/image/upload/${t}`;
    if (t.startsWith("/")) return `${API_BASE}${t}`;
    return `${API_BASE}/uploads/${t}`;
  };
  const image = resolveImageUrl(rawImage);
  const pickupDate =
    safeAccess(() => booking.pickupDate) ||
    safeAccess(() => booking.dates?.pickup) ||
    booking.pickup ||
    null;
  const returnDate =
    safeAccess(() => booking.returnDate) ||
    safeAccess(() => booking.dates?.return) ||
    booking.return ||
    null;
  const rawStatus = (
    booking.status ||
    (booking.paymentStatus === "fully_paid" ? "active" : "") ||
    (booking.paymentStatus === "reservation_paid"
      ? "pending_full_payment"
      : "") ||
    (booking.paymentStatus === "pending_verification"
      ? "pending_reservation"
      : "") ||
    ""
  ).toLowerCase();
  const dailyRate = Number(
    motorcycleObj.dailyRate ?? motorcycleObj.price ?? details.dailyRate ?? 0,
  );

  return {
    id: booking._id || booking.id || String(Math.random()).slice(2, 8),
    motorcycle: {
      make: motorcycleObj.make || motorcycleObj.name || "Unnamed Motorcycle",
      model: motorcycleObj.model || "",
      image,
      year: motorcycleObj.year || motorcycleObj.modelYear || "",
      category: motorcycleObj.category,
      engineSize: details.engineSize || motorcycleObj.engineSize || "",
      transmission:
        details.transmission ||
        motorcycleObj.transmission ||
        motorcycleObj.gearbox ||
        "",
      fuelType:
        details.fuelType ||
        details.fuel ||
        motorcycleObj.fuelType ||
        motorcycleObj.fuel ||
        "",
      hasABS: motorcycleObj.hasABS || false,
      hasHelmet: motorcycleObj.hasHelmet !== false,
      dailyRate,
    },
    user: {
      name: booking.customer || safeAccess(() => booking.user?.name) || "Guest",
      email: booking.email || safeAccess(() => booking.user?.email) || "",
      phone: booking.phone || safeAccess(() => booking.user?.phone) || "",
      address:
        address.barangay || address.city || address.state
          ? [
              address.barangay,
              address.city,
              address.state,
              address.region,
              address.zipCode,
            ]
              .filter(Boolean)
              .join(", ")
          : address.street || address.city
            ? [address.street, address.city, address.state]
                .filter(Boolean)
                .join(", ")
            : safeAccess(() => booking.user?.address) || "",
    },
    dates: { pickup: pickupDate, return: returnDate },
    times: {
      pickup: booking.pickupTime || "",
      return: booking.returnTime || "",
    },
    location:
      address.city ||
      booking.location ||
      motorcycleObj.location ||
      "Pickup location",
    destination: booking.destination || "",
    // price = gross total (full amount before downpayment deduction)
    price: Number(booking.amount || booking.price || booking.total || 0),
    distanceFee: details.distanceFee ?? 0,
    helmetFee: details.helmetFee ?? 0,
    distanceTierLabel: details.distanceTierLabel ?? "",
    helmetRequested: details.helmetRequested ?? false,
    destinationCity: details.destinationCity ?? "",
    // Downpayment: stored in details.downpayment or fall back to raw.reservationFee
    downpayment: details.downpayment ?? booking.reservationFee ?? DOWNPAYMENT,
    status: rawStatus || "pending_reservation",
    isDeleted: booking.isDeleted || false,
    bookingDate:
      booking.bookingDate ||
      booking.createdAt ||
      booking.updatedAt ||
      Date.now(),
    paymentMethod:
      booking.reservationPaymentMethod ||
      booking.paymentMethod ||
      booking.payment?.method ||
      "",
    paymentStatus: booking.paymentStatus || "pending_verification",
    paymentReferenceId: booking.paymentReferenceId || "",
    paymentSentAt: booking.paymentSentAt || "",
    paymentSentAmount: Number(booking.paymentSentAmount || DOWNPAYMENT),
    requiresProofReupload: !!booking.requiresProofReupload,
    adminReviewComment: booking.adminReviewComment || "",
    adminReviewedAt: booking.adminReviewedAt || null,
    raw: booking,
  };
};

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_TABS = [
  {
    key: "pending_reservation",
    label: "Pending Reservation",
    icon: FaHourglassHalf,
  },
  {
    key: "pending_full_payment",
    label: "Pending Full Payment",
    icon: FaCreditCard,
  },
  { key: "active", label: "Active", icon: FaPlayCircle },
  { key: "completed", label: "Completed", icon: FaCheckCircle },
  { key: "cancelled", label: "Cancelled", icon: FaTimesCircle },
  { key: "rejected", label: "Rejected", icon: FaTrash },
];

const STATUS_BADGE = {
  pending_reservation: {
    text: "Pending Reservation",
    cls: "bg-yellow-100 text-yellow-800 border border-yellow-300",
    icon: FaHourglassHalf,
  },
  pending_full_payment: {
    text: "Pending Full Payment",
    cls: "bg-orange-100 text-orange-800 border border-orange-300",
    icon: FaCreditCard,
  },
  active: {
    text: "Active",
    cls: "bg-blue-100 text-blue-800 border border-blue-300",
    icon: FaPlayCircle,
  },
  completed: {
    text: "Completed",
    cls: "bg-green-100 text-green-800 border border-green-300",
    icon: FaCheckCircle,
  },
  cancelled: {
    text: "Cancelled",
    cls: "bg-red-100 text-red-800 border border-red-300",
    icon: FaTimesCircle,
  },
  rejected: {
    text: "Rejected",
    cls: "bg-gray-200 text-gray-700 border border-gray-400",
    icon: FaTrash,
  },
};

const StatusBadge = ({ status, isDeleted }) => {
  const key = isDeleted ? "rejected" : status || "pending_reservation";
  const cfg = STATUS_BADGE[key] || {
    text: key,
    cls: "bg-gray-200 text-gray-700 border border-gray-400",
    icon: null,
  };
  const Icon = cfg.icon;
  return (
    <span
      className={`${cfg.cls} px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap`}
    >
      {Icon && <Icon className="text-xs" />}
      {cfg.text}
    </span>
  );
};

// ── Tab button ────────────────────────────────────────────────────────────────
const TabButton = ({ tab, isActive, count, onClick }) => {
  const Icon = tab.icon;
  return (
    <button
      type="button"
      onClick={() => onClick(tab.key)}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200
        ${
          isActive
            ? "bg-[#171717] text-white shadow-lg shadow-black/25 scale-[1.02]"
            : "bg-white/70 text-[#171717] hover:bg-white/90 border border-[#171717]/10"
        }`}
    >
      <Icon
        className={`text-xs ${isActive ? "text-white" : "text-[#b50002]"}`}
      />
      {tab.label}
      <span
        className={`text-xs font-bold px-1.5 py-0.5 rounded-full
        ${isActive ? "bg-white/20 text-white" : "bg-[#171717]/10 text-[#171717]"}`}
      >
        {count}
      </span>
    </button>
  );
};

// ── Pagination ────────────────────────────────────────────────────────────────
const Pagination = ({ currentPage, totalPages, totalItems, onPageChange }) => {
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

  const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

  return (
    <div className="mt-6 flex flex-col items-center gap-3">
      <p className="text-sm text-[#171717]/60">
        Showing{" "}
        <span className="font-semibold text-[#171717]">{startItem}</span> –{" "}
        <span className="font-semibold text-[#171717]">{endItem}</span> of{" "}
        <span className="font-semibold text-[#171717]">{totalItems}</span>{" "}
        bookings
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/70 border border-[#171717]/10 text-[#171717]
            disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/90
            transition-all shadow-sm text-sm font-medium"
        >
          <FaChevronLeft className="text-xs" />
          <span className="hidden sm:inline">Prev</span>
        </button>

        {withEllipsis.map((item, idx) =>
          item === "..." ? (
            <span
              key={`e-${idx}`}
              className="px-2 text-[#171717]/50 text-sm select-none"
            >
              …
            </span>
          ) : (
            <button
              key={item}
              onClick={() => onPageChange(item)}
              className={`w-10 h-10 rounded-xl font-semibold text-sm transition-all
                ${
                  currentPage === item
                    ? "bg-[#b50002] text-white shadow-lg shadow-[#b50002]/30 scale-105"
                    : "bg-white/70 border border-[#171717]/10 text-[#171717] hover:bg-white/90"
                }`}
            >
              {item}
            </button>
          ),
        )}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/70 border border-[#171717]/10 text-[#171717]
            disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/90
            transition-all shadow-sm text-sm font-medium"
        >
          <span className="hidden sm:inline">Next</span>
          <FaChevronRight className="text-xs" />
        </button>
      </div>
    </div>
  );
};

// ── Detail mini-card ──────────────────────────────────────────────────────────
const DetailCard = ({ icon: Icon, title, children }) => (
  <div className="bg-white/60 border border-[#171717]/10 rounded-xl p-3 shadow-sm">
    <p className="text-xs font-bold text-[#171717]/50 uppercase tracking-wider mb-2 flex items-center gap-1.5">
      <Icon className="text-[#b50002]" /> {title}
    </p>
    <div className="space-y-1.5 text-xs">{children}</div>
  </div>
);

const DetailRow = ({ label, value, valueClass = "text-[#171717]" }) => (
  <div className="flex justify-between gap-2">
    <span className="text-[#171717]/50 flex-shrink-0">{label}</span>
    <span className={`font-semibold text-right ${valueClass}`}>{value}</span>
  </div>
);

// ── Booking Row ───────────────────────────────────────────────────────────────
const BookingRow = ({ booking, onCancel, onReupload, onReschedule, onDownloadAgreement }) => {
  const [expanded, setExpanded] = useState(false);
  const [reuploadRef, setReuploadRef] = useState(booking.paymentReferenceId || "");
  const [reuploadSentAt, setReuploadSentAt] = useState(
    booking.paymentSentAt
      ? new Date(booking.paymentSentAt).toISOString().slice(0, 16)
      : "",
  );
  const [reuploadFile, setReuploadFile] = useState(null);
  const [reuploadPreviewUrl, setReuploadPreviewUrl] = useState("");
  const [reuploading, setReuploading] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const days = daysBetween(booking.dates.pickup, booking.dates.return);
  const motorcycleName =
    `${booking.motorcycle.make} ${booking.motorcycle.model}`.trim();
  const dailyRate = booking.motorcycle.dailyRate || 0;
  const baseRental = dailyRate * Math.max(days, 1);
  // Gross total stored on booking; downpayment already paid
  const grossTotal = booking.price;
  const downpayment = booking.downpayment || DOWNPAYMENT;
  const dueAtPickup = Math.max(0, grossTotal - downpayment);
  const needsReupload =
    booking.requiresProofReupload || booking.paymentStatus === "rejected";
  const originalPickupDateInput = toDateInput(booking.dates.pickup);
  const originalReturnDateInput = toDateInput(booking.dates.return);
  const [rescheduleForm, setRescheduleForm] = useState({
    pickupDate: originalPickupDateInput,
    pickupTime: booking.times.pickup || "08:00",
    returnDate: originalReturnDateInput,
    returnTime: booking.times.return || "08:00",
  });

  const canReschedule =
    ["pending", "pending_reservation", "pending_full_payment"].includes(
      booking.status,
    ) && !booking.isDeleted;

  useEffect(() => {
    setRescheduleForm({
      pickupDate: toDateInput(booking.dates.pickup),
      pickupTime: booking.times.pickup || "08:00",
      returnDate: toDateInput(booking.dates.return),
      returnTime: booking.times.return || "08:00",
    });
  }, [booking.dates.pickup, booking.dates.return, booking.times.pickup, booking.times.return]);

  useEffect(() => {
    if (!reuploadFile) {
      setReuploadPreviewUrl("");
      return;
    }
    const objectUrl = URL.createObjectURL(reuploadFile);
    setReuploadPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [reuploadFile]);

  const existingProofPreview = booking.raw?.paymentProofImage
    ? resolveImageUrl(booking.raw.paymentProofImage)
    : "";
  const proofPreviewSrc = reuploadPreviewUrl || existingProofPreview;
  const validReturnTimeSlots =
    rescheduleForm.returnDate &&
    rescheduleForm.pickupDate &&
    rescheduleForm.returnDate === rescheduleForm.pickupDate
      ? ALL_TIME_SLOTS.filter((s) => s.value > rescheduleForm.pickupTime)
      : ALL_TIME_SLOTS;

  const rescheduledDays = Math.max(
    1,
    daysBetween(rescheduleForm.pickupDate, rescheduleForm.returnDate),
  );
  const rescheduledGrossTotal =
    dailyRate > 0
      ? dailyRate * rescheduledDays + booking.distanceFee + booking.helmetFee
      : grossTotal;
  const rescheduledDueAtPickup = Math.max(0, rescheduledGrossTotal - downpayment);

  const minPickupDate = useMemo(() => {
    const today = getTodayStart();
    const originalPickup = parseLocalDateOnly(originalPickupDateInput);
    if (!originalPickup) return formatDateInput(today);
    const min = originalPickup > today ? originalPickup : today;
    return formatDateInput(min);
  }, [originalPickupDateInput]);
  const maxPickupDate = formatDateInput(sevenDaysFromToday());
  const maxReturnDate = formatDateInput(sixMonthsFromToday());

  const validateReschedule = async () => {
    const { pickupDate, pickupTime, returnDate, returnTime } = rescheduleForm;
    if (!pickupDate || !pickupTime || !returnDate || !returnTime) {
      await alertModal("Please complete pickup and return date/time.", {
        isError: true,
      });
      return false;
    }

    if (!isTimeWithinRentalHours(pickupTime) || !isTimeWithinRentalHours(returnTime)) {
      await alertModal(
        "Pickup and return times must be between 8:00 AM and 8:00 PM only.",
        { isError: true },
      );
      return false;
    }

    const pickupDateObj = parseLocalDateOnly(pickupDate);
    const returnDateObj = parseLocalDateOnly(returnDate);
    const originalPickupObj = parseLocalDateOnly(originalPickupDateInput);
    if (!pickupDateObj || !returnDateObj || !originalPickupObj) {
      await alertModal("Invalid date input. Please review your schedule.", {
        isError: true,
      });
      return false;
    }

    const today = getTodayStart();
    const sevenDayLimit = sevenDaysFromToday();
    const sixMonthLimit = sixMonthsFromToday();
    const minAllowedPickup = originalPickupObj > today ? originalPickupObj : today;

    if (pickupDateObj < minAllowedPickup) {
      await alertModal(
        "Pickup date cannot be earlier than your original pickup date and cannot be in the past.",
        { isError: true },
      );
      return false;
    }

    if (pickupDateObj > sevenDayLimit) {
      await alertModal(
        "Pickup date can only be rescheduled within the next 7 days.",
        { isError: true },
      );
      return false;
    }

    if (returnDateObj > sixMonthLimit) {
      await alertModal(
        "Return date can only be rescheduled up to 6 months from today.",
        { isError: true },
      );
      return false;
    }

    const pickupDateTime = combineLocalDateTime(pickupDate, pickupTime);
    const returnDateTime = combineLocalDateTime(returnDate, returnTime);
    if (!pickupDateTime || !returnDateTime) {
      await alertModal("Return date/time is invalid.", {
        isError: true,
      });
      return false;
    }

    const minReturnDateTime = new Date(
      pickupDateTime.getTime() + 24 * 60 * 60 * 1000,
    );
    if (returnDateTime < minReturnDateTime) {
      await alertModal("Minimum rental duration is 24 hours.", {
        isError: true,
      });
      return false;
    }

    return true;
  };

  const submitReupload = async () => {
    if (!reuploadRef.trim()) {
      await alertModal("Please enter your payment reference ID.", {
        isError: true,
      });
      return;
    }
    if (!reuploadSentAt) {
      await alertModal("Please enter payment sent time.", {
        isError: true,
      });
      return;
    }
    if (!reuploadFile) {
      await alertModal("Please upload your new payment proof image.", {
        isError: true,
      });
      return;
    }

    try {
      setReuploading(true);
      await onReupload(booking.id, {
        paymentReferenceId: reuploadRef.trim(),
        paymentSentAt: reuploadSentAt,
        paymentSentAmount: DOWNPAYMENT,
        paymentProofImage: reuploadFile,
      });
      setReuploadFile(null);
      setReuploadPreviewUrl("");
    } finally {
      setReuploading(false);
    }
  };

  const submitReschedule = async () => {
    const isValid = await validateReschedule();
    if (!isValid) return;

    const confirmed = await confirmModal(
      "Apply this new pickup and return schedule to your booking?",
      { confirmLabel: "Yes, Reschedule" },
    );
    if (!confirmed) return;

    try {
      setRescheduling(true);
      await onReschedule(booking.id, {
        ...rescheduleForm,
        amount: rescheduledGrossTotal,
      });
      setIsRescheduling(false);
    } finally {
      setRescheduling(false);
    }
  };

  return (
    <div
      className={`bg-white/70 backdrop-blur-sm border border-white/50 rounded-2xl overflow-hidden shadow-lg shadow-black/10 transition-all duration-200
      ${booking.isDeleted ? "opacity-60" : "hover:shadow-xl hover:shadow-black/15 hover:bg-white/90"}`}
    >
      {/* ── Collapsed row ── */}
      <div className="flex items-center gap-3 p-3 sm:p-4">
        {/* Thumbnail */}
        <div className="flex-shrink-0 w-16 h-14 sm:w-20 sm:h-16 rounded-xl overflow-hidden bg-[#e8e8e8]">
          <img
            src={booking.motorcycle.image}
            alt={motorcycleName}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.src =
                "https://via.placeholder.com/800x450.png?text=No+Image";
            }}
          />
        </div>

        {/* Core info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="font-bold text-[#171717] text-sm leading-tight truncate">
              {motorcycleName}
            </h3>
            {booking.motorcycle.year && (
              <span className="text-xs text-[#171717]/40 hidden sm:inline">
                {booking.motorcycle.year}
              </span>
            )}
            <StatusBadge
              status={booking.status}
              isDeleted={booking.isDeleted}
            />
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[#171717]/55">
            <span className="flex items-center gap-1 whitespace-nowrap">
              <FaCalendarAlt className="text-[#b50002] text-xs" />
              {formatDate(booking.dates.pickup)}
              {booking.times.pickup && ` · ${formatTime(booking.times.pickup)}`}
              <span className="mx-0.5">—</span>
              {formatDate(booking.dates.return)}
              {booking.times.return && ` · ${formatTime(booking.times.return)}`}
            </span>
            <span className="flex items-center gap-1 whitespace-nowrap">
              <FaClock className="text-[#b50002] text-xs" /> {days}d
            </span>
            {booking.destination && (
              <span className="hidden md:flex items-center gap-1 truncate max-w-[160px]">
                <FaMapMarkerAlt className="text-[#b50002] text-xs flex-shrink-0" />
                {booking.destination}
              </span>
            )}
          </div>
        </div>

        {/* Price — show due at pickup */}
        <div className="flex-shrink-0 text-right hidden sm:block mr-1">
          <p className="font-black text-[#171717] text-sm">
            {formatPrice(dueAtPickup)}
          </p>
          <p className="text-xs text-[#171717]/40">due at pickup</p>
        </div>

        {/* Action buttons */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {[
            "pending",
            "pending_reservation",
            "pending_full_payment",
          ].includes(booking.status) && !booking.isDeleted && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCancel(booking.id);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#b50002] text-white text-sm font-bold rounded-xl
                      shadow-lg shadow-[#b50002]/30 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Cancel
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDownloadAgreement(booking.id, booking.customer);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#2563eb] text-white text-sm font-bold rounded-xl
                    shadow-lg shadow-[#2563eb]/30 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] transition-all"
            title="Download Rental Agreement PDF"
          >
            <FaFileDownload className="text-xs" />
            <span className="hidden sm:inline">Agreement</span>
          </button>
          <button
            onClick={() => setExpanded((p) => !p)}
            className="flex items-center gap-2 px-4 py-2 bg-[#171717] text-white text-sm font-bold rounded-xl
                      shadow-lg shadow-[#171717]/30 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <FaReceipt className="text-xs" />
            <span className="hidden sm:inline">
              {expanded ? "Hide" : "Details"}
            </span>
            {expanded ? (
              <FaChevronUp className="text-xs" />
            ) : (
              <FaChevronDown className="text-xs" />
            )}
          </button>
        </div>
      </div>

      {/* ── Expanded detail panel ── */}
      {expanded && (
        <div className="border-t border-[#171717]/10 px-3 sm:px-4 pb-4 pt-3 space-y-3 bg-[#f4f3f3]/60">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Motorcycle specs */}
            <DetailCard icon={FaMotorcycle} title="Motorcycle">
              {booking.motorcycle.engineSize && (
                <DetailRow
                  label="Engine"
                  value={`${booking.motorcycle.engineSize}cc`}
                />
              )}
              {booking.motorcycle.transmission && (
                <DetailRow
                  label="Transmission"
                  value={booking.motorcycle.transmission}
                />
              )}
              {booking.motorcycle.fuelType && (
                <DetailRow label="Fuel" value={booking.motorcycle.fuelType} />
              )}
              <DetailRow
                label="ABS"
                value={booking.motorcycle.hasABS ? "Yes" : "No"}
              />
              <DetailRow
                label="Rate/day"
                value={formatPrice(dailyRate)}
                valueClass="text-[#b50002]"
              />
            </DetailCard>

            {/* Booking info */}
            <DetailCard icon={FaCalendarAlt} title="Booking Info">
              <div className="flex justify-between gap-2">
                <span className="text-[#171717]/50 flex-shrink-0">Pickup</span>
                <span className="font-semibold text-[#171717] text-right">
                  {formatDate(booking.dates.pickup)}
                  {booking.times.pickup && (
                    <span className="text-[#b50002] ml-1">
                      {formatTime(booking.times.pickup)}
                    </span>
                  )}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#171717]/50 flex-shrink-0">Return</span>
                <span className="font-semibold text-[#171717] text-right">
                  {formatDate(booking.dates.return)}
                  {booking.times.return && (
                    <span className="text-[#b50002] ml-1">
                      {formatTime(booking.times.return)}
                    </span>
                  )}
                </span>
              </div>
              <DetailRow
                label="Duration"
                value={`${days} ${days === 1 ? "day" : "days"}`}
              />
              {booking.destination && (
                <div className="flex justify-between gap-2">
                  <span className="text-[#171717]/50 flex-shrink-0">
                    Destination
                  </span>
                  <span className="font-semibold text-[#171717] text-right truncate">
                    {booking.destination}
                  </span>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <span className="text-[#171717]/50 flex-shrink-0">
                  Booked on
                </span>
                <span className="font-semibold text-[#171717] text-right">
                  {formatDateTime(booking.bookingDate)}
                </span>
              </div>
              <DetailRow
                label="Payment via"
                value={booking.paymentMethod || "—"}
              />
            </DetailCard>

            {/* Fee breakdown */}
            <DetailCard icon={FaReceipt} title="Fee Breakdown">
              {dailyRate > 0 && (
                <DetailRow
                  label={`₱${dailyRate.toLocaleString()} × ${days}d`}
                  value={formatPrice(baseRental)}
                />
              )}
              {booking.distanceFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#171717]/50 flex items-center gap-1">
                    <FaMapMarkerAlt className="text-[#b50002]" />
                    Distance
                    {booking.distanceTierLabel && (
                      <span className="text-[#171717]/40 ml-0.5">
                        ({booking.distanceTierLabel})
                      </span>
                    )}
                  </span>
                  <span className="font-semibold text-[#b50002]">
                    +{formatPrice(booking.distanceFee)}
                  </span>
                </div>
              )}
              {booking.helmetRequested && booking.helmetFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#171717]/50 flex items-center gap-1">
                    <FaHardHat className="text-[#b50002]" /> Helmet
                  </span>
                  <span className="font-semibold text-[#b50002]">
                    +{formatPrice(booking.helmetFee)}
                  </span>
                </div>
              )}
              {/* Gross total */}
              <div className="border-t border-[#171717]/15 pt-1.5 flex justify-between">
                <span className="font-bold text-[#171717]">Total</span>
                <span className="font-black text-[#171717]">
                  {formatPrice(grossTotal)}
                </span>
              </div>
              {/* Downpayment deducted */}
              <div className="flex justify-between">
                <span className="text-[#171717]/50">Downpayment (paid)</span>
                <span className="font-semibold text-green-600">
                  −{formatPrice(downpayment)}
                </span>
              </div>
              {/* Due at pickup */}
              <div className="border-t border-[#171717]/15 pt-1.5 flex justify-between">
                <span className="font-bold text-[#171717]">Due at Pickup</span>
                <span className="font-black text-[#b50002]">
                  {formatPrice(dueAtPickup)}
                </span>
              </div>
            </DetailCard>
          </div>

          {needsReupload && !booking.isDeleted && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
              <p className="text-sm font-bold text-orange-800 mb-1">
                Admin requested payment proof re-upload
              </p>
              {booking.adminReviewComment && (
                <p className="text-xs text-orange-700 mb-3">
                  Comment: {booking.adminReviewComment}
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#171717]/70 uppercase tracking-wide block mb-1">
                    Reference ID
                  </label>
                  <input
                    type="text"
                    value={reuploadRef}
                    onChange={(e) => setReuploadRef(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#171717]/15 bg-white text-sm"
                    placeholder="e.g. GCash12345678"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#171717]/70 uppercase tracking-wide block mb-1">
                    Payment Sent Time
                  </label>
                  <input
                    type="datetime-local"
                    value={reuploadSentAt}
                    onChange={(e) => setReuploadSentAt(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#171717]/15 bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#171717]/70 uppercase tracking-wide block mb-1">
                    Amount Sent
                  </label>
                  <input
                    type="number"
                    value={DOWNPAYMENT}
                    readOnly
                    className="w-full px-3 py-2 rounded-lg border border-[#171717]/15 bg-gray-100 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#171717]/70 uppercase tracking-wide block mb-1">
                    New Proof Image
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center px-3 py-2 rounded-lg bg-[#171717] text-white text-xs font-bold cursor-pointer hover:brightness-110 transition-all">
                      Choose Image
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          setReuploadFile(e.target.files?.[0] || null)
                        }
                        className="hidden"
                      />
                    </label>
                    <span className="text-xs text-[#171717]/55">
                      {reuploadFile ? "Image selected" : "No new image selected"}
                    </span>
                  </div>
                  {proofPreviewSrc && (
                    <div className="mt-2">
                      <img
                        src={proofPreviewSrc}
                        alt="Payment proof preview"
                        className="w-full max-h-48 object-contain rounded-lg border border-[#171717]/15 bg-white"
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-3">
                <button
                  onClick={submitReupload}
                  disabled={reuploading}
                  className="px-4 py-2 bg-[#b50002] text-white text-sm font-bold rounded-xl shadow-lg shadow-[#b50002]/30 hover:brightness-110 disabled:opacity-60"
                >
                  {reuploading ? "Uploading..." : "Re-upload Payment Proof"}
                </button>
              </div>
            </div>
          )}

          {canReschedule && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-blue-900">
                    Need to reschedule?
                  </p>
                  <p className="text-xs text-blue-800/80">
                    Update pickup and return schedule with instant price preview.
                  </p>
                </div>
                <button
                  onClick={() => setIsRescheduling((prev) => !prev)}
                  className="px-3 py-2 bg-[#171717] text-white text-xs sm:text-sm font-bold rounded-lg hover:brightness-110 transition-all"
                >
                  {isRescheduling ? "Hide" : "Reschedule"}
                </button>
              </div>

              {isRescheduling && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-[#171717]/70 uppercase tracking-wide block mb-1">
                      Pickup Date
                    </label>
                    <input
                      type="date"
                      value={rescheduleForm.pickupDate}
                      min={minPickupDate}
                      max={maxPickupDate}
                      onChange={(e) =>
                        setRescheduleForm((prev) => ({
                          ...prev,
                          pickupDate: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-lg border border-[#171717]/15 bg-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#171717]/70 uppercase tracking-wide block mb-1">
                      Pickup Time
                    </label>
                    <select
                      value={rescheduleForm.pickupTime}
                      onChange={(e) =>
                        setRescheduleForm((prev) => {
                          const nextPickupTime = e.target.value;
                          const sameDay = prev.returnDate === prev.pickupDate;
                          const invalidReturnTime =
                            sameDay && prev.returnTime <= nextPickupTime;
                          return {
                            ...prev,
                            pickupTime: nextPickupTime,
                            returnTime: invalidReturnTime ? "" : prev.returnTime,
                          };
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-[#171717]/15 bg-white text-sm"
                    >
                      <option value="">Select time</option>
                      {ALL_TIME_SLOTS.map((slot) => (
                        <option key={slot.value} value={slot.value}>
                          {slot.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#171717]/70 uppercase tracking-wide block mb-1">
                      Return Date
                    </label>
                    <input
                      type="date"
                      value={rescheduleForm.returnDate}
                      min={addDaysToDateInput(
                        rescheduleForm.pickupDate || minPickupDate,
                        1,
                      )}
                      max={maxReturnDate}
                      onChange={(e) =>
                        setRescheduleForm((prev) => ({
                          ...prev,
                          returnDate: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-lg border border-[#171717]/15 bg-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#171717]/70 uppercase tracking-wide block mb-1">
                      Return Time
                    </label>
                    <select
                      value={rescheduleForm.returnTime}
                      onChange={(e) =>
                        setRescheduleForm((prev) => ({
                          ...prev,
                          returnTime: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-lg border border-[#171717]/15 bg-white text-sm"
                    >
                      <option value="">Select time</option>
                      {validReturnTimeSlots.map((slot) => (
                        <option key={slot.value} value={slot.value}>
                          {slot.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2 bg-white border border-[#171717]/10 rounded-lg p-3">
                    <p className="text-xs font-bold text-[#171717]/60 uppercase tracking-wider mb-2">
                      Updated Price Preview
                    </p>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[#171717]/60">
                          ₱{dailyRate.toLocaleString()} × {rescheduledDays}d
                        </span>
                        <span className="font-semibold text-[#171717]">
                          {formatPrice(dailyRate * rescheduledDays)}
                        </span>
                      </div>
                      {booking.distanceFee > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-[#171717]/60">Distance Fee</span>
                          <span className="font-semibold text-[#b50002]">
                            +{formatPrice(booking.distanceFee)}
                          </span>
                        </div>
                      )}
                      {booking.helmetFee > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-[#171717]/60">Helmet Fee</span>
                          <span className="font-semibold text-[#b50002]">
                            +{formatPrice(booking.helmetFee)}
                          </span>
                        </div>
                      )}
                      <div className="border-t border-[#171717]/15 pt-1 mt-1 flex items-center justify-between">
                        <span className="font-bold text-[#171717]">Total</span>
                        <span className="font-black text-[#171717]">
                          {formatPrice(rescheduledGrossTotal)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#171717]/60">Downpayment (paid)</span>
                        <span className="font-semibold text-green-600">
                          -{formatPrice(downpayment)}
                        </span>
                      </div>
                      <div className="border-t border-[#171717]/15 pt-1 mt-1 flex items-center justify-between">
                        <span className="font-bold text-[#171717]">Due at Pickup</span>
                        <span className="font-black text-[#b50002]">
                          {formatPrice(rescheduledDueAtPickup)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="sm:col-span-2 flex items-center justify-end">
                    <button
                      onClick={submitReschedule}
                      disabled={rescheduling}
                      className="px-4 py-2 bg-[#b50002] text-white text-sm font-bold rounded-xl shadow-lg shadow-[#b50002]/30 hover:brightness-110 disabled:opacity-60"
                    >
                      {rescheduling ? "Saving..." : "Save New Schedule"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge
                status={booking.status}
                isDeleted={booking.isDeleted}
              />
              {[
                "pending",
                "pending_reservation",
                "pending_full_payment",
              ].includes(booking.status) && !booking.isDeleted && (
                <button
                  onClick={() => onCancel(booking.id)}
                  className="sm:hidden px-3 py-1.5 rounded-lg bg-red-50 text-[#b50002] border border-[#b50002]/20
                    hover:bg-red-100 transition-all text-xs font-semibold"
                >
                  Cancel Booking
                </button>
              )}
            </div>
            <Link
              to="/motorcycles"
              className="flex items-center gap-2 px-4 py-2 bg-[#171717] text-white text-sm font-bold rounded-xl
                      shadow-lg shadow-[#171717]/30 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <FaMotorcycle className="text-xs" />
              {[
                "pending",
                "pending_reservation",
                "pending_full_payment",
                "active",
              ].includes(booking.status)
                ? "View More"
                : "Rent Again"}
              <FaArrowRight className="text-xs" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState("pending_reservation");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const isMounted = useRef(true);
  const topRef = useRef(null);
  const requestAbortRef = useRef(null);
  const hasLoadedOnceRef = useRef(false);
  useEffect(() => () => (isMounted.current = false), []);

  const fetchBookings = useCallback(async () => {
    setError(null);
    if (!hasLoadedOnceRef.current) setLoading(true);

    if (requestAbortRef.current) {
      try {
        requestAbortRef.current.abort();
      } catch {}
    }
    const controller = new AbortController();
    requestAbortRef.current = controller;

    const token = localStorage.getItem("token");
    const headers = {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };

    let lastErr = null;
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await axios.get(
            `${API_BASE}/api/motorcycle-bookings/mybooking`,
            {
              headers,
              signal: controller.signal,
              timeout: TIMEOUT,
            },
          );

          const rawData = Array.isArray(response.data)
            ? response.data
            : response.data?.data ||
              response.data?.bookings ||
              response.data?.rows ||
              response.data ||
              [];
          const normalized = (Array.isArray(rawData) ? rawData : []).map(
            normalizeBooking,
          );

          if (!isMounted.current) return;
          setBookings(normalized);
          hasLoadedOnceRef.current = true;
          try {
            sessionStorage.setItem(BOOKINGS_CACHE_KEY, JSON.stringify(rawData));
          } catch {}
          return;
        } catch (err) {
          lastErr = err;
          const wasCancelled =
            err?.name === "CanceledError" || err?.message === "canceled";
          const wasTimeout = err?.code === "ECONNABORTED";

          if (wasCancelled) {
            // If this request was replaced by a newer one, suppress stale error.
            if (controller.signal.aborted) return;
          }

          // Retry once for transient timeout/network spikes.
          if ((wasTimeout || wasCancelled) && attempt === 0) {
            await new Promise((resolve) => setTimeout(resolve, 700));
            continue;
          }

          throw err;
        }
      }
    } catch (err) {
      if (!isMounted.current) return;
      if (err?.name === "CanceledError" || err?.message === "canceled") {
        setError("Request interrupted. Retrying may fix this.");
      } else if (err?.code === "ECONNABORTED") {
        setError("Loading is taking too long. Please try again.");
      } else {
        setError(
          err.response?.data?.message ||
            lastErr?.message ||
            err.message ||
            "Failed to load bookings",
        );
      }
    } finally {
      if (requestAbortRef.current === controller) requestAbortRef.current = null;
      if (isMounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      const cachedRaw = sessionStorage.getItem(BOOKINGS_CACHE_KEY);
      if (!cachedRaw) return;
      const parsed = JSON.parse(cachedRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setBookings(parsed.map(normalizeBooking));
        hasLoadedOnceRef.current = true;
      }
    } catch {
      // Ignore bad cache and fetch fresh data.
    }
  }, []);

  useEffect(() => {
    fetchBookings();
    return () => {
      if (requestAbortRef.current) {
        try {
          requestAbortRef.current.abort();
        } catch {}
      }
    };
  }, [fetchBookings]);
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const cancelBooking = useCallback(async (bookingId) => {
    const confirmed = await confirmModal(
      "Are you sure you want to cancel this booking? This cannot be undone.",
      { confirmLabel: "Yes, Cancel" },
    );
    if (!confirmed) return;
    try {
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      };
      const response = await axios.patch(
        `${API_BASE}/api/motorcycle-bookings/${bookingId}/status`,
        { status: "cancelled" },
        { headers },
      );
      const updated = normalizeBooking(
        response.data ||
          response.data?.data || { _id: bookingId, status: "cancelled" },
      );
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? updated : b)),
      );
    } catch (err) {
      await alertModal(
        err.response?.data?.message ||
          err.message ||
          "Failed to cancel booking",
        { isError: true },
      );
    }
  }, []);

  const reuploadPaymentProof = useCallback(async (bookingId, payload) => {
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("paymentReferenceId", payload.paymentReferenceId);
      formData.append("paymentSentAt", payload.paymentSentAt);
      formData.append("paymentSentAmount", String(DOWNPAYMENT));
      formData.append("paymentProofImage", payload.paymentProofImage);

      const response = await axios.patch(
        `${API_BASE}/api/motorcycle-bookings/${bookingId}/reupload-proof`,
        formData,
        {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        },
      );

      const updated = normalizeBooking(
        response?.data?.booking || { _id: bookingId },
      );
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? updated : b)),
      );
      await alertModal(
        response?.data?.message || "Payment proof re-uploaded successfully.",
      );
    } catch (err) {
      await alertModal(
        err.response?.data?.message || "Failed to re-upload payment proof.",
        { isError: true },
      );
      throw err;
    }
  }, []);

  const rescheduleBooking = useCallback(async (bookingId, payload) => {
    try {
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      };

      const response = await axios.put(
        `${API_BASE}/api/motorcycle-bookings/${bookingId}`,
        {
          pickupDate: payload.pickupDate,
          pickupTime: payload.pickupTime,
          returnDate: payload.returnDate,
          returnTime: payload.returnTime,
          amount: payload.amount,
        },
        { headers },
      );

      const updated = normalizeBooking(response?.data || { _id: bookingId });
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? updated : b)),
      );
      await alertModal("Booking rescheduled successfully.");
    } catch (err) {
      await alertModal(
        err.response?.data?.message || "Failed to reschedule booking.",
        { isError: true },
      );
      throw err;
    }
  }, []);

  const downloadRentalAgreement = useCallback(async (bookingId, customerName) => {
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await axios.get(
        `${API_BASE}/api/motorcycle-bookings/${bookingId}/rental-agreement`,
        { headers, responseType: "blob" },
      );

      // Create blob and download
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const sanitizedName = customerName?.replace(/\s+/g, "_") || "RentalAgreement";
      link.setAttribute("download", `RentalAgreement_${sanitizedName}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      await alertModal("Rental agreement downloaded successfully.");
    } catch (err) {
      console.error("Download error:", err);
      await alertModal(
        err.response?.data?.message || "Failed to download rental agreement.",
        { isError: true },
      );
    }
  }, []);

  const tabCounts = useMemo(() => {
    return STATUS_TABS.reduce((acc, tab) => {
      acc[tab.key] =
        tab.key === "rejected"
          ? bookings.filter((b) => b.isDeleted).length
          : bookings.filter((b) => !b.isDeleted && b.status === tab.key).length;
      return acc;
    }, {});
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    if (activeTab === "rejected") return bookings.filter((b) => b.isDeleted);
    return bookings.filter((b) => !b.isDeleted && b.status === activeTab);
  }, [bookings, activeTab]);

  const totalPages = Math.ceil(filteredBookings.length / ITEMS_PER_PAGE);
  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredBookings.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredBookings, currentPage]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-[#e8e8e8]">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 pt-32 pb-16">
        <div ref={topRef} className="mt-10">
          <div className="bg-[#f4f3f3] rounded-3xl shadow-lg shadow-black/10 overflow-hidden">
            {/* Panel header bar */}
            <div className="bg-gradient-to-r from-[#171717] to-[#2a2a2a] px-6 py-4">
              <h2 className="text-white font-black text-base tracking-tight">
                Booking History
              </h2>
              <p className="text-white/50 text-xs mt-0.5">
                View details, track status, and manage your rentals
              </p>
            </div>

            <div className="p-4 sm:p-6">
              {/* Tabs */}
              <div className="flex flex-wrap gap-2 mb-5 justify-center">
                {STATUS_TABS.map((tab) => (
                  <TabButton
                    key={tab.key}
                    tab={tab}
                    isActive={activeTab === tab.key}
                    count={tabCounts[tab.key] || 0}
                    onClick={setActiveTab}
                  />
                ))}
              </div>

              {/* Result count */}
              {!loading && !error && filteredBookings.length > 0 && (
                <p className="text-sm text-[#171717]/60 mb-4">
                  {filteredBookings.length} {activeTab} booking
                  {filteredBookings.length !== 1 ? "s" : ""}
                  {totalPages > 1 && ` — page ${currentPage} of ${totalPages}`}
                </p>
              )}

              {/* Loading */}
              {loading && (
                <div className="flex justify-center items-center py-20">
                  <div className="flex items-center gap-3 text-[#171717]">
                    <div className="w-5 h-5 border-2 border-[#b50002] border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-medium">
                      Loading bookings…
                    </span>
                  </div>
                </div>
              )}

              {/* Error */}
              {!loading && error && (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <FaExclamationTriangle className="text-[#b50002] text-3xl" />
                  <p className="text-[#171717]/70 text-sm text-center">
                    {error}
                  </p>
                  <button
                    type="button"
                    onClick={fetchBookings}
                    className="px-6 py-2.5 bg-[#171717] text-white text-sm font-bold rounded-xl
                      shadow-lg shadow-black/20 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Empty */}
              {!loading && !error && filteredBookings.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                  <div className="w-16 h-16 bg-white/60 border border-[#171717]/10 rounded-2xl flex items-center justify-center shadow-sm">
                    <FaMotorcycle className="text-[#b50002] text-2xl" />
                  </div>
                  <div>
                    <h3 className="text-[#171717] font-bold text-base">
                      No {activeTab} bookings
                    </h3>
                    <p className="text-[#171717]/50 text-sm mt-1">
                      {activeTab === "pending"
                        ? "You don't have any pending bookings."
                        : activeTab === "pending_reservation"
                          ? "You don't have any pending reservation requests."
                          : activeTab === "pending_full_payment"
                            ? "You don't have any pending full payment bookings."
                        : activeTab === "active"
                          ? "You don't have any active rentals."
                          : activeTab === "completed"
                            ? "You haven't completed any trips yet."
                            : activeTab === "cancelled"
                              ? "You don't have any cancelled bookings."
                              : "No rejected bookings found."}
                    </p>
                  </div>
                  <Link
                    to="/motorcycles"
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#171717] text-white text-sm font-bold rounded-xl
                      shadow-lg shadow-[#171717]/30 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    <FaMotorcycle className="text-xs" /> Browse Motorcycles
                  </Link>
                </div>
              )}

              {/* Booking list */}
              {!loading && !error && paginatedBookings.length > 0 && (
                <div className="space-y-3">
                  {paginatedBookings.map((booking) => (
                    <BookingRow
                      key={booking.id}
                      booking={booking}
                      onCancel={cancelBooking}
                      onReupload={reuploadPaymentProof}
                      onReschedule={rescheduleBooking}
                      onDownloadAgreement={downloadRentalAgreement}
                    />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {!loading && !error && filteredBookings.length > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredBookings.length}
                  onPageChange={handlePageChange}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyBookings;
