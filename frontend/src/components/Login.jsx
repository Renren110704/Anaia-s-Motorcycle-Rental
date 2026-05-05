import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaEye,
  FaEyeSlash,
  FaLock,
  FaEnvelope,
  FaMotorcycle,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaIdCard,
  FaShieldAlt,
} from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
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

  const titles = {
    1: {
      heading: (
        <>
          Welcome
          <br />
          back!
        </>
      ),
      sub: "Sign in to access your account and manage your bookings.",
    },
    2: {
      heading: (
        <>
          Verify
          <br />
          your login
        </>
      ),
      sub: "A one-time code was sent to your email to keep your account secure.",
    },
    3: {
      heading: (
        <>
          Verify
          <br />
          your email
        </>
      ),
      sub: "Enter the code we sent to activate your account.",
    },
  };

  const { heading, sub } = titles[step] || titles[1];

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
          <h2 className="text-white font-black text-3xl leading-tight mb-2 whitespace-pre-line">
            {heading}
          </h2>
          <p className="text-white/60 text-sm leading-relaxed">{sub}</p>
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
const Login = () => {
  const API_BASE = API_BASE_URL;
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [otp, setOtp] = useState("");
  const [verificationOtp, setVerificationOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [resendingLoginOtp, setResendingLoginOtp] = useState(false);
  const [resendingVerificationOtp, setResendingVerificationOtp] = useState(false);

  const loginOtpCooldown = useResendCooldown({
    storageKey: credentials.email ? `otpCooldown:loginOtp:${credentials.email}` : null,
    cooldownSeconds: 60,
  });

  const verificationOtpCooldown = useResendCooldown({
    storageKey: unverifiedEmail ? `otpCooldown:verifyEmail:${unverifiedEmail}` : null,
    cooldownSeconds: 60,
  });

  const handleChange = (e) => {
    setCredentials((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleResendVerification = async () => {
    if (!verificationOtpCooldown.canResend || resendingVerificationOtp || loading)
      return;
    if (!unverifiedEmail) {
      toast.error("Email is missing");
      return;
    }
    setResendingVerificationOtp(true);
    try {
      await axios.post(
        `${API_BASE}/api/auth/resend-verification-otp`,
        {
          email: unverifiedEmail,
        },
      );
      toast.success("Verification OTP sent! Please check your email.");
      verificationOtpCooldown.startCooldown();
      setStep(3);
      setNeedsVerification(false);
    } catch {
      toast.error("Failed to resend verification OTP");
    } finally {
      setResendingVerificationOtp(false);
    }
  };

  const handleResendLoginOTP = async () => {
    if (!loginOtpCooldown.canResend || resendingLoginOtp || loading) return;
    if (!credentials.email || !credentials.password) {
      toast.error("Please enter your email and password again");
      setStep(1);
      return;
    }
    setResendingLoginOtp(true);
    try {
      const res = await axios.post(`${API_BASE}/api/auth/login`, credentials, {
        headers: { "Content-Type": "application/json" },
      });
      const { requiresOTP, message } = res.data || {};
      if (requiresOTP) {
        toast.success(message || "OTP resent to your email.");
        loginOtpCooldown.startCooldown();
        setOtp("");
        setStep(2);
      } else {
        toast.error("Unable to resend OTP");
      }
    } catch (err) {
      if (err.response?.data?.needsVerification) {
        setNeedsVerification(true);
        setUnverifiedEmail(credentials.email);
        toast.error("Please verify your email first.", { autoClose: 5000 });
        setStep(1);
      } else {
        toast.error(err.response?.data?.message || "Failed to resend OTP");
      }
    } finally {
      setResendingLoginOtp(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setNeedsVerification(false);
    try {
      const res = await axios.post(
        `${API_BASE}/api/auth/login`,
        credentials,
        {
          headers: { "Content-Type": "application/json" },
        },
      );
      if (res.status >= 200 && res.status < 300) {
        const { requiresOTP, message } = res.data || {};
        if (requiresOTP) {
          toast.success(message || "OTP sent to your email.");
          loginOtpCooldown.startCooldown();
          setStep(2);
        }
      }
    } catch (err) {
      if (err.response?.data?.needsVerification) {
        setNeedsVerification(true);
        setUnverifiedEmail(credentials.email);
        toast.error("Please verify your email first.", { autoClose: 5000 });
      } else {
        toast.error(err.response?.data?.message || "Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyLoginOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(
        `${API_BASE}/api/auth/verify-login-otp`,
        { email: credentials.email, otp },
        { headers: { "Content-Type": "application/json" } },
      );
      if (res.status >= 200 && res.status < 300) {
        const { token, user, message } = res.data || {};
        if (token) localStorage.setItem("token", token);
        if (user) localStorage.setItem("user", JSON.stringify(user));
        toast.success(message || "Login Successful! Welcome back", {
          autoClose: 1000,
          onClose: () => navigate("/", { replace: true }),
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid or expired OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(
        `${API_BASE}/api/auth/verify-email`,
        { email: unverifiedEmail, otp: verificationOtp },
        { headers: { "Content-Type": "application/json" } },
      );
      if (res.status >= 200 && res.status < 300) {
        const { token, user } = res.data || {};
        if (token) localStorage.setItem("token", token);
        if (user) localStorage.setItem("user", JSON.stringify(user));
        toast.success("Email verified! Welcome!", {
          autoClose: 1200,
          onClose: () => navigate("/", { replace: true }),
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid or expired OTP");
    } finally {
      setLoading(false);
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
                href="/"
                className="inline-flex items-center gap-2 text-[#171717]/50 hover:text-[#b50002] text-sm font-medium transition-colors mb-4"
              >
                <FaArrowLeft className="text-xs" /> Back to Home
              </a>
              <h1 className="text-2xl font-black text-[#171717] tracking-tight">
                {step === 1 && "Sign In"}
                {step === 2 && "Verify Login"}
                {step === 3 && "Verify Your Email"}
              </h1>
              <p className="text-[#171717]/50 text-sm mt-1">
                {step === 1 && "Enter your credentials to continue"}
                {step === 2 && "Enter the 6-digit code sent to your email"}
                {step === 3 && "Enter the verification code we sent you"}
              </p>
            </div>

            {/* Step 1 — Credentials */}
            {step === 1 && (
              <form
                onSubmit={handleSubmit}
                className="flex flex-col gap-4 flex-1"
              >
                <Field icon={FaEnvelope} label="Email Address">
                  <input
                    type="email"
                    name="email"
                    value={credentials.email}
                    onChange={handleChange}
                    placeholder="juan@email.com"
                    required
                    maxLength={254}
                    className={inputCls}
                  />
                </Field>

                <div className="flex flex-col gap-1">
                  <label className="text-[#171717]/70 text-xs font-semibold uppercase tracking-wider">
                    Password
                  </label>
                  <div className="relative flex items-center bg-white/60 border border-[#171717]/10 rounded-xl shadow-sm focus-within:border-black transition-all hover:bg-white/90">
                    <FaLock className="absolute left-3.5 text-[#b50002] text-sm pointer-events-none" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={credentials.password}
                      onChange={handleChange}
                      placeholder="Enter your password"
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
                </div>

                <div className="text-right -mt-1">
                  <a
                    href="/forgot-password"
                    className="text-xs text-[#b50002] font-semibold hover:underline"
                  >
                    Forgot Password?
                  </a>
                </div>

                {needsVerification && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-3">
                    <FaShieldAlt className="text-amber-500 text-sm mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-amber-800 font-semibold mb-1">
                        Email not verified
                      </p>
                      <button
                        type="button"
                        onClick={handleResendVerification}
                        disabled={!verificationOtpCooldown.canResend || resendingVerificationOtp || loading}
                        className={`text-xs font-semibold underline transition-colors ${
                          !verificationOtpCooldown.canResend ||
                          resendingVerificationOtp ||
                          loading
                            ? "text-[#171717]/40 cursor-not-allowed"
                            : "text-[#b50002] hover:text-[#900000]"
                        }`}
                      >
                        {!verificationOtpCooldown.canResend
                          ? `Resend in ${formatCooldown(verificationOtpCooldown.remainingSeconds)}`
                          : "Resend Verification Email"}
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between mt-auto pt-2">
                  <p className="text-xs text-[#171717]/40">
                    No account?{" "}
                    <a
                      href="/signup"
                      className="text-[#b50002] font-semibold hover:underline"
                    >
                      Create one
                    </a>
                  </p>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 bg-[#171717] text-white font-bold text-sm rounded-xl
                    shadow-lg shadow-[#171717]/30 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]
                    disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {loading ? "Signing in…" : "Sign In"}
                  </button>
                </div>
              </form>
            )}

            {/* Step 2 — Login OTP */}
            {step === 2 && (
              <form
                onSubmit={handleVerifyLoginOTP}
                className="flex flex-col gap-4 flex-1"
              >
                <div className="bg-green-900/30 border order-green-800/30 rounded-xl px-4 py-3 flex items-center gap-2">
                  <FaEnvelope className="text-green-800 text-sm flex-shrink-0" />
                  <p className="text-xs text-[#171717]/70">
                    Code sent to{" "}
                    <span className="font-semibold text-[#171717]">
                      {credentials.email}
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

                <button
                  type="button"
                  onClick={handleResendLoginOTP}
                  disabled={!loginOtpCooldown.canResend || resendingLoginOtp || loading}
                  className={`text-sm font-medium hover:underline text-left transition-colors ${
                    !loginOtpCooldown.canResend || resendingLoginOtp || loading
                      ? "text-[#171717]/40 cursor-not-allowed"
                      : "text-[#b50002]"
                  }`}
                >
                  {!loginOtpCooldown.canResend
                    ? `Resend OTP in ${formatCooldown(loginOtpCooldown.remainingSeconds)}`
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
                    shadow-lg shadow-[#171717]/30 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]
                    disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {loading ? "Verifying…" : "Verify & Login"}
                  </button>
                </div>
              </form>
            )}

            {/* Step 3 — Email Verification OTP */}
            {step === 3 && (
              <form
                onSubmit={handleVerifyEmail}
                className="flex flex-col gap-4 flex-1"
              >
                <div className="bg-[#b50002]/5 border border-[#b50002]/20 rounded-xl px-4 py-3 flex items-center gap-2">
                  <FaEnvelope className="text-[#b50002] text-sm flex-shrink-0" />
                  <p className="text-xs text-[#171717]/70">
                    Code sent to{" "}
                    <span className="font-semibold text-[#171717]">
                      {unverifiedEmail}
                    </span>
                  </p>
                </div>

                <Field icon={FaLock} label="Verification Code">
                  <input
                    type="tel"
                    value={verificationOtp}
                    onChange={(e) =>
                      setVerificationOtp(e.target.value.replace(/\D/g, ""))
                    }
                    className={inputCls}
                    placeholder="Enter 6-digit code"
                    required
                    maxLength={6}
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                </Field>

                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={!verificationOtpCooldown.canResend || resendingVerificationOtp || loading}
                  className={`text-sm font-medium hover:underline text-left transition-colors ${
                    !verificationOtpCooldown.canResend ||
                    resendingVerificationOtp ||
                    loading
                      ? "text-[#171717]/40 cursor-not-allowed"
                      : "text-[#b50002]"
                  }`}
                >
                  {!verificationOtpCooldown.canResend
                    ? `Resend OTP in ${formatCooldown(verificationOtpCooldown.remainingSeconds)}`
                    : "Didn't receive it? Resend OTP"}
                </button>

                <div className="flex items-center justify-between mt-auto pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setNeedsVerification(false);
                    }}
                    className="inline-flex items-center gap-2 text-[#171717]/50 hover:text-[#b50002] text-sm font-medium transition-colors"
                  >
                    <FaArrowLeft className="text-xs" /> Back to Login
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 bg-[#b50002] text-white font-bold text-sm rounded-xl
                    shadow-lg shadow-[#b50002]/30 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]
                    disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {loading ? "Verifying…" : "Verify Email"}
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

export default Login;
