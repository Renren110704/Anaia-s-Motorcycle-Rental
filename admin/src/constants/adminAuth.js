export const ADMIN_AUTH_STORAGE_KEY = "admin_authenticated";
export const ADMIN_DEFAULT_EMAIL = "admin@anaiasmotorcyclerental.com";
export const ADMIN_DEFAULT_PASSWORD = "Anaias@123";

export const PASSWORD_RULES = [
  "At least 8 characters",
  "Contains uppercase letter",
  "Contains lowercase letter",
  "Contains a number",
  "Contains special character",
];

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