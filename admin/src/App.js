import React, { useState } from "react";
import Navbar from "./components/Navbar";
import { Navigate, Route, Routes } from "react-router-dom";
import AddMotorcycle from "./components/AddMotorcycle";
import ManageMotorcycle from "./components/ManageMotorcycle";
import MotorcycleBooking from "./components/MotorcycleBooking";
import MotorcycleTracking from "./components/MotorcycleTracking";
import MotorcycleLocationLog from "./components/MotorcycleLocationLog";
import AdminAnalytics from "./components/AdminAnalytics";
import WalkInRentals from "./components/WalkInRentals";
import SystemLog from "./components/SystemLog";
import AdminLogin from "./components/AdminLogin";
import {
  ADMIN_AUTH_STORAGE_KEY,
  ADMIN_DEFAULT_EMAIL,
  ADMIN_DEFAULT_PASSWORD,
  validateStrongPassword,
} from "./constants/adminAuth";

const ProtectedRoute = ({ isAuthenticated, children }) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem(ADMIN_AUTH_STORAGE_KEY) === "true"
  );

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

  return (
    <>
      {isAuthenticated && <Navbar onLogout={handleLogout} />}
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
              <AddMotorcycle />
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
          path="*"
          element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />}
        />
      </Routes>
    </>
  );
};

export default App;