import express from "express";
import {
  getPaymentMethods,
  addPaymentMethod,
  updatePaymentMethodQR,
  togglePaymentMethod,
  deletePaymentMethod,
} from "../controllers/settingsController.js";
import { uploads } from "../middlewares/uploads.js";
import adminAuth from "../middlewares/adminAuth.js";

const settingsRouter = express.Router();

// Public: list payment methods. Checkout should call this with ?activeOnly=true
settingsRouter.get("/payment-methods", getPaymentMethods);

// Admin: manage payment methods
// e.g. settingsRouter.post("/payment-methods", protect, admin, uploads.single("image"), addPaymentMethod);
settingsRouter.post(
  "/payment-methods",
  adminAuth,
  uploads.single("image"),
  addPaymentMethod,
);
settingsRouter.post(
  "/payment-methods/:id/qr",
  adminAuth,
  uploads.single("image"),
  updatePaymentMethodQR,
);
settingsRouter.patch("/payment-methods/:id/toggle", adminAuth, togglePaymentMethod);
settingsRouter.delete("/payment-methods/:id", adminAuth, deletePaymentMethod);

export default settingsRouter;
