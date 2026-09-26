import React, { useEffect, useState, useCallback, useMemo } from "react";
import ReactDOM from "react-dom/client";
import axios from "axios";
import API_BASE_URL from "../apiBase";
import {
  FaSearch,
  FaTimes,
  FaEnvelope,
  FaUser,
  FaPhone,
  FaReply,
  FaClock,
  FaChevronLeft,
  FaChevronRight,
  FaInbox,
  FaCheckCircle,
  FaPaperPlane,
  FaSort,
  FaChevronUp,
  FaChevronDown,
} from "react-icons/fa";
import { AlertTriangle, CheckCircle2, Mail, MessageSquare } from "lucide-react";
import { ADMIN_TOKEN_STORAGE_KEY } from "../constants/adminAuth";
import ReportActionButtons from "./ReportActionButtons";
import { printReport, downloadCSV } from "../utils/reportUtils";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { Accept: "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const ITEMS_PER_PAGE = 10;

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatDateTime = (s) => {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d)) return "—";
  return d.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const nextSortState = (cur) =>
  cur === null ? "asc" : cur === "asc" ? "desc" : null;

// ── Modals ────────────────────────────────────────────────────────────────────
const AlertModal = ({ message, onClose, isError }) => (
  <div
    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
    onClick={onClose}
  >
    <div
      className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-100"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="text-center">
        <div
          className={`mx-auto w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${isError ? "bg-red-50" : "bg-emerald-50"}`}
        >
          {isError ? (
            <AlertTriangle className="w-6 h-6 text-[#b50002]" />
          ) : (
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          )}
        </div>
        <h3 className="text-lg font-black text-[#171717] mb-2">
          {isError ? "Error" : "Success"}
        </h3>
        <p className="text-slate-500 text-sm mb-6">{message}</p>
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-[#171717] text-white font-bold text-sm hover:brightness-110 transition-all"
        >
          OK
        </button>
      </div>
    </div>
  </div>
);

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

const MIN_REPLY_WORDS = 10;
const countWords = (str) => str.trim().split(/\s+/).filter(Boolean).length;

// ── Reply Drawer ──────────────────────────────────────────────────────────────
const ReplyDrawer = ({ message: msg, onClose, onReplySent }) => {
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyError, setReplyError] = useState("");

  const handleSend = async () => {
    const wordCount = countWords(replyText);
    if (!replyText.trim()) {
      setReplyError("Please enter a reply message.");
      return;
    }
    if (wordCount < MIN_REPLY_WORDS) {
      setReplyError(
        `Please enter at least ${MIN_REPLY_WORDS} words (currently ${wordCount}).`,
      );
      return;
    }
    setReplyError("");
    setSending(true);
    try {
      await api.patch(`/api/contact-messages/${msg._id}/reply`, {
        replyMessage: replyText.trim(),
      });
      onReplySent(msg._id, replyText.trim());
      setReplyText("");
      await alertModal(
        "Reply sent successfully! The customer will receive it via email.",
      );
      onClose();
    } catch (err) {
      await alertModal(
        err?.response?.data?.message || "Failed to send reply.",
        { isError: true },
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#f7f8fa] max-h-[90vh] overflow-y-auto shadow-2xl rounded-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between shadow-sm rounded-t-2xl">
          <div>
            <p className="text-[10px] font-bold tracking-[0.15em] text-[#b50002] uppercase mb-0.5">
              Contact Message
            </p>
            <h2 className="font-black text-[#171717] text-lg leading-tight">
              {msg.name || "Anonymous"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{msg.email}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close drawer"
            className="p-2 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <FaTimes />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Customer info */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
            <p className="text-[10px] font-black tracking-[0.15em] text-slate-500 uppercase">
              Customer Info
            </p>
            <div className="flex items-center gap-3">
              <FaUser className="text-[#b50002] text-sm flex-shrink-0" />
              <span className="text-slate-500 text-xs w-16 font-medium">
                Name
              </span>
              <span className="text-[#171717] text-sm font-semibold">
                {msg.name || "—"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <FaEnvelope className="text-[#b50002] text-sm flex-shrink-0" />
              <span className="text-slate-500 text-xs w-16 font-medium">
                Email
              </span>
              <span className="text-[#171717] text-sm font-semibold break-all">
                {msg.email || "—"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <FaPhone className="text-[#b50002] text-sm flex-shrink-0" />
              <span className="text-slate-500 text-xs w-16 font-medium">
                Phone
              </span>
              <span className="text-[#171717] text-sm font-semibold">
                {msg.phone || "—"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <FaClock className="text-[#b50002] text-sm flex-shrink-0" />
              <span className="text-slate-500 text-xs w-16 font-medium">
                Sent
              </span>
              <span className="text-[#171717] text-sm font-semibold">
                {formatDateTime(msg.createdAt)}
              </span>
            </div>
          </div>

          {/* Original message */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <p className="text-[10px] font-black tracking-[0.15em] text-slate-500 uppercase mb-3">
              Message
            </p>
            <p className="text-[#171717] text-sm leading-relaxed whitespace-pre-wrap">
              {msg.message}
            </p>
          </div>

          {/* Previous reply (if any) */}
          {msg.adminReplyMessage && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
              <p className="text-[10px] font-black tracking-[0.15em] text-emerald-600 uppercase mb-2 flex items-center gap-1.5">
                <FaCheckCircle className="text-emerald-500" /> Previous Reply
                Sent
              </p>
              <p className="text-emerald-800 text-sm leading-relaxed whitespace-pre-wrap">
                {msg.adminReplyMessage}
              </p>
              {msg.adminRepliedAt && (
                <p className="text-emerald-600/70 text-xs mt-2">
                  {formatDateTime(msg.adminRepliedAt)}
                </p>
              )}
            </div>
          )}

          {/* Reply composer */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <p className="text-[10px] font-black tracking-[0.15em] text-slate-500 uppercase mb-3 flex items-center gap-1.5">
              <FaReply className="text-[#b50002]" /> Reply via Email
            </p>
            <p className="text-xs text-slate-500 mb-3">
              Your reply will be sent to{" "}
              <span className="font-semibold text-[#171717]">{msg.email}</span>.
            </p>
            <textarea
              value={replyText}
              onChange={(e) => {
                setReplyText(e.target.value.slice(0, 2000));
                if (replyError) setReplyError("");
              }}
              rows={6}
              placeholder={`Type your reply here…`}
              className={`w-full px-3 py-2.5 rounded-xl border text-[#171717] text-sm placeholder-slate-300 focus:outline-none resize-none mb-2 ${
                replyError
                  ? "border-[#b50002] bg-[#FDF0F0] focus:border-[#b50002]"
                  : "border-slate-200 bg-white focus:border-[#b50002]/30"
              }`}
            />
            {replyError && (
              <p className="text-xs font-semibold text-[#b50002] mb-2">
                {replyError}
              </p>
            )}
            <p className="text-xs text-slate-300 text-right mb-3">
              {countWords(replyText)}/{MIN_REPLY_WORDS} words min ·{" "}
              {replyText.length}/2000 characters
            </p>
            <button
              onClick={handleSend}
              disabled={sending}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#171717] text-white font-bold text-sm rounded-xl shadow-lg shadow-black/20 hover:brightness-110 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              <FaPaperPlane className="text-sm" />
              {sending ? "Sending…" : "Send Reply"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Sort Icon ─────────────────────────────────────────────────────────────────
const SortIcon = ({ state }) => {
  if (state === "asc")
    return (
      <FaChevronUp className="text-[#b50002] text-[10px] ml-1 flex-shrink-0" />
    );
  if (state === "desc")
    return (
      <FaChevronDown className="text-[#b50002] text-[10px] ml-1 flex-shrink-0" />
    );
  return <FaSort className="text-slate-300 text-[10px] ml-1 flex-shrink-0" />;
};

// ── Stat Card ─────────────────────────────────────────────────────────────────
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
    className={`relative text-left bg-white rounded-2xl border shadow-sm p-5 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 w-full
      ${isActive ? "border-[#b50002]/30" : "border-slate-100"}`}
  >
    <div
      className={`absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-10 blur-xl ${accent}`}
    />
    <div className="flex items-start justify-between mb-3">
      <p className="text-[10px] font-bold tracking-[0.15em] text-slate-500 uppercase">
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

// ── Skeleton ──────────────────────────────────────────────────────────────────
const SkeletonRow = () => (
  <tr>
    {[...Array(5)].map((_, i) => (
      <td key={i} className="px-5 py-3.5">
        <div
          className="h-4 bg-slate-100 rounded-lg animate-pulse"
          style={{ width: `${50 + i * 10}%` }}
        />
      </td>
    ))}
  </tr>
);

// ── Pagination ────────────────────────────────────────────────────────────────
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
        aria-label="Previous page"
        className="p-2 rounded-xl border border-slate-100 bg-white text-slate-500 disabled:opacity-30 hover:border-[#b50002]/20 hover:text-[#b50002] transition-all shadow-sm"
      >
        <FaChevronLeft className="text-xs" />
      </button>
      {withEllipsis.map((item, idx) =>
        item === "..." ? (
          <span key={`e-${idx}`} className="px-2 text-slate-500 text-sm">
            …
          </span>
        ) : (
          <button
            key={item}
            onClick={() => onPageChange(item)}
            className={`w-9 h-9 rounded-xl font-bold text-sm transition-all shadow-sm
              ${currentPage === item ? "bg-[#b50002] text-white shadow-[#b50002]/30" : "bg-white border border-slate-100 text-slate-500 hover:border-[#b50002]/20 hover:text-[#b50002]"}`}
          >
            {item}
          </button>
        ),
      )}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Next page"
        className="p-2 rounded-xl border border-slate-100 bg-white text-slate-500 disabled:opacity-30 hover:border-[#b50002]/20 hover:text-[#b50002] transition-all shadow-sm"
      >
        <FaChevronRight className="text-xs" />
      </button>
    </div>
  );
};

// ── Status Badge ──────────────────────────────────────────────────────────────
const ReplyBadge = ({ replied }) =>
  replied ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border bg-emerald-50 text-emerald-800 border-emerald-200">
      <FaCheckCircle className="text-[9px]" /> Replied
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border bg-amber-50 text-amber-800 border-amber-200">
      <FaInbox className="text-[9px]" /> Pending
    </span>
  );

// ── Empty State ───────────────────────────────────────────────────────────────
const EmptyState = ({ onReset }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
      <FaSearch className="text-slate-200 text-3xl" />
    </div>
    <h3 className="font-black text-[#171717] text-lg mb-1">
      No messages found
    </h3>
    <p className="text-slate-500 text-sm mb-4">
      Try adjusting your filters or search term
    </p>
    <button
      onClick={onReset}
      className="px-5 py-2 rounded-xl bg-[#b50002] text-white font-bold text-sm shadow-md shadow-[#b50002]/30 hover:brightness-110 transition-all"
    >
      Clear Filters
    </button>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const AdminContact = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [colSort, setColSort] = useState({ key: "createdAt", dir: "desc" });
  const [drawerMessage, setDrawerMessage] = useState(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await api.get("/api/contact-messages");
      const raw = Array.isArray(res.data)
        ? res.data
        : res.data.data || res.data.messages || [];
      setMessages(raw);
    } catch (err) {
      console.error("Failed to fetch contact messages:", err);
      await alertModal("Failed to load contact messages from server.", {
        isError: true,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, colSort]);

  const counts = useMemo(
    () => ({
      all: messages.length,
      pending: messages.filter((m) => !m.adminReplyMessage).length,
      replied: messages.filter((m) => !!m.adminReplyMessage).length,
    }),
    [messages],
  );

  const handleColSort = (key) =>
    setColSort((prev) => {
      if (prev.key !== key) return { key, dir: "asc" };
      const next = nextSortState(prev.dir);
      return next === null
        ? { key: "createdAt", dir: "desc" }
        : { key, dir: next };
    });

  const filteredMessages = useMemo(() => {
    let list = [...messages];
    if (filterStatus === "pending")
      list = list.filter((m) => !m.adminReplyMessage);
    else if (filterStatus === "replied")
      list = list.filter((m) => !!m.adminReplyMessage);

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (m) =>
          (m.name || "").toLowerCase().includes(q) ||
          (m.email || "").toLowerCase().includes(q) ||
          (m.message || "").toLowerCase().includes(q),
      );
    }

    if (colSort.key && colSort.dir) {
      list.sort((a, b) => {
        let aVal = a[colSort.key],
          bVal = b[colSort.key];
        if (colSort.key === "createdAt") {
          const da = aVal ? new Date(aVal).getTime() : 0;
          const db = bVal ? new Date(bVal).getTime() : 0;
          return colSort.dir === "asc" ? da - db : db - da;
        }
        const cmp = String(aVal ?? "").localeCompare(String(bVal ?? ""));
        return colSort.dir === "asc" ? cmp : -cmp;
      });
    }
    return list;
  }, [messages, searchTerm, filterStatus, colSort]);

  const totalPages = Math.ceil(filteredMessages.length / ITEMS_PER_PAGE);
  const paginated = filteredMessages.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const contactReportColumns = [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "message", label: "Message" },
    { key: "status", label: "Status", value: (m) => (m.adminReplyMessage ? "Replied" : "Pending") },
    { key: "adminReplyMessage", label: "Admin Reply" },
    { key: "createdAt", label: "Received", value: (m) => formatDateTime(m.createdAt) },
  ];

  const handlePrintReport = () => {
    printReport({
      title: "Contact Messages Report",
      subtitle: filterStatus === "all" ? "All messages" : `Status: ${filterStatus}`,
      columns: contactReportColumns,
      rows: filteredMessages,
      emptyMessage: "No messages match the current search or status filter.",
    });
  };

  const handleExportCSV = () => {
    downloadCSV("contact-messages-report", contactReportColumns, filteredMessages);
  };

  const handleReplySent = (msgId, replyText) => {
    setMessages((prev) =>
      prev.map((m) =>
        (m._id || m.id) === msgId
          ? {
              ...m,
              adminReplyMessage: replyText,
              adminRepliedAt: new Date().toISOString(),
            }
          : m,
      ),
    );
    if (drawerMessage && (drawerMessage._id || drawerMessage.id) === msgId) {
      setDrawerMessage((prev) => ({
        ...prev,
        adminReplyMessage: replyText,
        adminRepliedAt: new Date().toISOString(),
      }));
    }
  };

  const cols = [
    { label: "Customer", key: "name", sortable: true },
    { label: "Email", key: "email", sortable: true },
    { label: "Message Preview", key: null, sortable: false },
    { label: "Received", key: "createdAt", sortable: true },
    { label: "Status", key: null, sortable: false },
    { label: "Actions", key: null, sortable: false },
  ];

  const statCards = [
    {
      label: "All Messages",
      value: counts.all,
      sub: "Total inquiries",
      subColor: "text-slate-500",
      icon: Mail,
      accent: "bg-slate-400",
      status: "all",
    },
    {
      label: "Pending Reply",
      value: counts.pending,
      sub: "Awaiting response",
      subColor: "text-amber-700",
      icon: MessageSquare,
      accent: "bg-amber-500",
      status: "pending",
    },
    {
      label: "Replied",
      value: counts.replied,
      sub: "Customers notified",
      subColor: "text-emerald-700",
      icon: CheckCircle2,
      accent: "bg-emerald-500",
      status: "replied",
    },
  ];

  return (
    <main className="min-h-screen bg-[#f7f8fa]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pt-36">
        {/* Header */}
        <div className="mb-7 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight">
              Contact Messages
            </h1>
            <p className="text-slate-700 text-sm mt-1">
              View customer inquiries and send email replies directly from here.
            </p>
          </div>
          <ReportActionButtons onPrint={handlePrintReport} onExport={handleExportCSV} />
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
          {statCards.map((s) => (
            <StatCard
              key={s.label}
              {...s}
              loading={loading}
              isActive={filterStatus === s.status}
              onClick={() => setFilterStatus(s.status)}
            />
          ))}
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-4">
          <div className="relative">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 text-sm" />
            <input
              type="text"
              placeholder="Search by name, email, or message content…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 text-sm text-[#171717] placeholder-slate-300 focus:outline-none focus:border-[#b50002]/30"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
              >
                <FaTimes className="text-sm" />
              </button>
            )}
          </div>
        </div>

        {/* Count */}
        <div className="flex items-center justify-between px-1 mb-4">
          <p className="text-[11px] text-slate-700 font-semibold">
            Showing{" "}
            {filteredMessages.length === 0
              ? 0
              : Math.min(
                  (currentPage - 1) * ITEMS_PER_PAGE + 1,
                  filteredMessages.length,
                )}
            –{Math.min(currentPage * ITEMS_PER_PAGE, filteredMessages.length)}{" "}
            of{" "}
            <span className="text-[#171717] font-black">
              {filteredMessages.length}
            </span>{" "}
            messages
            {searchTerm && " (filtered)"}
          </p>
        </div>

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
        ) : paginated.length === 0 ? (
          <EmptyState onReset={() => setSearchTerm("")} />
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-50">
                    {cols.map((col) => (
                      <th
                        key={col.label}
                        onClick={
                          col.sortable
                            ? () => handleColSort(col.key)
                            : undefined
                        }
                        className={`text-left text-[10px] font-black tracking-[0.15em] text-slate-500 uppercase px-5 py-3 whitespace-nowrap
                          ${col.sortable ? "cursor-pointer hover:text-slate-500 transition-colors select-none" : ""}`}
                      >
                        <span className="inline-flex items-center">
                          {col.label}
                          {col.sortable && (
                            <SortIcon
                              state={
                                colSort.key === col.key ? colSort.dir : null
                              }
                            />
                          )}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginated.map((msg) => (
                    <tr
                      key={msg._id || msg.id}
                      onClick={() => setDrawerMessage(msg)}
                      className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                    >
                      {/* Customer */}
                      <td className="px-5 py-3.5">
                        <p className="font-black text-[13px] text-[#171717] leading-tight">
                          {msg.name || "—"}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {msg.phone || "—"}
                        </p>
                      </td>

                      {/* Email */}
                      <td className="px-5 py-3.5">
                        <p className="text-[13px] text-slate-600 truncate max-w-[180px]">
                          {msg.email || "—"}
                        </p>
                      </td>

                      {/* Message preview */}
                      <td className="px-5 py-3.5">
                        <p className="text-[13px] text-slate-500 truncate max-w-[240px]">
                          {msg.message || "—"}
                        </p>
                      </td>

                      {/* Received */}
                      <td className="px-5 py-3.5">
                        <p className="text-[13px] text-slate-500">
                          {formatDateTime(msg.createdAt)}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5">
                        <ReplyBadge replied={!!msg.adminReplyMessage} />
                      </td>

                      {/* Actions */}
                      <td
                        className="px-5 py-3.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDrawerMessage(msg);
                          }}
                          title="Reply"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#171717] text-white text-xs font-bold hover:brightness-110 transition-all"
                        >
                          <FaReply className="text-[10px]" /> Reply
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Reply Drawer */}
      {drawerMessage && (
        <ReplyDrawer
          message={drawerMessage}
          onClose={() => setDrawerMessage(null)}
          onReplySent={handleReplySent}
        />
      )}
    </main>
  );
};

export default AdminContact;
