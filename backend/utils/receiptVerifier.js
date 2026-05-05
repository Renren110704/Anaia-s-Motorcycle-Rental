import Tesseract from "tesseract.js";

// ── GCash receipt patterns derived from real receipt analysis ─────────────────

// GCash Ref No: groups like "2039 263 199532" (4-3-6) or "1234 567 890123"
const GCASH_REF_REGEX = /\b\d{4}\s\d{3}\s\d{6}\b/;

// Also accept compact form without spaces (user may type it without spaces)
const GCASH_REF_COMPACT_REGEX = /\b\d{13}\b/;

// GCash PH phone number on receipt: +63 9XX XXX XXXX
const GCASH_PHONE_REGEX = /\+63\s?9\d{2}\s?\d{3}\s?\d{4}/;

// Masked recipient name pattern GCash uses: letters + •••  e.g. "MA•••N LO•••Z D."
const GCASH_MASKED_NAME_REGEX = /[A-Z]{1,4}[•.]{3,}[A-Z]/i;

// GCash receipt date format: "Mar 30, 2026 9:34 AM"
const GCASH_DATE_REGEX =
  /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}\s+\d{1,2}:\d{2}\s+(AM|PM)\b/i;

// Keywords that must appear in a real GCash receipt
const GCASH_REQUIRED_KEYWORDS = [
  "gcash",
  "ref no",
  "total amount sent",
  "sent via",
  "express send",
];

// Keywords that suggest a fake or edited image
const SUSPICIOUS_KEYWORDS = [
  "fake",
  "sample",
  "test",
  "void",
  "cancelled",
  "demo",
  "specimen",
];

// ── Amount parser — handles "₱500.00", "P500.00", "500.00", "500" ─────────────
const parseAmount = (raw = "") => {
  const cleaned = String(raw)
    .replace(/[₱P,\s]/gi, "")
    .trim();
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
};

// ── Extract GCash date from OCR text ─────────────────────────────────────────
const extractGCashDate = (text = "") => {
  const match = text.match(GCASH_DATE_REGEX);
  if (!match) return null;
  return new Date(match[0]);
};

// ── Extract amount values from OCR text ──────────────────────────────────────
const extractAmounts = (text = "") => {
  // Match currency amounts like 500.00, ₱500.00, P500.00
  const matches = text.match(/[₱P]?\s*\d{1,6}(?:,\d{3})*(?:\.\d{2})?/gi) || [];
  return matches.map((m) => parseAmount(m)).filter((n) => n !== null && n > 0);
};

// ── Extract ref number from OCR text ─────────────────────────────────────────
const extractRefNumber = (text = "") => {
  const spaced = text.match(GCASH_REF_REGEX);
  if (spaced) return spaced[0].replace(/\s/g, "");
  const compact = text.match(GCASH_REF_COMPACT_REGEX);
  return compact ? compact[0] : null;
};

// ── Main verifier ─────────────────────────────────────────────────────────────
export const verifyDigitalReceipt = async ({
  referenceId,
  sentAmount,
  expectedAmount,
  sentAt,
  file,
}) => {
  const reasons = [];
  const passed = [];
  let score = 100;

  const normalizedReference = String(referenceId || "")
    .trim()
    .replace(/\s/g, "");
  const amount = Number(sentAmount || 0);
  const expected = Number(expectedAmount || 0);
  const sentDate = sentAt ? new Date(sentAt) : null;

  // ── 1. File presence & type ──────────────────────────────────────────────
  if (!file || !file.mimetype || !file.mimetype.startsWith("image/")) {
    reasons.push("Proof image is missing or not an image file.");
    score -= 60;
    return buildResult(score, reasons, passed, "local-rule-engine");
  }
  passed.push("Image file present and valid type.");

  // ── 2. Reference ID format — must match GCash 13-digit pattern ───────────
  const refDigitsOnly = normalizedReference.replace(/\D/g, "");
  if (refDigitsOnly.length !== 13) {
    reasons.push(
      `Reference ID must be 13 digits (GCash format). Got ${refDigitsOnly.length} digits.`,
    );
    score -= 35;
  } else {
    passed.push("Reference ID length matches GCash format (13 digits).");
  }

  // ── 3. Amount checks ─────────────────────────────────────────────────────
  if (!Number.isFinite(amount) || amount <= 0) {
    reasons.push("Sent amount is invalid or zero.");
    score -= 30;
  } else if (Number.isFinite(expected) && expected > 0) {
    const delta = Math.abs(amount - expected);
    if (delta > 1) {
      reasons.push(
        `Amount mismatch: sent ₱${amount} but expected ₱${expected}.`,
      );
      score -= 30;
    } else {
      passed.push(`Amount ₱${amount} matches expected ₱${expected}.`);
    }
  }

  // ── 4. Timestamp checks ──────────────────────────────────────────────────
  if (!sentDate || Number.isNaN(sentDate.getTime())) {
    reasons.push("Payment time is invalid.");
    score -= 20;
  } else {
    const now = new Date();
    if (sentDate > now) {
      reasons.push("Payment timestamp is in the future — likely fabricated.");
      score -= 40;
    } else {
      const ageMs = now.getTime() - sentDate.getTime();
      const maxAgeMs = 1000 * 60 * 60 * 24 * 10; // 10 days
      if (ageMs > maxAgeMs) {
        reasons.push("Receipt is older than 10 days.");
        score -= 20;
      } else {
        passed.push("Payment timestamp is recent and valid.");
      }
    }
  }

  // ── 5. OCR — read the actual image ───────────────────────────────────────
  let ocrText = "";
  try {
    // file.buffer from multer, or file.path if using disk storage
    const imageSource = file.buffer || file.path;
    const {
      data: { text },
    } = await Tesseract.recognize(imageSource, "eng", {
      logger: () => {}, // suppress progress logs
    });
    ocrText = text || "";
  } catch (ocrErr) {
    // OCR failure is not fatal — we still apply rule-based checks
    reasons.push("Could not read image text (OCR failed).");
    score -= 10;
  }

  const ocrLower = ocrText.toLowerCase();

  if (ocrText.length > 0) {
    // ── 5a. Suspicious keywords ────────────────────────────────────────────
    for (const kw of SUSPICIOUS_KEYWORDS) {
      if (ocrLower.includes(kw)) {
        reasons.push(`Suspicious keyword found in receipt: "${kw}".`);
        score -= 25;
      }
    }

    // ── 5b. Required GCash keywords ───────────────────────────────────────
    const foundKeywords = GCASH_REQUIRED_KEYWORDS.filter((kw) =>
      ocrLower.includes(kw.toLowerCase()),
    );
    const missingKeywords = GCASH_REQUIRED_KEYWORDS.filter(
      (kw) => !ocrLower.includes(kw.toLowerCase()),
    );

    if (foundKeywords.length >= 3) {
      passed.push(
        `GCash receipt keywords detected: ${foundKeywords.join(", ")}.`,
      );
      score += Math.min(10, foundKeywords.length * 2); // small bonus
    } else {
      reasons.push(
        `Missing expected GCash receipt text. Found only: [${foundKeywords.join(", ") || "none"}]. Missing: [${missingKeywords.join(", ")}].`,
      );
      score -= 20;
    }

    // ── 5c. GCash phone number on receipt ─────────────────────────────────
    if (GCASH_PHONE_REGEX.test(ocrText)) {
      passed.push("GCash recipient phone number (+63 9XX) detected.");
    } else {
      reasons.push("No GCash recipient phone number (+63 9XX) found in image.");
      score -= 10;
    }

    // ── 5d. Masked recipient name pattern ─────────────────────────────────
    if (GCASH_MASKED_NAME_REGEX.test(ocrText)) {
      passed.push("Masked recipient name pattern detected (GCash standard).");
    } else {
      // Not a hard fail — OCR sometimes mangles the bullet dots
      reasons.push(
        "Masked recipient name pattern not detected. OCR may have failed to read it.",
      );
      score -= 5;
    }

    // ── 5e. GCash date format on receipt ──────────────────────────────────
    const receiptDate = extractGCashDate(ocrText);
    if (receiptDate && !Number.isNaN(receiptDate.getTime())) {
      passed.push(`GCash date format detected: ${receiptDate.toDateString()}.`);

      // Cross-check: receipt date vs user-submitted sentAt
      if (sentDate && !Number.isNaN(sentDate.getTime())) {
        const diffMs = Math.abs(receiptDate.getTime() - sentDate.getTime());
        const diffHours = diffMs / (1000 * 60 * 60);
        if (diffHours > 2) {
          reasons.push(
            `Receipt image date (${receiptDate.toLocaleString()}) differs from submitted payment time by ${Math.round(diffHours)} hours.`,
          );
          score -= 20;
        } else {
          passed.push("Receipt image date matches submitted payment time.");
        }
      }
    } else {
      reasons.push("No valid GCash date format found in receipt image.");
      score -= 10;
    }

    // ── 5f. OCR ref number cross-check ────────────────────────────────────
    const ocrRef = extractRefNumber(ocrText);
    if (ocrRef) {
      passed.push(`Reference number found in image: ${ocrRef}.`);
      if (refDigitsOnly && ocrRef !== refDigitsOnly) {
        reasons.push(
          `Reference ID mismatch: submitted "${refDigitsOnly}" but image shows "${ocrRef}".`,
        );
        score -= 35;
      } else if (refDigitsOnly && ocrRef === refDigitsOnly) {
        passed.push("Reference ID matches the number in the receipt image.");
        score += 5; // bonus for exact match
      }
    } else {
      reasons.push("No GCash reference number found in receipt image.");
      score -= 15;
    }

    // ── 5g. OCR amount cross-check ────────────────────────────────────────
    const ocrAmounts = extractAmounts(ocrText);
    if (ocrAmounts.length > 0 && expected > 0) {
      const amountFoundInImage = ocrAmounts.some(
        (a) => Math.abs(a - expected) <= 1,
      );
      if (amountFoundInImage) {
        passed.push(`Expected amount ₱${expected} found in receipt image.`);
        score += 5;
      } else {
        reasons.push(
          `Expected amount ₱${expected} not found in receipt image. Detected amounts: ${ocrAmounts.map((a) => `₱${a}`).join(", ")}.`,
        );
        score -= 25;
      }
    }
  }

  score = Math.max(0, Math.min(100, score));
  return buildResult(score, reasons, passed, "gcash-ocr-engine");
};

// ── Result builder ────────────────────────────────────────────────────────────
const buildResult = (score, reasons, passed, provider) => {
  let status;
  if (score >= 80) status = "verified";
  else if (score >= 55) status = "needs_review";
  else status = "suspected_fake";

  return {
    status,
    score,
    provider,
    reasons: reasons.length > 0 ? reasons : [],
    passed,
    checkedAt: new Date(),
  };
};
