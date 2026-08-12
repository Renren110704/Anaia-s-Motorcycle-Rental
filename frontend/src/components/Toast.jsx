import React from "react";
import { FaHeart } from "react-icons/fa";

/**
 * Lightweight, self-contained toast notification.
 * Renders nothing when `message` is falsy.
 *
 * Usage:
 *   const [toastMsg, setToastMsg] = useState("");
 *   const toastTimeoutRef = useRef(null);
 *   const showToast = (msg) => {
 *     setToastMsg(msg);
 *     if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
 *     toastTimeoutRef.current = setTimeout(() => setToastMsg(""), 2200);
 *   };
 *   ...
 *   <Toast message={toastMsg} />
 */
const Toast = ({ message }) => {
  if (!message) return null;

  return (
    <>
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translate(-50%, 12px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .toast-wrap {
          position: fixed;
          bottom: 28px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 9999;
          animation: toastIn 0.25s ease;
          max-width: calc(100% - 32px);
          pointer-events: none;
        }
        .toast-pill {
          display: flex;
          align-items: center;
          gap: 9px;
          background: #0E0E0E;
          color: #fff;
          padding: 12px 20px;
          border-radius: 999px;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 13.5px;
          font-weight: 600;
          box-shadow: 0 10px 30px rgba(0,0,0,0.25);
          white-space: nowrap;
        }
        .toast-pill svg { color: #ff5c5e; flex-shrink: 0; }
        @media(max-width: 480px) {
          .toast-pill { white-space: normal; text-align: center; }
        }
      `}</style>
      <div className="toast-wrap">
        <div className="toast-pill">
          <FaHeart size={13} />
          {message}
        </div>
      </div>
    </>
  );
};

export default Toast;
