import React, { useCallback, useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import { Link } from "react-router-dom";
import axios from "axios";
import API_BASE_URL from "../apiBase";
import {
  FaArrowLeft,
  FaClock,
  FaExclamationTriangle,
  FaMapMarkerAlt,
  FaMapMarkedAlt,
  FaMotorcycle,
  FaSync,
  FaTrash,
  FaIdBadge,
  FaSatelliteDish,
} from "react-icons/fa";
import { AlertTriangle, MapPin, Clock, Trash2 } from "lucide-react";

const BASE = API_BASE_URL;
const STORAGE_KEY = "motorcycleLocationLogV1";

const api = axios.create({
  baseURL: BASE,
  headers: { Accept: "application/json" },
});

// ── Shared styles (same as ManageMotorcycle) ──────────────────────────────────
const labelCls =
  "block text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase mb-1.5";

// ── Helpers ───────────────────────────────────────────────────────────────────
const parseDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatTimestamp = (value) => {
  const d = parseDate(value);
  if (!d) return "Not yet recorded";
  return d.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const buildLocationText = (record) => {
  if (record?.resolvedLocation) return record.resolvedLocation;
  if (record?.locationText) return record.locationText;
  const lat = Number(record?.lat);
  const lng = Number(record?.lng);
  if (!Number.isNaN(lat) && !Number.isNaN(lng))
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  return "No location data available";
};

const getLocationLogPriority = (log) => {
  const source = String(log?.source || "")
    .trim()
    .toLowerCase();
  if (source === "traccar live" || source === "live gps") return 1;
  if (source === "gps snapshot" || source === "booking gps") return 2;
  if (source === "booking destination") return 3;
  return 4;
};

const getEntryLookupKey = (log) =>
  String(
    log?.unitId || log?.id || log?.bookingId || log?.motorcycleId || "",
  ).trim();

const getPreferredLog = (current, candidate) => {
  if (!current) return candidate;
  if (!candidate) return current;
  const cp = getLocationLogPriority(current);
  const dp = getLocationLogPriority(candidate);
  if (dp !== cp) return dp < cp ? candidate : current;
  const ct = parseDate(current.lastUpdatedAt)?.getTime() || 0;
  const dt = parseDate(candidate.lastUpdatedAt)?.getTime() || 0;
  return dt >= ct ? candidate : current;
};

// ── Source badge ──────────────────────────────────────────────────────────────
const SourceBadge = ({ source }) => {
  const s = String(source || "").toLowerCase();
  const isLive = s === "traccar live" || s === "live gps";
  const isGps = s === "gps snapshot" || s === "booking gps";
  if (isLive)
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border bg-violet-50 text-violet-600 border-violet-200">
        <FaSatelliteDish className="text-[10px]" /> Traccar Live
      </span>
    );
  if (isGps)
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border bg-blue-50 text-blue-600 border-blue-200">
        <MapPin className="w-3 h-3" /> GPS Snapshot
      </span>
    );
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border bg-slate-50 text-slate-500 border-slate-200">
      {source || "—"}
    </span>
  );
};

// ── Status badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const s = String(status || "").toLowerCase();
  const styles =
    s === "active"
      ? "bg-emerald-50 text-emerald-600 border-emerald-200"
      : s === "completed"
        ? "bg-blue-50 text-blue-600 border-blue-200"
        : "bg-slate-50 text-slate-500 border-slate-200";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${styles}`}
    >
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown"}
    </span>
  );
};

// ── Confirm Modal (same structure as ManageMotorcycle's ConfirmModal) ─────────
const ConfirmModal = ({ message, onConfirm, onCancel }) => (
  <div
    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
    onClick={onCancel}
  >
    <div
      className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-100"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="text-center">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
          <AlertTriangle className="w-6 h-6 text-[#b50002]" />
        </div>
        <h3 className="text-lg font-black text-[#171717] mb-2">
          Confirm Delete
        </h3>
        <p className="text-slate-500 text-sm mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-[#b50002] text-white font-bold text-sm shadow-md shadow-[#b50002]/30 hover:brightness-110 transition-all"
          >
            Yes, Delete
          </button>
        </div>
      </div>
    </div>
  </div>
);

const confirmModal = (message) =>
  new Promise((resolve) => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const root = ReactDOM.createRoot(el);
    const cleanup = (r) => {
      root.unmount();
      document.body.removeChild(el);
      resolve(r);
    };
    root.render(
      <ConfirmModal
        message={message}
        onConfirm={() => cleanup(true)}
        onCancel={() => cleanup(false)}
      />,
    );
  });

// ── Skeleton row ──────────────────────────────────────────────────────────────
const SkeletonRow = () => (
  <tr>
    {[...Array(7)].map((_, i) => (
      <td key={i} className="px-5 py-3.5">
        <div
          className="h-4 bg-slate-100 rounded-lg animate-pulse"
          style={{ width: `${50 + i * 8}%` }}
        />
      </td>
    ))}
  </tr>
);

// ── Empty State ───────────────────────────────────────────────────────────────
const EmptyState = ({ onRefresh }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
      <FaMotorcycle className="text-slate-200 text-3xl" />
    </div>
    <h3 className="font-black text-[#171717] text-lg mb-1">
      No location history yet
    </h3>
    <p className="text-slate-400 text-sm mb-4">
      Start GPS tracking or refresh after active booking updates.
    </p>
    <button
      onClick={onRefresh}
      className="px-5 py-2 rounded-xl bg-[#b50002] text-white font-bold text-sm shadow-md shadow-[#b50002]/30 hover:brightness-110 transition-all"
    >
      Refresh
    </button>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const MotorcycleLocationLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/tracking/location-log", {
        params: { limit: 300 },
      });
      const rows = Array.isArray(res.data)
        ? res.data
        : res.data?.data || res.data?.logs || [];
      setLogs(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.error(err);
      setError("Failed to load location log.");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteLogEntry = useCallback(
    async (log) => {
      const confirmed = await confirmModal(
        "Would you like to delete this location record?",
      );
      if (!confirmed) return;
      try {
        await api.delete("/api/tracking/location-log", {
          data: {
            key: log.key || "",
            bookingId: log.bookingId || "",
            motorcycleId: log.motorcycleId || "",
            unitId: log.unitId || "",
          },
        });
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        const existing = Array.isArray(parsed)
          ? parsed
          : Object.values(parsed || {});
        const targetKey =
          log.id || log.unitId || log.motorcycleId || log.bookingId;
        const next = existing.filter((entry) => {
          const entryKey =
            entry.id || entry.unitId || entry.motorcycleId || entry.bookingId;
          if (
            log.bookingId &&
            String(entry.bookingId || "") === String(log.bookingId)
          )
            return false;
          if (targetKey && entryKey && entryKey === targetKey) return false;
          return !(
            entry.unitId === log.unitId &&
            entry.motorcycleId === log.motorcycleId &&
            entry.bookingId === log.bookingId
          );
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        await loadLogs();
      } catch (err) {
        console.error(err);
        setError("Failed to delete location log entry.");
      }
    },
    [loadLogs],
  );

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);
  useEffect(() => {
    const timer = setInterval(loadLogs, 10000);
    return () => clearInterval(timer);
  }, [loadLogs]);

  const filteredLogs = useMemo(() => {
    const bestLogByUnit = new Map();
    logs.forEach((log) => {
      const key = getEntryLookupKey(log);
      if (!key) return;
      bestLogByUnit.set(key, getPreferredLog(bestLogByUnit.get(key), log));
    });
    return Array.from(bestLogByUnit.values());
  }, [logs]);

  const sortedLogs = useMemo(
    () =>
      [...filteredLogs].sort((a, b) => {
        const da = parseDate(a.lastUpdatedAt)?.getTime() || 0;
        const db = parseDate(b.lastUpdatedAt)?.getTime() || 0;
        return db - da;
      }),
    [filteredLogs],
  );

  const liveCount = sortedLogs.filter((l) => {
    const s = String(l.source || "").toLowerCase();
    return s === "traccar live" || s === "live gps";
  }).length;

  const gpsCount = sortedLogs.filter((l) => {
    const s = String(l.source || "").toLowerCase();
    return s === "gps snapshot" || s === "booking gps";
  }).length;

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pt-36">
        {/* Header — matches ManageMotorcycle */}
        <div className="mb-7 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight">
              Motorcycle Location Log
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Last known location snapshots per unit · refreshes every 10
              seconds
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/motorcycle-tracking"
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-all"
            >
              <FaMapMarkedAlt className="text-xs" /> Live Map
            </Link>
            <button
              onClick={loadLogs}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#b50002] text-white text-sm font-bold shadow-md shadow-[#b50002]/30 hover:brightness-110 transition-all"
            >
              <FaSync className="text-xs" /> Refresh
            </button>
            <Link
              to="/manage-motorcycles"
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-all"
            >
              <FaArrowLeft className="text-xs" /> Back
            </Link>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
          {[
            {
              label: "Total Entries",
              value: loading ? null : sortedLogs.length,
              sub: "Unique units logged",
              subColor: "text-slate-400",
              accent: "bg-blue-500",
              icon: FaMotorcycle,
            },
            {
              label: "Live GPS",
              value: loading ? null : liveCount,
              sub: "Traccar transmitting",
              subColor: "text-violet-500",
              accent: "bg-violet-500",
              icon: FaSatelliteDish,
            },
            {
              label: "GPS Snapshots",
              value: loading ? null : gpsCount,
              sub: "Last known position",
              subColor: "text-blue-500",
              accent: "bg-emerald-500",
              icon: MapPin,
            },
          ].map(({ label, value, sub, subColor, accent, icon: Icon }) => (
            <div
              key={label}
              className="relative bg-white rounded-2xl border border-slate-100 shadow-sm p-5 overflow-hidden"
            >
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
                  <Icon
                    className={`w-4 h-4 ${accent.replace("bg-", "text-")}`}
                  />
                </div>
              </div>
              <p className="text-[2.2rem] font-black text-[#171717] leading-none mb-2">
                {value === null ? (
                  <span className="inline-block w-10 h-7 bg-slate-100 rounded-lg animate-pulse" />
                ) : (
                  value
                )}
              </p>
              <p className={`text-[11px] font-semibold ${subColor}`}>{sub}</p>
            </div>
          ))}
        </div>

        {/* Info banner */}
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-4">
          <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-[12px] font-semibold text-amber-700">
            Entries show the newest known location per unit. Use this if live
            GPS is unavailable or the tracker is destroyed.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-4">
            <FaExclamationTriangle className="text-[#b50002] flex-shrink-0" />
            <p className="text-[12px] font-semibold text-[#b50002]">{error}</p>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full">
              <tbody className="divide-y divide-slate-50">
                {[...Array(5)].map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </tbody>
            </table>
          </div>
        ) : sortedLogs.length === 0 ? (
          <EmptyState onRefresh={loadLogs} />
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-slate-50">
                    {[
                      "Unit",
                      "Motorcycle",
                      "Last Known Location",
                      "Last Updated",
                      "Source",
                      "Booking",
                      "Action",
                    ].map((col) => (
                      <th
                        key={col}
                        className="text-left text-[10px] font-black tracking-[0.15em] text-slate-300 uppercase px-5 py-3 whitespace-nowrap"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {sortedLogs.map((log, idx) => (
                    <tr
                      key={`${log.id}-${idx}`}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      {/* Unit */}
                      <td className="px-5 py-3.5">
                        {log.unitId ? (
                          <span className="text-[11px] font-black text-[#b50002] tracking-wider uppercase">
                            {log.unitId}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-sm">—</span>
                        )}
                      </td>

                      {/* Motorcycle */}
                      <td className="px-5 py-3.5">
                        <p className="font-black text-[13px] text-[#171717] leading-tight">
                          {log.motorcycleName}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {log.customer || "No rider info"}
                        </p>
                      </td>

                      {/* Location */}
                      <td className="px-5 py-3.5 max-w-[220px]">
                        <div className="flex items-start gap-2">
                          <FaMapMarkerAlt className="text-[#b50002] text-[11px] mt-0.5 flex-shrink-0" />
                          <span className="text-[13px] text-slate-600 break-words">
                            {buildLocationText(log)}
                          </span>
                        </div>
                      </td>

                      {/* Last Updated */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                          <span className="text-[12px] text-slate-500">
                            {formatTimestamp(log.lastUpdatedAt)}
                          </span>
                        </div>
                      </td>

                      {/* Source */}
                      <td className="px-5 py-3.5">
                        <SourceBadge source={log.source} />
                      </td>

                      {/* Booking status */}
                      <td className="px-5 py-3.5">
                        <StatusBadge status={log.status} />
                      </td>

                      {/* Action */}
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => deleteLogEntry(log)}
                          title="Delete location log entry"
                          className="p-1.5 rounded-lg bg-red-50 text-[#b50002] hover:bg-red-100 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer count */}
            <div className="px-5 py-3 border-t border-slate-50 flex items-center justify-between">
              <p className="text-[11px] text-slate-400 font-semibold">
                Showing{" "}
                <span className="text-[#171717] font-black">
                  {sortedLogs.length}
                </span>{" "}
                {sortedLogs.length === 1 ? "entry" : "entries"}
              </p>
              <button
                onClick={loadLogs}
                className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-[#b50002] transition-colors"
              >
                <FaSync className="text-[10px]" /> Refresh
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MotorcycleLocationLog;
