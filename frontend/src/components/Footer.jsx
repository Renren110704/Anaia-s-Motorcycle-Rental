import React from "react";
import { Link } from "react-router-dom";
import {
  FaEnvelope,
  FaFacebookF,
  FaMapMarkedAlt,
  FaPhone,
  FaTiktok,
} from "react-icons/fa";
import { GiCarKey } from "react-icons/gi";
import logo from "../assets/logo.png";

const Footer = () => {
  return (
    <>
      <style>{`
        .ft-root {
        background: #F5F5F3;
        font-family: 'Space Grotesk', sans-serif;
        border-top: 1.5px solid rgba(0,0,0,0.09);
      }

        /* ── road line accent ── */
        .ft-road {
          width: 100%;
          height: 4px;
          background: repeating-linear-gradient(
            90deg,
            #b50002 0px, #b50002 32px,
            transparent 32px, transparent 56px
          );
          opacity: 0.2;
        }

        /* ── inner ── */
        .ft-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 60px 48px 32px;
        }
        @media(max-width: 640px) { .ft-inner { padding: 40px 24px 24px; } }

        /* ── grid: equal 4 columns ── */
        .ft-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 48px;
          margin-bottom: 48px;
        }
        @media(max-width: 1024px) { .ft-grid { grid-template-columns: 1fr 1fr; gap: 36px; } }
        @media(max-width: 560px)  { .ft-grid { grid-template-columns: 1fr; gap: 28px; } }

        /* ── brand ── */
        .ft-logo-text {
          font-size: 24px; font-weight: 800; color: #b50002;
          letter-spacing: -0.5px; font-family: 'Space Grotesk', sans-serif;
          text-decoration: none; display: inline-block; margin-bottom: 12px;
        }
        .ft-logo-wrap {
          display: inline-flex;
          align-items: center;
          text-decoration: none;
          margin-bottom: 14px;
        }

        .ft-logo-img {
          width: 140px;
          height: auto;
          object-fit: contain;
          display: block;
        }
          .ft-desc {
          font-size: 13px; color: rgba(0,0,0,0.5);
          line-height: 1.75; font-family: 'Space Grotesk', sans-serif;
        }
        .ft-socials {
          display: flex; gap: 10px; margin-top: 20px;
        }
        .ft-social {
          width: 36px; height: 36px; border-radius: 50%;
          background: #fff;
          border: 1.5px solid rgba(0,0,0,0.1);
          display: flex; align-items: center; justify-content: center;
          color: #b50002; font-size: 14px;
          transition: background 0.2s, border-color 0.2s, transform 0.2s;
          text-decoration: none;
        }
        .ft-social:hover {
          background: #b50002; color: #fff;
          border-color: #b50002; transform: translateY(-2px);
        }

        /* ── section title ── */
        .ft-title {
          font-size: 10px; font-weight: 700;
          letter-spacing: 3px; text-transform: uppercase;
          color: #b50002; margin-bottom: 20px;
          font-family: 'Space Grotesk', sans-serif;
          display: flex; align-items: center; gap: 10px;
        }
        .ft-title::after {
          content: ''; flex: 1; height: 1.5px;
          background: rgba(181,0,2,0.15); border-radius: 2px;
        }

        /* ── quick links ── */
        .ft-links { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 11px; }
        .ft-link {
          font-size: 13.5px; color: rgba(0,0,0,0.55);
          text-decoration: none; display: flex; align-items: center; gap: 9px;
          font-family: 'Space Grotesk', sans-serif;
          transition: color 0.18s;
        }
        .ft-link:hover { color: #b50002; }
        .ft-bullet {
          width: 5px; height: 5px; border-radius: 50%;
          background: #b50002; flex-shrink: 0; opacity: 0.45;
          transition: opacity 0.18s;
        }
        .ft-link:hover .ft-bullet { opacity: 1; }

        /* ── contact ── */
        .ft-contact-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 13px; }
        .ft-contact-item {
          display: flex; align-items: flex-start; gap: 10px;
          font-size: 13px; color: rgba(0,0,0,0.55); line-height: 1.55;
          font-family: 'Space Grotesk', sans-serif;
        }
        .ft-contact-icon { color: #b50002; font-size: 14px; margin-top: 2px; flex-shrink: 0; }

        .ft-hours {
          margin-top: 18px;
          background: #fff;
          border: 1.5px solid rgba(0,0,0,0.07);
          border-radius: 12px;
          padding: 14px 16px;
        }
        .ft-hours-title {
          font-size: 10px; font-weight: 700;
          letter-spacing: 1.5px; text-transform: uppercase;
          color: rgba(0,0,0,0.3); margin-bottom: 8px;
          font-family: 'Space Grotesk', sans-serif;
        }
        .ft-hours p {
          font-size: 12.5px; color: rgba(0,0,0,0.5);
          line-height: 1.75; margin: 0;
          font-family: 'Space Grotesk', sans-serif;
        }

        /* ── newsletter ── */
        .ft-nl-desc {
          font-size: 13px; color: rgba(0,0,0,0.5);
          line-height: 1.7; margin-bottom: 16px;
          font-family: 'Space Grotesk', sans-serif;
        }
        .ft-input {
          width: 100%; box-sizing: border-box;
          padding: 11px 14px; border-radius: 10px;
          border: 1.5px solid rgba(0,0,0,0.1);
          font-size: 13px; font-family: 'Space Grotesk', sans-serif;
          background: #fff; color: #0E0E0E;
          outline: none; margin-bottom: 10px;
          transition: border-color 0.2s;
        }
        .ft-input:focus { border-color: #b50002; }
        .ft-input::placeholder { color: rgba(0,0,0,0.3); }

        .ft-btn {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
          padding: 12px 16px; border-radius: 10px;
          background: #b50002; color: #fff;
          font-size: 13px; font-weight: 700;
          font-family: 'Space Grotesk', sans-serif;
          border: none; cursor: pointer;
          transition: background 0.2s, transform 0.15s;
        }
        .ft-btn:hover { background: #8f0001; transform: translateY(-1px); }
        .ft-btn:active { transform: translateY(0); }

        /* ── copyright ── */
        .ft-copy {
          border-top: 1.5px solid rgba(0,0,0,0.07);
          padding-top: 24px;
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 8px;
          font-size: 12px; color: rgba(0,0,0,0.35);
          font-family: 'Space Grotesk', sans-serif;
        }
        .ft-designer {
          color: #b50002; font-weight: 700; text-decoration: none;
          font-family: 'Space Grotesk', sans-serif;
        }
        .ft-designer:hover { text-decoration: underline; }
      `}</style>

      <footer className="ft-root">
        <div className="ft-inner">
          <div className="ft-grid">
            {/* ── Brand ── */}
            <div>
              <Link to="/" className="ft-logo-wrap">
                <img src={logo} alt="ANAIA'S Logo" className="ft-logo-img" />
              </Link>
              <p className="ft-desc">
                Rental service with the latest models and exceptional customer
                service. Ride your dream vehicle today!
              </p>
              <div className="ft-socials">
                {[
                  {
                    Icon: FaFacebookF,
                    href: "https://www.facebook.com/anaiasmotorcyclerental",
                  },
                  {
                    Icon: FaTiktok,
                    href: "https://www.tiktok.com/@anaiasmotorcyclerental",
                  },
                ].map(({ Icon, href }, i) => (
                  <a
                    key={i}
                    href={href}
                    className="ft-social"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon />
                  </a>
                ))}
              </div>
            </div>

            {/* ── Quick Links ── */}
            <div>
              <h3 className="ft-title">Quick Links</h3>
              <ul className="ft-links">
                {[
                  { label: "Home", to: "/" },
                  { label: "Vehicles", to: "/motorcycles" },
                  { label: "Contact Us", to: "/contact" },
                ].map(({ label, to }) => (
                  <li key={label}>
                    <a href={to} className="ft-link">
                      <span className="ft-bullet" />
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* ── Contact ── */}
            <div>
              <h3 className="ft-title">Contact Us</h3>
              <ul className="ft-contact-list">
                <li className="ft-contact-item">
                  <FaMapMarkedAlt className="ft-contact-icon" />
                  <span>
                    Soldiers Hills IV, Block 9 Lot 1 PH2 Lily, Bacoor, 4102
                    Cavite
                  </span>
                </li>
                <li className="ft-contact-item">
                  <FaPhone className="ft-contact-icon" />
                  <span>0917 623 1426</span>
                </li>
                <li className="ft-contact-item">
                  <FaEnvelope className="ft-contact-icon" />
                  <span>jpineda132020@gmail.com</span>
                </li>
              </ul>
              <div className="ft-hours">
                <p className="ft-hours-title">Business Hours</p>
                <p>8:00 AM – 8:00 PM</p>
              </div>
            </div>

            {/* ── Newsletter ── */}
            <div>
              <h3 className="ft-title">Newsletter</h3>
              <p className="ft-nl-desc">
                Subscribe for special offers and updates
              </p>
              <form onSubmit={(e) => e.preventDefault()}>
                <input
                  type="email"
                  placeholder="Your Email Address"
                  className="ft-input"
                  required
                />
                <button type="submit" className="ft-btn">
                  <GiCarKey style={{ fontSize: 18 }} />
                  Subscribe Now
                </button>
              </form>
            </div>
          </div>

          {/* ── Copyright ── */}
          <div className="ft-copy">
            <p>
              &copy; {new Date().getFullYear()} Anaia's Motorcycle Rental. All
              rights reserved.
            </p>
            <p>
              Designed by <span className="ft-designer">QUADCORE</span>
            </p>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;
