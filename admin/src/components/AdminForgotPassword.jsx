import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaCheck, FaEye, FaEyeSlash, FaTimes } from "react-icons/fa";
import logo from "../assets/logo.png";
import bgImage from "../assets/bgImage2.jpg";
import { PASSWORD_RULES, validateStrongPassword } from "../constants/adminAuth";
import useResendCooldown, { formatCooldown } from "../hooks/useResendCooldown";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "";

const CARD_CLASSES =
  "relative z-10 w-full max-w-sm bg-white rounded-2xl border border-slate-100 shadow-2xl overflow-hidden";
const INPUT_CLASSES =
  "w-full px-3 py-2.5 rounded-xl border text-[#171717] text-sm placeholder-slate-300 focus:outline-none transition-colors border-slate-200 bg-white focus:border-[#b50002]/30";

const AdminForgotPassword = () => {
  // "request" -> enter email and ask for a code
  // "reset"   -> enter the code + new password
  // "done"    -> success, link back to login
  const [step, setStep] = useState("request");

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  // Set once the backend reports the 3-resend cap has been hit for this
  // pending reset OTP; disables further resend attempts until the OTP
  // naturally expires (or the user requests a fresh reset).
  const [resendLimitReached, setResendLimitReached] = useState(false);

  const resendCooldown = useResendCooldown({
    storageKey: email ? `otpCooldown:adminForgotPassword:${email}` : null,
    cooldownSeconds: 60,
  });

  const validation = useMemo(
    () => validateStrongPassword(newPassword),
    [newPassword],
  );

  const passwordsMatch =
    confirmPassword.length > 0 && newPassword === confirmPassword;
  const passwordsMismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setInfo("A reset code has been sent to that email.");
        resendCooldown.startCooldown();
        setResendLimitReached(false);
        setStep("reset");
      } else {
        setError(data.message || "Something went wrong. Please try again.");
      }
    } catch (err) {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");

    if (!otp.trim()) {
      setError("Enter the code sent to your email.");
      return;
    }
    if (!validation.isValid) {
      setError("Password does not meet the required format.");
      return;
    }
    if (!confirmPassword) {
      setError("Please confirm your new password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          otp: otp.trim(),
          newPassword,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setStep("done");
      } else {
        setError(data.message || "Invalid or expired code.");
      }
    } catch (err) {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (
      !resendCooldown.canResend ||
      resending ||
      isSubmitting ||
      resendLimitReached
    )
      return;

    setError("");
    setResending(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 429) {
        setResendLimitReached(true);
        setError(
          data.message ||
            "OTP resend limit reached. Please wait for the current code to expire and try again.",
        );
      } else if (res.ok && data.success) {
        setInfo("A new reset code has been sent to that email.");
        resendCooldown.startCooldown();
      } else {
        setError(
          data.message || "Failed to resend the code. Please try again.",
        );
      }
    } catch (err) {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: "auto",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />

      <div className={CARD_CLASSES}>
        <div className="p-7">
          <div className="flex items-center gap-3 mb-5">
            <img
              src={logo}
              alt="Anaia's Logo"
              className="w-24 h-16 object-cover rounded-xl p-2"
            />
            <div>
              <p className="text-[#171717] font-black text-lg leading-tight">
                Admin Portal
              </p>
              <p className="text-[#171717]/55 text-xs">
                Anaia's Motorcycle Rental
              </p>
            </div>
          </div>

          {step === "request" && (
            <>
              <h1 className="text-2xl font-black text-[#171717] tracking-tight mb-1">
                Forgot Password
              </h1>
              <p className="text-slate-400 text-sm mb-6">
                Enter your admin email and we'll send you a reset code.
              </p>

              <form
                onSubmit={handleRequestOtp}
                className="space-y-4"
                noValidate
              >
                <div>
                  <label className="block text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase mb-1.5">
                    Admin Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={INPUT_CLASSES}
                    autoComplete="username"
                    required
                  />
                </div>

                {error && (
                  <div className="text-sm text-[#b50002] bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 font-medium">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#b50002] text-white font-bold text-sm shadow-md shadow-[#b50002]/30 hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Sending..." : "Send Reset Code"}
                </button>

                <Link
                  to="/login"
                  className="block text-center text-xs font-semibold text-slate-400 hover:text-[#b50002] transition-colors"
                >
                  Back to Sign In
                </Link>
              </form>
            </>
          )}

          {step === "reset" && (
            <>
              <h1 className="text-2xl font-black text-[#171717] tracking-tight mb-1">
                Enter Reset Code
              </h1>
              <p className="text-slate-400 text-sm mb-6">
                {info ||
                  `Enter the code sent to ${email} and choose a new password.`}
              </p>

              <form
                onSubmit={handleResetPassword}
                className="space-y-4"
                noValidate
              >
                <div>
                  <label className="block text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase mb-1.5">
                    Reset Code
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className={INPUT_CLASSES}
                    inputMode="numeric"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className={`${INPUT_CLASSES} pr-10`}
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <FaEyeSlash className="text-sm" />
                      ) : (
                        <FaEye className="text-sm" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`${INPUT_CLASSES} pr-10`}
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                      aria-label={
                        showConfirmPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showConfirmPassword ? (
                        <FaEyeSlash className="text-sm" />
                      ) : (
                        <FaEye className="text-sm" />
                      )}
                    </button>
                  </div>
                  {(passwordsMatch || passwordsMismatch) && (
                    <p
                      className={`text-xs font-medium mt-1.5 ${
                        passwordsMatch ? "text-emerald-600" : "text-[#b50002]"
                      }`}
                    >
                      {passwordsMatch
                        ? "Passwords match"
                        : "Passwords do not match"}
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                  <p className="text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase mb-2.5">
                    Password Rules
                  </p>
                  <div className="space-y-1.5">
                    {PASSWORD_RULES.map((rule) => {
                      const met = !validation.errors.includes(rule);
                      return (
                        <p
                          key={rule}
                          className={`text-xs flex items-center gap-2 font-medium ${
                            met ? "text-emerald-600" : "text-slate-400"
                          }`}
                        >
                          <span
                            className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[9px]
                              ${met ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-300"}`}
                          >
                            {met ? <FaCheck /> : <FaTimes />}
                          </span>
                          {rule}
                        </p>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={
                      !resendCooldown.canResend ||
                      resending ||
                      isSubmitting ||
                      resendLimitReached
                    }
                    className={`text-xs font-semibold transition-colors ${
                      resendCooldown.canResend &&
                      !resending &&
                      !isSubmitting &&
                      !resendLimitReached
                        ? "text-[#b50002] hover:brightness-110"
                        : "text-slate-300 cursor-not-allowed"
                    }`}
                  >
                    {resendLimitReached
                      ? "Resend limit reached"
                      : resending
                        ? "Resending..."
                        : !resendCooldown.canResend
                          ? `Resend code in ${formatCooldown(resendCooldown.remainingSeconds)}`
                          : "Didn't receive it? Resend code"}
                  </button>

                  {resendLimitReached && (
                    <p className="text-[11px] text-[#b50002] font-medium mt-1">
                      You've reached the resend limit. Please wait for the
                      current code to expire and request a new one.
                    </p>
                  )}
                </div>

                {error && (
                  <div className="text-sm text-[#b50002] bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 font-medium">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#b50002] text-white font-bold text-sm shadow-md shadow-[#b50002]/30 hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Resetting..." : "Reset Password"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep("request");
                    setError("");
                    setInfo("");
                    setResendLimitReached(false);
                  }}
                  className="block w-full text-center text-xs font-semibold text-slate-400 hover:text-[#b50002] transition-colors"
                >
                  Back
                </button>
              </form>
            </>
          )}

          {step === "done" && (
            <>
              <h1 className="text-2xl font-black text-[#171717] tracking-tight mb-1">
                Password Reset
              </h1>
              <p className="text-slate-400 text-sm mb-6">
                Your admin password has been updated. You can sign in with it
                now.
              </p>
              <Link
                to="/login"
                className="block w-full text-center py-2.5 rounded-xl bg-[#b50002] text-white font-bold text-sm shadow-md shadow-[#b50002]/30 hover:brightness-110 transition-all"
              >
                Back to Sign In
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminForgotPassword;
