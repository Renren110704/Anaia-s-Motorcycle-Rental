import React, { useEffect, useRef, useState } from "react";

// ─── Scroll reveal hook (same pattern as other pages) ───────────────
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

// ─── Team / values data ─────────────────────────────────────────────
const VALUES = [
  {
    icon: "🏍️",
    title: "Passion for Riding",
    desc: "We live and breathe motorcycles. Every unit in our fleet is hand-picked, maintained with care, and ready to deliver an unforgettable ride.",
  },
  {
    icon: "🤝",
    title: "Rider-First Service",
    desc: "From quick bookings to same-day pickup, we make the process smooth so you can focus on the road — not paperwork.",
  },
  {
    icon: "🛡️",
    title: "Safety Above All",
    desc: "Every motorcycle is inspected before and after each rental. We provide free helmets and encourage riders to gear up before every trip.",
  },
  {
    icon: "📍",
    title: "Locally Rooted",
    desc: "Born and bred in Bacoor, Cavite. We know the roads, the routes, and what it takes to explore the south like a local.",
  },
];

const MILESTONES = [
  {
    year: "2022",
    label: "Founded",
    desc: "Started with just 3 units in Soldier's Hills IV, Bacoor.",
  },
  {
    year: "2024",
    label: "30+ Fleet",
    desc: "Expanded to scooters, nakeds, and underbones across all major brands.",
  },
  {
    year: "2025",
    label: "100+ Riders",
    desc: "Hit the milestone of a hundred happy customers and counting.",
  },
  {
    year: "2026",
    label: "4.9★ Rated",
    desc: "Consistently top-rated motorcycle rental in Bacoor, Cavite.",
  },
];

// ─── Hero background — use the shop photo URL or a local import ─────
// Replace the src below with: import shopPhoto from "../assets/shop.png"
// and use {shopPhoto} if you add the image to your assets folder.
const SHOP_PHOTO =
  "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1800&q=80";
// ↑ Fallback stock photo — swap with the actual shop image in production.
// If you import the uploaded image, use that import variable instead.

export default function AboutPage() {
  const [mounted, setMounted] = useState(false);
  const [valRef, valVisible] = useScrollReveal();
  const [milRef, milVisible] = useScrollReveal({ threshold: 0.08 });
  const [storyRef, storyVisible] = useScrollReveal({ threshold: 0.12 });
  const [ctaRef, ctaVisible] = useScrollReveal({ threshold: 0.15 });

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,700;0,800;1,700;1,800&family=Space+Grotesk:wght@300;400;500;600;700;800&display=swap');

        /* ── Reset & base ── */
        .ab-root {
          font-family: 'Space Grotesk', sans-serif;
          background: #F8F7F5;
          color: #0E0E0E;
          overflow-x: hidden;
        }

        /* ══════════════════════════════════════════
           HERO
        ══════════════════════════════════════════ */
        .ab-hero {
          position: relative;
          width: 100%;
          min-height: 92vh;
          display: flex;
          align-items: flex-end;
          overflow: hidden;
        }

        /* Background image */
        .ab-hero-bg {
          position: absolute;
          inset: 0;
          background-image: url('SHOP_PHOTO_PLACEHOLDER');
          background-size: cover;
          background-position: center 60%;
          transform: scale(1.04);
          transition: transform 8s ease-out;
          will-change: transform;
        }
        .ab-hero-bg.loaded { transform: scale(1); }

        /* Gradient overlays */
        .ab-hero-overlay {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(to top, rgba(8,8,8,0.88) 0%, rgba(8,8,8,0.38) 42%, transparent 70%),
            linear-gradient(to right, rgba(8,8,8,0.30) 0%, transparent 55%);
        }

        /* Dot grid over hero */
        .ab-hero-dots {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px);
          background-size: 28px 28px;
          pointer-events: none;
        }

        /* Red accent diagonal stripe */
        .ab-hero-stripe {
          position: absolute;
          top: 0; right: 0;
          width: 3px;
          height: 100%;
          background: linear-gradient(to bottom, transparent, #b50002 40%, transparent);
          opacity: 0.7;
        }

        .ab-hero-content {
          position: relative;
          z-index: 2;
          max-width: 1360px;
          margin: 0 auto;
          width: 100%;
          padding: 0 56px 72px;
        }

        /* Eyebrow */
        .ab-hero-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-family: 'Inter', sans-serif;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 4px;
          color: #b50002;
          text-transform: uppercase;
          margin-bottom: 20px;
          opacity: 0;
          transform: translateY(12px);
          transition: opacity 0.55s ease, transform 0.55s ease;
        }
        .ab-hero-eyebrow.in { opacity: 1; transform: translateY(0); }
        .ab-eyebrow-line { width: 24px; height: 1.5px; background: #b50002; border-radius: 2px; flex-shrink: 0; }

        /* Hero headline */
        .ab-hero-h1 {
          font-family: 'Playfair Display', serif;
          font-size: clamp(48px, 7vw, 96px);
          font-weight: 800;
          line-height: 0.95;
          color: #fff;
          letter-spacing: -2px;
          margin-bottom: 28px;
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.65s 0.1s ease, transform 0.65s 0.1s ease;
        }
        .ab-hero-h1.in { opacity: 1; transform: translateY(0); }
        .ab-hero-h1 em { color: #b50002; font-style: italic; }

        /* Hero sub */
        .ab-hero-sub {
          font-family: 'Inter', sans-serif;
          font-size: 15px;
          font-weight: 400;
          line-height: 1.75;
          color: rgba(255,255,255,0.55);
          max-width: 440px;
          margin-bottom: 36px;
          opacity: 0;
          transform: translateY(14px);
          transition: opacity 0.6s 0.2s ease, transform 0.6s 0.2s ease;
        }
        .ab-hero-sub.in { opacity: 1; transform: translateY(0); }

        /* Hero stats bar */
        .ab-hero-stats {
          display: flex;
          gap: 0;
          opacity: 0;
          transform: translateY(10px);
          transition: opacity 0.6s 0.32s ease, transform 0.6s 0.32s ease;
        }
        .ab-hero-stats.in { opacity: 1; transform: translateY(0); }

        .ab-hstat {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 18px 28px;
          border-left: 1px solid rgba(255,255,255,0.12);
        }
        .ab-hstat:first-child { padding-left: 0; border-left: none; }
        .ab-hstat-num {
          font-family: 'Playfair Display', serif;
          font-size: 28px;
          font-weight: 700;
          color: #fff;
          line-height: 1;
        }
        .ab-hstat-label {
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          color: rgba(255,255,255,0.38);
          letter-spacing: 0.5px;
        }

        /* Hero location chip */
        .ab-hero-loc {
          position: absolute;
          top: 32px;
          right: 56px;
          display: flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          padding: 8px 14px;
          border-radius: 999px;
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          color: #171717;
          letter-spacing: 0.3px;
          z-index: 3;
          opacity: 0;
          animation: ab-fadeIn 0.6s 0.6s ease forwards;
        }
        .ab-hero-loc-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #b50002;
          animation: ab-pulse 2s ease-in-out infinite;
        }
        @keyframes ab-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.7); }
        }

        /* Scroll cue */
        .ab-hero-scroll {
          position: absolute;
          bottom: 32px;
          right: 56px;
          z-index: 3;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          opacity: 0;
          animation: ab-fadeIn 0.8s 1.1s ease forwards;
        }
        .ab-scroll-txt {
          font-family: 'Inter', sans-serif;
          font-size: 8.5px;
          font-weight: 600;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: rgba(255,255,255,0.22);
          writing-mode: vertical-rl;
        }
        .ab-scroll-line {
          width: 1px;
          height: 40px;
          background: linear-gradient(to bottom, rgba(255,255,255,0.25), transparent);
          animation: ab-scrollPulse 2.6s ease-in-out infinite;
        }
        @keyframes ab-scrollPulse {
          0%, 100% { opacity: 0.35; transform: scaleY(0.82); }
          50% { opacity: 1; transform: scaleY(1); }
        }

        @keyframes ab-fadeIn { to { opacity: 1; } }

        /* ══════════════════════════════════════════
           STORY SECTION
        ══════════════════════════════════════════ */
        .ab-story {
          background: #fff;
          border-top: 1.5px solid rgba(0,0,0,0.06);
        }
        .ab-story-inner {
          max-width: 1360px;
          margin: 0 auto;
          padding: 88px 56px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 72px;
          align-items: center;
        }

        .ab-story-label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: 'Inter', sans-serif;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 4px;
          color: #b50002;
          text-transform: uppercase;
          margin-bottom: 14px;
        }
        .ab-story-label-line { width: 20px; height: 1.5px; background: #b50002; border-radius: 2px; }

        .ab-story-h2 {
          font-family: 'Playfair Display', serif;
          font-size: clamp(30px, 3.5vw, 48px);
          font-weight: 800;
          line-height: 1.05;
          letter-spacing: -1px;
          color: #0E0E0E;
          margin-bottom: 24px;
        }
        .ab-story-h2 em { color: #b50002; font-style: italic; }

        .ab-story-body {
          font-family: 'Inter', sans-serif;
          font-size: 14.5px;
          font-weight: 400;
          line-height: 1.85;
          color: rgba(14,14,14,0.52);
          margin-bottom: 20px;
        }

        /* Right: image + accent card */
        .ab-story-right {
          position: relative;
        }
        .ab-story-img-wrap {
          border-radius: 20px;
          overflow: hidden;
          aspect-ratio: 4/5;
          background: #E8E6E2;
        }
        .ab-story-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          display: block;
          transition: transform 0.6s ease;
        }
        .ab-story-img-wrap:hover .ab-story-img { transform: scale(1.04); }

        /* Floating info card */
        .ab-story-card {
          position: absolute;
          bottom: -24px;
          left: -32px;
          background: #fff;
          border-radius: 16px;
          border: 1.5px solid rgba(0,0,0,0.07);
          box-shadow: 0 8px 40px rgba(0,0,0,0.10);
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 200px;
        }
        .ab-story-card-num {
          font-family: 'Playfair Display', serif;
          font-size: 32px;
          font-weight: 700;
          color: #b50002;
          line-height: 1;
        }
        .ab-story-card-lbl {
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          color: rgba(14,14,14,0.45);
          letter-spacing: 0.3px;
        }

        /* Dot grid accent */
        .ab-story-dots-accent {
          position: absolute;
          top: -20px;
          right: -20px;
          width: 100px;
          height: 100px;
          background-image: radial-gradient(circle, rgba(181,0,2,0.2) 1px, transparent 1px);
          background-size: 12px 12px;
          pointer-events: none;
        }

        /* Scroll reveal */
        .ab-reveal { opacity: 0; transform: translateY(32px); transition: opacity 0.65s cubic-bezier(.2,.8,.2,1), transform 0.65s cubic-bezier(.2,.8,.2,1); }
        .ab-reveal.in { opacity: 1; transform: translateY(0); }
        .ab-reveal-left { opacity: 0; transform: translateX(-32px); transition: opacity 0.65s cubic-bezier(.2,.8,.2,1), transform 0.65s cubic-bezier(.2,.8,.2,1); }
        .ab-reveal-left.in { opacity: 1; transform: translateX(0); }
        .ab-reveal-right { opacity: 0; transform: translateX(32px); transition: opacity 0.65s cubic-bezier(.2,.8,.2,1) 0.1s, transform 0.65s cubic-bezier(.2,.8,.2,1) 0.1s; }
        .ab-reveal-right.in { opacity: 1; transform: translateX(0); }

        /* ══════════════════════════════════════════
           VALUES
        ══════════════════════════════════════════ */
        .ab-values {
          background: #F8F7F5;
          border-top: 1.5px solid rgba(0,0,0,0.06);
          padding: 88px 56px;
        }
        .ab-values-inner { max-width: 1360px; margin: 0 auto; }

        .ab-values-header {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          margin-bottom: 48px;
        }

        .ab-values-h2 {
          font-family: 'Playfair Display', serif;
          font-size: clamp(28px, 3.5vw, 46px);
          font-weight: 800;
          letter-spacing: -1px;
          line-height: 1.05;
          color: #0E0E0E;
        }
        .ab-values-h2 em { color: #b50002; font-style: italic; }

        .ab-values-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }

        .ab-val-card {
          background: #fff;
          border-radius: 18px;
          border: 1.5px solid rgba(0,0,0,0.07);
          padding: 28px 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          transition: transform 0.28s cubic-bezier(.2,.8,.2,1), box-shadow 0.28s;
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 0.6s cubic-bezier(.2,.8,.2,1), transform 0.6s cubic-bezier(.2,.8,.2,1), box-shadow 0.28s;
        }
        .ab-val-card.in { opacity: 1; transform: translateY(0); }
        .ab-val-card:hover { transform: translateY(-4px); box-shadow: 0 12px 36px rgba(0,0,0,0.09); }

        .ab-val-icon {
          font-size: 28px;
          margin-bottom: 16px;
          display: block;
        }
        .ab-val-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 16px;
          font-weight: 800;
          color: #0E0E0E;
          margin-bottom: 10px;
          letter-spacing: -0.3px;
        }
        .ab-val-desc {
          font-family: 'Inter', sans-serif;
          font-size: 13.5px;
          font-weight: 400;
          line-height: 1.75;
          color: rgba(14,14,14,0.48);
        }

        /* ══════════════════════════════════════════
           TIMELINE / MILESTONES
        ══════════════════════════════════════════ */
        .ab-timeline {
          background: #fff;
          padding: 88px 56px;
          position: relative;
          overflow: hidden;
        }

        /* Background dot grid in dark */
        .ab-timeline::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px);
          background-size: 28px 28px;
          pointer-events: none;
        }

        /* Red radial glow */
        .ab-timeline::after {
          content: '';
          position: absolute;
          top: -100px;
          right: -100px;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(181,0,2,0.12) 0%, transparent 65%);
          pointer-events: none;
        }

        .ab-timeline-inner { max-width: 1360px; margin: 0 auto; position: relative; z-index: 1; }

        .ab-timeline-label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: 'Inter', sans-serif;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 4px;
          color: #b50002;
          text-transform: uppercase;
          margin-bottom: 14px;
        }
        .ab-tl-line { width: 20px; height: 1.5px; background: #b50002; border-radius: 2px; }

        .ab-timeline-h2 {
          font-family: 'Playfair Display', serif;
          font-size: clamp(28px, 3.5vw, 46px);
          font-weight: 800;
          letter-spacing: -1px;
          color: #171717;
          margin-bottom: 56px;
          line-height: 1.05;
        }
        .ab-timeline-h2 em { color: #b50002; font-style: italic; }

        .ab-milestones {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0;
          position: relative;
        }

        /* Horizontal connector line */
        .ab-milestones::before {
          content: '';
          position: absolute;
          top: 18px;
          left: calc(12.5% + 8px);
          right: calc(12.5% + 8px);
          height: 1px;
          background: linear-gradient(to right, transparent, rgba(181,0,2,0.4) 20%, rgba(181,0,2,0.4) 80%, transparent);
          pointer-events: none;
        }

        .ab-milestone {
          padding: 0 24px 0 0;
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.6s cubic-bezier(.2,.8,.2,1), transform 0.6s cubic-bezier(.2,.8,.2,1);
        }
        .ab-milestone.in { opacity: 1; transform: translateY(0); }

        .ab-milestone-dot {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #b50002;
          border: 3px solid rgba(181,0,2,0.25);
          margin-bottom: 24px;
          box-shadow: 0 0 0 6px rgba(181,0,2,0.08);
        }

        .ab-milestone-year {
          font-family: 'Playfair Display', serif;
          font-size: 36px;
          font-weight: 700;
          color: #171717;
          line-height: 1;
          margin-bottom: 8px;
          letter-spacing: -1px;
        }

        .ab-milestone-label {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 15px;
          font-weight: 800;
          color: #b50002;
          margin-bottom: 8px;
        }
        .ab-milestone-desc {
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          color: rgba(14,14,14,0.48);
          line-height: 1.7;
        }

        /* ══════════════════════════════════════════
           CTA SECTION
        ══════════════════════════════════════════ */
        .ab-cta {
          background: #F8F7F5;
          border-top: 1.5px solid rgba(0,0,0,0.06);
          padding: 88px 56px;
        }
        .ab-cta-inner {
          max-width: 1360px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 40px;
        }

        .ab-cta-left { max-width: 520px; }
        .ab-cta-label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: 'Inter', sans-serif;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 4px;
          color: #b50002;
          text-transform: uppercase;
          margin-bottom: 14px;
        }
        .ab-cta-label-line { width: 20px; height: 1.5px; background: #b50002; border-radius: 2px; }

        .ab-cta-h2 {
          font-family: 'Playfair Display', serif;
          font-size: clamp(28px, 3.5vw, 46px);
          font-weight: 800;
          letter-spacing: -1px;
          line-height: 1.05;
          color: #0E0E0E;
          margin-bottom: 16px;
        }
        .ab-cta-h2 em { color: #b50002; font-style: italic; }

        .ab-cta-sub {
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          color: rgba(14,14,14,0.48);
          line-height: 1.8;
        }

        .ab-cta-right {
          display: flex;
          gap: 14px;
          flex-shrink: 0;
        }

        .ab-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 16px 32px;
          border-radius: 14px;
          background: #b50002;
          border: none;
          color: #fff;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.3px;
          cursor: pointer;
          transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 4px 20px rgba(181,0,2,0.28);
          text-decoration: none;
        }
        .ab-btn-primary:hover { background: #9e0001; transform: translateY(-2px); box-shadow: 0 8px 28px rgba(181,0,2,0.38); }
        .ab-btn-primary:active { transform: translateY(0); }

        .ab-btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 16px 28px;
          border-radius: 14px;
          background: #fff;
          border: 1.5px solid rgba(0,0,0,0.12);
          color: #0E0E0E;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: border-color 0.2s, transform 0.15s, background 0.2s;
          text-decoration: none;
        }
        .ab-btn-secondary:hover { border-color: rgba(0,0,0,0.3); background: #F4F4F2; transform: translateY(-2px); }

        /* ══════════════════════════════════════════
           BRAND MARQUEE (reused from HeroBanner)
        ══════════════════════════════════════════ */
        @keyframes ab-marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ab-marquee-track {
          display: flex; align-items: center; gap: 0;
          animation: ab-marquee 22s linear infinite;
          width: max-content; will-change: transform;
        }
        .ab-marquee-track:hover { animation-play-state: paused; }
        .ab-marquee-wrap {
          overflow: hidden; width: 100%;
          -webkit-mask-image: linear-gradient(to right, transparent 0%, black 14%, black 86%, transparent 100%);
          mask-image: linear-gradient(to right, transparent 0%, black 14%, black 86%, transparent 100%);
        }
        .ab-marquee-item {
          display: flex; align-items: center;
          padding: 0 52px; opacity: 0.2;
          transition: opacity 0.35s; flex-shrink: 0;
          border-right: 1px solid rgba(0,0,0,0.05);
          font-family: 'Space Grotesk', sans-serif;
          font-size: 12px; font-weight: 700;
          letter-spacing: 3px; color: #555;
          text-transform: uppercase;
        }
        .ab-marquee-item:hover { opacity: 0.6; }

        .ab-marquee-strip {
          background: #fff;
          border-top: 1.5px solid rgba(0,0,0,0.06);
          padding: 24px 0 20px;
        }
        .ab-marquee-label {
          font-family: 'Inter', sans-serif;
          font-size: 9px; font-weight: 600;
          letter-spacing: 3.5px; text-transform: uppercase;
          color: rgba(0,0,0,0.2);
          text-align: center; margin-bottom: 18px;
        }

        /* ══════════════════════════════════════════
           RESPONSIVE
        ══════════════════════════════════════════ */
        @media(max-width: 1024px) {
          .ab-values-grid { grid-template-columns: repeat(2, 1fr); }
          .ab-milestones { grid-template-columns: repeat(2, 1fr); gap: 40px; }
          .ab-milestones::before { display: none; }
          .ab-story-inner { grid-template-columns: 1fr; gap: 40px; }
          .ab-story-card { left: 12px; }
          .ab-cta-inner { flex-direction: column; align-items: flex-start; }
        }

        @media(max-width: 768px) {
          .ab-hero-content { padding: 0 24px 56px; }
          .ab-hero-loc { right: 24px; }
          .ab-hero-scroll { display: none; }
          .ab-values { padding: 56px 24px; }
          .ab-timeline { padding: 56px 24px; }
          .ab-cta { padding: 56px 24px; }
          .ab-cta-right { flex-direction: column; width: 100%; }
          .ab-btn-primary, .ab-btn-secondary { justify-content: center; }
          .ab-values-header { flex-direction: column; gap: 8px; }
          .ab-values-grid { grid-template-columns: 1fr; }
          .ab-milestones { grid-template-columns: 1fr; }
          .ab-story-inner { padding: 48px 24px; }
        }
      `}</style>

      <div className="ab-root">
        {/* ══ HERO ══════════════════════════════════════════════════════ */}
        <section className="ab-hero">
          {/* Use the actual shop photo — import it and replace the style below */}
          <div
            className={`ab-hero-bg ${mounted ? "loaded" : ""}`}
            style={{
              backgroundImage: `url(https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1800&q=80)`,
            }}
          />
          <div className="ab-hero-overlay" />
          <div className="ab-hero-dots" />
          <div className="ab-hero-stripe" />

          {/* Location chip */}
          <div className="ab-hero-loc">
            <span className="ab-hero-loc-dot" />
            Soldier's Hills IV, Bacoor, Cavite
          </div>

          {/* Scroll cue */}
          <div
            className="ab-hero-scroll"
            onClick={() =>
              window.scrollBy({
                top: window.innerHeight * 0.88,
                behavior: "smooth",
              })
            }
          >
            <span className="ab-scroll-txt">Scroll</span>
            <div className="ab-scroll-line" />
          </div>

          <div className="ab-hero-content">

            <h1 className={`ab-hero-h1 ${mounted ? "in" : ""}`}>
              The road
              <br />
              starts <em>here.</em>
            </h1>

            <p className={`ab-hero-sub ${mounted ? "in" : ""}`}>
              Anaia's Motorcycle Rental is Bacoor's most trusted motorcycle
              rental — putting riders on premium units since 2019.
            </p>

            <div className={`ab-hero-stats ${mounted ? "in" : ""}`}>
              <div className="ab-hstat">
                <span className="ab-hstat-num">30+</span>
                <span className="ab-hstat-label">Motorcycles</span>
              </div>
              <div className="ab-hstat">
                <span className="ab-hstat-num">100+</span>
                <span className="ab-hstat-label">Happy Riders</span>
              </div>
              <div className="ab-hstat">
                <span className="ab-hstat-num">4.9★</span>
                <span className="ab-hstat-label">Average Rating</span>
              </div>
              <div className="ab-hstat">
                <span className="ab-hstat-num">5+</span>
                <span className="ab-hstat-label">Years Serving</span>
              </div>
            </div>
          </div>
        </section>

        {/* ══ STORY ══════════════════════════════════════════════════════ */}
        <section className="ab-story">
          <div ref={storyRef} className="ab-story-inner">
            {/* Left copy */}
            <div className={`ab-reveal-left ${storyVisible ? "in" : ""}`}>
              <div className="ab-story-label">
                <span className="ab-story-label-line" />
                Our Story
              </div>
              <h2 className="ab-story-h2">
                Built by riders,
                <br />
                <em>for riders.</em>
              </h2>
              <p className="ab-story-body">
                What started as a small passion project in Soldier's Hills IV
                has grown into Bacoor's go-to motorcycle rental. Anaia's was
                built on one simple belief: everyone deserves the freedom of the
                open road — without the hassle of ownership.
              </p>
              <p className="ab-story-body">
                We started with just three units and a love for motorcycles.
                Today, our fleet spans scooters, naked bikes, and underbones
                from the Philippines' top brands — all maintained to the highest
                standard and ready to ride.
              </p>
              <p className="ab-story-body">
                Whether you're exploring Cavite's coastal roads, commuting
                through Bacoor, or heading out on a weekend adventure, Anaia's
                has the perfect machine for your journey.
              </p>
            </div>

            {/* Right image */}
            <div
              className={`ab-story-right ab-reveal-right ${storyVisible ? "in" : ""}`}
            >
              <div className="ab-story-dots-accent" />
              <div className="ab-story-img-wrap">
                {/* Replace src with your actual shop photo import */}
                <img
                  className="ab-story-img"
                  src="https://scontent.fmnl37-1.fna.fbcdn.net/v/t39.30808-6/514264843_736961948836673_2196729220353272776_n.jpg?_nc_cat=109&ccb=1-7&_nc_sid=7b2446&_nc_eui2=AeFcZlWdBvvRLf6eMdVtjbxa_vKBrQkO5cf-8oGtCQ7lx2KQgaXXDM4uQtxrnBgYh9rZwgOhAOWY0wyi89P1Ly_W&_nc_ohc=lB2PXwmn9HcQ7kNvwF3aHsj&_nc_oc=AdpG9zOehZZnvpGDTsW3t-VD6MNfxzUCC1TmyWP7GFg9J7GOMXMzuMfU9icclm4Kru4&_nc_zt=23&_nc_ht=scontent.fmnl37-1.fna&_nc_gid=EWJbUDQffdNYaVAJ3_pekA&_nc_ss=7b2a8&oh=00_Af6aqGFtHcqXpIYa_aYE-SGF0K2xQeWZCwZx14fsExqYUw&oe=6A07ADE0"
                  alt="Honda Click at Anaia's Motorcycle Rental"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ══ VALUES ═════════════════════════════════════════════════════ */}
        <section className="ab-values">
          <div className="ab-values-inner">
            <div
              ref={valRef}
              className={`ab-values-header ab-reveal ${valVisible ? "in" : ""}`}
            >
              <div>
                <div className="ab-story-label">
                  <span className="ab-story-label-line" />
                  What We Stand For
                </div>
                <h2 className="ab-values-h2">
                  Our <em>values</em>
                </h2>
              </div>
            </div>

            <div className="ab-values-grid">
              {VALUES.map((v, i) => (
                <div
                  key={i}
                  className={`ab-val-card ${valVisible ? "in" : ""}`}
                  style={{ transitionDelay: `${i * 0.1}s` }}
                >
                  <span className="ab-val-icon">{v.icon}</span>
                  <div className="ab-val-title">{v.title}</div>
                  <p className="ab-val-desc">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ TIMELINE ═══════════════════════════════════════════════════ */}
        <section className="ab-timeline">
          <div ref={milRef} className="ab-timeline-inner">
            <div className={`ab-reveal ${milVisible ? "in" : ""}`}>
              <div className="ab-timeline-label">
                <span className="ab-tl-line" />
                Our Journey
              </div>
              <h2 className="ab-timeline-h2">
                From three bikes to
                <br />
                <em>thirty and beyond.</em>
              </h2>
            </div>

            <div className="ab-milestones">
              {MILESTONES.map((m, i) => (
                <div
                  key={i}
                  className={`ab-milestone ${milVisible ? "in" : ""}`}
                  style={{ transitionDelay: `${0.1 + i * 0.12}s` }}
                >
                  <div className="ab-milestone-dot" />
                  <div className="ab-milestone-year">{m.year}</div>
                  <div className="ab-milestone-label">{m.label}</div>
                  <p className="ab-milestone-desc">{m.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ CTA ════════════════════════════════════════════════════════ */}
        <section className="ab-cta">
          <div
            ref={ctaRef}
            className={`ab-cta-inner ab-reveal ${ctaVisible ? "in" : ""}`}
          >
            <div className="ab-cta-left">
              <div className="ab-cta-label">
                <span className="ab-cta-label-line" />
                Ready to Ride?
              </div>
              <h2 className="ab-cta-h2">
                Your next adventure
                <br />
                is <em>one click away.</em>
              </h2>
              <p className="ab-cta-sub">
                Browse our full fleet and book your motorcycle in minutes. Pick
                up at our place in Bacoor — no delivery, no fuss.
              </p>
            </div>

            <div className="ab-cta-right">
              <a href="/motorcycles" className="ab-btn-primary">
                Browse Motorcycles →
              </a>
              <a href="/contact" className="ab-btn-secondary">
                Contact Us
              </a>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
