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

// Delete the per-user Notification records for a promo, e.g. when it's
// deactivated or deleted by an admin — so a promo that's no longer valid
// quietly disappears from users' notification dropdowns instead of sitting
// there advertising a discount that no longer works. No new notification is
// sent; this only cleans up the one from notifyNewPromo.
//
// Hard-deleted (not soft-deleted via `deleted: true`) so that if the promo
// is later reactivated, notifyNewPromo's upsert (which uses $setOnInsert)
// finds no existing doc for the dedupeKey and inserts a fresh one — giving
// users a new notification instead of silently no-op'ing against a
// resurrected-but-hidden record.
export async function removePromoNotifications(promoId) {
  if (!promoId) return;
  try {
    await Notification.deleteMany({ dedupeKey: `promo-${promoId}` });
  } catch (err) {
    console.error(
      "[Notifications] removePromoNotifications error:",
      err.message,
    );
  }
}

// Formats a date the same way the admin UI does (en-PH, e.g. "19 Aug 2026").
const formatPromoDate = (d) => {
  if (!d) return null;
  try {
    return new Intl.DateTimeFormat("en-PH", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(d));
  } catch {
    return null;
  }
};

// Builds the extra detail lines (validity window, max uses, minimum rental
// duration, applicable vehicles) appended to the in-app notification message
// for a promo. Kept out of the push body, which stays short.
function buildPromoDetailLines(promo) {
  const lines = [];

  const start = formatPromoDate(promo.startDate);
  const end = formatPromoDate(promo.endDate);
  if (start && end) lines.push(`Valid ${start} – ${end}`);
  else if (start) lines.push(`Valid from ${start}`);
  else if (end) lines.push(`Valid until ${end}`);

  lines.push(
    promo.maxUses != null
      ? `Limited to ${Number(promo.maxUses).toLocaleString()} use${Number(promo.maxUses) === 1 ? "" : "s"}`
      : "Unlimited uses",
  );

  lines.push(
    promo.minRentalDays
      ? `Minimum rental: ${promo.minRentalDays} day${promo.minRentalDays === 1 ? "" : "s"}`
      : "No minimum rental duration",
  );

  if (promo.applicableCategories?.length) {
    lines.push(`Applies to: ${promo.applicableCategories.join(", ")}`);
  } else if (promo.applicableVehicleIds?.length) {
    lines.push(
      `Applies to ${promo.applicableVehicleIds.length} specific vehicle unit${
        promo.applicableVehicleIds.length === 1 ? "" : "s"
      }`,
    );
  } else {
    lines.push("Applies to all vehicles");
  }

  return lines;
}

export async function notifyNewPromo(promo) {
  const discountLabel =
    promo.discountType === "percentage"
      ? `${promo.discountValue}% off`
      : `₱${promo.discountValue} off`;

  const title = `New Promo: ${promo.name}`;
  const pushBody = `${discountLabel} — ${promo.description || "Limited time offer. Book now!"}`;
  // Push stays short and punchy; the in-app record gets the full details so
  // users can see them in the notifications dropdown without opening the promo.
  const recordMessage = [pushBody, ...buildPromoDetailLines(promo)].join("\n");

  await notifyAllUsers({
    title,
    body: pushBody,
    data: { screen: "Motorcycles" },
  });

  // Also persist an in-app Notification record for every user (not just
  // those with push tokens) so the promo shows up in the dropdown even
  // after reload / on a different device. Keyed on the promo's own _id, so
  // re-notifying (e.g. re-toggling isActive on) never duplicates it.
  try {
    const users = await User.find({}, "_id");
    await Promise.all(
      users.map((u) =>
        createNotificationRecord({
          userId: u._id,
          dedupeKey: `promo-${promo._id}`,
          title,
          message: recordMessage,
          step: 0,
          screen: "Motorcycles",
        }),
      ),
    );
  } catch (err) {
    console.error("[Notifications] notifyNewPromo record error:", err.message);
  }
}

// ── Loyalty notifications ───────────────────────────────────────────────────

// Sent when a new loyalty coupon code is issued to a user (e.g. from
// evaluateLoyaltyAfterCompletion in loyaltyService.js). `code` is expected to
// be the loyalty code subdocument/object — at minimum { code, discountType,
// discountValue }. dedupeKey is keyed on the code string itself since each
// generated code should be unique per user.
export async function notifyNewLoyaltyCode(userId, code) {
  if (!code?.code) return;

  const discountLabel =
    code.discountType === "percentage"
      ? `${code.discountValue}% off`
      : `₱${code.discountValue} off`;

  const title = "New Reward Code Unlocked!";
  const body = `You've earned a new code (${code.code}) for ${discountLabel} your next booking.`;

  await notifyUser(userId, {
    title,
    body,
    data: { screen: "Profile", code: code.code },
  });
  await createNotificationRecord({
    userId,
    dedupeKey: `loyalty-code-${code.code}`,
    title,
    message: body,
    step: 0,
    screen: "Profile",
  });
}

// Sent when a user's loyalty tier increases (e.g. Bronze -> Silver). Keyed
// on the tier name so re-evaluating loyalty after future completions never
// re-notifies for a tier already reached.
export async function notifyLoyaltyTierUp(userId, tier, tierBenefits) {
  if (!tier || tier === "None") return;

  const title = `You've Reached ${tier} Tier!`;
  const body = tierBenefits?.description
    ? `Congrats! You're now a ${tier} member: ${tierBenefits.description}`
    : `Congrats! You're now a ${tier} member. Check your profile for your new perks.`;

  await notifyUser(userId, {
    title,
    body,
    data: { screen: "Profile", tier },
  });
  await createNotificationRecord({
    userId,
    dedupeKey: `loyalty-tier-${tier}`,
    title,
    message: body,
    step: 0,
    screen: "Profile",
  });
}
