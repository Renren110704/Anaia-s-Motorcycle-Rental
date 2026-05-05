import { FaCar, FaRoad, FaKey, FaMapMarkerAlt } from "react-icons/fa";

// NAVBAR
export const navbarStyles = {
  nav: {
    base: "fixed w-full top-0 z-50 transition-all duration-500 ease-in-out",
    scrolled: `bg-[#e3e3e3] py-2 backdrop-blur-md shadow-lg shadow-black/20`,
    notScrolled: "py-4 bg-transparent",
  },

  floatingNav: {
    base: "bg-[#dfdfdf] backdrop-blur-lg w-full rounded-full shadow-lg shadow-black/20 transition-all duration-500 ease-in-out",
    scrolled: "py-2 px-4 md:px-6",
    notScrolled: "py-3 px-6 md:px-8",
  },

  logoContainer:
    "flex flex-col items-center text-xl md:text-2xl leading-none text-gray-300",
  navLinksContainer:
    "hidden md:flex md:items-center md:justify-center md:flex-1",
  navLinksInner: "flex items-center space-x-4 md:space-x-6 lg:space-x-8",

  navLink: {
    base: "px-3 py-2 rounded-md text-sm font-medium transition-all duration-300 ease-in-out",
    active: "text-[#b50002] underline underline-offset-4",
    inactive: "text-[#171717] hover:text-[#b50002]",
  },

  separator: "hidden md:block h-5 w-px bg-[#171717] mx-2",
  userActions: "hidden md:flex md:items-center md:justify-end md:gap-5",
  authButton:
    "flex items-center gap-2 cursor-pointer text-[#171717] hover:text-[#b50002] transition-all duration-300 px-3 py-2 rounded-md focus:outline-none focus:ring-1 focus:ring-[#171717]",
  authText: "text-sm font-medium",
  mobileMenuButton:
    "p-2 rounded-md text-[#171717] hover:text-[#b50002] focus:outline-none focus:ring-1 focus:ring-[#171717]",

  mobileMenu: {
    container: "md:hidden transition-all duration-300 overflow-hidden",
    open: "max-h-[400px] opacity-100",
    closed: "max-h-0 opacity-0 pointer-events-none",
  },

  mobileMenuInner:
    "bg-[#dfdfdf] shadow-lg mt-2 rounded-b-2xl mx-3 backdrop-blur-lg",
  mobileGrid: "grid grid-cols-1 sm:grid-cols-2 gap-2",

  mobileLink: {
    base: "block w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300",
    active: "text-[#b50002]",
    inactive: "text-[#171717] hover:text-[#b50002]",
  },

  divider: "border-t border-[#171717] my-1",
  mobileAuthButton:
    "w-full flex items-center px-4 py-3 text-left rounded-lg text-[#171717] hover:text-[#b50002] transition-all duration-300",
};

// HOME DESIGN
export const heroStyles = {
  container:
    "relative w-full lg:min-h-screen h-[600px] bg-[#e3e3e3] overflow-hidden flex items-center justify-center",
  background:
    "absolute pt-[45px] lg:pt-[30px] inset-0 transform-gpu will-change-transform",
  // gradientOverlay:
  //   "absolute inset-0 bg-gradient-to-b from-transparent via-black/60 to-black/20",
  svgContainer: "absolute inset-0 w-full h-full pointer-events-none z-40",
  ctaContainer:
    "relative z-10 pt-[99px] lg:pt-0 max-w-xl md:pt-[110px] w-[98%] sm:w-[62%] lg:w-[46%] mx-auto px-4",
  ctaCard:
    "relative rounded-2xl p-6 bg-transparent border border-white/10 backdrop-blur-xl shadow-2xl flex flex-col items-center text-center gap-4",
  subtitle: "text-s uppercase tracking-widest text-[#b50002] font-bold",
  title: "text-gray-300 md:text-sm text-lg sm:text-2xl font-semibold mt-1",
  description: "mt-1 text-base text-[#171717] font-semibold",
  logo: "mx-auto mb-2",
  ctaButton:
    "inline-flex items-center gap-3 px-5 py-3 rounded-full font-medium bg-gradient-to-l from-[#a00000] via-[#8f3a3a] to-[#6b2f2f] text-white hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#b50002] transition-all cursor-pointer shadow-lg shadow-black/20",
  buttonText: "text-sm",
  outline:
    "absolute -inset-1 rounded-2xl pointer-events-none ring-1 ring-white/10",
};

// LOGIN
export const loginStyles = {
  pageContainer:
    "min-h-screen flex items-center justify-center relative overflow-hidden transition-colors duration-500 bg-[#e3e3e3] px-4 sm:px-6 md:px-8 text-white",

  animatedBackground: {
    base: "absolute inset-0 z-0 overflow-hidden",
    orb1: "absolute top-1/4 left-1/5 rounded-full blur-3xl transition-all duration-1000 w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 bg-gradient-to-r from-[#900000]/60 via-[#832C2C]/30 to-[#592C2C]/10",
    orb2: "absolute top-3/4 right-1/4 rounded-full blur-3xl transition-all duration-1000 w-40 h-40 sm:w-44 sm:h-44 md:w-48 md:h-48 bg-gradient-to-r from-[#900000]/60 via-[#832C2C]/30 to-[#592C2C]/10",
    orb3: "absolute bottom-1/3 left-2/3 rounded-full blur-3xl transition-all duration-1000 w-28 h-28 sm:w-32 sm:h-32 bg-gradient-to-r from-[#900000]/60 via-[#832C2C]/30 to-[#592C2C]/10",
  },

  backButton:
    "absolute top-3 left-6 z-10 flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-3 rounded-full transition-shadow duration-300 shadow-lg shadow-black/20 hover:shadow-xl bg-white/5 text-[#171717] hover:bg-white/10",

  loginCard: {
    container:
      "w-full max-w-md sm:mt-14 z-10 transform transition-all duration-500 hover:scale-[1.02]",
    card: "backdrop-blur-xl bg-transparent relative p-6 sm:p-8 rounded-3xl transition-colors duration-500 bg-[#b9b9b9] shadow-[0_20px_40px_rgba(0,0,0,0.25)]",
    decor1:
      "absolute -top-8 -right-8 w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-[#900000]/60 via-[#832C2C]/30 to-[#592C2C]/10 blur-2xl z-0",
    decor2:
      "absolute -bottom-6 -left-6 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-[#900000]/60 via-[#832C2C]/30 to-[#592C2C]/10 blur-2xl z-0",
    headerContainer: "relative z-10 text-center mb-6 sm:mb-8",
    title:
      "mt-2 text-4xl text-[#171717] font-bold tracking-wide bg-gradient-to-r from-red-300 to-white bg-clip-text",
    subtitle:
      "mt-2 sm:mt-2 font-light tracking-wider text-xs sm:text-sm text-[#171717]",
  },

  form: {
    container: "space-y-4 sm:space-y-6",
    inputContainer: "relative z-10",
    inputWrapper: "relative",
    inputIcon:
      "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#171717]",
    input:
      "w-full pl-10 pr-3 py-3 sm:py-4 rounded-xl text-sm sm:text-base transition duration-300 focus:outline-none focus:ring-1 bg-[#c7c5c5] text-[#171717] placeholder-gray-500 border-white/10 focus:ring-[#171717] shadow-lg shadow-black/20",
    passwordToggle:
      "absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer transition-colors text-[#171717]",
    submitButton:
      `w-full py-2 px-3 rounded-xl items-center justify-center gap-2
                  font-semibold text-lg text-white
                  bg-[#b50002]
                  hover:shadow-lg
                  transition-all duration-200 ease-out
                  hover:brightness-110 active:scale-[0.98]
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#b50002] shadow-lg shadow-black/20`,
    buttonText: "relative cursor-pointer z-10 text-lg sm:text-xl",
    buttonHover: "",
  },

  signupSection:
    "mt-6 pt-6 border-t border-[#171717] text-center text-xs sm:text-sm",
  signupText: "text-[#171717]",
  signupButton:
    "inline-block mt-2 w-full cursor-pointer px-4 py-2 rounded-full font-medium transition-transform duration-300 transform hover:-translate-y-0.5 bg-transparent border border-red-400/20 text-gray-300 hover:bg-red-500/10 hover:text-white/90",
};

// SIGNUP
export const signupStyles = {
  pageContainer:
    "min-h-screen flex items-center justify-center relative overflow-hidden transition-colors duration-500 bg-[#e3e3e3] px-4 sm:px-6 md:px-8 text-white",

  animatedBackground: {
    base: "absolute inset-0 z-0 overflow-hidden",
    orb1: "absolute top-[10%] sm:top-1/4 left-[5%] sm:left-1/5 w-40 h-40 sm:w-52 sm:h-52 md:w-64 md:h-64 rounded-full transition-all duration-1000 bg-gradient-to-r from-[#900000]/60 via-[#832C2C]/30 to-[#592C2C]/10 blur-3xl",
    orb2: "absolute top-[75%] sm:top-3/4 right-[5%] sm:right-1/4 w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-full transition-all duration-1000 bg-gradient-to-r from-[#900000]/60 via-[#832C2C]/30 to-[#592C2C]/10 blur-3xl",
    orb3: "absolute bottom-[15%] sm:bottom-1/3 left-[65%] sm:left-2/3 w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full transition-all duration-1000 bg-gradient-to-r from-[#900000]/60 via-[#832C2C]/30 to-[#592C2C]/10 blur-3xl",
  },

  backButton:
    "absolute top-3 left-6 z-10 flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-3 rounded-full transition-shadow duration-300 shadow-lg shadow-black/20 hover:shadow-xl bg-white/5 text-[#171717] hover:bg-white/10",

  signupCard: {
    container:
      "w-full max-w-md sm:mt-14 z-10 transform transition-all duration-500 hover:scale-[1.02]",
    card: "backdrop-blur-xl bg-transparent relative overflow-hidden p-6 sm:p-8 rounded-3xl shadow-lg transition-colors duration-500 bg-[#b9b9b9] shadow-[0_20px_40px_rgba(0,0,0,0.25)]",
    decor1:
      "absolute -top-6 sm:-top-8 -right-6 sm:-right-8 w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-[#900000]/60 via-[#832C2C]/30 to-[#592C2C]/10 blur-2xl z-0",
    decor2:
      "absolute -bottom-4 sm:-bottom-6 -left-4 sm:-left-6 w-20 h-20 sm:w-22 sm:h-22 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-[#900000]/60 via-[#832C2C]/30 to-[#592C2C]/10 blur-2xl z-0",
    headerContainer: "relative z-10 text-center mb-6 sm:mb-8",
    title: "mt-2 text-4xl text-[#171717] font-bold tracking-wide bg-clip-text",
    subtitle:
      "mt-2 sm:mt-2 font-light tracking-wider text-xs sm:text-sm text-[#171717]",
  },

  form: {
    container: "space-y-4 sm:space-y-6",
    inputContainer: "relative z-10",
    inputWrapper: "relative",
    inputIcon:
      "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#171717]",
    input:
      "w-full pl-10 pr-3 py-3 sm:py-4 rounded-xl text-sm sm:text-base transition duration-300 focus:outline-none focus:ring-1 bg-[#c7c5c5] text-[#171717] placeholder-gray-500 border-white/10 focus:ring-[#171717] shadow-lg shadow-black/20",
    passwordToggle:
      "absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer transition-colors text-[#171717]",
    checkbox:
      "h-4 w-4 sm:h-5 sm:w-5 rounded border border-gray-500 bg-gray-700/30 focus:ring-0 accent-[#b50002]",
    checkboxLabel:
      "ml-2 sm:ml-3 text-xs sm:text-sm text-[#171717] cursor-pointer select-none",
    checkboxLink: "font-medium text-[#b50002] hover:underline",
    submitButton:
      `w-full py-2 px-4 rounded-xl items-center justify-center gap-2
                  font-semibold text-sm text-white
                  bg-[#b50002]
                  hover:shadow-lg
                  transition-all duration-200 ease-out
                  hover:brightness-110 active:scale-[0.98]
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#b50002] shadow-lg shadow-black/20`,
    buttonText: "relative cursor-pointer z-10 text-lg sm:text-xl",
    buttonHover: "",
  },

  signinSection:
    "mt-6 pt-6 border-t border-[#171717] text-center text-xs sm:text-sm",
  signinText: "text-[#171717]",
  signinButton:
    `w-full py-2 px-4 rounded-xl items-center justify-center gap-2
                  font-semibold text-sm text-white
                  bg-[#171717]
                  hover:shadow-lg
                  transition-all duration-200 ease-out
                  hover:brightness-110 active:scale-[0.98]
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#171717] shadow-lg shadow-black/20`,
};

// HOME MOTORCYCLES
export const homeCarsStyles = {
  container:
    "relative w-full overflow-hidden py-4 bg-[#e3e3e3] text-gray-100 min-h-screen",
  headerContainer:
    "relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16",
  title:
    "py-2 text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-[#b50002] mb-4 drop-shadow-[0_0_10px_rgba(1, 0, 1, 0.8)]",
  subtitle: "max-w-2xl mx-auto text-lg text-gray-400",
  grid: "relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10",
  card: "relative flex flex-col rounded-2xl overflow-hidden shadow-2xl transform-gpu transition-all duration-500 ease-out group bg-[#b9b9b9] hover:scale-[1.03]",
  priceBadge:
    "absolute top-40 md:top-50 lg:top-50 right-4 z-20 bg-[#c7c5c5] text-[#b50002] px-3 py-1.5 rounded-full font-semibold text-sm shadow-lg shadow-black/20 flex items-center",
  priceText: "bg-black bg-clip-text text-transparent",
  imageContainer: "relative h-48 sm:h-52 md:h-60 overflow-hidden",
  content: "p-6 relative z-10",
  carName: "text-xl font-bold text-[#171717]",
  carInfoContainer: "text-gray-400 flex items-center mt-1",
  carTypeBadge:
    "bg-[#c7c5c5] text-[#171717] px-2.5 py-1 rounded-full mr-2 text-xs font-medium shadow-lg shadow-black/20",
  carYear: "text-[#171717] text-sm",
  specsGrid: "grid grid-cols-4 gap-3 my-5",
  specItem: "flex flex-col items-center",
  specIconContainer: (isHovered) =>
    `p-2.5 rounded-xl mb-1.5 transition-all shadow-lg shadow-black/20 ${
      isHovered
        ? "bg-[#c7c5c5]"
        : "bg-[#c7c5c5]"
    }`,
  specIcon: (isHovered) =>
    `w-4 h-4 ${
      isHovered
        ? "text-[#b50002]"
        : "text-[#171717]"
    }`,
  specValue: "text-xs font-medium text-[#171717]",
  specLabel: "text-[10px] text-[#171717] mt-0.5",
  bookButton:
    `inline-flex items-center gap-3 px-5 py-3 rounded-full font-medium bg-gradient-to-l from-[#a00000] via-[#8f3a3a] to-[#6b2f2f] text-white hover:shadow-[0_0_22px_rgba(255,60,60,0.65)] hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#b50002] transition-all cursor-pointer
    shadow-lg shadow-black/20`,
  buttonText: "relative z-10 flex items-center",
  // accentBlur:
  //   "absolute -top-1 -right-1 w-10 h-10 rounded-bl-full bg-[#171717] blur-xl",
  borderOverlay:
    "absolute inset-0 rounded-2xl pointer-events-none",
  placeholder:
    "bg-black border-2 border-red-400/20 border-dashed rounded-xl w-full h-full flex items-center justify-center text-[#b50002]",
  // cardPatterns: [
  //   "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#900000]/20 via-gray-900/30 to-[#832C2C]/20",
  //   "bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-[#832C2C]/20 via-gray-900/30 to-[#900000]/20",
  //   "bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-[#900000]/20 via-gray-900/30 to-[#592C2C]/20",
  //   "bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-[#832C2C]/20 via-gray-900/30 to-[#900000]/20",
  //   "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#900000]/20 via-gray-900/30 to-[#832C2C]/20",
  //   "bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-[#832C2C]/20 via-gray-900/30 to-[#900000]/20",
  // ],
  // borderGradients: [
  //   "border-red-400/20",
  //   "border-[#b50002]/20",
  //   "border-[#900000]/20",
  //   "border-red-500/30",
  //   "border-[#832C2C]/20",
  //   "border-[#592C2C]/20",
  // ],
  cardShapes: [
    "clip-path: polygon(0% 15%, 15% 0%, 100% 0%, 100% 85%, 85% 100%, 0% 100%);",
    "clip-path: polygon(0% 0%, 85% 0%, 100% 15%, 100% 100%, 15% 100%, 0% 85%);",
    "clip-path: polygon(0% 0%, 100% 0%, 100% 85%, 85% 100%, 0% 100%, 0% 15%);",
    "clip-path: polygon(0% 0%, 85% 0%, 100% 15%, 100% 100%, 0% 100%, 15% 85%);",
    "clip-path: polygon(0% 15%, 15% 0%, 100% 0%, 100% 85%, 85% 100%, 0% 100%);",
    "clip-path: polygon(0% 0%, 85% 0%, 100% 15%, 100% 100%, 15% 100%, 0% 85%);",
  ],
};

// MOTORCYCLE DETAILS
export const motorcycleDetailStyles = {
  pageContainer:
    "relative min-h-screen overflow-hidden py-6 px-4 sm:px-6 lg:px-8 bg-[#e3e3e3]",
  contentContainer: "relative z-10 max-w-7xl mx-auto",
  backButton:
    `absolute left-0 flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-3 rounded-full
                      transition-all duration-300 shadow-lg shadow-black/20
                      bg-[#e3e3e3] text-[#171717]
                      hover:scale-[1.03]`,
  backButtonIcon: "text-[#b50002] text-lg",
  mainLayout: "pt-12 flex flex-col lg:flex-row gap-8",
  leftColumn: "lg:w-2/3 space-y-6 mt-4",
  imageCarousel:
    "relative rounded-2xl overflow-hidden shadow-lg aspect-[16/9] bg-[#b9b9b9] shadow-lg shadow-black/20",
  motorcycleImage: "w-full h-full object-contain",
  carouselIndicators: "absolute bottom-4 right-4 flex space-x-2",
  carouselIndicator: (active) =>
    `w-3 h-3 rounded-full ${active ? "bg-[#b50002]" : "bg-gray-500"}`,
  motorcycleName:
    "text-2xl sm:text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-[#171717]",
  motorcyclePrice: "text-xl sm:text-2xl md:text-3xl font-bold text-[#171717]",
  pricePerDay: "text-base sm:text-lg font-normal text-[#171717]",
  specsGrid: "grid grid-cols-2 sm:grid-cols-4 gap-4",
  specCard:
    "flex flex-col items-center bg-[#b9b9b9] backdrop-blur-sm p-3 sm:p-4 rounded-xl border border-[#b9b9b9] hover:border-[#171717] transition-all shadow-lg shadow-black/20",
  specIcon: "text-xl sm:text-2xl mb-2 text-[#b50002]",
  specLabel: "text-xs sm:text-sm text-black",
  specValue: "font-semibold text-base sm:text-lg text-[#171717]",
  aboutSection:
    "bg-[#b9b9b9] backdrop-blur-sm p-4 sm:p-6 rounded-xl space-y-3 shadow-lg shadow-black/20",
  aboutTitle: "text-xl sm:text-2xl font-semibold text-[#171717]",
  aboutText: "text-[#171717] text-sm sm:text-base",
  rightColumn: "lg:w-1/3 mt-4",
  bookingCard:
    "bg-[#b9b9b9] backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-xl space-y-4 shadow-lg shadow-black/20",
  bookingTitle: "text-2xl sm:text-2xl font-bold text-[#171717]",
  bookingSubtitle: "text-[#171717] text-sm",
  form: "space-y-4",
  grid2: "grid grid-cols-2 gap-3",
  formLabel: "text-xs sm:text-sm text-[#171717] font-semibold mb-1",
  inputContainer: (active) =>
    `relative rounded-lg transition-all ${
      active ? "border-[#b50002]" : "border-red-400/20"
    }`,
  inputIcon: "absolute left-3 top-2.5 text-[#b50002]",
  inputField:
    "w-full pl-10 pr-2 py-1.5 sm:py-2 bg-[#c7c5c5] text-[#171717] text-sm sm:text-base outline-none placeholder:text-gray-500 focus:ring-1 focus:ring-[#171717] rounded-lg shadow-lg shadow-black/20",
  textInputField:
    "w-full pl-10 pr-3 py-1.5 sm:py-2 bg-[#c7c5c5] text-[#171717] text-sm sm:text-base outline-none placeholder:text-gray-500 focus:ring-1 focus:ring-[#171717] rounded-lg shadow-lg shadow-black/20",
  priceBreakdown:
    "bg-[#c7c5c5] p-3 rounded-lg text-sm space-y-1 shadow-lg shadow-black/20",
  priceRow: "flex justify-between text-[#171717]",
  totalRow:
    "border-t border-[#171717] pt-1 flex justify-between font-semibold text-[#171717]",
  submitButton:
    "w-full flex items-center justify-center py-2.5 rounded-lg bg-[#b50002] hover:shadow-lg cursor-pointer text-gray-100 font-bold shadow-lg shadow-black/20 hover:brightness-110 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#b50002] transition-all",
};

// USER REVIEWS
export const testimonialStyles = {
  container: "relative bg-[#e3e3e3] py-16 px-4 sm:px-6 lg:px-8 overflow-hidden",
  innerContainer: "max-w-7xl mx-auto relative z-10",
  headerContainer: "text-center mb-16",
  badge:
    "inline-flex items-center px-5 py-2 rounded-full bg-red-500/10 backdrop-blur-sm border border-red-400/20 mb-5",
  badgeText: "text-sm font-medium text-[#b50002]",
  title:
    "text-4xl py-2 md:text-5xl font-bold bg-clip-text text-transparent bg-[#b50002] mb-4 drop-shadow-[0_0_10px_rgba(1, 0, 1, 0.8)]",
  accentText: "text-[#b50002]",
  dividerContainer: "flex justify-center items-center mb-5",
  dividerLine: "h-0.5 w-16 sm:w-20 bg-gray-300 rounded-full",
  subtitle: "text-lg text-gray-400 max-w-3xl mx-auto",
  grid: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8",
  card: "relative rounded-2xl overflow-hidden transform transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl",
  cardContent: "p-6 sm:p-8 relative z-10 bg-[#b9b9b9]",
  quoteIcon: "text-[#171717]",
  ratingContainer: "flex",
  star: "mr-1 text-[#b50002]",
  comment: "text-[#171717] italic text-lg mb-8",
  carInfo:
    "flex items-center mb-6 bg-[#c7c5c5] px-4 py-3 rounded-xl shadow-lg shadow-black/20",
  carIcon: "text-[#171717] mr-3",
  carText: "font-semibold text-[#171717] text-base",
  authorContainer: "flex items-center",
  avatar:
    "bg-gradient-to-br from-[#171717] via-[#171717] to-[#b50002]/80 w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl",
  authorInfo: "ml-4",
  authorName: "font-bold text-[#171717] text-lg",
  authorRole: "text-[#171717] text-sm",
  decorativeCorner:
    "absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-[#832C2C]/70 to-[#900000]/90 transform translate-x-6 -translate-y-6 rotate-45 opacity-30",
  patternIcon: "absolute bottom-4 right-4 text-gray-700 opacity-10",
  statsContainer:
    "mt-20 bg-gradient-to-r from-black to-gray-900 rounded-2xl border border-red-400/20 overflow-hidden relative",
  statsGrid: "grid grid-cols-2 md:grid-cols-4 gap-8 p-8",
  statItem: "text-center",
  statValue: (color) => `text-4xl sm:text-5xl font-bold ${color} mb-2`,
  statLabel: (color) => `text-sm ${color} font-medium`,
  ctaContainer: "mt-20 text-center",
  ctaTitle:
    "text-3xl font-bold text-transparent bg-clip-text bg-gray-300 font-[pacifico] mb-4 drop-shadow-[0_0_10px_rgba(1, 0, 1, 0.8)]",
  ctaText: "text-gray-300 max-w-2xl mx-auto mb-8",
  ctaButton:
    "bg-gradient-to-br from-[#900000]/90 via-[#832C2C]/70 to-[#592C2C]/60 hover:from-[#a00000] hover:via-[#8f3a3a] hover:to-[#6b2f2f] text-white font-bold py-3 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-[0_0_12px_rgba(255,0,0,0.45)] hover:shadow-[0_0_22px_rgba(255,60,60,0.65)]",
  // bottomGradient:
  //   "absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black to-transparent z-0",
  cardShapes: [
    "clip-path: polygon(0% 10%, 10% 0%, 100% 0%, 100% 90%, 90% 100%, 0% 100%);",
    "clip-path: polygon(0% 0%, 90% 0%, 100% 10%, 100% 100%, 10% 100%, 0% 90%);",
    "clip-path: polygon(0% 0%, 100% 0%, 100% 90%, 90% 100%, 0% 100%, 0% 10%);",
  ],
  icons: [FaCar, FaRoad, FaKey, FaMapMarkerAlt],
  statColors: {
    value: [
      "text-[#b50002]",
      "text-[#900000]",
      "text-[#832C2C]",
      "text-[#592C2C]",
    ],
    label: [
      "text-red-300",
      "text-red-400",
      "text-red-500/80",
      "text-red-600/80",
    ],
  },
};

// FOOTER
export const footerStyles = {
  container:
    "relative bg-black text-gray-100 pt-16 sm:pt-20 md:pt-24 overflow-hidden",
  topElements: "absolute top-0 left-0 w-full h-32 sm:h-40 md:h-48",
  circle1:
    "absolute top-0 left-1/4 w-36 h-36 sm:w-48 sm:h-48 md:w-56 md:h-56 rounded-full bg-red-500/10 blur-3xl",
  circle2:
    "absolute top-0 right-1/3 w-48 h-48 sm:w-64 sm:h-64 md:w-72 md:h-72 rounded-full bg-[#b50002]/10 blur-3xl",
  roadLine:
    "absolute top-12 w-full h-0.5 bg-gradient-to-r from-transparent via-[#b50002] to-transparent",
  innerContainer: "relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
  grid: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 md:gap-12",
  brandSection: "space-y-4",
  logoContainer:
    "flex flex-col items-center text-xl md:text-2xl lg:text-2xl leading-none",
  logoText: "font-bold tracking-wider text-white",
  description: "text-gray-400 text-sm sm:text-base",
  socialIcons: "flex space-x-3 sm:space-x-4",
  socialIcon:
    "w-8 h-8 sm:w-10 sm:h-10 bg-red-500/10 hover:bg-[#b50002]/20 transition-colors rounded-full flex items-center justify-center text-sm sm:text-base text-gray-300",
  sectionTitle:
    "text-lg sm:text-xl font-bold mb-4 relative pb-1 text-[#e3e3e3]",
  underline: "absolute left-0 bottom-0 block h-0.5 w-12 sm:w-16 bg-[#b50002]",
  linkList: "space-y-2 sm:space-y-3 text-gray-400 text-sm sm:text-base",
  linkItem: "flex items-center hover:text-[#b50002] transition-colors",
  bullet: "w-2 h-2 bg-[#b50002] rounded-full mr-2",
  contactList: "space-y-3 text-gray-400 text-sm sm:text-base",
  contactItem: "flex items-start",
  contactIcon: "text-[#b50002] mt-1 mr-2",
  hoursContainer: "mt-4 sm:mt-6",
  hoursTitle: "font-medium text-sm sm:text-base mb-2 text-gray-300",
  hoursText: "text-gray-400 text-xs sm:text-sm space-y-1",
  newsletterText: "text-gray-400 text-sm sm:text-base mb-3",
  input:
    "w-full bg-[#c7c5c5] rounded-lg py-2 px-3 sm:py-3 sm:px-4 focus:outline-none focus:ring-1 focus:ring-[#171717] text-[#171717] text-sm sm:text-base placeholder-gray-500",
  subscribeButton:
    "w-full justify-center flex items-center gap-2 py-3 bg-[#b50002] text-white text-sm font-bold rounded-xl shadow-lg shadow-[#171717]/30 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] transition-all" ,
  copyright:
    "border-t border-red-400/20 mt-10 sm:mt-12 pb-4 flex flex-col md:flex-row justify-between items-center text-gray-500 text-sm sm:text-base",
  designerLink: "underline text-gray-400 hover:text-[#b50002]",
};

// CONTACT PAGE
export const contactPageStyles = {
  container:
    "relative min-h-screen py-8 px-4 sm:px-6 lg:px-8 overflow-hidden bg-[#e3e3e3]",
  diamondPattern: "absolute inset-0 opacity-9 pointer-events-none",
  floatingTriangles: "absolute inset-0 pointer-events-none",
  triangle: "absolute w-6 h-6 opacity-10",
  content: "relative z-10 pt-20 max-w-4xl mx-auto",
  titleContainer: "text-center mb-8 sm:0 mb-1 md:mb-12",
  title:
    "py-2 relative text-3xl mt-12 sm:text-4xl md:text-5xl font-bold mb-2 z-10 bg-[#b50002] bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(1, 0, 1, 0.8)]",
  subtitle: "text-gray-400 max-w-2xl mx-auto text-sm sm:text-base",
  cardContainer: "flex flex-col md:flex-row gap-6",
  infoCard:
    "md:w-2/5 bg-[#b9b9b9] backdrop-blur-sm rounded-2xl shadow-lg p-5 sm:p-6 relative overflow-hidden shadow-lg shadow-black/20",
  infoCardCircle1:
    "absolute -top-4 -right-4 w-16 h-16 bg-red-500/10 rounded-full",
  infoCardCircle2:
    "absolute -bottom-4 -left-4 w-14 h-14 bg-[#b50002]/10 rounded-full",
  infoTitle: "text-xl sm:text-xl font-semibold text-[#171717] flex items-center",
  infoIcon: "mr-3 text-[#b50002] text-lg",
  infoItemContainer: "space-y-3",
  infoItem:
    "flex items-start bg-[#c7c5c5] p-3 rounded-lg hover:border-[#171717] border border-[#c7c5c5] transition-all",
  iconContainer: (color) => `p-2 rounded-md mr-3 ${color}`,
  infoLabel: "font-medium text-[#171717] text-sm sm:text-base",
  infoValue: "text-[#171717] text-xs sm:text-sm",
  offerContainer: "mt-4 bg-red-500/10 p-3 rounded-lg border border-red-400/20",
  offerIcon: "text-[#b50002] mr-2",
  offerTitle: "text-gray-300 font-medium text-sm sm:text-base",
  offerText: "text-gray-400 text-xs sm:text-sm mt-1",
  formCard:
    "md:w-3/5 bg-[#b9b9b9] backdrop-blur-sm rounded-2xl shadow-lg p-5 sm:p-6 relative overflow-hidden",
  formCircle1: "absolute top-0 right-0 w-16 h-16 bg-red-500/10 rounded-bl-full",
  formCircle2:
    "absolute bottom-0 left-0 w-14 h-14 bg-red-500/10 rounded-tr-full",
  formTitle:
    "text-lg sm:text-xl font-semibold text-[#171717] mb-1 flex items-center",
  formSubtitle: "text-[#171717] text-sm",
  form: "space-y-3",
  formGrid: "grid grid-cols-1 md:grid-cols-2 gap-3",
  inputContainer: "relative",
  inputIcon: "absolute inset-y-0 left-0 pl-3 flex items-center text-[#b50002]",
  input: (isActive) =>
    `w-full pl-10 pr-3 py-2 bg-[#c7c5c5] text-[#171717] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#171717] text-sm transition-all placeholder-gray-500`,
  select: (isActive) =>
    `w-full pl-10 pr-3 py-2 bg-[#c7c5c5] cursor-pointer text-[#171717] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#171717] text-sm appearance-none transition-all`,
  textareaIcon: "absolute top-2.5 left-3 text-[#b50002]",
  textarea: (isActive) =>
    `w-full pl-10 pr-3 py-2 bg-[#c7c5c5] text-[#171717] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#171717] text-sm transition-all placeholder-gray-500`,
  submitButton:
    "w-full cursor-pointer flex items-center justify-center py-2.5 bg-[#b50002] hover:shadow-lg hover:brightness-110 active:scale-[0.98] rounded-lg text-gray-100 font-medium text-sm transition-all transform mt-2",
  whatsappIcon:
    "ml-2 text-lg transform group-hover:scale-110 transition-transform text-[#b50002]",
};

// MOTORCYCLE LISTS
export const carPageStyles = {
  pageContainer:
    "relative min-h-screen py-8 pt-12 sm:py-12 md:py-16 px-4 sm:px-6 lg:px-8 overflow-hidden bg-[#e3e3e3]",
  contentContainer: "relative z-10 max-w-7xl mx-auto",
  headerContainer: "text-center mb-10 sm:mb-12 pt-14 md:mb-16",
  title:
    "py-2 elative text-3xl mt-10 sm:text-4xl md:text-5xl font-bold mb-2 z-10 bg-[#b50002] bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(1, 0, 1, 0.8)]",
  subtitle: "text-gray-400 max-w-2xl mx-auto text-sm sm:text-base",
  gridContainer:
    "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8 md:gap-10",
  carCard:
    "group relative rounded-2xl overflow-hidden shadow-xl transition-all duration-300 hover:-translate-y-1 bg-[#b9b9b9] shadow-lg shadow-black/20",
  glowEffect:
    "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none",
  imageContainer: "relative h-48 sm:h-52 md:h-56 overflow-hidden",
  carImage:
    "w-full h-full object-cover transition-transform duration-500 group-hover:scale-105",
  priceBadge:
    "absolute bottom-3 left-3 bg-[#c7c5c5] text-[#171717] px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold shadow-lg shadow-black/20",
  cardContent: "p-4 sm:p-5 md:p-6",
  headerRow: "flex justify-between items-center mb-4",
  carName: "text-lg sm:text-xl font-bold text-[#171717]",
  carType: "text-sm text-[#171717]",
  specsGrid: "grid grid-cols-2 gap-3 mb-5 text-sm",
  specItem: "flex items-center space-x-2",
  specIconContainer:
    "bg-[#c7c5c5] p-1.5 rounded-lg group-hover:border-[#b50002] transition-colors shadow-lg shadow-black/20 text-[#171717]",
  bookButton:
    `inline-flex items-center gap-3 px-5 py-3 rounded-full font-medium bg-gradient-to-l from-[#a00000] via-[#8f3a3a] to-[#6b2f2f] text-white hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#b50002] transition-all cursor-pointer
    shadow-lg shadow-black/20`,
  buttonText: "group-hover:tracking-wider transition-all text-gray-300",
  buttonIcon:
    "ml-3 h-4 w-4 text-gray-300 transition-transform group-hover:translate-x-1",
  decor1:
    "absolute -top-16 -left-16 w-32 h-32 rounded-full bg-gradient-to-r from-[#900000]/10 via-[#832C2C]/10 to-[#592C2C]/10 blur-3xl z-0",
  decor2:
    "absolute -bottom-20 -right-20 w-40 h-40 rounded-full bg-gradient-to-r from-[#900000]/10 via-[#832C2C]/10 to-[#592C2C]/10 blur-3xl z-0",
};

// USER BOOKINGS
export const myBookingsStyles = {
  // Page container
  pageContainer:
    "min-h-screen bg-[#e3e3e3] pt-40 text-white py-12 px-4 sm:px-6 lg:px-8",

  // Title
  title:
    "py-2 relative text-3xl sm:text-4xl md:text-5xl font-bold mb-2 z-10 bg-[#b50002] bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(1, 0, 1, 0.8)]",
  subtitle: "text-gray-400 max-w-2xl mx-auto text-sm sm:text-base",

  // Filter buttons
  filterButton: (isActive, type) => {
    const base =
      "px-4 py-2 rounded-full flex items-center gap-2 transition-all";
    if (!isActive) return `${base} bg-[#b9b9b9] text-[#171717] hover:bg-[#b50002] hover:text-white shadow-lg shadow-black/20`;

    switch (type) {
      case "all":
        return `${base} bg-[#b50002] text-white shadow-lg shadow-black/20`;
      case "pending":
        return `${base} bg-[#b50002] text-white shadow-lg shadow-black/20`;
      case "active":
        return `${base} bg-[#b50002] text-white shadow-lg shadow-black/20`;
      case "completed":
        return `${base} bg-[#b50002] text-white shadow-lg shadow-black/20`;
      case "cancelled":
        return `${base} bg-[#b50002] text-white shadow-lg shadow-black/20`;
      default:
        return base;
    }
  },

  // Loading spinner
  loadingSpinner:
    "animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#b50002]",

  // Error state
  errorContainer:
    "text-center py-8 bg-gray-800/50 rounded-2xl border border-gray-700",
  errorText: "text-red-500", 
  retryButton:
    "mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg",

  // Empty state
  emptyState: "text-center py-16 bg-[#b9b9b9] rounded-2xl shadow-lg shadow-black/20",
  emptyIconContainer:
    "mx-auto flex items-center justify-center mb-6",
  emptyIcon: "text-5xl text-[#171717]",
  emptyTitle: "text-2xl font-semibold mb-2 text-[#171717]",
  emptyText: "text-[#171717] max-w-md mx-auto",
  browseButton:
  "mt-6 mx-auto flex cursor-pointer items-center justify-center py-2.5 bg-[#b50002] hover:shadow-lg hover:brightness-110 active:scale-[0.98] rounded-lg text-gray-100 font-medium text-sm transition-all transform mt-2 w-48",

  // Booking card
  bookingCard:
    "bg-[#b9b9b9] rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-transform shadow-lg shadow-black/20",
  cardImageContainer: "relative h-48 overflow-hidden",
  cardImage:
    "w-full h-full object-contain transition-transform duration-500 hover:scale-105",
  cardContent: "p-5",
  cardHeader: "flex justify-between items-start mb-3",
  carTitle: "text-xl font-bold text-[#171717]",
  carSubtitle: "text-[#171717]",
  priceText: "text-[#171717] font-bold text-xl",
  daysText: "text-[#171717] text-sm",
  detailSection: "space-y-4 mt-2 pt-4 border-t border-[#171717]",
  detailItem: "flex items-center gap-3",
  detailIcon:
    "w-10 h-10 flex items-center justify-center text-[#171717] text-xl",
  detailLabel: "text-[#171717] text-sm",
  detailValue: "font-medium text-[#171717]",
  cardActions: "mt-6 pt-4 flex gap-3",
  viewDetailsButton:
    "flex-1 py-2 px-4 bg-[#171717] hover:shadow-lg hover:brightness-110 active:scale-[0.98] rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-black/20",
  bookAgainButton:
    "flex-1 py-2 px-4 bg-[#b50002] hover:shadow-lg hover:brightness-110 active:scale-[0.98] rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-black/20",

  // Stats cards
  statsCard: "bg-[#b9b9b9] p-6 rounded-2xl border border-[#b9b9b9] hover:border-[#171717] shadow-lg shadow-black/20",
  statsValue: (color) => `text-3xl font-bold text-[#171717] mb-2`,
  statsLabel: "text-[#171717]",

  // Modal
  modalOverlay:
    "fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4",
  modalContainer:
    "bg-[#b9b9b9] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto",
  modalHeader: "flex justify-between items-center mb-6",
  modalTitle: "text-2xl font-bold flex items-center gap-2 text-[#171717]",
  modalCloseButton:
    "text-[#171717] text-xl",
  cancelButton:
    "flex-1 mr-6 py-2 px-4 bg-[#b50002] hover:shadow-lg hover:brightness-110 active:scale-[0.98] rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-black/20",
  modalContent: "p-6",
  modalGrid: "grid grid-cols-1 md:grid-cols-2 gap-6 mb-8",
  carImageModal: "w-full h-48 object-contain rounded-xl",
  carTags: "flex flex-wrap gap-2 mt-2",
  carTag:
    "px-2 py-1 bg-black-700 border border-[#171717] rounded text-sm text-[#171717]",
  infoGrid: "mt-4 grid grid-cols-2 gap-3",
  infoLabel: "text-[#171717] text-sm",
  infoValue: "font-medium text-[#171717]",
  priceValue: "font-medium text-[#171717]",
  infoCard: "bg-[#c7c5c5] p-4 rounded-xl mb-4 shadow-lg shadow-black/20",
  infoRow: "flex justify-between mb-2",
  infoDivider: "mt-3 pt-3 border-t border-[#171717]",
  modalActions: "flex gap-4",
  closeButton:
    "flex-1 py-2 px-4 bg-[#171717] hover:shadow-lg hover:brightness-110 active:scale-[0.98] rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-black/20",
  modalBookButton:
    "flex-1 py-2 px-4 bg-[#b50002] hover:shadow-lg hover:brightness-110 active:scale-[0.98] rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-black/20",
};
