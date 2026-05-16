import Groq from "groq-sdk";
import ChatbotLog from "../models/chatbotModel.js";

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const SYSTEM_INSTRUCTION = `You are Anaia's AI, a friendly, helpful, and concise customer service assistant for Anaia's Motorcycle Rental.
Business Details:
- Location: Soldier's Hills IV, Molino VI, Bacoor, Cavite. (Strictly pick-up and return only, no delivery).
- Requirements: Valid Government ID, Driver's License, and proof of payment.
- Payment Methods: GCash, Maya, and Bank Transfer. Booking confirmed upon payment approval.
- Perks: 1 free helmet per rental. Extra helmet is 50 pesos. Unlimited fuel and mileage.
- Extensions: Allowed if requested before return time, subject to availability.
Tone: Enthusiastic, helpful, and professional. Keep answers brief and easy to read.`;

export const handleChat = async (req, res) => {
  try {
    const { message, history } = req.body;
    const userId = req.user ? req.user.id : null;

    if (!message) {
      return res
        .status(400)
        .json({ success: false, message: "Message is required" });
    }

    // Convert history from Gemini format to Groq/OpenAI format
    const formattedHistory = (history || [])
      .filter((msg) => msg.parts?.[0]?.text)
      .map((msg) => ({
        role: msg.role === "model" ? "assistant" : "user",
        content: msg.parts[0].text,
      }));

    // Call Groq API
    const response = await client.chat.completions.create({
      model: "llama-3.1-8b-instant", // Fast + free
      max_tokens: 1024,
      messages: [
        { role: "system", content: SYSTEM_INSTRUCTION },
        ...formattedHistory,
        { role: "user", content: message },
      ],
    });

    const botReply = response.choices[0].message.content;

    // Save to MongoDB
    await ChatbotLog.create({
      userId,
      userMessage: message,
      botReply,
    });

    return res.status(200).json({ success: true, reply: botReply });
  } catch (error) {
    console.error("Chatbot Controller Error:", error);
    return res.status(500).json({
      success: false,
      message: "I am having trouble connecting to my servers right now.",
    });
  }
};