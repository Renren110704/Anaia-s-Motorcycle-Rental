import express from "express";
import {
  adminLogin,
  verifyAdminToken,
  requestAdminPasswordReset,
  resetAdminPassword,
} from "../controllers/adminAuthController.js";
import adminAuth from "../middlewares/adminAuth.js";

const adminAuthRouter = express.Router();

adminAuthRouter.post("/login", adminLogin);
adminAuthRouter.get("/verify", adminAuth, verifyAdminToken);
adminAuthRouter.post("/forgot-password", requestAdminPasswordReset);
adminAuthRouter.post("/reset-password", resetAdminPassword);

export default adminAuthRouter;
