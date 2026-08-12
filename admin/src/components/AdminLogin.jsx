import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import logo from "../assets/logo.png";
import bgImage from "../assets/bgImage2.jpg";

// Formats a millisecond duration as "M:SS" for the lockout countdown.
const formatCountdown = (ms) => {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

const AdminLogin = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Timestamp (from the server's `lockedUntil`) the account unlocks at.
  const [lockedUntil, setLockedUntil] = useState(null);
  const [now, setNow] = useState(Date.now());

  // const validation = useMemo(
  //   () => validateStrongPassword(password),
  //   [password],
  // );

  // Tick every second while locked so the countdown stays live.
  useEffect(() => {
    if (!lockedUntil) return undefined;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const remainingMs = lockedUntil
    ? Math.max(0, new Date(lockedUntil).getTime() - now)
    : 0;
  const isLocked = Boolean(lockedUntil) && remainingMs > 0;

  // Once the countdown hits zero, clear the lock so the form re-enables
  // (the server will re-lock on submit if it disagrees for any reason).
  useEffect(() => {
    if (lockedUntil && remainingMs === 0) {
      setLockedUntil(null);
      setError("");
    }
  }, [remainingMs, lockedUntil]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLocked) return;
    setError("");

    const nextFieldErrors = {};
    if (!email.trim()) nextFieldErrors.email = "Email is required";
    if (!password) nextFieldErrors.password = "Password is required";
    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      // onLogin now performs the actual API call and returns
      // { ok: boolean, message?: string, lockedUntil?: string } instead of
      // a plain boolean, since verifying credentials against the server is
      // asynchronous.
      const result = await onLogin(email.trim(), password);
      if (!result?.ok) {
        setError(result?.message || "Invalid admin email or password.");
        if (result?.lockedUntil) {
          setLockedUntil(result.lockedUntil);
          setNow(Date.now());
        }
      }
    } finally {
      setIsSubmitting(false);
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
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />

      <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl border border-slate-100 shadow-2xl overflow-hidden">
        {/* Top accent bar */}

        <div className="p-7">
          {/* Logo + brand */}
          <div className="flex items-center gap-3 mb-5">
            <img
              src={logo}
              alt="Anaia's Logo"
              className="w-24 h-16 object-cover rounded-xl  p-2"
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

          <h1 className="text-2xl font-black text-[#171717] tracking-tight mb-1">
            Sign In
          </h1>
          <p className="text-slate-400 text-sm mb-6">
            Enter your credentials to continue.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Email */}
            <div>
              <label className="block text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase mb-1.5">
                Username / Email
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email)
                    setFieldErrors((p) => ({ ...p, email: undefined }));
                }}
                className={`w-full px-3 py-2.5 rounded-xl border text-[#171717] text-sm placeholder-slate-300 focus:outline-none transition-colors ${
                  fieldErrors.email
                    ? "border-[#b50002] bg-[#FDF0F0] focus:border-[#b50002]"
                    : "border-slate-200 bg-white focus:border-[#b50002]/30"
                }`}
                autoComplete="username"
                required
              />
              {fieldErrors.email && (
                <p className="text-xs font-semibold text-[#b50002] mt-1.5">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password)
                      setFieldErrors((p) => ({ ...p, password: undefined }));
                  }}
                  className={`w-full px-3 py-2.5 pr-10 rounded-xl border text-[#171717] text-sm placeholder-slate-300 focus:outline-none transition-colors ${
                    fieldErrors.password
                      ? "border-[#b50002] bg-[#FDF0F0] focus:border-[#b50002]"
                      : "border-slate-200 bg-white focus:border-[#b50002]/30"
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <FaEyeSlash className="text-sm" />
                  ) : (
                    <FaEye className="text-sm" />
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-xs font-semibold text-[#b50002] mt-1.5">
                  {fieldErrors.password}
                </p>
              )}
              <Link
                to="/forgot-password"
                className="block text-right text-xs font-semibold text-slate-400 hover:text-[#b50002] transition-colors mt-1.5"
              >
                Forgot password?
              </Link>
            </div>

            {/* Password rules */}
            {/* <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
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
            </div> */}

            {/* Error */}
            {error && (
              <div className="text-sm text-[#b50002] bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 font-medium">
                {error}
                {isLocked && (
                  <span className="block mt-1 font-mono text-xs">
                    Try again in {formatCountdown(remainingMs)}
                  </span>
                )}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || isLocked}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#b50002] text-white font-bold text-sm shadow-md shadow-[#b50002]/30 hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLocked
                ? `Locked · ${formatCountdown(remainingMs)}`
                : isSubmitting
                  ? "Signing in..."
                  : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
