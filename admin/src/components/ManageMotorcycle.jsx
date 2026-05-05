import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import {
  FaMotorcycle,
  FaCog,
  FaEdit,
  FaFilter,
  FaGasPump,
  FaShieldAlt,
  FaTimes,
  FaTrash,
  FaTrashRestore,
  FaMapMarkedAlt,
  FaSearch,
  FaThLarge,
  FaList,
  FaHourglassHalf,
  FaExclamationTriangle,
  FaChevronLeft,
  FaChevronRight,
  FaChevronUp,
  FaChevronDown,
  FaSort,
  FaClock,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { AddCarPageStyles, styles } from "../assets/dummyStyles";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import API_BASE_URL from "../apiBase";

const BASE = API_BASE_URL;
const api = axios.create({
  baseURL: BASE,
  headers: { Accept: "application/json" },
});

const ITEMS_PER_PAGE = 10;

const nextSortState = (current) => {
  if (current === null) return "asc";
  if (current === "asc") return "desc";
  return null;
};

const makeImageUrl = (img) => {
  if (!img) return "";
  const s = String(img).trim();
  if (/^data:image\//i.test(s)) return s;
  // If it's already a full URL (including Cloudinary), ensure it's HTTPS
  if (/^https?:\/\//i.test(s)) {
    // Force HTTPS for Cloudinary and external URLs
    return s.replace(/^http:\/\//i, "https://");
  }
  // Otherwise, prepend the API base for relative paths
  return `${BASE}/uploads/${s.replace(/^\/+/, '').replace(/^uploads\//, '')}`;
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
    deletedAt: raw.deletedAt || null,
    _rawImage: raw.image ?? raw._rawImage ?? "",
    image: raw.image
      ? makeImageUrl(raw.image)
      : raw._rawImage
        ? makeImageUrl(raw._rawImage)
        : "",
  };
};

// ── Confirm Modal ─────────────────────────────────────────────────────────────
const ConfirmModal = ({ message, onConfirm, onCancel, isPermanent }) => (
  <div
    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
    onClick={onCancel}
  >
    <div
      className="bg-[#f4f3f3] rounded-3xl shadow-2xl max-w-md w-full p-6 border border-[#171717]/10"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16">
          <FaExclamationTriangle
            className={`h-8 w-8 ${isPermanent ? "text-[#b50002]" : "text-[#b50002]"}`}
          />
        </div>
        <h3 className="text-xl font-bold text-[#171717] mb-2">
          {isPermanent ? "Permanent Delete" : "Confirm Delete"}
        </h3>
        <p className="text-[#171717] mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#b50002] text-white font-bold text-sm rounded-xl
                    shadow-lg shadow-[#b50002]/30 hover:brightness-110 hover:scale-[1.01] active:scale-[0.98] transition-all duration-200"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#171717] text-white font-bold text-sm rounded-xl
                    shadow-lg shadow-[#171717]/30 hover:brightness-110 hover:scale-[1.01] active:scale-[0.98] transition-all duration-200"
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
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);
    const cleanup = (result) => {
      root.unmount();
      document.body.removeChild(container);
      resolve(result);
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

// ── Stat Tab ──────────────────────────────────────────────────────────────────
const StatTab = ({
  title,
  value,
  icon: Icon,
  isActive,
  onClick,
  accentColor,
}) => (
  <button
    onClick={onClick}
    className={`
      flex-1 min-w-[140px] flex items-center justify-between px-5 py-4 rounded-2xl
      transition-all duration-200 cursor-pointer shadow-lg shadow-black/20
      ${
        isActive
          ? "bg-[#171717] scale-[1.02] shadow-xl shadow-black/30"
          : "bg-[#b9b9b9] hover:bg-[#a8a8a8] hover:scale-[1.01]"
      }
    `}
  >
    <div className="text-left">
      <p
        className={`text-xs font-bold uppercase tracking-widest mb-1 ${isActive ? "text-[#b9b9b9]" : "text-[#171717]/60"}`}
      >
        {title}
      </p>
      <p
        className={`text-2xl font-bold ${isActive ? "text-white" : "text-[#171717]"}`}
      >
        {value}
      </p>
    </div>
    <div
      className={`p-3 rounded-xl ${isActive ? "bg-white/10" : "bg-[#171717]/5"}`}
    >
      <Icon
        className={`text-2xl ${isActive ? accentColor || "text-white" : "text-[#171717]"}`}
      />
    </div>
  </button>
);

// ── Unit ID badge ─────────────────────────────────────────────────────────────
const UnitBadge = ({ unitId }) => {
  if (!unitId) return null;
  return (
    <span className="inline-flex items-center gap-1 py-0.5 text-xs font-bold text-[#171717]">
      {unitId}
    </span>
  );
};

// ── Sort icon helper ──────────────────────────────────────────────────────────
const SortIcon = ({ state }) => {
  if (state === "asc")
    return (
      <FaChevronUp className="text-[#b50002] text-xs ml-1 flex-shrink-0" />
    );
  if (state === "desc")
    return (
      <FaChevronDown className="text-[#b50002] text-xs ml-1 flex-shrink-0" />
    );
  return <FaSort className="text-[#b9b9b9]/40 text-xs ml-1 flex-shrink-0" />;
};

// ── Pagination ────────────────────────────────────────────────────────────────
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const pages = [];
  const delta = 2;
  const left = currentPage - delta;
  const right = currentPage + delta;
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= left && i <= right)) pages.push(i);
  }
  const withEllipsis = [];
  let prev = null;
  for (const page of pages) {
    if (prev && page - prev > 1) withEllipsis.push("...");
    withEllipsis.push(page);
    prev = page;
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-lg bg-[#b9b9b9] text-[#171717] disabled:opacity-40 hover:bg-[#a0a0a0] transition-colors shadow-lg shadow-black/20"
      >
        <FaChevronLeft />
      </button>
      {withEllipsis.map((item, idx) =>
        item === "..." ? (
          <span key={`ellipsis-${idx}`} className="px-2 text-[#171717]">
            …
          </span>
        ) : (
          <button
            key={item}
            onClick={() => onPageChange(item)}
            className={`w-9 h-9 rounded-lg font-semibold text-sm transition-all shadow-lg shadow-black/20 ${currentPage === item ? "bg-[#b50002] text-white scale-105" : "bg-[#b9b9b9] text-[#171717] hover:bg-[#a0a0a0]"}`}
          >
            {item}
          </button>
        ),
      )}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-lg bg-[#b9b9b9] text-[#171717] disabled:opacity-40 hover:bg-[#a0a0a0] transition-colors shadow-lg shadow-black/20"
      >
        <FaChevronRight />
      </button>
    </div>
  );
};

// ── Card View ─────────────────────────────────────────────────────────────────
const MotorcycleCard = ({ motorcycle, onEdit, onDelete, onRestore }) => {
  const getStatusStyle = (status) => {
    const map = {
      available: "bg-green-900/30 text-green-800 border border-green-800/30",
      rented: "bg-blue-900/30 text-blue-800 border border-blue-800/30",
      maintenance:
        "bg-orange-900/30 text-orange-800 border border-orange-800/30",
      pending: "bg-yellow-900/30 text-yellow-800 border border-yellow-800/30",
    };
    return map[status] || "bg-gray-700 text-gray-200";
  };

  return (
    <div
      className={`bg-[#e3e3e3] ${styles.rounded2xl} ${styles.carCard} border-t-2 border-transparent hover:scale-95 transition-all duration-200 ease-out ${motorcycle.isDeleted ? "opacity-60" : ""} shadow-[0_-4px_12px_rgba(0,0,0,0.15)]`}
    >
      <div className="relative w-full aspect-[16/9] overflow-hidden rounded-t-2xl">
        <img
          src={motorcycle.image}
          alt={`${motorcycle.make} ${motorcycle.model}`}
          className="w-full h-full object-contain"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = "/placeholder-bike.png";
          }}
        />
        <div className="absolute top-4 right-4">
          {motorcycle.isDeleted ? (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-900/30 text-red-800 border border-red-800">
              Deleted
            </span>
          ) : (
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusStyle(motorcycle.status)}`}
            >
              {motorcycle.status.charAt(0).toUpperCase() +
                motorcycle.status.slice(1)}
            </span>
          )}
        </div>
      </div>
      <div className="p-5 bg-[#b9b9b9] rounded-b-2xl">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-[#171717]">
              {motorcycle.make} {motorcycle.model}
            </h3>
            <p className="text-[#171717]">{motorcycle.year}</p>
            <div className="mt-1">
              <UnitBadge unitId={motorcycle.unitId} />
            </div>
            {motorcycle.description ? (
              <p className="text-sm text-[#171717] mt-2 line-clamp-3">
                {motorcycle.description}
              </p>
            ) : (
              <p className="text-sm text-[#171717] mt-2 italic">
                No description
              </p>
            )}
            {motorcycle.isDeleted && motorcycle.deletedAt && (
              <p className="text-xs text-[#171717] mt-1">
                Deleted: {new Date(motorcycle.deletedAt).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="text-2xl font-bold text-[#171717]">
            ₱{motorcycle.dailyRate}
            <span className="text-sm font-normal">/day</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="flex items-center text-base">
            <FaGasPump className="text-[#b50002] mr-2" />
            <span className="text-[#171717]">{motorcycle.fuelType}</span>
          </div>
          <div className="flex items-center text-base">
            <FaCog className="text-[#b50002] mr-2" />
            <span className="text-[#171717]">{motorcycle.engineSize}cc</span>
          </div>
          <div className="flex items-center text-base">
            <FaCog className="text-[#b50002] mr-2" />
            <span className="text-[#171717]">{motorcycle.transmission}</span>
          </div>
          <div className="flex items-center text-base">
            <FaShieldAlt className="text-[#b50002] mr-2" />
            <span className="text-[#171717]">
              {motorcycle.hasABS ? "ABS" : "Standard"}
            </span>
          </div>
        </div>
        <div className="flex justify-between border-t border-[#171717] pt-4">
          {motorcycle.isDeleted && (
            <>
              <button
                onClick={() => onRestore(motorcycle._id ?? motorcycle.id)}
                className="flex items-center text-green-800 hover:text-green-800/60 transition-colors"
              >
                <FaTrashRestore className="mr-1 text-3xl" />
              </button>
              <button
                onClick={() => onDelete(motorcycle._id ?? motorcycle.id, true)}
                className="flex items-center text-red-800 hover:text-red-800/60 transition-colors"
              >
                <FaTrash className="mr-1 text-3xl" />
              </button>
            </>
          )}
          {!motorcycle.isDeleted &&
            !["rented", "pending"].includes(
              (motorcycle.status || "").toLowerCase(),
            ) && (
              <>
                <button
                  onClick={() => onEdit(motorcycle)}
                  className="flex items-center text-[#171717] hover:text-green-800 transition-colors"
                >
                  <FaEdit className="mr-1 text-3xl" />
                </button>
                <button
                  onClick={() =>
                    onDelete(motorcycle._id ?? motorcycle.id, false)
                  }
                  className="flex items-center text-red-800 hover:text-red-800/60 transition-colors"
                >
                  <FaTrash className="mr-1 text-3xl" />
                </button>
              </>
            )}
        </div>
      </div>
    </div>
  );
};

// ── Table View ────────────────────────────────────────────────────────────────
const MotorcycleTable = ({
  motorcycles,
  onEdit,
  onDelete,
  onRestore,
  colSort,
  onColSort,
}) => {
  const getStatusStyle = (status) => {
    const map = {
      available: "bg-green-900/30 text-green-800 border border-green-800/30",
      rented: "bg-blue-900/30 text-blue-800 border border-blue-800/30",
      maintenance:
        "bg-orange-900/30 text-orange-800 border border-orange-800/30",
      pending: "bg-yellow-900/30 text-yellow-800 border border-yellow-800/30",
    };
    return (
      map[status] || "bg-gray-700/30 text-gray-700 border border-gray-600/30"
    );
  };

  const cols = [
    { label: "Unit", key: "unitId", width: "w-[120px]", sortable: true },
    { label: "Motorcycle", key: "make", width: "w-[260px]", sortable: true },
    { label: "Year", key: "year", width: "w-[90px]", sortable: true },
    { label: "Category", key: "category", width: "w-[140px]", sortable: true },
    { label: "Engine", key: "engineSize", width: "w-[120px]", sortable: true },
    {
      label: "Transmission",
      key: "transmission",
      width: "w-[160px]",
      sortable: true,
    },
    { label: "Fuel", key: "fuelType", width: "w-[130px]", sortable: true },
    { label: "ABS", key: "hasABS", width: "w-[90px]", sortable: true },
    { label: "Rate/Day", key: "dailyRate", width: "w-[130px]", sortable: true },
    { label: "Status", key: null, width: "w-[140px]", sortable: false },
    { label: "Actions", key: null, width: "w-[120px]", sortable: false },
  ];

  return (
    <div className="rounded-2xl overflow-hidden shadow-lg shadow-black/20">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1200px] border-collapse">
          <thead>
            <tr className="bg-[#171717]">
              {cols.map((col) => (
                <th
                  key={col.label}
                  onClick={col.sortable ? () => onColSort(col.key) : undefined}
                  className={`
                    ${col.width} px-4 py-4 text-left text-sm font-bold uppercase tracking-wider
                    text-[#b9b9b9] whitespace-nowrap first:pl-5 last:pr-5
                    ${col.sortable ? "cursor-pointer select-none hover:text-white transition-colors" : ""}
                  `}
                >
                  <span className="inline-flex items-center gap-0.5">
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
          <tbody>
            {motorcycles.map((motorcycle, idx) => (
              <tr
                key={motorcycle.id}
                className={`
                  border-b border-[#171717]/10 transition-all duration-150
                  ${idx % 2 === 0 ? "bg-[#b9b9b9]" : "bg-[#c4c4c4]"}
                  ${motorcycle.isDeleted ? "opacity-55" : "hover:bg-[#a8a8a8]"}
                `}
              >
                <td className="px-4 py-4 pl-5">
                  <UnitBadge unitId={motorcycle.unitId} />
                  {!motorcycle.unitId && (
                    <span className="text-sm text-[#171717]/40 italic">—</span>
                  )}
                </td>

                <td className="px-4 py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-[#171717]/5">
                      <img
                        src={motorcycle.image}
                        alt={`${motorcycle.make} ${motorcycle.model}`}
                        className="w-full h-full object-contain"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder-bike.png";
                        }}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-bold text-[#171717] truncate leading-tight">
                        {motorcycle.make} {motorcycle.model}
                      </p>
                      {motorcycle.isDeleted && motorcycle.deletedAt && (
                        <p className="text-xs text-red-700 mt-0.5">
                          Deleted{" "}
                          {new Date(motorcycle.deletedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </td>

                <td className="px-4 py-4">
                  <span className="text-base text-[#171717]">
                    {motorcycle.year || "—"}
                  </span>
                </td>

                <td className="px-4 py-4">
                  <span className="text-base text-[#171717]">
                    {motorcycle.category}
                  </span>
                </td>

                <td className="px-4 py-4">
                  <div className="flex items-center gap-1.5">
                    <FaCog className="text-[#b50002] text-sm flex-shrink-0" />
                    <span className="text-base text-[#171717]">
                      {motorcycle.engineSize}cc
                    </span>
                  </div>
                </td>

                <td className="px-4 py-4">
                  <span className="text-base text-[#171717]">
                    {motorcycle.transmission}
                  </span>
                </td>

                <td className="px-4 py-4">
                  <div className="flex items-center gap-1.5">
                    <FaGasPump className="text-[#b50002] text-sm flex-shrink-0" />
                    <span className="text-base text-[#171717]">
                      {motorcycle.fuelType}
                    </span>
                  </div>
                </td>

                <td className="px-4 py-4">
                  <div className="flex items-center gap-1.5">
                    <FaShieldAlt
                      className={`text-sm ${motorcycle.hasABS ? "text-[#b50002]" : "text-[#171717]/30"}`}
                    />
                    <span
                      className={`text-sm font-semibold ${motorcycle.hasABS ? "text-[#171717]" : "text-[#171717]/40"}`}
                    >
                      {motorcycle.hasABS ? "Yes" : "No"}
                    </span>
                  </div>
                </td>

                <td className="px-4 py-4">
                  <span className="text-base font-bold text-[#171717]">
                    ₱{motorcycle.dailyRate}
                  </span>
                </td>

                <td className="px-4 py-4">
                  {motorcycle.isDeleted ? (
                    <span className="inline-flex px-3 py-1 rounded-full text-sm font-semibold bg-red-900/30 text-red-800 border border-red-800/40">
                      Deleted
                    </span>
                  ) : (
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${getStatusStyle(motorcycle.status)}`}
                    >
                      {motorcycle.status.charAt(0).toUpperCase() +
                        motorcycle.status.slice(1)}
                    </span>
                  )}
                </td>

                <td className="px-3 py-4 pr-5">
                  <div className="flex items-center gap-2">
                    {motorcycle.isDeleted && (
                      <>
                        <button
                          onClick={() =>
                            onRestore(motorcycle._id ?? motorcycle.id)
                          }
                          className="p-2 rounded-lg bg-green-800 text-white hover:bg-green-700 transition-colors"
                          title="Restore"
                        >
                          <FaTrashRestore className="text-xl" />
                        </button>
                        <button
                          onClick={() =>
                            onDelete(motorcycle._id ?? motorcycle.id, true)
                          }
                          className="p-2 rounded-lg bg-red-800 text-white hover:bg-red-700 transition-colors"
                          title="Delete Forever"
                        >
                          <FaTrash className="text-xl" />
                        </button>
                      </>
                    )}
                    {!motorcycle.isDeleted &&
                      !["rented", "pending"].includes(
                        (motorcycle.status || "").toLowerCase(),
                      ) && (
                        <>
                          <button
                            onClick={() => onEdit(motorcycle)}
                            className="p-2 rounded-lg bg-[#171717] text-white hover:bg-green-800 transition-colors"
                            title="Edit"
                          >
                            <FaEdit className="text-xl" />
                          </button>
                          <button
                            onClick={() =>
                              onDelete(motorcycle._id ?? motorcycle.id, false)
                            }
                            className="p-2 rounded-lg bg-red-800 text-white hover:bg-red-700 transition-colors"
                            title="Delete"
                          >
                            <FaTrash className="text-xl" />
                          </button>
                        </>
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

// ── Edit Modal ────────────────────────────────────────────────────────────────
const EditModal = ({ motorcycle, onClose, onSubmit, onChange }) => {
  const fileRef = useRef(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  useEffect(() => {
    const currentImage = motorcycle?.image || motorcycle?._rawImage || "";
    setSelectedImage(null);
    setImagePreview(makeImageUrl(currentImage));
    if (fileRef.current) fileRef.current.value = "";
  }, [motorcycle]);

  const mapToBackend = (m) => {
    const formData = new FormData();
    const fields = {
      unitId: m.unitId || "",
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
    };

    Object.entries(fields).forEach(([key, value]) => {
      formData.append(key, value);
    });

    if (selectedImage) {
      formData.append("image", selectedImage);
    }

    return formData;
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!motorcycle?.unitId) return toast.error("Unit ID is required.");
    if (!motorcycle?.make || !motorcycle?.model)
      return toast.error("Make and Model are required.");
    onSubmit(mapToBackend(motorcycle));
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

  const inputField = (label, name, type = "text", options = {}) => (
    <div>
      <label className="block text-[#171717] font-medium text-sm mb-1">
        {label}
      </label>
      {type === "select" ? (
        <select
          name={name}
          value={motorcycle[name] || ""}
          onChange={handleInputChange}
          className={styles.inputField}
          required={options.required}
        >
          {options.items?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : type === "checkbox" ? (
        <input
          type="checkbox"
          name={name}
          checked={motorcycle[name] || false}
          onChange={handleInputChange}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
      ) : (
        <input
          type={type}
          name={name}
          value={motorcycle[name] || ""}
          onChange={handleInputChange}
          onKeyDown={(e) => {
            if (type === "number" && ["e", "E", "+", "-"].includes(e.key))
              e.preventDefault();
          }}
          className={styles.inputField}
          required={options.required}
          min={options.min}
          max={options.max}
          step={options.step}
          maxLength={options.maxLength}
          placeholder={options.placeholder}
        />
      )}
    </div>
  );

  return (
    <div className={styles.modalOverlay}>
      <div
        className={`bg-[#b9b9b9] ${styles.rounded2xl} ${styles.modalContainer}`}
      >
        <div className="p-6">
          <div className="flex justify-between items-center border-b border-[#171717] pb-4">
            <h2 className="text-2xl font-bold text-[#171717]">
              {motorcycle._id
                ? `Edit: ${motorcycle.make} ${motorcycle.model}`
                : "Add New Motorcycle"}
            </h2>
            <button onClick={onClose} className="text-[#171717]">
              <FaTimes className="h-6 w-6" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                {inputField("Unit ID", "unitId", "text", {
                  required: true,
                  placeholder: "e.g. UNIT-01",
                  maxLength: 30,
                })}
              </div>
              {inputField("Make", "make", "text", { required: true })}
              {inputField("Model", "model", "text", { required: true })}
              {inputField("Year", "year", "number", {
                required: true,
                min: 1900,
                max: 2099,
              })}
              <div className="md:col-span-2">
                <label className="block text-[#171717] font-medium text-sm mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={motorcycle.description || ""}
                  onChange={handleInputChange}
                  rows={4}
                  className={styles.inputField}
                  placeholder="Enter motorcycle description..."
                />
              </div>
              {inputField("Category", "category", "select", {
                required: true,
                items: ["Scooter", "Naked", "Underbone"],
              })}
              <div>
                <label className="block text-[#171717] font-medium text-sm mb-1">
                  Status
                </label>
                <select
                  name="status"
                  value={motorcycle.status || "available"}
                  onChange={handleInputChange}
                  className={styles.inputField}
                  required
                >
                  <option value="available">Available</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
              {inputField("Daily Rate (₱)", "dailyRate", "number", {
                required: true,
                min: 1,
                step: 0.01,
              })}
              {inputField("Engine Size (cc)", "engineSize", "number", {
                required: true,
                min: 50,
              })}
              {inputField("Transmission", "transmission", "select", {
                required: true,
                items: ["Manual", "Automatic", "Semi-Automatic"],
              })}
              {inputField("Fuel Type", "fuelType", "select", {
                required: true,
                items: ["Unleaded", "Premium"],
              })}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 text-sm font-medium text-[#171717]">
                  ABS
                </label>
                <select
                  name="hasABS"
                  value={motorcycle.hasABS ? "yes" : "no"}
                  onChange={(e) =>
                    handleInputChange({
                      target: {
                        name: "hasABS",
                        value: e.target.value === "yes",
                      },
                    })
                  }
                  className="w-full rounded-lg bg-[#c7c5c5] px-3 py-3 text-sm text-[#171717] focus:outline-none shadow-lg shadow-black/20 focus:ring-1 focus:ring-[#171717]"
                >
                  <option value="no">No ABS</option>
                  <option value="yes">Has ABS</option>
                </select>
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-[#171717]">
                  Helmet
                </label>
                <select
                  name="hasHelmet"
                  value={motorcycle.hasHelmet ? "yes" : "no"}
                  onChange={(e) =>
                    handleInputChange({
                      target: {
                        name: "hasHelmet",
                        value: e.target.value === "yes",
                      },
                    })
                  }
                  className="w-full rounded-lg bg-[#c7c5c5] px-3 py-3 text-sm text-[#171717] focus:outline-none shadow-lg shadow-black/20 focus:ring-1 focus:ring-[#171717]"
                >
                  <option value="no">No Helmet</option>
                  <option value="yes">Includes Helmet</option>
                </select>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-[#171717] font-medium text-sm mb-1">
                Motorcycle Image
              </label>
              <div className={AddCarPageStyles.imageUploadContainer}>
                <label className={AddCarPageStyles.imageUploadLabel}>
                  {imagePreview ? (
                    <div className="w-full h-full rounded-xl overflow-hidden">
                      <img
                        src={imagePreview}
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
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
            <div className="justify-normal space-x-4 pt-4 flex items-center">
              <button
                type="button"
                onClick={onClose}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#b50002] text-white font-bold text-sm rounded-xl
                    shadow-lg shadow-[#b50002]/30 hover:brightness-110 hover:scale-[1.01] active:scale-[0.98] transition-all duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#171717] text-white font-bold text-sm rounded-xl
                    shadow-lg shadow-[#171717]/30 hover:brightness-110 hover:scale-[1.01] active:scale-[0.98] transition-all duration-200"
              >
                {motorcycle._id ? "Save Changes" : "Add Motorcycle"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const NoMotorcyclesView = ({ onResetFilter }) => (
  <div className={`bg-[#b9b9b9] ${styles.noCarsContainer}`}>
    <div className="mx-auto w-24 h-24 flex items-center justify-center mb-6">
      <FaMotorcycle className="h-24 w-24 text-[#171717]" />
    </div>
    <h3 className="mt-4 text-xl font-medium text-[#171717]">
      No motorcycles found
    </h3>
    <p className="mt-2 text-[#171717]">Try adjusting your filter criteria</p>
    <button
      onClick={onResetFilter}
      className="w-40 py-2.5 px-4 rounded-xl mt-6 items-center justify-center gap-2 font-semibold text-sm text-white bg-[#b50002]
                    shadow-lg shadow-[#b50002]/30 hover:brightness-110 hover:scale-[1.01] active:scale-[0.98] transition-all duration-200"
    >
      Clear All Filters
    </button>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const ManageMotorcycle = () => {
  const navigate = useNavigate();
  const [motorcycles, setMotorcycles] = useState([]);
  const [viewMode, setViewMode] = useState("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("available");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedFuelType, setSelectedFuelType] = useState("all");
  const [selectedTransmission, setSelectedTransmission] = useState("all");
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [showFilters, setShowFilters] = useState(false);
  const [editingMotorcycle, setEditingMotorcycle] = useState(null);
  const [showEditModel, setShowEditModel] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [colSort, setColSort] = useState({ key: null, dir: null });

  const fetchMotorcycles = useCallback(async () => {
    try {
      const res = await api.get("/api/motorcycles", {
        // includeDeleted=true bypasses the status=available filter so the
        // admin sees all motorcycles with their real-time status
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
      toast.error("Failed to load motorcycles");
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

  const categories = useMemo(
    () => [
      "all",
      ...Array.from(new Set(motorcycles.map((m) => m.category || "Standard"))),
    ],
    [motorcycles],
  );
  const getUniqueValues = (key) => [
    ...new Set(
      motorcycles
        .map((m) => m[key] || "")
        .filter(Boolean)
        .map((v) => v.toString().trim()),
    ),
  ];
  const fuelTypes = getUniqueValues("fuelType");
  const transmissions = getUniqueValues("transmission");

  const activeCount = motorcycles.filter(
    (m) => !m.isDeleted && m.status === "available",
  ).length;
  const pendingCount = motorcycles.filter(
    (m) => !m.isDeleted && m.status === "pending",
  ).length;
  const rentedCount = motorcycles.filter(
    (m) => !m.isDeleted && m.status === "rented",
  ).length;
  const maintenanceCount = motorcycles.filter(
    (m) => !m.isDeleted && m.status === "maintenance",
  ).length;
  const deletedCount = motorcycles.filter((m) => m.isDeleted).length;

  const handleColSort = (key) => {
    setColSort((prev) => {
      if (prev.key !== key) return { key, dir: "asc" };
      const next = nextSortState(prev.dir);
      return next === null ? { key: null, dir: null } : { key, dir: next };
    });
  };

  const filteredMotorcycles = useMemo(() => {
    let filtered = [...motorcycles];

    if (selectedStatus === "deleted") {
      filtered = filtered.filter((m) => m.isDeleted);
    } else {
      filtered = filtered.filter(
        (m) => !m.isDeleted && m.status === selectedStatus,
      );
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((m) => {
        const name = `${m.make || ""} ${m.model || ""}`.toLowerCase();
        return (
          name.includes(term) ||
          (m.category || "").toLowerCase().includes(term) ||
          (m.unitId || "").toLowerCase().includes(term)
        );
      });
    }

    if (selectedCategory !== "all")
      filtered = filtered.filter((m) => m.category === selectedCategory);
    if (selectedFuelType !== "all")
      filtered = filtered.filter((m) => m.fuelType === selectedFuelType);
    if (selectedTransmission !== "all")
      filtered = filtered.filter(
        (m) => m.transmission === selectedTransmission,
      );

    const minPrice = parseFloat(priceRange.min);
    const maxPrice = parseFloat(priceRange.max);
    if (!isNaN(minPrice))
      filtered = filtered.filter((m) => m.dailyRate >= minPrice);
    if (!isNaN(maxPrice))
      filtered = filtered.filter((m) => m.dailyRate <= maxPrice);

    if (colSort.key && colSort.dir) {
      filtered.sort((a, b) => {
        let aVal = a[colSort.key];
        let bVal = b[colSort.key];
        if (typeof aVal === "boolean") {
          aVal = aVal ? 1 : 0;
          bVal = bVal ? 1 : 0;
        }
        if (typeof aVal === "number" || (!isNaN(Number(aVal)) && aVal !== "")) {
          return colSort.dir === "asc"
            ? Number(aVal) - Number(bVal)
            : Number(bVal) - Number(aVal);
        }
        const cmp = String(aVal ?? "").localeCompare(String(bVal ?? ""));
        return colSort.dir === "asc" ? cmp : -cmp;
      });
    } else {
      filtered.sort((a, b) =>
        `${a.make} ${a.model}`
          .trim()
          .localeCompare(`${b.make} ${b.model}`.trim()),
      );
    }

    return filtered;
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
  const paginatedMotorcycles = filteredMotorcycles.slice(
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

  const handleDelete = async (identifier, permanent = false) => {
    const motorcycle = motorcycles.find(
      (m) => m._id === identifier || m.id === identifier,
    );
    if (!motorcycle) return toast.error("Motorcycle not found");
    const message = permanent
      ? `Permanently delete ${motorcycle.make} ${motorcycle.model}? This cannot be undone.`
      : `Delete ${motorcycle.make} ${motorcycle.model}?`;
    const confirmed = await confirmModal(message, permanent);
    if (!confirmed) return;
    try {
      if (!motorcycle._id) {
        setMotorcycles((prev) => prev.filter((p) => p.id !== motorcycle.id));
        toast.success("Motorcycle removed");
        return;
      }
      await api.delete(
        permanent
          ? `/api/motorcycles/${motorcycle._id}/permanent`
          : `/api/motorcycles/${motorcycle._id}`,
      );
      toast.success(
        permanent ? "Motorcycle permanently deleted" : "Motorcycle deleted",
      );
      fetchMotorcycles();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to delete motorcycle");
    }
  };

  const handleRestore = async (identifier) => {
    const motorcycle = motorcycles.find(
      (m) => m._id === identifier || m.id === identifier,
    );
    if (!motorcycle) return toast.error("Motorcycle not found");
    if (!motorcycle._id) return toast.error("Cannot restore local motorcycle");
    try {
      await api.patch(`/api/motorcycles/${motorcycle._id}/restore`);
      toast.success("Motorcycle restored successfully");
      fetchMotorcycles();
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message || "Failed to restore motorcycle",
      );
    }
  };

  const openEdit = (motorcycle) => {
    const rawImage = motorcycle._rawImage ?? motorcycle.image ?? "";
    setEditingMotorcycle({
      ...motorcycle,
      image: /^data:image\//i.test(String(rawImage)) ? "" : rawImage,
      _id: motorcycle._id ?? null,
    });
    setShowEditModel(true);
  };

  const handleEditSubmit = async (payload) => {
    try {
      const config = payload instanceof FormData ? undefined : undefined;

      if (!editingMotorcycle._id) {
        await api.post("/api/motorcycles", payload, config);
        toast.success("Motorcycle added");
      } else {
        await api.put(`/api/motorcycles/${editingMotorcycle._id}`, payload, config);
        toast.success("Motorcycle updated");
      }
      setShowEditModel(false);
      setEditingMotorcycle(null);
      fetchMotorcycles();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to save motorcycle");
    }
  };

  const hasActiveFilters =
    searchTerm ||
    selectedCategory !== "all" ||
    selectedFuelType !== "all" ||
    selectedTransmission !== "all" ||
    priceRange.min ||
    priceRange.max ||
    colSort.key;

  return (
    <div className="min-h-screen pt-32 bg-[#e3e3e3] text-white py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-4 rounded-3xl bg-gradient-to-br from-[#171717] via-[#212121] to-[#b50002] p-4 sm:p-5 border border-white/10 mt-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] font-black text-[#b9b9b9]/80 mb-1">
              Fleet Control
            </p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white">
              Motorcycle Management
            </h1>
            <p className="text-xs sm:text-sm text-[#b9b9b9]/80 mt-1.5 max-w-xl">
              Manage units, monitor availability, and keep fleet details accurate.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6 space-y-4">
        <div className="relative max-w-2xl mx-auto">
          <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#171717]" />
          <input
            type="text"
            placeholder="Search by make, model, category, or unit ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-12 py-3 bg-[#c7c5c5] rounded-lg text-[#171717] placeholder-gray-500 focus:outline-none shadow-lg shadow-black/20 focus:ring-1 focus:ring-[#171717]"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[#171717]"
            >
              <FaTimes />
            </button>
          )}
        </div>

        <div className="flex justify-center gap-4 flex-wrap">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-40 flex items-center justify-center gap-2 py-2.5 bg-[#171717] text-white font-bold text-sm rounded-xl
                    shadow-lg shadow-[#171717]/30 hover:brightness-110 hover:scale-[1.01] active:scale-[0.98] transition-all duration-200"
          >
            <FaFilter />
            {showFilters ? "Hide Filters" : "Show Filters"}
          </button>
          <button
            onClick={() =>
              setViewMode(viewMode === "detailed" ? "list" : "detailed")
            }
            className="w-40 flex items-center justify-center gap-2 py-2.5 bg-[#171717] text-white font-bold text-sm rounded-xl
                    shadow-lg shadow-[#171717]/30 hover:brightness-110 hover:scale-[1.01] active:scale-[0.98] transition-all duration-200"
          >
            {viewMode === "detailed" ? (
              <>
                <FaList /> List View
              </>
            ) : (
              <>
                <FaThLarge /> Detailed View
              </>
            )}
          </button>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="w-40 flex items-center justify-center gap-2 py-2.5 bg-[#b50002] text-white font-bold text-sm rounded-xl
                    shadow-lg shadow-[#b50002]/30 hover:brightness-110 hover:scale-[1.01] active:scale-[0.98] transition-all duration-200"
            >
              <FaTimes /> Clear Filters
            </button>
          )}
          <button
            onClick={() => navigate("/motorcycle-tracking")}
            className="w-40 flex items-center justify-center gap-2 py-2.5 bg-[#171717] text-white font-bold text-sm rounded-xl
                    shadow-lg shadow-[#171717]/30 hover:brightness-110 hover:scale-[1.01] active:scale-[0.98] transition-all duration-200"
          >
            <FaMapMarkedAlt /> View Locations
          </button>
          <button
            onClick={() => navigate("/motorcycle-location-log")}
            className="w-44 flex items-center justify-center gap-2 py-2.5 bg-[#171717] text-white font-bold text-sm rounded-xl
                    shadow-lg shadow-[#171717]/30 hover:brightness-110 hover:scale-[1.01] active:scale-[0.98] transition-all duration-200"
          >
            <FaClock /> Location Log
          </button>
        </div>

        {showFilters && (
          <div className="bg-[#b9b9b9] backdrop-blur-md rounded-lg p-6 shadow-lg shadow-black/20">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-[#171717] text-sm font-semibold mb-2">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-[#c7c5c5] rounded-lg text-[#171717] focus:outline-none focus:ring-1 focus:ring-[#171717] shadow-lg shadow-black/20"
                >
                  <option value="all">All Categories</option>
                  {categories
                    .filter((c) => c !== "all")
                    .map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-[#171717] text-sm font-semibold mb-2">
                  Fuel Type
                </label>
                <select
                  value={selectedFuelType}
                  onChange={(e) => setSelectedFuelType(e.target.value)}
                  className="w-full px-3 py-2 bg-[#c7c5c5] rounded-lg text-[#171717] focus:outline-none focus:ring-1 focus:ring-[#171717] shadow-lg shadow-black/20"
                >
                  <option value="all">All Fuel Types</option>
                  {fuelTypes.map((fuel) => (
                    <option key={fuel} value={fuel}>
                      {fuel}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[#171717] text-sm font-semibold mb-2">
                  Transmission
                </label>
                <select
                  value={selectedTransmission}
                  onChange={(e) => setSelectedTransmission(e.target.value)}
                  className="w-full px-3 py-2 bg-[#c7c5c5] rounded-lg text-[#171717] focus:outline-none focus:ring-1 focus:ring-[#171717] shadow-lg shadow-black/20"
                >
                  <option value="all">All Transmissions</option>
                  {transmissions.map((trans) => (
                    <option key={trans} value={trans}>
                      {trans}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[#171717] text-sm font-semibold mb-2">
                  Min Price (₱/day)
                </label>
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
                  className="w-full px-3 py-2 bg-[#c7c5c5] rounded-lg text-[#171717] focus:outline-none focus:ring-1 focus:ring-[#171717] placeholder-gray-500 shadow-lg shadow-black/20"
                />
              </div>
              <div>
                <label className="block text-[#171717] text-sm font-semibold mb-2">
                  Max Price (₱/day)
                </label>
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
                  className="w-full px-3 py-2 bg-[#c7c5c5] rounded-lg text-[#171717] focus:outline-none focus:ring-1 focus:ring-[#171717] placeholder-gray-500 shadow-lg shadow-black/20"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Status Tabs ── */}
      <div className="flex flex-wrap gap-3 mb-6">
        <StatTab
          title="Available"
          value={activeCount}
          icon={FaMotorcycle}
          isActive={selectedStatus === "available"}
          onClick={() => setSelectedStatus("available")}
          accentColor="text-white"
        />
        <StatTab
          title="Pending"
          value={pendingCount}
          icon={FaHourglassHalf}
          isActive={selectedStatus === "pending"}
          onClick={() => setSelectedStatus("pending")}
          accentColor="text-white"
        />
        <StatTab
          title="Rented"
          value={rentedCount}
          icon={FaMotorcycle}
          isActive={selectedStatus === "rented"}
          onClick={() => setSelectedStatus("rented")}
          accentColor="text-white"
        />
        <StatTab
          title="Maintenance"
          value={maintenanceCount}
          icon={FaCog}
          isActive={selectedStatus === "maintenance"}
          onClick={() => setSelectedStatus("maintenance")}
          accentColor="text-white"
        />
        <StatTab
          title="Deleted"
          value={deletedCount}
          icon={FaTrash}
          isActive={selectedStatus === "deleted"}
          onClick={() => setSelectedStatus("deleted")}
          accentColor="text-white"
        />
      </div>

      {/* Result count */}
      <div className="text-center text-[#171717] mb-4 text-sm">
        Showing{" "}
        {filteredMotorcycles.length === 0
          ? 0
          : Math.min(
              (currentPage - 1) * ITEMS_PER_PAGE + 1,
              filteredMotorcycles.length,
            )}
        –{Math.min(currentPage * ITEMS_PER_PAGE, filteredMotorcycles.length)} of{" "}
        {filteredMotorcycles.length}{" "}
        <span className="font-semibold capitalize">{selectedStatus}</span>{" "}
        motorcycles
        {(selectedCategory !== "all" || searchTerm) && " (filtered)"}
      </div>

      {/* ── List / Grid ── */}
      {paginatedMotorcycles.length > 0 ? (
        <>
          {viewMode === "detailed" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedMotorcycles.map((motorcycle) => (
                <MotorcycleCard
                  key={motorcycle.id}
                  motorcycle={motorcycle}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onRestore={handleRestore}
                />
              ))}
            </div>
          ) : (
            <MotorcycleTable
              motorcycles={paginatedMotorcycles}
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
        </>
      ) : (
        <NoMotorcyclesView onResetFilter={clearFilters} />
      )}

      {showEditModel && editingMotorcycle && (
        <EditModal
          motorcycle={editingMotorcycle}
          onClose={() => {
            setShowEditModel(false);
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

export default ManageMotorcycle;
