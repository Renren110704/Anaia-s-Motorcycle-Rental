import React, { useRef, useState } from "react";
import { FaUpload, FaUndo, FaUserEdit } from "react-icons/fa";
import {
  DEFAULT_PRINTED_BY,
  clearReportLogo,
  getDefaultReportLogo,
  getReportSettings,
  prepareReportLogo,
  saveReportLogo,
  saveReportPrintedBy,
} from "../utils/reportUtils";

/**
 * ReportBrandingFields — "Printed By" name + report logo.
 *
 * Shown inside every "Print Report" dialog. Changes are saved straight away
 * (in this browser) and are picked up by printDocument(), so the dialogs do
 * not need to pass anything along.
 */
const ReportBrandingFields = ({ disabled = false, className = "" }) => {
  const [initial] = useState(() => getReportSettings());
  const [printedBy, setPrintedBy] = useState(initial.printedBy);
  const [logo, setLogo] = useState(initial.logo);
  const [hasCustomLogo, setHasCustomLogo] = useState(initial.hasCustomLogo);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const handleNameChange = (e) => {
    setPrintedBy(e.target.value);
    saveReportPrintedBy(e.target.value);
  };

  // An empty name is never printed: fall back to the default.
  const handleNameBlur = () => {
    if (!printedBy.trim()) {
      setPrintedBy(DEFAULT_PRINTED_BY);
      saveReportPrintedBy("");
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const dataUrl = await prepareReportLogo(file);
      if (!saveReportLogo(dataUrl)) {
        throw new Error(
          "Could not save the logo in this browser. Try a smaller image.",
        );
      }
      setLogo(dataUrl);
      setHasCustomLogo(true);
    } catch (err) {
      setError(err.message || "Could not use that image.");
    } finally {
      setBusy(false);
    }
  };

  const handleResetLogo = () => {
    clearReportLogo();
    setLogo(getDefaultReportLogo());
    setHasCustomLogo(false);
    setError("");
  };

  const locked = disabled || busy;

  return (
    <div className={className}>
      <div className="flex items-center gap-1.5 mb-2.5">
        <FaUserEdit className="text-slate-300 text-[10px]" />
        <span className="text-[10px] font-bold tracking-[0.12em] text-slate-500 uppercase">
          Report Header
        </span>
      </div>

      <div className="rounded-2xl border border-slate-100 p-3 space-y-3">
        {/* Printed By */}
        <div>
          <label
            htmlFor="report-printed-by"
            className="block text-[11px] font-bold text-slate-500 mb-1"
          >
            Printed By
          </label>
          <input
            id="report-printed-by"
            type="text"
            value={printedBy}
            maxLength={80}
            disabled={disabled}
            placeholder={DEFAULT_PRINTED_BY}
            onChange={handleNameChange}
            onBlur={handleNameBlur}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-[#171717] focus:outline-none focus:border-[#b50002]/30 disabled:opacity-50"
          />
        </div>

        {/* Logo */}
        <div>
          <p className="text-[11px] font-bold text-slate-500 mb-1">
            Report Logo
          </p>
          <div className="flex items-center gap-3">
            <div className="w-20 h-14 rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden flex-shrink-0 p-1.5">
              <img
                src={logo}
                alt="Report logo preview"
                className="max-w-full max-h-full object-contain"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current && fileRef.current.click()}
                  disabled={locked}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-[#171717] font-bold text-[11px] hover:border-[#b50002]/40 hover:text-[#b50002] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <FaUpload className="text-[9px]" />
                  {busy
                    ? "Uploading…"
                    : hasCustomLogo
                      ? "Change Logo"
                      : "Upload Logo"}
                </button>
                {hasCustomLogo && (
                  <button
                    type="button"
                    onClick={handleResetLogo}
                    disabled={locked}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-500 font-bold text-[11px] hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <FaUndo className="text-[9px]" /> Use Default
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-semibold mt-1.5">
                {hasCustomLogo ? "Custom logo" : "Default logo"} · PNG, JPG or
                WebP, up to 5 MB
              </p>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFile}
            className="hidden"
          />
          {error && (
            <p className="text-[11px] font-semibold text-[#b50002] mt-1.5">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportBrandingFields;
