import React, { useCallback, useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import axios from "axios";
import {
  FaCheckCircle,
  FaSearch,
  FaTimes,
  FaImages,
  FaFileInvoiceDollar,
  FaMotorcycle,
  FaCalendarAlt,
  FaChevronDown,
} from "react-icons/fa";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Wrench,
  ShieldAlert,
  Wallet,
  Settings,
} from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import API_BASE_URL from "../apiBase";
import ReportActionButtons from "./ReportActionButtons";
import { downloadCSV } from "../utils/reportUtils";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { Accept: "application/json" },
});

const MAX_PENALTY_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_PENALTY_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PENALTY_IMAGE_TOO_LARGE_MESSAGE =
  "That image is too large. Please upload a photo up to 5 MB.";
const PENALTY_IMAGE_UNSUPPORTED_TYPE_MESSAGE =
  "Unsupported file type. Please upload a JPG, PNG, or WEBP image.";

// ── Shared style tokens (mirrors ManageMotorcycle) ─────────────────────────
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
  cleared: "bg-emerald-50 text-emerald-700 border-emerald-200",
  penalty_required: "bg-red-50 text-[#b50002] border-red-200",
  pending_inspection: "bg-violet-50 text-violet-700 border-violet-200",
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
      <p className="text-[10px] font-bold tracking-[0.15em] text-slate-500 uppercase">
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
    {[...Array(6)].map((_, i) => (
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
  headerAction,
}) => (
  <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-100">
    <div className="flex items-center justify-between gap-2 mb-3">
      <div className="flex items-center gap-2">
        <Icon className={`w-3.5 h-3.5 ${accent}`} />
        <p className="text-[10px] font-black tracking-[0.15em] text-slate-500 uppercase">
          {title}
        </p>
      </div>
      {headerAction}
    </div>
    {children}
  </div>
);

// ── Options ────────────────────────────────────────────────────────────────
const CLEARANCE_OPTIONS = [
  { value: "pending_inspection", label: "Pending Inspection" },
  { value: "cleared", label: "Cleared" },
  { value: "penalty_required", label: "Penalty Required" },
];

// ── Standardized return-inspection penalty matrix ──────────────────────────
const INSPECTION_MATRIX_DEFAULTS = [
  { key: "dirty", label: "Dirty", kind: "flat", rate: 200 },
  { key: "minor_scratches", label: "Minor Scratches", kind: "flat", rate: 500 },
  {
    key: "major_damage",
    label: "Major Damage",
    kind: "custom",
    hint: "Actual repair cost",
  },
  {
    key: "tire_damage",
    label: "Tire worn or damaged",
    kind: "per_unit",
    rate: 500,
    unitLabel: "tire",
  },
  {
    key: "mirror_damage",
    label: "Mirror missing or broken",
    kind: "per_unit",
    rate: 300,
    unitLabel: "mirror",
  },
  {
    key: "helmet_damage",
    label: "Helmet missing or damaged",
    kind: "flat",
    rate: 1000,
  },
  {
    key: "late_return",
    label: "Late Return",
    kind: "per_hour",
    rate: 100,
    unitLabel: "hour",
  },
  {
    key: "geofence_exceeded",
    label: "Geofence Exceeded",
    kind: "custom",
    hint: "Penalty amount",
  },
];

const peso = (n) =>
  `₱${Math.max(0, Math.round(Number(n) || 0)).toLocaleString()}`;

// ── Main Component ─────────────────────────────────────────────────────────
const ReturnInspection = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState("inspection");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [saving, setSaving] = useState(false);

  // Inspection form state
  const [inspectionDate, setInspectionDate] = useState("");
  const [clearanceStatus, setClearanceStatus] = useState("pending_inspection");
  const [violationSelections, setViolationSelections] = useState({});
  const [penaltySummary, setPenaltySummary] = useState("");
  const [penaltyFiles, setPenaltyFiles] = useState([]);
  const [removedPenaltyPhotos, setRemovedPenaltyPhotos] = useState([]);

  // Lightbox state
  const [previewImage, setPreviewImage] = useState(null);

  // ── Customizable inspection matrix rates ─────────────────────────────────
  const [matrixRates, setMatrixRates] = useState({});
  const [rateEditorOpen, setRateEditorOpen] = useState(false);
  const [rateDrafts, setRateDrafts] = useState({});
  const [savingRates, setSavingRates] = useState(false);

  const fetchMatrixRates = useCallback(async () => {
    try {
      const res = await api.get("/api/motorcycle-bookings/inspection-matrix");
      const matrix = res.data?.matrix || {};
      const rates = {};
      Object.entries(matrix).forEach(([key, def]) => {
        if (typeof def?.rate === "number") rates[key] = def.rate;
      });
      setMatrixRates(rates);
    } catch (err) {
      // Non-fatal fallback
    }
  }, []);

  useEffect(() => {
    fetchMatrixRates();
  }, [fetchMatrixRates]);

  const INSPECTION_MATRIX = useMemo(
    () =>
      INSPECTION_MATRIX_DEFAULTS.map((item) =>
        item.kind === "custom" || matrixRates[item.key] === undefined
          ? item
          : { ...item, rate: matrixRates[item.key] },
      ),
    [matrixRates],
  );

  const openRateEditor = () => {
    const drafts = {};
    INSPECTION_MATRIX.forEach((item) => {
      if (item.kind !== "custom") drafts[item.key] = String(item.rate);
    });
    setRateDrafts(drafts);
    setRateEditorOpen(true);
  };

  const saveMatrixRates = async () => {
    const rates = {};
    for (const [key, value] of Object.entries(rateDrafts)) {
      const num = Number(value);
      if (!Number.isFinite(num) || num < 0) {
        toast.error("Rates must be non-negative numbers");
        return;
      }
      rates[key] = num;
    }
    setSavingRates(true);
    try {
      const res = await api.put("/api/motorcycle-bookings/inspection-matrix", {
        rates,
      });
      const matrix = res.data?.matrix || {};
      const nextRates = {};
      Object.entries(matrix).forEach(([key, def]) => {
        if (typeof def?.rate === "number") nextRates[key] = def.rate;
      });
      setMatrixRates(nextRates);
      setRateEditorOpen(false);
      toast.success("Inspection matrix rates updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update rates");
    } finally {
      setSavingRates(false);
    }
  };

  // Escape key listener for closing the lightbox
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setPreviewImage(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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

  const inspectionReportColumns = [
    { key: "customer", label: "Customer" },
    { key: "email", label: "Email" },
    { key: "motorcycleName", label: "Motorcycle" },
    { key: "unitId", label: "Unit" },
    {
      key: "returnDate",
      label: "Return Date",
      value: (b) => formatDate(b.returnDate),
    },
    {
      key: "inspectionDate",
      label: "Inspection Date",
      value: (b) => formatDate(b.returnInspection?.inspectionDate),
    },
    {
      key: "clearanceStatus",
      label: "Clearance",
      value: (b) =>
        (b.returnInspection?.clearanceStatus || "pending_inspection").replace(
          /_/g,
          " ",
        ),
    },
    { key: "status", label: "Booking Status" },
  ];

  const printConfig = {
    title: "Return Inspection Report",
    subtitle: `Status: ${selectedStatus}`,
    columns: inspectionReportColumns,
    rows: filteredBookings,
    getDate: (b) => b.returnDate,
    dateLabel: "Return date",
    emptyMessage: "No bookings match the current filters or date range.",
  };

  const handleExportCSV = () => {
    downloadCSV(
      "return-inspection-report",
      inspectionReportColumns,
      filteredBookings,
    );
  };

  // Sync form when booking changes
  useEffect(() => {
    if (!selectedBooking) return;
    const inspection = selectedBooking.returnInspection || {};
    setInspectionDate(
      inspection.inspectionDate
        ? String(inspection.inspectionDate).slice(0, 10)
        : new Date().toISOString().slice(0, 10),
    );
    setClearanceStatus(inspection.clearanceStatus || "pending_inspection");

    const savedViolations = Array.isArray(inspection.violations)
      ? inspection.violations
      : [];
    const nextSelections = {};
    savedViolations.forEach((v) => {
      const def = INSPECTION_MATRIX.find((m) => m.key === v.key);
      if (!def) return;
      nextSelections[v.key] = {
        checked: true,
        quantity: v.quantity || 1,
        customAmount: def.kind === "custom" ? String(v.amount ?? "") : "",
      };
    });
    setViolationSelections(nextSelections);

    setPenaltySummary(inspection.penaltySummary || "");
    setPenaltyFiles([]);
    setRemovedPenaltyPhotos([]);
  }, [selectedBooking, INSPECTION_MATRIX]);

  const penaltyFilePreviews = useMemo(
    () =>
      penaltyFiles.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      })),
    [penaltyFiles],
  );

  useEffect(() => {
    return () => {
      penaltyFilePreviews.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [penaltyFilePreviews]);

  const handlePenaltyFilesSelected = (e) => {
    const incoming = Array.from(e.target.files || []);
    e.target.value = "";
    if (!incoming.length) return;

    const unsupported = incoming.filter(
      (f) => !ALLOWED_PENALTY_IMAGE_TYPES.includes(f.type),
    );
    if (unsupported.length) {
      toast.error(PENALTY_IMAGE_UNSUPPORTED_TYPE_MESSAGE);
      return;
    }

    const oversized = incoming.filter((f) => f.size > MAX_PENALTY_IMAGE_BYTES);
    if (oversized.length) {
      toast.error(PENALTY_IMAGE_TOO_LARGE_MESSAGE);
      return;
    }

    setPenaltyFiles((prev) => {
      const existingKeys = new Set(
        prev.map((f) => `${f.name}-${f.size}-${f.lastModified}`),
      );
      const deduped = incoming.filter(
        (f) => !existingKeys.has(`${f.name}-${f.size}-${f.lastModified}`),
      );
      if (!deduped.length) {
        toast.info("That photo is already selected");
        return prev;
      }
      return [...prev, ...deduped];
    });
  };

  const removePenaltyFile = (index) => {
    setPenaltyFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingPenaltyPhoto = (photo) => {
    setRemovedPenaltyPhotos((prev) =>
      prev.includes(photo) ? prev : [...prev, photo],
    );
  };

  const visiblePenaltyPhotos = useMemo(() => {
    const saved = selectedBooking?.returnInspection?.penaltyPhotos;
    if (!Array.isArray(saved)) return [];
    return saved.filter((photo) => !removedPenaltyPhotos.includes(photo));
  }, [selectedBooking, removedPenaltyPhotos]);

  const violationRows = useMemo(() => {
    return INSPECTION_MATRIX.map((item) => {
      const sel = violationSelections[item.key];
      if (!sel?.checked) return null;
      let quantity = 1;
      let amount = 0;
      if (item.kind === "flat") {
        amount = item.rate;
      } else if (item.kind === "per_unit" || item.kind === "per_hour") {
        quantity = Math.max(1, Math.floor(Number(sel.quantity)) || 1);
        amount = item.rate * quantity;
      } else if (item.kind === "custom") {
        amount = Math.max(0, Number(sel.customAmount) || 0);
      }
      return { ...item, quantity, amount };
    }).filter(Boolean);
  }, [violationSelections, INSPECTION_MATRIX]);

  const totalPenalty = useMemo(
    () => violationRows.reduce((sum, v) => sum + v.amount, 0),
    [violationRows],
  );

  const depositAmount =
    Number(selectedBooking?.securityDeposit?.amount) || 1000;
  const refundableAmount = Math.max(0, depositAmount - totalPenalty);
  const balanceDue = Math.max(0, totalPenalty - depositAmount);

  const toggleViolation = (key) => {
    setViolationSelections((prev) => {
      const existing = prev[key];
      if (existing?.checked) {
        const { [key]: _omit, ...rest } = prev;
        return rest;
      }
      return {
        ...prev,
        [key]: { checked: true, quantity: 1, customAmount: "" },
      };
    });
  };

  const updateViolationQuantity = (key, quantity) => {
    setViolationSelections((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || { checked: true }), quantity },
    }));
  };

  const updateViolationCustomAmount = (key, customAmount) => {
    setViolationSelections((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || { checked: true }), customAmount },
    }));
  };

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

    if (clearanceStatus === "penalty_required" && violationRows.length === 0) {
      toast.error(
        "Please select at least one item in the Inspection Matrix before saving a penalty.",
      );
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("clearanceStatus", clearanceStatus);
      formData.append(
        "inspectionDate",
        inspectionDate || new Date().toISOString().slice(0, 10),
      );
      if (clearanceStatus === "penalty_required") {
        formData.append(
          "violations",
          JSON.stringify(
            violationRows.map((v) => ({
              key: v.key,
              quantity: v.quantity,
              customAmount: v.amount,
            })),
          ),
        );
        if (penaltySummary) formData.append("penaltySummary", penaltySummary);
        Array.from(penaltyFiles || []).forEach((file) =>
          formData.append("penaltyPhotos", file),
        );
        if (removedPenaltyPhotos.length) {
          formData.append(
            "removedPenaltyPhotos",
            JSON.stringify(removedPenaltyPhotos),
          );
        }
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
        setPenaltyFiles([]);
        setRemovedPenaltyPhotos([]);
        if (
          clearanceStatus === "cleared" &&
          updated.securityDeposit?.returned
        ) {
          toast.success(
            `Inspection updated — full ₱${(updated.securityDeposit.returnedAmount || 0).toLocaleString()} deposit refunded`,
          );
        } else {
          toast.success("Inspection updated");
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update inspection");
    } finally {
      setSaving(false);
    }
  };

  const handleSettlePenalty = async () => {
    if (!selectedBooking?._id) return;
    const confirmed = await confirmModal(
      balanceDue > 0
        ? `Settle penalty and complete this inspection? ₱${Math.min(depositAmount, totalPenalty).toLocaleString()} will be deducted from the deposit and the customer will still owe ₱${balanceDue.toLocaleString()}.`
        : `Settle penalty and complete this inspection? ₱${refundableAmount.toLocaleString()} of the security deposit will be refunded automatically.`,
      { confirmLabel: "Settle Penalty" },
    );
    if (!confirmed) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("clearanceStatus", clearanceStatus);
      formData.append("penaltySettled", "true");
      formData.append(
        "inspectionDate",
        inspectionDate || new Date().toISOString().slice(0, 10),
      );
      if (clearanceStatus === "penalty_required") {
        formData.append(
          "violations",
          JSON.stringify(
            violationRows.map((v) => ({
              key: v.key,
              quantity: v.quantity,
              customAmount: v.amount,
            })),
          ),
        );
        if (penaltySummary) formData.append("penaltySummary", penaltySummary);
        if (removedPenaltyPhotos.length) {
          formData.append(
            "removedPenaltyPhotos",
            JSON.stringify(removedPenaltyPhotos),
          );
        }
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
        setRemovedPenaltyPhotos([]);
        const dep = updated.securityDeposit;
        if (dep?.returned) {
          toast.success(
            dep.balanceDue > 0
              ? `Penalty settled — ₱${(dep.returnedAmount || 0).toLocaleString()} refunded, customer owes ₱${dep.balanceDue.toLocaleString()}`
              : `Penalty settled — ₱${(dep.returnedAmount || 0).toLocaleString()} refunded`,
          );
        } else {
          toast.success("Penalty settled and inspection completed");
        }
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
      subColor: "text-amber-700",
      icon: Wrench,
      accent: "bg-amber-500",
      status: "inspection",
    },
    {
      label: "Active Rentals",
      value: counts.active,
      sub: "Can start inspection",
      subColor: "text-blue-700",
      icon: FaMotorcycle,
      accent: "bg-blue-500",
      status: "active",
    },
  ];

  return (
    <main className="min-h-screen bg-[#f7f8fa]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pt-36">
        {/* Header */}
        <div className="mb-7 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight">
              Return Inspection
            </h1>
            <p className="text-slate-700 text-sm mt-1">
              Move active rentals into inspection and record clearance outcomes.
            </p>
          </div>
          <ReportActionButtons
            report={printConfig}
            onExport={handleExportCSV}
          />
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
              <p className="text-[10px] font-bold tracking-[0.15em] text-slate-500 uppercase">
                Cleared
              </p>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-500 bg-opacity-10">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
            </div>
            <p className="text-[2.2rem] font-black text-[#171717] leading-none mb-2">
              {counts.cleared}
            </p>
            <p className="text-[11px] font-semibold text-emerald-700">
              Released units
            </p>
          </div>
          <div className="relative bg-white rounded-2xl border border-slate-100 shadow-sm p-5 overflow-hidden">
            <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-10 blur-xl bg-violet-500" />
            <div className="flex items-start justify-between mb-3">
              <p className="text-[10px] font-bold tracking-[0.15em] text-slate-500 uppercase">
                Pending
              </p>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-violet-500 bg-opacity-10">
                <ClipboardList className="w-4 h-4 text-violet-500" />
              </div>
            </div>
            <p className="text-[2.2rem] font-black text-[#171717] leading-none mb-2">
              {counts.pending}
            </p>
            <p className="text-[11px] font-semibold text-violet-700">
              Needs review
            </p>
          </div>
        </div>

        {/* Main content + sidebar */}
        <div className="w-full space-y-4">
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
              <p className="text-[11px] text-slate-600 font-semibold">
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
                        "Unit",
                        "Return Date",
                        "Inspection Date",
                        "Clearance",
                        "Actions",
                      ].map((col) => (
                        <th
                          key={col}
                          className="text-left text-[10px] font-black tracking-[0.15em] text-slate-500 uppercase px-5 py-3 whitespace-nowrap"
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
                        <td colSpan={6} className="px-5 py-12 text-center">
                          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <FaMotorcycle className="text-slate-200 text-xl" />
                          </div>
                          <p className="font-black text-[#171717] text-sm mb-1">
                            No bookings found
                          </p>
                          <p className="text-slate-500 text-xs">
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
                            <p className="text-[11px] text-slate-500 truncate max-w-[160px]">
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
                          <td className="px-5 py-3.5 text-[13px] text-slate-500">
                            {formatDate(
                              booking.returnInspection?.inspectionDate,
                            )}
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

          {/* Right sidebar: inspection panel & legends */}
          <div className="flex flex-col gap-4">
            {selectedBooking && (
              <div
                className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                onClick={() => setSelectedId(null)}
              >
                <div
                  className="w-full max-w-2xl bg-[#f7f8fa] max-h-[90vh] overflow-y-auto shadow-2xl rounded-2xl flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Modal Header */}
                  <div className="bg-white rounded-t-2xl border-b border-slate-100 shadow-sm sticky top-0 z-10 px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        {selectedBooking.motorcycleImage && (
                          <div className="w-14 h-12 flex-shrink-0 rounded-xl overflow-hidden bg-slate-50 border border-slate-100">
                            <img
                              src={makeImageUrl(
                                selectedBooking.motorcycleImage,
                              )}
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
                          <p className="text-[11px] text-slate-500 truncate">
                            {selectedBooking.motorcycleName}
                            {selectedBooking.unitId
                              ? ` · ${selectedBooking.unitId}`
                              : ""}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedId(null)}
                        className="p-2 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors flex-shrink-0"
                      >
                        <FaTimes />
                      </button>
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
                    {/* Inspection Date */}
                    <PanelSection icon={FaCalendarAlt} title="Inspection Date">
                      <input
                        type="date"
                        value={inspectionDate}
                        onChange={(e) => setInspectionDate(e.target.value)}
                        disabled={selectedBooking.status !== "inspection"}
                        className={fieldCls}
                      />
                    </PanelSection>

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
                          ✓ Clears the booking, releases the motorcycle, and
                          automatically refunds the full security deposit
                        </p>
                      )}
                      {clearanceStatus === "pending_inspection" && (
                        <p className="text-[11px] text-violet-600 mt-2 font-semibold bg-violet-50 px-3 py-1.5 rounded-lg border border-violet-100">
                          ⏳ Unit temporarily unavailable for inspection
                        </p>
                      )}
                    </PanelSection>

                    {/* Security Deposit — refund is fully automatic */}
                    {selectedBooking.securityDeposit?.collected && (
                      <PanelSection
                        icon={Wallet}
                        title="Security Deposit"
                        accent="text-emerald-600"
                      >
                        {selectedBooking.securityDeposit.returned ? (
                          <div className="space-y-1.5">
                            <p className="text-[11px] text-emerald-600 font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                              ✓ Returned ₱
                              {(
                                selectedBooking.securityDeposit
                                  .returnedAmount || 0
                              ).toLocaleString()}{" "}
                              on{" "}
                              {formatDate(
                                selectedBooking.securityDeposit.returnedAt,
                              )}
                            </p>
                            {selectedBooking.securityDeposit.balanceDue > 0 && (
                              <p className="text-[11px] text-[#b50002] font-semibold bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
                                Customer still owes{" "}
                                {peso(
                                  selectedBooking.securityDeposit.balanceDue,
                                )}
                              </p>
                            )}
                            {selectedBooking.securityDeposit.refundReason && (
                              <p className="text-[11px] text-slate-500 px-1">
                                {selectedBooking.securityDeposit.refundReason}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-[11px] text-slate-500">
                              Held: {peso(depositAmount)} (collected via{" "}
                              {selectedBooking.securityDeposit
                                .collectionMethod || "Cash"}
                              )
                            </p>

                            {clearanceStatus === "cleared" && (
                              <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 font-semibold">
                                No violations — the full {peso(depositAmount)}{" "}
                                deposit will be refunded automatically when you
                                save.
                              </p>
                            )}

                            {clearanceStatus === "penalty_required" && (
                              <p className="text-[11px] text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-2">
                                From the Inspection Matrix:{" "}
                                <span className="font-black text-[#171717]">
                                  {peso(Math.min(depositAmount, totalPenalty))}
                                </span>{" "}
                                will be deducted and{" "}
                                <span className="font-black text-[#171717]">
                                  {peso(refundableAmount)}
                                </span>{" "}
                                refunded automatically when you click{" "}
                                <span className="font-bold">
                                  Settle Penalty
                                </span>
                                {balanceDue > 0 && (
                                  <>
                                    {" "}
                                    — customer will owe an additional{" "}
                                    <span className="font-black text-[#b50002]">
                                      {peso(balanceDue)}
                                    </span>
                                  </>
                                )}
                                .
                              </p>
                            )}

                            {clearanceStatus === "pending_inspection" && (
                              <p className="text-[11px] text-slate-500 px-1">
                                Refund is determined automatically once the
                                booking is cleared or a penalty is settled.
                              </p>
                            )}
                          </div>
                        )}
                      </PanelSection>
                    )}

                    {/* Penalty Required — standardized inspection matrix */}
                    {clearanceStatus === "penalty_required" && (
                      <>
                        <PanelSection
                          icon={ShieldAlert}
                          title="Inspection Matrix"
                          accent="text-[#b50002]"
                        >
                          <div className="space-y-1.5">
                            {INSPECTION_MATRIX.map((item) => {
                              const sel = violationSelections[item.key];
                              const checked = Boolean(sel?.checked);
                              const disabled =
                                selectedBooking.status !== "inspection";
                              const row = violationRows.find(
                                (v) => v.key === item.key,
                              );
                              return (
                                <div
                                  key={item.key}
                                  className={`rounded-xl border px-3 py-2.5 transition-colors ${
                                    checked
                                      ? "border-[#b50002]/30 bg-[#b50002]/5"
                                      : "border-slate-200 bg-white"
                                  }`}
                                >
                                  <label className="flex items-center justify-between gap-3 cursor-pointer">
                                    <span className="flex items-center gap-2.5 min-w-0">
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() =>
                                          toggleViolation(item.key)
                                        }
                                        disabled={disabled}
                                        className="w-4 h-4 accent-[#b50002] flex-shrink-0"
                                      />
                                      <span className="text-sm font-semibold text-[#171717] truncate">
                                        {item.label}
                                      </span>
                                    </span>
                                    <span className="text-xs font-bold text-slate-500 flex-shrink-0">
                                      {item.kind === "flat" && peso(item.rate)}
                                      {item.kind === "per_unit" &&
                                        `${peso(item.rate)}/${item.unitLabel}`}
                                      {item.kind === "per_hour" &&
                                        `${peso(item.rate)}/${item.unitLabel}`}
                                      {item.kind === "custom" && item.hint}
                                    </span>
                                  </label>

                                  {checked &&
                                    (item.kind === "per_unit" ||
                                      item.kind === "per_hour") && (
                                      <div className="flex items-center justify-between gap-3 mt-2 pl-6.5">
                                        <span className="text-[11px] text-slate-500 font-semibold">
                                          {item.kind === "per_unit"
                                            ? `Number of ${item.unitLabel}s`
                                            : `Hours late`}
                                        </span>
                                        <input
                                          type="number"
                                          min="1"
                                          value={sel?.quantity ?? 1}
                                          disabled={disabled}
                                          onChange={(e) =>
                                            updateViolationQuantity(
                                              item.key,
                                              e.target.value,
                                            )
                                          }
                                          className="w-20 px-2 py-1 rounded-lg border border-slate-200 bg-white text-[#171717] text-sm text-right focus:outline-none focus:border-[#b50002]/30"
                                        />
                                      </div>
                                    )}

                                  {checked && item.kind === "custom" && (
                                    <div className="flex items-center justify-between gap-3 mt-2 pl-6.5">
                                      <span className="text-[11px] text-slate-500 font-semibold">
                                        {item.hint}
                                      </span>
                                      <div className="relative">
                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#b50002] text-xs font-bold pointer-events-none">
                                          ₱
                                        </span>
                                        <input
                                          type="number"
                                          min="0"
                                          placeholder="0"
                                          value={sel?.customAmount ?? ""}
                                          disabled={disabled}
                                          onChange={(e) =>
                                            updateViolationCustomAmount(
                                              item.key,
                                              e.target.value,
                                            )
                                          }
                                          className="w-28 pl-5 pr-2 py-1 rounded-lg border border-slate-200 bg-white text-[#171717] text-sm text-right focus:outline-none focus:border-[#b50002]/30"
                                        />
                                      </div>
                                    </div>
                                  )}

                                  {checked && row && (
                                    <p className="text-[11px] text-[#b50002] font-bold mt-1.5 pl-6.5">
                                      = {peso(row.amount)}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          <textarea
                            value={penaltySummary}
                            onChange={(e) => setPenaltySummary(e.target.value)}
                            rows={2}
                            placeholder="Additional notes (optional — auto-generated if left blank)"
                            disabled={selectedBooking.status !== "inspection"}
                            className="w-full mt-3 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[#171717] text-sm placeholder-slate-300 focus:outline-none focus:border-[#b50002]/30 resize-none"
                          />

                          {/* Auto-computed total + deposit breakdown */}
                          <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 space-y-1.5">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-500 font-semibold">
                                Total Penalty
                              </span>
                              <span className="font-black text-[#171717]">
                                {peso(totalPenalty)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-500 font-semibold">
                                Security Deposit Held
                              </span>
                              <span className="font-black text-[#171717]">
                                {peso(depositAmount)}
                              </span>
                            </div>
                            <div className="border-t border-slate-200 my-1.5" />
                            {totalPenalty === 0 ? (
                              <p className="text-[12px] text-emerald-600 font-bold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                                ✓ No violations found — full{" "}
                                {peso(depositAmount)} security deposit is
                                refundable
                              </p>
                            ) : balanceDue > 0 ? (
                              <p className="text-[12px] text-[#b50002] font-bold bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
                                Penalty exceeds deposit — customer owes an
                                additional {peso(balanceDue)}
                              </p>
                            ) : (
                              <p className="text-[12px] text-amber-600 font-bold bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100">
                                {peso(refundableAmount)} of the deposit is
                                refundable
                              </p>
                            )}
                          </div>
                        </PanelSection>

                        {/* Penalty Evidence photo upload / management panel */}
                        <PanelSection
                          icon={FaImages}
                          title="Penalty Evidence"
                          accent="text-[#b50002]"
                        >
                          <label className="block cursor-pointer">
                            <div className="w-full rounded-xl border-2 border-dashed border-slate-200 hover:border-[#b50002]/30 transition-colors p-4 text-center">
                              <FaImages className="text-slate-300 text-xl mx-auto mb-1.5" />
                              <p className="text-xs text-slate-500 font-semibold">
                                {penaltyFiles.length > 0
                                  ? "Click to add more photos"
                                  : "Click to upload photos"}
                              </p>
                              <p className="text-[10px] text-slate-300 mt-0.5">
                                JPG, PNG, WEBP up to 5MB each
                              </p>
                              <input
                                type="file"
                                multiple
                                accept={ALLOWED_PENALTY_IMAGE_TYPES.join(",")}
                                onChange={handlePenaltyFilesSelected}
                                className="hidden"
                              />
                            </div>
                          </label>

                          {/* Already-uploaded photos (saved on the booking) */}
                          {visiblePenaltyPhotos.length > 0 && (
                            <div className="mt-3">
                              <p className="text-[10px] font-bold tracking-[0.1em] text-slate-500 uppercase mb-1.5">
                                Uploaded
                              </p>
                              <div className="grid grid-cols-3 gap-2">
                                {visiblePenaltyPhotos.map((photo) => (
                                  <div key={photo} className="relative group">
                                    <img
                                      src={makeImageUrl(photo)}
                                      alt="Penalty Evidence"
                                      onClick={() =>
                                        setPreviewImage(makeImageUrl(photo))
                                      }
                                      className="h-16 w-full object-cover rounded-lg border border-slate-100 cursor-pointer hover:opacity-80 transition-opacity"
                                    />
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeExistingPenaltyPhoto(photo);
                                      }}
                                      disabled={
                                        selectedBooking.status !== "inspection"
                                      }
                                      title="Remove photo"
                                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-md hover:bg-[#b50002] transition-colors disabled:opacity-0 disabled:pointer-events-none"
                                    >
                                      <FaTimes className="text-[9px]" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Newly picked photos, pending upload */}
                          {penaltyFilePreviews.length > 0 && (
                            <div className="mt-3">
                              <p className="text-[10px] font-bold tracking-[0.1em] text-slate-500 uppercase mb-1.5">
                                {penaltyFilePreviews.length} new photo
                                {penaltyFilePreviews.length > 1 ? "s" : ""}{" "}
                                pending upload
                              </p>
                              <div className="grid grid-cols-3 gap-2">
                                {penaltyFilePreviews.map((preview, index) => (
                                  <div
                                    key={`${preview.file.name}-${preview.file.lastModified}-${index}`}
                                    className="relative group"
                                  >
                                    <img
                                      src={preview.url}
                                      alt={preview.file.name}
                                      onClick={() =>
                                        setPreviewImage(preview.url)
                                      }
                                      className="h-16 w-full object-cover rounded-lg border-2 border-[#b50002]/20 cursor-pointer hover:opacity-80 transition-opacity"
                                    />
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removePenaltyFile(index);
                                      }}
                                      title="Remove photo"
                                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-md hover:bg-[#b50002] transition-colors"
                                    >
                                      <FaTimes className="text-[9px]" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {visiblePenaltyPhotos.length === 0 &&
                            penaltyFilePreviews.length === 0 && (
                              <p className="text-[11px] text-slate-300 mt-2">
                                No evidence photos yet
                              </p>
                            )}
                        </PanelSection>
                      </>
                    )}

                    {/* Action buttons */}
                    <div className="pt-2 border-t border-slate-50 space-y-2">
                      {clearanceStatus === "penalty_required" && (
                        <button
                          type="button"
                          onClick={handleSettlePenalty}
                          disabled={
                            saving || selectedBooking.status !== "inspection"
                          }
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#b50002] text-white font-bold text-sm shadow-md shadow-[#b50002]/30 hover:brightness-110 transition-all disabled:opacity-60"
                        >
                          <FaCheckCircle className="text-xs" />
                          {saving
                            ? "Settling..."
                            : "Settle Penalty & Refund Deposit"}
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
                        {saving
                          ? "Updating..."
                          : clearanceStatus === "cleared"
                            ? "Save & Refund Deposit"
                            : "Save Inspection"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Matrix Rates Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-black text-[#171717] text-[14px]">
                  Inspection Rates
                </h2>
                <button
                  type="button"
                  onClick={openRateEditor}
                  className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-[#b50002] transition-colors"
                  title="Customize rates"
                >
                  <Settings className="w-3 h-3" />
                  Edit Rates
                </button>
              </div>
              <div className="space-y-2">
                {INSPECTION_MATRIX.filter((item) => item.kind !== "custom").map(
                  (item) => (
                    <div
                      key={item.key}
                      className="flex justify-between items-center text-[11px]"
                    >
                      <span className="text-slate-500">{item.label}</span>
                      <span className="font-bold text-[#171717]">
                        {item.kind === "flat" && peso(item.rate)}
                        {item.kind === "per_unit" &&
                          `${peso(item.rate)} / ${item.unitLabel}`}
                        {item.kind === "per_hour" &&
                          `${peso(item.rate)} / ${item.unitLabel}`}
                      </span>
                    </div>
                  ),
                )}
              </div>
            </div>

            {/* Legend / info card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h2 className="font-black text-[#171717] text-[14px] mb-3">
                Clearance Guide
              </h2>
              <div className="space-y-2.5">
                {[
                  {
                    status: "pending_inspection",
                    desc: "Under review, unit held",
                  },
                  {
                    status: "cleared",
                    desc: "No issues — full deposit refunded automatically",
                  },
                  {
                    status: "penalty_required",
                    desc: "Violations selected — deposit deducted and remainder refunded when settled",
                  },
                ].map(({ status, desc }) => (
                  <div key={status} className="flex items-start gap-2.5">
                    <ClearanceBadge status={status} />
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                      {desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setPreviewImage(null)}
        >
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-6 right-8 text-white hover:text-slate-300 transition-colors text-3xl"
          >
            <FaTimes />
          </button>
          <img
            src={previewImage}
            alt="Full screen preview"
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Rate editor modal */}
      {rateEditorOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          onClick={() => !savingRates && setRateEditorOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
                <Settings className="w-4 h-4 text-[#b50002]" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#171717]">
                  Customize Inspection Matrix Rates
                </h3>
                <p className="text-[11px] text-slate-500">
                  Applies to all future inspections
                </p>
              </div>
            </div>

            <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
              {INSPECTION_MATRIX.filter((item) => item.kind !== "custom").map(
                (item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="text-sm font-semibold text-[#171717]">
                      {item.label}
                      {item.kind === "per_unit" && (
                        <span className="text-slate-500 font-normal">
                          {" "}
                          / {item.unitLabel}
                        </span>
                      )}
                      {item.kind === "per_hour" && (
                        <span className="text-slate-500 font-normal">
                          {" "}
                          / hour
                        </span>
                      )}
                    </span>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#b50002] text-xs font-bold pointer-events-none">
                        ₱
                      </span>
                      <input
                        type="number"
                        min="0"
                        disabled={savingRates}
                        value={rateDrafts[item.key] ?? ""}
                        onChange={(e) =>
                          setRateDrafts((prev) => ({
                            ...prev,
                            [item.key]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (["e", "E", "+", "-"].includes(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        className="w-24 pl-5 pr-2 py-1.5 rounded-lg border border-slate-200 bg-white text-[#171717] text-sm text-right focus:outline-none focus:border-[#b50002]/30"
                      />
                    </div>
                  </div>
                ),
              )}
            </div>

            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={() => setRateEditorOpen(false)}
                disabled={savingRates}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveMatrixRates}
                disabled={savingRates}
                className="flex-1 py-2.5 rounded-xl bg-[#b50002] text-white font-bold text-sm shadow-md shadow-[#b50002]/30 hover:brightness-110 transition-all disabled:opacity-60"
              >
                {savingRates ? "Saving..." : "Save Rates"}
              </button>
            </div>
          </div>
        </div>
      )}

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
    </main>
  );
};

export default ReturnInspection;
