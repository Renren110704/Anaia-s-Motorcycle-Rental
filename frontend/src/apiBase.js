const getDefaultApiBaseUrl = () => {
  if (typeof window === "undefined") {
    return "http://localhost:5001";
  }

  const hostname = window.location.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:5001";
  }

  // If this frontend is hosted on a static host like Hostinger,
  // use the Render backend service for API requests.
  return "https://motorcycle-rental-system-04-11-26-dula.onrender.com";
};

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || getDefaultApiBaseUrl();

export default API_BASE_URL;
