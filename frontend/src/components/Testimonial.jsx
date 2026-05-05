import React from "react";
import { testimonialStyles as styles } from "../assets/dummyStyles";
import testimonials from "../assets/Testimonialdata";
import { FaQuoteLeft, FaStar } from "react-icons/fa";
import { GiFullMotorcycleHelmet } from "react-icons/gi";

const Testimonial = () => {
  return (
    <div className={styles.container}>
      <div className={styles.innerContainer}>
        {/* HEADER */}
        <div className={styles.headerContainer}>
          <h1 className={styles.title}>Ride Experiences</h1>
        </div>

        {/* TESTIMONIALS CARD */}
        <div className={styles.grid}>
          {testimonials.map((t, index) => {
            const IconComponent = styles.icons[index % styles.icons.length];

            return (
              <div
                key={t.id}
                className={styles.card}
                style={{
                  clipPath:
                    "polygon(0% 10%, 10% 0%, 100% 0%, 100% 90%, 90% 100%, 0% 100%)",
                }}
              >
                <div className={styles.cardContent}>
                  <div className="flex justify-between items-start mb-6">
                    <FaQuoteLeft className={styles.quoteIcon} size={28} />
                    {/* RATING */}
                    <div className={styles.ratingContainer}>
                      {[...Array(5)].map((_, i) => (
                        <FaStar
                          key={i}
                          className={`${
                            i < t.rating ? styles.accentText : "text-gray-700"
                          } ${styles.star}`}
                          size={18}
                        />
                      ))}
                    </div>
                  </div>
                  <p className={styles.comment}>"{t.comment}"</p>

                  <div className={styles.carInfo}>
                    <GiFullMotorcycleHelmet
                      className={styles.carIcon}
                      size={20}
                    />
                    <span className={styles.carText}>{t.car}</span>
                  </div>
                  <div className={styles.authorContainer}>
                    <div className={styles.avatar}>{t.name.charAt(0)}</div>
                    <div className={styles.authorInfo}>
                      <h3 className={styles.authorName}>{t.name}</h3>
                      <p className={styles.authorRole}>{t.role}</p>
                    </div>
                  </div>
                </div>

                <div className={styles.patternIcon}>
                  <IconComponent size={36} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className={styles.bottomGradient} />
    </div>
  );
};

export default Testimonial;
