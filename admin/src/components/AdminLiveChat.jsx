// AdminLiveChat.jsx
import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import { Send, User, MessageCircle } from "lucide-react";
import API_BASE_URL from "../apiBase";

export default function AdminLiveChat() {
  const [adminStatus, setAdminStatus] = useState(
    () => localStorage.getItem("anaia_admin_status") || "Active",
  );
  const [activeChats, setActiveChats] = useState({});
  const [currentChatId, setCurrentChatId] = useState(null);
  const [input, setInput] = useState("");

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const currentChatIdRef = useRef(null);

  useEffect(() => {
    currentChatIdRef.current = currentChatId;
  }, [currentChatId]);

  useEffect(() => {
    const socket = io(API_BASE_URL);
    socketRef.current = socket;

    // Ask the server for the current status instead of pushing our stale
    // local default — this is what was overwriting "Busy" back to "Active"
    // on every reload.
    socket.emit("get_admin_status");
    socket.emit("get_admin_chats");

    socket.on("sync_admin_status", (status) => {
      if (!status) return;
      setAdminStatus(status);
      localStorage.setItem("anaia_admin_status", status);
    });

    socket.on("admin_status_update", (status) => {
      if (!status) return;
      setAdminStatus(status);
      localStorage.setItem("anaia_admin_status", status);
    });

    socket.on("sync_admin_chats", (sessions) => {
      const processedSessions = {};
      Object.entries(sessions || {}).forEach(([chatId, chat]) => {
        let profilePic = chat.profilePicture;

        if (!profilePic && chat.messages) {
          const lastUserMsgWithPic = [...chat.messages]
            .reverse()
            .find((m) => m.sender === "user" && m.profilePicture);
          if (lastUserMsgWithPic) {
            profilePic = lastUserMsgWithPic.profilePicture;
          }
        }

        processedSessions[chatId] = {
          ...chat,
          profilePicture: profilePic,
        };
      });
      setActiveChats(processedSessions);
    });

    socket.on("receive_user_message", (msg) => {
      setActiveChats((prevChats) => {
        const chatId = msg.chatId;
        const existingChat = prevChats[chatId] || {
          name: msg.name,
          profilePicture: msg.profilePicture,
          messages: [],
        };

        let newStatus = "Delivered";

        if (chatId === currentChatIdRef.current) {
          newStatus = "Seen";
          msg.status = "Seen";
        }

        socket.emit("update_message_status", {
          messageId: msg.id,
          status: newStatus,
        });

        return {
          ...prevChats,
          [chatId]: {
            ...existingChat,
            profilePicture: msg.profilePicture || existingChat.profilePicture,
            messages: [...existingChat.messages, msg],
          },
        };
      });
    });

    return () => socket.disconnect();
  }, []);

  const handleStatusChange = (e) => {
    const newStatus = e.target.value;
    setAdminStatus(newStatus);
    localStorage.setItem("anaia_admin_status", newStatus);
    if (socketRef.current) {
      socketRef.current.emit("set_admin_status", newStatus);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChats, currentChatId]);

  const handleSendMessage = () => {
    if (!input.trim() || !currentChatId) return;

    const newMsg = {
      id: Date.now().toString(),
      chatId: currentChatId,
      sender: "admin",
      name: "Anaia's Support",
      text: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setActiveChats((prev) => {
      const chat = prev[currentChatId];
      return {
        ...prev,
        [currentChatId]: {
          ...chat,
          messages: [...chat.messages, newMsg],
        },
      };
    });

    socketRef.current.emit("send_admin_message", newMsg);
    setInput("");
  };

  const formatTime = (isoString) => {
    return new Date(isoString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const chatEntries = Object.entries(activeChats);

  return (
    <div className="min-h-screen bg-[#f7f8fa] flex">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pt-36 w-full flex gap-6 h-[calc(100vh-2rem)]">
        {/* Sidebar */}
        <div className="w-1/3 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h2 className="font-black text-[#171717]">Active Chats</h2>
            <select
              value={adminStatus}
              onChange={handleStatusChange}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg border focus:outline-none ${
                adminStatus === "Active"
                  ? "bg-green-50 text-green-700 border-green-200"
                  : adminStatus === "Away"
                    ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                    : "bg-red-50 text-red-700 border-red-200"
              }`}
            >
              <option value="Active">🟢 Active</option>
              <option value="Away">🟡 Away</option>
              <option value="Busy">🔴 Busy</option>
            </select>
          </div>
          <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
            {chatEntries.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-400 mt-10">
                No active chats currently.
              </div>
            ) : (
              chatEntries.map(([chatId, chatData]) => {
                const lastMessage =
                  chatData.messages[chatData.messages.length - 1];

                const unreadCount = chatData.messages.filter(
                  (msg) => msg.sender === "user" && msg.status !== "Seen",
                ).length;

                return (
                  <div
                    key={chatId}
                    onClick={() => {
                      setCurrentChatId(chatId);
                      let updated = false;
                      chatData.messages.forEach((msg) => {
                        if (msg.sender === "user" && msg.status !== "Seen") {
                          socketRef.current.emit("update_message_status", {
                            messageId: msg.id,
                            status: "Seen",
                          });
                          msg.status = "Seen";
                          updated = true;
                        }
                      });
                      if (updated) {
                        setActiveChats((prev) => ({ ...prev }));
                      }
                    }}
                    className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors flex gap-3 items-center ${
                      currentChatId === chatId
                        ? "bg-slate-50 border-l-4 border-l-[#b50002]"
                        : unreadCount > 0
                          ? "bg-red-50/50"
                          : ""
                    }`}
                  >
                    {/* Sidebar Avatar */}
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center overflow-hidden border border-slate-200">
                      {chatData.profilePicture ? (
                        <img
                          src={chatData.profilePicture}
                          alt={chatData.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User size={18} className="text-slate-400" />
                      )}
                    </div>

                    <div className="flex-1 overflow-hidden">
                      <div className="flex justify-between items-start mb-1">
                        <span
                          className={`text-sm truncate ${unreadCount > 0 ? "font-black text-[#b50002]" : "font-bold text-[#171717]"}`}
                        >
                          {chatData.name}
                        </span>

                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`text-[10px] flex-shrink-0 ml-2 ${unreadCount > 0 ? "text-[#b50002] font-semibold" : "text-slate-400"}`}
                          >
                            {lastMessage
                              ? formatTime(lastMessage.timestamp)
                              : ""}
                          </span>

                          {unreadCount > 0 && (
                            <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-[#b50002] text-white text-[10px] font-black leading-none shadow-sm">
                              {unreadCount > 99 ? "99+" : unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                      <p
                        className={`text-xs truncate ${unreadCount > 0 ? "text-slate-700 font-semibold" : "text-slate-500"}`}
                      >
                        {lastMessage ? lastMessage.text : "New connection..."}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
          {currentChatId && activeChats[currentChatId] ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
                <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center overflow-hidden border border-slate-200">
                  {activeChats[currentChatId].profilePicture ? (
                    <img
                      src={activeChats[currentChatId].profilePicture}
                      alt={activeChats[currentChatId].name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="text-slate-500" />
                  )}
                </div>
                <div>
                  <h3 className="font-black text-[#171717]">
                    {activeChats[currentChatId].name}
                  </h3>
                  <p className="text-xs text-slate-400">Live now</p>
                </div>
              </div>

              {/* Message List */}
              <div className="flex-1 p-6 overflow-y-auto bg-slate-50 flex flex-col gap-4">
                {activeChats[currentChatId].messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col w-full ${msg.sender === "admin" ? "items-end" : "items-start"}`}
                  >
                    <span className="text-[10px] text-slate-400 mx-1 mb-1">
                      {msg.name} • {formatTime(msg.timestamp)}
                    </span>
                    <div
                      className={`p-3 text-[13px] leading-relaxed shadow-sm max-w-[75%] ${
                        msg.sender === "admin"
                          ? "bg-[#b50002] text-white rounded-2xl rounded-tr-sm"
                          : "bg-white border border-slate-200 text-[#171717] rounded-2xl rounded-tl-sm"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-slate-100 bg-white flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#b50002]/30"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!input.trim()}
                  className="bg-[#171717] text-white px-6 py-3 rounded-xl disabled:opacity-50 hover:brightness-110 transition-all font-bold text-sm flex items-center gap-2"
                >
                  <Send size={16} /> Send
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <MessageCircle size={48} className="mb-4 opacity-20" />
              <p>Select a chat from the sidebar to start messaging</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
