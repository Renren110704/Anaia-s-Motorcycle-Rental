import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactDOM from "react-dom/client";
import {
  FaMotorcycle,
  FaCog,
  FaEdit,
  FaFilter,
  FaGasPump,
  FaShieldAlt,
  FaTimes,
  FaSearch,
  FaThLarge,
  FaList,
  FaHourglassHalf,
  FaChevronLeft,
  FaChevronRight,
  FaChevronUp,
  FaChevronDown,
  FaSort,
  FaIdCard,
  FaTag,
  FaLayerGroup,
  FaCalendarAlt,
  FaTachometerAlt,
  FaHardHat,
  FaSatelliteDish,
} from "react-icons/fa";
import {
  Wrench,
  Bike,
  PlusCircle,
  MapPin,
  Clock,
  ArrowRight,
  Trash2,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import API_BASE_URL from "../apiBase";

const BASE = API_BASE_URL;
const api = axios.create({
  baseURL: BASE,
  headers: { Accept: "application/json" },
});
const ITEMS_PER_PAGE = 10;

const nextSortState = (c) => (c === null ? "asc" : c === "asc" ? "desc" : null);

const makeImageUrl = (img) => {
  if (!img) return "";
  const s = String(img).trim();
  if (/^data:image\//i.test(s)) return s;
  if (/^https?:\/\//i.test(s)) return s.replace(/^http:\/\//i, "https://");
  return `${BASE}/uploads/${s.replace(/^\/+/, "").replace(/^uploads\//, "")}`;
};

const buildSafeMotorcycle = (raw = {}, idx = 0) => {
  const _id = raw._id || raw.id || null;
  return {
    _id,
    id: _id || raw.id || raw.localId || `local-${idx + 1}`,
    unitId: raw.unitId || "",
    make: raw.make || "",
    model: raw.model || "",
    year: raw.year ?? "",
    description: raw.description || "",
    category: raw.category || "Scooter",
    transmission: raw.transmission || "Manual",
    fuelType: raw.fuelType || raw.fuel || "Unleaded",
    engineSize: raw.engineSize ?? 150,
    dailyRate: raw.dailyRate ?? raw.price ?? 0,
    hasABS: raw.hasABS || false,
    hasHelmet: raw.hasHelmet !== false,
    status: raw.status || "available",
    isDeleted: raw.isDeleted || false,
    traccarDeviceId: raw.traccarDeviceId || "",
    deletedAt: raw.deletedAt || null,
    _rawImage: raw.image ?? raw._rawImage ?? "",
    image: raw.image
      ? makeImageUrl(raw.image)
      : raw._rawImage
        ? makeImageUrl(raw._rawImage)
        : "",
  };
};

// ── Shared styles ─────────────────────────────────────────────────────────────
const labelCls =
  "block text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase mb-1.5";
const fieldCls =
  "w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[#171717] text-sm placeholder-slate-300 focus:outline-none focus:border-[#b50002]/30";
const fieldClsIcon =
  "w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[#171717] text-sm placeholder-slate-300 focus:outline-none focus:border-[#b50002]/30 appearance-none";

// Icon-wrapped input container
const IconField = ({ icon: Icon, label, children }) => (
  <div>
    {label && <label className={labelCls}>{label}</label>}
    <div className="relative flex items-center">
      {Icon && (
        <Icon className="absolute left-3 text-[#b50002] text-sm pointer-events-none z-10" />
      )}
      {children}
    </div>
  </div>
);

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_STYLE = {
  available: "bg-emerald-50 text-emerald-600 border-emerald-200",
  rented: "bg-blue-50 text-blue-600 border-blue-200",
  maintenance: "bg-amber-50 text-amber-600 border-amber-200",
  pending: "bg-violet-50 text-violet-600 border-violet-200",
  deleted: "bg-red-50 text-[#b50002] border-red-200",
};
const StatusBadge = ({ status, isDeleted }) => {
  const key = isDeleted ? "deleted" : status;
  const cls =
    STATUS_STYLE[key] ?? "bg-slate-50 text-slate-500 border-slate-200";
  const label = isDeleted
    ? "Deleted"
    : status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${cls}`}
    >
      {label}
    </span>
  );
};

// ── Confirm Modal ─────────────────────────────────────────────────────────────
const ConfirmModal = ({ message, onConfirm, onCancel, isPermanent }) => (
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
          {isPermanent ? "Permanent Delete" : "Confirm Delete"}
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
            {isPermanent ? "Delete Forever" : "Yes, Delete"}
          </button>
        </div>
      </div>
    </div>
  </div>
);
const confirmModal = (message, isPermanent = false) =>
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
        onConfirm={() => cleanup(true)}
        onCancel={() => cleanup(false)}
      />,
    );
  });

// ── Stat Card ─────────────────────────────────────────────────────────────────
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

// ── Sort icon ─────────────────────────────────────────────────────────────────
const SortIcon = ({ state }) => {
  if (state === "asc")
    return (
      <FaChevronUp className="text-[#b50002] text-[10px] ml-1 flex-shrink-0" />
    );
  if (state === "desc")
    return (
      <FaChevronDown className="text-[#b50002] text-[10px] ml-1 flex-shrink-0" />
    );
  return <FaSort className="text-slate-300 text-[10px] ml-1 flex-shrink-0" />;
};

// ── Skeleton row ──────────────────────────────────────────────────────────────
const SkeletonRow = () => (
  <tr>
    {[...Array(7)].map((_, i) => (
      <td key={i} className="px-5 py-3.5">
        <div
          className="h-4 bg-slate-100 rounded-lg animate-pulse"
          style={{ width: `${50 + i * 8}%` }}
        />
      </td>
    ))}
  </tr>
);

// ── Pagination ────────────────────────────────────────────────────────────────
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - 2 && i <= currentPage + 2)
    )
      pages.push(i);
  }
  const withEllipsis = [];
  let prev = null;
  for (const p of pages) {
    if (prev && p - prev > 1) withEllipsis.push("...");
    withEllipsis.push(p);
    prev = p;
  }
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-xl border border-slate-100 bg-white text-slate-400 disabled:opacity-30 hover:border-[#b50002]/20 hover:text-[#b50002] transition-all shadow-sm"
      >
        <FaChevronLeft className="text-xs" />
      </button>
      {withEllipsis.map((item, idx) =>
        item === "..." ? (
          <span key={`e-${idx}`} className="px-2 text-slate-400 text-sm">
            …
          </span>
        ) : (
          <button
            key={item}
            onClick={() => onPageChange(item)}
            className={`w-9 h-9 rounded-xl font-bold text-sm transition-all shadow-sm
              ${currentPage === item ? "bg-[#b50002] text-white shadow-[#b50002]/30" : "bg-white border border-slate-100 text-slate-500 hover:border-[#b50002]/20 hover:text-[#b50002]"}`}
          >
            {item}
          </button>
        ),
      )}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-xl border border-slate-100 bg-white text-slate-400 disabled:opacity-30 hover:border-[#b50002]/20 hover:text-[#b50002] transition-all shadow-sm"
      >
        <FaChevronRight className="text-xs" />
      </button>
    </div>
  );
};

// ── Quick Action ──────────────────────────────────────────────────────────────
const QuickAction = ({ onClick, icon: Icon, title, desc, accent }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-4 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-[#b50002]/20 hover:-translate-y-0.5 transition-all duration-200 group w-full text-left"
  >
    <div
      className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${accent} transition-transform group-hover:scale-110 duration-200`}
    >
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-bold text-[#171717] text-sm leading-tight">{title}</p>
      <p className="text-[11px] text-slate-400 mt-0.5 truncate">{desc}</p>
    </div>
    <ArrowRight className="w-4 h-4 text-slate-200 group-hover:text-[#b50002] group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0" />
  </button>
);

// ── Motorcycle Card ───────────────────────────────────────────────────────────
const MotorcycleCard = ({ motorcycle: m, onEdit, onDelete, onRestore }) => (
  <div
    className={`bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${m.isDeleted ? "opacity-60" : ""}`}
  >
    <div className="relative w-full aspect-[16/9] bg-slate-50 overflow-hidden">
      <img
        src={m.image}
        alt={`${m.make} ${m.model}`}
        className="w-full h-full object-contain"
        loading="lazy"
        onError={(e) => {
          e.currentTarget.src = "/placeholder-bike.png";
        }}
      />
      <div className="absolute top-3 right-3">
        <StatusBadge status={m.status} isDeleted={m.isDeleted} />
      </div>
    </div>
    <div className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          {m.unitId && (
            <p className="text-[10px] font-bold tracking-[0.15em] text-[#b50002] uppercase mb-0.5">
              {m.unitId}
            </p>
          )}
          <h3 className="font-black text-[#171717] text-[15px] leading-tight">
            {m.make} {m.model}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {m.year} · {m.category}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-black text-[#171717]">₱{m.dailyRate}</p>
          <p className="text-[10px] text-slate-400">/day</p>
        </div>
      </div>
      {m.description && (
        <p className="text-xs text-slate-500 mb-3 line-clamp-2">
          {m.description}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {[
          { icon: FaGasPump, label: m.fuelType },
          { icon: FaCog, label: `${m.engineSize}cc` },
          { icon: FaCog, label: m.transmission },
          { icon: FaShieldAlt, label: m.hasABS ? "ABS" : "No ABS" },
        ].map(({ icon: Icon, label }, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <Icon className="text-[#b50002] text-[11px] flex-shrink-0" />
            <span className="text-[11px] text-slate-500 font-medium">
              {label}
            </span>
          </div>
        ))}
      </div>
      {m.isDeleted && m.deletedAt && (
        <p className="text-[10px] text-slate-400 mb-3">
          Deleted{" "}
          {new Date(m.deletedAt).toLocaleDateString("en-PH", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      )}
      <div className="flex gap-2 pt-3 border-t border-slate-50">
        {m.isDeleted ? (
          <>
            <button
              onClick={() => onRestore(m._id ?? m.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-50 text-emerald-600 font-bold text-xs hover:bg-emerald-100 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Restore
            </button>
            <button
              onClick={() => onDelete(m._id ?? m.id, true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-50 text-[#b50002] font-bold text-xs hover:bg-red-100 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Forever
            </button>
          </>
        ) : !["rented", "pending"].includes((m.status || "").toLowerCase()) ? (
          <>
            <button
              onClick={() => onEdit(m)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-50 text-slate-600 font-bold text-xs hover:bg-slate-100 transition-colors"
            >
              <FaEdit className="text-xs" /> Edit
            </button>
            <button
              onClick={() => onDelete(m._id ?? m.id, false)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-50 text-[#b50002] font-bold text-xs hover:bg-red-100 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </>
        ) : (
          <p className="text-[11px] text-slate-300 text-center w-full py-1">
            No actions available
          </p>
        )}
      </div>
    </div>
  </div>
);

// ── Table View ────────────────────────────────────────────────────────────────
const MotorcycleTable = ({
  motorcycles,
  onEdit,
  onDelete,
  onRestore,
  colSort,
  onColSort,
}) => {
  const cols = [
    { label: "Unit", key: "unitId", sortable: true },
    { label: "Vehicle", key: "make", sortable: true },
    { label: "Year", key: "year", sortable: true },
    { label: "Engine", key: "engineSize", sortable: true },
    { label: "Rate/Day", key: "dailyRate", sortable: true },
    { label: "Status", key: null, sortable: false },
    { label: "Actions", key: null, sortable: false },
  ];
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-50">
              {cols.map((col) => (
                <th
                  key={col.label}
                  onClick={col.sortable ? () => onColSort(col.key) : undefined}
                  className={`text-left text-[10px] font-black tracking-[0.15em] text-slate-300 uppercase px-5 py-3 whitespace-nowrap
                    ${col.sortable ? "cursor-pointer hover:text-slate-500 transition-colors select-none" : ""}`}
                >
                  <span className="inline-flex items-center">
                    {col.label}
                    {col.sortable && (
                      <SortIcon
                        state={colSort.key === col.key ? colSort.dir : null}
                      />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {motorcycles.map((m) => (
              <tr
                key={m.id}
                className={`hover:bg-slate-50/60 transition-colors ${m.isDeleted ? "opacity-50" : ""}`}
              >
                <td className="px-5 py-3.5">
                  {m.unitId ? (
                    <span className="text-[11px] font-black text-[#b50002] tracking-wider uppercase">
                      {m.unitId}
                    </span>
                  ) : (
                    <span className="text-slate-300 text-sm">—</span>
                  )}
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-10 flex-shrink-0 rounded-lg overflow-hidden bg-slate-50 border border-slate-100">
                      <img
                        src={m.image}
                        alt={`${m.make} ${m.model}`}
                        className="w-full h-full object-contain"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder-bike.png";
                        }}
                      />
                    </div>
                    <div>
                      <p className="font-black text-[13px] text-[#171717] leading-tight">
                        {m.make} {m.model}
                      </p>
                      <p className="text-[11px] text-slate-400">{m.category}</p>
                      {m.isDeleted && m.deletedAt && (
                        <p className="text-[10px] text-[#b50002] mt-0.5">
                          Deleted {new Date(m.deletedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-[13px] text-slate-500">
                  {m.year || "—"}
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-[13px] text-slate-600 font-medium">
                    {m.engineSize}cc
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span className="font-black text-[13px] text-[#171717]">
                    ₱{m.dailyRate}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <StatusBadge status={m.status} isDeleted={m.isDeleted} />
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1.5">
                    {m.isDeleted ? (
                      <>
                        <button
                          onClick={() => onRestore(m._id ?? m.id)}
                          title="Restore"
                          className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDelete(m._id ?? m.id, true)}
                          title="Delete Forever"
                          className="p-1.5 rounded-lg bg-red-50 text-[#b50002] hover:bg-red-100 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : !["rented", "pending"].includes(
                        (m.status || "").toLowerCase(),
                      ) ? (
                      <>
                        <button
                          onClick={() => onEdit(m)}
                          title="Edit"
                          className="p-1.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors"
                        >
                          <FaEdit className="text-sm" />
                        </button>
                        <button
                          onClick={() => onDelete(m._id ?? m.id, false)}
                          title="Delete"
                          className="p-1.5 rounded-lg bg-red-50 text-[#b50002] hover:bg-red-100 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <span className="text-slate-200 text-[11px]">—</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── ADD MOTORCYCLE MODAL ──────────────────────────────────────────────────────
const initialAddForm = {
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

const AddMotorcycleModal = ({ onClose, onSuccess }) => {
  const [data, setData] = useState(initialAddForm);
  const [submitting, setSubmitting] = useState(false);
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

  const noScroll = (e) => {
    if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
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
      if (data.image)
        formData.append(
          "image",
          data.image,
          data.image.name || "motorcycle-image",
        );
      await api.post("/api/motorcycles", formData);
      toast.success("Unit added successfully!");
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Failed to add unit",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-4xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-50 px-6 py-4 flex items-center justify-between z-10 rounded-t-2xl">
          <div>
            <h2 className="font-black text-[#171717] text-lg">
              Add New Unit
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <FaTimes className="text-sm" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Unit Identifiers */}
          <div>
            <p className={`${labelCls} mb-3`}>Unit Identifiers</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <IconField icon={FaIdCard} label="Unit ID *">
                <input
                  required
                  name="unitId"
                  value={data.unitId}
                  onChange={handleChange}
                  type="text"
                  className={fieldClsIcon}
                  placeholder="e.g. UNIT-01"
                  maxLength={30}
                />
              </IconField>
              <IconField
                icon={FaSatelliteDish}
                label="GPS Tracker ID (Traccar)"
              >
                <input
                  name="traccarDeviceId"
                  value={data.traccarDeviceId}
                  onChange={handleChange}
                  type="text"
                  className={fieldClsIcon}
                  placeholder="e.g. 9210010703"
                  maxLength={50}
                />
              </IconField>
            </div>
            {data.traccarDeviceId && (
              <p className="text-[11px] text-slate-400 mt-1.5 ml-1">
                📡 Must match the device's unique ID in Traccar.
              </p>
            )}
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT — Specs */}
            <div className="space-y-4">
              <p className={labelCls}>Details</p>

              {/* Brand / Category / Year */}
              <div className="grid grid-cols-3 gap-3">
                <IconField icon={FaTag} label="Brand *">
                  <select
                    required
                    name="brandName"
                    value={data.brandName}
                    onChange={handleChange}
                    className={fieldClsIcon}
                  >
                    {["Honda", "Yamaha", "Suzuki", "Kawasaki", "Toyota", "Nissan", "Geely", "Mitsubishi", "BYD", "Ford", "Isuzu", "Mazda"].map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </IconField>
                <IconField icon={FaLayerGroup} label="Category *">
                  <select
                    required
                    name="category"
                    value={data.category}
                    onChange={handleChange}
                    className={fieldClsIcon}
                  >
                    {["Scooter", "Big Bike", "Underbone", "Pickup", "Sedan", "MPV", "SUV"].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </IconField>
                <IconField icon={FaCalendarAlt} label="Year *">
                  <input
                    required
                    name="year"
                    value={data.year}
                    onChange={handleChange}
                    type="number"
                    onKeyDown={noScroll}
                    className={fieldClsIcon}
                    placeholder="2020"
                    min="1990"
                    max={new Date().getFullYear()}
                  />
                </IconField>
              </div>

              {/* Model / Engine / Fuel */}
              <div className="grid grid-cols-3 gap-3">
                <IconField icon={FaMotorcycle} label="Model *">
                  <input
                    required
                    name="model"
                    value={data.model}
                    onChange={handleChange}
                    type="text"
                    className={fieldClsIcon}
                    placeholder="e.g. Click"
                    maxLength={18}
                  />
                </IconField>
                <IconField icon={FaTachometerAlt} label="Engine (cc) *">
                  <input
                    required
                    name="engineSize"
                    value={data.engineSize}
                    onChange={handleChange}
                    type="number"
                    onKeyDown={noScroll}
                    className={fieldClsIcon}
                    placeholder="150"
                    min="50"
                  />
                </IconField>
                <IconField icon={FaGasPump} label="Fuel *">
                  <select
                    required
                    name="fuelType"
                    value={data.fuelType}
                    onChange={handleChange}
                    className={fieldClsIcon}
                  >
                    {["Unleaded", "Premium", "Diesel", "Electric"].map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </IconField>
              </div>

              {/* Daily Price / Transmission */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Daily Price (₱) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b50002] text-sm font-bold pointer-events-none">
                      ₱
                    </span>
                    <input
                      required
                      name="dailyPrice"
                      value={data.dailyPrice}
                      onChange={handleChange}
                      type="number"
                      onKeyDown={noScroll}
                      className={fieldClsIcon}
                      placeholder="200"
                      min="1"
                    />
                  </div>
                </div>
                <IconField icon={FaCog} label="Transmission *">
                  <select
                    required
                    name="transmission"
                    value={data.transmission}
                    onChange={handleChange}
                    className={fieldClsIcon}
                  >
                    <option value="Manual">Manual</option>
                    <option value="Automatic">Automatic</option>
                    <option value="Semi-Automatic">Semi-Auto</option>
                  </select>
                </IconField>
              </div>

              {/* Features */}
              <div>
                <p className={`${labelCls} mb-3`}>Features</p>
                <div className="grid grid-cols-2 gap-3">
                  <IconField icon={FaShieldAlt} label="ABS">
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
                      className={fieldClsIcon}
                    >
                      <option value="no">No ABS</option>
                      <option value="yes">Has ABS</option>
                    </select>
                  </IconField>
                  <IconField icon={FaHardHat} label="Helmet">
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
                      className={fieldClsIcon}
                    >
                      <option value="no">No Helmet</option>
                      <option value="yes">Includes Helmet</option>
                    </select>
                  </IconField>
                </div>
              </div>
            </div>

            {/* RIGHT — Image + Description */}
            <div className="space-y-4">
              <p className={labelCls}>Media & Notes</p>

              {/* Image upload */}
              <div>
                <label className={labelCls}>Unit Image</label>
                <label className="block cursor-pointer">
                  <div
                    className={`w-full rounded-2xl border-2 border-dashed transition-colors overflow-hidden
                    ${data.imagePreview ? "border-slate-200" : "border-slate-200 hover:border-[#b50002]/30"}`}
                  >
                    {data.imagePreview ? (
                      <div className="relative h-44 bg-slate-50">
                        <img
                          src={data.imagePreview}
                          alt="Preview"
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                          <p className="text-white text-xs font-bold bg-black/50 px-3 py-1.5 rounded-lg">
                            Change Image
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="h-44 flex flex-col items-center justify-center gap-2 text-slate-300">
                        <FaMotorcycle className="text-3xl" />
                        <p className="text-xs font-semibold">
                          Click to upload image
                        </p>
                        <p className="text-[10px]">PNG, JPG up to 5MB</p>
                      </div>
                    )}
                  </div>
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

              {/* Description */}
              <div>
                <label className={labelCls}>Description</label>
                <textarea
                  name="description"
                  value={data.description}
                  onChange={handleChange}
                  rows={7}
                  placeholder="Describe features, condition, special details..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[#171717] text-sm placeholder-slate-300 focus:outline-none focus:border-[#b50002]/30 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t border-slate-50">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#b50002] text-white font-bold text-sm shadow-md shadow-[#b50002]/30 hover:brightness-110 transition-all disabled:opacity-60"
            >
              <FaMotorcycle className="text-sm" />
              {submitting ? "Adding..." : "Add Unit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── EDIT MOTORCYCLE MODAL ─────────────────────────────────────────────────────
const EditModal = ({ motorcycle, onClose, onSubmit, onChange }) => {
  const fileRef = useRef(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  useEffect(() => {
    const cur = motorcycle?.image || motorcycle?._rawImage || "";
    setSelectedImage(null);
    setImagePreview(makeImageUrl(cur));
    if (fileRef.current) fileRef.current.value = "";
  }, [motorcycle]);

  const mapToBackend = (m) => {
    const fd = new FormData();
    Object.entries({
      unitId: m.unitId || "",
      traccarDeviceId: m.traccarDeviceId || "",
      make: m.make,
      model: m.model,
      year: Number(m.year || 0),
      description: m.description || "",
      category: m.category || "Scooter",
      transmission: m.transmission || "Manual",
      fuelType: m.fuelType,
      engineSize: Number(m.engineSize || 150),
      dailyRate: Number(m.dailyRate || 0),
      hasABS: m.hasABS || false,
      hasHelmet: m.hasHelmet !== false,
      status: m.status || "available",
    }).forEach(([k, v]) => fd.append(k, v));
    if (selectedImage) fd.append("image", selectedImage);
    return fd;
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setSelectedImage(file);
      setImagePreview(evt.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    onChange({
      ...motorcycle,
      [name]:
        type === "checkbox"
          ? checked
          : ["year", "dailyRate", "engineSize"].includes(name)
            ? value === ""
              ? ""
              : Number(value)
            : value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!motorcycle?.unitId) return toast.error("Unit ID is required.");
    if (!motorcycle?.make || !motorcycle?.model)
      return toast.error("Make and Model are required.");
    onSubmit(mapToBackend(motorcycle));
  };

  const noScroll = (e) => {
    if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
  };

  const TF = ({ label, name, type = "text", opts = {} }) => (
    <div>
      <label className={labelCls}>{label}</label>
      <input
        type={type}
        name={name}
        value={motorcycle[name] || ""}
        onChange={handleInputChange}
        onKeyDown={type === "number" ? noScroll : undefined}
        required={opts.required}
        min={opts.min}
        max={opts.max}
        step={opts.step}
        maxLength={opts.maxLength}
        placeholder={opts.placeholder}
        className={fieldCls}
      />
    </div>
  );

  const SF = ({
    label,
    name,
    options,
    value: customVal,
    onChange: customChange,
  }) => (
    <div>
      <label className={labelCls}>{label}</label>
      <select
        name={name}
        value={customVal ?? motorcycle[name] ?? ""}
        onChange={customChange ?? handleInputChange}
        className={fieldCls}
      >
        {options.map((o) => (
          <option key={o.value ?? o} value={o.value ?? o}>
            {o.label ?? o}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-50 px-6 py-4 flex items-center justify-between z-10 rounded-t-2xl">
          <div>
            <p className="text-[10px] font-bold tracking-[0.15em] text-[#b50002] uppercase mb-0.5">
              Edit Unit
            </p>
            <h2 className="font-black text-[#171717] text-lg">
              {motorcycle.make} {motorcycle.model}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <FaTimes className="text-sm" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <TF
                label="Unit ID *"
                name="unitId"
                opts={{
                  required: true,
                  placeholder: "e.g. UNIT-01",
                  maxLength: 30,
                }}
              />
            </div>
            <div className="sm:col-span-2">
              <TF
                label="GPS Tracker ID"
                name="traccarDeviceId"
                opts={{ placeholder: "e.g. 9210010703", maxLength: 50 }}
              />
            </div>
            <TF label="Make *" name="make" opts={{ required: true }} />
            <TF label="Model *" name="model" opts={{ required: true }} />
            <TF
              label="Year *"
              name="year"
              type="number"
              opts={{ required: true, min: 1900, max: 2099 }}
            />
            <TF
              label="Daily Rate (₱) *"
              name="dailyRate"
              type="number"
              opts={{ required: true, min: 1, step: 0.01 }}
            />
            <div className="sm:col-span-2">
              <label className={labelCls}>Description</label>
              <textarea
                name="description"
                value={motorcycle.description || ""}
                onChange={handleInputChange}
                rows={3}
                placeholder="Enter motorcycle description..."
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[#171717] text-sm placeholder-slate-300 focus:outline-none focus:border-[#b50002]/30 resize-none"
              />
            </div>
            <SF
              label="Category *"
              name="category"
              options={["Scooter", "Big Bike", "Underbone", "Pickup", "Sedan", "MPV", "SUV"]}
            />
            {/* <SF
              label="Status *"
              name="status"
              options={[
                { value: "available", label: "Available" },
                { value: "maintenance", label: "Maintenance" },
              ]}
            /> */}
            <TF
              label="Engine Size (cc) *"
              name="engineSize"
              type="number"
              opts={{ required: true, min: 50 }}
            />
            <SF
              label="Transmission *"
              name="transmission"
              options={["Manual", "Automatic", "Semi-Automatic"]}
            />
            <SF
              label="Fuel Type *"
              name="fuelType"
              options={["Unleaded", "Premium", "Diesel", "Electric"]}
            />
            <SF
              label="ABS"
              name="hasABS"
              value={motorcycle.hasABS ? "yes" : "no"}
              options={[
                { value: "no", label: "No ABS" },
                { value: "yes", label: "Has ABS" },
              ]}
              onChange={(e) =>
                handleInputChange({
                  target: { name: "hasABS", value: e.target.value === "yes" },
                })
              }
            />
            <SF
              label="Helmet"
              name="hasHelmet"
              value={motorcycle.hasHelmet ? "yes" : "no"}
              options={[
                { value: "no", label: "No Helmet" },
                { value: "yes", label: "Includes Helmet" },
              ]}
              onChange={(e) =>
                handleInputChange({
                  target: {
                    name: "hasHelmet",
                    value: e.target.value === "yes",
                  },
                })
              }
            />
          </div>
          <div>
            <label className={labelCls}>Unit Image</label>
            <label className="block cursor-pointer">
              <div
                className={`w-full rounded-2xl border-2 border-dashed transition-colors overflow-hidden ${imagePreview ? "border-slate-200" : "border-slate-200 hover:border-[#b50002]/30"}`}
              >
                {imagePreview ? (
                  <div className="relative h-36 bg-slate-50">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                      <p className="text-white text-xs font-bold bg-black/50 px-3 py-1.5 rounded-lg">
                        Change Image
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="h-28 flex flex-col items-center justify-center gap-2 text-slate-300">
                    <FaMotorcycle className="text-3xl" />
                    <p className="text-xs font-semibold">Click to upload</p>
                  </div>
                )}
              </div>
              <input
                type="file"
                ref={fileRef}
                name="image"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
          </div>
          <div className="flex gap-3 pt-2 border-t border-slate-50">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-[#b50002] text-white font-bold text-sm shadow-md shadow-[#b50002]/30 hover:brightness-110 transition-all"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Empty State ───────────────────────────────────────────────────────────────
const EmptyState = ({ onReset }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
      <FaMotorcycle className="text-slate-200 text-3xl" />
    </div>
    <h3 className="font-black text-[#171717] text-lg mb-1">
      No units found
    </h3>
    <p className="text-slate-400 text-sm mb-4">
      Try adjusting your filters or search term
    </p>
    <button
      onClick={onReset}
      className="px-5 py-2 rounded-xl bg-[#b50002] text-white font-bold text-sm shadow-md shadow-[#b50002]/30 hover:brightness-110 transition-all"
    >
      Clear Filters
    </button>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const ManageMotorcycle = () => {
  const navigate = useNavigate();
  const [motorcycles, setMotorcycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("available");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedFuelType, setSelectedFuelType] = useState("all");
  const [selectedTransmission, setSelectedTransmission] = useState("all");
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMotorcycle, setEditingMotorcycle] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [colSort, setColSort] = useState({ key: null, dir: null });

  const fetchMotorcycles = useCallback(async () => {
    try {
      const res = await api.get("/api/motorcycles", {
        params: { includeDeleted: "true", limit: 1000 },
      });
      const raw = Array.isArray(res.data) ? res.data : res.data.data || [];
      setMotorcycles(
        raw.map((m, i) => ({
          ...buildSafeMotorcycle(m, i),
          image: m.image
            ? makeImageUrl(m.image)
            : buildSafeMotorcycle(m, i).image,
          _rawImage: m.image ?? m._rawImage ?? "",
        })),
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to load units");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMotorcycles();
  }, [fetchMotorcycles]);
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    selectedStatus,
    selectedCategory,
    selectedFuelType,
    selectedTransmission,
    priceRange,
    colSort,
  ]);

  const counts = useMemo(
    () => ({
      available: motorcycles.filter(
        (m) => !m.isDeleted && m.status === "available",
      ).length,
      pending: motorcycles.filter((m) => !m.isDeleted && m.status === "pending")
        .length,
      rented: motorcycles.filter((m) => !m.isDeleted && m.status === "rented")
        .length,
      maintenance: motorcycles.filter(
        (m) => !m.isDeleted && m.status === "maintenance",
      ).length,
      deleted: motorcycles.filter((m) => m.isDeleted).length,
    }),
    [motorcycles],
  );

  const activeTotal = useMemo(
    () => motorcycles.filter((m) => !m.isDeleted).length,
    [motorcycles],
  );
  const fuelTypes = useMemo(
    () => [...new Set(motorcycles.map((m) => m.fuelType).filter(Boolean))],
    [motorcycles],
  );
  const transmissions = useMemo(
    () => [...new Set(motorcycles.map((m) => m.transmission).filter(Boolean))],
    [motorcycles],
  );
  const categories = useMemo(
    () => [...new Set(motorcycles.map((m) => m.category).filter(Boolean))],
    [motorcycles],
  );

  const handleColSort = (key) =>
    setColSort((prev) => {
      if (prev.key !== key) return { key, dir: "asc" };
      const next = nextSortState(prev.dir);
      return next === null ? { key: null, dir: null } : { key, dir: next };
    });

  const filteredMotorcycles = useMemo(() => {
    let f = [...motorcycles];
    if (selectedStatus === "deleted") f = f.filter((m) => m.isDeleted);
    else f = f.filter((m) => !m.isDeleted && m.status === selectedStatus);
    if (searchTerm.trim()) {
      const t = searchTerm.toLowerCase();
      f = f.filter(
        (m) =>
          `${m.make} ${m.model}`.toLowerCase().includes(t) ||
          (m.category || "").toLowerCase().includes(t) ||
          (m.unitId || "").toLowerCase().includes(t),
      );
    }
    if (selectedCategory !== "all")
      f = f.filter((m) => m.category === selectedCategory);
    if (selectedFuelType !== "all")
      f = f.filter((m) => m.fuelType === selectedFuelType);
    if (selectedTransmission !== "all")
      f = f.filter((m) => m.transmission === selectedTransmission);
    const mn = parseFloat(priceRange.min),
      mx = parseFloat(priceRange.max);
    if (!isNaN(mn)) f = f.filter((m) => m.dailyRate >= mn);
    if (!isNaN(mx)) f = f.filter((m) => m.dailyRate <= mx);
    if (colSort.key && colSort.dir) {
      f.sort((a, b) => {
        let av = a[colSort.key],
          bv = b[colSort.key];
        if (typeof av === "boolean") {
          av = av ? 1 : 0;
          bv = bv ? 1 : 0;
        }
        if (typeof av === "number" || (!isNaN(Number(av)) && av !== ""))
          return colSort.dir === "asc"
            ? Number(av) - Number(bv)
            : Number(bv) - Number(av);
        const c = String(av ?? "").localeCompare(String(bv ?? ""));
        return colSort.dir === "asc" ? c : -c;
      });
    } else {
      f.sort((a, b) =>
        `${a.make} ${a.model}`
          .trim()
          .localeCompare(`${b.make} ${b.model}`.trim()),
      );
    }
    return f;
  }, [
    motorcycles,
    searchTerm,
    selectedStatus,
    selectedCategory,
    selectedFuelType,
    selectedTransmission,
    priceRange,
    colSort,
  ]);

  const totalPages = Math.ceil(filteredMotorcycles.length / ITEMS_PER_PAGE);
  const paginated = filteredMotorcycles.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setSelectedFuelType("all");
    setSelectedTransmission("all");
    setPriceRange({ min: "", max: "" });
    setColSort({ key: null, dir: null });
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchTerm ||
    selectedCategory !== "all" ||
    selectedFuelType !== "all" ||
    selectedTransmission !== "all" ||
    priceRange.min ||
    priceRange.max ||
    colSort.key;

  const handleDelete = async (id, permanent = false) => {
    const m = motorcycles.find((x) => x._id === id || x.id === id);
    if (!m) return toast.error("Unit not found");
    const confirmed = await confirmModal(
      permanent
        ? `Permanently delete ${m.make} ${m.model}? This cannot be undone.`
        : `Delete ${m.make} ${m.model}?`,
      permanent,
    );
    if (!confirmed) return;
    try {
      if (!m._id) {
        setMotorcycles((prev) => prev.filter((p) => p.id !== m.id));
        toast.success("Removed");
        return;
      }
      await api.delete(
        permanent
          ? `/api/motorcycles/${m._id}/permanent`
          : `/api/motorcycles/${m._id}`,
      );
      toast.success(permanent ? "Permanently deleted" : "Deleted");
      fetchMotorcycles();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  const handleRestore = async (id) => {
    const m = motorcycles.find((x) => x._id === id || x.id === id);
    if (!m?._id) return toast.error("Cannot restore");
    try {
      await api.patch(`/api/motorcycles/${m._id}/restore`);
      toast.success("Restored successfully");
      fetchMotorcycles();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to restore");
    }
  };

  const openEdit = (m) => {
    const rawImage = m._rawImage ?? m.image ?? "";
    setEditingMotorcycle({
      ...m,
      image: /^data:image\//i.test(String(rawImage)) ? "" : rawImage,
      _id: m._id ?? null,
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (payload) => {
    try {
      await api.put(`/api/motorcycles/${editingMotorcycle._id}`, payload);
      toast.success("Unit updated");
      setShowEditModal(false);
      setEditingMotorcycle(null);
      fetchMotorcycles();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update");
    }
  };

  const statCards = [
    {
      label: "Available",
      value: counts.available,
      sub: "Ready to rent",
      subColor: "text-emerald-500",
      icon: Bike,
      accent: "bg-emerald-500",
      status: "available",
    },
    {
      label: "Pending",
      value: counts.pending,
      sub: "Awaiting action",
      subColor: "text-violet-500",
      icon: FaHourglassHalf,
      accent: "bg-violet-500",
      status: "pending",
    },
    {
      label: "Rented",
      value: counts.rented,
      sub: `${activeTotal ? Math.round((counts.rented / activeTotal) * 100) : 0}% fleet out`,
      subColor: "text-blue-500",
      icon: FaMotorcycle,
      accent: "bg-blue-500",
      status: "rented",
    },
    {
      label: "Maintenance",
      value: counts.maintenance,
      sub: counts.maintenance > 0 ? "Needs attention" : "All clear",
      subColor: counts.maintenance > 0 ? "text-amber-500" : "text-slate-400",
      icon: Wrench,
      accent: "bg-amber-500",
      status: "maintenance",
    },
    {
      label: "Deleted",
      value: counts.deleted,
      sub: "Soft deleted units",
      subColor: "text-slate-400",
      icon: Trash2,
      accent: "bg-slate-400",
      status: "deleted",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pt-36">
        {/* Header */}
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight">
              Vehicle Management
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Manage units, monitor availability, and keep fleet details
              accurate.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-[#b50002] text-white text-sm font-bold shadow-md shadow-[#b50002]/30 hover:brightness-110 transition-all"
          >
            <PlusCircle className="w-4 h-4" /> Add Unit
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 sm:gap-4 mb-6">
          {statCards.map((s) => (
            <StatCard
              key={s.label}
              {...s}
              loading={loading}
              isActive={selectedStatus === s.status}
              onClick={() => setSelectedStatus(s.status)}
            />
          ))}
        </div>

        {/* Main + sidebar */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
          {/* Left: list/grid — 3/4 */}
          <div className="xl:col-span-3 space-y-4">
            {/* Search + toolbar */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 text-sm" />
                  <input
                    type="text"
                    placeholder="Search make, model, unit ID..."
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
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border font-bold text-xs transition-all
                      ${showFilters ? "bg-[#b50002] border-[#b50002] text-white shadow-md shadow-[#b50002]/30" : "border-slate-200 text-slate-500 hover:border-[#b50002]/20 hover:text-[#b50002]"}`}
                  >
                    <FaFilter className="text-[10px]" /> Filters
                    {hasActiveFilters && (
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    )}
                  </button>
                  <button
                    onClick={() =>
                      setViewMode(viewMode === "list" ? "detailed" : "list")
                    }
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 text-slate-500 font-bold text-xs hover:border-[#b50002]/20 hover:text-[#b50002] transition-all"
                  >
                    {viewMode === "list" ? (
                      <>
                        <FaThLarge className="text-[10px]" /> Grid
                      </>
                    ) : (
                      <>
                        <FaList className="text-[10px]" /> List
                      </>
                    )}
                  </button>
                </div>
              </div>

              {showFilters && (
                <div className="mt-4 pt-4 border-t border-slate-50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    {
                      label: "Category",
                      val: selectedCategory,
                      set: setSelectedCategory,
                      opts: ["all", ...categories],
                    },
                    {
                      label: "Fuel Type",
                      val: selectedFuelType,
                      set: setSelectedFuelType,
                      opts: ["all", ...fuelTypes],
                    },
                    {
                      label: "Transmission",
                      val: selectedTransmission,
                      set: setSelectedTransmission,
                      opts: ["all", ...transmissions],
                    },
                  ].map(({ label, val, set, opts }) => (
                    <div key={label}>
                      <label className={labelCls}>{label}</label>
                      <select
                        value={val}
                        onChange={(e) => set(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-[#171717] focus:outline-none focus:border-[#b50002]/30"
                      >
                        {opts.map((o) => (
                          <option key={o} value={o}>
                            {o === "all" ? `All ${label}s` : o}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                  <div>
                    <label className={labelCls}>Min Price (₱)</label>
                    <input
                      type="number"
                      placeholder="Min"
                      min="0"
                      value={priceRange.min}
                      onChange={(e) =>
                        setPriceRange({ ...priceRange, min: e.target.value })
                      }
                      onKeyDown={(e) => {
                        if (["e", "E", "+", "-"].includes(e.key))
                          e.preventDefault();
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-[#171717] placeholder-slate-300 focus:outline-none focus:border-[#b50002]/30"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Max Price (₱)</label>
                    <input
                      type="number"
                      placeholder="Max"
                      min="0"
                      value={priceRange.max}
                      onChange={(e) =>
                        setPriceRange({ ...priceRange, max: e.target.value })
                      }
                      onKeyDown={(e) => {
                        if (["e", "E", "+", "-"].includes(e.key))
                          e.preventDefault();
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-[#171717] placeholder-slate-300 focus:outline-none focus:border-[#b50002]/30"
                    />
                  </div>
                  {hasActiveFilters && (
                    <div className="flex items-end">
                      <button
                        onClick={clearFilters}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-50 text-[#b50002] font-bold text-xs hover:bg-red-100 transition-colors"
                      >
                        <FaTimes /> Clear All
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Result count */}
            <div className="flex items-center justify-between px-1">
              <p className="text-[11px] text-slate-400 font-semibold">
                Showing{" "}
                {filteredMotorcycles.length === 0
                  ? 0
                  : Math.min(
                      (currentPage - 1) * ITEMS_PER_PAGE + 1,
                      filteredMotorcycles.length,
                    )}
                –
                {Math.min(
                  currentPage * ITEMS_PER_PAGE,
                  filteredMotorcycles.length,
                )}{" "}
                of{" "}
                <span className="text-[#171717] font-black">
                  {filteredMotorcycles.length}
                </span>{" "}
                <span className="capitalize">{selectedStatus}</span> units
              </p>
            </div>

            {/* Content */}
            {loading ? (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full">
                  <tbody className="divide-y divide-slate-50">
                    {[...Array(5)].map((_, i) => (
                      <SkeletonRow key={i} />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : paginated.length === 0 ? (
              <EmptyState onReset={clearFilters} />
            ) : viewMode === "detailed" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paginated.map((m) => (
                  <MotorcycleCard
                    key={m.id}
                    motorcycle={m}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    onRestore={handleRestore}
                  />
                ))}
              </div>
            ) : (
              <MotorcycleTable
                motorcycles={paginated}
                onEdit={openEdit}
                onDelete={handleDelete}
                onRestore={handleRestore}
                colSort={colSort}
                onColSort={handleColSort}
              />
            )}

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>

          {/* Right sidebar */}
          <div className="flex flex-col gap-4">
            {/* Fleet summary */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="font-black text-[#171717] text-[14px] mb-4">
                Fleet Summary
              </h3>
              <div className="space-y-3">
                {[
                  {
                    label: "Available",
                    value: counts.available,
                    color: "bg-emerald-500",
                  },
                  {
                    label: "Rented",
                    value: counts.rented,
                    color: "bg-blue-500",
                  },
                  {
                    label: "Pending",
                    value: counts.pending,
                    color: "bg-violet-500",
                  },
                  {
                    label: "Maintenance",
                    value: counts.maintenance,
                    color: "bg-amber-500",
                  },
                ].map(({ label, value, color }) => {
                  const pct = activeTotal
                    ? Math.round((value / activeTotal) * 100)
                    : 0;
                  return (
                    <div key={label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12px] font-semibold text-slate-500">
                          {label}
                        </span>
                        <span className="text-[12px] font-black text-[#171717]">
                          {loading ? "—" : value}
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${color} transition-all duration-700`}
                          style={{ width: loading ? "0%" : `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="font-black text-[#171717] text-[14px] mb-3">
                Quick Actions
              </h3>
              <div className="space-y-2">
                <QuickAction
                  onClick={() => setShowAddModal(true)}
                  icon={PlusCircle}
                  title="Add Unit"
                  desc="Register a new unit"
                  accent="bg-violet-500"
                />
                <QuickAction
                  onClick={() => navigate("/motorcycle-tracking")}
                  icon={MapPin}
                  title="View Locations"
                  desc="Live GPS tracking map"
                  accent="bg-blue-500"
                />
                <QuickAction
                  onClick={() => navigate("/motorcycle-location-log")}
                  icon={Clock}
                  title="Location Log"
                  desc="Historical movement data"
                  accent="bg-amber-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Modal — full AddMotorcycle form */}
      {showAddModal && (
        <AddMotorcycleModal
          onClose={() => setShowAddModal(false)}
          onSuccess={fetchMotorcycles}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && editingMotorcycle && (
        <EditModal
          motorcycle={editingMotorcycle}
          onClose={() => {
            setShowEditModal(false);
            setEditingMotorcycle(null);
          }}
          onSubmit={handleEditSubmit}
          onChange={setEditingMotorcycle}
        />
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
    </div>
  );
};

export default ManageMotorcycle;
