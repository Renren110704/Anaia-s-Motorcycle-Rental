import React, { useState, useEffect, useRef } from "react";
import API_BASE_URL from "../apiBase";
import { X, Send, Loader2 } from "lucide-react";

// Use the colors from your theme
const themeRed = "#b50002";
const themeGray = "#e3e3e3";

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "Hello! I'm Anaia's AI, your virtual assistant. How can I help you today? Feel free to ask about bookings, rentals, our fleet, or anything about Anaia's Motorcycle Rental!",
    },
  ]);

  // Auto-hide the welcome tooltip after 10 seconds
  useEffect(() => {
    if (showTooltip) {
      const timer = setTimeout(() => setShowTooltip(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [showTooltip]);

  // Auto-scroll to the bottom of the chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userText = input.trim();
    
    // 1. Add user message to UI
    setMessages((prev) => [...prev, { sender: "user", text: userText }]);
    setInput("");
    setIsTyping(true);

    try {
      // 2. Format history to send to the backend
      const chatHistory = messages
        .filter((msg) => msg.sender !== "bot" || !msg.text.includes("Hello! I'm Anaia's AI"))
        .map((msg) => ({
          role: msg.sender === "user" ? "user" : "model",
          parts: [{ text: msg.text }],
        }));

      // 3. Make a POST request to your backend route
      // Make sure this matches your actual backend endpoint mapping (e.g., http://localhost:5000/api/chatbot)
      // If you have a proxy set up in package.json or an axios instance, adjust the URL accordingly.
      const response = await fetch(`${API_BASE_URL}/api/chatbot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Uncomment below if your backend requires the user's token:
          // "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          message: userText,
          history: chatHistory,
        }),
      });

      const data = await response.json();

      // 4. Add bot response to UI
      if (response.ok && data.success) {
        setMessages((prev) => [...prev, { sender: "bot", text: data.reply }]);
      } else {
        throw new Error(data.message || "Failed to fetch response from backend");
      }
    } catch (error) {
      console.error("Chatbot API error:", error);
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "I'm having trouble connecting to my servers right now. Please call or message our Facebook page directly!" },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-24 right-8 z-50 flex flex-col items-end font-sans">
      {/* Tooltip Popup */}
      {!isOpen && showTooltip && (
        <div
          className={`mb-4 bg-white rounded-xl p-4 shadow-lg w-64 text-sm text-gray-700 relative animate-fade-in`}
          style={{ borderColor: themeRed }}
        >
          Have other questions? Our robot friend is here to help! Chat with us
          for instant assistance.
          <button
            onClick={() => setShowTooltip(false)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main Chat Window */}
      {isOpen && (
        <div className="mb-4 w-80 sm:w-[350px] bg-white rounded-2xl shadow-2xl overflow-hidden border-gray-200 flex flex-col h-[480px] animate-fade-in">
          {/* Header */}
          <div
            className="p-4 flex justify-between items-center"
            style={{ backgroundColor: themeRed }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs"
                style={{ backgroundColor: themeGray, color: themeRed }}
              >
                AI
              </div>
              <span
                className="font-semibold tracking-wide"
                style={{ color: themeGray }}
              >
                Anaia's AI
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: themeGray }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 p-4 overflow-y-auto bg-[#F9FBF9] flex flex-col gap-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`max-w-[85%] p-3 text-[13px] leading-relaxed shadow-sm ${
                  msg.sender === "bot"
                    ? `bg-white border border-gray-100 text-gray-700 self-start rounded-2xl rounded-tl-sm`
                    : `text-white self-end rounded-2xl rounded-tr-sm`
                }`}
                style={
                  msg.sender === "user" ? { backgroundColor: themeRed } : {}
                }
              >
                {/* Simple Markdown Bold parsing for cleaner UI responses */}
                <span dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br />') }} />
              </div>
            ))}
            
            {/* Typing Indicator */}
            {isTyping && (
              <div className="bg-white border border-gray-100 text-gray-400 self-start rounded-2xl rounded-tl-sm p-3 shadow-sm flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-[12px]">Anaia's AI is typing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-gray-100 flex gap-2 items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask me anything about Anaia's..."
              className={`flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none`}
              style={{ "--tw-ring-color": themeRed }} 
              disabled={isTyping}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="bg-gray-100 text-gray-400 p-2.5 rounded-xl hover:text-white disabled:opacity-50 disabled:hover:bg-gray-100 disabled:hover:text-gray-400 transition-colors"
              style={
                input.trim() && !isTyping ? { backgroundColor: themeRed, color: "white" } : {}
              }
            >
              <Send size={18} />
            </button>
          </div>

          {/* Footer Branding */}
          <div className="text-center py-2 text-[10px] text-gray-400 bg-gray-50 border-t border-gray-100">
            Powered by AI • Anaia's Motorcycle Rental
          </div>
        </div>
      )}

      {/* Floating Action Button (FAB) */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setShowTooltip(false);
          }}
          className="w-14 h-14 rounded-full shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center overflow-hidden bg-white"
          aria-label="Open Chatbot"
        >
          <img
            src="/images/robot.gif"
            alt="Robot GIF"
            className="w-14 h-14 object-contain block rounded-full"
          />
        </button>
      )}
    </div>
  );
}