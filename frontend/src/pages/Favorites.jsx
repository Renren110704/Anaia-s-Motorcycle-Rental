import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaHeart,
  FaGasPump,
  FaTachometerAlt,
  FaShieldAlt,
  FaCogs,
  FaArrowRight,
  FaArrowLeft,
  FaHeartBroken,
} from "react-icons/fa";
import API_BASE_URL from "../apiBase";
import {
  getFavorites,
  removeFavorite,
  refreshFavorites,
  FAVORITES_CHANGED_EVENT,
} from "../utils/favorites";
import Toast from "../components/Toast";

const buildImageSrc = (image) => {
  if (!image) return "";
  if (Array.isArray(image)) image = image[0];
  if (typeof image !== "string") return "";
  const t = image.trim();
  if (!t) return "";
  if (/^data:image\//i.test(t) || /^https?:\/\//i.test(t)) return t;
  if (t.startsWith("res.cloudinary.com/")) return "https://" + t;
  if (t.startsWith("dxta0nmdy/")) return "https://res.cloudinary.com/" + t;
  if (t.startsWith("/")) return "https://res.cloudinary.com" + t;
  if (t.startsWith("local/"))
    return `${API_BASE_URL}/uploads/${t.replace("local/", "")}`;
  const cn = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
  if (cn) return `https://res.cloudinary.com/${cn}/image/upload/${t}`;
  return `${API_BASE_URL}/uploads/${t}`;
};

const Favorites = () => {
  const navigate = useNavigate();
  const fallbackImage = `${API_BASE_URL}/uploads/default-motorcycle.png`;
  const [favorites, setFavorites] = useState([]);
  const [toastMsg, setToastMsg] = useState("");
  const toastTimeoutRef = useRef(null);

  useEffect(() => {
    const sync = () => setFavorites(getFavorites());
    sync(); // show cached list immediately, then refresh from the server
    refreshFavorites();
    window.addEventListener("storage", sync);
    window.addEventListener(FAVORITES_CHANGED_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(FAVORITES_CHANGED_EVENT, sync);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastMsg(""), 2200);
  };

  const handleRemove = (e, id) => {
    e.stopPropagation();
    removeFavorite(id);
    showToast("Removed from favorites");
  };

  const handleImageError = (e) => {
    if (e?.target) {
      e.target.onerror = null;
      e.target.src = fallbackImage;
    }
  };

  const goToDetail = (motorcycle, id) => {
    navigate(`/motorcycles/${id}`, { state: { motorcycle } });
  };

  return (
    <>
      <Toast message={toastMsg} />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&display=swap');

        .fav-page { background: #F5F5F3; min-height: 100vh; padding: 48px 32px 80px; font-family: 'Space Grotesk', sans-serif; box-sizing: border-box; }
        @media(max-width: 640px) { .fav-page { padding: 28px 16px 60px; } }
        .fav-inner { max-width: 1280px; margin: 0 auto; }

        .fav-top { margin-bottom: 24px; margin-top: 32px; }
        .fav-eyebrow { font-size: 10px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: #b50002; display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
        .fav-eyebrow-line { width: 20px; height: 1.5px; background: #b50002; border-radius: 2px; }
        .fav-title { font-size: clamp(24px, 3.5vw, 38px); font-weight: 800; color: #0E0E0E; letter-spacing: -1px; }
        .fav-sub { font-size: 13.5px; color: rgba(0,0,0,0.45); margin-top: 6px; }

        .fav-list { display: flex; flex-direction: column; gap: 14px; }

        .fav-card {
          background: #fff; border-radius: 18px; border: 1.5px solid rgba(0,0,0,0.07);
          display: grid; grid-template-columns: 200px 1fr auto;
          overflow: hidden; transition: box-shadow 0.22s, border-color 0.22s;
          cursor: pointer;
        }
        .fav-card:hover { box-shadow: 0 8px 32px rgba(0,0,0,0.09); border-color: rgba(0,0,0,0.12); }
        @media(max-width: 640px) { .fav-card { grid-template-columns: 1fr; } }

        .fav-card-img { position: relative; height: 180px; background: #EEEDE9; overflow: hidden; }
        @media(max-width: 640px) { .fav-card-img { height: 200px; } }
        .fav-card-img img { width: 100%; height: 100%; object-fit: cover; object-position: center; transition: transform 0.4s ease; }
        .fav-card:hover .fav-card-img img { transform: scale(1.04); }

        .fav-remove-btn {
          position: absolute; top: 10px; left: 10px; z-index: 2;
          width: 32px; height: 32px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          background: rgba(17,17,17,0.35); border: none; cursor: pointer;
          backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
          transition: transform 0.15s, background 0.18s;
        }
        .fav-remove-btn:hover { transform: scale(1.08); background: rgba(181,0,2,0.75); }

        .fav-card-body { padding: 18px 16px; display: flex; flex-direction: column; gap: 10px; min-width: 0; }
        .fav-card-name { font-size: 16px; font-weight: 800; color: #0E0E0E; letter-spacing: -0.3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .fav-card-type { font-size: 12px; color: rgba(0,0,0,0.38); margin-top: 2px; font-weight: 500; }
        .fav-specs { display: flex; flex-wrap: wrap; gap: 7px; }
        .fav-spec { display: flex; align-items: center; gap: 5px; font-size: 11.5px; color: rgba(0,0,0,0.5); background: #F5F5F3; padding: 4px 9px; border-radius: 999px; }

        .fav-card-action {
          display: flex; flex-direction: column; align-items: flex-end;
          justify-content: space-between; padding: 18px 16px;
          border-left: 1.5px solid rgba(0,0,0,0.05); min-width: 130px;
          flex-shrink: 0;
        }
        @media(max-width: 640px) { .fav-card-action { border-left: none; border-top: 1.5px solid rgba(0,0,0,0.06); flex-direction: row; align-items: center; justify-content: space-between; min-width: unset; } }

        .fav-price { font-size: 16px; font-weight: 800; color: #0E0E0E; }
        .fav-price span { font-size: 11px; font-weight: 600; color: rgba(0,0,0,0.4); }

        .fav-view-btn {
          display: flex; align-items: center; gap: 7px;
          padding: 10px 16px; border-radius: 12px;
          background: #b50002; color: #fff;
          font-size: 13px; font-weight: 700;
          font-family: 'Space Grotesk', sans-serif;
          border: none; cursor: pointer;
          transition: background 0.18s, transform 0.15s;
          white-space: nowrap;
        }
        .fav-view-btn:hover { background: #8f0001; transform: translateY(-1px); }

        .fav-empty {
          text-align: center; padding: 80px 20px; color: rgba(0,0,0,0.45);
          display: flex; flex-direction: column; align-items: center; gap: 14px;
        }
        .fav-empty-icon {
          width: 64px; height: 64px; border-radius: 50%;
          background: rgba(181,0,2,0.07); color: #b50002;
          display: flex; align-items: center; justify-content: center;
        }
        .fav-empty-title { font-size: 18px; font-weight: 800; color: #0E0E0E; }
        .fav-empty-sub { font-size: 13.5px; max-width: 340px; line-height: 1.6; }
        .fav-browse-btn {
          margin-top: 6px; display: inline-flex; align-items: center; gap: 8px;
          padding: 11px 20px; border-radius: 12px;
          background: #0E0E0E; color: #fff; text-decoration: none;
          font-size: 13.5px; font-weight: 700; font-family: 'Space Grotesk', sans-serif;
          border: none; cursor: pointer; transition: background 0.18s;
        }
        .fav-browse-btn:hover { background: #b50002; }
        .fav-back-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          color: rgba(0,0,0,0.45);
          font-family: 'Space Grotesk', sans-serif;
          margin-bottom: 12px;
        }
        .fav-back-btn:hover {
          color: #0E0E0E;
        }
      `}</style>

      <div className="fav-page">
        <div className="fav-inner">
          <button onClick={() => navigate(-1)} className="fav-back-btn">
            <FaArrowLeft style={{ fontSize: 11 }} /> Back
          </button>
          <div className="fav-top">
            {/* <div className="fav-eyebrow">
              <span className="fav-eyebrow-line" /> Saved Vehicles
            </div> */}
            <h1 className="fav-title">Your Favorites</h1>
            <p className="fav-sub">
              {favorites.length > 0
                ? `${favorites.length} motorcycle${favorites.length === 1 ? "" : "s"} saved for quick access.`
                : "Vehicles you favorite will show up here."}
            </p>
          </div>

          {favorites.length === 0 ? (
            <div className="fav-empty">
              <div className="fav-empty-icon">
                <FaHeartBroken size={26} />
              </div>
              <div className="fav-empty-title">No favorites yet</div>
              <p className="fav-empty-sub">
                Tap the heart icon on any vehicle to save it here so you can
                find it again easily.
              </p>
              <button
                className="fav-browse-btn"
                onClick={() => navigate("/motorcycles")}
              >
                Browse Vehicles <FaArrowRight size={11} />
              </button>
            </div>
          ) : (
            <div className="fav-list">
              {favorites.map((motorcycle, idx) => {
                const id = motorcycle._id ?? motorcycle.id ?? idx;
                const name =
                  `${motorcycle.make || motorcycle.name || ""} ${motorcycle.model || ""}`.trim() ||
                  "Unnamed";
                const imageSrc =
                  buildImageSrc(motorcycle.image) || fallbackImage;
                const price =
                  motorcycle.dailyRate ??
                  motorcycle.price ??
                  motorcycle.pricePerDay ??
                  0;

                return (
                  <div
                    key={id}
                    className="fav-card"
                    onClick={() => goToDetail(motorcycle, id)}
                  >
                    <div className="fav-card-img">
                      <img
                        src={imageSrc}
                        alt={name}
                        onError={handleImageError}
                      />
                      <button
                        className="fav-remove-btn"
                        onClick={(e) => handleRemove(e, id)}
                        aria-label="Remove from favorites"
                      >
                        <FaHeart size={14} style={{ color: "#fff" }} />
                      </button>
                    </div>

                    <div className="fav-card-body">
                      <div>
                        <div className="fav-card-name">{name}</div>
                        <div className="fav-card-type">
                          {motorcycle.category ?? motorcycle.type ?? "Standard"}
                        </div>
                      </div>
                      <div className="fav-specs">
                        <span className="fav-spec">
                          <FaCogs size={10} />
                          {motorcycle.engineSize
                            ? `${motorcycle.engineSize}cc`
                            : "—"}
                        </span>
                        <span className="fav-spec">
                          <FaGasPump size={10} />
                          {motorcycle.fuelType ?? motorcycle.fuel ?? "Unleaded"}
                        </span>
                        <span className="fav-spec">
                          <FaTachometerAlt size={10} />
                          {motorcycle.transmission ?? "Manual"}
                        </span>
                        <span className="fav-spec">
                          <FaShieldAlt size={10} />
                          {motorcycle.hasABS ? "ABS" : "Standard"}
                        </span>
                      </div>
                    </div>

                    <div className="fav-card-action">
                      <div className="fav-price">
                        ₱{Math.round(price).toLocaleString()}
                        <span> /day</span>
                      </div>
                      <button
                        className="fav-view-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          goToDetail(motorcycle, id);
                        }}
                      >
                        View <FaArrowRight size={10} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Favorites;
