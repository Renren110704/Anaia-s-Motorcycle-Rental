import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { FaStar, FaStarHalfAlt, FaRegStar } from "react-icons/fa";
import axios from "axios";
import API_BASE_URL from "../apiBase";
import {
  getBestDiscount,
  computeDiscountedPrice,
  PromoBanner,
} from "./DiscountBadge";

/* ─── helpers ─────────────────────────────────────────────────────── */
const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const renderStars = (rating) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (rating >= i) {
      stars.push(<FaStar key={i} style={{ color: "#f59e0b", fontSize: 11 }} />);
    } else if (rating >= i - 0.5) {
      stars.push(
        <FaStarHalfAlt key={i} style={{ color: "#f59e0b", fontSize: 11 }} />,
      );
    } else {
      stars.push(
        <FaRegStar
          key={i}
          style={{ color: "rgba(0,0,0,0.15)", fontSize: 11 }}
        />,
      );
    }
  }
  return stars;
};

const computeEffectiveAvailability = (motorcycle) => {
  const today = new Date();
  if (Array.isArray(motorcycle.bookings) && motorcycle.bookings.length) {
    const blocking = motorcycle.bookings
      .filter((b) => {
        const s = (b.status || "").toLowerCase();
        return ["pending", "active", "inspection", "upcoming"].includes(s);
      })
      .map((b) => {
        const pickup = b.pickupDate ?? b.startDate ?? b.start ?? b.from;
        const ret = b.returnDate ?? b.endDate ?? b.end ?? b.to;
        if (!pickup || !ret) return null;
        return { pickup: new Date(pickup), return: new Date(ret) };
      })
      .filter(Boolean)
      .filter(
        (b) =>
          startOfDay(b.pickup) <= startOfDay(today) &&
          startOfDay(today) <= startOfDay(b.return),
      );
    if (blocking.length) {
      blocking.sort((a, b) => b.return - a.return);
      return {
        state: "booked",
        until: blocking[0].return.toISOString(),
        source: "bookings",
      };
    }
  }
  if (motorcycle.availability) {
    if (
      motorcycle.availability.state === "booked" &&
      motorcycle.availability.until
    )
      return {
        state: "booked",
        until: motorcycle.availability.until,
        source: "availability",
      };
    if (
      motorcycle.availability.state === "available_until_reservation" &&
      Number(motorcycle.availability.daysAvailable ?? -1) === 0
    )
      return {
        state: "booked",
        until: motorcycle.availability.until ?? null,
        source: "availability-res-starts-today",
        nextBookingStarts: motorcycle.availability.nextBookingStarts,
      };
    return { ...motorcycle.availability, source: "availability" };
  }
  return { state: "fully_available", source: "none" };
};

/* ─── constants ────────────────────────────────────────────────────── */
const CATEGORY_TABS = [
  "All",
  "New",
  "Scooters",
  "Big Bikes",
  "Underbone",
  "Pickup",
  "Sedan",
  "MPV",
  "SUV",
  "Top Rated",
];
// const BASE = "https://anaias-motorcycle-rental.onrender.com";
const LIMIT = 6;
const FALLBACK_IMG = `${API_BASE_URL}/uploads/default-motorcycle.png`;

/* ─── component ────────────────────────────────────────────────────── */
/* ─── scroll-reveal hook ──────────────────────────────────────────── */
function useScrollReveal(options = {}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.12, ...options },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [options]);
  return [ref, visible];
}

const HomeMotorcycles = () => {
  const navigate = useNavigate();
  const [motorcycles, setMotorcycles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [activePromos, setActivePromos] = useState([]);
  const [, setHoveredCard] = useState(null);
  const abortRef = useRef(null);
  const [headerRef, headerVisible] = useScrollReveal();
  const [tabsRef, tabsVisible] = useScrollReveal();
  const [gridRef, gridVisible] = useScrollReveal({ threshold: 0.05 });

  /* fetch motorcycles */
  const fetchMotorcycles = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      abortRef.current?.abort();
    } catch {}
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await axios.get(`${API_BASE_URL}/api/motorcycles`, {
        params: { limit: 100 },
        headers: { Accept: "application/json" },
        signal: ctrl.signal,
      });
      setMotorcycles(res.data?.data || []);
    } catch (err) {
      const isCanceled =
        err?.code === "ERR_CANCELED" ||
        err?.name === "CanceledError" ||
        err?.message === "canceled";
      if (!isCanceled)
        setError(
          err?.response?.data?.message ||
            err.message ||
            "Failed to load motorcycles",
        );
    } finally {
      setLoading(false);
    }
  }, []);

  /* fetch promos */
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
              (p.maxUses ?? p.usageLimit) != null
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
    fetchMotorcycles();
    fetchPromos();
    return () => {
      try {
        abortRef.current?.abort();
      } catch {}
    };
  }, [fetchMotorcycles]);

  /* filter by tab */
  /* filter by tab */
  const displayed = motorcycles
    .filter((m) => {
      if (activeTab === "All") return true;

      if (activeTab === "New") {
        return m.isNew || (m.year && m.year >= new Date().getFullYear() - 1);
      }

      if (activeTab === "Top Rated") {
        // Make sure we check both averageRating and rating
        return (m.averageRating ?? m.rating ?? 0) >= 4.0;
      }

      const cat = (m.category || "").toLowerCase();
      const tab = activeTab.toLowerCase();

      if (tab === "scooters") return cat.includes("scooter");
      if (tab === "big bikes") return cat.includes("big bike");
      if (tab === "underbone") return cat.includes("underbone");

      // NEW VEHICLE CATEGORY FILTERS
      if (tab === "pickup") return cat.includes("pickup");
      if (tab === "sedan") return cat.includes("sedan");
      if (tab === "mpv") return cat.includes("mpv");
      if (tab === "suv") return cat.includes("suv");

      return true;
    })
    .slice(0, LIMIT);

  /* image helper */
  const buildImageSrc = (image) => {
    if (!image) return "";
    if (Array.isArray(image)) image = image[0];
    if (typeof image !== "string") return "";
    const t = image.trim();
    if (!t) return "";
    if (/^data:image\//i.test(t)) return t;
    if (/^https?:\/\//i.test(t)) return t;
    if (t.startsWith("res.cloudinary.com/")) return "https://" + t;
    if (t.startsWith("/")) return "https://res.cloudinary.com" + t;
    return `${API_BASE_URL}/uploads/` + t;
  };

  const handleImageError = (e) => {
    const img = e?.target;
    if (!img) return;
    img.onerror = null;
    img.src = FALLBACK_IMG;
  };

  /* availability */
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat("en-PH", {
        day: "numeric",
        month: "short",
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  const getAvailabilityInfo = (motorcycle) => {
    if (motorcycle?.status && motorcycle.status !== "available")
      return { label: "", color: "booked" };
    const eff = computeEffectiveAvailability(motorcycle);
    if (!eff || eff.state === "fully_available")
      return { label: "", color: "available" };
    if (eff.state === "booked") {
      if (eff.until) {
        const avail = new Date(eff.until);
        avail.setDate(avail.getDate() + 1);
        return { label: `Available ${formatDate(avail)}`, color: "booked" };
      }
      return { label: "Booked", color: "booked" };
    }
    return { label: "Available", color: "available" };
  };

  const isBookDisabled = (motorcycle) => {
    const eff = computeEffectiveAvailability(motorcycle);
    if (motorcycle?.status && motorcycle.status !== "available") return true;
    return eff?.state === "booked";
  };

  const handleBook = (motorcycle) => {
    // if (isBookDisabled(motorcycle)) return;
    navigate(`/motorcycles/${motorcycle._id || motorcycle.id}`, {
      state: { motorcycle },
    });
  };

  /* ── render ─────────────────────────────────────────────────────── */
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');

        .hm-root {
          padding: 64px 48px 80px;
          width: 100%;
          box-sizing: border-box;
          font-family: 'Space Grotesk', sans-serif;
        }

        /* ── Header ── */
        .hm-header {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          margin-bottom: 28px;
        }
        .hm-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: clamp(28px, 4vw, 42px);
          font-weight: 800;
          color: #0E0E0E;
          letter-spacing: -0.5px;
        }
        .hm-viewall {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 13px;
          font-weight: 700;
          color: #b50002;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: gap 0.2s;
        }
        .hm-viewall:hover { gap: 8px; }

        /* ── Category tabs ── */
        .hm-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 32px;
        }
        .hm-tab {
          padding: 8px 18px;
          border-radius: 999px;
          border: 1.5px solid rgba(0,0,0,0.12);
          background: #fff;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.2px;
          color: rgba(14,14,14,0.5);
          cursor: pointer;
          transition: all 0.18s;
          white-space: nowrap;
        }
        .hm-tab:hover { border-color: rgba(0,0,0,0.25); color: #0E0E0E; }
        .hm-tab.active {
          background: #0E0E0E;
          border-color: #0E0E0E;
          color: #fff;
        }

        /* ── Grid ── */
        .hm-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        @media(max-width: 1024px) {
          .hm-grid { grid-template-columns: repeat(2, 1fr); }
        }

        /* ── Card ── */
        .hm-card {
          background: #fff;
          border-radius: 18px;
          border: 1.5px solid rgba(0,0,0,0.07);
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          transition: transform 0.25s cubic-bezier(.2,.8,.2,1), box-shadow 0.25s;
          position: relative;
          cursor: pointer;
        }
        .hm-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 36px rgba(0,0,0,0.10);
        }

        /* ── Card image ── */
        .hm-img-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          background: #F4F4F2;
          overflow: hidden;
        }
        .hm-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.4s ease;
        }
        .hm-card:hover .hm-img { transform: scale(1.04); }

        /* availability badge top-right */
        .hm-avail {
          position: absolute;
          top: 10px;
          right: 10px;
          padding: 4px 10px;
          border-radius: 999px;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.3px;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }
        .hm-avail.available {
          background: rgba(220,252,231,0.9);
          color: #15803d;
        }
        .hm-avail.booked {
          background: rgba(255,241,241,0.9);
          color: #b50002;
        }

        /* promo badge top-left */
        .hm-promo {
          position: absolute;
          top: 10px;
          left: 10px;
        }

        /* ── Card body ── */
        .hm-body {
          padding: 16px 18px 18px;
        }

        .hm-name-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 6px;
        }
        .hm-name {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 18px;
          font-weight: 800;
          color: #0E0E0E;
          letter-spacing: -0.3px;
          line-height: 1.2;
        }

        /* price block */
        .hm-price-block {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
          flex-shrink: 0;
        }

        .hm-price-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .hm-price-main {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 20px;
          font-weight: 800;
          color: #0E0E0E;
          line-height: 1;
        }

        .hm-price-main .currency { font-size: 13px; font-weight: 700; }
        .hm-price-orig {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 13px;
          color: rgba(0,0,0,0.4);
          text-decoration: line-through;
          white-space: nowrap;
        }
        .hm-price-day {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 11px;
          color: rgba(0,0,0,0.35);
          text-align: right;
        }

        /* meta row */
        .hm-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 14px;
        }
        .hm-cat-badge {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 11px;
          font-weight: 600;
          color: rgba(0,0,0,0.5);
          background: rgba(0,0,0,0.05);
          padding: 4px 9px;
          border-radius: 5px;
        }
        .hm-year {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 11px;
          color: rgba(0,0,0,0.4);
        }

        /* specs strip */
        .hm-specs {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
          margin-bottom: 14px;
        }
        .hm-spec {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          background: #F7F7F5;
          border-radius: 9px;
          padding: 7px 4px;
        }
        .hm-spec-val {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 11px;
          font-weight: 700;
          color: #0E0E0E;
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          width: 100%;
        }
        .hm-spec-lbl {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 10px;
          color: rgba(0,0,0,0.4);
          text-align: center;
        }

        /* book button */
        .hm-btn {
          width: 100%;
          padding: 13px;
          border-radius: 12px;
          border: none;
          background: #0E0E0E;
          color: #fff;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.3px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: background 0.18s, transform 0.15s;
        }
        .hm-btn:hover:not(:disabled) { background: #b50002; }
        .hm-btn:active:not(:disabled) { transform: scale(0.98); }
        .hm-btn:disabled {
          background: #E8E8E8;
          color: rgba(0,0,0,0.35);
          cursor: not-allowed;
        }

        /* skeleton */
        .hm-skeleton {
          background: linear-gradient(90deg, #F4F4F2 25%, #EAEAE8 50%, #F4F4F2 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
          border-radius: 10px;
        }
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* empty / error */
        .hm-empty {
          grid-column: 1 / -1;
          text-align: center;
          padding: 48px 0;
          font-family: 'Space Grotesk', sans-serif;
          color: rgba(0,0,0,0.4);
          font-size: 14px;
        }

        /* ── Scroll reveal ── */
        @keyframes hm-fadeUp {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes hm-slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .hm-reveal { opacity: 0; }
        .hm-reveal.visible { animation: hm-fadeUp 0.6s cubic-bezier(.2,.8,.2,1) forwards; }
        .hm-card-reveal { opacity: 0; }
        .hm-card-reveal.visible { animation: hm-fadeUp 0.6s cubic-bezier(.2,.8,.2,1) forwards; }

        @media(max-width: 640px) {
          .hm-root { padding: 40px 16px 60px; }
          .hm-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="hm-root">
        {/* Header */}
        <div
          ref={headerRef}
          className={`hm-header hm-reveal ${headerVisible ? "visible" : ""}`}
        >
          <h2 className="hm-title">Featured Vehicles</h2>
          <a href="/motorcycles" className="hm-viewall">
            View all <ArrowRight size={13} />
          </a>
        </div>

        {/* Category tabs */}
        <div
          ref={tabsRef}
          className={`hm-tabs hm-reveal ${tabsVisible ? "visible" : ""}`}
          style={{ animationDelay: "0.08s" }}
        >
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab}
              className={`hm-tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div ref={gridRef} className="hm-grid">
          {/* Skeletons */}
          {loading &&
            Array.from({ length: LIMIT }).map((_, i) => (
              <div
                key={`sk-${i}`}
                style={{
                  background: "#fff",
                  borderRadius: 18,
                  border: "1.5px solid rgba(0,0,0,0.07)",
                  overflow: "hidden",
                }}
              >
                <div className="hm-skeleton" style={{ aspectRatio: "16/10" }} />
                <div
                  style={{
                    padding: "16px 18px 18px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div
                    className="hm-skeleton"
                    style={{ height: 18, width: "60%", borderRadius: 6 }}
                  />
                  <div
                    className="hm-skeleton"
                    style={{ height: 12, width: "35%", borderRadius: 6 }}
                  />
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4,1fr)",
                      gap: 6,
                    }}
                  >
                    {[1, 2, 3, 4].map((x) => (
                      <div
                        key={x}
                        className="hm-skeleton"
                        style={{ height: 44, borderRadius: 9 }}
                      />
                    ))}
                  </div>
                  <div
                    className="hm-skeleton"
                    style={{ height: 40, borderRadius: 12 }}
                  />
                </div>
              </div>
            ))}

          {/* Error */}
          {!loading && error && (
            <div className="hm-empty" style={{ color: "#b50002" }}>
              {error}
            </div>
          )}

          {/* Empty */}
          {!loading && !error && displayed.length === 0 && (
            <div className="hm-empty">No vehicles found for this category.</div>
          )}

          {/* Cards */}
          {!loading &&
            displayed.map((m, idx) => {
              const id = m._id || m.id;
              const name =
                `${m.make || ""} ${m.model || ""}`.trim() ||
                m.name ||
                "Unnamed";
              const imgSrc = buildImageSrc(m.image) || FALLBACK_IMG;
              const avail = getAvailabilityInfo(m);
              const disabled = isBookDisabled(m);
              const originalPrice = Math.round(m.dailyRate ?? m.price ?? 0);
              const bestDiscount = getBestDiscount(m, activePromos, 1);
              const discountedPrice = bestDiscount
                ? Math.round(
                    computeDiscountedPrice(originalPrice, bestDiscount),
                  )
                : null;

              const specs = [
                {
                  value: m.engineSize ? `${m.engineSize}cc` : "—",
                  label: "Engine",
                },
                { value: m.fuelType || "Unleaded", label: "Fuel" },
                { value: m.transmission || "Manual", label: "Trans" },
                { value: m.hasABS ? "ABS" : "Std", label: "Brakes" },
              ];

              return (
                <div
                  key={id}
                  className={`hm-card hm-card-reveal ${gridVisible ? "visible" : ""}`}
                  style={{ animationDelay: `${idx * 0.08}s` }}
                  onMouseEnter={() => setHoveredCard(id)}
                  onMouseLeave={() => setHoveredCard(null)}
                  onClick={() => handleBook(m)}
                >
                  {/* Image */}
                  <div className="hm-img-wrap">
                    <img
                      src={imgSrc}
                      alt={name}
                      className="hm-img"
                      onError={handleImageError}
                    />

                    {/* Availability badge */}
                    <span className={`hm-avail ${avail.color}`}>
                      {avail.label}
                    </span>

                    {/* Promo badge */}
                    {bestDiscount && (
                      <div className="hm-promo">
                        <PromoBanner discount={bestDiscount} />
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="hm-body">
                    <div className="hm-name-row">
                      {/* Name & Stars Column */}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                        }}
                      >
                        <div className="hm-name">{name}</div>

                        {/* Ratings */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          {m.reviewCount > 0 || m.totalReviews > 0 ? (
                            <>
                              <div
                                style={{
                                  display: "flex",
                                  gap: 2,
                                  alignItems: "center",
                                }}
                              >
                                {renderStars(
                                  Number(m.averageRating || m.rating || 0),
                                )}
                              </div>
                              <span
                                style={{
                                  fontSize: 10,
                                  color: "rgba(0,0,0,0.4)",
                                  fontFamily: "'Space Grotesk',sans-serif",
                                  fontWeight: 600,
                                  marginTop: 1,
                                }}
                              >
                                ({m.reviewCount || m.totalReviews})
                              </span>
                            </>
                          ) : (
                            <span
                              style={{
                                fontSize: 11,
                                color: "rgba(0,0,0,0.4)",
                                fontFamily: "'Space Grotesk',sans-serif",
                                fontWeight: 500,
                              }}
                            >
                              No reviews yet.
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Price */}
                      <div className="hm-price-block">
                        {discountedPrice && discountedPrice < originalPrice ? (
                          <>
                            <div className="hm-price-row">
                              <span className="hm-price-main">
                                <span className="currency">₱</span>
                                {discountedPrice.toLocaleString()}
                              </span>

                              <span className="hm-price-orig">
                                ₱{originalPrice.toLocaleString()}
                              </span>
                            </div>

                            <span className="hm-price-day">/day</span>
                          </>
                        ) : (
                          <>
                            <span className="hm-price-main">
                              <span className="currency">₱</span>
                              {originalPrice.toLocaleString()}
                            </span>

                            <span className="hm-price-day">/day</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Category + Year */}
                    <div className="hm-meta">
                      <span className="hm-cat-badge">
                        {m.category || "Standard"}
                      </span>
                      <span className="hm-year">{m.year || "—"}</span>
                    </div>

                    {/* Specs */}
                    <div className="hm-specs">
                      {specs.map((s, i) => (
                        <div key={i} className="hm-spec">
                          <span className="hm-spec-val">{s.value}</span>
                          <span className="hm-spec-lbl">{s.label}</span>
                        </div>
                      ))}
                    </div>

                    {/* CTA */}
                    <button
                      className="hm-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBook(m);
                      }}
                    >
                      {disabled ? (
                        <>
                          Check Availability <ArrowRight size={13} />
                        </>
                      ) : (
                        <>
                          Rent Now <ArrowRight size={13} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </>
  );
};

export default HomeMotorcycles;
