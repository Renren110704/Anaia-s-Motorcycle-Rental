import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import ReactDOM from "react-dom/client";
import { createPortal } from "react-dom";
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
import ReviewModal from "../components/ReviewModal";

const API_BASE = API_BASE_URL;
const TIMEOUT = 30000;
const ITEMS_PER_PAGE = 8;
const DOWNPAYMENT = 200;
const BOOKINGS_CACHE_KEY = "my-bookings-cache-v1";
const MAINTENANCE_STORAGE_KEY = "moto_maintenance_schedules";
const loadMaintenanceSchedules = () => {
  try {
    return JSON.parse(localStorage.getItem(MAINTENANCE_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
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

/* ── Calendar Helpers (ported from MotorcycleDetail) ─────────────────────── */
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
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const addDaysHelper = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};
const formatLocalDate = (date) => {
  const y = date.getFullYear(),
    m = String(date.getMonth() + 1).padStart(2, "0"),
    d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

/* ── InlineDatePicker (ported from MotorcycleDetail) ─────────────────────── */
const InlineDatePicker = ({
  value,
  onChange,
  minDate,
  maxDate,
  label,
  mode = "pickup",
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

  // Sync viewMonth when value changes externally
  useEffect(() => {
    if (value) setViewMonth(new Date(value + "T00:00:00"));
  }, [value]);

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

  const S_picker = {
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
  };

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
          padding: "9px 12px 9px 36px",
          borderRadius: 8,
          border: `1.5px solid ${open ? "#b50002" : "rgba(0,0,0,0.1)"}`,
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
          position: "relative",
        }}
      >
        <FaCalendarAlt
          style={{
            position: "absolute",
            left: 11,
            color: "#b50002",
            fontSize: 12,
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
            flexShrink: 0,
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
            zIndex: 500,
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
                ...S_picker.btnSecondary,
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
                ...S_picker.btnSecondary,
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
            ].map(({ dot, label: lbl }) => (
              <div
                key={lbl}
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
                  {lbl}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Modal helpers ─────────────────────────────────────────────────────────────
const ModalShell = ({ onBackdropClick, children }) => (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(14,14,14,0.55)",
      backdropFilter: "blur(6px)",
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
    }}
    onClick={onBackdropClick}
  >
    <div
      style={{
        background: "#fff",
        border: "1.5px solid rgba(0,0,0,0.08)",
        borderRadius: 20,
        maxWidth: 400,
        width: "100%",
        padding: 28,
        boxShadow: "0 24px 60px rgba(0,0,0,0.14)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  </div>
);

const ConfirmModal = ({ message, onConfirm, onCancel, confirmLabel }) => (
  <ModalShell onBackdropClick={onCancel}>
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
          margin: "0 auto 16px",
        }}
      >
        <FaExclamationTriangle style={{ color: "#b50002", fontSize: 20 }} />
      </div>
      <h3
        style={{
          color: "#0E0E0E",
          fontSize: 17,
          fontWeight: 800,
          marginBottom: 8,
          fontFamily: "'Space Grotesk', sans-serif",
        }}
      >
        Confirm Action
      </h3>
      <p
        style={{
          color: "rgba(14,14,14,0.5)",
          fontSize: 13,
          marginBottom: 24,
          fontFamily: "'Space Grotesk', sans-serif",
          lineHeight: 1.6,
        }}
      >
        {message}
      </p>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onCancel} style={btnStyle("ghost")}>
          No, Keep It
        </button>
        <button onClick={onConfirm} style={btnStyle("danger")}>
          {confirmLabel ?? "Confirm"}
        </button>
      </div>
    </div>
  </ModalShell>
);

const AlertModal = ({ message, onClose, isError }) => (
  <ModalShell onBackdropClick={onClose}>
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          background: isError ? "rgba(181,0,2,0.08)" : "rgba(0,0,0,0.05)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 16px",
        }}
      >
        {isError ? (
          <FaExclamationTriangle style={{ color: "#b50002", fontSize: 20 }} />
        ) : (
          <FaInfoCircle style={{ color: "rgba(14,14,14,0.5)", fontSize: 20 }} />
        )}
      </div>
      <h3
        style={{
          color: "#0E0E0E",
          fontSize: 17,
          fontWeight: 800,
          marginBottom: 8,
          fontFamily: "'Space Grotesk', sans-serif",
        }}
      >
        {isError ? "Error" : "Notice"}
      </h3>
      <p
        style={{
          color: "rgba(14,14,14,0.5)",
          fontSize: 13,
          marginBottom: 24,
          fontFamily: "'Space Grotesk', sans-serif",
          lineHeight: 1.6,
        }}
      >
        {message}
      </p>
      <button
        onClick={onClose}
        style={{
          ...btnStyle("danger"),
          width: "100%",
          justifyContent: "center",
        }}
      >
        OK
      </button>
    </div>
  </ModalShell>
);

const btnStyle = (variant) => {
  const base = {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: "10px 18px",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "'Space Grotesk', sans-serif",
    border: "none",
    transition: "all 0.15s",
  };
  if (variant === "danger")
    return { ...base, background: "#b50002", color: "#fff" };
  if (variant === "ghost")
    return {
      ...base,
      background: "#F5F5F3",
      color: "rgba(14,14,14,0.7)",
      border: "1.5px solid rgba(0,0,0,0.1)",
    };
  if (variant === "dark")
    return { ...base, background: "#0E0E0E", color: "#fff" };
  return base;
};

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
  const hour = d.getHours(),
    min = String(d.getMinutes()).padStart(2, "0"),
    period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${datePart} · ${displayHour}:${min} ${period}`;
};
const formatTime = (timeStr) => {
  if (!timeStr) return "";
  const [hourStr, minStr] = timeStr.split(":");
  const hour = parseInt(hourStr, 10),
    min = minStr || "00";
  if (isNaN(hour)) return timeStr;
  const period = hour >= 12 ? "PM" : "AM",
    displayHour = hour % 12 === 0 ? 12 : hour % 12;
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
    const a = new Date(start),
      b = new Date(end);
    if (Number.isNaN(a) || Number.isNaN(b)) return 0;
    return Math.ceil((b - a) / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
};
const daysBetweenWithTime = (
  pickupDate,
  pickupTime,
  returnDate,
  returnTime,
) => {
  const start = combineLocalDateTime(pickupDate, pickupTime),
    end = combineLocalDateTime(returnDate, returnTime);
  if (!start || !end) return 0;
  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) return 0;
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
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
// const sevenDaysFromToday = () => {
//   const d = getTodayStart();
//   d.setDate(d.getDate() + 7);
//   return d;
// };
// const sixMonthsFromToday = () => {
//   const d = getTodayStart();
//   d.setMonth(d.getMonth() + 6);
//   return d;
// };
const combineLocalDateTime = (dateStr, timeStr) => {
  const dateObj = parseLocalDateOnly(dateStr);
  if (!dateObj || !timeStr) return null;
  const [hourStr, minuteStr] = timeStr.split(":");
  const hour = parseInt(hourStr, 10),
    minute = parseInt(minuteStr || "0", 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  dateObj.setHours(hour, minute, 0, 0);
  return dateObj;
};
const isTimeWithinRentalHours = (timeStr) => {
  if (!timeStr) return false;
  const [hourStr, minuteStr] = timeStr.split(":");
  const hour = parseInt(hourStr, 10),
    minute = parseInt(minuteStr || "0", 10);
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
  if (
    String(imagePath).startsWith("/dxta0nmdy/") ||
    String(imagePath).startsWith("dxta0nmdy/")
  )
    return `https://res.cloudinary.com/${String(imagePath).replace(/^\/+/, "")}`;
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
  const details = booking.details || {},
    address = booking.address || {};
  const rawImage =
    safeAccess(() => booking.motorcycle?.image) ||
    safeAccess(() => motorcycleObj.image) ||
    safeAccess(() => booking.motorcycleImage) ||
    "";
  const resolveImg = (image) => {
    if (!image) return "";
    if (Array.isArray(image)) image = image[0];
    if (typeof image !== "string") return "";
    const t = image.trim();
    if (!t) return "";
    if (/^data:image\//i.test(t)) return t;
    if (/^https?:\/\//i.test(t)) return t;
    if (t.includes("cloudinary")) return t;
    if (t.startsWith("/")) return `${API_BASE}${t}`;
    return `${API_BASE}/uploads/${t}`;
  };
  const image = resolveImg(rawImage);
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
    price: Number(booking.amount || booking.price || booking.total || 0),
    distanceFee: details.distanceFee ?? 0,
    helmetFee: details.helmetFee ?? 0,
    distanceTierLabel: details.distanceTierLabel ?? "",
    helmetRequested: details.helmetRequested ?? false,
    destinationCity: details.destinationCity ?? "",
    returnInspection: booking.returnInspection || {},
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
    label: "Pending",
    icon: FaHourglassHalf,
    color: "#d97706",
    bg: "rgba(217,119,6,0.08)",
    pill: "#fef3c7",
    pillText: "#92400e",
  },
  {
    key: "pending_full_payment",
    label: "Awaiting Payment",
    icon: FaCreditCard,
    color: "#ea580c",
    bg: "rgba(234,88,12,0.08)",
    pill: "#ffedd5",
    pillText: "#9a3412",
  },
  {
    key: "active",
    label: "Active",
    icon: FaPlayCircle,
    color: "#2563eb",
    bg: "rgba(37,99,235,0.08)",
    pill: "#dbeafe",
    pillText: "#1e40af",
  },
  {
    key: "inspection",
    label: "Inspection",
    icon: FaExclamationTriangle,
    color: "#7c3aed",
    bg: "rgba(124,58,237,0.08)",
    pill: "#ede9fe",
    pillText: "#5b21b6",
  },
  {
    key: "completed",
    label: "Completed",
    icon: FaCheckCircle,
    color: "#16a34a",
    bg: "rgba(22,163,74,0.08)",
    pill: "#dcfce7",
    pillText: "#166534",
  },
  {
    key: "cancelled",
    label: "Cancelled",
    icon: FaTimesCircle,
    color: "#b50002",
    bg: "rgba(181,0,2,0.06)",
    pill: "#fee2e2",
    pillText: "#991b1b",
  },
  {
    key: "rejected",
    label: "Rejected",
    icon: FaTrash,
    color: "#6b7280",
    bg: "rgba(107,114,128,0.08)",
    pill: "#f3f4f6",
    pillText: "#374151",
  },
];

const STATUS_BADGE_CONFIG = {
  pending_reservation: {
    text: "Pending",
    bg: "#fef3c7",
    color: "#92400e",
    icon: FaHourglassHalf,
  },
  pending_full_payment: {
    text: "Awaiting Payment",
    bg: "#ffedd5",
    color: "#9a3412",
    icon: FaCreditCard,
  },
  active: {
    text: "Active",
    bg: "#dbeafe",
    color: "#1e40af",
    icon: FaPlayCircle,
  },
  inspection: {
    text: "Inspection",
    bg: "#ede9fe",
    color: "#5b21b6",
    icon: FaExclamationTriangle,
  },
  completed: {
    text: "Completed",
    bg: "#dcfce7",
    color: "#166534",
    icon: FaCheckCircle,
  },
  cancelled: {
    text: "Cancelled",
    bg: "#fee2e2",
    color: "#991b1b",
    icon: FaTimesCircle,
  },
  rejected: {
    text: "Rejected",
    bg: "#f3f4f6",
    color: "#374151",
    icon: FaTrash,
  },
};

const StatusBadge = ({ status, isDeleted }) => {
  const key = isDeleted ? "rejected" : status || "pending_reservation";
  const cfg = STATUS_BADGE_CONFIG[key] || {
    text: key,
    bg: "#f3f4f6",
    color: "#374151",
    icon: null,
  };
  const Icon = cfg.icon;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "4px 10px",
        borderRadius: 999,
        background: cfg.bg,
        color: cfg.color,
        fontSize: 11,
        fontWeight: 700,
        fontFamily: "'Space Grotesk', sans-serif",
        whiteSpace: "nowrap",
      }}
    >
      {Icon && <Icon style={{ fontSize: 9 }} />}
      {cfg.text}
    </span>
  );
};

// ── Tab button ────────────────────────────────────────────────────────────────
const TabButton = ({ tab, isActive, count, issueCount, onClick }) => {
  const Icon = tab.icon;
  return (
    <button
      type="button"
      onClick={() => onClick(tab.key)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "9px 16px",
        borderRadius: 12,
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: 13,
        fontWeight: 700,
        cursor: "pointer",
        transition: "all 0.2s cubic-bezier(.2,.8,.2,1)",
        border: isActive ? "none" : "1.5px solid rgba(0,0,0,0.09)",
        background: isActive ? tab.color : "#fff",
        color: isActive ? "#fff" : "rgba(14,14,14,0.55)",
        boxShadow: isActive
          ? `0 4px 16px ${tab.color}30`
          : "0 1px 3px rgba(0,0,0,0.04)",
        transform: isActive ? "translateY(-1px)" : "none",
        position: "relative",
      }}
    >
      <Icon style={{ fontSize: 11 }} />
      <span className="tab-full-label">{tab.label}</span>
      <span className="tab-short-label" style={{ display: "none" }}>
        {tab.label.split(" ")[0]}
      </span>
      {issueCount > 0 && tab.key === "inspection" && (
        <span
          style={{
            background: "#b50002",
            color: "#fff",
            fontSize: 9,
            fontWeight: 900,
            width: 16,
            height: 16,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "absolute",
            top: -5,
            right: -5,
          }}
        >
          {issueCount}
        </span>
      )}
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          padding: "1px 7px",
          borderRadius: 6,
          background: isActive ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.06)",
          color: isActive ? "#fff" : "rgba(14,14,14,0.5)",
        }}
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
    <div
      style={{
        marginTop: 32,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
      }}
    >
      <p
        style={{
          fontSize: 13,
          color: "rgba(14,14,14,0.4)",
          fontFamily: "'Space Grotesk', sans-serif",
        }}
      >
        Showing <strong style={{ color: "#0E0E0E" }}>{startItem}</strong>–
        <strong style={{ color: "#0E0E0E" }}>{endItem}</strong> of{" "}
        <strong style={{ color: "#0E0E0E" }}>{totalItems}</strong>
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={paginationBtnStyle(false, false)}
        >
          <FaChevronLeft style={{ fontSize: 10 }} />
        </button>
        {withEllipsis.map((item, idx) =>
          item === "..." ? (
            <span
              key={`e-${idx}`}
              style={{
                color: "rgba(14,14,14,0.3)",
                fontSize: 13,
                padding: "0 4px",
              }}
            >
              …
            </span>
          ) : (
            <button
              key={item}
              onClick={() => onPageChange(item)}
              style={paginationBtnStyle(currentPage === item, true)}
            >
              {item}
            </button>
          ),
        )}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={paginationBtnStyle(false, false)}
        >
          <FaChevronRight style={{ fontSize: 10 }} />
        </button>
      </div>
    </div>
  );
};

const paginationBtnStyle = (active, isNum) => ({
  width: 36,
  height: 36,
  borderRadius: 8,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: active ? "none" : "1.5px solid rgba(0,0,0,0.1)",
  background: active ? "#b50002" : "#fff",
  color: active ? "#fff" : "rgba(14,14,14,0.5)",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "'Space Grotesk', sans-serif",
  boxShadow: active
    ? "0 4px 12px rgba(181,0,2,0.25)"
    : "0 1px 3px rgba(0,0,0,0.05)",
  transition: "all 0.15s",
});

// ── Booking Card ───────────────────────────────────────────────────────────────
const BookingRow = ({
  booking,
  onCancel,
  onReupload,
  onReschedule,
  onExtend,
  onDownloadAgreement,
  calBookings = [],
  maintenanceRanges = [],
}) => {
  const [expanded, setExpanded] = useState(false);
  const [reuploadRef, setReuploadRef] = useState(
    booking.paymentReferenceId || "",
  );
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
  const [isExtending, setIsExtending] = useState(false);
  const [extending, setExtending] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [bookingReview, setBookingReview] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  const days = daysBetween(booking.dates.pickup, booking.dates.return);
  const motorcycleName =
    `${booking.motorcycle.make} ${booking.motorcycle.model}`.trim();
  const dailyRate = booking.motorcycle.dailyRate || 0;
  const baseRental = dailyRate * Math.max(days, 1);
  const grossTotal = booking.price;
  const downpayment = booking.downpayment || DOWNPAYMENT;
  const dueAtPickup = Math.max(0, grossTotal - downpayment);
  const needsReupload =
    booking.requiresProofReupload || booking.paymentStatus === "rejected";

  const currentMotoId =
    booking.raw?.motorcycle?._id ||
    booking.raw?.motorcycle?.id ||
    booking.raw?.motorcycle ||
    booking.motorcycle?._id ||
    booking.motorcycle?.id;

  const currentMaintenanceRanges = maintenanceRanges.filter((m) => {
    const id = m.motorcycleId || m.motorcycle?._id || m.motorcycle?.id;
    return String(id) === String(currentMotoId);
  });

  const bookingRanges = calBookings
    .filter((b) => {
      if (String(b._id || b.id) === String(booking.id)) return false;
      const id =
        b.motorcycle?._id || b.motorcycle?.id || b.motorcycle || b.motorcycleId;
      return String(id) === String(currentMotoId);
    })
    .map((b) => {
      const status = String(b?.status || "").toLowerCase();
      if (
        [
          "completed",
          "inspection",
          "canceled",
          "cancelled",
          "rejected",
        ].includes(status)
      )
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
      return formatDateInput(earliest);
    }
    return null;
  };

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

  const originalPickupDateInput = toDateInput(booking.dates.pickup);
  const originalReturnDateInput = toDateInput(booking.dates.return);
  const originalReturnTime = booking.times.return || "08:00";

  const [rescheduleForm, setRescheduleForm] = useState({
    pickupDate: originalPickupDateInput,
    pickupTime: booking.times.pickup || "08:00",
    returnDate: originalReturnDateInput,
    returnTime: booking.times.return || "08:00",
  });
  const [extensionForm, setExtensionForm] = useState({
    returnDate: originalReturnDateInput,
    returnTime: originalReturnTime,
  });

  const canReschedule =
    ["pending", "pending_reservation", "pending_full_payment"].includes(
      booking.status,
    ) && !booking.isDeleted;
  const canExtend = booking.status === "active" && !booking.isDeleted;

  useEffect(() => {
    setRescheduleForm({
      pickupDate: toDateInput(booking.dates.pickup),
      pickupTime: booking.times.pickup || "08:00",
      returnDate: toDateInput(booking.dates.return),
      returnTime: booking.times.return || "08:00",
    });
    setExtensionForm({
      returnDate: toDateInput(booking.dates.return),
      returnTime: booking.times.return || "08:00",
    });
  }, [
    booking.dates.pickup,
    booking.dates.return,
    booking.times.pickup,
    booking.times.return,
  ]);

  useEffect(() => {
    if (!reuploadFile) {
      setReuploadPreviewUrl("");
      return;
    }
    const objectUrl = URL.createObjectURL(reuploadFile);
    setReuploadPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [reuploadFile]);

  const fetchBookingReview = useCallback(async () => {
    if (booking.status !== "completed" || booking.isDeleted) {
      setBookingReview(null);
      return;
    }
    try {
      setReviewLoading(true);
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(
        `${API_BASE}/api/reviews/booking/${booking.id}`,
        { headers },
      );
      setBookingReview(response?.data?.review || response?.data || null);
    } catch (err) {
      if (err?.response?.status === 404) setBookingReview(null);
    } finally {
      setReviewLoading(false);
    }
  }, [booking.id, booking.isDeleted, booking.status]);

  useEffect(() => {
    fetchBookingReview();
  }, [fetchBookingReview]);

  const existingProofPreview = booking.raw?.paymentProofImage
    ? resolveImageUrl(booking.raw.paymentProofImage)
    : "";
  const proofPreviewSrc = reuploadPreviewUrl || existingProofPreview;

  // ── Reschedule: valid return time slots (same logic as MotorcycleDetail) ──
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
  const rescheduledDueAtPickup = Math.max(
    0,
    rescheduledGrossTotal - downpayment,
  );

  const extensionDays = daysBetweenWithTime(
    originalPickupDateInput,
    booking.times.pickup || "08:00",
    extensionForm.returnDate,
    extensionForm.returnTime,
  );
  const extensionGrossTotal =
    dailyRate > 0
      ? dailyRate * Math.max(extensionDays, 1) +
        booking.distanceFee +
        booking.helmetFee
      : grossTotal;
  const extensionAdditionalAmount = Math.max(
    0,
    extensionGrossTotal - grossTotal,
  );
  const latestExtension = Array.isArray(booking.raw?.extensions)
    ? booking.raw.extensions[booking.raw.extensions.length - 1]
    : null;
  const originalReturnDateFromExtension =
    latestExtension?.previousReturnDate || null;
  const originalReturnTimeFromExtension =
    latestExtension?.previousReturnTime || "";

  // ── Calendar min/max dates ──
  const minPickupDate = useMemo(() => {
    const today = getTodayStart(),
      originalPickup = parseLocalDateOnly(originalPickupDateInput);
    if (!originalPickup) return formatDateInput(today);
    return formatDateInput(originalPickup > today ? originalPickup : today);
  }, [originalPickupDateInput]);
  const maxPickupDate = null;
  // const maxReturnDate = null;
  // Min return date for reschedule = day after pickup
  const rescheduleMinReturnDate = addDaysToDateInput(
    rescheduleForm.pickupDate || minPickupDate,
    1,
  );

  // Min return date for extension = day after original pickup
  const extensionMinReturnDate = addDaysToDateInput(originalReturnDateInput, 0); // same or later

  // ── Handle reschedule pickup date change (clears return if needed) ──
  const handleReschedulePickupDateChange = (dateISO) => {
    setRescheduleForm((p) => {
      const newReturn =
        p.returnDate && p.returnDate > dateISO ? p.returnDate : "";
      return { ...p, pickupDate: dateISO, returnDate: newReturn };
    });
  };

  // ── Handle reschedule return date change ──
  const handleRescheduleReturnDateChange = (dateISO) => {
    setRescheduleForm((p) => ({ ...p, returnDate: dateISO }));
  };

  // ── Handle extension return date change ──
  const handleExtensionReturnDateChange = (dateISO) => {
    setExtensionForm((p) => ({ ...p, returnDate: dateISO }));
  };

  const validateReschedule = async () => {
    const { pickupDate, pickupTime, returnDate, returnTime } = rescheduleForm;
    if (!pickupDate || !pickupTime || !returnDate || !returnTime) {
      await alertModal("Please complete pickup and return date/time.", {
        isError: true,
      });
      return false;
    }
    if (
      !isTimeWithinRentalHours(pickupTime) ||
      !isTimeWithinRentalHours(returnTime)
    ) {
      await alertModal("Times must be between 8:00 AM and 8:00 PM.", {
        isError: true,
      });
      return false;
    }
    const pickupDateObj = parseLocalDateOnly(pickupDate),
      returnDateObj = parseLocalDateOnly(returnDate),
      originalPickupObj = parseLocalDateOnly(originalPickupDateInput);
    if (!pickupDateObj || !returnDateObj || !originalPickupObj) {
      await alertModal("Invalid date input.", { isError: true });
      return false;
    }
    const today = getTodayStart();
    const minAllowedPickup =
      originalPickupObj > today ? originalPickupObj : today;
    if (pickupDateObj < minAllowedPickup) {
      await alertModal(
        "Pickup date cannot be earlier than original or in the past.",
        { isError: true },
      );
      return false;
    }
    // if (pickupDateObj > sevenDayLimit) {
    //   await alertModal(
    //     "Pickup date can only be rescheduled within the next 7 days.",
    //     { isError: true },
    //   );
    //   return false;
    // }
    // if (returnDateObj > sixMonthLimit) {
    //   await alertModal(
    //     "Return date can only be rescheduled up to 6 months from today.",
    //     { isError: true },
    //   );
    //   return false;
    // }
    const pickupDateTime = combineLocalDateTime(pickupDate, pickupTime),
      returnDateTime = combineLocalDateTime(returnDate, returnTime);
    if (!pickupDateTime || !returnDateTime) {
      await alertModal("Return date/time is invalid.", { isError: true });
      return false;
    }
    if (
      returnDateTime < new Date(pickupDateTime.getTime() + 24 * 60 * 60 * 1000)
    ) {
      await alertModal("Minimum rental duration is 24 hours.", {
        isError: true,
      });
      return false;
    }
    if (isDateBookedOrMaintenance(pickupDate)) {
      await alertModal(
        "Selected pickup date is currently booked or under maintenance.",
        { isError: true },
      );
      return false;
    }
    if (isDateBookedOrMaintenance(returnDate)) {
      await alertModal(
        "Selected return date is currently booked or under maintenance.",
        { isError: true },
      );
      return false;
    }
    const nextUnavail = getNextUnavailableDate(pickupDate);
    if (returnDate > nextUnavail) {
      await alertModal(
        "Selected dates overlap with an existing booking or maintenance.",
        { isError: true },
      );
      return false;
    }
    return true;
  };

  const validateExtension = async () => {
    const { returnDate, returnTime } = extensionForm;
    if (!returnDate || !returnTime) {
      await alertModal("Please select a new return date and time.", {
        isError: true,
      });
      return false;
    }
    if (!isTimeWithinRentalHours(returnTime)) {
      await alertModal("Return time must be between 8:00 AM and 8:00 PM.", {
        isError: true,
      });
      return false;
    }
    const currentReturnDateTime = combineLocalDateTime(
        originalReturnDateInput,
        originalReturnTime,
      ),
      nextReturnDateTime = combineLocalDateTime(returnDate, returnTime);
    if (!currentReturnDateTime || !nextReturnDateTime) {
      await alertModal("Return date/time is invalid.", { isError: true });
      return false;
    }
    if (nextReturnDateTime <= currentReturnDateTime) {
      await alertModal("New return time must be later than current.", {
        isError: true,
      });
      return false;
    }
    if (extensionDays <= 0) {
      await alertModal("Please select a valid extension duration.", {
        isError: true,
      });
      return false;
    }
    if (isDateBookedOrMaintenance(returnDate)) {
      await alertModal(
        "Selected return date is currently booked or under maintenance.",
        { isError: true },
      );
      return false;
    }
    const extNextUnavail = getNextUnavailableDate(originalReturnDateInput);
    if (returnDate > extNextUnavail) {
      await alertModal(
        "Extension overlaps with an existing booking or maintenance.",
        { isError: true },
      );
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
      await alertModal("Please enter payment sent time.", { isError: true });
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
      "Apply this new schedule to your booking?",
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

  const submitExtension = async () => {
    const isValid = await validateExtension();
    if (!isValid) return;
    const confirmed = await confirmModal(
      "Extend your rental to the new return date/time?",
      { confirmLabel: "Yes, Extend" },
    );
    if (!confirmed) return;
    try {
      setExtending(true);
      await onExtend(booking.id, {
        returnDate: extensionForm.returnDate,
        returnTime: extensionForm.returnTime,
      });
      setIsExtending(false);
    } finally {
      setExtending(false);
    }
  };

  const tabCfg =
    STATUS_TABS.find(
      (t) => t.key === (booking.isDeleted ? "rejected" : booking.status),
    ) || STATUS_TABS[0];
  const accentColor = tabCfg.color;

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "9px 12px",
    borderRadius: 8,
    border: "1.5px solid rgba(0,0,0,0.1)",
    background: "#F5F5F3",
    color: "#0E0E0E",
    fontSize: 13,
    fontFamily: "'Space Grotesk', sans-serif",
    outline: "none",
    transition: "border-color 0.2s",
  };
  const selectStyle = { ...inputStyle, appearance: "none", cursor: "pointer" };
  const labelStyle = {
    display: "block",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    color: "rgba(14,14,14,0.38)",
    marginBottom: 5,
    fontFamily: "'Space Grotesk', sans-serif",
  };

  return (
    <>
      <div
        className="booking-card"
        style={{
          background: "#fff",
          border: "1.5px solid rgba(0,0,0,0.08)",
          borderRadius: 18,
          overflow: "hidden",
          transition: "all 0.25s cubic-bezier(.2,.8,.2,1)",
          opacity: booking.isDeleted ? 0.55 : 1,
          borderLeft: `4px solid ${accentColor}`,
        }}
      >
        {/* Collapsed Row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "14px 18px",
            flexWrap: "wrap",
          }}
        >
          {/* Thumbnail */}
          <div
            style={{
              flexShrink: 0,
              width: 76,
              height: 60,
              borderRadius: 12,
              overflow: "hidden",
              background: "#F5F5F3",
            }}
          >
            <img
              src={booking.motorcycle.image}
              alt={motorcycleName}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transition: "transform 0.4s ease",
              }}
              className="booking-thumb"
              onError={(e) => {
                e.target.src =
                  "https://via.placeholder.com/800x450.png?text=No+Image";
              }}
            />
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ flex: "1 1 200px", minWidth: 0 }}>
              <span
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 800,
                  color: "#0E0E0E",
                  fontSize: 15,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "220px",
                  letterSpacing: "-0.3px",
                }}
              >
                {motorcycleName}
              </span>
              {booking.motorcycle.year && (
                <span
                  style={{
                    fontSize: 11,
                    color: "rgba(14,14,14,0.35)",
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}
                >
                  {booking.motorcycle.year}
                </span>
              )}
              <StatusBadge
                status={booking.status}
                isDeleted={booking.isDeleted}
              />
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                fontSize: 12,
                color: "rgba(14,14,14,0.45)",
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <FaCalendarAlt style={{ color: accentColor, fontSize: 10 }} />
                {formatDate(booking.dates.pickup)}
                {booking.times.pickup &&
                  ` · ${formatTime(booking.times.pickup)}`}
                <span style={{ opacity: 0.4 }}>→</span>
                {formatDate(booking.dates.return)}
                {booking.times.return &&
                  ` · ${formatTime(booking.times.return)}`}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <FaClock style={{ color: accentColor, fontSize: 10 }} />
                {days}d
              </span>
              {booking.destination && (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    maxWidth: 160,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  <FaMapMarkerAlt
                    style={{ color: accentColor, fontSize: 10, flexShrink: 0 }}
                  />
                  {booking.destination}
                </span>
              )}
            </div>
          </div>

          {/* Price */}
          <div style={{ flexShrink: 0, textAlign: "right", marginRight: 4 }}>
            <div
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 800,
                color: "#0E0E0E",
                fontSize: 16,
                letterSpacing: "-0.5px",
              }}
            >
              {formatPrice(dueAtPickup)}
            </div>
            <div
              style={{
                fontSize: 10,
                color: "rgba(14,14,14,0.38)",
                fontFamily: "'Space Grotesk', sans-serif",
                marginTop: 1,
              }}
            >
              due at pickup
            </div>
          </div>

          {/* Actions */}
          <div
            style={{
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            {[
              "pending",
              "pending_reservation",
              "pending_full_payment",
            ].includes(booking.status) &&
              !booking.isDeleted && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCancel(booking.id);
                  }}
                  className="action-btn-cancel"
                  style={{
                    padding: "7px 14px",
                    borderRadius: 9,
                    background: "#fee2e2",
                    color: "#b50002",
                    border: "1.5px solid #fecaca",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "'Space Grotesk', sans-serif",
                    transition: "all 0.18s",
                  }}
                >
                  Cancel
                </button>
              )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDownloadAgreement(booking.id, booking.user?.name);
              }}
              title="Download Rental Agreement"
              className="action-btn-icon"
              style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#dbeafe",
                color: "#2563eb",
                border: "1.5px solid #bfdbfe",
                cursor: "pointer",
                transition: "all 0.18s",
              }}
            >
              <FaFileDownload style={{ fontSize: 13 }} />
            </button>
            <button
              onClick={() => setExpanded((p) => !p)}
              className="action-btn-details"
              style={{
                padding: "7px 13px",
                borderRadius: 9,
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: expanded ? "#0E0E0E" : "#F5F5F3",
                color: expanded ? "#fff" : "#0E0E0E",
                border: "1.5px solid",
                borderColor: expanded ? "#0E0E0E" : "rgba(0,0,0,0.1)",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "'Space Grotesk', sans-serif",
                transition: "all 0.18s",
              }}
            >
              <FaReceipt style={{ fontSize: 11 }} />
              Details
              {expanded ? (
                <FaChevronUp style={{ fontSize: 9 }} />
              ) : (
                <FaChevronDown style={{ fontSize: 9 }} />
              )}
            </button>
          </div>
        </div>

        {/* Expanded Panel */}
        {expanded && (
          <div
            style={{
              borderTop: "1.5px solid rgba(0,0,0,0.06)",
              padding: "20px 18px",
              background: "#FAFAFA",
            }}
          >
            {/* 3-column detail grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 12,
                marginBottom: 16,
              }}
            >
              {/* Motorcycle card */}
              <div
                style={{
                  background: "#fff",
                  border: "1.5px solid rgba(0,0,0,0.07)",
                  borderRadius: 14,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 7,
                      background: tabCfg.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <FaMotorcycle
                      style={{ color: accentColor, fontSize: 11 }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "1.5px",
                      textTransform: "uppercase",
                      color: "rgba(14,14,14,0.38)",
                      fontFamily: "'Space Grotesk', sans-serif",
                    }}
                  >
                    Unit
                  </span>
                </div>
                {[
                  booking.motorcycle.engineSize && [
                    "Engine",
                    `${booking.motorcycle.engineSize}cc`,
                  ],
                  booking.motorcycle.transmission && [
                    "Transmission",
                    booking.motorcycle.transmission,
                  ],
                  booking.motorcycle.fuelType && [
                    "Fuel",
                    booking.motorcycle.fuelType,
                  ],
                  ["ABS", booking.motorcycle.hasABS ? "Yes" : "No"],
                  dailyRate > 0 && ["Rate/day", formatPrice(dailyRate)],
                ]
                  .filter(Boolean)
                  .map(([label, value]) => (
                    <div
                      key={label}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 7,
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          color: "rgba(14,14,14,0.45)",
                          fontFamily: "'Space Grotesk', sans-serif",
                        }}
                      >
                        {label}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: label === "Rate/day" ? accentColor : "#0E0E0E",
                          fontFamily: "'Space Grotesk', sans-serif",
                        }}
                      >
                        {value}
                      </span>
                    </div>
                  ))}
              </div>

              {/* Booking info */}
              <div
                style={{
                  background: "#fff",
                  border: "1.5px solid rgba(0,0,0,0.07)",
                  borderRadius: 14,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 7,
                      background: tabCfg.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <FaCalendarAlt
                      style={{ color: accentColor, fontSize: 11 }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "1.5px",
                      textTransform: "uppercase",
                      color: "rgba(14,14,14,0.38)",
                      fontFamily: "'Space Grotesk', sans-serif",
                    }}
                  >
                    Booking Info
                  </span>
                </div>
                {[
                  [
                    "Pickup",
                    `${formatDate(booking.dates.pickup)}${booking.times.pickup ? ` · ${formatTime(booking.times.pickup)}` : ""}`,
                  ],
                  [
                    "Return",
                    `${formatDate(booking.dates.return)}${booking.times.return ? ` · ${formatTime(booking.times.return)}` : ""}`,
                  ],
                  ["Duration", `${days} ${days === 1 ? "day" : "days"}`],
                  booking.destination && ["Destination", booking.destination],
                  ["Booked on", formatDateTime(booking.bookingDate)],
                  ["Payment", booking.paymentMethod || "—"],
                ]
                  .filter(Boolean)
                  .map(([label, value]) => (
                    <div
                      key={label}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 7,
                        gap: 8,
                        alignItems: "flex-start",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          color: "rgba(14,14,14,0.45)",
                          fontFamily: "'Space Grotesk', sans-serif",
                          flexShrink: 0,
                        }}
                      >
                        {label}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: "#0E0E0E",
                          fontFamily: "'Space Grotesk', sans-serif",
                          textAlign: "right",
                        }}
                      >
                        {value}
                      </span>
                    </div>
                  ))}
              </div>

              {/* Fee breakdown */}
              <div
                style={{
                  background: "#fff",
                  border: "1.5px solid rgba(0,0,0,0.07)",
                  borderRadius: 14,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 7,
                      background: tabCfg.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <FaReceipt style={{ color: accentColor, fontSize: 11 }} />
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "1.5px",
                      textTransform: "uppercase",
                      color: "rgba(14,14,14,0.38)",
                      fontFamily: "'Space Grotesk', sans-serif",
                    }}
                  >
                    Fee Breakdown
                  </span>
                </div>
                {dailyRate > 0 && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 7,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color: "rgba(14,14,14,0.45)",
                        fontFamily: "'Space Grotesk', sans-serif",
                      }}
                    >
                      ₱{dailyRate.toLocaleString()} × {days}d
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#0E0E0E",
                        fontFamily: "'Space Grotesk', sans-serif",
                      }}
                    >
                      {formatPrice(baseRental)}
                    </span>
                  </div>
                )}
                {booking.distanceFee > 0 && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 7,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color: "rgba(14,14,14,0.45)",
                        fontFamily: "'Space Grotesk', sans-serif",
                      }}
                    >
                      Distance
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#ea580c",
                        fontFamily: "'Space Grotesk', sans-serif",
                      }}
                    >
                      +{formatPrice(booking.distanceFee)}
                    </span>
                  </div>
                )}
                {booking.helmetRequested && booking.helmetFee > 0 && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 7,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color: "rgba(14,14,14,0.45)",
                        fontFamily: "'Space Grotesk', sans-serif",
                      }}
                    >
                      Helmet
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#ea580c",
                        fontFamily: "'Space Grotesk', sans-serif",
                      }}
                    >
                      +{formatPrice(booking.helmetFee)}
                    </span>
                  </div>
                )}
                {booking.raw?.returnInspection?.clearanceStatus ===
                  "penalty_required" &&
                  booking.raw?.returnInspection?.penaltyAmount > 0 && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 7,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          color: "rgba(14,14,14,0.45)",
                          fontFamily: "'Space Grotesk', sans-serif",
                        }}
                      >
                        Penalty
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: booking.raw?.returnInspection?.penaltySettled
                            ? "#16a34a"
                            : "#b50002",
                          fontFamily: "'Space Grotesk', sans-serif",
                        }}
                      >
                        +
                        {formatPrice(
                          booking.raw.returnInspection.penaltyAmount,
                        )}
                      </span>
                    </div>
                  )}
                <div
                  style={{
                    borderTop: "1.5px solid rgba(0,0,0,0.06)",
                    paddingTop: 10,
                    marginTop: 6,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#0E0E0E",
                        fontFamily: "'Space Grotesk', sans-serif",
                      }}
                    >
                      Total
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 800,
                        color: "#0E0E0E",
                        fontFamily: "'Space Grotesk', sans-serif",
                      }}
                    >
                      {formatPrice(grossTotal)}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color: "rgba(14,14,14,0.45)",
                        fontFamily: "'Space Grotesk', sans-serif",
                      }}
                    >
                      Downpayment
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#16a34a",
                        fontFamily: "'Space Grotesk', sans-serif",
                      }}
                    >
                      −{formatPrice(downpayment)}
                    </span>
                  </div>
                  <div
                    style={{
                      borderTop: "1.5px solid rgba(0,0,0,0.06)",
                      paddingTop: 10,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: "#0E0E0E",
                          fontFamily: "'Space Grotesk', sans-serif",
                        }}
                      >
                        Due at Pickup
                      </span>
                      <span
                        style={{
                          fontSize: 17,
                          fontWeight: 800,
                          color: accentColor,
                          fontFamily: "'Space Grotesk', sans-serif",
                          letterSpacing: "-0.5px",
                        }}
                      >
                        {formatPrice(dueAtPickup)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Inspection Section */}
            {booking.status === "inspection" && booking.returnInspection && (
              <div
                style={{
                  background: "#ede9fe",
                  border: "1.5px solid #c4b5fd",
                  borderRadius: 14,
                  padding: 16,
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 10,
                  }}
                >
                  <FaExclamationTriangle style={{ color: "#7c3aed" }} />
                  <span
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontWeight: 800,
                      color: "#5b21b6",
                      fontSize: 14,
                    }}
                  >
                    Return Inspection Status
                  </span>
                </div>
                <p
                  style={{
                    fontSize: 13,
                    color: "#5b21b6",
                    fontFamily: "'Space Grotesk', sans-serif",
                    lineHeight: 1.6,
                  }}
                >
                  Your motorcycle is under inspection. Please wait for the admin
                  to settle any penalties.
                </p>
                {booking.returnInspection.clearanceStatus ===
                  "penalty_required" &&
                  booking.returnInspection.penaltyAmount > 0 && (
                    <div
                      style={{
                        background: "#fee2e2",
                        border: "1.5px solid #fecaca",
                        borderRadius: 10,
                        padding: 12,
                        marginTop: 10,
                      }}
                    >
                      <p
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "1.5px",
                          textTransform: "uppercase",
                          color: "#991b1b",
                          fontFamily: "'Space Grotesk', sans-serif",
                          marginBottom: 4,
                        }}
                      >
                        Penalty Amount
                      </p>
                      <p
                        style={{
                          fontSize: 22,
                          fontWeight: 800,
                          color: "#b50002",
                          fontFamily: "'Space Grotesk', sans-serif",
                        }}
                      >
                        ₱
                        {booking.returnInspection.penaltyAmount.toLocaleString()}
                      </p>
                      {booking.returnInspection.penaltySummary && (
                        <p
                          style={{
                            fontSize: 12,
                            color: "#991b1b",
                            marginTop: 6,
                            fontFamily: "'Space Grotesk', sans-serif",
                          }}
                        >
                          {booking.returnInspection.penaltySummary}
                        </p>
                      )}
                    </div>
                  )}
              </div>
            )}

            {/* Re-upload Proof */}
            {needsReupload && !booking.isDeleted && (
              <div
                style={{
                  background: "#ffedd5",
                  border: "1.5px solid #fed7aa",
                  borderRadius: 14,
                  padding: 16,
                  marginBottom: 12,
                }}
              >
                <p
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 800,
                    color: "#9a3412",
                    fontSize: 14,
                    marginBottom: 4,
                  }}
                >
                  Payment Proof Re-upload Required
                </p>
                {booking.adminReviewComment && (
                  <p
                    style={{
                      fontSize: 12,
                      color: "#9a3412",
                      marginBottom: 12,
                      fontFamily: "'Space Grotesk', sans-serif",
                    }}
                  >
                    Comment: {booking.adminReviewComment}
                  </p>
                )}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: 10,
                    marginBottom: 12,
                  }}
                >
                  <div>
                    <label style={labelStyle}>Reference ID</label>
                    <input
                      type="text"
                      value={reuploadRef}
                      onChange={(e) => setReuploadRef(e.target.value)}
                      style={inputStyle}
                      placeholder="e.g. GCash12345678"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Payment Sent Time</label>
                    <input
                      type="datetime-local"
                      value={reuploadSentAt}
                      onChange={(e) => setReuploadSentAt(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>New Proof Image</label>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "9px 12px",
                        borderRadius: 8,
                        border: "1.5px solid rgba(0,0,0,0.1)",
                        background: "#fff",
                        cursor: "pointer",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          color: "rgba(14,14,14,0.45)",
                          fontFamily: "'Space Grotesk', sans-serif",
                        }}
                      >
                        {reuploadFile ? "Image selected" : "Choose image…"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          setReuploadFile(e.target.files?.[0] || null)
                        }
                        style={{ display: "none" }}
                      />
                    </label>
                    {proofPreviewSrc && (
                      <img
                        src={proofPreviewSrc}
                        alt="Proof preview"
                        style={{
                          marginTop: 8,
                          width: "100%",
                          maxHeight: 140,
                          objectFit: "contain",
                          borderRadius: 8,
                          border: "1.5px solid rgba(0,0,0,0.1)",
                        }}
                      />
                    )}
                  </div>
                </div>
                <button
                  onClick={submitReupload}
                  disabled={reuploading}
                  style={{
                    ...btnStyle("danger"),
                    opacity: reuploading ? 0.6 : 1,
                  }}
                >
                  {reuploading ? "Uploading…" : "Re-upload Payment Proof"}
                </button>
              </div>
            )}

            {/* ── RESCHEDULE (with InlineDatePicker) ── */}
            {canReschedule && (
              <div
                style={{
                  background: "#dbeafe",
                  border: "1.5px solid #bfdbfe",
                  borderRadius: 14,
                  padding: 16,
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontWeight: 800,
                        color: "#1e40af",
                        fontSize: 14,
                      }}
                    >
                      Need to reschedule?
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        color: "#3b82f6",
                        fontFamily: "'Space Grotesk', sans-serif",
                        marginTop: 2,
                      }}
                    >
                      Update your schedule with a live price preview.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsRescheduling((p) => !p)}
                    style={{
                      padding: "7px 14px",
                      borderRadius: 9,
                      background: "#fff",
                      color: "#2563eb",
                      border: "1.5px solid #bfdbfe",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "'Space Grotesk', sans-serif",
                      transition: "all 0.18s",
                    }}
                  >
                    {isRescheduling ? "Hide" : "Reschedule"}
                  </button>
                </div>

                {isRescheduling && (
                  <div style={{ marginTop: 14 }}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(200px, 1fr))",
                        gap: 10,
                        marginBottom: 12,
                      }}
                    >
                      {/* Pickup Date — InlineDatePicker */}
                      <div>
                        <label style={labelStyle}>Pickup Date</label>
                        <InlineDatePicker
                          value={rescheduleForm.pickupDate}
                          onChange={handleReschedulePickupDateChange}
                          minDate={minPickupDate}
                          maxDate={maxPickupDate}
                          maintenanceRanges={currentMaintenanceRanges}
                          bookingRanges={bookingRanges}
                          label="Pickup Date"
                          mode="pickup"
                        />
                      </div>

                      {/* Pickup Time */}
                      <div>
                        <label style={labelStyle}>Pickup Time</label>
                        <div style={{ position: "relative" }}>
                          <select
                            value={rescheduleForm.pickupTime}
                            onChange={(e) =>
                              setRescheduleForm((p) => {
                                const sameDay = p.returnDate === p.pickupDate;
                                return {
                                  ...p,
                                  pickupTime: e.target.value,
                                  returnTime:
                                    sameDay && p.returnTime <= e.target.value
                                      ? ""
                                      : p.returnTime,
                                };
                              })
                            }
                            style={selectStyle}
                          >
                            {ALL_TIME_SLOTS.map((s) => (
                              <option key={s.value} value={s.value}>
                                {s.label}
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
                              fontSize: 10,
                              pointerEvents: "none",
                            }}
                          />
                        </div>
                      </div>

                      {/* Return Date — InlineDatePicker */}
                      <div>
                        <label style={labelStyle}>Return Date</label>
                        <InlineDatePicker
                          value={rescheduleForm.returnDate}
                          onChange={handleRescheduleReturnDateChange}
                          minDate={rescheduleMinReturnDate}
                          maxDate={getNextUnavailableDate(
                            rescheduleForm.pickupDate,
                          )}
                          maintenanceRanges={currentMaintenanceRanges}
                          bookingRanges={bookingRanges}
                          label="Return Date"
                          mode="return"
                          pickupDateISO={rescheduleForm.pickupDate}
                        />
                      </div>

                      {/* Return Time */}
                      <div>
                        <label style={labelStyle}>Return Time</label>
                        <div style={{ position: "relative" }}>
                          <select
                            value={rescheduleForm.returnTime}
                            onChange={(e) =>
                              setRescheduleForm((p) => ({
                                ...p,
                                returnTime: e.target.value,
                              }))
                            }
                            style={selectStyle}
                          >
                            <option value="">Select time</option>
                            {validReturnTimeSlots.map((s) => (
                              <option key={s.value} value={s.value}>
                                {s.label}
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
                              fontSize: 10,
                              pointerEvents: "none",
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Selected range summary pill */}
                    {rescheduleForm.pickupDate && rescheduleForm.returnDate && (
                      <div
                        style={{
                          background: "#fff",
                          border: "1.5px solid #bfdbfe",
                          borderRadius: 10,
                          padding: "8px 14px",
                          marginBottom: 10,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#1e40af",
                            fontFamily: "'Space Grotesk', sans-serif",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <FaCalendarAlt style={{ fontSize: 11 }} />
                          {new Date(
                            rescheduleForm.pickupDate + "T00:00:00",
                          ).toLocaleDateString("en-PH", {
                            month: "short",
                            day: "numeric",
                          })}
                          {" → "}
                          {new Date(
                            rescheduleForm.returnDate + "T00:00:00",
                          ).toLocaleDateString("en-PH", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            color: "#2563eb",
                            background: "rgba(37,99,235,0.1)",
                            borderRadius: 999,
                            padding: "3px 10px",
                            fontFamily: "'Space Grotesk', sans-serif",
                          }}
                        >
                          {rescheduledDays} day
                          {rescheduledDays !== 1 ? "s" : ""}
                        </span>
                      </div>
                    )}

                    {/* Price preview */}
                    <div
                      style={{
                        background: "#fff",
                        border: "1.5px solid #bfdbfe",
                        borderRadius: 10,
                        padding: 14,
                        marginBottom: 12,
                      }}
                    >
                      <p style={{ ...labelStyle, marginBottom: 10 }}>
                        Updated Price Preview
                      </p>
                      {[
                        [
                          `₱${dailyRate.toLocaleString()} × ${rescheduledDays}d`,
                          formatPrice(dailyRate * rescheduledDays),
                        ],
                        booking.distanceFee > 0 && [
                          "Distance Fee",
                          `+${formatPrice(booking.distanceFee)}`,
                        ],
                        booking.helmetFee > 0 && [
                          "Helmet Fee",
                          `+${formatPrice(booking.helmetFee)}`,
                        ],
                      ]
                        .filter(Boolean)
                        .map(([lbl, val]) => (
                          <div
                            key={lbl}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: 6,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 12,
                                color: "rgba(14,14,14,0.45)",
                                fontFamily: "'Space Grotesk', sans-serif",
                              }}
                            >
                              {lbl}
                            </span>
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: "#0E0E0E",
                                fontFamily: "'Space Grotesk', sans-serif",
                              }}
                            >
                              {val}
                            </span>
                          </div>
                        ))}
                      <div
                        style={{
                          borderTop: "1.5px solid rgba(0,0,0,0.06)",
                          paddingTop: 8,
                          marginTop: 6,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: "#0E0E0E",
                            fontFamily: "'Space Grotesk', sans-serif",
                          }}
                        >
                          Due at Pickup
                        </span>
                        <span
                          style={{
                            fontSize: 16,
                            fontWeight: 800,
                            color: "#2563eb",
                            fontFamily: "'Space Grotesk', sans-serif",
                          }}
                        >
                          {formatPrice(rescheduledDueAtPickup)}
                        </span>
                      </div>
                    </div>
                    <div
                      style={{ display: "flex", justifyContent: "flex-end" }}
                    >
                      <button
                        onClick={submitReschedule}
                        disabled={rescheduling}
                        style={{
                          padding: "9px 20px",
                          borderRadius: 10,
                          background: "#2563eb",
                          color: "#fff",
                          border: "none",
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: "pointer",
                          fontFamily: "'Space Grotesk', sans-serif",
                          opacity: rescheduling ? 0.6 : 1,
                          transition: "all 0.18s",
                        }}
                      >
                        {rescheduling ? "Saving…" : "Save New Schedule"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── EXTENSION (with InlineDatePicker) ── */}
            {canExtend && (
              <div
                style={{
                  background: "#dcfce7",
                  border: "1.5px solid #bbf7d0",
                  borderRadius: 14,
                  padding: 16,
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontWeight: 800,
                        color: "#166534",
                        fontSize: 14,
                      }}
                    >
                      Extend your rental
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        color: "#16a34a",
                        fontFamily: "'Space Grotesk', sans-serif",
                        marginTop: 2,
                      }}
                    >
                      Update return schedule and see new total instantly.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsExtending((p) => !p)}
                    style={{
                      padding: "7px 14px",
                      borderRadius: 9,
                      background: "#fff",
                      color: "#16a34a",
                      border: "1.5px solid #bbf7d0",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "'Space Grotesk', sans-serif",
                      transition: "all 0.18s",
                    }}
                  >
                    {isExtending ? "Hide" : "Extend"}
                  </button>
                </div>

                {isExtending && (
                  <div style={{ marginTop: 14 }}>
                    <div
                      style={{
                        background: "#fff",
                        border: "1.5px solid #bbf7d0",
                        borderRadius: 9,
                        padding: 10,
                        marginBottom: 12,
                        fontSize: 12,
                        color: "#166534",
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontWeight: 600,
                      }}
                    >
                      <span style={{ fontWeight: 800 }}>Current Return:</span>{" "}
                      {formatDate(
                        originalReturnDateFromExtension || booking.dates.return,
                      )}
                      {(originalReturnTimeFromExtension ||
                        booking.times.return) &&
                        ` · ${formatTime(originalReturnTimeFromExtension || booking.times.return)}`}
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(200px, 1fr))",
                        gap: 10,
                        marginBottom: 12,
                      }}
                    >
                      {/* New Return Date — InlineDatePicker */}
                      <div>
                        <label style={labelStyle}>New Return Date</label>
                        <InlineDatePicker
                          value={extensionForm.returnDate}
                          onChange={handleExtensionReturnDateChange}
                          minDate={extensionMinReturnDate}
                          maxDate={getNextUnavailableDate(
                            originalReturnDateInput,
                          )}
                          maintenanceRanges={currentMaintenanceRanges}
                          bookingRanges={bookingRanges}
                          label="New Return Date"
                          mode="return"
                          pickupDateISO={originalPickupDateInput}
                        />
                      </div>

                      {/* New Return Time */}
                      <div>
                        <label style={labelStyle}>New Return Time</label>
                        <div style={{ position: "relative" }}>
                          <select
                            value={extensionForm.returnTime}
                            onChange={(e) =>
                              setExtensionForm((p) => ({
                                ...p,
                                returnTime: e.target.value,
                              }))
                            }
                            style={selectStyle}
                          >
                            <option value="">Select time</option>
                            {ALL_TIME_SLOTS.map((s) => (
                              <option key={s.value} value={s.value}>
                                {s.label}
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
                              fontSize: 10,
                              pointerEvents: "none",
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Extension price preview */}
                    <div
                      style={{
                        background: "#fff",
                        border: "1.5px solid #bbf7d0",
                        borderRadius: 10,
                        padding: 14,
                        marginBottom: 12,
                      }}
                    >
                      <p style={{ ...labelStyle, marginBottom: 10 }}>
                        Extension Price Preview
                      </p>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 6,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            color: "rgba(14,14,14,0.45)",
                            fontFamily: "'Space Grotesk', sans-serif",
                          }}
                        >
                          ₱{dailyRate.toLocaleString()} ×{" "}
                          {Math.max(extensionDays, 1)}d
                        </span>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: "#0E0E0E",
                            fontFamily: "'Space Grotesk', sans-serif",
                          }}
                        >
                          {formatPrice(dailyRate * Math.max(extensionDays, 1))}
                        </span>
                      </div>
                      <div
                        style={{
                          borderTop: "1.5px solid rgba(0,0,0,0.06)",
                          paddingTop: 8,
                          marginTop: 6,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: "#0E0E0E",
                            fontFamily: "'Space Grotesk', sans-serif",
                          }}
                        >
                          Additional Due
                        </span>
                        <span
                          style={{
                            fontSize: 16,
                            fontWeight: 800,
                            color: "#16a34a",
                            fontFamily: "'Space Grotesk', sans-serif",
                          }}
                        >
                          +{formatPrice(extensionAdditionalAmount)}
                        </span>
                      </div>
                      <p
                        style={{
                          fontSize: 11,
                          color: "rgba(14,14,14,0.38)",
                          marginTop: 6,
                          fontFamily: "'Space Grotesk', sans-serif",
                        }}
                      >
                        Extension fee is paid upon return.
                      </p>
                    </div>
                    <div
                      style={{ display: "flex", justifyContent: "flex-end" }}
                    >
                      <button
                        onClick={submitExtension}
                        disabled={extending}
                        style={{
                          padding: "9px 20px",
                          borderRadius: 10,
                          background: "#16a34a",
                          color: "#fff",
                          border: "none",
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: "pointer",
                          fontFamily: "'Space Grotesk', sans-serif",
                          opacity: extending ? 0.6 : 1,
                          transition: "all 0.18s",
                        }}
                      >
                        {extending ? "Saving…" : "Confirm Extension"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Review Status */}
            {booking.status === "completed" && !booking.isDeleted && (
              <div
                style={{
                  background: "#fff",
                  border: "1.5px solid rgba(0,0,0,0.07)",
                  borderRadius: 14,
                  padding: 16,
                  marginBottom: 12,
                }}
              >
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "1.5px",
                    textTransform: "uppercase",
                    color: "rgba(14,14,14,0.35)",
                    marginBottom: 10,
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}
                >
                  Your Review
                </p>
                {reviewLoading ? (
                  <p
                    style={{
                      fontSize: 13,
                      color: "rgba(14,14,14,0.4)",
                      fontFamily: "'Space Grotesk', sans-serif",
                    }}
                  >
                    Loading…
                  </p>
                ) : bookingReview ? (
                  <div>
                    <p
                      style={{
                        fontSize: 13,
                        color: "rgba(14,14,14,0.6)",
                        fontFamily: "'Space Grotesk', sans-serif",
                      }}
                    >
                      Status:{" "}
                      <span
                        style={{
                          fontWeight: 800,
                          color: "#0E0E0E",
                          textTransform: "capitalize",
                        }}
                      >
                        {bookingReview.status || "pending"}
                      </span>
                    </p>
                    {bookingReview.adminReplyMessage && (
                      <div
                        style={{
                          marginTop: 10,
                          background: "#fff7ed",
                          border: "1.5px solid #fed7aa",
                          borderRadius: 10,
                          padding: 12,
                        }}
                      >
                        <p
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: "#9a3412",
                            letterSpacing: "1.5px",
                            textTransform: "uppercase",
                            marginBottom: 6,
                            fontFamily: "'Space Grotesk', sans-serif",
                          }}
                        >
                          Admin Reply
                        </p>
                        <p
                          style={{
                            fontSize: 13,
                            color: "#7c2d12",
                            lineHeight: 1.6,
                            fontFamily: "'Space Grotesk', sans-serif",
                          }}
                        >
                          {bookingReview.adminReplyMessage}
                        </p>
                        {bookingReview.adminRepliedAt && (
                          <p
                            style={{
                              fontSize: 11,
                              color: "rgba(14,14,14,0.38)",
                              marginTop: 6,
                              fontFamily: "'Space Grotesk', sans-serif",
                            }}
                          >
                            Replied{" "}
                            {formatDateTime(bookingReview.adminRepliedAt)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p
                    style={{
                      fontSize: 13,
                      color: "rgba(14,14,14,0.4)",
                      fontFamily: "'Space Grotesk', sans-serif",
                    }}
                  >
                    No review submitted yet.
                  </p>
                )}
              </div>
            )}

            {/* Footer */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                paddingTop: 4,
              }}
            >
              <StatusBadge
                status={booking.status}
                isDeleted={booking.isDeleted}
              />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[
                  "pending",
                  "pending_reservation",
                  "pending_full_payment",
                ].includes(booking.status) &&
                  !booking.isDeleted && (
                    <button
                      onClick={() => onCancel(booking.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "8px 16px",
                        borderRadius: 9,
                        background: "#fee2e2",
                        color: "#b50002",
                        border: "1.5px solid #fecaca",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "'Space Grotesk', sans-serif",
                        transition: "all 0.18s",
                      }}
                    >
                      Cancel Booking
                    </button>
                  )}
                {booking.status === "completed" && !booking.isDeleted && (
                  <button
                    onClick={() => {
                      if (bookingReview) {
                        setExpanded(true);
                        return;
                      }
                      setShowReviewModal(true);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "8px 16px",
                      borderRadius: 9,
                      background: "#fef3c7",
                      color: "#92400e",
                      border: "1.5px solid #fde68a",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "'Space Grotesk', sans-serif",
                      transition: "all 0.18s",
                    }}
                  >
                    {bookingReview ? "View Review" : "⭐ Leave Review"}
                  </button>
                )}
                <Link
                  to="/motorcycles"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 16px",
                    borderRadius: 9,
                    background: "#0E0E0E",
                    color: "#fff",
                    border: "none",
                    fontSize: 12,
                    fontWeight: 700,
                    textDecoration: "none",
                    fontFamily: "'Space Grotesk', sans-serif",
                    transition: "all 0.18s",
                  }}
                >
                  <FaMotorcycle style={{ fontSize: 11 }} />
                  {[
                    "pending",
                    "pending_reservation",
                    "pending_full_payment",
                    "active",
                  ].includes(booking.status)
                    ? "Browse More"
                    : "Rent Again"}
                  <FaArrowRight style={{ fontSize: 10 }} />
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {showReviewModal &&
        createPortal(
          <ReviewModal
            booking={booking.raw}
            onSuccess={fetchBookingReview}
            onClose={() => setShowReviewModal(false)}
          />,
          document.body,
        )}
    </>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState("pending_reservation");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [calBookings, setCalBookings] = useState([]);
  const [maintenanceRanges, setMaintenanceRanges] = useState([]);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const [bookingsRes, motoRes] = await Promise.allSettled([
          axios.get(`${API_BASE}/api/motorcycle-bookings`, {
            signal: controller.signal,
            params: { limit: 1000 },
          }),
          axios.get(`${API_BASE}/api/motorcycles`, {
            signal: controller.signal,
            params: { limit: 1000, includeDeleted: "false" },
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
            { headers, signal: controller.signal, timeout: TIMEOUT },
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
          if (wasCancelled && controller.signal.aborted) return;
          if ((wasTimeout || wasCancelled) && attempt === 0) {
            await new Promise((r) => setTimeout(r, 700));
            continue;
          }
          throw err;
        }
      }
    } catch (err) {
      if (!isMounted.current) return;
      if (err?.name === "CanceledError" || err?.message === "canceled")
        setError("Request interrupted. Retrying may fix this.");
      else if (err?.code === "ECONNABORTED")
        setError("Loading is taking too long. Please try again.");
      else
        setError(
          err.response?.data?.message ||
            lastErr?.message ||
            err.message ||
            "Failed to load bookings",
        );
    } finally {
      if (requestAbortRef.current === controller)
        requestAbortRef.current = null;
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
    } catch {}
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
        { headers: { ...(token && { Authorization: `Bearer ${token}` }) } },
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

  const extendBooking = useCallback(async (bookingId, payload) => {
    try {
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      };
      const response = await axios.patch(
        `${API_BASE}/api/motorcycle-bookings/${bookingId}/extend`,
        { returnDate: payload.returnDate, returnTime: payload.returnTime },
        { headers },
      );
      const updated = normalizeBooking(
        response?.data?.booking || response?.data || { _id: bookingId },
      );
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? updated : b)),
      );
      await alertModal("Rental extended successfully.");
    } catch (err) {
      await alertModal(
        err.response?.data?.message || "Failed to extend rental.",
        { isError: true },
      );
      throw err;
    }
  }, []);

  const downloadRentalAgreement = useCallback(
    async (bookingId, customerName) => {
      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await axios.get(
          `${API_BASE}/api/motorcycle-bookings/${bookingId}/rental-agreement`,
          { headers, responseType: "blob" },
        );
        const blob = new Blob([response.data], { type: "application/pdf" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute(
          "download",
          `RentalAgreement_${customerName?.replace(/\s+/g, "_") || "RentalAgreement"}.pdf`,
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        await alertModal("Rental agreement downloaded successfully.");
      } catch (err) {
        await alertModal(
          err.response?.data?.message || "Failed to download rental agreement.",
          { isError: true },
        );
      }
    },
    [],
  );

  const tabCounts = useMemo(
    () =>
      STATUS_TABS.reduce((acc, tab) => {
        acc[tab.key] =
          tab.key === "rejected"
            ? bookings.filter((b) => b.isDeleted).length
            : bookings.filter((b) => !b.isDeleted && b.status === tab.key)
                .length;
        return acc;
      }, {}),
    [bookings],
  );

  const inspectionIssueCount = useMemo(
    () =>
      bookings.filter(
        (b) =>
          !b.isDeleted &&
          b.status === "inspection" &&
          ["damage_found", "penalty_required"].includes(
            b.raw?.returnInspection?.clearanceStatus,
          ),
      ).length,
    [bookings],
  );

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

  const activeTabConfig =
    STATUS_TABS.find((t) => t.key === activeTab) || STATUS_TABS[0];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&display=swap');

        .mybookings-root * { box-sizing: border-box; }

        .tab-full-label { display: inline; }
        .tab-short-label { display: none; }
        @media (max-width: 600px) {
          .tab-full-label { display: none; }
          .tab-short-label { display: inline; }
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes calFadeIn {
          from { opacity:0; transform:translateY(6px) scale(0.97); }
          to { opacity:1; transform:translateY(0) scale(1); }
        }

        .booking-card-enter {
          animation: fadeUp 0.3s ease forwards;
        }

        .booking-card:hover {
          box-shadow: 0 8px 32px rgba(0,0,0,0.09);
          border-color: rgba(0,0,0,0.13) !important;
          transform: translateY(-1px);
        }
        .booking-card:hover .booking-thumb {
          transform: scale(1.06);
        }

        .action-btn-cancel:hover {
          background: #fecaca !important;
          border-color: #fca5a5 !important;
        }
        .action-btn-icon:hover {
          background: #bfdbfe !important;
          transform: scale(1.08);
        }
        .action-btn-details:hover {
          opacity: 0.85;
        }
      `}</style>

      <div
        className="mybookings-root"
        style={{
          minHeight: "100vh",
          background: "#F5F5F3",
          fontFamily: "'Space Grotesk', sans-serif",
        }}
      >
        <Navbar />

        {/* Header */}
        <div
          style={{
            paddingTop: 96,
            background: "#fff",
            borderBottom: "1.5px solid rgba(0,0,0,0.07)",
          }}
        >
          <div
            style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 0" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
                gap: 16,
                marginBottom: 28,
                flexWrap: "wrap",
              }}
            >
              <div>
                <h1
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 800,
                    fontSize: "clamp(24px, 3.5vw, 38px)",
                    color: "#0E0E0E",
                    letterSpacing: "-1.5px",
                    lineHeight: 1.1,
                    margin: 0,
                  }}
                >
                  Booking History
                </h1>
                <p
                  style={{
                    fontSize: 14,
                    color: "rgba(14,14,14,0.45)",
                    marginTop: 6,
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}
                >
                  View details, track status, and manage your rentals
                </p>
              </div>
              <div
                style={{
                  padding: "6px 16px",
                  borderRadius: 999,
                  background: activeTabConfig.bg,
                  color: activeTabConfig.color,
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "'Space Grotesk', sans-serif",
                  border: `1.5px solid ${activeTabConfig.color}30`,
                }}
              >
                {filteredBookings.length} {activeTabConfig.label.toLowerCase()}{" "}
                {filteredBookings.length === 1 ? "booking" : "bookings"}
              </div>
            </div>

            {/* Tab bar */}
            <div
              ref={topRef}
              style={{
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
                paddingBottom: 0,
              }}
            >
              {STATUS_TABS.map((tab) => (
                <TabButton
                  key={tab.key}
                  tab={tab}
                  isActive={activeTab === tab.key}
                  count={tabCounts[tab.key] || 0}
                  issueCount={
                    tab.key === "inspection" ? inspectionIssueCount : 0
                  }
                  onClick={(key) => {
                    setActiveTab(key);
                    setCurrentPage(1);
                  }}
                />
              ))}
            </div>

            {/* Active indicator line */}
            <div
              style={{
                height: 2.5,
                background: "rgba(0,0,0,0.05)",
                marginTop: 16,
                position: "relative",
                borderRadius: 2,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  width: "30%",
                  height: "100%",
                  background: `linear-gradient(90deg, ${activeTabConfig.color}, transparent)`,
                  transition: "all 0.3s",
                  borderRadius: 2,
                  opacity: 0.6,
                }}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "28px 24px 64px",
          }}
        >
          {loading && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "80px 20px",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  border: "2.5px solid rgba(0,0,0,0.08)",
                  borderTopColor: "#b50002",
                  borderRadius: "50%",
                  animation: "spin 0.7s linear infinite",
                }}
              />
              <span
                style={{
                  color: "rgba(14,14,14,0.45)",
                  fontSize: 14,
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                Loading your bookings…
              </span>
            </div>
          )}

          {!loading && error && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "80px 20px",
                gap: 16,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  background: "#fee2e2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FaExclamationTriangle
                  style={{ color: "#b50002", fontSize: 20 }}
                />
              </div>
              <p
                style={{
                  color: "rgba(14,14,14,0.5)",
                  fontSize: 14,
                  fontFamily: "'Space Grotesk', sans-serif",
                  maxWidth: 320,
                }}
              >
                {error}
              </p>
              <button
                onClick={fetchBookings}
                style={{
                  padding: "10px 24px",
                  borderRadius: 10,
                  background: "#0E0E0E",
                  color: "#fff",
                  border: "none",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "'Space Grotesk', sans-serif",
                  transition: "all 0.18s",
                }}
              >
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && filteredBookings.length === 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "80px 20px",
                gap: 16,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: 70,
                  height: 70,
                  borderRadius: 20,
                  background: "#fff",
                  border: "1.5px solid rgba(0,0,0,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
                }}
              >
                <FaMotorcycle
                  style={{ color: "rgba(14,14,14,0.2)", fontSize: 28 }}
                />
              </div>
              <div>
                <h3
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 800,
                    fontSize: 18,
                    color: "#0E0E0E",
                    marginBottom: 6,
                    letterSpacing: "-0.5px",
                  }}
                >
                  No {activeTabConfig.label.toLowerCase()} bookings
                </h3>
                <p
                  style={{
                    fontSize: 13,
                    color: "rgba(14,14,14,0.4)",
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}
                >
                  {activeTab === "pending_reservation"
                    ? "You don't have any pending reservation requests."
                    : activeTab === "pending_full_payment"
                      ? "No bookings awaiting full payment."
                      : activeTab === "active"
                        ? "You don't have any active rentals."
                        : activeTab === "completed"
                          ? "You haven't completed any trips yet."
                          : activeTab === "cancelled"
                            ? "No cancelled bookings."
                            : activeTab === "rejected"
                              ? "No rejected bookings."
                              : `No ${activeTabConfig.label.toLowerCase()} bookings found.`}
                </p>
              </div>
              <Link
                to="/motorcycles"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 22px",
                  borderRadius: 10,
                  background: "#b50002",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  textDecoration: "none",
                  fontFamily: "'Space Grotesk', sans-serif",
                  boxShadow: "0 4px 16px rgba(181,0,2,0.2)",
                  transition: "all 0.18s",
                }}
              >
                <FaMotorcycle style={{ fontSize: 12 }} /> Browse Motorcycles{" "}
                <FaArrowRight style={{ fontSize: 10 }} />
              </Link>
            </div>
          )}

          {!loading && !error && paginatedBookings.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {paginatedBookings.map((booking, idx) => (
                <div
                  key={booking.id}
                  className="booking-card-enter"
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  <BookingRow
                    booking={booking}
                    onCancel={cancelBooking}
                    onReupload={reuploadPaymentProof}
                    onReschedule={rescheduleBooking}
                    onExtend={extendBooking}
                    onDownloadAgreement={downloadRentalAgreement}
                    calBookings={calBookings}
                    maintenanceRanges={maintenanceRanges}
                  />
                </div>
              ))}
            </div>
          )}

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
    </>
  );
};

export default MyBookings;
