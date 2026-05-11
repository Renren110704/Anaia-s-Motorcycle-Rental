import React, { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./components/Login";
import SignUp from "./components/SignUp";
import ForgotPassword from "./components/ForgotPassword";
import Profile from "./pages/Profile";
import ContactPage from "./pages/ContactPage";
import MotorcyclePage from "./pages/MotorcyclePage";
import MotorcycleDetailPage from "./pages/MotorcycleDetailPage";
import CalendarPage from "./pages/CalendarPage";
import { FaArrowUp } from "react-icons/fa";
import MyBooking from "./pages/MyBooking";
import FAQPage from "./pages/FAQPage";

// PROTECTED ROUTE
const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const authToken = localStorage.getItem("token");

  if (!authToken) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
};

const RedirectIfAuthenticated = ({ children }) => {
  const authToken = localStorage.getItem("token");
  if (authToken) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const App = () => {
  const [showButton, setShowButton] = useState(false);
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = () => setShowButton(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollUp = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/motorcycles" element={<MotorcyclePage />} />
        <Route path="/calendar" element={<CalendarPage />} />

        <Route
          path="/motorcycles/:id"
          element={
            <ProtectedRoute>
              <MotorcycleDetailPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/bookings"
          element={
            <ProtectedRoute>
              <MyBooking />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/login"
          element={
            <RedirectIfAuthenticated>
              <Login />
            </RedirectIfAuthenticated>
          }
        />

        <Route
          path="/signup"
          element={
            <RedirectIfAuthenticated>
              <SignUp />
            </RedirectIfAuthenticated>
          }
        />

        <Route
          path="/faq"
          element={
            <RedirectIfAuthenticated>
              <FAQPage />
            </RedirectIfAuthenticated>
          }
        />

        <Route
          path="/forgot-password"
          element={
            <RedirectIfAuthenticated>
              <ForgotPassword />
            </RedirectIfAuthenticated>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {showButton && (
        <button
          onClick={scrollUp}
          className="fixed cursor-pointer bottom-8 right-8 p-3 rounded-full bg-[#b50002]
text-[#e3e3e3] hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] 
transition-colors focus:outline-none shadow-lg shadow-black/20 z-50"
          aria-label="Scroll on top"
        >
          <FaArrowUp size={20} />
        </button>
      )}
    </>
  );
};

export default App;
