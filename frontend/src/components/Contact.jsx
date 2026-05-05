import React, { useState } from "react";
import {
  FaMotorcycle,
  FaClock,
  FaComment,
  FaEnvelope,
  FaMapMarkerAlt,
  FaPhone,
  FaUser,
  FaWhatsapp,
} from "react-icons/fa";
import { IoIosSend } from "react-icons/io";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

//input
const inputCls =
  "w-full pl-10 pr-4 py-2.5 bg-transparent text-[#171717] text-sm placeholder-[#171717]/40 focus:outline-none rounded-xl";

const selectCls =
  "w-full pl-10 pr-4 py-2.5 bg-transparent text-[#171717] text-sm focus:outline-none rounded-xl appearance-none";

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

// ── Info row ─────────────────────────────────────
const InfoRow = ({ icon: Icon, label, value, sub }) => (
  <div className="flex items-start gap-3 py-3 border-b border-[#171717]/8 last:border-0">
    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
      <Icon className="text-[#b50002] text-sm" />
    </div>
    <div className="min-w-0">
      <p className="text-[#171717]/50 text-xs font-semibold uppercase tracking-wider">
        {label}
      </p>
      <p className="text-sm font-semibold mt-0.5 break-words text-[#171717]">
        {value}
      </p>
      {sub && <p className="text-xs text-[#171717]/50 mt-0.5">{sub}</p>}
    </div>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    carType: "",
    message: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;
    if (name === "name") newValue = newValue.slice(0, 64);
    if (name === "email") newValue = newValue.slice(0, 254);
    if (name === "phone") newValue = newValue.replace(/\D/g, "").slice(0, 11);
    setFormData((prev) => ({ ...prev, [name]: newValue }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Name is required");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      alert("Please enter a valid email address");
      return;
    }
    if (!/^09\d{9}$/.test(formData.phone)) {
      alert("Phone number must start with 09 and be 11 digits");
      return;
    }

    const whatsappMessage =
      `Name: ${formData.name}%0A` +
      `Email: ${formData.email}%0A` +
      `Phone: ${formData.phone}%0A` +
      `Car Type: ${formData.carType}%0A` +
      `Message: ${formData.message}`;

    window.open(`https://wa.me/09811991157?text=${whatsappMessage}`, "_blank");
    setFormData({ name: "", email: "", phone: "", carType: "", message: "" });
  };

  return (
    <div className="min-h-screen bg-[#e8e8e8]">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 pt-32 pb-16">
        <div className="flex flex-col lg:flex-row gap-6 items-start mt-10">
          {/* ── LEFT COLUMN — Info card ── */}
          <div className="w-full lg:w-72 flex-shrink-0 space-y-4">
            {/* Brand / identity card */}
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
                  <FaMotorcycle className="text-white text-2xl" />
                </div>

                <h2 className="text-white font-black text-lg leading-tight">
                  Get In Touch
                </h2>
                <p className="text-white/60 text-xs mt-1">
                  We're happy to help with your rental needs.
                </p>
              </div>
            </div>

            {/* Contact details card */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 border border-white/50 shadow-lg shadow-black/10">
              <h3 className="text-xs font-bold text-[#171717]/50 uppercase tracking-widest mb-3">
                Contact Info
              </h3>
              <div className="space-y-0">
                <InfoRow
                  icon={FaWhatsapp}
                  label="WhatsApp"
                  value="+639811991157"
                />
                <InfoRow
                  icon={FaEnvelope}
                  label="Email"
                  value="anaiasmotorcyclerental@gmail.com"
                />
                <InfoRow
                  icon={FaMapMarkerAlt}
                  label="Location"
                  value="Bacoor, Cavite"
                />
                <InfoRow
                  icon={FaClock}
                  label="Business Hours"
                  value="Mon–Fri: 8AM – 8PM"
                  sub="Sunday: 10AM – 4PM"
                />
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN — Form panel ── */}
          <div className="flex-1 bg-[#f4f3f3] rounded-3xl shadow-lg shadow-black/10 overflow-hidden">
            {/* Panel header bar */}
            <div className="bg-gradient-to-r from-[#171717] to-[#2a2a2a] px-6 py-4 flex items-center justify-between">
              <div>
                <h1 className="text-white font-black text-base tracking-tight flex items-center gap-2">
                  <IoIosSend className="text-sm" /> Send Your Inquiry
                </h1>
                <p className="text-white/50 text-xs mt-0.5">
                  Fill out the form and we'll get back to you promptly.
                </p>
              </div>
            </div>

            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name & Email row */}
                <div>
                  <p className="text-xs font-bold text-[#171717]/50 uppercase tracking-widest mb-2">
                    Personal Details
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field icon={FaUser} label="Full Name *">
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className={inputCls}
                        placeholder="Juan Dela Cruz"
                        required
                        maxLength={64}
                      />
                    </Field>
                    <Field icon={FaEnvelope} label="Email Address *">
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className={inputCls}
                        placeholder="you@email.com"
                        required
                        maxLength={254}
                      />
                    </Field>
                  </div>
                </div>

                {/* Phone & Motorcycle row */}
                <div>
                  <p className="text-xs font-bold text-[#171717]/50 uppercase tracking-widest mb-2">
                    Rental Details
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        inputMode="numeric"
                        pattern="09\d{9}"
                      />
                    </Field>
                    <Field icon={FaMotorcycle} label="Motorcycle Type *">
                      <select
                        name="carType"
                        value={formData.carType}
                        onChange={handleChange}
                        required
                        className={selectCls}
                      >
                        <option value="">Select type…</option>
                        {["Scooter", "Naked", "Underbone"].map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </div>

                {/* Message */}
                <div>
                  <p className="text-xs font-bold text-[#171717]/50 uppercase tracking-widest mb-2">
                    Message
                  </p>
                  <div className="relative flex items-start bg-white/60 border border-[#171717]/10 rounded-xl shadow-sm focus-within:border-black transition-all hover:bg-white/90">
                    <FaComment className="absolute left-3.5 top-3 text-[#b50002] text-sm pointer-events-none" />
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={4}
                      placeholder="Tell us about your rental needs…"
                      className="w-full pl-10 pr-4 py-2.5 bg-transparent text-[#171717] text-sm placeholder-[#171717]/40 focus:outline-none rounded-xl resize-none"
                    />
                  </div>
                </div>

                {/* Submit */}
                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 py-3 bg-[#171717] text-white font-bold text-sm rounded-xl
                    shadow-lg shadow-[#171717]/30 hover:brightness-110 hover:scale-[1.01] active:scale-[0.98] transition-all duration-200"
                  >
                    <FaWhatsapp className="text-base" />
                    Send via WhatsApp
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Contact;
