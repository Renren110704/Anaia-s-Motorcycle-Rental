import express from "express";
import {
  login,
  register,
  verifyEmail,
  resendVerificationOTP,
  verifyLoginOTP,
  logout,
  requestPasswordReset,
  resetPassword,
  getUserProfile,
  updateProfile,
  changePassword,
  requestEmailChangeOTP, 
  verifyEmailChangeOTP
} from "../controllers/userController.js";
import authMiddleware from "../middlewares/auth.js";

const userRouter = express.Router();

// Registration & Email Verification
userRouter.post("/register", register);
userRouter.post("/verify-email", verifyEmail);
userRouter.post("/resend-verification-otp", resendVerificationOTP);

// Login with OTP or skip for mobile
userRouter.post("/login", login);
userRouter.post("/verify-login-otp", verifyLoginOTP);
userRouter.post("/logout", logout);

// Password Reset
userRouter.post("/request-password-reset", requestPasswordReset);
userRouter.post("/reset-password", resetPassword);

// Profile Management (Protected Routes)
userRouter.get("/me", authMiddleware, getUserProfile);
userRouter.put("/update-profile", authMiddleware, updateProfile);
userRouter.put("/change-password", authMiddleware, changePassword);

// Email Change with OTP (Protected Routes)
userRouter.post("/request-email-change-otp", authMiddleware, requestEmailChangeOTP);
userRouter.post("/verify-email-change-otp", authMiddleware, verifyEmailChangeOTP);

export default userRouter;
