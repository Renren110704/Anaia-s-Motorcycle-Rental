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
} from "react-icons/fa";

const BASE = API_BASE_URL;
const STORAGE_KEY = "motorcycleLocationLogV1";

const api = axios.create({
  baseURL: BASE,
  headers: { Accept: "application/json" },
});

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
  if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }

  return "No location data available";
};

const getLocationLogPriority = (log) => {
  const source = String(log?.source || "").trim().toLowerCase();
  if (source === "traccar live" || source === "live gps") return 1;
  if (source === "gps snapshot" || source === "booking gps") return 2;
  if (source === "booking destination") return 3;
  return 4;
};

const getEntryLookupKey = (log) => {
  return String(log?.unitId || log?.id || log?.bookingId || log?.motorcycleId || "").trim();
};

const getPreferredLog = (current, candidate) => {
  if (!current) return candidate;
  if (!candidate) return current;

  const currentPriority = getLocationLogPriority(current);
  const candidatePriority = getLocationLogPriority(candidate);
  if (candidatePriority !== currentPriority) {
    return candidatePriority < currentPriority ? candidate : current;
  }

  const currentTime = parseDate(current.lastUpdatedAt)?.getTime() || 0;
  const candidateTime = parseDate(candidate.lastUpdatedAt)?.getTime() || 0;
  return candidateTime >= currentTime ? candidate : current;
};

const isProtectedLiveTrackerLog = (log) => {
  const source = String(log?.source || "").toLowerCase();
  return source === "traccar live";
};

const ConfirmModal = ({ message, onConfirm, onCancel }) => (
  <div
    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
    onClick={onCancel}
  >
    <div
      className="bg-[#f4f3f3] rounded-3xl shadow-2xl max-w-md w-full p-6 border border-[#171717]/10"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16">
          <FaExclamationTriangle className="h-8 w-8 text-[#b50002]" />
        </div>
        <h3 className="text-xl font-bold text-[#171717] mb-2">Confirm Delete</h3>
        <p className="text-[#171717] mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#b50002] text-white font-bold text-sm rounded-xl shadow-lg shadow-[#b50002]/30 hover:brightness-110 hover:scale-[1.01] active:scale-[0.98] transition-all duration-200"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#171717] text-white font-bold text-sm rounded-xl shadow-lg shadow-[#171717]/30 hover:brightness-110 hover:scale-[1.01] active:scale-[0.98] transition-all duration-200"
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  </div>
);

const confirmModal = (message) =>
  new Promise((resolve) => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);
    const cleanup = (result) => {
      root.unmount();
      document.body.removeChild(container);
      resolve(result);
    };

    root.render(
      <ConfirmModal
        message={message}
        onConfirm={() => cleanup(true)}
        onCancel={() => cleanup(false)}
      />,
    );
  });

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
    const timer = setInterval(() => {
      loadLogs();
    }, 10000);
    return () => clearInterval(timer);
  }, [loadLogs]);

  const filteredLogs = useMemo(() => {
    const bestLogByUnit = new Map();

    logs.forEach((log) => {
      const key = getEntryLookupKey(log);
      if (!key) return;
      const current = bestLogByUnit.get(key);
      bestLogByUnit.set(key, getPreferredLog(current, log));
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

  return (
    <div className="min-h-screen pt-32 bg-[#e3e3e3] text-[#171717] py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-4 rounded-3xl bg-gradient-to-br from-[#171717] via-[#212121] to-[#b50002] p-4 sm:p-5 border border-white/10 mt-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] font-black text-[#b9b9b9]/80 mb-1">
              Fallback Tracking
            </p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white">
              Motorcycle Location Log
            </h1>
            <p className="text-xs sm:text-sm text-[#b9b9b9]/80 mt-1.5 max-w-2xl">
              Last known location snapshots per unit. Use this if live GPS is unavailable or the
              tracker is destroyed.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/manage-motorcycles"
              className="flex items-center justify-center gap-2 py-2.5 px-4 bg-[#b9b9b9] text-[#171717] font-bold text-sm rounded-xl shadow-lg shadow-black/20 hover:bg-[#a8a8a8] transition-all"
            >
              <FaArrowLeft /> Back
            </Link>
            <Link
              to="/motorcycle-tracking"
              className="flex items-center justify-center gap-2 py-2.5 px-4 bg-[#171717] text-white font-bold text-sm rounded-xl shadow-lg shadow-black/30 hover:brightness-110 transition-all"
            >
              <FaMapMarkedAlt /> View Locations
            </Link>
            <button
              onClick={loadLogs}
              className="flex items-center justify-center gap-2 py-2.5 px-4 bg-[#171717] text-white font-bold text-sm rounded-xl shadow-lg shadow-black/30 hover:brightness-110 transition-all"
            >
              <FaSync /> Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="mb-5 flex items-center gap-2 text-sm bg-[#b9b9b9] rounded-xl px-4 py-3 shadow-lg shadow-black/20">
        <FaExclamationTriangle className="text-[#b50002]" />
        Entries show the newest known location per unit and when that location was last updated.
      </div>

      {loading ? (
        <div className="bg-[#b9b9b9] rounded-2xl p-10 text-center shadow-lg shadow-black/20 font-semibold">
          Loading location log...
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-300 text-red-800 rounded-2xl p-6 shadow-lg shadow-red-200/30">
          {error}
        </div>
      ) : sortedLogs.length === 0 ? (
        <div className="bg-[#b9b9b9] rounded-2xl p-10 text-center shadow-lg shadow-black/20">
          <FaMotorcycle className="mx-auto text-4xl text-[#171717]/30 mb-3" />
          <p className="font-bold text-[#171717]">No location history yet</p>
          <p className="text-sm text-[#171717]/60 mt-1">
            Start GPS tracking or refresh this page after active booking updates.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden shadow-lg shadow-black/20">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse">
              <thead>
                <tr className="bg-[#171717]">
                  <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#b9b9b9]">
                    Unit
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#b9b9b9]">
                    Motorcycle
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#b9b9b9]">
                    Last Known Location
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#b9b9b9]">
                    Last Updated
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#b9b9b9]">
                    Source
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#b9b9b9]">
                    Booking
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#b9b9b9]">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedLogs.map((log, idx) => (
                  <tr
                    key={`${log.id}-${idx}`}
                    className={`${idx % 2 === 0 ? "bg-[#b9b9b9]" : "bg-[#c4c4c4]"} border-b border-[#171717]/10`}
                  >
                    <td className="px-4 py-4 text-sm font-bold text-[#171717]">
                      {log.unitId || "—"}
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm font-bold text-[#171717]">{log.motorcycleName}</p>
                      <p className="text-xs text-[#171717]/60 mt-1">{log.customer || "No rider info"}</p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-start gap-2 text-sm text-[#171717]">
                        <FaMapMarkerAlt className="text-[#b50002] mt-0.5" />
                        <span>{buildLocationText(log)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 text-sm text-[#171717]">
                        <FaClock className="text-[#b50002]" />
                        <span>{formatTimestamp(log.lastUpdatedAt)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-[#171717]">{log.source || "—"}</td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                          log.status === "active"
                            ? "bg-green-900/30 text-green-800 border border-green-800/30"
                            : log.status === "completed"
                              ? "bg-blue-900/30 text-blue-800 border border-blue-800/30"
                              : "bg-[#171717]/10 text-[#171717] border border-[#171717]/20"
                        }`}
                      >
                        {log.status || "unknown"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {isProtectedLiveTrackerLog(log) ? (
                        <span className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#171717]/20 text-[#171717]/60 text-xs font-bold border border-[#171717]/20">
                          Protected
                        </span>
                      ) : (
                        <button
                          onClick={() => deleteLogEntry(log)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-800 text-white text-xs font-bold hover:bg-red-700 transition-colors shadow-lg shadow-black/20"
                          title="Delete location log entry"
                        >
                          <FaTrash /> Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default MotorcycleLocationLog;
