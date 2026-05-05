import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaLock,
  FaMotorcycle,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaIdCard,
  FaKey,
} from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import PasswordStrengthMeter from "../components/PasswordStrengthMeter";
import axios from "axios";
import bgImage from "../assets/bgImage2.jpg";
import API_BASE_URL from "../apiBase";
import useResendCooldown, { formatCooldown } from "../hooks/useResendCooldown";

// ── Shared primitives ─────────────────────────────────────────────────────────
const inputCls =
  "w-full pl-10 pr-4 py-3 bg-transparent text-[#171717] text-sm placeholder-[#171717]/40 focus:outline-none rounded-xl";

const Field = ({ icon: Icon, children, label }) => (
  <div className="flex flex-col gap-1">
    {label && (
      <label className="text-[#171717]/70 text-xs font-semibold uppercase tracking-wider">
        {label}
      </label>
    )}
    <div className="relative flex items-center bg-white/60 border border-[#171717]/10 rounded-xl shadow-sm focus-within:border-black transition-all hover:bg-white/90">
      {Icon && (
        <Icon className="absolute left-3.5 text-[#b50002] text-sm pointer-events-none" />
      )}
      {children}
    </div>
  </div>
);

// ── Card — defined outside component to prevent remount on re-render ──────────
const CLOUDINARY_BASE = "https://res.cloudinary.com/"; // Adjust if you have a specific Cloudinary subdomain
const buildImageSrc = (image) => {
  if (!image) return "";
  if (Array.isArray(image)) image = image[0];
  if (typeof image !== "string") return "";
  const t = image.trim();
  if (!t) return "";
  if (/^data:image\//i.test(t)) return t;
  if (/^https?:\/\//i.test(t)) {
    // If it's a Cloudinary URL or any external URL, use as is
    return t;
  }
  if (t.includes("cloudinary")) return t;
  // Optionally, if you want to force all uploads to Cloudinary, build the URL here
  // return `${CLOUDINARY_BASE}/your-cloud-name/image/upload/${t}`;
  if (t.startsWith("/")) return `${API_BASE}${t}`;
  return `${API_BASE}/uploads/${t}`;
};
const Card = ({ children, bgImage }) => (
  <div
    className="min-h-screen w-full flex items-center justify-center p-4"
    style={{
      backgroundImage: `url(${bgImage})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    }}
  >
    <div
      className="w-full max-w-4xl bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden
      flex flex-col lg:flex-row min-h-[520px]"
    >
      {children}
    </div>
  </div>
);

// ── Left panel ────────────────────────────────────────────────────────────────
const LeftPanel = ({ step }) => {
  const features = [
    { icon: FaMotorcycle, text: "Wide selection of motorcycles" },
    { icon: FaCheckCircle, text: "Easy & secure booking process" },
    { icon: FaMapMarkerAlt, text: "Pickup in Bacoor, Cavite" },
    { icon: FaIdCard, text: "Transparent pricing, no hidden fees" },
  ];

  return (
    <div className="relative flex flex-col justify-between h-full p-8 lg:p-10 overflow-hidden">

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-10">
          
          <div>
            <p className="text-white font-black text-lg leading-none tracking-tight">
              Anaia's Motorcycle Rental
            </p>
            <p className="text-white/50 text-xs">Bacoor, Cavite</p>
          </div>
        </div>

        <div className="mb-8">
          <span className="inline-block text-white/60 text-xs font-bold uppercase tracking-widest py-1 rounded-full mb-3">
            Step {step} of 2
          </span>
          <h2 className="text-white font-black text-3xl leading-tight mb-2">
            {step === 1 ? (
              <>
                Forgot your
                <br />
                password?
              </>
            ) : (
              <>
                Create a new
                <br />
                password
              </>
            )}
          </h2>
          <p className="text-white/60 text-sm leading-relaxed">
            {step === 1
              ? "No worries! Enter your email and we'll send you a reset code."
              : "Enter the OTP from your email and set your new password."}
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`rounded-full transition-all duration-300 ${
                s === step
                  ? "w-8 h-2.5 bg-[#b50002]"
                  : s < step
                    ? "w-2.5 h-2.5 bg-white/60"
                    : "w-2.5 h-2.5 bg-white/20"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 space-y-3">
        {features.map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon className="text-white/70 text-sm" />
            </div>
            <span className="text-white/70 text-sm">{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const ForgotPassword = () => {
  const API_BASE = API_BASE_URL;
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const resendCooldown = useResendCooldown({
    storageKey: email ? `otpCooldown:forgotPassword:${email}` : null,
    cooldownSeconds: 60,
  });

  const getPasswordStrength = (pass) => {
    let s = 0;
    if (pass.length >= 6) s++;
    if (pass.match(/[a-z]/) && pass.match(/[A-Z]/)) s++;
    if (pass.match(/\d/)) s++;
    if (pass.match(/[^a-zA-Z\d]/)) s++;
    return s;
  };

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(
        `${API_BASE}/api/auth/request-password-reset`,
        { email },
      );
      if (res.status >= 200 && res.status < 300) {
        toast.success("Password reset OTP sent to your email!");
        resendCooldown.startCooldown();
        setStep(2);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send reset OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (getPasswordStrength(newPassword) < 4) {
      toast.error("Password must be Strong (meet all criteria)");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(
        `${API_BASE}/api/auth/reset-password`,
        { email, otp, newPassword },
      );
      if (res.status >= 200 && res.status < 300) {
        toast.success("Password reset successfully! Please login.", {
          autoClose: 1500,
          onClose: () => navigate("/login"),
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!resendCooldown.canResend || resending || loading) return;
    setResending(true);
    try {
      await axios.post(`${API_BASE}/api/auth/request-password-reset`, { email });
      toast.success("OTP resent successfully!");
      resendCooldown.startCooldown();
    } catch {
      toast.error("Failed to resend OTP");
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <Card bgImage={bgImage}>
        <div className="lg:w-2/5 bg-gradient-to-br from-[#171717] via-[#171717] to-[#b50002]/80 flex-shrink-0">
          <LeftPanel step={step} />
        </div>

        <div className="flex-1 bg-[#f4f3f3] flex flex-col">
          <div className="flex flex-col h-full p-6 lg:p-8">
            {/* Header */}
            <div className="mb-6">
              <a
                href="/login"
                className="inline-flex items-center gap-2 text-[#171717]/50 hover:text-[#b50002] text-sm font-medium transition-colors mb-4"
              >
                <FaArrowLeft className="text-xs" /> Back to Login
              </a>
              <h1 className="text-2xl font-black text-[#171717] tracking-tight">
                {step === 1 ? "Reset Password" : "Create New Password"}
              </h1>
              <p className="text-[#171717]/50 text-sm mt-1">
                {step === 1
                  ? "Enter your email to receive a reset code"
                  : "Enter your OTP and choose a new password"}
              </p>
            </div>

            {/* Step 1 — Email */}
            {step === 1 && (
              <form
                onSubmit={handleRequestReset}
                className="flex flex-col gap-4 flex-1"
              >
                <Field icon={FaEnvelope} label="Email Address">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="juan@email.com"
                    required
                    maxLength={254}
                    className={inputCls}
                  />
                </Field>

                <div className="flex items-center justify-between mt-auto pt-2">
                  <p className="text-xs text-[#171717]/40">
                    Remember it?{" "}
                    <a
                      href="/login"
                      className="text-[#b50002] font-semibold hover:underline"
                    >
                      Login
                    </a>
                  </p>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 bg-[#171717] text-white font-bold text-sm rounded-xl
                    shadow-lg shadow-[#171717]/30 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]
                    disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {loading ? "Sending…" : "Send Reset OTP"}
                    {!loading && <FaKey className="text-xs" />}
                  </button>
                </div>
              </form>
            )}

            {/* Step 2 — OTP + New Password */}
            {step === 2 && (
              <form
                onSubmit={handleResetPassword}
                className="flex flex-col gap-4 flex-1"
              >
                <div className="bg-green-900/30 border border-green-800/30 rounded-xl px-4 py-3 flex items-center gap-2">
                  <FaEnvelope className="text-green-800 text-sm flex-shrink-0" />
                  <p className="text-xs text-[#171717]/70">
                    Reset code sent to{" "}
                    <span className="font-semibold text-[#171717]">
                      {email}
                    </span>
                  </p>
                </div>

                <Field icon={FaLock} label="One-Time Code">
                  <input
                    type="tel"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    className={inputCls}
                    placeholder="Enter 6-digit OTP"
                    required
                    maxLength={6}
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                </Field>

                {/* New Password */}
                <div className="flex flex-col gap-1">
                  <label className="text-[#171717]/70 text-xs font-semibold uppercase tracking-wider">
                    New Password
                  </label>
                  <div className="relative flex items-center bg-white/60 border border-[#171717]/10 rounded-xl shadow-sm focus-within:border-black transition-all hover:bg-white/90">
                    <FaLock className="absolute left-3.5 text-[#b50002] text-sm pointer-events-none" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Create new password"
                      required
                      maxLength={64}
                      className={`${inputCls} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-[#171717]/40 hover:text-[#171717] transition-colors"
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                  <div
                    className={`mt-1 transition-opacity duration-200 ${newPassword.length > 0 ? "opacity-100" : "opacity-0"}`}
                  >
                    <PasswordStrengthMeter password={newPassword} />
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="flex flex-col gap-1">
                  <label className="text-[#171717]/70 text-xs font-semibold uppercase tracking-wider">
                    Confirm Password
                  </label>
                  <div className="relative flex items-center bg-white/60 border border-[#171717]/10 rounded-xl shadow-sm focus-within:border-black transition-all hover:bg-white/90">
                    <FaLock className="absolute left-3.5 text-[#b50002] text-sm pointer-events-none" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      required
                      maxLength={64}
                      className={`${inputCls} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 text-[#171717]/40 hover:text-[#171717] transition-colors"
                    >
                      {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                  <p
                    className={`text-xs mt-1 font-medium transition-all duration-150 ${
                      confirmPassword ? "opacity-100" : "opacity-0 select-none"
                    } ${
                      newPassword === confirmPassword && confirmPassword
                        ? "text-green-700"
                        : "text-red-700"
                    }`}
                  >
                    {confirmPassword
                      ? newPassword === confirmPassword
                        ? "Passwords match"
                        : "Passwords do not match"
                      : " "}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={!resendCooldown.canResend || resending || loading}
                  className={`text-sm font-medium text-left transition-colors ${
                    !resendCooldown.canResend || resending || loading
                      ? "text-[#171717]/40 cursor-not-allowed"
                      : "text-[#b50002] hover:underline"
                  }`}
                >
                  {!resendCooldown.canResend
                    ? `Resend OTP in ${formatCooldown(resendCooldown.remainingSeconds)}`
                    : "Didn't receive it? Resend OTP"}
                </button>

                <div className="flex items-center justify-between mt-auto pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex items-center gap-2 text-[#171717]/50 hover:text-[#b50002] text-sm font-medium transition-colors"
                  >
                    <FaArrowLeft className="text-xs" /> Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 bg-[#171717] text-white font-bold text-sm rounded-xl
                    shadow-lg shadow-black/20 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]
                    disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {loading ? "Resetting…" : "Reset Password"}
                    {!loading && <FaCheckCircle className="text-xs" />}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </Card>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        theme="colored"
        icon={false}
      />
    </>
  );
};

export default ForgotPassword;
