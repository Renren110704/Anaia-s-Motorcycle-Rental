import React, { useEffect, useRef, useState } from "react";
import { FaPrint, FaTimes } from "react-icons/fa";
import { Calendar, BarChart3, ShieldCheck, Coins, Bike } from "lucide-react";
import {
  printDocument,
  escapeHTML,
  formatReportDate,
} from "../utils/reportUtils";
import ReportBrandingFields from "./ReportBrandingFields";

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

// "PHP" prefix (not ₱) to match the other printed reports and the CSV export.
const formatMoney = (n) => `PHP ${Number(n || 0).toLocaleString()}`;

/**
 * PrintReportModal
 *
 * Props:
 *   open                boolean
 *   onClose             () => void
 *   selectedPeriodLabel string
 *   dateFrom / dateTo   "YYYY-MM-DD"  concrete range shown in the printed header
 *   metrics             object  (same shape as AdminAnalytics metrics)
 *   fleetStats          object  { total, available, rented, pending, maintenance }
 *   earningsAndExpenses object  (same shape as AdminAnalytics earningsAndExpenses)
 */
const PrintReportModal = ({
  open,
  onClose,
  selectedPeriodLabel = "All Time",
  dateFrom = "",
  dateTo = "",
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
    const row = (label, value) =>
      `<tr><td>${escapeHTML(label)}</td><td class="amt">${escapeHTML(value)}</td></tr>`;
    const table = (heading, rows) =>
      `<h2 class="rpt-section">${escapeHTML(heading)}</h2>
       <table class="rpt-table">
         <thead><tr><th>Item</th><th class="amt">Value</th></tr></thead>
         <tbody>${rows.join("")}</tbody>
       </table>`;

    const sections = [];
    if (show("summary"))
      sections.push(
        table("Summary Metrics", [
          row("Total Bookings", metrics.totalBookings ?? "—"),
          row("Revenue", formatMoney(metrics.totalRevenue)),
          row("Due At Pickup", formatMoney(metrics.totalDueAtPickup)),
          row("Active Rentals", metrics.activeRentals ?? "—"),
          row("Completed", metrics.completed ?? "—"),
          row("Pending Reservation", metrics.pendingReservations ?? "—"),
        ]),
      );
    if (show("integrity"))
      sections.push(
        table("Receipt Integrity", [
          row("Suspected Fake", metrics.suspectedFake ?? "—"),
          row("Re-upload Requests", metrics.reuploadRequested ?? "—"),
        ]),
      );
    if (show("revenue"))
      sections.push(
        table("Revenue Breakdown", [
          row("Unit Rental", formatMoney(earningsAndExpenses.unitRental)),
          row(
            "Reservation Fees",
            formatMoney(earningsAndExpenses.reservationFees),
          ),
          row("Extensions", formatMoney(earningsAndExpenses.extensions)),
          row("Penalties", formatMoney(earningsAndExpenses.penalties)),
          row("Helmet Fees", formatMoney(earningsAndExpenses.helmetFees)),
          row("Distance Fees", formatMoney(earningsAndExpenses.distanceFees)),
          ...(earningsAndExpenses.expenses > 0
            ? [
                row(
                  "Expenses (Repairs)",
                  formatMoney(earningsAndExpenses.expenses),
                ),
              ]
            : []),
        ]),
      );
    if (show("fleet"))
      sections.push(
        table("Fleet Summary", [
          row("Total", fleetStats.total ?? "—"),
          row("Available", fleetStats.available ?? "—"),
          row("Rented", fleetStats.rented ?? "—"),
          row("Pending", fleetStats.pending ?? "—"),
          row("Maintenance", fleetStats.maintenance ?? "—"),
        ]),
      );

    const printed = printDocument({
      title: "Analytics Report",
      subtitle: `Period: ${selectedPeriodLabel}`,
      dateFrom,
      dateTo,
      dateBasis: "Booking date",
      bodyHTML: sections.join(""),
    });
    if (printed !== false) onClose();
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
        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">
          {/* Period chip */}
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100 mb-4">
            <Calendar className="w-3.5 h-3.5 text-[#b50002] flex-shrink-0 mt-0.5" />
            <div className="text-[12px] text-slate-500 font-semibold leading-relaxed">
              <div>
                Period:{" "}
                <span className="text-[#171717] font-black">
                  {selectedPeriodLabel}
                </span>
              </div>
              <div>
                Date From:{" "}
                <span className="text-[#171717] font-black">
                  {formatReportDate(dateFrom, "All dates")}
                </span>
                {"  ·  "}Date To:{" "}
                <span className="text-[#171717] font-black">
                  {formatReportDate(dateTo, "All dates")}
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Change the range with "Filter Period" on this page.
              </div>
            </div>
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

          {/* Printed By + logo (shown in the printed header) */}
          <ReportBrandingFields className="mt-4" />
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
