import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Tag,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Percent,
  DollarSign,
  Calendar,
  Clock,
  Users,
  Bike,
  ChevronDown,
  ChevronUp,
  X,
  CheckCircle,
  AlertCircle,
  Copy,
  TrendingUp,
  Zap,
  Star,
} from "lucide-react";
import axios from "axios";
import { createPortal } from "react-dom";
import API_BASE_URL from "../apiBase";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { Accept: "application/json" },
});

// ── Helpers ────────────────────────────────────────────────────────────────
const todayISO = () => {
  const d = new Date();
  return d.toISOString().split("T")[0];
};

const formatDate = (iso) => {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-PH", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

const isPromoActive = (promo) => {
  if (!promo.isActive) return false;
  const now = new Date();
  if (promo.startDate && new Date(promo.startDate) > now) return false;
  if (promo.endDate && new Date(promo.endDate) < now) return false;
  return true;
};

const getPromoStatus = (promo) => {
  if (!promo.isActive)
    return { label: "Inactive", color: "text-slate-400 bg-slate-100" };
  const now = new Date();
  if (promo.startDate && new Date(promo.startDate) > now)
    return { label: "Scheduled", color: "text-amber-700 bg-amber-50" };
  if (promo.endDate && new Date(promo.endDate) < now)
    return { label: "Expired", color: "text-red-700 bg-red-50" };
  return { label: "Active", color: "text-green-700 bg-green-50" };
};

const DISCOUNT_TYPES = [
  { value: "percentage", label: "Percentage-Based", icon: Percent },
  { value: "fixed", label: "Fixed Amount", icon: DollarSign },
];

const VEHICLE_CATEGORIES = [
  "Sport",
  "Naked",
  "Scooter",
  "Adventure",
  "Cruiser",
  "Underbone",
  "Moped",
  "Touring",
];

const MIN_DURATION_OPTIONS = [
  { value: 0, label: "No Minimum" },
  { value: 1, label: "1 Day" },
  { value: 2, label: "2 Days" },
  { value: 3, label: "3 Days" },
  { value: 5, label: "5 Days" },
  { value: 7, label: "1 Week" },
  { value: 14, label: "2 Weeks" },
  { value: 30, label: "1 Month" },
];

const normalizePromo = (promo = {}) => ({
  ...promo,
  discountType: promo.discountType || promo.type || "percentage",
  discountValue: Number(promo.discountValue ?? promo.value ?? 0),
  startDate: promo.startDate || promo.validFrom || null,
  endDate: promo.endDate || promo.validTo || null,
  maxUses:
    promo.maxUses !== undefined && promo.maxUses !== null
      ? Number(promo.maxUses)
      : promo.usageLimit !== undefined && promo.usageLimit !== null
        ? Number(promo.usageLimit)
        : null,
  usedCount: Number(promo.usedCount ?? promo.usageCount ?? 0),
  minRentalDays: Number(promo.minRentalDays ?? promo.minimumRentalDays ?? 0),
  applicableVehicleIds:
    promo.applicableVehicleIds || promo.applicableVehicleUnits || [],
  applicableCategories: promo.applicableCategories || [],
  isActive: promo.isActive !== false,
});

// ── Toast ──────────────────────────────────────────────────────────────────
const Toast = ({ message, type, onClose }) =>
  createPortal(
    <div
      className={`fixed bottom-6 right-6 z-[99999] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold
        ${type === "success" ? "bg-[#171717] text-white" : "bg-[#b50002] text-white"}`}
    >
      {type === "success" ? (
        <CheckCircle className="w-4 h-4 flex-shrink-0" />
      ) : (
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
      )}
      {message}
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>,
    document.body,
  );

// ── Confirm Delete Modal ───────────────────────────────────────────────────
const ConfirmModal = ({ title, message, onConfirm, onCancel }) =>
  createPortal(
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[99998] flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-5 h-5 text-[#b50002]" />
        </div>
        <h3 className="text-base font-black text-[#171717] text-center mb-1">
          {title}
        </h3>
        <p className="text-sm text-slate-400 text-center mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-[#b50002] text-white text-sm font-semibold hover:brightness-110 transition-all shadow-md shadow-[#b50002]/30"
          >
            Delete
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );

// ── Promo Form Modal ───────────────────────────────────────────────────────
const PromoFormModal = ({ promo, motorcycles, onSave, onClose }) => {
  const isEdit = Boolean(promo?._id);
  const [form, setForm] = useState({
    name: promo?.name || "",
    code: promo?.code || "",
    description: promo?.description || "",
    discountType: promo?.discountType || "percentage",
    discountValue: promo?.discountValue ?? "",
    startDate: promo?.startDate ? promo.startDate.split("T")[0] : "",
    endDate: promo?.endDate ? promo.endDate.split("T")[0] : "",
    maxUses: promo?.maxUses ?? "",
    minRentalDays: promo?.minRentalDays ?? 0,
    applicableVehicleIds: promo?.applicableVehicleIds || [],
    applicableCategories: promo?.applicableCategories || [],
    isActive: promo?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [showVehicles, setShowVehicles] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.discountValue && form.discountValue !== 0)
      e.discountValue = "Discount value is required";
    if (form.discountType === "percentage") {
      const v = Number(form.discountValue);
      if (isNaN(v) || v <= 0 || v > 100) e.discountValue = "Enter 1–100%";
    } else {
      const v = Number(form.discountValue);
      if (isNaN(v) || v <= 0) e.discountValue = "Enter a positive amount";
    }
    if (form.endDate && form.startDate && form.endDate < form.startDate)
      e.endDate = "End date must be after start date";
    if (
      form.maxUses !== "" &&
      (isNaN(Number(form.maxUses)) || Number(form.maxUses) < 1)
    )
      e.maxUses = "Must be a positive number or leave blank";
    return e;
  };

  const handleChange = (field, value) => {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: undefined }));
  };

  const toggleCategory = (cat) => {
    setForm((p) => ({
      ...p,
      applicableCategories: p.applicableCategories.includes(cat)
        ? p.applicableCategories.filter((c) => c !== cat)
        : [...p.applicableCategories, cat],
    }));
  };

  const toggleVehicle = (id) => {
    setForm((p) => ({
      ...p,
      applicableVehicleIds: p.applicableVehicleIds.includes(id)
        ? p.applicableVehicleIds.filter((v) => v !== id)
        : [...p.applicableVehicleIds, id],
    }));
  };

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const prefix =
      form.name
        .toUpperCase()
        .replace(/[^A-Z]/g, "")
        .slice(0, 4) || "PROMO";
    const suffix = Array.from(
      { length: 4 },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join("");
    handleChange("code", `${prefix}${suffix}`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        discountValue: Number(form.discountValue),
        maxUses: form.maxUses !== "" ? Number(form.maxUses) : null,
        minRentalDays: Number(form.minRentalDays),
      };
      await onSave(payload);
    } finally {
      setSaving(false);
    }
  };

  const inputCls = (field) =>
    `w-full px-3.5 py-2.5 rounded-xl border text-sm text-[#171717] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#b50002]/30 transition-all
    ${errors[field] ? "border-red-300 bg-red-50" : "border-slate-200 bg-white hover:border-slate-300"}`;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[99990] flex items-start justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#171717] to-[#2a2a2a] rounded-t-3xl px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#b50002]/20 flex items-center justify-center">
              <Tag className="w-4 h-4 text-[#b50002]" />
            </div>
            <div>
              <h2 className="text-white font-black text-base">
                {isEdit ? "Edit Promo" : "New Promo"}
              </h2>
              <p className="text-white/50 text-xs">
                {isEdit
                  ? "Update discount details"
                  : "Create a new discount offer"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name & Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#171717]/60 uppercase tracking-wider mb-1.5">
                Promo Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Summer Ride Promo"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className={inputCls("name")}
              />
              {errors.name && (
                <p className="text-xs text-red-600 mt-1">{errors.name}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-[#171717]/60 uppercase tracking-wider mb-1.5">
                Promo Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. SUMMER25"
                  value={form.code}
                  onChange={(e) =>
                    handleChange("code", e.target.value.toUpperCase())
                  }
                  className={`${inputCls("code")} flex-1 font-mono`}
                />
                <button
                  type="button"
                  onClick={generateCode}
                  title="Generate Code"
                  className="px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors"
                >
                  <Zap className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-[#171717]/60 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              rows={2}
              placeholder="Brief description shown to customers..."
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              className={`${inputCls("description")} resize-none`}
            />
          </div>

          {/* Discount Type & Value */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#171717]/60 uppercase tracking-wider mb-1.5">
                Discount Type *
              </label>
              <div className="flex gap-2">
                {DISCOUNT_TYPES.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleChange("discountType", value)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all
                      ${
                        form.discountType === value
                          ? "bg-[#171717] text-white border-[#171717] shadow-md"
                          : "border-slate-200 text-slate-500 hover:border-slate-300"
                      }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {value === "percentage" ? "%" : "₱"}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {form.discountType === "percentage"
                  ? "Percentage-Based Discount"
                  : "Fixed Amount Discount"}
              </p>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#171717]/60 uppercase tracking-wider mb-1.5">
                Discount Value *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#b50002]">
                  {form.discountType === "percentage" ? "%" : "₱"}
                </span>
                <input
                  type="number"
                  min="0"
                  max={form.discountType === "percentage" ? 100 : undefined}
                  step={form.discountType === "percentage" ? 0.1 : 1}
                  placeholder={
                    form.discountType === "percentage" ? "e.g. 15" : "e.g. 200"
                  }
                  value={form.discountValue}
                  onChange={(e) =>
                    handleChange("discountValue", e.target.value)
                  }
                  className={`${inputCls("discountValue")} pl-8`}
                />
              </div>
              {errors.discountValue && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.discountValue}
                </p>
              )}
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#171717]/60 uppercase tracking-wider mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => handleChange("startDate", e.target.value)}
                className={inputCls("startDate")}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#171717]/60 uppercase tracking-wider mb-1.5">
                End Date
              </label>
              <input
                type="date"
                min={form.startDate || todayISO()}
                value={form.endDate}
                onChange={(e) => handleChange("endDate", e.target.value)}
                className={inputCls("endDate")}
              />
              {errors.endDate && (
                <p className="text-xs text-red-600 mt-1">{errors.endDate}</p>
              )}
            </div>
          </div>

          {/* Usage & Min Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#171717]/60 uppercase tracking-wider mb-1.5">
                Max Uses (leave blank for unlimited)
              </label>
              <input
                type="number"
                min="1"
                placeholder="e.g. 100"
                value={form.maxUses}
                onChange={(e) => handleChange("maxUses", e.target.value)}
                className={inputCls("maxUses")}
              />
              {errors.maxUses && (
                <p className="text-xs text-red-600 mt-1">{errors.maxUses}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-[#171717]/60 uppercase tracking-wider mb-1.5">
                Minimum Rental Duration
              </label>
              <div className="relative">
                <select
                  value={form.minRentalDays}
                  onChange={(e) =>
                    handleChange("minRentalDays", Number(e.target.value))
                  }
                  className={`${inputCls("minRentalDays")} appearance-none pr-8`}
                >
                  {MIN_DURATION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Applicable Categories */}
          <div>
            <label className="block text-xs font-bold text-[#171717]/60 uppercase tracking-wider mb-2">
              Applicable Categories
              <span className="ml-1.5 text-slate-400 font-normal normal-case">
                (leave empty = all categories)
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              {VEHICLE_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all
                    ${
                      form.applicableCategories.includes(cat)
                        ? "bg-[#b50002] text-white border-[#b50002] shadow-sm shadow-[#b50002]/30"
                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Applicable Vehicles */}
          <div>
            <button
              type="button"
              onClick={() => setShowVehicles((v) => !v)}
              className="flex items-center gap-2 text-xs font-bold text-[#171717]/60 uppercase tracking-wider hover:text-[#171717] transition-colors"
            >
              <Bike className="w-3.5 h-3.5" />
              Applicable Vehicle Units
              <span className="ml-1 text-slate-400 font-normal normal-case">
                (leave empty = all vehicles)
              </span>
              {showVehicles ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
            {showVehicles && (
              <div className="mt-2 max-h-40 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-3 bg-slate-50">
                {motorcycles.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-2">
                    No motorcycles found
                  </p>
                ) : (
                  motorcycles.map((m) => {
                    const mid = m._id || m.id;
                    const name =
                      `${m.make || ""} ${m.model || ""}`.trim() || "Unnamed";
                    return (
                      <label
                        key={mid}
                        className="flex items-center gap-2.5 cursor-pointer group"
                      >
                        <input
                          type="checkbox"
                          checked={form.applicableVehicleIds.includes(mid)}
                          onChange={() => toggleVehicle(mid)}
                          className="w-4 h-4 accent-[#b50002] cursor-pointer"
                        />
                        <span className="text-sm text-[#171717] group-hover:text-[#b50002] transition-colors">
                          {name}
                          {m.year ? ` (${m.year})` : ""}
                          {m.category ? ` — ${m.category}` : ""}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            )}
            {form.applicableVehicleIds.length > 0 && (
              <p className="text-xs text-[#b50002] mt-1 font-semibold">
                {form.applicableVehicleIds.length} vehicle(s) selected
              </p>
            )}
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div>
              <p className="text-sm font-bold text-[#171717]">Promo Status</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {form.isActive
                  ? "Promo is active and visible to customers"
                  : "Promo is disabled"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleChange("isActive", !form.isActive)}
              className="flex-shrink-0"
            >
              {form.isActive ? (
                <ToggleRight className="w-9 h-9 text-green-600" />
              ) : (
                <ToggleLeft className="w-9 h-9 text-slate-400" />
              )}
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-[#b50002] text-white text-sm font-bold hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-[#b50002]/30 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Promo"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
};

// ── Promo Card ─────────────────────────────────────────────────────────────
const PromoCard = ({ promo, onEdit, onToggle, onDelete, onCopyCode }) => {
  const status = getPromoStatus(promo);
  const usagePercent =
    promo.maxUses && promo.usedCount != null
      ? Math.min(100, Math.round((promo.usedCount / promo.maxUses) * 100))
      : null;

  return (
    <div
      className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden
      ${!isPromoActive(promo) ? "opacity-70" : ""}`}
    >
      {/* Top stripe */}
      <div
        className={`h-1.5 w-full ${isPromoActive(promo) ? "bg-gradient-to-r from-[#b50002] to-[#ff4444]" : "bg-slate-200"}`}
      />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-black text-[#171717] text-sm truncate">
                {promo.name}
              </h3>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${status.color}`}
              >
                {status.label}
              </span>
            </div>
            {promo.code && (
              <button
                onClick={() => onCopyCode(promo.code)}
                className="flex items-center gap-1.5 mt-1 text-xs font-mono font-bold text-[#b50002] hover:text-[#900000] transition-colors group"
              >
                {promo.code}
                <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
          </div>
          <div className="flex-shrink-0 text-right">
            <div className="text-xl font-black text-[#b50002]">
              {promo.discountType === "percentage"
                ? `${promo.discountValue}%`
                : `₱${promo.discountValue}`}
            </div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase">
              {promo.discountType === "percentage" ? "Percentage" : "Fixed"}
            </div>
          </div>
        </div>

        {promo.description && (
          <p className="text-xs text-slate-500 mb-3 line-clamp-2">
            {promo.description}
          </p>
        )}

        {/* Meta chips */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {promo.startDate || promo.endDate ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 text-[10px] font-semibold text-slate-600">
              <Calendar className="w-2.5 h-2.5" />
              {promo.startDate ? formatDate(promo.startDate) : "Now"}
              {" → "}
              {promo.endDate ? formatDate(promo.endDate) : "No end"}
            </span>
          ) : null}
          {promo.minRentalDays > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 text-[10px] font-semibold text-slate-600">
              <Clock className="w-2.5 h-2.5" />
              Min {promo.minRentalDays}d
            </span>
          )}
          {promo.applicableCategories?.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 text-[10px] font-semibold text-slate-600">
              <Bike className="w-2.5 h-2.5" />
              {promo.applicableCategories.join(", ")}
            </span>
          )}
          {promo.applicableVehicleIds?.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 text-[10px] font-semibold text-amber-700">
              <Star className="w-2.5 h-2.5" />
              {promo.applicableVehicleIds.length} specific unit(s)
            </span>
          )}
        </div>

        {/* Usage bar */}
        {promo.maxUses != null ? (
          <div className="mb-4">
            <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 mb-1">
              <span className="flex items-center gap-1">
                <Users className="w-2.5 h-2.5" />
                Usage
              </span>
              <span>
                {promo.usedCount ?? 0} / {promo.maxUses}
              </span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#b50002] to-[#ff4444] rounded-full transition-all"
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
              <Users className="w-2.5 h-2.5" />
              {promo.usedCount ?? 0} uses · Unlimited
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggle(promo)}
            title={promo.isActive ? "Deactivate" : "Activate"}
            className="flex-shrink-0 p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            {promo.isActive ? (
              <ToggleRight className="w-4 h-4 text-green-600" />
            ) : (
              <ToggleLeft className="w-4 h-4 text-slate-400" />
            )}
          </button>
          <button
            onClick={() => onEdit(promo)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Edit
          </button>
          <button
            onClick={() => onDelete(promo)}
            className="flex-shrink-0 p-2 rounded-xl border border-slate-200 text-slate-400 hover:bg-red-50 hover:text-[#b50002] hover:border-red-200 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Stats Bar ──────────────────────────────────────────────────────────────
const StatsBar = ({ promos }) => {
  const active = promos.filter((p) => isPromoActive(p)).length;
  const totalUses = promos.reduce((s, p) => s + (p.usedCount || 0), 0);
  const scheduled = promos.filter((p) => {
    if (!p.isActive) return false;
    return p.startDate && new Date(p.startDate) > new Date();
  }).length;
  const expired = promos.filter((p) => {
    return p.endDate && new Date(p.endDate) < new Date();
  }).length;

  const stats = [
    {
      label: "Total Promos",
      value: promos.length,
      icon: Tag,
      color: "text-[#171717]",
      bg: "bg-[#171717]/5",
    },
    {
      label: "Active",
      value: active,
      icon: CheckCircle,
      color: "text-green-700",
      bg: "bg-green-50",
    },
    {
      label: "Scheduled",
      value: scheduled,
      icon: Clock,
      color: "text-amber-700",
      bg: "bg-amber-50",
    },
    {
      label: "Total Uses",
      value: totalUses,
      icon: TrendingUp,
      color: "text-[#b50002]",
      bg: "bg-red-50",
    },
    {
      label: "Expired",
      value: expired,
      icon: AlertCircle,
      color: "text-slate-500",
      bg: "bg-slate-100",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
      {stats.map(({ label, value, icon: Icon, color, bg }) => (
        <div
          key={label}
          className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm"
        >
          <div
            className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center mb-2`}
          >
            <Icon className={`w-4 h-4 ${color}`} />
          </div>
          <div className={`text-xl font-black ${color}`}>{value}</div>
          <div className="text-[11px] text-slate-400 font-semibold mt-0.5">
            {label}
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────
const DiscountManagement = () => {
  const [promos, setPromos] = useState([]);
  const [motorcycles, setMotorcycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(null);

  const toastTimer = useRef(null);

  const showToast = useCallback((message, type = "success") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const getAuthHeader = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Fetch promos
  const fetchPromos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/discounts", { headers: getAuthHeader() });
      const raw = Array.isArray(res.data)
        ? res.data
        : res.data.data || res.data.discounts || [];
      const data = raw.map(normalizePromo);
      setPromos(data);
    } catch {
      setPromos([]);
      showToast("Failed to load promos from API", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Fetch motorcycles for vehicle selector
  const fetchMotorcycles = useCallback(async () => {
    try {
      const res = await api.get("/api/motorcycles", { params: { limit: 100 } });
      const data = Array.isArray(res.data.data)
        ? res.data.data
        : Array.isArray(res.data)
          ? res.data
          : [];
      setMotorcycles(data);
    } catch {
      setMotorcycles([]);
    }
  }, []);

  useEffect(() => {
    fetchPromos();
    fetchMotorcycles();
  }, [fetchPromos, fetchMotorcycles]);

  const handleSave = async (payload) => {
    try {
      if (editingPromo?._id) {
        await api.put(`/api/discounts/${editingPromo._id}`, payload, {
          headers: getAuthHeader(),
        });
      } else {
        await api.post("/api/discounts", payload, { headers: getAuthHeader() });
      }
      await fetchPromos();
      showToast(editingPromo ? "Promo updated!" : "Promo created!");
    } catch {
      showToast("Failed to save promo", "error");
      return;
    }
    setShowForm(false);
    setEditingPromo(null);
  };

  const handleToggle = async (promo) => {
    try {
      await api.patch(
        `/api/discounts/${promo._id}/toggle`,
        {},
        { headers: getAuthHeader() },
      );
      await fetchPromos();
    } catch {
      showToast("Failed to update promo status", "error");
      return;
    }
    showToast(`Promo ${promo.isActive ? "deactivated" : "activated"}!`);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/api/discounts/${deleteTarget._id}`, {
        headers: getAuthHeader(),
      });
      await fetchPromos();
    } catch {
      showToast("Failed to delete promo", "error");
      return;
    }
    showToast("Promo deleted.");
    setDeleteTarget(null);
  };

  const handleCopyCode = (code) => {
    navigator.clipboard?.writeText(code).catch(() => {});
    showToast(`Code "${code}" copied!`);
  };

  const filteredPromos = promos.filter((p) => {
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.code || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.description || "").toLowerCase().includes(search.toLowerCase());

    const status = getPromoStatus(p).label.toLowerCase();
    const matchStatus = filterStatus === "all" || status === filterStatus;

    return matchSearch && matchStatus;
  });

  return (
    <div className="min-h-screen bg-[#f4f3f3]">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      {deleteTarget && (
        <ConfirmModal
          title="Delete Promo?"
          message={`"${deleteTarget.name}" will be permanently removed.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      {showForm && (
        <PromoFormModal
          promo={editingPromo}
          motorcycles={motorcycles}
          onSave={handleSave}
          onClose={() => {
            setShowForm(false);
            setEditingPromo(null);
          }}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-xl bg-[#b50002]/10 flex items-center justify-center">
                <Tag className="w-4.5 h-4.5 text-[#b50002]" />
              </div>
              <h1 className="text-2xl font-black text-[#171717]">
                Discounts & Promos
              </h1>
            </div>
            <p className="text-sm text-slate-500 ml-12">
              Create and manage promotional offers for your fleet
            </p>
          </div>
          <button
            onClick={() => {
              setEditingPromo(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#b50002] text-white text-sm font-bold rounded-xl shadow-lg shadow-[#b50002]/30 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            New Promo
          </button>
        </div>

        {/* Stats */}
        <StatsBar promos={promos} />

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, code, or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-[#171717] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#b50002]/20 focus:border-[#b50002]/30 shadow-sm"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {["all", "active", "inactive", "scheduled", "expired"].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all border
                  ${
                    filterStatus === s
                      ? "bg-[#171717] text-white border-[#171717] shadow-md"
                      : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                  }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border h-56 animate-pulse"
              />
            ))}
          </div>
        ) : filteredPromos.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Tag className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-[#171717] font-bold text-base">
              No promos found
            </p>
            <p className="text-slate-400 text-sm mt-1">
              {search || filterStatus !== "all"
                ? "Try adjusting your search or filter"
                : "Create your first promotional offer"}
            </p>
            {!search && filterStatus === "all" && (
              <button
                onClick={() => {
                  setEditingPromo(null);
                  setShowForm(true);
                }}
                className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-[#b50002] text-white text-sm font-bold rounded-xl shadow-lg shadow-[#b50002]/20 hover:brightness-110 transition-all mx-auto"
              >
                <Plus className="w-4 h-4" />
                Create First Promo
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPromos.map((promo) => (
              <PromoCard
                key={promo._id}
                promo={promo}
                onEdit={(p) => {
                  setEditingPromo(p);
                  setShowForm(true);
                }}
                onToggle={handleToggle}
                onDelete={setDeleteTarget}
                onCopyCode={handleCopyCode}
              />
            ))}
          </div>
        )}

        {/* Results count */}
        {!loading && filteredPromos.length > 0 && (
          <p className="text-center text-xs text-slate-400 mt-6">
            Showing {filteredPromos.length} of {promos.length} promo
            {promos.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    </div>
  );
};

export default DiscountManagement;
