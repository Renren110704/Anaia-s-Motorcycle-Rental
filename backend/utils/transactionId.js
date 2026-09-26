import crypto from "crypto";

/**
 * Generates a human-readable, unique Transaction ID for a completed full
 * payment, e.g. "TXN-20260922-9F4K2QAB".
 *
 * Format: TXN-<YYYYMMDD>-<8 random uppercase alphanumeric chars>
 * The date segment makes it easy to scan chronologically; the random
 * segment (from crypto, not Math.random) makes collisions astronomically
 * unlikely even before the DB-level uniqueness check kicks in.
 */
export const generateTransactionId = () => {
  const now = new Date();
  const datePart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");

  // 8 random bytes -> base32-ish uppercase alphanumeric, no ambiguous chars.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
  const bytes = crypto.randomBytes(8);
  let randomPart = "";
  for (let i = 0; i < bytes.length; i += 1) {
    randomPart += alphabet[bytes[i] % alphabet.length];
  }

  return `TXN-${datePart}-${randomPart}`;
};

/**
 * Generates a Transaction ID and confirms it isn't already used by another
 * booking, retrying a few times on the extremely unlikely chance of a
 * collision. `Model` is the Mongoose model to check against (typically
 * MotorcycleBooking), and `field` is the schema field name holding the ID.
 */
export const generateUniqueTransactionId = async (
  Model,
  field = "transactionId",
  maxAttempts = 5,
) => {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = generateTransactionId();
    // eslint-disable-next-line no-await-in-loop
    const existing = await Model.exists({ [field]: candidate });
    if (!existing) return candidate;
  }
  // Fall back to appending a full random suffix if we somehow collided
  // `maxAttempts` times in a row (practically impossible).
  return `${generateTransactionId()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
};

export default generateUniqueTransactionId;
