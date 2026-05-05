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
} from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const baseURL = API_BASE_URL;
const PH_API = "https://psgc.gitlab.io/api";
const HELMET_FEE = 100;

const api = axios.create({ baseURL, headers: { Accept: "application/json" } });

const getImageSrc = (imagePath) => {
  if (!imagePath) return "";
  if (/^data:image\//i.test(String(imagePath))) {
    return imagePath;
  }
  if (String(imagePath).startsWith("http://") || String(imagePath).startsWith("https://")) {
    return imagePath;
  }
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
  "DASMARINAS": 20,
  "DASMARI\u00d1AS": 20,
  "CITY OF DASMARI\u00d1AS": 20,
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
  "PARANAQUE": 20,
  "PARA\u00d1AQUE": 20,
  "CITY OF PARA\u00d1AQUE": 20,
  "LAS PINAS": 16,
  "LAS PI\u00d1AS": 16,
  "CITY OF LAS PI\u00d1AS": 16,
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
  "BI\u00d1AN": 22,
  "CITY OF BI\u00d1AN": 22,
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
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDaysToISODate = (dateISO, days) => {
  const d = new Date(dateISO || todayISO());
  d.setDate(d.getDate() + days);
  return formatLocalDate(d);
};

const todayISO = () => formatLocalDate(new Date());

const nowHHMM = () => {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

const clampToReturnWindow = (timeStr) => {
  if (!timeStr) return RETURN_TIME_MIN;
  if (timeStr < RETURN_TIME_MIN) return RETURN_TIME_MIN;
  if (timeStr > RETURN_TIME_MAX) return RETURN_TIME_MAX;
  return timeStr;
};

const getValidReturnSlots = (pickupDate, returnDate, pickupTime) => {
  if (!returnDate || !pickupDate || returnDate !== pickupDate) {
    return ALL_TIME_SLOTS;
  }
  return ALL_TIME_SLOTS.filter((s) => s.value > pickupTime);
};

const isOClockTime = (timeStr = "") => /^\d{2}:00$/.test(String(timeStr));

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

const formatMoney = (n) => `\u20b1${Number(n || 0).toLocaleString("en-PH")}`;

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
          setCities((r2.data || []).sort((a, b) => a.name.localeCompare(b.name)));
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
      setBarangays((res.data || []).sort((a, b) => a.name.localeCompare(b.name)));
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

const selectCls =
  "w-full pl-10 pr-8 py-2.5 bg-transparent text-[#171717] text-sm focus:outline-none rounded-xl appearance-none disabled:opacity-50";

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
    const dest = [name, sel.provinceName, sel.regionName].filter(Boolean).join(", ");
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
          disabled={loading.regions}
          required
          className={selectCls}
        >
          <option value="">{loading.regions ? "Loading regions..." : "Select Region *"}</option>
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
            disabled={loading.provinces}
            className={selectCls}
          >
            <option value="">{loading.provinces ? "Loading provinces..." : "Select Province *"}</option>
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
            disabled={loading.cities || (hasProvinces ? !sel.provinceCode : !sel.regionCode)}
            className={selectCls}
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
          <FaChevronDown className="absolute right-3 text-[#171717]/40 text-xs pointer-events-none" />
        </div>
      )}

      {sel.cityCode && (
        <div className="relative flex items-center bg-white/60 border border-[#171717]/10 rounded-xl shadow-sm focus-within:border-black transition-all hover:bg-white/90">
          <FaMapMarkerAlt className="absolute left-3.5 text-[#b50002] text-sm pointer-events-none" />
          <select
            value={sel.barangayCode}
            onChange={handleBarangay}
            disabled={loading.barangays}
            className={selectCls}
          >
            <option value="">{loading.barangays ? "Loading barangays..." : "Select Barangay (optional)"}</option>
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
        <p className="text-xs text-[#171717] flex items-center gap-1.5 px-1">
          <FaCheckCircle className="flex-shrink-0 text-[#b50002]" />
          {value}
        </p>
      )}
    </div>
  );
};

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
  const { fee: distanceFee, tier: distanceTier, km: distanceKm, isEstimate } = getDistanceFee(
    formData.destinationCity,
  );
  const helmetFee = formData.wantsHelmet ? HELMET_FEE : 0;
  const baseRental = days * price;
  const totalAmount = baseRental + distanceFee + helmetFee;

  const validReturnSlots = useMemo(
    () => getValidReturnSlots(formData.pickupDate, formData.returnDate, formData.pickupTime),
    [formData.pickupDate, formData.returnDate, formData.pickupTime],
  );

  useEffect(() => {
    if (!validReturnSlots.length) return;
    if (!validReturnSlots.some((slot) => slot.value === formData.returnTime)) {
      setFormData((p) => ({ ...p, returnTime: validReturnSlots[0].value }));
    }
  }, [formData.returnTime, validReturnSlots]);

  useEffect(() => {
    const query = unitIdInput.trim();

    if (!query) {
      setUnitSuggestions([]);
      setLoadingUnitSuggestions(false);
      return undefined;
    }

    let active = true;
    const timer = setTimeout(async () => {
      setLoadingUnitSuggestions(true);
      try {
        const res = await api.get("/api/motorcycles", {
          params: {
            search: query,
            includeDeleted: true,
            page: 1,
            limit: 80,
          },
        });

        if (!active) return;

        const q = query.toUpperCase();
        const matches = (res.data?.data || [])
          .filter((m) => String(m?.unitId || "").toUpperCase().includes(q))
          .sort((a, b) => {
            const aId = String(a?.unitId || "").toUpperCase();
            const bId = String(b?.unitId || "").toUpperCase();
            const aStarts = aId.startsWith(q) ? 0 : 1;
            const bStarts = bId.startsWith(q) ? 0 : 1;
            if (aStarts !== bStarts) return aStarts - bStarts;
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
      const res = await api.get(`/api/motorcycles/unit/${encodeURIComponent(unitId)}`);
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
        toast.error("This motorcycle is not available for a new walk-in rental.");
        setMotorcycle(null);
        return;
      }
      setMotorcycle(m);
      toast.success(`Loaded ${m.make || ""} ${m.model || ""}`.trim());
    } catch (err) {
      setMotorcycle(null);
      toast.error(String(err?.response?.data?.message || "Failed to load motorcycle."));
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
    const nowDate = todayISO();
    const nowTime = nowHHMM();
    setFormData((p) => ({
      ...p,
      pickupDate: nowDate,
      pickupTime: nowTime,
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
      toast.error("Phone number must be numeric, 11 digits, and start with 09.");
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
          pickupLocation: "Soldiers Hills IV, Block 9 Lot 1 PH2 Lily, Bacoor, 4102 Cavite",
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
      toast.error(String(err?.response?.data?.message || "Failed to create walk-in booking."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#e3e3e3] pt-40 px-4 sm:px-6 lg:px-8 pb-12">
      <ToastContainer position="top-right" autoClose={3000} theme="colored" icon={false} />

      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold bg-[#b50002] bg-clip-text text-transparent">
            Walk-In Rentals
          </h1>
          <p className="text-[#171717]/60 mt-2 text-sm sm:text-base">
            Create walk-in rentals with a minimum 24-hour rental duration.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white/40 backdrop-blur-md rounded-2xl shadow-xl shadow-black/10 p-5 sm:p-6 space-y-6"
        >
          <section className="space-y-3">
            <h2 className="text-sm font-black uppercase tracking-wider text-[#171717]/70">
              Motorcycle Being Rented
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
              <div className="relative bg-white/60 border border-[#171717]/10 rounded-xl">
                <FaSearch className="absolute left-3.5 top-3.5 text-[#b50002] text-sm" />
                <input
                  type="text"
                  value={unitIdInput}
                  onChange={(e) => {
                    setUnitIdInput(e.target.value.toUpperCase());
                    setShowUnitSuggestions(true);
                  }}
                  onFocus={() => setShowUnitSuggestions(true)}
                  onBlur={() => {
                    setTimeout(() => setShowUnitSuggestions(false), 120);
                  }}
                  placeholder="Enter Unit ID"
                  className="w-full pl-10 pr-4 py-2.5 bg-transparent text-[#171717] text-sm placeholder-[#171717]/40 focus:outline-none rounded-xl"
                />

                {showUnitSuggestions && unitIdInput.trim() && (
                  <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 bg-white border border-[#171717]/10 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                    {loadingUnitSuggestions ? (
                      <div className="px-3 py-2 text-xs text-[#171717]/60">Searching unit IDs...</div>
                    ) : unitSuggestions.length ? (
                      unitSuggestions.map((m) => (
                        <button
                          key={m._id}
                          type="button"
                          onMouseDown={() => chooseUnitSuggestion(m.unitId)}
                          className="w-full text-left px-3 py-2 hover:bg-[#171717]/5 border-b last:border-b-0 border-[#171717]/10 flex items-center gap-3"
                        >
                          <div className="w-11 h-8 rounded overflow-hidden bg-[#171717]/5 border border-[#171717]/10 flex-shrink-0">
                            {m.image ? (
                              <img
                                src={getImageSrc(m.image)}
                                alt={`${m.make || ""} ${m.model || ""}`.trim() || "Motorcycle"}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[9px] text-[#171717]/35">
                                No Img
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-[#171717]">{m.unitId || "N/A"}</div>
                            <div className="text-xs text-[#171717]/60">
                              {(m.make || "") + " " + (m.model || "")}
                            </div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-xs text-[#171717]/60">No matching Unit IDs found.</div>
                    )}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={loadMotorcycleByUnit}
                disabled={loadingMoto}
                className="px-5 py-2.5 rounded-xl bg-[#171717] text-white font-bold text-sm hover:brightness-110 disabled:opacity-60"
              >
                {loadingMoto ? "Loading..." : "Load by Unit ID"}
              </button>
            </div>

            {motorcycle && (
              <div className="bg-white/70 border border-[#171717]/10 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-[120px_1fr] gap-3 text-sm">
                <div className="w-[110px] h-[78px] rounded-lg overflow-hidden bg-[#171717]/5 border border-[#171717]/10">
                  {motorcycle.image ? (
                    <img
                      src={getImageSrc(motorcycle.image)}
                      alt={`${motorcycle.make || ""} ${motorcycle.model || ""}`.trim() || "Motorcycle"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[11px] text-[#171717]/40">
                      No Image
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-[#171717]">
                    <FaMotorcycle className="text-[#b50002]" />
                    <span className="font-semibold">
                      {(motorcycle.make || "") + " " + (motorcycle.model || "")}
                    </span>
                  </div>
                  <div className="text-[#171717]/70">
                    Unit ID: <span className="font-semibold text-[#171717]">{motorcycle.unitId || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#171717]/70">
                    <FaTachometerAlt className="text-[#b50002]" />
                    Daily Rate: <span className="font-semibold text-[#171717]">{formatMoney(motorcycle.dailyRate)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#171717]/70">
                    <FaGasPump className="text-[#b50002]" />
                    {motorcycle.fuelType || "Unspecified"}
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-black uppercase tracking-wider text-[#171717]/70">
              Customer Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="relative bg-white/60 border border-[#171717]/10 rounded-xl">
                <FaUser className="absolute left-3.5 top-3.5 text-[#b50002] text-sm" />
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, customerName: e.target.value }))
                  }
                  placeholder="Customer Full Name"
                  className="w-full pl-10 pr-4 py-2.5 bg-transparent text-[#171717] text-sm placeholder-[#171717]/40 focus:outline-none rounded-xl"
                />
              </div>
              <div className="relative bg-white/60 border border-[#171717]/10 rounded-xl">
                <FaEnvelope className="absolute left-3.5 top-3.5 text-[#b50002] text-sm" />
                <input
                  type="email"
                  value={formData.renterEmail}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, renterEmail: e.target.value }))
                  }
                  placeholder="Renter Email Address"
                  className="w-full pl-10 pr-4 py-2.5 bg-transparent text-[#171717] text-sm placeholder-[#171717]/40 focus:outline-none rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="relative bg-white/60 border border-[#171717]/10 rounded-xl">
                <FaPhone className="absolute left-3.5 top-3.5 text-[#b50002] text-sm" />
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, phone: e.target.value.replace(/\D/g, "").slice(0, 11) }))
                  }
                  placeholder="09XXXXXXXXX"
                  className="w-full pl-10 pr-4 py-2.5 bg-transparent text-[#171717] text-sm placeholder-[#171717]/40 focus:outline-none rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="relative bg-white/60 border border-[#171717]/10 rounded-xl">
                <FaMapMarkerAlt className="absolute left-3.5 top-3.5 text-[#b50002] text-sm" />
                <select
                  value={address.regionCode}
                  onChange={onAddressRegion}
                  className={selectCls}
                >
                  <option value="">{loading.regions ? "Loading regions..." : "Select Region *"}</option>
                  {regions.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <FaChevronDown className="absolute right-3 top-3 text-[#171717]/40 text-xs pointer-events-none" />
              </div>

              {hasProvinces ? (
                <div className="relative bg-white/60 border border-[#171717]/10 rounded-xl">
                  <FaMapMarkerAlt className="absolute left-3.5 top-3.5 text-[#b50002] text-sm" />
                  <select
                    value={address.provinceCode}
                    onChange={onAddressProvince}
                    disabled={!address.regionCode || loading.provinces}
                    className={selectCls}
                  >
                    <option value="">{loading.provinces ? "Loading provinces..." : "Select Province *"}</option>
                    {provinces.map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <FaChevronDown className="absolute right-3 top-3 text-[#171717]/40 text-xs pointer-events-none" />
                </div>
              ) : (
                <div className="relative bg-white/60 border border-[#171717]/10 rounded-xl">
                  <FaMapMarkerAlt className="absolute left-3.5 top-3.5 text-[#b50002] text-sm" />
                  <select
                    value={address.cityCode}
                    onChange={onAddressCity}
                    disabled={!address.regionCode || loading.cities}
                    className={selectCls}
                  >
                    <option value="">{loading.cities ? "Loading cities..." : "Select City / Municipality *"}</option>
                    {cities.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <FaChevronDown className="absolute right-3 top-3 text-[#171717]/40 text-xs pointer-events-none" />
                </div>
              )}

              {hasProvinces && (
                <div className="relative bg-white/60 border border-[#171717]/10 rounded-xl">
                  <FaMapMarkerAlt className="absolute left-3.5 top-3.5 text-[#b50002] text-sm" />
                  <select
                    value={address.cityCode}
                    onChange={onAddressCity}
                    disabled={loading.cities || !address.provinceCode}
                    className={selectCls}
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
                  <FaChevronDown className="absolute right-3 top-3 text-[#171717]/40 text-xs pointer-events-none" />
                </div>
              )}

              <div className="relative bg-white/60 border border-[#171717]/10 rounded-xl">
                <FaMapMarkerAlt className="absolute left-3.5 top-3.5 text-[#b50002] text-sm" />
                <select
                  value={address.barangayCode}
                  onChange={onAddressBarangay}
                  disabled={!address.cityCode || loading.barangays}
                  className={selectCls}
                >
                  <option value="">{loading.barangays ? "Loading barangays..." : "Select Barangay *"}</option>
                  {barangays.map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <FaChevronDown className="absolute right-3 top-3 text-[#171717]/40 text-xs pointer-events-none" />
              </div>

              <div className="relative bg-white/60 border border-[#171717]/10 rounded-xl">
                <FaMapMarkerAlt className="absolute left-3.5 top-3.5 text-[#b50002] text-sm" />
                <input
                  type="text"
                  value={address.zipCode}
                  onChange={(e) =>
                    setAddress((p) => ({ ...p, zipCode: e.target.value.replace(/\D/g, "").slice(0, 4) }))
                  }
                  placeholder="ZIP Code"
                  className="w-full pl-10 pr-4 py-2.5 bg-transparent text-[#171717] text-sm placeholder-[#171717]/40 focus:outline-none rounded-xl"
                />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-black uppercase tracking-wider text-[#171717]/70">
              Booking Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="relative bg-white/60 border border-[#171717]/10 rounded-xl">
                <FaCalendarAlt className="absolute left-3.5 top-3.5 text-[#b50002] text-sm" />
                <input
                  type="date"
                  value={formData.pickupDate}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, pickupDate: e.target.value || todayISO() }))
                  }
                  min={todayISO()}
                  max={todayISO()}
                  className="w-full pl-10 pr-4 py-2.5 bg-transparent text-[#171717] text-sm focus:outline-none rounded-xl"
                />
              </div>
              <div className="relative bg-white/60 border border-[#171717]/10 rounded-xl">
                <FaClock className="absolute left-3.5 top-3.5 text-[#b50002] text-sm" />
                <input
                  type="time"
                  step="60"
                  value={formData.pickupTime}
                  onChange={(e) => setFormData((p) => ({ ...p, pickupTime: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2.5 bg-transparent text-[#171717] text-sm focus:outline-none rounded-xl"
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={syncPickupToNow}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#171717] text-white text-sm font-bold hover:brightness-110"
                >
                  Today
                </button>
              </div>

              <div className="relative bg-white/60 border border-[#171717]/10 rounded-xl">
                <FaCalendarAlt className="absolute left-3.5 top-3.5 text-[#b50002] text-sm" />
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
                      toast.error("Return date must be within 6 months from pickup date.");
                      return;
                    }
                    if (value < formData.pickupDate) {
                      toast.error("Minimum rental duration is 24 hours.");
                      return;
                    }
                    if (value === formData.pickupDate) {
                      toast.error("Same-day booking is disabled. Minimum is 24 hours.");
                      return;
                    }
                    setFormData((p) => ({ ...p, returnDate: value }));
                  }}
                  min={addDaysToISODate(formData.pickupDate, 1)}
                  max={formatLocalDate(sixMonthsFrom(formData.pickupDate))}
                  className="w-full pl-10 pr-4 py-2.5 bg-transparent text-[#171717] text-sm focus:outline-none rounded-xl"
                />
              </div>

              <div className="relative bg-white/60 border border-[#171717]/10 rounded-xl">
                <FaClock className="absolute left-3.5 top-3.5 text-[#b50002] text-sm" />
                <select
                  value={formData.returnTime}
                  onChange={(e) => {
                    setFormData((p) => ({ ...p, returnTime: e.target.value }));
                  }}
                  className="w-full pl-10 pr-4 py-2.5 bg-transparent text-[#171717] text-sm focus:outline-none rounded-xl"
                >
                  {validReturnSlots.map((slot) => (
                    <option key={slot.value} value={slot.value}>
                      {slot.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-white/60 border border-[#171717]/10 rounded-xl p-3">
              <label className="text-xs font-semibold text-[#171717]/70 uppercase tracking-wider block mb-2">
                Primary Destination
              </label>
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
                  className={`mt-2 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    distanceFee === 0
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-orange-50 text-orange-700 border border-orange-200"
                  }`}
                >
                  <FaMapMarkerAlt />
                  Approx. {distanceKm} km ({distanceTier?.label})
                  {distanceFee === 0 ? " - no distance fee" : ` - +${formatMoney(distanceFee)} distance fee`}
                  {isEstimate ? " (estimated)" : ""}
                </div>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm text-[#171717]/80 font-medium">
              <input
                type="checkbox"
                checked={formData.wantsHelmet}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, wantsHelmet: e.target.checked }))
                }
                className="accent-[#b50002]"
              />
              <FaHardHat className="text-[#b50002]" />
              Include extra helmet (+{formatMoney(HELMET_FEE)})
            </label>

            <div className="relative bg-white/60 border border-[#171717]/10 rounded-xl">
              <FaChevronDown className="absolute right-3 top-3 text-[#171717]/40 text-xs pointer-events-none" />
              <select
                value={formData.paymentMethod}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, paymentMethod: e.target.value }))
                }
                className={selectCls}
              >
                <option value="Cash">Cash</option>
                <option value="GCash">GCash</option>
                <option value="PayMaya">PayMaya</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-black uppercase tracking-wider text-[#171717]/70">
              Fee Breakdown
            </h2>
            <div className="bg-white/70 border border-[#171717]/10 rounded-2xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#171717]/60">Daily Rate</span>
                <span className="font-semibold text-[#171717]">{formatMoney(price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#171717]/60">Days</span>
                <span className="font-semibold text-[#171717]">{days}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#171717]/60">Rental Subtotal</span>
                <span className="font-semibold text-[#171717]">{formatMoney(baseRental)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#171717]/60">Distance Fee</span>
                <span className="font-semibold text-[#171717]">{distanceFee > 0 ? `+${formatMoney(distanceFee)}` : formatMoney(0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#171717]/60">Helmet Fee</span>
                <span className="font-semibold text-[#171717]">{helmetFee > 0 ? `+${formatMoney(helmetFee)}` : formatMoney(0)}</span>
              </div>
              <div className="pt-2 mt-2 border-t border-[#171717]/10 flex justify-between">
                <span className="font-black text-[#171717] uppercase tracking-wider">Total</span>
                <span className="font-black text-[#b50002] text-base">{formatMoney(totalAmount)}</span>
              </div>
            </div>
          </section>

          <button
            type="submit"
            disabled={submitting || !motorcycle}
            className="w-full py-3 rounded-xl bg-[#171717] text-white font-bold hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? "Creating Walk-In Booking..." : "Create Walk-In Booking"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default WalkInRentals;
