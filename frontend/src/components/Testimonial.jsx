import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
} from "react";
import { FaStar } from "react-icons/fa";
import { GiFullMotorcycleHelmet } from "react-icons/gi";
import axios from "axios";
import API_BASE_URL from "../apiBase";
import testimonials from "../assets/Testimonialdata";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { Accept: "application/json" },
});

function useScrollReveal(options = {}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.08, ...options },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [options]);
  return [ref, visible];
}

// Accurate fractional star rating: a gray background row of stars with an
// amber foreground row clipped to a width proportional to the exact rating
// (e.g. 2.8/5 fills 56% of the row), rather than rounding to the nearest
// whole or half star. The numeric value is always shown next to the stars.
// Each star is its own self-contained fill unit: a gray star underneath and
// an amber star clipped to that star's own fraction filled (0-100%). This
// avoids clipping the whole row at X%, whose percentage math doesn't line up
// cleanly with individual star boundaries once a flex `gap` is involved.
const Stars = ({ rating, size = 13, showValue = true }) => {
  const numericRating = Math.max(0, Math.min(5, Number(rating) || 0));

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ display: "flex", gap: 2 }}>
        {[1, 2, 3, 4, 5].map((i) => {
          const starFill = Math.max(0, Math.min(1, numericRating - (i - 1)));
          return (
            <span
              key={i}
              style={{
                position: "relative",
                display: "inline-block",
                width: size,
                height: size,
                lineHeight: 0,
              }}
            >
              <FaStar
                size={size}
                style={{ display: "block", color: "#e5e7eb" }}
              />
              <span
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  overflow: "hidden",
                  width: `${starFill * 100}%`,
                  height: "100%",
                }}
              >
                <FaStar
                  size={size}
                  style={{ display: "block", color: "#f59e0b" }}
                />
              </span>
            </span>
          );
        })}
      </div>
      {showValue && (
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "rgba(14,14,14,0.4)",
          }}
        >
          {numericRating > 0 ? numericRating.toFixed(1) : "0.0"}/5.0
        </span>
      )}
    </div>
  );
};

// Resolve a profile picture reference (relative path, Cloudinary path, or
// full URL) into a usable <img> src — mirrors the convention used elsewhere
// in the admin dashboard (see UserManagement.jsx).
const makeImageUrl = (filename) => {
  if (!filename) return "";
  const s = String(filename).trim();
  if (!s) return "";
  if (/^data:image\//i.test(s)) return s;
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("/dxta0nmdy/") || s.startsWith("dxta0nmdy/"))
    return `https://res.cloudinary.com/${s.replace(/^\/+/, "")}`;
  const cleanPath = s.replace(/^\/+/, "").replace(/^uploads\//, "");
  return `${API_BASE_URL}/uploads/${cleanPath}`;
};

const Avatar = ({ name, photo, size = 44 }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: "rgba(181,0,2,0.1)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: size * 0.38,
      fontWeight: 800,
      color: "#b50002",
      flexShrink: 0,
      overflow: "hidden",
    }}
  >
    {photo ? (
      <img
        src={photo}
        alt={name || "Reviewer"}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
    ) : (
      (name || "R").charAt(0).toUpperCase()
    )}
  </div>
);

const AUTO_INTERVAL = 5000;

const Testimonial = () => {
  const [raw, setRaw] = useState([]);
  const [featIdx, setFeatIdx] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState("next"); // "next" | "prev"
  const timerRef = useRef(null);
  const [sectionRef, sectionVisible] = useScrollReveal();
  const [layoutRef, layoutVisible] = useScrollReveal({ threshold: 0.1 });

  useEffect(() => {
    let mounted = true;
    api
      .get("/api/reviews/testimonials", { params: { limit: 6 } })
      .then(({ data }) => {
        const rows = Array.isArray(data) ? data : data.testimonials || [];
        if (mounted && rows.length) setRaw(rows);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const items = useMemo(() => {
    const source = raw.length ? raw : testimonials;
    return source.map((t, i) => ({
      id: t._id || t.id || `t-${i}`,
      name: t.name || t.renterName || "Rider",
      role: t.role || t.renterRole || "Renter",
      comment: t.comment || t.feedbackDescription || "",
      rating: Number(t.rating || 0),
      car:
        t.car ||
        t.motorcycle ||
        `${t.motorcycleId?.make || ""} ${t.motorcycleId?.model || ""}`.trim() ||
        "Rented Motorcycle",
      photo:
        Array.isArray(t.reviewImages) && t.reviewImages.length
          ? t.reviewImages[0]
          : t.reviewImages || null,
      // GET /api/reviews/testimonials (getFeaturedTestimonials) returns
      // `profilePicture` directly on each testimonial — already resolved
      // server-side from the renter's linked user account.
      avatar: makeImageUrl(t.profilePicture || ""),
    }));
  }, [raw]);

  const goTo = useCallback(
    (idx, dir = "next") => {
      if (animating || items.length < 2) return;
      setDirection(dir);
      setAnimating(true);
      setTimeout(() => {
        setFeatIdx(idx);
        setAnimating(false);
      }, 400);
    },
    [animating, items.length],
  );

  // Auto-advance
  useEffect(() => {
    if (items.length < 2) return;
    timerRef.current = setInterval(() => {
      setFeatIdx((prev) => {
        const next = (prev + 1) % items.length;
        setDirection("next");
        setAnimating(true);
        setTimeout(() => setAnimating(false), 400);
        return next;
      });
    }, AUTO_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [items.length]);

  // Reset timer when manually navigating
  const navigate = useCallback(
    (idx, dir) => {
      clearInterval(timerRef.current);
      goTo(idx, dir);
      timerRef.current = setInterval(() => {
        setFeatIdx((prev) => {
          const next = (prev + 1) % items.length;
          setDirection("next");
          setAnimating(true);
          setTimeout(() => setAnimating(false), 400);
          return next;
        });
      }, AUTO_INTERVAL);
    },
    [goTo, items.length],
  );

  const featured = items[featIdx] || items[0];
  if (!featured) return null;

  const slideStyle = {
    animation: animating
      ? `tm-slide-${direction}-out 0.4s cubic-bezier(.4,0,.2,1) forwards`
      : `tm-slide-${direction}-in 0.4s cubic-bezier(.4,0,.2,1) forwards`,
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&display=swap');

        .tm-section {
          background: #F5F5F3;
          padding: 72px 48px 80px;
          font-family: 'Space Grotesk', sans-serif;
          border-top: 1.5px solid rgba(0,0,0,0.09);
        }
        @media(max-width: 640px) { .tm-section { padding: 48px 20px 60px; } }

        /* ── header ── */
        .tm-header {
          margin-bottom: 36px;
          opacity: 0; transform: translateY(20px);
          transition: opacity 0.55s ease, transform 0.55s ease;
        }
        .tm-header.in { opacity: 1; transform: translateY(0); }

        .tm-eyebrow {
          display: flex; align-items: center; gap: 8px;
          font-size: 10px; font-weight: 700;
          letter-spacing: 3.5px; text-transform: uppercase;
          color: #b50002; margin-bottom: 8px;
        }
        .tm-eyebrow-line { width: 20px; height: 1.5px; background: #b50002; border-radius: 2px; }

        .tm-title {
          font-size: clamp(28px, 4vw, 42px);
          font-weight: 800; color: #0E0E0E;
          letter-spacing: -1px; line-height: 1.1;
        }

        /* ── layout ── */
        .tm-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          align-items: stretch;
          opacity: 0; transform: translateY(24px);
          transition: opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s;
        }
        .tm-layout.in { opacity: 1; transform: translateY(0); }
        @media(max-width: 900px) { .tm-layout { grid-template-columns: 1fr; } }

        /* ── featured card ── */
        .tm-featured {
          background: #fff;
          border-radius: 22px;
          border: 1.5px solid rgba(0,0,0,0.07);
          padding: 32px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.06);
          display: flex; flex-direction: column; gap: 14px;
          overflow: hidden;
          min-height: 420px;
        }

        /* ── slide animations ── */
        @keyframes tm-slide-next-in {
          from { opacity: 0; transform: translateX(32px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes tm-slide-next-out {
          from { opacity: 1; transform: translateX(0); }
          to   { opacity: 0; transform: translateX(-32px); }
        }
        @keyframes tm-slide-prev-in {
          from { opacity: 0; transform: translateX(-32px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes tm-slide-prev-out {
          from { opacity: 1; transform: translateX(0); }
          to   { opacity: 0; transform: translateX(32px); }
        }

        @keyframes tm-photo-next-in {
          from { opacity: 0; transform: scale(1.04); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes tm-photo-next-out {
          from { opacity: 1; transform: scale(1); }
          to   { opacity: 0; transform: scale(0.97); }
        }
        @keyframes tm-photo-prev-in {
          from { opacity: 0; transform: scale(1.04); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes tm-photo-prev-out {
          from { opacity: 1; transform: scale(1); }
          to   { opacity: 0; transform: scale(0.97); }
        }

        .tm-slide-content { flex: 1; display: flex; flex-direction: column; gap: 14px; }

        .tm-feat-top { display: flex; align-items: center; gap: 14px; }
        .tm-feat-name { font-size: 17px; font-weight: 800; color: #0E0E0E; line-height: 1.2; }
        .tm-feat-role { font-size: 12px; color: rgba(0,0,0,0.4); margin-top: 2px; }

        .tm-feat-headline {
          font-size: 20px; font-weight: 800;
          color: #0E0E0E; letter-spacing: -0.4px; line-height: 1.25;
        }
        .tm-feat-comment {
          font-size: 14px; font-weight: 400;
          color: rgba(14,14,14,0.55); line-height: 1.8;
          flex: 1;
        }
        .tm-feat-moto {
          display: inline-flex; align-items: center; gap: 7px;
          font-size: 11px; font-weight: 600; color: rgba(0,0,0,0.45);
          background: rgba(0,0,0,0.04); padding: 6px 12px; border-radius: 999px;
          width: fit-content;
        }

        /* ── dot nav ── */
        .tm-dots { display: flex; gap: 6px; margin-top: 4px; align-items: center; }
        .tm-dot {
          width: 6px; height: 6px; border-radius: 999px;
          background: rgba(0,0,0,0.14); cursor: pointer;
          transition: width 0.3s ease, background 0.3s ease;
          border: none; padding: 0; flex-shrink: 0;
        }
        .tm-dot.active { width: 20px; background: #b50002; }

        /* progress bar inside active dot */
        .tm-dot-progress {
          display: block; height: 100%; border-radius: 999px;
          background: #b50002;
          animation: tm-progress ${AUTO_INTERVAL}ms linear forwards;
          transform-origin: left;
        }
        @keyframes tm-progress {
          from { width: 0%; }
          to   { width: 100%; }
        }

        /* ── photo panel ── */
        .tm-photo-panel {
          border-radius: 22px;
          overflow: hidden;
          background: #D0C8B8;
          /* Fixed height regardless of image aspect ratio */
          height: 480px;
          position: relative;
        }
        @media(max-width: 900px) { .tm-photo-panel { height: 300px; } }

        .tm-photo-inner {
          position: absolute; inset: 0;
        }
        .tm-photo-inner img {
          width: 100%; height: 100%;
          object-fit: cover;
          object-position: center;
          display: block;
        }

        /* no-photo placeholder */
        .tm-no-photo {
          width: 100%; height: 100%;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 10px;
        }
        .tm-no-photo span { font-size: 12px; color: rgba(0,0,0,0.3); font-weight: 500; }
      `}</style>

      <div className="tm-section">
        {/* ── Heading ── */}
        <div
          ref={sectionRef}
          className={`tm-header ${sectionVisible ? "in" : ""}`}
        >
          <div className="tm-eyebrow">
            <span className="tm-eyebrow-line" />
            Reviews
          </div>
          <h2 className="tm-title">Anaia's Highlights</h2>
        </div>

        <div
          ref={layoutRef}
          className={`tm-layout ${layoutVisible ? "in" : ""}`}
        >
          {/* ── Left: featured card ── */}
          <div className="tm-featured">
            <div className="tm-slide-content" style={slideStyle}>
              <div className="tm-feat-top">
                <Avatar
                  name={featured.name}
                  photo={featured.avatar}
                  size={48}
                />
                <div>
                  <div className="tm-feat-name">{featured.name}</div>
                  <div className="tm-feat-role">{featured.role}</div>
                </div>
              </div>

              <Stars rating={featured.rating} size={15} />

              <div className="tm-feat-headline">
                {featured.comment
                  ? featured.comment.split(/[.!?]/)[0].trim().slice(0, 60) +
                    (featured.comment.split(/[.!?]/)[0].trim().length > 60
                      ? "…"
                      : "")
                  : "A great experience"}
              </div>

              <p className="tm-feat-comment">{featured.comment}</p>

              <div className="tm-feat-moto">
                <GiFullMotorcycleHelmet size={13} />
                {featured.car}
              </div>
            </div>

            {/* dot nav */}
            <div className="tm-dots">
              {items.map((_, i) => (
                <button
                  key={i}
                  className={`tm-dot ${i === featIdx ? "active" : ""}`}
                  onClick={() => navigate(i, i > featIdx ? "next" : "prev")}
                  aria-label={`Show review ${i + 1}`}
                />
              ))}
            </div>
          </div>

          {/* ── Right: photo panel (fixed height, image always covers) ── */}
          <div className="tm-photo-panel">
            <div
              key={featIdx}
              className="tm-photo-inner"
              style={{
                animation: animating
                  ? `tm-photo-${direction}-out 0.4s cubic-bezier(.4,0,.2,1) forwards`
                  : `tm-photo-${direction}-in 0.4s cubic-bezier(.4,0,.2,1) forwards`,
              }}
            >
              {featured.photo ? (
                <img src={featured.photo} alt={`${featured.name}'s ride`} />
              ) : (
                <div className="tm-no-photo">
                  <GiFullMotorcycleHelmet
                    size={40}
                    style={{ color: "rgba(0,0,0,0.18)" }}
                  />
                  <span>No photo uploaded</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Testimonial;
