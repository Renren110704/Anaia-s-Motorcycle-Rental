import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { FaMedal, FaCrown, FaGem } from "react-icons/fa";
import API_BASE_URL from "../apiBase";

// ── Hook: fetch active promos once, cache globally ─────────────────────────
let _promosCache = null;
let _promosPromise = null;

const normalizePromo = (promo = {}) => ({
  ...promo,
  discountType: promo.discountType || promo.type || "percentage",
  discountValue: Number(promo.discountValue ?? promo.value ?? 0),
  startDate: promo.startDate || promo.validFrom || null,
  endDate: promo.endDate || promo.validTo || null,
  maxUses:
    promo.maxUses !== undefined && promo.maxUses !== null
      ? Number(promo.maxUses)
      : promo.usageLimit !== undefined && promo.usageLimit !== null
        ? Number(promo.usageLimit)
        : null,
  usedCount: Number(promo.usedCount ?? promo.usageCount ?? 0),
  minRentalDays: Number(promo.minRentalDays ?? promo.minimumRentalDays ?? 0),
  applicableVehicleIds:
    promo.applicableVehicleIds || promo.applicableVehicleUnits || [],
  applicableCategories: promo.applicableCategories || [],
  isActive: promo.isActive !== false,
});

const fetchActivePromos = () => {
  if (_promosCache) return Promise.resolve(_promosCache);
  if (_promosPromise) return _promosPromise;
  _promosPromise = axios
    .get(`${API_BASE_URL}/api/discounts/active`)
    .then((r) => {
      const raw = Array.isArray(r.data)
        ? r.data
        : r.data.data || r.data.discounts || [];
      const data = raw.map(normalizePromo);
      _promosCache = data;
      // bust cache after 5 min
      setTimeout(
        () => {
          _promosCache = null;
          _promosPromise = null;
        },
        5 * 60 * 1000,
      );
      return data;
    })
    .catch(() => []);
  return _promosPromise;
};

// ── Helper: compute best discount for a motorcycle ─────────────────────────
export const getBestDiscount = (motorcycle, promos = [], rentalDays = 1) => {
  if (!promos.length) return null;
  const now = new Date();
  const motorcycleId = String(motorcycle?._id || motorcycle?.id || "");
  const category = (
    motorcycle?.category ||
    motorcycle?.type ||
    ""
  ).toLowerCase();

  const candidates = promos.filter((p) => {
    if (!p.isActive) return false;
    if (p.startDate && new Date(p.startDate) > now) return false;
    if (p.endDate && new Date(p.endDate) < now) return false;
    if (p.maxUses != null && (p.usedCount || 0) >= p.maxUses) return false;
    if (p.minRentalDays && rentalDays < p.minRentalDays) return false;

    // Vehicle check
    if (p.applicableVehicleIds?.length > 0) {
      if (!p.applicableVehicleIds.map(String).includes(motorcycleId))
        return false;
    }

    // Category check
    if (p.applicableCategories?.length > 0) {
      const cats = p.applicableCategories.map((c) => c.toLowerCase());
      if (!cats.includes(category)) return false;
    }

    return true;
  });

  if (!candidates.length) return null;

  // Pick best discount (highest savings)
  const originalPrice = Number(
    motorcycle?.dailyRate ?? motorcycle?.price ?? motorcycle?.pricePerDay ?? 0,
  );

  return candidates.reduce((best, p) => {
    const savings =
      p.discountType === "percentage"
        ? (originalPrice * p.discountValue) / 100
        : p.discountValue;

    const bestSavings = best
      ? best.discountType === "percentage"
        ? (originalPrice * best.discountValue) / 100
        : best.discountValue
      : -1;

    return savings > bestSavings ? p : best;
  }, null);
};

export const computeDiscountedPrice = (originalPrice, discount) => {
  if (!discount) return originalPrice;
  if (discount.discountType === "percentage") {
    return Math.max(
      0,
      originalPrice - (originalPrice * discount.discountValue) / 100,
    );
  }
  return Math.max(0, originalPrice - discount.discountValue);
};

// ── Hook ───────────────────────────────────────────────────────────────────
export const useApplicableDiscount = (motorcycle, rentalDays = 1) => {
  const [discount, setDiscount] = useState(null);

  const computeDiscount = useCallback(async () => {
    const promos = await fetchActivePromos();
    const best = getBestDiscount(motorcycle, promos, rentalDays);
    setDiscount(best);
  }, [motorcycle, rentalDays]);

  useEffect(() => {
    computeDiscount();
  }, [computeDiscount]);

  return discount;
};

// ── DiscountedPrice ─────────────────────────────────────────────────────────
/**
 * Drop-in replacement for the price badge in motorcycle cards.
 * Shows strikethrough original + discounted price when a promo applies.
 */
export const DiscountedPrice = ({
  originalPrice,
  discount,
  className = "",
  compact = false,
}) => {
  const discountedPrice = computeDiscountedPrice(originalPrice, discount);
  const savings = originalPrice - discountedPrice;
  const pct =
    discount?.discountType === "percentage"
      ? `−${discount.discountValue}%`
      : null;

  if (!discount) {
    return (
      <div
        className={`inline-flex flex-col items-center bg-white border border-black/8 rounded-lg px-3 py-1.5 ${className}`}
      >
        <span className="text-[10px] font-medium text-[#171717]/50 uppercase tracking-wider leading-none mb-0.5">
          Daily rate
        </span>
        <div className="flex items-baseline gap-0.5">
          <span className="text-[11px] text-[#171717]/50 font-medium">₱</span>
          <span className="text-lg font-medium text-[#171717] leading-tight">
            {originalPrice.toLocaleString()}
          </span>
        </div>
        <span className="text-[10px] text-[#171717]/40 leading-none mt-0.5">
          per day
        </span>
      </div>
    );
  }

  if (compact) {
    return (
      <div
        className={`inline-flex flex-col items-center bg-white border border-black/8 rounded-lg px-3 py-1.5 gap-0.5 ${className}`}
      >
        <span className="text-[10px] font-medium text-[#171717]/50 uppercase tracking-wider leading-none">
          Daily rate
        </span>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs text-[#171717]/40 line-through">
            ₱{originalPrice.toLocaleString()}
          </span>
          <span className="text-lg font-medium text-green-700 leading-tight">
            ₱{Math.round(discountedPrice).toLocaleString()}
          </span>
        </div>
        <span className="text-[10px] font-medium bg-green-50 text-green-800 border border-green-200 px-1.5 py-px rounded leading-none">
          {pct ?? `Save ₱${Math.round(savings).toLocaleString()}`}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex flex-col bg-white border border-black/8 rounded-xl px-4 py-3 gap-1.5 ${className}`}
    >
      <span className="text-[10px] font-medium text-[#171717]/50 uppercase tracking-wider leading-none">
        Daily rate
      </span>
      <div className="flex items-baseline gap-2">
        <span className="text-sm text-[#171717]/40 line-through">
          ₱{originalPrice.toLocaleString()}
        </span>
        <span className="text-2xl font-medium text-[#171717] leading-tight">
          ₱{Math.round(discountedPrice).toLocaleString()}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-medium bg-green-50 text-green-800 border border-green-200 px-2 py-0.5 rounded">
          {pct ? `${pct} off` : `−₱${Math.round(savings).toLocaleString()}`}
        </span>
        <span className="text-[10px] text-[#171717]/40">
          Save ₱{Math.round(savings).toLocaleString()}/day
        </span>
      </div>
    </div>
  );
};

// ── PromoBanner ─────────────────────────────────────────────────────────────
/**
 * Small banner/tag shown on motorcycle cards when a promo is active.
 */
export const PromoBanner = ({ discount, className = "" }) => {
  if (!discount) return null;

  const label = discount.code
    ? `${discount.name} — ${
        discount.discountType === "percentage"
          ? `${discount.discountValue}% off`
          : `₱${discount.discountValue} off`
      }`
    : discount.name;

  return (
    <div
      className={`inline-flex items-center gap-1 bg-red-50 border border-red-200 rounded px-2 py-1 ${className}`}
    >
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#A32D2D"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
      </svg>
      <span className="text-[10px] font-medium text-red-800 tracking-wide">
        {label}
      </span>
    </div>
  );
};

// ── PromoTag (inline chip, no animation) ───────────────────────────────────
export const PromoTag = ({ discount, className = "" }) => {
  if (!discount) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black
        bg-[#b50002]/10 text-[#b50002] border border-[#b50002]/20 ${className}`}
    >
      🏷️{" "}
      {discount.name ||
        (discount.discountType === "percentage"
          ? `${discount.discountValue}% Off`
          : `₱${discount.discountValue} Off`)}
    </span>
  );
};

// ── PriceSummaryWithDiscount ────────────────────────────────────────────────
/**
 * Enhanced price summary row for the booking form (Step 1 / Step 3).
 * Pass `discount` from useApplicableDiscount hook.
 */
export const PriceSummaryWithDiscount = ({
  price,
  days,
  baseRental,
  distanceFee,
  helmetFee,
  totalAmount,
  discount,
  DOWNPAYMENT = 200,
}) => {
  const discountedDailyRate = Math.round(
    computeDiscountedPrice(price, discount),
  );
  const discountAmount = discount
    ? discount.discountType === "percentage"
      ? Math.round((baseRental * discount.discountValue) / 100)
      : Math.min(discount.discountValue, baseRental)
    : 0;
  const discountedBaseRental = baseRental - discountAmount;
  const discountedTotal = discountedBaseRental + distanceFee + helmetFee;
  const dueAtPickup = discountedTotal - DOWNPAYMENT;

  return (
    <div className="bg-white/60 border border-[#171717]/8 rounded-2xl p-4">
      <p className="text-xs font-black text-[#171717]/40 uppercase tracking-widest mb-2">
        Price Summary
      </p>

      {/* Rate row */}
      <div className="flex items-start justify-between py-2.5 border-b border-[#171717]/8 gap-4">
        <span className="text-xs text-[#171717]/50 font-semibold uppercase tracking-wider flex-shrink-0">
          Rate / day
        </span>
        <span className="text-sm font-bold text-right text-[#171717]">
          {discount ? (
            <span className="flex items-baseline gap-1.5">
              <span className="line-through opacity-40 text-xs">₱{price}</span>
              <span className="text-[#b50002]">₱{discountedDailyRate}</span>
            </span>
          ) : (
            `₱${price}`
          )}
        </span>
      </div>

      {/* Days */}
      <div className="flex items-start justify-between py-2.5 border-b border-[#171717]/8 gap-4">
        <span className="text-xs text-[#171717]/50 font-semibold uppercase tracking-wider">
          Days
        </span>
        <span className="text-sm font-bold text-[#171717]">{days}</span>
      </div>

      {/* Rental Subtotal */}
      <div className="flex items-start justify-between py-2.5 border-b border-[#171717]/8 gap-4">
        <span className="text-xs text-[#171717]/50 font-semibold uppercase tracking-wider">
          Rental Subtotal
        </span>
        <span className="text-sm font-bold text-[#171717]">
          {discount ? (
            <span className="flex items-baseline gap-1.5">
              <span className="line-through opacity-40 text-xs">
                ₱{baseRental}
              </span>
              <span>₱{discountedBaseRental}</span>
            </span>
          ) : (
            `₱${baseRental}`
          )}
        </span>
      </div>

      {/* Discount row */}
      {discount && discountAmount > 0 && (
        <div className="flex items-start justify-between py-2.5 border-b border-[#171717]/8 gap-4">
          <span className="text-xs text-green-600 font-semibold uppercase tracking-wider flex items-center gap-1">
            🏷️ {discount.name || "Promo"}
            {discount.code && (
              <span className="text-[10px] font-mono bg-green-100 px-1.5 py-0.5 rounded ml-1">
                {discount.code}
              </span>
            )}
          </span>
          <span className="text-sm font-bold text-green-600">
            −₱{discountAmount}
          </span>
        </div>
      )}

      {/* Distance fee */}
      {distanceFee > 0 && (
        <div className="flex items-start justify-between py-2.5 border-b border-[#171717]/8 gap-4">
          <span className="text-xs text-[#171717]/50 font-semibold uppercase tracking-wider">
            Distance Fee
          </span>
          <span className="text-sm font-bold text-[#b50002]">
            +₱{distanceFee}
          </span>
        </div>
      )}

      {/* Helmet fee */}
      {helmetFee > 0 && (
        <div className="flex items-start justify-between py-2.5 border-b border-[#171717]/8 gap-4">
          <span className="text-xs text-[#171717]/50 font-semibold uppercase tracking-wider">
            Extra Helmet
          </span>
          <span className="text-sm font-bold text-[#b50002]">
            +₱{helmetFee}
          </span>
        </div>
      )}

      {/* Total */}
      <div className="pt-2 mt-1 border-t border-[#171717]/10 flex items-center justify-between">
        <span className="text-xs font-black text-[#171717] uppercase tracking-wider">
          Total
        </span>
        <span className="text-base font-black text-[#171717]">
          ₱{discountedTotal}
        </span>
      </div>

      {/* Downpayment */}
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs font-semibold text-[#171717]/50 uppercase tracking-wider">
          Downpayment (Reservation Fee)
        </span>
        <span className="text-sm font-bold text-green-600">
          −₱{DOWNPAYMENT}
        </span>
      </div>

      {/* Due at pickup */}
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

// ── ActivePromoBanner ───────────────────────────────────────────────────────
/**
 * Full-width announcement banner shown at the top of the motorcycles listing page.
 */
export const ActivePromoBanner = () => {
  const [promos, setPromos] = useState([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    fetchActivePromos().then((all) => {
      const visible = all.filter((p) => {
        const now = new Date();
        if (!p.isActive) return false;
        if (p.startDate && new Date(p.startDate) > now) return false;
        if (p.endDate && new Date(p.endDate) < now) return false;
        return true;
      });
      setPromos(visible);
    });
  }, []);

  useEffect(() => {
    if (promos.length <= 1) return;
    const t = setInterval(
      () => setCurrent((c) => (c + 1) % promos.length),
      4000,
    );
    return () => clearInterval(t);
  }, [promos.length]);

  if (!promos.length) return null;

  const p = promos[current];
  const label =
    p.discountType === "percentage"
      ? `${p.discountValue}% Off`
      : `₱${p.discountValue} Off`;

  return (
    <div className="bg-gradient-to-r from-[#b50002] to-[#ff3333] text-white py-2.5 px-4 text-center text-sm font-bold tracking-wide shadow-md">
      🏷️ <span className="opacity-90">{p.name}</span>
      {p.code && (
        <>
          {" "}
          · Use code{" "}
          <span className="font-mono bg-white/20 px-2 py-0.5 rounded text-xs">
            {p.code}
          </span>
        </>
      )}{" "}
      — <span className="font-black">{label}</span>
      {p.minRentalDays > 0 && (
        <span className="opacity-75 ml-1 text-xs font-normal">
          (min {p.minRentalDays}d rental)
        </span>
      )}
      {promos.length > 1 && (
        <span className="ml-3 opacity-60 text-xs">
          {current + 1}/{promos.length}
        </span>
      )}
    </div>
  );
};

export const PriceBadge = ({ originalPrice, discount, className = "" }) => {
  const discountedPrice = Math.round(
    computeDiscountedPrice(originalPrice, discount),
  );
  const savings = originalPrice - discountedPrice;

  if (!discount) {
    return (
      <div className={`flex flex-col items-end ${className}`}>
        <span className="text-[9px] font-semibold text-[#171717]/40 uppercase tracking-widest leading-none mb-0.5">
          Daily rate
        </span>
        <span className="text-lg font-bold text-[#171717] leading-tight">
          ₱{originalPrice.toLocaleString()}
        </span>
        <span className="text-[9px] text-[#171717]/40 leading-none">/ day</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-end ${className}`}>
      <span className="text-[9px] font-semibold text-[#171717]/40 uppercase tracking-widest leading-none mb-0.5">
        Daily rate
      </span>
      <div className="flex items-baseline gap-1.5">
        <span className="text-xs text-[#171717]/40 line-through leading-none">
          ₱{originalPrice.toLocaleString()}
        </span>
        <span className="text-lg font-bold text-[#171717] leading-tight">
          ₱{discountedPrice.toLocaleString()}
        </span>
      </div>
      <span className="text-[9px] font-semibold text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-px leading-none mt-0.5">
        {discount.discountType === "percentage"
          ? `−${discount.discountValue}% · save ₱${Math.round(savings)}`
          : `save ₱${Math.round(savings)}`}
      </span>
    </div>
  );
};

// ── Loyalty rewards program helpers ─────────────────────────────────────────

export const TIER_COLORS = {
  Silver: {
    // flat tokens kept for any existing background/text/border usage
    bg: "rgba(148,163,184,0.15)",
    text: "#3f4a5c",
    border: "rgba(100,116,139,0.35)",
    // new: metallic gradient + glow + icon for premium badge rendering
    gradient: "linear-gradient(135deg, #f8fafc 0%, #dbe2ea 45%, #a7b4c4 100%)",
    glow: "rgba(148,163,184,0.45)",
    shine: "rgba(255,255,255,0.8)",
    icon: FaMedal,
  },
  Gold: {
    bg: "rgba(234,179,8,0.15)",
    text: "#7c4a03",
    border: "rgba(217,119,6,0.4)",
    gradient: "linear-gradient(135deg, #fff6d8 0%, #fcd34d 45%, #d97706 100%)",
    glow: "rgba(251,191,36,0.5)",
    shine: "rgba(255,251,235,0.9)",
    icon: FaCrown,
  },
  Platinum: {
    bg: "rgba(147,51,234,0.12)",
    text: "#4c1d95",
    border: "rgba(124,58,237,0.35)",
    gradient: "linear-gradient(135deg, #f6f4ff 0%, #d9c9fb 45%, #8b5cf6 100%)",
    glow: "rgba(167,139,250,0.5)",
    shine: "rgba(255,255,255,0.85)",
    icon: FaGem,
  },
  None: {
    bg: "rgba(0,0,0,0.06)",
    text: "rgba(0,0,0,0.45)",
    border: "rgba(0,0,0,0.1)",
    gradient: "linear-gradient(135deg, #f5f5f5 0%, #e5e5e5 100%)",
    glow: "rgba(0,0,0,0.08)",
    shine: "rgba(255,255,255,0.6)",
    icon: null,
  },
};

/**
 * Validates a promo/loyalty code entered by the user at checkout.
 * Checks global Discount codes first, then the user's personal loyalty codes.
 * Returns a discount-shaped object (compatible with computeDiscountedPrice)
 * or throws with a message describing why the code is invalid.
 */
export const validatePromoCode = async ({ code, userId, rentalDays = 1 }) => {
  const res = await axios.post(`${API_BASE_URL}/api/discounts/validate-code`, {
    code,
    userId,
    rentalDays,
  });
  return res.data;
};

/** Marks a personal loyalty code as used after a booking is created with it. */
export const redeemLoyaltyCode = async ({ userId, code, bookingId }) => {
  const res = await axios.patch(
    `${API_BASE_URL}/api/discounts/loyalty/redeem`,
    {
      userId,
      code,
      bookingId,
    },
  );
  return res.data;
};

/** Fetches the current user's loyalty tier, progress, and codes. */
export const fetchLoyaltyStatus = async (userId) => {
  const res = await axios.get(
    `${API_BASE_URL}/api/discounts/loyalty/status/${userId}`,
  );
  return res.data;
};

/** Fetches the full, admin-configured loyalty program rules (all tiers + milestone). */
export const fetchLoyaltyConfig = async () => {
  const res = await axios.get(`${API_BASE_URL}/api/discounts/loyalty/config`);
  return res.data;
};

/** Small pill showing a user's current loyalty tier, styled like a metallic medal. */
export const LoyaltyTierBadge = ({ tier = "None", className = "" }) => {
  const colors = TIER_COLORS[tier] || TIER_COLORS.None;
  const Icon = colors.icon;
  if (tier === "None") return null;
  return (
    <span
      className={`inline-flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full text-xs font-extrabold tracking-wide whitespace-nowrap shrink-0 ${className}`}
      style={{
        background: colors.gradient,
        color: colors.text,
        border: `1px solid ${colors.border}`,
        boxShadow: `0 1px 2px rgba(0,0,0,0.06), 0 0 0 3px ${colors.glow}22, inset 0 1px 0 ${colors.shine}`,
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      <span
        className="inline-flex items-center justify-center rounded-full shrink-0"
        style={{
          width: 18,
          height: 18,
          background: `radial-gradient(circle at 30% 30%, ${colors.shine}, transparent 70%), ${colors.gradient}`,
          border: `1px solid ${colors.border}`,
          boxShadow: `0 0 6px ${colors.glow}`,
        }}
      >
        {Icon && <Icon style={{ fontSize: 9, color: colors.text }} />}
      </span>
      {tier} Member
    </span>
  );
};

/** Progress bar toward the next loyalty tier. */
export const LoyaltyProgressBar = ({
  completedRentalsCount = 0,
  nextTier,
  rentalsUntilNextTier,
  tierThresholds,
  className = "",
}) => {
  if (!nextTier) {
    return (
      <p className={`text-xs font-semibold text-purple-700 ${className}`}>
        You've reached the Platinum tier!
      </p>
    );
  }
  const prevThreshold =
    nextTier === "Silver"
      ? 0
      : nextTier === "Gold"
        ? (tierThresholds?.Silver ?? 0)
        : (tierThresholds?.Gold ?? 0);
  const target =
    tierThresholds?.[nextTier] ?? completedRentalsCount + rentalsUntilNextTier;
  const span = Math.max(1, target - prevThreshold);
  const pct = Math.min(
    100,
    Math.max(0, ((completedRentalsCount - prevThreshold) / span) * 100),
  );

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-semibold text-[#171717]/60">
          {rentalsUntilNextTier} rental{rentalsUntilNextTier === 1 ? "" : "s"}{" "}
          to {nextTier}
        </span>
        <span className="text-[11px] font-semibold text-[#171717]/40">
          {completedRentalsCount}/{target}
        </span>
      </div>
      <div className="w-full h-2 rounded-full bg-black/5 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#b50002] to-[#ff3333] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

/** Card listing a user's active (unused, unexpired) loyalty promo codes. */
export const LoyaltyCodeList = ({ codes = [], className = "" }) => {
  const [copied, setCopied] = useState("");
  const [showAll, setShowAll] = useState(false);

  const handleCopy = (code) => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopied(code);
    setTimeout(() => setCopied(""), 1500);
  };

  if (!codes.length) {
    return (
      <p className={`text-xs text-[#171717]/40 ${className}`}>
        No active reward codes yet. Complete more rentals to earn some!
      </p>
    );
  }

  const PREVIEW_COUNT = 3;
  const visibleCodes = showAll ? codes : codes.slice(0, PREVIEW_COUNT);
  const hiddenCount = codes.length - PREVIEW_COUNT;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {visibleCodes.map((c) => (
        <div
          key={c._id || c.code}
          className="flex items-center justify-between gap-3 bg-white border border-black/8 rounded-lg px-3 py-2"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs font-bold text-[#0E0E0E] truncate">
                {c.code}
              </span>
              <span className="text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200 rounded px-1.5 py-px">
                {c.discountType === "percentage"
                  ? `${c.discountValue}% off`
                  : `₱${c.discountValue} off`}
              </span>
            </div>
            {c.description && (
              <p className="text-[10px] text-[#171717]/40 truncate mt-0.5">
                {c.description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => handleCopy(c.code)}
            className="shrink-0 text-[10px] font-bold px-2.5 py-1.5 rounded-md bg-[#0E0E0E] text-white hover:bg-[#b50002] transition-colors"
          >
            {copied === c.code ? "Copied!" : "Copy"}
          </button>
        </div>
      ))}

      {codes.length > PREVIEW_COUNT && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-1 text-[11px] font-bold text-[#b50002] hover:underline text-center"
        >
          {showAll ? "Show less" : `See All Promo Codes (${hiddenCount} more)`}
        </button>
      )}
    </div>
  );
};

/**
 * "See how it works" modal — explains the loyalty program end-to-end using
 * the live, admin-configured rules (thresholds, discounts, periodic rewards,
 * expiry, and the milestone bonus), so it never drifts out of sync with
 * what the Discount Management panel actually has set.
 */
export const LoyaltyHowItWorksModal = ({ onClose, currentTier }) => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchLoyaltyConfig();
        if (!cancelled) setConfig(data);
      } catch {
        if (!cancelled) setError("Couldn't load the current program details.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const tierOrder = ["Silver", "Gold", "Platinum"];

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
        zIndex: 9990,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: 16,
        overflowY: "auto",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 24,
          boxShadow: "0 25px 60px rgba(0,0,0,0.25)",
          width: "100%",
          maxWidth: 560,
          margin: "32px 0",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            background: "linear-gradient(135deg, #0E0E0E, #2a2a2a)",
            padding: "20px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h2
              style={{
                color: "#fff",
                fontWeight: 900,
                fontSize: 18,
                fontFamily: "'Space Grotesk', sans-serif",
                margin: 0,
              }}
            >
              🏆 How Loyalty Rewards Work
            </h2>
            <p
              style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: 12,
                marginTop: 4,
              }}
            >
              Earn perks automatically as you complete more rentals.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: "rgba(255,255,255,0.1)",
              border: "none",
              color: "rgba(255,255,255,0.7)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: 24 }}>
          {loading ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "32px 0",
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  border: "3px solid rgba(0,0,0,0.08)",
                  borderTopColor: "#b50002",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : error ? (
            <p
              style={{
                fontSize: 13,
                color: "#b50002",
                textAlign: "center",
                padding: "16px 0",
              }}
            >
              {error}
            </p>
          ) : (
            <>
              {/* <p
                style={{
                  fontSize: 13,
                  color: "rgba(0,0,0,0.55)",
                  lineHeight: 1.6,
                  marginBottom: 20,
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                Every time a rental is completed, it counts toward your total.
                Reach a tier's threshold and you're automatically upgraded — no
                sign-up needed. Reward codes are single-use and can expire, so
                it's worth using them before they do.
              </p> */}

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                {tierOrder.map((tierName) => {
                  const t = config?.tiers?.[tierName];
                  if (!t) return null;
                  const colors = TIER_COLORS[tierName];
                  const Icon = colors.icon;
                  const isCurrent = currentTier === tierName;
                  return (
                    <div
                      key={tierName}
                      style={{
                        border: `1.5px solid ${isCurrent ? colors.border : "rgba(0,0,0,0.08)"}`,
                        background: isCurrent ? "#fff" : "#fafafa",
                        borderRadius: 14,
                        padding: "14px 16px",
                        boxShadow: isCurrent
                          ? `0 0 0 3px ${colors.glow}22`
                          : "none",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 6,
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            fontWeight: 800,
                            fontSize: 14,
                            color: colors.text,
                            fontFamily: "'Space Grotesk', sans-serif",
                          }}
                        >
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: 24,
                              height: 24,
                              borderRadius: "50%",
                              flexShrink: 0,
                              background: `radial-gradient(circle at 30% 30%, ${colors.shine}, transparent 70%), ${colors.gradient}`,
                              border: `1px solid ${colors.border}`,
                              boxShadow: `0 0 6px ${colors.glow}`,
                            }}
                          >
                            {Icon && (
                              <Icon
                                style={{ fontSize: 11, color: colors.text }}
                              />
                            )}
                          </span>
                          {tierName}
                          {isCurrent && (
                            <span
                              style={{
                                marginLeft: 2,
                                fontSize: 10,
                                fontWeight: 700,
                                color: colors.text,
                                background: colors.gradient,
                                border: `1px solid ${colors.border}`,
                                borderRadius: 999,
                                padding: "2px 8px",
                              }}
                            >
                              Your tier
                            </span>
                          )}
                        </span>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: "rgba(0,0,0,0.45)",
                          }}
                        >
                          {t.threshold}+ rentals
                        </span>
                      </div>
                      <p
                        style={{
                          fontSize: 12,
                          color: "rgba(0,0,0,0.6)",
                          lineHeight: 1.5,
                          margin: 0,
                        }}
                      >
                        {t.description ||
                          `${t.discountPercent}% off when you reach this tier.`}
                      </p>
                      <div
                        style={{
                          display: "flex",
                          gap: 14,
                          marginTop: 8,
                          fontSize: 11,
                          color: "rgba(0,0,0,0.4)",
                          fontWeight: 600,
                        }}
                      >
                        <span>🎁 {t.discountPercent}% welcome code</span>
                        {t.periodicEveryRentals ? (
                          <span>
                            🔁 bonus code every {t.periodicEveryRentals} rentals
                          </span>
                        ) : (
                          <span>No recurring codes</span>
                        )}
                        <span>
                          ⏳{" "}
                          {t.codeExpiryDays
                            ? `expires in ${t.codeExpiryDays} days`
                            : "never expires"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {config?.milestone?.enabled && (
                <div
                  style={{
                    border: "1.5px dashed rgba(181,0,2,0.3)",
                    background: "rgba(181,0,2,0.04)",
                    borderRadius: 14,
                    padding: "14px 16px",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 13,
                      color: "#b50002",
                      marginBottom: 4,
                      fontFamily: "'Space Grotesk', sans-serif",
                    }}
                  >
                    Milestone Bonus
                  </div>
                  <p
                    style={{
                      fontSize: 12,
                      color: "rgba(0,0,0,0.6)",
                      lineHeight: 1.5,
                      margin: 0,
                    }}
                  >
                    {config.milestone.description ||
                      `Complete ${config.milestone.rentals} rentals and get an extra ${config.milestone.discountPercent}% off code`}{" "}
                    (expires in {config.milestone.codeExpiryDays || "∞"} days).
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

const discountBadgeExports = {
  useApplicableDiscount,
  getBestDiscount,
  computeDiscountedPrice,
  DiscountedPrice,
  PromoBanner,
  PromoTag,
  PriceSummaryWithDiscount,
  ActivePromoBanner,
  validatePromoCode,
  redeemLoyaltyCode,
  fetchLoyaltyStatus,
  fetchLoyaltyConfig,
  LoyaltyTierBadge,
  LoyaltyProgressBar,
  LoyaltyCodeList,
  LoyaltyHowItWorksModal,
};

export default discountBadgeExports;
