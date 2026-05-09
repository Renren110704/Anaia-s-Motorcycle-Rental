import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  FaMotorcycle,
  FaMapMarkerAlt,
  FaTimes,
  FaSearch,
  FaArrowLeft,
  FaUser,
  FaBell,
  FaExclamationTriangle,
  FaCalendarAlt,
  FaCreditCard,
  FaMoneyBillWave,
  FaChevronDown,
  FaChevronUp,
  FaSatelliteDish,
  FaSyncAlt,
  FaExclamationCircle,
} from "react-icons/fa";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Clock, ArrowRight, AlertTriangle } from "lucide-react";
import API_BASE_URL from "../apiBase";

const BASE = API_BASE_URL;
const api = axios.create({
  baseURL: BASE,
  headers: { Accept: "application/json" },
});
const LOCATION_LOG_STORAGE_KEY = "motorcycleLocationLogV1";
const DOWNPAYMENT = 200;

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const CITY_COORDINATES = {
  BACOOR: { lat: 14.4626, lng: 120.9516, radius: 8000 },
  IMUS: { lat: 14.4298, lng: 120.9373, radius: 7000 },
  KAWIT: { lat: 14.4394, lng: 120.9021, radius: 6000 },
  NOVELETA: { lat: 14.4312, lng: 120.8832, radius: 5000 },
  DASMARINAS: { lat: 14.3294, lng: 120.9367, radius: 8000 },
  DASMARIÑAS: { lat: 14.3294, lng: 120.9367, radius: 8000 },
  TAGAYTAY: { lat: 14.1153, lng: 120.9621, radius: 7000 },
  "GENERAL TRIAS": { lat: 14.3868, lng: 120.8817, radius: 7000 },
  SILANG: { lat: 14.2296, lng: 120.9738, radius: 8000 },
  MANILA: { lat: 14.5995, lng: 120.9842, radius: 12000 },
  MAKATI: { lat: 14.5547, lng: 121.0244, radius: 5000 },
  TAGUIG: { lat: 14.5243, lng: 121.0792, radius: 6000 },
  PASIG: { lat: 14.5764, lng: 121.0851, radius: 5000 },
  PARANAQUE: { lat: 14.4793, lng: 121.0198, radius: 6000 },
  "LAS PINAS": { lat: 14.4453, lng: 120.9832, radius: 5000 },
  MUNTINLUPA: { lat: 14.4081, lng: 121.0415, radius: 6000 },
  "SAN PEDRO": { lat: 14.3587, lng: 121.0478, radius: 5000 },
  CALAMBA: { lat: 14.2113, lng: 121.1653, radius: 8000 },
  "SANTA ROSA": { lat: 14.3122, lng: 121.1114, radius: 6000 },
  BINAN: { lat: 14.3406, lng: 121.0802, radius: 5000 },
};

const haversineDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const resolveDestinationCoords = (destinationStr = "") => {
  const upper = destinationStr.toUpperCase();
  for (const [city, coords] of Object.entries(CITY_COORDINATES)) {
    if (upper.includes(city)) return { city, ...coords };
  }
  return null;
};

const ORIGIN = { lat: 14.4626, lng: 120.9516 };

const distanceToSegment = (pLat, pLng, aLat, aLng, bLat, bLng) => {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const x = (pLng - aLng) * Math.cos(toRad((pLat + aLat) / 2)) * R * toRad(1);
  const y = (pLat - aLat) * R * toRad(1);
  const dx = (bLng - aLng) * Math.cos(toRad((bLat + aLat) / 2)) * R * toRad(1);
  const dy = (bLat - aLat) * R * toRad(1);
  const segLenSq = dx * dx + dy * dy;
  if (segLenSq === 0) return Math.sqrt(x * x + y * y);
  const t = Math.max(0, Math.min(1, (x * dx + y * dy) / segLenSq));
  return Math.sqrt((x - t * dx) ** 2 + (y - t * dy) ** 2);
};

const CORRIDOR_WIDTH = 5000;

const isOutsideGeofence = (lat, lng, destinationStr) => {
  const dest = resolveDestinationCoords(destinationStr);
  if (!dest) return false;
  if (haversineDistance(lat, lng, dest.lat, dest.lng) <= dest.radius)
    return false;
  if (haversineDistance(lat, lng, ORIGIN.lat, ORIGIN.lng) <= 8000) return false;
  if (
    distanceToSegment(lat, lng, ORIGIN.lat, ORIGIN.lng, dest.lat, dest.lng) <=
    CORRIDOR_WIDTH
  )
    return false;
  return true;
};

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (timeStr) => {
  if (!timeStr) return "-";
  const [hourStr, minStr] = timeStr.split(":");
  const hour = parseInt(hourStr, 10);
  if (isNaN(hour)) return timeStr;
  const period = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}:${minStr || "00"} ${period}`;
};

const formatPrice = (n) => `₱${(Number(n) || 0).toLocaleString("en-PH")}`;

const buildTrackerLocationText = (tracker) => {
  if (tracker?.resolvedLocation) return tracker.resolvedLocation;
  if (tracker?.address) return tracker.address;
  if (
    Number.isFinite(Number(tracker?.lat)) &&
    Number.isFinite(Number(tracker?.lng))
  ) {
    return `${Number(tracker.lat).toFixed(5)}, ${Number(tracker.lng).toFixed(5)}`;
  }
  return "No live GPS data";
};

const persistLocationSnapshots = (units = [], liveTrackersByUnit = {}) => {
  try {
    const validUnitIds = new Set([
      ...units.map((m) => String(m.unitId || "").trim()).filter(Boolean),
      ...Object.keys(liveTrackersByUnit)
        .map((k) => String(k).trim())
        .filter(Boolean),
    ]);
    const raw = localStorage.getItem(LOCATION_LOG_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const current = Array.isArray(parsed)
      ? parsed
      : Object.values(parsed || {});
    const filtered = current.filter((entry) => {
      const entryUnitId = String(entry.unitId || entry.id || "").trim();
      return validUnitIds.has(entryUnitId);
    });
    const map = new Map(
      filtered.map((entry) => [
        entry.id || entry.unitId || entry.motorcycleId || entry.bookingId,
        entry,
      ]),
    );
    units.forEach((m) => {
      const key = m.unitId || m._id || m.booking?._id;
      if (!key || !m.location) return;
      const snapshot = {
        id: key,
        motorcycleId: m._id || "",
        bookingId: m.booking?._id || "",
        unitId: m.unitId || "",
        motorcycleName:
          `${m.make || ""} ${m.model || ""}`.trim() || "Unknown unit",
        customer: m.booking?.customer || "",
        status: m.status || "",
        lat: Number(m.location.lat),
        lng: Number(m.location.lng),
        locationText: `${Number(m.location.lat).toFixed(5)}, ${Number(m.location.lng).toFixed(5)}`,
        lastUpdatedAt: m.lastUpdate
          ? new Date(m.lastUpdate).toISOString()
          : new Date().toISOString(),
        source: "GPS Snapshot",
      };
      const prev = map.get(key);
      if (!prev) {
        map.set(key, snapshot);
        return;
      }
      const prevTime = new Date(prev.lastUpdatedAt || 0).getTime() || 0;
      const nextTime = new Date(snapshot.lastUpdatedAt || 0).getTime() || 0;
      if (nextTime >= prevTime) map.set(key, snapshot);
    });
    Object.entries(liveTrackersByUnit).forEach(([unitId, liveTracker]) => {
      if (
        !Number.isFinite(Number(liveTracker?.lat)) ||
        !Number.isFinite(Number(liveTracker?.lng))
      )
        return;
      const snapshot = {
        key: unitId,
        id: unitId,
        motorcycleId: "",
        bookingId: "",
        unitId,
        motorcycleName: liveTracker.motorcycleName || "Traccar device",
        customer: liveTracker.customer || "Traccar device",
        status: liveTracker.status || "online",
        lat: Number(liveTracker.lat),
        lng: Number(liveTracker.lng),
        locationText:
          liveTracker.locationText ||
          `${Number(liveTracker.lat).toFixed(5)}, ${Number(liveTracker.lng).toFixed(5)}`,
        resolvedLocation:
          liveTracker.resolvedLocation || liveTracker.locationText || "",
        lastUpdatedAt: liveTracker.lastUpdatedAt || new Date().toISOString(),
        source: liveTracker.source || "Traccar Live",
      };
      const prev = map.get(unitId);
      if (!prev) {
        map.set(unitId, snapshot);
        return;
      }
      const prevTime = new Date(prev.lastUpdatedAt || 0).getTime() || 0;
      const nextTime = new Date(snapshot.lastUpdatedAt || 0).getTime() || 0;
      if (nextTime >= prevTime) map.set(unitId, snapshot);
    });
    localStorage.setItem(
      LOCATION_LOG_STORAGE_KEY,
      JSON.stringify(Array.from(map.values())),
    );
    const snapshots = Array.from(map.values());
    api.post("/api/tracking/snapshots/sync", { snapshots }).catch((err) => {
      console.warn(
        "Failed to sync tracking snapshots to backend",
        err?.message || err,
      );
    });
  } catch (err) {
    console.error("Failed to persist location snapshots", err);
  }
};

// ── Shared label style from ManageMotorcycle ──────────────────────────────────
const labelCls =
  "block text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase mb-1.5";

// ── Stat Card (same as ManageMotorcycle) ─────────────────────────────────────
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

// ── Tracker Status Badge ──────────────────────────────────────────────────────
const TrackerBadge = ({ status, exceeded }) => {
  if (exceeded)
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border bg-red-50 text-[#b50002] border-red-200">
        Exceeded
      </span>
    );
  const isOnline = String(status || "").toLowerCase() === "online";
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${isOnline ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-500" : "bg-slate-400"}`}
      />
      {isOnline ? "Online" : "Offline"}
    </span>
  );
};

// ── Live Tracker Info Card ────────────────────────────────────────────────────
const LiveTrackerCard = ({ tracker, loading, error, onRetry }) => {
  const hasTracker =
    Number.isFinite(Number(tracker?.lat)) &&
    Number.isFinite(Number(tracker?.lng));
  const isOnline = String(tracker?.status || "").toLowerCase() === "online";
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
            <FaSatelliteDish className="text-violet-500 text-sm" />
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase">
              Traccar Live
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-500" : "bg-red-400"}`}
              />
              <span className="text-[11px] font-semibold text-slate-500">
                {isOnline ? "Online" : "Offline"}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-500 font-bold text-xs hover:border-[#b50002]/20 hover:text-[#b50002] transition-all"
        >
          <FaSyncAlt className="text-[10px]" /> Refresh
        </button>
      </div>
      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-4 bg-slate-100 rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : error && !hasTracker ? (
        <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3">
          <FaExclamationCircle className="text-[#b50002] mt-0.5 flex-shrink-0" />
          <p className="text-xs font-medium text-[#b50002]">{error}</p>
        </div>
      ) : hasTracker ? (
        <>
          <p className="font-black text-[#171717] text-sm mb-1">
            {tracker.motorcycleName}
          </p>
          <p className="text-xs text-slate-400 mb-3">
            {buildTrackerLocationText(tracker)}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-50 rounded-xl px-3 py-2">
              <p className={labelCls} style={{ marginBottom: "2px" }}>
                Latitude
              </p>
              <p className="text-xs font-bold text-[#171717]">
                {Number(tracker.lat).toFixed(6)}
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl px-3 py-2">
              <p className={labelCls} style={{ marginBottom: "2px" }}>
                Longitude
              </p>
              <p className="text-xs font-bold text-[#171717]">
                {Number(tracker.lng).toFixed(6)}
              </p>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            Updated{" "}
            {new Date(tracker.lastUpdatedAt || Date.now()).toLocaleTimeString()}
          </p>
        </>
      ) : (
        <p className="text-xs text-slate-400">
          {error || "Live GPS is currently unavailable"}
        </p>
      )}
    </div>
  );
};

// ── Motorcycle List Item ──────────────────────────────────────────────────────
const MotorcycleListItem = ({ motorcycle, isSelected, onClick }) => {
  const exceeded = motorcycle.exceededGeofence;
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border shadow-sm p-4 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group
        ${exceeded ? "border-red-200" : isSelected ? "border-[#b50002]/30" : "border-slate-100"}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          {motorcycle.unitId && (
            <p className="text-[10px] font-bold tracking-[0.15em] text-[#b50002] uppercase mb-0.5">
              {motorcycle.unitId}
            </p>
          )}
          <h3 className="font-black text-[#171717] text-[13px] leading-tight truncate">
            {motorcycle.make} {motorcycle.model}
          </h3>
        </div>
        <TrackerBadge status={motorcycle.trackerStatus} exceeded={exceeded} />
      </div>
      <div className="flex items-center gap-1.5 mb-1">
        <FaUser className="text-slate-300 text-[10px] flex-shrink-0" />
        <p className="text-xs text-slate-500 truncate">
          {motorcycle.booking.customer}
        </p>
      </div>
      <div className="flex items-center gap-1.5 mb-3">
        <MapPin className="text-slate-300 w-3 h-3 flex-shrink-0" />
        <p className="text-xs text-slate-400 truncate">
          {motorcycle.booking.destination}
        </p>
      </div>
      {exceeded && (
        <div className="flex items-center gap-1.5 bg-red-50 border border-red-100 rounded-xl px-2.5 py-1.5 mb-3">
          <FaExclamationTriangle className="text-[#b50002] text-[10px] flex-shrink-0" />
          <p className="text-[10px] font-bold text-[#b50002]">
            Outside destination zone
          </p>
        </div>
      )}
      <div className="flex items-center justify-between pt-2.5 border-t border-slate-50">
        <div className="flex items-center gap-1">
          <Clock className="text-slate-300 w-3 h-3" />
          <span className="text-[10px] text-slate-400">
            {motorcycle.lastUpdate.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-slate-200 group-hover:text-[#b50002] group-hover:translate-x-0.5 transition-all duration-200" />
      </div>
    </div>
  );
};

// ── Booking Detail Slide-over ─────────────────────────────────────────────────
const BookingDetailPanel = ({ motorcycle, onClose }) => {
  const [collapsed, setCollapsed] = useState({});
  const toggle = (key) => setCollapsed((p) => ({ ...p, [key]: !p[key] }));

  const b = motorcycle.booking;
  const details = motorcycle.bookingDetails || {};
  const dailyRate = motorcycle.dailyRate || 0;
  const pickupDate = b.pickupDate ? new Date(b.pickupDate) : null;
  const returnDate = b.returnDate ? new Date(b.returnDate) : null;
  const days =
    pickupDate && returnDate
      ? Math.max(1, Math.ceil((returnDate - pickupDate) / 86400000))
      : 1;
  const baseRental = dailyRate * days;
  const distanceFee = details.distanceFee || 0;
  const helmetFee = details.helmetFee || 0;
  const grossTotal = motorcycle.amount || 0;
  const downpayment =
    Number(details.downpayment) ||
    Number(motorcycle.reservationFee) ||
    DOWNPAYMENT;
  const dueAtPickup = Math.max(0, grossTotal - downpayment);

  const Section = ({ id, title, icon: Icon, children }) => (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <button
        onClick={() => toggle(id)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
      >
        <span className="flex items-center gap-2 text-[11px] font-black tracking-[0.1em] text-slate-400 uppercase">
          <Icon className="text-[#b50002]" /> {title}
        </span>
        {collapsed[id] ? (
          <FaChevronDown className="text-slate-300 text-[10px]" />
        ) : (
          <FaChevronUp className="text-slate-300 text-[10px]" />
        )}
      </button>
      {!collapsed[id] && (
        <div className="px-5 pb-4 space-y-1.5 border-t border-slate-50">
          {children}
        </div>
      )}
    </div>
  );

  const Row = ({ label, value, accent }) => (
    <div className="flex items-start justify-between py-1.5 border-b border-slate-50 last:border-0">
      <span className="text-[11px] text-slate-400">{label}</span>
      <span
        className={`text-[11px] font-bold text-right max-w-[60%] ${accent || "text-[#171717]"}`}
      >
        {value}
      </span>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[9990] flex justify-end bg-black/20 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#f7f8fa] h-full overflow-y-auto shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-[0.15em] text-[#b50002] uppercase mb-0.5">
              {motorcycle.unitId || "Unit"}
            </p>
            <h2 className="font-black text-[#171717] text-lg leading-tight">
              {motorcycle.make} {motorcycle.model}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <FaTimes className="text-sm" />
          </button>
        </div>

        {/* Geofence alert */}
        {motorcycle.exceededGeofence && (
          <div className="mx-4 mt-4 flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
            <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-[#b50002]" />
            </div>
            <div>
              <p className="font-black text-[#b50002] text-sm">
                Geofence Exceeded
              </p>
              <p className="text-[11px] text-red-400">
                Unit is outside the primary destination zone
              </p>
            </div>
          </div>
        )}

        <div className="p-4 space-y-3 flex-1">
          {/* Status chips */}
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                label: "Status",
                value:
                  String(motorcycle.trackerStatus || "active").toLowerCase() ===
                  "online"
                    ? "Online"
                    : String(
                          motorcycle.trackerStatus || "active",
                        ).toLowerCase() === "offline"
                      ? "Offline"
                      : motorcycle.exceededGeofence
                        ? "Exceeded"
                        : "Active",
                color:
                  String(motorcycle.trackerStatus || "").toLowerCase() ===
                  "online"
                    ? "text-emerald-600"
                    : motorcycle.exceededGeofence
                      ? "text-[#b50002]"
                      : "text-slate-600",
              },
              {
                label: "Daily Rate",
                value: formatPrice(dailyRate),
                color: "text-[#171717]",
              },
              { label: "Duration", value: `${days}d`, color: "text-[#171717]" },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 text-center"
              >
                <p className="text-[9px] font-bold tracking-[0.12em] text-slate-400 uppercase mb-1">
                  {label}
                </p>
                <p className={`font-black text-sm ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          <Section id="customer" title="Customer" icon={FaUser}>
            <Row label="Name" value={b.customer} />
            <Row label="Email" value={b.email} />
            <Row label="Phone" value={b.phone || "-"} />
            {motorcycle.renterAddress && (
              <Row label="Address" value={motorcycle.renterAddress} />
            )}
          </Section>

          <Section
            id="dates"
            title="Booking Dates & Times"
            icon={FaCalendarAlt}
          >
            <Row
              label="Pickup"
              value={`${formatDate(b.pickupDate)} · ${formatTime(b.pickupTime)}`}
            />
            <Row
              label="Return"
              value={`${formatDate(b.returnDate)} · ${formatTime(b.returnTime)}`}
            />
            <Row
              label="Duration"
              value={`${days} ${days === 1 ? "day" : "days"}`}
            />
            <Row label="Destination" value={b.destination || "-"} />
            {details.destinationCity && (
              <Row label="Destination City" value={details.destinationCity} />
            )}
          </Section>

          <Section id="specs" title="Motorcycle Specs" icon={FaMotorcycle}>
            <Row
              label="Make / Model"
              value={`${motorcycle.make} ${motorcycle.model}`}
            />
            {motorcycle.unitId && (
              <Row label="Unit ID" value={motorcycle.unitId} />
            )}
            {motorcycle.year && <Row label="Year" value={motorcycle.year} />}
            {motorcycle.engineSize && (
              <Row label="Engine" value={`${motorcycle.engineSize}cc`} />
            )}
            {motorcycle.transmission && (
              <Row label="Transmission" value={motorcycle.transmission} />
            )}
            {motorcycle.fuelType && (
              <Row label="Fuel Type" value={motorcycle.fuelType} />
            )}
            <Row label="ABS" value={motorcycle.hasABS ? "Yes" : "No"} />
          </Section>

          <Section id="fees" title="Fee Breakdown" icon={FaMoneyBillWave}>
            {dailyRate > 0 && (
              <Row
                label={`Rate/day (₱${dailyRate.toLocaleString()} x ${days}d)`}
                value={formatPrice(baseRental)}
              />
            )}
            {distanceFee > 0 && (
              <Row
                label={`Distance Fee${details.distanceTierLabel ? ` (${details.distanceTierLabel})` : ""}`}
                value={`+${formatPrice(distanceFee)}`}
                accent="text-amber-600"
              />
            )}
            {details.helmetRequested && helmetFee > 0 && (
              <Row
                label="Additional Helmet"
                value={`+${formatPrice(helmetFee)}`}
                accent="text-[#b50002]"
              />
            )}
            <div className="flex items-center justify-between pt-2 mt-1 border-t border-slate-100">
              <span className="text-[11px] font-black text-[#171717]">
                Total
              </span>
              <span className="text-sm font-black text-[#171717]">
                {formatPrice(grossTotal)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400">
                Downpayment (paid)
              </span>
              <span className="text-[11px] font-bold text-emerald-600">
                -{formatPrice(downpayment)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 mt-1">
              <span className="text-[11px] font-black text-[#171717]">
                Due at Pickup
              </span>
              <span className="text-sm font-black text-[#b50002]">
                {formatPrice(dueAtPickup)}
              </span>
            </div>
          </Section>

          <Section id="payment" title="Payment" icon={FaCreditCard}>
            <Row
              label="Downpayment"
              value={`${formatPrice(downpayment)} — Paid`}
              accent="text-emerald-600"
            />
            <Row
              label="Due at Pickup"
              value={formatPrice(dueAtPickup)}
              accent="text-[#b50002]"
            />
            <Row
              label="Payment Method"
              value={motorcycle.reservationPaymentMethod || "-"}
            />
            <Row
              label="Payment Status"
              value={
                motorcycle.paymentStatus === "fully_paid"
                  ? "Fully Paid"
                  : "Downpayment Paid"
              }
              accent={
                motorcycle.paymentStatus === "fully_paid"
                  ? "text-emerald-600"
                  : "text-amber-600"
              }
            />
          </Section>

          <p className="text-center text-slate-300 text-[10px] pb-2">
            Last updated: {motorcycle.lastUpdate.toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const MotorcycleTracking = () => {
  const [motorcycles, setMotorcycles] = useState([]);
  const [selectedMotorcycle, setSelectedMotorcycle] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [liveTracker, setLiveTracker] = useState(null);
  const [liveTrackersByUnit, setLiveTrackersByUnit] = useState({});
  const [liveTrackerLoading, setLiveTrackerLoading] = useState(true);
  const [liveTrackerError, setLiveTrackerError] = useState("");
  const [loading, setLoading] = useState(true);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const circlesRef = useRef({});

  const fetchMotorcycles = useCallback(async () => {
    try {
      setLoading(true);
      const bookingsRes = await api.get("/api/motorcycle-bookings", {
        params: { limit: 200, status: "active" },
      });
      const bookingsData = Array.isArray(bookingsRes.data)
        ? bookingsRes.data
        : bookingsRes.data.data || bookingsRes.data.bookings || [];
      const activeBookings = bookingsData.filter(
        (b) => b.status === "active" && !b.isDeleted,
      );
      if (activeBookings.length === 0) {
        setMotorcycles([]);
        return;
      }

      const motorcyclePromises = activeBookings.map(async (booking) => {
        try {
          const motorcycleId =
            booking.motorcycle?.id || booking.motorcycle?._id;
          if (!motorcycleId) return null;
          const motorcycleRes = await api.get(
            `/api/motorcycles/${motorcycleId}`,
          );
          const md = motorcycleRes.data?.data || motorcycleRes.data;
          const details = booking.details || {};
          const addr = booking.address || {};
          const renterAddress = [
            addr.barangay,
            addr.city,
            addr.state,
            addr.region,
            addr.zipCode,
          ]
            .filter(Boolean)
            .join(", ");
          return {
            _id: md._id,
            make: md.make,
            model: md.model,
            year: md.year,
            unitId: md.unitId || booking.motorcycle?.unitId || "",
            traccarDeviceId: md.traccarDeviceId || "",
            engineSize: md.engineSize || booking.motorcycle?.engineSize || "",
            transmission:
              md.transmission || booking.motorcycle?.transmission || "",
            fuelType: md.fuelType || booking.motorcycle?.fuelType || "",
            hasABS: md.hasABS ?? booking.motorcycle?.hasABS ?? false,
            dailyRate: md.dailyRate || booking.motorcycle?.dailyRate || 0,
            status: md.status || "active",
            amount: booking.amount || 0,
            reservationFee: booking.reservationFee || DOWNPAYMENT,
            reservationPaymentMethod: booking.reservationPaymentMethod || "",
            paymentStatus: booking.paymentStatus || "reservation_paid",
            renterAddress,
            booking: {
              _id: booking._id,
              customer: booking.customer,
              email: booking.email,
              phone: booking.phone,
              pickupDate: booking.pickupDate,
              pickupTime: booking.pickupTime,
              returnDate: booking.returnDate,
              returnTime: booking.returnTime,
              destination: booking.destination || "",
            },
            bookingDetails: details,
            lastUpdate: new Date(),
          };
        } catch (err) {
          console.error("Failed to fetch motorcycle", err);
          return null;
        }
      });

      const results = (await Promise.all(motorcyclePromises)).filter(Boolean);
      setMotorcycles(results);
    } catch (err) {
      console.error("Failed to fetch motorcycles:", err);
      toast.error("Failed to load motorcycles");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLiveTrackers = useCallback(async ({ force = false } = {}) => {
    try {
      setLiveTrackerLoading(true);
      setLiveTrackerError("");
      const bookingsRes = await api.get("/api/motorcycle-bookings", {
        params: { limit: 200, status: "active" },
      });
      const bookingsData = Array.isArray(bookingsRes.data)
        ? bookingsRes.data
        : bookingsRes.data.data || bookingsRes.data.bookings || [];
      const activeBookings = bookingsData.filter(
        (b) => b.status === "active" && !b.isDeleted,
      );
      const trackerMap = {};
      await Promise.all(
        activeBookings.map(async (booking) => {
          const motorcycleId =
            booking.motorcycle?.id || booking.motorcycle?._id;
          const unitId = booking.motorcycle?.unitId || "";
          if (!motorcycleId || !unitId) return;
          try {
            const motorcycleRes = await api.get(
              `/api/motorcycles/${motorcycleId}`,
            );
            const md = motorcycleRes.data?.data || motorcycleRes.data;
            const traccarDeviceId = md?.traccarDeviceId?.trim() || "";
            if (!traccarDeviceId) return;
            const res = await api.get("/api/tracking/live", {
              params: {
                force: force ? "true" : "false",
                deviceId: traccarDeviceId,
              },
            });
            const snapshot = res?.data?.data || null;
            if (snapshot) trackerMap[unitId] = snapshot;
          } catch (err) {
            console.warn(`Failed to fetch tracker for ${unitId}:`, err.message);
          }
        }),
      );
      setLiveTrackersByUnit(trackerMap);
      const first = Object.values(trackerMap)[0] || null;
      setLiveTracker(first);
    } catch (err) {
      setLiveTrackerError(err?.message || "Live GPS is currently unavailable");
    } finally {
      setLiveTrackerLoading(false);
    }
  }, []);

  const handleLiveTrackerRefresh = useCallback(
    () => fetchLiveTrackers({ force: true }),
    [fetchLiveTrackers],
  );

  const displayedMotorcycles = useMemo(() => {
    return motorcycles.map((motorcycle) => {
      const unitId = String(motorcycle.unitId || "").trim();
      const trackerSnap = liveTrackersByUnit[unitId] || null;
      if (!trackerSnap) return motorcycle;
      const location = { lat: trackerSnap.lat, lng: trackerSnap.lng };
      const exceeded = isOutsideGeofence(
        location.lat,
        location.lng,
        motorcycle.booking?.destination || "",
      );
      return {
        ...motorcycle,
        location,
        exceededGeofence: exceeded,
        lastUpdate: new Date(trackerSnap.lastUpdatedAt || Date.now()),
        trackerStatus: trackerSnap.status || motorcycle.trackerStatus || "",
      };
    });
  }, [liveTrackersByUnit, motorcycles]);

  useEffect(() => {
    fetchMotorcycles();
    fetchLiveTrackers();
    const interval = setInterval(() => {
      fetchMotorcycles();
      fetchLiveTrackers();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchLiveTrackers, fetchMotorcycles]);

  useEffect(() => {
    persistLocationSnapshots(displayedMotorcycles, liveTrackersByUnit);
  }, [displayedMotorcycles, liveTrackersByUnit]);

  useEffect(() => {
    if (mapRef.current) return;
    const map = L.map("tracking-map", {
      center: [14.4626, 120.9516],
      zoom: 13,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    Object.values(markersRef.current).forEach((m) => m.remove());
    Object.values(circlesRef.current).forEach((c) => c.remove());
    markersRef.current = {};
    circlesRef.current = {};
    displayedMotorcycles.forEach((motorcycle) => {
      const hasValidLocation =
        motorcycle.location &&
        Number.isFinite(Number(motorcycle.location.lat)) &&
        Number.isFinite(Number(motorcycle.location.lng));
      if (!hasValidLocation) return;
      const exceeded = motorcycle.exceededGeofence;
      const markerColor = exceeded ? "#b50002" : "#10b981";
      const dest = resolveDestinationCoords(motorcycle.booking.destination);
      if (dest) {
        const circle = L.circle([dest.lat, dest.lng], {
          radius: dest.radius,
          color: exceeded ? "#b50002" : "#10b981",
          fillColor: exceeded ? "#b50002" : "#10b981",
          fillOpacity: 0.07,
          weight: 1.5,
          dashArray: "6 4",
        }).addTo(mapRef.current);
        circlesRef.current[`${motorcycle._id}-circle`] = circle;
      }
      const customIcon = L.divIcon({
        className: "custom-marker",
        html: `
          <div style="background-color:${markerColor};width:34px;height:34px;border-radius:50%;border:3px solid white;box-shadow:0 2px 12px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;${exceeded ? "animation:pulse-red 1.2s infinite;" : ""}">
            <svg style="width:17px;height:17px;fill:white;" viewBox="0 0 24 24">
              <path d="M21,6H3A1,1,0,0,0,2,7v4a1,1,0,0,0,.78.97L5,12.67V15a1,1,0,0,0,1,1H7a1,1,0,0,0,1-1v-2h8v2a1,1,0,0,0,1,1h1a1,1,0,0,0,1-1V12.67l2.22-.7A1,1,0,0,0,22,11V7A1,1,0,0,0,21,6Z"/>
            </svg>
          </div>
          ${exceeded ? `<div style="position:absolute;top:-22px;left:50%;transform:translateX(-50%);background:#b50002;color:white;font-size:9px;font-weight:700;padding:2px 6px;border-radius:6px;white-space:nowrap;">EXCEEDED</div>` : ""}
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });
      const marker = L.marker(
        [motorcycle.location.lat, motorcycle.location.lng],
        { icon: customIcon },
      ).addTo(mapRef.current);
      const unitLine = motorcycle.unitId
        ? `<p style="margin:3px 0;font-size:11px;"><b>Unit:</b> ${motorcycle.unitId}</p>`
        : "";
      const exceededBadge = exceeded
        ? `<p style="margin:4px 0;color:#b50002;font-weight:700;font-size:11px;">EXCEEDED DESTINATION</p>`
        : "";
      marker.bindPopup(`
        <div style="color:#171717;padding:8px;min-width:200px;font-family:sans-serif;">
          <h3 style="margin:0 0 6px;font-weight:700;font-size:15px;">${motorcycle.make} ${motorcycle.model}</h3>
          ${unitLine}${exceededBadge}
          <p style="margin:3px 0;font-size:12px;"><b>Rented by:</b> ${motorcycle.booking.customer}</p>
          <p style="margin:3px 0;font-size:12px;"><b>Destination:</b> ${motorcycle.booking.destination}</p>
          <p style="margin:3px 0;font-size:11px;color:#888;"><b>Updated:</b> ${motorcycle.lastUpdate.toLocaleTimeString()}</p>
        </div>
      `);
      marker.on("click", () => setSelectedMotorcycle(motorcycle));
      markersRef.current[motorcycle._id] = marker;
    });
  }, [displayedMotorcycles, liveTrackersByUnit]);

  const filteredMotorcycles = displayedMotorcycles.filter((m) => {
    const q = searchTerm.toLowerCase();
    return (
      m.make.toLowerCase().includes(q) ||
      m.model.toLowerCase().includes(q) ||
      (m.unitId || "").toLowerCase().includes(q) ||
      m.booking.customer.toLowerCase().includes(q) ||
      m.booking.destination.toLowerCase().includes(q)
    );
  });

  const centerOnMotorcycle = (motorcycle) => {
    if (
      mapRef.current &&
      motorcycle.location &&
      Number.isFinite(Number(motorcycle.location.lat)) &&
      Number.isFinite(Number(motorcycle.location.lng))
    ) {
      mapRef.current.setView(
        [motorcycle.location.lat, motorcycle.location.lng],
        15,
      );
      setSelectedMotorcycle(motorcycle);
      if (markersRef.current[motorcycle._id])
        markersRef.current[motorcycle._id].openPopup();
    }
  };

  const exceededCount = displayedMotorcycles.filter(
    (m) => m.exceededGeofence,
  ).length;
  const onlineCount = displayedMotorcycles.filter(
    (m) => String(m.trackerStatus || "").toLowerCase() === "online",
  ).length;
  const withGpsCount = displayedMotorcycles.filter((m) => m.location).length;

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <style>{`
        @keyframes pulse-red {
          0%, 100% { box-shadow: 0 0 0 0 rgba(181,0,2,0.5); }
          50%       { box-shadow: 0 0 0 10px rgba(181,0,2,0); }
        }
      `}</style>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pt-36">
        {/* Header — matches ManageMotorcycle header style */}
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight">
              GPS Tracking
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Live motorcycle tracking · refreshes every 30 seconds
            </p>
          </div>
          <div className="flex items-center gap-3">
            {exceededCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-[#b50002] text-xs font-black">
                <FaBell className="animate-bounce" />
                {exceededCount} {exceededCount === 1 ? "unit" : "units"}{" "}
                exceeded
              </div>
            )}
            <button
              onClick={() => (window.location.href = "/manage-motorcycles")}
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-all"
            >
              <FaArrowLeft className="text-xs" /> Back
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <StatCard
            label="Active Rentals"
            value={displayedMotorcycles.length}
            sub="Currently out"
            subColor="text-blue-500"
            icon={FaMotorcycle}
            accent="bg-blue-500"
            loading={loading}
          />
          <StatCard
            label="Online"
            value={onlineCount}
            sub="GPS transmitting"
            subColor="text-emerald-500"
            icon={FaSatelliteDish}
            accent="bg-emerald-500"
            loading={loading}
          />
          <StatCard
            label="With GPS"
            value={withGpsCount}
            sub="Location known"
            subColor="text-violet-500"
            icon={MapPin}
            accent="bg-violet-500"
            loading={loading}
          />
          <StatCard
            label="Exceeded"
            value={exceededCount}
            sub={exceededCount > 0 ? "Needs attention" : "All clear"}
            subColor={exceededCount > 0 ? "text-[#b50002]" : "text-slate-400"}
            icon={AlertTriangle}
            accent={exceededCount > 0 ? "bg-red-500" : "bg-slate-400"}
            loading={loading}
          />
        </div>

        {/* Main layout */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
          {/* Sidebar — 1/4 */}
          <div className="xl:col-span-1 flex flex-col gap-4">
            {/* Search */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="relative">
                <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 text-sm" />
                <input
                  type="text"
                  placeholder="Search name, unit, rider..."
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
              <p className="text-[10px] text-slate-400 mt-2 px-1">
                {filteredMotorcycles.length} of {displayedMotorcycles.length}{" "}
                units shown
              </p>
            </div>

            {/* Motorcycle list */}
            <div className="space-y-3 max-h-[calc(100vh-420px)] overflow-y-auto pr-0.5">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-2"
                  >
                    {[...Array(4)].map((_, j) => (
                      <div
                        key={j}
                        className="h-3 bg-slate-100 rounded-lg animate-pulse"
                        style={{ width: `${60 + j * 10}%` }}
                      />
                    ))}
                  </div>
                ))
              ) : filteredMotorcycles.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <FaMotorcycle className="text-slate-200 text-2xl" />
                  </div>
                  <p className="font-black text-[#171717] text-sm mb-1">
                    No active motorcycles
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Only units with active bookings are tracked
                  </p>
                </div>
              ) : (
                filteredMotorcycles.map((motorcycle) => (
                  <MotorcycleListItem
                    key={motorcycle._id}
                    motorcycle={motorcycle}
                    isSelected={selectedMotorcycle?._id === motorcycle._id}
                    onClick={() => centerOnMotorcycle(motorcycle)}
                  />
                ))
              )}
            </div>

            {/* Traccar live card */}
            <LiveTrackerCard
              tracker={liveTracker}
              loading={liveTrackerLoading}
              error={liveTrackerError}
              onRetry={handleLiveTrackerRefresh}
            />
          </div>

          {/* Map — 3/4 */}
          <div className="xl:col-span-3">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {/* Map toolbar */}
              <div className="px-5 py-4 flex items-center justify-between border-b border-slate-50">
                <div>
                  <h2 className="font-black text-[#171717] text-[14px]">
                    Live Map
                  </h2>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Click a unit to view full booking details
                  </p>
                </div>
                <div className="flex items-center gap-4 text-[11px] text-slate-400 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                    Within zone
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#b50002] inline-block" />
                    Exceeded
                  </span>
                  <span className="flex items-center gap-1">
                    <FaMapMarkerAlt className="text-[#b50002]" />
                    Bacoor, Cavite
                  </span>
                </div>
              </div>

              <div
                id="tracking-map"
                className="w-full"
                style={{ height: "calc(100vh - 320px)", minHeight: "500px" }}
              />
            </div>
          </div>
        </div>
      </div>

      {selectedMotorcycle && (
        <BookingDetailPanel
          motorcycle={selectedMotorcycle}
          onClose={() => setSelectedMotorcycle(null)}
        />
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
    </div>
  );
};

export default MotorcycleTracking;
