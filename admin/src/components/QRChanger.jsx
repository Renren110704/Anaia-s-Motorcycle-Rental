import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  QrCode,
  Upload,
  CheckCircle,
  AlertCircle,
  X,
  Image as ImageIcon,
} from "lucide-react";
import axios from "axios";
import { createPortal } from "react-dom";
import API_BASE_URL from "../apiBase";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { Accept: "application/json" },
});

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

const PAYMENT_METHODS = ["GCash", "PayMaya", "Bank Transfer"];

const QRChanger = () => {
  const [qrs, setQrs] = useState({
    GCash: "",
    PayMaya: "",
    "Bank Transfer": "",
  });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(null); // Tracks which method is uploading
  const [toast, setToast] = useState(null);
  const fileInputRefs = useRef({});
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

  // Fetch current QR codes
  const fetchQRs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/settings/qrs", {
        headers: getAuthHeader(),
      });
      if (res.data?.data) {
        setQrs((prev) => ({ ...prev, ...res.data.data }));
      }
    } catch (err) {
      console.log("No dynamic QRs found or failed to load. Using defaults.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQRs();
  }, [fetchQRs]);

  const resolveQrPath = (path) => {
    if (!path) return null;
    if (path.startsWith("http") || path.startsWith("data:")) return path;
    if (path.startsWith("/images/")) return path; // local fallback
    return `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
  };

  const handleFileSelect = async (method, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(method);
    try {
      const formData = new FormData();
      formData.append("method", method);
      formData.append("image", file);

      // Assumes an endpoint that accepts the file and updates the specific payment method's QR
      const res = await api.post("/api/settings/qrs", formData, {
        headers: {
          ...getAuthHeader(),
          "Content-Type": "multipart/form-data",
        },
      });

      if (res.data?.path || res.data?.data?.path) {
        setQrs((prev) => ({
          ...prev,
          [method]: res.data.path || res.data.data.path,
        }));
        showToast(`${method} QR Code updated successfully!`);
      } else {
        // Fallback re-fetch if endpoint doesn't return the path directly
        await fetchQRs();
        showToast(`${method} QR Code updated successfully!`);
      }
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to upload QR code",
        "error",
      );
    } finally {
      setUploading(null);
      if (fileInputRefs.current[method]) {
        fileInputRefs.current[method].value = "";
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f3f3]">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-xl bg-[#b50002]/10 flex items-center justify-center">
                <QrCode className="w-4.5 h-4.5 text-[#b50002]" />
              </div>
              <h1 className="text-2xl font-black text-[#171717]">
                Payment QR Codes
              </h1>
            </div>
            <p className="text-sm text-slate-500 ml-12">
              Manage the QR codes displayed to customers during checkout.
            </p>
          </div>
        </div>

        {/* Grid of QR Updaters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PAYMENT_METHODS.map((method) => {
            const currentPath = resolveQrPath(qrs[method]);
            const isUploading = uploading === method;

            return (
              <div
                key={method}
                className="bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col"
              >
                {/* Top stripe */}
                <div className="h-1.5 w-full bg-gradient-to-r from-[#b50002] to-[#ff4444]" />

                <div className="p-6 flex-1 flex flex-col">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-black text-[#171717] text-lg">
                      {method}
                    </h3>
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                      <QrCode className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>

                  {/* Preview Area */}
                  <div className="relative w-full aspect-square bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center mb-6 overflow-hidden group">
                    {loading ? (
                      <div className="animate-pulse flex flex-col items-center gap-2">
                        <div className="w-10 h-10 border-4 border-slate-200 border-t-[#b50002] rounded-full animate-spin" />
                      </div>
                    ) : currentPath ? (
                      <img
                        src={currentPath}
                        alt={`${method} QR`}
                        className={`w-full h-full object-contain p-2 transition-opacity ${
                          isUploading ? "opacity-30" : "opacity-100"
                        }`}
                      />
                    ) : (
                      <div className="text-center text-slate-400 p-4">
                        <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm font-semibold">No QR Uploaded</p>
                        <p className="text-xs mt-1">Default will be shown</p>
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

                  {/* Action Button */}
                  <div className="mt-auto">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={(el) => (fileInputRefs.current[method] = el)}
                      onChange={(e) => handleFileSelect(method, e)}
                    />
                    <button
                      onClick={() => fileInputRefs.current[method]?.click()}
                      disabled={isUploading || loading}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#171717] text-white text-sm font-bold hover:bg-[#2a2a2a] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <Upload className="w-4 h-4" />
                      {currentPath ? "Update QR Code" : "Upload QR Code"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default QRChanger;
