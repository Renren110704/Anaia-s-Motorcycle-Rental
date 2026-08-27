import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  FaChevronLeft,
  FaChevronRight,
  FaClock,
  FaMapMarkerAlt,
  FaMotorcycle,
} from "react-icons/fa";
import {
  Wrench,
  AlertTriangle,
  Info,
  CalendarDays,
  ArrowRight,
} from "lucide-react";
import API_BASE_URL from "../apiBase";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { Accept: "application/json" },
});

const BOOKINGS_ENDPOINT = "/api/motorcycle-bookings";
const MAINTENANCE_STORAGE_KEY = "moto_maintenance_schedules";

// ─── Date Helpers ─────────────────────────────────────────────────────────────
const formatLongDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const formatShortDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const toDateKey = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

const addMonths = (date, amount) =>
  new Date(date.getFullYear(), date.getMonth() + amount, 1);

const getMonthGrid = (monthDate) => {
  const firstDay = startOfMonth(monthDate);
  const firstWeekday = firstDay.getDay();
  const gridStart = new Date(firstDay);
  gridStart.setDate(gridStart.getDate() - firstWeekday);
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
};

const buildMotorcycleLabel = (booking) => {
  const motorcycle = booking?.motorcycle || {};
  const make = motorcycle.make || motorcycle.name || "Motorcycle";
  const model = motorcycle.model ? ` ${motorcycle.model}` : "";
  return `${make}${model}`.trim();
};

const resolveMotorcycleImage = (booking) => {
  const rawImage =
    booking?.motorcycleImage ||
    booking?.motorcycle?.image ||
    booking?.image ||
    "";
  if (!rawImage) return "";
  if (Array.isArray(rawImage))
    return resolveMotorcycleImage({ motorcycleImage: rawImage[0] });
  const image = String(rawImage).trim();
  if (!image) return "";
  if (/^data:image\//i.test(image)) return image;
  if (/^https?:\/\//i.test(image)) return image;
  if (image.startsWith("/uploads/")) return `${API_BASE_URL}${image}`;
  if (image.startsWith("uploads/")) return `${API_BASE_URL}/${image}`;
  return `${API_BASE_URL}/uploads/${image.replace(/^\/+/, "")}`;
};

const loadMaintenanceSchedules = () => {
  try {
    return JSON.parse(localStorage.getItem(MAINTENANCE_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};

// ─── Legend Pill ──────────────────────────────────────────────────────────────
const LegendPill = ({ color, label }) => (
  <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${color}`} />
    {label}
  </div>
);

// ─── Alert Banners ────────────────────────────────────────────────────────────
const MaintenanceAlertBanner = ({ maintenanceItems, selectedDate }) => {
  if (!maintenanceItems.length) return null;
  const count = maintenanceItems.length;
  const names = maintenanceItems
    .map((s) =>
      s.motorcycle ? `${s.motorcycle.make} ${s.motorcycle.model}` : "a vehicle",
    )
    .join(", ");
  return (
    <div className="relative bg-white rounded-2xl border border-violet-100 shadow-sm p-4 overflow-hidden">
      <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-10 blur-xl bg-violet-500" />
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-violet-50 flex-shrink-0">
          <Wrench className="w-4 h-4 text-violet-600" />
        </div>
        <div>
          <p className="text-[13px] font-black text-violet-700">
            {count === 1
              ? "1 unit under maintenance"
              : `${count} units under maintenance`}
          </p>
          <p className="text-[11px] text-violet-700 mt-0.5 leading-relaxed">
            <strong>{names}</strong> {count === 1 ? "is" : "are"} unavailable
            for rental on {formatLongDate(selectedDate)}.
          </p>
        </div>
      </div>
    </div>
  );
};

const BufferDayAlertBanner = ({ bufferedItems }) => {
  if (!bufferedItems.length) return null;
  const count = bufferedItems.length;
  const names = bufferedItems
    .map((s) =>
      s.motorcycle ? `${s.motorcycle.make} ${s.motorcycle.model}` : "a vehicle",
    )
    .join(", ");
  return (
    <div className="relative bg-white rounded-2xl border border-amber-100 shadow-sm p-4 overflow-hidden">
      <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-10 blur-xl bg-amber-500" />
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-50 flex-shrink-0">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
        </div>
        <div>
          <p className="text-[13px] font-black text-amber-700">
            Last return date for {count === 1 ? "1 unit" : `${count} units`}
          </p>
          <p className="text-[11px] text-amber-600 mt-0.5 leading-relaxed">
            <strong>{names}</strong> {count === 1 ? "has" : "have"} maintenance
            starting <strong>tomorrow</strong>. No new bookings ending after
            today.
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── Motorcycle Image with Fallback ───────────────────────────────────────────
const MotoImage = ({ src, alt, className }) => {
  const [errored, setErrored] = useState(false);
  if (!src || errored) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-50 text-slate-500 ${className}`}
      >
        <FaMotorcycle className="text-2xl" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className={`object-contain ${className}`}
      onError={() => setErrored(true)}
    />
  );
};

// ─── Booking Card ─────────────────────────────────────────────────────────────
const BookingCard = ({ booking, selectedKey }) => {
  const isReturnDay = toDateKey(booking.returnDate) === selectedKey;
  const motorcycleImage = resolveMotorcycleImage(booking);
  const label = buildMotorcycleLabel(booking);
  const unitId = booking?.motorcycle?.unitId || booking?.unitId || "";

  return (
    <div className="relative bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div
        className={`h-1 w-full ${isReturnDay ? "bg-[#b50002]" : "bg-emerald-500"}`}
      />

      {/* Motorcycle image banner */}
      <div className="relative h-28 bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden">
        <MotoImage
          src={motorcycleImage}
          alt={label}
          className="w-full h-full p-3"
        />
        {/* Return badge overlay */}
        <div className="absolute top-2.5 right-2.5">
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-black border ${
              isReturnDay
                ? "bg-[#b50002] text-white border-[#b50002]"
                : "bg-emerald-50 text-emerald-600 border-emerald-200"
            }`}
          >
            {isReturnDay ? "Returns today" : "On Rent"}
          </span>
        </div>
      </div>

      <div className="p-4">
        {/* Unit ID + name */}
        <div className="mb-3">
          {unitId && (
            <p className="text-[10px] font-black tracking-[0.15em] text-[#b50002] uppercase leading-tight">
              {unitId}
            </p>
          )}
          <h3 className="font-black text-[14px] text-[#171717] leading-tight mt-0.5">
            {label}
          </h3>
          {booking.customerName || booking.renterName ? (
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
              {booking.customerName || booking.renterName}
            </p>
          ) : null}
        </div>

        {/* Date row */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-50 rounded-xl p-2.5">
            <div className="flex items-center gap-1.5 text-[10px] font-black tracking-[0.12em] text-slate-500 uppercase mb-1">
              <FaMapMarkerAlt className="w-2.5 h-2.5" />
              Pick-up
            </div>
            <p className="text-[12px] font-bold text-[#171717]">
              {formatShortDate(booking.pickupDate)}
            </p>
          </div>
          <div className="bg-slate-50 rounded-xl p-2.5">
            <div className="flex items-center gap-1.5 text-[10px] font-black tracking-[0.12em] text-slate-500 uppercase mb-1">
              <FaClock className="w-2.5 h-2.5" />
              Return
            </div>
            <p className="text-[12px] font-bold text-[#171717]">
              {formatShortDate(booking.returnDate)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Maintenance Card ─────────────────────────────────────────────────────────
const MaintenanceCard = ({ s }) => (
  <div className="relative bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
    <div className="h-1 w-full bg-violet-500" />

    {/* Motorcycle image banner */}
    <div className="relative h-28 bg-gradient-to-br from-violet-50 to-violet-100 overflow-hidden">
      {s.motorcycle?.image ? (
        <MotoImage
          src={resolveMotorcycleImage({ motorcycle: s.motorcycle })}
          alt={`${s.motorcycle.make} ${s.motorcycle.model}`}
          className="w-full h-full p-3"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Wrench className="w-10 h-10 text-violet-300" />
        </div>
      )}
      <div className="absolute top-2.5 right-2.5">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-violet-700 text-white">
          <Wrench className="w-3 h-3" />
          Maintenance
        </span>
      </div>
      {s.auto && (
        <div className="absolute bottom-2.5 left-2.5">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/80 text-slate-500 border border-slate-200">
            6-month schedule
          </span>
        </div>
      )}
    </div>

    <div className="p-4">
      <h3 className="font-black text-[14px] text-[#171717] leading-tight">
        {s.motorcycle
          ? `${s.motorcycle.make} ${s.motorcycle.model}`
          : "Unknown vehicle"}
      </h3>
      {s.notes && (
        <p className="text-[11px] text-slate-500 mt-0.5">{s.notes}</p>
      )}

      <div className="mt-2 flex items-center gap-1.5 rounded-xl bg-violet-50 px-2.5 py-1.5">
        <Info className="w-3.5 h-3.5 text-violet-700 flex-shrink-0" />
        <p className="text-[11px] text-violet-600 font-semibold">
          Not available for rental during this period.
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="bg-slate-50 rounded-xl p-2.5">
          <div className="text-[10px] font-black tracking-[0.12em] text-slate-500 uppercase mb-1">
            Start
          </div>
          <p className="text-[12px] font-bold text-[#171717]">
            {formatShortDate(s.startDate)}
          </p>
        </div>
        <div className="bg-slate-50 rounded-xl p-2.5">
          <div className="text-[10px] font-black tracking-[0.12em] text-slate-500 uppercase mb-1">
            End
          </div>
          <p className="text-[12px] font-bold text-[#171717]">
            {formatShortDate(s.endDate)}
          </p>
        </div>
      </div>
    </div>
  </div>
);

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-pulse">
    <div className="h-1 bg-slate-200" />
    <div className="h-28 bg-slate-100" />
    <div className="p-4 space-y-2">
      <div className="h-3 bg-slate-100 rounded-lg w-1/3" />
      <div className="h-4 bg-slate-100 rounded-lg w-2/3" />
      <div className="h-3 bg-slate-100 rounded-lg w-1/2" />
      <div className="grid grid-cols-2 gap-2 mt-2">
        <div className="h-12 bg-slate-50 rounded-xl" />
        <div className="h-12 bg-slate-50 rounded-xl" />
      </div>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const CalendarView = () => {
  const [bookings, setBookings] = useState([]);
  const [maintenanceSchedules, setMaintenanceSchedules] = useState([]);
  const [motorcycles, setMotorcycles] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [bookingsRes, motoRes] = await Promise.allSettled([
          api.get(BOOKINGS_ENDPOINT, {
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
          const data = Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.data)
              ? payload.data
              : [];
          setBookings(data);
        }
        if (motoRes.status === "fulfilled") {
          const payload = motoRes.value.data;
          const data = Array.isArray(payload)
            ? payload
            : payload?.data || payload?.motorcycles || [];
          setMotorcycles(data);
          const now = new Date();
          const autoScheduled = data
            .map((m) => {
              const rawStart =
                m.maintenanceScheduleStartAt || m.maintenanceScheduleAt || null;
              const rawEnd =
                m.maintenanceScheduleEndAt || m.maintenanceScheduleAt || null;
              if (!rawStart || !rawEnd) return null;
              const start = new Date(rawStart);
              const end = new Date(rawEnd);
              if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
              if (end < now) return null;
              start.setHours(0, 0, 0, 0);
              end.setHours(0, 0, 0, 0);
              // if (m.status === "maintenance") return null;
              return {
                id: `auto-${m._id}`,
                motorcycleId: m._id,
                motorcycle: m,
                startDate: start,
                endDate: end,
                auto: true,
                cancelled: false,
                completed: false,
                notes: "Automatic 6-month maintenance",
              };
            })
            .filter(Boolean);
          setMaintenanceSchedules([
            ...autoScheduled,
            ...loadMaintenanceSchedules(),
          ]);
        }
      } catch (fetchError) {
        if (fetchError?.name !== "CanceledError")
          setError("Unable to load the booking calendar right now.");
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const handler = () => setMaintenanceSchedules(loadMaintenanceSchedules());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const bookingRanges = useMemo(
    () =>
      bookings
        .map((booking) => {
          const status = String(booking?.status || "").toLowerCase();
          if (
            ["completed", "inspection", "canceled", "cancelled"].includes(
              status,
            )
          )
            return null;
          const pickupDate = new Date(booking.pickupDate);
          const returnDate = new Date(booking.returnDate);
          if (isNaN(pickupDate.getTime()) || isNaN(returnDate.getTime()))
            return null;
          return {
            ...booking,
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
        .filter(Boolean),
    [bookings],
  );

  const maintenanceRanges = useMemo(() => {
    return maintenanceSchedules
      .filter((s) => !s.cancelled && !s.completed)
      .map((s) => {
        const moto = s.auto
          ? s.motorcycle
          : motorcycles.find((m) => m._id === s.motorcycleId);
        const start = new Date(s.startDate);
        const end = new Date(s.endDate);
        if (isNaN(start) || isNaN(end)) return null;
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        return { ...s, startDate: start, endDate: end, motorcycle: moto };
      })
      .filter(Boolean);
  }, [maintenanceSchedules, motorcycles]);

  const monthGrid = useMemo(() => getMonthGrid(selectedMonth), [selectedMonth]);
  const selectedKey = toDateKey(selectedDate);

  const bookingsForDay = (date) => {
    const dk = toDateKey(date);
    return bookingRanges.filter(
      (b) => dk >= toDateKey(b.pickupDate) && dk <= toDateKey(b.returnDate),
    );
  };
  const maintenanceForDay = (date) => {
    const dk = toDateKey(date);
    return maintenanceRanges.filter(
      (s) => dk >= toDateKey(s.startDate) && dk <= toDateKey(s.endDate),
    );
  };
  const isBlockedDueToMaintenance = (date) => {
    const dk = toDateKey(date);
    return maintenanceRanges.some(
      (s) => dk === toDateKey(addDays(s.startDate, -1)),
    );
  };

  const dayBookings = useMemo(
    () =>
      bookingRanges.filter(
        (b) =>
          selectedKey >= toDateKey(b.pickupDate) &&
          selectedKey <= toDateKey(b.returnDate),
      ),
    [bookingRanges, selectedKey],
  );
  const dayMaintenance = useMemo(
    () =>
      maintenanceRanges.filter(
        (s) =>
          selectedKey >= toDateKey(s.startDate) &&
          selectedKey <= toDateKey(s.endDate),
      ),
    [maintenanceRanges, selectedKey],
  );
  const dayBufferItems = useMemo(
    () =>
      maintenanceRanges.filter(
        (s) => selectedKey === toDateKey(addDays(s.startDate, -1)),
      ),
    [maintenanceRanges, selectedKey],
  );

  const currentMonthLabel = selectedMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const today = toDateKey(new Date());

  return (
    <main className="min-h-screen bg-[#f7f8fa]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header — same pattern as Dashboard */}
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight">
              Fleet Calendar
            </h1>
            <p className="text-slate-700 text-sm mt-1">
              Bookings and maintenance windows across your fleet.
            </p>
          </div>
          <Link
            to="/maintenance"
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-[#b50002] text-white text-sm font-bold shadow-md shadow-[#b50002]/30 hover:brightness-110 transition-all"
          >
            <Wrench className="w-4 h-4" />
            Maintenance
          </Link>
        </div>

        {/* Main grid: calendar left, panel right */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* ── Calendar Card (2/3 width) ── */}
          <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Month nav */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => setSelectedMonth((v) => addMonths(v, -1))}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-100 text-slate-500 hover:border-[#b50002] hover:text-[#b50002] transition-all"
              >
                <FaChevronLeft className="w-3 h-3" />
              </button>
              <div className="text-center">
                <p className="text-[10px] font-black tracking-[0.15em] text-slate-500 uppercase">
                  Month
                </p>
                <h2 className="font-black text-[#171717] text-[15px] mt-0.5">
                  {currentMonthLabel}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => setSelectedMonth((v) => addMonths(v, 1))}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-100 text-slate-500 hover:border-[#b50002] hover:text-[#b50002] transition-all"
              >
                <FaChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="px-4 sm:px-5 pt-4 pb-5">
              {/* Weekday headers */}
              <div className="grid grid-cols-7 mb-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div
                    key={d}
                    className="text-center text-[10px] font-black tracking-[0.15em] text-slate-600 uppercase py-2"
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Date grid */}
              <div className="grid grid-cols-7 gap-1">
                {monthGrid.map((date) => {
                  const inMonth = date.getMonth() === selectedMonth.getMonth();
                  const dateKey = toDateKey(date);
                  const bookingMatches = bookingsForDay(date);
                  const maintenanceMatches = maintenanceForDay(date);
                  const blocked = isBlockedDueToMaintenance(date);
                  const isSelected = dateKey === selectedKey;
                  const isToday = dateKey === today;
                  const hasBookings = bookingMatches.length > 0;
                  const hasMaintenance = maintenanceMatches.length > 0;
                  const returnsToday = bookingMatches.some(
                    (b) => toDateKey(b.returnDate) === dateKey,
                  );

                  let cellBg = "";
                  if (isSelected) {
                    cellBg =
                      "bg-[#b50002] border-[#b50002] text-white shadow-lg shadow-[#b50002]/20";
                  } else if (hasMaintenance) {
                    cellBg =
                      "bg-violet-50 border-violet-100 hover:border-violet-300";
                  } else if (blocked) {
                    cellBg =
                      "bg-amber-50 border-amber-100 hover:border-amber-300";
                  } else if (hasBookings) {
                    cellBg =
                      "bg-rose-50 border-rose-100 hover:border-[#b50002]/30";
                  } else if (inMonth) {
                    cellBg = "bg-white border-slate-100 hover:border-slate-200";
                  } else {
                    cellBg = "bg-transparent border-transparent";
                  }

                  return (
                    <button
                      key={dateKey}
                      type="button"
                      onClick={() => {
                        setSelectedDate(date);
                        setSelectedMonth(
                          new Date(date.getFullYear(), date.getMonth(), 1),
                        );
                      }}
                      className={`relative min-h-[56px] sm:min-h-[64px] rounded-xl border text-left p-1.5 transition-all duration-200 ${cellBg} ${!inMonth ? "bg-slate-50 text-slate-500 cursor-default pointer-events-none" : ""}`}
                    >
                      <div className="flex items-start justify-between">
                        <span
                          className={`text-[11px] font-black leading-none ${isSelected ? "text-white" : isToday ? "text-[#b50002]" : inMonth ? "text-[#171717]" : "text-slate-600"}`}
                        >
                          {date.getDate()}
                          {isToday && !isSelected && (
                            <span className="ml-0.5 w-1 h-1 rounded-full bg-[#b50002] inline-block align-middle" />
                          )}
                        </span>
                        <div className="flex gap-0.5 flex-wrap justify-end">
                          {returnsToday && (
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : "bg-[#b50002]"}`}
                            />
                          )}
                          {hasMaintenance && !isSelected && (
                            <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                          )}
                          {blocked && !hasMaintenance && !isSelected && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          )}
                        </div>
                      </div>

                      {/* Mini booking pills */}
                      <div className="mt-1 flex flex-col gap-0.5">
                        {bookingMatches.slice(0, 2).map((booking) => {
                          const thumb = resolveMotorcycleImage(booking);
                          return (
                            <span
                              key={booking._id}
                              className={`inline-flex items-center gap-0.5 rounded-full px-1 py-0.5 text-[8px] font-bold leading-none ${
                                isSelected
                                  ? "bg-white/20 text-white"
                                  : "bg-white text-[#b50002] border border-rose-100"
                              }`}
                            >
                              {thumb ? (
                                <img
                                  src={thumb}
                                  alt=""
                                  className="w-3 h-3 rounded object-cover"
                                  onError={(e) =>
                                    (e.currentTarget.style.display = "none")
                                  }
                                />
                              ) : (
                                <FaMotorcycle className="w-2.5 h-2.5" />
                              )}
                            </span>
                          );
                        })}
                        {bookingMatches.length > 2 && (
                          <span
                            className={`text-[8px] font-black leading-none px-1 ${isSelected ? "text-white/70" : "text-slate-500"}`}
                          >
                            +{bookingMatches.length - 2}
                          </span>
                        )}
                        {maintenanceMatches.slice(0, 1).map((s) => (
                          <span
                            key={s.id}
                            className={`inline-flex items-center rounded-full px-1 py-0.5 text-[8px] font-bold leading-none ${
                              isSelected
                                ? "bg-white/20 text-white"
                                : "bg-violet-100 text-violet-700"
                            }`}
                          >
                            <Wrench className="w-2.5 h-2.5" />
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 pt-4 border-t border-slate-50">
                <LegendPill color="bg-[#b50002]" label="Returns today" />
                <LegendPill color="bg-rose-200" label="Booked" />
                <LegendPill color="bg-violet-500" label="Maintenance" />
                <LegendPill color="bg-amber-400" label="Buffer day" />
              </div>
            </div>
          </div>

          {/* ── Right Panel ── */}
          <div className="flex flex-col gap-4">
            {/* Selected date header card */}
            <div className="relative bg-white rounded-2xl border border-slate-100 shadow-sm p-5 overflow-hidden">
              <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-10 blur-xl bg-[#b50002]" />
              <div className="flex items-start justify-between mb-1">
                <p className="text-[10px] font-black tracking-[0.15em] text-slate-500 uppercase">
                  Selected Day
                </p>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-rose-50">
                  <CalendarDays className="w-4 h-4 text-[#b50002]" />
                </div>
              </div>
              <p className="text-[1.3rem] font-black text-[#171717] leading-tight">
                {formatLongDate(selectedDate)}
              </p>
              <div className="flex gap-2 flex-wrap mt-3">
                {dayBookings.length > 0 && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-50 text-[#b50002] border border-rose-100">
                    {dayBookings.length} rental
                    {dayBookings.length !== 1 ? "s" : ""}
                  </span>
                )}
                {dayMaintenance.length > 0 && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-black bg-violet-50 text-violet-600 border border-violet-100">
                    {dayMaintenance.length} maintenance
                  </span>
                )}
                {dayBufferItems.length > 0 && !dayMaintenance.length && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-50 text-amber-600 border border-amber-100">
                    Buffer day
                  </span>
                )}
                {dayBookings.length === 0 &&
                  dayMaintenance.length === 0 &&
                  dayBufferItems.length === 0 && (
                    <span className="text-[11px] text-slate-500 font-semibold">
                      All clear
                    </span>
                  )}
              </div>
            </div>

            {/* Alerts */}
            {!loading && !error && (
              <>
                <MaintenanceAlertBanner
                  maintenanceItems={dayMaintenance}
                  selectedDate={selectedDate}
                />
                <BufferDayAlertBanner bufferedItems={dayBufferItems} />
              </>
            )}

            {/* Cards list */}
            {loading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : error ? (
              <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-5">
                <p className="text-sm text-[#b50002] font-semibold">{error}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-h-[560px] overflow-y-auto pr-0.5">
                {dayMaintenance.map((s) => (
                  <MaintenanceCard key={s.id} s={s} />
                ))}
                {dayBookings.map((booking) => (
                  <BookingCard
                    key={booking._id}
                    booking={booking}
                    selectedKey={selectedKey}
                  />
                ))}
                {dayBookings.length === 0 &&
                  dayMaintenance.length === 0 &&
                  dayBufferItems.length === 0 && (
                    <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                      <FaMotorcycle className="w-6 h-6 text-slate-200 mx-auto mb-2" />
                      <p className="text-sm text-slate-500 font-medium">
                        No bookings or maintenance on this date.
                      </p>
                    </div>
                  )}
                {dayBookings.length === 0 &&
                  dayMaintenance.length === 0 &&
                  dayBufferItems.length > 0 && (
                    <div className="bg-white rounded-2xl border border-dashed border-amber-200 p-8 text-center">
                      <AlertTriangle className="w-6 h-6 text-amber-300 mx-auto mb-2" />
                      <p className="text-sm text-amber-500 font-medium">
                        No rentals today, but maintenance starts tomorrow.
                      </p>
                    </div>
                  )}
              </div>
            )}

            {/* Buffer rule info card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="text-[10px] font-black tracking-[0.15em] text-slate-500 uppercase mb-2">
                Booking Buffer Rule
              </p>
              <p className="text-[12px] text-slate-500 leading-relaxed">
                Rentals must be returned at least{" "}
                <strong className="text-[#171717]">1 day before</strong> a
                scheduled maintenance window.
              </p>
              <Link
                to="/maintenance"
                className="mt-3 flex items-center gap-2 text-[12px] font-bold text-[#b50002] hover:gap-3 transition-all"
              >
                Manage Maintenance <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default CalendarView;
