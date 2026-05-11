import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  FaGasPump,
  FaArrowRight,
  FaTachometerAlt,
  FaShieldAlt,
  FaCogs,
  FaSearch,
  FaTimes,
  FaMotorcycle,
  FaFilter,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import axios from "axios";
import API_BASE_URL from "../apiBase";
import { getBestDiscount, PromoBanner, PriceBadge } from "./DiscountBadge";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ITEMS_PER_PAGE = 10;

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

/* ── Pagination ─────────────────────────────────────────────────── */
const Pagination = ({ currentPage, totalPages, totalItems, onPageChange }) => {
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
          color: "rgba(0,0,0,0.45)",
          fontFamily: "'Space Grotesk',sans-serif",
        }}
      >
        Showing <strong style={{ color: "#0E0E0E" }}>{startItem}</strong>–
        <strong style={{ color: "#0E0E0E" }}>{endItem}</strong> of{" "}
        <strong style={{ color: "#0E0E0E" }}>{totalItems}</strong> motorcycles
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={pgBtnStyle(false, false)}
        >
          <FaChevronLeft size={11} /> Prev
        </button>
        {withEllipsis.map((item, idx) =>
          item === "..." ? (
            <span
              key={`e-${idx}`}
              style={{
                padding: "0 4px",
                color: "rgba(0,0,0,0.3)",
                fontSize: 13,
              }}
            >
              …
            </span>
          ) : (
            <button
              key={item}
              onClick={() => onPageChange(item)}
              style={pgBtnStyle(currentPage === item, true)}
            >
              {item}
            </button>
          ),
        )}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={pgBtnStyle(false, false)}
        >
          Next <FaChevronRight size={11} />
        </button>
      </div>
    </div>
  );
};

const pgBtnStyle = (active, isNum) => ({
  display: "flex",
  alignItems: "center",
  gap: 4,
  padding: isNum ? "0" : "0 14px",
  width: isNum ? 36 : "auto",
  height: 36,
  justifyContent: "center",
  borderRadius: 8,
  border: active ? "none" : "1.5px solid rgba(0,0,0,0.1)",
  background: active ? "#b50002" : "#fff",
  color: active ? "#fff" : "#0E0E0E",
  fontSize: 13,
  fontWeight: 600,
  fontFamily: "'Space Grotesk',sans-serif",
  cursor: "pointer",
  transition: "all 0.18s",
});

/* ── Price Slider ───────────────────────────────────────────────── */
const PriceSlider = ({ min, max, value, onChange }) => {
  const [low, setLow] = useState(value[0]);
  const [high, setHigh] = useState(value[1]);

  useEffect(() => {
    setLow(value[0]);
  }, [value[0]]);
  useEffect(() => {
    setHigh(value[1]);
  }, [value[1]]);

  const pct = (v) => ((v - min) / (max - min)) * 100;

  const handleLow = (e) => {
    const v = Math.min(Number(e.target.value), high - 50);
    setLow(v);
    onChange([v, high]);
  };

  const handleHigh = (e) => {
    const v = Math.max(Number(e.target.value), low + 50);
    setHigh(v);
    onChange([low, v]);
  };

  // whichever thumb is closer to the right edge gets higher z-index
  // so it can still be grabbed when both thumbs are at the same side
  const lowZ = pct(low) > 50 ? 5 : 4;
  const highZ = pct(low) > 50 ? 4 : 5;

  return (
    <div>
      <style>{`
        .ps-wrap { position: relative; height: 36px; display: flex; align-items: center; }
        .ps-track { position: absolute; left: 0; right: 0; height: 4px; background: rgba(0,0,0,0.1); border-radius: 999px; }
        .ps-fill { position: absolute; height: 4px; background: #b50002; border-radius: 999px; pointer-events: none; }
        .ps-input {
          position: absolute; width: 100%; height: 4px;
          appearance: none; -webkit-appearance: none;
          background: transparent; pointer-events: none;
          outline: none; margin: 0;
        }
        .ps-input::-webkit-slider-thumb {
          appearance: none; -webkit-appearance: none;
          width: 20px; height: 20px; border-radius: 50%;
          background: #fff; border: 2.5px solid #b50002;
          box-shadow: 0 1px 6px rgba(0,0,0,0.18);
          pointer-events: all; cursor: grab;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .ps-input::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 2px 10px rgba(181,0,2,0.25);
        }
        .ps-input:active::-webkit-slider-thumb { cursor: grabbing; transform: scale(1.25); }
        .ps-input::-moz-range-thumb {
          width: 20px; height: 20px; border-radius: 50%;
          background: #fff; border: 2.5px solid #b50002;
          box-shadow: 0 1px 6px rgba(0,0,0,0.18);
          pointer-events: all; cursor: grab;
        }
        .ps-labels { display: flex; justify-content: space-between; margin-top: 10px; }
        .ps-label { font-size: 12px; font-weight: 600; color: #b50002; font-family: 'Space Grotesk',sans-serif; background: rgba(181,0,2,0.07); padding: 3px 9px; border-radius: 999px; }
      `}</style>
      <div className="ps-wrap">
        <div className="ps-track" />
        <div
          className="ps-fill"
          style={{ left: `${pct(low)}%`, right: `${100 - pct(high)}%` }}
        />
        <input
          type="range"
          className="ps-input"
          style={{ zIndex: lowZ }}
          min={min}
          max={max}
          step={10}
          value={low}
          onChange={handleLow}
        />
        <input
          type="range"
          className="ps-input"
          style={{ zIndex: highZ }}
          min={min}
          max={max}
          step={10}
          value={high}
          onChange={handleHigh}
        />
      </div>
      <div className="ps-labels">
        <span className="ps-label">₱{low.toLocaleString()}</span>
        <span className="ps-label">₱{high.toLocaleString()}</span>
      </div>
    </div>
  );
};

/* ── Sidebar Content ────────────────────────────────────────────── */
// ✅ Defined OUTSIDE Motorcycles so it never remounts on state change
const SidebarContent = ({
  hasActiveFilters,
  clearFilters,
  selectedCategory,
  setSelectedCategory,
  selectedFuelType,
  setSelectedFuelType,
  selectedTransmission,
  setSelectedTransmission,
  uniqueCategories,
  uniqueFuelTypes,
  transmissions,
  priceSliderMax,
  priceSliderRange,
  setPriceSliderRange,
  sortBy,
  setSortBy,
  selectStyle,
  labelStyle,
}) => (
  <>
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 20,
      }}
    >
      <span
        style={{
          fontSize: 14,
          fontWeight: 800,
          color: "#0E0E0E",
          fontFamily: "'Space Grotesk',sans-serif",
          letterSpacing: "-0.2px",
        }}
      >
        Filters
      </span>
      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#b50002",
            background: "rgba(181,0,2,0.07)",
            border: "none",
            borderRadius: 8,
            padding: "4px 10px",
            cursor: "pointer",
            fontFamily: "'Space Grotesk',sans-serif",
          }}
        >
          Clear all
        </button>
      )}
    </div>

    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>Category</label>
      <select
        style={selectStyle}
        value={selectedCategory}
        onChange={(e) => setSelectedCategory(e.target.value)}
      >
        <option value="all">All Categories</option>
        {uniqueCategories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>

    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>Fuel Type</label>
      <select
        style={selectStyle}
        value={selectedFuelType}
        onChange={(e) => setSelectedFuelType(e.target.value)}
      >
        <option value="all">All Fuel Types</option>
        {uniqueFuelTypes.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>
    </div>

    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>Transmission</label>
      <select
        style={selectStyle}
        value={selectedTransmission}
        onChange={(e) => setSelectedTransmission(e.target.value)}
      >
        <option value="all">All</option>
        {transmissions.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    </div>

    <hr
      style={{
        border: "none",
        borderTop: "1.5px solid rgba(0,0,0,0.06)",
        margin: "18px 0",
      }}
    />

    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>Price Range (₱/day)</label>
      <PriceSlider
        min={0}
        max={priceSliderMax}
        value={priceSliderRange}
        onChange={setPriceSliderRange}
      />
    </div>

    <hr
      style={{
        border: "none",
        borderTop: "1.5px solid rgba(0,0,0,0.06)",
        margin: "18px 0",
      }}
    />

    <div>
      <label style={labelStyle}>Sort By</label>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {[
          { val: "name-asc", label: "Name (A–Z)" },
          { val: "name-desc", label: "Name (Z–A)" },
          { val: "price-asc", label: "Price: Low to High" },
          { val: "price-desc", label: "Price: High to Low" },
          { val: "engine-asc", label: "Engine: Small to Big" },
          { val: "engine-desc", label: "Engine: Big to Small" },
        ].map(({ val, label }) => (
          <button
            key={val}
            onClick={() => setSortBy(val)}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              fontSize: 12.5,
              fontFamily: "'Space Grotesk',sans-serif",
              textAlign: "left",
              border: "none",
              cursor: "pointer",
              transition: "all 0.15s",
              background: sortBy === val ? "rgba(181,0,2,0.07)" : "none",
              color: sortBy === val ? "#b50002" : "rgba(0,0,0,0.55)",
              fontWeight: sortBy === val ? 700 : 400,
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  </>
);

/* ── Main ───────────────────────────────────────────────────────── */
const Motorcycles = () => {
  const navigate = useNavigate();

  const [motorcycles, setMotorcycles] = useState([]);
  const [filteredMotorcycles, setFilteredMotorcycles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedFuelType, setSelectedFuelType] = useState("all");
  const [selectedTransmission, setSelectedTransmission] = useState("all");
  const [sortBy, setSortBy] = useState("name-asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [activePromos, setActivePromos] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Price slider state — will be set once motorcycles load
  const [priceSliderMax, setPriceSliderMax] = useState(2000);
  const [priceSliderRange, setPriceSliderRange] = useState([0, 2000]);

  const abortControllerRef = useRef(null);
  const topRef = useRef(null);
  const base = "https://anaias-motorcycle-rental.onrender.com";
  const fallbackImage = `${base}/uploads/default-motorcycle.png`;

  const fetchMotorcycles = useCallback(async () => {
    setLoading(true);
    setError("");
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch (e) {}
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    try {
      const res = await axios.get(`${base}/api/motorcycles`, {
        params: { limit: 100 },
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      const json = res.data;
      const data = Array.isArray(json.data) ? json.data : (json.data ?? json);
      setMotorcycles(data);
      // set slider range based on actual prices
      const prices = data
        .map((m) => m.dailyRate ?? m.price ?? m.pricePerDay ?? 0)
        .filter(Boolean);
      if (prices.length) {
        const maxP = Math.ceil(Math.max(...prices) / 50) * 50;
        setPriceSliderMax(maxP);
        setPriceSliderRange([0, maxP]);
      }
    } catch (err) {
      const isCanceled =
        err?.code === "ERR_CANCELED" ||
        (axios.isCancel && axios.isCancel(err)) ||
        err?.name === "CanceledError";
      if (isCanceled) return;
      setError(
        err?.response?.data?.message ||
          err.message ||
          "Failed to load motorcycles",
      );
    } finally {
      setLoading(false);
    }
  }, [base]);

  const computeEffectiveAvailability = useCallback((motorcycle) => {
    const today = new Date();
    if (Array.isArray(motorcycle.bookings) && motorcycle.bookings.length) {
      const blockingBookings = motorcycle.bookings
        .filter((b) => {
          const s = (b.status || "").toLowerCase();
          return (
            ["pending", "active", "upcoming"].includes(s) &&
            !["completed", "cancelled", "canceled"].includes(s)
          );
        })
        .map((b) => {
          const pickup = b.pickupDate ?? b.startDate ?? b.start ?? b.from;
          const ret = b.returnDate ?? b.endDate ?? b.end ?? b.to;
          if (!pickup || !ret) return null;
          return { pickup: new Date(pickup), return: new Date(ret) };
        })
        .filter(Boolean);
      const overlapping = blockingBookings.filter(
        (b) =>
          startOfDay(b.pickup) <= startOfDay(today) &&
          startOfDay(today) <= startOfDay(b.return),
      );
      if (overlapping.length > 0) {
        overlapping.sort((a, b) => b.return - a.return);
        return { state: "booked", until: overlapping[0].return.toISOString() };
      }
      const future = blockingBookings.filter(
        (b) => startOfDay(b.pickup) > startOfDay(today),
      );
      if (future.length > 0) {
        future.sort((a, b) => a.pickup - b.pickup);
        const nb = future[0];
        return {
          state: "available_until_reservation",
          daysAvailable: Math.max(
            Math.floor((nb.pickup - today) / MS_PER_DAY),
            0,
          ),
          nextBookingStarts: nb.pickup.toISOString(),
        };
      }
    }
    if (motorcycle.availability) {
      if (
        motorcycle.availability.state === "booked" &&
        motorcycle.availability.until
      )
        return { state: "booked", until: motorcycle.availability.until };
      if (
        motorcycle.availability.state === "available_until_reservation" &&
        Number(motorcycle.availability.daysAvailable ?? -1) === 0
      )
        return {
          state: "booked",
          until: motorcycle.availability.until ?? null,
        };
      return motorcycle.availability;
    }
    return { state: "fully_available" };
  }, []);

  const isMotorcycleUnavailable = useCallback(
    (motorcycle) => {
      if (motorcycle?.status && motorcycle.status !== "available") return true;
      const eff = computeEffectiveAvailability(motorcycle);
      return (
        eff?.state === "booked" || eff?.state === "available_until_reservation"
      );
    },
    [computeEffectiveAvailability],
  );

  const applyFiltersAndSort = useCallback(() => {
    let filtered = [...motorcycles].filter((m) => !isMotorcycleUnavailable(m));
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          `${m.make || m.name || ""} ${m.model || ""}`
            .toLowerCase()
            .includes(term) ||
          (m.category || m.type || "").toLowerCase().includes(term),
      );
    }
    if (selectedCategory !== "all")
      filtered = filtered.filter(
        (m) =>
          (m.category || m.type || "").toLowerCase() ===
          selectedCategory.toLowerCase(),
      );
    if (selectedFuelType !== "all")
      filtered = filtered.filter(
        (m) =>
          (m.fuelType || m.fuel || "").toLowerCase() ===
          selectedFuelType.toLowerCase(),
      );
    if (selectedTransmission !== "all")
      filtered = filtered.filter(
        (m) =>
          (m.transmission || "").toLowerCase() ===
          selectedTransmission.toLowerCase(),
      );

    // price slider filter
    filtered = filtered.filter((m) => {
      const p = m.dailyRate ?? m.price ?? m.pricePerDay ?? 0;
      return p >= priceSliderRange[0] && p <= priceSliderRange[1];
    });

    filtered.sort((a, b) => {
      const aName = `${a.make || a.name || ""} ${a.model || ""}`.trim(),
        bName = `${b.make || b.name || ""} ${b.model || ""}`.trim();
      const aP = a.dailyRate ?? a.price ?? a.pricePerDay ?? 0,
        bP = b.dailyRate ?? b.price ?? b.pricePerDay ?? 0;
      const aE = a.engineSize ?? 0,
        bE = b.engineSize ?? 0;
      switch (sortBy) {
        case "name-asc":
          return aName.localeCompare(bName);
        case "name-desc":
          return bName.localeCompare(aName);
        case "price-asc":
          return aP - bP;
        case "price-desc":
          return bP - aP;
        case "engine-asc":
          return aE - bE;
        case "engine-desc":
          return bE - aE;
        default:
          return 0;
      }
    });
    setFilteredMotorcycles(filtered);
  }, [
    motorcycles,
    searchTerm,
    selectedCategory,
    selectedFuelType,
    selectedTransmission,
    priceSliderRange,
    sortBy,
    isMotorcycleUnavailable,
  ]);

  useEffect(() => {
    fetchMotorcycles();
    return () => {
      if (abortControllerRef.current) {
        try {
          abortControllerRef.current.abort();
        } catch (e) {}
      }
    };
  }, [fetchMotorcycles]);
  useEffect(() => {
    applyFiltersAndSort();
  }, [applyFiltersAndSort]);
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    selectedCategory,
    selectedFuelType,
    selectedTransmission,
    priceSliderRange,
    sortBy,
  ]);

  useEffect(() => {
    const fetchPromos = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/discounts/active`);
        const raw = Array.isArray(res.data) ? res.data : res.data.data || [];
        setActivePromos(
          raw.map((p) => ({
            ...p,
            discountType: p.discountType || p.type || "percentage",
            discountValue: Number(p.discountValue ?? p.value ?? 0),
            startDate: p.startDate || p.validFrom || null,
            endDate: p.endDate || p.validTo || null,
            maxUses:
              (p.maxUses ?? p.usageLimit) !== undefined
                ? Number(p.maxUses ?? p.usageLimit)
                : null,
            usedCount: Number(p.usedCount ?? p.usageCount ?? 0),
            minRentalDays: Number(p.minRentalDays ?? p.minimumRentalDays ?? 0),
            applicableVehicleIds:
              p.applicableVehicleIds || p.applicableVehicleUnits || [],
            applicableCategories: p.applicableCategories || [],
            isActive: p.isActive !== false,
          })),
        );
      } catch {
        setActivePromos([]);
      }
    };
    fetchPromos();
  }, []);

  const totalPages = Math.ceil(filteredMotorcycles.length / ITEMS_PER_PAGE);
  const paginatedMotorcycles = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredMotorcycles.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredMotorcycles, currentPage]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    if (topRef.current)
      topRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const getUniqueValues = (key) => [
    ...new Set(
      motorcycles
        .map((m) => m[key] || "")
        .filter(Boolean)
        .map((v) => v.toString().trim()),
    ),
  ];

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setSelectedFuelType("all");
    setSelectedTransmission("all");
    setSortBy("name-asc");
    setPriceSliderRange([0, priceSliderMax]);
  };

  const buildImageSrc = (image) => {
    if (!image) return "";
    if (Array.isArray(image)) image = image[0];
    if (typeof image !== "string") return "";
    const t = image.trim();
    if (!t) return "";
    if (/^data:image\//i.test(t) || /^https?:\/\//i.test(t)) return t;
    if (t.startsWith("res.cloudinary.com/")) return "https://" + t;
    if (t.startsWith("dxta0nmdy/")) return "https://res.cloudinary.com/" + t;
    if (t.startsWith("/")) return "https://res.cloudinary.com" + t;
    if (t.startsWith("local/"))
      return `${base}/uploads/${t.replace("local/", "")}`;
    const cn = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
    if (cn) return `https://res.cloudinary.com/${cn}/image/upload/${t}`;
    return `${base}/uploads/${t}`;
  };

  const handleImageError = (e) => {
    if (e?.target) {
      e.target.onerror = null;
      e.target.src = fallbackImage;
    }
  };

  const renderAvailabilityBadge = (_, motorcycle) => {
    if (motorcycle?.status && motorcycle.status !== "available")
      return <span style={badgeStyle("red")}>Unavailable</span>;
    const eff = computeEffectiveAvailability(motorcycle);
    if (!eff || eff.state === "fully_available")
      // return <span style={badgeStyle("green")}>Available</span>;
      return;
    if (eff.state === "booked")
      return <span style={badgeStyle("red")}>Booked</span>;
    return <span style={badgeStyle("green")}>Available</span>;
  };

  const badgeStyle = (color) => ({
    fontSize: 10,
    fontWeight: 700,
    padding: "3px 9px",
    borderRadius: 999,
    background: color === "green" ? "rgba(22,163,74,0.1)" : "rgba(181,0,2,0.1)",
    color: color === "green" ? "#16a34a" : "#b50002",
    fontFamily: "'Space Grotesk',sans-serif",
    letterSpacing: "0.3px",
  });

  const isBookDisabled = (motorcycle) => {
    const eff = computeEffectiveAvailability(motorcycle);
    if (motorcycle?.status && motorcycle.status !== "available") return true;
    return eff?.state === "booked";
  };
  const handleBook = (motorcycle, id) => {
    if (isBookDisabled(motorcycle)) return;
    navigate(`/motorcycles/${id}`, { state: { motorcycle } });
  };

  const uniqueCategories = [
    ...new Set(getUniqueValues("category").concat(getUniqueValues("type"))),
  ];
  const uniqueFuelTypes = [
    ...new Set(getUniqueValues("fuelType").concat(getUniqueValues("fuel"))),
  ];
  const transmissions = getUniqueValues("transmission");
  const hasActiveFilters =
    searchTerm ||
    selectedCategory !== "all" ||
    selectedFuelType !== "all" ||
    selectedTransmission !== "all" ||
    sortBy !== "name-asc" ||
    priceSliderRange[0] > 0 ||
    priceSliderRange[1] < priceSliderMax;

  const selectStyle = {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 10,
    border: "1.5px solid rgba(0,0,0,0.09)",
    background: "#F5F5F3",
    fontSize: 13,
    fontFamily: "'Space Grotesk',sans-serif",
    color: "#0E0E0E",
    outline: "none",
    cursor: "pointer",
  };
  const labelStyle = {
    display: "block",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "2px",
    textTransform: "uppercase",
    color: "rgba(0,0,0,0.35)",
    marginBottom: 6,
    fontFamily: "'Space Grotesk',sans-serif",
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&display=swap');

        .mc-page { background: #F5F5F3; min-height: 100vh; padding: 48px 32px 80px; font-family: 'Space Grotesk', sans-serif; box-sizing: border-box; }
        @media(max-width: 640px) { .mc-page { padding: 28px 16px 60px; } }

        .mc-inner { max-width: 1280px; margin: 0 auto; }

        .mc-top { margin-bottom: 32px; margin-top: 32px; }
        .mc-eyebrow { font-size: 10px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: #b50002; display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
        .mc-eyebrow-line { width: 20px; height: 1.5px; background: #b50002; border-radius: 2px; }
        .mc-title { font-size: clamp(24px, 3.5vw, 38px); font-weight: 800; color: #0E0E0E; letter-spacing: -1px; }

        /* search row */
        .mc-search-row { display: flex; gap: 10px; margin-bottom: 20px; align-items: center; }
        .mc-search-wrap { position: relative; flex: 1; }
        .mc-search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: rgba(0,0,0,0.35); pointer-events: none; }
        .mc-search { width: 100%; box-sizing: border-box; padding: 12px 40px; border-radius: 14px; border: 1.5px solid rgba(0,0,0,0.09); background: #fff; font-size: 14px; font-family: 'Space Grotesk', sans-serif; color: #0E0E0E; outline: none; transition: border-color 0.2s; }
        .mc-search:focus { border-color: #b50002; }
        .mc-search::placeholder { color: rgba(0,0,0,0.3); }
        .mc-search-clear { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: rgba(0,0,0,0.35); padding: 4px; }

        /* filter toggle button — mobile only */
        .mc-filter-toggle {
          display: none; align-items: center; gap: 7px;
          padding: 0 16px; height: 46px; border-radius: 14px;
          background: #0E0E0E; color: #fff;
          font-size: 13px; font-weight: 700; font-family: 'Space Grotesk',sans-serif;
          border: none; cursor: pointer; white-space: nowrap; flex-shrink: 0;
          position: relative;
        }
        .mc-filter-toggle .mc-badge {
          position: absolute; top: -5px; right: -5px;
          width: 16px; height: 16px; border-radius: 50%;
          background: #b50002; color: #fff;
          font-size: 9px; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
        }
        @media(max-width: 900px) { .mc-filter-toggle { display: flex; } }

        /* layout */
        .mc-layout { display: grid; grid-template-columns: 1fr 260px; gap: 24px; align-items: start; }
        @media(max-width: 900px) { .mc-layout { grid-template-columns: 1fr; } .mc-desktop-sidebar { display: none !important; } }

        /* desktop sidebar */
        .mc-desktop-sidebar { background: #fff; border-radius: 18px; border: 1.5px solid rgba(0,0,0,0.07); padding: 22px; position: sticky; top: 24px; }

        /* mobile drawer overlay */
        .mc-drawer-overlay {
          display: none; position: fixed; inset: 0; z-index: 1000;
          background: rgba(0,0,0,0.35); backdrop-filter: blur(2px);
          opacity: 0; transition: opacity 0.28s ease;
        }
        .mc-drawer-overlay.open { opacity: 1; }
        @media(max-width: 900px) { .mc-drawer-overlay { display: block; pointer-events: none; } .mc-drawer-overlay.open { pointer-events: all; } }

        .mc-drawer {
          position: fixed; top: 0; right: -320px; width: 300px; max-width: 90vw;
          height: 100%; background: #fff; z-index: 1001;
          overflow-y: auto; padding: 24px 20px 40px;
          box-shadow: -8px 0 40px rgba(0,0,0,0.12);
          transition: right 0.3s cubic-bezier(.2,.8,.2,1);
          box-sizing: border-box;
        }
        .mc-drawer.open { right: 0; }

        .mc-drawer-close {
          position: absolute; top: 16px; right: 16px;
          width: 32px; height: 32px; border-radius: 50%;
          background: rgba(0,0,0,0.06); border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: rgba(0,0,0,0.5);
        }

        /* list */
        .mc-list { display: flex; flex-direction: column; gap: 14px; }

        /* card */
        .mc-card {
          background: #fff; border-radius: 18px; border: 1.5px solid rgba(0,0,0,0.07);
          display: grid; grid-template-columns: 200px 1fr auto;
          overflow: hidden; transition: box-shadow 0.22s, border-color 0.22s;
        }
        .mc-card:hover { box-shadow: 0 8px 32px rgba(0,0,0,0.09); border-color: rgba(0,0,0,0.12); }
        @media(max-width: 640px) { .mc-card { grid-template-columns: 1fr; } }

        .mc-card-img { position: relative; height: 180px; background: #EEEDE9; overflow: hidden; }
        @media(max-width: 640px) { .mc-card-img { height: 200px; } }
        .mc-card-img img { width: 100%; height: 100%; object-fit: cover; object-position: center; transition: transform 0.4s ease; }
        .mc-card:hover .mc-card-img img { transform: scale(1.04); }

        .mc-card-body { padding: 18px 16px; display: flex; flex-direction: column; gap: 10px; min-width: 0; }
        .mc-card-name { font-size: 16px; font-weight: 800; color: #0E0E0E; letter-spacing: -0.3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .mc-card-type { font-size: 12px; color: rgba(0,0,0,0.38); margin-top: 2px; font-weight: 500; }
        .mc-specs { display: flex; flex-wrap: wrap; gap: 7px; }
        .mc-spec { display: flex; align-items: center; gap: 5px; font-size: 11.5px; color: rgba(0,0,0,0.5); background: #F5F5F3; padding: 4px 9px; border-radius: 999px; }

        .mc-card-action {
          display: flex; flex-direction: column; align-items: flex-end;
          justify-content: space-between; padding: 18px 16px;
          border-left: 1.5px solid rgba(0,0,0,0.05); min-width: 130px;
          flex-shrink: 0;
        }
        @media(max-width: 640px) { .mc-card-action { border-left: none; border-top: 1.5px solid rgba(0,0,0,0.06); flex-direction: row; align-items: center; min-width: unset; } }

        .mc-rent-btn {
          display: flex; align-items: center; gap: 7px;
          padding: 10px 16px; border-radius: 12px;
          background: #b50002; color: #fff;
          font-size: 13px; font-weight: 700;
          font-family: 'Space Grotesk', sans-serif;
          border: none; cursor: pointer;
          transition: background 0.18s, transform 0.15s;
          white-space: nowrap;
        }
        .mc-rent-btn:hover:not(:disabled) { background: #8f0001; transform: translateY(-1px); }
        .mc-rent-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .mc-skeleton { background: #fff; border-radius: 18px; height: 180px; border: 1.5px solid rgba(0,0,0,0.06); overflow: hidden; position: relative; }
        .mc-skeleton::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.04) 50%, transparent 100%); animation: shimmer 1.4s infinite; }
        @keyframes shimmer { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
        .mc-empty { text-align: center; padding: 60px 20px; color: rgba(0,0,0,0.4); font-size: 14px; }
      `}</style>

      {/* Mobile drawer overlay */}
      <div
        className={`mc-drawer-overlay ${sidebarOpen ? "open" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Mobile drawer */}
      <div className={`mc-drawer ${sidebarOpen ? "open" : ""}`}>
        <button
          className="mc-drawer-close"
          onClick={() => setSidebarOpen(false)}
        >
          <FaTimes size={13} />
        </button>
        <SidebarContent
          hasActiveFilters={hasActiveFilters}
          clearFilters={clearFilters}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          selectedFuelType={selectedFuelType}
          setSelectedFuelType={setSelectedFuelType}
          selectedTransmission={selectedTransmission}
          setSelectedTransmission={setSelectedTransmission}
          uniqueCategories={uniqueCategories}
          uniqueFuelTypes={uniqueFuelTypes}
          transmissions={transmissions}
          priceSliderMax={priceSliderMax}
          priceSliderRange={priceSliderRange}
          setPriceSliderRange={setPriceSliderRange}
          sortBy={sortBy}
          setSortBy={setSortBy}
          selectStyle={selectStyle}
          labelStyle={labelStyle}
        />
      </div>

      <div className="mc-page">
        <div className="mc-inner">
          {/* Header */}
          <div className="mc-top">
            <div className="mc-eyebrow"></div>
            <h1 className="mc-title">Motorcycle Collection</h1>
          </div>

          {/* Search + filter toggle */}
          <div className="mc-search-row">
            <div className="mc-search-wrap">
              <FaSearch className="mc-search-icon" size={13} />
              <input
                type="text"
                className="mc-search"
                placeholder="Search by name or category…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  className="mc-search-clear"
                  onClick={() => setSearchTerm("")}
                >
                  <FaTimes size={12} />
                </button>
              )}
            </div>
            <button
              className="mc-filter-toggle"
              onClick={() => setSidebarOpen(true)}
            >
              <FaFilter size={12} />
              Filters
              {hasActiveFilters && <span className="mc-badge">!</span>}
            </button>
          </div>

          {/* Results count */}
          <p
            ref={topRef}
            style={{
              fontSize: 13,
              color: "rgba(0,0,0,0.45)",
              marginBottom: 20,
              fontFamily: "'Space Grotesk',sans-serif",
            }}
          >
            {filteredMotorcycles.length} available motorcycle
            {filteredMotorcycles.length !== 1 ? "s" : ""}
            {totalPages > 1 && (
              <span style={{ color: "rgba(0,0,0,0.3)" }}>
                {" "}
                — page {currentPage} of {totalPages}
              </span>
            )}
          </p>

          <div className="mc-layout">
            {/* List */}
            <div className="mc-list">
              {loading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="mc-skeleton" />
                ))}
              {!loading && error && (
                <div className="mc-empty" style={{ color: "#b50002" }}>
                  {error}
                </div>
              )}
              {!loading && !error && filteredMotorcycles.length === 0 && (
                <div className="mc-empty">
                  <FaMotorcycle
                    size={32}
                    style={{ color: "rgba(0,0,0,0.15)", marginBottom: 12 }}
                  />
                  <p>
                    {motorcycles.length === 0
                      ? "No motorcycles available."
                      : "No motorcycles match your filters."}
                  </p>
                </div>
              )}

              {!loading &&
                paginatedMotorcycles.map((motorcycle, idx) => {
                  const id = motorcycle._id ?? motorcycle.id ?? idx;
                  const name =
                    `${motorcycle.make || motorcycle.name || ""} ${motorcycle.model || ""}`.trim() ||
                    "Unnamed";
                  const imageSrc =
                    buildImageSrc(motorcycle.image) || fallbackImage;
                  const disabled = isBookDisabled(motorcycle);
                  const originalPrice =
                    motorcycle.dailyRate ??
                    motorcycle.price ??
                    motorcycle.pricePerDay ??
                    0;
                  const bestDiscount = getBestDiscount(
                    motorcycle,
                    activePromos,
                    1,
                  );

                  return (
                    <div key={id} className="mc-card">
                      <div className="mc-card-img">
                        <img
                          src={imageSrc}
                          alt={name}
                          onError={handleImageError}
                        />
                        <div
                          style={{
                            position: "absolute",
                            top: 10,
                            left: 10,
                            zIndex: 2,
                          }}
                        ></div>
                        <div
                          style={{
                            position: "absolute",
                            top: 10,
                            right: 10,
                            zIndex: 2,
                          }}
                        >
                          {renderAvailabilityBadge(
                            motorcycle.availability,
                            motorcycle,
                          )}
                        </div>
                      </div>

                      <div className="mc-card-body">
                        <div>
                          <div className="mc-card-name">{name}</div>
                          <div className="mc-card-type">
                            {motorcycle.category ??
                              motorcycle.type ??
                              "Standard"}
                          </div>
                        </div>
                        <div className="mc-specs">
                          <span className="mc-spec">
                            <FaCogs size={10} />
                            {motorcycle.engineSize
                              ? `${motorcycle.engineSize}cc`
                              : "—"}
                          </span>
                          <span className="mc-spec">
                            <FaGasPump size={10} />
                            {motorcycle.fuelType ??
                              motorcycle.fuel ??
                              "Unleaded"}
                          </span>
                          <span className="mc-spec">
                            <FaTachometerAlt size={10} />
                            {motorcycle.transmission ?? "Manual"}
                          </span>
                          <span className="mc-spec">
                            <FaShieldAlt size={10} />
                            {motorcycle.hasABS ? "ABS" : "Standard"}
                          </span>
                        </div>
                      </div>

                      <div className="mc-card-action">
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-end",
                            gap: 6,
                          }}
                        >
                          <PriceBadge
                            originalPrice={Math.round(originalPrice)}
                            discount={bestDiscount}
                          />
                          {bestDiscount && (
                            <PromoBanner discount={bestDiscount} />
                          )}
                        </div>
                        <button
                          className="mc-rent-btn"
                          onClick={() => handleBook(motorcycle, id)}
                          disabled={disabled}
                        >
                          {disabled ? "Unavailable" : "Rent Now"}
                          {!disabled && <FaArrowRight size={10} />}
                        </button>
                      </div>
                    </div>
                  );
                })}

              {!loading && !error && filteredMotorcycles.length > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredMotorcycles.length}
                  onPageChange={handlePageChange}
                />
              )}
            </div>

            {/* Desktop sidebar */}
            <div className="mc-desktop-sidebar">
              <SidebarContent
                hasActiveFilters={hasActiveFilters}
                clearFilters={clearFilters}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                selectedFuelType={selectedFuelType}
                setSelectedFuelType={setSelectedFuelType}
                selectedTransmission={selectedTransmission}
                setSelectedTransmission={setSelectedTransmission}
                uniqueCategories={uniqueCategories}
                uniqueFuelTypes={uniqueFuelTypes}
                transmissions={transmissions}
                priceSliderMax={priceSliderMax}
                priceSliderRange={priceSliderRange}
                setPriceSliderRange={setPriceSliderRange}
                sortBy={sortBy}
                setSortBy={setSortBy}
                selectStyle={selectStyle}
                labelStyle={labelStyle}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Motorcycles;
