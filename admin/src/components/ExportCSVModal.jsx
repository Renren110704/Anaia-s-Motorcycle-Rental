import React, { useEffect, useRef, useState } from "react";
import { FaFileExport, FaTimes, FaDownload } from "react-icons/fa";
import {
  Calendar,
  BookOpen,
  Coins,
  Clock,
  Bike,
  CheckCircle2,
  ShieldAlert,
  CreditCard,
} from "lucide-react";

const ALL_FIELDS = [
  { key: "period", label: "Period", Icon: Calendar },
  { key: "bookings", label: "Total bookings", Icon: BookOpen },
  { key: "revenue", label: "Revenue", Icon: Coins },
  { key: "due", label: "Due at pickup", Icon: CreditCard },
  { key: "active", label: "Active rentals", Icon: Bike },
  { key: "completed", label: "Completed", Icon: CheckCircle2 },
  { key: "pending", label: "Pending", Icon: Clock },
  { key: "fake", label: "Suspected fake", Icon: ShieldAlert },
];

// ── FIX: Use plain "PHP" prefix instead of ₱ so Excel reads UTF-8 correctly ──
const formatMoneyCSV = (n) => `PHP ${Number(n || 0).toLocaleString("en-US")}`;

// ── FIX: Wrap every value in double-quotes so commas in numbers don't split ──
const csvCell = (val) => `"${String(val ?? "").replace(/"/g, '""')}"`;

/**
 * ExportCSVModal
 *
 * Props:
 *   open              boolean
 *   onClose           () => void
 *   selectedPeriodLabel string
 *   metrics           object  (same shape as AdminAnalytics metrics)
 */
const ExportCSVModal = ({
  open,
  onClose,
  selectedPeriodLabel = "All Time",
  metrics = {},
}) => {
  const [selected, setSelected] = useState(
    () => new Set(ALL_FIELDS.map((f) => f.key)),
  );
  const overlayRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Trap scroll
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const toggle = (key) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  const buildRows = () => {
    const fieldValues = {
      period: ["Period", selectedPeriodLabel],
      bookings: ["Total Bookings", metrics.totalBookings ?? ""],
      revenue: ["Revenue", formatMoneyCSV(metrics.totalRevenue)],
      due: ["Due At Pickup", formatMoneyCSV(metrics.totalDueAtPickup)],
      active: ["Active Rentals", metrics.activeRentals ?? ""],
      completed: ["Completed", metrics.completed ?? ""],
      pending: ["Pending Reservation", metrics.pendingReservations ?? ""],
      fake: ["Suspected Fake", metrics.suspectedFake ?? ""],
    };

    return ALL_FIELDS.filter((f) => selected.has(f.key))
      .map((f) => {
        const [metric, value] = fieldValues[f.key];
        // ── FIX: wrap each cell in quotes ──
        return `${csvCell(metric)},${csvCell(value)}`;
      })
      .join("\n");
  };

  const handleDownload = () => {
    if (selected.size === 0) return;

    const header = `${csvCell("Metric")},${csvCell("Value")}`;
    const csv = [header, buildRows()].join("\n");

    // ── FIX: prepend UTF-8 BOM (\uFEFF) so Excel auto-detects encoding ──
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
        aria-labelledby="csv-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <FaFileExport className="text-emerald-600 text-sm" />
            </div>
            <div>
              <p
                id="csv-modal-title"
                className="font-black text-[#171717] text-[14px]"
              >
                Export CSV
              </p>
              <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                Choose fields to include
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

          {/* Field toggles */}
          <p className="text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase mb-2.5">
            Select fields
          </p>
          <div className="grid grid-cols-2 gap-2">
            {ALL_FIELDS.map(({ key, label, Icon }) => {
              const active = selected.has(key);
              return (
                <button
                  key={key}
                  onClick={() => toggle(key)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all duration-150
                    ${
                      active
                        ? "border-[#b50002]/30 bg-[#b50002]/5 text-[#171717]"
                        : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"
                    }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 flex-shrink-0 ${active ? "text-[#b50002]" : "text-slate-300"}`}
                  />
                  <span className="text-[12px] font-semibold flex-1 truncate">
                    {label}
                  </span>
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all
                      ${active ? "bg-[#b50002]" : "border border-slate-200"}`}
                  >
                    {active && (
                      <svg viewBox="0 0 10 8" className="w-2 h-2 fill-white">
                        <path
                          d="M1 4l2.5 2.5L9 1"
                          stroke="white"
                          strokeWidth="1.5"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50/60">
          <p className="text-[11px] text-slate-400 font-semibold">
            {selected.size} field{selected.size !== 1 ? "s" : ""} selected
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-500 font-bold text-xs hover:text-slate-700 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleDownload}
              disabled={selected.size === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#b50002] text-white font-bold text-xs shadow-md shadow-[#b50002]/25 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <FaDownload className="text-[10px]" /> Download CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportCSVModal;
