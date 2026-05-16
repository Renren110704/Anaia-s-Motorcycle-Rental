import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import {
  BarChart3,
  CalendarCheck,
  ChevronLeft,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Store,
  Menu,
  X,
  LogOut,
  TagIcon,
  Wrench,
  User,
  QrCode,
} from "lucide-react";
import { FaMotorcycle } from "react-icons/fa";
import axios from "axios";
import API_BASE_URL from "../apiBase";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { Accept: "application/json" },
});

const navLinks = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/manage-motorcycles", icon: FaMotorcycle, label: "Manage Fleet" },
  { path: "/analytics", icon: BarChart3, label: "Analytics" },
  { path: "/walk-in-rentals", icon: Store, label: "Walk-In" },
  { path: "/return-inspection", icon: ClipboardCheck, label: "Inspection" },
  {
    path: "/reviews",
    icon: MessageSquare,
    label: "Reviews",
    showBadge: true,
    badgeKey: "reviews",
  },
  { path: "/system-log", icon: FileText, label: "System Logs" },
  {
    path: "/bookings",
    icon: CalendarCheck,
    label: "Bookings",
    showBadge: true,
    badgeKey: "bookings",
  },
  { path: "/discounts", icon: TagIcon, label: "Discounts" },
  { path: "/maintenance", icon: Wrench, label: "Maintenance" },
  { path: "/contact", icon: MessageSquare, label: "Contact" },
  { path: "/users", icon: User, label: "Users" },
  { path: "/qr-changer", icon: QrCode, label: "QR Changer" },
];

const PendingBadge = ({ count, floating }) =>
  count ? (
    <span
      className={`min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full
        bg-[#b50002] text-white text-[10px] font-black leading-none pointer-events-none
        ${floating ? "absolute -top-1 -right-1 ring-2 ring-white shadow" : "ml-auto"}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  ) : null;

const NavItem = ({ link, active, collapsed, pendingCount, onClick }) => {
  const Icon = link.icon;
  return (
    <Link
      to={link.path}
      onClick={onClick}
      title={collapsed ? link.label : undefined}
      className={`relative flex items-center gap-3 rounded-xl transition-all duration-150 select-none
        ${collapsed ? "justify-center px-0 py-3 mx-2" : "px-3 py-2.5 mx-2"}
        ${
          active
            ? "bg-[#b50002]/10 text-[#b50002] font-bold"
            : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
        }`}
    >
      <Icon
        className={`w-[18px] h-[18px] flex-shrink-0 ${active ? "text-[#b50002]" : ""}`}
      />
      {!collapsed && (
        <span className="text-[13px] font-semibold truncate">{link.label}</span>
      )}
      {link.showBadge && (
        <PendingBadge count={pendingCount} floating={collapsed} />
      )}
    </Link>
  );
};

const LogoutModal = ({ onConfirm, onCancel }) =>
  createPortal(
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200000] flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
          <LogOut className="w-5 h-5 text-[#b50002]" />
        </div>
        <h3 className="text-lg font-black text-[#171717] text-center mb-1">
          Confirm Logout
        </h3>
        <p className="text-sm text-slate-400 text-center mb-6">
          You'll need to sign in again to access the admin panel.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-[#b50002] text-white text-sm font-semibold hover:brightness-110 shadow-md shadow-[#b50002]/30 transition-all"
          >
            Log Out
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );

const SidebarInner = ({
  collapsed,
  setCollapsed,
  pendingCounts,
  onLogout,
  onClose,
  isMobile,
}) => {
  const location = useLocation();
  const [showLogout, setShowLogout] = useState(false);

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div
        className={`flex items-center border-b border-slate-100 h-20
        ${collapsed && !isMobile ? "justify-center px-2" : "px-4"}`}
      >
        <Link to="/" className="flex-1 flex items-center justify-center">
          <img
            src={logo}
            alt="Logo"
            className={`object-contain transition-all duration-300 ${collapsed && !isMobile ? "w-10 h-10" : "w-28 h-14"}`}
          />
        </Link>
        {isMobile && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 ml-auto flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Label */}
      {(!collapsed || isMobile) && (
        <p className="text-[9px] font-semibold tracking-[0.2em] text-slate-400 uppercase px-5 pt-5 pb-2">
          Main Menu
        </p>
      )}
      {collapsed && !isMobile && <div className="pt-4" />}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto space-y-0.5 pb-2">
        {navLinks.map((link) => (
          <NavItem
            key={link.path}
            link={link}
            active={location.pathname === link.path}
            collapsed={collapsed && !isMobile}
            pendingCount={link.badgeKey ? pendingCounts[link.badgeKey] : 0}
            onClick={isMobile ? onClose : undefined}
          />
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-slate-100 py-3 space-y-0.5">
        {!isMobile && (
          <button
            onClick={() => setCollapsed((v) => !v)}
            className={`flex items-center gap-3 rounded-xl transition-all duration-150
              text-slate-400 hover:bg-slate-50 hover:text-slate-700
              ${collapsed ? "justify-center w-10 h-10 mx-auto" : "w-[calc(100%-16px)] mx-2 px-3 py-2.5"}`}
          >
            <ChevronLeft
              className={`w-[18px] h-[18px] flex-shrink-0 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
            />
            {!collapsed && (
              <span className="text-[13px] font-semibold">Collapse</span>
            )}
          </button>
        )}
        <button
          onClick={() => setShowLogout(true)}
          className={`flex items-center gap-3 rounded-xl transition-all duration-150
            text-slate-400 hover:bg-red-50 hover:text-[#b50002]
            ${collapsed && !isMobile ? "justify-center w-10 h-10 mx-auto" : "w-[calc(100%-16px)] mx-2 px-3 py-2.5"}`}
        >
          <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
          {(!collapsed || isMobile) && (
            <span className="text-[13px] font-semibold">Log Out</span>
          )}
        </button>
      </div>

      {showLogout && (
        <LogoutModal
          onConfirm={onLogout}
          onCancel={() => setShowLogout(false)}
        />
      )}
    </div>
  );
};

// ─── Public export ────────────────────────────────────────────────────────────
const Sidebar = ({
  onLogout,
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [pendingCounts, setPendingCounts] = useState({
    bookings: 0,
    reviews: 0,
  });
  const intervalRef = useRef(null);

  const fetchPending = useCallback(async () => {
    try {
      // Fetch both endpoints concurrently
      const [resBookings, resReviews] = await Promise.all([
        api.get("/api/motorcycle-bookings", {
          params: { limit: 200, includeDeleted: "false" },
        }),
        api.get("/api/reviews", {
          params: { limit: 200 },
        }),
      ]);

      // Calculate bookings
      const rawBookings = Array.isArray(resBookings.data)
        ? resBookings.data
        : resBookings.data.data || resBookings.data.bookings || [];
      const pendingBookings = rawBookings.filter(
        (b) => !b.isDeleted && b.status === "pending_reservation",
      ).length;

      // Calculate reviews (status === "pending" or missing status)
      const rawReviews = Array.isArray(resReviews.data)
        ? resReviews.data
        : resReviews.data.reviews || [];
      const pendingReviews = rawReviews.filter(
        (r) => r.status === "pending" || !r.status,
      ).length;

      setPendingCounts({
        bookings: pendingBookings,
        reviews: pendingReviews,
      });
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    fetchPending();
    intervalRef.current = setInterval(fetchPending, 30_000);
    return () => clearInterval(intervalRef.current);
  }, [fetchPending]);

  useEffect(() => {
    fetchPending();
  }, [location.pathname, fetchPending]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    onLogout();
    navigate("/login", { replace: true });
  }, [navigate, onLogout]);

  const totalPending = pendingCounts.bookings + pendingCounts.reviews;

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col fixed top-0 left-0 h-screen z-40
        bg-white border-r border-slate-100 shadow-sm transition-all duration-300 ease-in-out
        ${collapsed ? "w-[72px]" : "w-[230px]"}`}
      >
        <SidebarInner
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          pendingCounts={pendingCounts}
          onLogout={handleLogout}
          isMobile={false}
        />
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-white border-b border-slate-100 flex items-center px-4 gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 text-slate-600 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <img src={logo} alt="Logo" className="h-8 w-auto object-contain" />
        {totalPending > 0 && (
          <span className="ml-auto min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-[#b50002] text-white text-[10px] font-black animate-pulse">
            {totalPending > 99 ? "99+" : totalPending}
          </span>
        )}
      </header>

      {/* Mobile drawer */}
      {mobileOpen &&
        createPortal(
          <>
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998]"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="fixed top-0 left-0 h-screen w-[260px] z-[9999] bg-white shadow-2xl">
              <SidebarInner
                collapsed={false}
                setCollapsed={setCollapsed}
                pendingCounts={pendingCounts}
                onLogout={handleLogout}
                isMobile={true}
                onClose={() => setMobileOpen(false)}
              />
            </aside>
          </>,
          document.body,
        )}
    </>
  );
};

export default Sidebar;
