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
import API_BASE_URL from "../apiBase";
import useResendCooldown, { formatCooldown } from "../hooks/useResendCooldown";
import anaialogo from "../assets/anaialogo.png";
import bgImage from "../assets/loginBG.jpg";

const BG_IMAGE = bgImage;

/* ── Shared style tokens ─────────────────────────────────────────── */
const labelStyle = {
  display: "block",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "2px",
  textTransform: "uppercase",
  color: "rgba(0,0,0,0.38)",
  marginBottom: 6,
  fontFamily: "'Space Grotesk', sans-serif",
};

const inputWrapBase = {
  position: "relative",
  display: "flex",
  alignItems: "center",
  background: "#F5F5F3",
  border: "1.5px solid rgba(0,0,0,0.09)",
  borderRadius: 12,
  transition: "border-color 0.2s, background 0.2s",
};

const inputBase = {
  width: "100%",
  padding: "11px 12px 11px 38px",
  background: "transparent",
  border: "none",
  outline: "none",
  fontSize: 13,
  fontFamily: "'Space Grotesk', sans-serif",
  color: "#0E0E0E",
};

const iconBase = {
  position: "absolute",
  left: 12,
  color: "#b50002",
  fontSize: 12,
  pointerEvents: "none",
};

const errorTextStyle = {
  color: "#b50002",
  fontSize: 11,
  fontWeight: 600,
  marginTop: 6,
  fontFamily: "'Space Grotesk', sans-serif",
};

/* ── Field wrapper ───────────────────────────────────────────────── */
const Field = ({ icon: Icon, label, error, children }) => (
  <div>
    {label && <label style={labelStyle}>{label}</label>}
    <div
      style={{
        ...inputWrapBase,
        ...(error ? { borderColor: "#b50002", background: "#FDF0F0" } : null),
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "#b50002";
        e.currentTarget.style.background = error ? "#FDF0F0" : "#fff";
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = error
          ? "#b50002"
          : "rgba(0,0,0,0.09)";
        e.currentTarget.style.background = error ? "#FDF0F0" : "#F5F5F3";
      }}
    >
      {Icon && <Icon style={iconBase} />}
      {children}
    </div>
    {error && <p style={errorTextStyle}>{error}</p>}
  </div>
);

/* ── OTP Box Input (Professional Clean Style) ────────────────────── */
const OtpBoxInput = ({ value, onChange, length = 6 }) => {
  const inputsRef = React.useRef([]);

  const digits = value
    .split("")
    .concat(Array(length).fill(""))
    .slice(0, length);

  const handleKey = (e, idx) => {
    const key = e.key;

    if (key === "Backspace") {
      e.preventDefault();
      const next = value.split("");
      if (next[idx]) {
        next[idx] = "";
        onChange(next.join(""));
      } else if (idx > 0) {
        next[idx - 1] = "";
        onChange(next.join(""));
        inputsRef.current[idx - 1]?.focus();
      }
      return;
    }

    if (key === "ArrowLeft" && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
      return;
    }
    if (key === "ArrowRight" && idx < length - 1) {
      inputsRef.current[idx + 1]?.focus();
      return;
    }

    if (/^\d$/.test(key)) {
      e.preventDefault();
      const next = value
        .split("")
        .concat(Array(length).fill(""))
        .slice(0, length);
      next[idx] = key;
      onChange(next.join("").replace(/\s/g, ""));
      if (idx < length - 1) inputsRef.current[idx + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, length);
    onChange(pasted.padEnd(length, " ").slice(0, length).trimEnd());
    const focusIdx = Math.min(pasted.length, length - 1);
    inputsRef.current[focusIdx]?.focus();
  };

  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
      {digits.map((digit, idx) => {
        const filled = digit && digit !== " ";
        return (
          <input
            key={idx}
            ref={(el) => (inputsRef.current[idx] = el)}
            type="tel"
            inputMode="numeric"
            maxLength={1}
            value={filled ? digit : ""}
            onKeyDown={(e) => handleKey(e, idx)}
            onPaste={handlePaste}
            onChange={() => {}}
            onFocus={(e) => e.target.select()}
            style={{
              width: 48,
              height: 56,
              borderRadius: 12,
              border: filled
                ? "1.5px solid rgba(0,0,0,0.4)"
                : "1.5px solid rgba(0,0,0,0.12)",
              background: "#fff",
              fontSize: 20,
              fontWeight: 600,
              fontFamily: "'Space Grotesk', sans-serif",
              color: "#0E0E0E",
              textAlign: "center",
              outline: "none",
              transition: "all 0.2s ease-in-out",
              cursor: "text",
              caretColor: "#0E0E0E",
            }}
            onFocusCapture={(e) => {
              e.target.style.borderColor = "#0E0E0E";
              e.target.style.boxShadow = "none";
            }}
            onBlurCapture={(e) => {
              e.target.style.boxShadow = "none";
              if (!e.target.value) {
                e.target.style.borderColor = "rgba(0,0,0,0.12)";
              } else {
                e.target.style.borderColor = "rgba(0,0,0,0.4)";
              }
            }}
          />
        );
      })}
    </div>
  );
};

/* ── Left Panel ──────────────────────────────────────────────────── */
const FEATURES = [
  { icon: FaMotorcycle, text: "Wide selection of vehicles" },
  { icon: FaCheckCircle, text: "Easy & secure booking process" },
  { icon: FaMapMarkerAlt, text: "Pickup in Bacoor, Cavite" },
  { icon: FaIdCard, text: "Transparent pricing, no hidden fees" },
];

const PANEL_COPY = {
  1: {
    heading: ["", ""],
    sub: "Forgot your password? No worries! Enter your email and we'll send you a one-time reset code.",
  },
  2: {
    heading: ["", ""],
    sub: "Enter the OTP from your email and set your new password below.",
  },
};

const LeftPanel = ({ step }) => {
  const { heading, sub } = PANEL_COPY[step] || PANEL_COPY[1];
  const LOGO_URL = anaialogo;

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        height: "100%",
        padding: "36px 32px",
        overflow: "hidden",
        background: "#ffffff",
      }}
    >
      {/* Light theme dot grid accent */}
      <div
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          width: 80,
          height: 80,
          backgroundImage:
            "radial-gradient(circle, rgba(0,0,0,0.15) 1px, transparent 1px)",
          backgroundSize: "12px 12px",
          pointerEvents: "none",
        }}
      />

      {/* Top Section: Brand & Logo */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          marginBottom: "24px",
        }}
      >
        {heading[0] && (
          <h2
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "clamp(28px, 3.5vw, 38px)",
              fontWeight: 800,
              color: "#0E0E0E",
              letterSpacing: "-1px",
              lineHeight: 1.05,
              marginBottom: "28px",
            }}
          >
            {heading[0]}
            <br />
            {heading[1]}
          </h2>
        )}

        <div style={{ display: "flex", justifyContent: "center" }}>
          <img
            src={LOGO_URL}
            alt="Anaia's Motorcycle Rental Logo"
            style={{
              width: "180px",
              height: "auto",
              objectFit: "contain",
              borderRadius: "12px",
            }}
          />
        </div>
      </div>

      {/* Bottom Section: Text & Features */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <p
          style={{
            fontSize: 13,
            color: "rgba(0,0,0,0.55)",
            fontFamily: "'Space Grotesk', sans-serif",
            lineHeight: 1.7,
            maxWidth: 260,
          }}
        >
          {sub}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {FEATURES.map(({ icon: Icon, text }) => (
            <div
              key={text}
              style={{ display: "flex", alignItems: "center", gap: 12 }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 9,
                  background: "rgba(0,0,0,0.03)",
                  border: "1px solid rgba(0,0,0,0.06)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon style={{ color: "#b50002", fontSize: 11 }} />
              </div>
              <span
                style={{
                  color: "rgba(0,0,0,0.42)",
                  fontSize: 12,
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 600,
                }}
              >
                {text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ── Main Component ──────────────────────────────────────────────── */
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
  // Set once the backend reports the 3-resend cap has been hit for this
  // pending reset OTP; disables further resend attempts until the OTP
  // naturally expires (or the user requests a fresh reset).
  const [resendLimitReached, setResendLimitReached] = useState(false);
  const [errors, setErrors] = useState({});

  const resendCooldown = useResendCooldown({
    storageKey: email ? `otpCooldown:forgotPassword:${email}` : null,
    cooldownSeconds: 60,
  });

  const getPasswordStrength = (pass) => {
    let s = 0;
    if (pass.length >= 8) s++;
    if (pass.match(/[a-z]/) && pass.match(/[A-Z]/)) s++;
    if (pass.match(/\d/)) s++;
    if (pass.match(/[^a-zA-Z\d]/)) s++;
    return s;
  };

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleRequestReset = async (e) => {
    e.preventDefault();
    const next = {};
    if (!email.trim()) {
      next.email = "Email is required";
    } else if (!EMAIL_RE.test(email.trim())) {
      next.email = "Enter a valid email address";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) {
      toast.error("Please fix the highlighted fields");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(
        `${API_BASE}/api/auth/request-password-reset`,
        { email },
      );
      if (res.status >= 200 && res.status < 300) {
        toast.success("Password reset OTP sent to your email!");
        resendCooldown.startCooldown();
        setResendLimitReached(false);
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
    const next = {};
    if (!newPassword) {
      next.newPassword = "Password is required";
    } else if (getPasswordStrength(newPassword) < 4) {
      next.newPassword = "Password must be Strong (meet all criteria)";
    }
    if (!confirmPassword) {
      next.confirmPassword = "Please confirm your password";
    } else if (newPassword !== confirmPassword) {
      next.confirmPassword = "Passwords do not match";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) {
      toast.error("Please fix the highlighted fields");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/api/auth/reset-password`, {
        email,
        otp,
        newPassword,
      });
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
    if (!resendCooldown.canResend || resending || loading || resendLimitReached)
      return;
    setResending(true);
    try {
      const res = await axios.post(
        `${API_BASE}/api/auth/request-password-reset`,
        { email },
      );
      toast.success(res.data?.message || "OTP resent successfully!");
      resendCooldown.startCooldown();
    } catch (err) {
      const data = err.response?.data;
      if (err.response?.status === 429) {
        setResendLimitReached(true);
        toast.error(
          data?.message ||
            "OTP resend limit reached. Please wait for the current code to expire and try again.",
          { autoClose: 6000 },
        );
      } else {
        toast.error(data?.message || "Failed to resend OTP");
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }

        .fp-root {
          min-height: 100vh; width: 100%;
          display: flex; align-items: center; justify-content: center;
          padding: 24px; font-family: 'Space Grotesk', sans-serif;
          background-image: url('${BG_IMAGE}');
          background-size: cover; background-position: center;
          position: relative;
        }
        .fp-root::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(8,8,8,0.75) 0%, rgba(8,8,8,0.40) 60%, rgba(181,0,2,0.15) 100%);
          backdrop-filter: blur(2px);
        }
        .fp-root::after {
          content: ''; position: absolute; inset: 0;
          background-image: radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px);
          background-size: 28px 28px; pointer-events: none;
        }

        .fp-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 900px;
          background: transparent;
          border-radius: 22px;
          overflow: hidden;
          display: flex;
          flex-direction: row;
          min-height: 560px;
          border: none;
          box-shadow: 0 32px 80px rgba(0,0,0,0.45);
          animation: fadeUp 0.5s cubic-bezier(.2,.8,.2,1) forwards;
          transform: translateZ(0);
        }

        .fp-left {
          width: 42%;
          flex-shrink: 0;
          background: #ffffff;
          position: relative;
          border-top-left-radius: 22px;
          border-bottom-left-radius: 22px;
        }
        @media(max-width: 700px) { .fp-left { display: none; } .fp-card { min-height: unset; } }

        .fp-right {
          flex: 1;
          background: #F5F5F3;
          display: flex;
          flex-direction: column;
          padding: 36px 32px;
          overflow-y: auto;
        }
        @media(max-width: 480px) { .fp-right { padding: 28px 20px; } }

        .fp-back {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 12px; font-weight: 600; color: rgba(0,0,0,0.4);
          background: none; border: none; cursor: pointer; padding: 0;
          font-family: 'Space Grotesk', sans-serif; transition: color 0.15s;
          margin-bottom: 28px; text-decoration: none;
        }
        .fp-back:hover { color: #b50002; }

        .fp-eyebrow { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
        .fp-eyebrow-line { width: 18px; height: 1.5px; background: #b50002; border-radius: 2px; }
        .fp-eyebrow-txt { font-size: 10px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: #b50002; }
        .fp-title { font-size: clamp(20px, 2.5vw, 26px); font-weight: 800; color: #0E0E0E; letter-spacing: -0.6px; margin-bottom: 4px; }
        .fp-subtitle { font-size: 12.5px; color: rgba(0,0,0,0.42); line-height: 1.6; margin-bottom: 24px; }
        .fp-form { display: flex; flex-direction: column; gap: 14px; flex: 1; }

        .fp-footer {
          display: flex; align-items: center; justify-content: space-between;
          margin-top: auto; padding-top: 20px;
        }

        .fp-submit {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 11px 22px;
          border-radius: 12px;
          border: none;
          font-size: 13px;
          font-weight: 700;
          font-family: 'Space Grotesk', sans-serif;
          cursor: pointer;
          transition: all 0.18s;
        }
        .fp-submit:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.1); }
        .fp-submit:active:not(:disabled) { transform: translateY(0); }
        .fp-submit:disabled { opacity: 0.55; cursor: not-allowed; }
        .fp-submit-dark { background: #0E0E0E; color: #fff; }

        .fp-link { font-size: 12px; color: rgba(0,0,0,0.38); font-family: 'Space Grotesk', sans-serif; }
        .fp-link a { color: #b50002; font-weight: 700; text-decoration: none; }
        .fp-link a:hover { text-decoration: underline; }

        .fp-notice {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 11px 14px; border-radius: 10px;
          font-size: 12px; font-family: 'Space Grotesk', sans-serif;
          background: rgba(181,0,2,0.05); border: 1.5px solid rgba(181,0,2,0.12);
          color: rgba(0,0,0,0.55);
        }
      `}</style>

      <main className="fp-root">
        <div className="fp-card">
          {/* LEFT */}
          <div className="fp-left">
            <LeftPanel step={step} />
          </div>

          {/* RIGHT */}
          <div className="fp-right">
            {/* ── STEP 1 — Email ── */}
            {step === 1 && (
              <>
                <a href="/login" className="fp-back">
                  <FaArrowLeft style={{ fontSize: 10 }} /> Back to Login
                </a>
                <div style={{ marginBottom: 24 }}>
                  <div className="fp-eyebrow">
                    <div className="fp-eyebrow-line" />
                    <span className="fp-eyebrow-txt">Password Recovery</span>
                  </div>
                  <h1 className="fp-title">Reset Password</h1>
                  <p className="fp-subtitle">
                    Enter your email to receive a reset code
                  </p>
                </div>
                <form
                  onSubmit={handleRequestReset}
                  className="fp-form"
                  noValidate
                >
                  <Field
                    icon={FaEnvelope}
                    label="Email Address"
                    error={errors.email}
                  >
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errors.email)
                          setErrors((p) => {
                            const n = { ...p };
                            delete n.email;
                            return n;
                          });
                      }}
                      placeholder="juan@email.com"
                      required
                      maxLength={254}
                      style={inputBase}
                    />
                  </Field>

                  <div className="fp-footer">
                    <p className="fp-link">
                      Remember it? <a href="/login">Sign in</a>
                    </p>
                    <button
                      type="submit"
                      disabled={loading}
                      className="fp-submit fp-submit-dark"
                    >
                      {loading ? (
                        <>
                          <div
                            style={{
                              width: 13,
                              height: 13,
                              border: "2px solid rgba(255,255,255,0.3)",
                              borderTopColor: "#fff",
                              borderRadius: "50%",
                              animation: "spin 0.7s linear infinite",
                            }}
                          />{" "}
                          Sending…
                        </>
                      ) : (
                        <>
                          Send Reset OTP <FaKey style={{ fontSize: 9 }} />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* ── STEP 2 — OTP + New Password ── */}
            {step === 2 && (
              <>
                <button onClick={() => setStep(1)} className="fp-back">
                  <FaArrowLeft style={{ fontSize: 10 }} /> Back
                </button>
                <div style={{ marginBottom: 24 }}>
                  <div className="fp-eyebrow">
                    <div className="fp-eyebrow-line" />
                    <span className="fp-eyebrow-txt">New Password</span>
                  </div>
                  <h1 className="fp-title">Create New Password</h1>
                  <p className="fp-subtitle">
                    Enter your OTP and choose a new password
                  </p>
                </div>
                <form
                  onSubmit={handleResetPassword}
                  className="fp-form"
                  noValidate
                >
                  <div className="fp-notice">
                    <FaEnvelope
                      style={{
                        color: "#b50002",
                        fontSize: 11,
                        marginTop: 1,
                        flexShrink: 0,
                      }}
                    />
                    <span>
                      Reset code sent to{" "}
                      <strong style={{ color: "#0E0E0E" }}>{email}</strong>
                    </span>
                  </div>

                  <div>
                    <label
                      style={{
                        ...labelStyle,
                        textAlign: "center",
                        display: "block",
                        marginBottom: 12,
                      }}
                    >
                      One-Time Code
                    </label>
                    <OtpBoxInput value={otp} onChange={setOtp} length={6} />
                  </div>

                  {/* New Password */}
                  <div>
                    <label style={labelStyle}>New Password</label>
                    <div
                      style={{
                        ...inputWrapBase,
                        ...(errors.newPassword
                          ? { borderColor: "#b50002", background: "#FDF0F0" }
                          : null),
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#b50002";
                        e.currentTarget.style.background = errors.newPassword
                          ? "#FDF0F0"
                          : "#fff";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = errors.newPassword
                          ? "#b50002"
                          : "rgba(0,0,0,0.09)";
                        e.currentTarget.style.background = errors.newPassword
                          ? "#FDF0F0"
                          : "#F5F5F3";
                      }}
                    >
                      <FaLock style={iconBase} />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          if (errors.newPassword)
                            setErrors((p) => {
                              const n = { ...p };
                              delete n.newPassword;
                              return n;
                            });
                        }}
                        placeholder="Create new password"
                        required
                        maxLength={64}
                        style={{ ...inputBase, paddingRight: 40 }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: "absolute",
                          right: 12,
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "rgba(0,0,0,0.3)",
                          display: "flex",
                          alignItems: "center",
                          fontSize: 13,
                        }}
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                    {errors.newPassword && (
                      <p style={errorTextStyle}>{errors.newPassword}</p>
                    )}
                    {newPassword.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <PasswordStrengthMeter password={newPassword} />
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label style={labelStyle}>Confirm Password</label>
                    <div
                      style={{
                        ...inputWrapBase,
                        ...(errors.confirmPassword
                          ? { borderColor: "#b50002", background: "#FDF0F0" }
                          : null),
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#b50002";
                        e.currentTarget.style.background =
                          errors.confirmPassword ? "#FDF0F0" : "#fff";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor =
                          errors.confirmPassword
                            ? "#b50002"
                            : "rgba(0,0,0,0.09)";
                        e.currentTarget.style.background =
                          errors.confirmPassword ? "#FDF0F0" : "#F5F5F3";
                      }}
                    >
                      <FaLock style={iconBase} />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (errors.confirmPassword)
                            setErrors((p) => {
                              const n = { ...p };
                              delete n.confirmPassword;
                              return n;
                            });
                        }}
                        placeholder="Repeat new password"
                        required
                        maxLength={64}
                        style={{ ...inputBase, paddingRight: 40 }}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        style={{
                          position: "absolute",
                          right: 12,
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "rgba(0,0,0,0.3)",
                          display: "flex",
                          alignItems: "center",
                          fontSize: 13,
                        }}
                      >
                        {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                    {errors.confirmPassword ? (
                      <p style={errorTextStyle}>{errors.confirmPassword}</p>
                    ) : (
                      confirmPassword && (
                        <p
                          style={{
                            fontSize: 11,
                            marginTop: 6,
                            fontWeight: 600,
                            fontFamily: "'Space Grotesk', sans-serif",
                            color:
                              newPassword === confirmPassword
                                ? "#166534"
                                : "#b50002",
                          }}
                        >
                          {newPassword === confirmPassword
                            ? "Passwords match"
                            : "Passwords do not match"}
                        </p>
                      )
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={
                      !resendCooldown.canResend ||
                      resending ||
                      loading ||
                      resendLimitReached
                    }
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      fontFamily: "'Space Grotesk', sans-serif",
                      background: "none",
                      border: "none",
                      padding: 0,
                      textAlign: "left",
                      cursor:
                        resendCooldown.canResend &&
                        !resending &&
                        !loading &&
                        !resendLimitReached
                          ? "pointer"
                          : "not-allowed",
                      color:
                        resendCooldown.canResend &&
                        !resending &&
                        !loading &&
                        !resendLimitReached
                          ? "#b50002"
                          : "rgba(0,0,0,0.3)",
                    }}
                  >
                    {resendLimitReached
                      ? "Resend limit reached"
                      : !resendCooldown.canResend
                        ? `Resend OTP in ${formatCooldown(resendCooldown.remainingSeconds)}`
                        : "Didn't receive it? Resend OTP"}
                  </button>

                  {resendLimitReached && (
                    <p
                      style={{
                        fontSize: 11,
                        color: "#b50002",
                        fontFamily: "'Space Grotesk', sans-serif",
                        marginTop: -4,
                      }}
                    >
                      You've reached the resend limit. Please wait for the
                      current code to expire and request a new one.
                    </p>
                  )}

                  <div className="fp-footer">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="fp-back"
                      style={{ marginBottom: 0 }}
                    >
                      <FaArrowLeft style={{ fontSize: 10 }} /> Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="fp-submit fp-submit-dark"
                    >
                      {loading ? (
                        <>
                          <div
                            style={{
                              width: 13,
                              height: 13,
                              border: "2px solid rgba(255,255,255,0.3)",
                              borderTopColor: "#fff",
                              borderRadius: "50%",
                              animation: "spin 0.7s linear infinite",
                            }}
                          />{" "}
                          Resetting…
                        </>
                      ) : (
                        <>
                          Reset Password{" "}
                          <FaCheckCircle style={{ fontSize: 9 }} />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </main>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        theme="light"
        icon={false}
      />
    </>
  );
};

export default ForgotPassword;
