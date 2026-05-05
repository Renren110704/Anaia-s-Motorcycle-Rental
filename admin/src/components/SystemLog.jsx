import React, { useCallback, useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import axios from "axios";
import API_BASE_URL from "../apiBase";
import {
  FaCheckCircle,
  FaChevronLeft,
  FaChevronRight,
  FaExclamationTriangle,
  FaSearch,
  FaSyncAlt,
  FaUser,
  FaUserCog,
  FaServer,
  FaRegClock,
  FaTrash,
} from "react-icons/fa";

const baseURL = API_BASE_URL;
const api = axios.create({ baseURL, headers: { Accept: "application/json" } });

const PAGE_SIZE = 10;

const ModalShell = ({ onBackdropClick, children }) => (
  <div
    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
    onClick={onBackdropClick}
  >
    <div
      className="bg-[#f4f3f3] rounded-3xl shadow-2xl max-w-md w-full p-6 border border-[#171717]/10"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  </div>
);

const ConfirmModal = ({ message, onConfirm, onCancel }) => (
  <ModalShell onBackdropClick={onCancel}>
    <div className="text-center">
      <div className="mx-auto flex items-center justify-center h-16 w-16">
        <FaExclamationTriangle className="h-8 w-8 text-[#b50002]" />
      </div>
      <h3 className="text-xl font-bold text-[#171717] mb-2">Confirm Action</h3>
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
          Yes, Clear
        </button>
      </div>
    </div>
  </ModalShell>
);

const AlertModal = ({ message, onClose, isError }) => (
  <ModalShell onBackdropClick={onClose}>
    <div className="text-center">
      <div className="mx-auto flex items-center justify-center h-16 w-16">
        {isError ? (
          <FaExclamationTriangle className="h-8 w-8 text-[#b50002]" />
        ) : (
          <FaCheckCircle className="h-8 w-8 text-green-500" />
        )}
      </div>
      <h3 className="text-xl font-bold text-[#171717] mb-2">
        {isError ? "Error" : "Notice"}
      </h3>
      <p className="text-[#171717] mb-6">{message}</p>
      <button
        onClick={onClose}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#171717] text-white font-bold text-sm rounded-xl shadow-lg shadow-[#171717]/30 hover:brightness-110 hover:scale-[1.01] active:scale-[0.98] transition-all duration-200"
      >
        OK
      </button>
    </div>
  </ModalShell>
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

const alertModal = (message, { isError = false } = {}) =>
  new Promise((resolve) => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);
    const cleanup = () => {
      root.unmount();
      document.body.removeChild(container);
      resolve();
    };
    root.render(
      <AlertModal message={message} isError={isError} onClose={cleanup} />,
    );
  });

const formatActionLabel = (value) => {
  if (!value) return "-";
  return String(value)
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const actorBadge = (actorType) => {
  if (actorType === "admin") {
    return {
      icon: FaUserCog,
      className: "bg-blue-900/30 text-blue-800 border border-blue-800/30",
      label: "Admin",
    };
  }
  if (actorType === "user") {
    return {
      icon: FaUser,
      className: "bg-green-900/30 text-green-800 border border-green-800/30",
      label: "User",
    };
  }
  return {
    icon: FaServer,
    className: "bg-gray-900/30 text-gray-800 border border-gray-800/30",
    label: "System",
  };
};

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const pages = [];
  const delta = 2;
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - delta && i <= currentPage + delta)
    ) {
      pages.push(i);
    }
  }

  const withEllipsis = [];
  let prev = null;
  for (const page of pages) {
    if (prev && page - prev > 1) withEllipsis.push("...");
    withEllipsis.push(page);
    prev = page;
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-lg bg-[#b9b9b9] text-[#171717] disabled:opacity-40 hover:bg-[#a0a0a0] transition-colors shadow-lg shadow-black/20"
      >
        <FaChevronLeft />
      </button>
      {withEllipsis.map((item, idx) =>
        item === "..." ? (
          <span key={`e-${idx}`} className="px-2 text-[#171717]">
            ...
          </span>
        ) : (
          <button
            key={item}
            onClick={() => onPageChange(item)}
            className={`w-9 h-9 rounded-lg font-semibold text-sm transition-all shadow-lg shadow-black/20 ${currentPage === item ? "bg-[#b50002] text-white scale-105" : "bg-[#b9b9b9] text-[#171717] hover:bg-[#a0a0a0]"}`}
          >
            {item}
          </button>
        ),
      )}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-lg bg-[#b9b9b9] text-[#171717] disabled:opacity-40 hover:bg-[#a0a0a0] transition-colors shadow-lg shadow-black/20"
      >
        <FaChevronRight />
      </button>
    </div>
  );
};

const SystemLog = () => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [actorType, setActorType] = useState("");
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(false);

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
      console.error("Failed to fetch system logs:", err);
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
      await alertModal("System logs cleared successfully.");
    } catch (err) {
      console.error("Failed to clear system logs:", err);
      await alertModal("Failed to clear logs. Please try again.", {
        isError: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#e3e3e3] pt-40 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#b50002]">
            System Log
          </h1>
          <p className="text-[#171717]/70 mt-2 text-sm sm:text-base">
            Track admin and user actions with exact date and time.
          </p>
        </div>

        <div className="bg-[#b9b9b9] rounded-2xl shadow-lg shadow-black/20 p-4 sm:p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="relative md:col-span-2">
              <FaSearch className="absolute left-3 top-3.5 text-[#171717]/50" />
              <input
                value={search}
                onChange={(e) => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
                placeholder="Search summary, action, target..."
                className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-[#c7c5c5] text-[#171717] focus:outline-none focus:ring-1 focus:ring-[#171717]"
              />
            </div>

            <select
              value={actorType}
              onChange={(e) => {
                setPage(1);
                setActorType(e.target.value);
              }}
              className="w-full px-3 py-2.5 rounded-lg bg-[#c7c5c5] text-[#171717] focus:outline-none focus:ring-1 focus:ring-[#171717]"
            >
              <option value="">All</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
              <option value="system">System</option>
              <option value="unknown">Unknown</option>
            </select>

            <div className="flex gap-2 md:col-span-2 min-w-0">
              <select
                value={action}
                onChange={(e) => {
                  setPage(1);
                  setAction(e.target.value);
                }}
                className="flex-1 min-w-0 px-3 py-2.5 rounded-lg bg-[#c7c5c5] text-[#171717] focus:outline-none focus:ring-1 focus:ring-[#171717]"
              >
                <option value="">All actions</option>
                {actionOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {formatActionLabel(opt)}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={fetchLogs}
                className="px-3 rounded-lg bg-[#171717] text-white hover:brightness-110 transition-all shrink-0"
                title="Refresh"
              >
                <FaSyncAlt className={loading ? "animate-spin" : ""} />
              </button>

              <button
                type="button"
                onClick={handleClearLogs}
                className="px-3 rounded-lg bg-[#b50002] text-white hover:brightness-110 transition-all shrink-0"
                title="Clear logs"
                disabled={loading || total === 0}
              >
                <FaTrash />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-[#b9b9b9] rounded-2xl shadow-lg shadow-black/20 overflow-hidden">
          <div className="px-4 sm:px-5 py-3 border-b border-[#171717]/15 flex items-center justify-between">
            <p className="text-sm font-semibold text-[#171717]">{total} total logs</p>
            <p className="text-xs text-[#171717]/70">Page {page} of {pages}</p>
          </div>

          {logs.length === 0 ? (
            <div className="p-10 text-center text-[#171717]/70">
              {loading ? "Loading logs..." : "No logs found."}
            </div>
          ) : (
            <div className="divide-y divide-[#171717]/10">
              {logs.map((log) => {
                const badge = actorBadge(log.actorType);
                const ActorIcon = badge.icon;
                return (
                  <div key={log._id} className="p-3 sm:p-4 bg-[#b9b9b9] hover:bg-[#adadad] transition-colors">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${badge.className}`}>
                        <ActorIcon className="text-[11px]" /> {badge.label}
                      </span>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#171717]/10 text-[#171717] border border-[#171717]/15">
                        {formatActionLabel(log.action)}
                      </span>
                    </div>

                    <p className="text-[#171717] font-semibold text-sm leading-snug">
                      {log.summary}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-[#171717]/80">
                      <span>Target: {log.targetType}{log.targetId ? ` (${log.targetId})` : ""}</span>
                      <span className="inline-flex items-center gap-1">
                        <FaRegClock /> {formatDateTime(log.createdAt)}
                      </span>
                      {(log.actorName || log.actorEmail) && (
                        <span>By: {log.actorName || "Unknown"}{log.actorEmail ? ` (${log.actorEmail})` : ""}</span>
                      )}
                    </div>
                  </div>
                );
              })}
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
    </div>
  );
};

export default SystemLog;
