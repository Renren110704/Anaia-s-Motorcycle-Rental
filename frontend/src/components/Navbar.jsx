import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FaBars, FaTimes, FaUser, FaSignOutAlt } from "react-icons/fa";
import logo from "../assets/logo.png";
import { navbarStyles as styles } from "../assets/dummyStyles";
import axios from "axios";
import API_BASE_URL from "../apiBase";

const LOGOUT_ENDPOINT = "/api/auth/logout";
const ME_ENDPOINT = "/api/auth/me";
const MY_BOOKINGS_ENDPOINT = "/api/motorcycle-bookings/mybooking";

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
  const [reuploadBadgeCount, setReuploadBadgeCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef(null);
  const buttonRef = useRef(null);
  const userMenuRef = useRef(null);
  const abortRef = useRef(null);

  const base = API_BASE_URL;
  const api = axios.create({
    baseURL: base,
    headers: { Accept: "application/json" },
  });

  const navLinks = [
    { to: "/", label: "Home" },
    { to: "/motorcycles", label: "Motorcycles" },
    { to: "/calendar", label: "Calendar" },
    { to: "/contact", label: "Contact" },
    { to: "/bookings", label: "Bookings" },
  ];

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const validateToken = useCallback(
    async (signal) => {
      const token = localStorage.getItem("token");
      if (!token) {
        setIsLoggedIn(false);
        setUser(null);
        return;
      }

      try {
        const res = await api.get(ME_ENDPOINT, {
          signal,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const profile = res?.data?.user ?? res?.data ?? null;
        if (profile) {
          setIsLoggedIn(true);
          setUser(profile);
          try {
            localStorage.setItem("user", JSON.stringify(profile));
          } catch {}
        } else {
          setIsLoggedIn(true);
          setUser(null);
        }
      } catch (err) {
        if (
          axios.isAxiosError(err) &&
          err.response &&
          err.response.status === 401
        ) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setIsLoggedIn(false);
          setUser(null);
        } else {
          setUser(null);
        }
      }
    },
    [api],
  );

  useEffect(() => {
    if (abortRef.current) {
      try {
        abortRef.current.abort();
      } catch {}
    }
    const controller = new AbortController();
    abortRef.current = controller;
    validateToken(controller.signal);

    return () => {
      try {
        controller.abort();
      } catch {}
      abortRef.current = null;
    };
  }, [validateToken]);

  useEffect(() => {
    const handleStorageChange = (ev) => {
      if (ev.key === "token" || ev.key === "user") {
        if (abortRef.current) {
          try {
            abortRef.current.abort();
          } catch {}
        }
        const controller = new AbortController();
        abortRef.current = controller;
        validateToken(controller.signal);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [validateToken]);

  const handleLogout = useCallback(async () => {
    setShowLogoutConfirm(false);
    setShowUserMenu(false);

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

    navigate("/", { replace: true });
  }, [api, navigate]);

  const confirmLogout = () => {
    setShowLogoutConfirm(true);
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  useEffect(() => {
    setIsOpen(false);
    setShowUserMenu(false);
    setShowLogoutConfirm(false);
    setIsLoggedIn(!!localStorage.getItem("token"));
    try {
      const raw = localStorage.getItem("user");
      setUser(raw ? JSON.parse(raw) : null);
    } catch {
      setUser(null);
    }
  }, [location]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isOpen &&
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target) &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }

      if (
        showUserMenu &&
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target)
      ) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, showUserMenu]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") {
        if (isOpen) setIsOpen(false);
        if (showUserMenu) setShowUserMenu(false);
        if (showLogoutConfirm) setShowLogoutConfirm(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, showUserMenu, showLogoutConfirm]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setIsOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const fetchReuploadBadgeCount = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setReuploadBadgeCount(0);
      return;
    }

    // Avoid duplicate heavy requests while MyBookings page is already loading
    if (location.pathname.startsWith("/bookings")) return;

    try {
      const res = await api.get(MY_BOOKINGS_ENDPOINT, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 8000,
      });
      const raw = Array.isArray(res.data)
        ? res.data
        : res.data?.data || res.data?.bookings || [];
      const count = raw.filter(
        (b) => !b?.isDeleted && (b?.requiresProofReupload || b?.paymentStatus === "rejected"),
      ).length;
      setReuploadBadgeCount(count);
    } catch {
      setReuploadBadgeCount(0);
    }
  }, [api, location.pathname]);

  useEffect(() => {
    fetchReuploadBadgeCount();
  }, [fetchReuploadBadgeCount, location.pathname]);

  return (
    <nav
      className={`${styles.nav.base} ${
        scrolled ? styles.nav.scrolled : styles.nav.notScrolled
      }`}
      aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center">
          <div
            className={`${styles.floatingNav.base} ${
              scrolled
                ? styles.floatingNav.scrolled
                : styles.floatingNav.notScrolled
            }`}
            role="region"
            aria-roledescription="navigation"
          >
            <div className="flex items-center justify-between gap-4">
              <Link to="/" className="flex items-center">
                <div className={styles.logoContainer}>
                  <img
                    src={logo}
                    alt="RideX logo"
                    className="h-20 w-auto block"
                    style={{ display: "block", objectFit: "contain" }}
                  />
                </div>
              </Link>

              <div className={styles.navLinksContainer}>
                <div className={styles.navLinksInner}>
                  {navLinks.map((link, index) => (
                    <React.Fragment key={link.to}>
                      <Link
                        to={link.to}
                        className={`${styles.navLink.base} ${
                          isActive(link.to)
                            ? styles.navLink.active
                            : styles.navLink.inactive
                        } relative`}
                      >
                        {link.label}
                        {link.to === "/bookings" && reuploadBadgeCount > 0 && (
                          <span className="absolute -top-2 -right-3 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-[#b50002] text-white text-[10px] font-black leading-none shadow-md shadow-black/30">
                            {reuploadBadgeCount > 99 ? "99+" : reuploadBadgeCount}
                          </span>
                        )}
                      </Link>

                      {index < navLinks.length - 1 && (
                        <div className={styles.separator} aria-hidden="true" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              <div className={styles.userActions}>
                {isLoggedIn ? (
                  <div className="relative" ref={userMenuRef}>
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className={styles.authButton}
                      aria-label="User menu"
                      title={user?.name || "User menu"}
                    >
                      <FaUser className="text-base" />
                      <span className={styles.authText}>Profile</span>
                    </button>

                    {showUserMenu && (
                      <div className="absolute right-0 mt-2 w-48 bg-[#b9b9b9] rounded-lg shadow-xl py-2 z-50">
                        <Link
                          to="/profile"
                          onClick={() => setShowUserMenu(false)}
                          className="px-4 py-2 text-sm text-[#171717] hover:text-[#b50002] transition-colors flex items-center"
                        >
                          <FaUser className="mr-3" />
                          My Profile
                        </Link>
                        <div className="my-2"></div>
                        <button
                          onClick={confirmLogout}
                          className="w-full text-left px-4 py-2 text-sm text-[#171717] hover:text-[#b50002] transition-colors flex items-center"
                        >
                          <FaSignOutAlt className="mr-3" />
                          Logout
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    to="/login"
                    className={styles.authButton}
                    aria-label="Login"
                  >
                    <FaUser className="text-base" />
                    <span className={styles.authText}>Login</span>
                  </Link>
                )}
              </div>

              <div className="md:hidden flex items-center">
                <button
                  ref={buttonRef}
                  onClick={() => setIsOpen((p) => !p)}
                  className={styles.mobileMenuButton}
                  aria-expanded={isOpen}
                  aria-controls="mobile-menu"
                  aria-label={isOpen ? "Close menu" : "Open menu"}
                >
                  {isOpen ? (
                    <FaTimes className="h-5 w-5" />
                  ) : (
                    <FaBars className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        id="mobile-menu"
        ref={menuRef}
        className={`${styles.mobileMenu.container} ${
          isOpen ? styles.mobileMenu.open : styles.mobileMenu.closed
        }`}
        aria-hidden={!isOpen}
      >
        <div className={styles.mobileMenuInner}>
          <div className="px-4 pt-3 pb-4 space-y-2">
            <div className={styles.mobileGrid}>
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setIsOpen(false)}
                  className={`${styles.mobileLink.base} ${
                    isActive(link.to)
                      ? styles.mobileLink.active
                      : styles.mobileLink.inactive
                  } relative`}
                >
                  {link.label}
                  {link.to === "/bookings" && reuploadBadgeCount > 0 && (
                    <span className="absolute top-1.5 right-2 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-[#b50002] text-white text-[10px] font-black leading-none shadow-md shadow-black/30">
                      {reuploadBadgeCount > 99 ? "99+" : reuploadBadgeCount}
                    </span>
                  )}
                </Link>
              ))}
            </div>

            <div className={styles.divider} />

            <div className="pt-1">
              {isLoggedIn ? (
                <>
                  <Link
                    to="/profile"
                    onClick={() => setIsOpen(false)}
                    className={styles.mobileAuthButton}
                  >
                    <FaUser className="mr-3 text-base" />
                    My Profile
                  </Link>
                  <button
                    onClick={confirmLogout}
                    className={`${styles.mobileAuthButton} mt-2`}
                  >
                    <FaSignOutAlt className="mr-3 text-base" />
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className={styles.mobileAuthButton}
                >
                  <FaUser className="mr-3 text-base" />
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {showLogoutConfirm && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
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
                Are you sure you want to logout? You'll need to login again to
                access your account.
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
        </div>
      )}
    </nav>
  );
};

export default Navbar;
