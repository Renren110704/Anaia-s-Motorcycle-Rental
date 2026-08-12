// Key used to store the admin JWT in localStorage. Note: this now holds a
// real, expiring, server-issued token — not a plain "true"/"false" flag.
export const ADMIN_TOKEN_STORAGE_KEY = "admin_token";

export const PASSWORD_RULES = [
  "At least 8 characters",
  "Contains uppercase letter",
  "Contains lowercase letter",
  "Contains a number",
  "Contains special character",
];

// Client-side check kept only as a UX hint (live checklist while typing).
// It is NOT the source of truth — the server independently verifies the
// actual admin password against ADMIN_PASSWORD_HASH.
export const validateStrongPassword = (password) => {
  const errors = [];

  if (password.length < 8) errors.push("At least 8 characters");
  if (!/[A-Z]/.test(password)) errors.push("Contains uppercase letter");
  if (!/[a-z]/.test(password)) errors.push("Contains lowercase letter");
  if (!/[0-9]/.test(password)) errors.push("Contains a number");
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push("Contains special character");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
