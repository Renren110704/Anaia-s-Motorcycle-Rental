import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import helmet from "helmet";
import { fileURLToPath } from "url";
import { connectDB } from "./config/db.js";
import userRouter from "./routes/userRoutes.js";
import motorcycleRouter from "./routes/motorcycleRoutes.js";
import motorcycleBookingRouter from "./routes/motorcycleBookingRoutes.js";
import motorcyclePaymentRouter from "./routes/motorcyclePaymentRoutes.js";
import systemLogRouter from "./routes/systemLogRoutes.js";
import trackingRouter from "./routes/trackingRoutes.js";
import reviewRouter from "./routes/reviewRoutes.js";
import discountRoutes from "./routes/discountRoutes.js";
import { startMaintenanceScheduler } from "./utils/maintenanceScheduler.js";
import contactMessageRouter from "./routes/contactMessageRoutes.js";
import settingsRouter from "./routes/settingsRoutes.js";
import chatbotRoutes from "./routes/chatbotRoutes.js";

const app = express();
const PORT = process.env.PORT || 5001;

const sanitizeAllowedOriginEntry = (value) =>
  String(value || "")
    .trim()
    .replace(/^['\"]+|['\"]+$/g, "")
    .replace(/\/+$/, "");

const defaultAllowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://anaias-motorcycle-rental.onrender.com",
  "https://motorcycle-rental-system-04-11-26-d-nu.vercel.app",
  "https://*.vercel.app",
  "https://*.onrender.com",
];

const configuredAllowedOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map(sanitizeAllowedOriginEntry)
  .filter(Boolean);

const extraAllowedOrigins = (process.env.FRONTEND_URL_FALLBACK || "")
  .split(",")
  .map(sanitizeAllowedOriginEntry)
  .filter(Boolean);

const rawAllowedOrigins = Array.from(
  new Set([
    ...configuredAllowedOrigins,
    ...extraAllowedOrigins,
    ...defaultAllowedOrigins,
  ]),
);
const isDev = process.env.NODE_ENV !== "production";

const normalizeOrigin = (value) => {
  if (!value) return "";
  const sanitizedValue = sanitizeAllowedOriginEntry(value);
  try {
    return new URL(sanitizedValue).origin.toLowerCase();
  } catch {
    return String(sanitizedValue)
      .trim()
      .toLowerCase()
      .replace(/\/+$/, "");
  }
};

const exactAllowedOrigins = rawAllowedOrigins
  .filter((origin) => !origin.includes("*"))
  .map(normalizeOrigin);

const wildcardAllowedHosts = rawAllowedOrigins
  .filter((origin) => origin.includes("*"))
  .map((origin) => origin.trim().toLowerCase())
  .map((origin) => origin.replace(/^https?:\/\//, ""))
  .map((origin) => origin.replace(/^\*\./, ""))
  .map((origin) => origin.replace(/\/$/, ""))
  .filter(Boolean);

const isOriginAllowed = (origin) => {
  if (!origin || rawAllowedOrigins.length === 0) return true;

  const normalizedOrigin = normalizeOrigin(origin);
  if (exactAllowedOrigins.includes(normalizedOrigin)) return true;

  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    return wildcardAllowedHosts.some(
      (allowedHost) =>
        hostname === allowedHost || hostname.endsWith(`.${allowedHost}`),
    );
  } catch {
    return false;
  }
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

connectDB();
startMaintenanceScheduler();

// MIDDLEWARES
const corsOptions = isDev
  ? { origin: true, credentials: true }
  : {
      origin(origin, callback) {
        if (isOriginAllowed(origin)) {
          callback(null, true);
          return;
        }
        callback(
          new Error(
            `Not allowed by CORS: ${origin || "unknown-origin"}. Allowed: ${rawAllowedOrigins.join(
              ", ",
            ) || "(none)"}`,
          ),
        );
      },
      credentials: true,
    };

app.use(cors(corsOptions));
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        fontSrc: ["'self'", 'https:', 'data:'],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
        upgradeInsecureRequests: [],
      },
    },
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(
  "/uploads",
  (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
  },
  express.static(path.join(__dirname, "uploads")),
);

// ROUTES 
app.use("/api/auth", userRouter);
app.use("/api/motorcycles", motorcycleRouter);
app.use("/api/motorcycle-bookings", motorcycleBookingRouter);
app.use("/api/motorcycle-payments", motorcyclePaymentRouter);
app.use("/api/system-logs", systemLogRouter);
app.use("/api/tracking", trackingRouter);
app.use("/api/reviews", reviewRouter);
app.use("/api/discounts", discountRoutes);
app.use("/api/contact-messages", contactMessageRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/chatbot", chatbotRoutes);

app.get("/api/ping", (req, res) =>
  res.json({
    ok: true,
    time: Date.now(),
  }),
);

// LISTEN
app.get("/", (req, res) => {
  res.send("MOTORCYCLE RENTAL API WORKING");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
