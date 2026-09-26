import React, { useEffect, useState, useCallback, useMemo } from "react";
import ReactDOM from "react-dom/client";
import axios from "axios";
import API_BASE_URL from "../apiBase";
import {
  FaCalendarAlt,
  FaChevronDown,
  FaChevronLeft,
  FaChevronRight,
  FaChevronUp,
  FaEnvelope,
  FaMapMarkerAlt,
  FaPhone,
  FaSearch,
  FaSort,
  FaTimes,
  FaUser,
  FaShieldAlt,
  FaTrophy,
} from "react-icons/fa";
import { AlertTriangle, CheckCircle2, Trash2, Users } from "lucide-react";
import { LoyaltyTierBadge } from "../components/DiscountBadge";
import ReportActionButtons from "./ReportActionButtons";
import { printReport, downloadCSV } from "../utils/reportUtils";

const baseURL = API_BASE_URL;
const api = axios.create({ baseURL, headers: { Accept: "application/json" } });

// Add an interceptor to inject the token into every request automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token"); // Replace with your actual token storage method if different
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

const ITEMS_PER_PAGE = 10;

// ── Shared styles ─────────────────────────────────────────────────────────────
// const labelCls =
//   "block text-[10px] font-bold tracking-[0.12em] text-slate-500 uppercase mb-1.5";

// ── Helpers ───────────────────────────────────────────────────────────────────
const nextSortState = (cur) =>
  cur === null ? "asc" : cur === "asc" ? "desc" : null;

const formatDate = (s) => {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d)) return "—";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

const formatDateTime = (s) => {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d)) return "—";
  const date = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  const hour = d.getHours();
  const min = String(d.getMinutes()).padStart(2, "0");
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${date} · ${displayHour}:${min} ${period}`;
};

const makeImageUrl = (filename) => {
  if (!filename) return "";
  const s = String(filename).trim();
  if (!s) return "";
  if (/^data:image\//i.test(s)) return s;
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("/dxta0nmdy/") || s.startsWith("dxta0nmdy/"))
    return `https://res.cloudinary.com/${s.replace(/^\/+/, "")}`;
  const cleanPath = s.replace(/^\/+/, "").replace(/^uploads\//, "");
  return `${API_BASE_URL}/uploads/${cleanPath}`;
};

const buildFullAddress = (address = {}) => {
  const parts = [
    address.barangay,
    address.city,
    address.province,
    address.region,
    address.zipCode,
  ].filter(Boolean);
  return parts.join(", ") || "—";
};

// ── Modals ────────────────────────────────────────────────────────────────────
const ConfirmModal = ({
  message,
  onConfirm,
  onCancel,
  isPermanent,
  confirmLabel,
}) => (
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
          {isPermanent ? "Permanent Action" : "Confirm Action"}
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
            {confirmLabel ?? (isPermanent ? "Delete Forever" : "Confirm")}
          </button>
        </div>
      </div>
    </div>
  </div>
);

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
          {isError ? "Error" : "Notice"}
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

const confirmModal = (message, { isPermanent = false, confirmLabel } = {}) =>
  new Promise((resolve) => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);
    const cleanup = (r) => {
      root.unmount();
      document.body.removeChild(container);
      resolve(r);
    };
    root.render(
      <ConfirmModal
        message={message}
        isPermanent={isPermanent}
        confirmLabel={confirmLabel}
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
    className={`relative text-left bg-white rounded-2xl border shadow-sm p-5 overflow-hidden group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 w-full
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

// ── Skeleton Row ──────────────────────────────────────────────────────────────
const SkeletonRow = () => (
  <tr>
    {[...Array(5)].map((_, i) => (
      <td key={i} className="px-5 py-3.5">
        <div
          className="h-4 bg-slate-100 rounded-lg animate-pulse"
          style={{ width: `${50 + i * 6}%` }}
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

// ── Badges ────────────────────────────────────────────────────────────────────
const VerifiedBadge = ({ isVerified }) => (
  <span
    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
      isVerified
        ? "bg-emerald-50 text-emerald-800 border-emerald-200" // Updated to text-emerald-800
        : "bg-amber-50 text-amber-800 border-amber-200" // Updated to text-amber-800
    }`}
  >
    {isVerified ? "Verified" : "Unverified"}
  </span>
);

// ── Empty State ───────────────────────────────────────────────────────────────
const EmptyState = ({ onReset }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
      <FaSearch className="text-slate-200 text-3xl" />
    </div>
    <h3 className="font-black text-[#171717] text-lg mb-1">No users found</h3>
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

// ── Detail Drawer ─────────────────────────────────────────────────────────────
const DetailDrawer = ({ user, onClose, onDelete }) => {
  const Section = ({ title, children }) => (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-4">
      <div className="px-5 py-3 border-b border-slate-50">
        <h3 className="text-[10px] font-black tracking-[0.15em] text-slate-500 uppercase">
          {title}
        </h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );

  const Row = ({ icon: Icon, label, value, valueClass = "" }) => (
    <div className="flex items-start gap-3 mb-2.5 last:mb-0">
      <Icon className="text-[#b50002] text-sm flex-shrink-0 mt-0.5" />
      <span className="text-slate-500 text-xs w-24 flex-shrink-0 font-medium pt-0.5">
        {label}
      </span>
      <span
        className={`text-[#171717] text-sm font-semibold flex-1 ${valueClass}`}
      >
        {value}
      </span>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#f7f8fa] max-h-[90vh] overflow-y-auto shadow-2xl rounded-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between shadow-sm rounded-t-2xl">
          <div>
            <p className="text-[10px] font-bold tracking-[0.15em] text-[#b50002] uppercase mb-0.5">
              User Profile
            </p>
            <h2 className="font-black text-[#171717] text-lg leading-tight">
              {user.firstName} {user.lastName}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(user.id);
              }}
              className="p-2 rounded-xl bg-red-50 text-[#b50002] hover:bg-red-100 transition-colors"
              title="Delete User"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              aria-label="Close user profile"
              className="p-2 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <FaTimes />
            </button>
          </div>
        </div>

        <div className="p-5">
          <div className="flex flex-col items-center justify-center mb-6 mt-2">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-200 border-4 border-white shadow-sm mb-3">
              {user.profilePicture ? (
                <img
                  src={makeImageUrl(user.profilePicture)}
                  alt={user.firstName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-500 text-3xl font-black">
                  {user.firstName?.charAt(0) || <FaUser />}
                </div>
              )}
            </div>

            {/* --- NEW: Loyalty Badge added next to Verified Badge --- */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <VerifiedBadge isVerified={user.isVerified} />
              {user.loyaltyTier && user.loyaltyTier !== "None" && (
                <div className="scale-90">
                  <LoyaltyTierBadge tier={user.loyaltyTier} />
                </div>
              )}
            </div>
          </div>

          <Section title="Personal Information">
            <Row icon={FaUser} label="First Name" value={user.firstName} />
            {user.middleName && (
              <Row icon={FaUser} label="Middle Name" value={user.middleName} />
            )}
            <Row icon={FaUser} label="Last Name" value={user.lastName} />
            <Row icon={FaEnvelope} label="Email" value={user.email} />
            <Row icon={FaPhone} label="Phone" value={user.phone} />
          </Section>

          <Section title="Address Details">
            <Row
              icon={FaMapMarkerAlt}
              label="Full Address"
              value={buildFullAddress(user.address)}
            />
          </Section>

          {/* --- NEW: Loyalty & Activity Section --- */}
          <Section title="Loyalty & Activity">
            <Row
              icon={FaShieldAlt}
              label="Current Tier"
              value={user.loyaltyTier || "None"}
            />
            <Row
              icon={FaTrophy}
              label="Rentals"
              value={`${user.completedRentalsCount || 0} completed`}
            />
          </Section>

          <Section title="Account Meta">
            <Row
              icon={FaCalendarAlt}
              label="Joined on"
              value={formatDateTime(user.createdAt)}
            />
            <Row
              icon={FaShieldAlt}
              label="ID"
              value={user._id || user.id}
              valueClass="text-xs text-slate-500 font-mono"
            />
          </Section>
        </div>
      </div>
    </div>
  );
};

// ── User Table ─────────────────────────────────────────────────────────────
const UserTable = ({ users, onRowClick, colSort, onColSort, onDelete }) => {
  const cols = [
    { label: "User", key: "firstName", sortable: true },
    { label: "Contact", key: "email", sortable: true },
    { label: "Joined", key: "createdAt", sortable: true },
    { label: "Tier", key: "loyaltyTier", sortable: true },
    { label: "Verified", key: "isVerified", sortable: true },
    { label: "Actions", key: null, sortable: false },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-50">
              {cols.map((col) => (
                <th
                  key={col.label}
                  onClick={col.sortable ? () => onColSort(col.key) : undefined}
                  className={`text-left text-[10px] font-black tracking-[0.15em] text-slate-500 uppercase px-5 py-3 whitespace-nowrap
                    ${col.sortable ? "cursor-pointer hover:text-slate-500 transition-colors select-none" : ""}`}
                >
                  <span className="inline-flex items-center">
                    {col.label}
                    {col.sortable && (
                      <SortIcon
                        state={colSort.key === col.key ? colSort.dir : null}
                      />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {users.map((user) => (
              <tr
                key={user.id}
                onClick={() => onRowClick(user)}
                className="hover:bg-slate-50/60 transition-colors cursor-pointer"
              >
                {/* User Info (Avatar + Name) */}
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0 flex items-center justify-center text-slate-500 font-bold">
                      {user.profilePicture ? (
                        <img
                          src={makeImageUrl(user.profilePicture)}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        user.firstName?.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <p className="font-black text-[13px] text-[#171717] leading-tight">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate max-w-[140px]">
                        {user._id || user.id}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Contact */}
                <td className="px-5 py-3.5">
                  <p className="font-bold text-[13px] text-[#171717]">
                    {user.phone || "—"}
                  </p>
                  <p className="text-[11px] text-slate-500">{user.email}</p>
                </td>

                {/* Joined */}
                <td className="px-5 py-3.5">
                  <p className="text-[13px] text-slate-600">
                    {formatDate(user.createdAt)}
                  </p>
                </td>

                {/* Tier */}
                <td className="px-5 py-3.5">
                  {user.loyaltyTier && user.loyaltyTier !== "None" ? (
                    <div className="scale-[0.85] origin-left">
                      <LoyaltyTierBadge tier={user.loyaltyTier} />
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-500 font-medium">
                      None
                    </span>
                  )}
                </td>

                {/* Verified */}
                <td className="px-5 py-3.5">
                  <VerifiedBadge isVerified={user.isVerified} />
                </td>

                {/* Actions */}
                <td
                  className="px-5 py-3.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(user.id);
                      }}
                      title="Delete User"
                      className="p-1.5 rounded-lg bg-red-50 text-[#b50002] hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const TIER_RANKS = { Platinum: 4, Gold: 3, Silver: 2, None: 1 };

// ── Main Component ────────────────────────────────────────────────────────────
const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [colSort, setColSort] = useState({ key: null, dir: null });
  const [drawerUser, setDrawerUser] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      // Ensure backend provides this GET /api/users endpoint
      const res = await api.get("/api/auth/users");
      const raw = Array.isArray(res.data)
        ? res.data
        : res.data.users || res.data.data || [];

      const mapped = raw.map((u, i) => ({
        id: u._id || `local-${i + 1}`,
        _id: u._id,
        firstName: u.firstName || "",
        middleName: u.middleName || "",
        lastName: u.lastName || "",
        email: u.email || "",
        phone: u.phone || "",
        address: u.address || {},
        isVerified: u.isVerified || false,
        profilePicture: u.profilePicture || "",
        createdAt: u.createdAt || new Date().toISOString(),
        loyaltyTier: u.loyaltyTier || "None",
        completedRentalsCount: u.completedRentalsCount || 0,
      }));
      setUsers(mapped);
    } catch (err) {
      console.error("Failed to fetch users:", err);
      await alertModal("Failed to load users from server.", { isError: true });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedStatus, colSort]);

  const counts = useMemo(
    () => ({
      all: users.length,
      unverified: users.filter((u) => !u.isVerified).length,
    }),
    [users],
  );

  const handleColSort = (key) =>
    setColSort((prev) => {
      if (prev.key !== key) return { key, dir: "asc" };
      const next = nextSortState(prev.dir);
      return next === null ? { key: null, dir: null } : { key, dir: next };
    });

  const filteredUsers = useMemo(() => {
    let list = [...users];

    // Status Filter
    if (selectedStatus === "unverified")
      list = list.filter((u) => !u.isVerified);

    // Search Filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (u) =>
          `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
          (u.email || "").toLowerCase().includes(q) ||
          (u.phone || "").toLowerCase().includes(q),
      );
    }

    // Sort Logic
    if (colSort.key === "loyaltyTier" && colSort.dir) {
      list.sort((a, b) => {
        const rankA = TIER_RANKS[a.loyaltyTier || "None"] || 1;
        const rankB = TIER_RANKS[b.loyaltyTier || "None"] || 1;
        // Ascending: Lowest to Highest (None -> Platinum)
        // Descending: Highest to Lowest (Platinum -> None)
        return colSort.dir === "asc" ? rankA - rankB : rankB - rankA;
      });
    } else if (colSort.key && colSort.dir) {
      list.sort((a, b) => {
        let aVal = a[colSort.key],
          bVal = b[colSort.key];

        if (typeof aVal === "boolean") {
          aVal = aVal ? 1 : 0;
          bVal = bVal ? 1 : 0;
        }

        if (colSort.key.includes("createdAt")) {
          const da = aVal ? new Date(aVal).getTime() : 0;
          const db = bVal ? new Date(bVal).getTime() : 0;
          return colSort.dir === "asc" ? da - db : db - da;
        }

        const cmp = String(aVal ?? "").localeCompare(String(bVal ?? ""));
        return colSort.dir === "asc" ? cmp : -cmp;
      });
    } else {
      list.sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return db - da;
      });
    }
    return list;
  }, [users, searchTerm, selectedStatus, colSort]);

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginated = filteredUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const userReportColumns = [
    { key: "name", label: "Name", value: (u) => `${u.firstName || ""} ${u.lastName || ""}`.trim() },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "isVerified", label: "Verified", value: (u) => (u.isVerified ? "Yes" : "No") },
    { key: "loyaltyTier", label: "Loyalty Tier", value: (u) => u.loyaltyTier || "None" },
    { key: "createdAt", label: "Joined", value: (u) => formatDate(u.createdAt) },
  ];

  const handlePrintReport = () => {
    printReport({
      title: "User Management Report",
      subtitle: selectedStatus === "unverified" ? "Unverified users" : "All users",
      columns: userReportColumns,
      rows: filteredUsers,
      emptyMessage: "No users match the current search or status filter.",
    });
  };

  const handleExportCSV = () => {
    downloadCSV("user-management-report", userReportColumns, filteredUsers);
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleDelete = async (userId) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    const confirmed = await confirmModal(
      `Permanently delete the user account for ${user.firstName}? This cannot be undone.`,
      { isPermanent: true },
    );

    if (!confirmed) return;

    try {
      // Endpoint assumption: DELETE /api/users/:id
      await api.delete(`/api/auth/users/${user._id}`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      if (drawerUser?.id === userId) setDrawerUser(null);
      await alertModal("User deleted successfully.");
    } catch (err) {
      await alertModal(err.response?.data?.message || "Failed to delete user", {
        isError: true,
      });
    }
  };

  const statCards = [
    {
      label: "Total Users",
      value: counts.all,
      sub: "All registered users",
      subColor: "text-blue-700",
      icon: Users,
      accent: "bg-blue-500",
      status: "all",
    },
    {
      label: "Unverified",
      value: counts.unverified,
      sub: "Pending email verification",
      subColor: "text-amber-700",
      icon: AlertTriangle,
      accent: "bg-amber-500",
      status: "unverified",
    },
  ];

  const selectedStatusLabel =
    statCards.find((s) => s.status === selectedStatus)?.label ?? "Users";

  return (
    <main className="min-h-screen bg-[#f7f8fa]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pt-36">
        {/* Header */}
        <div className="mb-7 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight">
              User Management
            </h1>
            <p className="text-slate-700 text-sm mt-1">
              Manage your registered users, monitor verification status, and
              handle account access.
            </p>
          </div>
          <ReportActionButtons onPrint={handlePrintReport} onExport={handleExportCSV} />
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
          {statCards.map((s) => (
            <StatCard
              key={s.label}
              {...s}
              loading={loading}
              isActive={selectedStatus === s.status}
              onClick={() => setSelectedStatus(s.status)}
            />
          ))}
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-4">
          <div className="relative">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 text-sm" />
            <input
              type="text"
              placeholder="Search by name, email, or phone number..."
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

        {/* Result count */}
        <div className="flex items-center justify-between px-1 mb-4">
          <p className="text-[11px] text-slate-700 font-semibold">
            Showing{" "}
            {filteredUsers.length === 0
              ? 0
              : Math.min(
                  (currentPage - 1) * ITEMS_PER_PAGE + 1,
                  filteredUsers.length,
                )}
            –{Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)} of{" "}
            <span className="text-[#171717] font-black">
              {filteredUsers.length}
            </span>{" "}
            <span>{selectedStatusLabel}</span>
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
          <UserTable
            users={paginated}
            onRowClick={setDrawerUser}
            colSort={colSort}
            onColSort={handleColSort}
            onDelete={handleDelete}
          />
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Detail Drawer */}
      {drawerUser && (
        <DetailDrawer
          user={drawerUser}
          onClose={() => setDrawerUser(null)}
          onDelete={handleDelete}
        />
      )}
    </main>
  );
};

export default UserManagement;
