import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Clock,
  Store,
  ClipboardCheck,
  CalendarCheck,
  Activity,
} from "lucide-react";
import { FaMotorcycle } from "react-icons/fa";
import axios from "axios";
import API_BASE_URL from "../apiBase";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { Accept: "application/json" },
});

// ─── Helpers (mirrors MotorcycleBooking.jsx) ──────────────────────────────────
const extractMotorcycleInfo = (b) => {
  const snap =
    b.motorcycleSnapshot &&
    typeof b.motorcycleSnapshot === "object" &&
    Object.keys(b.motorcycleSnapshot).length
      ? b.motorcycleSnapshot
      : null;
  const motorcycle =
    snap ||
    (b.motorcycle && typeof b.motorcycle === "object" ? b.motorcycle : null);
  if (motorcycle)
    return {
      title: `${motorcycle.make || ""} ${motorcycle.model || ""}`.trim() || "",
      unitId: motorcycle.unitId || "",
    };
  return {
    title:
      typeof b.motorcycle === "string"
        ? b.motorcycle
        : b.motorcycleName || b.vehicle || "",
    unitId: b.unitId || b.motorcycleId?.unitId || "",
  };
};

const extractCustomer = (b) =>
  b.customer || b.customerName || b.renterName || "—";

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({
  label,
  value,
  sub,
  subColor,
  icon: Icon,
  accent,
  loading,
}) => (
  <div className="relative bg-white rounded-2xl border border-slate-100 shadow-sm p-5 overflow-hidden group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
    <div
      className={`absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-10 blur-xl ${accent}`}
    />
    <div className="flex items-start justify-between mb-3">
      <p className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase">
        {label}
      </p>
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent} bg-opacity-10`}
      >
        <Icon className={`w-4 h-4 ${accent.replace("bg-", "text-")}`} />
      </div>
    </div>
    <p className="text-[2.2rem] font-black text-[#171717] leading-none mb-2">
      {loading ? (
        <span className="inline-block w-12 h-8 bg-slate-100 rounded-lg animate-pulse" />
      ) : (
        value
      )}
    </p>
    <p className={`text-[11px] font-semibold ${subColor}`}>{sub}</p>
  </div>
);

// ─── Status badge ─────────────────────────────────────────────────────────────
const STATUS_MAP = {
  pending_reservation: {
    label: "Pending",
    cls: "bg-amber-50  text-amber-600  border-amber-200",
  },
  pending_full_payment: {
    label: "Pending Payment",
    cls: "bg-orange-50 text-orange-600 border-orange-200",
  },
  active: {
    label: "On Rent",
    cls: "bg-emerald-50 text-emerald-600 border-emerald-200",
  },
  on_rent: {
    label: "On Rent",
    cls: "bg-emerald-50 text-emerald-600 border-emerald-200",
  },
  inspection: {
    label: "Inspection",
    cls: "bg-violet-50 text-violet-600 border-violet-200",
  },
  returned: {
    label: "Returned",
    cls: "bg-orange-50 text-orange-600 border-orange-200",
  },
  completed: {
    label: "Completed",
    cls: "bg-slate-50  text-slate-500  border-slate-200",
  },
  reserved: {
    label: "Reserved",
    cls: "bg-blue-50   text-blue-600   border-blue-200",
  },
  cancelled: {
    label: "Cancelled",
    cls: "bg-red-50    text-[#b50002]  border-red-200",
  },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_MAP[status] ?? {
    label: status,
    cls: "bg-slate-50 text-slate-500 border-slate-200",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${s.cls}`}
    >
      {s.label}
    </span>
  );
};

// ─── Quick action card ────────────────────────────────────────────────────────
const QuickAction = ({ to, icon: Icon, title, desc, accent }) => (
  <Link
    to={to}
    className="flex items-center gap-4 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm
      hover:shadow-md hover:border-[#b50002]/20 hover:-translate-y-0.5 transition-all duration-200 group"
  >
    <div
      className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${accent} transition-transform group-hover:scale-110 duration-200`}
    >
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-bold text-[#171717] text-sm leading-tight">{title}</p>
      <p className="text-[11px] text-slate-400 mt-0.5 truncate">{desc}</p>
    </div>
    <ArrowRight className="w-4 h-4 text-slate-200 group-hover:text-[#b50002] group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0" />
  </Link>
);

// ─── Skeleton row ─────────────────────────────────────────────────────────────
const SkeletonRow = () => (
  <tr>
    {[...Array(4)].map((_, i) => (
      <td key={i} className="px-5 py-3.5">
        <div
          className="h-4 bg-slate-100 rounded-lg animate-pulse"
          style={{ width: `${60 + i * 10}%` }}
        />
      </td>
    ))}
  </tr>
);

// ─── Format date ──────────────────────────────────────────────────────────────
const fmtDate = (d) => {
  if (!d) return "—";
  const date = new Date(d);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const time = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (isToday) return `Today, ${time}`;
  return (
    date.toLocaleDateString("en-PH", { month: "short", day: "numeric" }) +
    `, ${time}`
  );
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get("/api/motorcycle-bookings", {
        params: { limit: 200, includeDeleted: "false" },
      });
      const raw = Array.isArray(res.data)
        ? res.data
        : res.data.data || res.data.bookings || [];
      setBookings(raw.filter((b) => !b.isDeleted));
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const active = bookings.filter((b) =>
    ["active", "on_rent"].includes(b.status),
  ).length;
  const pending = bookings.filter((b) =>
    ["pending_reservation", "pending_full_payment"].includes(b.status),
  ).length;
  const returned = bookings.filter((b) =>
    ["returned", "inspection"].includes(b.status),
  ).length;
  const completed = bookings.filter((b) => b.status === "completed").length;

  const recent = [...bookings]
    .sort(
      (a, b) =>
        new Date(b.createdAt || b.bookingDate) -
        new Date(a.createdAt || a.bookingDate),
    )
    .slice(0, 6);

  const stats = [
    {
      label: "Total Bookings",
      value: bookings.length,
      sub: "All records",
      subColor: "text-slate-400",
      icon: Activity,
      accent: "bg-violet-500",
    },
    {
      label: "Active Rentals",
      value: active,
      sub: `${bookings.length ? Math.round((active / bookings.length) * 100) : 0}% fleet utilization`,
      subColor: "text-emerald-500",
      icon: TrendingUp,
      accent: "bg-emerald-500",
    },
    {
      label: "Pending Reservations",
      value: pending,
      sub: pending > 0 ? "Awaiting confirmation" : "All confirmed",
      subColor: pending > 0 ? "text-amber-500" : "text-slate-400",
      icon: Clock,
      accent: "bg-amber-500",
    },
    {
      label: "Need Inspection",
      value: returned,
      sub: returned > 0 ? "Needs attention" : "All clear",
      subColor: returned > 0 ? "text-orange-500" : "text-emerald-500",
      icon: AlertTriangle,
      accent: "bg-orange-500",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight">
              Dashboard
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Here's what's happening with your fleet today.
            </p>
          </div>
          <Link
            to="/calendar"
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-[#b50002] text-white text-sm font-bold shadow-md shadow-[#b50002]/30 hover:brightness-110 transition-all"
          >
            <CalendarCheck className="w-4 h-4" />
            Calendar
            {pending > 0 && (
              <span className="ml-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-white text-[#b50002] text-[10px] font-black">
                {pending}
              </span>
            )}
          </Link>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {stats.map((s) => (
            <StatCard key={s.label} {...s} loading={loading} />
          ))}
        </div>

        {/* Recent bookings + Quick actions */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Table — takes 2/3 */}
          <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
              <div>
                <h2 className="font-black text-[#171717] text-[15px]">
                  Recent Activity
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Latest bookings & transactions
                </p>
              </div>
              <Link
                to="/bookings"
                className="flex items-center gap-1 text-xs font-bold text-[#b50002] hover:gap-2 transition-all"
              >
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-50">
                    {["Unit", "Customer", "Status", "Date"].map((h, i) => (
                      <th
                        key={h}
                        className={`text-left text-[10px] font-black tracking-[0.15em] text-slate-300 uppercase px-5 py-3${i === 3 ? " hidden sm:table-cell" : ""}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
                  ) : recent.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-5 py-10 text-center text-slate-300 text-sm"
                      >
                        No bookings yet.
                      </td>
                    </tr>
                  ) : (
                    recent.map((b) => {
                      const { title, unitId } = extractMotorcycleInfo(b);
                      const customer = extractCustomer(b);
                      return (
                        <tr
                          key={b._id || b.id}
                          className="hover:bg-slate-50/60 transition-colors"
                        >
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            {unitId ? (
                              <div>
                                <p className="font-black text-[13px] text-[#b50002] tracking-wider uppercase leading-tight">
                                  {unitId}
                                </p>
                                {title && (
                                  <p className="text-[11px] text-slate-400">
                                    {title}
                                  </p>
                                )}
                              </div>
                            ) : title ? (
                              <p className="font-bold text-[13px] text-[#171717]">
                                {title}
                              </p>
                            ) : (
                              <span className="text-slate-300 text-sm">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-[13px] text-slate-600 whitespace-nowrap font-medium">
                            {customer}
                          </td>
                          <td className="px-5 py-3.5">
                            <StatusBadge status={b.status} />
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-400 whitespace-nowrap hidden sm:table-cell">
                            {fmtDate(b.createdAt || b.bookingDate)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-4">
            {/* Fleet Summary */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="font-black text-[#171717] text-[14px] mb-4">
                Fleet Summary
              </h3>
              <div className="space-y-3">
                {[
                  {
                    label: "Active Rentals",
                    value: active,
                    color: "bg-emerald-500",
                  },
                  { label: "Pending", value: pending, color: "bg-amber-500" },
                  {
                    label: "Need Inspection",
                    value: returned,
                    color: "bg-orange-500",
                  },
                  {
                    label: "Completed",
                    value: completed,
                    color: "bg-slate-300",
                  },
                ].map(({ label, value, color }) => {
                  const pct = bookings.length
                    ? Math.round((value / bookings.length) * 100)
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
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="font-black text-[#171717] text-[14px] mb-3">
                Quick Actions
              </h3>
              <div className="space-y-2">
                <QuickAction
                  to="/manage-motorcycles"
                  icon={FaMotorcycle}
                  title="Manage Fleet"
                  desc="Add or update units"
                  accent="bg-violet-500"
                />
                <QuickAction
                  to="/walk-in-rentals"
                  icon={Store}
                  title="Process Walk-in"
                  desc="New walk-in transaction"
                  accent="bg-blue-500"
                />
                <QuickAction
                  to="/return-inspection"
                  icon={ClipboardCheck}
                  title="Return Inspection"
                  desc="Post-rental inspection report"
                  accent="bg-orange-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
