import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import API_BASE_URL from "../apiBase";
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaFileExport,
  FaFilter,
  FaMoneyBillWave,
  FaMotorcycle,
  FaPrint,
  FaRedo,
} from "react-icons/fa";
import {
  Bike,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  CreditCard,
  BarChart3,
  Wallet,
} from "lucide-react";
import ExportCSVModal from "./ExportCSVModal";
import PrintReportModal from "./PrintReportModal";

const baseURL = API_BASE_URL;
const api = axios.create({ baseURL, headers: { Accept: "application/json" } });

const PAGE_LIMIT = 1000;

// ── Semantic color system ───────────────────────────────────────────────────
// A small, deliberate palette anchored on the brand red. Just four accent
// colors total (brand, success, warning, info) plus true gray for "neutral" —
// every stat card, badge, and bar maps to one of these, so the same meaning
// always reads the same color throughout the dashboard, and the dashboard as
// a whole reads as one coordinated palette instead of a rainbow of hues.
const TONES = {
  brand: {
    dot: "bg-[#b50002]",
    icon: "text-[#b50002]",
    iconBg: "bg-[#b50002]/10",
    text: "text-[#b50002]",
    badgeBg: "bg-red-50 border-red-100",
  },
  success: {
    dot: "bg-emerald-600",
    icon: "text-emerald-600",
    iconBg: "bg-emerald-50",
    text: "text-emerald-600",
    badgeBg: "bg-emerald-50 border-emerald-100",
  },
  warning: {
    dot: "bg-amber-600",
    icon: "text-amber-600",
    iconBg: "bg-amber-50",
    text: "text-amber-600",
    badgeBg: "bg-amber-50 border-amber-100",
  },
  info: {
    dot: "bg-blue-600",
    icon: "text-blue-600",
    iconBg: "bg-blue-50",
    text: "text-blue-600",
    badgeBg: "bg-blue-50 border-blue-100",
  },
  // True gray, not a fifth hue — for counts that carry no status meaning.
  neutral: {
    dot: "bg-slate-500",
    icon: "text-slate-500",
    iconBg: "bg-slate-100",
    text: "text-slate-500",
    badgeBg: "bg-slate-50 border-slate-200",
  },
};

// ── Return-inspection violation keys that represent actual repair costs ────
// (as opposed to soft/behavioral penalties like Dirty, Late Return, or
// Geofence Exceeded). Mirrors the `repair: true` flags on
// INSPECTION_MATRIX_DEFAULTS in motorcycleBookingController.js — kept in
// sync manually since analytics reads plain booking JSON, not the matrix
// definitions themselves.
const REPAIR_VIOLATION_KEYS = [
  "minor_scratches",
  "major_damage",
  "tire_damage",
  "mirror_damage",
  "helmet_damage",
];

// Splits a booking's returnInspection violations into repair-cost amount and
// non-repair penalty amount. Falls back to treating the entire legacy
// `penaltyAmount` as a non-repair penalty when no itemized `violations`
// array is present (older records created before the matrix existed).
const splitRepairAndPenaltyAmounts = (returnInspection) => {
  const violations = Array.isArray(returnInspection?.violations)
    ? returnInspection.violations
    : null;

  if (violations && violations.length) {
    let repair = 0;
    let penalty = 0;
    violations.forEach((v) => {
      const amount = Number(v?.amount || 0);
      if (REPAIR_VIOLATION_KEYS.includes(v?.key)) repair += amount;
      else penalty += amount;
    });
    return { repair, penalty };
  }

  // No itemized breakdown available — keep old behavior (whole amount
  // counted as a general penalty) so historical totals don't shift.
  return { repair: 0, penalty: Number(returnInspection?.penaltyAmount || 0) };
};

const formatMoney = (n) =>
  `₱${Math.round(Number(n || 0)).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

const monthKey = (dateLike) => {
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return "Unknown";
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
};

// ── Stat Card (mirrors ManageMotorcycle StatCard) ─────────────────────────────
const StatCard = ({
  label,
  value,
  sub,
  tone = "neutral",
  icon: Icon,
  onClick,
  isActive,
  loading,
}) => {
  const t = TONES[tone] || TONES.neutral;
  return (
    <button
      onClick={onClick}
      className={`relative text-left bg-white rounded-2xl border shadow-sm p-5 overflow-hidden group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 w-full
        ${isActive ? "border-[#b50002]/30 ring-2 ring-[#b50002]/20" : "border-slate-100"}`}
    >
      <div
        className={`absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-[0.07] blur-xl ${t.dot}`}
      />
      <div className="flex items-start justify-between mb-3">
        <p className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase">
          {label}
        </p>
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center ${t.iconBg}`}
        >
          <Icon className={`w-4 h-4 ${t.icon}`} />
        </div>
      </div>
      <p className="text-[2rem] font-black text-[#171717] leading-none mb-2">
        {loading ? (
          <span className="inline-block w-16 h-7 bg-slate-100 rounded-lg animate-pulse" />
        ) : (
          value
        )}
      </p>
      {sub && <p className={`text-[11px] font-semibold ${t.text}`}>{sub}</p>}
    </button>
  );
};

// ── Section card wrapper ──────────────────────────────────────────────────────
const SectionCard = ({ title, icon: Icon, children, action }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-[#b50002]" />}
        <h3 className="font-black text-[#171717] text-[14px] uppercase tracking-[0.08em]">
          {title}
        </h3>
      </div>
      {action}
    </div>
    <div className="p-5">{children}</div>
  </div>
);

// ── Top unit rank row (leaderboard-style, used only for Top Requested Units) ──
const UNIT_RANK_COLOR = "#2d63a9"; // matches the evenly-weighted info blue in CHART_COLORS

const UnitRankRow = ({ rank, label, count, share }) => (
  <div className="flex items-center gap-3">
    <div
      className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black text-white"
      style={{ backgroundColor: UNIT_RANK_COLOR }}
    >
      {rank}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-1 gap-2">
        <span className="text-[13px] font-bold text-[#171717] truncate">
          {label}
        </span>
        <span className="text-[12px] font-black text-slate-600 whitespace-nowrap">
          {count.toLocaleString()}{" "}
          <span className="text-slate-400 font-semibold">({share}%)</span>
        </span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${Math.max(4, share)}%`,
            backgroundColor: UNIT_RANK_COLOR,
          }}
        />
      </div>
    </div>
  </div>
);

// Same saturation and lightness across every color (only hue changes), so
// no donut segment reads visually heavier, darker, or duller than another —
// the color differences come purely from hue, not from mismatched weight.
const CHART_COLORS = [
  "#a92d31", // brand red
  "#2d63a9", // info blue
  "#2da96f", // success green
  "#a9732d", // warning amber
  "#5e6978", // neutral gray
  "#7ea7dd", // light blue (overflow)
  "#7eddb1", // light green (overflow)
  "#a4acb7", // light gray (overflow)
];

const DonutChart = ({ items }) => {
  const total = items.reduce((s, x) => s + Number(x.count || 0), 0);
  if (!total)
    return (
      <p className="text-sm text-slate-400 py-4 text-center">
        No data available
      </p>
    );

  let running = 0;
  const stops = items
    .map((item, idx) => {
      const pct = (Number(item.count || 0) / total) * 100;
      const start = running;
      running += pct;
      return `${CHART_COLORS[idx % CHART_COLORS.length]} ${start.toFixed(2)}% ${running.toFixed(2)}%`;
    })
    .join(", ");

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex items-center justify-center">
        <div
          className="relative h-40 w-40 rounded-full"
          style={{ background: `conic-gradient(${stops})` }}
        >
          <div className="absolute inset-[14px] rounded-full bg-white border border-slate-100 flex items-center justify-center text-center">
            <div>
              <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">
                Total
              </p>
              <p className="text-2xl font-black text-[#171717] leading-none">
                {total}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="w-full space-y-2">
        {items.map((item, idx) => {
          const count = Number(item.count || 0);
          const pct = total ? Math.round((count / total) * 100) : 0;
          return (
            <div
              key={item.label}
              className="flex items-center justify-between gap-2 text-[12px]"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
                  }}
                />
                <span className="font-semibold text-slate-600 truncate">
                  {item.label}
                </span>
              </div>
              <span className="text-[#171717] font-black whitespace-nowrap">
                {count}{" "}
                <span className="text-slate-400 font-semibold">({pct}%)</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Sparkline chart ───────────────────────────────────────────────────────────
const Sparkline = ({ items }) => {
  if (!items.length)
    return (
      <p className="text-sm text-slate-400 py-4 text-center">
        No data available
      </p>
    );

  const values = items.map((x) => Number(x.count || 0));
  const max = Math.max(1, ...values);
  const min = Math.min(...values);
  const range = Math.max(1, max - min);

  const pts = items.map((item, idx) => {
    const x = items.length === 1 ? 50 : (idx / (items.length - 1)) * 100;
    const y = 38 - ((Number(item.count || 0) - min) / range) * 30;
    return `${x},${y}`;
  });

  const area = [`0,40`, ...pts, `100,40`].join(" ");

  const labelStep = Math.ceil(items.length / 4);
  const visibleLabels = items.filter(
    (_, i) => i % labelStep === 0 || i === items.length - 1,
  );

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
      <svg viewBox="0 0 100 44" className="w-full h-36">
        {[8, 24, 40].map((y) => (
          <line
            key={y}
            x1="0"
            y1={y}
            x2="100"
            y2={y}
            stroke="#e2e8f0"
            strokeWidth="0.8"
          />
        ))}
        <polygon points={area} fill="#b50002" fillOpacity="0.08" />
        <polyline
          points={pts.join(" ")}
          fill="none"
          stroke="#b50002"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {items.map((item, idx) => {
          const x = items.length === 1 ? 50 : (idx / (items.length - 1)) * 100;
          const y = 38 - ((Number(item.count || 0) - min) / range) * 30;
          return (
            <circle key={item.label} cx={x} cy={y} r="1.2" fill="#b50002" />
          );
        })}
      </svg>
      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
        {visibleLabels.map((item) => (
          <span key={item.label}>{item.label}</span>
        ))}
      </div>
    </div>
  );
};

// ── Skeleton ──────────────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3 animate-pulse">
    <div className="h-3 bg-slate-100 rounded w-24" />
    <div className="h-8 bg-slate-100 rounded w-32" />
    <div className="h-2 bg-slate-100 rounded w-20" />
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const AdminAnalytics = () => {
  const [bookings, setBookings] = useState([]);
  const [motorcycles, setMotorcycles] = useState([]);
  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Modal state ─────────────────────────────────────────────────────────────
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);

  const fetchAnalyticsData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [bookingsRes, motorcyclesRes] = await Promise.all([
        api.get("/api/motorcycle-bookings", {
          params: { includeDeleted: "true", limit: PAGE_LIMIT },
        }),
        api.get("/api/motorcycles", {
          params: { includeDeleted: "true", limit: PAGE_LIMIT },
        }),
      ]);
      const rawBookings = Array.isArray(bookingsRes.data)
        ? bookingsRes.data
        : bookingsRes.data?.data || bookingsRes.data?.bookings || [];
      const rawMotorcycles = Array.isArray(motorcyclesRes.data)
        ? motorcyclesRes.data
        : motorcyclesRes.data?.data || motorcyclesRes.data?.motorcycles || [];
      setBookings(rawBookings);
      setMotorcycles(rawMotorcycles);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load analytics data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  const availableYears = useMemo(() => {
    const years = new Set();
    bookings
      .filter((b) => !b?.isDeleted)
      .forEach((b) => {
        const d = new Date(b?.bookingDate || b?.createdAt || b?.pickupDate);
        if (!Number.isNaN(d.getTime())) years.add(String(d.getFullYear()));
      });
    return [...years].sort((a, b) => Number(b) - Number(a));
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    return bookings
      .filter((b) => !b?.isDeleted)
      .filter((b) => {
        const d = new Date(b?.bookingDate || b?.createdAt || b?.pickupDate);
        if (Number.isNaN(d.getTime())) return false;
        if (selectedYear !== "all" && String(d.getFullYear()) !== selectedYear)
          return false;
        if (
          selectedMonth !== "all" &&
          String(d.getMonth() + 1) !== selectedMonth
        )
          return false;
        return true;
      });
  }, [bookings, selectedYear, selectedMonth]);

  const selectedPeriodLabel = useMemo(() => {
    if (selectedYear === "all" && selectedMonth === "all") return "All Time";
    const monthName =
      selectedMonth === "all"
        ? "All Months"
        : new Date(2000, Number(selectedMonth) - 1, 1).toLocaleDateString(
            "en-US",
            { month: "long" },
          );
    if (selectedYear === "all") return `${monthName} (All Years)`;
    if (selectedMonth === "all") return `All of ${selectedYear}`;
    return `${monthName} ${selectedYear}`;
  }, [selectedYear, selectedMonth]);

  const metrics = useMemo(() => {
    const totalBookings = filteredBookings.length;
    const activeRentals = filteredBookings.filter(
      (b) => b.status === "active",
    ).length;
    const pendingReservations = filteredBookings.filter(
      (b) => b.status === "pending_reservation",
    ).length;
    const pendingFullPayment = filteredBookings.filter(
      (b) => b.status === "pending_full_payment",
    ).length;
    const completed = filteredBookings.filter(
      (b) => b.status === "completed",
    ).length;
    const suspectedFake = filteredBookings.filter(
      (b) => b?.receiptVerification?.status === "suspected_fake",
    ).length;
    const reuploadRequested = filteredBookings.filter(
      (b) => b.requiresProofReupload,
    ).length;

    const totalRevenue = filteredBookings.reduce((sum, b) => {
      const reservationFee = Number(b.reservationFee || 200);
      const extensionAdditional = Array.isArray(b.extensions)
        ? b.extensions.reduce(
            (acc, ext) => acc + Number(ext.additionalAmount || 0),
            0,
          )
        : 0;
      const penaltyAmount = Number(b.returnInspection?.penaltyAmount || 0);
      const damageAmount = Number(
        b.returnInspection?.repairEstimateAmount || 0,
      );
      const baseAmount = Math.max(
        0,
        Number(b.amount || 0) -
          extensionAdditional -
          penaltyAmount -
          damageAmount,
      );
      let add = 0;
      if (b.paymentStatus === "reservation_paid") add += reservationFee;
      if (b.paymentStatus === "fully_paid") add += baseAmount;
      if (b.status === "completed") add += extensionAdditional;
      if (b.status === "completed") add += penaltyAmount + damageAmount;
      if (b.returnInspection?.penaltySettled && b.status !== "completed")
        add += penaltyAmount + damageAmount;
      return sum + add;
    }, 0);

    const totalDueAtPickup = filteredBookings.reduce((sum, b) => {
      if (b.status === "cancelled") return sum;
      if (b.paymentStatus === "fully_paid") return sum;
      return (
        sum +
        Math.max(0, Number(b.amount || 0) - Number(b.reservationFee || 200))
      );
    }, 0);

    // Security deposits: how much is currently collected, how much has been
    // returned to renters, and how much is still being held (outstanding).
    // A deposit can be returned either in full (cleared, no violations) or
    // partially (penalty settled — deposit.deductions were applied).
    const depositsCollected = filteredBookings.filter(
      (b) => b.securityDeposit?.collected,
    );
    const securityDepositsCollectedCount = depositsCollected.length;
    const securityDepositsHeldCount = depositsCollected.filter(
      (b) => !b.securityDeposit?.returned,
    ).length;
    const securityDepositsReturnedCount = depositsCollected.filter(
      (b) => b.securityDeposit?.returned,
    ).length;
    const securityDepositsFullyRefundedCount = depositsCollected.filter(
      (b) =>
        b.securityDeposit?.returned && !Number(b.securityDeposit?.deductions),
    ).length;
    const securityDepositsPartiallyRefundedCount = depositsCollected.filter(
      (b) =>
        b.securityDeposit?.returned &&
        Number(b.securityDeposit?.deductions) > 0,
    ).length;
    const securityDepositsOutstanding = depositsCollected.reduce(
      (sum, b) =>
        b.securityDeposit?.returned
          ? sum
          : sum + Number(b.securityDeposit?.amount || 1000),
      0,
    );
    const securityDepositsReturnedAmount = depositsCollected.reduce(
      (sum, b) =>
        b.securityDeposit?.returned
          ? sum + Number(b.securityDeposit?.returnedAmount || 0)
          : sum,
      0,
    );
    const securityDepositsDeductedAmount = depositsCollected.reduce(
      (sum, b) => sum + Number(b.securityDeposit?.deductions || 0),
      0,
    );
    const securityDepositsBalanceDueAmount = depositsCollected.reduce(
      (sum, b) => sum + Number(b.securityDeposit?.balanceDue || 0),
      0,
    );

    return {
      totalBookings,
      activeRentals,
      pendingReservations,
      pendingFullPayment,
      completed,
      suspectedFake,
      reuploadRequested,
      totalRevenue,
      totalDueAtPickup,
      securityDepositsCollectedCount,
      securityDepositsHeldCount,
      securityDepositsReturnedCount,
      securityDepositsFullyRefundedCount,
      securityDepositsPartiallyRefundedCount,
      securityDepositsOutstanding,
      securityDepositsReturnedAmount,
      securityDepositsDeductedAmount,
      securityDepositsBalanceDueAmount,
    };
  }, [filteredBookings]);

  const earningsAndExpenses = useMemo(() => {
    const t = {
      reservationFees: 0,
      unitRental: 0,
      extensions: 0,
      pendingExtensions: 0,
      helmetFees: 0,
      distanceFees: 0,
      penalties: 0,
      other: 0,
      expenses: 0,
    };
    filteredBookings.forEach((b) => {
      const reservationFee = Number(b.reservationFee || 0);
      const extensionAdditional = Array.isArray(b.extensions)
        ? b.extensions.reduce(
            (acc, ext) => acc + Number(ext.additionalAmount || 0),
            0,
          )
        : 0;
      const helmetFee = Number(b.details?.helmetFee || 0);
      const distanceFee = Number(b.details?.distanceFee || 0);

      // Repair-related violations (Minor Scratches, Major Damage, Tire /
      // Mirror / Helmet damage) are true repair expenses; everything else
      // charged during return inspection (Dirty, Late Return, Geofence
      // Exceeded) is a behavioral penalty, not a repair cost. The legacy
      // mechanic-entered repairEstimateAmount is also a repair cost.
      const { repair: repairViolationAmount, penalty: nonRepairPenaltyAmount } =
        splitRepairAndPenaltyAmounts(b.returnInspection);
      const repairEstimate = Number(
        b.returnInspection?.repairEstimateAmount || 0,
      );
      const repairAmount = repairViolationAmount + repairEstimate;
      const penaltyAmount = nonRepairPenaltyAmount;
      const penaltyAndDamageAmount = penaltyAmount + repairAmount;

      const amountTotal = Number(b.amount || 0);
      const baseRental = Math.max(
        0,
        amountTotal -
          extensionAdditional -
          helmetFee -
          distanceFee -
          penaltyAndDamageAmount,
      );
      if (b.paymentStatus === "reservation_paid")
        t.reservationFees += reservationFee;
      if (b.paymentStatus === "fully_paid") {
        t.unitRental += baseRental;
        t.helmetFees += helmetFee;
        t.distanceFees += distanceFee;
        if (extensionAdditional && b.status !== "completed")
          t.pendingExtensions += extensionAdditional;
      }
      const settled =
        b.status === "completed" ||
        (b.returnInspection?.penaltySettled && b.status !== "completed");
      if (b.status === "completed" && extensionAdditional)
        t.extensions += extensionAdditional;
      if (settled) {
        if (penaltyAmount) t.penalties += penaltyAmount;
        if (repairAmount) t.expenses += repairAmount;
      }
      const attributed =
        baseRental +
        extensionAdditional +
        helmetFee +
        distanceFee +
        reservationFee +
        penaltyAndDamageAmount;
      if (amountTotal && attributed === 0) t.other += amountTotal;
    });
    Object.keys(t).forEach((k) => (t[k] = Math.round(t[k])));
    return t;
  }, [filteredBookings]);

  const fleetStats = useMemo(() => {
    const active = motorcycles.filter((m) => !m?.isDeleted);
    return {
      total: active.length,
      available: active.filter((m) => m.status === "available").length,
      pending: active.filter((m) => m.status === "pending").length,
      rented: active.filter((m) => m.status === "rented").length,
      maintenance: active.filter((m) => m.status === "maintenance").length,
    };
  }, [motorcycles]);

  const bookingStatusData = useMemo(() => {
    const map = {
      PendingReservation: "pending_reservation",
      PendingFullPayment: "pending_full_payment",
      Active: "active",
      Completed: "completed",
      Cancelled: "cancelled",
    };
    return Object.entries(map)
      .map(([label, key]) => ({
        label,
        count: filteredBookings.filter((b) => b.status === key).length,
      }))
      .filter((x) => x.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [filteredBookings]);

  const reservationPaymentMethodData = useMemo(() => {
    const map = new Map();
    filteredBookings.forEach((b) => {
      const k = b.reservationPaymentMethod || "Unspecified";
      map.set(k, (map.get(k) || 0) + 1);
    });
    return [...map.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredBookings]);

  const fullPaymentMethodData = useMemo(() => {
    const map = new Map();
    filteredBookings.forEach((b) => {
      // only count if actually recorded or status shows it passed
      if (
        b.paymentStatus === "fully_paid" ||
        b.fullPaymentMethod ||
        b.details?.fullPaymentMethod
      ) {
        // Check for fullPaymentMethod, fallback to details, then fallback to general paymentMethod (for past walk-ins)
        let k = b.fullPaymentMethod || b.details?.fullPaymentMethod;

        if (!k) {
          k = b.paymentMethod || b.reservationPaymentMethod || "Unspecified";
        }

        map.set(k, (map.get(k) || 0) + 1);
      }
    });
    return [...map.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredBookings]);

  const revenueByMonth = useMemo(() => {
    const map = new Map();
    filteredBookings.forEach((b) => {
      const key = monthKey(b.bookingDate || b.createdAt || b.pickupDate);
      const reservationFee = Number(b.reservationFee || 200);
      const extAdd = Array.isArray(b.extensions)
        ? b.extensions.reduce(
            (acc, ext) => acc + Number(ext.additionalAmount || 0),
            0,
          )
        : 0;
      const penalty = Number(b.returnInspection?.penaltyAmount || 0);
      const damage = Number(b.returnInspection?.repairEstimateAmount || 0);
      const base = Math.max(
        0,
        Number(b.amount || 0) - extAdd - penalty - damage,
      );
      let add = 0;
      if (b.paymentStatus === "reservation_paid") add += reservationFee;
      if (b.paymentStatus === "fully_paid") add += base;
      if (b.status === "completed") add += extAdd + penalty + damage;
      if (b.returnInspection?.penaltySettled && b.status !== "completed")
        add += penalty + damage;
      map.set(key, (map.get(key) || 0) + add);
    });
    return [...map.entries()]
      .map(([label, total]) => ({ label, count: Math.round(total) }))
      .sort((a, b) => {
        const da = new Date(`${a.label} 1`),
          db = new Date(`${b.label} 1`);
        return Number.isNaN(da.getTime())
          ? 1
          : Number.isNaN(db.getTime())
            ? -1
            : da - db;
      });
  }, [filteredBookings]);

  const topMotorcycles = useMemo(() => {
    const map = new Map();
    filteredBookings.forEach((b) => {
      const k =
        `${b?.motorcycle?.make || "Unknown"} ${b?.motorcycle?.model || "Motorcycle"}`.trim();
      map.set(k, (map.get(k) || 0) + 1);
    });
    return [...map.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredBookings]);

  const statCards = [
    {
      label: "Total Bookings",
      value: metrics.totalBookings,
      sub: selectedPeriodLabel,
      tone: "neutral",
      icon: FaCalendarAlt,
    },
    {
      label: "Revenue",
      value: formatMoney(metrics.totalRevenue),
      sub: "Confirmed payments",
      tone: "success",
      icon: FaMoneyBillWave,
    },
    {
      label: "Due At Pickup",
      value: formatMoney(metrics.totalDueAtPickup),
      sub: "Outstanding balance",
      tone: "warning",
      icon: CreditCard,
    },
    {
      label: "Active Rentals",
      value: metrics.activeRentals,
      sub: `${fleetStats.rented} units out`,
      tone: "info",
      icon: Bike,
    },
    {
      label: "Pending Reservation",
      value: metrics.pendingReservations,
      sub: "Awaiting confirmation",
      tone: "neutral",
      icon: Clock,
    },
    {
      label: "Pending Full Payment",
      value: metrics.pendingFullPayment,
      sub: "Balance due",
      tone: "warning",
      icon: CheckCircle2,
    },
    // {
    //   label: "Suspected Fake",
    //   value: metrics.suspectedFake,
    //   sub: `${metrics.reuploadRequested} re-upload requests`,
    //   tone: "brand",
    //   icon: FaShieldAlt,
    // },
    {
      label: "Completed",
      value: metrics.completed,
      sub: "Finished rentals",
      tone: "success",
      icon: FaCheckCircle,
    },
    {
      label: "Security Deposits Held",
      value: formatMoney(metrics.securityDepositsOutstanding),
      sub: `${metrics.securityDepositsHeldCount} held · ${metrics.securityDepositsReturnedCount} returned`,
      tone: "info",
      icon: Wallet,
    },
    // {
    //   label: "Deposit Deductions",
    //   value: formatMoney(metrics.securityDepositsDeductedAmount),
    //   sub:
    //     metrics.securityDepositsBalanceDueAmount > 0
    //       ? `${metrics.securityDepositsPartiallyRefundedCount} partial · ${formatMoney(metrics.securityDepositsBalanceDueAmount)} owed`
    //       : `${metrics.securityDepositsFullyRefundedCount} full · ${metrics.securityDepositsPartiallyRefundedCount} partial refund${metrics.securityDepositsPartiallyRefundedCount === 1 ? "" : "s"}`,
    //   tone: metrics.securityDepositsBalanceDueAmount > 0 ? "brand" : "warning",
    //   icon: FaFileInvoiceDollar,
    // },
  ];

  const fleetStatCards = [
    {
      label: "Available",
      value: fleetStats.available,
      color: TONES.success.dot,
      text: TONES.success.text,
      bg: TONES.success.badgeBg,
    },
    {
      label: "Rented",
      value: fleetStats.rented,
      color: TONES.info.dot,
      text: TONES.info.text,
      bg: TONES.info.badgeBg,
    },
    {
      label: "Pending",
      value: fleetStats.pending,
      color: TONES.neutral.dot,
      text: TONES.neutral.text,
      bg: TONES.neutral.badgeBg,
    },
    {
      label: "Maintenance",
      value: fleetStats.maintenance,
      color: TONES.warning.dot,
      text: TONES.warning.text,
      bg: TONES.warning.badgeBg,
    },
  ];

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pt-36">
        {/* ── Header ── */}
        <div className="mb-7 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight">
              Data Analytics
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Monitor booking demand, payment health, and fleet movement.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* ── Export CSV → opens modal ── */}
            <button
              onClick={() => setCsvModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-500 font-bold text-xs hover:border-[#b50002]/20 hover:text-[#b50002] transition-all"
            >
              <FaFileExport className="text-[10px]" /> Export CSV
            </button>

            {/* ── Print Report → opens modal ── */}
            <button
              onClick={() => setPrintModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-500 font-bold text-xs hover:border-[#b50002]/20 hover:text-[#b50002] transition-all"
            >
              <FaPrint className="text-[10px]" /> Print Report
            </button>

            <button
              onClick={fetchAnalyticsData}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#b50002] text-white font-bold text-xs shadow-md shadow-[#b50002]/30 hover:brightness-110 transition-all"
            >
              <FaRedo
                className={`text-[10px] ${loading ? "animate-spin" : ""}`}
              />{" "}
              Refresh
            </button>
          </div>
        </div>

        {/* ── Filters toolbar ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <FaFilter className="text-slate-300 text-[10px]" />
              <span className="text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase">
                Filter Period
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-sm text-[#171717] focus:outline-none focus:border-[#b50002]/30"
                >
                  <option value="all">All Years</option>
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-sm text-[#171717] focus:outline-none focus:border-[#b50002]/30"
                >
                  <option value="all">All Months</option>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <option key={i + 1} value={String(i + 1)}>
                      {new Date(2000, i, 1).toLocaleDateString("en-US", {
                        month: "long",
                      })}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-1.5 flex-wrap">
              {fleetStatCards.map(({ label, value, text, bg }) => (
                <span
                  key={label}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${bg} ${text}`}
                >
                  {label}: {value}
                </span>
              ))}
            </div>
          </div>

          {/* Active period indicator */}
          {(selectedYear !== "all" || selectedMonth !== "all") && (
            <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between">
              <p className="text-[11px] text-slate-400 font-semibold">
                Showing data for:{" "}
                <span className="text-[#171717] font-black">
                  {selectedPeriodLabel}
                </span>
              </p>
              <button
                onClick={() => {
                  setSelectedYear("all");
                  setSelectedMonth("all");
                }}
                className="text-[11px] text-[#b50002] font-bold hover:underline"
              >
                Clear filter
              </button>
            </div>
          )}
        </div>

        {/* ── Error state ── */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-[#b50002] rounded-2xl p-4 mb-6 flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {/* ── Main stat cards ── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
            : statCards.map((s) => (
                <StatCard key={s.label} {...s} loading={loading} />
              ))}
        </div>

        {/* ── Body layout ── */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
          {/* Left: charts — 3/4 */}
          <div className="xl:col-span-3 space-y-4">
            {/* Revenue trend */}
            <SectionCard title="Revenue Trend" icon={TrendingUp}>
              <Sparkline items={revenueByMonth} />
            </SectionCard>

            {/* Donut grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SectionCard title="Booking Status" icon={BarChart3}>
                <DonutChart items={bookingStatusData} />
              </SectionCard>
              <SectionCard title="Payment Method (Res)" icon={CreditCard}>
                <DonutChart items={reservationPaymentMethodData} />
              </SectionCard>
              <SectionCard title="Payment Method (Full)" icon={CreditCard}>
                <DonutChart items={fullPaymentMethodData} />
              </SectionCard>
            </div>

            {/* Top motorcycles */}
            <SectionCard title="Top Requested Units" icon={FaMotorcycle}>
              {topMotorcycles.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">
                  No bookings yet
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                  {(() => {
                    const topTotal = topMotorcycles.reduce(
                      (s, x) => s + x.count,
                      0,
                    );
                    return topMotorcycles.map((m, idx) => (
                      <UnitRankRow
                        key={m.label}
                        rank={idx + 1}
                        label={m.label}
                        count={m.count}
                        share={
                          topTotal ? Math.round((m.count / topTotal) * 100) : 0
                        }
                      />
                    ));
                  })()}
                </div>
              )}
            </SectionCard>
          </div>

          {/* Right sidebar — 1/4 */}
          <div className="flex flex-col gap-4">
            {/* Fleet Summary */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="font-black text-[#171717] text-[14px] mb-4">
                Fleet Summary
              </h3>
              <div className="space-y-3">
                {fleetStatCards.map(({ label, value, color }) => {
                  const pct = fleetStats.total
                    ? Math.round((value / fleetStats.total) * 100)
                    : 0;
                  return (
                    <div key={label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12px] font-semibold text-slate-500">
                          {label}
                        </span>
                        <span className="text-[12px] font-black text-[#171717]">
                          {loading ? "—" : value}
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${color} transition-all duration-700`}
                          style={{ width: loading ? "0%" : `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                <div className="pt-2 border-t border-slate-50 flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-slate-500">
                    Total Fleet
                  </span>
                  <span className="text-[12px] font-black text-[#171717]">
                    {fleetStats.total}
                  </span>
                </div>
              </div>
            </div>

            {/* Revenue breakdown summary */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="font-black text-[#171717] text-[14px] mb-4">
                Revenue Breakdown
              </h3>
              <div className="space-y-2.5">
                {[
                  {
                    label: "Unit Rental",
                    value: earningsAndExpenses.unitRental,
                    color: "text-emerald-600",
                  },
                  {
                    label: "Reservation Fees",
                    value: earningsAndExpenses.reservationFees,
                    color: "text-blue-600",
                  },
                  {
                    label: "Extensions",
                    value: earningsAndExpenses.extensions,
                    color: "text-slate-600",
                  },
                  {
                    label: "Penalties",
                    value: earningsAndExpenses.penalties,
                    color: "text-amber-600",
                  },
                  {
                    label: "Helmet Fees",
                    value: earningsAndExpenses.helmetFees,
                    color: "text-slate-500",
                  },
                  {
                    label: "Distance Fees",
                    value: earningsAndExpenses.distanceFees,
                    color: "text-slate-500",
                  },
                ]
                  .filter((x) => x.value > 0)
                  .map(({ label, value, color }) => (
                    <div
                      key={label}
                      className="flex items-center justify-between"
                    >
                      <span className="text-[11px] font-semibold text-slate-500">
                        {label}
                      </span>
                      <span className={`text-[12px] font-black ${color}`}>
                        {formatMoney(value)}
                      </span>
                    </div>
                  ))}
                {earningsAndExpenses.expenses > 0 && (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                    <span className="text-[11px] font-semibold text-[#b50002]">
                      Expenses (Repairs)
                    </span>
                    <span className="text-[12px] font-black text-[#b50002]">
                      {formatMoney(earningsAndExpenses.expenses)}
                    </span>
                  </div>
                )}
                {earningsAndExpenses.pendingExtensions > 0 && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] font-semibold text-slate-400">
                      Pending Extensions
                    </span>
                    <span className="text-[12px] font-black text-slate-400">
                      {formatMoney(earningsAndExpenses.pendingExtensions)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Security Deposits breakdown */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="font-black text-[#171717] text-[14px] mb-4">
                Security Deposits
              </h3>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500">
                    Collected
                  </span>
                  <span className="text-[12px] font-black text-[#171717]">
                    {metrics.securityDepositsCollectedCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500">
                    Currently Held
                  </span>
                  <span className="text-[12px] font-black text-blue-600">
                    {metrics.securityDepositsHeldCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500">
                    Fully Refunded
                  </span>
                  <span className="text-[12px] font-black text-emerald-600">
                    {metrics.securityDepositsFullyRefundedCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500">
                    Partially Refunded
                  </span>
                  <span className="text-[12px] font-black text-amber-600">
                    {metrics.securityDepositsPartiallyRefundedCount}
                  </span>
                </div>
                {metrics.securityDepositsDeductedAmount > 0 && (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                    <span className="text-[11px] font-semibold text-amber-600">
                      Total Deducted
                    </span>
                    <span className="text-[12px] font-black text-amber-600">
                      {formatMoney(metrics.securityDepositsDeductedAmount)}
                    </span>
                  </div>
                )}
                {metrics.securityDepositsBalanceDueAmount > 0 && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] font-semibold text-[#b50002]">
                      Balance Still Owed
                    </span>
                    <span className="text-[12px] font-black text-[#b50002]">
                      {formatMoney(metrics.securityDepositsBalanceDueAmount)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Receipt integrity */}
            {/* <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="font-black text-[#171717] text-[14px] mb-4">
                Receipt Integrity
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-red-50 border border-red-100">
                  <div>
                    <p className="text-[11px] font-black text-[#b50002] uppercase tracking-wider">
                      Suspected Fake
                    </p>
                    <p className="text-2xl font-black text-[#b50002]">
                      {metrics.suspectedFake}
                    </p>
                  </div>
                  <FaShieldAlt className="text-[#b50002] text-xl opacity-40" />
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-100">
                  <div>
                    <p className="text-[11px] font-black text-amber-600 uppercase tracking-wider">
                      Re-upload Requests
                    </p>
                    <p className="text-2xl font-black text-amber-600">
                      {metrics.reuploadRequested}
                    </p>
                  </div>
                  <FaExclamationTriangle className="text-amber-500 text-xl opacity-40" />
                </div>
              </div>
            </div> */}
          </div>
        </div>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      <ExportCSVModal
        open={csvModalOpen}
        onClose={() => setCsvModalOpen(false)}
        selectedPeriodLabel={selectedPeriodLabel}
        metrics={metrics}
      />

      <PrintReportModal
        open={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        selectedPeriodLabel={selectedPeriodLabel}
        metrics={metrics}
        fleetStats={fleetStats}
        earningsAndExpenses={earningsAndExpenses}
      />
    </div>
  );
};

export default AdminAnalytics;
