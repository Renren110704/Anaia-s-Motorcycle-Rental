import React, { useState, useEffect, useRef } from "react";
import { X, Send, MessageCircle, Check, CheckCheck, User } from "lucide-react";
import io from "socket.io-client";
import axios from "axios";
import API_BASE_URL from "../apiBase";

const themeRed = "#b50002";

// Helper to keep the chat alive after a page refresh
// const getPersistentChatId = () => {
//   let id = localStorage.getItem("anaia_chat_id");
//   if (!id) {
//     id = "user_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
//     localStorage.setItem("anaia_chat_id", id);
//   }
//   return id;
// };

export default function UserLiveChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [adminStatus, setAdminStatus] = useState("Active");
  const [hasSentFirstMessage, setHasSentFirstMessage] = useState(false);

  // New state to track the actual userId
  const [userId, setUserId] = useState(null);

  const [userName, setUserName] = useState("Guest");
  const [userPic, setUserPic] = useState("");

  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  // Derive chatId: Use userId if logged in, otherwise fallback to local storage
  const chatId =
    userId || localStorage.getItem("anaia_chat_id") || `guest_${Date.now()}`;

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const res = await axios.get(`${API_BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success && res.data.user) {
          setUserName(res.data.user.name || "Guest");
          setUserPic(res.data.user.profilePicture || "");
          // Set the userId to trigger the chatId update
          setUserId(res.data.user.id);
        }
      } catch {
        /* Silent fail */
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const socket = io(API_BASE_URL);
    socketRef.current = socket;

    // Only fetch history if we have an ID
    if (chatId) {
      socket.emit("get_user_history", chatId);
    }

    // Get the admin's current status as soon as we connect, then stay
    // subscribed to live changes so it updates without a refresh.
    socket.emit("get_admin_status");

    socket.on("sync_admin_status", (status) => {
      if (status) setAdminStatus(status);
    });

    socket.on("admin_status_update", (status) => {
      if (status) setAdminStatus(status);
    });

    socket.on("sync_user_history", (history) => {
      setMessages(history || []);
      if (history && history.length > 0) setHasSentFirstMessage(true);
    });

    // ... keep other socket listeners (receive_message, etc.) ...

    return () => socket.disconnect();
  }, [chatId]); // Re-run when chatId changes (e.g., after login)

  const handleSend = () => {
    if (!input.trim() || !socketRef.current) return;

    const newMessage = {
      id: Date.now().toString(),
      chatId: chatId, // Uses the logged-in ID
      sender: "user",
      name: userName,
      profilePicture: userPic,
      text: input.trim(),
      timestamp: new Date().toISOString(),
      status: "Sent",
    };

    setMessages((prev) => [...prev, newMessage]);
    socketRef.current.emit("send_message", newMessage);
    setInput("");

    if (!hasSentFirstMessage) {
      setHasSentFirstMessage(true);
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString() + 1,
            chatId: chatId,
            sender: "admin",
            name: "Anaia's Support",
            text: "Thank you for reaching out to us! We have received your message and will get back to you as soon as possible.",
            timestamp: new Date().toISOString(),
          },
        ]);
      }, 1000);
    }
  };

  const formatTime = (isoString) => {
    return new Date(isoString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const StatusIcon = ({ status }) => {
    if (status === "Sent") return <Check size={12} className="text-gray-400" />;
    if (status === "Delivered")
      return <CheckCheck size={12} className="text-gray-400" />;
    if (status === "Seen")
      return <CheckCheck size={12} className="text-blue-500" />;
    return null;
  };

  return (
    <div className="fixed bottom-44 right-8 z-50 flex flex-col items-end font-sans">
      {isOpen && (
        <div className="mb-4 w-80 sm:w-[350px] bg-white rounded-2xl shadow-2xl overflow-hidden border-gray-200 flex flex-col h-[480px] animate-fade-in">
          <div
            className="p-4 flex justify-between items-center"
            style={{ backgroundColor: themeRed }}
          >
            <div className="flex flex-col">
              <span className="font-semibold tracking-wide text-white">
                Live Support
              </span>
              <span className="text-xs text-gray-200 flex items-center gap-1">
                <div
                  className={`w-2 h-2 rounded-full ${adminStatus === "Active" ? "bg-green-400" : adminStatus === "Away" ? "bg-yellow-400" : "bg-red-400"}`}
                />
                Admin is {adminStatus}
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto bg-[#F9FBF9] flex flex-col gap-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar Rendering */}
                {msg.sender === "user" ? (
                  <div className="w-8 h-8 mt-4 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden flex items-center justify-center border border-gray-200">
                    {msg.profilePicture ? (
                      <img
                        src={msg.profilePicture}
                        alt={msg.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User size={16} className="text-gray-400" />
                    )}
                  </div>
                ) : (
                  <div className="w-8 h-8 mt-4 rounded-full bg-[#171717] flex-shrink-0 flex items-center justify-center border border-gray-200">
                    <span className="text-white text-xs font-bold">A</span>
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`flex flex-col max-w-[75%] ${msg.sender === "user" ? "items-end" : "items-start"}`}
                >
                  <span className="text-[10px] text-gray-400 mb-1">
                    {msg.name} • {formatTime(msg.timestamp)}
                  </span>
                  <div
                    className={`p-3 text-[13px] leading-relaxed shadow-sm ${
                      msg.sender === "user"
                        ? "bg-[#b50002] text-white rounded-2xl rounded-tr-sm"
                        : "bg-white border border-gray-100 text-gray-700 rounded-2xl rounded-tl-sm"
                    }`}
                  >
                    {msg.text}
                  </div>
                  {msg.sender === "user" && (
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-[10px] text-gray-400">
                        {msg.status}
                      </span>
                      <StatusIcon status={msg.status} />
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 bg-white border-t border-gray-100 flex gap-2 items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type your message..."
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#b50002]/30"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="bg-[#b50002] text-white p-2.5 rounded-xl disabled:opacity-50 transition-colors"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full shadow-xl bg-[#b50002] text-white hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
        >
          <MessageCircle size={24} />
        </button>
      )}
    </div>
  );
}
