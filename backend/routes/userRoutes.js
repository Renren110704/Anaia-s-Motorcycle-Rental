import express from "express";
import {
  login,
  register,
  checkAvailability,
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
  deleteUser,
} from "../controllers/userController.js";
import authMiddleware from "../middlewares/auth.js";
import multer from "multer";
import fs from "fs";
import path from "path";
import { uploadProfilePicture } from "../controllers/userController.js";

// Setup multer storage above your route definitions
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = "uploads/";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage: storage });

const userRouter = express.Router();

// Registration & Email Verification
userRouter.post("/register", register);
userRouter.post("/check-availability", checkAvailability);
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
userRouter.post(
  "/request-email-change-otp",
  authMiddleware,
  requestEmailChangeOTP,
);
userRouter.post(
  "/verify-email-change-otp",
  authMiddleware,
  verifyEmailChangeOTP,
);

userRouter.post(
  "/upload-profile-picture",
  authMiddleware,
  upload.single("image"),
  uploadProfilePicture,
);

userRouter.delete(
  "/remove-profile-picture",
  authMiddleware,
  removeProfilePicture,
);

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

// Test notification — sends a real push to the logged-in user and returns the ticket result
userRouter.post("/push-test", authMiddleware, async (req, res) => {
  try {
    const { Expo } = await import("expo-server-sdk");
    const expo = new Expo();

    const user = req.user;
    const tokens = user.expoPushTokens || [];

    if (!tokens.length) {
      return res.json({
        ok: false,
        stage: "no_tokens",
        message:
          "No push tokens saved for this user. The app never registered a token.",
        userId: user._id,
      });
    }

    const validTokens = tokens.filter((t) => Expo.isExpoPushToken(t));
    if (!validTokens.length) {
      return res.json({
        ok: false,
        stage: "invalid_tokens",
        message: "Tokens are saved but none are valid Expo push tokens.",
        tokens,
      });
    }

    const messages = validTokens.map((token) => ({
      to: token,
      sound: "default",
      title: "Test Notification 🔔",
      body: "If you see this, push notifications are working!",
      channelId: "default",
      priority: "high",
    }));

    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];
    for (const chunk of chunks) {
      const t = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...t);
    }

    const errors = tickets.filter((t) => t.status === "error");
    console.log(
      `[Push] Test for userId=${user._id} tokens=${validTokens.length} errors=${errors.length}`,
    );
    tickets.forEach((t, i) => {
      if (t.status === "error") {
        console.error(
          `[Push] Test ticket error token=${validTokens[i]}:`,
          t.message,
          t.details,
        );
      }
    });

    res.json({
      ok: errors.length === 0,
      stage: "sent",
      userId: user._id,
      tokens: validTokens,
      tickets,
    });
  } catch (err) {
    console.error("[Push] Test error:", err.message);
    res
      .status(500)
      .json({ ok: false, stage: "exception", message: err.message });
  }
});

export default userRouter;
