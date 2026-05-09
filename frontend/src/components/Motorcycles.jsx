import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaGasPump,
  FaArrowRight,
  FaTachometerAlt,
  FaShieldAlt,
  FaCogs,
  FaSearch,
  FaTimes,
  FaFilter,
  FaSortAmountDown,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import axios from "axios";
import { carPageStyles } from "../assets/dummyStyles";
import { getBestDiscount, computeDiscountedPrice } from "./DiscountBadge";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ITEMS_PER_PAGE = 12;

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const daysBetween = (from, to) =>
  Math.ceil((startOfDay(to) - startOfDay(from)) / MS_PER_DAY);

// ── Pagination Component ───────────────────────────────────────────────────────
const Pagination = ({ currentPage, totalPages, totalItems, onPageChange }) => {
  if (totalPages <= 1) return null;

  const pages = [];
  const delta = 2;
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - delta && i <= currentPage + delta)
    ) {
      pages.push(i);
    }
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
    <div className="mt-10 flex flex-col items-center gap-4">
      {/* Result range */}
      <p className="text-sm text-[#171717]/60">
        Showing{" "}
        <span className="font-semibold text-[#171717]">{startItem}</span> –{" "}
        <span className="font-semibold text-[#171717]">{endItem}</span> of{" "}
        <span className="font-semibold text-[#171717]">{totalItems}</span>{" "}
        motorcycles
      </p>

      {/* Page buttons */}
      <div className="flex items-center gap-2">
        {/* Prev */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#b9b9b9] text-[#171717]
            disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#a0a0a0]
            transition-all shadow-lg shadow-black/20 text-sm font-medium"
        >
          <FaChevronLeft className="text-xs" />
          <span className="hidden sm:inline">Prev</span>
        </button>

        {/* Page numbers */}
        {withEllipsis.map((item, idx) =>
          item === "..." ? (
            <span
              key={`ellipsis-${idx}`}
              className="px-2 py-2 text-[#171717]/50 text-sm select-none"
            >
              …
            </span>
          ) : (
            <button
              key={item}
              onClick={() => onPageChange(item)}
              className={`
                w-10 h-10 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-black/20
                ${
                  currentPage === item
                    ? "bg-[#b50002] text-white scale-105 shadow-red-900/30"
                    : "bg-[#b9b9b9] text-[#171717] hover:bg-[#a0a0a0]"
                }
              `}
            >
              {item}
            </button>
          ),
        )}

        {/* Next */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#b9b9b9] text-[#171717]
            disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#a0a0a0]
            transition-all shadow-lg shadow-black/20 text-sm font-medium"
        >
          <span className="hidden sm:inline">Next</span>
          <FaChevronRight className="text-xs" />
        </button>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const Motorcycles = () => {
  const navigate = useNavigate();

  const [motorcycles, setMotorcycles] = useState([]);
  const [filteredMotorcycles, setFilteredMotorcycles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedFuelType, setSelectedFuelType] = useState("all");
  const [selectedTransmission, setSelectedTransmission] = useState("all");
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [sortBy, setSortBy] = useState("name-asc");
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Active promos
  const [activePromos, setActivePromos] = useState([]);

  const abortControllerRef = useRef(null);
  const topRef = useRef(null);
  const base = 'https://anaias-motorcycle-rental.onrender.com';
  const limit = 100;
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
        params: { limit },
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      const json = res.data;
      setMotorcycles(
        Array.isArray(json.data) ? json.data : (json.data ?? json),
      );
    } catch (err) {
      const isCanceled =
        err?.code === "ERR_CANCELED" ||
        (axios.isCancel && axios.isCancel(err)) ||
        err?.name === "CanceledError";
      if (isCanceled) return;
      console.error("Failed to fetch motorcycles:", err);
      setError(
        err?.response?.data?.message ||
          err.message ||
          "Failed to load motorcycles",
      );
    } finally {
      setLoading(false);
    }
  }, [base, limit]);

  const computeEffectiveAvailability = useCallback((motorcycle) => {
    const today = new Date();

    if (Array.isArray(motorcycle.bookings) && motorcycle.bookings.length) {
      const blockingBookings = motorcycle.bookings
        .filter((b) => {
          const blockingStatuses = ["pending", "active", "upcoming"];
          const nonBlockingStatuses = ["completed", "cancelled", "canceled"];
          const status = (b.status || "").toLowerCase();
          return (
            blockingStatuses.includes(status) &&
            !nonBlockingStatuses.includes(status)
          );
        })
        .map((b) => {
          const pickup = b.pickupDate ?? b.startDate ?? b.start ?? b.from;
          const ret = b.returnDate ?? b.endDate ?? b.end ?? b.to;
          if (!pickup || !ret) return null;
          return { pickup: new Date(pickup), return: new Date(ret), raw: b };
        })
        .filter(Boolean);

      const overlapping = blockingBookings.filter(
        (b) =>
          startOfDay(b.pickup) <= startOfDay(today) &&
          startOfDay(today) <= startOfDay(b.return),
      );

      if (overlapping.length > 0) {
        overlapping.sort((a, b) => b.return - a.return);
        return {
          state: "booked",
          until: overlapping[0].return.toISOString(),
          source: "bookings",
        };
      }

      const futureBookings = blockingBookings.filter(
        (b) => startOfDay(b.pickup) > startOfDay(today),
      );

      if (futureBookings.length > 0) {
        futureBookings.sort((a, b) => a.pickup - b.pickup);
        const nextBooking = futureBookings[0];
        const msAvailable = nextBooking.pickup - today;
        const daysAvailable = Math.floor(msAvailable / MS_PER_DAY);
        return {
          state: "available_until_reservation",
          daysAvailable: Math.max(daysAvailable, 0),
          nextBookingStarts: nextBooking.pickup.toISOString(),
          source: "bookings",
        };
      }
    }

    if (motorcycle.availability) {
      if (
        motorcycle.availability.state === "booked" &&
        motorcycle.availability.until
      ) {
        return {
          state: "booked",
          until: motorcycle.availability.until,
          source: "availability",
        };
      }
      if (
        motorcycle.availability.state === "available_until_reservation" &&
        Number(motorcycle.availability.daysAvailable ?? -1) === 0
      ) {
        return {
          state: "booked",
          until: motorcycle.availability.until ?? null,
          source: "availability-res-starts-today",
          nextBookingStarts: motorcycle.availability.nextBookingStarts,
        };
      }
      return { ...motorcycle.availability, source: "availability" };
    }

    return { state: "fully_available", source: "none" };
  }, []);

  const isMotorcycleUnavailable = useCallback((motorcycle) => {
    if (motorcycle?.status && motorcycle.status !== "available") return true;
    const effective = computeEffectiveAvailability(motorcycle);
    return (
      effective?.state === "booked" ||
      effective?.state === "available_until_reservation"
    );
  }, [computeEffectiveAvailability]);

  const applyFiltersAndSort = useCallback(() => {
    let filtered = [...motorcycles];
    filtered = filtered.filter((m) => !isMotorcycleUnavailable(m));

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((m) => {
        const name = `${m.make || m.name || ""} ${m.model || ""}`.toLowerCase();
        const category = (m.category || m.type || "").toLowerCase();
        return name.includes(term) || category.includes(term);
      });
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        (m) =>
          (m.category || m.type || "").toLowerCase() ===
          selectedCategory.toLowerCase(),
      );
    }
    if (selectedFuelType !== "all") {
      filtered = filtered.filter(
        (m) =>
          (m.fuelType || m.fuel || "").toLowerCase() ===
          selectedFuelType.toLowerCase(),
      );
    }
    if (selectedTransmission !== "all") {
      filtered = filtered.filter(
        (m) =>
          (m.transmission || "").toLowerCase() ===
          selectedTransmission.toLowerCase(),
      );
    }

    const minPrice = parseFloat(priceRange.min);
    const maxPrice = parseFloat(priceRange.max);
    if (!isNaN(minPrice)) {
      filtered = filtered.filter(
        (m) => (m.dailyRate ?? m.price ?? m.pricePerDay ?? 0) >= minPrice,
      );
    }
    if (!isNaN(maxPrice)) {
      filtered = filtered.filter(
        (m) => (m.dailyRate ?? m.price ?? m.pricePerDay ?? 0) <= maxPrice,
      );
    }

    filtered.sort((a, b) => {
      const aName = `${a.make || a.name || ""} ${a.model || ""}`.trim();
      const bName = `${b.make || b.name || ""} ${b.model || ""}`.trim();
      const aPrice = a.dailyRate ?? a.price ?? a.pricePerDay ?? 0;
      const bPrice = b.dailyRate ?? b.price ?? b.pricePerDay ?? 0;
      const aEngine = a.engineSize ?? 0;
      const bEngine = b.engineSize ?? 0;
      switch (sortBy) {
        case "name-asc":
          return aName.localeCompare(bName);
        case "name-desc":
          return bName.localeCompare(aName);
        case "price-asc":
          return aPrice - bPrice;
        case "price-desc":
          return bPrice - aPrice;
        case "engine-asc":
          return aEngine - bEngine;
        case "engine-desc":
          return bEngine - aEngine;
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
    priceRange,
    sortBy,
    isMotorcycleUnavailable,
  ]);

  // Fetch active promos
  useEffect(() => {
    const fetchPromos = async () => {
      try {
        const res = await axios.get("/api/discounts/active");
        const raw = Array.isArray(res.data) ? res.data : res.data.data || [];
        const normalized = raw.map(p => ({
          ...p,
          discountType: p.discountType || p.type || "percentage",
          discountValue: Number(p.discountValue ?? p.value ?? 0),
          startDate: p.startDate || p.validFrom || null,
          endDate: p.endDate || p.validTo || null,
          maxUses: (p.maxUses ?? p.usageLimit) !== undefined ? Number(p.maxUses ?? p.usageLimit) : null,
          usedCount: Number(p.usedCount ?? p.usageCount ?? 0),
          minRentalDays: Number(p.minRentalDays ?? p.minimumRentalDays ?? 0),
          applicableVehicleIds: p.applicableVehicleIds || p.applicableVehicleUnits || [],
          applicableCategories: p.applicableCategories || [],
          isActive: p.isActive !== false,
        }));
        setActivePromos(normalized);
      } catch (err) {
        setActivePromos([]);
      }
    };
    fetchPromos();
  }, []);

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

  // Reset to page 1 whenever filters/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    selectedCategory,
    selectedFuelType,
    selectedTransmission,
    priceRange,
    sortBy,
  ]);

  // ── Paginated slice ───────────────────────────────────────────────────────
  const totalPages = Math.ceil(filteredMotorcycles.length / ITEMS_PER_PAGE);
  const paginatedMotorcycles = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredMotorcycles.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredMotorcycles, currentPage]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    // Scroll to top of the grid
    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const getUniqueValues = (key) => {
    const values = motorcycles
      .map((m) => m[key] || "")
      .filter(Boolean)
      .map((v) => v.toString().trim());
    return [...new Set(values)];
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setSelectedFuelType("all");
    setSelectedTransmission("all");
    setPriceRange({ min: "", max: "" });
    setSortBy("name-asc");
  };

  const CLOUDINARY_BASE = "https://res.cloudinary.com/"; // Adjust if you have a specific Cloudinary subdomain
  const CLOUDINARY_CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;

  const buildImageSrc = (image) => {
    if (!image) return "";
    if (Array.isArray(image)) image = image[0];
    if (typeof image !== "string") return "";
    const trimmed = image.trim();
    if (!trimmed) return "";
    if (/^data:image\//i.test(trimmed)) return trimmed;
    if (/^https?:\/\//i.test(trimmed)) {
      // If it's already a full URL (Cloudinary), use as is
      return trimmed;
    }
    // Check if it's a Cloudinary path without https
    if (trimmed.startsWith("res.cloudinary.com/")) {
      return "https://" + trimmed;
    }
    // Check if it's a Cloudinary path (starts with cloud name)
    if (trimmed.startsWith("dxta0nmdy/")) {
      return "https://res.cloudinary.com/" + trimmed;
    }
    // Check if it's a Cloudinary path starting with /
    if (trimmed.startsWith("/")) {
      return "https://res.cloudinary.com" + trimmed;
    }
    // If already starts with https for local uploads, return as-is
    if (trimmed.startsWith("https://anaias-motorcycle-rental.onrender.com/uploads/")) {
      return trimmed;
    }
    // Handle local uploads path
    if (trimmed.startsWith("local/")) {
      const filename = trimmed.replace("local/", "");
      return `https://anaias-motorcycle-rental.onrender.com/uploads/${filename}`;
    }
    // Assume it's a Cloudinary public ID
    if (CLOUDINARY_CLOUD_NAME && trimmed) {
      return `${CLOUDINARY_BASE}${CLOUDINARY_CLOUD_NAME}/image/upload/${trimmed}`;
    }
    // Fallback: treat as filename from backend uploads
    return 'https://anaias-motorcycle-rental.onrender.com/uploads/' + trimmed;
  };

  const handleImageError = (e) => {
    const img = e?.target;
    if (!img) return;
    img.onerror = null;
    img.src = fallbackImage;
    img.alt = img.alt || "Image not available";
    img.style.objectFit = img.style.objectFit || "cover";
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const opts =
        d.getFullYear() === now.getFullYear()
          ? { day: "numeric", month: "short" }
          : { day: "numeric", month: "short", year: "numeric" };
      return new Intl.DateTimeFormat("en-IN", opts).format(d);
    } catch {
      return dateStr;
    }
  };

  const plural = (n, singular, pluralForm) => {
    if (n === 1) return `1 ${singular}`;
    return `${n} ${pluralForm ?? singular + "s"}`;
  };

  const computeAvailableMeta = (untilIso) => {
    if (!untilIso) return null;
    try {
      const until = new Date(untilIso);
      const available = new Date(until);
      available.setDate(available.getDate() + 1);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const daysUntilAvailable = daysBetween(today, available);
      return { availableIso: available.toISOString(), daysUntilAvailable };
    } catch {
      return null;
    }
  };

  const renderAvailabilityBadge = (rawAvailability, motorcycle) => {
    if (motorcycle?.status && motorcycle.status !== "available") {
      return (
        <span className="px-2 py-1 text-xs rounded-md bg-red-50 text-red-700 font-semibold">
          Unavailable
        </span>
      );
    }

    const effective = computeEffectiveAvailability(motorcycle);
    if (!effective) {
      return (
        <span className="px-2 py-1 text-xs rounded-md bg-green-50 text-green-700">
          Available
        </span>
      );
    }

    if (effective.state === "booked") {
      if (effective.until) {
        const meta = computeAvailableMeta(effective.until);
        if (meta?.availableIso) {
          return (
            <div className="flex flex-col items-end">
              <span className="px-2 py-1 text-xs rounded-md bg-red-50 text-red-700 font-semibold">
                Booked — available on {formatDate(meta.availableIso)}
              </span>
              <small className="text-xs text-gray-400 mt-1">
                until {formatDate(effective.until)}
              </small>
            </div>
          );
        }
        return (
          <div className="flex flex-col items-end">
            <span className="px-2 py-1 text-xs rounded-md bg-red-50 text-red-700 font-semibold">
              Booked
            </span>
            <small className="text-xs text-gray-400 mt-1">
              until {formatDate(effective.until)}
            </small>
          </div>
        );
      }
      return (
        <div className="flex flex-col items-end">
          <span className="px-2 py-1 text-xs rounded-md bg-red-50 text-red-700 font-semibold">
            Booked
          </span>
        </div>
      );
    }

    if (effective.state === "available_until_reservation") {
      const days = Number(effective.daysAvailable ?? -1);
      if (!Number.isFinite(days) || days < 0) {
        return (
          <div className="flex flex-col items-end">
            <span className="px-2 py-1 text-xs rounded-md bg-green-50 text-green-700 font-semibold">
              Available
            </span>
            {effective.nextBookingStarts && (
              <small className="text-xs text-gray-400 mt-1">
                next reservation {formatDate(effective.nextBookingStarts)}
              </small>
            )}
          </div>
        );
      }
      if (days === 0) {
        return (
          <div className="flex flex-col items-end">
            <span className="px-2 py-1 text-xs rounded-md bg-yellow-50 text-yellow-700 font-semibold">
              Reserved — starts today
            </span>
            {effective.nextBookingStarts && (
              <small className="text-xs text-gray-400 mt-1">
                from {formatDate(effective.nextBookingStarts)}
              </small>
            )}
          </div>
        );
      }
      return (
        <div className="flex flex-col items-end">
          <span className="px-2 py-1 text-xs rounded-md bg-green-50 text-green-700 font-semibold">
            Available — reserved in {plural(days, "day")}
          </span>
          {effective.nextBookingStarts && (
            <small className="text-xs text-gray-400 mt-1">
              next booking {formatDate(effective.nextBookingStarts)}
            </small>
          )}
        </div>
      );
    }

    return (
      <span className="px-2 py-1 text-xs rounded-full bg-green-900/30 text-green-800">
        Available
      </span>
    );
  };

  const isBookDisabled = (motorcycle) => {
    const effective = computeEffectiveAvailability(motorcycle);
    if (motorcycle?.status && motorcycle.status !== "available") return true;
    if (!effective) return false;
    return effective.state === "booked";
  };

  const handleBook = (motorcycle, id) => {
    if (isBookDisabled(motorcycle)) return;
    navigate(`/motorcycles/${id}`, { state: { motorcycle } });
  };

  const categories = getUniqueValues("category").concat(
    getUniqueValues("type"),
  );
  const uniqueCategories = [...new Set(categories)];
  const fuelTypes = getUniqueValues("fuelType").concat(getUniqueValues("fuel"));
  const uniqueFuelTypes = [...new Set(fuelTypes)];
  const transmissions = getUniqueValues("transmission");

  const hasActiveFilters =
    searchTerm ||
    selectedCategory !== "all" ||
    selectedFuelType !== "all" ||
    selectedTransmission !== "all" ||
    priceRange.min ||
    priceRange.max ||
    sortBy !== "name-asc";

  return (
    <div className={carPageStyles.pageContainer}>
      <div className={carPageStyles.contentContainer}>
        <div className={carPageStyles.headerContainer}>
          <h1 className={carPageStyles.title}>Motorcycle Collection</h1>
        </div>

        {/* Search and Filter Section */}
        <div ref={topRef} className="mb-8 space-y-4">
          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto">
            <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#171717]" />
            <input
              type="text"
              placeholder="Search by name or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-12 py-3 bg-[#c7c5c5] rounded-lg text-[#171717] placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#171717] shadow-lg shadow-black/20"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[#171717]"
              >
                <FaTimes />
              </button>
            )}
          </div>

          {/* Filter Toggle */}
          <div className="flex justify-center gap-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#171717] text-white text-sm font-bold rounded-xl
                      shadow-lg shadow-[#171717]/30 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <FaFilter />
              {showFilters ? "Hide Filters" : "Show Filters"}
            </button>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#b50002] text-white text-sm font-bold rounded-xl
                      shadow-lg shadow-[#b50002]/30 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <FaTimes />
                Clear All Filters
              </button>
            )}
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="bg-[#b9b9b9] backdrop-blur-md rounded-lg p-6 shadow-lg shadow-black/20">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[#171717] text-sm font-semibold mb-2">
                    Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-[#c7c5c5] rounded-lg text-[#171717] focus:outline-none focus:ring-1 focus:ring-[#171717] shadow-lg shadow-black/20"
                  >
                    <option value="all">All Categories</option>
                    {uniqueCategories.map((cat) => (
                      <option
                        key={cat}
                        value={cat}
                        className="bg-[#c7c5c5] text-[#171717]"
                      >
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#171717] text-sm font-semibold mb-2">
                    Fuel Type
                  </label>
                  <select
                    value={selectedFuelType}
                    onChange={(e) => setSelectedFuelType(e.target.value)}
                    className="w-full px-3 py-2 bg-[#c7c5c5] rounded-lg text-[#171717] focus:outline-none focus:ring-1 focus:ring-[#171717] shadow-lg shadow-black/20"
                  >
                    <option value="all">All Fuel Types</option>
                    {uniqueFuelTypes.map((fuel) => (
                      <option
                        key={fuel}
                        value={fuel}
                        className="bg-[#c7c5c5] text-[#171717]"
                      >
                        {fuel}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#171717] text-sm font-semibold mb-2">
                    Transmission
                  </label>
                  <select
                    value={selectedTransmission}
                    onChange={(e) => setSelectedTransmission(e.target.value)}
                    className="w-full px-3 py-2 bg-[#c7c5c5] rounded-lg text-[#171717] focus:outline-none focus:ring-1 focus:ring-[#171717] shadow-lg shadow-black/20"
                  >
                    <option value="all">All Transmissions</option>
                    {transmissions.map((trans) => (
                      <option
                        key={trans}
                        value={trans}
                        className="bg-[#c7c5c5] text-[#171717]"
                      >
                        {trans}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#171717] text-sm font-semibold mb-2">
                    Min Price (₱/day)
                  </label>
                  <input
                    type="number"
                    placeholder="Min"
                    value={priceRange.min}
                    onChange={(e) =>
                      setPriceRange({ ...priceRange, min: e.target.value })
                    }
                    onKeyDown={(e) => {
                      if (["e", "E", "+", "-"].includes(e.key))
                        e.preventDefault();
                    }}
                    className="w-full px-3 py-2 bg-[#c7c5c5] rounded-lg text-[#171717] focus:outline-none focus:ring-1 focus:ring-[#171717] shadow-lg shadow-black/20 placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-[#171717] text-sm font-semibold mb-2">
                    Max Price (₱/day)
                  </label>
                  <input
                    type="number"
                    placeholder="Max"
                    value={priceRange.max}
                    onChange={(e) =>
                      setPriceRange({ ...priceRange, max: e.target.value })
                    }
                    onKeyDown={(e) => {
                      if (["e", "E", "+", "-"].includes(e.key))
                        e.preventDefault();
                    }}
                    className="w-full px-3 py-2 bg-[#c7c5c5] rounded-lg text-[#171717] focus:outline-none focus:ring-1 focus:ring-[#171717] shadow-lg shadow-black/20 placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-[#171717] text-sm font-semibold mb-2">
                    <FaSortAmountDown className="inline mr-2" />
                    Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-3 py-2 bg-[#c7c5c5] rounded-lg text-[#171717] focus:outline-none focus:ring-1 focus:ring-[#171717] shadow-lg shadow-black/20"
                  >
                    <option
                      value="name-asc"
                      className="bg-[#c7c5c5] text-[#171717]"
                    >
                      Name (A-Z)
                    </option>
                    <option
                      value="name-desc"
                      className="bg-[#c7c5c5] text-[#171717]"
                    >
                      Name (Z-A)
                    </option>
                    <option
                      value="price-asc"
                      className="bg-[#c7c5c5] text-[#171717]"
                    >
                      Price (Low to High)
                    </option>
                    <option
                      value="price-desc"
                      className="bg-[#c7c5c5] text-[#171717]"
                    >
                      Price (High to Low)
                    </option>
                    <option
                      value="engine-asc"
                      className="bg-[#c7c5c5] text-[#171717]"
                    >
                      Engine Size (Low to High)
                    </option>
                    <option
                      value="engine-desc"
                      className="bg-[#c7c5c5] text-[#171717]"
                    >
                      Engine Size (High to Low)
                    </option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Results Count */}
          <div className="text-center text-[#171717]">
            Showing {filteredMotorcycles.length} available motorcycle
            {filteredMotorcycles.length !== 1 ? "s" : ""}
            {totalPages > 1 && (
              <span className="text-[#171717]/50 ml-1">
                — page {currentPage} of {totalPages}
              </span>
            )}
          </div>
        </div>

        {/* Grid */}
        <div className={carPageStyles.gridContainer}>
          {loading &&
            Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
              <div key={`skeleton-${i}`} className={carPageStyles.carCard}>
                <div className={carPageStyles.glowEffect}></div>
                <div className={carPageStyles.imageContainer}>
                  <div className="w-full h-full bg-gray-800/40 animate-pulse" />
                </div>
                <div className={carPageStyles.cardContent}>
                  <div className="h-6 bg-gray-800/40 rounded w-3/4 mb-2 animate-pulse" />
                  <div className="h-4 bg-gray-800/40 rounded w-1/3 mb-4 animate-pulse" />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="h-6 bg-gray-800/40 rounded animate-pulse" />
                    <div className="h-6 bg-gray-800/40 rounded animate-pulse" />
                  </div>
                  <div className="h-10 bg-gray-800/40 rounded mt-4 animate-pulse" />
                </div>
              </div>
            ))}

          {!loading && error && (
            <div className="col-span-full text-center text-red-600">
              {error}
            </div>
          )}

          {!loading && !error && filteredMotorcycles.length === 0 && (
            <div className="col-span-full text-center text-[#171717]">
              {motorcycles.length === 0
                ? "No motorcycles available."
                : "No motorcycles match your filters. Try adjusting your search criteria."}
            </div>
          )}

          {!loading &&
            paginatedMotorcycles.map((motorcycle, idx) => {
              const id = motorcycle._id ?? motorcycle.id ?? idx;
              const motorcycleName =
                `${motorcycle.make || motorcycle.name || ""} ${motorcycle.model || ""}`.trim() ||
                motorcycle.name ||
                "Unnamed";
              const imageSrc = buildImageSrc(motorcycle.image) || fallbackImage;
              const disabled = isBookDisabled(motorcycle);

              return (
                <div key={id} className={carPageStyles.carCard}>
                  <div className={carPageStyles.glowEffect}></div>

                  <div className={carPageStyles.imageContainer}>
                    <img
                      src={imageSrc}
                      alt={motorcycleName}
                      onError={handleImageError}
                      className={carPageStyles.carImage}
                    />
                    <div className="absolute right-4 top-4 z-20">
                      {renderAvailabilityBadge(
                        motorcycle.availability,
                        motorcycle,
                      )}
                    </div>
                    <div className={carPageStyles.priceBadge}>
                      {(() => {
                        const originalPrice = motorcycle.dailyRate ?? motorcycle.price ?? motorcycle.pricePerDay ?? 0;
                        const bestDiscount = getBestDiscount(motorcycle, activePromos, 1);
                        const discountedPrice = bestDiscount ? computeDiscountedPrice(originalPrice, bestDiscount) : originalPrice;
                        
                        if (bestDiscount && discountedPrice < originalPrice) {
                          return (
                            <div className="flex flex-col items-start gap-0.5">
                              <span className="text-xs opacity-60 line-through">₱{Math.round(originalPrice)}</span>
                              <span className="text-sm font-bold">₱{Math.round(discountedPrice)}</span>
                            </div>
                          );
                        }
                        return <span>₱{Math.round(originalPrice)}</span>;
                      })()}
                      <span className="text-xs opacity-70 block mt-0.5">/day</span>
                    </div>
                  </div>

                  <div className={carPageStyles.cardContent}>
                    <div className={carPageStyles.headerRow}>
                      <div>
                        <h3 className={carPageStyles.carName}>
                          {motorcycleName}
                        </h3>
                        <p className={carPageStyles.carType}>
                          {motorcycle.category ?? motorcycle.type ?? "Standard"}
                        </p>
                      </div>
                    </div>

                    <div className={carPageStyles.specsGrid}>
                      <div className={carPageStyles.specItem}>
                        <div className={carPageStyles.specIconContainer}>
                          <FaCogs className="text-[#b50002]" />
                        </div>
                        <span>
                          {motorcycle.engineSize
                            ? `${motorcycle.engineSize}cc`
                            : "—"}
                        </span>
                      </div>
                      <div className={carPageStyles.specItem}>
                        <div className={carPageStyles.specIconContainer}>
                          <FaGasPump className="text-[#b50002]" />
                        </div>
                        <span>
                          {motorcycle.fuelType ?? motorcycle.fuel ?? "Unleaded"}
                        </span>
                      </div>
                      <div className={carPageStyles.specItem}>
                        <div className={carPageStyles.specIconContainer}>
                          <FaTachometerAlt className="text-[#b50002]" />
                        </div>
                        <span>{motorcycle.transmission ?? "Manual"}</span>
                      </div>
                      <div className={carPageStyles.specItem}>
                        <div className={carPageStyles.specIconContainer}>
                          <FaShieldAlt className="text-[#b50002]" />
                        </div>
                        <span>{motorcycle.hasABS ? "ABS" : "Standard"}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleBook(motorcycle, id)}
                      className={`${carPageStyles.bookButton} ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
                      aria-label={`Book ${motorcycleName}`}
                      title={
                        disabled
                          ? "This motorcycle is currently booked or unavailable"
                          : `Book ${motorcycleName}`
                      }
                      disabled={disabled}
                    >
                      <span className={carPageStyles.buttonText}>
                        {disabled ? "Unavailable" : "Rent Now"}
                      </span>
                      <FaArrowRight className={carPageStyles.buttonIcon} />
                    </button>
                  </div>
                </div>
              );
            })}
        </div>

        {/* ── Pagination ── */}
        {!loading && !error && filteredMotorcycles.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredMotorcycles.length}
            onPageChange={handlePageChange}
          />
        )}

        <div className={carPageStyles.decor1}></div>
        <div className={carPageStyles.decor2}></div>
      </div>
    </div>
  );
};

export default Motorcycles;
