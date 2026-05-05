export const styles = {
  // Common gradient backgrounds
  gradientblue: "bg-gradient-to-br from-blue-900/30 to-blue-900/30",
  gradientGray: "bg-gradient-to-br from-gray-900/50 to-gray-900/30",
  gradientGrayToGray: "bg-gradient-to-br from-gray-900 to-gray-800",

  // Common borders and transitions
  borderGray: "border border-gray-800",
  borderHoverblue: "hover:border-red-500/50 transition-all",
  borderblue: "border border-blue-800/50",

  // Common rounded corners
  rounded2xl: "rounded-2xl",
  roundedXl: "rounded-xl",
  roundedLg: "rounded-lg",
  roundedFull: "rounded-full",

  // Common text colors
  textWhite: "text-white",
  textGray: "text-red-400",
  textGray300: "text-gray-300",
  textblue: "text-blue-400",
  textRed: "text-red-400",

  // Common button styles
  buttonPrimary:
    "px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-600 text-white",
  buttonSecondary:
    "bg-gray-800/50 border border-gray-700 px-5 py-2.5 text-gray-300 rounded-xl",

  // Common input styles
  inputField:
    "w-full pr-4 py-3 bg-[#c7c5c5] p-4 rounded-xl focus:outline-none focus:border-[#b50002] text-[#171717] transition-colors shadow-lg shadow-black/20 focus:ring-1 focus:ring-[#171717]",

  // Component-specific styles
  statCard: "p-4 w-full bg-[#b9b9b9] border border-[#b9b9b9] mt-4",
  carCard: "overflow-hidden duration-300",
  carImage: "w-full h-48 object-cover",
  statusBadge:
    "px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full",
  modalOverlay:
    "fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50",
  modalContainer: "shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto",
  noCarsContainer: "text-center py-16 rounded-2xl mt-8",
  filterSelect: "p-5 w-full max-w-xs",
};

export const bookStyles = {
  // Common gradient backgrounds
  gradientblue: "bg-gradient-to-br from-blue-900/30 to-blue-900/30",
  gradientGray: "bg-gradient-to-br from-gray-900/50 to-gray-900/30",
  gradientGrayToGray: "bg-gradient-to-br from-gray-900 to-gray-800",
  gradientGrayToGrayLight: "bg-gradient-to-br from-gray-900/30 to-gray-900/10",
  gradientblueToblue: "bg-gradient-to-br from-blue-800/50 to-blue-800/50",
  gradientblueToblueSolid: "bg-gradient-to-br from-blue-700 to-blue-700",

  // Common borders and transitions
  borderGray: "border border-gray-800",
  borderHoverblue: "hover:border-blue-500/50 transition-all",
  borderblue: "border border-blue-800/30",
  borderblueLight: "border border-blue-800/50",

  // Common rounded corners
  rounded2xl: "rounded-2xl",
  roundedXl: "rounded-xl",
  roundedLg: "rounded-lg",
  roundedFull: "rounded-full",

  // Common text colors
  textWhite: "text-white",
  textGray: "text-gray-400",
  textGray300: "text-gray-300",
  textblue: "text-blue-400",
  textRed: "text-red-400",
  textGreen: "text-green-400",

  // Common button styles
  buttonPrimary:
    "px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-600 text-white",
  buttonSecondary:
    "bg-gray-800/50 border border-gray-700 px-5 py-2.5 text-gray-300 rounded-xl",
  buttonSuccess:
    "bg-gradient-to-r from-green-700/50 to-green-800/50 text-green-300 hover:text-white transition-colors text-sm px-3 py-1 rounded-lg",
  buttonCancel:
    "bg-gradient-to-r from-gray-800/50 to-gray-900/50 text-gray-400 hover:text-gray-200 text-sm px-3 py-1 rounded-lg",
  buttonEdit:
    "bg-gradient-to-r from-blue-700/50 to-blue-700/50 text-blue-300 hover:text-white text-sm px-3 py-1 rounded-lg",

  // Common input styles
  inputField:
    "bg-gray-800/50 border border-gray-700 w-full px-4 py-2.5 text-gray-200 rounded-lg",
  inputFieldWithIcon:
    "bg-gray-800/50 border border-gray-700 w-full px-4 py-2.5 pl-10 text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500",

  // Status styles
  statusCompleted: "bg-green-900/20 text-green-400",
  statusPending: "bg-blue-900/20 text-blue-400",
  statusActive: "bg-blue-900/20 text-blue-400",
  statusCancelled: "bg-red-900/20 text-red-400",
  statusDefault: "bg-gray-900/30 text-gray-400",

  // Component-specific styles
  statCard: "p-5 w-full max-w-xs",
  carCard: "overflow-hidden duration-300",
  carImage: "w-full h-48 object-cover",
  statusBadge:
    "px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full",
  modalOverlay:
    "fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50",
  modalContainer: "shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto",
  noItemsContainer: "text-center py-16 rounded-2xl border border-gray-800",
  filterSelect: "p-5 w-full max-w-xs",
  panel:
    "bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 border border-gray-800",
  specItem:
    "flex flex-col items-center p-3 rounded-xl border border-gray-800 hover:border-blue-500/50 transition-all",
  detailItem: "flex items-start",
  bookingCard:
    "backdrop-blur-sm rounded-2xl overflow-hidden border border-gray-800 hover:border-blue-500/50 transition-all duration-300",
  searchFilterBar:
    "backdrop-blur-sm rounded-2xl p-5 mb-6 border border-gray-800",
};

export const AddCarPageStyles = {
  // Page
  pageContainer:
    "min-h-screen pt-40 bg-[#e3e3e3] text-white py-12 px-4 sm:px-6 lg:px-8",
  fixedBackground: "fixed inset-0 overflow-hidden pointer-events-none",

  // Header — compact
  headerContainer: "text-center mb-8",
  headerDivider: "absolute inset-x-0 top-0 flex justify-center",
  title:
    "py-2 relative text-3xl sm:text-4xl md:text-5xl font-bold mb-2 z-10 bg-[#b50002] bg-clip-text text-transparent",
  subtitle: "text-[#171717]/40 max-w-2xl mx-auto text-xs",

  // Form card
  formContainer:
    "max-w-6xl mx-auto p-6 bg-white/40 backdrop-blur-md rounded-2xl shadow-xl shadow-black/10",
  form: "p-5 sm:p-6",
  formGrid: "grid grid-cols-1 lg:grid-cols-2 gap-6",
  formColumn: "space-y-3",
  formGridInner: "grid grid-cols-2 gap-3",

  // Labels — tiny, uppercase, spaced
  label: "text-[#171717]/70 text-xs font-semibold uppercase tracking-wider",
  labelWithIcon:
    "flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-[#b50002] mb-1",

  // Inputs — slim py-2
  input:
    "",

  inputWithPrefix:
    "",

  select:
    "",

  textarea:
    "w-full px-4 py-3 bg-transparent text-[#171717] text-sm focus:outline-none placeholder-[#171717]/30 resize-none",

  // Radio
  radioContainer: "flex space-x-3",
  radioLabel: (isSelected) =>
    `flex-1 flex items-center justify-center gap-2 p-2 rounded-lg cursor-pointer transition-all border text-sm ${
      isSelected
        ? "bg-[#171717]/10 border-[#171717]/40"
        : "bg-white/70 border-[#171717]/10 hover:bg-white/90"
    }`,
  radioInput: "sr-only",
  radioText: "text-[#171717] text-xs font-medium",

  // Image upload — shorter height
  imageUploadContainer: "w-full rounded-xl",
  imageUploadLabel:
    "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[#171717]/15 rounded-xl cursor-pointer transition-all bg-white/50 hover:bg-white/70 hover:border-[#171717]/40 group",
  imageUploadPlaceholder: "flex flex-col items-center justify-center gap-1",
  imageUploadIcon: "w-6 h-6 text-[#171717]/20",
  imageUploadText:
    "text-xs text-[#171717]/40 text-center group-hover:text-[#171717]/60 transition-colors",
  imageUploadTextSemibold:
    "font-semibold text-[#171717]/60 group-hover:text-[#171717] transition-colors",
  imageUploadSubText: "text-[10px] text-[#171717]/25",

  // Button
  submitButton:
    "px-8 py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold text-sm text-white bg-[#171717] shadow-lg shadow-[#171717]/25 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 focus:outline-none",
  buttonText: "text-sm font-bold tracking-wide",

  // Icons
  iconUpload:
    "w-6 h-6 mb-1 text-[#171717]/20 group-hover:text-[#171717]/40 transition-colors",
};

export const toastStyles = {
  success: {
    container: "",
    body: "",
  },
  error: {
    container: "",
    body: "",
  },
};

export const BookingPageStyles = {
  // Page background and layout
  pageContainer:
    "min-h-screen bg-[#e3e3e3] pt-40 text-white py-12 px-4 sm:px-6 lg:px-8",
  fixedBackground: "fixed inset-0 overflow-hidden pointer-events-none",
  gradientBlob1:
    "absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-gradient-to-r from-blue-600 to-blue-800 blur-3xl opacity-10",
  gradientBlob2:
    "absolute bottom-1/3 right-1/4 w-56 h-56 rounded-full bg-gradient-to-r from-blue-600 to-blue-800 blur-3xl opacity-10",
  gradientBlob3:
    "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 rotate-45 bg-gradient-to-r from-blue-500 to-blue-500 blur-xl opacity-10",

  // Header
  headerContainer: "text-center mb-8 sm:0 mb-1md:mb-12",
  headerDivider: "absolute inset-x-0 top-0 flex justify-center",
  title:
    "py-2 relative text-3xl sm:text-4xl md:text-5xl font-bold mb-2 z-10 bg-[#b50002] bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(1, 0, 1, 0.8)]",
  titleGradient:
    "text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-400",
  subtitle: "text-slate-400 max-w-2xl mx-auto text-sm sm:text-base",

  // Search and Filter
  searchFilterContainer:
    "bg-[#b9b9b9] backdrop-blur-sm rounded-2xl p-5 mb-6 shadow-lg shadow-black/20",
  searchFilterGrid: "grid grid-cols-1 md:grid-cols-3 gap-4",
  filterLabel: "block text-sm font-medium text-[#171717] mb-2",
  filterInput:
    "bg-[#c7c5c5] shadow-lg shadow-black/20 w-full px-4 py-2.5 pl-10 text-[#171717] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#171717] placeholder-gray-500",
  filterIconContainer: "absolute left-3 top-4 text-[#171717]",
  totalBookingsContainer:
    "bg-[#c7c5c5] shadow-lg shadow-black/20 rounded-lg p-4 flex items-center justify-center",
  totalBookingsLabel: "text-[#171717] text-lg font-bold mb-1",
  totalBookingsValue: "text-xl text-[#171717]",

  // Booking Card
  bookingCard:
    "bg-[#b9b9b9] backdrop-blur-sm rounded-2xl overflow-hidden border-[#b9b9b9] border hover:border-[#171717] transition-all duration-300 shadow-lg shadow-black/20",
  bookingCardHeader: "flex items-center mb-4 md:mb-0",
  bookingIconContainer: "p-3 mr-4",
  bookingIcon: "text-[#b50002] text-3xl",
  bookingCustomer: "text-lg font-bold text-[#171717]",
  bookingEmail: "text-sm text-[#171717]",
  bookingExpandIcon: "flex items-center text-gray-300 ml-auto md:hidden",
  bookingInfoGrid: "grid grid-cols-2 sm:grid-cols-4 gap-4",
  bookingInfoLabel: "text-base text-[#171717] font-bold",
  bookingInfoValue: "text-sm text-[#171717]",
  bookingAmount: "text-sm font-semibold text-[#171717]",
  bookingActions: "flex justify-between items-center mt-4",
  bookingActionButton: (color) =>
    `bg-gradient-to-r from-${color}-700/50 to-${color}-800/50 text-${color}-300 hover:text-white transition-colors text-sm px-3 py-1 rounded-lg`,
  bookingEditButton:
    "flex items-center text-[#171717] hover:text-green-800 transition-colors",
  bookingDetails: "border-t border-[#c7c5c5] p-5 bg-[#b9b9b9]",
  bookingDetailsGrid: "grid grid-cols-1 md:grid-cols-2 gap-6",

  // Panel
  panel: "bg-[#c7c5c5] backdrop-blur-sm rounded-xl p-4",
  panelTitle: "text-md font-bold text-[#171717] mb-4 flex items-center",
  panelIcon: "mr-2 text-[#171717]",

  // Detail
  detailContainer: "flex items-start",
  detailIcon: "text-[#b50002] mt-1 mr-3",
  detailLabel: "text-sm font-medium text-[#171717]",
  detailValue: "text-xs text-[#171717]",

  // Spec
  specContainer:
    "flex flex-col items-center bg-[#c7c5c5] p-3 rounded-xl shadow-[0_-4px_12px_rgba(0,0,0,0.15)] transition-all",
  specIcon: "text-xl mb-2 text-[#b50002]",
  specLabel: "text-sm font-medium text-[#171717]",
  specValue: "text-xs text-[#171717]",

  // Status
  statusIndicator: (status) => {
    const config = {
      completed: "bg-green-900/30 text-green-800",
      pending: "bg-blue-900/30 text-blue-800",
      active: "bg-green-900/30 text-green-800",
      cancelled: "bg-red-900/30 text-red-800",
      default: "bg-gray-900/30 text-gray-800",
    };
    return `inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config[status] || config.default}`;
  },
  statusIcon: (status) => {
    const config = {
      completed: "bg-green-800",
      pending: "bg-blue-800",
      active: "bg-green-800",
      cancelled: "bg-red-800",
      default: "bg-gray-800",
    };
    return `w-2 h-2 rounded-full mr-2 ${config[status] || config.default}`;
  },

  // No Bookings
  noBookingsContainer:
    "bg-[#b9b9b9] backdrop-blur-sm text-center py-16 rounded-2xl",
  noBookingsIconContainer:
    "mx-auto w-24 h-24 flex items-center justify-center mb-6",
  noBookingsIcon: "w-16 h-16 rounded-full flex items-center justify-center",
  noBookingsIconSvg: "h-24 w-24 text-[#171717]",
  noBookingsTitle: "mt-4 text-xl font-medium text-[#171717]",
  noBookingsText: "mt-2 text-[#171717]",
  noBookingsButton:
    "w-40 py-2.5 px-4 rounded-xl mt-6 items-center justify-center gap-2 font-semibold text-sm text-white bg-[#b50002] shadow-lg shadow-black/20 hover:shadow-lg transition-all duration-200 ease-out hover:brightness-110 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#b50002]",

  // Car Image
  carImageContainer:
    "bg-[#c7c5c5] rounded-xl w-20 h-12 flex items-center justify-center",
};

export const statusConfig = {
  completed: { bg: "bg-green-900/20", text: "text-green-800" },
  pending_reservation: { bg: "bg-yellow-900/20", text: "text-yellow-800" },
  pending_full_payment: { bg: "bg-orange-900/20", text: "text-orange-800" },
  pending: { bg: "bg-blue-900/20", text: "text-blue-800" },
  active: { bg: "bg-blue-900/20", text: "text-blue-800" },
  cancelled: { bg: "bg-red-900/20", text: "text-red-800" },
  default: { bg: "bg-gray-900/30", text: "text-gray-800" },
};

export const navbarStyles = {
  // Navbar container
  navbar: (scrolled) =>
    `fixed w-full top-0 z-50 transition-all duration-500 ease-in-out ${
      scrolled
        ? "bg-[#e3e3e3] py-2 backdrop-blur-md shadow-lg shadow-black/20"
        : "py-4 bg-transparent"
    }`,

  // Inner container
  navbarInner: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
  navbarCenter: "flex justify-center",

  // Background wrapper for logo + links
  navbarBackground: (scrolled) =>
    `bg-[#dfdfdf] backdrop-blur-lg w-full rounded-full shadow-lg shadow-black/20 transition-all duration-500 ease-in-out ${
      scrolled ? "py-2 px-4 md:px-6" : "py-3 px-6 md:px-8"
    }`,

  // Content container
  contentContainer: "flex justify-between items-center h-full",

  // Logo
  logoLink: "flex items-center gap-2",
  logoContainer: "flex flex-col items-center text-xl md:text-2xl leading-none",
  logoImage: "h-20 w-auto block",
  logoText:
    "font-bold tracking-wide text-white hover:text-blue-400 transition-colors duration-300",

  // Desktop navigation links
  desktopNav: "hidden lg:flex items-center",
  navLinksContainer: "flex space-x-2 mx-6",
  navLink:
    "flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#171717] hover:text-[#b50002] transition-colors duration-300",
  navDivider: "h-5 w-px bg-[#171717] my-auto",

  // Mobile menu button
  mobileMenuButton: "lg:hidden flex items-center",
  menuButton:
    "text-[#171717] hover:text-[#b50002] focus:outline-none transition-colors",

  // Mobile menu
  mobileMenu:
    "lg:hidden bg-[#dfdfdf] backdrop-blur-md border-t border-[#171717] shadow-lg mt-1",
  mobileMenuContainer: "px-4 pt-2 pb-8 space-y-1",
  mobileNavLink:
    "block px-4 py-3 rounded-lg text-[#171717] hover:text-[#b50002] transition-colors flex items-center gap-3",
};
