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
  FaChevronRight,
} from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import axios from "axios";
import API_BASE_URL from "../apiBase";
import useResendCooldown, { formatCooldown } from "../hooks/useResendCooldown";

const BG_IMAGE =
  "https://scontent.fmnl37-1.fna.fbcdn.net/v/t39.30808-6/643321928_923939463472253_7881434427328115220_n.jpg?stp=cp6_dst-jpg_tt6&_nc_cat=106&ccb=1-7&_nc_sid=833d8c&_nc_eui2=AeE2SS8aK8wmUiT7soUy9lcCtjWlJYbT7Fa2NaUlhtPsVjQn_xrGP7hhDGNQFzJLCMxSts5mEW09MZRism8m33rW&_nc_ohc=w_mEyN_G1w0Q7kNvwEuzxo0&_nc_oc=AdrqwFqxvoPuzpoVe4Ni-jWnGTvviWLld69mLVfJdsLvXa0TMiHknBFfsNeARPpSi2k&_nc_zt=23&_nc_ht=scontent.fmnl37-1.fna&_nc_gid=WWEO_z9thjGWUVEpCPRyZQ&_nc_ss=7b2a8&oh=00_Af47u4-rfzTNlbWawMGE_iSMFILqpFKX8OrKEk_YQu7qLw&oe=6A099F00";

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

/* ── OTP Box Input ───────────────────────────────────────────────── */
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
        const isFocused = false; // controlled via CSS :focus
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
            onChange={() => {}} // controlled via onKeyDown
            onFocus={(e) => e.target.select()}
            style={{
              width: 46,
              height: 54,
              borderRadius: 12,
              border: filled
                ? "2px solid #b50002"
                : "1.5px solid rgba(0,0,0,0.12)",
              background: filled ? "rgba(181,0,2,0.04)" : "#fff",
              fontSize: 22,
              fontWeight: 800,
              fontFamily: "'Space Grotesk', sans-serif",
              color: "#0E0E0E",
              textAlign: "center",
              outline: "none",
              transition:
                "border-color 0.15s, background 0.15s, transform 0.12s",
              cursor: "text",
              caretColor: "transparent",
              transform: filled ? "scale(1.04)" : "scale(1)",
              boxShadow: filled ? "0 2px 12px rgba(181,0,2,0.12)" : "none",
            }}
            onFocusCapture={(e) => {
              e.target.style.borderColor = "#b50002";
              e.target.style.background = "rgba(181,0,2,0.03)";
            }}
            onBlurCapture={(e) => {
              if (!e.target.value) {
                e.target.style.borderColor = "rgba(0,0,0,0.12)";
                e.target.style.background = "#fff";
              }
            }}
          />
        );
      })}
    </div>
  );
};

/* ── Field wrapper ───────────────────────────────────────────────── */
const Field = ({ icon: Icon, label, children }) => (
  <div>
    {label && <label style={labelStyle}>{label}</label>}
    <div
      style={inputWrapBase}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "#b50002";
        e.currentTarget.style.background = "#fff";
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "rgba(0,0,0,0.09)";
        e.currentTarget.style.background = "#F5F5F3";
      }}
    >
      {Icon && <Icon style={iconBase} />}
      {children}
    </div>
  </div>
);

/* ── Left panel ──────────────────────────────────────────────────── */
const FEATURES = [
  { icon: FaMotorcycle, text: "Wide selection of vehicles" },
  { icon: FaCheckCircle, text: "Easy & secure booking process" },
  { icon: FaMapMarkerAlt, text: "Pickup in Bacoor, Cavite" },
  { icon: FaIdCard, text: "Transparent pricing, no hidden fees" },
];

const PANEL_COPY = {
  1: {
    heading: ["Welcome", "back."],
    sub: "Sign in to access your account and manage your bookings.",
  },
  2: {
    heading: ["Verify", "your login."],
    sub: "A one-time code was sent to your email to keep your account secure.",
  },
  3: {
    heading: ["Verify", "your email."],
    sub: "Enter the code we sent to activate your account.",
  },
};

const LeftPanel = ({ step }) => {
  const { heading, sub } = PANEL_COPY[step] || PANEL_COPY[1];
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        height: "100%",
        padding: "36px 32px",
        overflow: "hidden",
      }}
    >
      {/* Red radial glow */}
      <div
        style={{
          position: "absolute",
          bottom: -60,
          right: -60,
          width: 220,
          height: 220,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(181,0,2,0.4) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      {/* Dot grid accent */}
      <div
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          width: 80,
          height: 80,
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)",
          backgroundSize: "12px 12px",
          pointerEvents: "none",
        }}
      />

      {/* Brand */}
      <div style={{ position: "relative", zIndex: 1 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 36,
          }}
        >
          <FaMotorcycle
            style={{ color: "rgba(255,255,255,0.3)", fontSize: 14 }}
          />
          <div>
            <p
              style={{
                color: "#fff",
                fontWeight: 800,
                fontSize: 13,
                fontFamily: "'Space Grotesk', sans-serif",
                letterSpacing: "-0.2px",
                lineHeight: 1,
              }}
            >
              Anaia's Motorcycle Rental
            </p>
            <p
              style={{
                color: "rgba(255,255,255,0.35)",
                fontSize: 10,
                fontFamily: "'Space Grotesk', sans-serif",
                marginTop: 2,
              }}
            >
              Bacoor, Cavite
            </p>
          </div>
        </div>

        <h2
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "clamp(28px, 3.5vw, 38px)",
            fontWeight: 800,
            color: "#fff",
            letterSpacing: "-1px",
            lineHeight: 1.05,
            marginBottom: 14,
          }}
        >
          {heading[0]}
          <br />
          {heading[1]}
        </h2>
        <p
          style={{
            fontSize: 13,
            color: "rgba(255,255,255,0.45)",
            fontFamily: "'Space Grotesk', sans-serif",
            lineHeight: 1.7,
            maxWidth: 240,
          }}
        >
          {sub}
        </p>
      </div>

      {/* Features */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
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
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon style={{ color: "rgba(255,255,255,0.55)", fontSize: 11 }} />
            </div>
            <span
              style={{
                color: "rgba(255,255,255,0.55)",
                fontSize: 12,
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 500,
              }}
            >
              {text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── Main Component ──────────────────────────────────────────────── */
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
  const [resendingVerificationOtp, setResendingVerificationOtp] =
    useState(false);

  const loginOtpCooldown = useResendCooldown({
    storageKey: credentials.email
      ? `otpCooldown:loginOtp:${credentials.email}`
      : null,
    cooldownSeconds: 60,
  });
  const verificationOtpCooldown = useResendCooldown({
    storageKey: unverifiedEmail
      ? `otpCooldown:verifyEmail:${unverifiedEmail}`
      : null,
    cooldownSeconds: 60,
  });

  const handleChange = (e) =>
    setCredentials((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleResendVerification = async () => {
    if (
      !verificationOtpCooldown.canResend ||
      resendingVerificationOtp ||
      loading
    )
      return;
    if (!unverifiedEmail) {
      toast.error("Email is missing");
      return;
    }
    setResendingVerificationOtp(true);
    try {
      await axios.post(`${API_BASE}/api/auth/resend-verification-otp`, {
        email: unverifiedEmail,
      });
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
      } else toast.error("Unable to resend OTP");
    } catch (err) {
      if (err.response?.data?.needsVerification) {
        setNeedsVerification(true);
        setUnverifiedEmail(credentials.email);
        toast.error("Please verify your email first.", { autoClose: 5000 });
        setStep(1);
      } else toast.error(err.response?.data?.message || "Failed to resend OTP");
    } finally {
      setResendingLoginOtp(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setNeedsVerification(false);
    try {
      const res = await axios.post(`${API_BASE}/api/auth/login`, credentials, {
        headers: { "Content-Type": "application/json" },
      });
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
      } else toast.error(err.response?.data?.message || "Login failed");
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
        { email: credentials.email, otp: otp.trim() },
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
        { email: unverifiedEmail, otp: verificationOtp.trim() },
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

  const submitBtn = (label, loadingLabel, color = "#0E0E0E") => ({
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "11px 24px",
    borderRadius: 12,
    border: "none",
    background: color,
    color: "#fff",
    fontSize: 13,
    fontWeight: 700,
    fontFamily: "'Space Grotesk', sans-serif",
    cursor: loading ? "not-allowed" : "pointer",
    opacity: loading ? 0.6 : 1,
    transition: "all 0.18s",
  });

  const resendBtnStyle = (canResend) => ({
    fontSize: 12,
    fontWeight: 600,
    fontFamily: "'Space Grotesk', sans-serif",
    background: "none",
    border: "none",
    padding: 0,
    cursor: canResend ? "pointer" : "not-allowed",
    color: canResend ? "#b50002" : "rgba(0,0,0,0.3)",
    textAlign: "left",
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes spin { to { transform: rotate(360deg); } }

        .lg-root {
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          font-family: 'Space Grotesk', sans-serif;
          background-image: url('${BG_IMAGE}');
          background-size: cover;
          background-position: center;
          position: relative;
        }
        .lg-root::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            linear-gradient(135deg, rgba(8,8,8,0.75) 0%, rgba(8,8,8,0.40) 60%, rgba(181,0,2,0.15) 100%);
          backdrop-filter: blur(2px);
        }
        /* dot grid */
        .lg-root::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px);
          background-size: 28px 28px;
          pointer-events: none;
        }

        .lg-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 900px;
          background: transparent; /* <-- Changed from #fff to transparent */
          border-radius: 22px;
          overflow: hidden;
          display: flex;
          flex-direction: row;
          min-height: 560px;
          border: none; 
          box-shadow: 0 32px 80px rgba(0,0,0,0.45);
          animation: fadeUp 0.5s cubic-bezier(.2,.8,.2,1) forwards;
          
          /* This forces hardware acceleration, which helps Safari/Chrome clip corners cleanly */
          transform: translateZ(0); 
        }

        .lg-left {
          width: 42%;
          flex-shrink: 0;
          background: #0E0E0E;
          position: relative;
          /* Add these two lines to match the parent's radius */
          border-top-left-radius: 22px; 
          border-bottom-left-radius: 22px;
        }
        @media(max-width: 700px) { .lg-left { display: none; } .lg-card { min-height: unset; } }

        .lg-right {
          flex: 1;
          background: #F5F5F3;
          display: flex;
          flex-direction: column;
          padding: 36px 32px;
          overflow-y: auto;
        }
        @media(max-width: 480px) { .lg-right { padding: 28px 20px; } }

        .lg-back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          color: rgba(0,0,0,0.4);
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          font-family: 'Space Grotesk', sans-serif;
          transition: color 0.15s;
          margin-bottom: 28px;
          text-decoration: none;
        }
        .lg-back:hover { color: #b50002; }

        .lg-heading-row { margin-bottom: 28px; }
        .lg-eyebrow { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
        .lg-eyebrow-line { width: 18px; height: 1.5px; background: #b50002; border-radius: 2px; }
        .lg-eyebrow-txt { font-size: 10px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: #b50002; }
        .lg-title { font-size: clamp(20px, 2.5vw, 26px); font-weight: 800; color: #0E0E0E; letter-spacing: -0.6px; margin-bottom: 4px; }
        .lg-subtitle { font-size: 12.5px; color: rgba(0,0,0,0.42); line-height: 1.6; }

        .lg-form { display: flex; flex-direction: column; gap: 14px; flex: 1; }

        .lg-divider { border: none; border-top: 1.5px solid rgba(0,0,0,0.06); margin: 6px 0; }

        .lg-notice {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 11px 14px;
          border-radius: 10px;
          font-size: 12px;
          font-family: 'Space Grotesk', sans-serif;
        }
        .lg-notice-red { background: rgba(181,0,2,0.05); border: 1.5px solid rgba(181,0,2,0.12); color: rgba(0,0,0,0.55); }
        .lg-notice-amber { background: rgba(245,158,11,0.07); border: 1.5px solid rgba(245,158,11,0.2); color: rgba(0,0,0,0.55); }

        .lg-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: auto;
          padding-top: 20px;
        }

        .lg-submit {
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
        .lg-submit:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.1); }
        .lg-submit:active:not(:disabled) { transform: translateY(0); }
        .lg-submit:disabled { opacity: 0.55; cursor: not-allowed; }
        .lg-submit-dark { background: #0E0E0E; color: #fff; }
        .lg-submit-red { background: #b50002; color: #fff; }

        .lg-link { font-size: 12px; color: rgba(0,0,0,0.38); font-family: 'Space Grotesk', sans-serif; }
        .lg-link a { color: #b50002; font-weight: 700; text-decoration: none; }
        .lg-link a:hover { text-decoration: underline; }

        .lg-forgot { font-size: 11.5px; font-weight: 700; color: #b50002; text-decoration: none; text-align: right; display: block; }
        .lg-forgot:hover { text-decoration: underline; }
      `}</style>

      <div className="lg-root">
        <div className="lg-card">
          {/* LEFT — brand panel */}
          <div className="lg-left">
            <LeftPanel step={step} />
          </div>

          {/* RIGHT — form */}
          <div className="lg-right">
            <a href="/" className="lg-back">
              <FaArrowLeft style={{ fontSize: 10 }} /> Back to Home
            </a>

            <div className="lg-heading-row">
              <div className="lg-eyebrow">
                <div className="lg-eyebrow-line" />
                <span className="lg-eyebrow-txt">
                  {step === 1
                    ? "Authentication"
                    : step === 2
                      ? "OTP Verification"
                      : "Email Verification"}
                </span>
              </div>
              <h1 className="lg-title">
                {step === 1 && "Sign In"}
                {step === 2 && "Verify Login"}
                {step === 3 && "Verify Your Email"}
              </h1>
              <p className="lg-subtitle">
                {step === 1 && "Enter your credentials to continue"}
                {step === 2 && "Enter the 6-digit code sent to your email"}
                {step === 3 && "Enter the verification code we sent you"}
              </p>
            </div>

            {/* ── STEP 1 — Credentials ── */}
            {step === 1 && (
              <form onSubmit={handleSubmit} className="lg-form">
                <Field icon={FaEnvelope} label="Email Address">
                  <input
                    type="email"
                    name="email"
                    value={credentials.email}
                    onChange={handleChange}
                    placeholder="juan@email.com"
                    required
                    maxLength={254}
                    style={inputBase}
                  />
                </Field>

                <div>
                  <label style={labelStyle}>Password</label>
                  <div
                    style={inputWrapBase}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "#b50002";
                      e.currentTarget.style.background = "#fff";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "rgba(0,0,0,0.09)";
                      e.currentTarget.style.background = "#F5F5F3";
                    }}
                  >
                    <FaLock style={iconBase} />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={credentials.password}
                      onChange={handleChange}
                      placeholder="Enter your password"
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
                </div>

                <div style={{ textAlign: "right", marginTop: -4 }}>
                  <a href="/forgot-password" className="lg-forgot">
                    Forgot Password?
                  </a>
                </div>

                {needsVerification && (
                  <div className="lg-notice lg-notice-amber">
                    <FaShieldAlt
                      style={{
                        color: "#d97706",
                        fontSize: 11,
                        marginTop: 1,
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <p
                        style={{
                          fontWeight: 700,
                          color: "#92400e",
                          fontSize: 11,
                          marginBottom: 4,
                        }}
                      >
                        Email not verified
                      </p>
                      <button
                        type="button"
                        onClick={handleResendVerification}
                        disabled={
                          !verificationOtpCooldown.canResend ||
                          resendingVerificationOtp ||
                          loading
                        }
                        style={resendBtnStyle(
                          verificationOtpCooldown.canResend &&
                            !resendingVerificationOtp &&
                            !loading,
                        )}
                      >
                        {!verificationOtpCooldown.canResend
                          ? `Resend in ${formatCooldown(verificationOtpCooldown.remainingSeconds)}`
                          : "Resend Verification Email"}
                      </button>
                    </div>
                  </div>
                )}

                <div className="lg-footer">
                  <p className="lg-link">
                    No account? <a href="/signup">Create one</a>
                  </p>
                  <button
                    type="submit"
                    disabled={loading}
                    className="lg-submit lg-submit-dark"
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
                        Signing in…
                      </>
                    ) : (
                      <>
                        Sign In <FaChevronRight style={{ fontSize: 9 }} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* ── STEP 2 — Login OTP ── */}
            {step === 2 && (
              <form onSubmit={handleVerifyLoginOTP} className="lg-form">
                <div className="lg-notice lg-notice-red">
                  <FaEnvelope
                    style={{
                      color: "#b50002",
                      fontSize: 11,
                      marginTop: 1,
                      flexShrink: 0,
                    }}
                  />
                  <span>
                    Code sent to{" "}
                    <strong style={{ color: "#0E0E0E" }}>
                      {credentials.email}
                    </strong>
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

                <button
                  type="button"
                  onClick={handleResendLoginOTP}
                  disabled={
                    !loginOtpCooldown.canResend || resendingLoginOtp || loading
                  }
                  style={resendBtnStyle(
                    loginOtpCooldown.canResend &&
                      !resendingLoginOtp &&
                      !loading,
                  )}
                >
                  {!loginOtpCooldown.canResend
                    ? `Resend OTP in ${formatCooldown(loginOtpCooldown.remainingSeconds)}`
                    : "Didn't receive it? Resend OTP"}
                </button>

                <div className="lg-footer">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="lg-back"
                    style={{ marginBottom: 0 }}
                  >
                    <FaArrowLeft style={{ fontSize: 10 }} /> Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="lg-submit lg-submit-dark"
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
                        Verifying…
                      </>
                    ) : (
                      <>
                        Verify & Login{" "}
                        <FaChevronRight style={{ fontSize: 9 }} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* ── STEP 3 — Email Verification OTP ── */}
            {step === 3 && (
              <form onSubmit={handleVerifyEmail} className="lg-form">
                <div className="lg-notice lg-notice-red">
                  <FaEnvelope
                    style={{
                      color: "#b50002",
                      fontSize: 11,
                      marginTop: 1,
                      flexShrink: 0,
                    }}
                  />
                  <span>
                    Code sent to{" "}
                    <strong style={{ color: "#0E0E0E" }}>
                      {unverifiedEmail}
                    </strong>
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
                    Verification Code
                  </label>
                  <OtpBoxInput
                    value={verificationOtp}
                    onChange={setVerificationOtp}
                    length={6}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={
                    !verificationOtpCooldown.canResend ||
                    resendingVerificationOtp ||
                    loading
                  }
                  style={resendBtnStyle(
                    verificationOtpCooldown.canResend &&
                      !resendingVerificationOtp &&
                      !loading,
                  )}
                >
                  {!verificationOtpCooldown.canResend
                    ? `Resend OTP in ${formatCooldown(verificationOtpCooldown.remainingSeconds)}`
                    : "Didn't receive it? Resend OTP"}
                </button>

                <div className="lg-footer">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setNeedsVerification(false);
                    }}
                    className="lg-back"
                    style={{ marginBottom: 0 }}
                  >
                    <FaArrowLeft style={{ fontSize: 10 }} /> Back to Login
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="lg-submit lg-submit-red"
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
                        Verifying…
                      </>
                    ) : (
                      <>
                        Verify Email <FaChevronRight style={{ fontSize: 9 }} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

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
