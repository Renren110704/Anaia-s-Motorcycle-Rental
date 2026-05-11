import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const parseBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || String(value).trim() === "") {
    return defaultValue;
  }
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
};

const parseNumber = (value, defaultValue) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
};

const sanitizeSecret = (value) =>
  String(value || "")
    .trim()
    .replace(/^['\"]+|['\"]+$/g, "");

const EMAIL_USER = String(process.env.EMAIL_USER || "").trim();
const EMAIL_PASS = sanitizeSecret(process.env.EMAIL_PASS)
  .trim()
  .replace(/\s+/g, "");
const BREVO_API_KEY = sanitizeSecret(process.env.BREVO_API_KEY);
const EMAIL_PROVIDER = String(process.env.EMAIL_PROVIDER || "auto")
  .trim()
  .toLowerCase();
const EMAIL_FROM = String(process.env.EMAIL_FROM || EMAIL_USER).trim();
const EMAIL_SERVICE = String(process.env.EMAIL_SERVICE || "brevo")
  .trim()
  .toLowerCase();
const EMAIL_HOST = process.env.EMAIL_HOST || "";
const EMAIL_PORT = Number(process.env.EMAIL_PORT || 0);
const EMAIL_SECURE = parseBoolean(process.env.EMAIL_SECURE, false);
const EMAIL_CONNECTION_TIMEOUT = parseNumber(
  process.env.EMAIL_CONNECTION_TIMEOUT,
  15000,
);
const EMAIL_GREETING_TIMEOUT = parseNumber(
  process.env.EMAIL_GREETING_TIMEOUT,
  10000,
);
const EMAIL_SOCKET_TIMEOUT = parseNumber(
  process.env.EMAIL_SOCKET_TIMEOUT,
  20000,
);
const EMAIL_DNS_TIMEOUT = parseNumber(process.env.EMAIL_DNS_TIMEOUT, 10000);
const EMAIL_REQUIRE_TLS = parseBoolean(process.env.EMAIL_REQUIRE_TLS, false);
const EMAIL_IGNORE_TLS = parseBoolean(process.env.EMAIL_IGNORE_TLS, false);
const EMAIL_TLS_REJECT_UNAUTHORIZED = parseBoolean(
  process.env.EMAIL_TLS_REJECT_UNAUTHORIZED,
  true,
);
const EMAIL_FAMILY = parseNumber(process.env.EMAIL_FAMILY, 0);

const serviceProfiles = {
  brevo: {
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false,
    family: 4,
    requireTLS: true,
    ignoreTLS: false,
  },
  gmail: {
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    family: 4,
    requireTLS: false,
    ignoreTLS: false,
  },
  googlemail: {
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    family: 4,
    requireTLS: false,
    ignoreTLS: false,
  },
};

const activeProfile = serviceProfiles[EMAIL_SERVICE] || null;
const resolvedHost = EMAIL_HOST || activeProfile?.host || "";
const resolvedSecure =
  process.env.EMAIL_SECURE !== undefined
    ? EMAIL_SECURE
    : (activeProfile?.secure ?? false);
const resolvedPort =
  EMAIL_PORT || activeProfile?.port || (resolvedSecure ? 465 : 587);
const resolvedFamily = EMAIL_FAMILY || activeProfile?.family || 0;
const resolvedRequireTLS =
  process.env.EMAIL_REQUIRE_TLS !== undefined
    ? EMAIL_REQUIRE_TLS
    : (activeProfile?.requireTLS ?? false);
const resolvedIgnoreTLS =
  process.env.EMAIL_IGNORE_TLS !== undefined
    ? EMAIL_IGNORE_TLS
    : (activeProfile?.ignoreTLS ?? false);
const hasSmtpCredentials = !!(EMAIL_USER && EMAIL_PASS);
const canUseBrevoApi = !!BREVO_API_KEY;
const isBrevoApiOnly = EMAIL_PROVIDER === "brevo-api";
const preferBrevoApi =
  canUseBrevoApi &&
  (isBrevoApiOnly || (EMAIL_PROVIDER === "auto" && EMAIL_SERVICE === "brevo"));

const createTransportOptions = ({
  host = resolvedHost,
  port = resolvedPort,
  secure = resolvedSecure,
  requireTLS = resolvedRequireTLS,
  ignoreTLS = resolvedIgnoreTLS,
  family = resolvedFamily,
} = {}) => ({
  host,
  port,
  secure,
  auth: { user: EMAIL_USER, pass: EMAIL_PASS },
  connectionTimeout: EMAIL_CONNECTION_TIMEOUT,
  greetingTimeout: EMAIL_GREETING_TIMEOUT,
  socketTimeout: EMAIL_SOCKET_TIMEOUT,
  dnsTimeout: EMAIL_DNS_TIMEOUT,
  requireTLS,
  ignoreTLS,
  tls: {
    rejectUnauthorized: EMAIL_TLS_REJECT_UNAUTHORIZED,
    servername: process.env.EMAIL_TLS_SERVERNAME || host || undefined,
  },
  family: family || undefined,
});

const primaryTransportOptions = createTransportOptions();

const fallbackTransportOptions =
  resolvedHost === "smtp-relay.brevo.com" && resolvedPort === 587
    ? createTransportOptions({
        host: "smtp-relay.brevo.com",
        port: 2525,
        secure: false,
        requireTLS: true,
        ignoreTLS: false,
        family: 4,
      })
    : resolvedHost === "smtp.gmail.com" && resolvedPort === 465
      ? createTransportOptions({
          host: "smtp.gmail.com",
          port: 587,
          secure: false,
          requireTLS: true,
          ignoreTLS: false,
          family: 4,
        })
      : null;

const transporter =
  hasSmtpCredentials && resolvedHost
    ? nodemailer.createTransport(primaryTransportOptions)
    : null;

const parseFromAddress = (fromValue) => {
  const raw = String(fromValue || "").trim();
  const matched = raw.match(/^(?:\s*"?([^"]+)"?\s*)?<\s*([^>\s]+)\s*>$/);
  if (matched)
    return {
      name: String(matched[1] || "").trim() || undefined,
      email: String(matched[2] || "").trim(),
    };
  return { email: raw };
};

const sendWithBrevoApi = async (mailOptions, label) => {
  const from = parseFromAddress(mailOptions.from);
  const toAddress = String(mailOptions.to || "").trim();
  const payload = {
    sender: from,
    to: [{ email: toAddress }],
    subject: mailOptions.subject,
    htmlContent: mailOptions.html,
    textContent: mailOptions.text,
  };
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "api-key": BREVO_API_KEY,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const responseBody = await response.text();
    if (response.status === 401)
      throw new Error(`${label} failed via Brevo API: unauthorized API key.`);
    throw new Error(
      `${label} failed via Brevo API (${response.status}): ${responseBody}`,
    );
  }
};

const mapEmailError = (label, error) => {
  if (error?.code === "ETIMEDOUT")
    return `${label} failed: SMTP connection timed out.`;
  if (error?.code === "EAUTH")
    return `${label} failed: SMTP authentication rejected credentials.`;
  if (error?.code === "ESOCKET" || error?.code === "ECONNECTION")
    return `${label} failed: SMTP socket/connection error.`;
  return `${label} failed: ${error?.message || "Unknown mail error"}`;
};

const sendEmail = async (mailOptions, label = "Email") => {
  if (preferBrevoApi) {
    try {
      await sendWithBrevoApi(mailOptions, label);
      return { success: true };
    } catch (apiError) {
      console.error(`${label} Brevo API sending error:`, {
        message: apiError?.message,
        stack: apiError?.stack,
      });
      if (isBrevoApiOnly)
        return {
          success: false,
          error: `${label} failed: ${apiError?.message || "Brevo API error"}`,
        };
    }
  }
  if (!transporter) {
    if (canUseBrevoApi) {
      try {
        await sendWithBrevoApi(mailOptions, label);
        return { success: true };
      } catch (apiError) {
        return {
          success: false,
          error: `${label} failed: ${apiError?.message || "Brevo API error"}`,
        };
      }
    }
    return { success: false, error: "Email credentials are missing." };
  }
  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    const shouldTryFallback =
      !!fallbackTransportOptions &&
      (error?.code === "ETIMEDOUT" ||
        error?.code === "ECONNECTION" ||
        error?.code === "ESOCKET");
    if (shouldTryFallback) {
      try {
        const fallbackTransporter = nodemailer.createTransport(
          fallbackTransportOptions,
        );
        await fallbackTransporter.sendMail(mailOptions);
        return { success: true };
      } catch (fallbackError) {
        console.error(`${label} fallback sending error:`, {
          message: fallbackError?.message,
        });
      }
    }
    if (canUseBrevoApi && !preferBrevoApi) {
      try {
        await sendWithBrevoApi(mailOptions, label);
        return { success: true };
      } catch (apiError) {
        console.error(`${label} Brevo API fallback error:`, {
          message: apiError?.message,
        });
      }
    }
    const friendlyError = mapEmailError(label, error);
    console.error(`${label} sending error:`, {
      code: error?.code,
      message: error?.message,
    });
    return { success: false, error: friendlyError };
  }
};

// ── Shared brand tokens ───────────────────────────────────────────────────────
const BRAND = {
  accent: "#b50002",
  dark: "#111111",
  white: "#ffffff",
  text: "#111111",
  muted: "#888888",
  light: "#FAFAFA",
  border: "#EBEBEB",
  borderLight: "#F5F5F5",
};

// ── Shared email wrapper (clean white) ────────────────────────────────────────
const emailWrapper = (bodyHtml) => `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#F2F2F2;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F2F2F2;padding:32px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:12px;overflow:hidden;border:1px solid #E5E5E5;background-color:#ffffff;">

      <!-- Header -->
      <tr>
        <td style="background-color:#ffffff;padding:28px 32px 22px;border-bottom:1px solid #F0F0F0;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:middle;">
                <p style="margin:0;font-size:15px;font-weight:bold;color:#111111;letter-spacing:0.3px;">
                  <span style="display:inline-block;width:7px;height:7px;background-color:#b50002;border-radius:50%;margin-right:8px;vertical-align:middle;"></span>Anaia's Motorcycle Rental
                </p>
                <p style="margin:5px 0 0;font-size:11px;color:#AAAAAA;">
                  Bk14 Lt8 Ph2 Lily St. Soldier's Hills IV, Molino VI, Bacoor Cavite
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      ${bodyHtml}

      <!-- Footer -->
      <tr>
        <td style="background-color:#ffffff;padding:18px 32px;border-top:1px solid #F0F0F0;text-align:center;">
          <p style="margin:0;font-size:11px;color:#CCCCCC;">
            &copy; 2026 Anaia's Motorcycle Rental &nbsp;&middot;&nbsp; Soldiers Hills IV, Bacoor, Cavite
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

// ── OTP block (clean, minimal) ────────────────────────────────────────────────
const otpBlock = (otp) => `
<tr>
  <td style="background-color:#FAFAFA;border:1px solid #EBEBEB;border-radius:8px;padding:22px 24px;text-align:center;">
    <p style="margin:0 0 6px;font-size:11px;color:#AAAAAA;letter-spacing:1.5px;text-transform:uppercase;">Your one-time password</p>
    <p style="margin:0;font-size:36px;font-weight:bold;letter-spacing:12px;color:#111111;font-family:monospace;">
      ${otp}
    </p>
  </td>
</tr>`;

// ── Detail row (clean, no alternating color) ──────────────────────────────────
const detailRow = (label, value) => `
<tr>
  <td style="padding:10px 18px;font-size:12px;color:#888888;border-bottom:1px solid #F5F5F5;">${label}</td>
  <td style="padding:10px 18px;font-size:12px;color:#111111;font-weight:600;text-align:right;border-bottom:1px solid #F5F5F5;">${value}</td>
</tr>`;

// ── Section block ─────────────────────────────────────────────────────────────
const sectionBlock = (title, innerHtml) => `
<tr>
  <td style="padding:0 0 20px;">
    <p style="margin:0 0 8px;font-size:10px;font-weight:bold;color:#AAAAAA;text-transform:uppercase;letter-spacing:1.5px;">${title}</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #EBEBEB;border-radius:8px;overflow:hidden;">
      ${innerHtml}
    </table>
  </td>
</tr>`;

// ── Generate OTP ──────────────────────────────────────────────────────────────
export const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// ── Verification Email ────────────────────────────────────────────────────────
export const sendVerificationEmail = async (email, otp, name) => {
  if (!hasSmtpCredentials && !canUseBrevoApi)
    return { success: false, error: "Email credentials are missing." };

  const body = `
  <tr><td style="padding:32px 32px 0;">
    <table width="100%" cellpadding="0" cellspacing="0">

      <tr><td style="padding-bottom:20px;">
        <p style="margin:0 0 4px;font-size:16px;font-weight:bold;color:#111111;">Verify your email</p>
        <p style="margin:0;font-size:13px;color:#888888;line-height:1.6;">
          Welcome, <strong style="color:#111111;">${name}</strong>! Use the code below to verify your email address.
        </p>
      </td></tr>

      ${otpBlock(otp)}

      <tr><td style="padding-top:16px;">
        <p style="margin:0;font-size:12px;color:#AAAAAA;">This code expires in <strong style="color:#111111;">15 minutes</strong>.</p>
      </td></tr>

      <tr><td style="padding-top:24px;border-top:1px solid #F0F0F0;margin-top:24px;">
        <p style="margin:0;font-size:11px;color:#CCCCCC;">If you didn't create an account, you can safely ignore this email.</p>
      </td></tr>

    </table>
  </td></tr>
  <tr><td style="height:32px;"></td></tr>`;

  return sendEmail(
    {
      from: `"Anaia's Motorcycle Rental" <${EMAIL_FROM}>`,
      to: email,
      subject: "Verify Your Email - Anaia's Motorcycle Rental",
      html: emailWrapper(body),
    },
    "Verification email",
  );
};

// ── Login OTP Email ───────────────────────────────────────────────────────────
export const sendLoginOTP = async (email, otp, name) => {
  if (!hasSmtpCredentials && !canUseBrevoApi)
    return { success: false, error: "Email credentials are missing." };

  const body = `
  <tr><td style="padding:32px 32px 0;">
    <table width="100%" cellpadding="0" cellspacing="0">

      <tr><td style="padding-bottom:20px;">
        <p style="margin:0 0 4px;font-size:16px;font-weight:bold;color:#111111;">Login verification</p>
        <p style="margin:0;font-size:13px;color:#888888;line-height:1.6;">
          Hello, <strong style="color:#111111;">${name}</strong>. A login attempt was detected on your account. Use the code below to complete your login.
        </p>
      </td></tr>

      ${otpBlock(otp)}

      <tr><td style="padding-top:16px;">
        <p style="margin:0;font-size:12px;color:#AAAAAA;">This code expires in <strong style="color:#111111;">5 minutes</strong>.</p>
      </td></tr>

      <tr><td style="padding-top:24px;border-top:1px solid #F0F0F0;margin-top:24px;">
        <p style="margin:0;font-size:11px;color:#CCCCCC;">If this wasn't you, please secure your account immediately.</p>
      </td></tr>

    </table>
  </td></tr>
  <tr><td style="height:32px;"></td></tr>`;

  return sendEmail(
    {
      from: `"Anaia's Motorcycle Rental" <${EMAIL_FROM}>`,
      to: email,
      subject: "Login Verification - Anaia's Motorcycle Rental",
      html: emailWrapper(body),
    },
    "Login OTP email",
  );
};

// ── Password Reset Email ──────────────────────────────────────────────────────
export const sendPasswordResetOTP = async (email, otp, name) => {
  if (!hasSmtpCredentials && !canUseBrevoApi)
    return { success: false, error: "Email credentials are missing." };

  const body = `
  <tr><td style="padding:32px 32px 0;">
    <table width="100%" cellpadding="0" cellspacing="0">

      <tr><td style="padding-bottom:20px;">
        <p style="margin:0 0 4px;font-size:16px;font-weight:bold;color:#111111;">Password reset</p>
        <p style="margin:0;font-size:13px;color:#888888;line-height:1.6;">
          Hello, <strong style="color:#111111;">${name}</strong>. We received a request to reset your password. Use the code below to proceed.
        </p>
      </td></tr>

      ${otpBlock(otp)}

      <tr><td style="padding-top:16px;">
        <p style="margin:0;font-size:12px;color:#AAAAAA;">This code expires in <strong style="color:#111111;">15 minutes</strong>.</p>
      </td></tr>

      <tr><td style="padding-top:24px;border-top:1px solid #F0F0F0;margin-top:24px;">
        <p style="margin:0;font-size:11px;color:#CCCCCC;">If you didn't request a password reset, ignore this email and your account will remain secure.</p>
      </td></tr>

    </table>
  </td></tr>
  <tr><td style="height:32px;"></td></tr>`;

  return sendEmail(
    {
      from: `"Anaia's Motorcycle Rental" <${EMAIL_FROM}>`,
      to: email,
      subject: "Password Reset Request - Anaia's Motorcycle Rental",
      html: emailWrapper(body),
    },
    "Password reset email",
  );
};

// ── Booking Receipt Email ─────────────────────────────────────────────────────
export const sendBookingReceiptEmail = async (
  email,
  {
    customerName,
    bookingId,
    motorcycleName,
    motorcycleYear,
    pickupDate,
    returnDate,
    destination,
    pickupLocation,
    referenceId,
    downpayment,
    totalAmount,
    distanceFee,
    helmetFee,
    baseRental,
  } = {},
) => {
  if (!hasSmtpCredentials && !canUseBrevoApi)
    return { success: false, error: "Email credentials are missing." };

  const safeName = customerName || "Renter";
  const safeBookingId = bookingId || "—";
  const safeMotorcycle = motorcycleName || "Motorcycle";
  const safeYear = motorcycleYear || "N/A";
  const safePickup = pickupDate || "—";
  const safeReturn = returnDate || "—";
  const safeDestination = destination || "—";
  const safeLocation = pickupLocation || "—";
  const safeReference = referenceId || "—";
  const safeDueAtPickup =
    (Number(totalAmount) || 0) - (Number(downpayment) || 0);

  const fc = (val) =>
    `&#8369;${(Number(val) || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const now = new Date();
  const confirmedOn = `${now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} at ${now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}`;

  const body = `
  <!-- Confirmed badge -->
  <tr>
    <td style="background-color:#EAF3DE;border-bottom:1px solid #D4EDBC;padding:14px 32px;">
      <table cellpadding="0" cellspacing="0"><tr>
        <td style="padding-right:10px;vertical-align:middle;">
          <div style="width:28px;height:28px;border-radius:50%;background-color:#D4EDBC;text-align:center;line-height:28px;font-size:14px;color:#3B6D11;">&#10003;</div>
        </td>
        <td style="vertical-align:middle;">
          <p style="margin:0;font-size:13px;font-weight:bold;color:#27500A;">Booking confirmed</p>
          <p style="margin:2px 0 0;font-size:11px;color:#3B6D11;">Booking ID <strong>#${safeBookingId}</strong> &nbsp;&middot;&nbsp; Ref <strong>#${safeReference}</strong></p>
        </td>
        <td style="text-align:right;vertical-align:middle;">
          <div style="background-color:#ffffff;border:1px solid #D4EDBC;border-radius:6px;padding:5px 12px;display:inline-block;">
            <p style="margin:0;font-size:10px;color:#b50002;letter-spacing:1px;text-transform:uppercase;font-weight:bold;">Receipt</p>
            <p style="margin:2px 0 0;font-size:12px;color:#111111;font-weight:bold;">#${safeReference}</p>
          </div>
        </td>
      </tr></table>
    </td>
  </tr>

  <!-- Body -->
  <tr><td style="background-color:#ffffff;padding:28px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0">

      <!-- Greeting -->
      <tr><td style="padding-bottom:24px;">
        <p style="margin:0;font-size:13px;color:#555555;line-height:1.7;">
          Hello <strong style="color:#111111;">${safeName}</strong> — your motorcycle rental is confirmed. Please keep this receipt for your records.
        </p>
      </td></tr>

      <!-- Motorcycle -->
      ${sectionBlock(
        "Motorcycle",
        `
        <tr style="background-color:#111111;">
          <td style="padding:16px 18px;">
            <p style="margin:0;font-size:15px;font-weight:bold;color:#ffffff;">${safeMotorcycle}</p>
            <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.45);">Year &middot; ${safeYear}</p>
          </td>
        </tr>
      `,
      )}

      <!-- Booking Details -->
      ${sectionBlock(
        "Booking Details",
        `
        ${detailRow("Pickup date &amp; time", safePickup)}
        ${detailRow("Return date &amp; time", safeReturn)}
        ${detailRow("Destination", safeDestination)}
        ${detailRow("Pickup location", safeLocation)}
      `,
      )}

      <!-- Fee Breakdown -->
      ${sectionBlock(
        "Fee Breakdown",
        `
        ${detailRow("Base rental", fc(baseRental))}
        ${distanceFee ? detailRow("Distance fee", `<span style="color:#3B6D11;">+${fc(distanceFee)}</span>`) : ""}
        ${helmetFee ? detailRow("Extra helmet", `<span style="color:#3B6D11;">+${fc(helmetFee)}</span>`) : ""}
        <tr style="background-color:#FAFAFA;border-top:1px solid #E5E5E5;border-bottom:1px solid #E5E5E5;">
          <td style="padding:12px 18px;font-size:13px;font-weight:bold;color:#111111;">Total</td>
          <td style="padding:12px 18px;font-size:13px;font-weight:bold;color:#111111;text-align:right;">${fc(totalAmount)}</td>
        </tr>
        ${detailRow("Downpayment paid", `<span style="color:#b50002;">&#8722;${fc(downpayment)}</span>`)}
        <tr style="background-color:#111111;">
          <td style="padding:14px 18px;font-size:12px;color:rgba(255,255,255,0.55);">Due at pickup</td>
          <td style="padding:14px 18px;font-size:15px;font-weight:bold;color:#ffffff;text-align:right;">${fc(safeDueAtPickup)}</td>
        </tr>
      `,
      )}

      <!-- Notice -->
      <tr><td style="padding:13px 16px;background-color:#FFFBF0;border:1px solid #F5DFA0;border-radius:8px;margin-top:4px;">
        <p style="margin:0;font-size:12px;color:#7A5800;line-height:1.6;">
          &#9888;&nbsp; Please bring a valid government-issued ID on pickup day. The remaining balance of <strong>${fc(safeDueAtPickup)}</strong> is due at pickup.
        </p>
      </td></tr>

      <!-- Timestamp -->
      <tr><td style="padding-top:22px;border-top:1px solid #F0F0F0;margin-top:22px;">
        <p style="margin:0;font-size:11px;color:#BBBBBB;">Confirmed on <strong style="color:#999999;">${confirmedOn}</strong></p>
        <p style="margin:5px 0 0;font-size:11px;color:#BBBBBB;">For questions, please contact us directly.</p>
      </td></tr>

    </table>
  </td></tr>`;

  return sendEmail(
    {
      from: `"Anaia's Motorcycle Rental" <${EMAIL_FROM}>`,
      to: email,
      subject: "Booking Confirmation & Receipt - Anaia's Motorcycle Rental",
      html: emailWrapper(body),
    },
    "Booking receipt email",
  );
};
