import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FaPrint, FaFileExport, FaTimes, FaCalendarAlt } from "react-icons/fa";
import {
  filterByDateRange,
  getDateBounds,
  printReport,
} from "../utils/reportUtils";
import ReportBrandingFields from "./ReportBrandingFields";

/**
 * ReportActionButtons — "Print Report" + "Export CSV".
 *
 * `report` (optional): when provided, "Print Report" opens a Date From /
 * Date To dialog, filters the rows by that range, then prints the report.
 *   {
 *     title, subtitle, columns, emptyMessage,
 *     rows:       array | () => array | () => Promise<array>,
 *     getDate:    (row) => date | [startDate, endDate],
 *     dateLabel:  string,                  // which date the range applies to
 *     undated:    "exclude" (default) | "include",
 *     defaultFrom, defaultTo,              // "YYYY-MM-DD" prefill
 *     onError:    (err) => void,
 *   }
 */
const ReportActionButtons = ({
  onPrint,
  onExport,
  disabled = false,
  className = "",
  report = null,
}) => {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && !busy && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy]);

  const handlePrintClick = () => {
    if (!report) {
      if (onPrint) onPrint();
      return;
    }
    setFrom(report.defaultFrom || "");
    setTo(report.defaultTo || "");
    setError("");
    setOpen(true);
  };

  const confirmPrint = async () => {
    if (from && to && from > to) {
      setError("Date From cannot be later than Date To.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const all =
        typeof report.rows === "function"
          ? await report.rows()
          : report.rows || [];
      const rows = report.getDate
        ? filterByDateRange(all, report.getDate, from, to, {
            undated: report.undated,
          })
        : all;
      // Blank sides fall back to the earliest/latest date in the printed data,
      // so the printed header always shows a concrete Date From / Date To.
      const bounds = report.getDate
        ? getDateBounds(rows, report.getDate)
        : { min: "", max: "" };
      const printed = printReport({
        title: report.title,
        subtitle: report.subtitle,
        columns: report.columns,
        rows,
        emptyMessage: report.emptyMessage,
        dateFrom: from || bounds.min,
        dateTo: to || bounds.max,
        dateBasis: report.dateLabel,
      });
      if (printed !== false) setOpen(false);
    } catch (err) {
      if (report.onError) report.onError(err);
      else setError("Failed to prepare the report. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    "w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-[#171717] focus:outline-none focus:border-[#b50002]/30";

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={handlePrintClick}
        disabled={disabled}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-[#171717] font-bold text-xs hover:border-[#b50002]/40 hover:text-[#b50002] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        <FaPrint className="text-[10px]" /> Print Report
      </button>
      <button
        type="button"
        onClick={onExport}
        disabled={disabled}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#b50002] text-white font-bold text-xs shadow-md shadow-[#b50002]/20 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        <FaFileExport className="text-[10px]" /> Export CSV
      </button>

      {open &&
        report &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4"
            onMouseDown={(e) =>
              e.target === e.currentTarget && !busy && setOpen(false)
            }
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100"
              role="dialog"
              aria-modal="true"
              aria-labelledby="print-range-title"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div>
                  <p
                    id="print-range-title"
                    className="font-black text-[#171717] text-[14px]"
                  >
                    Print Report
                  </p>
                  <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                    {report.title}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => !busy && setOpen(false)}
                  className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600"
                  aria-label="Close"
                >
                  <FaTimes className="text-xs" />
                </button>
              </div>

              <div className="px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
                <div className="flex items-center gap-1.5">
                  <FaCalendarAlt className="text-slate-300 text-[10px]" />
                  <span className="text-[10px] font-bold tracking-[0.12em] text-slate-500 uppercase">
                    Date Range
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="print-date-from"
                      className="block text-[11px] font-bold text-slate-500 mb-1"
                    >
                      Date From
                    </label>
                    <input
                      id="print-date-from"
                      type="date"
                      value={from}
                      max={to || undefined}
                      onChange={(e) => setFrom(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="print-date-to"
                      className="block text-[11px] font-bold text-slate-500 mb-1"
                    >
                      Date To
                    </label>
                    <input
                      id="print-date-to"
                      type="date"
                      value={to}
                      min={from || undefined}
                      onChange={(e) => setTo(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                  {report.dateLabel ? `Applied to: ${report.dateLabel}. ` : ""}
                  Filters already set on this page are kept. Leave a date blank
                  to include everything; the report will then show the earliest
                  or latest date found.
                </p>

                {/* Printed By + logo (shown in the printed header) */}
                <ReportBrandingFields disabled={busy} className="pt-1" />

                {error && (
                  <p className="text-[11px] font-semibold text-[#b50002]">
                    {error}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-slate-100 bg-slate-50/60">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={busy}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-500 font-bold text-xs hover:text-slate-700 disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmPrint}
                  disabled={busy}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#b50002] text-white font-bold text-xs shadow-md shadow-[#b50002]/25 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <FaPrint className="text-[10px]" />{" "}
                  {busy ? "Preparing…" : "Print Report"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default ReportActionButtons;
