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
} from "react-icons/fa";
import { GiFullMotorcycleHelmet } from "react-icons/gi";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";
import API_BASE_URL from "../apiBase";

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

const getAvailablePickupSlots = (forDate = todayISO()) => {
  if (forDate !== todayISO()) return ALL_TIME_SLOTS;
  const now = new Date();
  const cutoff = now.getHours() * 60 + now.getMinutes() + 30;
  return ALL_TIME_SLOTS.filter((s) => {
    const [h] = s.value.split(":").map(Number);
    return h * 60 > cutoff;
  });
};

const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const todayISO = () => formatLocalDate(new Date());
const getTodayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const formatDate = (date) => formatLocalDate(date);

const sixMonthsFromToday = () => {
  const d = getTodayStart();
  d.setMonth(d.getMonth() + 6);
  return d;
};

const sevenDaysFromToday = () => {
  const d = getTodayStart();
  d.setDate(d.getDate() + 7);
  return d;
};

const addDaysToISODate = (dateISO, days) => {
  const d = new Date(dateISO || todayISO());
  d.setDate(d.getDate() + days);
  return formatLocalDate(d);
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

const CLOUDINARY_BASE = "https://res.cloudinary.com/"; // Adjust if you have a specific Cloudinary subdomain
const CLOUDINARY_CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
const normalizeLocalUploadPath = (pathValue) => {
  const cleaned = String(pathValue || "").trim().replace(/^\/+/, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("uploads/")) return `${API_BASE}/${cleaned}`;
  return `${API_BASE}/uploads/${cleaned}`;
};
const buildImageSrc = (image) => {
  if (!image) return `${API_BASE}/uploads/default-motorcycle.png`;
  if (Array.isArray(image)) image = image[0];
  if (!image || typeof image !== "string")
    return `${API_BASE}/uploads/default-motorcycle.png`;
  const t = image.trim();
  if (!t) return `${API_BASE}/uploads/default-motorcycle.png`;
  if (/^data:image\//i.test(t)) return t;
  // If it's already a full URL (including Cloudinary), return it as-is
  if (/^https?:\/\//i.test(t)) return t;
  // Check if it's a Cloudinary path without https (with or without leading slash)
  if (t.startsWith("res.cloudinary.com/")) {
    return "https://" + t;
  }
  // Check if it's a Cloudinary path (starts with /dxta0nmdy/ or dxta0nmdy/)
  if (t.startsWith("/dxta0nmdy/") || t.startsWith("dxta0nmdy/")) {
    return "https://res.cloudinary.com/" + t.replace(/^\/+/, "");
  }
  // If already starts with https for local uploads, return as-is
  if (t.startsWith("https://motorcycle-rental-system-04-11-26-dula.onrender.com/uploads/")) {
    return t;
  }
  // Handle local uploads path
  if (t.startsWith("local/")) {
    const filename = t.replace("local/", "");
    return `https://motorcycle-rental-system-04-11-26-dula.onrender.com/uploads/${filename}`;
  }
  // Assume it's a Cloudinary public ID
  if (CLOUDINARY_CLOUD_NAME && t) {
    return `${CLOUDINARY_BASE}${CLOUDINARY_CLOUD_NAME}/image/upload/${t}`;
  }
  // Fallback: treat as filename from backend uploads
  return `https://motorcycle-rental-system-04-11-26-dula.onrender.com/uploads/${t}`;
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

const inputCls =
  "w-full pl-10 pr-4 py-2.5 bg-transparent text-[#171717] text-sm placeholder-[#171717]/40 focus:outline-none rounded-xl";
const selectCls =
  "w-full pl-10 pr-8 py-2.5 bg-transparent text-[#171717] text-sm focus:outline-none rounded-xl appearance-none disabled:opacity-50";

const Field = ({ icon: Icon, children, label, hint }) => (
  <div className="flex flex-col gap-1">
    {label && (
      <label className="text-[#171717]/70 text-xs font-semibold uppercase tracking-wider">
        {label}
      </label>
    )}
    <div className="relative flex items-center bg-white/60 border border-[#171717]/10 rounded-xl shadow-sm focus-within:border-black transition-all hover:bg-white/90">
      {Icon && (
        <Icon className="absolute left-3.5 text-[#b50002] text-sm pointer-events-none" />
      )}
      {children}
    </div>
    {hint && <p className="text-xs text-[#171717]/40 mt-0.5">{hint}</p>}
  </div>
);

// ── Alert Modal ───────────────────────────────────────────────────────────────
const AlertModal = ({ message, onClose, isError, title }) => (
  <div
    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
    onClick={onClose}
  >
    <div
      className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-14 w-14 bg-[#b50002]/10 rounded-2xl mb-3">
          {isError ? (
            <FaExclamationTriangle className="h-6 w-6 text-[#b50002]" />
          ) : (
            <FaInfoCircle className="h-6 w-6 text-[#171717]" />
          )}
        </div>
        <h3 className="text-lg font-black text-[#171717] mb-2">
          {title ?? (isError ? "Error" : "Notice")}
        </h3>
        <p className="text-[#171717]/70 text-sm mb-5">{message}</p>
        <button
          onClick={onClose}
          className="w-full py-2.5 px-4 bg-[#b50002] hover:brightness-110 active:scale-[0.98] rounded-xl text-white font-bold text-sm transition-all"
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

// ── Active Booking Block Modal ────────────────────────────────────────────────
const ActiveBookingBlockModal = ({
  existingBooking,
  onClose,
  onViewBookings,
}) => (
  <div
    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
    onClick={onClose}
  >
    <div
      className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-14 w-14 bg-[#b50002]/10 rounded-2xl mb-3">
          <FaMotorcycle className="h-6 w-6 text-[#b50002]" />
        </div>
        <h3 className="text-lg font-black text-[#171717] mb-2">
          Active Booking Exists
        </h3>
        <p className="text-[#171717]/70 text-sm mb-2">
          You already have an active booking for{" "}
          <span className="font-semibold text-[#b50002]">
            {existingBooking?.motorcycle || "a motorcycle"}
          </span>
          .
        </p>
        <p className="text-xs text-[#171717]/50 mb-5">
          Only one motorcycle can be rented per account at a time.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 items-center gap-2 px-6 py-3 bg-[#b50002] text-white font-bold text-sm rounded-xl shadow-lg shadow-[#b5002]/30 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
          >
            Close
          </button>
          <button
            onClick={onViewBookings}
            className="flex-1 items-center gap-2 px-6 py-3 bg-[#171717] text-white font-bold text-sm rounded-xl shadow-lg shadow-[#171717]/30 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
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
    const cleanup = (goToBookings) => {
      root.unmount();
      document.body.removeChild(container);
      if (goToBookings) navigate("/bookings");
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

// ── Booking Success Modal ─────────────────────────────────────────────────────
const BookingSuccessModal = ({ booking, onClose }) => {
  if (!booking) return null;
  const dueAtPickup = booking.totalAmount - DOWNPAYMENT;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="bg-gradient-to-br from-[#171717] via-[#171717] to-[#b50002]/80 p-6 text-white text-center">
          <div className="w-14 h-14 bg-green-600/30 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <FaCheckCircle className="text-3xl text-green-500" />
          </div>
          <h2 className="text-xl font-black">Reservation Submitted!</h2>
          <p className="text-white/70 text-sm mt-1">
            Payment proof uploaded and waiting for admin verification
          </p>
        </div>
        <div className="p-5 space-y-3">
          <div className="bg-[#f4f3f3] rounded-2xl p-4 space-y-2 text-sm">
            {[
              ["Motorcycle", booking.motorcycleName],
              ["Pickup Date", booking.pickupDate],
              ["Return Date", booking.returnDate],
              ["Destination", booking.destination],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-[#171717]/50">{k}</span>
                <span className="font-semibold text-[#171717] text-right max-w-[55%]">
                  {v}
                </span>
              </div>
            ))}
            <div className="border-t border-[#171717]/10 pt-2 mt-1" />
            <div className="flex justify-between">
              <span className="text-[#171717]/50">
                ₱{booking.dailyRate} × {booking.days} day
                {booking.days !== 1 ? "s" : ""}
              </span>
              <span className="font-semibold text-[#171717]">
                ₱{booking.baseRental}
              </span>
            </div>
            {booking.helmetIncluded && (
              <div className="flex justify-between">
                <span className="text-[#171717]/50">Extra Helmet</span>
                <span className="font-semibold text-[#b50002]">
                  +₱{HELMET_FEE}
                </span>
              </div>
            )}
            {booking.distanceFee > 0 && (
              <div className="flex justify-between">
                <span className="text-[#171717]/50">Distance Fee</span>
                <span className="font-semibold text-[#b50002]">
                  +₱{booking.distanceFee}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t border-[#171717]/10 pt-2 mt-1">
              <span className="text-[#171717]/50 font-semibold">Total</span>
              <span className="font-semibold text-[#171717]">
                ₱{booking.totalAmount}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#171717]/50 font-semibold">
                Downpayment Paid
              </span>
              <span className="font-bold text-green-600">−₱{DOWNPAYMENT}</span>
            </div>
            <div className="border-t border-[#171717]/10 pt-2 mt-1 flex justify-between">
              <span className="text-[#171717]/50 font-semibold">
                Due at Pickup
              </span>
              <span className="font-black text-[#171717] text-base">
                ₱{dueAtPickup}
              </span>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2 text-xs text-amber-800">
            <FaInfoCircle className="mt-0.5 flex-shrink-0" />
            <span>
              Status is now Pending Reservation. Once approved, you can proceed
              to pickup and full payment.
            </span>
          </div>
          <div className="bg-[#f4f3f3] rounded-xl p-3 text-xs text-[#171717]/60">
            <p className="font-semibold mb-0.5">📍 Pickup Location:</p>
            <p>{PICKUP_LOCATION}</p>
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 items-center gap-2 px-6 py-3 bg-[#b50002] text-white font-bold text-sm rounded-xl shadow-lg shadow-[#b5002]/30 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
          >
            Close
          </button>
          <button
            onClick={() => {
              onClose();
              window.location.href = "/bookings";
            }}
            className="flex-1 items-center gap-2 px-6 py-3 bg-[#171717] text-white font-bold text-sm rounded-xl shadow-lg shadow-[#171717]/30 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
          >
            My Bookings
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Destination Address selector ──────────────────────────────────────────────
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
        /* silent */
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
          /* silent */
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
        /* silent */
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
      /* silent */
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
      /* silent */
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
    const code = e.target.value;
    const name = regions.find((r) => r.code === code)?.name || "";
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
    const code = e.target.value;
    const name = provinces.find((p) => p.code === code)?.name || "";
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
    const code = e.target.value;
    const name = cities.find((c) => c.code === code)?.name || "";
    setSel((prev) => ({
      ...prev,
      cityCode: code,
      cityName: name,
      barangayCode: "",
      barangayName: "",
    }));
    fetchBarangays(code);
    const dest = [name, sel.provinceName, sel.regionName]
      .filter(Boolean)
      .join(", ");
    onChange(dest, name);
  };
  const handleBarangay = (e) => {
    const code = e.target.value;
    const name = barangays.find((b) => b.code === code)?.name || "";
    setSel((prev) => ({ ...prev, barangayCode: code, barangayName: name }));
    const dest = [name, sel.cityName, sel.provinceName, sel.regionName]
      .filter(Boolean)
      .join(", ");
    onChange(dest, sel.cityName);
  };

  return (
    <div className="space-y-2">
      <div className="relative flex items-center bg-white/60 border border-[#171717]/10 rounded-xl shadow-sm focus-within:border-black transition-all hover:bg-white/90">
        <FaMapMarkerAlt className="absolute left-3.5 text-[#b50002] text-sm pointer-events-none" />
        <select
          value={sel.regionCode}
          onChange={handleRegion}
          disabled={loadingState.regions}
          required
          className={selectCls}
        >
          <option value="">
            {loadingState.regions ? "Loading regions…" : "Select Region *"}
          </option>
          {regions.map((r) => (
            <option key={r.code} value={r.code}>
              {r.name}
            </option>
          ))}
        </select>
        <FaChevronDown className="absolute right-3 text-[#171717]/40 text-xs pointer-events-none" />
      </div>

      {sel.regionCode && hasProvinces && (
        <div className="relative flex items-center bg-white/60 border border-[#171717]/10 rounded-xl shadow-sm focus-within:border-black transition-all hover:bg-white/90">
          <FaMapMarkerAlt className="absolute left-3.5 text-[#b50002] text-sm pointer-events-none" />
          <select
            value={sel.provinceCode}
            onChange={handleProvince}
            disabled={loadingState.provinces}
            className={selectCls}
          >
            <option value="">
              {loadingState.provinces
                ? "Loading provinces…"
                : "Select Province *"}
            </option>
            {provinces.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
          </select>
          <FaChevronDown className="absolute right-3 text-[#171717]/40 text-xs pointer-events-none" />
        </div>
      )}

      {sel.regionCode && (
        <div className="relative flex items-center bg-white/60 border border-[#171717]/10 rounded-xl shadow-sm focus-within:border-black transition-all hover:bg-white/90">
          <FaMapMarkerAlt className="absolute left-3.5 text-[#b50002] text-sm pointer-events-none" />
          <select
            value={sel.cityCode}
            onChange={handleCity}
            disabled={
              loadingState.cities ||
              (hasProvinces ? !sel.provinceCode : !sel.regionCode)
            }
            className={selectCls}
          >
            <option value="">
              {loadingState.cities
                ? "Loading cities…"
                : hasProvinces && !sel.provinceCode
                  ? "Select a province first"
                  : "Select City / Municipality *"}
            </option>
            {cities.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
          <FaChevronDown className="absolute right-3 text-[#171717]/40 text-xs pointer-events-none" />
        </div>
      )}

      {sel.cityCode && (
        <div className="relative flex items-center bg-white/60 border border-[#171717]/10 rounded-xl shadow-sm focus-within:border-black transition-all hover:bg-white/90">
          <FaMapMarkerAlt className="absolute left-3.5 text-[#b50002] text-sm pointer-events-none" />
          <select
            value={sel.barangayCode}
            onChange={handleBarangay}
            disabled={loadingState.barangays}
            className={selectCls}
          >
            <option value="">
              {loadingState.barangays
                ? "Loading barangays…"
                : "Select Barangay (optional)"}
            </option>
            {barangays.map((b) => (
              <option key={b.code} value={b.code}>
                {b.name}
              </option>
            ))}
          </select>
          <FaChevronDown className="absolute right-3 text-[#171717]/40 text-xs pointer-events-none" />
        </div>
      )}

      {value && (
        <p className="text-xs text-[#171717] flex items-center gap-1.5 px-4">
          <FaCheckCircle className="flex-shrink-0 text-[#b50002] mr-2" />{" "}
          {value}
        </p>
      )}
    </div>
  );
};

// ── Step indicator ────────────────────────────────────────────────────────────
const StepIndicator = ({ step }) => {
  const steps = ["Schedule", "Your Info", "Review & Pay"];
  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((label, i) => {
        const s = i + 1;
        const active = s === step;
        const done = s < step;
        return (
          <React.Fragment key={s}>
            <div className="flex items-center gap-1.5">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300 ${active ? "bg-[#b50002] text-white shadow-md shadow-[#b50002]/30" : done ? "bg-[#171717] text-white" : "bg-[#171717]/10 text-[#171717]/40"}`}
              >
                {done ? <FaCheckCircle className="text-xs" /> : s}
              </div>
              <span
                className={`text-xs font-bold transition-all hidden sm:inline ${active ? "text-[#b50002]" : done ? "text-[#171717]" : "text-[#171717]/40"}`}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 rounded-full transition-all duration-300 ${done ? "bg-[#171717]" : "bg-[#171717]/10"}`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ── Review row ────────────────────────────────────────────────────────────────
const ReviewRow = ({ label, value, accent, deduct }) => (
  <div className="flex items-start justify-between py-2.5 border-b border-[#171717]/8 last:border-0 gap-4">
    <span className="text-xs text-[#171717]/50 font-semibold uppercase tracking-wider flex-shrink-0">
      {label}
    </span>
    <span
      className={`text-sm font-bold text-right ${deduct ? "text-green-600" : accent ? "text-[#b50002]" : "text-[#171717]"}`}
    >
      {value}
    </span>
  </div>
);

// ── Price Summary component ───────────────────────────────────────────────────
const PriceSummary = ({
  price,
  days,
  baseRental,
  distanceFee,
  helmetFee,
  totalAmount,
}) => {
  const dueAtPickup = totalAmount - DOWNPAYMENT;
  return (
    <div className="bg-white/60 border border-[#171717]/8 rounded-2xl p-4">
      <p className="text-xs font-black text-[#171717]/40 uppercase tracking-widest mb-2">
        Price Summary
      </p>
      <ReviewRow label="Rate / day" value={`₱${price}`} />
      <ReviewRow label="Days" value={days} />
      <ReviewRow label="Rental Subtotal" value={`₱${baseRental}`} />
      {distanceFee > 0 && (
        <ReviewRow label="Distance Fee" value={`+₱${distanceFee}`} accent />
      )}
      {helmetFee > 0 && (
        <ReviewRow label="Extra Helmet" value={`+₱${HELMET_FEE}`} accent />
      )}
      <div className="pt-2 mt-1 border-t border-[#171717]/10 flex items-center justify-between">
        <span className="text-xs font-black text-[#171717] uppercase tracking-wider">
          Total
        </span>
        <span className="text-base font-black text-[#171717]">
          ₱{totalAmount}
        </span>
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs font-semibold text-[#171717]/50 uppercase tracking-wider">
          Downpayment (Reservation Fee)
        </span>
        <span className="text-sm font-bold text-green-600">
          −₱{DOWNPAYMENT}
        </span>
      </div>
      <div className="flex items-center justify-between mt-1 pt-1 border-t border-[#171717]/10">
        <span className="text-xs font-black text-[#171717] uppercase tracking-wider">
          Due at Pickup
        </span>
        <span className="text-lg font-black text-[#b50002]">
          ₱{dueAtPickup}
        </span>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
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
  const [checkoutLock, setCheckoutLock] = useState({
    expiresAt: "",
    lockMinutes: CHECKOUT_LOCK_FALLBACK_MINUTES,
  });
  const [lockSecondsLeft, setLockSecondsLeft] = useState(null);

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
        if (!silent) {
          toast.error("Failed to release checkout session. Please retry.");
        }
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
      const lockExpiresAt = res.data?.lockExpiresAt || "";
      const lockMinutes =
        Number(res.data?.lockMinutes) || CHECKOUT_LOCK_FALLBACK_MINUTES;
      setCheckoutLock({ expiresAt: lockExpiresAt, lockMinutes });
      return true;
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        "This motorcycle is currently being rented by someone else.";
      const code = err?.response?.data?.code;
      if (code === "MOTORCYCLE_LOCKED") {
        await alertModal(msg, {
          isError: true,
          title: "Motorcycle Unavailable",
        });
      } else {
        toast.error(msg);
      }
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
      const remainingMs = new Date(checkoutLock.expiresAt).getTime() - Date.now();
      const remaining = Math.max(0, Math.floor(remainingMs / 1000));
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
        toast.error("Checkout session expired. Please start again from Step 1.");
      }
    };

    tick();
    lockTimerRef.current = setInterval(tick, 1000);

    return () => clearLockTimer();
  }, [bookingStep, checkoutLock.expiresAt, clearLockTimer, releaseCheckoutLock]);

  useEffect(() => {
    return () => {
      clearLockTimer();
      if (checkoutLock.expiresAt) {
        releaseCheckoutLock(true);
      }
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
          const u = res.data.user;
          const addr = u.address || {};
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
        /* silent */
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

  if (!motorcycle && loadingMotorcycle)
    return (
      <div className="min-h-screen bg-[#e8e8e8] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#171717]">
          <div className="w-5 h-5 border-2 border-[#b50002] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Loading motorcycle…</span>
        </div>
      </div>
    );
  if (!motorcycle && motorcycleError)
    return (
      <div className="min-h-screen bg-[#e8e8e8] flex items-center justify-center">
        <p className="text-[#b50002] font-semibold">{motorcycleError}</p>
      </div>
    );
  if (!motorcycle)
    return (
      <div className="min-h-screen bg-[#e8e8e8] flex items-center justify-center">
        <p className="text-[#171717]/50">Motorcycle not found.</p>
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
  const days = calculateDays(formData.pickupDate, formData.returnDate);
  const {
    fee: distanceFee,
    tier: distanceTier,
    km: distanceKm,
    isEstimate,
  } = getDistanceFee(formData.destinationCity);
  const helmetFee = formData.wantsHelmet ? HELMET_FEE : 0;
  const baseRental = days * price;
  const totalAmount = baseRental + distanceFee + helmetFee;
  const dueAtPickup = totalAmount - DOWNPAYMENT;

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "zipCode") {
      const n = value.replace(/\D/g, "");
      if (n.length > 4) return;
      setFormData((p) => ({ ...p, zipCode: n }));
      return;
    }

    if (name === "pickupDate") {
      const selected = new Date(value);
      const todayStart = getTodayStart();
      const maxDate = sevenDaysFromToday();
      if (isNaN(selected.getTime())) return;
      if (selected < todayStart) {
        toast.error("Pickup date cannot be in the past");
        return;
      }
      if (selected > maxDate) {
        toast.error("Pickup must be within the next 7 days");
        return;
      }
      const newReturnDate =
        formData.returnDate && new Date(formData.returnDate) <= selected
          ? ""
          : formData.returnDate;
      const freshSlots = getAvailablePickupSlots(value);
      const newPickupTime =
        freshSlots.length > 0 ? freshSlots[0].value : "08:00";
      setFormData((p) => ({
        ...p,
        pickupDate: value,
        pickupTime: newPickupTime,
        returnDate: newReturnDate,
      }));
      return;
    }

    if (name === "returnDate") {
      if (value === "") {
        setFormData((p) => ({ ...p, returnDate: "" }));
        return;
      }
      const selected = new Date(value);
      const todayStart = getTodayStart();
      const maxDate = sixMonthsFromToday();
      if (isNaN(selected.getTime())) return;
      if (selected < todayStart) {
        toast.error("Return date cannot be in the past");
        return;
      }
      if (selected > maxDate) {
        toast.error("Date must be within 6 months from today");
        return;
      }
      if (selected <= new Date(formData.pickupDate)) {
        toast.error("Minimum rental duration is 24 hours.");
        return;
      }
      setFormData((p) => ({ ...p, returnDate: value }));
      return;
    }

    if (name === "returnTime") {
      setFormData((p) => ({ ...p, returnTime: value }));
      return;
    }

    if (name === "pickupTime") {
      setFormData((p) => ({ ...p, pickupTime: value }));
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
      const file = e.target.files?.[0] || null;
      setFormData((p) => ({ ...p, paymentProofImage: file }));
      return;
    }

    setFormData((p) => ({ ...p, [name]: value }));
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
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user") || "null");
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

  // ── Step 1 validation ─────────────────────────────────────────────────────
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
    const returnAt = parseLocalDateTime(formData.returnDate, formData.returnTime);
    if (!pickupAt || !returnAt) {
      toast.error("Please select valid pickup and return schedule.");
      return;
    }

    const minDurationMs = 24 * 60 * 60 * 1000;
    if (returnAt.getTime() - pickupAt.getTime() < minDurationMs) {
      toast.error("Minimum rental duration is 24 hours.");
      return;
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
    const safe = Math.max(0, Number(seconds) || 0);
    const mins = Math.floor(safe / 60)
      .toString()
      .padStart(2, "0");
    const secs = (safe % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  // ── Final submit ──────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (hasSubmittedRef.current || submitting) return;
    hasSubmittedRef.current = true;

    // Validate payment fields (now on Step 3)
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
      const user = JSON.parse(localStorage.getItem("user"));
      const token = localStorage.getItem("token");
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

      if (formData.paymentProofImage) {
        form.append("paymentProofImage", formData.paymentProofImage);
      }

      const headers = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      await api.post(`/api/motorcycle-bookings`, form, {
        headers,
        signal: controller.signal,
      });
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
      const lockCode = err?.response?.data?.code;
      if (lockCode === "LOCK_REQUIRED" || lockCode === "MOTORCYCLE_LOCKED") {
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

  return (
    <div className="min-h-screen bg-[#e3e3e3] ">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        theme="colored"
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

      <div className="max-w-7xl mx-auto px-4 pt-12 pb-16">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-[#171717]/50 hover:text-[#b50002] text-sm font-medium transition-colors mb-6"
        >
          <FaArrowLeft className="text-xs" /> Back
        </button>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* ── LEFT — Motorcycle info ── */}
          <div className="w-full lg:w-[420px] flex-shrink-0 space-y-4 lg:top-24">
            <div className="bg-gradient-to-br from-[#171717] via-[#171717] to-[#b50002]/80 rounded-3xl overflow-hidden shadow-2xl shadow-black/30 relative">
              <div className="relative z-10 p-5">
                <div className="flex items-center gap-2 mb-3"></div>
              </div>

              <div className="relative">
                <img
                  src={buildImageSrc(
                    motorcycleImages[currentImage] ?? motorcycle.image,
                  )}
                  alt={motorcycle.name}
                  className="w-full h-64 object-cover"
                  onError={handleImageError}
                />
                {motorcycleImages.length > 1 && (
                  <>
                    <button
                      onClick={() =>
                        setCurrentImage((prev) =>
                          prev === 0 ? motorcycleImages.length - 1 : prev - 1,
                        )
                      }
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white transition-all"
                    >
                      <FaArrowLeft className="text-xs" />
                    </button>
                    <button
                      onClick={() =>
                        setCurrentImage((prev) =>
                          prev === motorcycleImages.length - 1 ? 0 : prev + 1,
                        )
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white transition-all"
                    >
                      <FaArrowRight className="text-xs" />
                    </button>
                    <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                      {motorcycleImages.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentImage(idx)}
                          className={`rounded-full transition-all duration-200 ${idx === currentImage ? "w-5 h-2 bg-white" : "w-2 h-2 bg-white/40"}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="p-5 pt-4">
                <h2 className="text-white font-black text-xl leading-tight">
                  {motorcycle.make} {motorcycle.model}
                </h2>
                <p className="text-white/60 text-sm mt-0.5">
                  {motorcycle.year}
                </p>
                <div className="mt-2 flex items-end gap-1">
                  <span className="text-white font-bold text-3xl">
                    ₱{price}
                  </span>
                  <span className="text-white/50 text-sm mb-0.5">/ day</span>
                </div>
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 border border-white/50 shadow-lg shadow-black/10">
              <h3 className="text-xs font-bold text-[#171717]/50 uppercase tracking-widest mb-4">
                Specifications
              </h3>
              <div className="grid grid-cols-2 gap-3">
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
                  <div
                    key={label}
                    className="bg-[#f4f3f3] rounded-xl p-3.5 flex flex-col gap-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="text-[#b50002] text-sm" />
                      <span className="text-[#171717]/50 text-xs font-semibold uppercase tracking-wider">
                        {label}
                      </span>
                    </div>
                    <span className="text-[#171717] font-bold text-base">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
              {motorcycle.description && (
                <p className="text-sm text-[#171717]/60 mt-4 leading-relaxed">
                  {motorcycle.description}
                </p>
              )}
            </div>
          </div>

          {/* ── RIGHT — Booking form panel ── */}
          <div className="flex-1 bg-[#f4f3f3] rounded-3xl shadow-lg shadow-black/10 overflow-hidden">
            <div className="bg-gradient-to-r from-[#171717] to-[#2a2a2a] px-6 py-4">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <h1 className="text-white font-black text-base tracking-tight">
                    Reserve Your Ride
                  </h1>
                  <p className="text-white/50 text-xs mt-0.5">
                    Pay ₱{DOWNPAYMENT} downpayment to secure your booking
                  </p>
                </div>
                <div className="bg-[#b50002] text-white text-xs font-black px-3 py-1.5 rounded-xl">
                  Step {bookingStep} / 3
                </div>
              </div>
            </div>

            <div className="p-6">
              <StepIndicator step={bookingStep} />

              {/* ── STEP 1 — Schedule & Destination ── */}
              {bookingStep === 1 && (
                <form
                  onSubmit={handleStep1Next}
                  className="flex flex-col gap-4"
                >
                  <p className="text-xs font-bold text-[#171717]/50 uppercase tracking-widest">
                    Schedule
                  </p>

                  {noSlotsAvailable && formData.pickupDate === todayISO() && (
                    <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
                      <FaExclamationTriangle className="flex-shrink-0" />
                      No pickup hours are available for today. Please select a
                      future date or note that pickups are only available until
                      8:00 PM.
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field
                      icon={FaCalendarAlt}
                      label="Pickup Date"
                      hint="* Today up to 7 days from now"
                    >
                      <input
                        type="date"
                        name="pickupDate"
                        min={todayISO()}
                        max={formatDate(sevenDaysFromToday())}
                        value={formData.pickupDate}
                        onChange={handleInputChange}
                        className={inputCls}
                        required
                      />
                    </Field>
                    <Field
                      icon={FaClock}
                      label="Pickup Time"
                      hint={
                        formData.pickupDate === todayISO() && !noSlotsAvailable
                          ? "* Shows available hours from now"
                          : undefined
                      }
                    >
                      <select
                        name="pickupTime"
                        value={formData.pickupTime}
                        onChange={handleInputChange}
                        className={selectCls}
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
                      <FaChevronDown className="absolute right-3 text-[#171717]/40 text-xs pointer-events-none" />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field icon={FaCalendarAlt} label="Return Date">
                      <input
                        type="date"
                        name="returnDate"
                        min={addDaysToISODate(formData.pickupDate, 1)}
                        max={formatDate(sixMonthsFromToday())}
                        value={formData.returnDate}
                        onChange={handleInputChange}
                        className={inputCls}
                        required
                      />
                    </Field>
                    <Field
                      icon={FaClock}
                      label={`Return Time${formData.returnDate === formData.pickupDate ? " (after " + slotLabel(formData.pickupTime) + ")" : ""}`}
                    >
                      <select
                        name="returnTime"
                        value={formData.returnTime}
                        onChange={handleInputChange}
                        className={selectCls}
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
                      <FaChevronDown className="absolute right-3 text-[#171717]/40 text-xs pointer-events-none" />
                    </Field>
                  </div>

                  <Field icon={FaMapMarkerAlt} label="Pickup Location">
                    <input
                      type="text"
                      value={formData.pickupLocation}
                      readOnly
                      className={`${inputCls} opacity-60`}
                    />
                  </Field>

                  <div>
                    <p className="text-xs font-bold text-[#171717]/50 uppercase tracking-widest mb-2">
                      Primary Destination
                    </p>
                    <DestinationSelect
                      value={formData.destination}
                      onChange={handleDestinationChange}
                    />
                    {formData.destinationCity && (
                      <div
                        className={`mt-2 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 ${distanceFee === 0 ? "bg-green-50 text-green-700 border border-green-200" : "bg-orange-50 text-orange-700 border border-orange-200"}`}
                      >
                        <FaMapMarkerAlt className="flex-shrink-0" />~
                        {distanceKm} km from Bacoor — {distanceTier?.label}
                        {distanceFee === 0
                          ? " — No extra charge"
                          : ` — +₱${distanceFee} distance fee`}
                        {isEstimate && (
                          <span className="opacity-70 ml-1">(estimated)</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Helmet add-on */}
                  <div className="flex items-start gap-3 bg-white/50 border border-[#171717]/10 rounded-2xl p-4">
                    <input
                      type="checkbox"
                      id="wantsHelmet"
                      name="wantsHelmet"
                      checked={formData.wantsHelmet}
                      onChange={handleInputChange}
                      className="w-5 h-5 rounded accent-[#b50002] cursor-pointer mt-0.5"
                    />
                    <label
                      htmlFor="wantsHelmet"
                      className="flex-1 cursor-pointer"
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <GiFullMotorcycleHelmet className="text-[#b50002] text-sm" />
                        <span className="font-bold text-[#171717] text-sm">
                          Additional Helmet
                        </span>
                        <span className="ml-auto text-[#b50002] font-black text-sm">
                          +₱{HELMET_FEE}
                        </span>
                      </div>
                      <p className="text-xs text-[#171717]/50">
                        Add an extra helmet for your passenger.
                      </p>
                    </label>
                  </div>

                  {/* Price Summary (Step 1) */}
                  {formData.returnDate && (
                    <PriceSummary
                      price={price}
                      days={days}
                      baseRental={baseRental}
                      distanceFee={distanceFee}
                      helmetFee={helmetFee}
                      totalAmount={totalAmount}
                    />
                  )}

                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-[#171717]/40">
                      All hours are in Philippine Standard Time
                    </p>
                    <button
                      type="submit"
                      disabled={noSlotsAvailable}
                      className="flex items-center gap-2 px-6 py-3 bg-[#171717] text-white font-bold text-sm rounded-xl shadow-lg shadow-[#171717]/30 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      Next <FaArrowRight className="text-xs" />
                    </button>
                  </div>
                </form>
              )}

              {/* ── STEP 2 — Renter Info only ── */}
              {bookingStep === 2 && (
                <form
                  onSubmit={handleStep2Next}
                  className="flex flex-col gap-4"
                >
                  <p className="text-xs font-bold text-[#171717]/50 uppercase tracking-widest">
                    Renter Information
                  </p>
                  <p className="text-xs text-[#171717]/40 -mt-2">
                    Update your profile to change these details.
                  </p>

                  <Field icon={FaUser} label="Full Name">
                    <input
                      type="text"
                      value={formData.name}
                      readOnly
                      placeholder={
                        loadingUserProfile ? "Loading…" : "Your full name"
                      }
                      className={`${inputCls} opacity-60`}
                    />
                  </Field>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field icon={FaEnvelope} label="Email Address">
                      <input
                        type="email"
                        value={formData.email}
                        readOnly
                        placeholder={
                          loadingUserProfile ? "Loading…" : "Your email"
                        }
                        className={`${inputCls} opacity-60`}
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
                        className={`${inputCls} opacity-60`}
                      />
                    </Field>
                  </div>

                  <div>
                    <Field icon={FaMapMarkerAlt} label="Renter's Address">
                      <input
                        type="text"
                        value={formData.fullAddress}
                        readOnly
                        disabled
                        placeholder={
                          loadingUserProfile
                            ? "Loading address…"
                            : "Address from your profile"
                        }
                        className={`${inputCls} opacity-60`}
                      />
                    </Field>
                    {!formData.fullAddress && !loadingUserProfile && (
                      <p className="text-xs text-[#b50002] mt-1 flex items-center gap-1">
                        <FaInfoCircle /> No address found.{" "}
                        <a
                          href="/profile"
                          className="underline font-semibold hover:text-[#900000]"
                        >
                          Update your profile
                        </a>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <button
                      type="button"
                      onClick={() => setBookingStep(1)}
                      className="inline-flex items-center gap-2 text-[#171717]/50 hover:text-[#b50002] text-sm font-medium transition-colors"
                    >
                      <FaArrowLeft className="text-xs" /> Back
                    </button>
                    <button
                      type="submit"
                      className="flex items-center gap-2 px-6 py-3 bg-[#171717] text-white font-bold text-sm rounded-xl shadow-lg shadow-[#171717]/30 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                    >
                      Next <FaArrowRight className="text-xs" />
                    </button>
                  </div>
                </form>
              )}

              {/* ── STEP 3 — Review, Payment & Confirm ── */}
              {bookingStep === 3 && (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <p className="text-xs font-bold text-[#171717]/50 uppercase tracking-widest">
                    Review Your Booking
                  </p>

                  {lockSecondsLeft !== null && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
                      <span className="text-red-700 font-semibold">
                        This motorcycle is temporarily held for your checkout.
                      </span>
                      <span className="text-red-800 font-black tracking-wide">
                        {formatLockCountdown(lockSecondsLeft)}
                      </span>
                    </div>
                  )}

                  {/* Schedule summary */}
                  <div className="bg-white/60 border border-[#171717]/8 rounded-2xl p-4">
                    <p className="text-xs font-black text-[#171717]/40 uppercase tracking-widest mb-2">
                      Schedule
                    </p>
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

                  {/* Renter summary */}
                  <div className="bg-white/60 border border-[#171717]/8 rounded-2xl p-4">
                    <p className="text-xs font-black text-[#171717]/40 uppercase tracking-widest mb-2">
                      Renter
                    </p>
                    <ReviewRow label="Name" value={formData.name} />
                    <ReviewRow label="Email" value={formData.email} />
                    <ReviewRow label="Phone" value={formData.phone} />
                  </div>

                  {/* Pricing summary */}
                  <div className="bg-white/60 border border-[#171717]/8 rounded-2xl p-4">
                    <p className="text-xs font-black text-[#171717]/40 uppercase tracking-widest mb-2">
                      Pricing
                    </p>
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
                    <div className="pt-2 mt-1 border-t border-[#171717]/10 flex items-center justify-between">
                      <span className="text-xs font-black text-[#171717]/50 uppercase tracking-wider">
                        Total
                      </span>
                      <span className="text-xl font-black text-[#171717]">
                        ₱{totalAmount}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs font-semibold text-[#171717]/50 uppercase tracking-wider">
                        Downpayment (paid now)
                      </span>
                      <span className="text-base font-black text-green-600">
                        −₱{DOWNPAYMENT}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1 pt-1 border-t border-[#171717]/10">
                      <span className="text-xs font-black text-[#171717]/50 uppercase tracking-wider">
                        Due at Pickup
                      </span>
                      <span className="text-base font-black text-[#b50002]">
                        ₱{dueAtPickup}
                      </span>
                    </div>
                  </div>

                  {/* ── Payment Section ── */}
                  <div className="bg-white/60 border border-[#171717]/8 rounded-2xl p-4">
                    <p className="text-xs font-black text-[#171717]/40 uppercase tracking-widest mb-3">
                      Downpayment — ₱{DOWNPAYMENT}
                    </p>

                    <Field icon={FaCreditCard} label="Payment Method">
                      <select
                        name="reservationPaymentMethod"
                        value={formData.reservationPaymentMethod}
                        onChange={handleInputChange}
                        className={selectCls}
                        required
                      >
                        <option value="GCash">GCash</option>
                        <option value="PayMaya">PayMaya</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                      </select>
                      <FaChevronDown className="absolute right-3 text-[#171717]/40 text-xs pointer-events-none" />
                    </Field>

                    <p className="text-xs text-[#171717]/40 mt-1 mb-3">
                      Send ₱{DOWNPAYMENT} via{" "}
                      {formData.reservationPaymentMethod}, then upload the proof
                      below.
                    </p>

                    <div className="bg-white/70 border border-[#171717]/10 rounded-2xl p-4 mb-3">
                      <p className="text-xs font-black text-[#171717]/50 uppercase tracking-widest mb-2">
                        Scan QR to Pay
                      </p>
                      <img
                        src={selectedQrPath}
                        alt={`${formData.reservationPaymentMethod} QR payment`}
                        className="w-56 max-w-full mx-auto rounded-xl border border-[#171717]/10"
                      />
                      <p className="text-[11px] text-[#171717]/45 mt-2 text-center">
                        QR shown is for {formData.reservationPaymentMethod}.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field icon={FaReceipt} label="Reference ID">
                        <input
                          type="text"
                          name="paymentReferenceId"
                          value={formData.paymentReferenceId}
                          onChange={handleInputChange}
                          className={inputCls}
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
                          className={inputCls}
                          required
                        />
                      </Field>
                    </div>

                    <div className="mt-3">
                      <Field icon={FaCreditCard} label="Amount Sent">
                        <input
                          type="number"
                          name="paymentSentAmount"
                          min={DOWNPAYMENT}
                          max={DOWNPAYMENT}
                          step="1"
                          value={formData.paymentSentAmount}
                          onChange={handleInputChange}
                          className={inputCls}
                          readOnly
                          required
                        />
                      </Field>
                    </div>

                    <div className="flex flex-col gap-1 mt-3">
                      <label className="text-[#171717]/70 text-xs font-semibold uppercase tracking-wider">
                        Payment Proof (Image)
                      </label>
                      <div className="bg-white/60 border border-[#171717]/10 rounded-xl p-3">
                        <input
                          type="file"
                          name="paymentProofImage"
                          accept="image/*"
                          onChange={handleInputChange}
                          className="block w-full text-sm text-[#171717]"
                          required
                        />
                        <p className="text-[11px] text-[#171717]/45 mt-1">
                          Upload a screenshot/photo showing the reference ID,
                          amount, and payment time.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2 text-xs text-amber-800">
                    <FaInfoCircle className="mt-0.5 flex-shrink-0" />
                    <span>
                      Your booking will be marked as Pending Reservation while
                      admin verifies your payment proof.
                    </span>
                  </div>

                  <div className="bg-[#f4f3f3] rounded-xl p-3 text-xs text-[#171717]/60">
                    <p className="font-semibold mb-0.5">📍 Pickup Location:</p>
                    <p>{PICKUP_LOCATION}</p>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <button
                      type="button"
                      onClick={async () => {
                        clearLockTimer();
                        await releaseCheckoutLock(true);
                        setCheckoutLock({
                          expiresAt: "",
                          lockMinutes: CHECKOUT_LOCK_FALLBACK_MINUTES,
                        });
                        setBookingStep(2);
                      }}
                      className="inline-flex items-center gap-2 text-[#171717]/50 hover:text-[#b50002] text-sm font-medium transition-colors"
                    >
                      <FaArrowLeft className="text-xs" /> Back
                    </button>
                    <button
                      type="submit"
                      disabled={
                        submitting ||
                        loadingUserProfile ||
                        hasSubmittedRef.current
                      }
                      className="flex items-center gap-2 px-6 py-3 bg-[#171717] text-white font-bold text-sm rounded-xl shadow-lg shadow-black/20 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      <FaCheckCircle className="text-xs" />
                      {submitting
                        ? "Submitting…"
                        : "Submit Payment Proof & Confirm Reservation"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MotorcycleDetail;
