import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import ReactDOM from "react-dom/client";
import {
  FaCog,
  FaFilter,
  FaGasPump,
  FaShieldAlt,
  FaTimes,
  FaSearch,
  FaThLarge,
  FaList,
  FaChevronLeft,
  FaChevronRight,
  FaChevronUp,
  FaChevronDown,
  FaSort,
  FaCalendarAlt,
  FaTools,
  FaCheckCircle,
} from "react-icons/fa";
import {
  Wrench,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
} from "lucide-react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import API_BASE_URL from "../apiBase";

const BASE = API_BASE_URL;
const api = axios.create({
  baseURL: BASE,
  headers: { Accept: "application/json" },
});
const ITEMS_PER_PAGE = 10;
const MAINTENANCE_INTERVAL_MONTHS = 6;

const nextSortState = (c) => (c === null ? "asc" : c === "asc" ? "desc" : null);

const makeImageUrl = (img) => {
  if (!img) return "";
  const s = String(img).trim();
  if (/^data:image\//i.test(s)) return s;
  if (/^https?:\/\//i.test(s)) return s.replace(/^http:\/\//i, "https://");
  return `${BASE}/uploads/${s.replace(/^\/+/, "").replace(/^uploads\//, "")}`;
};

const addMonths = (date, months) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
};

const startOfDay = (date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const toDateInputValue = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getAutomaticMaintenanceDate = () =>
  toDateInputValue(addMonths(new Date(), MAINTENANCE_INTERVAL_MONTHS));

const formatMaintenanceDate = (startValue, endValue) => {
  const start = startValue ? new Date(startValue) : null;
  const end = endValue ? new Date(endValue) : null;
  if (
    (!start || Number.isNaN(start.getTime())) &&
    (!end || Number.isNaN(end.getTime()))
  )
    return "Not scheduled";
  const today = startOfDay(new Date());
  // Normalize
  const s = start || end;
  const e = end || start;
  if (!s || !e) return "Not scheduled";
  const sDay = startOfDay(s);
  const eDay = startOfDay(e);
  if (eDay < today) return "Overdue";
  if (sDay.getTime() === today.getTime() || (sDay <= today && today <= eDay))
    return "Due today";
  const sLabel = s.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const eLabel = e.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return sLabel === eLabel ? sLabel : `${sLabel} — ${eLabel}`;
};

const isMaintenanceOverdue = (startValue, endValue) => {
  const end = endValue
    ? new Date(endValue)
    : startValue
      ? new Date(startValue)
      : null;
  if (!end || Number.isNaN(end.getTime())) return false;
  return startOfDay(end) < startOfDay(new Date());
};

const buildMotorcycleFormData = (motorcycle, overrides = {}) => {
  const fd = new FormData();
  const payload = {
    unitId: motorcycle.unitId || "",
    traccarDeviceId: motorcycle.traccarDeviceId || "",
    make: motorcycle.make,
    model: motorcycle.model,
    year: Number(motorcycle.year || 0),
    description: motorcycle.description || "",
    category: motorcycle.category || "Scooter",
    transmission: motorcycle.transmission || "Manual",
    fuelType: motorcycle.fuelType || "Unleaded",
    engineSize: Number(motorcycle.engineSize || 150),
    dailyRate: Number(motorcycle.dailyRate || 0),
    hasABS: motorcycle.hasABS || false,
    hasHelmet: motorcycle.hasHelmet !== false,
    status: motorcycle.status,
    ...overrides,
  };

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    fd.append(key, value instanceof Date ? value.toISOString() : value);
  });

  return fd;
};

const buildSafeMotorcycle = (raw = {}, idx = 0) => {
  const _id = raw._id || raw.id || null;
  return {
    _id,
    id: _id || raw.id || raw.localId || `local-${idx + 1}`,
    unitId: raw.unitId || "",
    make: raw.make || "",
    model: raw.model || "",
    year: raw.year ?? "",
    description: raw.description || "",
    category: raw.category || "Scooter",
    transmission: raw.transmission || "Manual",
    fuelType: raw.fuelType || raw.fuel || "Unleaded",
    engineSize: raw.engineSize ?? 150,
    dailyRate: raw.dailyRate ?? raw.price ?? 0,
    hasABS: raw.hasABS || false,
    hasHelmet: raw.hasHelmet !== false,
    status: raw.status || "available",
    isDeleted: raw.isDeleted || false,
    traccarDeviceId: raw.traccarDeviceId || "",
    deletedAt: raw.deletedAt || null,
    maintenanceScheduleAt:
      raw.maintenanceScheduleStartAt || raw.maintenanceScheduleAt || null,
    maintenanceScheduleStartAt:
      raw.maintenanceScheduleStartAt || raw.maintenanceScheduleAt || null,
    maintenanceScheduleEndAt:
      raw.maintenanceScheduleEndAt || raw.maintenanceScheduleAt || null,
    _rawImage: raw.image ?? raw._rawImage ?? "",
    image: raw.image
      ? makeImageUrl(raw.image)
      : raw._rawImage
        ? makeImageUrl(raw._rawImage)
        : "",
  };
};

// ── Calendar Helpers ───────────────────────────────────────────────────────────
const formatLocalDate = (date) => {
  const y = date.getFullYear(),
    m = String(date.getMonth() + 1).padStart(2, "0"),
    d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};
const todayISO = () => formatLocalDate(new Date());

const toDateKey = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return formatLocalDate(date);
};
const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
const calAddMonths = (date, amount) =>
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

// ── Shared styles ─────────────────────────────────────────────────────────────
const labelCls =
  "block text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase mb-1.5";

// ── InlineDatePicker Component ─────────────────────────────────────────────────
const InlineDatePicker = ({
  value,
  onChange,
  minDate,
  maxDate,
  label,
  disabled = false,
  highlightRangeStart = null,
  bookingRanges = [],
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
    if (isBookedDay(date)) return;
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
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none flex items-center justify-between transition-colors"
        style={{
          borderColor: open ? "#b50002" : "",
          color: value ? "#171717" : "#94a3b8",
        }}
      >
        <div className="flex items-center gap-2">
          <FaCalendarAlt className="text-[#b50002] text-sm" />
          <span>{displayValue || `Select ${label}`}</span>
        </div>
        <FaChevronDown
          style={{
            fontSize: 10,
            color: "rgba(0,0,0,0.3)",
            transition: "transform 0.2s",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

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
            animation: "calFadeIn 0.18s ease",
          }}
        >
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
              onClick={() => setViewMonth((v) => calAddMonths(v, -1))}
              style={{ padding: "5px 8px", borderRadius: 8, background: "#F5F5F3", border: "none", cursor: "pointer" }}
            >
              <FaChevronLeft size={10} color="#0E0E0E" />
            </button>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#0E0E0E" }}>
              {monthLabel}
            </span>
            <button
              type="button"
              onClick={() => setViewMonth((v) => calAddMonths(v, 1))}
              style={{ padding: "5px 8px", borderRadius: 8, background: "#F5F5F3", border: "none", cursor: "pointer" }}
            >
              <FaChevronRight size={10} color="#0E0E0E" />
            </button>
          </div>

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
                  padding: "4px 0",
                }}
              >
                {d}
              </div>
            ))}
          </div>

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
              const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
              const tooEarly = minD && d < minD;
              const tooLate = maxD && d > maxD;
              const isBooked = isBookedDay(date);
              const isDisabled = tooEarly || tooLate || isBooked;
              const isToday = dk === todayISO();

              const isRangeStart = highlightRangeStart === dk;
              const isInRange = highlightRangeStart && value && dk > highlightRangeStart && dk < value;

              let bg = "transparent";
              let color = inMonth ? "#0E0E0E" : "rgba(0,0,0,0.2)";
              let border = "1.5px solid transparent";
              let cursor = isDisabled ? "not-allowed" : "pointer";
              let opacity = isDisabled ? (isBooked ? 0.8 : 0.3) : 1;

              if (isSelected) {
                bg = "#0E0E0E";
                color = "#fff";
                border = "1.5px solid #0E0E0E";
              } else if (isRangeStart) {
                bg = "#b50002";
                color = "#fff";
                border = "1.5px solid #b50002";
              } else if (isInRange) {
                bg = "rgba(181,0,2,0.07)";
                border = "1.5px solid rgba(181,0,2,0.12)";
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
                  className="hover:bg-slate-50 transition-colors relative"
                  style={{
                    background: bg,
                    color,
                    border,
                    borderRadius: 8,
                    padding: "6px 2px",
                    fontSize: 11,
                    fontWeight: isSelected || isToday ? 800 : 600,
                    cursor,
                    opacity,
                    minHeight: 30,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {date.getDate()}
                  {isBooked && !isSelected && inMonth && (
                    <span
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: "50%",
                        background: "rgba(181,0,2,0.4)",
                        flexShrink: 0,
                        marginTop: 2,
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


// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_STYLE = {
  available: "bg-emerald-50 text-emerald-600 border-emerald-200",
  rented: "bg-blue-50 text-blue-600 border-blue-200",
  maintenance: "bg-amber-50 text-amber-600 border-amber-200",
  pending: "bg-violet-50 text-violet-600 border-violet-200",
};
const StatusBadge = ({ status }) => {
  const cls =
    STATUS_STYLE[status] ?? "bg-slate-50 text-slate-500 border-slate-200";
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${cls}`}
    >
      {label}
    </span>
  );
};

// ── Confirm Modal ─────────────────────────────────────────────────────────────
const ConfirmModal = ({
  message,
  subMessage,
  onConfirm,
  onCancel,
  confirmLabel,
  confirmAccent,
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
        <div
          className={`mx-auto w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${confirmAccent === "emerald" ? "bg-emerald-50" : "bg-amber-50"}`}
        >
          {confirmAccent === "emerald" ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-amber-500" />
          )}
        </div>
        <h3 className="text-lg font-black text-[#171717] mb-2">{message}</h3>
        {subMessage && (
          <p className="text-slate-500 text-sm mb-6">{subMessage}</p>
        )}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-white font-bold text-sm transition-all
              ${
                confirmAccent === "emerald"
                  ? "bg-emerald-500 shadow-md shadow-emerald-500/30 hover:brightness-110"
                  : "bg-amber-500 shadow-md shadow-amber-500/30 hover:brightness-110"
              }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  </div>
);

const confirmModal = (message, subMessage, confirmLabel, confirmAccent) =>
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
        subMessage={subMessage}
        confirmLabel={confirmLabel}
        confirmAccent={confirmAccent}
        onConfirm={() => cleanup(true)}
        onCancel={() => cleanup(false)}
      />,
    );
  });

const ScheduleModal = ({
  motorcycle,
  initialStart,
  initialEnd,
  bookingRanges,
  onConfirm,
  onCancel,
}) => {
  const [start, setStart] = useState(initialStart || "");
  const [end, setEnd] = useState(initialEnd || initialStart || "");
  const todayValue = todayISO();
  const automaticValue = getAutomaticMaintenanceDate();

  const valid = () => {
    if (!start) return false;
    const s = new Date(start);
    const e = end ? new Date(end) : new Date(start);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return false;
    return s <= e && start >= todayValue;
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center mb-4 bg-[#b50002]/10">
            <FaCalendarAlt className="w-5 h-5 text-[#b50002]" />
          </div>
          <h3 className="text-lg font-black text-[#171717] mb-2">
            Reschedule Maintenance
          </h3>
          <p className="text-slate-500 text-sm mb-5">
            {motorcycle.make} {motorcycle.model}
          </p>

          <div className="text-left grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Start date</label>
              <InlineDatePicker
                value={start}
                onChange={(val) => {
                  setStart(val);
                  if (!end || val > end) setEnd(val);
                }}
                minDate={todayValue}
                label="Start date"
                bookingRanges={bookingRanges}
              />
            </div>
            <div>
              <label className={labelCls}>End date</label>
              <InlineDatePicker
                value={end}
                onChange={(val) => setEnd(val)}
                minDate={start || todayValue}
                highlightRangeStart={start}
                label="End date"
                bookingRanges={bookingRanges}
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Set a start and end date for maintenance. Past dates are blocked.
          </p>

          <button
            type="button"
            onClick={() => {
              setStart(automaticValue);
              setEnd(automaticValue);
            }}
            className="mt-3 w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:border-[#b50002]/20 hover:text-[#b50002] transition-colors"
          >
            Use automatic 6-month date
          </button>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm({ start, end })}
              disabled={!valid()}
              className="flex-1 py-2.5 rounded-xl bg-[#b50002] text-white font-bold text-sm shadow-md shadow-[#b50002]/30 hover:brightness-110 transition-all disabled:opacity-50"
            >
              Save Dates
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const scheduleModal = (motorcycle, bookings) =>
  new Promise((resolve) => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const root = ReactDOM.createRoot(el);
    const todayValue = todayISO();
    const currentStart = toDateInputValue(
      motorcycle.maintenanceScheduleStartAt || motorcycle.maintenanceScheduleAt,
    );
    const currentEnd = toDateInputValue(
      motorcycle.maintenanceScheduleEndAt || motorcycle.maintenanceScheduleAt,
    );
    const initialStart =
      currentStart && currentStart >= todayValue
        ? currentStart
        : getAutomaticMaintenanceDate();
    const initialEnd =
      currentEnd && currentEnd >= initialStart ? currentEnd : initialStart;

    const currentMotoId = motorcycle._id || motorcycle.id;
    const bookingRanges = (bookings || [])
      .filter((b) => {
        const id =
          b.motorcycle?._id || b.motorcycle?.id || b.motorcycle || b.motorcycleId;
        return String(id) === String(currentMotoId);
      })
      .map((b) => {
        const status = String(b?.status || "").toLowerCase();
        if (["completed", "inspection", "canceled", "cancelled"].includes(status))
          return null;
        const pd = new Date(b.pickupDate);
        const rd = new Date(b.returnDate);
        if (isNaN(pd.getTime()) || isNaN(rd.getTime())) return null;
        return {
          pickupDate: pd,
          returnDate: rd,
        };
      })
      .filter(Boolean);

    const cleanup = (value) => {
      root.unmount();
      document.body.removeChild(el);
      resolve(value);
    };

    root.render(
      <ScheduleModal
        motorcycle={motorcycle}
        initialStart={initialStart}
        initialEnd={initialEnd}
        bookingRanges={bookingRanges}
        onConfirm={(value) => cleanup(value)}
        onCancel={() => cleanup(null)}
      />,
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
  loading,
}) => (
  <div
    className={`relative text-left bg-white rounded-2xl border border-slate-100 shadow-sm p-5 overflow-hidden`}
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
  </div>
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
          style={{ width: `${50 + i * 8}%` }}
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
              ${
                currentPage === item
                  ? "bg-[#b50002] text-white shadow-[#b50002]/30"
                  : "bg-white border border-slate-100 text-slate-500 hover:border-[#b50002]/20 hover:text-[#b50002]"
              }`}
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

// ── Motorcycle Card (Grid View) ───────────────────────────────────────────────
const MotorcycleCard = ({
  motorcycle: m,
  onSetAvailable,
  onReschedule,
  updating,
}) => {
  const isMaintenance = m.status === "maintenance";
  const isUpdating = updating === (m._id ?? m.id);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div className="relative w-full aspect-[16/9] bg-slate-50 overflow-hidden">
        <img
          src={m.image}
          alt={`${m.make} ${m.model}`}
          className="w-full h-full object-contain"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = "/placeholder-bike.png";
          }}
        />
        <div className="absolute top-3 right-3">
          <StatusBadge status={m.status} />
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            {m.unitId && (
              <p className="text-[10px] font-bold tracking-[0.15em] text-[#b50002] uppercase mb-0.5">
                {m.unitId}
              </p>
            )}
            <h3 className="font-black text-[#171717] text-[15px] leading-tight">
              {m.make} {m.model}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {m.year} · {m.category}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xl font-black text-[#171717]">₱{m.dailyRate}</p>
            <p className="text-[10px] text-slate-400">/day</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {[
            { icon: FaGasPump, label: m.fuelType },
            { icon: FaCog, label: `${m.engineSize}cc` },
            { icon: FaCog, label: m.transmission },
            { icon: FaShieldAlt, label: m.hasABS ? "ABS" : "No ABS" },
          ].map(({ icon: Icon, label }, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <Icon className="text-[#b50002] text-[11px] flex-shrink-0" />
              <span className="text-[11px] text-slate-500 font-medium">
                {label}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 mb-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase">
              Next maintenance
            </p>
            <p
              className={`text-[12px] font-black ${isMaintenanceOverdue(m.maintenanceScheduleStartAt, m.maintenanceScheduleEndAt) ? "text-amber-600" : "text-[#171717]"}`}
            >
              {formatMaintenanceDate(
                m.maintenanceScheduleStartAt,
                m.maintenanceScheduleEndAt,
              )}
            </p>
          </div>
          <button
            onClick={() => onReschedule(m)}
            disabled={isUpdating}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-500 font-bold text-[11px] hover:border-[#b50002]/20 hover:text-[#b50002] transition-colors disabled:opacity-60 whitespace-nowrap"
          >
            <FaCalendarAlt className="text-xs" />
            Reschedule
          </button>
        </div>

        {isMaintenance && (
          <div className="pt-3 border-t border-slate-50">
            <button
              onClick={() => onSetAvailable(m._id ?? m.id)}
              disabled={isUpdating}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-50 text-emerald-600 font-bold text-xs hover:bg-emerald-100 transition-colors disabled:opacity-60"
            >
              <FaCheckCircle className="text-xs" />
              {isUpdating ? "Updating..." : "Mark as Available"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Table View ────────────────────────────────────────────────────────────────
const MotorcycleTable = ({
  motorcycles,
  onSetAvailable,
  onReschedule,
  colSort,
  onColSort,
  updating,
}) => {
  const cols = [
    { label: "Unit", key: "unitId", sortable: true },
    { label: "Vehicle", key: "make", sortable: true },
    { label: "Year", key: "year", sortable: true },
    { label: "Engine", key: "engineSize", sortable: true },
    { label: "Rate/Day", key: "dailyRate", sortable: true },
    { label: "Next Maintenance", key: "maintenanceScheduleAt", sortable: true },
    { label: "Status", key: null, sortable: false },
    { label: "Action", key: null, sortable: false },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-50">
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
            {motorcycles.map((m) => {
              const isMaintenance = m.status === "maintenance";
              const isUpdating = updating === (m._id ?? m.id);
              return (
                <tr
                  key={m.id}
                  className="hover:bg-slate-50/60 transition-colors"
                >
                  <td className="px-5 py-3.5">
                    {m.unitId ? (
                      <span className="text-[11px] font-black text-[#b50002] tracking-wider uppercase">
                        {m.unitId}
                      </span>
                    ) : (
                      <span className="text-slate-300 text-sm">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-10 flex-shrink-0 rounded-lg overflow-hidden bg-slate-50 border border-slate-100">
                        <img
                          src={m.image}
                          alt={`${m.make} ${m.model}`}
                          className="w-full h-full object-contain"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder-bike.png";
                          }}
                        />
                      </div>
                      <div>
                        <p className="font-black text-[13px] text-[#171717] leading-tight">
                          {m.make} {m.model}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {m.category}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-slate-500">
                    {m.year || "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-[13px] text-slate-600 font-medium">
                      {m.engineSize}cc
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-black text-[13px] text-[#171717]">
                      ₱{m.dailyRate}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`text-[13px] font-semibold ${isMaintenanceOverdue(m.maintenanceScheduleStartAt, m.maintenanceScheduleEndAt) ? "text-amber-600" : "text-slate-600"}`}
                    >
                      {formatMaintenanceDate(
                        m.maintenanceScheduleStartAt,
                        m.maintenanceScheduleEndAt,
                      )}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={m.status} />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => onReschedule(m)}
                        disabled={isUpdating}
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 font-bold text-[11px] hover:border-[#b50002]/20 hover:text-[#b50002] transition-colors disabled:opacity-60 whitespace-nowrap"
                      >
                        <FaCalendarAlt className="text-xs" />
                        Reschedule
                      </button>
                      {isMaintenance && (
                        <button
                          onClick={() => onSetAvailable(m._id ?? m.id)}
                          disabled={isUpdating}
                          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 font-bold text-[11px] hover:bg-emerald-100 transition-colors disabled:opacity-60 whitespace-nowrap"
                        >
                          <FaCheckCircle className="text-xs" />
                          {isUpdating ? "Updating..." : "Mark Available"}
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

// ── Empty State ───────────────────────────────────────────────────────────────
const EmptyState = ({ onReset }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
      <FaTools className="text-slate-200 text-3xl" />
    </div>
    <h3 className="font-black text-[#171717] text-lg mb-1">No units found</h3>
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

// ── Main Component ────────────────────────────────────────────────────────────
const MaintenancePage = () => {
  const [motorcycles, setMotorcycles] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null); // id of unit being updated
  const [viewMode, setViewMode] = useState("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all"); // "all" | "available" | "maintenance"
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [colSort, setColSort] = useState({ key: null, dir: null });

  // ── Fetch Motorcycles ──────────────────────────────────────────────────────
  const fetchMotorcycles = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get("/api/motorcycles", {
        // Match ManageMotorcycle exactly so we get the same dataset
        params: { includeDeleted: "true", limit: 1000 },
      });
      const raw = Array.isArray(res.data) ? res.data : res.data.data || [];
      // Keep only non-deleted units that are available or in maintenance
      const filtered = raw.filter(
        (m) =>
          !m.isDeleted &&
          ["available", "maintenance", "rented", "pending"].includes(m.status),
      );
      setMotorcycles(
        filtered.map((m, i) => ({
          ...buildSafeMotorcycle(m, i),
          image: m.image
            ? makeImageUrl(m.image)
            : buildSafeMotorcycle(m, i).image,
          _rawImage: m.image ?? m._rawImage ?? "",
        })),
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to load motorcycles");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch Bookings ──────────────────────────────────────────────────────────
  const fetchBookings = useCallback(async () => {
    try {
      const res = await api.get("/api/motorcycle-bookings", {
        params: { limit: 1000 },
      });
      const raw = Array.isArray(res.data) ? res.data : res.data.data || [];
      setBookings(raw);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchMotorcycles();
    fetchBookings();
  }, [fetchMotorcycles, fetchBookings]);
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedStatus, selectedCategory, colSort]);

  // ── Counts ─────────────────────────────────────────────────────────────────
  const counts = useMemo(
    () => ({
      all: motorcycles.length,
      available: motorcycles.filter((m) => m.status === "available").length,
      maintenance: motorcycles.filter((m) => m.status === "maintenance").length,
      rented: motorcycles.filter((m) => m.status === "rented").length,
      pending: motorcycles.filter((m) => m.status === "pending").length,
    }),
    [motorcycles],
  );

  const categories = useMemo(
    () => [...new Set(motorcycles.map((m) => m.category).filter(Boolean))],
    [motorcycles],
  );

  // ── Sorting ────────────────────────────────────────────────────────────────
  const handleColSort = (key) =>
    setColSort((prev) => {
      if (prev.key !== key) return { key, dir: "asc" };
      const next = nextSortState(prev.dir);
      return next === null ? { key: null, dir: null } : { key, dir: next };
    });

  // ── Filtered + sorted list ─────────────────────────────────────────────────
  const filteredMotorcycles = useMemo(() => {
    let f = [...motorcycles];
    if (selectedStatus !== "all")
      f = f.filter((m) => m.status === selectedStatus);
    if (searchTerm.trim()) {
      const t = searchTerm.toLowerCase();
      f = f.filter(
        (m) =>
          `${m.make} ${m.model}`.toLowerCase().includes(t) ||
          (m.category || "").toLowerCase().includes(t) ||
          (m.unitId || "").toLowerCase().includes(t),
      );
    }
    if (selectedCategory !== "all")
      f = f.filter((m) => m.category === selectedCategory);
    if (colSort.key && colSort.dir) {
      f.sort((a, b) => {
        let av = a[colSort.key],
          bv = b[colSort.key];
        if (typeof av === "boolean") {
          av = av ? 1 : 0;
          bv = bv ? 1 : 0;
        }
        if (typeof av === "number" || (!isNaN(Number(av)) && av !== ""))
          return colSort.dir === "asc"
            ? Number(av) - Number(bv)
            : Number(bv) - Number(av);
        const c = String(av ?? "").localeCompare(String(bv ?? ""));
        return colSort.dir === "asc" ? c : -c;
      });
    } else {
      f.sort((a, b) =>
        `${a.make} ${a.model}`
          .trim()
          .localeCompare(`${b.make} ${b.model}`.trim()),
      );
    }
    return f;
  }, [motorcycles, searchTerm, selectedStatus, selectedCategory, colSort]);

  const totalPages = Math.ceil(filteredMotorcycles.length / ITEMS_PER_PAGE);
  const paginated = filteredMotorcycles.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const hasActiveFilters =
    searchTerm || selectedCategory !== "all" || colSort.key;
  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setColSort({ key: null, dir: null });
    setCurrentPage(1);
  };

  // ── Status update helpers ──────────────────────────────────────────────────
  const updateStatus = async (id, newStatus) => {
    const m = motorcycles.find((x) => x._id === id || x.id === id);
    if (!m?._id) return toast.error("Motorcycle not found");

    const toMaintenance = newStatus === "maintenance";
    const confirmed = await confirmModal(
      toMaintenance ? "Set to Maintenance?" : "Mark as Available?",
      toMaintenance
        ? `${m.make} ${m.model} will be flagged as under maintenance and removed from rental availability.`
        : `${m.make} ${m.model} will be marked as available and returned to the rental fleet.`,
      toMaintenance ? "Set Maintenance" : "Mark Available",
      toMaintenance ? "amber" : "emerald",
    );
    if (!confirmed) return;

    const targetId = m._id ?? m.id;
    setUpdating(targetId);

    // Optimistic update: flip status in local state immediately so the
    // unit moves to the correct tab without waiting for the server round-trip.
    setMotorcycles((prev) =>
      prev.map((x) =>
        (x._id ?? x.id) === targetId ? { ...x, status: newStatus } : x,
      ),
    );

    try {
      const fd = new FormData();
      Object.entries({
        unitId: m.unitId || "",
        traccarDeviceId: m.traccarDeviceId || "",
        make: m.make,
        model: m.model,
        year: Number(m.year || 0),
        description: m.description || "",
        category: m.category || "Scooter",
        transmission: m.transmission || "Manual",
        fuelType: m.fuelType,
        engineSize: Number(m.engineSize || 150),
        dailyRate: Number(m.dailyRate || 0),
        hasABS: m.hasABS || false,
        hasHelmet: m.hasHelmet !== false,
        status: newStatus,
      }).forEach(([k, v]) => fd.append(k, v));

      await api.put(`/api/motorcycles/${m._id}`, fd);
      toast.success(
        toMaintenance
          ? `${m.make} ${m.model} set to maintenance`
          : `${m.make} ${m.model} marked as available`,
      );
      // Silent background refetch to sync with server truth (no loading flash)
      fetchMotorcycles(true);
    } catch (err) {
      // Rollback optimistic update if the API call failed
      setMotorcycles((prev) =>
        prev.map((x) =>
          (x._id ?? x.id) === targetId ? { ...x, status: m.status } : x,
        ),
      );
      toast.error(err.response?.data?.message || "Failed to update status");
    } finally {
      setUpdating(null);
    }
  };

  const handleSetAvailable = (id) => updateStatus(id, "available");

  const updateMaintenanceDate = async (motorcycle) => {
    const selected = await scheduleModal(motorcycle, bookings);
    if (!selected) return;

    const start = selected.start;
    const end = selected.end || selected.start;

    // Determine if the start date is today (or in the past)
    const todayStr = toDateInputValue(new Date());
    const isToday = start <= todayStr;
    const newStatus = isToday ? "maintenance" : motorcycle.status;

    const targetId = motorcycle._id ?? motorcycle.id;
    setUpdating(targetId);

    // Optimistic update if status is changing to maintenance
    if (isToday && motorcycle.status !== "maintenance") {
      setMotorcycles((prev) =>
        prev.map((x) =>
          (x._id ?? x.id) === targetId ? { ...x, status: "maintenance" } : x,
        ),
      );
    }

    try {
      const fd = buildMotorcycleFormData(motorcycle, {
        maintenanceScheduleAt: start,
        maintenanceScheduleStartAt: start,
        maintenanceScheduleEndAt: end,
        status: newStatus,
      });
      await api.put(`/api/motorcycles/${motorcycle._id}`, fd);
      
      toast.success(
        isToday
          ? `${motorcycle.make} ${motorcycle.model} maintenance rescheduled and set to In Maintenance`
          : `${motorcycle.make} ${motorcycle.model} maintenance rescheduled`,
      );
      fetchMotorcycles(true);
    } catch (err) {
      // Revert optimistic update
      if (isToday && motorcycle.status !== "maintenance") {
        setMotorcycles((prev) =>
          prev.map((x) =>
            (x._id ?? x.id) === targetId
              ? { ...x, status: motorcycle.status }
              : x,
          ),
        );
      }
      toast.error(
        err.response?.data?.message || "Failed to reschedule maintenance",
      );
    } finally {
      setUpdating(null);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <style>{`
        @keyframes calFadeIn { 
          from { opacity:0; transform:translateY(6px) scale(0.97); } 
          to { opacity:1; transform:translateY(0) scale(1); } 
        }
      `}</style>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pt-36">
        {/* Header */}
        <div className="mb-7">
          <h1 className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight">
            Maintenance Management
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Set units to maintenance mode or return them to the active fleet.
          </p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
          <StatCard
            label="Total Units"
            value={counts.all}
            sub=""
            subColor="text-slate-400"
            icon={ClipboardList}
            accent="bg-slate-400"
            loading={loading}
          />
        </div>

        {/* Status Tab Filter */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {[
            { key: "all", label: "All Units", count: counts.all },
            { key: "available", label: "Available", count: counts.available },
            { key: "rented", label: "Rented", count: counts.rented },
            { key: "pending", label: "Pending", count: counts.pending },
            {
              key: "maintenance",
              label: "In Maintenance",
              count: counts.maintenance,
            },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setSelectedStatus(tab.key);
                setCurrentPage(1);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all border
                ${
                  selectedStatus === tab.key
                    ? "bg-[#b50002] border-[#b50002] text-white shadow-md shadow-[#b50002]/20"
                    : "bg-white border-slate-100 text-slate-500 hover:border-[#b50002]/20 hover:text-[#b50002]"
                }`}
            >
              {tab.label}
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-black
                ${selectedStatus === tab.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400"}`}
              >
                {loading ? "—" : tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search + Toolbar */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 text-sm" />
              <input
                type="text"
                placeholder="Search make, model, unit ID..."
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
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border font-bold text-xs transition-all
                  ${
                    showFilters
                      ? "bg-[#b50002] border-[#b50002] text-white shadow-md shadow-[#b50002]/30"
                      : "border-slate-200 text-slate-500 hover:border-[#b50002]/20 hover:text-[#b50002]"
                  }`}
              >
                <FaFilter className="text-[10px]" /> Filters
                {hasActiveFilters && (
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                )}
              </button>
              <button
                onClick={() =>
                  setViewMode(viewMode === "list" ? "detailed" : "list")
                }
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 text-slate-500 font-bold text-xs hover:border-[#b50002]/20 hover:text-[#b50002] transition-all"
              >
                {viewMode === "list" ? (
                  <>
                    <FaThLarge className="text-[10px]" /> Grid
                  </>
                ) : (
                  <>
                    <FaList className="text-[10px]" /> List
                  </>
                )}
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-slate-50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-[#171717] focus:outline-none focus:border-[#b50002]/30"
                >
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              {hasActiveFilters && (
                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-50 text-[#b50002] font-bold text-xs hover:bg-red-100 transition-colors"
                  >
                    <FaTimes /> Clear All
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Result count */}
        <div className="flex items-center justify-between px-1 mb-3">
          <p className="text-[11px] text-slate-400 font-semibold">
            Showing{" "}
            {filteredMotorcycles.length === 0
              ? 0
              : Math.min(
                  (currentPage - 1) * ITEMS_PER_PAGE + 1,
                  filteredMotorcycles.length,
                )}
            –
            {Math.min(currentPage * ITEMS_PER_PAGE, filteredMotorcycles.length)}{" "}
            of{" "}
            <span className="text-[#171717] font-black">
              {filteredMotorcycles.length}
            </span>{" "}
            units
          </p>
        </div>

        {/* Content */}
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
          <EmptyState onReset={clearFilters} />
        ) : viewMode === "detailed" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginated.map((m) => (
              <MotorcycleCard
                key={m.id}
                motorcycle={m}
                onSetAvailable={handleSetAvailable}
                onReschedule={updateMaintenanceDate}
                updating={updating}
              />
            ))}
          </div>
        ) : (
          <MotorcycleTable
            motorcycles={paginated}
            onSetAvailable={handleSetAvailable}
            onReschedule={updateMaintenanceDate}
            colSort={colSort}
            onColSort={handleColSort}
            updating={updating}
          />
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
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

export default MaintenancePage;