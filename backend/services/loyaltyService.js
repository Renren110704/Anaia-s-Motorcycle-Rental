import crypto from "crypto";
import User from "../models/userModel.js";
import LoyaltyConfig from "../models/loyaltyConfigModel.js";

// ── Fallback defaults ─────────────────────────────────────────────────────
// Used only if the LoyaltyConfig collection is empty/unreachable, so the
// program still works out of the box before an admin configures it.
const DEFAULT_CONFIG = {
  tiers: {
    Silver: {
      threshold: 3,
      minRentalDays: 0,
      discountPercent: 10,
      periodicEveryRentals: null,
      codeExpiryDays: 90,
      description: "Basic discounts and occasional promo codes.",
    },
    Gold: {
      threshold: 6,
      minRentalDays: 0,
      discountPercent: 20,
      periodicEveryRentals: 3,
      codeExpiryDays: 90,
      description: "Higher discounts and more frequent reward codes.",
    },
    Platinum: {
      threshold: 10,
      minRentalDays: 0,
      discountPercent: 30,
      periodicEveryRentals: 2,
      codeExpiryDays: 90,
      description:
        "The best discounts, exclusive promo codes, and additional loyalty perks.",
    },
  },
  milestone: {
    enabled: true,
    rentals: 10,
    minRentalDays: 0,
    discountPercent: 50,
    codeExpiryDays: 180,
    description:
      "You've completed 10 rentals! Here's a reward for your loyalty.",
  },
};

// Small in-process cache so we're not hitting the DB on every request.
// Cleared automatically after a short TTL, and explicitly on config save.
let cachedConfig = null;
let cachedAt = 0;
const CACHE_TTL_MS = 30 * 1000;

export const invalidateLoyaltyConfigCache = () => {
  cachedConfig = null;
  cachedAt = 0;
};

/**
 * Loads the (singleton) loyalty config document, creating it with defaults
 * on first access. Returns a plain object shaped like DEFAULT_CONFIG.
 */
export const getLoyaltyConfig = async ({ skipCache = false } = {}) => {
  if (!skipCache && cachedConfig && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedConfig;
  }

  let doc = await LoyaltyConfig.findOne({ key: "default" }).lean();
  if (!doc) {
    const created = await LoyaltyConfig.create({ key: "default" });
    doc = created.toObject();
  }

  cachedConfig = doc;
  cachedAt = Date.now();
  return doc;
};

// ── Derived helpers (operate on a config object, defaulting to live config) ─

export const getTierThresholds = (config) => ({
  Silver: config.tiers.Silver.threshold,
  Gold: config.tiers.Gold.threshold,
  Platinum: config.tiers.Platinum.threshold,
});

/** Returns the tier name for a given number of completed rentals. */
export const getTierForCount = (count, config) => {
  const thresholds = getTierThresholds(config);
  if (count >= thresholds.Platinum) return "Platinum";
  if (count >= thresholds.Gold) return "Gold";
  if (count >= thresholds.Silver) return "Silver";
  return "None";
};

/** Rentals still needed to reach the next tier, and that tier's name. */
export const getNextTierProgress = (count, config) => {
  const thresholds = getTierThresholds(config);
  const order = ["Silver", "Gold", "Platinum"];
  for (const tier of order) {
    if (count < thresholds[tier]) {
      return {
        nextTier: tier,
        rentalsRemaining: thresholds[tier] - count,
        threshold: thresholds[tier],
      };
    }
  }
  return { nextTier: null, rentalsRemaining: 0, threshold: null };
};

const generateCodeString = (prefix) => {
  const random = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `${prefix}-${random}`;
};

const buildLoyaltyCode = ({
  discountPercent,
  tier,
  reason,
  description,
  expiresInDays,
  minRentalDays,
}) => ({
  code: generateCodeString(tier ? tier.slice(0, 3).toUpperCase() : "LOYAL"),
  discountType: "percentage",
  discountValue: discountPercent,
  minRentalDays: Number(minRentalDays || 0),
  tier: tier || "Silver",
  reason,
  description,
  issuedAt: new Date(),
  expiresAt: expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : null,
  usedAt: null,
  usedOnBookingId: null,
});

/**
 * Call this once a booking transitions into "completed" status.
 * Increments the user's completed-rental count, recomputes their tier using
 * the current (admin-configurable) settings, and issues any bonus/milestone/
 * periodic codes they've earned.
 *
 * Safe to call multiple times concurrently for different users, but should
 * only be invoked ONCE per booking completion (callers should guard against
 * re-completing an already-completed booking).
 */
export const evaluateLoyaltyAfterCompletion = async (userId) => {
  if (!userId) return null;

  const [user, config] = await Promise.all([
    User.findById(userId),
    getLoyaltyConfig(),
  ]);
  if (!user) return null;

  const previousTier = user.loyaltyTier || "None";
  const newCount = (user.completedRentalsCount || 0) + 1;
  user.completedRentalsCount = newCount;

  const newTier = getTierForCount(newCount, config);
  const issuedCodes = [];

  // ── Tier-up bonus code ────────────────────────────────────────────────────
  if (newTier !== "None" && newTier !== previousTier) {
    const tierConfig = config.tiers[newTier];
    const code = buildLoyaltyCode({
      discountPercent: tierConfig.discountPercent,
      tier: newTier,
      reason: "tier_upgrade",
      description: `Welcome to ${newTier}! Enjoy ${tierConfig.discountPercent}% off your next rental.`,
      expiresInDays: tierConfig.codeExpiryDays,
      minRentalDays: tierConfig.minRentalDays,
    });
    user.loyaltyCodes.push(code);
    issuedCodes.push(code);
    user.loyaltyTier = newTier;
    user.loyaltyTierUpdatedAt = new Date();
  }

  // ── Milestone code (independent of tier naming, admin-configurable) ──────
  if (config.milestone?.enabled && newCount === config.milestone.rentals) {
    const code = buildLoyaltyCode({
      discountPercent: config.milestone.discountPercent,
      tier: newTier === "None" ? "Platinum" : newTier,
      reason: "milestone",
      description:
        config.milestone.description ||
        `You've completed ${config.milestone.rentals} rentals! Here's ${config.milestone.discountPercent}% off your next one.`,
      expiresInDays: config.milestone.codeExpiryDays,
      minRentalDays: config.milestone.minRentalDays,
    });
    user.loyaltyCodes.push(code);
    issuedCodes.push(code);
  }

  // ── Periodic reward codes for tiers with periodicEveryRentals set ────────
  if (newTier !== "None") {
    const tierConfig = config.tiers[newTier];
    const frequency = tierConfig.periodicEveryRentals;
    if (frequency) {
      const rentalsSinceLastReward =
        newCount - (user.lastPeriodicRewardAtCount || 0);
      if (rentalsSinceLastReward >= frequency) {
        const code = buildLoyaltyCode({
          discountPercent: tierConfig.discountPercent,
          tier: newTier,
          reason: "periodic_reward",
          description: `A little something extra for our ${newTier} members: ${tierConfig.discountPercent}% off.`,
          expiresInDays: tierConfig.codeExpiryDays,
          minRentalDays: tierConfig.minRentalDays,
        });
        user.loyaltyCodes.push(code);
        issuedCodes.push(code);
        user.lastPeriodicRewardAtCount = newCount;
      }
    }
  }

  await user.save();

  return {
    completedRentalsCount: user.completedRentalsCount,
    previousTier,
    currentTier: user.loyaltyTier,
    issuedCodes,
  };
};

export default {
  DEFAULT_CONFIG,
  getLoyaltyConfig,
  invalidateLoyaltyConfigCache,
  getTierThresholds,
  getTierForCount,
  getNextTierProgress,
  evaluateLoyaltyAfterCompletion,
};
