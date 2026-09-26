import React from "react";
import { FaPrint, FaFileExport } from "react-icons/fa";

/**
 * ReportActionButtons
 *
 * Consistent "Print Report" + "Export CSV" button pair for admin pages.
 * Both actions are independent — either can be clicked without the other.
 *
 * Props:
 *   onPrint    () => void   required
 *   onExport   () => void   required
 *   disabled   boolean      optional, disables both buttons (e.g. while loading)
 *   className  string       optional, extra classes for the wrapping div
 */
const ReportActionButtons = ({
  onPrint,
  onExport,
  disabled = false,
  className = "",
}) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <button
      type="button"
      onClick={onPrint}
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
  </div>
);

export default ReportActionButtons;
