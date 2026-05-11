import React, { useState } from "react";
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
import ReturnInspection from "./components/ReturnInspection";
import ReviewManagement from "./components/ReviewManagement";
import Dashboard from "./components/Dashboard";
import DiscountManagement from "./components/DiscountManagement";
import MaintenancePage from "./components/MaintenancePage";
import CalendarView from "./components/CalendarView";
import AdminContact from "./components/AdminContact";
import {
  ADMIN_AUTH_STORAGE_KEY,
  ADMIN_DEFAULT_EMAIL,
  ADMIN_DEFAULT_PASSWORD,
  validateStrongPassword,
} from "./constants/adminAuth";

const ProtectedRoute = ({ isAuthenticated, children }) =>
  isAuthenticated ? children : <Navigate to="/login" replace />;

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem(ADMIN_AUTH_STORAGE_KEY) === "true",
  );
  // Sidebar state lifted so content margin stays in sync
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogin = (emailOrUsername, password) => {
    const isStrongPassword = validateStrongPassword(password).isValid;
    const normalizedInput = emailOrUsername.trim().toLowerCase();
    const normalizedAdminEmail = ADMIN_DEFAULT_EMAIL.trim().toLowerCase();
    const isAllowedIdentifier =
      normalizedInput === normalizedAdminEmail || normalizedInput === "admin";

    if (
      isAllowedIdentifier &&
      password === ADMIN_DEFAULT_PASSWORD &&
      isStrongPassword
    ) {
      localStorage.setItem(ADMIN_AUTH_STORAGE_KEY, "true");
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsAuthenticated(false);
  };

  // Sidebar offsets (must match Sidebar.jsx widths)
  const desktopOffset = sidebarCollapsed ? "lg:pl-[72px]" : "lg:pl-[230px]";

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
            path="/"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          {/* <Route
            path="/"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <AddMotorcycle />
              </ProtectedRoute>
            }
          /> */}
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
