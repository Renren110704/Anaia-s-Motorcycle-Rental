import React, { useEffect, useState, useCallback } from "react";
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
} from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import axios from "axios";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PasswordStrengthMeter from "../components/PasswordStrengthMeter";
import API_BASE_URL from "../apiBase";
import useResendCooldown, { formatCooldown } from "../hooks/useResendCooldown";

const BASE = API_BASE_URL;
const PH_API = "https://psgc.gitlab.io/api";

// ── Shared primitives ─────────────────────────────────────────────────────────
const inputCls =
  "w-full pl-10 pr-4 py-2.5 bg-transparent text-[#171717] text-sm placeholder-[#171717]/40 focus:outline-none rounded-xl";

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

const selectCls =
  "w-full pl-10 pr-8 py-2.5 bg-transparent text-[#171717] text-sm focus:outline-none rounded-xl appearance-none disabled:opacity-50";

const PhSelect = ({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  loading,
}) => (
  <div className="flex flex-col gap-1">
    {label && (
      <label className="text-[#171717]/70 text-xs font-semibold uppercase tracking-wider">
        {label}
      </label>
    )}
    <div className="relative flex items-center bg-white/60 border border-[#171717]/10 rounded-xl shadow-sm focus-within:border-black transition-all hover:bg-white/90">
      <FaMapMarkerAlt className="absolute left-3.5 text-[#b50002] text-sm pointer-events-none" />
      <select
        value={value}
        onChange={onChange}
        disabled={disabled || loading}
        className={selectCls}
      >
        <option value="">{loading ? "Loading…" : placeholder}</option>
        {options.map((opt) => (
          <option key={opt.code} value={opt.code}>
            {opt.name}
          </option>
        ))}
      </select>
      <FaChevronDown className="absolute right-3 text-[#171717]/40 text-xs pointer-events-none" />
    </div>
  </div>
);

// ── PH Address hook ───────────────────────────────────────────────────────────
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

// ── Info row for view mode ────────────────────────────────────────────────────
const InfoRow = ({ icon: Icon, label, value, green }) => (
  <div className="flex items-start gap-3 py-3 border-b border-[#171717]/8 last:border-0">
    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
      <Icon className="text-[#b50002] text-sm" />
    </div>
    <div className="min-w-0">
      <p className="text-[#171717]/50 text-xs font-semibold uppercase tracking-wider">
        {label}
      </p>
      <p
        className={`text-sm font-semibold mt-0.5 break-words ${green ? "text-green-700" : "text-[#171717]"}`}
      >
        {value}
      </p>
    </div>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
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
  const [emailChanged, setEmailChanged] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [showEmailOTP, setShowEmailOTP] = useState(false);
  const [emailOTP, setEmailOTP] = useState("");
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [resendingEmailOtp, setResendingEmailOtp] = useState(false);

  const emailChangeOtpCooldown = useResendCooldown({
    storageKey: pendingEmail ? `otpCooldown:emailChange:${pendingEmail}` : null,
    cooldownSeconds: 60,
  });

  const handleResendEmailChangeOTP = async () => {
    if (!emailChangeOtpCooldown.canResend || resendingEmailOtp || updating)
      return;
    if (!pendingEmail) {
      toast.error("New email is missing");
      return;
    }
    setResendingEmailOtp(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${BASE}/api/auth/request-email-change-otp`,
        { newEmail: pendingEmail },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      toast.success("OTP resent!");
      emailChangeOtpCooldown.startCooldown();
    } catch {
      toast.error("Failed to resend OTP");
    } finally {
      setResendingEmailOtp(false);
    }
  };

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

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
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

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
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
    if (!passwordData.currentPassword) {
      toast.error("Please enter your current password");
      return;
    }
    if (passwordData.currentPassword === passwordData.newPassword) {
      toast.error("New password must be different");
      return;
    }
    if (getPasswordStrength(passwordData.newPassword) < 4) {
      toast.error("Password must be Strong (meet all criteria)");
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords do not match");
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#e8e8e8]">
        <Navbar />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="flex items-center gap-3 text-[#171717]">
            <div className="w-5 h-5 border-2 border-[#b50002] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium">Loading profile…</span>
          </div>
        </div>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-[#e8e8e8]">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 pt-32 pb-16">
        <div className="flex flex-col lg:flex-row gap-6 items-start mt-10">
          {/* ── LEFT COLUMN — Profile card ── */}
          <div className="w-full lg:w-72 flex-shrink-0 space-y-4">
            {/* Avatar card */}
            <div className="bg-gradient-to-br from-[#171717] via-[#171717] to-[#b50002]/80 rounded-3xl p-6 text-white relative overflow-hidden shadow-2xl shadow-black/30">
             
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div>
                    <p className="text-white font-black text-sm leading-none tracking-tight">
                      Anaia's Motorcycle Rental
                    </p>
                    <p className="text-white/50 text-xs">Bacoor, Cavite</p>
                  </div>
                </div>

                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-3 shadow-lg">
                  <span className="text-white font-black text-xl">
                    {initials || <FaUser className="text-xl" />}
                  </span>
                </div>
                <h2 className="text-white font-black text-lg leading-tight">
                  {fullName}
                </h2>
                <p className="text-white/60 text-xs mt-1 break-all">
                  {user?.email}
                </p>

                <div
                  className={`mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${user?.isVerified ? "bg-green-500/20 text-green-300" : "bg-amber-500/20 text-amber-300"}`}
                >
                  {user?.isVerified ? (
                    <FaCheckCircle className="text-xs" />
                  ) : (
                    <FaShieldAlt className="text-xs" />
                  )}
                  {user?.isVerified ? "Verified" : "Unverified"}
                </div>
              </div>
            </div>

            {/* Quick info card */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 border border-white/50 shadow-lg shadow-black/10">
              <h3 className="text-xs font-bold text-[#171717]/50 uppercase tracking-widest mb-3">
                Account Info
              </h3>
              <div className="space-y-0">
                <InfoRow
                  icon={FaPhone}
                  label="Phone"
                  value={user?.phone || "—"}
                />
                <InfoRow
                  icon={FaMapMarkerAlt}
                  label="Address"
                  value={fullAddress || "Not set"}
                />
                {addr.zipCode && (
                  <InfoRow
                    icon={FaMapMarkerAlt}
                    label="ZIP Code"
                    value={addr.zipCode}
                  />
                )}
                <InfoRow
                  icon={FaCalendarAlt}
                  label="Member Since"
                  value={new Date(user?.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                />
              </div>
            </div>

            {/* Action buttons (view mode only) */}
            {!editMode && !changingPassword && (
              <div className="space-y-2">
                <button
                  onClick={() => setEditMode(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#b50002] text-white font-bold text-sm rounded-2xl
                  shadow-lg shadow-[#b50002]/30 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                >
                  <FaEdit className="text-xs" /> Edit Profile
                </button>
                <button
                  onClick={() => setChangingPassword(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#171717] text-white font-bold text-sm rounded-2xl
                  shadow-lg shadow-black/20 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                >
                  <FaKey className="text-xs" /> Change Password
                </button>
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN — Content panel ── */}
          <div className="flex-1 bg-[#f4f3f3] rounded-3xl shadow-lg shadow-black/10 overflow-hidden">
            {/* Panel header bar */}
            <div className="bg-gradient-to-r from-[#171717] to-[#2a2a2a] px-6 py-4 flex items-center justify-between">
              <div>
                <h1 className="text-white font-black text-base tracking-tight">
                  {!editMode && !changingPassword && "Profile Information"}
                  {editMode && !showEmailOTP && "Edit Profile"}
                  {editMode && showEmailOTP && "Verify New Email"}
                  {changingPassword && "Change Password"}
                </h1>
                <p className="text-white/50 text-xs mt-0.5">
                  {!editMode &&
                    !changingPassword &&
                    "Your personal details and address"}
                  {editMode && !showEmailOTP && "Update your information below"}
                  {editMode &&
                    showEmailOTP &&
                    "Enter the OTP sent to your new email"}
                  {changingPassword && "Choose a strong new password"}
                </p>
              </div>
              {/* Cancel buttons in header when editing */}
              {(editMode || changingPassword) && (
                <button
                  onClick={() => {
                    if (changingPassword) {
                      setChangingPassword(false);
                      setPasswordData({
                        currentPassword: "",
                        newPassword: "",
                        confirmPassword: "",
                      });
                    } else {
                      handleCancelEdit();
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition-all"
                >
                  <FaTimes className="text-xs" /> Cancel
                </button>
              )}
            </div>

            <div className="p-6">
              {/* ── VIEW MODE ── */}
              {!editMode && !changingPassword && (
                <div className="space-y-0 divide-y divide-[#171717]/8">
                  {[
                    {
                      icon: FaUser,
                      label: "First Name",
                      value: user?.firstName,
                    },
                    {
                      icon: FaUser,
                      label: "Middle Name",
                      value: user?.middleName || "—",
                    },
                    { icon: FaUser, label: "Last Name", value: user?.lastName },
                    {
                      icon: FaEnvelope,
                      label: "Email Address",
                      value: user?.email,
                    },
                    {
                      icon: FaPhone,
                      label: "Phone Number",
                      value: user?.phone,
                    },
                    {
                      icon: FaMapMarkerAlt,
                      label: "Home Address",
                      value: fullAddress || "Not set",
                    },
                    {
                      icon: FaMapMarkerAlt,
                      label: "ZIP Code",
                      value: addr.zipCode || "—",
                    },
                    {
                      icon: FaCheckCircle,
                      label: "Account Status",
                      value: user?.isVerified ? "Verified" : "Not Verified",
                      green: user?.isVerified,
                    },
                    {
                      icon: FaCalendarAlt,
                      label: "Member Since",
                      value: new Date(user?.createdAt).toLocaleDateString(
                        "en-US",
                        { year: "numeric", month: "long", day: "numeric" },
                      ),
                    },
                  ].map(({ icon, label, value, green }) => (
                    <div key={label} className="flex items-center gap-4 py-3.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0">
                        {React.createElement(icon, {
                          className: "text-[#b50002] text-sm",
                        })}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[#171717]/50 text-xs font-semibold uppercase tracking-wider">
                          {label}
                        </p>
                        <p
                          className={`text-sm font-semibold mt-0.5 ${green ? "text-green-700" : "text-[#171717]"}`}
                        >
                          {value}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── EDIT MODE ── */}
              {editMode && !showEmailOTP && (
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  {/* Name row */}
                  <div>
                    <p className="text-xs font-bold text-[#171717]/50 uppercase tracking-widest mb-2">
                      Full Name
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                          placeholder="(optional)"
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

                  {/* Contact row */}
                  <div>
                    <p className="text-xs font-bold text-[#171717]/50 uppercase tracking-widest mb-2">
                      Contact
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <Field icon={FaEnvelope} label="Email Address">
                          <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className={inputCls}
                            required
                            maxLength={254}
                          />
                        </Field>
                        {emailChanged && (
                          <p className="text-xs text-[#b50002] font-medium">
                            ⚠ You'll need to verify your new email with an OTP
                          </p>
                        )}
                      </div>
                      <Field icon={FaPhone} label="Phone Number">
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
                          className={inputCls}
                          required
                          maxLength={11}
                          inputMode="numeric"
                          pattern="09\d{9}"
                          placeholder="09xxxxxxxxx"
                        />
                      </Field>
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <p className="text-xs font-bold text-[#171717]/50 uppercase tracking-widest mb-1">
                      Address
                    </p>
                    {fullAddress && (
                      <div className="bg-green-900/30 border border-green-800/30 rounded-xl px-3 py-2 mb-3 flex items-start gap-2">
                        <FaMapMarkerAlt className="text-green-800 text-xs mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-[#171717]/60">
                          Current:{" "}
                          <span className="font-semibold text-[#171717]">
                            {fullAddress}
                          </span>
                          {addr.zipCode && `, ${addr.zipCode}`}
                        </p>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                          className={inputCls}
                          placeholder="4-digit ZIP"
                          maxLength={4}
                          inputMode="numeric"
                        />
                      </Field>
                    </div>
                  </div>

                  {/* Submit */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={updating}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#171717] text-white font-bold text-sm rounded-xl
                      shadow-lg shadow-[#171717]/30 hover:brightness-110 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      <FaSave className="text-xs" />
                      {updating
                        ? "Saving…"
                        : emailChanged
                          ? "Send OTP & Continue"
                          : "Save Changes"}
                    </button>
                  </div>
                </form>
              )}

              {/* ── EMAIL OTP ── */}
              {editMode && showEmailOTP && (
                <form onSubmit={handleVerifyEmailOTP} className="space-y-4">
                  <div className="bg-[#b50002]/5 border border-[#b50002]/20 rounded-xl px-4 py-3 flex items-center gap-2 mb-2">
                    <FaEnvelope className="text-[#b50002] text-sm flex-shrink-0" />
                    <p className="text-xs text-[#171717]/70">
                      Code sent to{" "}
                      <span className="font-semibold text-[#171717]">
                        {pendingEmail}
                      </span>
                    </p>
                  </div>

                  <Field icon={FaLock} label="Verification Code">
                    <input
                      type="tel"
                      value={emailOTP}
                      onChange={(e) =>
                        setEmailOTP(e.target.value.replace(/\D/g, ""))
                      }
                      className={inputCls}
                      placeholder="Enter 6-digit OTP"
                      required
                      maxLength={6}
                      inputMode="numeric"
                    />
                  </Field>

                  <button
                    type="button"
                    onClick={handleResendEmailChangeOTP}
                    disabled={
                      !emailChangeOtpCooldown.canResend ||
                      resendingEmailOtp ||
                      updating
                    }
                    className={`text-sm font-medium hover:underline transition-colors ${
                      !emailChangeOtpCooldown.canResend ||
                      resendingEmailOtp ||
                      updating
                        ? "text-[#171717]/40 cursor-not-allowed"
                        : "text-[#b50002]"
                    }`}
                  >
                    {!emailChangeOtpCooldown.canResend
                      ? `Resend OTP in ${formatCooldown(emailChangeOtpCooldown.remainingSeconds)}`
                      : "Didn't receive it? Resend OTP"}
                  </button>

                  <div className="flex gap-3 pt-1">
                    <button
                      type="submit"
                      disabled={verifyingEmail}
                      className="flex-1 py-3 bg-[#b50002] text-white font-bold text-sm rounded-xl shadow-lg shadow-[#b50002]/30 hover:brightness-110 active:scale-[0.98] disabled:opacity-60 transition-all duration-200"
                    >
                      {verifyingEmail ? "Verifying…" : "Verify & Update Email"}
                    </button>
                  </div>
                </form>
              )}

              {/* ── CHANGE PASSWORD ── */}
              {changingPassword && (
                <form onSubmit={handleChangePassword} className="space-y-4">
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
                    <div key={name} className="flex flex-col gap-1">
                      <label className="text-[#171717]/70 text-xs font-semibold uppercase tracking-wider">
                        {label}
                      </label>
                      <div className="relative flex items-center bg-white/60 border border-[#171717]/10 rounded-xl shadow-sm focus-within:border-black transition-all hover:bg-white/90">
                        <FaLock className="absolute left-3.5 text-[#b50002] text-sm pointer-events-none" />
                        <input
                          type={showPasswords[field] ? "text" : "password"}
                          name={name}
                          value={passwordData[name]}
                          onChange={(e) =>
                            setPasswordData((p) => ({
                              ...p,
                              [e.target.name]: e.target.value,
                            }))
                          }
                          maxLength={64}
                          required
                          className={`${inputCls} pr-10`}
                          placeholder={label}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowPasswords((p) => ({
                              ...p,
                              [field]: !p[field],
                            }))
                          }
                          className="absolute right-3 text-[#171717]/40 hover:text-[#171717] transition-colors"
                        >
                          {showPasswords[field] ? <FaEyeSlash /> : <FaEye />}
                        </button>
                      </div>
                      {name === "newPassword" &&
                        passwordData.newPassword.length > 0 && (
                          <PasswordStrengthMeter
                            password={passwordData.newPassword}
                          />
                        )}
                      {name === "confirmPassword" &&
                        passwordData.confirmPassword && (
                          <p
                            className={`text-xs font-medium ${passwordData.newPassword === passwordData.confirmPassword ? "text-green-700" : "text-red-700"}`}
                          >
                            {passwordData.newPassword ===
                            passwordData.confirmPassword
                              ? "Passwords match"
                              : "Passwords do not match"}
                          </p>
                        )}
                    </div>
                  ))}

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={updating}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-[#171717] text-white font-bold text-sm rounded-xl
                      shadow-lg shadow-[#171717]/30 hover:brightness-110 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      <FaKey className="text-xs" />
                      {updating ? "Changing…" : "Change Password"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />

      <ToastContainer
        position="top-right"
        autoClose={3000}
        theme="colored"
        icon={false}
      />
    </div>
  );
};

export default Profile;
