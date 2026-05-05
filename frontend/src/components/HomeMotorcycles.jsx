import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Fuel,
  Gauge,
  CheckCircle,
  Settings,
} from "lucide-react";
import axios from "axios";
import { homeCarsStyles as styles } from "../assets/dummyStyles";
import API_BASE_URL from "../apiBase";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const daysBetween = (from, to) =>
  Math.ceil((startOfDay(to) - startOfDay(from)) / MS_PER_DAY);

const computeEffectiveAvailability = (motorcycle) => {
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
      .filter(Boolean)
      .filter(
        (b) =>
          startOfDay(b.pickup) <= startOfDay(today) &&
          startOfDay(today) <= startOfDay(b.return),
      );

    if (blockingBookings.length) {
      blockingBookings.sort((a, b) => b.return - a.return);
      return {
        state: "booked",
        until: blockingBookings[0].return.toISOString(),
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
};

const isMotorcycleUnavailable = (motorcycle) => {
  if (motorcycle?.status && motorcycle.status !== "available") return true;
  const effective = computeEffectiveAvailability(motorcycle);
  return (
    effective?.state === "booked" ||
    effective?.state === "available_until_reservation"
  );
};

const HomeMotorcycles = () => {
  const navigate = useNavigate();
  const [motorcycles, setMotorcycles] = useState([]);
  const [filteredMotorcycles, setFilteredMotorcycles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [animateCards, setAnimateCards] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const abortRef = useRef(null);

  const base = 'https://anaias-motorcycle-rental.onrender.com';

  const limit = 6;
  const fallbackImage = `${base}/uploads/default-motorcycle.png`;

  const fetchMotorcycles = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      abortRef.current?.abort();
    } catch {}
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await axios.get(`${base}/api/motorcycles`, {
        params: { limit },
        headers: { Accept: "application/json" },
        signal: ctrl.signal,
      });
      setMotorcycles(res.data?.data || []);
    } catch (err) {
      const isCanceled =
        err?.code === "ERR_CANCELED" ||
        err?.name === "CanceledError" ||
        err?.message === "canceled";
      if (!isCanceled) {
        console.error("Error fetching motorcycles:", err);
        setError(
          err?.response?.data?.message ||
            err.message ||
            "Failed to load motorcycles",
        );
      }
    } finally {
      setLoading(false);
    }
  }, [base, limit]);

  useEffect(() => {
    const t = setTimeout(() => setAnimateCards(true), 300);
    fetchMotorcycles();
    return () => {
      clearTimeout(t);
      try {
        abortRef.current?.abort();
      } catch {}
    };
  }, [fetchMotorcycles]);

  useEffect(() => {
    const filtered = motorcycles.filter((m) => !isMotorcycleUnavailable(m));
    setFilteredMotorcycles(filtered);
  }, [motorcycles]);

  const CLOUDINARY_BASE = "https://res.cloudinary.com/"; // Adjust if you have a specific Cloudinary subdomain
  const CLOUDINARY_CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
  const normalizeLocalUploadPath = (pathValue) => {
    const cleaned = String(pathValue || "").trim().replace(/^\/+/, "");
    if (!cleaned) return "";
    if (cleaned.startsWith("uploads/")) return `${base}/${cleaned}`;
    return `${base}/uploads/${cleaned}`;
  };

  const buildImageSrc = (image) => {
    if (!image) return "";
    if (Array.isArray(image)) image = image[0];
    if (typeof image !== "string") return "";
    const t = image.trim();
    if (!t) return "";
    if (/^data:image\//i.test(t)) return t;
    if (/^https?:\/\//i.test(t)) {
      // If it's already a full URL, use as is
      return t;
    }
    // Check if it's a Cloudinary path without https
    if (t.startsWith("res.cloudinary.com/")) {
      return "https://" + t;
    }
    // Check if it's a Cloudinary path starting with cloud name
    if (t.startsWith("dxta0nmdy/")) {
      return "https://res.cloudinary.com/" + t;
    }
    // Check if it's a Cloudinary path starting with /
    if (t.startsWith("/")) {
      return "https://res.cloudinary.com" + t;
    }
    // If already starts with https for local uploads, return as-is
    if (t.startsWith("https://anaias-motorcycle-rental.onrender.com/uploads/")) {
      return t;
    }
    // Handle local uploads path
    if (t.startsWith("local/")) {
      const filename = t.replace("local/", "");
      return `https://anaias-motorcycle-rental.onrender.com/uploads/${filename}`;
    }
    // Assume it's a Cloudinary public ID
    if (CLOUDINARY_CLOUD_NAME && t) {
      return `${CLOUDINARY_BASE}${CLOUDINARY_CLOUD_NAME}/image/upload/${t}`;
    }
    // Fallback: treat as filename from backend uploads
    return 'https://anaias-motorcycle-rental.onrender.com/uploads/' + t;
  };

  const handleImageError = (e) => {
    const img = e?.target;
    if (!img) return;
    img.onerror = null;
    img.src = fallbackImage;
    img.onerror = () => {
      img.onerror = null;
      img.src = "https://via.placeholder.com/400x250.png?text=No+Image";
    };
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

  const plural = (n, singular, pluralForm) =>
    n === 1 ? `1 ${singular}` : `${n} ${pluralForm ?? singular + "s"}`;

  const computeAvailableMeta = (untilIso) => {
    if (!untilIso) return null;
    try {
      const until = new Date(untilIso);
      const available = new Date(until);
      available.setDate(available.getDate() + 1);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return {
        availableIso: available.toISOString(),
        daysUntilAvailable: daysBetween(today, available),
      };
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
    if (!effective)
      return (
        <span className="px-2 py-1 text-xs rounded-md bg-green-50 text-green-700">
          Available
        </span>
      );

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
            {effective.until && (
              <small className="text-xs text-gray-400 mt-1">
                until {formatDate(effective.until)}
              </small>
            )}
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
            <span className="px-2 py-1 text-xs rounded-md bg-red-50 text-red-800 font-semibold">
              Available
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
          <span className="px-2 py-1 text-xs rounded-md bg-red-50 text-red-800 font-semibold">
            Available — reserved in {plural(days, "day")}
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
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-900/30 text-green-800">
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

  const handleBook = (motorcycle) => {
    if (isBookDisabled(motorcycle)) return;
    navigate(`/motorcycles/${motorcycle._id || motorcycle.id}`, {
      state: { motorcycle },
    });
  };

  const displayMotorcycles =
    filteredMotorcycles.length > 0 ? filteredMotorcycles : motorcycles;

  return (
    <div className={styles.container}>
      <div className={styles.headerContainer}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 w-full">
          <div className="w-full text-center">
            <h1 className={styles.title}>Recently Added Motorcycle</h1>
          </div>
        </div>
      </div>

      <div className={styles.grid}>
        {loading &&
          Array.from({ length: limit }).map((_, idx) => (
            <div
              key={`s-${idx}`}
              className={`${styles.card} border ${
                styles.borderGradients?.[
                  idx % (styles.borderGradients?.length || 1)
                ] || ""
              } opacity-50 animate-pulse`}
              style={{
                clipPath:
                  "polygon(0% 15%, 15% 0%, 100% 0%, 100% 85%, 85% 100%, 0% 100%)",
              }}
            >
              <div className={styles.borderOverlay}></div>
              <div className={styles.imageContainer}>
                <div className="w-full h-full bg-[#c7c5c5]" />
              </div>
              <div className={styles.content}>
                <div className="h-6 bg-#c7c5c5 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
                <div className="grid grid-cols-4 gap-2">
                  <div className="h-8 bg-gray-200 rounded" />
                  <div className="h-8 bg-gray-200 rounded" />
                  <div className="h-8 bg-gray-200 rounded" />
                  <div className="h-8 bg-gray-200 rounded" />
                </div>
                <div className="h-10 bg-gray-200 rounded mt-4" />
              </div>
              <div className={styles.accentBlur}></div>
            </div>
          ))}

        {!loading && error && (
          <div className="col-span-full text-center text-red-600">{error}</div>
        )}
        {!loading && !error && displayMotorcycles.length === 0 && (
          <div className="col-span-full text-center text-[#171717]">
            {motorcycles.length === 0
              ? "No motorcycles found."
              : "No available motorcycles found."}
          </div>
        )}

        {!loading &&
          displayMotorcycles.map((motorcycle, idx) => {
            const motorcycleName =
              `${motorcycle.make || ""} ${motorcycle.model || ""}`.trim() ||
              motorcycle.name ||
              "Unnamed";
            const patternStyle =
              styles.cardPatterns && styles.cardPatterns.length
                ? styles.cardPatterns[idx % styles.cardPatterns.length]
                : "";
            const borderStyle =
              styles.borderGradients && styles.borderGradients.length
                ? styles.borderGradients[idx % styles.borderGradients.length]
                : "";
            const imageSrc = buildImageSrc(motorcycle.image) || fallbackImage;
            const transitionDelay = `${idx * 100}ms`;
            const initialTranslateY = "40px";
            const transformWhenHovered =
              hoveredCard === (motorcycle._id || motorcycle.id)
                ? "rotate(0.5deg)"
                : "none";
            const disabled = isBookDisabled(motorcycle);

            return (
              <div
                key={motorcycle._id || motorcycle.id || idx}
                onMouseEnter={() =>
                  setHoveredCard(motorcycle._id || motorcycle.id)
                }
                onMouseLeave={() => setHoveredCard(null)}
                className={`${styles.card} ${patternStyle} border ${borderStyle} hover:shadow-2xl hover:-translate-y-3`}
                style={{
                  clipPath:
                    "polygon(0% 15%, 15% 0%, 100% 0%, 100% 85%, 85% 100%, 0% 100%)",
                  transformStyle: "preserve-3d",
                  transform: animateCards
                    ? transformWhenHovered
                    : `translateY(${initialTranslateY})`,
                  opacity: animateCards ? 1 : 0,
                  transition: `transform 420ms cubic-bezier(.2,.8,.2,1), opacity 420ms ease`,
                  transitionDelay,
                }}
              >
                <div className={styles.borderOverlay}></div>

                <div className={styles.priceBadge}>
                  <span className={styles.priceText}>
                    ₱{motorcycle.dailyRate ?? motorcycle.price ?? 0}/day
                  </span>
                </div>

                <div className="absolute right-4 top-4 z-20">
                  {renderAvailabilityBadge(motorcycle.availability, motorcycle)}
                </div>

                <div className={styles.imageContainer}>
                  <img
                    src={imageSrc}
                    alt={motorcycleName}
                    onError={handleImageError}
                    className="w-full h-full object-cover transition-transform duration-500"
                    style={{
                      transform:
                        hoveredCard === (motorcycle._id || motorcycle.id)
                          ? "rotate(0.5deg)"
                          : "scale(1) rotate(0)",
                    }}
                  />
                </div>

                <div className={styles.content}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className={styles.carName}>{motorcycleName}</h3>
                      <p className={styles.carInfoContainer}>
                        <span className={styles.carTypeBadge}>
                          {motorcycle.category || "Standard"}
                        </span>
                        <span className={styles.carYear}>
                          {motorcycle.year || "—"}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className={styles.specsGrid}>
                    {[
                      {
                        icon: Settings,
                        value: motorcycle.engineSize
                          ? `${motorcycle.engineSize}cc`
                          : "—",
                        label: "Engine",
                      },
                      {
                        icon: Fuel,
                        value: motorcycle.fuelType || "Unleaded",
                        label: "Fuel",
                      },
                      {
                        icon: Gauge,
                        value: motorcycle.transmission || "Manual",
                        label: "Trans",
                      },
                      {
                        icon: CheckCircle,
                        value: motorcycle.hasABS ? "ABS" : "Standard",
                        label: "Brakes",
                      },
                    ].map((spec, i) => (
                      <div key={i} className={styles.specItem}>
                        <div
                          className={styles.specIconContainer(
                            hoveredCard === (motorcycle._id || motorcycle.id),
                          )}
                        >
                          <spec.icon
                            className={styles.specIcon(
                              hoveredCard === (motorcycle._id || motorcycle.id),
                            )}
                          />
                        </div>
                        <span className={styles.specValue}>{spec.value}</span>
                        <span className={styles.specLabel}>{spec.label}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handleBook(motorcycle)}
                    className={`${styles.bookButton} ${
                      disabled
                        ? "opacity-60 cursor-not-allowed"
                        : "hover:shadow-md"
                    }`}
                    disabled={disabled}
                    aria-disabled={disabled}
                    title={
                      disabled
                        ? "This motorcycle is currently booked or unavailable"
                        : "Book this motorcycle"
                    }
                  >
                    <span className={styles.buttonText}>
                      {disabled ? "Unavailable" : "Rent Now"}
                      <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </button>
                </div>

                <div className={styles.accentBlur}></div>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default HomeMotorcycles;
