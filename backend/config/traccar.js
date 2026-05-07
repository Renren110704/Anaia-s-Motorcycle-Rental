const DEFAULT_TRACCAR_BASE_URL = "https://demo4.traccar.org";

const stripTrailingSlash = (value = "") => String(value).replace(/\/+$/, "");
const getEnv = (name) => process.env[name]?.trim() || "";

export const TRACCAR_BASE_URL = stripTrailingSlash(
  getEnv("TRACCAR_BASE_URL") || DEFAULT_TRACCAR_BASE_URL,
);

export const TRACCAR_DEVICE_UNIQUE_ID = getEnv("TRACCAR_DEVICE_UNIQUE_ID") || "";
export const TRACCAR_DEVICE_LABEL = getEnv("TRACCAR_DEVICE_LABEL") || "";

const TRACCAR_TOKEN = getEnv("TRACCAR_TOKEN");
const TRACCAR_USERNAME = getEnv("TRACCAR_USERNAME") || "kiefferklyde.lachica27@gmail.com";
const TRACCAR_PASSWORD = getEnv("TRACCAR_PASSWORD") || "Kieffer12345";

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

  if (TRACCAR_USERNAME && TRACCAR_PASSWORD) {
    const encoded = Buffer.from(`${TRACCAR_USERNAME}:${TRACCAR_PASSWORD}`, "utf8").toString("base64");
    headers.Authorization = `Basic ${encoded}`;
  }

  return headers;
};
