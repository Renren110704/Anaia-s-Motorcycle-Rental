import Notification from "../models/notificationModel.js";

// GET /api/notifications
export async function getNotifications(req, res) {
  try {
    const notifications = await Notification.find({
      user: req.user._id,
      deleted: false,
    }).sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: notifications });
  } catch (err) {
    console.error("[Notifications] getNotifications error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load notifications" });
  }
}

// PATCH /api/notifications/:id/read
export async function markRead(req, res) {
  try {
    await Notification.updateOne(
      { _id: req.params.id, user: req.user._id },
      { $set: { read: true } },
    );
    return res.status(200).json({ success: true, message: "Marked as read" });
  } catch (err) {
    console.error("[Notifications] markRead error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to mark as read" });
  }
}

// PATCH /api/notifications/read-all
export async function markAllRead(req, res) {
  try {
    await Notification.updateMany(
      { user: req.user._id, read: false },
      { $set: { read: true } },
    );
    return res
      .status(200)
      .json({ success: true, message: "All marked as read" });
  } catch (err) {
    console.error("[Notifications] markAllRead error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to mark all as read" });
  }
}

// DELETE /api/notifications/:id  (soft delete)
export async function deleteNotification(req, res) {
  try {
    await Notification.updateOne(
      { _id: req.params.id, user: req.user._id },
      { $set: { deleted: true } },
    );
    return res
      .status(200)
      .json({ success: true, message: "Notification removed" });
  } catch (err) {
    console.error("[Notifications] deleteNotification error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to remove notification" });
  }
}

// DELETE /api/notifications  (clear all)
export async function clearAllNotifications(req, res) {
  try {
    await Notification.updateMany(
      { user: req.user._id, deleted: false },
      { $set: { deleted: true } },
    );
    return res
      .status(200)
      .json({ success: true, message: "All notifications cleared" });
  } catch (err) {
    console.error("[Notifications] clearAllNotifications error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to clear notifications" });
  }
}
