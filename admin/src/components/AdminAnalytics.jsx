import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import API_BASE_URL from "../apiBase";
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaCreditCard,
  FaExclamationTriangle,
  FaFileExport,
  FaFilter,
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaMotorcycle,
  FaPrint,
  FaRedo,
  FaShieldAlt,
} from "react-icons/fa";

const baseURL = API_BASE_URL;
const api = axios.create({ baseURL, headers: { Accept: "application/json" } });

const PAGE_LIMIT = 1000;

const formatMoney = (n) => `₱ ${Number(n || 0).toLocaleString()}`;

const monthKey = (dateLike) => {
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return "Unknown";
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
};

const AnalyticsCard = ({
  label,
  value,
  icon: Icon,
  subText,
  accent = "text-[#b50002]",
}) => (
  <div className={`bg-gradient-to-br from-[#d0d0d0] to-[#b9b9b9] rounded-2xl p-4 shadow-lg border border-[#171717]/10`}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-[#171717]/55">
          {label}
        </p>
        <p className="text-3xl font-bold text-[#171717] mt-1">{value}</p>
        {subText ? <p className="text-xs text-[#171717]/55 mt-1">{subText}</p> : null}
      </div>
      <div className="p-3 rounded-xl bg-[#171717]/10 border border-[#171717]/10">
        <Icon className={`${accent} text-xl`} />
      </div>
    </div>
  </div>
);

const DistributionCard = ({
  title,
  items,
  icon: Icon,
  emptyText = "No data",
  barClass = "bg-[#b50002]",
}) => {
  const max = Math.max(1, ...items.map((x) => x.count));

  return (
    <div className="bg-gradient-to-br from-[#d0d0d0] to-[#b9b9b9] rounded-2xl p-5 shadow-lg shadow-black/20 border border-[#171717]/10">
      <p className="text-sm font-bold text-[#171717] uppercase tracking-wider flex items-center gap-2 mb-4 pb-2 border-b border-[#171717]/10">
        <Icon className="text-[#b50002]" /> {title}
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-[#171717]/55">{emptyText}</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const widthPct = Math.max(4, Math.round((item.count / max) * 100));
            return (
              <div key={item.label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-semibold text-[#171717]">{item.label}</span>
                  <span className="text-[#171717]/70">{item.count}</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-[#171717]/10 overflow-hidden">
                  <div
                    className={`h-full ${barClass}`}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const CHART_COLORS = [
  "#171717",
  "#b50002",
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#7c3aed",
  "#0891b2",
  "#be123c",
];

const DonutChartCard = ({ title, items, icon: Icon, emptyText = "No data" }) => {
  const total = items.reduce((sum, item) => sum + Number(item.count || 0), 0);

  if (!total) {
    return (
      <div className="bg-gradient-to-br from-[#d0d0d0] to-[#b9b9b9] rounded-2xl p-5 shadow-lg shadow-black/20 border border-[#171717]/10">
        <p className="text-sm font-bold text-[#171717] uppercase tracking-wider flex items-center gap-2 mb-4 pb-2 border-b border-[#171717]/10">
          <Icon className="text-[#b50002]" /> {title}
        </p>
        <p className="text-sm text-[#171717]/55">{emptyText}</p>
      </div>
    );
  }

  let runningPct = 0;
  const gradientStops = items
    .map((item, idx) => {
      const pct = (Number(item.count || 0) / total) * 100;
      const start = runningPct;
      runningPct += pct;
      const end = runningPct;
      const color = CHART_COLORS[idx % CHART_COLORS.length];
      return `${color} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
    })
    .join(", ");

  return (
    <div className="bg-gradient-to-br from-[#d0d0d0] to-[#b9b9b9] rounded-2xl p-5 shadow-lg shadow-black/20 border border-[#171717]/10">
      <p className="text-sm font-bold text-[#171717] uppercase tracking-wider flex items-center gap-2 mb-4 pb-2 border-b border-[#171717]/10">
        <Icon className="text-[#b50002]" /> {title}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-4 items-center">
        <div className="flex items-center justify-center">
          <div
            className="relative h-36 w-36 rounded-full"
            style={{ background: `conic-gradient(${gradientStops})` }}
          >
            <div className="absolute inset-6 rounded-full bg-[#d0d0d0] border border-[#171717]/10 flex items-center justify-center text-center">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[#171717]/60 font-bold">Total</p>
                <p className="text-xl font-black text-[#171717] leading-none">{total}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {items.map((item, idx) => {
            const count = Number(item.count || 0);
            const pct = total ? Math.round((count / total) * 100) : 0;
            const color = CHART_COLORS[idx % CHART_COLORS.length];

            return (
              <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-3 w-3 rounded-full border border-[#171717]/20"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-semibold text-[#171717] truncate">{item.label}</span>
                </div>
                <span className="text-[#171717]/75 font-medium whitespace-nowrap">
                  {count} ({pct}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const LineChartCard = ({ title, items, icon: Icon, emptyText = "No data" }) => {
  if (!items.length) {
    return (
      <div className="bg-gradient-to-br from-[#d0d0d0] to-[#b9b9b9] rounded-2xl p-5 shadow-lg shadow-black/20 border border-[#171717]/10">
        <p className="text-sm font-bold text-[#171717] uppercase tracking-wider flex items-center gap-2 mb-4 pb-2 border-b border-[#171717]/10">
          <Icon className="text-[#b50002]" /> {title}
        </p>
        <p className="text-sm text-[#171717]/55">{emptyText}</p>
      </div>
    );
  }

  const values = items.map((item) => Number(item.count || 0));
  const max = Math.max(1, ...values);
  const min = Math.min(...values);
  const range = Math.max(1, max - min);

  const points = items.map((item, idx) => {
    const x = items.length === 1 ? 50 : (idx / (items.length - 1)) * 100;
    const y = 40 - ((Number(item.count || 0) - min) / range) * 32;
    return `${x},${y}`;
  });

  const areaPoints = [`0,40`, ...points, `100,40`].join(" ");
  const linePoints = points.join(" ");

  const firstLabel = items[0]?.label || "";
  const middleLabel = items[Math.floor(items.length / 2)]?.label || "";
  const lastLabel = items[items.length - 1]?.label || "";

  return (
    <div className="bg-gradient-to-br from-[#d0d0d0] to-[#b9b9b9] rounded-2xl p-5 shadow-lg shadow-black/20 border border-[#171717]/10">
      <p className="text-sm font-bold text-[#171717] uppercase tracking-wider flex items-center gap-2 mb-4 pb-2 border-b border-[#171717]/10">
        <Icon className="text-[#b50002]" /> {title}
      </p>

      <div className="rounded-xl border border-[#171717]/10 bg-[#171717]/5 p-3">
        <svg viewBox="0 0 100 44" className="w-full h-44" role="img" aria-label={title}>
          <line x1="0" y1="40" x2="100" y2="40" stroke="#171717" strokeOpacity="0.22" strokeWidth="0.8" />
          <line x1="0" y1="24" x2="100" y2="24" stroke="#171717" strokeOpacity="0.12" strokeWidth="0.8" />
          <line x1="0" y1="8" x2="100" y2="8" stroke="#171717" strokeOpacity="0.12" strokeWidth="0.8" />
          <polygon points={areaPoints} fill="#16a34a" fillOpacity="0.18" />
          <polyline points={linePoints} fill="none" stroke="#15803d" strokeWidth="1.6" />
          {items.map((item, idx) => {
            const x = items.length === 1 ? 50 : (idx / (items.length - 1)) * 100;
            const y = 40 - ((Number(item.count || 0) - min) / range) * 32;
            return <circle key={item.label} cx={x} cy={y} r="1.3" fill="#14532d" />;
          })}
        </svg>

        <div className="mt-2 flex items-center justify-between text-[11px] text-[#171717]/65 font-semibold">
          <span>{firstLabel}</span>
          <span>{middleLabel}</span>
          <span>{lastLabel}</span>
        </div>
      </div>
    </div>
  );
};

const AdminAnalytics = () => {
  const [bookings, setBookings] = useState([]);
  const [motorcycles, setMotorcycles] = useState([]);
  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
        const date = new Date(b?.bookingDate || b?.createdAt || b?.pickupDate);
        if (!Number.isNaN(date.getTime())) {
          years.add(String(date.getFullYear()));
        }
      });

    return [...years].sort((a, b) => Number(b) - Number(a));
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    const activeBookings = bookings.filter((b) => !b?.isDeleted);
    return activeBookings.filter((b) => {
      const date = new Date(b?.bookingDate || b?.createdAt || b?.pickupDate);
      if (Number.isNaN(date.getTime())) return false;

      if (selectedYear !== "all" && String(date.getFullYear()) !== selectedYear) {
        return false;
      }

      if (selectedMonth !== "all" && String(date.getMonth() + 1) !== selectedMonth) {
        return false;
      }

      return true;
    });
  }, [bookings, selectedYear, selectedMonth]);

  const selectedPeriodLabel = useMemo(() => {
    if (selectedYear === "all" && selectedMonth === "all") return "All Time";

    const monthName =
      selectedMonth === "all"
        ? "All Months"
        : new Date(2000, Number(selectedMonth) - 1, 1).toLocaleDateString("en-US", {
            month: "long",
          });

    if (selectedYear === "all") return `${monthName} (All Years)`;
    if (selectedMonth === "all") return `All Months in ${selectedYear}`;
    return `${monthName} ${selectedYear}`;
  }, [selectedYear, selectedMonth]);

  const metrics = useMemo(() => {
    const totalBookings = filteredBookings.length;
    const activeRentals = filteredBookings.filter((b) => b.status === "active").length;
    const pendingReservations = filteredBookings.filter(
      (b) => b.status === "pending_reservation",
    ).length;
    const pendingFullPayment = filteredBookings.filter(
      (b) => b.status === "pending_full_payment",
    ).length;
    const completed = filteredBookings.filter((b) => b.status === "completed").length;
    const suspectedFake = filteredBookings.filter(
      (b) => b?.receiptVerification?.status === "suspected_fake",
    ).length;
    const reuploadRequested = filteredBookings.filter(
      (b) => b.requiresProofReupload,
    ).length;

    const totalRevenue = filteredBookings.reduce((sum, b) => {
      if (b.paymentStatus === "fully_paid") return sum + Number(b.amount || 0);
      if (b.paymentStatus === "reservation_paid") return sum + Number(b.reservationFee || 200);
      return sum;
    }, 0);

    const totalDueAtPickup = filteredBookings.reduce((sum, b) => {
      if (b.status === "cancelled") return sum;
      if (b.paymentStatus === "fully_paid") return sum;
      const total = Number(b.amount || 0);
      const down = Number(b.reservationFee || 200);
      return sum + Math.max(0, total - down);
    }, 0);

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
    };
  }, [filteredBookings]);

  const fleetStats = useMemo(() => {
    const activeFleet = motorcycles.filter((m) => !m?.isDeleted);
    const statusCount = (status) => activeFleet.filter((m) => m.status === status).length;

    return {
      total: activeFleet.length,
      available: statusCount("available"),
      pending: statusCount("pending"),
      rented: statusCount("rented"),
      maintenance: statusCount("maintenance"),
    };
  }, [motorcycles]);

  const bookingStatusData = useMemo(() => {
    const statusMap = {
      PendingReservation: "pending_reservation",
      PendingFullPayment: "pending_full_payment",
      Active: "active",
      Completed: "completed",
      Cancelled: "cancelled",
    };

    return Object.entries(statusMap)
      .map(([label, key]) => ({
        label,
        count: filteredBookings.filter((b) => b.status === key).length,
      }))
      .filter((x) => x.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [filteredBookings]);

  const paymentMethodData = useMemo(() => {
    const map = new Map();
    filteredBookings.forEach((b) => {
      const key = b.reservationPaymentMethod || "Unspecified";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return [...map.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredBookings]);

  const revenueByMonth = useMemo(() => {
    const map = new Map();
    filteredBookings.forEach((b) => {
      const key = monthKey(b.bookingDate || b.createdAt || b.pickupDate);
      const add =
        b.paymentStatus === "fully_paid"
          ? Number(b.amount || 0)
          : b.paymentStatus === "reservation_paid"
            ? Number(b.reservationFee || 200)
            : 0;
      map.set(key, (map.get(key) || 0) + add);
    });

    return [...map.entries()]
      .map(([label, total]) => ({ label, count: Math.round(total) }))
      .sort((a, b) => {
        const da = new Date(`${a.label} 1`);
        const db = new Date(`${b.label} 1`);
        if (Number.isNaN(da.getTime()) && Number.isNaN(db.getTime())) return 0;
        if (Number.isNaN(da.getTime())) return 1;
        if (Number.isNaN(db.getTime())) return -1;
        return da - db;
      });
  }, [filteredBookings]);

  const topMotorcycles = useMemo(() => {
    const map = new Map();
    filteredBookings.forEach((b) => {
      const mk = b?.motorcycle?.make || "Unknown";
      const md = b?.motorcycle?.model || "Motorcycle";
      const key = `${mk} ${md}`.trim();
      map.set(key, (map.get(key) || 0) + 1);
    });

    return [...map.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredBookings]);

  const exportAnalyticsCSV = useCallback(() => {
    const lines = [];
    lines.push(["Metric", "Value"].join(","));
    lines.push(["Period", selectedPeriodLabel].join(","));
    lines.push(["Total Bookings", metrics.totalBookings].join(","));
    lines.push(["Total Revenue", metrics.totalRevenue].join(","));
    lines.push(["Due At Pickup", metrics.totalDueAtPickup].join(","));
    lines.push(["Active Rentals", metrics.activeRentals].join(","));
    lines.push(["Pending Reservation", metrics.pendingReservations].join(","));
    lines.push(["Pending Full Payment", metrics.pendingFullPayment].join(","));
    lines.push(["Suspected Fake", metrics.suspectedFake].join(","));
    lines.push(["Re-upload Requested", metrics.reuploadRequested].join(","));
    lines.push(["", ""].join(","));

    lines.push([
      "Booking Date",
      "Customer",
      "Motorcycle",
      "Status",
      "Payment Status",
      "Amount",
      "Reservation Fee",
      "Method",
      "Suspected Fake",
    ].join(","));

    filteredBookings.forEach((b) => {
      const row = [
        (b.bookingDate || b.createdAt || "").toString().replace(/,/g, " "),
        (b.customer || "").toString().replace(/,/g, " "),
        `${b?.motorcycle?.make || ""} ${b?.motorcycle?.model || ""}`.trim().replace(/,/g, " "),
        (b.status || "").toString().replace(/,/g, " "),
        (b.paymentStatus || "").toString().replace(/,/g, " "),
        Number(b.amount || 0),
        Number(b.reservationFee || 200),
        (b.reservationPaymentMethod || "").toString().replace(/,/g, " "),
        b?.receiptVerification?.status === "suspected_fake" ? "Yes" : "No",
      ];
      lines.push(row.join(","));
    });

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const periodToken = selectedPeriodLabel
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9-]/g, "")
      .toLowerCase();
    a.download = `analytics-${periodToken}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredBookings, metrics, selectedPeriodLabel]);

  const exportPrintableReport = useCallback(() => {
    const reportHtml = `
      <html>
        <head>
          <title>Admin Analytics Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #171717; }
            h1 { margin: 0 0 6px; }
            .muted { color: #555; font-size: 12px; margin-bottom: 18px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; margin-bottom: 20px; }
            .card { border: 1px solid #ddd; border-radius: 10px; padding: 10px 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; text-align: left; }
            th { background: #f4f4f4; }
          </style>
        </head>
        <body>
          <h1>Anaia's Motorcycle Rental - Analytics Report</h1>
          <div class="muted">Generated on ${new Date().toLocaleString()} | Period: ${selectedPeriodLabel}</div>
          <div class="grid">
            <div class="card"><strong>Total Bookings:</strong> ${metrics.totalBookings}</div>
            <div class="card"><strong>Total Revenue:</strong> ${formatMoney(metrics.totalRevenue)}</div>
            <div class="card"><strong>Due At Pickup:</strong> ${formatMoney(metrics.totalDueAtPickup)}</div>
            <div class="card"><strong>Active Rentals:</strong> ${metrics.activeRentals}</div>
            <div class="card"><strong>Pending Reservation:</strong> ${metrics.pendingReservations}</div>
            <div class="card"><strong>Pending Full Payment:</strong> ${metrics.pendingFullPayment}</div>
            <div class="card"><strong>Suspected Fake:</strong> ${metrics.suspectedFake}</div>
            <div class="card"><strong>Re-upload Requests:</strong> ${metrics.reuploadRequested}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Booking Date</th>
                <th>Customer</th>
                <th>Motorcycle</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${filteredBookings
                .slice(0, 100)
                .map((b) => {
                  const mc = `${b?.motorcycle?.make || ""} ${b?.motorcycle?.model || ""}`.trim();
                  return `<tr>
                    <td>${new Date(b.bookingDate || b.createdAt || Date.now()).toLocaleDateString()}</td>
                    <td>${b.customer || ""}</td>
                    <td>${mc}</td>
                    <td>${b.status || ""}</td>
                    <td>${b.paymentStatus || ""}</td>
                    <td>${Number(b.amount || 0).toLocaleString()}</td>
                  </tr>`;
                })
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const win = window.open("", "_blank", "width=1100,height=800");
    if (!win) return;
    win.document.write(reportHtml);
    win.document.close();
    win.focus();
    win.print();
  }, [filteredBookings, metrics, selectedPeriodLabel]);

  return (
    <div className="min-h-screen pt-32 bg-[#e3e3e3] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4 rounded-3xl bg-gradient-to-br from-[#171717] via-[#212121] to-[#b50002] p-4 sm:p-5 border border-white/10 mt-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] font-black text-[#b9b9b9]/80 mb-1">
                Admin Dashboard
              </p>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white">
                Data Analytics
              </h1>
              <p className="text-xs sm:text-sm text-[#b9b9b9]/80 mt-1.5 max-w-xl">
                Monitor booking demand, payment health, and fleet movement in one dashboard.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-[#c7c5c5] rounded-xl px-3 py-2 shadow-lg shadow-black/20 border border-[#171717]/10">
            <FaFilter className="text-[#171717] text-sm" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent text-sm text-[#171717] focus:outline-none"
            >
              <option value="all">All Years</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-[#c7c5c5] rounded-xl px-3 py-2 shadow-lg shadow-black/20 border border-[#171717]/10">
            <FaCalendarAlt className="text-[#171717] text-sm" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-sm text-[#171717] focus:outline-none"
            >
              <option value="all">All Months</option>
              {Array.from({ length: 12 }).map((_, idx) => {
                const value = String(idx + 1);
                const label = new Date(2000, idx, 1).toLocaleDateString("en-US", {
                  month: "long",
                });
                return (
                  <option key={value} value={value}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>

          <button
            onClick={fetchAnalyticsData}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#171717] text-white text-sm font-bold shadow-lg hover:brightness-110 transition-all"
          >
            <FaRedo className={loading ? "animate-spin" : ""} /> Refresh
          </button>

          <button
            onClick={exportAnalyticsCSV}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#b50002] text-white text-sm font-bold shadow-lg hover:brightness-110 transition-all"
          >
            <FaFileExport /> Export CSV
          </button>

          <button
            onClick={exportPrintableReport}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#b50002] text-white text-sm font-bold shadow-lg hover:brightness-110 transition-all"
          >
            <FaPrint /> Export PDF
          </button>

          <div className="ml-auto flex items-center gap-2 text-xs">
            <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 font-semibold border border-green-300">
              Available: {fleetStats.available}
            </span>
            <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 font-semibold border border-yellow-300">
              Pending: {fleetStats.pending}
            </span>
            <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800 font-semibold border border-blue-300">
              Rented: {fleetStats.rented}
            </span>
            <span className="px-2 py-1 rounded-full bg-red-100 text-red-800 font-semibold border border-red-300">
              Maintenance: {fleetStats.maintenance}
            </span>
          </div>
        </div>

        {error ? (
          <div className="bg-red-100 border border-red-300 text-red-800 rounded-xl p-4 mb-5 flex items-center gap-2">
            <FaExclamationTriangle /> {error}
          </div>
        ) : null}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-[124px] rounded-2xl bg-[#b9b9b9] border border-[#171717]/10 animate-pulse"
              />
            ))}
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <AnalyticsCard
            label="Bookings"
            value={metrics.totalBookings}
            icon={FaCalendarAlt}
            subText="Within selected period"
            accent="text-[#171717]"
            glow="shadow-black/20"
          />
          <AnalyticsCard
            label="Revenue"
            value={formatMoney(metrics.totalRevenue)}
            icon={FaMoneyBillWave}
            subText="Paid + reservation confirmed"
            accent="text-[#171717]"
            glow="shadow-green-900/20"
          />
          <AnalyticsCard
            label="Due At Pickup"
            value={formatMoney(metrics.totalDueAtPickup)}
            icon={FaCreditCard}
            subText="Outstanding balance"
            accent="text-[#171717]"
            glow="shadow-orange-900/20"
          />
          <AnalyticsCard
            label="Fleet"
            value={fleetStats.total}
            icon={FaMotorcycle}
            subText={`${fleetStats.available} available · ${fleetStats.rented} rented`}
            accent="text-[#171717]"
            glow="shadow-blue-900/20"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <AnalyticsCard
            label="Active Rentals"
            value={metrics.activeRentals}
            icon={FaClock}
            accent="text-[#171717]"
            glow="shadow-blue-900/20"
          />
          <AnalyticsCard
            label="Pending Reservation"
            value={metrics.pendingReservations}
            icon={FaCreditCard}
            accent="text-[#171717]"
            glow="shadow-yellow-900/20"
          />
          <AnalyticsCard
            label="Pending Full Payment"
            value={metrics.pendingFullPayment}
            icon={FaCheckCircle}
            accent="text-[#171717]"
            glow="shadow-orange-900/20"
          />
          <AnalyticsCard
            label="Suspected Fake"
            value={metrics.suspectedFake}
            icon={FaShieldAlt}
            subText={`Re-upload requests: ${metrics.reuploadRequested}`}
            accent="text-[#171717]"
            glow="shadow-[#b50002]/20"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          <DonutChartCard
            title="Booking Status Distribution"
            items={bookingStatusData}
            icon={FaMapMarkerAlt}
          />
          <DonutChartCard
            title="Payment Method Mix"
            items={paymentMethodData}
            icon={FaCreditCard}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <LineChartCard
            title="Revenue Trend by Month"
            items={revenueByMonth}
            icon={FaMoneyBillWave}
            emptyText="No paid bookings in this period"
          />
          <DistributionCard
            title="Top Requested Motorcycles"
            items={topMotorcycles}
            icon={FaMotorcycle}
            emptyText="No bookings yet"
            barClass="bg-blue-700"
          />
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
