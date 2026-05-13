import React, { useEffect, useRef, useState } from "react";
import { FaPrint, FaTimes } from "react-icons/fa";
import { Calendar, BarChart3, ShieldCheck, Coins, Bike } from "lucide-react";

const SECTIONS = [
  {
    key: "summary",
    label: "Summary metrics",
    sub: "Bookings, revenue, due at pickup, active rentals",
    Icon: BarChart3,
    defaultOn: true,
  },
  {
    key: "integrity",
    label: "Receipt integrity",
    sub: "Suspected fake receipts & re-upload requests",
    Icon: ShieldCheck,
    defaultOn: true,
  },
  {
    key: "revenue",
    label: "Revenue breakdown",
    sub: "Unit rental, fees, extensions, penalties",
    Icon: Coins,
    defaultOn: true,
  },
  {
    key: "fleet",
    label: "Fleet summary",
    sub: "Available, rented, pending, maintenance",
    Icon: Bike,
    defaultOn: false,
  },
];

const formatMoney = (n) => `₱${Number(n || 0).toLocaleString()}`;

/**
 * PrintReportModal
 *
 * Props:
 *   open                boolean
 *   onClose             () => void
 *   selectedPeriodLabel string
 *   metrics             object  (same shape as AdminAnalytics metrics)
 *   fleetStats          object  { total, available, rented, pending, maintenance }
 *   earningsAndExpenses object  (same shape as AdminAnalytics earningsAndExpenses)
 */
const PrintReportModal = ({
  open,
  onClose,
  selectedPeriodLabel = "All Time",
  metrics = {},
  fleetStats = {},
  earningsAndExpenses = {},
}) => {
  const [enabled, setEnabled] = useState(
    () => new Set(SECTIONS.filter((s) => s.defaultOn).map((s) => s.key)),
  );
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const toggle = (key) =>
    setEnabled((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  const handlePrint = () => {
    const show = (key) => enabled.has(key);

    const summaryHTML = show("summary")
      ? `<div class="section">
          <h2>Summary Metrics</h2>
          <div class="grid">
            <div class="card"><strong>Total Bookings</strong><span>${metrics.totalBookings ?? "—"}</span></div>
            <div class="card"><strong>Revenue</strong><span>${formatMoney(metrics.totalRevenue)}</span></div>
            <div class="card"><strong>Due At Pickup</strong><span>${formatMoney(metrics.totalDueAtPickup)}</span></div>
            <div class="card"><strong>Active Rentals</strong><span>${metrics.activeRentals ?? "—"}</span></div>
            <div class="card"><strong>Completed</strong><span>${metrics.completed ?? "—"}</span></div>
            <div class="card"><strong>Pending Reservation</strong><span>${metrics.pendingReservations ?? "—"}</span></div>
          </div>
        </div>`
      : "";

    const integrityHTML = show("integrity")
      ? `<div class="section">
          <h2>Receipt Integrity</h2>
          <div class="grid">
            <div class="card warn"><strong>Suspected Fake</strong><span>${metrics.suspectedFake ?? "—"}</span></div>
            <div class="card warn"><strong>Re-upload Requests</strong><span>${metrics.reuploadRequested ?? "—"}</span></div>
          </div>
        </div>`
      : "";

    const revenueHTML = show("revenue")
      ? `<div class="section">
          <h2>Revenue Breakdown</h2>
          <table>
            <thead><tr><th>Category</th><th>Amount</th></tr></thead>
            <tbody>
              <tr><td>Unit Rental</td><td>${formatMoney(earningsAndExpenses.unitRental)}</td></tr>
              <tr><td>Reservation Fees</td><td>${formatMoney(earningsAndExpenses.reservationFees)}</td></tr>
              <tr><td>Extensions</td><td>${formatMoney(earningsAndExpenses.extensions)}</td></tr>
              <tr><td>Penalties</td><td>${formatMoney(earningsAndExpenses.penalties)}</td></tr>
              <tr><td>Helmet Fees</td><td>${formatMoney(earningsAndExpenses.helmetFees)}</td></tr>
              <tr><td>Distance Fees</td><td>${formatMoney(earningsAndExpenses.distanceFees)}</td></tr>
              ${earningsAndExpenses.expenses > 0 ? `<tr class="exp"><td>Expenses (Repairs)</td><td>${formatMoney(earningsAndExpenses.expenses)}</td></tr>` : ""}
            </tbody>
          </table>
        </div>`
      : "";

    const fleetHTML = show("fleet")
      ? `<div class="section">
          <h2>Fleet Summary</h2>
          <div class="grid">
            <div class="card"><strong>Total</strong><span>${fleetStats.total ?? "—"}</span></div>
            <div class="card"><strong>Available</strong><span>${fleetStats.available ?? "—"}</span></div>
            <div class="card"><strong>Rented</strong><span>${fleetStats.rented ?? "—"}</span></div>
            <div class="card"><strong>Pending</strong><span>${fleetStats.pending ?? "—"}</span></div>
            <div class="card"><strong>Maintenance</strong><span>${fleetStats.maintenance ?? "—"}</span></div>
          </div>
        </div>`
      : "";

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Analytics Report — ${selectedPeriodLabel}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; color: #171717; padding: 32px; font-size: 13px; }
    .report-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 28px; padding-bottom: 16px; border-bottom: 2px solid #b50002; }
    .report-header h1 { font-size: 20px; font-weight: 800; color: #171717; }
    .report-header p  { font-size: 12px; color: #888; margin-top: 4px; }
    .badge { display: inline-block; background: #fef2f2; color: #b50002; border: 1px solid #fecaca; border-radius: 6px; padding: 4px 10px; font-size: 11px; font-weight: 700; }
    .section { margin-bottom: 24px; }
    .section h2 { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #b50002; margin-bottom: 12px; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; }
    .card.warn { border-color: #fecaca; background: #fef2f2; }
    .card strong { display: block; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin-bottom: 4px; }
    .card span { font-size: 18px; font-weight: 800; color: #171717; }
    .card.warn span { color: #b50002; }
    table { width: 100%; border-collapse: collapse; }
    table thead tr { background: #f8fafc; }
    table th, table td { padding: 9px 12px; text-align: left; border-bottom: 1px solid #f1f5f9; font-size: 12px; }
    table th { font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #94a3b8; }
    table tr.exp td { color: #b50002; font-weight: 700; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <div class="report-header">
    <div>
      <h1>Analytics Report</h1>
      <p>Generated ${new Date().toLocaleString("en-PH", { dateStyle: "long", timeStyle: "short" })}</p>
    </div>
    <span class="badge">${selectedPeriodLabel}</span>
  </div>
  ${summaryHTML}
  ${integrityHTML}
  ${revenueHTML}
  ${fleetHTML}
  <div class="footer">Powered by Anaia's Motorcycle Rental Analytics &nbsp;·&nbsp; Confidential</div>
</body>
</html>`;

    const w = window.open("", "_blank", "width=1100,height=800");
    if (!w) {
      alert("Pop-up blocked. Please allow pop-ups for this site.");
      return;
    }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
    onClose();
  };

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] px-4"
      style={{ animation: "fadeIn 0.18s ease" }}
    >
      <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(12px) scale(0.98) }
                             to   { opacity: 1; transform: translateY(0)     scale(1)    } }
      `}</style>

      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100"
        style={{ animation: "slideUp 0.2s ease" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pdf-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
              <FaPrint className="text-[#b50002] text-sm" />
            </div>
            <div>
              <p
                id="pdf-modal-title"
                className="font-black text-[#171717] text-[14px]"
              >
                Print Report
              </p>
              <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                Configure sections before printing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
            aria-label="Close"
          >
            <FaTimes className="text-xs" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          {/* Period chip */}
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100 mb-4">
            <Calendar className="w-3.5 h-3.5 text-[#b50002] flex-shrink-0" />
            <span className="text-[12px] text-slate-500 font-semibold">
              Period:{" "}
              <span className="text-[#171717] font-black">
                {selectedPeriodLabel}
              </span>
            </span>
          </div>

          {/* Section toggles */}
          <p className="text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase mb-2.5">
            Sections to include
          </p>
          <div className="rounded-2xl border border-slate-100 overflow-hidden divide-y divide-slate-50">
            {SECTIONS.map(({ key, label, sub, Icon }) => {
              const on = enabled.has(key);
              return (
                <div key={key} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-3.5 h-3.5 text-[#b50002]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-[#171717] leading-tight">
                      {label}
                    </p>
                    <p className="text-[11px] text-slate-400 font-semibold mt-0.5 truncate">
                      {sub}
                    </p>
                  </div>
                  {/* Toggle switch */}
                  <button
                    onClick={() => toggle(key)}
                    role="switch"
                    aria-checked={on}
                    aria-label={`Toggle ${label}`}
                    className={`relative w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0 focus:outline-none
                      ${on ? "bg-[#b50002]" : "bg-slate-200"}`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200
                        ${on ? "left-[18px]" : "left-0.5"}`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50/60">
          <p className="text-[11px] text-slate-400 font-semibold">
            {enabled.size} section{enabled.size !== 1 ? "s" : ""} · opens print
            dialog
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-500 font-bold text-xs hover:text-slate-700 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handlePrint}
              disabled={enabled.size === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#b50002] text-white font-bold text-xs shadow-md shadow-[#b50002]/25 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <FaPrint className="text-[10px]" /> Print Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintReportModal;
