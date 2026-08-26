import React, { useCallback, useEffect, useRef, useState } from "react";
import img1 from "../assets/scooter.png";
import img2 from "../assets/car.png";
import img3 from "../assets/underbone.png";
import hondaLogo from "../assets/logos/honda.svg";
import yamahaLogo from "../assets/logos/yamaha.svg";
import suzukiLogo from "../assets/logos/suzuki.svg";
import kawasakiLogo from "../assets/logos/kawasaki.svg";
import toyotaLogo from "../assets/logos/toyota.svg";
import nissanLogo from "../assets/logos/nissan.svg";
// PERF: the hero bg is the page's LCP element. It now lives in
// /public/images/hero-bg.webp (NOT imported/bundled) so index.html
// can <link rel="preload"> it at a fixed path and the browser can
// start fetching it before React even mounts. Convert the original
// MainBG.png to WebP (~80% smaller) and drop it there. See the <img>
// below — fetchpriority="high" tells the browser to fetch it before
// lower-priority images on the page.
const HERO_BG = "/images/hero-bg.webp";

// ─── Map each tab to its own motorcycle image ───────────────────────
const TAB_IMAGES = {
  Scooter: img1,
  Car: img2,
  Underbone: img3,
};

const BrandLogos = {
  Yamaha: <img src={yamahaLogo} alt="Yamaha" className="h-6 object-contain" />,
  Honda: <img src={hondaLogo} alt="Honda" className="h-5 object-contain" />,
  Suzuki: <img src={suzukiLogo} alt="Suzuki" className="h-7 object-contain" />,
  Kawasaki: (
    <img src={kawasakiLogo} alt="Kawasaki" className="h-4 object-contain" />
  ),
  Toyota: <img src={toyotaLogo} alt="Toyota" className="h-6 object-contain" />,
  Nissan: <img src={nissanLogo} alt="Nissan" className="h-5 object-contain" />,
};

const BRAND_ITEMS = [
  "Yamaha",
  "Honda",
  "Suzuki",
  "Kawasaki",
  "Toyota",
  "Nissan",
];

function BrandMarquee() {
  const items = [...BRAND_ITEMS, ...BRAND_ITEMS];
  return (
    <>
      <style>{`
        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-track {
          display: flex; align-items: center; gap: 0;
          animation: marquee 24s linear infinite;
          width: max-content; will-change: transform;
        }
        .marquee-track:hover { animation-play-state: paused; }
        .marquee-wrap {
          overflow: hidden; width: 100%;
          -webkit-mask-image: linear-gradient(to right, transparent 0%, black 14%, black 86%, transparent 100%);
          mask-image: linear-gradient(to right, transparent 0%, black 14%, black 86%, transparent 100%);
        }
        .marquee-item {
          display: flex; align-items: center;
          padding: 0 52px; opacity: 0.22;
          transition: opacity 0.35s; flex-shrink: 0;
          border-right: 1px solid rgba(0,0,0,0.05);
        }
        .marquee-item:hover { opacity: 0.6; }
      `}</style>
      <div className="marquee-wrap">
        <div className="marquee-track">
          {items.map((brand, i) => (
            <div key={`${brand}-${i}`} className="marquee-item">
              {BrandLogos[brand] ?? (
                <span
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 600,
                    fontSize: 12,
                    letterSpacing: 2,
                    color: "#999",
                  }}
                >
                  {brand}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

const TABS = ["Scooter", "Car", "Underbone"];
const AUTO_INTERVAL = 3500;

export default function HeroBanner() {
  const wrapRef = useRef(null);
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });
  const [activeTab, setActiveTab] = useState("Scooter");
  const [mounted, setMounted] = useState(false);
  const [imgVisible, setImgVisible] = useState(true);
  const [displayedTab, setDisplayedTab] = useState("Scooter");
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef(null);
  const progressRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  const switchTo = (tab) => {
    setImgVisible(false);
    setTimeout(() => {
      setActiveTab(tab);
      setDisplayedTab(tab);
      setImgVisible(true);
    }, 280);
  };

  const handleTabChange = (tab) => {
    if (tab === activeTab) return;
    switchTo(tab);
    restartCycle(tab);
  };

  const startAutoPlay = useCallback((fromTab) => {
    startTimeRef.current = performance.now();

    const tick = (now) => {
      const elapsed = now - startTimeRef.current;
      setProgress(Math.min(elapsed / AUTO_INTERVAL, 1));
      if (elapsed < AUTO_INTERVAL) {
        progressRef.current = requestAnimationFrame(tick);
      }
    };
    progressRef.current = requestAnimationFrame(tick);

    intervalRef.current = setInterval(() => {
      setActiveTab((prev) => {
        const next = TABS[(TABS.indexOf(prev) + 1) % TABS.length];
        switchTo(next);
        startTimeRef.current = performance.now();
        setProgress(0);
        cancelAnimationFrame(progressRef.current);
        progressRef.current = requestAnimationFrame(tick);
        return next;
      });
    }, AUTO_INTERVAL);
  }, []);

  const restartCycle = (currentTab) => {
    clearInterval(intervalRef.current);
    cancelAnimationFrame(progressRef.current);
    setProgress(0);
    startTimeRef.current = performance.now();
    if (!paused) startAutoPlay(currentTab ?? activeTab);
  };

  useEffect(() => {
    if (paused) {
      clearInterval(intervalRef.current);
      cancelAnimationFrame(progressRef.current);
    } else {
      startAutoPlay(activeTab);
    }
    return () => {
      clearInterval(intervalRef.current);
      cancelAnimationFrame(progressRef.current);
    };
  }, [paused, activeTab, startAutoPlay]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      setMouse({ x: (cx - r.left) / r.width, y: (cy - r.top) / r.height });
    };
    const onLeave = () => setMouse({ x: 0.5, y: 0.5 });
    el.addEventListener("mousemove", onMove);
    el.addEventListener("touchmove", onMove, { passive: true });
    el.addEventListener("mouseleave", onLeave);
    el.addEventListener("touchend", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("mouseleave", onLeave);
      el.removeEventListener("touchend", onLeave);
    };
  }, []);

  const tx = (mouse.x - 0.5) * 2 * 10;
  const ty = (mouse.y - 0.5) * 2 * 5;

  return (
    <>
      <style>{`
        .hb-root {
          position: relative;
          width: 100%;
          min-height: 100vh;
          overflow: hidden;
          background-color: #F8F7F5; /* Shows instantly while hb-bg-img loads */
          display: flex;
          flex-direction: column;
          font-family: 'Inter', sans-serif;
        }

        .hb-bg-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          z-index: 0;
        }

        .hb-dots {
          position: absolute; inset: 0; pointer-events: none;
          background-image: radial-gradient(circle, rgba(0,0,0,0.055) 1px, transparent 1px);
          background-size: 30px 30px;
          opacity: 0.6;
        }

        .hb-pattern {
          position: absolute; inset: 0; pointer-events: none;
          background-image:
            radial-gradient(ellipse 60% 50% at 75% 20%, rgba(181,0,2,0.055) 0%, transparent 70%),
            radial-gradient(ellipse 40% 40% at 10% 85%, rgba(181,0,2,0.035) 0%, transparent 60%);
        }

        .hb-watermark {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: flex-end;
          pointer-events: none; overflow: hidden; padding-right: 1%;
        }
        .hb-wm-text {
          font-family: 'Playfair Display', serif;
          font-size: clamp(90px, 13vw, 200px);
          font-weight: 800;
          line-height: 0.88;
          color: #b50002;
          opacity: 0.038;
          letter-spacing: -6px;
          user-select: none;
          text-align: right;
          white-space: nowrap;
        }

        .hb-moto-wrap {
          position: absolute;
          right: -2%; bottom: 88px;
          height: 70%; max-width: 54%;
          pointer-events: none;
          transition: transform 320ms cubic-bezier(.18,.9,.22,1);
        }
        .hb-moto {
          width: 100%; height: 100%;
          object-fit: contain; object-position: bottom right;
          transition: opacity 280ms ease, transform 280ms ease;
          filter: drop-shadow(0 24px 56px rgba(0,0,0,0.10));
        }
        .hb-moto.hidden { opacity: 0; transform: scale(0.97) translateY(8px); }
        .hb-moto.visible { opacity: 1; transform: scale(1) translateY(0); }

        @media(max-width:768px){
          .hb-moto-wrap { height: 40%; right: -5%; bottom: 120px; max-width: 80%; }
        }

        .hb-fade-right {
          position: absolute; right: 0; top: 0; bottom: 0; width: 54%;
          background: linear-gradient(to left,
            rgba(248,247,245,0) 0%,
            rgba(248,247,245,0.12) 50%,
            rgba(248,247,245,0.82) 82%,
            rgba(248,247,245,1) 100%);
          pointer-events: none;
        }

        .hb-accent-bar {
          position: absolute; bottom: 88px; left: 0;
          width: 36%; height: 1.5px;
          background: linear-gradient(to right, #b50002 0%, rgba(181,0,2,0) 100%);
          pointer-events: none;
        }

        .hb-body {
          position: relative; z-index: 2; flex: 1;
          display: flex; align-items: center;
          max-width: 1360px; margin: 0 auto;
          padding: 148px 56px 64px; width: 100%;
        }
        @media(max-width:768px){ .hb-body { padding: 116px 24px 64px; } }

        .hb-content { display: flex; flex-direction: column; max-width: 520px; width: 100%; }

        .hb-eyebrow {
          display: inline-flex; align-items: center; gap: 10px;
          font-family: 'Inter', sans-serif;
          font-size: 10px; font-weight: 600; letter-spacing: 4px;
          color: #b50002; text-transform: uppercase;
          margin-bottom: 18px;
          opacity: 0; transform: translateY(12px);
          transition: opacity 0.5s ease, transform 0.5s ease;
        }
        .hb-eyebrow.in { opacity: 1; transform: translateY(0); }
        .hb-eyebrow-line { width: 24px; height: 1.5px; background: #b50002; border-radius: 2px; flex-shrink: 0; }

        .hb-h1 {
          font-family: 'Playfair Display', serif;
          font-size: clamp(42px, 5.8vw, 78px);
          font-weight: 800;
          line-height: 1.0;
          color: #0E0E0E;
          margin-bottom: 20px;
          letter-spacing: -1px;
          opacity: 0; transform: translateY(16px);
          transition: opacity 0.6s 0.1s ease, transform 0.6s 0.1s ease;
        }
        .hb-h1.in { opacity: 1; transform: translateY(0); }
        .hb-h1-red { color: #b50002; font-style: italic; }

        .hb-desc {
          font-family: 'Inter', sans-serif;
          font-size: 14.5px; font-weight: 400; line-height: 1.8;
          color: rgba(14,14,14,0.44);
          max-width: 380px; margin-bottom: 32px;
          opacity: 0; transform: translateY(12px);
          transition: opacity 0.6s 0.2s ease, transform 0.6s 0.2s ease;
        }
        .hb-desc.in { opacity: 1; transform: translateY(0); }

        .hb-card {
          background: #ffffff;
          border-radius: 18px;
          overflow: hidden;
          max-width: 490px;
          border: 1px solid rgba(0,0,0,0.07);
          box-shadow: 0 2px 4px rgba(0,0,0,0.03), 0 12px 40px rgba(0,0,0,0.07);
          margin-bottom: 28px;
          opacity: 0; transform: translateY(16px);
          transition: opacity 0.6s 0.3s ease, transform 0.6s 0.3s ease;
        }
        .hb-card.in { opacity: 1; transform: translateY(0); }

        .hb-tabs {
          display: flex;
          border-bottom: 1px solid rgba(0,0,0,0.06);
          background: #FAFAFA;
        }
        .hb-tab {
          flex: 1; padding: 13px 10px;
          font-family: 'Inter', sans-serif;
          font-size: 11px; font-weight: 600; letter-spacing: 1px;
          border: none; background: transparent;
          color: rgba(0,0,0,0.26); cursor: pointer;
          position: relative; transition: color 0.2s, background 0.2s;
          text-transform: uppercase;
        }
        .hb-tab.active { color: #0E0E0E; background: #fff; }
        .hb-tab.active::after {
          content: '';
          position: absolute; bottom: -1px; left: 20px; right: 20px;
          height: 1.5px; background: #b50002; border-radius: 2px;
        }
        .hb-tab:hover:not(.active) { color: rgba(0,0,0,0.55); }

        .hb-stats {
          display: flex; gap: 24px; align-items: center;
          opacity: 0; transform: translateY(10px);
          transition: opacity 0.6s 0.44s ease, transform 0.6s 0.44s ease;
        }
        .hb-stats.in { opacity: 1; transform: translateY(0); }
        .hb-stat { display: flex; flex-direction: column; gap: 3px; }
        .hb-stat-num {
          font-family: 'Playfair Display', serif;
          font-size: 24px; font-weight: 700; color: #0E0E0E; line-height: 1;
        }
        .hb-stat-label {
          font-family: 'Inter', sans-serif;
          font-size: 11px; font-weight: 400;
          color: rgba(14,14,14,0.36); letter-spacing: 0.2px;
        }
        .hb-stat-sep { width: 1px; height: 28px; background: rgba(0,0,0,0.09); }

        .hb-tab-progress {
          position: absolute; bottom: -1px; left: 20px; right: 20px;
          height: 1.5px; background: rgba(181,0,2,0.18); border-radius: 2px; overflow: hidden;
        }
        .hb-tab-progress-fill {
          height: 100%; background: #b50002; border-radius: 2px;
          transition: width 80ms linear;
        }

        .hb-marquee-strip {
          position: relative; z-index: 3;
          border-top: 1px solid rgba(0,0,0,0.06);
          padding: 24px 0 20px;
          background: #ffffff;
        }
        .hb-marquee-label {
          font-family: 'Inter', sans-serif;
          font-size: 9px; font-weight: 600;
          letter-spacing: 3.5px; text-transform: uppercase;
          color: rgba(0,0,0,0.2);
          text-align: center; margin-bottom: 18px;
        }

        .hb-scroll {
          position: absolute; bottom: 28px; right: 52px; z-index: 3;
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          cursor: pointer; opacity: 0;
          animation: fadeSc 0.8s 1.1s ease forwards;
        }
        @keyframes fadeSc { to { opacity: 1; } }
        .hb-scroll-txt {
          font-family: 'Inter', sans-serif; font-size: 8.5px; font-weight: 600;
          letter-spacing: 3px; text-transform: uppercase; color: rgba(0,0,0,0.18);
        }
        .hb-scroll-line {
          width: 1px; height: 38px;
          background: linear-gradient(to bottom, rgba(0,0,0,0.18), transparent);
          animation: scrollPulse 2.6s ease-in-out infinite;
        }
        @keyframes scrollPulse {
          0%,100% { opacity: 0.35; transform: scaleY(0.82) translateY(0); }
          50%      { opacity: 1;   transform: scaleY(1) translateY(4px); }
        }

        @media(max-width:768px){
          .hb-moto-wrap { display: none; }
          .hb-fade-right { display: none; }
          .hb-content { max-width: 100%; align-items: center; text-align: center; }
          .hb-desc { max-width: 100%; }
          .hb-stats { justify-content: center; }
          .hb-card { width: 100%; }
        }
      `}</style>

      <div ref={wrapRef} className="hb-root">
        {/* LCP image: real <img> (not a CSS background) so the browser
            can discover + fetch it at high priority. loading="eager"
            because this is always above the fold. */}
        <img
          src={HERO_BG}
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          loading="eager"
          decoding="async"
          className="hb-bg-img"
        />

        {/* Background Patterns (You can remove these if you want the image completely clean) */}
        <div className="hb-dots" />
        <div className="hb-pattern" />

        {/* Watermark */}
        <div className="hb-watermark">
          <div
            style={{
              transform: `translate(${(mouse.x - 0.5) * 14}px, ${(mouse.y - 0.5) * 6}px)`,
              transition: "transform 320ms cubic-bezier(.18,.9,.22,1)",
            }}
          >
            {/* <div className="hb-wm-text">ANAIA'S</div> */}
          </div>
        </div>

        {/* Motorcycle */}
        <div
          className="hb-moto-wrap"
          style={{
            transform: `translate3d(${tx * 0.45}px, ${ty * 0.25}px, 0)`,
          }}
        >
          <img
            src={TAB_IMAGES[displayedTab]}
            alt={`${displayedTab} vehicle for rent`}
            className={`hb-moto ${imgVisible ? "visible" : "hidden"}`}
          />
        </div>

        {/* Right fade */}
        {/* <div className="hb-fade-right" /> */}

        {/* Bottom accent */}
        <div className="hb-accent-bar" />

        {/* Content */}
        <div className="hb-body">
          <div className="hb-content">
            <div className={`hb-eyebrow ${mounted ? "in" : ""}`}>
              <span className="hb-eyebrow-line" />
              Vehicle Rental
            </div>

            <h1 className={`hb-h1 ${mounted ? "in" : ""}`}>
              Search,
              <br />
              book&nbsp;and
              <br />
              <span className="hb-h1-red">ride.</span>
            </h1>

            <p className={`hb-desc ${mounted ? "in" : ""}`}>
              Choose from scooter, bigbike and underbone motorcycles, as well as
              pickup, sedan, MPV, and SUV cars built for thrill, comfort, and
              adventure. Your journey begins here.
            </p>

            <div className={`hb-card ${mounted ? "in" : ""}`}>
              <div
                className="hb-tabs"
                onMouseEnter={() => setPaused(true)}
                onMouseLeave={() => setPaused(false)}
              >
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    className={`hb-tab ${activeTab === tab ? "active" : ""}`}
                    onClick={() => handleTabChange(tab)}
                  >
                    {tab}
                    {activeTab === tab && (
                      <div className="hb-tab-progress">
                        <div
                          className="hb-tab-progress-fill"
                          style={{ width: `${progress * 100}%` }}
                        />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className={`hb-stats ${mounted ? "in" : ""}`}>
              <div className="hb-stat">
                <span className="hb-stat-num">30+</span>
                <span className="hb-stat-label">Motorcycles</span>
              </div>
              <div className="hb-stat-sep" />
              <div className="hb-stat">
                <span className="hb-stat-num">3+</span>
                <span className="hb-stat-label">Car Models</span>
              </div>
              <div className="hb-stat-sep" />
              <div className="hb-stat">
                <span className="hb-stat-num">100+</span>
                <span className="hb-stat-label">Happy Riders</span>
              </div>
              <div className="hb-stat-sep" />
              <div className="hb-stat">
                <span className="hb-stat-num">4.9★</span>
                <span className="hb-stat-label">Avg. Rating</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll cue */}
        <div
          className="hb-scroll"
          onClick={() =>
            window.scrollBy({
              top: window.innerHeight * 0.88,
              behavior: "smooth",
            })
          }
        >
          <span className="hb-scroll-txt">Scroll</span>
          <div className="hb-scroll-line" />
        </div>

        {/* Brand marquee */}
        <div className="hb-marquee-strip">
          <div className="hb-marquee-label">Top Brands Available</div>
          <BrandMarquee />
        </div>
      </div>
    </>
  );
}
