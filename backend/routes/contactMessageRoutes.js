import express from "express";
import ContactMessage from "../models/ContactMessage.js";
import adminAuth from "../middlewares/adminAuth.js";

const router = express.Router();

const sendWithBrevoApi = async ({ from, to, subject, html }) => {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "api-key": process.env.BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: { email: from },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Brevo API error (${response.status}): ${body}`);
  }
};

// POST /api/contact-messages
router.post("/", async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;
    if (!message?.trim())
      return res.status(400).json({ message: "Message is required." });

    const doc = await ContactMessage.create({ name, email, phone, message });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/contact-messages (admin)
router.get("/", adminAuth, async (req, res) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/contact-messages/:id/reply (admin)
router.patch("/:id/reply", adminAuth, async (req, res) => {
  try {
    const { replyMessage } = req.body;
    if (!replyMessage?.trim())
      return res.status(400).json({ message: "Reply message is required." });

    const doc = await ContactMessage.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Message not found." });

    await sendWithBrevoApi({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: doc.email,
      subject: "Reply to Your Inquiry — Anaia's Motorcycle Rental",
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#b50002">Anaia's Motorcycle Rental</h2>
          <p>Hi <strong>${doc.name || "there"}</strong>,</p>
          <p>Thank you for reaching out. Here is our reply to your inquiry:</p>
          <div style="background:#f4f3f3;border-left:4px solid #b50002;padding:16px;border-radius:8px;margin:16px 0">
            <p style="margin:0;color:#171717">${replyMessage.replace(/\n/g, "<br>")}</p>
          </div>
          <hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0"/>
          <p style="color:#999;font-size:12px">Your original message: <em>${doc.message}</em></p>
          <p style="color:#999;font-size:12px">Anaia's Motorcycle Rental · Bacoor, Cavite</p>
        </div>
      `,
    });

    doc.adminReplyMessage = replyMessage.trim();
    doc.adminRepliedAt = new Date();
    await doc.save();

    res.json({ success: true, message: "Reply sent successfully.", data: doc });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
