import jwt from "jsonwebtoken";

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;

// Protects admin-only routes. Expects `Authorization: Bearer <token>`.
// Attaches `req.admin = { role, email }` on success.
const adminAuth = (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Not authorized. Please log in." });
    }

    if (!ADMIN_JWT_SECRET) {
      console.error("ADMIN_JWT_SECRET (or JWT_SECRET) is not configured.");
      return res
        .status(500)
        .json({ success: false, message: "Server misconfiguration." });
    }

    const decoded = jwt.verify(token, ADMIN_JWT_SECRET);
    if (decoded.role !== "admin") {
      return res
        .status(403)
        .json({ success: false, message: "Admin access required." });
    }

    req.admin = { role: decoded.role, email: decoded.email };
    next();
  } catch (err) {
    return res
      .status(401)
      .json({
        success: false,
        message: "Session expired. Please log in again.",
      });
  }
};

export default adminAuth;
