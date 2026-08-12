import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import axios from "axios";
import API_BASE_URL from "../apiBase";
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaChevronDown,
  FaClock,
  FaEnvelope,
  FaGasPump,
  FaHardHat,
  FaMapMarkerAlt,
  FaMotorcycle,
  FaPhone,
  FaSearch,
  FaTachometerAlt,
  FaUser,
  FaTag,
  FaCog,
  FaShieldAlt,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { PlusCircle } from "lucide-react";
import { computeDiscountedPrice, useApplicableDiscount } from "./DiscountBadge";

const baseURL = API_BASE_URL;
const PH_API = "https://psgc.gitlab.io/api";
const HELMET_FEE = 50;

const api = axios.create({ baseURL, headers: { Accept: "application/json" } });

// ── Shared styles ──────────────────────────────────
const labelCls =
  "block text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase mb-1.5";
const fieldClsIcon =
  "w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[#171717] text-sm placeholder-slate-300 focus:outline-none focus:border-[#b50002]/30 appearance-none";
const fieldClsIconError =
  "w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#b50002] bg-[#FDF0F0] text-[#171717] text-sm placeholder-slate-300 focus:outline-none focus:border-[#b50002] appearance-none";
const fieldErrorTextCls = "text-[11px] font-semibold text-[#b50002] mt-1.5";

const IconField = ({ icon: Icon, label, error, children }) => (
  <div>
    {label && <label className={labelCls}>{label}</label>}
    <div className="relative flex items-center">
      {Icon && (
        <Icon className="absolute left-3 text-[#b50002] text-sm pointer-events-none z-10" />
      )}
      {children}
    </div>
    {error && <p className={fieldErrorTextCls}>{error}</p>}
  </div>
);

// ── Helpers ───────────────────────────────────────────────────────────────────
const getImageSrc = (imagePath) => {
  if (!imagePath) return "";
  if (/^data:image\//i.test(String(imagePath))) return imagePath;
  if (
    String(imagePath).startsWith("http://") ||
    String(imagePath).startsWith("https://")
  )
    return imagePath;
  return `${baseURL}${String(imagePath).startsWith("/") ? "" : "/"}${imagePath}`;
};

const DISTANCE_TIERS = [
  { maxKm: 8, fee: 0, label: "Within Bacoor (0-8 km)" },
  { maxKm: 15, fee: 80, label: "Very close (8-15 km)" },
  { maxKm: 25, fee: 150, label: "Short trip (15-25 km)" },
  { maxKm: 40, fee: 250, label: "Medium-short (25-40 km)" },
  { maxKm: 60, fee: 400, label: "Medium trip (40-60 km)" },
  { maxKm: 90, fee: 550, label: "Long trip (60-90 km)" },
  { maxKm: 130, fee: 700, label: "Far trip (90-130 km)" },
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
  DASMARINAS: 20,
  DASMARIÑAS: 20,
  "CITY OF DASMARIÑAS": 20,
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
  PARANAQUE: 20,
  PARAÑAQUE: 20,
  "CITY OF PARAÑAQUE": 20,
  "LAS PINAS": 16,
  "LAS PIÑAS": 16,
  "CITY OF LAS PIÑAS": 16,
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
  BINAN: 22,
  BIÑAN: 22,
  "CITY OF BIÑAN": 22,
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

const getDistanceFee = (cityName, destinationStr = "") => {
  if (!cityName)
    return { fee: 0, tier: DISTANCE_TIERS[0], km: 0, isEstimate: false };

  // Check if the full destination string includes NCR or CALABARZON identifiers
  const isFreeRegion =
    /NCR|National Capital Region|CALABARZON|Region IV-A/i.test(destinationStr);
  if (isFreeRegion) {
    return {
      fee: 0,
      tier: { label: "Free Region (NCR / CALABARZON)" },
      km: 0,
      isEstimate: false,
    };
  }

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

const RETURN_TIME_MIN = "08:00";
const RETURN_TIME_MAX = "20:00";
const formatLocalDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};
const addDaysToISODate = (dateISO, days) => {
  const d = new Date(dateISO || todayISO());
  d.setDate(d.getDate() + days);
  return formatLocalDate(d);
};
const todayISO = () => formatLocalDate(new Date());

const getValidReturnSlots = (pickupDate, returnDate, pickupTime) => {
  if (!returnDate || !pickupDate || returnDate !== pickupDate)
    return ALL_TIME_SLOTS;
  return ALL_TIME_SLOTS.filter((s) => s.value > pickupTime);
};
const isOClockTime = (t = "") => /^\d{2}:00$/.test(String(t));
const calculateDays = (from, to) => {
  if (!from || !to) return 1;
  return Math.max(
    1,
    Math.ceil((new Date(to) - new Date(from)) / (1000 * 60 * 60 * 24)),
  );
};
const formatMoney = (n) => `₱${Number(n || 0).toLocaleString("en-PH")}`;

// Statuses that mean the customer already has a booking in progress and
// therefore cannot start a new walk-in rental until it's resolved.
const BLOCKING_BOOKING_STATUSES = [
  "pending",
  "pending_reservation",
  "pending_full_payment",
  "active",
  "inspection",
];

// ── Calendar Helpers ────────────────────────────────────────────
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

// ── Inline Calendar Picker ──────────────────────────────────────
const InlineDatePicker = ({
  value,
  onChange,
  minDate,
  maxDate,
  label,
  mode,
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
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-left flex items-center justify-between transition-colors focus:outline-none focus:border-[#b50002]/30 ${disabled ? "opacity-60 cursor-not-allowed bg-slate-50" : "cursor-pointer hover:border-[#b50002]/30"} ${open ? "border-[#b50002]/50 ring-1 ring-[#b50002]/10" : ""}`}
      >
        <FaCalendarAlt className="absolute left-3 text-[#b50002] text-sm pointer-events-none" />
        <span className={value ? "text-[#171717]" : "text-slate-400"}>
          {displayValue || `Select ${label}`}
        </span>
        <FaChevronDown
          className="text-slate-300 text-[10px] transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {open && (
        <div className="absolute top-[calc(100%+6px)] left-0 z-50 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 min-w-[300px] w-full max-w-[340px] animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setViewMonth((v) => addMonths(v, -1))}
              className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <FaChevronLeft size={10} />
            </button>
            <span className="text-sm font-bold text-[#171717]">
              {monthLabel}
            </span>
            <button
              type="button"
              onClick={() => setViewMonth((v) => addMonths(v, 1))}
              className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <FaChevronRight size={10} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <div
                key={d}
                className="text-center text-[10px] font-bold text-slate-400 py-1"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
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
              let color = inMonth ? "#171717" : "rgba(0,0,0,0.2)";
              let border = "1.5px solid transparent";
              let cursor = isDisabled ? "not-allowed" : "pointer";
              let opacity = isDisabled
                ? isMaint || (mode === "return" && isBuf)
                  ? 1
                  : 0.3
                : 1;

              if (isSelected) {
                bg = "#171717";
                color = "#fff";
                border = "1.5px solid #171717";
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
                  className={`relative flex flex-col items-center justify-center min-h-[32px] rounded-lg text-xs transition-all ${!isDisabled && inMonth && !isSelected && !isPickupDate && !isInRange ? "hover:bg-slate-100 hover:border-slate-300" : ""}`}
                  style={{
                    background: bg,
                    color,
                    border,
                    fontWeight: isSelected || isToday ? 800 : 500,
                    cursor,
                    opacity,
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
                        marginTop: 2,
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
                        marginTop: 2,
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
                        marginTop: 2,
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap gap-x-3 gap-y-1.5">
            {[
              { dot: "#7c3aed", label: "Maintenance" },
              { dot: "#f59e0b", label: "Buffer day" },
              { dot: "rgba(181,0,2,0.4)", label: "Booked" },
            ].map(({ dot, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: dot,
                    flexShrink: 0,
                  }}
                />
                <span className="text-[10px] font-medium text-slate-500">
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

// ── PH Address Hook ────────────────────────────────────────
const usePHAddress = () => {
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [hasProvinces, setHasProvinces] = useState(false);
  const [loading, setLoading] = useState({
    regions: false,
    provinces: false,
    cities: false,
    barangays: false,
  });

  const fetchRegions = useCallback(async () => {
    setLoading((p) => ({ ...p, regions: true }));
    try {
      const res = await axios.get(`${PH_API}/regions/`);
      setRegions((res.data || []).sort((a, b) => a.name.localeCompare(b.name)));
    } catch {
      toast.error("Failed to load regions");
    } finally {
      setLoading((p) => ({ ...p, regions: false }));
    }
  }, []);

  const fetchProvinces = useCallback(async (regionCode) => {
    if (!regionCode) {
      setProvinces([]);
      setCities([]);
      setBarangays([]);
      setHasProvinces(false);
      return;
    }
    setLoading((p) => ({ ...p, provinces: true }));
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
        setLoading((p) => ({ ...p, cities: true }));
        try {
          const r2 = await axios.get(
            `${PH_API}/regions/${regionCode}/cities-municipalities/`,
          );
          setCities(
            (r2.data || []).sort((a, b) => a.name.localeCompare(b.name)),
          );
        } catch {
          toast.error("Failed to load cities");
        } finally {
          setLoading((p) => ({ ...p, cities: false }));
        }
      }
    } catch {
      setProvinces([]);
      setHasProvinces(false);
      setLoading((p) => ({ ...p, cities: true }));
      try {
        const r2 = await axios.get(
          `${PH_API}/regions/${regionCode}/cities-municipalities/`,
        );
        setCities((r2.data || []).sort((a, b) => a.name.localeCompare(b.name)));
      } catch {
        toast.error("Failed to load cities");
      } finally {
        setLoading((p) => ({ ...p, cities: false }));
      }
    } finally {
      setLoading((p) => ({ ...p, provinces: false }));
    }
  }, []);

  const fetchCities = useCallback(async (provinceCode) => {
    if (!provinceCode) {
      setCities([]);
      setBarangays([]);
      return;
    }
    setLoading((p) => ({ ...p, cities: true }));
    try {
      const res = await axios.get(
        `${PH_API}/provinces/${provinceCode}/cities-municipalities/`,
      );
      setCities((res.data || []).sort((a, b) => a.name.localeCompare(b.name)));
      setBarangays([]);
    } catch {
      toast.error("Failed to load cities");
    } finally {
      setLoading((p) => ({ ...p, cities: false }));
    }
  }, []);

  const fetchBarangays = useCallback(async (cityCode) => {
    if (!cityCode) {
      setBarangays([]);
      return;
    }
    setLoading((p) => ({ ...p, barangays: true }));
    try {
      const res = await axios.get(
        `${PH_API}/cities-municipalities/${cityCode}/barangays/`,
      );
      setBarangays(
        (res.data || []).sort((a, b) => a.name.localeCompare(b.name)),
      );
    } catch {
      toast.error("Failed to load barangays");
    } finally {
      setLoading((p) => ({ ...p, barangays: false }));
    }
  }, []);

  return {
    regions,
    provinces,
    cities,
    barangays,
    hasProvinces,
    loading,
    fetchRegions,
    fetchProvinces,
    fetchCities,
    fetchBarangays,
  };
};

// ── Destination Select ────────────────────────────────────────────────────────
const DestinationSelect = ({ value, onChange }) => {
  const {
    regions,
    provinces,
    cities,
    barangays,
    hasProvinces,
    loading,
    fetchRegions,
    fetchProvinces,
    fetchCities,
    fetchBarangays,
  } = usePHAddress();
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

  React.useEffect(() => {
    fetchRegions();
  }, [fetchRegions]);

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
    fetchProvinces(code);
    onChange("", "");
  };
  const handleProvince = (e) => {
    const code = e.target.value;
    const name = provinces.find((p) => p.code === code)?.name || "";
    setSel((p) => ({
      ...p,
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
    setSel((p) => ({
      ...p,
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
    setSel((p) => ({ ...p, barangayCode: code, barangayName: name }));
    const dest = [name, sel.cityName, sel.provinceName, sel.regionName]
      .filter(Boolean)
      .join(", ");
    onChange(dest, sel.cityName);
  };

  const SelectRow = ({ iconEl, selectEl }) => (
    <div className="relative flex items-center bg-white rounded-xl transition-colors">
      <span className="absolute left-3 pointer-events-none z-10">{iconEl}</span>
      {selectEl}
      <FaChevronDown className="absolute right-3 text-slate-300 text-[10px] pointer-events-none" />
    </div>
  );

  return (
    <div className="space-y-2">
      <SelectRow
        iconEl={<FaMapMarkerAlt className="text-[#b50002] text-sm" />}
        selectEl={
          <select
            value={sel.regionCode}
            onChange={handleRegion}
            disabled={loading.regions}
            required
            className={fieldClsIcon}
          >
            <option value="">
              {loading.regions ? "Loading regions..." : "Select Region *"}
            </option>
            {regions.map((r) => (
              <option key={r.code} value={r.code}>
                {r.name}
              </option>
            ))}
          </select>
        }
      />
      {sel.regionCode && hasProvinces && (
        <SelectRow
          iconEl={<FaMapMarkerAlt className="text-[#b50002] text-sm" />}
          selectEl={
            <select
              value={sel.provinceCode}
              onChange={handleProvince}
              disabled={loading.provinces}
              className={fieldClsIcon}
            >
              <option value="">
                {loading.provinces
                  ? "Loading provinces..."
                  : "Select Province *"}
              </option>
              {provinces.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </select>
          }
        />
      )}
      {sel.regionCode && (
        <SelectRow
          iconEl={<FaMapMarkerAlt className="text-[#b50002] text-sm" />}
          selectEl={
            <select
              value={sel.cityCode}
              onChange={handleCity}
              disabled={
                loading.cities ||
                (hasProvinces ? !sel.provinceCode : !sel.regionCode)
              }
              className={fieldClsIcon}
            >
              <option value="">
                {loading.cities
                  ? "Loading cities..."
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
          }
        />
      )}
      {sel.cityCode && (
        <SelectRow
          iconEl={<FaMapMarkerAlt className="text-[#b50002] text-sm" />}
          selectEl={
            <select
              value={sel.barangayCode}
              onChange={handleBarangay}
              disabled={loading.barangays}
              className={fieldClsIcon}
            >
              <option value="">
                {loading.barangays
                  ? "Loading barangays..."
                  : "Select Barangay (optional)"}
              </option>
              {barangays.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name}
                </option>
              ))}
            </select>
          }
        />
      )}
      {value && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
          <FaCheckCircle className="text-emerald-500 flex-shrink-0 text-sm" />
          <p className="text-xs font-semibold text-emerald-700">{value}</p>
        </div>
      )}
    </div>
  );
};

// ── Section wrapper ───────────────────────────────────────────────────────────
const FormSection = ({ title, children }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
    <p className={labelCls} style={{ marginBottom: 0 }}>
      {title}
    </p>
    <div className="pt-2 border-t border-slate-50 space-y-4">{children}</div>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const WalkInRentals = () => {
  const [unitIdInput, setUnitIdInput] = useState("");
  const [unitSuggestions, setUnitSuggestions] = useState([]);
  const [loadingUnitSuggestions, setLoadingUnitSuggestions] = useState(false);
  const [showUnitSuggestions, setShowUnitSuggestions] = useState(false);
  const [loadingMoto, setLoadingMoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [motorcycle, setMotorcycle] = useState(null);
  const [loadingCustomerInfo, setLoadingCustomerInfo] = useState(false);
  const [errors, setErrors] = useState({});

  const [calBookings, setCalBookings] = useState([]);
  const [maintenanceRanges, setMaintenanceRanges] = useState([]);

  const [address, setAddress] = useState({
    regionCode: "",
    regionName: "",
    provinceCode: "",
    provinceName: "",
    cityCode: "",
    cityName: "",
    barangayCode: "",
    barangayName: "",
    zipCode: "",
  });

  const {
    regions,
    provinces,
    cities,
    barangays,
    hasProvinces,
    loading,
    fetchRegions,
    fetchProvinces,
    fetchCities,
    fetchBarangays,
  } = usePHAddress();

  React.useEffect(() => {
    fetchRegions();
  }, [fetchRegions]);

  const [formData, setFormData] = useState({
    userId: null,
    customerName: "",
    renterEmail: "",
    phone: "",
    pickupDate: todayISO(),
    pickupTime: "08:00",
    returnDate: "",
    returnTime: RETURN_TIME_MIN,
    destination: "",
    destinationCity: "",
    paymentMethod: "Cash",
    wantsHelmet: false,
  });

  // ── Load Bookings & Maintenance Calendar Data ───────────────────────
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
      return formatLocalDate(earliest);
    }
    return null;
  };

  const handlePickupDateChange = (dateISO) => {
    const selected = new Date(dateISO);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    if (selected < todayStart) return;
    const newReturnDate =
      formData.returnDate && new Date(formData.returnDate) <= selected
        ? ""
        : formData.returnDate;

    setFormData((p) => ({
      ...p,
      pickupDate: dateISO,
      pickupTime: "08:00",
      returnDate: newReturnDate,
    }));
  };

  const handleReturnDateChange = (dateISO) => {
    if (!dateISO) {
      setFormData((p) => ({ ...p, returnDate: "" }));
      return;
    }
    const selected = new Date(dateISO);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    if (selected < todayStart) return;
    if (selected <= new Date(formData.pickupDate)) {
      toast.error("Minimum rental duration is 24 hours.");
      return;
    }
    setFormData((p) => ({ ...p, returnDate: dateISO }));
  };

  const describeBlockingStatus = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "active") return "Active";
    if (s === "inspection") return "Inspection";
    return "Pending";
  };

  // Looks through the bookings already loaded for the calendar to see if
  // the given user has any booking (on any unit, any dates) that is
  // Pending, Active, or Inspection. Returns that booking, or null.
  const findBlockingBookingForUser = useCallback(
    (userIdValue) => {
      if (!userIdValue) return null;
      return (
        calBookings.find((b) => {
          if (b.isDeleted) return false;
          const rawUserId = b.userId || b.user;
          const normalizedUserId =
            rawUserId && typeof rawUserId === "object"
              ? rawUserId._id || rawUserId.id
              : rawUserId;
          if (!normalizedUserId) return false;
          if (String(normalizedUserId) !== String(userIdValue)) return false;
          const status = String(b.status || "").toLowerCase();
          return BLOCKING_BOOKING_STATUSES.includes(status);
        }) || null
      );
    },
    [calBookings],
  );

  const handleLoadCustomerInfo = async () => {
    const email = formData.renterEmail.trim();
    if (!email) {
      toast.error("Please enter an email address first.");
      return;
    }
    setLoadingCustomerInfo(true);
    try {
      const res = await api.get("/api/auth/users");
      const users = Array.isArray(res.data)
        ? res.data
        : res.data?.users || res.data?.data || [];
      const user = users.find(
        (u) => u.email.toLowerCase() === email.toLowerCase(),
      );

      if (!user) {
        toast.error("No customer found with this email.");
        return;
      }

      const userIdValue = user._id || user.id;
      const blockingBooking = findBlockingBookingForUser(userIdValue);
      if (blockingBooking) {
        toast.error(
          `This customer already has a booking with ${describeBlockingStatus(
            blockingBooking.status,
          )} status. A walk-in rental cannot be created until that booking is resolved.`,
        );
        return;
      }

      setFormData((p) => ({
        ...p,
        userId: user._id || user.id,
        customerName:
          [user.firstName, user.middleName, user.lastName]
            .filter(Boolean)
            .join(" ")
            .trim() || p.customerName,
        phone: user.phone || p.phone,
      }));

      if (user.address && user.address.region) {
        let rCode = "",
          pCode = "",
          cCode = "",
          bCode = "";
        let rName = user.address.region,
          pName = user.address.province || user.address.state || "",
          cName = user.address.city,
          bName = user.address.barangay;

        const rMatch = regions.find(
          (r) => r.name.toLowerCase() === rName.toLowerCase(),
        );
        if (rMatch) {
          rCode = rMatch.code;
          rName = rMatch.name;
          fetchProvinces(rCode);

          const pRes = await axios
            .get(`${PH_API}/regions/${rCode}/provinces/`)
            .catch(() => null);
          const provs = pRes?.data || [];
          if (provs.length > 0 && pName) {
            const pMatch = provs.find(
              (p) => p.name.toLowerCase() === pName.toLowerCase(),
            );
            if (pMatch) {
              pCode = pMatch.code;
              pName = pMatch.name;
              fetchCities(pCode);
            }
          } else if (!provs.length) {
            fetchCities(rCode);
          }

          let cRes;
          if (pCode)
            cRes = await axios
              .get(`${PH_API}/provinces/${pCode}/cities-municipalities/`)
              .catch(() => null);
          else
            cRes = await axios
              .get(`${PH_API}/regions/${rCode}/cities-municipalities/`)
              .catch(() => null);

          if (cRes?.data && cName) {
            const cMatch = cRes.data.find(
              (c) => c.name.toLowerCase() === cName.toLowerCase(),
            );
            if (cMatch) {
              cCode = cMatch.code;
              cName = cMatch.name;
              fetchBarangays(cCode);
            }
          }

          if (cCode && bName) {
            const bRes = await axios
              .get(`${PH_API}/cities-municipalities/${cCode}/barangays/`)
              .catch(() => null);
            if (bRes?.data) {
              const bMatch = bRes.data.find(
                (b) => b.name.toLowerCase() === bName.toLowerCase(),
              );
              if (bMatch) {
                bCode = bMatch.code;
                bName = bMatch.name;
              }
            }
          }
        }

        setAddress({
          regionCode: rCode,
          regionName: rName,
          provinceCode: pCode,
          provinceName: pName,
          cityCode: cCode,
          cityName: cName,
          barangayCode: bCode,
          barangayName: bName,
          zipCode: user.address.zipCode || address.zipCode,
        });
      }

      toast.success("Customer information loaded successfully.");
    } catch (err) {
      toast.error("Failed to load customer information.");
    } finally {
      setLoadingCustomerInfo(false);
    }
  };

  // Pricing & Discounts logic
  const price = Number(motorcycle?.dailyRate || 0);
  const days = calculateDays(formData.pickupDate, formData.returnDate);
  const applicableDiscount = useApplicableDiscount(motorcycle, days);

  const {
    fee: distanceFee,
    tier: distanceTier,
    km: distanceKm,
    isEstimate,
  } = getDistanceFee(formData.destinationCity, formData.destination);
  const helmetFee = formData.wantsHelmet ? HELMET_FEE : 0;

  const baseRental = days * price;

  // Calculate discount
  const discountAmount = applicableDiscount
    ? applicableDiscount.discountType === "percentage"
      ? (baseRental * applicableDiscount.discountValue) / 100
      : Math.min(applicableDiscount.discountValue, baseRental)
    : 0;
  const discountedBaseRental = Math.round(
    Math.max(0, baseRental - discountAmount),
  );

  const totalAmount = discountedBaseRental + distanceFee + helmetFee;
  const DOWNPAYMENT = 200;
  const dueAtPickup = Math.max(0, totalAmount - DOWNPAYMENT);

  const validReturnSlots = useMemo(
    () =>
      getValidReturnSlots(
        formData.pickupDate,
        formData.returnDate,
        formData.pickupTime,
      ),
    [formData.pickupDate, formData.returnDate, formData.pickupTime],
  );

  useEffect(() => {
    if (!validReturnSlots.length) return;
    if (!validReturnSlots.some((s) => s.value === formData.returnTime))
      setFormData((p) => ({ ...p, returnTime: validReturnSlots[0].value }));
  }, [formData.returnTime, validReturnSlots]);

  useEffect(() => {
    const query = unitIdInput.trim();
    if (!query) {
      setUnitSuggestions([]);
      setLoadingUnitSuggestions(false);
      return;
    }
    let active = true;
    const timer = setTimeout(async () => {
      setLoadingUnitSuggestions(true);
      try {
        const res = await api.get("/api/motorcycles", {
          params: { search: query, includeDeleted: true, page: 1, limit: 80 },
        });
        if (!active) return;
        const q = query.toUpperCase();
        const matches = (res.data?.data || [])
          .filter((m) =>
            String(m?.unitId || "")
              .toUpperCase()
              .includes(q),
          )
          .sort((a, b) => {
            const aId = String(a?.unitId || "").toUpperCase();
            const bId = String(b?.unitId || "").toUpperCase();
            const aS = aId.startsWith(q) ? 0 : 1;
            const bS = bId.startsWith(q) ? 0 : 1;
            if (aS !== bS) return aS - bS;
            return aId.localeCompare(bId);
          })
          .slice(0, 10);
        setUnitSuggestions(matches);
      } catch {
        if (!active) return;
        setUnitSuggestions([]);
      } finally {
        if (active) setLoadingUnitSuggestions(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [unitIdInput]);

  const chooseUnitSuggestion = (unitId) => {
    setUnitIdInput(String(unitId || "").toUpperCase());
    setShowUnitSuggestions(false);
  };

  const loadMotorcycleByUnit = async () => {
    const unitId = unitIdInput.trim();
    if (!unitId) {
      toast.error("Please enter a Unit ID.");
      return;
    }
    setLoadingMoto(true);
    try {
      const res = await api.get(
        `/api/motorcycles/unit/${encodeURIComponent(unitId)}`,
      );
      const m = res.data;
      if (!m || !m._id) {
        toast.error("Unit not found.");
        setMotorcycle(null);
        return;
      }
      if (m.isDeleted) {
        toast.error("Selected Unit ID is deleted and cannot be rented.");
        setMotorcycle(null);
        return;
      }

      const loadedStatus = String(m.status || "").toLowerCase();
      if (loadedStatus && loadedStatus !== "available") {
        const STATUS_MESSAGES = {
          rented:
            "This unit currently has an active rental and is not available for walk-in booking.",
          pending:
            "This unit has a pending booking/reservation and is not available for walk-in booking.",
          maintenance:
            "This unit is under maintenance and is not available for walk-in booking.",
          inspection:
            "This unit is under inspection and is not available for walk-in booking.",
        };
        toast.error(
          STATUS_MESSAGES[loadedStatus] ||
            "This unit is not currently available for walk-in booking.",
        );
        setMotorcycle(null);
        return;
      }

      setMotorcycle(m);
      setErrors((p) => {
        if (!("unitId" in p)) return p;
        const n = { ...p };
        delete n.unitId;
        return n;
      });
      toast.success(`Loaded ${m.make || ""} ${m.model || ""}`.trim());
    } catch (err) {
      setMotorcycle(null);
      toast.error(
        String(err?.response?.data?.message || "Failed to load motorcycle."),
      );
    } finally {
      setLoadingMoto(false);
    }
  };

  const onAddressRegion = (e) => {
    const code = e.target.value;
    const name = regions.find((r) => r.code === code)?.name || "";
    setAddress((p) => ({
      ...p,
      regionCode: code,
      regionName: name,
      provinceCode: "",
      provinceName: "",
      cityCode: "",
      cityName: "",
      barangayCode: "",
      barangayName: "",
    }));
    fetchProvinces(code);
  };
  const onAddressProvince = (e) => {
    const code = e.target.value;
    const name = provinces.find((p) => p.code === code)?.name || "";
    setAddress((p) => ({
      ...p,
      provinceCode: code,
      provinceName: name,
      cityCode: "",
      cityName: "",
      barangayCode: "",
      barangayName: "",
    }));
    fetchCities(code);
  };
  const onAddressCity = (e) => {
    const code = e.target.value;
    const name = cities.find((c) => c.code === code)?.name || "";
    setAddress((p) => ({
      ...p,
      cityCode: code,
      cityName: name,
      barangayCode: "",
      barangayName: "",
    }));
    fetchBarangays(code);
  };
  const onAddressBarangay = (e) => {
    const code = e.target.value;
    const name = barangays.find((b) => b.code === code)?.name || "";
    setAddress((p) => ({ ...p, barangayCode: code, barangayName: name }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {};

    if (!motorcycle?._id) {
      nextErrors.unitId = "Load a unit by Unit ID first.";
    }
    if (!formData.customerName.trim()) {
      nextErrors.customerName = "Customer full name is required.";
    }
    const renterEmail = String(formData.renterEmail || "").trim();
    if (!renterEmail) {
      nextErrors.renterEmail = "Renter email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(renterEmail)) {
      nextErrors.renterEmail = "Please enter a valid renter email address.";
    }
    const phone = formData.phone.replace(/\D/g, "");
    if (!/^09\d{9}$/.test(phone)) {
      nextErrors.phone =
        "Phone number must be numeric, 11 digits, and start with 09.";
    }
    if (!address.regionCode) {
      nextErrors.region = "Region is required.";
    }
    if (!address.cityCode) {
      nextErrors.city = "City is required.";
    }
    if (!address.barangayCode) {
      nextErrors.barangay = "Barangay is required.";
    }
    if (!formData.returnDate) {
      nextErrors.returnDate = "Return date is required.";
    }
    if (!formData.destination || !formData.destinationCity) {
      nextErrors.destination = "Please select destination.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      toast.error("Please fix the highlighted fields.");
      return;
    }
    setErrors({});

    if (
      formData.returnTime < RETURN_TIME_MIN ||
      formData.returnTime > RETURN_TIME_MAX
    ) {
      toast.error("Return time must be between 8:00 AM and 8:00 PM.");
      return;
    }
    if (!isOClockTime(formData.returnTime)) {
      toast.error("Return schedule must be hour-only (e.g., 08:00, 09:00).");
      return;
    }
    const pickup = new Date(formData.pickupDate);
    const ret = new Date(formData.returnDate);
    if (ret <= pickup) {
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
    if (nextUnavail && formData.returnDate > nextUnavail) {
      toast.error(
        "Selected dates overlap with an existing booking or maintenance.",
      );
      return;
    }

    if (formData.userId) {
      const blockingBooking = findBlockingBookingForUser(formData.userId);
      if (blockingBooking) {
        toast.error(
          `This customer already has a booking with ${describeBlockingStatus(
            blockingBooking.status,
          )} status. Please resolve it before creating a new walk-in rental.`,
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      await api.post("/api/motorcycle-bookings/walk-in", {
        userId: formData.userId || undefined,
        user: formData.userId || undefined,
        customer: formData.customerName.trim(),
        email: renterEmail,
        phone,
        motorcycle: {
          id: motorcycle._id,
          unitId: motorcycle.unitId || "",
          make: motorcycle.make || "",
          model: motorcycle.model || "",
          year: motorcycle.year || null,
          dailyRate: Number(motorcycle.dailyRate || 0),
          engineSize: motorcycle.engineSize || 150,
          transmission: motorcycle.transmission || "",
          fuelType: motorcycle.fuelType || "",
          hasABS: !!motorcycle.hasABS,
          hasHelmet: motorcycle.hasHelmet !== false,
          image: motorcycle.image || "",
        },
        pickupDate: formData.pickupDate,
        pickupTime: formData.pickupTime,
        returnDate: formData.returnDate,
        returnTime: formData.returnTime,
        destination: formData.destination,
        paymentMethod: formData.paymentMethod,
        reservationPaymentMethod: formData.paymentMethod,
        fullPaymentMethod: formData.paymentMethod,
        amount: totalAmount,

        status: "pending_reservation",
        paymentStatus: "pending_verification",

        details: {
          pickupLocation:
            "Soldiers Hills IV, Block 9 Lot 1 PH2 Lily, Bacoor, 4102 Cavite",
          distanceFee,
          distanceTierLabel: distanceTier?.label || "",
          helmetRequested: formData.wantsHelmet,
          helmetFee,
          destinationCity: formData.destinationCity,
          downpayment: 0,
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
          barangay: address.barangayName,
          city: address.cityName,
          state: address.provinceName,
          region: address.regionName,
          zipCode: address.zipCode,
        },
      });

      if (applicableDiscount?._id) {
        api
          .patch(`/api/discounts/${applicableDiscount._id}/increment-usage`)
          .catch(() => {});
      }

      toast.success("Walk-in booking created successfully.");
      setFormData((p) => ({
        ...p,
        userId: null,
        customerName: "",
        renterEmail: "",
        phone: "",
        pickupDate: todayISO(),
        pickupTime: "08:00",
        returnDate: "",
        returnTime: RETURN_TIME_MIN,
        destination: "",
        destinationCity: "",
        paymentMethod: "Cash",
        wantsHelmet: false,
      }));
      setAddress({
        regionCode: "",
        regionName: "",
        provinceCode: "",
        provinceName: "",
        cityCode: "",
        cityName: "",
        barangayCode: "",
        barangayName: "",
        zipCode: "",
      });
      setMotorcycle(null);
      setUnitIdInput("");
    } catch (err) {
      toast.error(
        String(
          err?.response?.data?.message || "Failed to create walk-in booking.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const SelectRow = ({ icon: Icon, label, error, children }) => (
    <div>
      {label && <label className={labelCls}>{label}</label>}
      <div className="relative flex items-center bg-white rounded-xl focus-within:border-[#b50002]/30 transition-colors">
        <Icon className="absolute left-3 text-[#b50002] text-sm pointer-events-none z-10" />
        {children}
        <FaChevronDown className="absolute right-3 text-slate-300 text-[10px] pointer-events-none" />
      </div>
      {error && <p className={fieldErrorTextCls}>{error}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pt-36">
        {/* Header */}
        <div className="mb-7">
          <h1 className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight">
            Walk-In Rentals
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Create walk-in rentals with a minimum 24-hour rental duration.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* Left column — forms */}
            <div className="xl:col-span-2 space-y-4">
              {/* Motorcycle Unit */}
              <FormSection title="Unit Being Rented">
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
                  <IconField
                    icon={FaSearch}
                    label="Unit ID"
                    error={errors.unitId}
                  >
                    <div className="relative w-full">
                      <input
                        type="text"
                        value={unitIdInput}
                        onChange={(e) => {
                          setUnitIdInput(e.target.value.toUpperCase());
                          setShowUnitSuggestions(true);
                          setErrors((p) => {
                            if (!("unitId" in p)) return p;
                            const n = { ...p };
                            delete n.unitId;
                            return n;
                          });
                        }}
                        onFocus={() => setShowUnitSuggestions(true)}
                        onBlur={() =>
                          setTimeout(() => setShowUnitSuggestions(false), 120)
                        }
                        placeholder="e.g. UNIT-01"
                        className={
                          errors.unitId ? fieldClsIconError : fieldClsIcon
                        }
                      />
                      {showUnitSuggestions && unitIdInput.trim() && (
                        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                          {loadingUnitSuggestions ? (
                            <div className="px-4 py-3 text-xs text-slate-400">
                              Searching unit IDs...
                            </div>
                          ) : unitSuggestions.length ? (
                            unitSuggestions.map((m) => {
                              const mStatus = String(
                                m?.status || "",
                              ).toLowerCase();
                              const isUnavailable =
                                m?.isDeleted ||
                                (mStatus && mStatus !== "available");
                              const badgeLabel = m?.isDeleted
                                ? "Deleted"
                                : mStatus
                                  ? mStatus.charAt(0).toUpperCase() +
                                    mStatus.slice(1)
                                  : "";
                              return (
                                <button
                                  key={m._id}
                                  type="button"
                                  onMouseDown={() =>
                                    chooseUnitSuggestion(m.unitId)
                                  }
                                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 border-b last:border-b-0 border-slate-50 flex items-center gap-3 transition-colors"
                                >
                                  <div className="w-11 h-8 rounded-lg overflow-hidden bg-slate-50 border border-slate-100 flex-shrink-0">
                                    {m.image ? (
                                      <img
                                        src={getImageSrc(m.image)}
                                        alt=""
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <FaMotorcycle className="text-slate-200 text-sm" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black text-[#b50002] uppercase tracking-wider">
                                      {m.unitId || "N/A"}
                                    </p>
                                    <p className="text-[11px] text-slate-400">
                                      {(m.make || "") + " " + (m.model || "")}
                                    </p>
                                  </div>
                                  {isUnavailable && badgeLabel && (
                                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200 flex-shrink-0">
                                      {badgeLabel}
                                    </span>
                                  )}
                                </button>
                              );
                            })
                          ) : (
                            <div className="px-4 py-3 text-xs text-slate-400">
                              No matching Unit IDs found.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </IconField>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={loadMotorcycleByUnit}
                      disabled={loadingMoto}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#b50002] text-white font-bold text-sm shadow-md shadow-[#b50002]/30 hover:brightness-110 disabled:opacity-60 transition-all"
                    >
                      {loadingMoto ? "Loading..." : "Load Unit"}
                    </button>
                  </div>
                </div>

                {motorcycle && (
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex gap-4">
                    <div className="w-24 h-16 flex-shrink-0 rounded-xl overflow-hidden bg-white border border-slate-100">
                      {motorcycle.image ? (
                        <img
                          src={getImageSrc(motorcycle.image)}
                          alt=""
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FaMotorcycle className="text-slate-200 text-2xl" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold tracking-[0.15em] text-[#b50002] uppercase mb-0.5">
                        {motorcycle.unitId}
                      </p>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-black text-[#171717] text-[15px] leading-tight">
                            {motorcycle.make} {motorcycle.model}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {motorcycle.year} · {motorcycle.category}
                          </p>
                        </div>
                        {applicableDiscount && (
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5">
                            {applicableDiscount.discountType === "percentage"
                              ? `-${applicableDiscount.discountValue}% OFF`
                              : `-${formatMoney(applicableDiscount.discountValue)} OFF`}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                        {[
                          {
                            icon: FaTachometerAlt,
                            label: applicableDiscount ? (
                              <span className="flex items-center gap-1.5">
                                <span className="line-through opacity-50">
                                  {formatMoney(motorcycle.dailyRate)}
                                </span>
                                <span className="text-[#b50002] font-bold">
                                  {formatMoney(
                                    Math.round(
                                      computeDiscountedPrice(
                                        motorcycle.dailyRate,
                                        applicableDiscount,
                                      ),
                                    ),
                                  )}
                                  /d
                                </span>
                              </span>
                            ) : (
                              formatMoney(motorcycle.dailyRate) + "/day"
                            ),
                          },
                          {
                            icon: FaGasPump,
                            label: motorcycle.fuelType || "—",
                          },
                          {
                            icon: FaCog,
                            label: motorcycle.transmission || "—",
                          },
                          {
                            icon: FaShieldAlt,
                            label: motorcycle.hasABS ? "ABS" : "No ABS",
                          },
                        ].map(({ icon: Icon, label }, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <Icon className="text-[#b50002] text-[10px] flex-shrink-0" />
                            <span className="text-[11px] text-slate-500 font-medium">
                              {label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </FormSection>

              {/* Customer Information */}
              <FormSection title="Customer Information">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <IconField
                    icon={FaUser}
                    label="Full Name *"
                    error={errors.customerName}
                  >
                    <input
                      type="text"
                      value={formData.customerName}
                      onChange={(e) => {
                        setFormData((p) => ({
                          ...p,
                          customerName: e.target.value,
                        }));
                        setErrors((p) => {
                          if (!("customerName" in p)) return p;
                          const n = { ...p };
                          delete n.customerName;
                          return n;
                        });
                      }}
                      placeholder="Customer full name"
                      className={
                        errors.customerName ? fieldClsIconError : fieldClsIcon
                      }
                    />
                  </IconField>

                  <IconField
                    icon={FaEnvelope}
                    label="Email Address *"
                    error={errors.renterEmail}
                  >
                    <div className="flex w-full">
                      <input
                        type="email"
                        value={formData.renterEmail}
                        onChange={(e) => {
                          setFormData((p) => ({
                            ...p,
                            renterEmail: e.target.value,
                            userId: null,
                          }));
                          setErrors((p) => {
                            if (!("renterEmail" in p)) return p;
                            const n = { ...p };
                            delete n.renterEmail;
                            return n;
                          });
                        }}
                        placeholder="email@example.com"
                        className={`${errors.renterEmail ? fieldClsIconError : fieldClsIcon} rounded-r-none`}
                      />
                      <button
                        type="button"
                        onClick={handleLoadCustomerInfo}
                        disabled={loadingCustomerInfo || !formData.renterEmail}
                        className="px-4 py-2.5 bg-slate-100 border border-l-0 border-slate-200 rounded-r-xl font-bold text-sm text-slate-600 hover:bg-slate-200 disabled:opacity-50 transition-colors whitespace-nowrap"
                      >
                        {loadingCustomerInfo ? "Loading..." : "Load Info"}
                      </button>
                    </div>
                  </IconField>

                  <IconField
                    icon={FaPhone}
                    label="Phone Number *"
                    error={errors.phone}
                  >
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => {
                        setFormData((p) => ({
                          ...p,
                          phone: e.target.value.replace(/\D/g, "").slice(0, 11),
                        }));
                        setErrors((p) => {
                          if (!("phone" in p)) return p;
                          const n = { ...p };
                          delete n.phone;
                          return n;
                        });
                      }}
                      placeholder="09XXXXXXXXX"
                      className={
                        errors.phone ? fieldClsIconError : fieldClsIcon
                      }
                    />
                  </IconField>
                </div>

                {/* Customer Address */}
                <div>
                  <label className={labelCls}>Customer Address *</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <SelectRow
                      icon={FaMapMarkerAlt}
                      label=""
                      error={errors.region}
                    >
                      <select
                        value={address.regionCode}
                        onChange={(e) => {
                          onAddressRegion(e);
                          setErrors((p) => {
                            if (!("region" in p)) return p;
                            const n = { ...p };
                            delete n.region;
                            return n;
                          });
                        }}
                        className={
                          errors.region ? fieldClsIconError : fieldClsIcon
                        }
                      >
                        <option value="">
                          {loading.regions
                            ? "Loading regions..."
                            : "Select Region *"}
                        </option>
                        {regions.map((r) => (
                          <option key={r.code} value={r.code}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </SelectRow>

                    {hasProvinces ? (
                      <SelectRow icon={FaMapMarkerAlt} label="">
                        <select
                          value={address.provinceCode}
                          onChange={onAddressProvince}
                          disabled={!address.regionCode || loading.provinces}
                          className={fieldClsIcon}
                        >
                          <option value="">
                            {loading.provinces
                              ? "Loading provinces..."
                              : "Select Province *"}
                          </option>
                          {provinces.map((p) => (
                            <option key={p.code} value={p.code}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </SelectRow>
                    ) : (
                      <SelectRow
                        icon={FaMapMarkerAlt}
                        label=""
                        error={errors.city}
                      >
                        <select
                          value={address.cityCode}
                          onChange={(e) => {
                            onAddressCity(e);
                            setErrors((p) => {
                              if (!("city" in p)) return p;
                              const n = { ...p };
                              delete n.city;
                              return n;
                            });
                          }}
                          disabled={!address.regionCode || loading.cities}
                          className={
                            errors.city ? fieldClsIconError : fieldClsIcon
                          }
                        >
                          <option value="">
                            {loading.cities
                              ? "Loading cities..."
                              : "Select City / Municipality *"}
                          </option>
                          {cities.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </SelectRow>
                    )}

                    {hasProvinces && (
                      <SelectRow
                        icon={FaMapMarkerAlt}
                        label=""
                        error={errors.city}
                      >
                        <select
                          value={address.cityCode}
                          onChange={(e) => {
                            onAddressCity(e);
                            setErrors((p) => {
                              if (!("city" in p)) return p;
                              const n = { ...p };
                              delete n.city;
                              return n;
                            });
                          }}
                          disabled={loading.cities || !address.provinceCode}
                          className={
                            errors.city ? fieldClsIconError : fieldClsIcon
                          }
                        >
                          <option value="">
                            {loading.cities
                              ? "Loading cities..."
                              : "Select City / Municipality *"}
                          </option>
                          {cities.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </SelectRow>
                    )}

                    <SelectRow
                      icon={FaMapMarkerAlt}
                      label=""
                      error={errors.barangay}
                    >
                      <select
                        value={address.barangayCode}
                        onChange={(e) => {
                          onAddressBarangay(e);
                          setErrors((p) => {
                            if (!("barangay" in p)) return p;
                            const n = { ...p };
                            delete n.barangay;
                            return n;
                          });
                        }}
                        disabled={!address.cityCode || loading.barangays}
                        className={
                          errors.barangay ? fieldClsIconError : fieldClsIcon
                        }
                      >
                        <option value="">
                          {loading.barangays
                            ? "Loading barangays..."
                            : "Select Barangay *"}
                        </option>
                        {barangays.map((b) => (
                          <option key={b.code} value={b.code}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </SelectRow>

                    <IconField icon={FaMapMarkerAlt}>
                      <input
                        type="text"
                        value={address.zipCode}
                        onChange={(e) =>
                          setAddress((p) => ({
                            ...p,
                            zipCode: e.target.value
                              .replace(/\D/g, "")
                              .slice(0, 4),
                          }))
                        }
                        placeholder="ZIP Code"
                        className={fieldClsIcon}
                      />
                    </IconField>
                  </div>
                </div>
              </FormSection>

              {/* Booking Details */}
              <FormSection title="Booking Details">
                {/* Pickup */}
                <div>
                  <label className={labelCls}>Pickup</label>
                  <div className="grid grid-cols-2 gap-3">
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
                    <div className="relative flex items-center bg-white rounded-xl focus-within:border-[#b50002]/30 transition-colors">
                      <FaClock className="absolute left-3 text-[#b50002] text-sm pointer-events-none z-10" />
                      <select
                        value={formData.pickupTime}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            pickupTime: e.target.value,
                          }))
                        }
                        className={fieldClsIcon}
                      >
                        {ALL_TIME_SLOTS.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                      <FaChevronDown className="absolute right-3 text-slate-300 text-[10px] pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Return */}
                <div>
                  <label className={labelCls}>Return</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      className={
                        errors.returnDate
                          ? "rounded-xl ring-1 ring-[#b50002] bg-[#FDF0F0]"
                          : undefined
                      }
                    >
                      <InlineDatePicker
                        value={formData.returnDate}
                        onChange={(dateISO) => {
                          handleReturnDateChange(dateISO);
                          setErrors((p) => {
                            if (!("returnDate" in p)) return p;
                            const n = { ...p };
                            delete n.returnDate;
                            return n;
                          });
                        }}
                        minDate={addDaysToISODate(formData.pickupDate, 1)}
                        maxDate={getNextUnavailableDate(formData.pickupDate)}
                        label="Return Date"
                        mode="return"
                        pickupDateISO={formData.pickupDate}
                        maintenanceRanges={currentMaintenanceRanges}
                        bookingRanges={bookingRanges}
                      />
                    </div>
                    <div className="relative flex items-center bg-white rounded-xl focus-within:border-[#b50002]/30 transition-colors">
                      <FaClock className="absolute left-3 text-[#b50002] text-sm pointer-events-none z-10" />
                      <select
                        value={formData.returnTime}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            returnTime: e.target.value,
                          }))
                        }
                        className={fieldClsIcon}
                      >
                        {validReturnSlots.length > 0 ? (
                          validReturnSlots.map((slot) => (
                            <option key={slot.value} value={slot.value}>
                              {slot.label}
                            </option>
                          ))
                        ) : (
                          <option value="" disabled>
                            No hours available
                          </option>
                        )}
                      </select>
                      <FaChevronDown className="absolute right-3 text-slate-300 text-[10px] pointer-events-none" />
                    </div>
                  </div>
                  {errors.returnDate && (
                    <p className={fieldErrorTextCls}>{errors.returnDate}</p>
                  )}
                </div>

                {/* Destination */}
                <div>
                  <label className={labelCls}>Primary Destination *</label>
                  <div
                    className={
                      errors.destination
                        ? "rounded-xl ring-1 ring-[#b50002] bg-[#FDF0F0]"
                        : undefined
                    }
                  >
                    <DestinationSelect
                      value={formData.destination}
                      onChange={(destString, cityName) => {
                        setFormData((p) => ({
                          ...p,
                          destination: destString,
                          destinationCity: cityName || "",
                        }));
                        setErrors((p) => {
                          if (!("destination" in p)) return p;
                          const n = { ...p };
                          delete n.destination;
                          return n;
                        });
                      }}
                    />
                  </div>
                  {errors.destination && (
                    <p className={fieldErrorTextCls}>{errors.destination}</p>
                  )}
                  {formData.destinationCity && (
                    <div
                      className={`mt-2 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold border ${distanceFee === 0 ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}
                    >
                      <FaMapMarkerAlt className="flex-shrink-0" />
                      Approx. {distanceKm} km ({distanceTier?.label})
                      {distanceFee === 0
                        ? " — no distance fee"
                        : ` — +${formatMoney(distanceFee)} distance fee`}
                      {isEstimate ? " (estimated)" : ""}
                    </div>
                  )}
                </div>

                {/* Extras */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Extra Helmet</label>
                    <label className="flex items-center gap-3 cursor-pointer bg-white border border-slate-200 rounded-xl px-4 py-2.5 hover:border-[#b50002]/20 transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.wantsHelmet}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            wantsHelmet: e.target.checked,
                          }))
                        }
                        className="accent-[#b50002] w-4 h-4"
                      />
                      <FaHardHat className="text-[#b50002] text-sm" />
                      <span className="text-sm font-semibold text-[#171717]">
                        Include extra helmet
                      </span>
                      <span className="text-xs text-slate-400 ml-auto">
                        +{formatMoney(HELMET_FEE)}
                      </span>
                    </label>
                  </div>
                  <div>
                    <label className={labelCls}>Payment Method</label>
                    <div className="relative flex items-center bg-white rounded-xl focus-within:border-[#b50002]/30">
                      <FaTag className="absolute left-3 text-[#b50002] text-sm pointer-events-none z-10" />
                      <select
                        value={formData.paymentMethod}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            paymentMethod: e.target.value,
                          }))
                        }
                        className={fieldClsIcon}
                      >
                        <option value="Cash">Cash</option>
                        <option value="GCash">GCash</option>
                        <option value="PayMaya">PayMaya</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                      </select>
                      <FaChevronDown className="absolute right-3 text-slate-300 text-[10px] pointer-events-none" />
                    </div>
                  </div>
                </div>
              </FormSection>
            </div>

            {/* Right column — summary */}
            <div className="flex flex-col gap-4">
              {/* Fee Breakdown */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <h3 className="font-black text-[#171717] text-[14px] mb-4">
                  Fee Breakdown
                </h3>
                <div className="space-y-2">
                  {[
                    {
                      label: "Daily Rate",
                      value: applicableDiscount ? (
                        <span className="flex items-center gap-2">
                          <span className="line-through text-slate-400 font-normal">
                            {formatMoney(price)}
                          </span>
                          <span className="text-[#b50002]">
                            {formatMoney(
                              Math.round(
                                computeDiscountedPrice(
                                  price,
                                  applicableDiscount,
                                ),
                              ),
                            )}
                          </span>
                        </span>
                      ) : (
                        formatMoney(price)
                      ),
                    },
                    { label: "Days", value: days },
                    {
                      label: "Rental Subtotal",
                      value: applicableDiscount ? (
                        <span className="flex items-center gap-2">
                          <span className="line-through text-slate-400 font-normal">
                            {formatMoney(baseRental)}
                          </span>
                          <span>
                            {formatMoney(Math.round(discountedBaseRental))}
                          </span>
                        </span>
                      ) : (
                        formatMoney(baseRental)
                      ),
                    },
                    applicableDiscount && {
                      label: `Promo (${applicableDiscount.code || applicableDiscount.name})`,
                      value: `-${formatMoney(Math.round(discountAmount))}`,
                      accent: "text-emerald-600",
                    },
                    {
                      label: "Distance Fee",
                      value:
                        distanceFee > 0
                          ? `+${formatMoney(distanceFee)}`
                          : formatMoney(0),
                      accent: distanceFee > 0 ? "text-amber-600" : "",
                    },
                    {
                      label: "Helmet Fee",
                      value:
                        helmetFee > 0
                          ? `+${formatMoney(helmetFee)}`
                          : formatMoney(0),
                      accent: helmetFee > 0 ? "text-[#b50002]" : "",
                    },
                  ]
                    .filter(Boolean)
                    .map(({ label, value, accent }) => (
                      <div
                        key={label}
                        className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0"
                      >
                        <span className="text-[12px] text-slate-400">
                          {label}
                        </span>
                        <span
                          className={`text-[12px] font-bold ${accent || "text-[#171717]"}`}
                        >
                          {value}
                        </span>
                      </div>
                    ))}
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-[#171717] uppercase tracking-wider">
                      Total
                    </span>
                    <span className="text-xl font-black text-[#171717]">
                      {formatMoney(totalAmount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[11px] text-slate-400">
                      Due at pickup
                    </span>
                    <span className="text-sm font-black text-[#b50002]">
                      {formatMoney(dueAtPickup)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Rental summary */}
              {motorcycle && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                  <h3 className="font-black text-[#171717] text-[14px] mb-4">
                    Rental Summary
                  </h3>
                  <div className="space-y-2">
                    {[
                      { label: "Unit", value: motorcycle.unitId || "—" },
                      {
                        label: "Vehicle",
                        value: `${motorcycle.make} ${motorcycle.model}`,
                      },
                      {
                        label: "Pickup",
                        value: formData.pickupDate
                          ? `${formData.pickupDate} · ${formData.pickupTime}`
                          : "—",
                      },
                      {
                        label: "Return",
                        value: formData.returnDate
                          ? `${formData.returnDate} · ${formData.returnTime}`
                          : "—",
                      },
                      {
                        label: "Duration",
                        value: formData.returnDate
                          ? `${days} ${days === 1 ? "day" : "days"}`
                          : "—",
                      },
                      {
                        label: "Destination",
                        value: formData.destinationCity || "—",
                      },
                      { label: "Payment", value: formData.paymentMethod },
                    ].map(({ label, value }) => (
                      <div
                        key={label}
                        className="flex items-start justify-between py-1.5 border-b border-slate-50 last:border-0"
                      >
                        <span className="text-[11px] text-slate-400">
                          {label}
                        </span>
                        <span className="text-[11px] font-bold text-[#171717] text-right max-w-[55%]\">
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#b50002] text-white font-bold text-sm shadow-md shadow-[#b50002]/30 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                {submitting ? "Creating Booking..." : "Create Walk-In Booking"}
              </button>

              {!motorcycle && !errors.unitId && (
                <p className="text-center text-[11px] text-slate-400">
                  Load a unit by Unit ID to enable booking
                </p>
              )}
            </div>
          </div>
        </form>
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

export default WalkInRentals;
