import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
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

  if (!discount) {
    return (
      <span className={className}>
        ₱{originalPrice}
        {!compact && <span className="text-white/50 text-sm">/day</span>}
      </span>
    );
  }

  if (compact) {
    return (
      <span className={`flex items-baseline gap-1.5 flex-wrap ${className}`}>
        <span className="line-through opacity-50 text-base">
          ₱{originalPrice}
        </span>
        <span className="text-white font-black text-xl">
          ₱{Math.round(discountedPrice)}
        </span>
        <span className="text-white/50 text-sm">/day</span>
      </span>
    );
  }

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="line-through opacity-50 text-lg">
          ₱{originalPrice}
        </span>
        <span className="font-black text-3xl">
          ₱{Math.round(discountedPrice)}
        </span>
        <span className="opacity-50 text-sm mb-0.5">/day</span>
      </div>
      <span className="text-green-400 text-xs font-bold mt-0.5">
        Save ₱{Math.round(savings)}
        {discount.discountType === "percentage" &&
          ` (${discount.discountValue}% off)`}
      </span>
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
    ? `${discount.code} — ${discount.discountType === "percentage" ? `${discount.discountValue}% Off` : `₱${discount.discountValue} Off`}`
    : discount.name;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide
        bg-gradient-to-r from-[#b50002] to-[#ff3333] text-white shadow-lg shadow-[#b50002]/40 animate-pulse ${className}`}
    >
      <span>🏷️</span>
      {label}
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

const discountBadgeExports = {
  useApplicableDiscount,
  getBestDiscount,
  computeDiscountedPrice,
  DiscountedPrice,
  PromoBanner,
  PromoTag,
  PriceSummaryWithDiscount,
  ActivePromoBanner,
};

export default discountBadgeExports;
