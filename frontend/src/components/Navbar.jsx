import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  FaBars,
  FaTimes,
  FaUser,
  FaSignOutAlt,
  FaBell,
  FaHeart,
} from "react-icons/fa";
import logo from "../assets/logo.png";
import axios from "axios";
import API_BASE_URL from "../apiBase";
import {
  getFavoritesCount,
  refreshFavorites,
  FAVORITES_CHANGED_EVENT,
} from "../utils/favorites";

const LOGOUT_ENDPOINT = "/api/auth/logout";
const ME_ENDPOINT = "/api/auth/me";
// const MY_BOOKINGS_ENDPOINT = "/api/motorcycle-bookings/mybooking";
const NOTIFICATIONS_ENDPOINT = "/api/notifications";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/motorcycles", label: "Vehicles" },
  { to: "/contact", label: "Contact" },
  { to: "/bookings", label: "Bookings" },
];

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { Accept: "application/json" },
});

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => !!localStorage.getItem("token"),
  );
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [scrolled, setScrolled] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  // const [reuploadBadgeCount, setReuploadBadgeCount] = useState(0);

  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  // Favorites State
  const [favoritesCount, setFavoritesCount] = useState(0);

  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef(null);
  const buttonRef = useRef(null);
  const userMenuRef = useRef(null);
  const notifMenuRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Keep the Favorites badge count in sync — both across tabs (native
  // "storage" event) and within the same tab (custom event dispatched
  // whenever a heart icon is toggled anywhere in the app).
  useEffect(() => {
    const syncFavorites = () => setFavoritesCount(getFavoritesCount());
    syncFavorites();
    window.addEventListener("storage", syncFavorites);
    window.addEventListener(FAVORITES_CHANGED_EVENT, syncFavorites);
    return () => {
      window.removeEventListener("storage", syncFavorites);
      window.removeEventListener(FAVORITES_CHANGED_EVENT, syncFavorites);
    };
  }, []);

  const validateToken = useCallback(async (signal) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setIsLoggedIn(false);
      setUser(null);
      return;
    }
    try {
      const res = await api.get(ME_ENDPOINT, {
        signal,
        headers: { Authorization: `Bearer ${token}` },
      });
      const profile = res?.data?.user ?? res?.data ?? null;
      setIsLoggedIn(true);
      setUser(profile);
      if (profile) {
        try {
          localStorage.setItem("user", JSON.stringify(profile));
        } catch {}
        refreshFavorites();
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setIsLoggedIn(false);
        setUser(null);
      }
    }
  }, []);

  useEffect(() => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    validateToken(ctrl.signal);
    return () => {
      ctrl.abort();
      abortRef.current = null;
    };
  }, [validateToken]);

  useEffect(() => {
    const onChange = (ev) => {
      if (ev.key === "token" || ev.key === "user") {
        abortRef.current?.abort();
        const ctrl = new AbortController();
        abortRef.current = ctrl;
        validateToken(ctrl.signal);
      }
    };
    window.addEventListener("storage", onChange);
    return () => window.removeEventListener("storage", onChange);
  }, [validateToken]);

  const handleLogout = useCallback(async () => {
    setShowLogoutConfirm(false);
    setShowUserMenu(false);
    setShowNotifications(false);
    const token = localStorage.getItem("token");
    if (token) {
      try {
        await api.post(
          LOGOUT_ENDPOINT,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 2000,
          },
        );
      } catch {}
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsLoggedIn(false);
    setUser(null);
    setIsOpen(false);

    refreshFavorites(); // no token now -> clears the favorites cache/badge

    navigate("/", { replace: true });
  }, [navigate]);

  useEffect(() => {
    setIsOpen(false);
    setShowUserMenu(false);
    setShowNotifications(false);
    setShowLogoutConfirm(false);
    setIsLoggedIn(!!localStorage.getItem("token"));
    try {
      const raw = localStorage.getItem("user");
      setUser(raw ? JSON.parse(raw) : null);
    } catch {
      setUser(null);
    }
  }, [location]);

  // Handle clicking outside of menus/dropdowns
  useEffect(() => {
    const handler = (e) => {
      if (
        isOpen &&
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(e.target) &&
        !buttonRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
      if (
        showUserMenu &&
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target)
      ) {
        setShowUserMenu(false);
      }
      if (
        showNotifications &&
        notifMenuRef.current &&
        !notifMenuRef.current.contains(e.target)
      ) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, showUserMenu, showNotifications]);

  // Handle escape key
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") {
        if (isOpen) setIsOpen(false);
        if (showUserMenu) setShowUserMenu(false);
        if (showLogoutConfirm) setShowLogoutConfirm(false);
        if (showNotifications) setShowNotifications(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, showUserMenu, showLogoutConfirm, showNotifications]);

  useEffect(() => {
    const handler = () => {
      if (window.innerWidth >= 1024) setIsOpen(false);
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // Fetch Booking Data (for the re-upload badge) and Notifications
  const fetchUserData = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      // setReuploadBadgeCount(0);
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    // 1. Re-upload badge count is still derived from the bookings list.
    // try {
    //   const res = await api.get(MY_BOOKINGS_ENDPOINT, {
    //     headers: { Authorization: `Bearer ${token}` },
    //     timeout: 8000,
    //   });
    //   const raw = Array.isArray(res.data)
    //     ? res.data
    //     : res.data?.data || res.data?.bookings || [];
    //
    //   const uploadCount = raw.filter(
    //     (b) =>
    //       !b?.isDeleted &&
    //       (b?.requiresProofReupload || b?.paymentStatus === "rejected"),
    //   ).length;
    //   setReuploadBadgeCount(uploadCount);
    // } catch {
    //   setReuploadBadgeCount(0);
    // }

    // 2. Notifications are now persisted server-side (see
    // notificationService.js + /api/notifications) instead of being
    // re-derived from bookings and filtered through localStorage on every
    // load. This means read/unread + cleared state is the same no matter
    // which browser, tab, or device you're on.
    try {
      const res = await api.get(NOTIFICATIONS_ENDPOINT, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 8000,
      });
      const list = res.data?.data || [];
      const normalized = list.map((n) => ({
        id: n._id,
        bookingId: n.booking,
        title: n.title,
        message: n.message,
        date: n.createdAt,
        step: n.step,
        read: n.read,
      }));
      setNotifications(normalized);
      setUnreadCount(normalized.filter((n) => !n.read).length);
    } catch (err) {
      console.error("[Notifications] fetch error:", err.message);
      setNotifications([]);
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData, location.pathname]);

  const handleMarkAllRead = async () => {
    // Optimistic UI update, then persist so it's consistent everywhere.
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      await api.patch(
        `${NOTIFICATIONS_ENDPOINT}/read-all`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
    } catch (err) {
      console.error("[Notifications] markAllRead error:", err.message);
    }
  };

  const handleClearAll = async () => {
    setNotifications([]);
    setUnreadCount(0);
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      await api.delete(NOTIFICATIONS_ENDPOINT, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error("[Notifications] clearAll error:", err.message);
    }
  };

  const isActive = (path) =>
    path === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(path);

  return (
    <>
      <style>{`

        .nav-root {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          transition: background 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
          font-family: 'Space Grotesk', sans-serif;
        }

        /* Transparent over the light hero */
        .nav-root.top {
          background: rgba(250,250,248,0.0);
        }
        .nav-root.scrolled {
          background: rgba(255,255,255,0.96);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          border-bottom: 1px solid rgba(0,0,0,0.07);
          box-shadow: 0 1px 16px rgba(0,0,0,0.06);
        }

        /* ── Inner bar ── */
        .nav-inner {
          max-width: 1280px; margin: 0 auto;
          padding: 0 32px;
          height: 68px;
          display: flex; align-items: center; justify-content: space-between;
        }

        /* ── Logo ── */
        .nav-logo img { height: 50px; width: auto; display: block; object-fit: contain; }

        /* ── Desktop links ── */
        .nav-links {
          display: flex; align-items: center; gap: 2px;
        }
        @media(max-width:900px){ .nav-links { display: none; } }

        .nav-link {
          position: relative;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 13px; font-weight: 600; letter-spacing: 0.2px;
          padding: 7px 15px; border-radius: 9px;
          text-decoration: none;
          transition: color 0.18s, background 0.18s;
          color: rgba(17,17,17,0.52);
        }
        .nav-link:hover { color: #111; background: rgba(0,0,0,0.05); }
        .nav-link.active {
          color: #b50002;
          background: rgba(181,0,2,0.07);
        }

        /* Transparent state — links stay dark since hero is light */
        .nav-root.top .nav-link { color: rgba(17,17,17,0.52); }
        .nav-root.top .nav-link:hover { color: #111; background: rgba(0,0,0,0.05); }
        .nav-root.top .nav-link.active { color: #b50002; background: rgba(181,0,2,0.07); }

        /* ── Badge ── */
        .nav-badge {
          position: absolute; top: -3px; right: 1px;
          min-width: 16px; height: 16px; padding: 0 3px;
          background: #b50002; color: #fff;
          border-radius: 999px; font-size: 9px; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Syne', sans-serif; line-height: 1;
          box-shadow: 0 2px 6px rgba(181,0,2,0.35);
        }

        /* ── Right Cluster (Groups Bell, User Menu, and Hamburger) ── */
        .nav-right-cluster {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        /* ── Notification Bell Container ── */
        .nav-bell-container {
          position: relative;
        }
        .nav-icon-btn {
          background: transparent;
          border: none;
          color: rgba(17,17,17,0.6);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          border-radius: 50%;
          transition: background 0.18s, color 0.18s;
          position: relative;
        }
        .nav-icon-btn:hover {
          background: rgba(0,0,0,0.05);
          color: #111;
        }
        .nav-root.top .nav-icon-btn {
          color: rgba(17,17,17,0.6);
        }
        .nav-root.top .nav-icon-btn:hover {
          color: #111;
          background: rgba(255,255,255,0.4);
        }

        /* ── Notifications Dropdown Panel ── */
        .notifications-dropdown {
          position: absolute;
          top: calc(100% + 12px);
          right: -20px;
          width: 340px;
          background: #fff;
          border-radius: 16px;
          border: 1px solid rgba(0,0,0,0.08);
          box-shadow: 0 8px 32px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.06);
          z-index: 150;
          animation: dropIn 0.15s ease;
          display: flex;
          flex-direction: column;
        }
        @media (max-width: 600px) {
          .notifications-dropdown {
            position: fixed;
            top: 76px;
            left: 16px;
            right: 16px;
            width: auto;
          }
        }
        .notif-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px;
          border-bottom: 1px solid rgba(0,0,0,0.06);
        }
        .notif-title {
          font-weight: 800;
          font-size: 14px;
          color: #111;
          font-family: 'Space Grotesk', sans-serif;
        }
        .notif-mark-read {
          background: none;
          border: none;
          color: #b50002;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          font-family: 'Space Grotesk', sans-serif;
          transition: color 0.2s;
        }
        .notif-mark-read:hover {
          text-decoration: underline;
          color: #a00001;
        }
        .notif-body {
          max-height: 380px;
          overflow-y: auto;
        }
        .notif-item {
          padding: 14px 18px;
          border-bottom: 1px solid rgba(0,0,0,0.04);
          transition: background 0.2s;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .notif-item:last-child {
          border-bottom: none;
        }
        .notif-item.unread {
          background: rgba(181,0,2,0.03);
        }
        .notif-item:hover {
          background: rgba(0,0,0,0.02);
        }
        .notif-item-title {
          font-size: 13px;
          font-weight: 700;
          color: #111;
        }
        .notif-item-msg {
          font-size: 12px;
          color: rgba(17,17,17,0.65);
          line-height: 1.45;
        }
        .notif-item-time {
          font-size: 10px;
          color: rgba(17,17,17,0.4);
          font-weight: 600;
        }
        .notif-empty {
          padding: 40px 20px;
          text-align: center;
          color: rgba(17,17,17,0.5);
          font-size: 13px;
          font-weight: 500;
        }

        /* ── User actions ── */
        .nav-actions { display: flex; align-items: center; gap: 8px; }
        @media(max-width:900px){ .nav-actions { display: none; } }

        .nav-profile-btn {
          display: flex; align-items: center; gap: 7px;
          padding: 8px 15px; border-radius: 10px; border: 1px solid rgba(0,0,0,0.1);
          cursor: pointer; background: #fff;
          font-family: 'Syne', sans-serif; font-size: 12px; font-weight: 700;
          letter-spacing: 0.2px; color: #111;
          transition: all 0.18s;
        }
        .nav-profile-btn:hover { border-color: rgba(0,0,0,0.2); background: #FAFAFA; }

        .nav-login-btn {
          display: flex; align-items: center; gap: 7px;
          padding: 8px 16px; border-radius: 10px;
          cursor: pointer; background: #b50002; border: 1.5px solid #b50002;
          font-family: 'Syne', sans-serif; font-size: 12px; font-weight: 700;
          letter-spacing: 0.2px; color: #fff;
          text-decoration: none;
          transition: all 0.18s;
        }
        .nav-login-btn:hover { background: #a00001; border-color: #a00001; }

        /* Top state: profile btn gets subtle border */
        .nav-root.top .nav-profile-btn {
          background: rgba(255,255,255,0.9);
        }
        .nav-root.top .nav-login-btn {
          background: #b50002;
        }

        /* ── Dropdown ── */
        .user-dropdown {
          position: absolute; top: calc(100% + 12px); right: 0;
          min-width: 175px;
          background: #fff; border-radius: 14px;
          border: 1px solid rgba(0,0,0,0.08);
          box-shadow: 0 8px 32px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.06);
          overflow: hidden; z-index: 50;
          animation: dropIn 0.15s ease;
        }
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .dropdown-item {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 15px;
          font-size: 13px; font-weight: 500; color: #111;
          text-decoration: none; background: transparent; border: none;
          width: 100%; cursor: pointer;
          transition: background 0.12s, color 0.12s;
          font-family: 'Space Grotesk', sans-serif;
        }
        .dropdown-item:hover { background: rgba(181,0,2,0.05); color: #b50002; }
        .dropdown-sep { height: 1px; background: rgba(0,0,0,0.06); margin: 3px 0; }

        /* ── Hamburger ── */
        .nav-hamburger {
          display: none; align-items: center; justify-content: center;
          width: 40px; height: 40px; border-radius: 10px; border: 1px solid rgba(0,0,0,0.1);
          cursor: pointer; background: rgba(255,255,255,0.9); color: #111;
          transition: all 0.18s;
        }
        .nav-hamburger:hover { background: #fff; border-color: rgba(0,0,0,0.18); }
        @media(max-width:900px){ .nav-hamburger { display: flex; } }

        /* ── Mobile drawer ── */
        .mobile-drawer {
          position: fixed; top: 68px; left: 0; right: 0; z-index: 99;
          background: rgba(255,255,255,0.98);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(0,0,0,0.07);
          overflow: hidden;
          transition: max-height 0.32s cubic-bezier(.4,0,.2,1), opacity 0.22s ease;
          box-shadow: 0 8px 24px rgba(0,0,0,0.06);
        }
        .mobile-drawer.open { max-height: 480px; opacity: 1; }
        .mobile-drawer.closed { max-height: 0; opacity: 0; pointer-events: none; }

        .mobile-drawer-inner { padding: 14px 20px 22px; display: flex; flex-direction: column; gap: 4px; }

        .mobile-link {
          display: flex; align-items: center; padding: 11px 14px;
          border-radius: 11px; font-family: 'Syne', sans-serif;
          font-size: 14px; font-weight: 600; text-decoration: none;
          color: rgba(17,17,17,0.55); position: relative;
          transition: all 0.18s;
        }
        .mobile-link:hover { background: rgba(0,0,0,0.04); color: #111; }
        .mobile-link.active { background: rgba(181,0,2,0.07); color: #b50002; }
        .mobile-divider { height: 1px; background: rgba(0,0,0,0.07); margin: 6px 0; }

        .mobile-auth {
          display: flex; align-items: center; gap: 10px;
          padding: 11px 14px; border-radius: 11px;
          font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 600;
          background: transparent; border: none; cursor: pointer; width: 100%;
          color: rgba(17,17,17,0.55); text-decoration: none; transition: all 0.18s;
        }
        .mobile-auth:hover { background: rgba(0,0,0,0.04); color: #111; }
        .mobile-auth.danger:hover { background: rgba(181,0,2,0.07); color: #b50002; }

        /* ── Logout modal ── */
        .logout-overlay {
          position: fixed; inset: 0;
          background: rgba(17,17,17,0.45);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 200;
          display: flex; align-items: center; justify-content: center; padding: 24px;
          animation: fadeIn 0.18s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .logout-card {
          background: #fff; border-radius: 22px;
          padding: 32px 28px; max-width: 380px; width: 100%;
          border: 1px solid rgba(0,0,0,0.06);
          box-shadow: 0 20px 64px rgba(0,0,0,0.14), 0 4px 16px rgba(0,0,0,0.06);
          animation: slideUp 0.2s ease;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .logout-icon {
          width: 56px; height: 56px; border-radius: 50%;
          background: rgba(181,0,2,0.07);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 16px;
        }
        .logout-title {
          font-family: 'Syne', sans-serif; font-size: 19px; font-weight: 800;
          text-align: center; color: #111; margin-bottom: 8px;
        }
        .logout-sub {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 13.5px; color: rgba(17,17,17,0.46);
          text-align: center; line-height: 1.65; margin-bottom: 24px;
        }
        .logout-actions { display: flex; gap: 10px; }
        .logout-cancel {
          flex: 1; padding: 12px; border-radius: 11px;
          border: 1px solid rgba(0,0,0,0.1); cursor: pointer;
          background: #FAFAFA; color: #111;
          font-family: 'Space Grotesk', sans-serif; font-size: 13px; font-weight: 700;
          transition: background 0.18s;
        }
        .logout-cancel:hover { background: #f0f0f0; }
        .logout-confirm {
          flex: 1; padding: 12px; border-radius: 11px; border: none; cursor: pointer;
          background: #b50002; color: #fff;
          font-family: 'Space Grotesk', sans-serif; font-size: 13px; font-weight: 700;
          transition: background 0.18s;
          box-shadow: 0 4px 14px rgba(181,0,2,0.28);
        }
        .logout-confirm:hover { background: #a00001; }
      `}</style>

      <nav
        className={`nav-root ${scrolled ? "scrolled" : "top"}`}
        aria-label="Main navigation"
      >
        <div className="nav-inner">
          {/* Logo */}
          <Link to="/" className="nav-logo">
            <img src={logo} alt="ANAIA'S Motorcycle Rental" />
          </Link>

          {/* Desktop links */}
          <div className="nav-links">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`nav-link ${isActive(link.to) ? "active" : ""}`}
              >
                {link.label}
                {/* {link.to === "/bookings" && reuploadBadgeCount > 0 && (
                  <span className="nav-badge">
                    {reuploadBadgeCount > 99 ? "99+" : reuploadBadgeCount}
                  </span>
                )} */}
              </Link>
            ))}
          </div>

          {/* Right Layout Cluster (Bell, Actions, Hamburger) */}
          <div className="nav-right-cluster">
            {/* Favorites */}
            <Link
              to="/favorites"
              className="nav-icon-btn"
              aria-label="Favorites"
              style={{ textDecoration: "none" }}
              onClick={() => {
                setShowNotifications(false);
                setShowUserMenu(false);
              }}
            >
              <FaHeart style={{ fontSize: 16 }} />
              {favoritesCount > 0 && (
                <span className="nav-badge">
                  {favoritesCount > 99 ? "99+" : favoritesCount}
                </span>
              )}
            </Link>

            {/* Notification Bell */}
            {isLoggedIn && (
              <div className="nav-bell-container" ref={notifMenuRef}>
                <button
                  onClick={() => {
                    setShowNotifications((p) => !p);
                    if (showUserMenu) setShowUserMenu(false);
                  }}
                  className="nav-icon-btn"
                  aria-label="Notifications"
                >
                  <FaBell style={{ fontSize: 16 }} />
                  {unreadCount > 0 && (
                    <span className="nav-badge">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="notifications-dropdown">
                    <div className="notif-header">
                      <span className="notif-title">Notifications</span>
                      <div style={{ display: "flex", gap: "12px" }}>
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllRead}
                            className="notif-mark-read"
                          >
                            Mark all as read
                          </button>
                        )}
                        {notifications.length > 0 && (
                          <button
                            onClick={handleClearAll}
                            className="notif-mark-read" // Reusing your existing CSS class
                            style={{ color: "rgba(17,17,17,0.5)" }} // Making it look slightly different
                          >
                            Clear all
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="notif-body">
                      {notifications.length === 0 ? (
                        <div className="notif-empty">No notifications</div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            className={`notif-item ${
                              n.read ? "read" : "unread"
                            }`}
                          >
                            <div className="notif-item-title">{n.title}</div>
                            <div className="notif-item-msg">{n.message}</div>
                            <div className="notif-item-time">
                              {n.date
                                ? new Date(n.date).toLocaleString([], {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "Recently"}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Desktop user actions */}
            <div className="nav-actions">
              {isLoggedIn ? (
                <div style={{ position: "relative" }} ref={userMenuRef}>
                  <button
                    onClick={() => {
                      setShowUserMenu((p) => !p);
                      if (showNotifications) setShowNotifications(false);
                    }}
                    className="nav-profile-btn"
                    aria-label="User menu"
                  >
                    {user?.profilePicture ? (
                      <img
                        src={user.profilePicture}
                        alt="Profile"
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <FaUser style={{ fontSize: 12, opacity: 0.6 }} />
                    )}
                    <span>{user?.name?.split(" ")[0] || "Profile"}</span>
                  </button>

                  {showUserMenu && (
                    <div className="user-dropdown">
                      <Link
                        to="/profile"
                        onClick={() => setIsOpen(false)}
                        className="mobile-auth"
                      >
                        {user?.profilePicture ? (
                          <img
                            src={user.profilePicture}
                            alt="Profile"
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: "50%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <FaUser style={{ fontSize: 14 }} />
                        )}
                        My Profile
                      </Link>
                      <div className="dropdown-sep" />
                      <button
                        onClick={() => setShowLogoutConfirm(true)}
                        className="dropdown-item"
                      >
                        <FaSignOutAlt style={{ fontSize: 12, opacity: 0.5 }} />{" "}
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link to="/login" className="nav-login-btn">
                  <FaUser style={{ fontSize: 12 }} />
                  <span>Login</span>
                </Link>
              )}
            </div>

            {/* Hamburger */}
            <button
              ref={buttonRef}
              onClick={() => setIsOpen((p) => !p)}
              className="nav-hamburger"
              aria-expanded={isOpen}
              aria-controls="mobile-menu"
              aria-label={isOpen ? "Close menu" : "Open menu"}
            >
              {isOpen ? <FaTimes size={17} /> : <FaBars size={17} />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        <div
          id="mobile-menu"
          ref={menuRef}
          className={`mobile-drawer ${isOpen ? "open" : "closed"}`}
          aria-hidden={!isOpen}
        >
          <div className="mobile-drawer-inner">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setIsOpen(false)}
                className={`mobile-link ${isActive(link.to) ? "active" : ""}`}
                style={{ position: "relative" }}
              >
                {link.label}
                {/* {link.to === "/bookings" && reuploadBadgeCount > 0 && (
                  <span
                    className="nav-badge"
                    style={{ position: "absolute", top: 8, right: 10 }}
                  >
                    {reuploadBadgeCount > 99 ? "99+" : reuploadBadgeCount}
                  </span>
                )} */}
              </Link>
            ))}

            <Link
              to="/favorites"
              onClick={() => setIsOpen(false)}
              className={`mobile-link ${isActive("/favorites") ? "active" : ""}`}
              style={{ position: "relative" }}
            >
              Favorites
              {favoritesCount > 0 && (
                <span
                  className="nav-badge"
                  style={{ position: "absolute", top: 8, right: 10 }}
                >
                  {favoritesCount > 99 ? "99+" : favoritesCount}
                </span>
              )}
            </Link>

            <div className="mobile-divider" />

            {isLoggedIn ? (
              <>
                <Link
                  to="/profile"
                  onClick={() => setIsOpen(false)}
                  className="mobile-auth"
                >
                  <FaUser style={{ fontSize: 14 }} /> My Profile
                </Link>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setShowLogoutConfirm(true);
                  }}
                  className="mobile-auth danger"
                >
                  <FaSignOutAlt style={{ fontSize: 14 }} /> Logout
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={() => setIsOpen(false)}
                className="mobile-auth"
              >
                <FaUser style={{ fontSize: 14 }} /> Login
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Logout confirm modal */}
      {showLogoutConfirm && (
        <div
          className="logout-overlay"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div className="logout-card" onClick={(e) => e.stopPropagation()}>
            <div className="logout-icon">
              <FaSignOutAlt style={{ fontSize: 20, color: "#b50002" }} />
            </div>
            <div className="logout-title">Confirm Logout</div>
            <p className="logout-sub">
              Are you sure you want to logout? You'll need to sign in again to
              access your account.
            </p>
            <div className="logout-actions">
              <button
                className="logout-cancel"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </button>
              <button className="logout-confirm" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
