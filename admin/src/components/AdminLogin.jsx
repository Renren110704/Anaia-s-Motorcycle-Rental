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
      <div className="w-full max-w-md bg-[#f4f3f3]/95 backdrop-blur-sm rounded-3xl border border-[#171717]/10 shadow-2xl p-6 sm:p-7">
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

        <h1 className="text-2xl font-black text-[#171717] tracking-tight">
          Sign In
        </h1>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#171717]/70 mb-1.5">
              Username / Email
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl bg-white/60 border border-[#171717]/15 px-3 py-2.5 text-sm outline-none focus-within:border-black transition-all hover:bg-white/90"
              autoComplete="username"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#171717]/70 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl bg-white/60 border border-[#171717]/15 px-3 py-2.5 pr-10 text-sm outline-none focus-within:border-black transition-all hover:bg-white/90"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#171717]/45 hover:text-[#171717] transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-[#171717]/10 bg-[#f8f8f8] p-3">
            <p className="text-xs font-semibold text-[#171717]/75 mb-2 uppercase tracking-wider">
              Password Rules
            </p>
            <div className="space-y-1">
              {PASSWORD_RULES.map((rule) => {
                const met = !validation.errors.includes(rule);
                return (
                  <p
                    key={rule}
                    className={`text-xs flex items-center ${met ? "text-emerald-700" : "text-[#171717]/55"}`}
                  >
                    {met ? (
                      <FaCheck className="w-3.5 h-3.5 mr-2 text-emerald-700" />
                    ) : (
                      <FaTimes className="w-3.5 h-3.5 mr-2 text-[#171717]/60" />
                    )}
                    {rule}
                  </p>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="text-sm text-[#b50002] bg-[#b50002]/10 border border-[#b50002]/20 rounded-xl px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#171717] text-white font-bold text-sm rounded-xl
                  shadow-lg shadow-[#171717]/30 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]
                  disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
