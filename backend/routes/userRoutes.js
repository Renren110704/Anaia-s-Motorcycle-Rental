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
  verifyEmailChangeOTP, 
  removeProfilePicture,
  getAllUsers,
  toggleUserStatus,
  deleteUser
} from "../controllers/userController.js";
import authMiddleware from "../middlewares/auth.js";
import multer from "multer";
import fs from "fs";
import path from "path";
import { uploadProfilePicture } from "../controllers/userController.js";

// Setup multer storage above your route definitions
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = 'uploads/';
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

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

userRouter.post("/upload-profile-picture", authMiddleware, upload.single("image"), uploadProfilePicture);

userRouter.delete("/remove-profile-picture", authMiddleware, removeProfilePicture);

userRouter.get("/users", getAllUsers);
userRouter.patch("/users/:id/status", toggleUserStatus);
userRouter.delete("/users/:id", deleteUser);

// Push token registration
userRouter.post("/push-token", authMiddleware, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "Token required" });
    await req.user.updateOne({
      $addToSet: { expoPushTokens: token },
    });
    console.log(`[Push] Token saved for userId=${req.user._id}: ${token}`);
    res.json({ message: "Push token registered" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Push token removal (on logout)
userRouter.delete("/push-token", authMiddleware, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "Token required" });
    await req.user.updateOne({
      $pull: { expoPushTokens: token },
    });
    res.json({ message: "Push token removed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default userRouter;
