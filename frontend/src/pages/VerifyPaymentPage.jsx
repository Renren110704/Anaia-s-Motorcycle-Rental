import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const VerifyPaymentPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timeout = setTimeout(() => {
      navigate("/bookings", { replace: true });
    }, 1200);
    return () => clearTimeout(timeout);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center text-white p-4">
      <div className="text-center max-w-lg">
        <p className="mb-2">Stripe callbacks are no longer used.</p>
        <p className="text-sm opacity-70">
          Redirecting to your bookings page...
        </p>
      </div>
    </div>
  );
};

export default VerifyPaymentPage;
