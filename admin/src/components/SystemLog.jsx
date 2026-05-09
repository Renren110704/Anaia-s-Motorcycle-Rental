import React, { useCallback, useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import axios from "axios";
import API_BASE_URL from "../apiBase";
import {
  FaChevronLeft,
  FaChevronRight,
  FaSearch,
  FaSyncAlt,
  FaUser,
  FaUserCog,
  FaServer,
  FaRegClock,
  FaTrash,
  FaTimes,
  FaFilter,
  FaChevronDown,
} from "react-icons/fa";
import {
  AlertTriangle,
  Activity,
  ShieldCheck,
  MonitorDot,
  User,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast, ToastContainer } from "react-toastify";

const baseURL = API_BASE_URL;
const api = axios.create({ baseURL, headers: { Accept: "application/json" } });

const PAGE_SIZE = 10;

// ── Shared style tokens ────────────────────────────────────────────────────
const labelCls =
  "block text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase mb-1.5";
const fieldCls =
  "w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[#171717] text-sm placeholder-slate-300 focus:outline-none focus:border-[#b50002]/30";

// ── Helpers ────────────────────────────────────────────────────────────────
const formatActionLabel = (value) => {
  if (!value) return "—";
  return String(value)
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const ACTOR_CONFIG = {
  admin: {
    icon: FaUserCog,
    cls: "bg-blue-50 text-blue-600 border-blue-200",
    label: "Admin",
    accent: "bg-blue-500",
    subColor: "text-blue-500",
  },
  user: {
    icon: FaUser,
    cls: "bg-emerald-50 text-emerald-600 border-emerald-200",
    label: "User",
    accent: "bg-emerald-500",
    subColor: "text-emerald-500",
  },
  system: {
    icon: FaServer,
    cls: "bg-slate-50 text-slate-500 border-slate-200",
    label: "System",
    accent: "bg-slate-400",
    subColor: "text-slate-400",
  },
  unknown: {
    icon: FaServer,
    cls: "bg-slate-50 text-slate-400 border-slate-200",
    label: "Unknown",
    accent: "bg-slate-300",
    subColor: "text-slate-300",
  },
};

const getActor = (type) => ACTOR_CONFIG[type] || ACTOR_CONFIG.unknown;

// ── Confirm Modal ──────────────────────────────────────────────────────────
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
          Clear All Logs?
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
            Yes, Clear
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

// ── Stat Card ──────────────────────────────────────────────────────────────
const StatCard = ({
  label,
  value,
  sub,
  subColor,
  icon: Icon,
  accent,
  onClick,
  isActive,
  loading,
}) => (
  <button
    onClick={onClick}
    className={`relative text-left bg-white rounded-2xl border shadow-sm p-5 overflow-hidden group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 w-full
      ${isActive ? "border-[#b50002]/30" : "border-slate-100"}`}
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
        <Icon className={`w-4 h-4 ${accent.replace("bg-", "text-")}`} />
      </div>
    </div>
    <p className="text-[2.2rem] font-black text-[#171717] leading-none mb-2">
      {loading ? (
        <span className="inline-block w-10 h-7 bg-slate-100 rounded-lg animate-pulse" />
      ) : (
        value
      )}
    </p>
    <p className={`text-[11px] font-semibold ${subColor}`}>{sub}</p>
  </button>
);

// ── Actor badge ────────────────────────────────────────────────────────────
const ActorBadge = ({ actorType }) => {
  const cfg = getActor(actorType);
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${cfg.cls}`}
    >
      <Icon className="text-[9px]" /> {cfg.label}
    </span>
  );
};

// ── Action badge ───────────────────────────────────────────────────────────
const ActionBadge = ({ action }) => (
  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border bg-slate-50 text-slate-500 border-slate-200">
    {formatActionLabel(action)}
  </span>
);

// ── Skeleton row ───────────────────────────────────────────────────────────
const SkeletonRow = () => (
  <div className="px-5 py-4 border-b border-slate-50">
    <div className="flex items-center gap-2 mb-2">
      <div className="h-5 w-14 bg-slate-100 rounded-full animate-pulse" />
      <div className="h-5 w-24 bg-slate-100 rounded-full animate-pulse" />
    </div>
    <div className="h-4 bg-slate-100 rounded-lg animate-pulse w-3/4 mb-1.5" />
    <div className="h-3 bg-slate-100 rounded-lg animate-pulse w-1/2" />
  </div>
);

// ── Pagination ─────────────────────────────────────────────────────────────
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - 2 && i <= currentPage + 2)
    )
      pages.push(i);
  }
  const withEllipsis = [];
  let prev = null;
  for (const p of pages) {
    if (prev && p - prev > 1) withEllipsis.push("...");
    withEllipsis.push(p);
    prev = p;
  }
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-xl border border-slate-100 bg-white text-slate-400 disabled:opacity-30 hover:border-[#b50002]/20 hover:text-[#b50002] transition-all shadow-sm"
      >
        <FaChevronLeft className="text-xs" />
      </button>
      {withEllipsis.map((item, idx) =>
        item === "..." ? (
          <span key={`e-${idx}`} className="px-2 text-slate-400 text-sm">
            …
          </span>
        ) : (
          <button
            key={item}
            onClick={() => onPageChange(item)}
            className={`w-9 h-9 rounded-xl font-bold text-sm transition-all shadow-sm
              ${
                currentPage === item
                  ? "bg-[#b50002] text-white shadow-[#b50002]/30"
                  : "bg-white border border-slate-100 text-slate-500 hover:border-[#b50002]/20 hover:text-[#b50002]"
              }`}
          >
            {item}
          </button>
        ),
      )}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-xl border border-slate-100 bg-white text-slate-400 disabled:opacity-30 hover:border-[#b50002]/20 hover:text-[#b50002] transition-all shadow-sm"
      >
        <FaChevronRight className="text-xs" />
      </button>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────
const SystemLog = () => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [actorType, setActorType] = useState("");
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/system-logs", {
        params: {
          page,
          limit: PAGE_SIZE,
          search: search || undefined,
          actorType: actorType || undefined,
          action: action || undefined,
        },
      });
      setLogs(res.data?.data || []);
      setTotal(res.data?.total || 0);
      setPages(res.data?.pages || 1);
    } catch (err) {
      toast.error("Failed to fetch system logs");
      setLogs([]);
      setTotal(0);
      setPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, search, actorType, action]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const actionOptions = useMemo(() => {
    const set = new Set(logs.map((log) => log.action).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [logs]);

  // Counts by actor type from current page (indicative)
  const counts = useMemo(() => {
    const result = { admin: 0, user: 0, system: 0 };
    logs.forEach((l) => {
      if (l.actorType === "admin") result.admin += 1;
      else if (l.actorType === "user") result.user += 1;
      else result.system += 1;
    });
    return result;
  }, [logs]);

  const hasFilters = search || actorType || action;

  const clearFilters = () => {
    setSearch("");
    setActorType("");
    setAction("");
    setPage(1);
  };

  const handleClearLogs = async () => {
    const confirmed = await confirmModal(
      "Clear all system logs? This cannot be undone.",
    );
    if (!confirmed) return;
    setLoading(true);
    try {
      await api.delete("/api/system-logs");
      setPage(1);
      setSearch("");
      setActorType("");
      setAction("");
      setLogs([]);
      setTotal(0);
      setPages(1);
      toast.success("System logs cleared successfully");
    } catch (err) {
      toast.error("Failed to clear logs. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      label: "Total Logs",
      value: total,
      sub: `Page ${page} of ${pages}`,
      subColor: "text-slate-500",
      icon: Activity,
      accent: "bg-slate-500",
      filter: "",
    },
    {
      label: "Admin",
      value: counts.admin,
      sub: "Admin actions",
      subColor: "text-blue-500",
      icon: ShieldCheck,
      accent: "bg-blue-500",
      filter: "admin",
    },
    {
      label: "User",
      value: counts.user,
      sub: "User actions",
      subColor: "text-emerald-500",
      icon: User,
      accent: "bg-emerald-500",
      filter: "user",
    },
    {
      label: "System",
      value: counts.system,
      sub: "Automated events",
      subColor: "text-slate-400",
      icon: MonitorDot,
      accent: "bg-slate-400",
      filter: "system",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pt-36">
        {/* Header */}
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight">
              System Log
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Track admin and user actions with exact date and time.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <button
              type="button"
              onClick={fetchLogs}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-500 text-sm font-bold hover:border-[#b50002]/20 hover:text-[#b50002] transition-all shadow-sm disabled:opacity-60"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
            <button
              type="button"
              onClick={handleClearLogs}
              disabled={loading || total === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#b50002] text-white text-sm font-bold shadow-md shadow-[#b50002]/30 hover:brightness-110 transition-all disabled:opacity-60"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Logs
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {statCards.map((s) => (
            <StatCard
              key={s.label}
              label={s.label}
              value={s.value}
              sub={s.sub}
              subColor={s.subColor}
              icon={s.icon}
              accent={s.accent}
              loading={loading}
              isActive={actorType === s.filter && s.filter !== ""}
              onClick={() => {
                if (s.filter === "") return;
                setActorType((prev) => (prev === s.filter ? "" : s.filter));
                setPage(1);
              }}
            />
          ))}
        </div>

        {/* Search + filters toolbar */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 text-sm" />
              <input
                value={search}
                onChange={(e) => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
                placeholder="Search summary, action, target..."
                className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 text-sm text-[#171717] placeholder-slate-300 focus:outline-none focus:border-[#b50002]/30"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                >
                  <FaTimes className="text-sm" />
                </button>
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border font-bold text-xs transition-all
                  ${
                    showFilters
                      ? "bg-[#b50002] border-[#b50002] text-white shadow-md shadow-[#b50002]/30"
                      : "border-slate-200 text-slate-500 hover:border-[#b50002]/20 hover:text-[#b50002]"
                  }`}
              >
                <FaFilter className="text-[10px]" /> Filters
                {hasFilters && (
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                )}
              </button>
              <button
                type="button"
                onClick={fetchLogs}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 text-slate-500 font-bold text-xs hover:border-[#b50002]/20 hover:text-[#b50002] transition-all disabled:opacity-60"
              >
                <FaSyncAlt
                  className={`text-[10px] ${loading ? "animate-spin" : ""}`}
                />
              </button>
              <button
                type="button"
                onClick={handleClearLogs}
                disabled={loading || total === 0}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-red-200 bg-red-50 text-[#b50002] font-bold text-xs hover:bg-red-100 transition-all sm:hidden disabled:opacity-60"
              >
                <FaTrash className="text-[10px]" />
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-slate-50 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Actor Type</label>
                <div className="relative">
                  <select
                    value={actorType}
                    onChange={(e) => {
                      setPage(1);
                      setActorType(e.target.value);
                    }}
                    className="w-full appearance-none px-3 py-2 rounded-xl border border-slate-200 bg-white text-[#171717] text-sm focus:outline-none focus:border-[#b50002]/30 pr-8"
                  >
                    <option value="">All Actors</option>
                    <option value="admin">Admin</option>
                    <option value="user">User</option>
                    <option value="system">System</option>
                    <option value="unknown">Unknown</option>
                  </select>
                  <FaChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 text-[9px] pointer-events-none" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Action</label>
                <div className="relative">
                  <select
                    value={action}
                    onChange={(e) => {
                      setPage(1);
                      setAction(e.target.value);
                    }}
                    className="w-full appearance-none px-3 py-2 rounded-xl border border-slate-200 bg-white text-[#171717] text-sm focus:outline-none focus:border-[#b50002]/30 pr-8"
                  >
                    <option value="">All Actions</option>
                    {actionOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {formatActionLabel(opt)}
                      </option>
                    ))}
                  </select>
                  <FaChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 text-[9px] pointer-events-none" />
                </div>
              </div>
              {hasFilters && (
                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-50 text-[#b50002] font-bold text-xs hover:bg-red-100 transition-colors"
                  >
                    <FaTimes /> Clear All
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Result count */}
        <div className="flex items-center px-1 mb-4">
          <p className="text-[11px] text-slate-400 font-semibold">
            <span className="text-[#171717] font-black">{total}</span> total log
            entries
            {actorType && (
              <span>
                {" "}
                · filtered by{" "}
                <span className="capitalize text-[#171717] font-black">
                  {actorType}
                </span>
              </span>
            )}
          </p>
        </div>

        {/* Logs table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Table header */}
          <div className="border-b border-slate-50 px-5 py-3 hidden sm:grid grid-cols-[1fr_2fr_1fr] gap-4">
            <p className="text-[10px] font-black tracking-[0.15em] text-slate-300 uppercase">
              Actor / Action
            </p>
            <p className="text-[10px] font-black tracking-[0.15em] text-slate-300 uppercase">
              Summary
            </p>
            <p className="text-[10px] font-black tracking-[0.15em] text-slate-300 uppercase">
              Time / Target
            </p>
          </div>

          {loading ? (
            <div className="divide-y divide-slate-50">
              {[...Array(6)].map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Activity className="text-slate-200 w-7 h-7" />
              </div>
              <h3 className="font-black text-[#171717] text-sm mb-1">
                No logs found
              </h3>
              <p className="text-slate-400 text-xs">
                {hasFilters
                  ? "Try adjusting your filters"
                  : "The system log is empty"}
              </p>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-4 px-5 py-2 rounded-xl bg-[#b50002] text-white font-bold text-sm shadow-md shadow-[#b50002]/30 hover:brightness-110 transition-all"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {logs.map((log) => (
                <div
                  key={log._id}
                  className="px-5 py-4 hover:bg-slate-50/60 transition-colors sm:grid sm:grid-cols-[1fr_2fr_1fr] sm:gap-4 sm:items-start"
                >
                  {/* Actor + Action */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-2 sm:mb-0 sm:flex-col sm:items-start sm:gap-2">
                    <ActorBadge actorType={log.actorType} />
                    <ActionBadge action={log.action} />
                    {(log.actorName || log.actorEmail) && (
                      <p className="text-[10px] text-slate-400 font-medium truncate max-w-full">
                        {log.actorName || "Unknown"}
                        {log.actorEmail ? ` · ${log.actorEmail}` : ""}
                      </p>
                    )}
                  </div>

                  {/* Summary */}
                  <div>
                    <p className="font-bold text-[13px] text-[#171717] leading-snug">
                      {log.summary}
                    </p>
                  </div>

                  {/* Time + Target */}
                  <div className="mt-2 sm:mt-0 space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <FaRegClock className="text-[#b50002] text-[9px] flex-shrink-0" />
                      <span>{formatDateTime(log.createdAt)}</span>
                    </div>
                    {log.targetType && (
                      <p className="text-[11px] text-slate-400">
                        <span className="font-semibold text-slate-500">
                          {log.targetType}
                        </span>
                        {log.targetId ? (
                          <span className="text-slate-300">
                            {" "}
                            · {log.targetId}
                          </span>
                        ) : null}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Pagination
          currentPage={page}
          totalPages={pages}
          onPageChange={(nextPage) => {
            if (nextPage < 1 || nextPage > pages) return;
            setPage(nextPage);
          }}
        />
      </div>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        theme="light"
        icon={false}
      />
    </div>
  );
};

export default SystemLog;
