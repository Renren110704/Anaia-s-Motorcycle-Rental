import React, { useCallback, useRef, useState } from "react";
import { AddCarPageStyles, toastStyles } from "../assets/dummyStyles";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import API_BASE_URL from "../apiBase";
import {
  FaMotorcycle,
  FaIdCard,
  FaTag,
  FaLayerGroup,
  FaCalendarAlt,
  FaCog,
  FaGasPump,
  FaTachometerAlt,
  FaShieldAlt,
  FaHardHat,
  FaSatelliteDish,
} from "react-icons/fa";

const baseURL = API_BASE_URL;
const api = axios.create({ baseURL });

const initialFormData = {
  unitId: "",
  brandName: "Honda",
  dailyPrice: "",
  fuelType: "Unleaded",
  engineSize: "",
  transmission: "Manual",
  year: "",
  model: "",
  description: "",
  category: "Scooter",
  hasABS: false,
  hasHelmet: true,
  traccarDeviceId: "",
  image: null,
  imagePreview: null,
};

const inputCls =
  "w-full pl-10 pr-4 py-2.5 bg-transparent text-[#171717] text-sm placeholder-[#171717]/40 focus:outline-none rounded-xl";
const selectCls =
  "w-full pl-10 pr-8 py-2.5 bg-transparent text-[#171717] text-sm focus:outline-none rounded-xl appearance-none disabled:opacity-50";

const F = ({ icon: Icon, label, children }) => (
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

const AddMotorcycle = () => {
  const [data, setData] = useState(initialFormData);
  const fileRef = useRef(null);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setData((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  }, []);

  const handleImageChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setData((p) => ({ ...p, image: file }));
    const reader = new FileReader();
    reader.onload = (evt) =>
      setData((p) => ({ ...p, imagePreview: evt.target.result }));
    reader.readAsDataURL(file);
  }, []);

  const resetForm = useCallback(() => {
    setData(initialFormData);
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      Object.entries({
        unitId: data.unitId,
        make: data.brandName,
        dailyRate: data.dailyPrice,
        fuelType: data.fuelType,
        engineSize: data.engineSize,
        transmission: data.transmission,
        year: data.year,
        model: data.model,
        description: data.description || "",
        color: "",
        category: data.category,
        hasABS: data.hasABS,
        hasHelmet: data.hasHelmet,
        traccarDeviceId: data.traccarDeviceId || "",
      }).forEach(([k, v]) => formData.append(k, v));
      if (data.image) {
        formData.append(
          "image",
          data.image,
          data.image.name || "motorcycle-image",
        );
      }

      await api.post("/api/motorcycles", formData);

      toast.success("Motorcycle listed successfully!", {
        position: "top-right",
        autoClose: 3000,
        className: toastStyles.success.container,
        bodyClassName: toastStyles.success.body,
      });
      resetForm();
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Failed to list motorcycle",
        {
          position: "top-right",
          autoClose: 4000,
          className: toastStyles.error.container,
          bodyClassName: toastStyles.error.body,
        },
      );
    }
  };

  const noScroll = (e) => {
    if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
  };

  return (
    <div className="min-h-screen pt-32 bg-[#e3e3e3] text-white py-8 px-4 sm:px-6 lg:px-8">
      <div className={AddCarPageStyles.fixedBackground} />

      <div className="max-w-6xl mx-auto mb-4 rounded-3xl bg-gradient-to-br from-[#171717] via-[#212121] to-[#b50002] p-4 sm:p-5 border border-white/10 mt-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] font-black text-[#b9b9b9]/80 mb-1">
              Fleet Onboarding
            </p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white">
              Add Motorcycle
            </h1>
            <p className="text-xs sm:text-sm text-[#b9b9b9]/80 mt-1.5 max-w-xl">
              Register a new unit with complete specs, image, and
              availability-ready details.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 bg-gradient-to-br from-[#d0d0d0] to-[#b9b9b9] backdrop-blur-md rounded-3xl shadow-2xl shadow-black/20 border border-[#171717]/10">
        <form onSubmit={handleSubmit} className={AddCarPageStyles.form}>
          {/* ── Row 1: Unit ID + Tracker ID side by side ── */}
          <div className="mb-5">
            <p className="text-xs font-black text-[#171717]/55 uppercase tracking-widest mb-2">
              Unit Identifier
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <F icon={FaIdCard} label="Unit ID">
                <input
                  required
                  name="unitId"
                  value={data.unitId}
                  onChange={handleChange}
                  type="text"
                  className={inputCls}
                  placeholder="e.g. UNIT-01"
                  maxLength={30}
                />
              </F>
              <F
                icon={FaSatelliteDish}
                label="GPS Tracker ID (Traccar Device Unique ID)"
              >
                <input
                  name="traccarDeviceId"
                  value={data.traccarDeviceId}
                  onChange={handleChange}
                  type="text"
                  className={inputCls}
                  placeholder="e.g. 9210010703"
                  maxLength={50}
                />
              </F>
            </div>
            {data.traccarDeviceId && (
              <p className="text-xs text-[#171717]/50 mt-1.5 ml-1">
                📡 This ID must match the device's unique ID registered in
                Traccar.
              </p>
            )}
          </div>

          {/* ── Row 2: Two columns ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ── LEFT ── */}
            <div>
              <p className="text-xs font-black text-[#171717]/55 uppercase tracking-widest mb-2">
                Motorcycle Details
              </p>
              {/* Row A: Brand / Category / Year */}
              <div className="grid grid-cols-3 gap-4 mb-5">
                <F icon={FaTag} label="Brand">
                  <select
                    required
                    name="brandName"
                    value={data.brandName}
                    onChange={handleChange}
                    className={selectCls}
                  >
                    {["Honda", "Yamaha", "Suzuki", "Kawasaki"].map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </F>
                <F icon={FaLayerGroup} label="Category">
                  <select
                    required
                    name="category"
                    value={data.category}
                    onChange={handleChange}
                    className={selectCls}
                  >
                    {["Scooter", "Naked", "Underbone"].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </F>
                <F icon={FaCalendarAlt} label="Year">
                  <input
                    required
                    name="year"
                    value={data.year}
                    onChange={handleChange}
                    type="number"
                    onKeyDown={noScroll}
                    className={inputCls}
                    placeholder="2020"
                    min="1990"
                    max={new Date().getFullYear()}
                  />
                </F>
              </div>

              {/* Row B: Model / Engine / Fuel */}
              <div className="grid grid-cols-3 gap-4 mb-5">
                <F icon={FaMotorcycle} label="Model">
                  <input
                    required
                    name="model"
                    value={data.model}
                    onChange={handleChange}
                    type="text"
                    className={inputCls}
                    placeholder="e.g., Click"
                    maxLength={18}
                  />
                </F>
                <F icon={FaTachometerAlt} label="Engine (cc)">
                  <input
                    required
                    name="engineSize"
                    value={data.engineSize}
                    onChange={handleChange}
                    type="number"
                    onKeyDown={noScroll}
                    className={inputCls}
                    placeholder="150"
                    min="50"
                  />
                </F>
                <F icon={FaGasPump} label="Fuel">
                  <select
                    required
                    name="fuelType"
                    value={data.fuelType}
                    onChange={handleChange}
                    className={selectCls}
                  >
                    {["Unleaded", "Premium"].map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </F>
              </div>

              {/* Row C: Daily Price / Transmission */}
              <div className="grid grid-cols-2 gap-4 mb-5">
                <F label="Daily Price">
                  <span className="absolute left-3.5 text-[#b50002] text-sm pointer-events-none font-bold">
                    ₱
                  </span>
                  <input
                    required
                    name="dailyPrice"
                    value={data.dailyPrice}
                    onChange={handleChange}
                    type="number"
                    onKeyDown={noScroll}
                    className={inputCls}
                    placeholder="200"
                    min="1"
                  />
                </F>
                <F icon={FaCog} label="Transmission">
                  <select
                    required
                    name="transmission"
                    value={data.transmission}
                    onChange={handleChange}
                    className={selectCls}
                  >
                    <option value="Manual">Manual</option>
                    <option value="Automatic">Automatic</option>
                    <option value="Semi-Automatic">Semi-Auto</option>
                  </select>
                </F>
              </div>

              {/* Row D: ABS / Helmet */}
              <div>
                <p className="text-xs font-black text-[#171717]/55 uppercase tracking-widest mb-2">
                  Features
                </p>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <F icon={FaShieldAlt} label="ABS">
                    <select
                      name="hasABS"
                      value={data.hasABS ? "yes" : "no"}
                      onChange={(e) =>
                        handleChange({
                          target: {
                            name: "hasABS",
                            value: e.target.value === "yes",
                          },
                        })
                      }
                      className={selectCls}
                    >
                      <option value="no">No ABS</option>
                      <option value="yes">Has ABS</option>
                    </select>
                  </F>
                  <F icon={FaHardHat} label="Helmet">
                    <select
                      name="hasHelmet"
                      value={data.hasHelmet ? "yes" : "no"}
                      onChange={(e) =>
                        handleChange({
                          target: {
                            name: "hasHelmet",
                            value: e.target.value === "yes",
                          },
                        })
                      }
                      className={selectCls}
                    >
                      <option value="no">No Helmet</option>
                      <option value="yes">Includes Helmet</option>
                    </select>
                  </F>
                </div>
              </div>
            </div>

            {/* ── RIGHT — Image + Description ── */}
            <div className="flex flex-col gap-5 h-full">
              <p className="text-xs font-black text-[#171717]/55 uppercase tracking-widest">
                Media &amp; Notes
              </p>

              <F label="Motorcycle Image">
                <div className={AddCarPageStyles.imageUploadContainer}>
                  <label className={AddCarPageStyles.imageUploadLabel}>
                    {data.imagePreview ? (
                      <div className="w-full h-full rounded-xl overflow-hidden">
                        <img
                          src={data.imagePreview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className={AddCarPageStyles.imageUploadPlaceholder}>
                        <svg
                          className={AddCarPageStyles.iconUpload}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.5"
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <p className={AddCarPageStyles.imageUploadText}>
                          <span
                            className={AddCarPageStyles.imageUploadTextSemibold}
                          >
                            Click to upload
                          </span>{" "}
                          or drag and drop
                        </p>
                        <p className={AddCarPageStyles.imageUploadSubText}>
                          PNG, JPG up to 5MB
                        </p>
                      </div>
                    )}
                    <input
                      type="file"
                      ref={fileRef}
                      name="image"
                      onChange={handleImageChange}
                      className="hidden"
                      accept="image/*"
                    />
                  </label>
                </div>
              </F>

              <F label="Description">
                <textarea
                  required
                  name="description"
                  value={data.description}
                  onChange={handleChange}
                  rows="6"
                  className={AddCarPageStyles.textarea}
                  placeholder="Describe features, condition, special details..."
                />
              </F>
            </div>
          </div>

          {/* ── Submit ── */}
          <div className="mt-7 flex justify-center">
            <button
              type="submit"
              className="px-8 py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold text-sm text-white bg-[#171717] shadow-lg shadow-[#171717]/25 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 focus:outline-none"
            >
              <FaMotorcycle style={{ fontSize: 14 }} />
              <span className={AddCarPageStyles.buttonText}>
                Add Motorcycle
              </span>
            </button>
          </div>
        </form>
      </div>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
        icon={false}
        toastClassName="relative flex items-center"
      />
    </div>
  );
};

export default AddMotorcycle;
