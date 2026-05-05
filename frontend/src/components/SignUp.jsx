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
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import PasswordStrengthMeter from "../components/PasswordStrengthMeter";
import axios from "axios";
import bgImage from "../assets/bgImage2.jpg";
import API_BASE_URL from "../apiBase";
import useResendCooldown, { formatCooldown } from "../hooks/useResendCooldown";

const PH_API = "https://psgc.gitlab.io/api";

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

// ── Input Field ───────────────────────────────────────────────────────────────
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

const inputCls =
  "w-full pl-10 pr-4 py-3 bg-transparent text-[#171717] text-sm placeholder-[#171717]/40 focus:outline-none rounded-xl";
const selectCls =
  "w-full pl-10 pr-8 py-3 bg-transparent text-[#171717] text-sm focus:outline-none rounded-xl appearance-none disabled:opacity-50";

// ── Left panel content per step ───────────────────────────────────────────────
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
        {/* Logo / brand */}
        <div className="flex items-center gap-3 mb-10">
          <div>
            <p className="text-white font-black text-lg leading-none tracking-tight">
              Anaia's Motorcycle Rental
            </p>
            <p className="text-white/50 text-xs">Bacoor, Cavite</p>
          </div>
        </div>

        {/* Step headline */}
        <div className="mb-8">
          <span className="inline-block text-white/60 text-xs font-bold uppercase tracking-widest py-1 rounded-full mb-3">
            Step {step} of 3
          </span>
          <h2 className="text-white font-black text-3xl leading-tight mb-2">
            {step === 1 && (
              <>
                Tell us
                <br />
                about yourself
              </>
            )}
            {step === 2 && (
              <>
                Where are
                <br />
                you located?
              </>
            )}
            {step === 3 && (
              <>
                Almost
                <br />
                there!
              </>
            )}
          </h2>
          <p className="text-white/60 text-sm leading-relaxed">
            {step === 1 &&
              "Create your account in just a few steps. Start with your personal details."}
            {step === 2 &&
              "We need your address to process bookings and keep your account secure."}
            {step === 3 &&
              "Verify your email to activate your account and start renting."}
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
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

      {/* Features */}
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

// ── Card — defined OUTSIDE SignUp so React doesn't remount it on every render ──
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
      className="w-full max-w-5xl bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden 
      flex flex-col lg:flex-row min-h-[600px]"
    >
      {children}
    </div>
  </div>
);

// ── TermsModal — defined OUTSIDE SignUp so React doesn't remount it on every render ──
const TermsModal = ({ onClose, onAccept }) => (
  <div
    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    onClick={onClose}
  >
    <div
      className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Terms & Conditions</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
        >
          ×
        </button>
      </div>
      <p className="text-sm text-gray-400 mb-4">Last updated: March 24, 2026</p>
      <div className="text-gray-700 space-y-4">
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
            "LESSEE will pay for all fines and penalties related to traffic violations, parking fines, and towing expenses. If the violation is due to the company's negligence, Anaia's Motorcycle Rental will take full responsibility and reimburse all fines.",
          ],
          [
            "9. Liability and Insurance",
            "The renter is obliged to compensate Anaia's Motorcycle Rental for entire damages caused due to the renter's negligence. The lessee must possess Personal Accident Insurance; otherwise, they will be accountable for their medical expenses in case of an accident.",
          ],
          [
            "10. Responsibility for Damage",
            "LESSEE is responsible for the FULL VALUE of any damage regardless of fault. Must report to the nearest police station and inform the lessor within 24 hours of any damage or loss. Flat tire expenses will be shared; lost keys will be charged to the renter; all other damages will be charged in full.",
          ],
          [
            "11. Motorcycle Repairs and Alterations",
            "The LESSEE will not permit any repair or replacement without prior consent of the LESSOR. LESSEE will not tamper with the odometer/speedometer or alter the unit. All unauthorized repairs and parts will be charged to the renter.",
          ],
          [
            "12. Mechanical Repairs and Accidents",
            "If involved in an accident or requiring repair, the renter must notify the company immediately. The renter must not arrange repairs or leave the accident scene without company authority. The company will arrange repairs or replacement within 48 hours if not due to renter breach.",
          ],
          [
            "13. Fuel Responsibility",
            "LESSEE is responsible for returning the vehicle with the same fuel level as received. If returned with less fuel, a fuel charge applies. No credit will be issued for any fuel remaining in the vehicle.",
          ],
          [
            "14. Failure to Return",
            "If LESSEE fails to return the vehicle on the due date and time without a permitted extension, LESSEE will be deemed in unlawful possession and may be subject to warrant for arrest.",
          ],
          [
            "15. Entire Agreement",
            "This Motorcycle Lease Agreement constitutes the entire agreement and cannot be amended unless in writing and signed by both parties. Any notice required will be made to the contact information provided.",
          ],
          [
            "16. Destinations and Diversions",
            "The company requires notification of final destinations upon arrival. Any diversion from mentioned destinations shall be subjected to a penalty fee as specified in the rental agreement.",
          ],
          [
            "17. Vehicle Documents Disclaimer",
            "All vehicle documents provided to the renter serve only as documents for the renter's safety and are not transferable or proof of ownership of the rental vehicle.",
          ],
        ].map(([title, text]) => (
          <section key={title}>
            <h3 className="font-semibold text-lg mb-1">{title}</h3>
            <p className="text-sm leading-relaxed">{text}</p>
          </section>
        ))}
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-6 py-3 bg-[#b50002] text-white font-bold text-sm rounded-xl
                    shadow-lg shadow-[#b50002]/30 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]
                    transition-all duration-200"
        >
          Close
        </button>
        <button
          onClick={onAccept}
          className="flex items-center gap-2 px-6 py-3 bg-[#171717] text-white font-bold text-sm rounded-xl
                    shadow-lg shadow-[#171717]/30 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]
                    transition-all duration-200"
        >
          Accept Terms
        </button>
      </div>
    </div>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
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
    storageKey: formData.email ? `otpCooldown:signupVerify:${formData.email}` : null,
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

  // ── Step 1 → Step 2 validation ────────────────────────────────────────────
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Step 2 → Register ─────────────────────────────────────────────────────
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
      const res = await axios.post(
        `${API_BASE}/api/auth/register`,
        payload,
        { headers: { "Content-Type": "application/json" } },
      );
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

  // ── OTP Verify ────────────────────────────────────────────────────────────
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
      await axios.post(
        `${API_BASE}/api/auth/resend-verification-otp`,
        { email: formData.email },
      );
      toast.success("OTP resent successfully!");
      resendCooldown.startCooldown();
    } catch {
      toast.error("Failed to resend OTP");
    } finally {
      setResending(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 1 — Personal details
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 1)
    return (
      <>
        {showTermsModal && (
          <TermsModal
            onClose={() => setShowTermsModal(false)}
            onAccept={() => {
              setAcceptedTerms(true);
              setShowTermsModal(false);
            }}
          />
        )}
        <Card bgImage={bgImage}>
          <div className="lg:w-2/5 bg-gradient-to-br from-[#171717] via-[#171717] to-[#b50002]/80 flex-shrink-0">
            <LeftPanel step={step} />
          </div>
          <div className="flex-1 bg-[#f4f3f3] flex flex-col">
            <div className="flex flex-col h-full p-6 lg:p-8 overflow-y-auto">
              {/* Header */}
              <div className="mb-6">
                <a
                  href="/login"
                  className="inline-flex items-center gap-2 text-[#171717]/50 hover:text-[#b50002] text-sm font-medium transition-colors mb-4"
                >
                  <FaArrowLeft className="text-xs" /> Back to Login
                </a>
                <h1 className="text-2xl font-black text-[#171717] tracking-tight">
                  Personal Details
                </h1>
                <p className="text-[#171717]/50 text-sm mt-1">
                  Fill in your name, contact, and password
                </p>
              </div>

              <form
                onSubmit={handleNextStep}
                className="flex-1 flex flex-col gap-4"
              >
                {/* Two columns: Name */}
                <div>
                  <p className="text-xs font-bold text-[#171717]/50 uppercase tracking-widest mb-2">
                    Full Name
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field icon={FaUser} label="First Name *">
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        className={inputCls}
                        placeholder="Juan"
                        required
                        maxLength={50}
                      />
                    </Field>
                    <Field icon={FaUser} label="Middle Name">
                      <input
                        type="text"
                        name="middleName"
                        value={formData.middleName}
                        onChange={handleChange}
                        className={inputCls}
                        placeholder="Santos (optional)"
                        maxLength={50}
                      />
                    </Field>
                    <Field icon={FaUser} label="Last Name *">
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        className={inputCls}
                        placeholder="Dela Cruz"
                        required
                        maxLength={50}
                      />
                    </Field>
                  </div>
                </div>

                {/* Two columns: Email + Phone */}
                <div>
                  <p className="text-xs font-bold text-[#171717]/50 uppercase tracking-widest mb-2">
                    Contact
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field icon={FaEnvelope} label="Email Address *">
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className={inputCls}
                        placeholder="juan@email.com"
                        autoComplete="email"
                        inputMode="email"
                        required
                        maxLength={254}
                      />
                    </Field>
                    <p className="sm:col-span-2 -mt-1 text-xs text-[#171717]/45">
                      Use any valid email address, including Outlook, Gmail, and Yahoo.
                    </p>
                    <Field icon={FaPhone} label="Phone Number *">
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className={inputCls}
                        placeholder="09xxxxxxxxx"
                        required
                        maxLength={11}
                        pattern="09\d{9}"
                      />
                    </Field>
                  </div>
                </div>

                {/* Two columns: Passwords */}
                <div>
                  <p className="text-xs font-bold text-[#171717]/50 uppercase tracking-widest mb-2">
                    Security
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[#171717]/70 text-xs font-semibold uppercase tracking-wider">
                        Password *
                      </label>
                      <div className="relative flex items-center bg-white/60 border border-[#171717]/10 rounded-xl shadow-sm focus-within:border-black transition-all hover:bg-white/90">
                        <FaLock className="absolute left-3.5 text-[#b50002] text-sm pointer-events-none" />
                        <input
                          type={showPassword ? "text" : "password"}
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          className={`${inputCls} pr-10`}
                          placeholder="Create password"
                          required
                          maxLength={64}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 text-[#171717]/40 hover:text-[#171717] transition-colors"
                        >
                          {showPassword ? <FaEyeSlash /> : <FaEye />}
                        </button>
                      </div>
                      <div className="mt-1 min-h-[40px] transition-opacity duration-200">
                        <div
                          className={
                            formData.password.length > 0
                              ? "opacity-100"
                              : "opacity-0"
                          }
                        >
                          <PasswordStrengthMeter password={formData.password} />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[#171717]/70 text-xs font-semibold uppercase tracking-wider">
                        Confirm Password *
                      </label>
                      <div className="relative flex items-center bg-white/60 border border-[#171717]/10 rounded-xl shadow-sm focus-within:border-black transition-all hover:bg-white/90">
                        <FaLock className="absolute left-3.5 text-[#b50002] text-sm pointer-events-none" />
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          className={`${inputCls} pr-10`}
                          placeholder="Repeat password"
                          required
                          maxLength={64}
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
                          formData.confirmPassword
                            ? "opacity-100"
                            : "opacity-0 select-none"
                        } ${
                          formData.password === formData.confirmPassword &&
                          formData.confirmPassword
                            ? "text-green-700"
                            : "text-red-700"
                        }`}
                      >
                        {formData.confirmPassword
                          ? formData.password === formData.confirmPassword
                            ? "Passwords match"
                            : "Passwords do not match"
                          : " "}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-auto pt-2">
                  <p className="text-xs text-[#171717]/40">
                    Already have an account?{" "}
                    <a
                      href="/login"
                      className="text-[#b50002] font-semibold hover:underline"
                    >
                      Login
                    </a>
                  </p>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-3 bg-[#171717] text-white font-bold text-sm rounded-xl
                    shadow-lg shadow-[#171717]/30 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]
                    transition-all duration-200"
                  >
                    Next <FaArrowRight className="text-xs" />
                  </button>
                </div>
              </form>
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

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2 — Address + Terms
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 2)
    return (
      <>
        {showTermsModal && (
          <TermsModal
            onClose={() => setShowTermsModal(false)}
            onAccept={() => {
              setAcceptedTerms(true);
              setShowTermsModal(false);
            }}
          />
        )}
        <Card bgImage={bgImage}>
          <div className="lg:w-2/5 bg-gradient-to-br from-[#171717] via-[#171717] to-[#b50002]/80 flex-shrink-0">
            <LeftPanel step={step} />
          </div>
          <div className="flex-1 bg-[#f4f3f3] flex flex-col">
            <div className="flex flex-col h-full p-6 lg:p-8 overflow-y-auto">
              {/* Header */}
              <div className="mb-6">
                <button
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-2 text-[#171717]/50 hover:text-[#b50002] text-sm font-medium transition-colors mb-4"
                >
                  <FaArrowLeft className="text-xs" /> Back
                </button>
                <h1 className="text-2xl font-black text-[#171717] tracking-tight">
                  Home Address
                </h1>
                <p className="text-[#171717]/50 text-sm mt-1">
                  We need your address for booking purposes
                </p>
              </div>

              <form
                onSubmit={handleSubmit}
                className="flex-1 flex flex-col gap-4"
              >
                {/* Address selects — 2 columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Region */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[#171717]/70 text-xs font-semibold uppercase tracking-wider">
                      Region *
                    </label>
                    <div className="relative flex items-center bg-white/60 border border-[#171717]/10 rounded-xl shadow-sm focus-within:border-black transition-all hover:bg-white/90">
                      <FaMapMarkerAlt className="absolute left-3.5 text-[#b50002] text-sm pointer-events-none" />
                      <select
                        value={address.regionCode}
                        onChange={handleRegionChange}
                        disabled={addrLoading.regions}
                        required
                        className={selectCls}
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
                      <FaChevronDown className="absolute right-3 text-[#171717]/40 text-xs pointer-events-none" />
                    </div>
                  </div>

                  {/* Province (conditional) */}
                  {address.regionCode && hasProvinces ? (
                    <div className="flex flex-col gap-1">
                      <label className="text-[#171717]/70 text-xs font-semibold uppercase tracking-wider">
                        Province *
                      </label>
                      <div className="relative flex items-center bg-white/60 border border-[#171717]/10 rounded-xl shadow-sm focus-within:border-black transition-all hover:bg-white/90">
                        <FaMapMarkerAlt className="absolute left-3.5 text-[#b50002] text-sm pointer-events-none" />
                        <select
                          value={address.provinceCode}
                          onChange={handleProvinceChange}
                          disabled={addrLoading.provinces}
                          required
                          className={selectCls}
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
                        <FaChevronDown className="absolute right-3 text-[#171717]/40 text-xs pointer-events-none" />
                      </div>
                    </div>
                  ) : address.regionCode && !hasProvinces ? (
                    <div />
                  ) : null}

                  {/* City */}
                  {address.regionCode && (
                    <div className="flex flex-col gap-1">
                      <label className="text-[#171717]/70 text-xs font-semibold uppercase tracking-wider">
                        City / Municipality *
                      </label>
                      <div className="relative flex items-center bg-white/60 border border-[#171717]/10 rounded-xl shadow-sm focus-within:border-black transition-all hover:bg-white/90">
                        <FaMapMarkerAlt className="absolute left-3.5 text-[#b50002] text-sm pointer-events-none" />
                        <select
                          value={address.cityCode}
                          onChange={handleCityChange}
                          disabled={
                            addrLoading.cities ||
                            (hasProvinces && !address.provinceCode)
                          }
                          required
                          className={selectCls}
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
                        <FaChevronDown className="absolute right-3 text-[#171717]/40 text-xs pointer-events-none" />
                      </div>
                    </div>
                  )}

                  {/* Barangay */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[#171717]/70 text-xs font-semibold uppercase tracking-wider">
                      Barangay *
                    </label>
                    <div className="relative flex items-center bg-white/60 border border-[#171717]/10 rounded-xl shadow-sm focus-within:border-black transition-all hover:bg-white/90">
                      <FaMapMarkerAlt className="absolute left-3.5 text-[#b50002] text-sm pointer-events-none" />
                      <select
                        value={address.barangayCode}
                        onChange={handleBarangayChange}
                        disabled={!address.cityCode || addrLoading.barangays}
                        required
                        className={selectCls}
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
                      <FaChevronDown className="absolute right-3 text-[#171717]/40 text-xs pointer-events-none" />
                    </div>
                  </div>

                  {/* ZIP Code */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[#171717]/70 text-xs font-semibold uppercase tracking-wider">
                      ZIP Code
                    </label>
                    <div className="relative flex items-center bg-white/60 border border-[#171717]/10 rounded-xl shadow-sm focus-within:border-black transition-all hover:bg-white/90">
                      <FaMapMarkerAlt className="absolute left-3.5 text-[#b50002] text-sm pointer-events-none" />
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
                        className={inputCls}
                        placeholder="4-digit ZIP"
                        maxLength={4}
                        inputMode="numeric"
                      />
                    </div>
                  </div>
                </div>

                {/* Terms & Conditions */}
                <div className="bg-white/50 border border-[#171717]/10 rounded-2xl p-4">
                  <p className="text-sm text-[#171717]/70 leading-relaxed">
                    Please review the Terms & Conditions to continue.
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(true)}
                      className="px-4 py-2 bg-[#171717] text-white font-semibold text-sm rounded-lg hover:brightness-110 transition-all duration-200"
                    >
                      Open Terms & Conditions
                    </button>
                    {acceptedTerms && (
                      <span className="text-xs font-semibold text-green-700">
                        Terms accepted
                      </span>
                    )}
                  </div>
                </div>

                {/* Address preview */}
                {address.barangayName && (
                  <div className="bg-green-900/30 border border-green-800/30 rounded-xl px-4 py-2.5 flex items-center gap-2">
                    <FaCheckCircle className="text-green-800 text-sm flex-shrink-0" />
                    <p className="text-xs text-[#171717]/70 leading-tight">
                      <span className="font-semibold text-[#171717]">
                        Address:{" "}
                      </span>
                      {[
                        address.barangayName,
                        address.cityName,
                        address.provinceName,
                        address.regionName,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                      {address.zipCode && `, ${address.zipCode}`}
                    </p>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between mt-auto pt-2">
                  <p className="text-xs text-[#171717]/40">
                    Already have an account?{" "}
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
                    shadow-lg shadow-black/20 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]
                    disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {loading ? "Creating account…" : "Create Account"}
                    {!loading && <FaCheckCircle className="text-xs" />}
                  </button>
                </div>
              </form>
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

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 3 — OTP Verification
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <Card bgImage={bgImage}>
        <div className="lg:w-2/5 bg-gradient-to-br from-[#171717] via-[#171717] to-[#b50002]/80 flex-shrink-0">
          <LeftPanel step={step} />
        </div>
        <div className="flex-1 bg-[#f4f3f3] flex flex-col">
          <div className="flex flex-col h-full p-6 lg:p-8 items-center justify-center">
            <div className="w-full max-w-sm mx-auto text-center">
              {/* Icon */}
              <div className="w-16 h-16 bg-[#b50002]/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <FaEnvelope className="text-[#b50002] text-2xl" />
              </div>
              <h1 className="text-2xl font-black text-[#171717] mb-2">
                Check your email
              </h1>
              <p className="text-[#171717]/50 text-sm mb-6 leading-relaxed">
                We sent a 6-digit verification code to{" "}
                <span className="font-semibold text-[#171717]">
                  {formData.email}
                </span>
              </p>

              <form onSubmit={handleVerifyOTP} className="flex flex-col gap-4">
                <Field icon={FaLock} label="Verification Code">
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
                  type="submit"
                  disabled={loading}
                  className="items-center gap-2 px-6 py-3 bg-[#171717] text-white font-bold text-sm rounded-xl
                    shadow-lg shadow-[#171717]/30 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]
                    transition-all duration-200"
                >
                  {loading ? "Verifying…" : "Verify Email"}
                </button>

                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={!resendCooldown.canResend || resending || loading}
                  className={`text-sm font-medium transition-colors ${
                    !resendCooldown.canResend || resending || loading
                      ? "text-[#171717]/40 cursor-not-allowed"
                      : "text-[#b50002] hover:underline"
                  }`}
                >
                  {!resendCooldown.canResend
                    ? `Resend OTP in ${formatCooldown(resendCooldown.remainingSeconds)}`
                    : "Didn't receive it? Resend OTP"}
                </button>
              </form>

              <p className="text-xs text-[#171717]/30 mt-6">
                Make sure to check your spam/junk folder
              </p>
            </div>
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

export default SignUp;
