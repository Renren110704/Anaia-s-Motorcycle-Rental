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
const EMAIL_SOCKET_TIMEOUT = parseNumber(process.env.EMAIL_SOCKET_TIMEOUT, 20000);
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
    : activeProfile?.secure ?? false;
const resolvedPort = EMAIL_PORT || activeProfile?.port || (resolvedSecure ? 465 : 587);
const resolvedFamily = EMAIL_FAMILY || activeProfile?.family || 0;
const resolvedRequireTLS =
  process.env.EMAIL_REQUIRE_TLS !== undefined
    ? EMAIL_REQUIRE_TLS
    : activeProfile?.requireTLS ?? false;
const resolvedIgnoreTLS =
  process.env.EMAIL_IGNORE_TLS !== undefined
    ? EMAIL_IGNORE_TLS
    : activeProfile?.ignoreTLS ?? false;
const hasSmtpCredentials = !!(EMAIL_USER && EMAIL_PASS);
const canUseBrevoApi = !!BREVO_API_KEY;
const isBrevoApiOnly = EMAIL_PROVIDER === "brevo-api";
const preferBrevoApi =
  canUseBrevoApi &&
  (isBrevoApiOnly ||
    (EMAIL_PROVIDER === "auto" && EMAIL_SERVICE === "brevo"));

const createTransportOptions = (
  {
    host = resolvedHost,
    port = resolvedPort,
    secure = resolvedSecure,
    requireTLS = resolvedRequireTLS,
    ignoreTLS = resolvedIgnoreTLS,
    family = resolvedFamily,
  } = {},
) => ({
  host,
  port,
  secure,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
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

// Create transporter
const transporter =
  hasSmtpCredentials && resolvedHost
    ? nodemailer.createTransport(primaryTransportOptions)
    : null;

const parseFromAddress = (fromValue) => {
  const raw = String(fromValue || "").trim();
  const matched = raw.match(/^(?:\s*"?([^"]+)"?\s*)?<\s*([^>\s]+)\s*>$/);
  if (matched) {
    return {
      name: String(matched[1] || "").trim() || undefined,
      email: String(matched[2] || "").trim(),
    };
  }
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
    if (response.status === 401) {
      throw new Error(
        `${label} failed via Brevo API: unauthorized API key. Use BREVO_API_KEY from Brevo API Keys (usually starts with xkeysib-), not SMTP key/password (xsmtpsib-).`,
      );
    }
    throw new Error(
      `${label} failed via Brevo API (${response.status}): ${responseBody}`,
    );
  }
};

const mapEmailError = (label, error) => {
  if (error?.code === "ETIMEDOUT") {
    return `${label} failed: SMTP connection timed out. Check EMAIL_HOST/EMAIL_PORT/EMAIL_SECURE and make sure your SMTP provider allows connections from Render.`;
  }
  if (error?.code === "EAUTH") {
    return `${label} failed: SMTP authentication rejected credentials. Check EMAIL_USER and EMAIL_PASS (SMTP key/password).`;
  }
  if (error?.code === "ESOCKET" || error?.code === "ECONNECTION") {
    return `${label} failed: SMTP socket/connection error. Verify host, port, TLS mode, and firewall/network rules.`;
  }
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
      if (isBrevoApiOnly) {
        return {
          success: false,
          error: `${label} failed: ${apiError?.message || "Brevo API error"}`,
        };
      }
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

    return {
      success: false,
      error:
        "Email credentials are missing. Set EMAIL_USER/EMAIL_PASS for SMTP or BREVO_API_KEY for Brevo API.",
    };
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
        console.warn(`${label}: primary SMTP failed, fallback SMTP succeeded.`, {
          primaryHost: primaryTransportOptions.host,
          primaryPort: primaryTransportOptions.port,
          primarySecure: primaryTransportOptions.secure,
          fallbackHost: fallbackTransportOptions.host,
          fallbackPort: fallbackTransportOptions.port,
          fallbackSecure: fallbackTransportOptions.secure,
        });
        return { success: true };
      } catch (fallbackError) {
        console.error(`${label} fallback sending error:`, {
          code: fallbackError?.code,
          command: fallbackError?.command,
          message: fallbackError?.message,
          stack: fallbackError?.stack,
          host: fallbackTransportOptions.host,
          port: fallbackTransportOptions.port,
          secure: fallbackTransportOptions.secure,
        });
      }
    }

    if (canUseBrevoApi && !preferBrevoApi) {
      try {
        await sendWithBrevoApi(mailOptions, label);
        console.warn(`${label}: SMTP failed, Brevo API fallback succeeded.`);
        return { success: true };
      } catch (apiError) {
        console.error(`${label} Brevo API fallback error:`, {
          message: apiError?.message,
          stack: apiError?.stack,
        });
      }
    }

    const friendlyError = mapEmailError(label, error);
    console.error(`${label} sending error:`, {
      code: error?.code,
      command: error?.command,
      message: error?.message,
      stack: error?.stack,
      host: primaryTransportOptions.host || EMAIL_SERVICE,
      port: primaryTransportOptions.port,
      secure: primaryTransportOptions.secure,
    });
    return { success: false, error: friendlyError };
  }
};

// Generate 6-digit OTP
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send verification email
export const sendVerificationEmail = async (email, otp, name) => {
  if (!hasSmtpCredentials && !canUseBrevoApi) {
    return {
      success: false,
      error:
        "Email credentials are missing. Set EMAIL_USER/EMAIL_PASS for SMTP or BREVO_API_KEY for Brevo API in backend/.env.",
    };
  }

  const mailOptions = {
    from: `"Anaia's Motorcycle Rental" <${EMAIL_FROM}>`,
    to: email,
    subject: "Verify Your Email - Anaia's Motorcycle Rental",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #e3e3e3;">
        <div style="background: #b50002; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">Anaia's Motorcycle Rental</h1>
        </div>
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #171717;">Welcome, ${name}!</h2>
          <p style="color: #666; font-size: 16px;">Thank you for registering with Anaia's Motorcycle Rental. Please verify your email address using the OTP below:</p>
          <div style="background-color: #f8f9fa; border-left: 4px solid #b50002; padding: 20px; margin: 20px 0;">
            <h1 style="color: #171717; margin: 0; font-size: 36px; letter-spacing: 5px; text-align: center;">${otp}</h1>
          </div>
          <p style="color: #666; font-size: 14px;"><strong>This OTP will expire in 15 minutes.</strong></p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">If you didn't create an account, please ignore this email.</p>
        </div>
      </div>
    `,
  };

  return sendEmail(mailOptions, "Verification email");
};

// Send login OTP
export const sendLoginOTP = async (email, otp, name) => {
  if (!hasSmtpCredentials && !canUseBrevoApi) {
    return {
      success: false,
      error:
        "Email credentials are missing. Set EMAIL_USER/EMAIL_PASS for SMTP or BREVO_API_KEY for Brevo API in backend/.env.",
    };
  }

  const mailOptions = {
    from: `"Anaia's Motorcycle Rental" <${EMAIL_FROM}>`,
    to: email,
    subject: "Login Verification - Anaia's Motorcycle Rental",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #e3e3e3;">
        <div style="background: #b50002; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">Anaia's Motorcycle Rental</h1>
        </div>
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #171717;">Hello, ${name}!</h2>
          <p style="color: #666; font-size: 16px;">A login attempt was detected on your account. Please use the OTP below to complete your login:</p>
          <div style="background-color: #f8f9fa; border-left: 4px solid #b50002; padding: 20px; margin: 20px 0;">
            <h1 style="color: #171717; margin: 0; font-size: 36px; letter-spacing: 5px; text-align: center;">${otp}</h1>
          </div>
          <p style="color: #666; font-size: 14px;"><strong>This OTP will expire in 5 minutes.</strong></p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">If this wasn't you, please secure your account immediately.</p>
        </div>
      </div>
    `,
  };

  return sendEmail(mailOptions, "Login OTP email");
};

// Send password reset OTP
export const sendPasswordResetOTP = async (email, otp, name) => {
  if (!hasSmtpCredentials && !canUseBrevoApi) {
    return {
      success: false,
      error:
        "Email credentials are missing. Set EMAIL_USER/EMAIL_PASS for SMTP or BREVO_API_KEY for Brevo API in backend/.env.",
    };
  }

  const mailOptions = {
    from: `"Anaia's Motorcycle Rental" <${EMAIL_FROM}>`,
    to: email,
    subject: "Password Reset Request - Anaia's Motorcycle Rental",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #e3e3e3;">
        <div style="background: #b50002; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">Anaia's Motorcycle Rental</h1>
        </div>
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #171717;">Hello, ${name}!</h2>
          <p style="color: #666; font-size: 16px;">We received a request to reset your password. Use the OTP below to proceed:</p>
          <div style="background-color: #f8f9fa; border-left: 4px solid #b50002; padding: 20px; margin: 20px 0;">
            <h1 style="color: #171717; margin: 0; font-size: 36px; letter-spacing: 5px; text-align: center;">${otp}</h1>
          </div>
          <p style="color: #666; font-size: 14px;"><strong>This OTP will expire in 15 minutes.</strong></p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">If you didn't request a password reset, please ignore this email and ensure your account is secure.</p>
        </div>
      </div>
    `,
  };

  return sendEmail(mailOptions, "Password reset email");
};

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
  if (!hasSmtpCredentials && !canUseBrevoApi) {
    return {
      success: false,
      error:
        "Email credentials are missing. Set EMAIL_USER/EMAIL_PASS for SMTP or BREVO_API_KEY for Brevo API in backend/.env.",
    };
  }

  const safeName = customerName || "Renter";
  const safeBookingId = bookingId || "—";
  const safeMotorcycle = motorcycleName || "Motorcycle";
  const safeYear = motorcycleYear || "N/A";
  const safePickup = pickupDate || "—";
  const safeReturn = returnDate || "—";
  const safeDestination = destination || "—";
  const safeLocation = pickupLocation || "—";
  const safeReference = referenceId || "—";
  const safeDueAtPickup = totalAmount - (downpayment || 0);

  const formatCurrency = (val) => {
    const num = Number(val) || 0;
    return `₱${num.toLocaleString("en-PH")}.00`;
  };

  const mailOptions = {
    from: `"Anaia's Motorcycle Rental" <${EMAIL_FROM}>`,
    to: email,
    subject: "Booking Confirmation & Receipt - Anaia's Motorcycle Rental",
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 0; background-color: #f5f5f5;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #b50002 0%, #8a0001 100%); color: white; padding: 40px 30px; text-align: center; border-bottom: 4px solid #fff;">
          <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: bold;">Anaia's Motorcycle Rental</h1>
          <p style="margin: 0; font-size: 14px; opacity: 0.95;">Booking Confirmation & Receipt</p>
        </div>

        <!-- Confirmation Banner -->
        <div style="background-color: #e8f5e9; border-left: 4px solid #22c55e; padding: 20px 30px;">
          <p style="margin: 0; font-size: 16px; font-weight: bold; color: #1b5e20;">✓ Booking Confirmed!</p>
          <p style="margin: 5px 0 0; font-size: 13px; color: #2e7d32;">Reference: <strong>#${safeReference}</strong></p>
        </div>

        <!-- Main Content -->
        <div style="background-color: white; padding: 30px;">
          <!-- Greeting -->
          <p style="margin: 0 0 25px; font-size: 15px; color: #333;">
            Hello <strong>${safeName}</strong>,<br><br>
            Your motorcycle rental booking has been confirmed. Here is your digital receipt:
          </p>

          <!-- Motorcycle Section -->
          <div style="background-color: #fafafa; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 15px; font-size: 13px; font-weight: bold; color: #666; text-transform: uppercase; letter-spacing: 1px;">Motorcycle</h3>
            <p style="margin: 0 0 8px; font-size: 16px; font-weight: bold; color: #171717;">${safeMotorcycle}</p>
            <p style="margin: 0; font-size: 13px; color: #666;">${safeYear}</p>
          </div>

          <!-- Booking Details Section -->
          <div style="background-color: #fafafa; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 15px; font-size: 13px; font-weight: bold; color: #666; text-transform: uppercase; letter-spacing: 1px;">Booking Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-size: 13px; color: #666;"><strong>Pickup</strong></td>
                <td style="padding: 8px 0; font-size: 13px; color: #171717; text-align: right;">${safePickup}</td>
              </tr>
              <tr style="border-top: 1px solid #e0e0e0;">
                <td style="padding: 8px 0; font-size: 13px; color: #666;"><strong>Return</strong></td>
                <td style="padding: 8px 0; font-size: 13px; color: #171717; text-align: right;">${safeReturn}</td>
              </tr>
              <tr style="border-top: 1px solid #e0e0e0;">
                <td style="padding: 8px 0; font-size: 13px; color: #666;"><strong>Destination</strong></td>
                <td style="padding: 8px 0; font-size: 13px; color: #171717; text-align: right;">${safeDestination}</td>
              </tr>
              <tr style="border-top: 1px solid #e0e0e0;">
                <td style="padding: 8px 0; font-size: 13px; color: #666;"><strong>Pickup Location</strong></td>
                <td style="padding: 8px 0; font-size: 13px; color: #171717; text-align: right;">${safeLocation}</td>
              </tr>
            </table>
          </div>

          <!-- Fee Breakdown Section -->
          <div style="background-color: #fafafa; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 15px; font-size: 13px; font-weight: bold; color: #666; text-transform: uppercase; letter-spacing: 1px;">Fee Breakdown</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-size: 13px; color: #666;">Rental (₱${baseRental || 0}/day)</td>
                <td style="padding: 8px 0; font-size: 13px; color: #171717; text-align: right; font-weight: bold;">${formatCurrency(baseRental)}</td>
              </tr>
              ${distanceFee ? `<tr style="border-top: 1px solid #e0e0e0;">
                <td style="padding: 8px 0; font-size: 13px; color: #666;">Distance Fee</td>
                <td style="padding: 8px 0; font-size: 13px; color: #22c55e; text-align: right; font-weight: bold;">+${formatCurrency(distanceFee)}</td>
              </tr>` : ""}
              ${helmetFee ? `<tr style="border-top: 1px solid #e0e0e0;">
                <td style="padding: 8px 0; font-size: 13px; color: #666;">Extra Helmet</td>
                <td style="padding: 8px 0; font-size: 13px; color: #22c55e; text-align: right; font-weight: bold;">+${formatCurrency(helmetFee)}</td>
              </tr>` : ""}
              <tr style="border-top: 2px solid #d0d0d0; border-bottom: 2px solid #d0d0d0;">
                <td style="padding: 12px 0; font-size: 14px; font-weight: bold; color: #171717;">Total</td>
                <td style="padding: 12px 0; font-size: 14px; font-weight: bold; color: #171717; text-align: right;">${formatCurrency(totalAmount)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-size: 13px; color: #666;">Downpayment Paid</td>
                <td style="padding: 8px 0; font-size: 13px; color: #d32f2f; text-align: right; font-weight: bold;">−${formatCurrency(downpayment)}</td>
              </tr>
              <tr style="background-color: white;">
                <td style="padding: 12px 0; font-size: 14px; font-weight: bold; color: #171717;">Due at Pickup</td>
                <td style="padding: 12px 0; font-size: 14px; font-weight: bold; color: #b50002; text-align: right;">${formatCurrency(safeDueAtPickup)}</td>
              </tr>
            </table>
          </div>

          <!-- Important Notice -->
          <div style="background-color: #fff3e0; border-left: 4px solid #ff9800; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
            <p style="margin: 0; font-size: 13px; color: #e65100;">
              <strong>⚠️ Important:</strong> Please bring a valid government-issued ID on the day of pickup. The remaining balance of <strong>${formatCurrency(safeDueAtPickup)}</strong> is due at pickup.
            </p>
          </div>

          <!-- Confirmation Date -->
          <p style="margin: 0; font-size: 12px; color: #999; border-top: 1px solid #e0e0e0; padding-top: 15px;">
            Confirmed on <strong>${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} at ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</strong>
          </p>
          <p style="margin: 10px 0 0; font-size: 12px; color: #999;">
            If you have questions, please contact us directly.
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f5f5f5; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
          <p style="margin: 0; font-size: 12px; color: #666;">
            © 2026 Anaia's Motorcycle Rental · Soldiers Hills IV, Bacoor, Cavite
          </p>
        </div>
      </div>
    `,
  };

  return sendEmail(mailOptions, "Booking receipt email");
};
