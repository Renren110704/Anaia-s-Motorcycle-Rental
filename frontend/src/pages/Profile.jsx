import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUser,
  FaEnvelope,
  FaLock,
  FaEdit,
  FaSave,
  FaTimes,
  FaEye,
  FaEyeSlash,
  FaPhone,
  FaMapMarkerAlt,
  FaChevronDown,
  FaCheckCircle,
  FaShieldAlt,
  FaKey,
  FaCalendarAlt,
  FaTrash,
  FaTrophy,
} from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import axios from "axios";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PasswordStrengthMeter from "../components/PasswordStrengthMeter";
import API_BASE_URL from "../apiBase";
import useResendCooldown, { formatCooldown } from "../hooks/useResendCooldown";
import {
  fetchLoyaltyStatus,
  LoyaltyTierBadge,
  LoyaltyProgressBar,
  LoyaltyCodeList,
  LoyaltyHowItWorksModal,
} from "../components/DiscountBadge";

const BASE = API_BASE_URL;
const PH_API = "https://psgc.gitlab.io/api";
const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_PROFILE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PROFILE_IMAGE_TOO_LARGE_MESSAGE =
  "That image is too large. Please upload a photo up to 5 MB.";
const PROFILE_IMAGE_UNSUPPORTED_TYPE_MESSAGE =
  "Unsupported file type. Please upload a JPG, PNG, or WEBP image.";

/* ── PH Address hook ─────────────────────────────────────────────── */
const usePHAddress = () => {
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [hasProvinces, setHasProvinces] = useState(false);
  const [addrLoading, setAddrLoading] = useState({});

  const fetchRegions = useCallback(async () => {
    setAddrLoading((p) => ({ ...p, regions: true }));
    try {
      const res = await axios.get(`${PH_API}/regions/`);
      setRegions(res.data.sort((a, b) => a.name.localeCompare(b.name)));
    } catch {
      toast.error("Failed to load regions");
    } finally {
      setAddrLoading((p) => ({ ...p, regions: false }));
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
    setAddrLoading((p) => ({ ...p, provinces: true }));
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
        setAddrLoading((p) => ({ ...p, cities: true }));
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
          setAddrLoading((p) => ({ ...p, cities: false }));
        }
      }
    } catch {
      setProvinces([]);
      setHasProvinces(false);
      setAddrLoading((p) => ({ ...p, cities: true }));
      try {
        const r2 = await axios.get(
          `${PH_API}/regions/${regionCode}/cities-municipalities/`,
        );
        setCities((r2.data || []).sort((a, b) => a.name.localeCompare(b.name)));
      } catch {
        toast.error("Failed to load cities");
      } finally {
        setAddrLoading((p) => ({ ...p, cities: false }));
      }
    } finally {
      setAddrLoading((p) => ({ ...p, provinces: false }));
    }
  }, []);

  const fetchCities = useCallback(async (provinceCode) => {
    if (!provinceCode) {
      setCities([]);
      setBarangays([]);
      return;
    }
    setAddrLoading((p) => ({ ...p, cities: true }));
    try {
      const res = await axios.get(
        `${PH_API}/provinces/${provinceCode}/cities-municipalities/`,
      );
      setCities((res.data || []).sort((a, b) => a.name.localeCompare(b.name)));
      setBarangays([]);
    } catch {
      toast.error("Failed to load cities");
    } finally {
      setAddrLoading((p) => ({ ...p, cities: false }));
    }
  }, []);

  const fetchBarangays = useCallback(async (cityCode) => {
    if (!cityCode) {
      setBarangays([]);
      return;
    }
    setAddrLoading((p) => ({ ...p, barangays: true }));
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
      setAddrLoading((p) => ({ ...p, barangays: false }));
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
    addrLoading,
    fetchProvinces,
    fetchCities,
    fetchBarangays,
  };
};

/* ── Shared field components ─────────────────────────────────────── */
const labelStyle = {
  display: "block",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "2px",
  textTransform: "uppercase",
  color: "rgba(0,0,0,0.35)",
  marginBottom: 6,
  fontFamily: "'Space Grotesk', sans-serif",
};

const inputWrapStyle = {
  position: "relative",
  display: "flex",
  alignItems: "center",
  background: "#fff",
  border: "1.5px solid rgba(0,0,0,0.09)",
  borderRadius: 12,
  transition: "border-color 0.2s",
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px 10px 38px",
  background: "transparent",
  border: "none",
  outline: "none",
  fontSize: 13,
  fontFamily: "'Space Grotesk', sans-serif",
  color: "#0E0E0E",
};

const iconStyle = {
  position: "absolute",
  left: 12,
  color: "#b50002",
  fontSize: 12,
  pointerEvents: "none",
};

const errorTextStyle = {
  fontSize: 11,
  fontWeight: 600,
  color: "#b50002",
  marginTop: 5,
  fontFamily: "'Space Grotesk', sans-serif",
};

const Field = ({ icon: Icon, label, error, children }) => (
  <div>
    {label && <label style={labelStyle}>{label}</label>}
    <div
      style={{
        ...inputWrapStyle,
        ...(error ? { borderColor: "#b50002", background: "#FDF0F0" } : null),
      }}
      onFocus={(e) => (e.currentTarget.style.borderColor = "#b50002")}
      onBlur={(e) =>
        (e.currentTarget.style.borderColor = error
          ? "#b50002"
          : "rgba(0,0,0,0.09)")
      }
    >
      {Icon && <Icon style={iconStyle} />}
      {children}
    </div>
    {error && <p style={errorTextStyle}>{error}</p>}
  </div>
);

const PhSelect = ({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  loading,
}) => (
  <div>
    {label && <label style={labelStyle}>{label}</label>}
    <div style={{ ...inputWrapStyle, ...(disabled ? { opacity: 0.5 } : {}) }}>
      <FaMapMarkerAlt style={iconStyle} />
      <select
        value={value}
        onChange={onChange}
        disabled={disabled || loading}
        style={{
          ...inputStyle,
          paddingRight: 32,
          appearance: "none",
          WebkitAppearance: "none",
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        <option value="">{loading ? "Loading…" : placeholder}</option>
        {options.map((opt) => (
          <option key={opt.code} value={opt.code}>
            {opt.name}
          </option>
        ))}
      </select>
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

/* ── Info row for view mode ──────────────────────────────────────── */
const InfoRow = ({ icon: Icon, label, value, accent }) => (
  <div
    style={{
      display: "flex",
      alignItems: "flex-start",
      gap: 14,
      padding: "14px 0",
      borderBottom: "1.5px solid rgba(0,0,0,0.05)",
    }}
  >
    <div
      style={{
        width: 34,
        height: 34,
        borderRadius: 10,
        background: "rgba(181,0,2,0.07)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Icon style={{ color: "#b50002", fontSize: 13 }} />
    </div>
    <div style={{ minWidth: 0 }}>
      <p
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "2px",
          textTransform: "uppercase",
          color: "rgba(0,0,0,0.35)",
          fontFamily: "'Space Grotesk', sans-serif",
          marginBottom: 3,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: accent ? "#16a34a" : "#0E0E0E",
          fontFamily: "'Space Grotesk', sans-serif",
          wordBreak: "break-word",
        }}
      >
        {value}
      </p>
    </div>
  </div>
);

/* ── Section heading ─────────────────────────────────────────────── */
const SectionLabel = ({ children }) => (
  <div
    style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}
  >
    {/* <div
      style={{ width: 20, height: 1.5, background: "#b50002", borderRadius: 2 }}
    /> */}
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "2.5px",
        textTransform: "uppercase",
        color: "#b50002",
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      {children}
    </span>
  </div>
);

/* ── Main Component ──────────────────────────────────────────────── */
const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loyalty, setLoyalty] = useState(null);
  const [loyaltyLoading, setLoyaltyLoading] = useState(true);
  const [showLoyaltyInfo, setShowLoyaltyInfo] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deletingImage, setDeletingImage] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [addrData, setAddrData] = useState({
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
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [errors, setErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});
  const [otpError, setOtpError] = useState("");
  const [emailChanged, setEmailChanged] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [showEmailOTP, setShowEmailOTP] = useState(false);
  const [emailOTP, setEmailOTP] = useState("");
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [resendingEmailOtp, setResendingEmailOtp] = useState(false);
  // Set once the backend reports the 3-resend cap has been hit for this
  // pending email-change OTP; disables further resend attempts until the
  // OTP naturally expires (or the flow restarts with a new target email).
  const [emailOtpResendLimitReached, setEmailOtpResendLimitReached] =
    useState(false);

  const emailChangeOtpCooldown = useResendCooldown({
    storageKey: pendingEmail ? `otpCooldown:emailChange:${pendingEmail}` : null,
    cooldownSeconds: 60,
  });

  const {
    regions,
    provinces,
    cities,
    barangays,
    hasProvinces,
    addrLoading,
    fetchProvinces,
    fetchCities,
    fetchBarangays,
  } = usePHAddress();

  const getPasswordStrength = (pass) => {
    let s = 0;
    if (pass.length >= 6) s++;
    if (pass.match(/[a-z]/) && pass.match(/[A-Z]/)) s++;
    if (pass.match(/\d/)) s++;
    if (pass.match(/[^a-zA-Z\d]/)) s++;
    return s;
  };

  const fetchUserProfile = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }
      const res = await axios.get(`${BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        const u = res.data.user;
        setUser(u);
        setFormData({
          firstName: u.firstName || "",
          middleName: u.middleName || "",
          lastName: u.lastName || "",
          email: u.email || "",
          phone: u.phone || "",
        });
        const addr = u.address || {};
        setAddrData({
          regionCode: "",
          regionName: addr.region || "",
          provinceCode: "",
          provinceName: addr.province || "",
          cityCode: "",
          cityName: addr.city || "",
          barangayCode: "",
          barangayName: addr.barangay || "",
          zipCode: addr.zipCode || "",
        });
      }
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
      } else toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const fetchLoyalty = useCallback(async (userId) => {
    if (!userId) {
      setLoyaltyLoading(false);
      return;
    }
    try {
      const data = await fetchLoyaltyStatus(userId);
      setLoyalty(data);
    } catch (err) {
      // Non-critical — silently skip if the loyalty endpoint is unavailable
    } finally {
      setLoyaltyLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  useEffect(() => {
    if (user?.id) fetchLoyalty(user.id);
  }, [user?.id, fetchLoyalty]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setErrors((prev) => {
      if (!(name in prev)) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
    if (name === "email" && value !== user?.email) {
      setEmailChanged(true);
      setPendingEmail(value);
    } else if (name === "email") {
      setEmailChanged(false);
      setPendingEmail("");
    }
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleRegionChange = (e) => {
    const code = e.target.value;
    const name = regions.find((r) => r.code === code)?.name || "";
    setAddrData((p) => ({
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
    setAddrData((p) => ({
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
    setAddrData((p) => ({
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
    setAddrData((p) => ({ ...p, barangayCode: code, barangayName: name }));
  };

  const handleResendEmailChangeOTP = async () => {
    if (
      !emailChangeOtpCooldown.canResend ||
      resendingEmailOtp ||
      updating ||
      emailOtpResendLimitReached
    )
      return;
    if (!pendingEmail) {
      toast.error("New email is missing");
      return;
    }
    setResendingEmailOtp(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${BASE}/api/auth/request-email-change-otp`,
        { newEmail: pendingEmail },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      toast.success(res.data?.message || "OTP resent!");
      emailChangeOtpCooldown.startCooldown();
    } catch (err) {
      const data = err.response?.data;
      if (err.response?.status === 429) {
        setEmailOtpResendLimitReached(true);
        toast.error(
          data?.message ||
            "OTP resend limit reached. Please wait for the current code to expire and try again.",
          { autoClose: 6000 },
        );
      } else {
        toast.error(data?.message || "Failed to resend OTP");
      }
    } finally {
      setResendingEmailOtp(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const next = {};
    if (!formData.firstName.trim()) next.firstName = "First name is required";
    if (!formData.lastName.trim()) next.lastName = "Last name is required";
    if (!formData.email.trim()) {
      next.email = "Email is required";
    } else if (!EMAIL_RE.test(formData.email.trim())) {
      next.email = "Enter a valid email address";
    }
    if (!formData.phone) {
      next.phone = "Phone number is required";
    } else if (!/^09\d{9}$/.test(formData.phone)) {
      next.phone = "Enter 11 digits starting with 09";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) {
      toast.error("Please fix the highlighted fields");
      return;
    }
    if (emailChanged) {
      setUpdating(true);
      try {
        const token = localStorage.getItem("token");
        const res = await axios.post(
          `${BASE}/api/auth/request-email-change-otp`,
          { newEmail: pendingEmail },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
        );
        if (res.data.success) {
          toast.success("OTP sent to your new email address!");
          emailChangeOtpCooldown.startCooldown();
          setEmailOtpResendLimitReached(false);
          setShowEmailOTP(true);
        }
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to send OTP");
      } finally {
        setUpdating(false);
      }
      return;
    }
    setUpdating(true);
    try {
      const addressTouched = !!addrData.regionCode;
      const token = localStorage.getItem("token");
      const payload = {
        firstName: formData.firstName,
        middleName: formData.middleName,
        lastName: formData.lastName,
        phone: formData.phone,
        address: {
          region: addressTouched
            ? addrData.regionName
            : user?.address?.region || "",
          province: addressTouched
            ? addrData.provinceName
            : user?.address?.province || "",
          city: addressTouched ? addrData.cityName : user?.address?.city || "",
          barangay: addressTouched
            ? addrData.barangayName
            : user?.address?.barangay || "",
          zipCode: addrData.zipCode || user?.address?.zipCode || "",
        },
      };
      const res = await axios.put(`${BASE}/api/auth/update-profile`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (res.data.success) {
        setUser(res.data.user);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        toast.success("Profile updated successfully!");
        setEditMode(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setUpdating(false);
    }
  };

  const handleVerifyEmailOTP = async (e) => {
    e.preventDefault();
    if (!emailOTP || emailOTP.length < 6) {
      setOtpError("Please enter the 6-digit code");
      return;
    }
    setOtpError("");
    setVerifyingEmail(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${BASE}/api/auth/verify-email-change-otp`,
        { newEmail: pendingEmail, otp: emailOTP },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );
      if (res.data.success) {
        setUser(res.data.user);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        toast.success("Email updated successfully!");
        setShowEmailOTP(false);
        setEmailOTP("");
        setEmailChanged(false);
        setPendingEmail("");
        setEditMode(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid or expired OTP");
    } finally {
      setVerifyingEmail(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    const next = {};
    if (!passwordData.currentPassword)
      next.currentPassword = "Please enter your current password";
    if (!passwordData.newPassword) {
      next.newPassword = "New password is required";
    } else if (getPasswordStrength(passwordData.newPassword) < 4) {
      next.newPassword = "Password must be Strong (meet all criteria)";
    } else if (passwordData.currentPassword === passwordData.newPassword) {
      next.newPassword = "New password must be different";
    }
    if (!passwordData.confirmPassword) {
      next.confirmPassword = "Please confirm your new password";
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      next.confirmPassword = "New passwords do not match";
    }
    setPasswordErrors(next);
    if (Object.keys(next).length > 0) {
      toast.error("Please fix the highlighted fields");
      return;
    }
    setUpdating(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(
        `${BASE}/api/auth/change-password`,
        {
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );
      if (res.data.success) {
        toast.success("Password changed successfully!");
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setPasswordErrors({});
        setChangingPassword(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to change password");
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setErrors({});
    setShowEmailOTP(false);
    setEmailOTP("");
    setEmailChanged(false);
    setPendingEmail("");
    setFormData({
      firstName: user?.firstName || "",
      middleName: user?.middleName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      phone: user?.phone || "",
    });
    const addr = user?.address || {};
    setAddrData({
      regionCode: "",
      regionName: addr.region || "",
      provinceCode: "",
      provinceName: addr.province || "",
      cityCode: "",
      cityName: addr.city || "",
      barangayCode: "",
      barangayName: addr.barangay || "",
      zipCode: addr.zipCode || "",
    });
  };

  /* ── Derived display values ── */
  const addr = user?.address || {};
  const fullAddress = [addr.barangay, addr.city, addr.province, addr.region]
    .filter(Boolean)
    .join(", ");
  const fullName = [user?.firstName, user?.middleName, user?.lastName]
    .filter(Boolean)
    .join(" ");
  const initials = [user?.firstName?.[0], user?.lastName?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase();

  // const primaryBtn = {
  //   display: "flex",
  //   alignItems: "center",
  //   justifyContent: "center",
  //   gap: 8,
  //   padding: "11px 20px",
  //   borderRadius: 12,
  //   border: "none",
  //   background: "#b50002",
  //   color: "#fff",
  //   fontSize: 13,
  //   fontWeight: 700,
  //   fontFamily: "'Space Grotesk', sans-serif",
  //   cursor: "pointer",
  //   transition: "background 0.18s, transform 0.15s",
  //   width: "100%",
  // };
  // const secondaryBtn = {
  //   display: "flex",
  //   alignItems: "center",
  //   justifyContent: "center",
  //   gap: 8,
  //   padding: "11px 20px",
  //   borderRadius: 12,
  //   border: "1.5px solid rgba(0,0,0,0.1)",
  //   background: "#fff",
  //   color: "#0E0E0E",
  //   fontSize: 13,
  //   fontWeight: 700,
  //   fontFamily: "'Space Grotesk', sans-serif",
  //   cursor: "pointer",
  //   transition: "all 0.18s",
  //   width: "100%",
  // };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#F5F5F3" }}>
        <Navbar />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "80vh",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontFamily: "'Space Grotesk', sans-serif",
              color: "#0E0E0E",
            }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                border: "2.5px solid #b50002",
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              Loading profile…
            </span>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const activePanel = changingPassword
    ? "password"
    : editMode && showEmailOTP
      ? "otp"
      : editMode
        ? "edit"
        : "view";

  const panelTitle = {
    view: "Profile Information",
    edit: "Edit Profile",
    otp: "Verify New Email",
    password: "Change Password",
  }[activePanel];

  const panelSub = {
    view: "Your personal details and address",
    edit: "Update your information below",
    otp: `Enter the OTP sent to ${pendingEmail}`,
    password: "Choose a strong new password",
  }[activePanel];

  // Add this function before the return statement
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!ALLOWED_PROFILE_IMAGE_TYPES.includes(file.type)) {
      toast.error(PROFILE_IMAGE_UNSUPPORTED_TYPE_MESSAGE);
      e.target.value = null;
      return;
    }

    if (file.size > MAX_PROFILE_IMAGE_BYTES) {
      toast.error(PROFILE_IMAGE_TOO_LARGE_MESSAGE);
      e.target.value = null;
      return;
    }

    const formData = new FormData();
    formData.append("image", file);

    setUploadingImage(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${BASE}/api/auth/upload-profile-picture`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        },
      );

      if (res.data.success) {
        setUser(res.data.user);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        toast.success("Profile picture updated!");

        // Dispatch storage event to immediately update Navbar
        window.dispatchEvent(new Event("storage"));
      }
    } catch (err) {
      const isTooLarge =
        err.response?.status === 413 ||
        /too large|file size|exceeds/i.test(err.response?.data?.message || "");
      const isUnsupportedType =
        err.response?.status === 415 ||
        /unsupported|invalid file type|invalid.*type/i.test(
          err.response?.data?.message || "",
        );
      toast.error(
        isTooLarge
          ? PROFILE_IMAGE_TOO_LARGE_MESSAGE
          : isUnsupportedType
            ? PROFILE_IMAGE_UNSUPPORTED_TYPE_MESSAGE
            : err.response?.data?.message || "Failed to upload profile picture",
      );
    } finally {
      setUploadingImage(false);
      e.target.value = null; // Clear the input
    }
  };

  const handleDeleteProfilePicture = async () => {
    setDeletingImage(true);
    setShowDeleteConfirm(false); // Close the modal immediately when confirmed

    try {
      const token = localStorage.getItem("token");
      const res = await axios.delete(
        `${BASE}/api/auth/remove-profile-picture`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (res.data.success) {
        setUser(res.data.user);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        toast.success("Profile picture removed!");

        window.dispatchEvent(new Event("storage"));
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to remove profile picture",
      );
    } finally {
      setDeletingImage(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .pf-page { background: #F5F5F3; min-height: 100vh; font-family: 'Space Grotesk', sans-serif; padding: 120px 32px 80px; }
        @media(max-width: 640px) { .pf-page { padding: 100px 16px 60px; } }
        .pf-inner { max-width: 1100px; margin: 0 auto; }
        .pf-top { margin-bottom: 20px; margin-top: -32px; }
        .pf-eyebrow { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
        .pf-eyebrow-line { width: 20px; height: 1.5px; background: #b50002; border-radius: 2px; }
        .pf-eyebrow-txt { font-size: 10px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: #b50002; }
        .pf-title { font-size: clamp(22px, 3vw, 32px); font-weight: 800; color: #0E0E0E; letter-spacing: -0.8px; }
        .pf-layout { display: grid; grid-template-columns: 280px 1fr; gap: 20px; align-items: start; animation: fadeUp 0.5s ease forwards; }
        @media(max-width: 860px) { .pf-layout { grid-template-columns: 1fr; } }
        .pf-card { background: #fff; border-radius: 18px; border: 1.5px solid rgba(0,0,0,0.07); overflow: hidden; }
        .pf-avatar-card { background: #fff; border-radius: 18px; border: 1.5px solid rgba(0,0,0,0.07); padding: 28px 24px; margin-bottom: 16px; position: relative; overflow: hidden; }
        .pf-avatar-card::after { content: ''; position: absolute; bottom: -40px; right: -40px; width: 130px; height: 130px; border-radius: 50%; background: pointer-events: none; }
        .pf-avatar-ring { width: 60px; height: 60px; border-radius: 16px; background: rgba(181,0,2,0.07); border: 1.5px solid rgba(255,255,255,0.12); display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
        .pf-avatar-initials { font-size: 22px; font-weight: 800; color: #b50002; }
        .pf-avatar-name { font-size: 16px; font-weight: 800; color: #0E0E0E ; letter-spacing: -0.3px; margin-bottom: 4px; }
        .pf-avatar-email { font-size: 11px; color: rgba(0,0,0,0.35); word-break: break-all; margin-bottom: 14px; }
        .pf-badge { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px; font-size: 10px; font-weight: 700; letter-spacing: 0.5px; }
        .pf-badge-green { background: rgba(22,163,74,0.15); color: #16a34a; }
        .pf-badge-amber { background: rgba(245,158,11,0.15); color: #d97706; }
        .pf-info-card { background: #fff; border-radius: 18px; border: 1.5px solid rgba(0,0,0,0.07); padding: 22px; margin-bottom: 16px; }
        .pf-action-btn { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 11px 16px; border-radius: 12px; font-size: 13px; font-weight: 700; font-family: 'Space Grotesk', sans-serif; cursor: pointer; transition: all 0.18s; border: none; width: 100%; margin-bottom: 10px; }
        .pf-action-btn:hover { transform: translateY(-1px); }
        .pf-action-btn:active { transform: translateY(0); }
        .pf-action-primary { background: #b50002; color: #fff; }
        .pf-action-primary:hover { background: #8f0001; }
        .pf-action-secondary { background: #fff; color: #0E0E0E; border: 1.5px solid rgba(0,0,0,0.1) !important; }
        .pf-action-secondary:hover { border-color: rgba(0,0,0,0.2) !important; }
        .pf-panel { background: #fff; border-radius: 18px; border: 1.5px solid rgba(0,0,0,0.07); overflow: hidden; }
        .pf-panel-head { background: #0E0E0E; padding: 20px 24px; display: flex; align-items: center; justify-content: space-between; }
        .pf-panel-title { font-size: 15px; font-weight: 800; color: #fff; letter-spacing: -0.3px; }
        .pf-panel-sub { font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 2px; }
        .pf-panel-cancel { display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 8px; background: rgba(255,255,255,0.1); border: none; color: rgba(255,255,255,0.7); font-size: 12px; font-weight: 600; font-family: 'Space Grotesk', sans-serif; cursor: pointer; transition: background 0.15s; }
        .pf-panel-cancel:hover { background: rgba(255,255,255,0.18); }
        .pf-panel-body { padding: 24px; }
        .pf-form-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
        .pf-form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        @media(max-width: 640px) { .pf-form-grid-3 { grid-template-columns: 1fr; } .pf-form-grid-2 { grid-template-columns: 1fr; } }
        .pf-form-section { margin-bottom: 22px; }
        .pf-submit-btn { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 20px; border-radius: 12px; border: none; background: #0E0E0E; color: #fff; font-size: 13px; font-weight: 700; font-family: 'Space Grotesk', sans-serif; cursor: pointer; transition: all 0.18s; width: 100%; margin-top: 8px; }
        .pf-submit-btn:hover:not(:disabled) { background: #b50002; transform: translateY(-1px); }
        .pf-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .pf-otp-input { width: 100%; padding: 14px 14px 14px 40px; background: transparent; border: none; outline: none; font-size: 20px; font-weight: 700; font-family: 'Space Grotesk', sans-serif; color: #0E0E0E; letter-spacing: 8px; }
        .pf-info-notice { display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; border-radius: 10px; background: rgba(181,0,2,0.05); border: 1.5px solid rgba(181,0,2,0.12); margin-bottom: 16px; font-size: 12px; color: rgba(0,0,0,0.55); font-family: 'Space Grotesk', sans-serif; }
        .pf-resend-btn { font-size: 12px; font-weight: 600; font-family: 'Space Grotesk', sans-serif; background: none; border: none; cursor: pointer; padding: 0; margin-top: 8px; }
        .pf-divider { border: none; border-top: 1.5px solid rgba(0,0,0,0.06); margin: 20px 0; }
        input:focus-within + div { border-color: #b50002; }
        /* Add this inside your <style> block */
        .modal-overlay {
          position: fixed; inset: 0;
          background: rgba(17,17,17,0.45);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 200;
          display: flex; align-items: center; justify-content: center; padding: 24px;
          animation: fadeIn 0.18s ease;
        }
        .modal-card {
          background: #fff; border-radius: 22px;
          padding: 32px 28px; max-width: 380px; width: 100%;
          border: 1px solid rgba(0,0,0,0.06);
          box-shadow: 0 20px 64px rgba(0,0,0,0.14), 0 4px 16px rgba(0,0,0,0.06);
          animation: slideUp 0.2s ease;
        }
        .modal-icon {
          width: 56px; height: 56px; border-radius: 50%;
          background: rgba(181,0,2,0.07);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 16px;
        }
        .modal-title {
          font-family: 'Syne', sans-serif; font-size: 19px; font-weight: 800;
          text-align: center; color: #111; margin-bottom: 8px;
        }
        .modal-sub {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 13.5px; color: rgba(17,17,17,0.46);
          text-align: center; line-height: 1.65; margin-bottom: 24px;
        }
        .modal-actions { display: flex; gap: 10px; }
        .modal-cancel {
          flex: 1; padding: 12px; border-radius: 11px;
          border: 1px solid rgba(0,0,0,0.1); cursor: pointer;
          background: #FAFAFA; color: #111;
          font-family: 'Space Grotesk', sans-serif; font-size: 13px; font-weight: 700;
          transition: background 0.18s;
        }
        .modal-cancel:hover { background: #f0f0f0; }
        .modal-confirm {
          flex: 1; padding: 12px; border-radius: 11px; border: none; cursor: pointer;
          background: #b50002; color: #fff;
          font-family: 'Space Grotesk', sans-serif; font-size: 13px; font-weight: 700;
          transition: background 0.18s;
          box-shadow: 0 4px 14px rgba(181,0,2,0.28);
        }
        .modal-confirm:hover { background: #a00001; }
      `}</style>

      <Navbar />

      <div className="pf-page">
        <div className="pf-inner">
          {/* Page header */}
          <div className="pf-top">
            <div className="pf-eyebrow"></div>
            <h1 className="pf-title">My Profile</h1>
          </div>

          <div className="pf-layout">
            {/* ── LEFT SIDEBAR ── */}
            <div>
              {/* Avatar card */}
              <div className="pf-avatar-card">
                <div
                  className="pf-avatar-ring"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    cursor: "pointer",
                    position: "relative",
                    overflow: "hidden",
                  }}
                  title="Click to upload profile picture"
                >
                  {uploadingImage && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: "rgba(255,255,255,0.7)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 2,
                      }}
                    >
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          border: "2.5px solid #b50002",
                          borderTopColor: "transparent",
                          borderRadius: "50%",
                          animation: "spin 0.8s linear infinite",
                        }}
                      />
                    </div>
                  )}

                  {user?.profilePicture ? (
                    <img
                      src={user.profilePicture}
                      alt="Profile"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : initials ? (
                    <span className="pf-avatar-initials">{initials}</span>
                  ) : (
                    <FaUser style={{ color: "#fff", fontSize: 20 }} />
                  )}
                </div>

                {/* Hidden file input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  accept={ALLOWED_PROFILE_IMAGE_TYPES.join(",")}
                  onChange={handleImageUpload}
                />
                {user?.profilePicture && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={deletingImage}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      background: "transparent",
                      border: "1.5px solid rgba(181,0,2,0.15)",
                      color: "#b50002",
                      padding: "6px 12px",
                      borderRadius: "8px",
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: deletingImage ? "not-allowed" : "pointer",
                      marginBottom: "16px",
                      fontFamily: "'Space Grotesk', sans-serif",
                      transition: "all 0.2s",
                      opacity: deletingImage ? 0.5 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!deletingImage)
                        e.currentTarget.style.background = "rgba(181,0,2,0.05)";
                    }}
                    onMouseLeave={(e) => {
                      if (!deletingImage)
                        e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <FaTrash style={{ fontSize: 10 }} />
                    {deletingImage ? "Removing..." : "Remove Picture"}
                  </button>
                )}
                <div className="pf-avatar-name">{fullName}</div>
                <div className="pf-avatar-email">{user?.email}</div>
              </div>

              {/* Loyalty rewards */}
              {!loyaltyLoading && loyalty && (
                <div className="pf-info-card">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      rowGap: 8,
                      marginBottom: 12,
                    }}
                  >
                    {/* <SectionLabel>Loyalty Rewards</SectionLabel> */}
                    {loyalty.tier !== "None" && (
                      <LoyaltyTierBadge tier={loyalty.tier} />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLoyaltyInfo(true)}
                    style={{
                      display: "block",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#b50002",
                      background: "none",
                      border: "none",
                      padding: 0,
                      marginBottom: 12,
                      cursor: "pointer",
                      textDecoration: "underline",
                      fontFamily: "'Space Grotesk', sans-serif",
                    }}
                  >
                    See how it works
                  </button>

                  {loyalty.tier === "None" ? (
                    <p
                      style={{
                        fontSize: 12,
                        color: "rgba(0,0,0,0.45)",
                        fontFamily: "'Space Grotesk', sans-serif",
                        marginBottom: 10,
                      }}
                    >
                      Complete rentals to start earning Silver, Gold, and
                      Platinum member perks.
                    </p>
                  ) : (
                    <p
                      style={{
                        fontSize: 12,
                        color: "rgba(0,0,0,0.45)",
                        fontFamily: "'Space Grotesk', sans-serif",
                        marginBottom: 10,
                      }}
                    >
                      {loyalty.tierBenefits?.description}
                    </p>
                  )}

                  <div style={{ marginBottom: 8 }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#0E0E0E",
                        fontFamily: "'Space Grotesk', sans-serif",
                      }}
                    >
                      {loyalty.completedRentalsCount} completed rental
                      {loyalty.completedRentalsCount === 1 ? "" : "s"}
                    </span>
                  </div>

                  <LoyaltyProgressBar
                    completedRentalsCount={loyalty.completedRentalsCount}
                    nextTier={loyalty.nextTier}
                    rentalsUntilNextTier={loyalty.rentalsUntilNextTier}
                    tierThresholds={loyalty.tierThresholds}
                    className="mb-3"
                  />

                  {loyalty.activeCodes?.length > 0 && (
                    <>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "1.5px",
                          textTransform: "uppercase",
                          color: "rgba(0,0,0,0.35)",
                          margin: "12px 0 8px",
                        }}
                      >
                        Your Reward Codes
                      </div>
                      <LoyaltyCodeList codes={loyalty.activeCodes} />
                    </>
                  )}
                </div>
              )}

              {/* Action buttons — view mode only */}
              {!editMode && !changingPassword && (
                <div>
                  <button
                    className="pf-action-btn pf-action-primary"
                    onClick={() => setEditMode(true)}
                  >
                    <FaEdit style={{ fontSize: 11 }} /> Edit Profile
                  </button>
                  <button
                    className="pf-action-btn pf-action-secondary"
                    onClick={() => setChangingPassword(true)}
                  >
                    <FaKey style={{ fontSize: 11 }} /> Change Password
                  </button>
                </div>
              )}
            </div>

            {/* ── RIGHT PANEL ── */}
            <div className="pf-panel">
              {/* Panel header */}
              <div className="pf-panel-head">
                <div>
                  <div className="pf-panel-title">{panelTitle}</div>
                  <div className="pf-panel-sub">{panelSub}</div>
                </div>
                {(editMode || changingPassword) && (
                  <button
                    className="pf-panel-cancel"
                    onClick={() => {
                      if (changingPassword) {
                        setChangingPassword(false);
                        setPasswordData({
                          currentPassword: "",
                          newPassword: "",
                          confirmPassword: "",
                        });
                        setPasswordErrors({});
                      } else handleCancelEdit();
                    }}
                  >
                    <FaTimes style={{ fontSize: 10 }} /> Cancel
                  </button>
                )}
              </div>

              <div className="pf-panel-body">
                {/* ── VIEW MODE ── */}
                {activePanel === "view" && (
                  <>
                    <SectionLabel>Personal Details</SectionLabel>
                    <InfoRow
                      icon={FaUser}
                      label="First Name"
                      value={user?.firstName}
                    />
                    <InfoRow
                      icon={FaUser}
                      label="Middle Name"
                      value={user?.middleName || "—"}
                    />
                    <InfoRow
                      icon={FaUser}
                      label="Last Name"
                      value={user?.lastName}
                    />

                    <hr className="pf-divider" />
                    <SectionLabel>Contact</SectionLabel>
                    <InfoRow
                      icon={FaEnvelope}
                      label="Email Address"
                      value={user?.email}
                    />
                    <InfoRow
                      icon={FaPhone}
                      label="Phone Number"
                      value={user?.phone || "—"}
                    />

                    <hr className="pf-divider" />
                    <SectionLabel>Address</SectionLabel>
                    <InfoRow
                      icon={FaMapMarkerAlt}
                      label="Full Address"
                      value={fullAddress || "Not set"}
                    />
                    <InfoRow
                      icon={FaMapMarkerAlt}
                      label="ZIP Code"
                      value={addr.zipCode || "—"}
                    />

                    <hr className="pf-divider" />
                    <SectionLabel>Account</SectionLabel>
                    <InfoRow
                      icon={FaCheckCircle}
                      label="Account Status"
                      value={user?.isVerified ? "Verified" : "Not Verified"}
                      accent={user?.isVerified}
                    />
                    <InfoRow
                      icon={FaCalendarAlt}
                      label="Member Since"
                      value={new Date(user?.createdAt).toLocaleDateString(
                        "en-US",
                        { year: "numeric", month: "long", day: "numeric" },
                      )}
                    />
                  </>
                )}

                {/* ── EDIT MODE ── */}
                {activePanel === "edit" && (
                  <form onSubmit={handleUpdateProfile} noValidate>
                    <div className="pf-form-section">
                      <SectionLabel>Full Name</SectionLabel>
                      <div className="pf-form-grid-3">
                        <Field
                          icon={FaUser}
                          label="First Name *"
                          error={errors.firstName}
                        >
                          <input
                            type="text"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleChange}
                            style={inputStyle}
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
                            style={inputStyle}
                            placeholder="(optional)"
                            maxLength={50}
                          />
                        </Field>
                        <Field
                          icon={FaUser}
                          label="Last Name *"
                          error={errors.lastName}
                        >
                          <input
                            type="text"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleChange}
                            style={inputStyle}
                            placeholder="Dela Cruz"
                            required
                            maxLength={50}
                          />
                        </Field>
                      </div>
                    </div>

                    <hr className="pf-divider" />
                    <div className="pf-form-section">
                      <SectionLabel>Contact</SectionLabel>
                      <div className="pf-form-grid-2">
                        <div>
                          <Field
                            icon={FaEnvelope}
                            label="Email Address"
                            error={errors.email}
                          >
                            <input
                              type="email"
                              name="email"
                              value={formData.email}
                              onChange={handleChange}
                              style={inputStyle}
                              required
                              maxLength={254}
                            />
                          </Field>
                          {emailChanged && !errors.email && (
                            <p
                              style={{
                                fontSize: 11,
                                color: "#b50002",
                                fontWeight: 600,
                                marginTop: 5,
                                fontFamily: "'Space Grotesk', sans-serif",
                              }}
                            >
                              ⚠ OTP verification required for email change
                            </p>
                          )}
                        </div>
                        <Field
                          icon={FaPhone}
                          label="Phone Number"
                          error={errors.phone}
                        >
                          <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={(e) =>
                              handleChange({
                                target: {
                                  name: "phone",
                                  value: e.target.value.replace(/\D/g, ""),
                                },
                              })
                            }
                            style={inputStyle}
                            required
                            maxLength={11}
                            inputMode="numeric"
                            pattern="09\d{9}"
                            placeholder="09xxxxxxxxx"
                          />
                        </Field>
                      </div>
                    </div>

                    <hr className="pf-divider" />
                    <div className="pf-form-section">
                      <SectionLabel>Address</SectionLabel>
                      {fullAddress && (
                        <div className="pf-info-notice">
                          <FaMapMarkerAlt
                            style={{
                              color: "#b50002",
                              fontSize: 11,
                              marginTop: 1,
                              flexShrink: 0,
                            }}
                          />
                          <span>
                            Current:{" "}
                            <strong style={{ color: "#0E0E0E" }}>
                              {fullAddress}
                            </strong>
                            {addr.zipCode && `, ${addr.zipCode}`}
                          </span>
                        </div>
                      )}
                      <div
                        className="pf-form-grid-2"
                        style={{ marginBottom: 14 }}
                      >
                        <PhSelect
                          label="Region"
                          value={addrData.regionCode}
                          onChange={handleRegionChange}
                          options={regions}
                          placeholder="Select Region"
                          loading={addrLoading.regions}
                        />
                        {addrData.regionCode && hasProvinces && (
                          <PhSelect
                            label="Province"
                            value={addrData.provinceCode}
                            onChange={handleProvinceChange}
                            options={provinces}
                            placeholder="Select Province"
                            loading={addrLoading.provinces}
                          />
                        )}
                        {addrData.regionCode && (
                          <PhSelect
                            label="City / Municipality"
                            value={addrData.cityCode}
                            onChange={handleCityChange}
                            options={cities}
                            placeholder={
                              hasProvinces && !addrData.provinceCode
                                ? "Select Province first"
                                : "Select City"
                            }
                            disabled={hasProvinces && !addrData.provinceCode}
                            loading={addrLoading.cities}
                          />
                        )}
                        {addrData.regionCode && (
                          <PhSelect
                            label="Barangay"
                            value={addrData.barangayCode}
                            onChange={handleBarangayChange}
                            options={barangays}
                            placeholder="Select Barangay"
                            disabled={!addrData.cityCode}
                            loading={addrLoading.barangays}
                          />
                        )}
                      </div>
                      <div style={{ maxWidth: 200 }}>
                        <Field icon={FaMapMarkerAlt} label="ZIP Code">
                          <input
                            type="text"
                            value={addrData.zipCode}
                            onChange={(e) =>
                              setAddrData((p) => ({
                                ...p,
                                zipCode: e.target.value
                                  .replace(/\D/g, "")
                                  .slice(0, 4),
                              }))
                            }
                            style={inputStyle}
                            placeholder="4-digit ZIP"
                            maxLength={4}
                            inputMode="numeric"
                          />
                        </Field>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={updating}
                      className="pf-submit-btn"
                    >
                      <FaSave style={{ fontSize: 11 }} />
                      {updating
                        ? "Saving…"
                        : emailChanged
                          ? "Send OTP & Continue"
                          : "Save Changes"}
                    </button>
                  </form>
                )}

                {/* ── EMAIL OTP ── */}
                {activePanel === "otp" && (
                  <form onSubmit={handleVerifyEmailOTP} noValidate>
                    <div className="pf-info-notice">
                      <FaEnvelope
                        style={{
                          color: "#b50002",
                          fontSize: 11,
                          marginTop: 1,
                          flexShrink: 0,
                        }}
                      />
                      <span>
                        A 6-digit code was sent to{" "}
                        <strong style={{ color: "#0E0E0E" }}>
                          {pendingEmail}
                        </strong>
                      </span>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <label style={labelStyle}>Verification Code</label>
                      <div
                        style={{
                          ...inputWrapStyle,
                          borderRadius: 14,
                          ...(otpError
                            ? { borderColor: "#b50002", background: "#FDF0F0" }
                            : null),
                        }}
                      >
                        <FaLock style={iconStyle} />
                        <input
                          type="tel"
                          value={emailOTP}
                          onChange={(e) => {
                            setEmailOTP(e.target.value.replace(/\D/g, ""));
                            if (otpError) setOtpError("");
                          }}
                          className="pf-otp-input"
                          placeholder="— — — — — —"
                          required
                          maxLength={6}
                          inputMode="numeric"
                        />
                      </div>
                      {otpError && <p style={errorTextStyle}>{otpError}</p>}
                    </div>

                    <button
                      type="button"
                      onClick={handleResendEmailChangeOTP}
                      disabled={
                        !emailChangeOtpCooldown.canResend ||
                        resendingEmailOtp ||
                        updating ||
                        emailOtpResendLimitReached
                      }
                      className="pf-resend-btn"
                      style={{
                        color:
                          !emailChangeOtpCooldown.canResend ||
                          resendingEmailOtp ||
                          emailOtpResendLimitReached
                            ? "rgba(0,0,0,0.3)"
                            : "#b50002",
                        cursor:
                          !emailChangeOtpCooldown.canResend ||
                          resendingEmailOtp ||
                          emailOtpResendLimitReached
                            ? "not-allowed"
                            : "pointer",
                      }}
                    >
                      {emailOtpResendLimitReached
                        ? "Resend limit reached"
                        : !emailChangeOtpCooldown.canResend
                          ? `Resend OTP in ${formatCooldown(emailChangeOtpCooldown.remainingSeconds)}`
                          : "Didn't receive it? Resend OTP"}
                    </button>

                    {emailOtpResendLimitReached && (
                      <p
                        style={{
                          fontSize: 11,
                          color: "#b50002",
                          fontFamily: "'Space Grotesk', sans-serif",
                          marginTop: 4,
                        }}
                      >
                        You've reached the resend limit. Please wait for the
                        current code to expire and try again.
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={verifyingEmail}
                      className="pf-submit-btn"
                      style={{ marginTop: 20 }}
                    >
                      <FaCheckCircle style={{ fontSize: 11 }} />
                      {verifyingEmail ? "Verifying…" : "Verify & Update Email"}
                    </button>
                  </form>
                )}

                {/* ── CHANGE PASSWORD ── */}
                {activePanel === "password" && (
                  <form onSubmit={handleChangePassword} noValidate>
                    <SectionLabel>Update Password</SectionLabel>

                    {[
                      {
                        label: "Current Password",
                        field: "current",
                        name: "currentPassword",
                      },
                      {
                        label: "New Password",
                        field: "new",
                        name: "newPassword",
                      },
                      {
                        label: "Confirm New Password",
                        field: "confirm",
                        name: "confirmPassword",
                      },
                    ].map(({ label, field, name }) => (
                      <div key={name} style={{ marginBottom: 16 }}>
                        <label style={labelStyle}>{label}</label>
                        <div
                          style={{
                            ...inputWrapStyle,
                            ...(passwordErrors[name]
                              ? {
                                  borderColor: "#b50002",
                                  background: "#FDF0F0",
                                }
                              : null),
                          }}
                        >
                          <FaLock style={iconStyle} />
                          <input
                            type={showPasswords[field] ? "text" : "password"}
                            name={name}
                            value={passwordData[name]}
                            onChange={(e) => {
                              setPasswordErrors((prev) => {
                                if (!(e.target.name in prev)) return prev;
                                const next = { ...prev };
                                delete next[e.target.name];
                                return next;
                              });
                              setPasswordData((p) => ({
                                ...p,
                                [e.target.name]: e.target.value,
                              }));
                            }}
                            style={{ ...inputStyle, paddingRight: 40 }}
                            placeholder={label}
                            required
                            maxLength={64}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowPasswords((p) => ({
                                ...p,
                                [field]: !p[field],
                              }))
                            }
                            style={{
                              position: "absolute",
                              right: 12,
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "rgba(0,0,0,0.3)",
                              fontSize: 13,
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            {showPasswords[field] ? <FaEyeSlash /> : <FaEye />}
                          </button>
                        </div>
                        {passwordErrors[name] ? (
                          <p style={errorTextStyle}>{passwordErrors[name]}</p>
                        ) : (
                          <>
                            {name === "newPassword" &&
                              passwordData.newPassword.length > 0 && (
                                <PasswordStrengthMeter
                                  password={passwordData.newPassword}
                                />
                              )}
                            {name === "confirmPassword" &&
                              passwordData.confirmPassword && (
                                <p
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 600,
                                    marginTop: 5,
                                    fontFamily: "'Space Grotesk', sans-serif",
                                    color:
                                      passwordData.newPassword ===
                                      passwordData.confirmPassword
                                        ? "#16a34a"
                                        : "#b50002",
                                  }}
                                >
                                  {passwordData.newPassword ===
                                  passwordData.confirmPassword
                                    ? "✓ Passwords match"
                                    : "✗ Passwords do not match"}
                                </p>
                              )}
                          </>
                        )}
                      </div>
                    ))}

                    <button
                      type="submit"
                      disabled={updating}
                      className="pf-submit-btn"
                    >
                      <FaKey style={{ fontSize: 11 }} />
                      {updating ? "Changing…" : "Change Password"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ADD THIS RIGHT ABOVE <Footer /> */}
      {showDeleteConfirm && (
        <div
          className="modal-overlay"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">
              <FaTrash style={{ fontSize: 20, color: "#b50002" }} />
            </div>
            <div className="modal-title">Remove Profile Picture</div>
            <p className="modal-sub">
              Are you sure you want to remove your profile picture? You can
              always upload a new one later.
            </p>
            <div className="modal-actions">
              <button
                className="modal-cancel"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="modal-confirm"
                onClick={handleDeleteProfilePicture}
                disabled={deletingImage}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
      {showLoyaltyInfo && (
        <LoyaltyHowItWorksModal
          currentTier={loyalty?.tier}
          onClose={() => setShowLoyaltyInfo(false)}
        />
      )}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        theme="colored"
        icon={false}
      />
    </>
  );
};

export default Profile;
