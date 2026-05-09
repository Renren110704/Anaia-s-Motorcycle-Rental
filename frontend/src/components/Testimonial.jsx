import React, { useEffect, useMemo, useState } from "react";
import { testimonialStyles as styles } from "../assets/dummyStyles";
import testimonials from "../assets/Testimonialdata";
import { FaQuoteLeft, FaStar } from "react-icons/fa";
import { GiFullMotorcycleHelmet } from "react-icons/gi";
import axios from "axios";
import API_BASE_URL from "../apiBase";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { Accept: "application/json" },
});

const Testimonial = () => {
  const [featuredTestimonials, setFeaturedTestimonials] = useState([]);

  useEffect(() => {
    let mounted = true;

    const fetchFeaturedTestimonials = async () => {
      try {
        const { data } = await api.get("/api/reviews/testimonials", {
          params: { limit: 6 },
        });
        const rows = Array.isArray(data) ? data : data.testimonials || [];
        if (!mounted) return;
        setFeaturedTestimonials(rows);
      } catch {
        // Keep static fallback when API is unavailable.
        if (!mounted) return;
        setFeaturedTestimonials([]);
      }
    };

    fetchFeaturedTestimonials();
    return () => {
      mounted = false;
    };
  }, []);

  const renderedTestimonials = useMemo(() => {
    if (featuredTestimonials.length > 0) {
      return featuredTestimonials.map((item, index) => ({
        id: item.id || `featured-${index}`,
        name: item.name || "Renter",
        role: item.role || "Renter",
        comment: item.comment || "",
        rating: Number(item.rating || 0),
        car: item.motorcycle || "Rented Motorcycle",
      }));
    }

    return testimonials;
  }, [featuredTestimonials]);

  return (
    <div className={styles.container}>
      <div className={styles.innerContainer}>
        {/* HEADER */}
        <div className={styles.headerContainer}>
          <h1 className={styles.title}>Ride Experiences</h1>
        </div>

        {/* TESTIMONIALS CARD */}
        <div className={styles.grid}>
          {renderedTestimonials.map((t, index) => {
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
