import React from "react";
import Navbar from "../components/Navbar";
import HomeBanner from "../components/HomeBanner";
import HomeMotorcycles from "../components/HomeMotorcycles";
import Testimonial from "../components/Testimonial";
import Footer from "../components/Footer";

const Home = () => {
  return (
    <div>
      <Navbar />
      <HomeBanner />
      <HomeMotorcycles />
      <Testimonial />
      <Footer />
    </div>
  );
};

export default Home;
