const DEFAULT_TRACCAR_BASE_URL = "https://demo4.traccar.org";

const stripTrailingSlash = (value = "") => String(value).replace(/\/+$/, "");
const getEnv = (name) => process.env[name]?.trim() || "";

export const TRACCAR_BASE_URL = stripTrailingSlash(
  getEnv("REACT_APP_TRACCAR_BASE_URL") || DEFAULT_TRACCAR_BASE_URL,
);

export const TRACCAR_DEVICE_UNIQUE_ID =
  getEnv("REACT_APP_TRACCAR_DEVICE_UNIQUE_ID") || "";

export const TRACCAR_DEVICE_LABEL =
  getEnv("REACT_APP_TRACCAR_DEVICE_LABEL") || "";

export const TRACCAR_TRACKED_MOTORCYCLE_UNIT_ID =
  getEnv("REACT_APP_TRACCAR_TRACKED_MOTORCYCLE_UNIT_ID") || "";

const TRACCAR_TOKEN = getEnv("REACT_APP_TRACCAR_TOKEN");
const TRACCAR_USERNAME =
  getEnv("REACT_APP_TRACCAR_USERNAME") || "kiefferklyde.lachica27@gmail.com";
const TRACCAR_PASSWORD = getEnv("REACT_APP_TRACCAR_PASSWORD") || "Kieffer12345";

export const buildTraccarHeaders = (extraHeaders = {}) => {
  const headers = {
    Accept: "application/json",
    ...extraHeaders,
  };

  if (TRACCAR_TOKEN) {
    headers.Authorization = TRACCAR_TOKEN.startsWith("Bearer ")
      ? TRACCAR_TOKEN
      : `Bearer ${TRACCAR_TOKEN}`;
    return headers;
  }

  if (TRACCAR_USERNAME && TRACCAR_PASSWORD && typeof window.btoa === "function") {
    headers.Authorization = `Basic ${window.btoa(`${TRACCAR_USERNAME}:${TRACCAR_PASSWORD}`)}`;
  }

  return headers;
};

export const getTraccarAuthHint = () => {
  if (TRACCAR_TOKEN) return "Traccar token configured";
  if (TRACCAR_USERNAME && TRACCAR_PASSWORD) return "Traccar username/password configured";
  return "Set REACT_APP_TRACCAR_TOKEN or REACT_APP_TRACCAR_USERNAME / REACT_APP_TRACCAR_PASSWORD";
};
