import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  QrCode,
  Upload,
  CheckCircle,
  AlertCircle,
  X,
  Image as ImageIcon,
  Plus,
  Trash2,
  Power,
} from "lucide-react";
import axios from "axios";
import { createPortal } from "react-dom";
import API_BASE_URL from "../apiBase";
import { ADMIN_TOKEN_STORAGE_KEY } from "../constants/adminAuth";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { Accept: "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const MAX_QR_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const TOO_LARGE_MESSAGE =
  "That image is too large. Please upload a photo up to 5 MB.";
const ALLOWED_QR_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const UNSUPPORTED_TYPE_MESSAGE =
  "Unsupported file type. Please upload a JPG, PNG, or WEBP image.";

// ── Toast Component ─────────────────────────────────────────────────────────
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

// ── Add Payment Method Modal ────────────────────────────────────────────────
const AddMethodModal = ({ onClose, onSubmit, submitting }) => {
  const [name, setName] = useState("");
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [errors, setErrors] = useState({});
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0] || null;

    if (selected && !ALLOWED_QR_IMAGE_TYPES.includes(selected.type)) {
      setFile(null);
      setErrors((prev) => ({ ...prev, file: UNSUPPORTED_TYPE_MESSAGE }));
      e.target.value = "";
      return;
    }

    if (selected && selected.size > MAX_QR_FILE_SIZE) {
      setFile(null);
      setErrors((prev) => ({ ...prev, file: TOO_LARGE_MESSAGE }));
      e.target.value = "";
      return;
    }

    setFile(selected);
    if (selected && errors.file) {
      setErrors((prev) => ({ ...prev, file: undefined }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    const nextErrors = {};
    if (!trimmed)
      nextErrors.name = "Please enter a name for the payment method.";
    if (!file) nextErrors.file = "Please upload a QR code image.";
    else if (!ALLOWED_QR_IMAGE_TYPES.includes(file.type))
      nextErrors.file = UNSUPPORTED_TYPE_MESSAGE;
    else if (file.size > MAX_QR_FILE_SIZE) nextErrors.file = TOO_LARGE_MESSAGE;

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    onSubmit(trimmed, file);
  };

  return createPortal(
    <div className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-[#171717]">
            Add Payment Method
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
            Method Name
          </label>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name)
                setErrors((prev) => ({ ...prev, name: undefined }));
            }}
            placeholder="e.g. Maya Wallet, GrabPay"
            className={`mt-1.5 w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-1 focus:ring-[#b50002] transition-all 
              ${errors.name ? "border-[#b50002]" : "border-slate-200"}`}
          />
          {errors.name && (
            <p className="text-xs text-[#b50002] font-semibold mt-1.5">
              {errors.name}
            </p>
          )}

          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-4 block">
            QR Code Image
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_QR_IMAGE_TYPES.join(",")}
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`mt-1.5 w-full aspect-square max-h-48 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-colors
              ${errors.file ? "border-[#b50002]" : "border-slate-200 hover:border-slate-300"}`}
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="QR preview"
                className="w-full h-full object-contain p-2"
              />
            ) : (
              <div className="text-center text-slate-400 p-4">
                <Upload className="w-6 h-6 mx-auto mb-2 opacity-60" />
                <p className="text-xs font-semibold">
                  Click to upload QR image
                </p>
              </div>
            )}
          </button>
          {errors.file && (
            <p className="text-xs text-[#b50002] font-semibold mt-1.5">
              {errors.file}
            </p>
          )}

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-[#171717] text-white text-sm font-bold hover:bg-[#2a2a2a] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "Adding..." : "Add Method"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
};

// ── Confirm Dialog ──────────────────────────────────────────────────────────
const ConfirmDialog = ({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  loading,
}) =>
  createPortal(
    <div className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-start gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-[#b50002]/10 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-[#b50002]" />
          </div>
          <div>
            <h3 className="text-base font-black text-[#171717]">{title}</h3>
            <p className="text-sm text-slate-500 mt-1">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-[#b50002] text-white text-sm font-bold hover:bg-[#8f0002] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Removing..." : confirmLabel || "Remove"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );

const QRChanger = () => {
  const [methods, setMethods] = useState([]); // [{ _id, name, qrCode, enabled, isDefault }]
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [addingMethod, setAddingMethod] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [confirmDeleteMethod, setConfirmDeleteMethod] = useState(null);
  const [toast, setToast] = useState(null);
  const fileInputRefs = useRef({});
  const toastTimer = useRef(null);

  const showToast = useCallback((message, type = "success") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const getAuthHeader = () => {
    const token = localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Fetch all payment methods (enabled + disabled) for management
  const fetchMethods = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/settings/payment-methods", {
        headers: getAuthHeader(),
      });
      if (Array.isArray(res.data?.data)) {
        setMethods(res.data.data);
      }
    } catch (err) {
      console.log("Failed to load payment methods.");
      showToast("Failed to load payment methods", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchMethods();
  }, [fetchMethods]);

  const resolveQrPath = (path) => {
    if (!path) return null;
    if (path.startsWith("http") || path.startsWith("data:")) return path;
    if (path.startsWith("/images/")) return path; // local fallback
    return `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
  };

  const handleFileSelect = async (method, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_QR_IMAGE_TYPES.includes(file.type)) {
      showToast(UNSUPPORTED_TYPE_MESSAGE, "error");
      if (fileInputRefs.current[method._id]) {
        fileInputRefs.current[method._id].value = "";
      }
      return;
    }

    if (file.size > MAX_QR_FILE_SIZE) {
      showToast(TOO_LARGE_MESSAGE, "error");
      if (fileInputRefs.current[method._id]) {
        fileInputRefs.current[method._id].value = "";
      }
      return;
    }

    setUploadingId(method._id);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await api.post(
        `/api/settings/payment-methods/${method._id}/qr`,
        formData,
        {
          headers: {
            ...getAuthHeader(),
            "Content-Type": "multipart/form-data",
          },
        },
      );

      const newPath = res.data?.path || res.data?.data?.qrCode;
      if (newPath) {
        setMethods((prev) =>
          prev.map((m) =>
            m._id === method._id ? { ...m, qrCode: newPath } : m,
          ),
        );
      } else {
        await fetchMethods();
      }
      showToast(`${method.name} QR Code updated successfully!`);
    } catch (err) {
      const isTooLarge =
        err.response?.status === 413 ||
        /too large|file size|exceeds/i.test(err.response?.data?.message || "");
      const isUnsupportedType =
        err.response?.status === 415 ||
        /unsupported|invalid file type|invalid.*type/i.test(
          err.response?.data?.message || "",
        );
      showToast(
        isTooLarge
          ? TOO_LARGE_MESSAGE
          : isUnsupportedType
            ? UNSUPPORTED_TYPE_MESSAGE
            : err.response?.data?.message || "Failed to upload QR code",
        "error",
      );
    } finally {
      setUploadingId(null);
      if (fileInputRefs.current[method._id]) {
        fileInputRefs.current[method._id].value = "";
      }
    }
  };

  const handleAddMethod = async (name, file) => {
    setAddingMethod(true);
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("image", file);

      const res = await api.post("/api/settings/payment-methods", formData, {
        headers: {
          ...getAuthHeader(),
          "Content-Type": "multipart/form-data",
        },
      });
      const created = res.data?.data;
      if (created) {
        setMethods((prev) => [...prev, created]);
      } else {
        await fetchMethods();
      }
      showToast(`${name} added as a payment method!`);
      setShowAddModal(false);
    } catch (err) {
      const isTooLarge =
        err.response?.status === 413 ||
        /too large|file size|exceeds/i.test(err.response?.data?.message || "");
      showToast(
        isTooLarge
          ? TOO_LARGE_MESSAGE
          : err.response?.data?.message || "Failed to add payment method",
        "error",
      );
    } finally {
      setAddingMethod(false);
    }
  };

  const handleToggle = async (method) => {
    setTogglingId(method._id);
    try {
      const res = await api.patch(
        `/api/settings/payment-methods/${method._id}/toggle`,
        {},
        { headers: getAuthHeader() },
      );
      const updated = res.data?.data;
      const nextEnabled = updated ? updated.enabled : !method.enabled;
      setMethods((prev) =>
        prev.map((m) =>
          m._id === method._id ? { ...m, enabled: nextEnabled } : m,
        ),
      );
      showToast(
        `${method.name} ${nextEnabled ? "enabled" : "disabled"} successfully!`,
      );
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to update payment method",
        "error",
      );
    } finally {
      setTogglingId(null);
    }
  };

  const requestDelete = (method) => {
    setConfirmDeleteMethod(method);
  };

  const confirmDelete = async () => {
    const method = confirmDeleteMethod;
    if (!method) return;

    setDeletingId(method._id);
    try {
      await api.delete(`/api/settings/payment-methods/${method._id}`, {
        headers: getAuthHeader(),
      });
      setMethods((prev) => prev.filter((m) => m._id !== method._id));
      showToast(`${method.name} removed.`);
      setConfirmDeleteMethod(null);
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to remove payment method",
        "error",
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f8fa]">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {showAddModal && (
        <AddMethodModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddMethod}
          submitting={addingMethod}
        />
      )}

      {confirmDeleteMethod && (
        <ConfirmDialog
          title="Remove payment method?"
          message={`"${confirmDeleteMethod.name}" will be permanently removed and customers won't be able to select it at checkout. This can't be undone.`}
          confirmLabel="Remove"
          onConfirm={confirmDelete}
          onCancel={() => setConfirmDeleteMethod(null)}
          loading={deletingId === confirmDeleteMethod._id}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pt-36">
        {/* Page Header */}
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight">
              Payment QR Codes
            </h1>
            <p className="text-slate-700 text-sm mt-1">
              Manage the QR codes displayed to customers during checkout.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#b50002] text-white text-sm font-bold hover:bg-[#8f0002] active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Payment Method
          </button>
        </div>

        {/* Grid of QR Updaters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading && methods.length === 0
            ? Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col animate-pulse"
                >
                  <div className="h-1.5 w-full bg-slate-200" />
                  <div className="p-6 flex-1">
                    <div className="h-5 w-24 bg-slate-200 rounded mb-4" />
                    <div className="w-full aspect-square bg-slate-100 rounded-xl" />
                  </div>
                </div>
              ))
            : methods.map((method) => {
                const currentPath = resolveQrPath(method.qrCode);
                const isUploading = uploadingId === method._id;
                const isToggling = togglingId === method._id;
                const isDeleting = deletingId === method._id;
                const isDisabled = !method.enabled;

                return (
                  <div
                    key={method._id}
                    className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col ${
                      isDisabled ? "opacity-60" : ""
                    }`}
                  >
                    {/* Top stripe */}
                    <div
                      className={`h-1.5 w-full ${
                        isDisabled
                          ? "bg-slate-300"
                          : "bg-gradient-to-r from-[#b50002] to-[#ff4444]"
                      }`}
                    />

                    <div className="p-6 flex-1 flex flex-col">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-4 gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <h2 className="font-black text-[#171717] text-lg truncate">
                            {method.name}
                          </h2>
                          {isDisabled && (
                            <span className="text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-900 px-2 py-0.5 rounded-full flex-shrink-0">
                              Disabled
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => requestDelete(method)}
                            disabled={isDeleting}
                            title="Remove payment method"
                            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-[#b50002]/10 flex items-center justify-center text-slate-400 hover:text-[#b50002] transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                            <QrCode className="w-4 h-4 text-slate-400" />
                          </div>
                        </div>
                      </div>

                      {/* Preview Area */}
                      <div className="relative w-full aspect-square bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center mb-4 overflow-hidden group">
                        {currentPath ? (
                          <img
                            src={currentPath}
                            alt={`${method.name} QR`}
                            className={`w-full h-full object-contain p-2 transition-opacity ${
                              isUploading ? "opacity-30" : "opacity-100"
                            } ${isDisabled ? "grayscale" : ""}`}
                          />
                        ) : (
                          <div className="text-center text-slate-400 p-4">
                            <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm font-semibold">
                              No QR Uploaded
                            </p>
                            <p className="text-xs mt-1">
                              Default will be shown
                            </p>
                          </div>
                        )}

                        {/* Upload Overlay */}
                        <div
                          className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-200 
                            ${currentPath && !isUploading ? "opacity-0 group-hover:opacity-100" : "opacity-0"} 
                            pointer-events-none`}
                        >
                          <span className="bg-white px-4 py-2 rounded-lg text-sm font-bold text-[#171717] shadow-lg">
                            Change Image
                          </span>
                        </div>

                        {isUploading && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm z-10">
                            <div className="w-8 h-8 border-4 border-slate-200 border-t-[#b50002] rounded-full animate-spin mb-2" />
                            <span className="text-xs font-bold text-[#171717]">
                              Uploading...
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="mt-auto space-y-2">
                        <input
                          type="file"
                          accept={ALLOWED_QR_IMAGE_TYPES.join(",")}
                          className="hidden"
                          ref={(el) => (fileInputRefs.current[method._id] = el)}
                          onChange={(e) => handleFileSelect(method, e)}
                        />
                        <button
                          onClick={() =>
                            fileInputRefs.current[method._id]?.click()
                          }
                          disabled={isUploading}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#171717] text-white text-sm font-bold hover:bg-[#2a2a2a] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <Upload className="w-4 h-4" />
                          {currentPath ? "Update QR Code" : "Upload QR Code"}
                        </button>

                        <button
                          onClick={() => handleToggle(method)}
                          disabled={isToggling}
                          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed border
                            ${
                              isDisabled
                                ? "border-[#171717]/10 text-[#171717] hover:bg-slate-50"
                                : "border-[#b50002]/20 text-[#b50002] hover:bg-[#b50002]/5"
                            }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                          {isToggling
                            ? "Updating..."
                            : isDisabled
                              ? "Enable"
                              : "Disable"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
        </div>

        {!loading && methods.length === 0 && (
          <div className="text-center py-16">
            <QrCode className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500 font-semibold">
              No payment methods yet.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#171717] text-white text-sm font-bold hover:bg-[#2a2a2a] transition-all"
            >
              <Plus className="w-4 h-4" />
              Add your first payment method
            </button>
          </div>
        )}
      </div>
    </main>
  );
};

export default QRChanger;
