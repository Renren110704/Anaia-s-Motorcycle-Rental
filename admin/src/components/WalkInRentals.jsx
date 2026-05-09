import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  FaIdCard,
  FaTag,
  FaCog,
  FaShieldAlt,
} from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { PlusCircle, ArrowRight } from "lucide-react";

const baseURL = API_BASE_URL;
const PH_API = "https://psgc.gitlab.io/api";
const HELMET_FEE = 100;

const api = axios.create({ baseURL, headers: { Accept: "application/json" } });

// ── Shared styles (same as ManageMotorcycle) ──────────────────────────────────
const labelCls =
  "block text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase mb-1.5";
const fieldCls =
  "w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[#171717] text-sm placeholder-slate-300 focus:outline-none focus:border-[#b50002]/30";
const fieldClsIcon =
  "w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[#171717] text-sm placeholder-slate-300 focus:outline-none focus:border-[#b50002]/30 appearance-none";

const IconField = ({ icon: Icon, label, children }) => (
  <div>
    {label && <label className={labelCls}>{label}</label>}
    <div className="relative flex items-center">
      {Icon && (
        <Icon className="absolute left-3 text-[#b50002] text-sm pointer-events-none z-10" />
      )}
      {children}
    </div>
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
const nowHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const clampToReturnWindow = (t) => {
  if (!t) return RETURN_TIME_MIN;
  if (t < RETURN_TIME_MIN) return RETURN_TIME_MIN;
  if (t > RETURN_TIME_MAX) return RETURN_TIME_MAX;
  return t;
};
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
const sixMonthsFrom = (dateIso) => {
  const d = new Date(dateIso || todayISO());
  d.setHours(0, 0, 0, 0);
  d.setMonth(d.getMonth() + 6);
  return d;
};
const formatMoney = (n) => `₱${Number(n || 0).toLocaleString("en-PH")}`;

// ── PH Address Hook (unchanged logic) ────────────────────────────────────────
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
    customerName: "",
    renterEmail: "",
    phone: "",
    pickupDate: todayISO(),
    pickupTime: nowHHMM(),
    returnDate: "",
    returnTime: RETURN_TIME_MIN,
    destination: "",
    destinationCity: "",
    paymentMethod: "Cash",
    wantsHelmet: false,
  });

  const price = Number(motorcycle?.dailyRate || 0);
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
        toast.error("Motorcycle not found.");
        setMotorcycle(null);
        return;
      }
      if (m.isDeleted) {
        toast.error("Selected Unit ID is deleted and cannot be rented.");
        setMotorcycle(null);
        return;
      }
      if ((m.status || "").toLowerCase() !== "available") {
        toast.error(
          "This motorcycle is not available for a new walk-in rental.",
        );
        setMotorcycle(null);
        return;
      }
      setMotorcycle(m);
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

  const syncPickupToNow = () => {
    setFormData((p) => ({
      ...p,
      pickupDate: todayISO(),
      pickupTime: nowHHMM(),
      returnTime: clampToReturnWindow(p.returnTime),
    }));
    toast.info("Pickup synced to current time.");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!motorcycle?._id) {
      toast.error("Load a motorcycle by Unit ID first.");
      return;
    }
    if (!formData.customerName.trim()) {
      toast.error("Customer full name is required.");
      return;
    }
    const renterEmail = String(formData.renterEmail || "").trim();
    if (!renterEmail) {
      toast.error("Renter email address is required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(renterEmail)) {
      toast.error("Please enter a valid renter email address.");
      return;
    }
    const phone = formData.phone.replace(/\D/g, "");
    if (!/^09\d{9}$/.test(phone)) {
      toast.error(
        "Phone number must be numeric, 11 digits, and start with 09.",
      );
      return;
    }
    if (!address.regionCode || !address.cityCode || !address.barangayCode) {
      toast.error("Please complete customer address up to barangay.");
      return;
    }
    if (!formData.returnDate) {
      toast.error("Return date is required.");
      return;
    }
    if (!formData.destination || !formData.destinationCity) {
      toast.error("Please select destination.");
      return;
    }
    if (formData.pickupDate !== todayISO()) {
      toast.error("Pickup date for walk-in rentals must be today.");
      return;
    }
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
    const maxReturn = sixMonthsFrom(formData.pickupDate);
    if (ret <= pickup) {
      toast.error("Minimum rental duration is 24 hours.");
      return;
    }
    if (ret > maxReturn) {
      toast.error("Return date must be within 6 months from pickup date.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/api/motorcycle-bookings/walk-in", {
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
        amount: totalAmount,
        details: {
          pickupLocation:
            "Soldiers Hills IV, Block 9 Lot 1 PH2 Lily, Bacoor, 4102 Cavite",
          distanceFee,
          distanceTierLabel: distanceTier?.label || "",
          helmetRequested: formData.wantsHelmet,
          helmetFee,
          destinationCity: formData.destinationCity,
          downpayment: 0,
        },
        address: {
          barangay: address.barangayName,
          city: address.cityName,
          state: address.provinceName,
          region: address.regionName,
          zipCode: address.zipCode,
        },
      });
      toast.success("Walk-in booking created successfully.");
      setFormData((p) => ({
        ...p,
        customerName: "",
        renterEmail: "",
        phone: "",
        pickupDate: todayISO(),
        pickupTime: nowHHMM(),
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

  const SelectRow = ({ icon: Icon, label, children }) => (
    <div>
      {label && <label className={labelCls}>{label}</label>}
      <div className="relative flex items-center bg-white rounded-xl focus-within:border-[#b50002]/30 transition-colors">
        <Icon className="absolute left-3 text-[#b50002] text-sm pointer-events-none z-10" />
        {children}
        <FaChevronDown className="absolute right-3 text-slate-300 text-[10px] pointer-events-none" />
      </div>
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

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* Left column — forms */}
            <div className="xl:col-span-2 space-y-4">
              {/* Motorcycle Unit */}
              <FormSection title="Motorcycle Being Rented">
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
                  <IconField icon={FaSearch} label="Unit ID">
                    <div className="relative w-full">
                      <input
                        type="text"
                        value={unitIdInput}
                        onChange={(e) => {
                          setUnitIdInput(e.target.value.toUpperCase());
                          setShowUnitSuggestions(true);
                        }}
                        onFocus={() => setShowUnitSuggestions(true)}
                        onBlur={() =>
                          setTimeout(() => setShowUnitSuggestions(false), 120)
                        }
                        placeholder="e.g. UNIT-01"
                        className={fieldClsIcon}
                      />
                      {showUnitSuggestions && unitIdInput.trim() && (
                        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                          {loadingUnitSuggestions ? (
                            <div className="px-4 py-3 text-xs text-slate-400">
                              Searching unit IDs...
                            </div>
                          ) : unitSuggestions.length ? (
                            unitSuggestions.map((m) => (
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
                                <div>
                                  <p className="text-xs font-black text-[#b50002] uppercase tracking-wider">
                                    {m.unitId || "N/A"}
                                  </p>
                                  <p className="text-[11px] text-slate-400">
                                    {(m.make || "") + " " + (m.model || "")}
                                  </p>
                                </div>
                              </button>
                            ))
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
                      <p className="font-black text-[#171717] text-[15px] leading-tight">
                        {motorcycle.make} {motorcycle.model}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {motorcycle.year} · {motorcycle.category}
                      </p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                        {[
                          {
                            icon: FaTachometerAlt,
                            label: formatMoney(motorcycle.dailyRate) + "/day",
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
                  <IconField icon={FaUser} label="Full Name *">
                    <input
                      type="text"
                      value={formData.customerName}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          customerName: e.target.value,
                        }))
                      }
                      placeholder="Customer full name"
                      className={fieldClsIcon}
                    />
                  </IconField>
                  <IconField icon={FaEnvelope} label="Email Address *">
                    <input
                      type="email"
                      value={formData.renterEmail}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          renterEmail: e.target.value,
                        }))
                      }
                      placeholder="email@example.com"
                      className={fieldClsIcon}
                    />
                  </IconField>
                  <IconField icon={FaPhone} label="Phone Number *">
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          phone: e.target.value.replace(/\D/g, "").slice(0, 11),
                        }))
                      }
                      placeholder="09XXXXXXXXX"
                      className={fieldClsIcon}
                    />
                  </IconField>
                </div>

                {/* Customer Address */}
                <div>
                  <label className={labelCls}>Customer Address *</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <SelectRow icon={FaMapMarkerAlt} label="">
                      <select
                        value={address.regionCode}
                        onChange={onAddressRegion}
                        className={fieldClsIcon}
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
                      <SelectRow icon={FaMapMarkerAlt} label="">
                        <select
                          value={address.cityCode}
                          onChange={onAddressCity}
                          disabled={!address.regionCode || loading.cities}
                          className={fieldClsIcon}
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
                      <SelectRow icon={FaMapMarkerAlt} label="">
                        <select
                          value={address.cityCode}
                          onChange={onAddressCity}
                          disabled={loading.cities || !address.provinceCode}
                          className={fieldClsIcon}
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

                    <SelectRow icon={FaMapMarkerAlt} label="">
                      <select
                        value={address.barangayCode}
                        onChange={onAddressBarangay}
                        disabled={!address.cityCode || loading.barangays}
                        className={fieldClsIcon}
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
                    <IconField icon={FaCalendarAlt}>
                      <input
                        type="date"
                        value={formData.pickupDate}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            pickupDate: e.target.value || todayISO(),
                          }))
                        }
                        min={todayISO()}
                        max={todayISO()}
                        className={fieldClsIcon}
                      />
                    </IconField>
                    <IconField icon={FaClock}>
                      <input
                        type="time"
                        step="60"
                        value={formData.pickupTime}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            pickupTime: e.target.value,
                          }))
                        }
                        className={fieldClsIcon}
                      />
                    </IconField>
                  </div>
                  <button
                    type="button"
                    onClick={syncPickupToNow}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-500 font-bold text-xs hover:border-[#b50002]/20 hover:text-[#b50002] transition-all"
                  >
                    <FaClock className="text-[10px]" /> Sync to Now
                  </button>
                </div>

                {/* Return */}
                <div>
                  <label className={labelCls}>Return</label>
                  <div className="grid grid-cols-2 gap-3">
                    <IconField icon={FaCalendarAlt}>
                      <input
                        type="date"
                        value={formData.returnDate}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (!value) {
                            setFormData((p) => ({ ...p, returnDate: "" }));
                            return;
                          }
                          const max = sixMonthsFrom(formData.pickupDate);
                          const selected = new Date(value);
                          if (selected > max) {
                            toast.error(
                              "Return date must be within 6 months from pickup date.",
                            );
                            return;
                          }
                          if (value < formData.pickupDate) {
                            toast.error("Minimum rental duration is 24 hours.");
                            return;
                          }
                          if (value === formData.pickupDate) {
                            toast.error(
                              "Same-day booking is disabled. Minimum is 24 hours.",
                            );
                            return;
                          }
                          setFormData((p) => ({ ...p, returnDate: value }));
                        }}
                        min={addDaysToISODate(formData.pickupDate, 1)}
                        max={formatLocalDate(
                          sixMonthsFrom(formData.pickupDate),
                        )}
                        className={fieldClsIcon}
                      />
                    </IconField>
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
                        {validReturnSlots.map((slot) => (
                          <option key={slot.value} value={slot.value}>
                            {slot.label}
                          </option>
                        ))}
                      </select>
                      <FaChevronDown className="absolute right-3 text-slate-300 text-[10px] pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Destination */}
                <div>
                  <label className={labelCls}>Primary Destination *</label>
                  <DestinationSelect
                    value={formData.destination}
                    onChange={(destString, cityName) =>
                      setFormData((p) => ({
                        ...p,
                        destination: destString,
                        destinationCity: cityName || "",
                      }))
                    }
                  />
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
                    { label: "Daily Rate", value: formatMoney(price) },
                    { label: "Days", value: days },
                    {
                      label: "Rental Subtotal",
                      value: formatMoney(baseRental),
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
                  ].map(({ label, value, accent }) => (
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
                        label: "Motorcycle",
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
                        <span className="text-[11px] font-bold text-[#171717] text-right max-w-[55%]">
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
                disabled={submitting || !motorcycle}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#b50002] text-white font-bold text-sm shadow-md shadow-[#b50002]/30 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                {submitting ? "Creating Booking..." : "Create Walk-In Booking"}
              </button>

              {!motorcycle && (
                <p className="text-center text-[11px] text-slate-400">
                  Load a motorcycle by Unit ID to enable booking
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
