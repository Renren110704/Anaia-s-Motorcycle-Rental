import React, { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";

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

const FAQS = [
  {
    question: "How do I book a vehicle?",
    answer:
      "Browse our available vehicles, pick your preferred unit, select your pickup and return dates, then click 'Rent Now'. You'll be guided through uploading a proof of payment to complete your booking.",
  },
  {
    question: "What documents do I need to rent a unit?",
    answer:
      "You'll need a valid government-issued ID (UMID, SSS, PhilHealth, Passport, or Driver's License) and proof of payment. A driver's license is required",
  },
  {
    question: "How does payment work?",
    answer:
      "We accept GCash, Maya, and bank transfer. After selecting your vehicle and dates, you'll upload your proof of payment for verification. Bookings are confirmed once payment is approved by our team.",
  },
  {
    question: "How can we get the unit? do you deliver it or accept meet-ups?",
    answer:
      "Our policy is straightforward: Units are strictly pick-up and return at our place. Need directions? No problem! Just request a Google Maps link from our admin to easily locate us: Soldier's Hills IV, Molino VI, Bacoor, Cavite",
  },
  {
    question: "Do you provide a helmet for motorcycles when we rent?",
    answer:
      "Absolutely! We offer one free helmet with each rental. Need an extra for your backride? Just add 100 pesos! While we've got you covered, we also encourage you to bring your own helmet for your safety and convenience. Please note: Our helmets are for public use, and due to hectic rental schedules, we can't wash them daily. However, rest assured that we sanitize them before handing them over to the next renter!",
  },
  {
    question: "Are there fuel or mileage limits?",
    answer:
      "Good news — we offer unlimited fuel usage and unlimited mileage during your rental period! You can enjoy your trip without worrying about fuel or distance restrictions. We only ask that you return the motorcycle with the same fuel level as when you picked it up.",
  },
  {
    question: "Can I extend my rental period?",
    answer:
      "Yes! You can request a rental extension before your scheduled return time, subject to vehicle availability. Any additional charges for the extended rental period will be added to your balance and paid upon returning the vehicle.",
  },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState(2);
  const toggle = (i) => setOpenIndex(openIndex === i ? null : i);
  const [cardRef, cardVisible] = useScrollReveal();
  const [leftRef, leftVisible] = useScrollReveal({ threshold: 0.15 });
  const [headRef, headVisible] = useScrollReveal({ threshold: 0.2 });
  const [listRef, listVisible] = useScrollReveal({ threshold: 0.1 });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&display=swap');

        /* ── FAQ section wrapper ── */
        .faq-page {
          background: #F5F5F3;
          padding: 72px 48px;
          font-family: 'Space Grotesk', sans-serif;
          border-top: 1.5px solid rgba(0,0,0,0.09);
        }

        .faq-section-label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 3.5px;
          text-transform: uppercase;
          color: #b50002;
          margin-bottom: 10px;
        }
        .faq-section-line {
          width: 20px; height: 1.5px;
          background: #b50002; border-radius: 2px;
        }
        .faq-section-title {
          font-size: clamp(28px, 4vw, 42px);
          font-weight: 800;
          color: #0E0E0E;
          letter-spacing: -0.7px;
          line-height: 1.1;
          margin-bottom: 40px;
        }

        /* ── Outer card ── */
        .faq-card {
          background: #fff;
          border-radius: 24px;
          overflow: hidden;
          width: 100%;
          display: grid;
          grid-template-columns: 360px 1fr;
          box-shadow: 0 2px 4px rgba(0,0,0,0.03), 0 12px 40px rgba(0,0,0,0.07);
          border: 1px solid rgba(0,0,0,0.06);
        }

        /* ── Left panel ── */
        .faq-left {
          position: relative;
          overflow: hidden;
          min-height: 480px;
        }

        /* subtle dot grid */
        .faq-left::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle, rgba(0,0,0,0.07) 1px, transparent 1px);
          background-size: 22px 22px;
          opacity: 0.6;
        }

        /* red accent splash */
        .faq-left::after {
          content: '';
          position: absolute;
          top: -60px; right: -60px;
          width: 260px; height: 260px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(181,0,2,0.10) 0%, transparent 70%);
          pointer-events: none;
        }

        .faq-left-inner {
          position: relative;
          z-index: 2;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .faq-person {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        }

        /* ── Right panel ── */
        .faq-right {
          padding: 48px 44px;
          display: flex;
          flex-direction: column;
        }

        .faq-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 3.5px;
          text-transform: uppercase;
          color: #b50002;
          margin-bottom: 10px;
        }
        .faq-eyebrow-line {
          width: 20px; height: 1.5px;
          background: #b50002; border-radius: 2px;
        }

        .faq-heading {
          font-size: clamp(20px, 2.5vw, 28px);
          font-weight: 800;
          color: #0E0E0E;
          letter-spacing: -0.5px;
          line-height: 1.15;
          margin-bottom: 10px;
        }

        .faq-sub {
          font-size: 13px;
          font-weight: 400;
          color: rgba(14,14,14,0.42);
          line-height: 1.7;
          margin-bottom: 32px;
          max-width: 420px;
        }

        /* ── Accordion ── */
        .faq-list {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .faq-item {
          border-bottom: 1px solid rgba(0,0,0,0.07);
        }
        .faq-item:first-child { border-top: 1px solid rgba(0,0,0,0.07); }

        .faq-question {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 18px 4px;
          background: transparent;
          border: none;
          cursor: pointer;
          text-align: left;
          transition: color 0.18s;
        }
        .faq-question:hover .faq-q-text { color: #b50002; }

        .faq-q-text {
          font-size: 14px;
          font-weight: 600;
          color: #0E0E0E;
          line-height: 1.4;
          transition: color 0.18s;
          font-family: 'Space Grotesk', sans-serif;
        }
        .faq-q-text.open { color: #b50002; }

        .faq-icon {
          flex-shrink: 0;
          width: 26px; height: 26px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.18s, transform 0.25s;
          color: rgba(0,0,0,0.35);
        }
        .faq-icon.open {
          background: rgba(181,0,2,0.08);
          color: #b50002;
          transform: rotate(180deg);
        }

        .faq-answer-wrap {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 0.28s cubic-bezier(.4,0,.2,1);
        }
        .faq-answer-wrap.open {
          grid-template-rows: 1fr;
        }
        .faq-answer-inner { overflow: hidden; }

        .faq-answer {
          padding: 0 4px 18px;
          font-size: 13px;
          font-weight: 400;
          color: rgba(14,14,14,0.52);
          line-height: 1.75;
          font-family: 'Space Grotesk', sans-serif;
        }

        /* ── Responsive ── */
        @media(max-width: 960px) {
          .faq-page { padding: 56px 28px; }
          .faq-card { grid-template-columns: 1fr; }
          .faq-left { min-height: 300px; }
          .faq-person { max-height: 300px; }
          .faq-right { padding: 36px 28px; }
        }

        @media(max-width: 480px) {
          .faq-page { padding: 40px 16px; }
          .faq-right { padding: 28px 20px; }
          .faq-section-title { margin-bottom: 24px; }
        }

        /* ── Scroll reveal ── */
        @keyframes faq-slideLeft {
          from { opacity: 0; transform: translateX(-36px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes faq-slideRight {
          from { opacity: 0; transform: translateX(36px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes faq-fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes faq-scaleIn {
          from { opacity: 0; transform: scale(0.97) translateY(16px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }

        .faq-card-reveal { opacity: 0; }
        .faq-card-reveal.visible { animation: faq-scaleIn 0.6s cubic-bezier(.2,.8,.2,1) forwards; }

        .faq-left-reveal { opacity: 0; }
        .faq-left-reveal.visible { animation: faq-slideLeft 0.65s cubic-bezier(.2,.8,.2,1) 0.1s forwards; }

        .faq-head-reveal { opacity: 0; }
        .faq-head-reveal.visible { animation: faq-slideRight 0.6s cubic-bezier(.2,.8,.2,1) 0.15s forwards; }

        .faq-item-reveal { opacity: 0; }
        .faq-item-reveal.visible { animation: faq-fadeUp 0.5s cubic-bezier(.2,.8,.2,1) forwards; }
      `}</style>

      <div className="faq-page">
        {/* Section header above the card */}
        <div
          ref={headRef}
          className={`faq-head-reveal ${headVisible ? "visible" : ""}`}
        >
          <div className="faq-section-label">
            <span className="faq-section-line" />
            Support
          </div>
          <h2 className="faq-section-title">
            Frequently Asked
            <br />
            Questions
          </h2>
        </div>

        <div
          ref={cardRef}
          className={`faq-card faq-card-reveal ${cardVisible ? "visible" : ""}`}
        >
          {/* ── Left: visual panel ── */}
          <div
            ref={leftRef}
            className={`faq-left faq-left-reveal ${leftVisible ? "visible" : ""}`}
          >
            <img
              className="faq-person"
              src="https://imgcdn.zigwheels.ph/large/gallery/exterior/73/1823/honda-click-150i-front-tyre-687406.jpg"
              alt="FAQ illustration"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          </div>

          {/* ── Right: accordion ── */}
          <div className="faq-right">
            <p className="faq-sub">
              Common questions about renting at Anaia's — answered quickly so
              you can get on the road faster.
            </p>

            <div ref={listRef} className="faq-list">
              {FAQS.map((faq, i) => (
                <div
                  key={i}
                  className={`faq-item faq-item-reveal ${listVisible ? "visible" : ""}`}
                  style={{ animationDelay: `${i * 0.06}s` }}
                >
                  <button
                    className="faq-question"
                    onClick={() => toggle(i)}
                    aria-expanded={openIndex === i}
                  >
                    <span
                      className={`faq-q-text ${openIndex === i ? "open" : ""}`}
                    >
                      {faq.question}
                    </span>
                    <span
                      className={`faq-icon ${openIndex === i ? "open" : ""}`}
                    >
                      <ChevronDown size={15} strokeWidth={2.5} />
                    </span>
                  </button>
                  <div
                    className={`faq-answer-wrap ${openIndex === i ? "open" : ""}`}
                  >
                    <div className="faq-answer-inner">
                      <p className="faq-answer">{faq.answer}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
