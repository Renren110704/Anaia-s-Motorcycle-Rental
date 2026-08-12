import React, { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import { Navigate, Route, Routes } from "react-router-dom";
import ManageMotorcycle from "./components/ManageMotorcycle";
import MotorcycleBooking from "./components/MotorcycleBooking";
import MotorcycleTracking from "./components/MotorcycleTracking";
import MotorcycleLocationLog from "./components/MotorcycleLocationLog";
import AdminAnalytics from "./components/AdminAnalytics";
import WalkInRentals from "./components/WalkInRentals";
import SystemLog from "./components/SystemLog";
import AdminLogin from "./components/AdminLogin";
import AdminForgotPassword from "./components/AdminForgotPassword";
import ReturnInspection from "./components/ReturnInspection";
import ReviewManagement from "./components/ReviewManagement";
import Dashboard from "./components/Dashboard";
import DiscountManagement from "./components/DiscountManagement";
import MaintenancePage from "./components/MaintenancePage";
import CalendarView from "./components/CalendarView";
import AdminContact from "./components/AdminContact";
import UserManagement from "./components/UserManagement";
import QRChanger from "./components/QRChanger";
import AdminLiveChat from "./components/AdminLiveChat";
import { ADMIN_TOKEN_STORAGE_KEY } from "./constants/adminAuth";

// Same API base other parts of the app use to reach the backend.
const API_BASE = process.env.REACT_APP_API_BASE_URL || "";

const ProtectedRoute = ({ isAuthenticated, children }) =>
  isAuthenticated ? children : <Navigate to="/login" replace />;

const App = () => {
  // isAuthenticated is only ever set to true after the backend confirms the
  // token is valid — never just because *something* is sitting in
  // localStorage. checkingAuth guards the brief window on load/refresh
  // while that confirmation is in flight, so we don't flash the login page
  // (or a protected page) before we actually know.
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Sidebar state lifted so content margin stays in sync
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
    if (!token) {
      setCheckingAuth(false);
      return;
    }

    fetch(`${API_BASE}/api/admin/verify`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (data?.success) {
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
        }
      })
      .catch(() => {
        // Token missing, expired, or server unreachable — treat as logged out.
        localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
      })
      .finally(() => setCheckingAuth(false));
  }, []);

  const handleLogin = async (email, password) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (res.ok && data.success && data.token) {
        localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, data.token);
        setIsAuthenticated(true);
        return { ok: true };
      }

      return {
        ok: false,
        message: data.message || "Invalid admin email or password.",
        lockedUntil: data.lockedUntil,
      };
    } catch (err) {
      return {
        ok: false,
        message: "Unable to reach the server. Please try again.",
      };
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsAuthenticated(false);
  };

  // Sidebar offsets (must match Sidebar.jsx widths)
  const desktopOffset = sidebarCollapsed ? "lg:pl-[72px]" : "lg:pl-[230px]";

  if (checkingAuth) {
    // Avoid rendering routes until we know the real auth state, so a
    // logged-out visitor never briefly sees a protected page (and a
    // logged-in admin never gets bounced to /login) while the token is
    // still being verified.
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      {isAuthenticated && (
        <Sidebar
          onLogout={handleLogout}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />
      )}

      {/* Page content — offset for sidebar on desktop, top-bar on mobile */}
      <div
        className={`transition-all duration-300 ${isAuthenticated ? `pt-14 lg:pt-0 ${desktopOffset}` : ""}`}
      >
        <Routes>
          <Route
            path="/login"
            element={
              isAuthenticated ? (
                <Navigate to="/" replace />
              ) : (
                <AdminLogin onLogin={handleLogin} />
              )
            }
          />
          <Route
            path="/forgot-password"
            element={
              isAuthenticated ? (
                <Navigate to="/" replace />
              ) : (
                <AdminForgotPassword />
              )
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manage-motorcycles"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <ManageMotorcycle />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bookings"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <MotorcycleBooking />
              </ProtectedRoute>
            }
          />
          <Route
            path="/walk-in-rentals"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <WalkInRentals />
              </ProtectedRoute>
            }
          />
          <Route
            path="/return-inspection"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <ReturnInspection />
              </ProtectedRoute>
            }
          />
          <Route
            path="/system-log"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <SystemLog />
              </ProtectedRoute>
            }
          />
          <Route
            path="/motorcycle-tracking"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <MotorcycleTracking />
              </ProtectedRoute>
            }
          />
          <Route
            path="/motorcycle-location-log"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <MotorcycleLocationLog />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <AdminAnalytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reviews"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <ReviewManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/discounts"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <DiscountManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/maintenance"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <MaintenancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/calendar"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <CalendarView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/contact"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <AdminContact />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <UserManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/qr-changer"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <QRChanger />
              </ProtectedRoute>
            }
          />
          <Route
            path="/live-chat"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <AdminLiveChat />
              </ProtectedRoute>
            }
          />
          <Route
            path="*"
            element={
              <Navigate
                to={isAuthenticated ? "/dashboard" : "/login"}
                replace
              />
            }
          />
        </Routes>
      </div>
    </div>
  );
};

export default App;
