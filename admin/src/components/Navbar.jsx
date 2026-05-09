import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { navbarStyles as s } from "../assets/dummyStyles";
import { Link, useLocation, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import {
  BarChart3,
  CalendarCheck,
  ClipboardCheck,
  FileText,
  MessageSquare,
  Menu,
  PlusCircle,
  Store,
  X,
} from "lucide-react";
import { FaMotorcycle, FaSignOutAlt } from "react-icons/fa";
import axios from "axios";
import API_BASE_URL from "../apiBase";

const baseURL = API_BASE_URL;
const api = axios.create({ baseURL, headers: { Accept: "application/json" } });

const navLinks = [
  { path: "/", icon: PlusCircle, label: "Add" },
  { path: "/manage-motorcycles", icon: FaMotorcycle, label: "Manage" },
  { path: "/analytics", icon: BarChart3, label: "Analytics" },
  { path: "/walk-in-rentals", icon: Store, label: "Walk-In" },
  { path: "/return-inspection", icon: ClipboardCheck, label: "Inspection" },
  { path: "/reviews", icon: MessageSquare, label: "Reviews" },
  { path: "/system-log", icon: FileText, label: "Logs" },
  {
    path: "/bookings",
    icon: CalendarCheck,
    label: "Bookings",
    showBadge: true,
  },
];

// ── Pending badge pill ────────────────────────────────────────────────────────
const PendingBadge = ({ count }) => {
  if (!count) return null;
  return (
    <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-[#b50002] text-white text-[10px] font-black leading-none shadow-md shadow-black/40 ring-2 ring-white/10 animate-pulse pointer-events-none">
      {count > 99 ? "99+" : count}
    </span>
  );
};

const Navbar = ({ onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);
  const intervalRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  // ── Fetch pending bookings count ──────────────────────────────────────────
  const fetchPendingCount = useCallback(async () => {
    try {
      const res = await api.get("/api/motorcycle-bookings", {
        params: { limit: 200, includeDeleted: "false" },
      });
      const raw = Array.isArray(res.data)
        ? res.data
        : res.data.data || res.data.bookings || [];
      const count = raw.filter(
        (b) => !b.isDeleted && b.status === "pending_reservation",
      ).length;
      setPendingCount(count);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchPendingCount();
    intervalRef.current = setInterval(fetchPendingCount, 30_000);
    return () => clearInterval(intervalRef.current);
  }, [fetchPendingCount]);

  // Re-fetch immediately whenever the user navigates to any page
  useEffect(() => {
    fetchPendingCount();
  }, [location.pathname, fetchPendingCount]);

  // ── Scroll ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Click outside ─────────────────────────────────────────────────────────
  useEffect(() => {
    const onDocClick = (e) => {
      if (
        isOpen &&
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(e.target) &&
        !buttonRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [isOpen]);

  const handleLogout = useCallback(() => {
    setShowLogoutConfirm(false);
    setIsOpen(false);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    onLogout();
    navigate("/login", { replace: true });
  }, [navigate, onLogout]);

  const confirmLogout = () => {
    setShowLogoutConfirm(true);
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  return (
    <div className={s.navbar(scrolled)}>
      <div className={s.navbarInner}>
        <div className={s.navbarCenter}>
          <div className={s.navbarBackground(scrolled)}>
            <div className={s.contentContainer}>
              {/* Logo */}
              <Link to="/" className={s.logoLink}>
                <div className={s.logoContainer}>
                  <img
                    src={logo}
                    alt="Logo"
                    className={s.logoImage}
                    style={{ objectFit: "contain" }}
                  />
                  <span className={s.logoText}></span>
                </div>
              </Link>

              {/* Desktop nav */}
              <div className={s.desktopNav}>
                <div className={s.navLinksContainer}>
                  {navLinks.map((link, i) => {
                    const Icon = link.icon;
                    return (
                      <React.Fragment key={link.path}>
                        <Link
                          to={link.path}
                          className={`${s.navLink} relative`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{link.label}</span>
                          {link.showBadge && (
                            <PendingBadge count={pendingCount} />
                          )}
                        </Link>
                        {i < navLinks.length - 1 && (
                          <div className={s.navDivider} />
                        )}
                      </React.Fragment>
                    );
                  })}
                  <button
                    type="button"
                    onClick={confirmLogout}
                    className="flex items-center gap-2 cursor-pointer text-[#171717] hover:text-[#b50002] transition-all duration-300 px-3 py-2 rounded-md focus:outline-none focus:ring-1 focus:ring-[#171717]"
                  >
                    <FaSignOutAlt className="text-xl" />
                  </button>
                </div>
              </div>

              {/* Mobile hamburger + badge */}
              <div className={s.mobileMenuButton}>
                <div className="relative">
                  <button
                    ref={buttonRef}
                    onClick={() => setIsOpen((v) => !v)}
                    className={s.menuButton}
                    aria-label="Toggle Menu"
                    aria-expanded={isOpen}
                  >
                    {isOpen ? (
                      <X className="h-5 w-5" />
                    ) : (
                      <Menu className="h-5 w-5" />
                    )}
                  </button>
                  <PendingBadge count={pendingCount} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div ref={menuRef} className={s.mobileMenu}>
          <div className={s.mobileMenuContainer}>
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`${s.mobileNavLink} relative`}
                  onClick={() => setIsOpen(false)}
                >
                  <Icon className="w-5 h-5" />
                  <span>{link.label}</span>
                  {link.showBadge && (
                    <span className="ml-auto min-w-[20px] h-[20px] px-1.5 flex items-center justify-center rounded-full bg-[#b50002] text-white text-[11px] font-black leading-none shadow-md shadow-black/30">
                      {pendingCount > 99 ? "99+" : pendingCount}
                    </span>
                  )}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                confirmLogout();
              }}
              className={`${s.mobileNavLink} text-[#b50002]`}
            >
              <FaSignOutAlt className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}

      {showLogoutConfirm &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100000] flex items-center justify-center p-4"
            onClick={cancelLogout}
          >
            <div
              className="bg-[#f4f3f3] rounded-3xl shadow-2xl max-w-md w-full p-6 border border-[#171717]/10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16">
                  <FaSignOutAlt className="h-8 w-8 text-[#b50002]" />
                </div>
                <h3 className="text-xl font-bold text-[#171717] mb-2">
                  Confirm Logout
                </h3>
                <p className="text-[#171717] mb-6 text-sm">
                  Are you sure you want to logout? You will need to login again
                  to access admin.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={cancelLogout}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#b50002] text-white font-bold text-sm rounded-xl
                      shadow-lg shadow-[#b50002]/30 hover:brightness-110 hover:scale-[1.01] active:scale-[0.98] transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#171717] text-white font-bold text-sm rounded-xl
                      shadow-lg shadow-[#171717]/30 hover:brightness-110 hover:scale-[1.01] active:scale-[0.98] transition-all duration-200"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default Navbar;
