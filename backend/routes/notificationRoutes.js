import express from "express";
import {
  getNotifications,
  markRead,
  markAllRead,
  deleteNotification,
  clearAllNotifications,
} from "../controllers/notificationController.js";
import authMiddleware from "../middlewares/auth.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", getNotifications);
router.patch("/read-all", markAllRead);
router.patch("/:id/read", markRead);
router.delete("/:id", deleteNotification);
router.delete("/", clearAllNotifications);

export default router;
