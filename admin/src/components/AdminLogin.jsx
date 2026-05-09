import React, { useMemo, useState } from "react";
import { FaCheck, FaEye, FaEyeSlash, FaTimes } from "react-icons/fa";
import logo from "../assets/logo.png";
import bgImage from "../assets/bgImage2.jpg";
import {
  ADMIN_DEFAULT_EMAIL,
  PASSWORD_RULES,
  validateStrongPassword,
} from "../constants/adminAuth";

const AdminLogin = ({ onLogin }) => {
  const [email, setEmail] = useState(ADMIN_DEFAULT_EMAIL);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const validation = useMemo(
    () => validateStrongPassword(password),
    [password],
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!validation.isValid) {
      setError("Password does not meet the required format.");
      return;
    }

    const ok = onLogin(email.trim(), password);
    if (!ok) {
      setError("Invalid admin email or password.");
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: "cover",
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

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase mb-1.5">
                Username / Email
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[#171717] text-sm placeholder-slate-300 focus:outline-none focus:border-[#b50002]/30 transition-colors"
                autoComplete="username"
                required
              />
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
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 pr-10 rounded-xl border border-slate-200 bg-white text-[#171717] text-sm placeholder-slate-300 focus:outline-none focus:border-[#b50002]/30 transition-colors"
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
            </div>

            {/* Password rules */}
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

            {/* Error */}
            {error && (
              <div className="text-sm text-[#b50002] bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 font-medium">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#b50002] text-white font-bold text-sm shadow-md shadow-[#b50002]/30 hover:brightness-110 transition-all"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
