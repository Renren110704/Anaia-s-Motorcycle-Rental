import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  FaMotorcycle,
  FaMapMarkerAlt,
  FaTimes,
  FaSearch,
  FaArrowLeft,
  FaUser,
  FaIdBadge,
  FaBell,
  FaExclamationTriangle,
  FaCalendarAlt,
  FaCreditCard,
  FaMoneyBillWave,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
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
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const CITY_COORDINATES = {
  BACOOR: { lat: 14.4626, lng: 120.9516, radius: 8000 },
  IMUS: { lat: 14.4298, lng: 120.9373, radius: 7000 },
  KAWIT: { lat: 14.4394, lng: 120.9021, radius: 6000 },
  NOVELETA: { lat: 14.4312, lng: 120.8832, radius: 5000 },
  DASMARINAS: { lat: 14.3294, lng: 120.9367, radius: 8000 },
  "DASMARI\u00d1AS": { lat: 14.3294, lng: 120.9367, radius: 8000 },
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
  if (haversineDistance(lat, lng, dest.lat, dest.lng) <= dest.radius) return false;
  if (haversineDistance(lat, lng, ORIGIN.lat, ORIGIN.lng) <= 8000) return false;
  if (distanceToSegment(lat, lng, ORIGIN.lat, ORIGIN.lng, dest.lat, dest.lng) <= CORRIDOR_WIDTH) return false;
  return true;
};

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-US", {
    day: "numeric", month: "short", year: "numeric",
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

const persistLocationSnapshots = (units = [], liveTrackersByUnit = {}) => {
  try {
    const raw = localStorage.getItem(LOCATION_LOG_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const current = Array.isArray(parsed) ? parsed : Object.values(parsed || {});

    const map = new Map(
      current.map((entry) => [
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
        motorcycleName: `${m.make || ""} ${m.model || ""}`.trim() || "Unknown unit",
        customer: m.booking?.customer || "",
        status: m.status || "",
        lat: Number(m.location.lat),
        lng: Number(m.location.lng),
        locationText: `${Number(m.location.lat).toFixed(5)}, ${Number(m.location.lng).toFixed(5)}`,
        lastUpdatedAt: m.lastUpdate ? new Date(m.lastUpdate).toISOString() : new Date().toISOString(),
        source: "GPS Snapshot",
      };

      const prev = map.get(key);
      if (!prev) { map.set(key, snapshot); return; }
      const prevTime = new Date(prev.lastUpdatedAt || 0).getTime() || 0;
      const nextTime = new Date(snapshot.lastUpdatedAt || 0).getTime() || 0;
      if (nextTime >= prevTime) map.set(key, snapshot);
    });

    Object.entries(liveTrackersByUnit).forEach(([unitId, liveTracker]) => {
      if (!Number.isFinite(Number(liveTracker?.lat)) || !Number.isFinite(Number(liveTracker?.lng))) return;

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
        locationText: liveTracker.locationText || `${Number(liveTracker.lat).toFixed(5)}, ${Number(liveTracker.lng).toFixed(5)}`,
        resolvedLocation: liveTracker.resolvedLocation || liveTracker.locationText || "",
        lastUpdatedAt: liveTracker.lastUpdatedAt || new Date().toISOString(),
        source: liveTracker.source || "Traccar Live",
      };

      const prev = map.get(unitId);
      if (!prev) { map.set(unitId, snapshot); return; }
      const prevTime = new Date(prev.lastUpdatedAt || 0).getTime() || 0;
      const nextTime = new Date(snapshot.lastUpdatedAt || 0).getTime() || 0;
      if (nextTime >= prevTime) map.set(unitId, snapshot);
    });

    localStorage.setItem(LOCATION_LOG_STORAGE_KEY, JSON.stringify(Array.from(map.values())));

    const snapshots = Array.from(map.values());
    api.post("/api/tracking/snapshots/sync", { snapshots }).catch((err) => {
      console.warn("Failed to sync tracking snapshots to backend", err?.message || err);
    });
  } catch (err) {
    console.error("Failed to persist location snapshots", err);
  }
};

const BookingDetailPanel = ({ motorcycle, onClose }) => {
  const [collapsed, setCollapsed] = useState({});
  const toggle = (key) => setCollapsed((p) => ({ ...p, [key]: !p[key] }));

  const b = motorcycle.booking;
  const details = motorcycle.bookingDetails || {};
  const dailyRate = motorcycle.dailyRate || 0;
  const pickupDate = b.pickupDate ? new Date(b.pickupDate) : null;
  const returnDate = b.returnDate ? new Date(b.returnDate) : null;
  const days = pickupDate && returnDate ? Math.max(1, Math.ceil((returnDate - pickupDate) / 86400000)) : 1;
  const baseRental = dailyRate * days;
  const distanceFee = details.distanceFee || 0;
  const helmetFee = details.helmetFee || 0;
  const grossTotal = motorcycle.amount || 0;
  const downpayment = Number(details.downpayment) || Number(motorcycle.reservationFee) || DOWNPAYMENT;
  const dueAtPickup = Math.max(0, grossTotal - downpayment);

  const Section = ({ id, title, icon: Icon, children }) => (
    <div className="bg-[#d0d0d0] rounded-xl overflow-hidden shadow-sm">
      <button
        onClick={() => toggle(id)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#171717]/8 hover:bg-[#171717]/15 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-[#171717] uppercase tracking-wider">
          <Icon className="text-[#b50002]" /> {title}
        </span>
        {collapsed[id] ? (
          <FaChevronDown className="text-[#171717]/50 text-xs" />
        ) : (
          <FaChevronUp className="text-[#171717]/50 text-xs" />
        )}
      </button>
      {!collapsed[id] && <div className="px-4 py-3">{children}</div>}
    </div>
  );

  const Row = ({ label, value, accent }) => (
    <div className="flex items-start justify-between py-1.5 border-b border-[#171717]/8 last:border-0">
      <span className="text-[#171717]/60 text-xs">{label}</span>
      <span className={`text-xs font-semibold text-right max-w-[55%] ${accent || "text-[#171717]"}`}>
        {value}
      </span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[9990] flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-md bg-[#e3e3e3] h-full overflow-y-auto shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-[#171717] px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-base">{motorcycle.make} {motorcycle.model}</h2>
            {motorcycle.unitId && (
              <span className="text-[#b9b9b9] text-xs flex items-center gap-1 mt-0.5">
                <FaIdBadge className="text-[#b50002]" /> {motorcycle.unitId}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors">
            <FaTimes />
          </button>
        </div>

        {motorcycle.exceededGeofence && (
          <div className="mx-4 mt-4 flex items-center gap-2 bg-red-900/80 border border-red-500/50 rounded-xl px-4 py-3">
            <FaExclamationTriangle className="text-red-300 text-lg flex-shrink-0" />
            <div>
              <p className="text-white font-bold text-sm">Geofence Exceeded</p>
              <p className="text-red-200 text-xs">Unit is outside the primary destination zone</p>
            </div>
          </div>
        )}

        <div className="p-4 space-y-3 flex-1">
          <div className="grid grid-cols-1 gap-2">
            <div className="bg-[#d0d0d0] rounded-xl p-3 text-center shadow-sm">
              <p className="text-[#171717]/50 text-xs">Status</p>
              <p className="font-black text-sm mt-0.5 text-green-700">
                {String(motorcycle.trackerStatus || "active").toLowerCase() === "online"
                  ? "Online"
                  : String(motorcycle.trackerStatus || "active").toLowerCase() === "offline"
                    ? "Offline"
                    : motorcycle.exceededGeofence
                      ? "Exceeded"
                      : "Active"}
              </p>
            </div>
          </div>

          <Section id="customer" title="Customer" icon={FaUser}>
            <Row label="Name" value={b.customer} />
            <Row label="Email" value={b.email} />
            <Row label="Phone" value={b.phone || "-"} />
            {motorcycle.renterAddress && <Row label="Address" value={motorcycle.renterAddress} />}
          </Section>

          <Section id="dates" title="Booking Dates and Times" icon={FaCalendarAlt}>
            <Row label="Pickup" value={`${formatDate(b.pickupDate)} · ${formatTime(b.pickupTime)}`} />
            <Row label="Return" value={`${formatDate(b.returnDate)} · ${formatTime(b.returnTime)}`} />
            <Row label="Duration" value={`${days} ${days === 1 ? "day" : "days"}`} />
            <Row label="Destination" value={b.destination || "-"} />
            {details.destinationCity && <Row label="Destination City" value={details.destinationCity} />}
          </Section>

          <Section id="specs" title="Motorcycle Specs" icon={FaMotorcycle}>
            <Row label="Make / Model" value={`${motorcycle.make} ${motorcycle.model}`} />
            {motorcycle.unitId && <Row label="Unit ID" value={motorcycle.unitId} />}
            {motorcycle.year && <Row label="Year" value={motorcycle.year} />}
            {motorcycle.engineSize && <Row label="Engine" value={`${motorcycle.engineSize}cc`} />}
            {motorcycle.transmission && <Row label="Transmission" value={motorcycle.transmission} />}
            {motorcycle.fuelType && <Row label="Fuel Type" value={motorcycle.fuelType} />}
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
                accent="text-orange-700"
              />
            )}
            {details.helmetRequested && helmetFee > 0 && (
              <Row label="Additional Helmet" value={`+${formatPrice(helmetFee)}`} accent="text-[#b50002]" />
            )}
            <div className="flex items-center justify-between pt-2 mt-1 border-t border-[#171717]/15">
              <span className="text-xs font-bold text-[#171717]">Total</span>
              <span className="text-sm font-black text-[#171717]">{formatPrice(grossTotal)}</span>
            </div>
            <div className="flex items-center justify-between pt-1.5">
              <span className="text-xs text-[#171717]/60">Downpayment (paid)</span>
              <span className="text-xs font-semibold text-green-700">-{formatPrice(downpayment)}</span>
            </div>
            <div className="flex items-center justify-between pt-1.5 border-t border-[#171717]/15 mt-1">
              <span className="text-xs font-bold text-[#171717]">Due at Pickup</span>
              <span className="text-sm font-black text-[#b50002]">{formatPrice(dueAtPickup)}</span>
            </div>
          </Section>

          <Section id="payment" title="Payment" icon={FaCreditCard}>
            <Row label="Downpayment" value={`${formatPrice(downpayment)} - Paid`} accent="text-green-700" />
            <Row label="Due at Pickup" value={formatPrice(dueAtPickup)} accent="text-[#b50002]" />
            <Row label="Payment Method" value={motorcycle.reservationPaymentMethod || "-"} />
            <Row
              label="Payment Status"
              value={motorcycle.paymentStatus === "fully_paid" ? "Fully Paid" : "Downpayment Paid"}
              accent={motorcycle.paymentStatus === "fully_paid" ? "text-green-700" : "text-yellow-700"}
            />
          </Section>

          <p className="text-center text-[#171717]/40 text-xs pb-2">
            Last updated: {motorcycle.lastUpdate.toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>
  );
};

const MotorcycleTracking = () => {
  const [motorcycles, setMotorcycles] = useState([]);
  const [selectedMotorcycle, setSelectedMotorcycle] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [liveTrackersByUnit, setLiveTrackersByUnit] = useState({});
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const circlesRef = useRef({});

  const fetchMotorcycles = useCallback(async () => {
    try {
      const bookingsRes = await api.get("/api/motorcycle-bookings", {
        params: { limit: 200, status: "active" },
      });

      const bookingsData = Array.isArray(bookingsRes.data)
        ? bookingsRes.data
        : bookingsRes.data.data || bookingsRes.data.bookings || [];

      const activeBookings = bookingsData.filter((b) => b.status === "active" && !b.isDeleted);

      if (activeBookings.length === 0) {
        setMotorcycles([]);
        return;
      }

      const motorcyclePromises = activeBookings.map(async (booking) => {
        try {
          const motorcycleId = booking.motorcycle?.id || booking.motorcycle?._id;
          if (!motorcycleId) return null;

          const motorcycleRes = await api.get(`/api/motorcycles/${motorcycleId}`);
          const md = motorcycleRes.data?.data || motorcycleRes.data;
          const details = booking.details || {};
          const addr = booking.address || {};

          const renterAddress = [addr.barangay, addr.city, addr.state, addr.region, addr.zipCode]
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
            transmission: md.transmission || booking.motorcycle?.transmission || "",
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
    }
  }, []);

  const fetchLiveTrackers = useCallback(async ({ force = false } = {}) => {
    try {
      const bookingsRes = await api.get("/api/motorcycle-bookings", {
        params: { limit: 200, status: "active" },
      });
      const bookingsData = Array.isArray(bookingsRes.data)
        ? bookingsRes.data
        : bookingsRes.data.data || bookingsRes.data.bookings || [];
      const activeBookings = bookingsData.filter((b) => b.status === "active" && !b.isDeleted);

      const trackerMap = {};

      await Promise.all(
        activeBookings.map(async (booking) => {
          const motorcycleId = booking.motorcycle?.id || booking.motorcycle?._id;
          const unitId = booking.motorcycle?.unitId || "";
          if (!motorcycleId || !unitId) return;

          try {
            const motorcycleRes = await api.get(`/api/motorcycles/${motorcycleId}`);
            const md = motorcycleRes.data?.data || motorcycleRes.data;
            const traccarDeviceId = md?.traccarDeviceId?.trim() || "";
            if (!traccarDeviceId) return;

            const res = await api.get("/api/tracking/live", {
              params: { force: force ? "true" : "false", deviceId: traccarDeviceId },
            });
            const snapshot = res?.data?.data || null;
            if (snapshot) {
              trackerMap[unitId] = snapshot;
            }
          } catch (err) {
            console.warn(`Failed to fetch tracker for ${unitId}:`, err.message);
          }
        })
      );

      setLiveTrackersByUnit(trackerMap);
    } catch (err) {
      console.warn("Failed to fetch live trackers", err?.message || err);
    }
  }, []);

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

    const map = L.map("tracking-map", { center: [14.4626, 120.9516], zoom: 13 });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
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
      const markerColor = exceeded ? "#ef4444" : "#10b981";

      const dest = resolveDestinationCoords(motorcycle.booking.destination);
      if (dest) {
        const circle = L.circle([dest.lat, dest.lng], {
          radius: dest.radius,
          color: exceeded ? "#ef4444" : "#10b981",
          fillColor: exceeded ? "#ef4444" : "#10b981",
          fillOpacity: 0.07,
          weight: 1.5,
          dashArray: "6 4",
        }).addTo(mapRef.current);
        circlesRef.current[`${motorcycle._id}-circle`] = circle;
      }

      const customIcon = L.divIcon({
        className: "custom-marker",
        html: `
          <div style="
            background-color: ${markerColor};
            width: 34px; height: 34px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 12px rgba(0,0,0,0.35);
            display: flex; align-items: center; justify-content: center;
            ${exceeded ? "animation: pulse-red 1.2s infinite;" : ""}
          ">
            <svg style="width: 17px; height: 17px; fill: white;" viewBox="0 0 24 24">
              <path d="M21,6H3A1,1,0,0,0,2,7v4a1,1,0,0,0,.78.97L5,12.67V15a1,1,0,0,0,1,1H7a1,1,0,0,0,1-1v-2h8v2a1,1,0,0,0,1,1h1a1,1,0,0,0,1-1V12.67l2.22-.7A1,1,0,0,0,22,11V7A1,1,0,0,0,21,6Z"/>
            </svg>
          </div>
          ${exceeded ? `<div style="position:absolute;top:-22px;left:50%;transform:translateX(-50%);background:#ef4444;color:white;font-size:9px;font-weight:700;padding:2px 6px;border-radius:6px;white-space:nowrap;">EXCEEDED</div>` : ""}
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      const marker = L.marker([motorcycle.location.lat, motorcycle.location.lng], { icon: customIcon })
        .addTo(mapRef.current);

      const unitLine = motorcycle.unitId
        ? `<p style="margin:3px 0;font-size:11px;"><b>Unit:</b> ${motorcycle.unitId}</p>`
        : "";
      const exceededBadge = exceeded
        ? `<p style="margin:4px 0;color:#ef4444;font-weight:700;font-size:11px;">EXCEEDED DESTINATION</p>`
        : "";

      marker.bindPopup(`
        <div style="color:#111;padding:8px;min-width:200px;font-family:sans-serif;">
          <h3 style="margin:0 0 6px;font-weight:700;font-size:15px;">${motorcycle.make} ${motorcycle.model}</h3>
          ${unitLine}
          ${exceededBadge}
          <p style="margin:3px 0;font-size:12px;"><b>Rented by:</b> ${motorcycle.booking.customer}</p>
          <p style="margin:3px 0;font-size:12px;"><b>Destination:</b> ${motorcycle.booking.destination}</p>
          <p style="margin:3px 0;font-size:11px;color:#666;"><b>Updated:</b> ${motorcycle.lastUpdate.toLocaleTimeString()}</p>
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
      mapRef.current.setView([motorcycle.location.lat, motorcycle.location.lng], 15);
      setSelectedMotorcycle(motorcycle);
      if (markersRef.current[motorcycle._id]) {
        markersRef.current[motorcycle._id].openPopup();
      }
    }
  };

  const exceededCount = displayedMotorcycles.filter((m) => m.exceededGeofence).length;

  return (
    <div className="min-h-screen pt-16 bg-[#e3e3e3]">
      <style>{`
        @keyframes pulse-red {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.6); }
          50%       { box-shadow: 0 0 0 10px rgba(239,68,68,0); }
        }
      `}</style>

      <div className="pt-20 px-4 sm:px-6 lg:px-8 pb-8">
        <div className="flex flex-wrap items-center gap-4 mb-6">

          <button
            onClick={() => window.location.href = "/manage-motorcycles"}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#b9b9b9] text-[#171717] shadow-lg shadow-black/20 hover:bg-[#a8a8a8] hover:scale-[1.02] transition-all text-sm font-medium"
          >
            <FaArrowLeft className="text-xs" /> Back
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-3xl sm:text-4xl font-bold bg-[#b50002] bg-clip-text text-transparent py-2">
              GPS Tracking
            </h1>
            <p className="text-[#171717]/50 text-sm mt-0.5">
              Live motorcycle tracking · refreshes every 30 seconds
            </p>
          </div>
          <div className="flex items-center gap-2">
            {exceededCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-2 bg-red-900/20 border border-red-500/40 rounded-xl text-red-800 text-sm font-bold">
                <FaBell className="text-red-600 animate-bounce" />
                {exceededCount} Exceeded
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          <div className="lg:col-span-1 flex flex-col gap-3">
            <div className="flex">
              <div className="bg-[#b9b9b9] rounded-2xl p-4 shadow-lg shadow-black/20 flex items-center justify-between gap-10 w-fit min-w-[370px]">
                <div>
                  <p className="text-[#171717]/60 text-xs font-bold uppercase tracking-wider">Active Rentals</p>
                  <p className="text-xl font-black mt-0.5 text-[#171717]">{displayedMotorcycles.length}</p>
                </div>
                <FaMotorcycle className="text-2xl text-[#171717]/20" />
              </div>
            </div>

            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#171717]/40 text-sm" />
              <input
                type="text"
                placeholder="Search name, unit, rider..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-[#b9b9b9] rounded-xl text-[#171717] text-sm placeholder-[#171717]/40 focus:outline-none focus:ring-1 focus:ring-[#171717] shadow-lg shadow-black/20"
              />
            </div>

            <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto pr-0.5">
              {filteredMotorcycles.length === 0 ? (
                <div className="bg-[#b9b9b9] rounded-2xl p-8 text-center shadow-lg shadow-black/20">
                  <FaMotorcycle className="mx-auto text-4xl text-[#171717]/30 mb-3" />
                  <p className="font-bold text-[#171717] text-sm">No active motorcycles</p>
                  <p className="text-xs text-[#171717]/50 mt-1">Only units with active bookings are tracked</p>
                </div>
              ) : (
                filteredMotorcycles.map((motorcycle) => {
                  const isSelected = selectedMotorcycle?._id === motorcycle._id;
                  const exceeded = motorcycle.exceededGeofence;
                  return (
                    <div
                      key={motorcycle._id}
                      onClick={() => centerOnMotorcycle(motorcycle)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all shadow-lg shadow-black/20 ${exceeded
                          ? "border-red-500/60 bg-red-50/80"
                          : isSelected
                            ? "border-[#171717] bg-[#c7c5c5]"
                            : "border-[#c7c5c5] bg-[#c7c5c5] hover:border-[#171717]"
                        }`}
                    >
                      <div className="flex items-start justify-between mb-1.5">
                        <div>
                          <p className="font-bold text-[#171717] text-sm leading-tight">
                            {motorcycle.make} {motorcycle.model}
                          </p>
                          {motorcycle.unitId && (
                            <span className="inline-flex items-center gap-1 mt-0.5 text-xs font-semibold text-[#171717]/60">
                              <FaIdBadge className="text-[#b50002] text-xs" />
                              {motorcycle.unitId}
                            </span>
                          )}
                        </div>
                        <span className={`px-2 py-0.5 text-xs rounded-full font-bold flex-shrink-0 ml-1 ${motorcycle.trackerStatus
                            ? String(motorcycle.trackerStatus).toLowerCase() === "online"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                            : exceeded
                              ? "bg-red-200 text-red-800"
                              : "bg-green-100 text-green-800"
                          }`}>
                          {motorcycle.trackerStatus
                            ? String(motorcycle.trackerStatus).toLowerCase() === "online"
                              ? "Online"
                              : "Offline"
                            : exceeded
                              ? "Exceeded"
                              : "Active"}
                        </span>
                      </div>
                      <p className="text-xs text-[#171717]/60 mb-1.5 truncate">{motorcycle.booking.customer}</p>
                      <p className="text-xs text-[#171717]/60 mb-2 truncate">{motorcycle.booking.destination}</p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#171717]/40">
                          {motorcycle.lastUpdate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="bg-[#b9b9b9] rounded-2xl p-4 shadow-lg shadow-black/20">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-[#171717]">Live Map</h2>
                <div className="flex items-center gap-4 text-xs text-[#171717]/60">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
                    Within zone
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
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
                className="w-full rounded-xl overflow-hidden"
                style={{ height: "calc(100vh - 320px)", minHeight: "480px" }}
              />

              <p className="text-xs text-[#171717]/40 mt-2 text-center">
                Click a motorcycle on the map or sidebar to view full booking details
              </p>
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
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        theme="colored"
        icon={false}
        toastClassName="relative flex items-center"
      />
    </div>
  );
};

export default MotorcycleTracking;