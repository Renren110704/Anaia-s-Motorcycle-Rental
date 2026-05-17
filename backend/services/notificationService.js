import { Expo } from "expo-server-sdk";
import User from "../models/userModel.js";

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
          console.error(`[Push] Ticket error for token ${validTokens[i]}:`, ticket.message, ticket.details);
        }
      });
    } catch (err) {
      console.error("[Push] Send error:", err.message);
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
    console.log(`[Push] Sending "${payload.title}" to userId=${userId}, tokens=${user.expoPushTokens.length}`);
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
      "expoPushTokens"
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
    title: "Booking Received 🎉",
    body: "Your reservation request has been submitted. We'll confirm it shortly.",
  },
  pending_full_payment: {
    title: "Awaiting Full Payment 💳",
    body: "Your booking is confirmed! Please complete the full payment to proceed.",
  },
  active: {
    title: "Rental Started 🏍️",
    body: "Your rental is now active. Enjoy the ride and ride safe!",
  },
  inspection: {
    title: "Vehicle Under Inspection 🔍",
    body: "Your returned vehicle is being inspected. We'll update you once done.",
  },
  completed: {
    title: "Rental Completed ✅",
    body: "Your rental is complete. Thank you for choosing Anaia's! Leave a review anytime.",
  },
  cancelled: {
    title: "Booking Cancelled",
    body: "Your booking has been cancelled. Contact us if you have questions.",
  },
  rejected: {
    title: "Booking Rejected",
    body: "Unfortunately your booking was rejected. Please contact us for details.",
  },
};

export async function notifyBookingStatusChange(userId, status, bookingId) {
  const msg = STATUS_MESSAGES[status];
  if (!msg) return;
  await notifyUser(userId, {
    ...msg,
    data: { screen: "Bookings", bookingId },
  });
}

export async function notifyBookingCreated(userId) {
  await notifyUser(userId, {
    title: "Booking Submitted 🎉",
    body: "Your reservation request has been received. We'll confirm it shortly.",
    data: { screen: "Bookings" },
  });
}

export async function notifyPaymentConfirmed(userId) {
  await notifyUser(userId, {
    title: "Payment Confirmed ✅",
    body: "Your full payment has been confirmed. Get ready for your ride!",
    data: { screen: "Bookings" },
  });
}

// ── Promo notifications ────────────────────────────────────────────────────

export async function notifyNewPromo(promo) {
  const discountLabel =
    promo.discountType === "percentage"
      ? `${promo.discountValue}% off`
      : `₱${promo.discountValue} off`;

  await notifyAllUsers({
    title: `🏷️ New Promo: ${promo.name}`,
    body: `${discountLabel} — ${promo.description || "Limited time offer. Book now!"}`,
    data: { screen: "Motorcycles" },
  });
}
