import { Expo } from "expo-server-sdk";
import User from "../models/userModel.js";
import Notification from "../models/notificationModel.js";

const expo = new Expo();

// Send push notifications to a list of Expo push tokens
async function sendPushNotifications(tokens, { title, body, data = {} }) {
  const validTokens = tokens.filter((t) => Expo.isExpoPushToken(t));
  if (!validTokens.length) return;

  const messages = validTokens.map((token) => ({
    to: token,
    sound: "default",
    title,
    body,
    data,
    channelId: "default", // required for Android 8+
    priority: "high",
  }));

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      tickets.forEach((ticket, i) => {
        if (ticket.status === "error") {
          console.error(
            `[Push] Ticket error for token ${validTokens[i]}:`,
            ticket.message,
            ticket.details,
          );
        }
      });
    } catch (err) {
      console.error("[Push] Send error:", err.message);
    }
  }
}

// Persist a notification record so it survives page reloads / different
// browsers / different sessions, instead of only existing as a push +
// derived-on-the-fly booking calculation. Safe to call repeatedly for the
// same milestone — dedupeKey has a unique index, so repeats are ignored.
async function createNotificationRecord({
  userId,
  dedupeKey,
  title,
  message,
  bookingId,
  step = 0,
  screen = "Bookings",
}) {
  if (!userId || !dedupeKey) return;
  try {
    await Notification.updateOne(
      { user: userId, dedupeKey },
      {
        $setOnInsert: {
          user: userId,
          dedupeKey,
          title,
          message,
          booking: bookingId,
          step,
          screen,
          read: false,
          deleted: false,
        },
      },
      { upsert: true },
    );
  } catch (err) {
    // Duplicate key races are expected/harmless under the unique index
    if (err.code !== 11000) {
      console.error(
        "[Notifications] createNotificationRecord error:",
        err.message,
      );
    }
  }
}

// Send notification to a single user by userId
export async function notifyUser(userId, payload) {
  if (!userId) {
    console.warn("[Push] notifyUser called with no userId");
    return;
  }
  try {
    const user = await User.findById(userId).select("expoPushTokens");
    if (!user) {
      console.warn("[Push] notifyUser: user not found for id", userId);
      return;
    }
    if (!user.expoPushTokens?.length) {
      console.warn("[Push] notifyUser: user has no push tokens", userId);
      return;
    }
    console.log(
      `[Push] Sending "${payload.title}" to userId=${userId}, tokens=${user.expoPushTokens.length}`,
    );
    await sendPushNotifications(user.expoPushTokens, payload);
  } catch (err) {
    console.error("[Push] notifyUser error:", err.message);
  }
}

// Broadcast to all users with push tokens
export async function notifyAllUsers(payload) {
  try {
    const users = await User.find(
      { expoPushTokens: { $exists: true, $not: { $size: 0 } } },
      "expoPushTokens",
    );
    const allTokens = users.flatMap((u) => u.expoPushTokens);
    await sendPushNotifications(allTokens, payload);
  } catch (err) {
    console.error("[Push] notifyAllUsers error:", err.message);
  }
}

// ── Booking notifications ──────────────────────────────────────────────────

const STATUS_MESSAGES = {
  pending_reservation: {
    title: "Booking Received",
    body: "Your reservation request has been submitted. We'll confirm it shortly.",
    step: 1,
  },
  pending_full_payment: {
    title: "Awaiting Full Payment",
    body: "Your booking is confirmed! Please complete the full payment to proceed.",
    step: 2,
  },
  active: {
    title: "Rental Started",
    body: "Your rental is now active. Enjoy the ride and ride safe!",
    step: 3,
  },
  inspection: {
    title: "Vehicle Under Inspection",
    body: "Your returned vehicle is being inspected. We'll update you once done.",
    step: 4,
  },
  completed: {
    title: "Rental Completed",
    body: "Your rental is complete. Thank you for choosing Anaia's! Leave a review anytime.",
    step: 5,
  },
  cancelled: {
    title: "Booking Cancelled",
    body: "Your booking has been cancelled. Contact us if you have questions.",
    step: 5,
  },
  rejected: {
    title: "Booking Rejected",
    body: "Unfortunately your booking was rejected. Please contact us for details.",
    step: 5,
  },
};

export async function notifyBookingStatusChange(userId, status, bookingId) {
  const msg = STATUS_MESSAGES[status];
  if (!msg) return;
  await notifyUser(userId, {
    title: msg.title,
    body: msg.body,
    data: { screen: "Bookings", bookingId },
  });
  await createNotificationRecord({
    userId,
    dedupeKey: `${bookingId}-${status}`,
    title: msg.title,
    message: msg.body,
    bookingId,
    step: msg.step,
  });
}

export async function notifyBookingCreated(userId, bookingId) {
  const title = "Booking Submitted";
  const body =
    "Your reservation request has been received. We'll confirm it shortly.";
  await notifyUser(userId, { title, body, data: { screen: "Bookings" } });
  await createNotificationRecord({
    userId,
    dedupeKey: `${bookingId}-submitted`,
    title,
    message: body,
    bookingId,
    step: 1,
  });
}

export async function notifyPaymentConfirmed(userId, bookingId) {
  const title = "Payment Confirmed";
  const body =
    "Your full payment has been confirmed. Your ride is ready for pickup!";
  await notifyUser(userId, { title, body, data: { screen: "Bookings" } });
  await createNotificationRecord({
    userId,
    dedupeKey: `${bookingId}-payment-confirmed`,
    title,
    message: body,
    bookingId,
    step: 3,
  });
}

export async function notifyProofReuploadRequested(
  userId,
  bookingId,
  comment,
  reviewedAt = new Date(),
) {
  const title = "Payment Proof Re-upload Requested";
  const body = comment
    ? `We need a new payment proof for your booking: ${comment}`
    : "We need a new payment proof for your booking. Please re-upload it to continue.";
  await notifyUser(userId, {
    title,
    body,
    data: { screen: "Bookings", bookingId: String(bookingId) },
  });
  await createNotificationRecord({
    userId,
    // Keyed on the review timestamp (not Date.now()) so a retried/duplicate
    // call for the same admin action stays deduped, while each distinct
    // re-upload request (new timestamp) still gets its own notification.
    dedupeKey: `${bookingId}-reupload-requested-${new Date(reviewedAt).getTime()}`,
    title,
    message: body,
    bookingId,
    step: 1,
  });
}

// ── Inspection notifications ───────────────────────────────────────────────

export async function notifyDamageFound(userId, bookingId, notes) {
  const body = notes
    ? `Damage was found during inspection: ${notes}`
    : "Damage was found during the return inspection of your vehicle. Please contact us for details.";
  await notifyUser(userId, {
    title: "Damage Found on Returned Vehicle",
    body,
    data: { screen: "Bookings", bookingId: String(bookingId) },
  });
  await createNotificationRecord({
    userId,
    dedupeKey: `${bookingId}-damage-found`,
    title: "Damage Found on Returned Vehicle",
    message: body,
    bookingId,
    step: 5,
  });
}

export async function notifyPenaltyRequired(
  userId,
  bookingId,
  amount,
  summary,
) {
  const amountStr = amount ? `₱${Number(amount).toLocaleString()}` : "";
  const body = summary
    ? `A penalty of ${amountStr} is required: ${summary}`
    : `A penalty${amountStr ? ` of ${amountStr}` : ""} has been issued for your rental. Please settle it before completion.`;
  await notifyUser(userId, {
    title: "Penalty Required",
    body,
    data: { screen: "Bookings", bookingId: String(bookingId) },
  });
  await createNotificationRecord({
    userId,
    dedupeKey: `${bookingId}-penalty-required`,
    title: "Penalty Required",
    message: body,
    bookingId,
    step: 5,
  });
}

export async function notifyPenaltySettled(userId, bookingId, refundInfo = {}) {
  const { deducted, refunded, balanceDue } = refundInfo;
  const hasAmounts =
    typeof deducted === "number" && typeof refunded === "number";
  const body = hasAmounts
    ? balanceDue > 0
      ? `Your penalty payment has been settled. ₱${deducted.toLocaleString()} was deducted from your deposit and ₱${refunded.toLocaleString()} was refunded. You still owe ₱${balanceDue.toLocaleString()}.`
      : `Your penalty payment has been settled. ₱${deducted.toLocaleString()} was deducted from your deposit and ₱${refunded.toLocaleString()} was refunded.`
    : "Your penalty payment has been settled. Thank you for resolving this promptly!";
  await notifyUser(userId, {
    title: "Penalty Settled",
    body,
    data: { screen: "Bookings", bookingId: String(bookingId) },
  });
  await createNotificationRecord({
    userId,
    dedupeKey: `${bookingId}-penalty-settled`,
    title: "Penalty Settled",
    message: body,
    bookingId,
    step: 5,
  });
}

export async function notifyVehicleCleared(userId, bookingId) {
  const title = "Vehicle Cleared";
  const body =
    "Your returned vehicle passed inspection with no damage or penalties. Thank you for choosing Anaia's!";
  await notifyUser(userId, {
    title,
    body,
    data: { screen: "Bookings", bookingId: String(bookingId) },
  });
  await createNotificationRecord({
    userId,
    dedupeKey: `${bookingId}-cleared`,
    title,
    message: body,
    bookingId,
    step: 5,
  });
}

// ── Promo notifications ────────────────────────────────────────────────────
// (Broadcast promos stay push-only / not persisted per-user — add a
// per-user Notification record here too if you want them to show up in
// the in-app dropdown.)

export async function notifyNewPromo(promo) {
  const discountLabel =
    promo.discountType === "percentage"
      ? `${promo.discountValue}% off`
      : `₱${promo.discountValue} off`;

  await notifyAllUsers({
    title: `New Promo: ${promo.name}`,
    body: `${discountLabel} — ${promo.description || "Limited time offer. Book now!"}`,
    data: { screen: "Motorcycles" },
  });
}
