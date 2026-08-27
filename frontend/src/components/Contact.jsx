import React, { useState, useEffect, useRef } from "react";
import {
  FaMapMarkedAlt,
  FaPhone,
  FaEnvelope,
  FaFacebookF,
  FaTiktok,
  FaUser,
} from "react-icons/fa";
import axios from "axios";
import API_BASE_URL from "../apiBase";
import mainBg from "../assets/MainBG.png";

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
      { threshold: 0.1, ...options },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [options]);
  return [ref, visible];
}

const CONTACT_CARDS = [
  {
    icon: <FaEnvelope size={20} />,
    title: "Email Us",
    desc: "Drop us a line anytime — we respond within 24 hours.",
    value: "jpineda132020@gmail.com",
    href: "mailto:jpineda132020@gmail.com",
  },
  {
    icon: <FaPhone size={20} />,
    title: "Call Us",
    desc: "Reach us directly during business hours — no waiting.",
    value: "0917 623 1426",
    href: "tel:09176231426",
  },
  {
    icon: <FaMapMarkedAlt size={20} />,
    title: "Visit Us",
    desc: "Come by our location — we'd love to meet you in person.",
    value: "See on Google Maps",
    href: "https://www.google.com/maps/place/Anaia's+Motorcycle+Rental/@14.4120692,120.9798002,17z/data=!3m1!4b1!4m6!3m5!1s0x3397d3aa746b4b05:0xbc19fdcb07125956!8m2!3d14.412064!4d120.9823751!16s%2Fg%2F11pys6qd36?entry=ttu&g_ep=EgoyMDI2MDUwNi4wIKXMDSoASAFQAw%3D%3D",
  },
];

export default function Contact() {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [messageError, setMessageError] = useState("");
  const [user, setUser] = useState({ name: "", email: "", phone: "" });
  const [loadingUser, setLoadingUser] = useState(false);

  const [heroRef, heroVisible] = useScrollReveal({ threshold: 0.05 });
  const [cardsRef, cardsVisible] = useScrollReveal({ threshold: 0.08 });

  // Pre-fill from /api/auth/me — same pattern as original
  useEffect(() => {
    (async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      setLoadingUser(true);
      try {
        const res = await api.get("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success && res.data.user) {
          const u = res.data.user;
          setUser({
            name: u.name || "",
            email: u.email || "",
            phone: u.phone || "",
          });
        }
      } catch {
        /* silent */
      } finally {
        setLoadingUser(false);
      }
    })();
  }, []);

  const MIN_MESSAGE_WORDS = 10;
  const countWords = (str) => str.trim().split(/\s+/).filter(Boolean).length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Please log in to send a message.");
      return;
    }
    const wordCount = countWords(message);
    if (!message.trim()) {
      setMessageError("Please enter a message.");
      return;
    }
    if (wordCount < MIN_MESSAGE_WORDS) {
      setMessageError(
        `Please enter at least ${MIN_MESSAGE_WORDS} words (currently ${wordCount}).`,
      );
      return;
    }
    setMessageError("");
    setError("");
    setSubmitting(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await api.post(
        "/api/contact-messages",
        {
          name: user.name,
          email: user.email,
          phone: user.phone,
          message: message.trim(),
        },
        { headers },
      );
      setSubmitted(true);
      setMessage("");
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Failed to send your message. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700;800&display=swap');

        .ct-root {
          background-color: #F8F7F5; /* Changed to background-color for fallback */
          font-family: 'Space Grotesk', sans-serif;
          color: #0E0E0E;
          overflow-x: hidden;
        }

        /* ══════════ HERO ══════════ */
        .ct-hero {
          min-height: 100vh;
          display: flex;
          align-items: center;
          padding: 120px 64px 80px;
          position: relative;
          overflow: hidden;
        }
        .ct-hero::before {
          content: '';
          position: absolute; inset: 0; pointer-events: none;
          background-image: radial-gradient(circle, rgba(0,0,0,0.055) 1px, transparent 1px);
          background-size: 30px 30px;
          opacity: 0.6;
        }
        .ct-hero-blob {
          position: absolute; top: -80px; right: -100px;
          width: 520px; height: 440px; pointer-events: none; z-index: 0;
          background: radial-gradient(ellipse at center, rgba(181,0,2,0.07) 0%, transparent 68%);
        }

        .ct-hero-inner {
          position: relative; z-index: 2;
          max-width: 1200px; width: 100%; margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 480px;
          gap: 72px;
          align-items: center;
        }
        @media(max-width: 1100px) {
          .ct-hero-inner { grid-template-columns: 1fr; gap: 48px; }
          .ct-hero { padding: 110px 40px 72px; }
        }
        @media(max-width: 640px) { .ct-hero { padding: 100px 24px 60px; } }

        /* eyebrow */
        .ct-eyebrow {
          display: inline-flex; align-items: center; gap: 10px;
          font-size: 10px; font-weight: 700; letter-spacing: 4px;
          text-transform: uppercase; color: #b50002; margin-bottom: 20px;
        }
        .ct-eyebrow-line { width: 22px; height: 1.5px; background: #b50002; border-radius: 2px; }

        .ct-heading {
          font-size: clamp(36px, 4.2vw, 54px);
          font-weight: 800;
          line-height: 1.04;
          color: #0E0E0E;
          letter-spacing: -1.5px;
          margin-bottom: 18px;
        }
        .ct-heading-red { color: #b50002; font-style: italic; }

        .ct-sub {
          font-size: 14.5px; font-weight: 400; line-height: 1.8;
          color: rgba(14,14,14,0.46);
          max-width: 380px; margin-bottom: 30px;
        }

        /* socials */
        .ct-socials { display: flex; gap: 10px; margin-bottom: 30px; }
        .ct-social {
          width: 40px; height: 40px; border-radius: 50%;
          border: 1.5px solid rgba(0,0,0,0.10);
          display: flex; align-items: center; justify-content: center;
          color: rgba(14,14,14,0.45); font-size: 14px;
          text-decoration: none; background: #fff;
          transition: all 0.2s;
        }
        .ct-social:hover { background: #b50002; border-color: #b50002; color: #fff; transform: translateY(-2px); }

        /* info list */
        .ct-info-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 13px; }
        .ct-info-item {
          display: flex; align-items: flex-start; gap: 11px;
          font-size: 13.5px; color: rgba(14,14,14,0.52); line-height: 1.55;
        }
        .ct-info-icon { color: #b50002; margin-top: 2px; flex-shrink: 0; }

        /* ── form card ── */
        .ct-form-wrap { position: relative; }

        .ct-bracket {
          position: absolute;
          width: 18px; height: 18px;
          border-color: rgba(181,0,2,0.32);
          border-style: solid; border-width: 0;
        }
        .ct-bracket-tl { top: -8px; left: -8px; border-top-width: 2px; border-left-width: 2px; }
        .ct-bracket-tr { top: -8px; right: -8px; border-top-width: 2px; border-right-width: 2px; }
        .ct-bracket-bl { bottom: -8px; left: -8px; border-bottom-width: 2px; border-left-width: 2px; }
        .ct-bracket-br { bottom: -8px; right: -8px; border-bottom-width: 2px; border-right-width: 2px; }

        .ct-form-card {
          background: #fff;
          border: 1.5px solid rgba(0,0,0,0.07);
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04), 0 16px 48px rgba(0,0,0,0.07);
        }

        .ct-form-body { padding: 28px 28px 28px; }

        .ct-form-title {
          font-size: 19px; font-weight: 800; color: #0E0E0E;
          letter-spacing: -0.4px; margin-bottom: 4px;
        }
        .ct-form-hint {
          font-size: 12.5px; color: rgba(14,14,14,0.4);
          margin-bottom: 22px; line-height: 1.6;
        }

        /* section label inside form */
        .ct-section-label {
          font-size: 9px; font-weight: 700; letter-spacing: 2.5px;
          text-transform: uppercase; color: rgba(14,14,14,0.36);
          margin-bottom: 10px; margin-top: 4px;
        }

        /* field */
        .ct-field { margin-bottom: 12px; }
        .ct-label {
          display: block; font-size: 9px; font-weight: 700;
          letter-spacing: 2px; text-transform: uppercase;
          color: rgba(14,14,14,0.36); margin-bottom: 5px;
        }

        /* read-only pre-filled inputs */
        .ct-input-wrap {
          position: relative; display: flex; align-items: center;
          background: #F4F3F1;
          border: 1.5px solid rgba(0,0,0,0.07);
          border-radius: 10px;
        }
        .ct-input-icon {
          position: absolute; left: 12px;
          color: rgba(181,0,2,0.45); font-size: 13px;
          pointer-events: none; flex-shrink: 0;
        }
        .ct-input-readonly {
          width: 100%; padding: 11px 13px 11px 36px;
          background: transparent; border: none; outline: none;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 13px; font-weight: 500;
          color: rgba(14,14,14,0.52);
          cursor: not-allowed;
        }

        /* editable textarea */
        .ct-textarea-wrap {
          position: relative; display: flex; align-items: flex-start;
          background: #F8F7F5;
          border: 1.5px solid rgba(0,0,0,0.08);
          border-radius: 10px;
          transition: border-color 0.18s, background 0.18s;
        }
        .ct-textarea-wrap:focus-within { border-color: #b50002; background: #fff; }
        .ct-textarea-wrap-error {
          border-color: #b50002 !important;
          background: #FDF0F0 !important;
        }
        .ct-field-error {
          font-size: 11px; font-weight: 600; color: #b50002;
          margin-top: 6px;
          font-family: 'Space Grotesk', sans-serif;
        }
        .ct-textarea-icon {
          position: absolute; left: 12px; top: 13px;
          color: rgba(181,0,2,0.5); font-size: 13px; pointer-events: none;
        }
        .ct-textarea {
          width: 100%; padding: 11px 13px 11px 36px;
          background: transparent; border: none; outline: none;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 13px; font-weight: 400; color: #0E0E0E;
          resize: none; box-sizing: border-box;
        }
        .ct-textarea::placeholder { color: rgba(14,14,14,0.28); }
        .ct-char-count {
          font-size: 11px; color: rgba(14,14,14,0.3);
          text-align: right; margin-top: 4px;
        }

        .ct-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        @media(max-width: 480px) { .ct-row2 { grid-template-columns: 1fr; } }

        /* not-logged-in hint */
        .ct-login-hint {
          font-size: 11.5px; color: #b50002; margin-top: 6px;
        }
        .ct-login-hint a { font-weight: 700; text-decoration: underline; color: #b50002; }

        /* divider */
        .ct-divider { height: 1px; background: rgba(0,0,0,0.06); margin: 18px 0; }

        /* error */
        .ct-error {
          font-size: 12px; font-weight: 600; color: #b50002;
          background: rgba(181,0,2,0.05);
          border: 1px solid rgba(181,0,2,0.15);
          border-radius: 8px; padding: 9px 12px;
          margin-bottom: 12px;
        }
        .ct-error a { color: #b50002; text-decoration: underline; }

        /* submit */
        .ct-submit {
          width: 100%; padding: 13px 18px;
          border-radius: 12px; border: none;
          background: #b50002; color: #fff;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 13px; font-weight: 700;
          letter-spacing: 0.5px; text-transform: uppercase;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: all 0.2s;
          box-shadow: 0 4px 14px rgba(181,0,2,0.22);
        }
        .ct-submit:hover:not(:disabled) {
          background: #a00001; transform: translateY(-2px);
          box-shadow: 0 8px 22px rgba(181,0,2,0.3);
        }
        .ct-submit:active:not(:disabled) { transform: translateY(0); }
        .ct-submit:disabled { opacity: 0.6; cursor: not-allowed; }

        .ct-spinner {
          width: 14px; height: 14px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.35);
          border-top-color: #fff;
          animation: ct-spin 0.7s linear infinite; flex-shrink: 0;
        }
        @keyframes ct-spin { to { transform: rotate(360deg); } }

        /* success state */
        .ct-success-wrap {
          padding: 40px 28px;
          display: flex; flex-direction: column; align-items: center;
          text-align: center; gap: 14px;
        }
        .ct-success-icon {
          width: 60px; height: 60px; border-radius: 18px;
          background: rgba(16,185,129,0.1);
          display: flex; align-items: center; justify-content: center;
          font-size: 26px; color: #059669;
        }
        .ct-success-title { font-size: 18px; font-weight: 800; color: #0E0E0E; letter-spacing: -0.3px; }
        .ct-success-sub { font-size: 13px; color: rgba(14,14,14,0.46); line-height: 1.7; max-width: 280px; }
        .ct-success-sub strong { color: #0E0E0E; font-weight: 700; }
        .ct-send-another {
          margin-top: 4px; padding: 11px 22px;
          border-radius: 10px; border: 1.5px solid rgba(0,0,0,0.1);
          background: #fff; color: #0E0E0E;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 13px; font-weight: 700;
          cursor: pointer; transition: all 0.18s;
        }
        .ct-send-another:hover { background: #0E0E0E; color: #fff; border-color: #0E0E0E; }

        /* ══════════ CARDS ══════════ */
        .ct-cards-section {
          background-color: rgba(245, 245, 243, 0.75); /* Made slightly transparent so BG image flows nicely */
          padding: 80px 64px;
          border-top: 1.5px solid rgba(0,0,0,0.08);
          text-align: center;
        }
        @media(max-width: 1024px) { .ct-cards-section { padding: 64px 40px; } }
        @media(max-width: 640px)  { .ct-cards-section { padding: 52px 24px; } }

        .ct-cards-eyebrow {
          display: inline-flex; align-items: center; gap: 9px;
          font-size: 10px; font-weight: 700; letter-spacing: 3.5px;
          text-transform: uppercase; color: #b50002; margin-bottom: 10px;
        }
        .ct-cards-eyebrow-line { width: 20px; height: 1.5px; background: #b50002; border-radius: 2px; }
        .ct-cards-title {
          font-size: clamp(26px, 3.2vw, 38px); font-weight: 800;
          color: #0E0E0E; letter-spacing: -0.8px; line-height: 1.1;
          margin-bottom: 36px;
        }

        .ct-cards-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          max-width: 900px;
          margin: 0 auto;
        }
        @media(max-width: 860px) { .ct-cards-grid { grid-template-columns: 1fr; max-width: 480px; } }

        .ct-card {
          background: #fff;
          border: 1.5px solid rgba(0,0,0,0.07);
          border-radius: 18px; padding: 28px 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          transition: transform 0.24s cubic-bezier(.2,.8,.2,1), box-shadow 0.24s;
          text-decoration: none; display: block;
          position: relative; overflow: hidden;
        }
        .ct-card::after {
          content: ''; position: absolute;
          top: 0; left: 0; right: 0; height: 2.5px;
          background: #b50002; opacity: 0; transition: opacity 0.22s;
        }
        .ct-card:hover { transform: translateY(-5px); box-shadow: 0 14px 42px rgba(0,0,0,0.09); }
        .ct-card:hover::after { opacity: 1; }

        .ct-card-icon {
          width: 48px; height: 48px; border-radius: 13px;
          background: rgba(181,0,2,0.07);
          display: flex; align-items: center; justify-content: center;
          color: #b50002; margin-bottom: 18px;
        }
        .ct-card-name { font-size: 16px; font-weight: 800; color: #0E0E0E; letter-spacing: -0.2px; margin-bottom: 6px; }
        .ct-card-desc { font-size: 13px; color: rgba(14,14,14,0.44); line-height: 1.7; margin-bottom: 18px; }
        .ct-card-link {
          font-size: 13px; font-weight: 700; color: #b50002;
          display: inline-flex; align-items: center; gap: 5px;
        }

        /* ══════════ ANIMATIONS ══════════ */
        @keyframes ct-fadeUp    { from { opacity:0; transform:translateY(20px); }  to { opacity:1; transform:translateY(0); } }
        @keyframes ct-fadeRight { from { opacity:0; transform:translateX(-24px); } to { opacity:1; transform:translateX(0); } }
        @keyframes ct-fadeLeft  { from { opacity:0; transform:translateX(24px);  } to { opacity:1; transform:translateX(0); } }

        .ct-ar { opacity: 0; }
        .ct-ar.in { animation: ct-fadeRight 0.6s cubic-bezier(.2,.8,.2,1) forwards; }
        .ct-al { opacity: 0; }
        .ct-al.in { animation: ct-fadeLeft 0.6s cubic-bezier(.2,.8,.2,1) 0.1s forwards; }
        .ct-au { opacity: 0; }
        .ct-au.in { animation: ct-fadeUp 0.6s cubic-bezier(.2,.8,.2,1) forwards; }
      `}</style>

      {/* Added Inline Styles here to set the background image */}
      <main
        className="ct-root"
        style={{
          backgroundImage: `url(${mainBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* ══════════ HERO ══════════ */}
        <section className="ct-hero">
          <div className="ct-hero-blob" />
          <div className="ct-hero-inner" ref={heroRef}>
            {/* Left — copy */}
            <div className={`ct-ar ${heroVisible ? "in" : ""}`}>
              <div className="ct-eyebrow">
                <span className="ct-eyebrow-line" />
                Contact
              </div>

              <h1 className="ct-heading">
                Spark Up
                <br />
                <span className="ct-heading-red">The</span>
                <br />
                Conversation
              </h1>

              <p className="ct-sub">
                Whether you have a question about a motorcycle, a car, a
                booking, or just want to chat — we're here. Let's talk.
              </p>

              <div className="ct-socials">
                {[
                  {
                    Icon: FaFacebookF,
                    href: "https://www.facebook.com/anaiasmotorcyclerental",
                    label: "Visit our Facebook page"
                  },
                  {
                    Icon: FaTiktok,
                    href: "https://www.tiktok.com/@anaiasmotorcyclerental",
                    label: "Visit our TikTok page"
                  },
                ].map(({ Icon, href, label }, i) => (
                  <a
                    key={i}
                    href={href}
                    className="ct-social"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                  >
                    <Icon />
                  </a>
                ))}
              </div>

              <ul className="ct-info-list">
                <li className="ct-info-item">
                  <FaMapMarkedAlt className="ct-info-icon" />
                  <span>
                    Soldiers Hills IV, Block 9 Lot 1 PH2 Lily, Bacoor, 4102
                    Cavite
                  </span>
                </li>
                <li className="ct-info-item">
                  <FaPhone className="ct-info-icon" />
                  <span>0917 623 1426</span>
                </li>
                <li className="ct-info-item">
                  <FaEnvelope className="ct-info-icon" />
                  <span>jpineda132020@gmail.com</span>
                </li>
              </ul>
            </div>

            {/* Right — form */}
            <div className={`ct-form-wrap ct-al ${heroVisible ? "in" : ""}`}>
              <div className="ct-bracket ct-bracket-tl" />
              <div className="ct-bracket ct-bracket-tr" />
              <div className="ct-bracket ct-bracket-bl" />
              <div className="ct-bracket ct-bracket-br" />

              <div className="ct-form-card">
                {submitted ? (
                  /* ── Success state ── */
                  <div className="ct-success-wrap">
                    <div className="ct-success-icon">✓</div>
                    <div className="ct-success-title">Message Sent!</div>
                    <p className="ct-success-sub">
                      Your inquiry has been received. We'll reply to{" "}
                      <strong>{user.email || "your email"}</strong> as soon as
                      possible.
                    </p>
                    <button
                      className="ct-send-another"
                      onClick={() => setSubmitted(false)}
                    >
                      Send Another Message
                    </button>
                  </div>
                ) : (
                  <form
                    className="ct-form-body"
                    onSubmit={handleSubmit}
                    noValidate
                  >
                    {/* Title + hint */}
                    <div className="ct-form-title">Send a Message</div>
                    <div className="ct-form-hint">
                      We'll get back to you within 24 hours.
                    </div>

                    {/* Personal details — read-only */}
                    <div className="ct-section-label">Personal Details</div>

                    <div className="ct-row2">
                      <div className="ct-field">
                        <label className="ct-label">Full Name</label>
                        <div className="ct-input-wrap">
                          <FaUser className="ct-input-icon" />
                          <input
                            type="text"
                            className="ct-input-readonly"
                            value={loadingUser ? "Loading…" : user.name}
                            placeholder="Your full name"
                            readOnly
                          />
                        </div>
                      </div>
                      <div className="ct-field">
                        <label className="ct-label">Phone Number</label>
                        <div className="ct-input-wrap">
                          <FaPhone className="ct-input-icon" />
                          <input
                            type="tel"
                            className="ct-input-readonly"
                            value={loadingUser ? "Loading…" : user.phone}
                            placeholder="Your phone"
                            readOnly
                          />
                        </div>
                      </div>
                    </div>

                    <div className="ct-field">
                      <label className="ct-label">Email Address</label>
                      <div className="ct-input-wrap">
                        <FaEnvelope className="ct-input-icon" />
                        <input
                          type="email"
                          className="ct-input-readonly"
                          value={loadingUser ? "Loading…" : user.email}
                          placeholder="Your email"
                          readOnly
                        />
                      </div>
                    </div>

                    {/* Not logged in hint */}
                    {!user.name && !loadingUser && (
                      <p className="ct-login-hint">
                        You must be logged in to send a message.{" "}
                        <a href="/login">Log in</a> or{" "}
                        <a href="/profile">update your profile</a>.
                      </p>
                    )}

                    <div className="ct-divider" />

                    {/* Message */}
                    <div className="ct-section-label">Message</div>
                    <div className="ct-field">
                      <div
                        className={`ct-textarea-wrap${messageError ? " ct-textarea-wrap-error" : ""}`}
                      >
                        <svg
                          className="ct-textarea-icon"
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          style={{ color: "rgba(181,0,2,0.5)" }}
                        >
                          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                        </svg>
                        <textarea
                          className="ct-textarea"
                          rows={5}
                          placeholder={`Tell us about your rental needs, questions, or concerns…`}
                          value={message}
                          onChange={(e) => {
                            setMessage(e.target.value.slice(0, 1000));
                            if (messageError) setMessageError("");
                          }}
                          required
                        />
                      </div>
                      {messageError && (
                        <p className="ct-field-error">{messageError}</p>
                      )}
                      <div className="ct-char-count">
                        {countWords(message)}/{MIN_MESSAGE_WORDS} words min ·{" "}
                        {message.length}/1000 characters
                      </div>
                    </div>

                    {error && (
                      <div className="ct-error">
                        {error}
                        {error === "Please log in to send a message." && (
                          <>
                            {" "}
                            <a href="/login">Log in now</a>.
                          </>
                        )}
                      </div>
                    )}

                    <button
                      className="ct-submit"
                      type="submit"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <div className="ct-spinner" /> Sending…
                        </>
                      ) : (
                        "Send Message →"
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ══════════ CONTACT CARDS ══════════ */}
        <section className="ct-cards-section">
          <div className="ct-cards-eyebrow">
            <span className="ct-cards-eyebrow-line" />
            Need More Help?
          </div>
          <h2 className="ct-cards-title">Reach out — stop by for a chat.</h2>

          <div ref={cardsRef} className="ct-cards-grid">
            {CONTACT_CARDS.map((card, i) => (
              <a
                key={i}
                href={card.href}
                className={`ct-card ct-au ${cardsVisible ? "in" : ""}`}
                style={{ animationDelay: `${i * 0.1}s` }}
                target={card.href.startsWith("http") ? "_blank" : undefined}
                rel={
                  card.href.startsWith("http")
                    ? "noopener noreferrer"
                    : undefined
                }
              >
                <div className="ct-card-icon">{card.icon}</div>
                <div className="ct-card-name">{card.title}</div>
                <p className="ct-card-desc">{card.desc}</p>
                <div className="ct-card-link">
                  {card.value}
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M7 17L17 7M7 7h10v10" />
                  </svg>
                </div>
              </a>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
