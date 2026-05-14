import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import ReactDOM from "react-dom/client";
import {
  FaGasPump,
  FaTachometerAlt,
  FaCalendarAlt,
  FaPhone,
  FaEnvelope,
  FaUser,
  FaArrowLeft,
  FaArrowRight,
  FaCreditCard,
  FaMapMarkerAlt,
  FaCogs,
  FaShieldAlt,
  FaClock,
  FaReceipt,
  FaCheckCircle,
  FaChevronDown,
  FaInfoCircle,
  FaExclamationTriangle,
  FaMotorcycle,
  FaThumbsUp,
  FaThumbsDown,
  FaStar,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import { GiFullMotorcycleHelmet } from "react-icons/gi";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";
import API_BASE_URL from "../apiBase";
import { computeDiscountedPrice, useApplicableDiscount } from "./DiscountBadge";

const API_BASE = API_BASE_URL;
const PH_API = "https://psgc.gitlab.io/api";
const api = axios.create({
  baseURL: API_BASE,
  headers: { Accept: "application/json" },
});

const DOWNPAYMENT = 200;
const HELMET_FEE = 100;
const CHECKOUT_LOCK_FALLBACK_MINUTES = 10;
const PICKUP_LOCATION =
  "Soldiers Hills IV, Block 9 Lot 1 PH2 Lily, Bacoor, 4102 Cavite";
const PAYMENT_QR_PATHS = {
  GCash: "/images/qr-gcash.jpeg",
  PayMaya: "/images/qr-gcash.jpeg",
  "Bank Transfer": "/images/qr-gcash.jpeg",
};

const DISTANCE_TIERS = [
  { maxKm: 8, fee: 0, label: "Within Bacoor (0–8 km)" },
  { maxKm: 15, fee: 80, label: "Very close (8–15 km)" },
  { maxKm: 25, fee: 150, label: "Short trip (15–25 km)" },
  { maxKm: 40, fee: 250, label: "Medium-short (25–40 km)" },
  { maxKm: 60, fee: 400, label: "Medium trip (40–60 km)" },
  { maxKm: 90, fee: 550, label: "Long trip (60–90 km)" },
  { maxKm: 130, fee: 700, label: "Far trip (90–130 km)" },
  { maxKm: Infinity, fee: 900, label: "Very far (130+ km)" },
];

const CITY_DISTANCES = {
  BACOOR: 2,
  "CITY OF BACOOR": 2,
  IMUS: 7,
  "CITY OF IMUS": 7,
  KAWIT: 10,
  NOVELETA: 13,
  ROSARIO: 16,
  "GENERAL TRIAS": 18,
  "GEN. TRIAS": 18,
  "CITY OF GENERAL TRIAS": 18,
  DASMARIÑAS: 20,
  "CITY OF DASMARIÑAS": 20,
  DASMARINAS: 20,
  CARMONA: 22,
  "GENERAL MARIANO ALVAREZ": 24,
  GMA: 24,
  SILANG: 26,
  "TRECE MARTIRES": 27,
  "CITY OF TRECE MARTIRES": 27,
  TANZA: 30,
  NAIC: 34,
  INDANG: 38,
  AMADEO: 40,
  MENDEZ: 43,
  ALFONSO: 46,
  TAGAYTAY: 32,
  "CITY OF TAGAYTAY": 32,
  "CAVITE CITY": 15,
  "CITY OF CAVITE": 15,
  MARAGONDON: 56,
  TERNATE: 48,
  MAGALLANES: 52,
  "GEN. MARIANO ALVAREZ": 24,
  MANILA: 28,
  "CITY OF MANILA": 28,
  MAKATI: 28,
  "CITY OF MAKATI": 28,
  TAGUIG: 24,
  "CITY OF TAGUIG": 24,
  BGC: 24,
  PASAY: 25,
  "CITY OF PASAY": 25,
  PARAÑAQUE: 20,
  "CITY OF PARAÑAQUE": 20,
  PARANAQUE: 20,
  "LAS PIÑAS": 16,
  "CITY OF LAS PIÑAS": 16,
  "LAS PINAS": 16,
  MUNTINLUPA: 18,
  "CITY OF MUNTINLUPA": 18,
  "QUEZON CITY": 40,
  PASIG: 36,
  "CITY OF PASIG": 36,
  MARIKINA: 42,
  "CITY OF MARIKINA": 42,
  MANDALUYONG: 33,
  "CITY OF MANDALUYONG": 33,
  "SAN PEDRO": 14,
  "CITY OF SAN PEDRO": 14,
  BIÑAN: 22,
  "CITY OF BIÑAN": 22,
  BINAN: 22,
  "SANTA ROSA": 26,
  "CITY OF SANTA ROSA": 26,
  CALAMBA: 38,
  "CITY OF CALAMBA": 38,
  CABUYAO: 34,
  "CITY OF CABUYAO": 34,
  "SAN PABLO": 65,
  TANAUAN: 72,
  "CITY OF TANAUAN": 72,
  LIPA: 82,
  "CITY OF LIPA": 82,
  "BATANGAS CITY": 98,
  "CITY OF BATANGAS": 98,
  NASUGBU: 65,
  ANTIPOLO: 50,
  "CITY OF ANTIPOLO": 50,
  CAINTA: 44,
  TAYTAY: 42,
};

const normalizeCity = (raw = "") =>
  raw
    .toUpperCase()
    .replace(/\bCITY\b/g, "")
    .replace(/\bMUNICIPALITY\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

const getDistanceFee = (cityName) => {
  if (!cityName) return { fee: 0, tier: DISTANCE_TIERS[0], km: 0 };
  const upper = cityName.toUpperCase().trim();
  const km =
    CITY_DISTANCES[upper] ?? CITY_DISTANCES[normalizeCity(upper)] ?? null;
  const resolvedKm = km ?? 130;
  const tier =
    DISTANCE_TIERS.find((t) => resolvedKm <= t.maxKm) ||
    DISTANCE_TIERS[DISTANCE_TIERS.length - 1];
  return { fee: tier.fee, tier, km: resolvedKm, isEstimate: km === null };
};

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

const formatLocalDate = (date) => {
  const y = date.getFullYear(),
    m = String(date.getMonth() + 1).padStart(2, "0"),
    d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};
const todayISO = () => formatLocalDate(new Date());
const getTodayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const formatDate = (date) => formatLocalDate(date);
// const sixMonthsFromToday = () => {
//   const d = getTodayStart();
//   d.setMonth(d.getMonth() + 6);
//   return d;
// };
// const sevenDaysFromToday = () => {
//   const d = getTodayStart();
//   d.setDate(d.getDate() + 7);
//   return d;
// };
const addDaysToISODate = (dateISO, days) => {
  const d = new Date(dateISO || todayISO());
  d.setDate(d.getDate() + days);
  return formatLocalDate(d);
};
const getAvailablePickupSlots = (forDate = todayISO()) => {
  if (forDate !== todayISO()) return ALL_TIME_SLOTS;
  const now = new Date();
  const cutoff = now.getHours() * 60 + now.getMinutes() + 30;
  return ALL_TIME_SLOTS.filter((s) => {
    const [h] = s.value.split(":").map(Number);
    return h * 60 > cutoff;
  });
};
const getValidReturnSlots = (pickupDate, returnDate, pickupTime) => {
  if (!returnDate || !pickupDate || returnDate !== pickupDate)
    return ALL_TIME_SLOTS;
  return ALL_TIME_SLOTS.filter((s) => s.value > pickupTime);
};
const calculateDays = (from, to) => {
  if (!from || !to) return 1;
  return Math.max(
    1,
    Math.ceil((new Date(to) - new Date(from)) / (1000 * 60 * 60 * 24)),
  );
};
const parseLocalDateTime = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return null;
  const dt = new Date(`${dateStr}T${timeStr}:00`);
  return Number.isNaN(dt.getTime()) ? null : dt;
};

const CLOUDINARY_CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
const buildImageSrc = (image) => {
  if (!image) return `${API_BASE}/uploads/default-motorcycle.png`;
  if (Array.isArray(image)) image = image[0];
  if (!image || typeof image !== "string")
    return `${API_BASE}/uploads/default-motorcycle.png`;
  const t = image.trim();
  if (!t) return `${API_BASE}/uploads/default-motorcycle.png`;
  if (/^data:image\//i.test(t) || /^https?:\/\//i.test(t)) return t;
  if (t.startsWith("res.cloudinary.com/")) return "https://" + t;
  if (t.startsWith("/dxta0nmdy/") || t.startsWith("dxta0nmdy/"))
    return "https://res.cloudinary.com/" + t.replace(/^\/+/, "");
  if (t.startsWith("https://anaias-motorcycle-rental.onrender.com/uploads/"))
    return t;
  if (t.startsWith("local/"))
    return `https://anaias-motorcycle-rental.onrender.com/uploads/${t.replace("local/", "")}`;
  if (CLOUDINARY_CLOUD_NAME && t)
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${t}`;
  return `https://anaias-motorcycle-rental.onrender.com/uploads/${t}`;
};
const handleImageError = (e) => {
  const img = e?.target;
  if (!img) return;
  img.onerror = null;
  img.src = `${API_BASE}/uploads/default-motorcycle.png`;
  img.onerror = () => {
    img.onerror = null;
    img.src = "https://via.placeholder.com/800x500.png?text=No+Image";
  };
};

/* ── Calendar Helpers ──────────────────────────────────────────── */
const toDateKey = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
const addMonths = (date, amount) =>
  new Date(date.getFullYear(), date.getMonth() + amount, 1);
const getMonthGrid = (monthDate) => {
  const firstDay = startOfMonth(monthDate);
  const firstWeekday = firstDay.getDay();
  const gridStart = new Date(firstDay);
  gridStart.setDate(gridStart.getDate() - firstWeekday);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
};
const MAINTENANCE_STORAGE_KEY = "moto_maintenance_schedules";
const loadMaintenanceSchedules = () => {
  try {
    return JSON.parse(localStorage.getItem(MAINTENANCE_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};
const addDaysHelper = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

/* ── Shared styles ─────────────────────────────────────────────── */
const S = {
  card: {
    background: "#fff",
    borderRadius: 18,
    border: "1.5px solid rgba(0,0,0,0.07)",
    padding: "22px",
  },
  label: {
    display: "block",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "2px",
    textTransform: "uppercase",
    color: "rgba(0,0,0,0.35)",
    marginBottom: 6,
    fontFamily: "'Space Grotesk',sans-serif",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px 10px 38px",
    borderRadius: 10,
    border: "1.5px solid rgba(0,0,0,0.09)",
    background: "#F5F5F3",
    fontSize: 13,
    fontFamily: "'Space Grotesk',sans-serif",
    color: "#0E0E0E",
    outline: "none",
  },
  select: {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 32px 10px 38px",
    borderRadius: 10,
    border: "1.5px solid rgba(0,0,0,0.09)",
    background: "#F5F5F3",
    fontSize: 13,
    fontFamily: "'Space Grotesk',sans-serif",
    color: "#0E0E0E",
    outline: "none",
    appearance: "none",
  },
  fieldWrap: { position: "relative", display: "flex", alignItems: "center" },
  fieldIcon: {
    position: "absolute",
    left: 12,
    color: "#b50002",
    fontSize: 13,
    pointerEvents: "none",
    zIndex: 1,
  },
  chevron: {
    position: "absolute",
    right: 10,
    color: "rgba(0,0,0,0.3)",
    fontSize: 11,
    pointerEvents: "none",
  },
  btnPrimary: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "11px 22px",
    borderRadius: 12,
    background: "#b50002",
    color: "#fff",
    fontSize: 13,
    fontWeight: 700,
    fontFamily: "'Space Grotesk',sans-serif",
    border: "none",
    cursor: "pointer",
  },
  btnSecondary: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    color: "rgba(0,0,0,0.4)",
    fontFamily: "'Space Grotesk',sans-serif",
  },
  btnDark: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "11px 22px",
    borderRadius: 12,
    background: "#0E0E0E",
    color: "#fff",
    fontSize: 13,
    fontWeight: 700,
    fontFamily: "'Space Grotesk',sans-serif",
    border: "none",
    cursor: "pointer",
  },
};

/* ── Inline Calendar Picker ────────────────────────────────────── */
const InlineDatePicker = ({
  value,
  onChange,
  minDate,
  maxDate,
  label,
  mode, // "pickup" | "return"
  pickupDateISO,
  maintenanceRanges = [],
  bookingRanges = [],
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => {
    if (value) return new Date(value + "T00:00:00");
    return new Date();
  });
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const monthGrid = getMonthGrid(viewMonth);
  const minD = minDate ? new Date(minDate + "T00:00:00") : null;
  const maxD = maxDate ? new Date(maxDate + "T00:00:00") : null;

  const isMaintenanceDay = (date) => {
    const dk = toDateKey(date);
    return maintenanceRanges.some(
      (s) => dk >= toDateKey(s.startDate) && dk <= toDateKey(s.endDate),
    );
  };
  const isBufferDay = (date) => {
    const dk = toDateKey(date);
    return maintenanceRanges.some((s) => {
      const buf = addDaysHelper(s.startDate, -1);
      return dk === toDateKey(buf);
    });
  };
  const isBookedDay = (date) => {
    const dk = toDateKey(date);
    return bookingRanges.some(
      (b) => dk >= toDateKey(b.pickupDate) && dk <= toDateKey(b.returnDate),
    );
  };

  const handleDayClick = (date) => {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    if (minD && d < minD) return;
    if (maxD && d > maxD) return;
    if (isMaintenanceDay(date)) return;
    if (mode === "return" && isBufferDay(date)) return;
    onChange(formatLocalDate(d));
    setOpen(false);
  };

  const displayValue = value
    ? new Date(value + "T00:00:00").toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const monthLabel = viewMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Trigger button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "10px 12px 10px 38px",
          borderRadius: 10,
          border: `1.5px solid ${open ? "#b50002" : "rgba(0,0,0,0.09)"}`,
          background: disabled ? "rgba(245,245,243,0.6)" : "#F5F5F3",
          fontSize: 13,
          fontFamily: "'Space Grotesk',sans-serif",
          color: value ? "#0E0E0E" : "rgba(0,0,0,0.35)",
          outline: "none",
          cursor: disabled ? "not-allowed" : "pointer",
          textAlign: "left",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          transition: "border-color 0.2s",
        }}
      >
        <FaCalendarAlt
          style={{
            position: "absolute",
            left: 12,
            color: "#b50002",
            fontSize: 13,
            pointerEvents: "none",
          }}
        />
        <span style={{ flex: 1 }}>{displayValue || `Select ${label}`}</span>
        <FaChevronDown
          style={{
            fontSize: 10,
            color: "rgba(0,0,0,0.3)",
            transition: "transform 0.2s",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {/* Dropdown calendar */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 200,
            background: "#fff",
            borderRadius: 18,
            border: "1.5px solid rgba(0,0,0,0.09)",
            boxShadow: "0 16px 48px rgba(0,0,0,0.14)",
            padding: 16,
            minWidth: 300,
            width: "100%",
            maxWidth: 340,
            animation: "calFadeIn 0.18s ease",
          }}
        >
          {/* Month navigation */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <button
              type="button"
              onClick={() => setViewMonth((v) => addMonths(v, -1))}
              style={{
                ...S.btnSecondary,
                padding: "5px 8px",
                borderRadius: 8,
                background: "#F5F5F3",
                color: "#0E0E0E",
              }}
            >
              <FaChevronLeft size={10} />
            </button>
            <span
              style={{
                fontSize: 13,
                fontWeight: 800,
                fontFamily: "'Space Grotesk',sans-serif",
                color: "#0E0E0E",
              }}
            >
              {monthLabel}
            </span>
            <button
              type="button"
              onClick={() => setViewMonth((v) => addMonths(v, 1))}
              style={{
                ...S.btnSecondary,
                padding: "5px 8px",
                borderRadius: 8,
                background: "#F5F5F3",
                color: "#0E0E0E",
              }}
            >
              <FaChevronRight size={10} />
            </button>
          </div>

          {/* Day headers */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7,1fr)",
              gap: 2,
              marginBottom: 4,
            }}
          >
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <div
                key={d}
                style={{
                  textAlign: "center",
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: "1px",
                  color: "rgba(0,0,0,0.3)",
                  fontFamily: "'Space Grotesk',sans-serif",
                  padding: "4px 0",
                }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7,1fr)",
              gap: 2,
            }}
          >
            {monthGrid.map((date) => {
              const inMonth = date.getMonth() === viewMonth.getMonth();
              const dk = toDateKey(date);
              const isSelected = value === dk;
              const d = new Date(
                date.getFullYear(),
                date.getMonth(),
                date.getDate(),
              );
              const tooEarly = minD && d < minD;
              const tooLate = maxD && d > maxD;
              const isMaint = isMaintenanceDay(date);
              const isBuf = isBufferDay(date);
              const isBooked = isBookedDay(date);
              const isDisabled =
                tooEarly ||
                tooLate ||
                isMaint ||
                (mode === "return" && isBuf) ||
                isBooked;
              const isToday = dk === todayISO();

              // Pickup range highlight (show range between pickup and return)
              const isPickupDate = mode === "return" && pickupDateISO === dk;
              const isInRange =
                mode === "return" &&
                pickupDateISO &&
                value &&
                dk > pickupDateISO &&
                dk < value;

              let bg = "transparent";
              let color = inMonth ? "#0E0E0E" : "rgba(0,0,0,0.2)";
              let border = "1.5px solid transparent";
              let cursor = isDisabled ? "not-allowed" : "pointer";
              let opacity = isDisabled
                ? isMaint || (mode === "return" && isBuf)
                  ? 1
                  : 0.3
                : 1;

              if (isSelected) {
                bg = "#0E0E0E";
                color = "#fff";
                border = "1.5px solid #0E0E0E";
              } else if (isPickupDate) {
                bg = "#b50002";
                color = "#fff";
                border = "1.5px solid #b50002";
              } else if (isInRange) {
                bg = "rgba(181,0,2,0.07)";
                border = "1.5px solid rgba(181,0,2,0.12)";
              } else if (isMaint) {
                bg = "rgba(124,58,237,0.08)";
                color = "#7c3aed";
                border = "1.5px solid rgba(124,58,237,0.2)";
              } else if (isBuf && mode === "return") {
                bg = "rgba(245,158,11,0.08)";
                color = "#b45309";
                border = "1.5px solid rgba(245,158,11,0.25)";
              } else if (isBooked && !isSelected) {
                bg = "rgba(181,0,2,0.05)";
                border = "1.5px solid rgba(181,0,2,0.1)";
              } else if (isToday && inMonth) {
                border = "1.5px solid rgba(0,0,0,0.2)";
              }

              return (
                <button
                  key={dk}
                  type="button"
                  disabled={isDisabled || !inMonth}
                  onClick={() => inMonth && !isDisabled && handleDayClick(date)}
                  title={
                    isMaint
                      ? "Under maintenance"
                      : isBuf && mode === "return"
                        ? "Buffer day — maintenance starts tomorrow"
                        : undefined
                  }
                  style={{
                    background: bg,
                    color,
                    border,
                    borderRadius: 8,
                    padding: "6px 2px",
                    fontSize: 11,
                    fontWeight: isSelected || isToday ? 800 : 600,
                    fontFamily: "'Space Grotesk',sans-serif",
                    cursor,
                    opacity,
                    minHeight: 30,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                    transition: "all 0.15s",
                    position: "relative",
                  }}
                >
                  {date.getDate()}
                  {isMaint && inMonth && (
                    <span
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: "50%",
                        background: isSelected ? "#fff" : "#7c3aed",
                        flexShrink: 0,
                      }}
                    />
                  )}
                  {isBuf && !isMaint && inMonth && (
                    <span
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: "50%",
                        background: "#f59e0b",
                        flexShrink: 0,
                      }}
                    />
                  )}
                  {isBooked && !isMaint && !isBuf && !isSelected && inMonth && (
                    <span
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: "50%",
                        background: "rgba(181,0,2,0.4)",
                        flexShrink: 0,
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div
            style={{
              marginTop: 12,
              paddingTop: 10,
              borderTop: "1px solid rgba(0,0,0,0.06)",
              display: "flex",
              flexWrap: "wrap",
              gap: "6px 12px",
            }}
          >
            {[
              { dot: "#7c3aed", label: "Maintenance" },
              { dot: "#f59e0b", label: "Buffer day" },
              { dot: "rgba(181,0,2,0.4)", label: "Booked" },
            ].map(({ dot, label }) => (
              <div
                key={label}
                style={{ display: "flex", alignItems: "center", gap: 5 }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: dot,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 10,
                    color: "rgba(0,0,0,0.4)",
                    fontFamily: "'Space Grotesk',sans-serif",
                    fontWeight: 600,
                  }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Field wrapper ─────────────────────────────────────────────── */
const Field = ({ icon: Icon, label, hint, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    {label && <label style={S.label}>{label}</label>}
    <div
      style={{ position: "relative", display: "flex", alignItems: "center" }}
    >
      {Icon && (
        <Icon
          style={{
            position: "absolute",
            left: 12,
            color: "#b50002",
            fontSize: 13,
            pointerEvents: "none",
            zIndex: 1,
          }}
        />
      )}
      {children}
    </div>
    {hint && (
      <p
        style={{
          fontSize: 11,
          color: "rgba(0,0,0,0.35)",
          marginTop: 2,
          fontFamily: "'Space Grotesk',sans-serif",
        }}
      >
        {hint}
      </p>
    )}
  </div>
);

/* ── Alert Modal ───────────────────────────────────────────────── */
const AlertModal = ({ message, onClose, isError, title }) => (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.5)",
      backdropFilter: "blur(4px)",
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
    }}
    onClick={onClose}
  >
    <div
      style={{
        background: "#fff",
        borderRadius: 20,
        padding: 28,
        maxWidth: 400,
        width: "100%",
        boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: "rgba(181,0,2,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 14px",
          }}
        >
          {isError ? (
            <FaExclamationTriangle style={{ color: "#b50002", fontSize: 20 }} />
          ) : (
            <FaInfoCircle style={{ color: "#0E0E0E", fontSize: 20 }} />
          )}
        </div>
        <h3
          style={{
            fontSize: 17,
            fontWeight: 800,
            color: "#0E0E0E",
            marginBottom: 8,
            fontFamily: "'Space Grotesk',sans-serif",
          }}
        >
          {title ?? (isError ? "Error" : "Notice")}
        </h3>
        <p
          style={{
            fontSize: 13,
            color: "rgba(0,0,0,0.55)",
            marginBottom: 20,
            fontFamily: "'Space Grotesk',sans-serif",
          }}
        >
          {message}
        </p>
        <button
          onClick={onClose}
          style={{ ...S.btnPrimary, width: "100%", justifyContent: "center" }}
        >
          OK
        </button>
      </div>
    </div>
  </div>
);

const alertModal = (message, { isError = false, title } = {}) =>
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
      <AlertModal
        message={message}
        isError={isError}
        title={title}
        onClose={cleanup}
      />,
    );
  });

/* ── Active Booking Block Modal ────────────────────────────────── */
const ActiveBookingBlockModal = ({
  existingBooking,
  onClose,
  onViewBookings,
}) => (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.5)",
      backdropFilter: "blur(4px)",
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
    }}
    onClick={onClose}
  >
    <div
      style={{
        background: "#fff",
        borderRadius: 20,
        padding: 28,
        maxWidth: 400,
        width: "100%",
        boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: "rgba(181,0,2,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 14px",
          }}
        >
          <FaMotorcycle style={{ color: "#b50002", fontSize: 22 }} />
        </div>
        <h3
          style={{
            fontSize: 17,
            fontWeight: 800,
            color: "#0E0E0E",
            marginBottom: 8,
            fontFamily: "'Space Grotesk',sans-serif",
          }}
        >
          Active Booking Exists
        </h3>
        <p
          style={{
            fontSize: 13,
            color: "rgba(0,0,0,0.55)",
            marginBottom: 6,
            fontFamily: "'Space Grotesk',sans-serif",
          }}
        >
          You already have an active booking for{" "}
          <strong style={{ color: "#b50002" }}>
            {existingBooking?.motorcycle || "a motorcycle"}
          </strong>
          .
        </p>
        <p
          style={{
            fontSize: 12,
            color: "rgba(0,0,0,0.38)",
            marginBottom: 20,
            fontFamily: "'Space Grotesk',sans-serif",
          }}
        >
          Only one motorcycle can be rented per account at a time.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            style={{ ...S.btnPrimary, flex: 1, justifyContent: "center" }}
          >
            Close
          </button>
          <button
            onClick={onViewBookings}
            style={{ ...S.btnDark, flex: 1, justifyContent: "center" }}
          >
            My Bookings
          </button>
        </div>
      </div>
    </div>
  </div>
);

const activeBookingBlockModal = (existingBooking, navigate) =>
  new Promise((resolve) => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);
    const cleanup = (go) => {
      root.unmount();
      document.body.removeChild(container);
      if (go) navigate("/bookings");
      resolve();
    };
    root.render(
      <ActiveBookingBlockModal
        existingBooking={existingBooking}
        onClose={() => cleanup(false)}
        onViewBookings={() => cleanup(true)}
      />,
    );
  });

/* ── Booking Success Modal ─────────────────────────────────────── */
const BookingSuccessModal = ({ booking, onClose }) => {
  if (!booking) return null;
  const dueAtPickup = booking.totalAmount - DOWNPAYMENT;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 24,
          maxWidth: 440,
          width: "100%",
          overflow: "hidden",
          boxShadow: "0 24px 80px rgba(0,0,0,0.18)",
        }}
      >
        <div
          style={{
            background: "#fff",
            padding: "28px 28px 24px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "rgba(34,197,94,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px",
            }}
          >
            <FaCheckCircle style={{ color: "#22c55e", fontSize: 24 }} />
          </div>
          <h2
            style={{
              color: "#0E0E0E",
              fontSize: 18,
              fontWeight: 800,
              fontFamily: "'Space Grotesk',sans-serif",
              marginBottom: 4,
            }}
          >
            Reservation Submitted!
          </h2>
          <p
            style={{
              color: "rgba(0,0,0,0.45)",
              fontSize: 12,
              fontFamily: "'Space Grotesk',sans-serif",
            }}
          >
            Payment proof uploaded — awaiting admin verification
          </p>
        </div>
        <div style={{ padding: "20px 24px" }}>
          <div
            style={{
              background: "#F5F5F3",
              borderRadius: 14,
              padding: "16px",
              marginBottom: 14,
            }}
          >
            {[
              ["Motorcycle", booking.motorcycleName],
              ["Pickup Date", booking.pickupDate],
              ["Return Date", booking.returnDate],
              ["Destination", booking.destination],
            ].map(([k, v]) => (
              <div
                key={k}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "6px 0",
                  borderBottom: "1px solid rgba(0,0,0,0.05)",
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    color: "rgba(0,0,0,0.45)",
                    fontFamily: "'Space Grotesk',sans-serif",
                  }}
                >
                  {k}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#0E0E0E",
                    fontFamily: "'Space Grotesk',sans-serif",
                    maxWidth: "55%",
                    textAlign: "right",
                  }}
                >
                  {v}
                </span>
              </div>
            ))}
            <div
              style={{
                borderTop: "1.5px solid rgba(0,0,0,0.08)",
                marginTop: 8,
                paddingTop: 8,
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "rgba(0,0,0,0.5)",
                  fontFamily: "'Space Grotesk',sans-serif",
                }}
              >
                Due at Pickup
              </span>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: "#0E0E0E",
                  fontFamily: "'Space Grotesk',sans-serif",
                }}
              >
                ₱{dueAtPickup}
              </span>
            </div>
          </div>
          <div
            style={{
              background: "#fffbeb",
              border: "1.5px solid #fde68a",
              borderRadius: 12,
              padding: "10px 14px",
              marginBottom: 12,
              display: "flex",
              gap: 8,
              fontSize: 12,
              color: "#92400e",
              fontFamily: "'Space Grotesk',sans-serif",
            }}
          >
            <FaInfoCircle style={{ marginTop: 2, flexShrink: 0 }} />
            <span>
              Status is now Pending Reservation. Once approved, you can proceed
              to pickup.
            </span>
          </div>
        </div>
        <div style={{ padding: "0 24px 24px", display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            style={{ ...S.btnPrimary, flex: 1, justifyContent: "center" }}
          >
            Close
          </button>
          <button
            onClick={() => {
              onClose();
              window.location.href = "/bookings";
            }}
            style={{ ...S.btnDark, flex: 1, justifyContent: "center" }}
          >
            My Bookings
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Destination Select ────────────────────────────────────────── */
const useDestinationAddress = () => {
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [hasProvinces, setHasProvinces] = useState(false);
  const [loadingState, setLoadingState] = useState({});

  useEffect(() => {
    (async () => {
      setLoadingState((p) => ({ ...p, regions: true }));
      try {
        const res = await axios.get(`${PH_API}/regions/`);
        setRegions(res.data.sort((a, b) => a.name.localeCompare(b.name)));
      } catch {
      } finally {
        setLoadingState((p) => ({ ...p, regions: false }));
      }
    })();
  }, []);

  const fetchProvincesOrCities = useCallback(async (regionCode) => {
    if (!regionCode) {
      setProvinces([]);
      setCities([]);
      setBarangays([]);
      setHasProvinces(false);
      return;
    }
    setLoadingState((p) => ({ ...p, provinces: true }));
    setCities([]);
    setBarangays([]);
    try {
      const res = await axios.get(`${PH_API}/regions/${regionCode}/provinces/`);
      const data = res.data || [];
      if (data.length > 0) {
        setProvinces(data.sort((a, b) => a.name.localeCompare(b.name)));
        setHasProvinces(true);
      } else {
        setProvinces([]);
        setHasProvinces(false);
        setLoadingState((p) => ({ ...p, cities: true }));
        try {
          const r2 = await axios.get(
            `${PH_API}/regions/${regionCode}/cities-municipalities/`,
          );
          setCities(
            (r2.data || []).sort((a, b) => a.name.localeCompare(b.name)),
          );
        } catch {
        } finally {
          setLoadingState((p) => ({ ...p, cities: false }));
        }
      }
    } catch {
      setProvinces([]);
      setHasProvinces(false);
      setLoadingState((p) => ({ ...p, cities: true }));
      try {
        const r2 = await axios.get(
          `${PH_API}/regions/${regionCode}/cities-municipalities/`,
        );
        setCities((r2.data || []).sort((a, b) => a.name.localeCompare(b.name)));
      } catch {
      } finally {
        setLoadingState((p) => ({ ...p, cities: false }));
      }
    } finally {
      setLoadingState((p) => ({ ...p, provinces: false }));
    }
  }, []);

  const fetchCities = useCallback(async (provinceCode) => {
    if (!provinceCode) {
      setCities([]);
      setBarangays([]);
      return;
    }
    setLoadingState((p) => ({ ...p, cities: true }));
    try {
      const res = await axios.get(
        `${PH_API}/provinces/${provinceCode}/cities-municipalities/`,
      );
      setCities((res.data || []).sort((a, b) => a.name.localeCompare(b.name)));
      setBarangays([]);
    } catch {
    } finally {
      setLoadingState((p) => ({ ...p, cities: false }));
    }
  }, []);

  const fetchBarangays = useCallback(async (cityCode) => {
    if (!cityCode) {
      setBarangays([]);
      return;
    }
    setLoadingState((p) => ({ ...p, barangays: true }));
    try {
      const res = await axios.get(
        `${PH_API}/cities-municipalities/${cityCode}/barangays/`,
      );
      setBarangays(
        (res.data || []).sort((a, b) => a.name.localeCompare(b.name)),
      );
    } catch {
    } finally {
      setLoadingState((p) => ({ ...p, barangays: false }));
    }
  }, []);

  return {
    regions,
    provinces,
    cities,
    barangays,
    hasProvinces,
    loadingState,
    fetchProvincesOrCities,
    fetchCities,
    fetchBarangays,
  };
};

const DestinationSelect = ({ value, onChange }) => {
  const {
    regions,
    provinces,
    cities,
    barangays,
    hasProvinces,
    loadingState,
    fetchProvincesOrCities,
    fetchCities,
    fetchBarangays,
  } = useDestinationAddress();
  const [sel, setSel] = useState({
    regionCode: "",
    regionName: "",
    provinceCode: "",
    provinceName: "",
    cityCode: "",
    cityName: "",
    barangayCode: "",
    barangayName: "",
  });

  const handleRegion = (e) => {
    const code = e.target.value,
      name = regions.find((r) => r.code === code)?.name || "";
    setSel({
      regionCode: code,
      regionName: name,
      provinceCode: "",
      provinceName: "",
      cityCode: "",
      cityName: "",
      barangayCode: "",
      barangayName: "",
    });
    fetchProvincesOrCities(code);
    onChange("", "");
  };
  const handleProvince = (e) => {
    const code = e.target.value,
      name = provinces.find((p) => p.code === code)?.name || "";
    setSel((prev) => ({
      ...prev,
      provinceCode: code,
      provinceName: name,
      cityCode: "",
      cityName: "",
      barangayCode: "",
      barangayName: "",
    }));
    fetchCities(code);
    onChange("", "");
  };
  const handleCity = (e) => {
    const code = e.target.value,
      name = cities.find((c) => c.code === code)?.name || "";
    setSel((prev) => ({
      ...prev,
      cityCode: code,
      cityName: name,
      barangayCode: "",
      barangayName: "",
    }));
    fetchBarangays(code);
    onChange(
      [name, sel.provinceName, sel.regionName].filter(Boolean).join(", "),
      name,
    );
  };
  const handleBarangay = (e) => {
    const code = e.target.value,
      name = barangays.find((b) => b.code === code)?.name || "";
    setSel((prev) => ({ ...prev, barangayCode: code, barangayName: name }));
    onChange(
      [name, sel.cityName, sel.provinceName, sel.regionName]
        .filter(Boolean)
        .join(", "),
      sel.cityName,
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {[
        {
          show: true,
          val: sel.regionCode,
          handler: handleRegion,
          disabled: loadingState.regions,
          placeholder: loadingState.regions
            ? "Loading regions…"
            : "Select Region *",
          options: regions,
        },
        {
          show: !!(sel.regionCode && hasProvinces),
          val: sel.provinceCode,
          handler: handleProvince,
          disabled: loadingState.provinces,
          placeholder: loadingState.provinces
            ? "Loading provinces…"
            : "Select Province *",
          options: provinces,
        },
        {
          show: !!sel.regionCode,
          val: sel.cityCode,
          handler: handleCity,
          disabled:
            loadingState.cities ||
            (hasProvinces ? !sel.provinceCode : !sel.regionCode),
          placeholder: loadingState.cities
            ? "Loading cities…"
            : hasProvinces && !sel.provinceCode
              ? "Select a province first"
              : "Select City / Municipality *",
          options: cities,
        },
        {
          show: !!sel.cityCode,
          val: sel.barangayCode,
          handler: handleBarangay,
          disabled: loadingState.barangays,
          placeholder: loadingState.barangays
            ? "Loading barangays…"
            : "Select Barangay (optional)",
          options: barangays,
        },
      ]
        .filter((x) => x.show)
        .map((item, i) => (
          <div key={i} style={{ position: "relative" }}>
            <FaMapMarkerAlt
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#b50002",
                fontSize: 13,
                pointerEvents: "none",
                zIndex: 1,
              }}
            />
            <select
              style={S.select}
              value={item.val}
              onChange={item.handler}
              disabled={item.disabled}
              required={i === 0}
            >
              <option value="">{item.placeholder}</option>
              {item.options.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.name}
                </option>
              ))}
            </select>
            <FaChevronDown
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "rgba(0,0,0,0.3)",
                fontSize: 11,
                pointerEvents: "none",
              }}
            />
          </div>
        ))}
      {value && (
        <p
          style={{
            fontSize: 12,
            color: "#0E0E0E",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "'Space Grotesk',sans-serif",
          }}
        >
          <FaCheckCircle style={{ color: "#b50002", flexShrink: 0 }} />
          {value}
        </p>
      )}
    </div>
  );
};

/* ── Step Indicator ────────────────────────────────────────────── */
const StepIndicator = ({ step }) => {
  const steps = ["Schedule", "Your Info", "Review & Pay"];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 24,
      }}
    >
      {steps.map((label, i) => {
        const s = i + 1,
          active = s === step,
          done = s < step;
        return (
          <React.Fragment key={s}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 800,
                  fontFamily: "'Space Grotesk',sans-serif",
                  transition: "all 0.3s",
                  background: active
                    ? "#b50002"
                    : done
                      ? "#0E0E0E"
                      : "rgba(0,0,0,0.08)",
                  color: active || done ? "#fff" : "rgba(0,0,0,0.3)",
                }}
              >
                {done ? <FaCheckCircle style={{ fontSize: 11 }} /> : s}
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: "'Space Grotesk',sans-serif",
                  display: window.innerWidth < 640 ? "none" : "inline",
                  color: active
                    ? "#b50002"
                    : done
                      ? "#0E0E0E"
                      : "rgba(0,0,0,0.3)",
                }}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 1.5,
                  borderRadius: 999,
                  background: done ? "#0E0E0E" : "rgba(0,0,0,0.08)",
                  transition: "background 0.3s",
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

/* ── Review Row ────────────────────────────────────────────────── */
const ReviewRow = ({ label, value, accent, deduct }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      padding: "8px 0",
      borderBottom: "1px solid rgba(0,0,0,0.05)",
      gap: 12,
    }}
  >
    <span
      style={{
        fontSize: 11,
        color: "rgba(0,0,0,0.4)",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        fontFamily: "'Space Grotesk',sans-serif",
        flexShrink: 0,
      }}
    >
      {label}
    </span>
    <span
      style={{
        fontSize: 13,
        fontWeight: 700,
        textAlign: "right",
        fontFamily: "'Space Grotesk',sans-serif",
        color: deduct ? "#16a34a" : accent ? "#b50002" : "#0E0E0E",
      }}
    >
      {value}
    </span>
  </div>
);

/* ── Price Summary ─────────────────────────────────────────────── */
const PriceSummary = ({
  price,
  days,
  baseRental,
  distanceFee,
  helmetFee,
  totalAmount,
  discount,
}) => {
  const discountAmount = discount
    ? discount.discountType === "percentage"
      ? (baseRental * discount.discountValue) / 100
      : Math.min(discount.discountValue, baseRental)
    : 0;
  const discountedDailyRate = discount
    ? Math.round(computeDiscountedPrice(price, discount))
    : price;
  const discountedBaseRental = Math.max(0, baseRental - discountAmount);
  const discountedTotal = discountedBaseRental + distanceFee + helmetFee;
  const dueAtPickup = Math.max(0, discountedTotal - DOWNPAYMENT);
  return (
    <div style={{ ...S.card, background: "#F5F5F3" }}>
      <p style={{ ...S.label, marginBottom: 12 }}>Price Summary</p>
      <ReviewRow
        label="Rate / day"
        value={
          discount ? (
            <span
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 6,
                justifyContent: "flex-end",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  textDecoration: "line-through",
                  opacity: 0.4,
                  fontSize: 11,
                }}
              >
                ₱{price}
              </span>
              <span style={{ color: "#b50002" }}>₱{discountedDailyRate}</span>
            </span>
          ) : (
            `₱${price}`
          )
        }
      />
      <ReviewRow label="Days" value={days} />
      <ReviewRow
        label="Rental Subtotal"
        value={
          discount ? (
            <span
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 6,
                justifyContent: "flex-end",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  textDecoration: "line-through",
                  opacity: 0.4,
                  fontSize: 11,
                }}
              >
                ₱{baseRental}
              </span>
              <span>₱{Math.round(discountedBaseRental)}</span>
            </span>
          ) : (
            `₱${baseRental}`
          )
        }
      />
      {discountAmount > 0 && (
        <ReviewRow
          label={`Promo${discount?.code ? ` (${discount.code})` : ""}`}
          value={`−₱${Math.round(discountAmount)}`}
          deduct
        />
      )}
      {distanceFee > 0 && (
        <ReviewRow label="Distance Fee" value={`+₱${distanceFee}`} accent />
      )}
      {helmetFee > 0 && (
        <ReviewRow label="Extra Helmet" value={`+₱${HELMET_FEE}`} accent />
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 10,
          paddingTop: 10,
          borderTop: "1.5px solid rgba(0,0,0,0.08)",
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "1px",
            color: "#0E0E0E",
            fontFamily: "'Space Grotesk',sans-serif",
          }}
        >
          Total
        </span>
        <span
          style={{
            fontSize: 16,
            fontWeight: 800,
            color: "#0E0E0E",
            fontFamily: "'Space Grotesk',sans-serif",
          }}
        >
          ₱{totalAmount}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 4,
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: "rgba(0,0,0,0.4)",
            fontFamily: "'Space Grotesk',sans-serif",
          }}
        >
          Downpayment (now)
        </span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#16a34a",
            fontFamily: "'Space Grotesk',sans-serif",
          }}
        >
          −₱{DOWNPAYMENT}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 4,
          paddingTop: 8,
          borderTop: "1.5px solid rgba(0,0,0,0.08)",
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "1px",
            color: "#0E0E0E",
            fontFamily: "'Space Grotesk',sans-serif",
          }}
        >
          Due at Pickup
        </span>
        <span
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: "#b50002",
            fontFamily: "'Space Grotesk',sans-serif",
          }}
        >
          ₱{dueAtPickup}
        </span>
      </div>
    </div>
  );
};

/* ── Main Component ────────────────────────────────────────────── */
const MotorcycleDetail = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [motorcycle, setMotorcycle] = useState(
    () => location.state?.motorcycle || null,
  );
  const [loadingMotorcycle, setLoadingMotorcycle] = useState(false);
  const [motorcycleError, setMotorcycleError] = useState("");
  const [currentImage, setCurrentImage] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [loadingUserProfile, setLoadingUserProfile] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [bookingStep, setBookingStep] = useState(1);
  const [isScheduleCollapsed, setIsScheduleCollapsed] = useState(true);
  const [isRenterCollapsed, setIsRenterCollapsed] = useState(true);
  const [isPricingCollapsed, setIsPricingCollapsed] = useState(true);
  const [checkoutLock, setCheckoutLock] = useState({
    expiresAt: "",
    lockMinutes: CHECKOUT_LOCK_FALLBACK_MINUTES,
  });
  const [lockSecondsLeft, setLockSecondsLeft] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState("");
  const [votingReviewId, setVotingReviewId] = useState("");

  // Calendar data state
  const [calBookings, setCalBookings] = useState([]);
  // const [calMotorcycles, setCalMotorcycles] = useState([]);
  const [maintenanceRanges, setMaintenanceRanges] = useState([]);

  const initialPickupSlots = getAvailablePickupSlots(todayISO());
  const defaultPickupTime =
    initialPickupSlots.length > 0 ? initialPickupSlots[0].value : "08:00";

  const [formData, setFormData] = useState({
    pickupDate: todayISO(),
    pickupTime: defaultPickupTime,
    returnDate: "",
    returnTime: "08:00",
    destination: "",
    destinationCity: "",
    pickupLocation: PICKUP_LOCATION,
    name: "",
    email: "",
    phone: "",
    fullAddress: "",
    barangay: "",
    city: "",
    state: "",
    region: "",
    zipCode: "",
    reservationPaymentMethod: "GCash",
    wantsHelmet: false,
    paymentReferenceId: "",
    paymentSentAt: "",
    paymentSentAmount: String(DOWNPAYMENT),
    paymentProofImage: null,
  });

  const getNextUnavailableDate = (pickupDateISO) => {
    if (!pickupDateISO) return null;
    const pickup = new Date(pickupDateISO + "T00:00:00");
    let earliest = null;

    const checkDate = (d) => {
      if (d > pickup) {
        if (!earliest || d < earliest) earliest = d;
      }
    };

    bookingRanges.forEach((b) => checkDate(b.pickupDate));
    currentMaintenanceRanges.forEach((m) => checkDate(m.startDate));

    if (earliest) {
      return formatDate(earliest);
    }
    return null;
  };

  const availablePickupSlots = getAvailablePickupSlots(formData.pickupDate);
  const noSlotsAvailable = availablePickupSlots.length === 0;
  const selectedQrPath =
    PAYMENT_QR_PATHS[formData.reservationPaymentMethod] ||
    PAYMENT_QR_PATHS.GCash;
  const fetchControllerRef = useRef(null);
  const submitControllerRef = useRef(null);
  const hasSubmittedRef = useRef(false);
  const lockTimerRef = useRef(null);
  const validReturnSlots = getValidReturnSlots(
    formData.pickupDate,
    formData.returnDate,
    formData.pickupTime,
  );
  const days = calculateDays(formData.pickupDate, formData.returnDate);
  const applicableDiscount = useApplicableDiscount(motorcycle, days);

  // Build booking ranges for the calendar
  const currentMotoId = motorcycle?._id || motorcycle?.id;
  const bookingRanges = calBookings
    .filter((b) => {
      const id =
        b.motorcycle?._id || b.motorcycle?.id || b.motorcycle || b.motorcycleId;
      return String(id) === String(currentMotoId);
    })
    .map((b) => {
      const status = String(b?.status || "").toLowerCase();
      if (["completed", "inspection", "canceled", "cancelled"].includes(status))
        return null;
      const pickupDate = new Date(b.pickupDate);
      const returnDate = new Date(b.returnDate);
      if (isNaN(pickupDate.getTime()) || isNaN(returnDate.getTime()))
        return null;
      return {
        ...b,
        pickupDate: new Date(
          pickupDate.getFullYear(),
          pickupDate.getMonth(),
          pickupDate.getDate(),
        ),
        returnDate: new Date(
          returnDate.getFullYear(),
          returnDate.getMonth(),
          returnDate.getDate(),
        ),
      };
    })
    .filter(Boolean);

  const currentMaintenanceRanges = maintenanceRanges.filter((m) => {
    const id = m.motorcycleId || m.motorcycle?._id || m.motorcycle?.id;
    return String(id) === String(currentMotoId);
  });

  // Load calendar data (bookings + motorcycle maintenance)
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const [bookingsRes, motoRes] = await Promise.allSettled([
          api.get("/api/motorcycle-bookings", {
            signal: controller.signal,
            params: { limit: 200 },
          }),
          api.get("/api/motorcycles", {
            signal: controller.signal,
            params: { limit: 200, includeDeleted: "false" },
          }),
        ]);
        if (bookingsRes.status === "fulfilled") {
          const payload = bookingsRes.value.data;
          setCalBookings(
            Array.isArray(payload)
              ? payload
              : Array.isArray(payload?.data)
                ? payload.data
                : [],
          );
        }
        if (motoRes.status === "fulfilled") {
          const payload = motoRes.value.data;
          const data = Array.isArray(payload)
            ? payload
            : payload?.data || payload?.motorcycles || [];
          // setCalMotorcycles(data);
          const now = new Date();
          const autoMaint = data
            .map((m) => {
              const rawStart =
                m.maintenanceScheduleStartAt || m.maintenanceScheduleAt || null;
              const rawEnd =
                m.maintenanceScheduleEndAt || m.maintenanceScheduleAt || null;
              if (!rawStart || !rawEnd) return null;
              const start = new Date(rawStart),
                end = new Date(rawEnd);
              if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
              if (end < now) return null;
              start.setHours(0, 0, 0, 0);
              end.setHours(0, 0, 0, 0);
              return {
                id: `auto-${m._id}`,
                motorcycleId: m._id,
                motorcycle: m,
                startDate: start,
                endDate: end,
                auto: true,
              };
            })
            .filter(Boolean);
          const stored = loadMaintenanceSchedules()
            .filter((s) => !s.cancelled && !s.completed)
            .map((s) => {
              const moto = data.find((m) => m._id === s.motorcycleId);
              const start = new Date(s.startDate),
                end = new Date(s.endDate);
              if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
              start.setHours(0, 0, 0, 0);
              end.setHours(0, 0, 0, 0);
              return { ...s, startDate: start, endDate: end, motorcycle: moto };
            })
            .filter(Boolean);
          setMaintenanceRanges([...autoMaint, ...stored]);
        }
      } catch {}
    })();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!formData.returnDate || validReturnSlots.length === 0) return;
    if (!validReturnSlots.some((s) => s.value === formData.returnTime))
      setFormData((p) => ({ ...p, returnTime: validReturnSlots[0].value }));
  }, [formData.returnDate, formData.returnTime, validReturnSlots]);

  const clearLockTimer = useCallback(() => {
    if (lockTimerRef.current) {
      clearInterval(lockTimerRef.current);
      lockTimerRef.current = null;
    }
  }, []);

  const releaseCheckoutLock = useCallback(
    async (silent = false) => {
      const motorcycleId = motorcycle?._id ?? motorcycle?.id;
      const token = localStorage.getItem("token");
      if (!motorcycleId || !token) return;
      try {
        await api.post(
          "/api/motorcycle-bookings/checkout-lock/release",
          { motorcycleId },
          { headers: { Authorization: `Bearer ${token}` } },
        );
      } catch {
        if (!silent)
          toast.error("Failed to release checkout session. Please retry.");
      }
    },
    [motorcycle],
  );

  const acquireCheckoutLock = useCallback(async () => {
    const motorcycleId = motorcycle?._id ?? motorcycle?.id;
    const token = localStorage.getItem("token");
    if (!motorcycleId || !token) {
      toast.error("Please login before continuing to payment.");
      return false;
    }
    try {
      const res = await api.post(
        "/api/motorcycle-bookings/checkout-lock/acquire",
        { motorcycleId },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setCheckoutLock({
        expiresAt: res.data?.lockExpiresAt || "",
        lockMinutes:
          Number(res.data?.lockMinutes) || CHECKOUT_LOCK_FALLBACK_MINUTES,
      });
      return true;
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        "This motorcycle is currently being rented by someone else.";
      if (err?.response?.data?.code === "MOTORCYCLE_LOCKED") {
        await alertModal(msg, {
          isError: true,
          title: "Motorcycle Unavailable",
        });
      } else toast.error(msg);
      return false;
    }
  }, [motorcycle]);

  useEffect(() => {
    clearLockTimer();
    if (bookingStep !== 3 || !checkoutLock.expiresAt) {
      setLockSecondsLeft(null);
      return;
    }
    const tick = async () => {
      const remaining = Math.max(
        0,
        Math.floor(
          (new Date(checkoutLock.expiresAt).getTime() - Date.now()) / 1000,
        ),
      );
      setLockSecondsLeft(remaining);
      if (remaining <= 0) {
        clearLockTimer();
        await releaseCheckoutLock(true);
        setCheckoutLock({
          expiresAt: "",
          lockMinutes: CHECKOUT_LOCK_FALLBACK_MINUTES,
        });
        setBookingStep(1);
        setFormData((p) => ({
          ...p,
          paymentReferenceId: "",
          paymentSentAt: "",
          paymentSentAmount: String(DOWNPAYMENT),
          paymentProofImage: null,
        }));
        toast.error(
          "Checkout session expired. Please start again from Step 1.",
        );
      }
    };
    tick();
    lockTimerRef.current = setInterval(tick, 1000);
    return () => clearLockTimer();
  }, [
    bookingStep,
    checkoutLock.expiresAt,
    clearLockTimer,
    releaseCheckoutLock,
  ]);

  useEffect(() => {
    return () => {
      clearLockTimer();
      if (checkoutLock.expiresAt) releaseCheckoutLock(true);
    };
  }, [checkoutLock.expiresAt, clearLockTimer, releaseCheckoutLock]);

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        setLoadingUserProfile(true);
        const res = await api.get("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success && res.data.user) {
          const u = res.data.user,
            addr = u.address || {};
          const addrParts = [
            addr.barangay,
            addr.city,
            addr.province,
            addr.region,
            addr.zipCode,
          ].filter(Boolean);
          setFormData((p) => ({
            ...p,
            name: u.name || "",
            email: u.email || "",
            phone: u.phone || "",
            fullAddress: addrParts.join(", "),
            barangay: addr.barangay || "",
            city: addr.city || "",
            state: addr.province || "",
            region: addr.region || "",
            zipCode: addr.zipCode || "",
          }));
        }
      } catch {
      } finally {
        setLoadingUserProfile(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (motorcycle) {
      setCurrentImage(0);
      return;
    }
    const controller = new AbortController();
    fetchControllerRef.current = controller;
    (async () => {
      setLoadingMotorcycle(true);
      setMotorcycleError("");
      try {
        const res = await api.get(`/api/motorcycles/${id}`, {
          signal: controller.signal,
        });
        const payload = res.data?.data ?? res.data ?? null;
        if (payload) setMotorcycle(payload);
        else setMotorcycleError("Motorcycle not found.");
      } catch (err) {
        const canceled =
          err?.code === "ERR_CANCELED" || err?.name === "CanceledError";
        if (!canceled)
          setMotorcycleError(
            err?.response?.data?.message || "Failed to load motorcycle",
          );
      } finally {
        setLoadingMotorcycle(false);
      }
    })();
    return () => {
      try {
        controller.abort();
      } catch {}
    };
  }, [id, motorcycle]);

  useEffect(() => {
    let mounted = true;
    const fetchReviews = async () => {
      if (!motorcycle) return;
      try {
        setReviewsLoading(true);
        setReviewsError("");
        const motorcycleId = motorcycle._id || motorcycle.id || id;
        const res = await api.get(`/api/reviews/motorcycle/${motorcycleId}`, {
          params: { limit: 6 },
        });
        const data = res.data || {};
        if (mounted)
          setReviews(
            Array.isArray(data.reviews) ? data.reviews : data.reviews || [],
          );
      } catch (err) {
        if (mounted)
          setReviewsError(
            err.response?.data?.message || "Failed to load reviews",
          );
      } finally {
        if (mounted) setReviewsLoading(false);
      }
    };
    fetchReviews();
    return () => {
      mounted = false;
    };
  }, [motorcycle, id]);

  const voteOnReview = useCallback(async (reviewId, vote) => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please log in to vote on a review.");
      return;
    }
    try {
      setVotingReviewId(reviewId);
      const res = await api.patch(
        `/api/reviews/${reviewId}/vote`,
        { vote },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const updated = res.data?.review || null;
      if (updated)
        setReviews((prev) =>
          prev.map((r) =>
            String(r._id || r.id) === String(reviewId)
              ? { ...r, ...updated }
              : r,
          ),
        );
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save vote.");
    } finally {
      setVotingReviewId("");
    }
  }, []);

  if (!motorcycle && loadingMotorcycle)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#F5F5F3",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontFamily: "'Space Grotesk',sans-serif",
            color: "#0E0E0E",
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              border: "2px solid #b50002",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 0.7s linear infinite",
            }}
          />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          Loading motorcycle…
        </div>
      </div>
    );
  if (!motorcycle && motorcycleError)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#F5F5F3",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p
          style={{
            color: "#b50002",
            fontFamily: "'Space Grotesk',sans-serif",
            fontWeight: 700,
          }}
        >
          {motorcycleError}
        </p>
      </div>
    );
  if (!motorcycle)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#F5F5F3",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p
          style={{
            color: "rgba(0,0,0,0.4)",
            fontFamily: "'Space Grotesk',sans-serif",
          }}
        >
          Motorcycle not found.
        </p>
      </div>
    );

  const motorcycleImages = [
    ...(Array.isArray(motorcycle.images) ? motorcycle.images : []),
    ...(motorcycle.image
      ? Array.isArray(motorcycle.image)
        ? motorcycle.image
        : [motorcycle.image]
      : []),
  ].filter(Boolean);
  const price = Number(motorcycle.price ?? motorcycle.dailyRate ?? 0) || 0;
  const {
    fee: distanceFee,
    tier: distanceTier,
    km: distanceKm,
    isEstimate,
  } = getDistanceFee(formData.destinationCity);
  const helmetFee = formData.wantsHelmet ? HELMET_FEE : 0;
  const baseRental = days * price;
  const discountAmount = applicableDiscount
    ? applicableDiscount.discountType === "percentage"
      ? (baseRental * applicableDiscount.discountValue) / 100
      : Math.min(applicableDiscount.discountValue, baseRental)
    : 0;
  const discountedBaseRental = Math.max(0, baseRental - discountAmount);
  const totalAmount = discountedBaseRental + distanceFee + helmetFee;
  const dueAtPickup = Math.max(0, totalAmount - DOWNPAYMENT);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "zipCode") {
      const n = value.replace(/\D/g, "");
      if (n.length > 4) return;
      setFormData((p) => ({ ...p, zipCode: n }));
      return;
    }
    if (name === "wantsHelmet") {
      setFormData((p) => ({ ...p, wantsHelmet: e.target.checked }));
      return;
    }
    if (name === "paymentSentAmount") {
      setFormData((p) => ({ ...p, paymentSentAmount: String(DOWNPAYMENT) }));
      return;
    }
    if (name === "paymentProofImage") {
      setFormData((p) => ({
        ...p,
        paymentProofImage: e.target.files?.[0] || null,
      }));
      return;
    }
    if (name === "returnTime" || name === "pickupTime") {
      setFormData((p) => ({ ...p, [name]: value }));
      return;
    }
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handlePickupDateChange = (dateISO) => {
    const selected = new Date(dateISO);
    const todayStart = getTodayStart();
    if (selected < todayStart) return; // Removed maxDate condition here
    const newReturnDate =
      formData.returnDate && new Date(formData.returnDate) <= selected
        ? ""
        : formData.returnDate;
    const freshSlots = getAvailablePickupSlots(dateISO);
    setFormData((p) => ({
      ...p,
      pickupDate: dateISO,
      pickupTime: freshSlots.length > 0 ? freshSlots[0].value : "08:00",
      returnDate: newReturnDate,
    }));
  };

  const handleReturnDateChange = (dateISO) => {
    if (!dateISO) {
      setFormData((p) => ({ ...p, returnDate: "" }));
      return;
    }
    const selected = new Date(dateISO);
    if (selected < getTodayStart()) return; // Removed six months condition here
    if (selected <= new Date(formData.pickupDate)) {
      toast.error("Minimum rental duration is 24 hours.");
      return;
    }
    setFormData((p) => ({ ...p, returnDate: dateISO }));
  };

  const handleDestinationChange = (destString, cityName) => {
    setFormData((p) => ({
      ...p,
      destination: destString,
      destinationCity: cityName || "",
    }));
  };

  const checkExistingActiveBooking = async () => {
    try {
      const token = localStorage.getItem("token"),
        user = JSON.parse(localStorage.getItem("user") || "null");
      if (!token || !user?.id) return null;
      const res = await api.get("/api/motorcycle-bookings/mybooking", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const raw = Array.isArray(res.data)
        ? res.data
        : res.data.data || res.data.bookings || [];
      const BLOCKING = [
        "pending_reservation",
        "pending_full_payment",
        "pending",
        "active",
        "confirmed",
        "approved",
        "rented",
        "reserved",
      ];
      const active = raw.find((b) => {
        if (b.isDeleted) return false;
        return BLOCKING.includes((b.status || "").toLowerCase());
      });
      if (!active) return null;
      const snap = active.motorcycleSnapshot || {};
      const moto =
        active.motorcycle && typeof active.motorcycle === "object"
          ? active.motorcycle
          : snap;
      const motoName =
        moto.make && moto.model
          ? `${moto.make} ${moto.model}`
          : typeof active.motorcycle === "string"
            ? active.motorcycle
            : active.motorcycleName || "a motorcycle";
      return { motorcycle: motoName, status: active.status };
    } catch {
      return null;
    }
  };

  const handleStep1Next = (e) => {
    e.preventDefault();
    if (!formData.returnDate) {
      toast.error("Please select a return date.");
      return;
    }
    if (!formData.destination || formData.destination.trim() === "") {
      toast.error("Please select your destination.");
      return;
    }
    if (new Date(formData.returnDate) <= new Date(formData.pickupDate)) {
      toast.error("Minimum rental duration is 24 hours.");
      return;
    }
    const freshSlots = getAvailablePickupSlots(formData.pickupDate);
    if (freshSlots.length === 0) {
      toast.error("No pickup hours available for the selected date.");
      return;
    }
    if (!freshSlots.some((s) => s.value === formData.pickupTime)) {
      toast.error(
        "Selected pickup time is no longer available. Please choose a later time.",
      );
      return;
    }
    const pickupAt = parseLocalDateTime(
      formData.pickupDate,
      formData.pickupTime,
    );
    const returnAt = parseLocalDateTime(
      formData.returnDate,
      formData.returnTime,
    );
    if (!pickupAt || !returnAt) {
      toast.error("Please select valid pickup and return schedule.");
      return;
    }
    if (returnAt.getTime() - pickupAt.getTime() < 24 * 60 * 60 * 1000) {
      toast.error("Minimum rental duration is 24 hours.");
      return;
    }

    const isDateBookedOrMaintenance = (dateStr) => {
      const dk = dateStr;
      const isBooked = bookingRanges.some(
        (b) => dk >= toDateKey(b.pickupDate) && dk <= toDateKey(b.returnDate),
      );
      const isMaint = currentMaintenanceRanges.some(
        (m) => dk >= toDateKey(m.startDate) && dk <= toDateKey(m.endDate),
      );
      return isBooked || isMaint;
    };

    if (isDateBookedOrMaintenance(formData.pickupDate)) {
      toast.error(
        "Selected pickup date is currently booked or under maintenance.",
      );
      return;
    }
    if (isDateBookedOrMaintenance(formData.returnDate)) {
      toast.error(
        "Selected return date is currently booked or under maintenance.",
      );
      return;
    }

    const nextUnavail = getNextUnavailableDate(formData.pickupDate);
    if (formData.returnDate > nextUnavail) {
      toast.error(
        "Selected dates overlap with an existing booking or maintenance.",
      );
      return;
    }
    if (motorcycle) {
      const rawStart =
        motorcycle.maintenanceScheduleStartAt ||
        motorcycle.maintenanceScheduleAt ||
        null;
      const rawEnd =
        motorcycle.maintenanceScheduleEndAt ||
        motorcycle.maintenanceScheduleAt ||
        null;
      if (rawStart && rawEnd) {
        const ms = new Date(rawStart),
          me = new Date(rawEnd);
        ms.setHours(0, 0, 0, 0);
        me.setHours(23, 59, 59, 999);
        const pd = new Date(pickupAt),
          rd = new Date(returnAt);
        pd.setHours(0, 0, 0, 0);
        rd.setHours(0, 0, 0, 0);
        if (!(rd < ms || pd > me)) {
          const sl = ms.toLocaleDateString("en-PH", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
          const el = me.toLocaleDateString("en-PH", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
          toast.error(
            `This motorcycle is scheduled for maintenance on ${sl === el ? sl : `${sl} — ${el}`}. Please select different dates.`,
          );
          return;
        }
      }
    }
    setBookingStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStep2Next = async (e) => {
    e.preventDefault();
    const lockAcquired = await acquireCheckoutLock();
    if (!lockAcquired) {
      setBookingStep(1);
      return;
    }
    setBookingStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const formatLockCountdown = (seconds) => {
    const safe = Math.max(0, Number(seconds) || 0),
      mins = Math.floor(safe / 60)
        .toString()
        .padStart(2, "0"),
      secs = (safe % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (hasSubmittedRef.current || submitting) return;
    hasSubmittedRef.current = true;
    if (!formData.paymentReferenceId.trim()) {
      toast.error("Please enter your payment reference ID.");
      hasSubmittedRef.current = false;
      return;
    }
    if (!formData.paymentSentAt) {
      toast.error("Please enter when the payment was sent.");
      hasSubmittedRef.current = false;
      return;
    }
    if (Number(formData.paymentSentAmount || 0) !== DOWNPAYMENT) {
      toast.error(`Amount sent must be exactly ₱${DOWNPAYMENT}.`);
      hasSubmittedRef.current = false;
      return;
    }
    if (!formData.paymentProofImage) {
      toast.error("Please upload your payment proof image.");
      hasSubmittedRef.current = false;
      return;
    }
    const existingBooking = await checkExistingActiveBooking();
    if (existingBooking) {
      hasSubmittedRef.current = false;
      await activeBookingBlockModal(existingBooking, navigate);
      return;
    }
    setSubmitting(true);
    if (submitControllerRef.current) {
      try {
        submitControllerRef.current.abort();
      } catch {}
    }
    const controller = new AbortController();
    submitControllerRef.current = controller;
    try {
      const user = JSON.parse(localStorage.getItem("user")),
        token = localStorage.getItem("token");
      const form = new FormData();
      const payload = {
        userId: user?.id,
        customer: formData.name,
        email: formData.email,
        phone: formData.phone,
        motorcycle: {
          id: motorcycle._id ?? motorcycle.id ?? null,
          name:
            motorcycle.name ??
            `${motorcycle.make ?? ""} ${motorcycle.model ?? ""}`.trim(),
        },
        pickupDate: formData.pickupDate,
        pickupTime: formData.pickupTime,
        returnDate: formData.returnDate,
        returnTime: formData.returnTime,
        destination: formData.destination,
        amount: totalAmount,
        reservationPaymentMethod: formData.reservationPaymentMethod,
        paymentReferenceId: formData.paymentReferenceId,
        paymentSentAt: formData.paymentSentAt,
        paymentSentAmount: Number(formData.paymentSentAmount || DOWNPAYMENT),
        details: {
          pickupLocation: formData.pickupLocation,
          distanceFee,
          distanceTierLabel: distanceTier?.label || "",
          helmetRequested: formData.wantsHelmet,
          helmetFee,
          destinationCity: formData.destinationCity,
          downpayment: DOWNPAYMENT,
          appliedDiscount: applicableDiscount
            ? {
                id: applicableDiscount._id,
                name: applicableDiscount.name,
                code: applicableDiscount.code || "",
                discountType: applicableDiscount.discountType,
                discountValue: applicableDiscount.discountValue,
                discountAmount: Math.round(discountAmount),
                discountedBaseRental: Math.round(discountedBaseRental),
                discountedTotalAmount: Math.round(totalAmount),
              }
            : null,
        },
        address: {
          barangay: formData.barangay,
          city: formData.city,
          state: formData.state,
          region: formData.region,
          zipCode: formData.zipCode,
        },
        motorcycleImage: motorcycle.image
          ? buildImageSrc(
              Array.isArray(motorcycle.image)
                ? motorcycle.image[0]
                : motorcycle.image,
            )
          : undefined,
      };
      Object.entries(payload).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        if (typeof value === "object") {
          form.append(key, JSON.stringify(value));
          return;
        }
        form.append(key, String(value));
      });
      if (formData.paymentProofImage)
        form.append("paymentProofImage", formData.paymentProofImage);
      const headers = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      await api.post(`/api/motorcycle-bookings`, form, {
        headers,
        signal: controller.signal,
      });
      if (applicableDiscount?._id)
        api
          .patch(
            `/api/discounts/${applicableDiscount._id}/increment-usage`,
            {},
            { headers },
          )
          .catch(() => {});
      clearLockTimer();
      setCheckoutLock({
        expiresAt: "",
        lockMinutes: CHECKOUT_LOCK_FALLBACK_MINUTES,
      });
      setBookingSuccess({
        motorcycleName: `${motorcycle.make} ${motorcycle.model}`,
        pickupDate: formData.pickupDate,
        returnDate: formData.returnDate,
        destination: formData.destination,
        helmetIncluded: formData.wantsHelmet,
        distanceFee,
        totalAmount,
        dailyRate: price,
        days,
        baseRental,
      });
      setFormData((p) => ({
        ...p,
        pickupDate: todayISO(),
        pickupTime: getAvailablePickupSlots(todayISO())[0]?.value || "08:00",
        returnDate: "",
        returnTime: "08:00",
        destination: "",
        destinationCity: "",
        reservationPaymentMethod: "GCash",
        wantsHelmet: false,
        paymentReferenceId: "",
        paymentSentAt: "",
        paymentSentAmount: String(DOWNPAYMENT),
        paymentProofImage: null,
      }));
      setBookingStep(1);
    } catch (err) {
      const canceled =
        err?.code === "ERR_CANCELED" || err?.name === "CanceledError";
      if (canceled) return;
      if (
        ["LOCK_REQUIRED", "MOTORCYCLE_LOCKED"].includes(
          err?.response?.data?.code,
        )
      ) {
        clearLockTimer();
        setCheckoutLock({
          expiresAt: "",
          lockMinutes: CHECKOUT_LOCK_FALLBACK_MINUTES,
        });
        setBookingStep(1);
      }
      toast.error(
        String(
          err?.response?.data?.message ||
            err?.response?.data ||
            err.message ||
            "Booking failed",
        ),
      );
    } finally {
      setSubmitting(false);
      hasSubmittedRef.current = false;
    }
  };

  const slotLabel = (v) =>
    ALL_TIME_SLOTS.find((s) => s.value === v)?.label || v;

  /* ── RENDER ─────────────────────────────────────────────────── */
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes calFadeIn { from { opacity:0; transform:translateY(6px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }

        .md-page { background:#F5F5F3; min-height:100vh; padding:40px 24px 100px; font-family:'Space Grotesk',sans-serif; box-sizing:border-box; }
        @media(max-width:640px){ .md-page{padding:24px 14px 120px;} }

        .md-layout { max-width:1200px; margin:0 auto; display:grid; grid-template-columns:380px 1fr; gap:28px; align-items:start; }
        @media(max-width:1024px){ .md-layout{grid-template-columns:1fr;} }

        .md-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media(max-width: 640px) { .md-grid-2 { grid-template-columns: 1fr; } }

        .md-gallery { border-radius:20px; overflow:hidden; position:relative; background:#EEEDE9; aspect-ratio:4/3; }
        .md-gallery img { width:100%; height:100%; object-fit:cover; display:block; }
        .md-gallery-btn { position:absolute; top:50%; transform:translateY(-50%); width:34px; height:34px; border-radius:50%; background:rgba(255,255,255,0.9); border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#0E0E0E; box-shadow:0 2px 8px rgba(0,0,0,0.12); transition:background 0.18s; }
        .md-gallery-btn:hover { background:#fff; }
        .md-gallery-dots { position:absolute; bottom:12px; left:50%; transform:translateX(-50%); display:flex; gap:5px; }
        .md-gallery-dot { width:6px; height:6px; border-radius:999px; background:rgba(255,255,255,0.5); border:none; cursor:pointer; padding:0; transition:all 0.2s; }
        .md-gallery-dot.active { width:18px; background:#fff; }

        .md-specs { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:16px; }
        .md-spec { background:#F5F5F3; border-radius:12px; padding:12px 14px; }

        .md-form-card { background:#fff; border-radius:22px; border:1.5px solid rgba(0,0,0,0.07); overflow:hidden; animation:fadeUp 0.4s ease; }
        .md-form-header { background:#171717; padding:20px 24px; display:flex; align-items:center; justify-content:space-between; }
        .md-form-body { padding:24px; }

        .md-review { background:#F5F5F3; border-radius:14px; padding:14px; border:1.5px solid rgba(0,0,0,0.06); }
        .md-vote-btn { display:inline-flex; align-items:center; gap:6px; padding:5px 12px; border-radius:999px; font-size:11px; font-weight:700; font-family:'Space Grotesk',sans-serif; cursor:pointer; border:1.5px solid; transition:all 0.15s; }

        /* Calendar picker hover */
        .cal-day-btn:not(:disabled):hover { background: rgba(0,0,0,0.06) !important; border-color: rgba(0,0,0,0.15) !important; }

        input:focus, select:focus, textarea:focus { border-color:#b50002 !important; outline:none; }
      `}</style>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        theme="light"
        icon={false}
      />
      {bookingSuccess && (
        <BookingSuccessModal
          booking={bookingSuccess}
          onClose={() => {
            setBookingSuccess(null);
            navigate("/bookings");
          }}
        />
      )}

      <div className="md-page">
        <div style={{ maxWidth: 1200, margin: "0 auto 20px" }}>
          <button
            onClick={() => navigate(-1)}
            style={{ ...S.btnSecondary, color: "rgba(0,0,0,0.45)" }}
          >
            <FaArrowLeft style={{ fontSize: 11 }} /> Back to motorcycles
          </button>
        </div>

        <div className="md-layout">
          {/* ── LEFT COLUMN ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Gallery */}
            <div className="md-gallery">
              <img
                src={buildImageSrc(
                  motorcycleImages[currentImage] ?? motorcycle.image,
                )}
                alt={motorcycle.name}
                onError={handleImageError}
              />
              {motorcycleImages.length > 1 && (
                <>
                  <button
                    className="md-gallery-btn"
                    style={{ left: 10 }}
                    onClick={() =>
                      setCurrentImage((p) =>
                        p === 0 ? motorcycleImages.length - 1 : p - 1,
                      )
                    }
                  >
                    <FaArrowLeft size={11} />
                  </button>
                  <button
                    className="md-gallery-btn"
                    style={{ right: 10 }}
                    onClick={() =>
                      setCurrentImage((p) =>
                        p === motorcycleImages.length - 1 ? 0 : p + 1,
                      )
                    }
                  >
                    <FaArrowRight size={11} />
                  </button>
                  <div className="md-gallery-dots">
                    {motorcycleImages.map((_, idx) => (
                      <button
                        key={idx}
                        className={`md-gallery-dot ${idx === currentImage ? "active" : ""}`}
                        onClick={() => setCurrentImage(idx)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Motorcycle info card */}
            <div style={S.card}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: 4,
                }}
              >
                <div>
                  <h2
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color: "#0E0E0E",
                      letterSpacing: "-0.5px",
                      lineHeight: 1.2,
                      fontFamily: "'Space Grotesk',sans-serif",
                    }}
                  >
                    {motorcycle.make} {motorcycle.model}
                  </h2>
                  <p
                    style={{
                      fontSize: 13,
                      color: "rgba(0,0,0,0.4)",
                      marginTop: 2,
                      fontFamily: "'Space Grotesk',sans-serif",
                    }}
                  >
                    {motorcycle.year}
                  </p>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  {applicableDiscount ? (
                    <>
                      <p
                        style={{
                          fontSize: 11,
                          color: "rgba(0,0,0,0.35)",
                          textDecoration: "line-through",
                          fontFamily: "'Space Grotesk',sans-serif",
                        }}
                      >
                        ₱{price}/day
                      </p>
                      <p
                        style={{
                          fontSize: 22,
                          fontWeight: 800,
                          color: "#b50002",
                          fontFamily: "'Space Grotesk',sans-serif",
                        }}
                      >
                        ₱
                        {Math.round(
                          computeDiscountedPrice(price, applicableDiscount),
                        )}
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 500,
                            color: "rgba(0,0,0,0.4)",
                          }}
                        >
                          /day
                        </span>
                      </p>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          background: "rgba(22,163,74,0.1)",
                          color: "#16a34a",
                          border: "1px solid rgba(22,163,74,0.2)",
                          borderRadius: 999,
                          padding: "2px 8px",
                          fontFamily: "'Space Grotesk',sans-serif",
                        }}
                      >
                        {applicableDiscount.discountType === "percentage"
                          ? `−${applicableDiscount.discountValue}% off`
                          : `₱${applicableDiscount.discountValue} off`}
                      </span>
                    </>
                  ) : (
                    <p
                      style={{
                        fontSize: 22,
                        fontWeight: 800,
                        color: "#0E0E0E",
                        fontFamily: "'Space Grotesk',sans-serif",
                      }}
                    >
                      ₱{price}
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          color: "rgba(0,0,0,0.4)",
                        }}
                      >
                        /day
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {/* Maintenance warning */}
              {(() => {
                const rawStart =
                  motorcycle?.maintenanceScheduleStartAt ||
                  motorcycle?.maintenanceScheduleAt ||
                  null;
                const rawEnd =
                  motorcycle?.maintenanceScheduleEndAt ||
                  motorcycle?.maintenanceScheduleAt ||
                  null;
                if (!rawStart || !rawEnd) return null;
                const s = new Date(rawStart),
                  e = new Date(rawEnd);
                if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;
                // const sl = s.toLocaleDateString("en-PH", {
                //   month: "short",
                //   day: "numeric",
                //   year: "numeric",
                // });
                // const el = e.toLocaleDateString("en-PH", {
                //   month: "short",
                //   day: "numeric",
                //   year: "numeric",
                // });
                // return (
                //   <div
                //     style={{
                //       background: "#fffbeb",
                //       border: "1.5px solid #fde68a",
                //       borderRadius: 12,
                //       padding: "10px 14px",
                //       display: "flex",
                //       gap: 8,
                //       alignItems: "flex-start",
                //       marginTop: 12,
                //     }}
                //   >
                //     <FaExclamationTriangle
                //       style={{
                //         color: "#f59e0b",
                //         fontSize: 13,
                //         marginTop: 2,
                //         flexShrink: 0,
                //       }}
                //     />
                //     <div>
                //       <p
                //         style={{
                //           fontSize: 12,
                //           fontWeight: 700,
                //           color: "#78350f",
                //           fontFamily: "'Space Grotesk',sans-serif",
                //         }}
                //       >
                //         Maintenance Scheduled
                //       </p>
                //       <p
                //         style={{
                //           fontSize: 11,
                //           color: "#92400e",
                //           fontFamily: "'Space Grotesk',sans-serif",
                //           marginTop: 2,
                //         }}
                //       >
                //         Under maintenance:{" "}
                //         <strong>{sl === el ? sl : `${sl} — ${el}`}</strong>
                //       </p>
                //     </div>
                //   </div>
                // );
              })()}

              {/* Specs */}
              <div className="md-specs">
                {[
                  {
                    icon: FaCogs,
                    label: "Engine",
                    value: motorcycle.engineSize
                      ? `${motorcycle.engineSize}cc`
                      : "—",
                  },
                  {
                    icon: FaGasPump,
                    label: "Fuel",
                    value: motorcycle.fuel ?? motorcycle.fuelType ?? "—",
                  },
                  {
                    icon: FaTachometerAlt,
                    label: "Transmission",
                    value: motorcycle.transmission ?? "—",
                  },
                  {
                    icon: FaShieldAlt,
                    label: "ABS",
                    value: motorcycle.hasABS ? "Yes" : "No",
                  },
                ].map(({ icon: Icon, label, value }) => (
                  <div className="md-spec" key={label}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 4,
                      }}
                    >
                      <Icon style={{ color: "#b50002", fontSize: 12 }} />
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: "rgba(0,0,0,0.35)",
                          textTransform: "uppercase",
                          letterSpacing: "1px",
                          fontFamily: "'Space Grotesk',sans-serif",
                        }}
                      >
                        {label}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#0E0E0E",
                        fontFamily: "'Space Grotesk',sans-serif",
                      }}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>
              {motorcycle.description && (
                <p
                  style={{
                    fontSize: 13,
                    color: "rgba(0,0,0,0.55)",
                    lineHeight: 1.75,
                    marginTop: 14,
                    fontFamily: "'Space Grotesk',sans-serif",
                  }}
                >
                  {motorcycle.description}
                </p>
              )}
            </div>

            {/* Reviews card */}
            <div style={S.card}>
              <p style={{ ...S.label, marginBottom: 14 }}>Customer Reviews</p>
              {reviewsLoading && (
                <p
                  style={{
                    fontSize: 13,
                    color: "rgba(0,0,0,0.4)",
                    fontFamily: "'Space Grotesk',sans-serif",
                  }}
                >
                  Loading reviews…
                </p>
              )}
              {reviewsError && (
                <p
                  style={{
                    fontSize: 13,
                    color: "#b50002",
                    fontFamily: "'Space Grotesk',sans-serif",
                  }}
                >
                  {reviewsError}
                </p>
              )}
              {!reviewsLoading && !reviewsError && reviews.length === 0 && (
                <p
                  style={{
                    fontSize: 13,
                    color: "rgba(0,0,0,0.4)",
                    fontFamily: "'Space Grotesk',sans-serif",
                  }}
                >
                  No reviews yet.
                </p>
              )}
              {!reviewsLoading &&
                reviews.slice(0, 6).map((r) => (
                  <div
                    key={r._id || r.id}
                    className="md-review"
                    style={{ marginBottom: 10 }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 6,
                      }}
                    >
                      <div>
                        <p
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: "#0E0E0E",
                            fontFamily: "'Space Grotesk',sans-serif",
                          }}
                        >
                          {r.renterName || r.name || "Anonymous"}
                        </p>
                        <div style={{ display: "flex", gap: 2, marginTop: 2 }}>
                          {[1, 2, 3, 4, 5].map((i) => (
                            <FaStar
                              key={i}
                              style={{
                                fontSize: 10,
                                color:
                                  i <= (r.rating || 0)
                                    ? "#f59e0b"
                                    : "rgba(0,0,0,0.12)",
                              }}
                            />
                          ))}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          color: "rgba(0,0,0,0.35)",
                          fontFamily: "'Space Grotesk',sans-serif",
                        }}
                      >
                        {new Date(
                          r.createdAt || r.created_at || Date.now(),
                        ).toLocaleDateString()}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: 13,
                        color: "rgba(0,0,0,0.65)",
                        lineHeight: 1.65,
                        fontFamily: "'Space Grotesk',sans-serif",
                      }}
                    >
                      {r.feedbackDescription || r.comment || ""}
                    </p>
                    {r.adminReplyMessage && (
                      <div
                        style={{
                          marginTop: 8,
                          background: "rgba(181,0,2,0.04)",
                          border: "1px solid rgba(181,0,2,0.1)",
                          borderRadius: 10,
                          padding: "8px 12px",
                        }}
                      >
                        <p
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: "#b50002",
                            fontFamily: "'Space Grotesk',sans-serif",
                            marginBottom: 4,
                          }}
                        >
                          Admin Reply
                        </p>
                        <p
                          style={{
                            fontSize: 12,
                            color: "#0E0E0E",
                            fontFamily: "'Space Grotesk',sans-serif",
                          }}
                        >
                          {r.adminReplyMessage}
                        </p>
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                      <button
                        className="md-vote-btn"
                        disabled={votingReviewId === (r._id || r.id)}
                        onClick={() => voteOnReview(r._id || r.id, "like")}
                        style={{
                          borderColor: "rgba(22,163,74,0.25)",
                          background: "rgba(22,163,74,0.06)",
                          color: "#16a34a",
                        }}
                      >
                        <FaThumbsUp size={10} /> Helpful (
                        {r.helpfulLikeCount ?? 0})
                      </button>
                      <button
                        className="md-vote-btn"
                        disabled={votingReviewId === (r._id || r.id)}
                        onClick={() => voteOnReview(r._id || r.id, "dislike")}
                        style={{
                          borderColor: "rgba(181,0,2,0.2)",
                          background: "rgba(181,0,2,0.05)",
                          color: "#b50002",
                        }}
                      >
                        <FaThumbsDown size={10} /> Not Helpful (
                        {r.helpfulDislikeCount ?? 0})
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* ── RIGHT COLUMN — Booking Form ── */}
          <div className="md-form-card">
            <div className="md-form-header">
              <div>
                <h1
                  style={{
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: 16,
                    fontFamily: "'Space Grotesk',sans-serif",
                    marginBottom: 2,
                  }}
                >
                  Reserve Your Ride
                </h1>
                <p
                  style={{
                    color: "rgba(255,255,255,0.5)",
                    fontSize: 12,
                    fontFamily: "'Space Grotesk',sans-serif",
                  }}
                >
                  Pay ₱{DOWNPAYMENT} downpayment to secure your booking
                </p>
              </div>
              <div
                style={{
                  background: "#b50002",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 800,
                  padding: "6px 12px",
                  borderRadius: 10,
                  fontFamily: "'Space Grotesk',sans-serif",
                  whiteSpace: "nowrap",
                }}
              >
                Step {bookingStep} / 3
              </div>
            </div>

            <div className="md-form-body">
              <StepIndicator step={bookingStep} />

              {/* ── STEP 1 ── */}
              {bookingStep === 1 && (
                <form
                  onSubmit={handleStep1Next}
                  style={{ display: "flex", flexDirection: "column", gap: 16 }}
                >
                  <p style={S.label}>Schedule</p>

                  {noSlotsAvailable && formData.pickupDate === todayISO() && (
                    <div
                      style={{
                        background: "#fef2f2",
                        border: "1.5px solid rgba(181,0,2,0.2)",
                        borderRadius: 12,
                        padding: "10px 14px",
                        display: "flex",
                        gap: 8,
                        fontSize: 12,
                        color: "#b50002",
                        fontFamily: "'Space Grotesk',sans-serif",
                      }}
                    >
                      <FaExclamationTriangle
                        style={{ flexShrink: 0, marginTop: 1 }}
                      />
                      No pickup hours available for today. Please select a
                      future date.
                    </div>
                  )}

                  {/* Pickup Date + Time */}
                  <div className="md-grid-2">
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        height: "100%",
                      }}
                    >
                      <label style={S.label}>Pickup Date</label>
                      <p
                        style={{
                          fontSize: 10,
                          color: "rgba(0,0,0,0.35)",
                          marginBottom: 6,
                          fontFamily: "'Space Grotesk',sans-serif",
                        }}
                      >
                        Select available dates
                      </p>
                      <div style={{ marginTop: "auto" }}>
                        <InlineDatePicker
                          value={formData.pickupDate}
                          onChange={handlePickupDateChange}
                          minDate={todayISO()}
                          maxDate={null}
                          label="Pickup Date"
                          mode="pickup"
                          maintenanceRanges={currentMaintenanceRanges}
                          bookingRanges={bookingRanges}
                        />
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        height: "100%",
                      }}
                    >
                      <label style={S.label}>Pickup Time</label>
                      <div
                        style={{
                          marginTop: "auto",
                          position: "relative",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        <FaClock
                          style={{
                            position: "absolute",
                            left: 12,
                            color: "#b50002",
                            fontSize: 13,
                            pointerEvents: "none",
                            zIndex: 1,
                          }}
                        />
                        <select
                          name="pickupTime"
                          value={formData.pickupTime}
                          onChange={handleInputChange}
                          style={S.select}
                          required
                          disabled={noSlotsAvailable}
                        >
                          {noSlotsAvailable ? (
                            <option value="">No hours available</option>
                          ) : (
                            availablePickupSlots.map((s) => (
                              <option key={s.value} value={s.value}>
                                {s.label}
                              </option>
                            ))
                          )}
                        </select>
                        <FaChevronDown
                          style={{
                            position: "absolute",
                            right: 10,
                            color: "rgba(0,0,0,0.3)",
                            fontSize: 11,
                            pointerEvents: "none",
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Return Date + Time */}
                  <div className="md-grid-2">
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        height: "100%",
                      }}
                    >
                      <label style={S.label}>Return Date</label>
                      <p
                        style={{
                          fontSize: 10,
                          color: "rgba(0,0,0,0.35)",
                          marginBottom: 6,
                          fontFamily: "'Space Grotesk',sans-serif",
                        }}
                      >
                        Must be after pickup
                      </p>
                      <div style={{ marginTop: "auto" }}>
                        <InlineDatePicker
                          value={formData.returnDate}
                          onChange={handleReturnDateChange}
                          minDate={addDaysToISODate(formData.pickupDate, 1)}
                          maxDate={getNextUnavailableDate(formData.pickupDate)}
                          label="Return Date"
                          mode="return"
                          pickupDateISO={formData.pickupDate}
                          maintenanceRanges={currentMaintenanceRanges}
                          bookingRanges={bookingRanges}
                        />
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        height: "100%",
                      }}
                    >
                      <label style={S.label}>Return Time</label>
                      <div
                        style={{
                          marginTop: "auto",
                          position: "relative",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        <FaClock
                          style={{
                            position: "absolute",
                            left: 12,
                            color: "#b50002",
                            fontSize: 13,
                            pointerEvents: "none",
                            zIndex: 1,
                          }}
                        />
                        <select
                          name="returnTime"
                          value={formData.returnTime}
                          onChange={handleInputChange}
                          style={S.select}
                          required
                        >
                          {validReturnSlots.length > 0 ? (
                            validReturnSlots.map((s) => (
                              <option key={s.value} value={s.value}>
                                {s.label}
                              </option>
                            ))
                          ) : (
                            <option value="" disabled>
                              No hours available
                            </option>
                          )}
                        </select>
                        <FaChevronDown
                          style={{
                            position: "absolute",
                            right: 10,
                            color: "rgba(0,0,0,0.3)",
                            fontSize: 11,
                            pointerEvents: "none",
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Selected date summary */}
                  {(formData.pickupDate || formData.returnDate) && (
                    <div
                      style={{
                        background: "#F5F5F3",
                        borderRadius: 12,
                        padding: "10px 14px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <FaCalendarAlt
                          style={{ color: "#b50002", fontSize: 12 }}
                        />
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#0E0E0E",
                            fontFamily: "'Space Grotesk',sans-serif",
                          }}
                        >
                          {formData.pickupDate
                            ? new Date(
                                formData.pickupDate + "T00:00:00",
                              ).toLocaleDateString("en-PH", {
                                month: "short",
                                day: "numeric",
                              })
                            : "—"}
                          {" → "}
                          {formData.returnDate
                            ? new Date(
                                formData.returnDate + "T00:00:00",
                              ).toLocaleDateString("en-PH", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "Select return"}
                        </span>
                      </div>
                      {formData.returnDate && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            color: "#b50002",
                            background: "rgba(181,0,2,0.08)",
                            borderRadius: 999,
                            padding: "3px 10px",
                            fontFamily: "'Space Grotesk',sans-serif",
                          }}
                        >
                          {days} day{days !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  )}

                  <Field icon={FaMapMarkerAlt} label="Pickup Location">
                    <input
                      type="text"
                      value={formData.pickupLocation}
                      readOnly
                      style={{ ...S.input, opacity: 0.55 }}
                    />
                  </Field>

                  <div>
                    <p style={{ ...S.label, marginBottom: 8 }}>
                      Primary Destination
                    </p>
                    <DestinationSelect
                      value={formData.destination}
                      onChange={handleDestinationChange}
                    />
                    {formData.destinationCity && (
                      <div
                        style={{
                          marginTop: 8,
                          padding: "8px 12px",
                          borderRadius: 10,
                          fontSize: 12,
                          fontWeight: 600,
                          fontFamily: "'Space Grotesk',sans-serif",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          background:
                            distanceFee === 0
                              ? "rgba(22,163,74,0.06)"
                              : "rgba(251,146,60,0.07)",
                          color: distanceFee === 0 ? "#16a34a" : "#ea580c",
                          border: `1.5px solid ${distanceFee === 0 ? "rgba(22,163,74,0.2)" : "rgba(251,146,60,0.2)"}`,
                        }}
                      >
                        <FaMapMarkerAlt style={{ flexShrink: 0 }} />~
                        {distanceKm} km — {distanceTier?.label}
                        {distanceFee === 0 ? " — Free" : `  — +₱${distanceFee}`}
                        {isEstimate && " (est.)"}
                      </div>
                    )}
                  </div>

                  {/* Helmet */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      background: "#F5F5F3",
                      border: "1.5px solid rgba(0,0,0,0.07)",
                      borderRadius: 14,
                      padding: 16,
                    }}
                  >
                    <input
                      type="checkbox"
                      id="wantsHelmet"
                      name="wantsHelmet"
                      checked={formData.wantsHelmet}
                      onChange={handleInputChange}
                      style={{
                        width: 18,
                        height: 18,
                        accentColor: "#b50002",
                        cursor: "pointer",
                        marginTop: 2,
                        flexShrink: 0,
                      }}
                    />
                    <label
                      htmlFor="wantsHelmet"
                      style={{ flex: 1, cursor: "pointer" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 3,
                        }}
                      >
                        <GiFullMotorcycleHelmet
                          style={{ color: "#b50002", fontSize: 15 }}
                        />
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: 13,
                            color: "#0E0E0E",
                            fontFamily: "'Space Grotesk',sans-serif",
                          }}
                        >
                          Additional Helmet
                        </span>
                        <span
                          style={{
                            marginLeft: "auto",
                            color: "#b50002",
                            fontWeight: 800,
                            fontSize: 13,
                            fontFamily: "'Space Grotesk',sans-serif",
                          }}
                        >
                          +₱{HELMET_FEE}
                        </span>
                      </div>
                      <p
                        style={{
                          fontSize: 12,
                          color: "rgba(0,0,0,0.4)",
                          fontFamily: "'Space Grotesk',sans-serif",
                        }}
                      >
                        Add an extra helmet for your passenger.
                      </p>
                    </label>
                  </div>

                  {formData.returnDate && (
                    <PriceSummary
                      price={price}
                      days={days}
                      baseRental={baseRental}
                      distanceFee={distanceFee}
                      helmetFee={helmetFee}
                      totalAmount={totalAmount}
                      discount={applicableDiscount}
                    />
                  )}

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginTop: 24,
                    }}
                  >
                    <p
                      style={{
                        fontSize: 11,
                        color: "rgba(0,0,0,0.35)",
                        fontFamily: "'Space Grotesk',sans-serif",
                      }}
                    >
                      All times in Philippine Standard Time
                    </p>
                    <button
                      type="submit"
                      disabled={noSlotsAvailable}
                      style={{
                        ...S.btnDark,
                        opacity: noSlotsAvailable ? 0.5 : 1,
                      }}
                    >
                      Next <FaArrowRight size={10} />
                    </button>
                  </div>
                </form>
              )}

              {/* ── STEP 2 ── */}
              {bookingStep === 2 && (
                <form
                  onSubmit={handleStep2Next}
                  style={{ display: "flex", flexDirection: "column", gap: 16 }}
                >
                  <div>
                    <p style={S.label}>Renter Information</p>
                    <p
                      style={{
                        fontSize: 12,
                        color: "rgba(0,0,0,0.38)",
                        fontFamily: "'Space Grotesk',sans-serif",
                        marginTop: 2,
                      }}
                    >
                      Update your profile to change these details.
                    </p>
                  </div>
                  <Field icon={FaUser} label="Full Name">
                    <input
                      type="text"
                      value={formData.name}
                      readOnly
                      placeholder={
                        loadingUserProfile ? "Loading…" : "Your full name"
                      }
                      style={{ ...S.input, opacity: 0.6 }}
                    />
                  </Field>
                  <div className="md-grid-2">
                    <Field icon={FaEnvelope} label="Email Address">
                      <input
                        type="email"
                        value={formData.email}
                        readOnly
                        placeholder={
                          loadingUserProfile ? "Loading…" : "Your email"
                        }
                        style={{ ...S.input, opacity: 0.6 }}
                      />
                    </Field>
                    <Field icon={FaPhone} label="Phone Number">
                      <input
                        type="tel"
                        value={formData.phone}
                        readOnly
                        placeholder={
                          loadingUserProfile ? "Loading…" : "Your phone"
                        }
                        style={{ ...S.input, opacity: 0.6 }}
                      />
                    </Field>
                  </div>
                  <div>
                    <Field icon={FaMapMarkerAlt} label="Renter's Address">
                      <input
                        type="text"
                        value={formData.fullAddress}
                        readOnly
                        placeholder={
                          loadingUserProfile
                            ? "Loading address…"
                            : "Address from your profile"
                        }
                        style={{ ...S.input, opacity: 0.6 }}
                      />
                    </Field>
                    {!formData.fullAddress && !loadingUserProfile && (
                      <p
                        style={{
                          fontSize: 12,
                          color: "#b50002",
                          marginTop: 4,
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          fontFamily: "'Space Grotesk',sans-serif",
                        }}
                      >
                        <FaInfoCircle /> No address found.{" "}
                        <a
                          href="/profile"
                          style={{
                            textDecoration: "underline",
                            fontWeight: 600,
                            color: "#b50002",
                          }}
                        >
                          Update your profile
                        </a>
                      </p>
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginTop: 24,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setBookingStep(1)}
                      style={S.btnSecondary}
                    >
                      <FaArrowLeft size={10} /> Back
                    </button>
                    <button type="submit" style={S.btnDark}>
                      Next <FaArrowRight size={10} />
                    </button>
                  </div>
                </form>
              )}

              {/* ── STEP 3 ── */}
              {bookingStep === 3 && (
                <form
                  onSubmit={handleSubmit}
                  style={{ display: "flex", flexDirection: "column", gap: 14 }}
                >
                  <p style={S.label}>Review Your Booking</p>

                  {lockSecondsLeft !== null && (
                    <div
                      style={{
                        background: "#fef2f2",
                        border: "1.5px solid rgba(181,0,2,0.2)",
                        borderRadius: 12,
                        padding: "10px 14px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          color: "#b50002",
                          fontWeight: 600,
                          fontFamily: "'Space Grotesk',sans-serif",
                        }}
                      >
                        Motorcycle held for checkout
                      </span>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          color: "#b50002",
                          fontFamily: "'Space Grotesk',sans-serif",
                          letterSpacing: "1px",
                        }}
                      >
                        {formatLockCountdown(lockSecondsLeft)}
                      </span>
                    </div>
                  )}

                  {/* Schedule summary */}
                  <div
                    style={{ ...S.card, background: "#F5F5F3", padding: 16 }}
                  >
                    <div
                      onClick={() =>
                        setIsScheduleCollapsed(!isScheduleCollapsed)
                      }
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: "pointer",
                      }}
                    >
                      <p style={{ ...S.label, marginBottom: 0 }}>Schedule</p>
                      <button
                        type="button"
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 0,
                          transition: "transform 0.3s ease",
                          transform: isScheduleCollapsed
                            ? "rotate(0deg)"
                            : "rotate(180deg)",
                        }}
                      >
                        <FaChevronDown color="rgba(0,0,0,0.4)" size={12} />
                      </button>
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateRows: isScheduleCollapsed ? "0fr" : "1fr",
                        opacity: isScheduleCollapsed ? 0 : 1,
                        transition:
                          "grid-template-rows 0.3s ease, opacity 0.3s ease",
                      }}
                    >
                      <div style={{ overflow: "hidden" }}>
                        <div style={{ paddingTop: 10 }}>
                          <ReviewRow
                            label="Pickup"
                            value={`${formData.pickupDate} at ${slotLabel(formData.pickupTime)}`}
                          />
                          <ReviewRow
                            label="Return"
                            value={`${formData.returnDate} at ${slotLabel(formData.returnTime)}`}
                          />
                          <ReviewRow
                            label="Duration"
                            value={`${days} day${days > 1 ? "s" : ""}`}
                          />
                          <ReviewRow
                            label="Destination"
                            value={formData.destination}
                          />
                          <ReviewRow
                            label="Pickup Location"
                            value={formData.pickupLocation}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Renter summary */}
                  <div
                    style={{ ...S.card, background: "#F5F5F3", padding: 16 }}
                  >
                    <div
                      onClick={() => setIsRenterCollapsed(!isRenterCollapsed)}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: "pointer",
                      }}
                    >
                      <p style={{ ...S.label, marginBottom: 0 }}>Renter</p>
                      <button
                        type="button"
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 0,
                          transition: "transform 0.3s ease",
                          transform: isRenterCollapsed
                            ? "rotate(0deg)"
                            : "rotate(180deg)",
                        }}
                      >
                        <FaChevronDown color="rgba(0,0,0,0.4)" size={12} />
                      </button>
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateRows: isRenterCollapsed ? "0fr" : "1fr",
                        opacity: isRenterCollapsed ? 0 : 1,
                        transition:
                          "grid-template-rows 0.3s ease, opacity 0.3s ease",
                      }}
                    >
                      <div style={{ overflow: "hidden" }}>
                        <div style={{ paddingTop: 10 }}>
                          <ReviewRow label="Name" value={formData.name} />
                          <ReviewRow label="Email" value={formData.email} />
                          <ReviewRow label="Phone" value={formData.phone} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pricing summary */}
                  <div
                    style={{ ...S.card, background: "#F5F5F3", padding: 16 }}
                  >
                    <div
                      onClick={() => setIsPricingCollapsed(!isPricingCollapsed)}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: "pointer",
                      }}
                    >
                      <p style={{ ...S.label, marginBottom: 0 }}>Pricing</p>
                      <button
                        type="button"
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 0,
                          transition: "transform 0.3s ease",
                          transform: isPricingCollapsed
                            ? "rotate(0deg)"
                            : "rotate(180deg)",
                        }}
                      >
                        <FaChevronDown color="rgba(0,0,0,0.4)" size={12} />
                      </button>
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateRows: isPricingCollapsed ? "0fr" : "1fr",
                        opacity: isPricingCollapsed ? 0 : 1,
                        transition:
                          "grid-template-rows 0.3s ease, opacity 0.3s ease",
                      }}
                    >
                      <div style={{ overflow: "hidden" }}>
                        <div style={{ paddingTop: 10 }}>
                          <ReviewRow
                            label={`₱${price} × ${days} day${days > 1 ? "s" : ""}`}
                            value={`₱${baseRental}`}
                          />
                          {distanceFee > 0 && (
                            <ReviewRow
                              label={`Distance (${distanceTier?.label})`}
                              value={`+₱${distanceFee}`}
                              accent
                            />
                          )}
                          {formData.wantsHelmet && (
                            <ReviewRow
                              label="Extra Helmet"
                              value={`+₱${HELMET_FEE}`}
                              accent
                            />
                          )}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginTop: 10,
                              paddingTop: 10,
                              borderTop: "1.5px solid rgba(0,0,0,0.08)",
                            }}
                          >
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 800,
                                textTransform: "uppercase",
                                letterSpacing: "1px",
                                color: "#0E0E0E",
                                fontFamily: "'Space Grotesk',sans-serif",
                              }}
                            >
                              Total
                            </span>
                            <span
                              style={{
                                fontSize: 18,
                                fontWeight: 800,
                                color: "#0E0E0E",
                                fontFamily: "'Space Grotesk',sans-serif",
                              }}
                            >
                              ₱{totalAmount}
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginTop: 4,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 11,
                                color: "rgba(0,0,0,0.4)",
                                fontFamily: "'Space Grotesk',sans-serif",
                              }}
                            >
                              Downpayment (paid now)
                            </span>
                            <span
                              style={{
                                fontSize: 13,
                                fontWeight: 700,
                                color: "#16a34a",
                                fontFamily: "'Space Grotesk',sans-serif",
                              }}
                            >
                              −₱{DOWNPAYMENT}
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginTop: 4,
                              paddingTop: 8,
                              borderTop: "1.5px solid rgba(0,0,0,0.08)",
                            }}
                          >
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 800,
                                textTransform: "uppercase",
                                letterSpacing: "1px",
                                color: "#0E0E0E",
                                fontFamily: "'Space Grotesk',sans-serif",
                              }}
                            >
                              Due at Pickup
                            </span>
                            <span
                              style={{
                                fontSize: 18,
                                fontWeight: 800,
                                color: "#b50002",
                                fontFamily: "'Space Grotesk',sans-serif",
                              }}
                            >
                              ₱{dueAtPickup}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment section */}
                  <div style={{ ...S.card, padding: 18 }}>
                    <p style={{ ...S.label, marginBottom: 14 }}>
                      Downpayment — ₱{DOWNPAYMENT}
                    </p>
                    <div style={{ marginBottom: 12 }}>
                      <Field icon={FaCreditCard} label="Payment Method">
                        <select
                          name="reservationPaymentMethod"
                          value={formData.reservationPaymentMethod}
                          onChange={handleInputChange}
                          style={S.select}
                          required
                        >
                          <option value="GCash">GCash</option>
                          <option value="PayMaya">PayMaya</option>
                          <option value="Bank Transfer">Bank Transfer</option>
                        </select>
                        <FaChevronDown
                          style={{
                            position: "absolute",
                            right: 10,
                            color: "rgba(0,0,0,0.3)",
                            fontSize: 11,
                            pointerEvents: "none",
                          }}
                        />
                      </Field>
                    </div>
                    <p
                      style={{
                        fontSize: 12,
                        color: "rgba(0,0,0,0.4)",
                        marginBottom: 12,
                        fontFamily: "'Space Grotesk',sans-serif",
                      }}
                    >
                      Send ₱{DOWNPAYMENT} via{" "}
                      {formData.reservationPaymentMethod}, then upload proof
                      below.
                    </p>
                    <div
                      style={{
                        background: "#F5F5F3",
                        border: "1.5px solid rgba(0,0,0,0.07)",
                        borderRadius: 14,
                        padding: 16,
                        marginBottom: 14,
                        textAlign: "center",
                      }}
                    >
                      <p
                        style={{
                          ...S.label,
                          marginBottom: 10,
                          textAlign: "left",
                        }}
                      >
                        Scan QR to Pay
                      </p>
                      <img
                        src={selectedQrPath}
                        alt={`${formData.reservationPaymentMethod} QR`}
                        style={{
                          width: 180,
                          maxWidth: "100%",
                          borderRadius: 12,
                          border: "1.5px solid rgba(0,0,0,0.08)",
                          display: "block",
                          margin: "0 auto",
                        }}
                      />
                      <p
                        style={{
                          fontSize: 11,
                          color: "rgba(0,0,0,0.35)",
                          marginTop: 8,
                          fontFamily: "'Space Grotesk',sans-serif",
                        }}
                      >
                        QR shown is for {formData.reservationPaymentMethod}
                      </p>
                    </div>
                    <div className="md-grid-2" style={{ marginBottom: 12 }}>
                      <Field icon={FaReceipt} label="Reference ID">
                        <input
                          type="text"
                          name="paymentReferenceId"
                          value={formData.paymentReferenceId}
                          onChange={handleInputChange}
                          style={S.input}
                          placeholder="e.g. GCash12345678"
                          required
                        />
                      </Field>
                      <Field icon={FaClock} label="Payment Sent Time">
                        <input
                          type="datetime-local"
                          name="paymentSentAt"
                          value={formData.paymentSentAt}
                          onChange={handleInputChange}
                          style={S.input}
                          required
                        />
                      </Field>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <Field icon={FaCreditCard} label="Amount Sent">
                        <input
                          type="number"
                          name="paymentSentAmount"
                          min={DOWNPAYMENT}
                          max={DOWNPAYMENT}
                          value={formData.paymentSentAmount}
                          onChange={handleInputChange}
                          style={{ ...S.input, opacity: 0.7 }}
                          readOnly
                          required
                        />
                      </Field>
                    </div>
                    <div>
                      <p style={S.label}>Payment Proof (Image)</p>
                      <div
                        style={{
                          background: "#F5F5F3",
                          border: "1.5px solid rgba(0,0,0,0.09)",
                          borderRadius: 10,
                          padding: "10px 14px",
                        }}
                      >
                        <input
                          type="file"
                          name="paymentProofImage"
                          accept="image/*"
                          onChange={handleInputChange}
                          style={{
                            fontSize: 13,
                            fontFamily: "'Space Grotesk',sans-serif",
                            width: "100%",
                          }}
                          required
                        />
                        <p
                          style={{
                            fontSize: 11,
                            color: "rgba(0,0,0,0.35)",
                            marginTop: 6,
                            fontFamily: "'Space Grotesk',sans-serif",
                          }}
                        >
                          Upload a screenshot showing the reference ID, amount,
                          and time.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      background: "#fffbeb",
                      border: "1.5px solid #fde68a",
                      borderRadius: 12,
                      padding: "10px 14px",
                      display: "flex",
                      gap: 8,
                      fontSize: 12,
                      color: "#92400e",
                      fontFamily: "'Space Grotesk',sans-serif",
                    }}
                  >
                    <FaInfoCircle style={{ marginTop: 2, flexShrink: 0 }} />
                    <span>
                      Your booking will be marked as Pending Reservation while
                      admin verifies your payment proof.
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginTop: 24,
                    }}
                  >
                    <button
                      type="button"
                      style={S.btnSecondary}
                      onClick={async () => {
                        clearLockTimer();
                        await releaseCheckoutLock(true);
                        setCheckoutLock({
                          expiresAt: "",
                          lockMinutes: CHECKOUT_LOCK_FALLBACK_MINUTES,
                        });
                        setBookingStep(2);
                      }}
                    >
                      <FaArrowLeft size={10} /> Back
                    </button>
                    <button
                      type="submit"
                      disabled={
                        submitting ||
                        loadingUserProfile ||
                        hasSubmittedRef.current
                      }
                      style={{
                        ...S.btnDark,
                        opacity: submitting ? 0.6 : 1,
                        gap: 8,
                      }}
                    >
                      <FaCheckCircle size={11} />
                      {submitting ? "Submitting…" : "Submit Proof & Confirm"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MotorcycleDetail;
