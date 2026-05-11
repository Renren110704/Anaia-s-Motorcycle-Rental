import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  FaCalendarAlt,
  FaChevronLeft,
  FaChevronRight,
  FaClock,
  FaMapMarkerAlt,
  FaMotorcycle,
} from "react-icons/fa";
import { Wrench, AlertTriangle, Info } from "lucide-react";
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

// ─── Load maintenance schedules from localStorage ─────────────────────────────
const loadMaintenanceSchedules = () => {
  try {
    return JSON.parse(localStorage.getItem(MAINTENANCE_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};

// ─── Maintenance Alert Banner ─────────────────────────────────────────────────
// Shown to users when selected day has active maintenance schedules
const MaintenanceAlertBanner = ({ maintenanceItems, selectedDate }) => {
  if (!maintenanceItems.length) return null;

  const count = maintenanceItems.length;
  const names = maintenanceItems
    .map((s) =>
      s.motorcycle ? `${s.motorcycle.make} ${s.motorcycle.model}` : "a vehicle",
    )
    .join(", ");

  return (
    <div className="rounded-2xl border border-[#7c3aed]/30 bg-[#f5f3ff] p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-[#7c3aed]/15 flex items-center justify-center shrink-0 mt-0.5">
          <Wrench className="w-4 h-4 text-[#7c3aed]" />
        </div>
        <div>
          <p className="text-sm font-black text-[#7c3aed]">
            {count === 1
              ? "1 motorcycle under maintenance"
              : `${count} motorcycles under maintenance`}
          </p>
          <p className="text-xs text-[#7c3aed]/80 mt-0.5 leading-relaxed">
            <strong>{names}</strong> {count === 1 ? "is" : "are"} currently
            under scheduled maintenance on {formatLongDate(selectedDate)} and{" "}
            {count === 1 ? "is" : "are"} <strong>unavailable for rental</strong>
            .
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── Buffer Day Alert Banner ──────────────────────────────────────────────────
// Shown when selected day is a buffer day (1 day before maintenance)
const BufferDayAlertBanner = ({ bufferedItems, selectedDate }) => {
  if (!bufferedItems.length) return null;

  const count = bufferedItems.length;
  const names = bufferedItems
    .map((s) =>
      s.motorcycle ? `${s.motorcycle.make} ${s.motorcycle.model}` : "a vehicle",
    )
    .join(", ");

  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-amber-200/60 flex items-center justify-center shrink-0 mt-0.5">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
        </div>
        <div>
          <p className="text-sm font-black text-amber-700">
            Last return date for{" "}
            {count === 1 ? "1 motorcycle" : `${count} motorcycles`}
          </p>
          <p className="text-xs text-amber-600/90 mt-0.5 leading-relaxed">
            <strong>{names}</strong> {count === 1 ? "has" : "have"} maintenance
            starting <strong>tomorrow</strong>. This is the last accepted return
            date — no new bookings ending after today will be accepted for{" "}
            {count === 1 ? "this motorcycle" : "these motorcycles"}.
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────
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

          // Extract scheduled maintenance from motorcycles' maintenance schedule (start/end or legacy single-date)
          const now = new Date();
          const autoScheduledMaintenance = data
            .map((m) => {
              const rawStart = m.maintenanceScheduleStartAt || m.maintenanceScheduleAt || null;
              const rawEnd = m.maintenanceScheduleEndAt || m.maintenanceScheduleAt || null;
              if (!rawStart || !rawEnd) return null;
              const start = new Date(rawStart);
              const end = new Date(rawEnd);
              if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
              // Only include future or ongoing schedules (not already ended)
              if (end < now) return null;
              start.setHours(0, 0, 0, 0);
              end.setHours(0, 0, 0, 0);
              if (m.status === "maintenance") return null;
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

          // Merge with localStorage schedules
          const storedSchedules = loadMaintenanceSchedules();
          setMaintenanceSchedules([...autoScheduledMaintenance, ...storedSchedules]);
        }
      } catch (fetchError) {
        if (fetchError?.name !== "CanceledError") {
          setError("Unable to load the booking calendar right now.");
        }
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, []);

  // Listen to storage changes (when maintenance page updates)
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
            status === "completed" ||
            status === "inspection" ||
            status === "canceled" ||
            status === "cancelled"
          )
            return null;
          const pickupDate = new Date(booking.pickupDate);
          const returnDate = new Date(booking.returnDate);
          if (
            Number.isNaN(pickupDate.getTime()) ||
            Number.isNaN(returnDate.getTime())
          )
            return null;
          const start = new Date(
            pickupDate.getFullYear(),
            pickupDate.getMonth(),
            pickupDate.getDate(),
          );
          const end = new Date(
            returnDate.getFullYear(),
            returnDate.getMonth(),
            returnDate.getDate(),
          );
          return { ...booking, pickupDate: start, returnDate: end };
        })
        .filter(Boolean),
    [bookings],
  );

  // Build maintenance ranges with motorcycle info
  const maintenanceRanges = useMemo(() => {
    return maintenanceSchedules
      .filter((s) => !s.cancelled && !s.completed)
      .map((s) => {
        // For auto-scheduled maintenance, motorcycle is already attached
        const moto = s.auto ? s.motorcycle : motorcycles.find((m) => m._id === s.motorcycleId);
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

  // Buffer day items: maintenance starts tomorrow for these schedules
  const dayBufferItems = useMemo(() => {
    return maintenanceRanges.filter((s) => {
      const buffer = addDays(s.startDate, -1);
      return selectedKey === toDateKey(buffer);
    });
  }, [maintenanceRanges, selectedKey]);

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
    return maintenanceRanges.some((s) => {
      const buffer = addDays(s.startDate, -1);
      return dk === toDateKey(buffer);
    });
  };

  const currentMonthLabel = selectedMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <main className="bg-[#e3e3e3] min-h-screen pt-28 pb-14 px-4 sm:px-6 lg:px-8 text-[#171717]">
      <div className="max-w-6xl mx-auto">
        <section className="bg-[#f4f3f3] rounded-[2rem] shadow-xl shadow-black/10 border border-[#171717]/10 overflow-hidden">
          {/* Header */}
          <div className="p-6 sm:p-8 border-b border-[#171717]/10 bg-gradient-to-r from-[#f8f1f1] via-[#f4f3f3] to-[#e9e0e0]">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 text-[#b50002] text-xs font-semibold uppercase tracking-[0.2em]">
                  <FaCalendarAlt />
                  Booking calendar
                </div>
                <h1 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight">
                  Fleet Schedule &amp; Maintenance
                </h1>
                <p className="mt-3 max-w-2xl text-sm sm:text-base text-[#171717]/75">
                  Booked days and maintenance windows are both shown. Select a
                  date to view all active rentals and any maintenance in
                  progress.
                </p>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-2 text-xs">
                {[
                  { color: "bg-[#d9b3b3]", label: "Booked" },
                  { color: "bg-[#b50002]", label: "Returns today" },
                  { color: "bg-[#7c3aed]", label: "Maintenance" },
                  {
                    color: "bg-amber-400",
                    label: "Booking blocked (buffer day)",
                  },
                ].map(({ color, label }) => (
                  <div
                    key={label}
                    className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/75 border border-[#171717]/10"
                  >
                    <span className={`w-3 h-3 rounded-full ${color}`} />
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-[1.3fr_0.9fr] gap-0">
            {/* Calendar grid */}
            <div className="p-4 sm:p-6 border-b lg:border-b-0 lg:border-r border-[#171717]/10">
              <div className="flex items-center justify-between gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => setSelectedMonth((v) => addMonths(v, -1))}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white border border-[#171717]/10 text-sm font-semibold hover:border-[#b50002] hover:text-[#b50002] transition-colors"
                >
                  <FaChevronLeft />
                  Prev
                </button>
                <div className="text-center">
                  <div className="text-xs uppercase tracking-[0.25em] text-[#171717]/50 font-semibold">
                    Month
                  </div>
                  <div className="text-xl sm:text-2xl font-black">
                    {currentMonthLabel}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedMonth((v) => addMonths(v, 1))}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white border border-[#171717]/10 text-sm font-semibold hover:border-[#b50002] hover:text-[#b50002] transition-colors"
                >
                  Next
                  <FaChevronRight />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold uppercase tracking-[0.18em] text-[#171717]/45 mb-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                  (day) => (
                    <div key={day} className="py-2">
                      {day}
                    </div>
                  ),
                )}
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {monthGrid.map((date) => {
                  const inMonth = date.getMonth() === selectedMonth.getMonth();
                  const dateKey = toDateKey(date);
                  const bookingMatches = bookingsForDay(date);
                  const maintenanceMatches = maintenanceForDay(date);
                  const blocked = isBlockedDueToMaintenance(date);
                  const isSelected = dateKey === selectedKey;
                  const hasBookings = bookingMatches.length > 0;
                  const hasMaintenance = maintenanceMatches.length > 0;
                  const returnsToday = bookingMatches.some(
                    (b) => toDateKey(b.returnDate) === dateKey,
                  );

                  let cellClass = "";
                  if (isSelected) {
                    cellClass =
                      "border-[#b50002] bg-[#b50002] text-white shadow-lg shadow-[#b50002]/20";
                  } else if (hasMaintenance) {
                    cellClass =
                      "border-[#7c3aed]/40 bg-[#f3eeff] text-[#171717] hover:border-[#7c3aed]";
                  } else if (blocked) {
                    cellClass =
                      "border-amber-300 bg-amber-50 text-[#171717] hover:border-amber-400";
                  } else if (hasBookings) {
                    cellClass =
                      "border-[#ecd0d0] bg-[#f8eaea] text-[#171717] hover:border-[#b50002]/40";
                  } else if (inMonth) {
                    cellClass =
                      "border-[#171717]/10 bg-white hover:border-[#171717]/25";
                  } else {
                    cellClass =
                      "border-transparent bg-transparent text-[#171717]/35";
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
                      className={`min-h-[70px] rounded-2xl border text-left p-1.5 transition-all duration-200 ${cellClass}`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-xs font-semibold">
                          {date.getDate()}
                        </span>
                        <div className="flex gap-0.5">
                          {returnsToday && (
                            <span
                              className={`w-2 h-2 rounded-full ${isSelected ? "bg-white" : "bg-[#b50002]"}`}
                              aria-label="Returns today"
                            />
                          )}
                          {hasMaintenance && !isSelected && (
                            <span
                              className="w-2 h-2 rounded-full bg-[#7c3aed]"
                              aria-label="Maintenance"
                            />
                          )}
                          {blocked && !hasMaintenance && !isSelected && (
                            <span
                              className="w-2 h-2 rounded-full bg-amber-400"
                              aria-label="Blocked buffer"
                            />
                          )}
                        </div>
                      </div>

                      <div className="mt-1 flex flex-col gap-0.5">
                        {bookingMatches.slice(0, 2).map((booking) => {
                          const thumb = resolveMotorcycleImage(booking);
                          return (
                            <span
                              key={booking._id}
                              className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none ${
                                isSelected
                                  ? "bg-white/20 text-white"
                                  : "bg-white text-[#b50002]"
                              }`}
                            >
                              {thumb ? (
                                <img
                                  src={thumb}
                                  alt=""
                                  className="w-3 h-3 object-cover rounded"
                                  onError={(e) =>
                                    (e.currentTarget.style.display = "none")
                                  }
                                />
                              ) : (
                                <FaMotorcycle />
                              )}
                            </span>
                          );
                        })}
                        {maintenanceMatches.slice(0, 1).map((s) => (
                          <span
                            key={s.id}
                            className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none ${
                              isSelected
                                ? "bg-white/20 text-white"
                                : "bg-[#ede9fe] text-[#7c3aed]"
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

              {/* Legend row */}
              <div className="mt-5 flex flex-wrap gap-3 text-xs text-[#171717]/70">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-white border border-[#171717]/15" />
                  Available
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#f8eaea] border border-[#ecd0d0]" />
                  Booked
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#f3eeff] border border-[#7c3aed]/40" />
                  Maintenance
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-50 border border-amber-300" />
                  Buffer day (no new bookings)
                </div>
              </div>
            </div>

            {/* Right panel */}
            <aside className="p-4 sm:p-6 bg-[#fcfbfb]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.25em] text-[#171717]/50 font-semibold">
                    Selected day
                  </div>
                  <h2 className="mt-1 text-2xl font-black">
                    {formatLongDate(selectedDate)}
                  </h2>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  {dayBookings.length > 0 && (
                    <div className="px-3 py-2 rounded-2xl bg-[#f8eaea] border border-[#ecd0d0] text-sm font-semibold text-[#b50002]">
                      {dayBookings.length} rental
                      {dayBookings.length !== 1 ? "s" : ""}
                    </div>
                  )}
                  {dayMaintenance.length > 0 && (
                    <div className="px-3 py-2 rounded-2xl bg-[#ede9fe] border border-[#7c3aed]/30 text-sm font-semibold text-[#7c3aed]">
                      {dayMaintenance.length} maint.
                    </div>
                  )}
                  {dayBufferItems.length > 0 && !dayMaintenance.length && (
                    <div className="px-3 py-2 rounded-2xl bg-amber-50 border border-amber-300 text-sm font-semibold text-amber-700">
                      Buffer day
                    </div>
                  )}
                </div>
              </div>

              {loading ? (
                <div className="mt-6 rounded-3xl border border-dashed border-[#171717]/15 bg-white p-6 text-sm text-[#171717]/65">
                  Loading calendar data…
                </div>
              ) : error ? (
                <div className="mt-6 rounded-3xl border border-[#b50002]/20 bg-[#fff2f2] p-6 text-sm text-[#b50002]">
                  {error}
                </div>
              ) : (
                <div className="mt-6 space-y-4 max-h-[600px] overflow-auto pr-1">
                  {/* ── Maintenance alert banners (shown to users) ── */}
                  <MaintenanceAlertBanner
                    maintenanceItems={dayMaintenance}
                    selectedDate={selectedDate}
                  />
                  <BufferDayAlertBanner
                    bufferedItems={dayBufferItems}
                    selectedDate={selectedDate}
                  />

                  {/* Maintenance cards */}
                  {dayMaintenance.map((s) => (
                    <article
                      key={s.id}
                      className="rounded-3xl bg-white border border-[#7c3aed]/25 shadow-lg shadow-black/5 overflow-hidden"
                    >
                      <div className="h-1 bg-[#7c3aed]" />
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-[#ede9fe] flex items-center justify-center shrink-0">
                            <Wrench className="w-5 h-5 text-[#7c3aed]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#ede9fe] text-[#7c3aed] text-[10px] font-black uppercase tracking-wider">
                                <Wrench className="w-3 h-3" />
                                Maintenance
                              </span>
                              {s.auto && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-semibold px-2 py-1 rounded-full bg-slate-50 border border-slate-200">
                                  Scheduled (6-month)
                                </span>
                              )}
                            </div>
                            <h3 className="font-black text-sm mt-1">
                              {s.motorcycle
                                ? `${s.motorcycle.make} ${s.motorcycle.model}`
                                : "Unknown vehicle"}
                            </h3>
                            {s.notes && (
                              <p className="text-xs text-slate-500 mt-0.5">
                                {s.notes}
                              </p>
                            )}

                            {/* User-facing warning inside the card */}
                            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#7c3aed]/80 font-semibold bg-[#f5f3ff] rounded-lg px-2.5 py-1.5">
                              <Info className="w-3.5 h-3.5 shrink-0" />
                              This motorcycle is not available for rental during
                              this period.
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                              <div className="rounded-xl bg-slate-50 border border-slate-100 p-2">
                                <div className="text-slate-400 font-semibold uppercase tracking-wide text-[10px]">
                                  Start
                                </div>
                                <div className="font-bold mt-0.5">
                                  {formatShortDate(s.startDate)}
                                </div>
                              </div>
                              <div className="rounded-xl bg-slate-50 border border-slate-100 p-2">
                                <div className="text-slate-400 font-semibold uppercase tracking-wide text-[10px]">
                                  End
                                </div>
                                <div className="font-bold mt-0.5">
                                  {formatShortDate(s.endDate)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}

                  {/* Booking cards */}
                  {dayBookings.map((booking) => {
                    const isReturnDay =
                      toDateKey(booking.returnDate) === selectedKey;
                    const motorcycleImage = resolveMotorcycleImage(booking);
                    return (
                      <article
                        key={
                          booking._id ||
                          `${booking.pickupDate}-${booking.returnDate}`
                        }
                        className="rounded-3xl bg-white border border-[#171717]/10 shadow-lg shadow-black/5 overflow-hidden"
                      >
                        <div className="h-1 bg-[#b50002]" />
                        <div className="p-5">
                          <div className="flex items-start gap-4">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#f8eaea] text-[#b50002] border border-[#ecd0d0]">
                              {motorcycleImage ? (
                                <img
                                  src={motorcycleImage}
                                  alt={buildMotorcycleLabel(booking)}
                                  className="h-full w-full object-contain p-1.5"
                                  onError={(e) =>
                                    (e.currentTarget.style.display = "none")
                                  }
                                />
                              ) : (
                                <FaMotorcycle className="text-2xl" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                <div>
                                  <h3 className="text-lg font-black leading-tight">
                                    {buildMotorcycleLabel(booking)}
                                  </h3>
                                  <p className="mt-1 text-sm text-[#171717]/65">
                                    {formatShortDate(booking.pickupDate)} to{" "}
                                    {formatShortDate(booking.returnDate)}
                                  </p>
                                </div>
                                <div
                                  className={`inline-flex items-center gap-2 self-start rounded-full px-3 py-1.5 text-xs font-bold ${
                                    isReturnDay
                                      ? "bg-[#b50002] text-white"
                                      : "bg-[#f7e3c7] text-[#b97700]"
                                  }`}
                                >
                                  {isReturnDay
                                    ? "Returns today"
                                    : "Currently booked"}
                                </div>
                              </div>
                              <div className="mt-4 grid sm:grid-cols-2 gap-3 text-sm">
                                <div className="rounded-2xl bg-[#fcfbfb] border border-[#171717]/10 p-3">
                                  <div className="flex items-center gap-2 text-[#171717]/55 font-semibold text-xs uppercase tracking-[0.16em]">
                                    <FaMapMarkerAlt />
                                    Pick-up
                                  </div>
                                  <div className="mt-1 font-bold">
                                    {formatShortDate(booking.pickupDate)}
                                  </div>
                                </div>
                                <div className="rounded-2xl bg-[#fcfbfb] border border-[#171717]/10 p-3">
                                  <div className="flex items-center gap-2 text-[#171717]/55 font-semibold text-xs uppercase tracking-[0.16em]">
                                    <FaClock />
                                    Return
                                  </div>
                                  <div className="mt-1 font-bold">
                                    {formatShortDate(booking.returnDate)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}

                  {/* Empty state — also check for buffer day info */}
                  {dayBookings.length === 0 &&
                    dayMaintenance.length === 0 &&
                    dayBufferItems.length === 0 && (
                      <div className="rounded-3xl border border-dashed border-[#171717]/15 bg-white p-6 text-sm text-[#171717]/65">
                        No bookings or maintenance on this date.
                      </div>
                    )}

                  {/* Buffer day empty state (no maintenance card shown, just alert above) */}
                  {dayBookings.length === 0 &&
                    dayMaintenance.length === 0 &&
                    dayBufferItems.length > 0 && (
                      <div className="rounded-3xl border border-dashed border-amber-200 bg-white p-6 text-sm text-amber-600/70">
                        No active rentals on this date, but some motorcycles
                        have maintenance starting tomorrow.
                      </div>
                    )}
                </div>
              )}

              {/* Quick note */}
              <div className="mt-6 rounded-3xl border border-[#171717]/10 bg-white p-5">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#171717]/55">
                  Booking Buffer Rule
                </h3>
                <p className="mt-2 text-sm text-[#171717]/70">
                  Rentals must be returned at least{" "}
                  <strong>1 day before</strong> a scheduled maintenance window.
                  Buffer days appear in amber on the calendar.
                </p>
                <div className="flex gap-3 mt-4 flex-wrap">
                  <Link
                    to="/motorcycles"
                    className="inline-flex items-center gap-2 rounded-full bg-[#b50002] px-4 py-2.5 text-sm font-bold text-white hover:brightness-110 transition-colors"
                  >
                    Browse motorcycles
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
};

export default CalendarView;
