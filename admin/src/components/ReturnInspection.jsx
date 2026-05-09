import React, { useCallback, useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import axios from "axios";
import {
  FaCheckCircle,
  FaSearch,
  FaTimes,
  FaExclamationTriangle,
  FaWrench,
  FaImages,
  FaFileInvoiceDollar,
  FaMotorcycle,
  FaIdCard,
  FaEnvelope,
  FaCalendarAlt,
  FaChevronDown,
} from "react-icons/fa";
import {
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  ClipboardList,
  Wrench,
  ShieldAlert,
} from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import API_BASE_URL from "../apiBase";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { Accept: "application/json" },
});

// ── Shared style tokens (mirrors ManageMotorcycle) ─────────────────────────
const labelCls =
  "block text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase mb-1.5";
const fieldCls =
  "w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[#171717] text-sm placeholder-slate-300 focus:outline-none focus:border-[#b50002]/30";

// ── Helpers ────────────────────────────────────────────────────────────────
const makeImageUrl = (filename) => {
  if (!filename) return "";
  const s = String(filename).trim();
  if (!s) return "";
  if (/^data:image\//i.test(s)) return s;
  if (/^https?:\/\//i.test(s)) return s.replace(/^http:\/\//i, "https://");
  const cleanPath = s.replace(/^\/+/, "").replace(/^uploads\//, "");
  return `${API_BASE_URL}/uploads/${cleanPath}`;
};

const formatDate = (s) => {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const labelFromValue = (val) =>
  val
    ? val
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
    : "Pending Inspection";

// ── Confirm Modal (same pattern as ManageMotorcycle) ──────────────────────
const ConfirmModal = ({
  message,
  onConfirm,
  onCancel,
  isPermanent,
  confirmLabel,
}) => (
  <div
    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
    onClick={onCancel}
  >
    <div
      className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-100"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="text-center">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
          <AlertTriangle className="w-6 h-6 text-[#b50002]" />
        </div>
        <h3 className="text-lg font-black text-[#171717] mb-2">
          {isPermanent ? "Permanent Action" : "Confirm Action"}
        </h3>
        <p className="text-slate-500 text-sm mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-[#b50002] text-white font-bold text-sm shadow-md shadow-[#b50002]/30 hover:brightness-110 transition-all"
          >
            {confirmLabel ?? "Confirm"}
          </button>
        </div>
      </div>
    </div>
  </div>
);

const confirmModal = (message, { isPermanent = false, confirmLabel } = {}) =>
  new Promise((resolve) => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const root = ReactDOM.createRoot(el);
    const cleanup = (r) => {
      root.unmount();
      document.body.removeChild(el);
      resolve(r);
    };
    root.render(
      <ConfirmModal
        message={message}
        isPermanent={isPermanent}
        confirmLabel={confirmLabel}
        onConfirm={() => cleanup(true)}
        onCancel={() => cleanup(false)}
      />,
    );
  });

// ── Clearance badge ────────────────────────────────────────────────────────
const CLEARANCE_STYLE = {
  cleared: "bg-emerald-50 text-emerald-600 border-emerald-200",
  damage_found: "bg-amber-50 text-amber-600 border-amber-200",
  penalty_required: "bg-red-50 text-[#b50002] border-red-200",
  pending_inspection: "bg-violet-50 text-violet-600 border-violet-200",
};

const ClearanceBadge = ({ status }) => {
  const cls =
    CLEARANCE_STYLE[status] ?? "bg-slate-50 text-slate-500 border-slate-200";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${cls}`}
    >
      {labelFromValue(status)}
    </span>
  );
};

// ── Stat Card (mirrors ManageMotorcycle StatCard) ─────────────────────────
const StatCard = ({
  label,
  value,
  sub,
  subColor,
  icon: Icon,
  accent,
  onClick,
  isActive,
  loading,
}) => (
  <button
    onClick={onClick}
    className={`relative text-left bg-white rounded-2xl border shadow-sm p-5 overflow-hidden group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 w-full
      ${isActive ? "border-[#b50002]/30" : "border-slate-100"}`}
  >
    <div
      className={`absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-10 blur-xl ${accent}`}
    />
    <div className="flex items-start justify-between mb-3">
      <p className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase">
        {label}
      </p>
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent} bg-opacity-10`}
      >
        <Icon className={`w-4 h-4 ${accent.replace("bg-", "text-")}`} />
      </div>
    </div>
    <p className="text-[2.2rem] font-black text-[#171717] leading-none mb-2">
      {loading ? (
        <span className="inline-block w-10 h-7 bg-slate-100 rounded-lg animate-pulse" />
      ) : (
        value
      )}
    </p>
    <p className={`text-[11px] font-semibold ${subColor}`}>{sub}</p>
  </button>
);

// ── Skeleton row ───────────────────────────────────────────────────────────
const SkeletonRow = () => (
  <tr>
    {[...Array(5)].map((_, i) => (
      <td key={i} className="px-5 py-3.5">
        <div
          className="h-4 bg-slate-100 rounded-lg animate-pulse"
          style={{ width: `${50 + i * 10}%` }}
        />
      </td>
    ))}
  </tr>
);

// ── Section header inside panel ────────────────────────────────────────────
const PanelSection = ({
  icon: Icon,
  title,
  children,
  accent = "text-[#b50002]",
}) => (
  <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-100">
    <div className="flex items-center gap-2 mb-3">
      <Icon className={`w-3.5 h-3.5 ${accent}`} />
      <p className="text-[10px] font-black tracking-[0.15em] text-slate-400 uppercase">
        {title}
      </p>
    </div>
    {children}
  </div>
);

// ── Options ────────────────────────────────────────────────────────────────
const CLEARANCE_OPTIONS = [
  { value: "pending_inspection", label: "Pending Inspection" },
  { value: "cleared", label: "Cleared" },
  { value: "damage_found", label: "Damage Found" },
  { value: "penalty_required", label: "Penalty Required" },
];

// ── Main Component ─────────────────────────────────────────────────────────
const ReturnInspection = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState("inspection");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [saving, setSaving] = useState(false);

  // Inspection form state
  const [clearanceStatus, setClearanceStatus] = useState("pending_inspection");
  const [damageNotes, setDamageNotes] = useState("");
  const [mechanicNotes, setMechanicNotes] = useState("");
  const [repairEstimateAmount, setRepairEstimateAmount] = useState("");
  const [repairEstimateNotes, setRepairEstimateNotes] = useState("");
  const [penaltyAmount, setPenaltyAmount] = useState("");
  const [penaltySummary, setPenaltySummary] = useState("");
  const [damageFiles, setDamageFiles] = useState([]);

  const fetchBookings = useCallback(async () => {
    try {
      const res = await api.get("/api/motorcycle-bookings", {
        params: { limit: 200, includeDeleted: "false" },
      });
      const raw = Array.isArray(res.data)
        ? res.data
        : res.data.data || res.data.bookings || [];
      const mapped = raw.map((b, idx) => {
        const id = b._id || b.id || `local-${idx + 1}`;
        const motorcycle = b.motorcycle || {};
        return {
          id,
          _id: b._id || b.id || null,
          customer: b.customer || "",
          email: b.email || "",
          phone: b.phone || "",
          status: b.status || "pending_reservation",
          pickupDate: b.pickupDate || "",
          returnDate: b.returnDate || "",
          motorcycleName:
            `${motorcycle.make || ""} ${motorcycle.model || ""}`.trim() ||
            b.motorcycleName ||
            "",
          unitId: motorcycle.unitId || "",
          motorcycleImage: motorcycle.image || b.motorcycleImage || "",
          returnInspection: b.returnInspection || {},
          amount: b.amount || 0,
        };
      });
      setBookings(mapped);
    } catch (err) {
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const counts = useMemo(
    () => ({
      active: bookings.filter((b) => b.status === "active").length,
      inspection: bookings.filter((b) => b.status === "inspection").length,
      cleared: bookings.filter(
        (b) => b.returnInspection?.clearanceStatus === "cleared",
      ).length,
      pending: bookings.filter(
        (b) =>
          b.status === "inspection" &&
          (!b.returnInspection?.clearanceStatus ||
            b.returnInspection?.clearanceStatus === "pending_inspection"),
      ).length,
    }),
    [bookings],
  );

  const filteredBookings = useMemo(() => {
    const base = bookings.filter((b) => b.status === selectedStatus);
    if (!searchTerm.trim()) return base;
    const q = searchTerm.toLowerCase();
    return base.filter(
      (b) =>
        b.customer.toLowerCase().includes(q) ||
        b.motorcycleName.toLowerCase().includes(q) ||
        b.unitId.toLowerCase().includes(q) ||
        b.email.toLowerCase().includes(q),
    );
  }, [bookings, searchTerm, selectedStatus]);

  const selectedBooking = useMemo(
    () => bookings.find((b) => b.id === selectedId) || null,
    [bookings, selectedId],
  );

  // Sync form when booking changes
  useEffect(() => {
    if (!selectedBooking) return;
    const inspection = selectedBooking.returnInspection || {};
    setClearanceStatus(inspection.clearanceStatus || "pending_inspection");
    setDamageNotes(inspection.damageNotes || "");
    setMechanicNotes(inspection.mechanicNotes || "");
    setRepairEstimateAmount(
      inspection.repairEstimateAmount != null
        ? String(inspection.repairEstimateAmount)
        : "",
    );
    setRepairEstimateNotes(inspection.repairEstimateNotes || "");
    setPenaltyAmount(
      inspection.penaltyAmount != null ? String(inspection.penaltyAmount) : "",
    );
    setPenaltySummary(inspection.penaltySummary || "");
    setDamageFiles([]);
  }, [selectedBooking]);

  const handleStartInspection = async (booking) => {
    if (!booking?._id) return;
    setSaving(true);
    try {
      await api.patch(`/api/motorcycle-bookings/${booking._id}/status`, {
        status: "inspection",
      });
      await fetchBookings();
      setSelectedStatus("inspection");
      setSelectedId(booking.id);
      toast.success("Inspection started");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to start inspection");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveInspection = async () => {
    if (!selectedBooking?._id) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("clearanceStatus", clearanceStatus);
      if (clearanceStatus === "damage_found") {
        formData.append("damageNotes", damageNotes);
        formData.append("mechanicNotes", mechanicNotes);
        formData.append("repairEstimateAmount", repairEstimateAmount || "0");
        formData.append("repairEstimateNotes", repairEstimateNotes);
        Array.from(damageFiles || []).forEach((file) =>
          formData.append("damagePhotos", file),
        );
      } else if (clearanceStatus === "penalty_required") {
        formData.append("penaltyAmount", penaltyAmount || "0");
        formData.append("penaltySummary", penaltySummary);
      }
      const response = await api.patch(
        `/api/motorcycle-bookings/${selectedBooking._id}/return-inspection`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      const updated = response?.data?.booking;
      if (updated) {
        setBookings((prev) =>
          prev.map((b) => (b._id === updated._id ? { ...b, ...updated } : b)),
        );
      }
      toast.success("Inspection updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update inspection");
    } finally {
      setSaving(false);
    }
  };

  const handleSettlePenalty = async () => {
    if (!selectedBooking?._id) return;
    const confirmed = await confirmModal(
      "Settle penalty and complete this inspection? This will add the penalty and repair estimate (if any) to booking revenue.",
      { confirmLabel: "Settle Penalty" },
    );
    if (!confirmed) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("clearanceStatus", clearanceStatus);
      formData.append("penaltySettled", "true");
      if (clearanceStatus === "damage_found") {
        formData.append("damageNotes", damageNotes);
        formData.append("mechanicNotes", mechanicNotes);
        formData.append("repairEstimateAmount", repairEstimateAmount || "0");
        formData.append("repairEstimateNotes", repairEstimateNotes);
      } else if (clearanceStatus === "penalty_required") {
        formData.append("penaltyAmount", penaltyAmount || "0");
        formData.append("penaltySummary", penaltySummary);
      }
      const response = await api.patch(
        `/api/motorcycle-bookings/${selectedBooking._id}/return-inspection`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      const updated = response?.data?.booking;
      if (updated) {
        setBookings((prev) =>
          prev.map((b) => (b._id === updated._id ? { ...b, ...updated } : b)),
        );
        toast.success("Penalty settled and inspection completed");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to settle penalty");
    } finally {
      setSaving(false);
    }
  };

  const statCards = [
    {
      label: "In Inspection",
      value: counts.inspection,
      sub: "Awaiting clearance",
      subColor: "text-amber-500",
      icon: Wrench,
      accent: "bg-amber-500",
      status: "inspection",
    },
    {
      label: "Active Rentals",
      value: counts.active,
      sub: "Can start inspection",
      subColor: "text-blue-500",
      icon: FaMotorcycle,
      accent: "bg-blue-500",
      status: "active",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pt-36">
        {/* Header */}
        <div className="mb-7">
          <h1 className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight">
            Return Inspection
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Move active rentals into inspection and record clearance outcomes.
          </p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {statCards.map((s) => (
            <StatCard
              key={s.label}
              {...s}
              loading={loading}
              isActive={selectedStatus === s.status}
              onClick={() => setSelectedStatus(s.status)}
            />
          ))}
          {/* Summary cards (non-clickable) */}
          <div className="relative bg-white rounded-2xl border border-slate-100 shadow-sm p-5 overflow-hidden">
            <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-10 blur-xl bg-emerald-500" />
            <div className="flex items-start justify-between mb-3">
              <p className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase">
                Cleared
              </p>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-500 bg-opacity-10">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
            </div>
            <p className="text-[2.2rem] font-black text-[#171717] leading-none mb-2">
              {counts.cleared}
            </p>
            <p className="text-[11px] font-semibold text-emerald-500">
              Released units
            </p>
          </div>
          <div className="relative bg-white rounded-2xl border border-slate-100 shadow-sm p-5 overflow-hidden">
            <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-10 blur-xl bg-violet-500" />
            <div className="flex items-start justify-between mb-3">
              <p className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase">
                Pending
              </p>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-violet-500 bg-opacity-10">
                <ClipboardList className="w-4 h-4 text-violet-500" />
              </div>
            </div>
            <p className="text-[2.2rem] font-black text-[#171717] leading-none mb-2">
              {counts.pending}
            </p>
            <p className="text-[11px] font-semibold text-violet-500">
              Needs review
            </p>
          </div>
        </div>

        {/* Main content + sidebar */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
          {/* Left: booking table — 3/4 */}
          <div className="xl:col-span-3 space-y-4">
            {/* Search toolbar */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="relative">
                <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 text-sm" />
                <input
                  type="text"
                  placeholder="Search customer, motorcycle, unit ID, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 text-sm text-[#171717] placeholder-slate-300 focus:outline-none focus:border-[#b50002]/30"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                  >
                    <FaTimes className="text-sm" />
                  </button>
                )}
              </div>
            </div>

            {/* Result count */}
            <div className="flex items-center px-1">
              <p className="text-[11px] text-slate-400 font-semibold">
                Showing{" "}
                <span className="text-[#171717] font-black">
                  {filteredBookings.length}
                </span>{" "}
                <span className="capitalize">{selectedStatus}</span> bookings
              </p>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-50">
                      {[
                        "Customer",
                        "Motorcycle",
                        "Return Date",
                        "Clearance",
                        "Actions",
                      ].map((col) => (
                        <th
                          key={col}
                          className="text-left text-[10px] font-black tracking-[0.15em] text-slate-300 uppercase px-5 py-3 whitespace-nowrap"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loading ? (
                      [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
                    ) : filteredBookings.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-12 text-center">
                          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <FaMotorcycle className="text-slate-200 text-xl" />
                          </div>
                          <p className="font-black text-[#171717] text-sm mb-1">
                            No bookings found
                          </p>
                          <p className="text-slate-400 text-xs">
                            Try adjusting your search or status filter
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredBookings.map((booking) => (
                        <tr
                          key={booking.id}
                          onClick={() => setSelectedId(booking.id)}
                          className={`hover:bg-slate-50/60 transition-colors cursor-pointer
                            ${selectedId === booking.id ? "bg-[#b50002]/5 hover:bg-[#b50002]/5" : ""}`}
                        >
                          <td className="px-5 py-3.5">
                            <p className="font-black text-[13px] text-[#171717] leading-tight">
                              {booking.customer}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate max-w-[160px]">
                              {booking.email}
                            </p>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              {booking.motorcycleImage && (
                                <div className="w-10 h-9 flex-shrink-0 rounded-lg overflow-hidden bg-slate-50 border border-slate-100">
                                  <img
                                    src={makeImageUrl(booking.motorcycleImage)}
                                    alt={booking.motorcycleName}
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                      e.currentTarget.style.display = "none";
                                    }}
                                  />
                                </div>
                              )}
                              <div>
                                <p className="font-black text-[13px] text-[#171717] leading-tight">
                                  {booking.motorcycleName || "—"}
                                </p>
                                {booking.unitId && (
                                  <span className="text-[10px] font-bold text-[#b50002] tracking-wider uppercase">
                                    {booking.unitId}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-[13px] text-slate-500">
                            {formatDate(booking.returnDate)}
                          </td>
                          <td className="px-5 py-3.5">
                            <ClearanceBadge
                              status={
                                booking.returnInspection?.clearanceStatus ||
                                "pending_inspection"
                              }
                            />
                          </td>
                          <td className="px-5 py-3.5">
                            {booking.status === "active" ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartInspection(booking);
                                }}
                                disabled={saving}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#b50002] text-white text-xs font-bold shadow-sm shadow-[#b50002]/30 hover:brightness-110 transition-all disabled:opacity-60"
                              >
                                <Wrench className="w-3 h-3" /> Start
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                <FaCheckCircle className="text-[10px]" /> In
                                Progress
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right sidebar: inspection panel */}
          <div className="flex flex-col gap-4">
            {!selectedBooking ? (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center flex-1">
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <ClipboardList className="text-slate-200 w-7 h-7" />
                </div>
                <h3 className="font-black text-[#171717] text-sm mb-1">
                  No booking selected
                </h3>
                <p className="text-slate-400 text-xs">
                  Click a row to open the inspection panel
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Panel header */}
                <div className="border-b border-slate-50 px-5 py-4">
                  <div className="flex items-center gap-3">
                    {selectedBooking.motorcycleImage && (
                      <div className="w-14 h-12 flex-shrink-0 rounded-xl overflow-hidden bg-slate-50 border border-slate-100">
                        <img
                          src={makeImageUrl(selectedBooking.motorcycleImage)}
                          alt={selectedBooking.motorcycleName}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold tracking-[0.15em] text-[#b50002] uppercase mb-0.5">
                        Inspection
                      </p>
                      <h3 className="font-black text-[#171717] text-[14px] leading-tight truncate">
                        {selectedBooking.customer}
                      </h3>
                      <p className="text-[11px] text-slate-400 truncate">
                        {selectedBooking.motorcycleName}
                        {selectedBooking.unitId
                          ? ` · ${selectedBooking.unitId}`
                          : ""}
                      </p>
                    </div>
                  </div>

                  {/* Info pills */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg font-semibold">
                      <FaCalendarAlt className="text-[#b50002] text-[9px]" />
                      Return: {formatDate(selectedBooking.returnDate)}
                    </span>
                    {selectedBooking.amount > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg font-semibold">
                        ₱{selectedBooking.amount}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {/* Clearance Status */}
                  <PanelSection icon={ShieldAlert} title="Clearance Status">
                    <div className="relative">
                      <select
                        value={clearanceStatus}
                        onChange={(e) => setClearanceStatus(e.target.value)}
                        disabled={selectedBooking.status !== "inspection"}
                        className={`${fieldCls} appearance-none pr-8`}
                      >
                        {CLEARANCE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 text-[10px] pointer-events-none" />
                    </div>
                    {clearanceStatus === "cleared" && (
                      <p className="text-[11px] text-emerald-600 mt-2 font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                        ✓ Clears the booking and releases the motorcycle
                      </p>
                    )}
                    {clearanceStatus === "pending_inspection" && (
                      <p className="text-[11px] text-violet-600 mt-2 font-semibold bg-violet-50 px-3 py-1.5 rounded-lg border border-violet-100">
                        ⏳ Motorcycle temporarily unavailable for inspection
                      </p>
                    )}
                  </PanelSection>

                  {/* Damage Found */}
                  {clearanceStatus === "damage_found" && (
                    <>
                      <PanelSection
                        icon={AlertTriangle}
                        title="Damage Notes"
                        accent="text-amber-500"
                      >
                        <textarea
                          value={damageNotes}
                          onChange={(e) => setDamageNotes(e.target.value)}
                          rows={3}
                          placeholder="Describe the damage found..."
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[#171717] text-sm placeholder-slate-300 focus:outline-none focus:border-[#b50002]/30 resize-none"
                        />
                      </PanelSection>

                      <PanelSection icon={Wrench} title="Mechanic Notes">
                        <textarea
                          value={mechanicNotes}
                          onChange={(e) => setMechanicNotes(e.target.value)}
                          rows={3}
                          placeholder="Mechanic's assessment..."
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[#171717] text-sm placeholder-slate-300 focus:outline-none focus:border-[#b50002]/30 resize-none"
                        />
                      </PanelSection>

                      <PanelSection
                        icon={FaFileInvoiceDollar}
                        title="Repair Estimate"
                      >
                        <div className="space-y-2">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b50002] text-sm font-bold pointer-events-none">
                              ₱
                            </span>
                            <input
                              type="number"
                              value={repairEstimateAmount}
                              onChange={(e) =>
                                setRepairEstimateAmount(e.target.value)
                              }
                              placeholder="0"
                              min="0"
                              className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[#171717] text-sm placeholder-slate-300 focus:outline-none focus:border-[#b50002]/30"
                            />
                          </div>
                          <textarea
                            value={repairEstimateNotes}
                            onChange={(e) =>
                              setRepairEstimateNotes(e.target.value)
                            }
                            rows={2}
                            placeholder="Repair estimate notes..."
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[#171717] text-sm placeholder-slate-300 focus:outline-none focus:border-[#b50002]/30 resize-none"
                          />
                        </div>
                      </PanelSection>

                      <PanelSection icon={FaImages} title="Damage Photos">
                        <label className="block cursor-pointer">
                          <div className="w-full rounded-xl border-2 border-dashed border-slate-200 hover:border-[#b50002]/30 transition-colors p-4 text-center">
                            <FaImages className="text-slate-300 text-xl mx-auto mb-1.5" />
                            <p className="text-xs text-slate-400 font-semibold">
                              Click to upload photos
                            </p>
                            <p className="text-[10px] text-slate-300 mt-0.5">
                              PNG, JPG up to 5MB each
                            </p>
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              onChange={(e) => setDamageFiles(e.target.files)}
                              className="hidden"
                            />
                          </div>
                        </label>
                        {damageFiles.length > 0 && (
                          <p className="text-[11px] text-slate-500 mt-1.5 font-semibold">
                            {damageFiles.length} file(s) selected
                          </p>
                        )}
                        {Array.isArray(
                          selectedBooking.returnInspection?.damagePhotos,
                        ) &&
                          selectedBooking.returnInspection.damagePhotos.length >
                            0 && (
                            <div className="grid grid-cols-3 gap-2 mt-2">
                              {selectedBooking.returnInspection.damagePhotos.map(
                                (photo) => (
                                  <img
                                    key={photo}
                                    src={makeImageUrl(photo)}
                                    alt="Damage"
                                    className="h-16 w-full object-cover rounded-lg border border-slate-100"
                                  />
                                ),
                              )}
                            </div>
                          )}
                      </PanelSection>
                    </>
                  )}

                  {/* Penalty Required */}
                  {clearanceStatus === "penalty_required" && (
                    <PanelSection
                      icon={ShieldAlert}
                      title="Penalty"
                      accent="text-[#b50002]"
                    >
                      <div className="space-y-2">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b50002] text-sm font-bold pointer-events-none">
                            ₱
                          </span>
                          <input
                            type="number"
                            value={penaltyAmount}
                            onChange={(e) => setPenaltyAmount(e.target.value)}
                            placeholder="0"
                            min="0"
                            className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[#171717] text-sm placeholder-slate-300 focus:outline-none focus:border-[#b50002]/30"
                          />
                        </div>
                        <textarea
                          value={penaltySummary}
                          onChange={(e) => setPenaltySummary(e.target.value)}
                          rows={2}
                          placeholder="Penalty details..."
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[#171717] text-sm placeholder-slate-300 focus:outline-none focus:border-[#b50002]/30 resize-none"
                        />
                      </div>
                    </PanelSection>
                  )}

                  {/* Action buttons */}
                  <div className="pt-2 border-t border-slate-50 space-y-2">
                    {(clearanceStatus === "damage_found" ||
                      clearanceStatus === "penalty_required") && (
                      <button
                        type="button"
                        onClick={handleSettlePenalty}
                        disabled={
                          saving || selectedBooking.status !== "inspection"
                        }
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#b50002] text-white font-bold text-sm shadow-md shadow-[#b50002]/30 hover:brightness-110 transition-all disabled:opacity-60"
                      >
                        <FaCheckCircle className="text-xs" />
                        {saving ? "Settling..." : "Settle Penalty & Complete"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleSaveInspection}
                      disabled={
                        saving || selectedBooking.status !== "inspection"
                      }
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm shadow-md shadow-slate-900/20 hover:brightness-110 transition-all disabled:opacity-60"
                    >
                      <FaFileInvoiceDollar className="text-xs" />
                      {saving ? "Updating..." : "Save Inspection"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Legend / info card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="font-black text-[#171717] text-[14px] mb-3">
                Clearance Guide
              </h3>
              <div className="space-y-2.5">
                {[
                  {
                    status: "pending_inspection",
                    desc: "Under review, motorcycle held",
                  },
                  { status: "cleared", desc: "No issues, unit released" },
                  {
                    status: "damage_found",
                    desc: "Damage noted, repair required",
                  },
                  {
                    status: "penalty_required",
                    desc: "Customer owes a penalty",
                  },
                ].map(({ status, desc }) => (
                  <div key={status} className="flex items-start gap-2.5">
                    <ClearanceBadge status={status} />
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                      {desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

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
    </div>
  );
};

export default ReturnInspection;
