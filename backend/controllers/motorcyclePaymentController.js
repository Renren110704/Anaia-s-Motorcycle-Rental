import MotorcycleBooking from "../models/motorcycleBookingModel.js";
import { verifyDigitalReceipt } from "../utils/receiptVerifier.js";

export const verifyMotorcyclePaymentReceipt = async (req, res) => {
  try {
    const { bookingId, referenceId, sentAmount, sentAt } = req.body || {};

    if (!referenceId || !sentAmount || !sentAt) {
      return res.status(400).json({
        success: false,
        message: "referenceId, sentAmount and sentAt are required",
      });
    }

    let expectedAmount = Number(req.body.expectedAmount || 200);
    if (bookingId) {
      const booking = await MotorcycleBooking.findById(bookingId).lean();
      if (booking?.reservationFee) {
        expectedAmount = Number(booking.reservationFee) || expectedAmount;
      }
    }

    const verification = await verifyDigitalReceipt({
      referenceId,
      sentAmount,
      expectedAmount,
      sentAt,
      file: req.file,
    });

    return res.json({
      success: true,
      verification,
    });
  } catch (err) {
    console.error("Verify Motorcycle Receipt Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Server Error",
    });
  }
};
