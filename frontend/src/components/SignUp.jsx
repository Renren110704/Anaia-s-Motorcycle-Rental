import React, { useState, useEffect, useCallback } from "react";
import {
  FaArrowLeft,
  FaArrowRight,
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaLock,
  FaUser,
  FaPhone,
  FaMapMarkerAlt,
  FaChevronDown,
  FaMotorcycle,
  FaCheckCircle,
  FaIdCard,
  FaChevronRight,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import PasswordStrengthMeter from "../components/PasswordStrengthMeter";
import axios from "axios";
// import bgImage from "../assets/bgImage2.jpg";
import API_BASE_URL from "../apiBase";
import useResendCooldown, { formatCooldown } from "../hooks/useResendCooldown";

const PH_API = "https://psgc.gitlab.io/api";

/* ── PH Address hook (unchanged logic) ──────────────────────────── */
const usePHAddress = () => {
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [hasProvinces, setHasProvinces] = useState(false);
  const [loading, setLoading] = useState({
    regions: false,
    provinces: false,
    cities: false,
    barangays: false,
  });

  const fetchRegions = useCallback(async () => {
    setLoading((p) => ({ ...p, regions: true }));
    try {
      const res = await axios.get(`${PH_API}/regions/`);
      setRegions(res.data.sort((a, b) => a.name.localeCompare(b.name)));
    } catch {
      toast.error("Failed to load regions");
    } finally {
      setLoading((p) => ({ ...p, regions: false }));
    }
  }, []);

  const fetchProvinces = useCallback(async (regionCode) => {
    if (!regionCode) {
      setProvinces([]);
      setCities([]);
      setBarangays([]);
      setHasProvinces(false);
      return;
    }
    setLoading((p) => ({ ...p, provinces: true }));
    setCities([]);
    setBarangays([]);
    try {
      const res = await axios.get(`${PH_API}/regions/${regionCode}/provinces/`);
      const data = res.data || [];
      if (data.length > 0) {
        setProvinces(data.sort((a, b) => a.name.localeCompare(b.name)));
        setHasProvinces(true);
      } else {
        setProvinces([]);
        setHasProvinces(false);
        setLoading((p) => ({ ...p, cities: true }));
        try {
          const r2 = await axios.get(
            `${PH_API}/regions/${regionCode}/cities-municipalities/`,
          );
          setCities(
            (r2.data || []).sort((a, b) => a.name.localeCompare(b.name)),
          );
        } catch {
          toast.error("Failed to load cities");
        } finally {
          setLoading((p) => ({ ...p, cities: false }));
        }
      }
    } catch {
      setProvinces([]);
      setHasProvinces(false);
      setLoading((p) => ({ ...p, cities: true }));
      try {
        const r2 = await axios.get(
          `${PH_API}/regions/${regionCode}/cities-municipalities/`,
        );
        setCities((r2.data || []).sort((a, b) => a.name.localeCompare(b.name)));
      } catch {
        toast.error("Failed to load cities");
      } finally {
        setLoading((p) => ({ ...p, cities: false }));
      }
    } finally {
      setLoading((p) => ({ ...p, provinces: false }));
    }
  }, []);

  const fetchCities = useCallback(async (provinceCode) => {
    if (!provinceCode) {
      setCities([]);
      setBarangays([]);
      return;
    }
    setLoading((p) => ({ ...p, cities: true }));
    try {
      const res = await axios.get(
        `${PH_API}/provinces/${provinceCode}/cities-municipalities/`,
      );
      setCities((res.data || []).sort((a, b) => a.name.localeCompare(b.name)));
      setBarangays([]);
    } catch {
      toast.error("Failed to load cities");
    } finally {
      setLoading((p) => ({ ...p, cities: false }));
    }
  }, []);

  const fetchBarangays = useCallback(async (cityCode) => {
    if (!cityCode) {
      setBarangays([]);
      return;
    }
    setLoading((p) => ({ ...p, barangays: true }));
    try {
      const res = await axios.get(
        `${PH_API}/cities-municipalities/${cityCode}/barangays/`,
      );
      setBarangays(
        (res.data || []).sort((a, b) => a.name.localeCompare(b.name)),
      );
    } catch {
      toast.error("Failed to load barangays");
    } finally {
      setLoading((p) => ({ ...p, barangays: false }));
    }
  }, []);

  useEffect(() => {
    fetchRegions();
  }, [fetchRegions]);

  return {
    regions,
    provinces,
    cities,
    barangays,
    hasProvinces,
    loading,
    fetchProvinces,
    fetchCities,
    fetchBarangays,
  };
};

/* ── OTP Box Input (same as Login) ──────────────────────────────── */
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

/* ── Shared style tokens (same as Login) ─────────────────────────── */
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

const SelectField = ({ icon: Icon, label, children }) => (
  <div>
    {label && <label style={labelStyle}>{label}</label>}
    <div
      style={{ ...inputWrapBase, position: "relative" }}
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
      <FaChevronDown
        style={{
          position: "absolute",
          right: 12,
          color: "rgba(0,0,0,0.3)",
          fontSize: 10,
          pointerEvents: "none",
        }}
      />
    </div>
  </div>
);

/* ── Left Panel (same brand, 3-step indicators) ──────────────────── */
const FEATURES = [
  { icon: FaMotorcycle, text: "Wide selection of vehicles" },
  { icon: FaCheckCircle, text: "Easy & secure booking process" },
  { icon: FaMapMarkerAlt, text: "Pickup in Bacoor, Cavite" },
  { icon: FaIdCard, text: "Transparent pricing, no hidden fees" },
];

const PANEL_COPY = {
  1: {
    heading: ["Tell us", "about you."],
    sub: "Create your account in a few steps. Start with your personal details.",
  },
  2: {
    heading: ["Where are", "you located?"],
    sub: "We need your address to process bookings and keep your account secure.",
  },
  3: {
    heading: ["Almost", "there!"],
    sub: "Verify your email to activate your account and start renting.",
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

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Brand */}
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

        {/* Step badge */}
        <div style={{ marginBottom: 8 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "3px",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.45)",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            Step {step} of 3
          </span>
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
            marginBottom: 20,
          }}
        >
          {sub}
        </p>

        {/* Step dots */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              style={{
                borderRadius: 9999,
                transition: "all 0.3s",
                width: s === step ? 28 : 10,
                height: 10,
                background:
                  s === step
                    ? "#b50002"
                    : s < step
                      ? "rgba(255,255,255,0.6)"
                      : "rgba(255,255,255,0.2)",
              }}
            />
          ))}
        </div>
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

/* ── Terms Modal ─────────────────────────────────────────────────── */
const TermsModal = ({ onClose, onAccept }) => (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.6)",
      backdropFilter: "blur(4px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 50,
      padding: 16,
    }}
    onClick={onClose}
  >
    <div
      style={{
        background: "#fff",
        borderRadius: 20,
        padding: 28,
        maxWidth: 640,
        width: "100%",
        maxHeight: "80vh",
        overflowY: "auto",
        boxShadow: "0 32px 80px rgba(0,0,0,0.3)",
        fontFamily: "'Space Grotesk', sans-serif",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h2
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: "#0E0E0E",
            letterSpacing: "-0.5px",
          }}
        >
          Terms & Conditions
        </h2>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 22,
            color: "rgba(0,0,0,0.4)",
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>
      <p style={{ fontSize: 11, color: "rgba(0,0,0,0.4)", marginBottom: 16 }}>
        Last updated: March 24, 2026
      </p>
      <div
        style={{
          color: "#333",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {[
          [
            "1. Acceptance of Terms",
            "By accessing and using the CheckMoto system and checking the 'I Agree' box during registration, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions and the Data Privacy Policy.",
          ],
          [
            "2. Rental Term",
            "The rental term runs from the date and hour of unit pick-up until the return of the unit to the owner and completion of all terms. The renter must return the unit in the same good operating condition on the due date specified. No credit will be issued for any unused rental time.",
          ],
          [
            "3. Reservation and Cancellation",
            "Cancellations made 2 days or more in advance of the scheduled date will receive a 100% refund. If the LESSEE/RENTER cancels the reservation with less notice, the LESSOR has all rights to forfeit the RESERVATION FEE paid.",
          ],
          [
            "4. Release and Return",
            "The renter must return the unit together with the original tires and accessories in substantially the same condition as pick-up. Upon violation of any condition of this contract, the company may demand immediate return of the unit.",
          ],
          [
            "5. Ownership and Repossession",
            "The unit remains property of Anaia's Motorcycle Rental. In case of default or non-payment, the LESSOR reserves the right to immediate repossession of the unit at the LESSEE's cost. If not returned on the due date, the unit will be reported as car-napped.",
          ],
          [
            "6. Authorized Drivers",
            "Only validly licensed individuals named on the Rental Agreement with the renter's permission may operate the rental unit. All authorized drivers must have a valid driver's license at the time of rental.",
          ],
          [
            "7. Prohibited Uses",
            "The LESSEE/RENTER shall not: (1) Allow use by an unauthorized driver, (2) Drive while intoxicated or under the influence, (3) Wear flip flops/slippers when riding, (4) Use for delivery services (Angkas, Lalamove, Grab, etc.), (5) Use outside the allowed area without penalty.",
          ],
          [
            "8. Traffic Law Violations",
            "LESSEE will pay for all fines and penalties related to traffic violations, parking fines, and towing expenses.",
          ],
          [
            "9. Liability and Insurance",
            "The renter is obliged to compensate Anaia's Motorcycle Rental for entire damages caused due to the renter's negligence.",
          ],
          [
            "10. Responsibility for Damage",
            "LESSEE is responsible for the FULL VALUE of any damage regardless of fault. Must report to the nearest police station and inform the lessor within 24 hours of any damage or loss.",
          ],
          [
            "11. Fuel Responsibility",
            "LESSEE is responsible for returning the vehicle with the same fuel level as received.",
          ],
          [
            "12. Failure to Return",
            "If LESSEE fails to return the vehicle on the due date without a permitted extension, LESSEE may be subject to warrant for arrest.",
          ],
          [
            "13. Entire Agreement",
            "This Motorcycle Lease Agreement constitutes the entire agreement and cannot be amended unless in writing and signed by both parties.",
          ],
        ].map(([title, text]) => (
          <section key={title}>
            <h3
              style={{
                fontWeight: 700,
                fontSize: 14,
                marginBottom: 4,
                color: "#0E0E0E",
              }}
            >
              {title}
            </h3>
            <p style={{ fontSize: 13, lineHeight: 1.7 }}>{text}</p>
          </section>
        ))}
      </div>
      <div
        style={{
          marginTop: 24,
          display: "flex",
          justifyContent: "flex-end",
          gap: 10,
        }}
      >
        <button
          onClick={onClose}
          style={{
            padding: "10px 20px",
            borderRadius: 12,
            border: "none",
            background: "#F5F5F3",
            color: "#0E0E0E",
            fontWeight: 700,
            fontSize: 13,
            fontFamily: "'Space Grotesk', sans-serif",
            cursor: "pointer",
          }}
        >
          Close
        </button>
        <button
          onClick={onAccept}
          style={{
            padding: "10px 20px",
            borderRadius: 12,
            border: "none",
            background: "#0E0E0E",
            color: "#fff",
            fontWeight: 700,
            fontSize: 13,
            fontFamily: "'Space Grotesk', sans-serif",
            cursor: "pointer",
          }}
        >
          Accept Terms
        </button>
      </div>
    </div>
  </div>
);

/* ── Main Component ──────────────────────────────────────────────── */
const SignUp = () => {
  const API_BASE = API_BASE_URL;
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [address, setAddress] = useState({
    regionCode: "",
    regionName: "",
    provinceCode: "",
    provinceName: "",
    cityCode: "",
    cityName: "",
    barangayCode: "",
    barangayName: "",
    zipCode: "",
  });
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const resendCooldown = useResendCooldown({
    storageKey: formData.email
      ? `otpCooldown:signupVerify:${formData.email}`
      : null,
    cooldownSeconds: 60,
  });

  const {
    regions,
    provinces,
    cities,
    barangays,
    hasProvinces,
    loading: addrLoading,
    fetchProvinces,
    fetchCities,
    fetchBarangays,
  } = usePHAddress();

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "phone") {
      setFormData((p) => ({ ...p, phone: value.replace(/\D/g, "") }));
      return;
    }
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleRegionChange = (e) => {
    const code = e.target.value;
    const name = regions.find((r) => r.code === code)?.name || "";
    setAddress((p) => ({
      ...p,
      regionCode: code,
      regionName: name,
      provinceCode: "",
      provinceName: "",
      cityCode: "",
      cityName: "",
      barangayCode: "",
      barangayName: "",
    }));
    fetchProvinces(code);
  };
  const handleProvinceChange = (e) => {
    const code = e.target.value;
    const name = provinces.find((p) => p.code === code)?.name || "";
    setAddress((p) => ({
      ...p,
      provinceCode: code,
      provinceName: name,
      cityCode: "",
      cityName: "",
      barangayCode: "",
      barangayName: "",
    }));
    fetchCities(code);
  };
  const handleCityChange = (e) => {
    const code = e.target.value;
    const name = cities.find((c) => c.code === code)?.name || "";
    setAddress((p) => ({
      ...p,
      cityCode: code,
      cityName: name,
      barangayCode: "",
      barangayName: "",
    }));
    fetchBarangays(code);
  };
  const handleBarangayChange = (e) => {
    const code = e.target.value;
    const name = barangays.find((b) => b.code === code)?.name || "";
    setAddress((p) => ({ ...p, barangayCode: code, barangayName: name }));
  };

  const getPasswordStrength = (pass) => {
    let s = 0;
    if (pass.length >= 6) s++;
    if (pass.match(/[a-z]/) && pass.match(/[A-Z]/)) s++;
    if (pass.match(/\d/)) s++;
    if (pass.match(/[^a-zA-Z\d]/)) s++;
    return s;
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error("First name and last name are required");
      return;
    }
    if (!formData.email.trim()) {
      toast.error("Email address is required");
      return;
    }
    if (!formData.phone || !/^09\d{9}$/.test(formData.phone)) {
      toast.error("Phone number must be in format 09xxxxxxxxx (11 digits)");
      return;
    }
    if (getPasswordStrength(formData.password) < 4) {
      toast.error("Password must be Strong (meet all criteria)");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!acceptedTerms) {
      toast.error("Please accept terms & conditions");
      return;
    }
    if (!address.barangayCode || !address.cityCode) {
      toast.error("Please complete your address (up to barangay)");
      return;
    }
    setLoading(true);
    try {
      const { confirmPassword, ...rest } = formData;
      const payload = {
        ...rest,
        address: {
          region: address.regionName,
          province: address.provinceName,
          city: address.cityName,
          barangay: address.barangayName,
          zipCode: address.zipCode,
        },
      };
      const res = await axios.post(`${API_BASE}/api/auth/register`, payload, {
        headers: { "Content-Type": "application/json" },
      });
      if (res.status >= 200 && res.status < 300) {
        toast.success(
          "Registration successful! Please check your email for OTP.",
        );
        resendCooldown.startCooldown();
        setStep(3);
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || err.message || "Registration failed",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(
        `${API_BASE}/api/auth/verify-email`,
        { email: formData.email, otp },
        { headers: { "Content-Type": "application/json" } },
      );
      if (res.status >= 200 && res.status < 300) {
        const { token, user } = res.data || {};
        if (token) localStorage.setItem("token", token);
        if (user) localStorage.setItem("user", JSON.stringify(user));
        toast.success("Email verified! Welcome!", {
          autoClose: 1200,
          onClose: () => navigate("/"),
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid or expired OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!resendCooldown.canResend || resending || loading) return;
    if (!formData.email) {
      toast.error("Email is missing");
      return;
    }
    setResending(true);
    try {
      await axios.post(`${API_BASE}/api/auth/resend-verification-otp`, {
        email: formData.email,
      });
      toast.success("OTP resent successfully!");
      resendCooldown.startCooldown();
    } catch {
      toast.error("Failed to resend OTP");
    } finally {
      setResending(false);
    }
  };

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

  const BG_URL = "https://scontent.fmnl37-1.fna.fbcdn.net/v/t39.30808-6/643321928_923939463472253_7881434427328115220_n.jpg?stp=cp6_dst-jpg_tt6&_nc_cat=106&ccb=1-7&_nc_sid=833d8c&_nc_eui2=AeE2SS8aK8wmUiT7soUy9lcCtjWlJYbT7Fa2NaUlhtPsVjQn_xrGP7hhDGNQFzJLCMxSts5mEW09MZRism8m33rW&_nc_ohc=w_mEyN_G1w0Q7kNvwEuzxo0&_nc_oc=AdrqwFqxvoPuzpoVe4Ni-jWnGTvviWLld69mLVfJdsLvXa0TMiHknBFfsNeARPpSi2k&_nc_zt=23&_nc_ht=scontent.fmnl37-1.fna&_nc_gid=WWEO_z9thjGWUVEpCPRyZQ&_nc_ss=7b2a8&oh=00_Af47u4-rfzTNlbWawMGE_iSMFILqpFKX8OrKEk_YQu7qLw&oe=6A099F00";
  // const BG_URL = typeof bgImage === "string" ? bgImage : "";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }

        .su-root {
          min-height: 100vh; width: 100%;
          display: flex; align-items: center; justify-content: center;
          padding: 24px; font-family: 'Space Grotesk', sans-serif;
          background-image: url('${BG_URL}');
          background-size: cover; background-position: center;
          position: relative;
        }
        .su-root::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(8,8,8,0.75) 0%, rgba(8,8,8,0.40) 60%, rgba(181,0,2,0.15) 100%);
          backdrop-filter: blur(2px);
        }
        .su-root::after {
          content: ''; position: absolute; inset: 0;
          background-image: radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px);
          background-size: 28px 28px; pointer-events: none;
        }
        .su-card {
          position: relative; z-index: 1; width: 100%; max-width: 960px;
          border-radius: 22px; overflow: hidden;
          display: flex; flex-direction: row; min-height: 600px;
          box-shadow: 0 32px 80px rgba(0,0,0,0.45);
          animation: fadeUp 0.5s cubic-bezier(.2,.8,.2,1) forwards;
          transform: translateZ(0);
        }
        .su-left {
          width: 40%; flex-shrink: 0; background: #0E0E0E;
          border-top-left-radius: 22px; border-bottom-left-radius: 22px;
        }
        @media(max-width: 700px) { .su-left { display: none; } .su-card { min-height: unset; } }
        .su-right {
          flex: 1; background: #F5F5F3;
          display: flex; flex-direction: column;
          padding: 36px 32px; overflow-y: auto;
        }
        @media(max-width: 480px) { .su-right { padding: 28px 20px; } }
        .su-back {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 12px; font-weight: 600; color: rgba(0,0,0,0.4);
          background: none; border: none; cursor: pointer; padding: 0;
          font-family: 'Space Grotesk', sans-serif; transition: color 0.15s;
          margin-bottom: 28px; text-decoration: none;
        }
        .su-back:hover { color: #b50002; }
        .su-eyebrow { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
        .su-eyebrow-line { width: 18px; height: 1.5px; background: #b50002; border-radius: 2px; }
        .su-eyebrow-txt { font-size: 10px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: #b50002; }
        .su-title { font-size: clamp(20px, 2.5vw, 26px); font-weight: 800; color: #0E0E0E; letter-spacing: -0.6px; margin-bottom: 4px; }
        .su-subtitle { font-size: 12.5px; color: rgba(0,0,0,0.42); line-height: 1.6; margin-bottom: 24px; }
        .su-form { display: flex; flex-direction: column; gap: 14px; flex: 1; }
        .su-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media(max-width: 560px) { .su-grid-2 { grid-template-columns: 1fr; } }
        .su-section-label {
          font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;
          color: rgba(0,0,0,0.3); margin-bottom: 8px; font-family: 'Space Grotesk', sans-serif;
        }
        .su-footer {
          display: flex; align-items: center; justify-content: space-between;
          margin-top: auto; padding-top: 20px;
        }
        .su-submit {
          display: flex; align-items: center; gap: 8px;
          padding: 11px 22px; border-radius: 12px; border: none;
          font-size: 13px; font-weight: 700; font-family: 'Space Grotesk', sans-serif;
          cursor: pointer; transition: all 0.18s; background: #0E0E0E; color: #fff;
        }
        .su-submit:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.2); }
        .su-submit:active:not(:disabled) { transform: translateY(0); }
        .su-submit:disabled { opacity: 0.55; cursor: not-allowed; }
        .su-link { font-size: 12px; color: rgba(0,0,0,0.38); font-family: 'Space Grotesk', sans-serif; }
        .su-link a { color: #b50002; font-weight: 700; text-decoration: none; }
        .su-link a:hover { text-decoration: underline; }
        .su-notice {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 11px 14px; border-radius: 10px;
          font-size: 12px; font-family: 'Space Grotesk', sans-serif;
        }
        .su-notice-red { background: rgba(181,0,2,0.05); border: 1.5px solid rgba(181,0,2,0.12); color: rgba(0,0,0,0.55); }
        .su-notice-green { background: rgba(21,128,61,0.06); border: 1.5px solid rgba(21,128,61,0.15); color: rgba(0,0,0,0.55); }
        .su-notice-amber { background: rgba(245,158,11,0.07); border: 1.5px solid rgba(245,158,11,0.2); color: rgba(0,0,0,0.55); }
        .su-terms-box {
          background: #fff; border: 1.5px solid rgba(0,0,0,0.09); border-radius: 12px;
          padding: 14px 16px;
        }
      `}</style>

      {showTermsModal && (
        <TermsModal
          onClose={() => setShowTermsModal(false)}
          onAccept={() => {
            setAcceptedTerms(true);
            setShowTermsModal(false);
          }}
        />
      )}

      <div className="su-root">
        <div className="su-card">
          {/* LEFT */}
          <div className="su-left">
            <LeftPanel step={step} />
          </div>

          {/* RIGHT */}
          <div className="su-right">
            {/* ── STEP 1 — Personal Details ── */}
            {step === 1 && (
              <>
                <a href="/login" className="su-back">
                  <FaArrowLeft style={{ fontSize: 10 }} /> Back to Login
                </a>
                <div style={{ marginBottom: 24 }}>
                  <div className="su-eyebrow">
                    <div className="su-eyebrow-line" />
                    <span className="su-eyebrow-txt">Registration</span>
                  </div>
                  <h1 className="su-title">Personal Details</h1>
                  <p className="su-subtitle">
                    Fill in your name, contact info, and password
                  </p>
                </div>
                <form onSubmit={handleNextStep} className="su-form">
                  <div>
                    <p className="su-section-label">Full Name</p>
                    <div className="su-grid-2">
                      <Field icon={FaUser} label="First Name *">
                        <input
                          type="text"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleChange}
                          placeholder="Juan"
                          required
                          maxLength={50}
                          style={inputBase}
                        />
                      </Field>
                      <Field icon={FaUser} label="Middle Name">
                        <input
                          type="text"
                          name="middleName"
                          value={formData.middleName}
                          onChange={handleChange}
                          placeholder="Santos (optional)"
                          maxLength={50}
                          style={inputBase}
                        />
                      </Field>
                      <Field icon={FaUser} label="Last Name *">
                        <input
                          type="text"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleChange}
                          placeholder="Dela Cruz"
                          required
                          maxLength={50}
                          style={inputBase}
                        />
                      </Field>
                    </div>
                  </div>

                  <div>
                    <p className="su-section-label">Contact</p>
                    <div className="su-grid-2">
                      <Field icon={FaEnvelope} label="Email Address *">
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="juan@email.com"
                          required
                          maxLength={254}
                          style={inputBase}
                        />
                      </Field>
                      <Field icon={FaPhone} label="Phone Number *">
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="09xxxxxxxxx"
                          required
                          maxLength={11}
                          pattern="09\d{9}"
                          style={inputBase}
                        />
                      </Field>
                    </div>
                    <p
                      style={{
                        fontSize: 11,
                        color: "rgba(0,0,0,0.38)",
                        marginTop: 6,
                        fontFamily: "'Space Grotesk', sans-serif",
                      }}
                    >
                      Use any valid email — Gmail, Outlook, or Yahoo.
                    </p>
                  </div>

                  <div>
                    <p className="su-section-label">Security</p>
                    <div className="su-grid-2">
                      {/* Password */}
                      <div>
                        <label style={labelStyle}>Password *</label>
                        <div
                          style={inputWrapBase}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = "#b50002";
                            e.currentTarget.style.background = "#fff";
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor =
                              "rgba(0,0,0,0.09)";
                            e.currentTarget.style.background = "#F5F5F3";
                          }}
                        >
                          <FaLock style={iconBase} />
                          <input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Create password"
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
                        {formData.password.length > 0 && (
                          <div style={{ marginTop: 8 }}>
                            <PasswordStrengthMeter
                              password={formData.password}
                            />
                          </div>
                        )}
                      </div>
                      {/* Confirm Password */}
                      <div>
                        <label style={labelStyle}>Confirm Password *</label>
                        <div
                          style={inputWrapBase}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = "#b50002";
                            e.currentTarget.style.background = "#fff";
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor =
                              "rgba(0,0,0,0.09)";
                            e.currentTarget.style.background = "#F5F5F3";
                          }}
                        >
                          <FaLock style={iconBase} />
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            placeholder="Repeat password"
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
                        {formData.confirmPassword && (
                          <p
                            style={{
                              fontSize: 11,
                              marginTop: 6,
                              fontWeight: 600,
                              fontFamily: "'Space Grotesk', sans-serif",
                              color:
                                formData.password === formData.confirmPassword
                                  ? "#166534"
                                  : "#b50002",
                            }}
                          >
                            {formData.password === formData.confirmPassword
                              ? "Passwords match"
                              : "Passwords do not match"}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="su-footer">
                    <p className="su-link">
                      Have an account? <a href="/login">Sign in</a>
                    </p>
                    <button type="submit" className="su-submit">
                      Next <FaArrowRight style={{ fontSize: 9 }} />
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* ── STEP 2 — Address + Terms ── */}
            {step === 2 && (
              <>
                <button onClick={() => setStep(1)} className="su-back">
                  <FaArrowLeft style={{ fontSize: 10 }} /> Back
                </button>
                <div style={{ marginBottom: 24 }}>
                  <div className="su-eyebrow">
                    <div className="su-eyebrow-line" />
                    <span className="su-eyebrow-txt">Home Address</span>
                  </div>
                  <h1 className="su-title">Where Are You Located?</h1>
                  <p className="su-subtitle">
                    We need your address for booking purposes
                  </p>
                </div>
                <form onSubmit={handleSubmit} className="su-form">
                  <div className="su-grid-2">
                    {/* Region */}
                    <SelectField icon={FaMapMarkerAlt} label="Region *">
                      <select
                        value={address.regionCode}
                        onChange={handleRegionChange}
                        disabled={addrLoading.regions}
                        required
                        style={{
                          ...inputBase,
                          paddingRight: 32,
                          appearance: "none",
                        }}
                      >
                        <option value="">
                          {addrLoading.regions ? "Loading…" : "Select Region"}
                        </option>
                        {regions.map((r) => (
                          <option key={r.code} value={r.code}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </SelectField>

                    {/* Province */}
                    {address.regionCode && hasProvinces && (
                      <SelectField icon={FaMapMarkerAlt} label="Province *">
                        <select
                          value={address.provinceCode}
                          onChange={handleProvinceChange}
                          disabled={addrLoading.provinces}
                          required
                          style={{
                            ...inputBase,
                            paddingRight: 32,
                            appearance: "none",
                          }}
                        >
                          <option value="">
                            {addrLoading.provinces
                              ? "Loading…"
                              : "Select Province"}
                          </option>
                          {provinces.map((p) => (
                            <option key={p.code} value={p.code}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </SelectField>
                    )}

                    {/* City */}
                    {address.regionCode && (
                      <SelectField
                        icon={FaMapMarkerAlt}
                        label="City / Municipality *"
                      >
                        <select
                          value={address.cityCode}
                          onChange={handleCityChange}
                          disabled={
                            addrLoading.cities ||
                            (hasProvinces && !address.provinceCode)
                          }
                          required
                          style={{
                            ...inputBase,
                            paddingRight: 32,
                            appearance: "none",
                          }}
                        >
                          <option value="">
                            {addrLoading.cities
                              ? "Loading…"
                              : hasProvinces && !address.provinceCode
                                ? "Select Province first"
                                : "Select City"}
                          </option>
                          {cities.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </SelectField>
                    )}

                    {/* Barangay */}
                    <SelectField icon={FaMapMarkerAlt} label="Barangay *">
                      <select
                        value={address.barangayCode}
                        onChange={handleBarangayChange}
                        disabled={!address.cityCode || addrLoading.barangays}
                        required
                        style={{
                          ...inputBase,
                          paddingRight: 32,
                          appearance: "none",
                        }}
                      >
                        <option value="">
                          {addrLoading.barangays
                            ? "Loading…"
                            : "Select Barangay"}
                        </option>
                        {barangays.map((b) => (
                          <option key={b.code} value={b.code}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </SelectField>

                    {/* ZIP */}
                    <Field icon={FaMapMarkerAlt} label="ZIP Code">
                      <input
                        type="text"
                        value={address.zipCode}
                        onChange={(e) =>
                          setAddress((p) => ({
                            ...p,
                            zipCode: e.target.value
                              .replace(/\D/g, "")
                              .slice(0, 4),
                          }))
                        }
                        placeholder="4-digit ZIP"
                        maxLength={4}
                        inputMode="numeric"
                        style={inputBase}
                      />
                    </Field>
                  </div>

                  {/* Address preview */}
                  {address.barangayName && (
                    <div className="su-notice su-notice-green">
                      <FaCheckCircle
                        style={{
                          color: "#166534",
                          fontSize: 11,
                          marginTop: 1,
                          flexShrink: 0,
                        }}
                      />
                      <span>
                        <strong style={{ color: "#0E0E0E" }}>Address: </strong>
                        {[
                          address.barangayName,
                          address.cityName,
                          address.provinceName,
                          address.regionName,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                        {address.zipCode && `, ${address.zipCode}`}
                      </span>
                    </div>
                  )}

                  {/* Terms */}
                  <div className="su-terms-box">
                    <p
                      style={{
                        fontSize: 12,
                        color: "rgba(0,0,0,0.5)",
                        fontFamily: "'Space Grotesk', sans-serif",
                        marginBottom: 10,
                      }}
                    >
                      Please review and accept our Terms & Conditions to
                      continue.
                    </p>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 12 }}
                    >
                      <button
                        type="button"
                        onClick={() => setShowTermsModal(true)}
                        style={{
                          padding: "8px 16px",
                          borderRadius: 10,
                          border: "none",
                          background: "#0E0E0E",
                          color: "#fff",
                          fontSize: 12,
                          fontWeight: 700,
                          fontFamily: "'Space Grotesk', sans-serif",
                          cursor: "pointer",
                        }}
                      >
                        Read Terms & Conditions
                      </button>
                      {acceptedTerms && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: "#166534",
                            fontFamily: "'Space Grotesk', sans-serif",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <FaCheckCircle style={{ fontSize: 10 }} /> Terms
                          accepted
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="su-footer">
                    <p className="su-link">
                      Have an account? <a href="/login">Sign in</a>
                    </p>
                    <button
                      type="submit"
                      disabled={loading}
                      className="su-submit"
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
                          Creating…
                        </>
                      ) : (
                        <>
                          Create Account{" "}
                          <FaCheckCircle style={{ fontSize: 9 }} />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* ── STEP 3 — OTP Verification ── */}
            {step === 3 && (
              <>
                <button onClick={() => setStep(2)} className="su-back">
                  <FaArrowLeft style={{ fontSize: 10 }} /> Back
                </button>
                <div style={{ marginBottom: 24 }}>
                  <div className="su-eyebrow">
                    <div className="su-eyebrow-line" />
                    <span className="su-eyebrow-txt">Email Verification</span>
                  </div>
                  <h1 className="su-title">Check Your Email</h1>
                  <p className="su-subtitle">
                    Enter the 6-digit code we sent to activate your account
                  </p>
                </div>
                <form onSubmit={handleVerifyOTP} className="su-form">
                  <div className="su-notice su-notice-red">
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
                        {formData.email}
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
                    <OtpBoxInput value={otp} onChange={setOtp} length={6} />
                  </div>

                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={!resendCooldown.canResend || resending || loading}
                    style={resendBtnStyle(
                      resendCooldown.canResend && !resending && !loading,
                    )}
                  >
                    {!resendCooldown.canResend
                      ? `Resend OTP in ${formatCooldown(resendCooldown.remainingSeconds)}`
                      : "Didn't receive it? Resend OTP"}
                  </button>

                  <p
                    style={{
                      fontSize: 11,
                      color: "rgba(0,0,0,0.35)",
                      fontFamily: "'Space Grotesk', sans-serif",
                    }}
                  >
                    Make sure to check your spam/junk folder.
                  </p>

                  <div className="su-footer">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="su-back"
                      style={{ marginBottom: 0 }}
                    >
                      <FaArrowLeft style={{ fontSize: 10 }} /> Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="su-submit"
                      style={{ background: "#b50002" }}
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
                          Verify Email{" "}
                          <FaChevronRight style={{ fontSize: 9 }} />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </>
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

export default SignUp;
