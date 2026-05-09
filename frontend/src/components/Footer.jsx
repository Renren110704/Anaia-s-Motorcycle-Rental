import React from "react";
import { footerStyles as styles } from "../assets/dummyStyles";
import { Link } from "react-router-dom";
import {
  FaEnvelope,
  FaFacebookF,
  FaMapMarkedAlt,
  FaPhone,
  FaTiktok,
} from "react-icons/fa";
import { GiCarKey } from "react-icons/gi";

const Footer = () => {
  return (
    <footer className={styles.container}>
      <div className={styles.topElements}>
        <div className={styles.roadLine} />
      </div>

      <div className={styles.innerContainer}>
        <div className={styles.grid}>
          <div className={styles.brandSection}>
            <Link to="/" className="flex items-center">
              <div className={styles.logoContainer}>
                {/* <img
                  src={logo}
                  alt="logo"
                  className="h-20 w-auto block"
                  style={{
                    display: "block",
                    objectFit: "contain",
                  }}
                /> */}
                <span className={styles.logoText}></span>
              </div>
            </Link>
            <p className={styles.description}>
              Motorcycle rental service with the latest models and exceptional
              customer services. Ride your dream motorcycle today!
            </p>

            <div className={styles.socialIcons}>
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
                  href={href}
                  key={i}
                  className={styles.socialIcon}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icon />
                </a>
              ))}
            </div>
          </div>

          {/* QUICK LINKS */}
          <div>
            <h3 className={styles.sectionTitle}>Quick Links</h3>
            <ul className={styles.linkList}>
              {["Home", "Motorcycles", "Contact Us"].map((link, i) => (
                <li key={i}>
                  <a
                    href={
                      link === "Home"
                        ? "/"
                        : link === "Contact Us"
                          ? "/contact"
                          : "/motorcycles"
                    }
                    className={styles.linkItem}
                  >
                    <span className={styles.bullet}></span>
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* CONTACT */}
          <div>
            <h3 className={styles.sectionTitle}>Contact Us</h3>

            <ul className={styles.contactList}>
              <li className={styles.contactItem}>
                <FaMapMarkedAlt className={styles.contactIcon} />
                <span>
                  Soldiers Hills IV, Block 9 Lot 1 PH2 Lily, Bacoor, 4102 Cavite
                </span>
              </li>

              <li className={styles.contactItem}>
                <FaPhone className={styles.contactIcon} />
                <span>0917 623 1426</span>
              </li>

              <li className={styles.contactItem}>
                <FaEnvelope className={styles.contactIcon} />
                <span>jpineda132020@gmail.com</span>
              </li>
            </ul>

            <div className={styles.hoursContainer}>
              <h4 className={styles.hoursTitle}>Business Hours</h4>
              <div className={styles.hoursText}>
                <p>Monday - Friday: 8:00 AM - 8:00 PM</p>
                <p>Sunday: 10:00 AM - 4:00 PM</p>
              </div>
            </div>
          </div>

          {/* NEWSLETTER */}
          <div>
            <h3 className={styles.sectionTitle}>Newsletter</h3>
            <p className={styles.newsletterText}>
              Subscribe for special offers and updates
            </p>
            <form className="space-y-3">
              <input
                type="email"
                placeholder="Your Email Address"
                className={styles.input}
                required
              />

              <button type="submit" className={styles.subscribeButton}>
                <GiCarKey className="mr-2 text-lg sm:text-xl" />
                Subscribe Now
              </button>
            </form>
          </div>
        </div>

        {/* BOTTOM COPYRIGHT */}
        <div className={styles.copyright}>
          <p>&copy; {new Date().getFullYear()}. All rights reserved.</p>
          <p className="mt-3 md:mt-0">
            Designed by{" "}
            <a
              href="https://www.facebook.com/"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.designerLink}
            >
              QUADCORE
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
