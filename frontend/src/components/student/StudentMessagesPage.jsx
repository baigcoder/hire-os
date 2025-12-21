/**
 * StudentMessagesPage - Messaging System for Students
 * Industrial HIRE.OS Theme with Supabase Realtime
 *
 * Features:
 * - Message recruiters from their interview history
 * - Real-time typing indicators
 * - Online presence status
 * - Message status ticks
 * - Video/Audio Calls
 */

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import axios from "axios";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  MessageSquare,
  Send,
  User,
  Search,
  RefreshCw,
  ArrowLeft,
  Briefcase,
  Mail,
  Building,
  Check,
  CheckCheck,
  Clock,
  Phone,
  Video,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import Navbar from "../shared/Navbar";
import {
  MESSAGE_API_END_POINT,
  APPLICATION_API_END_POINT,
} from "@/utils/constant";
import { useRealtime } from "@/context/SocketContext";

const StudentMessagesPage = () => {
  const navigate = useNavigate();
  const { user } = useSelector((store) => store.auth);
  const messagesEndRef = useRef(null);
  const {
    isConnected,
    isUserOnline,
    getTypingUsers,
    startTyping,
    stopTyping,
    initiateCall,
    sendRealtimeMessage,
    newMessage,
  } = useRealtime();

  // State
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Listen for incoming realtime messages
  useEffect(() => {
    if (
      newMessage &&
      activeContact &&
      (newMessage.senderId === activeContact._id ||
        newMessage.receiverId === user?._id)
    ) {
      setConversation((prev) => {
        // Deduplicate
        const exists = prev.some(
          (m) =>
            m.content === newMessage.content &&
            Math.abs(new Date(m.createdAt) - new Date(newMessage.timestamp)) <
              1000,
        );
        if (exists) return prev;

        return [
          ...prev,
          {
            _id: Date.now(),
            sender: {
              _id: newMessage.senderId,
              fullname: newMessage.senderName,
            },
            content: newMessage.content,
            createdAt: newMessage.timestamp,
            isRead: false,
          },
        ];
      });
    }
  }, [newMessage, activeContact, user?._id]);

  // Fetch contacts (recruiters from application history)
  useEffect(() => {
    const fetchContacts = async () => {
      setLoading(true);
      try {
        // Get applications to find recruiters
        const res = await axios.get(`${APPLICATION_API_END_POINT}/get`, {
          withCredentials: true,
        });

        if (res.data.success) {
          const applications = res.data.application || [];

          // Extract unique recruiters from applications
          const recruiterMap = new Map();
          applications.forEach((app) => {
            if (app.job?.createdBy) {
              const recruiterId = app.job.createdBy._id || app.job.createdBy;
              if (!recruiterMap.has(recruiterId)) {
                recruiterMap.set(recruiterId, {
                  _id: recruiterId,
                  fullname: app.job.createdBy.fullname || "Recruiter",
                  profile: app.job.createdBy.profile,
                  companyName: app.job.company?.name,
                  jobTitle: app.job.title,
                  applicationStatus: app.status,
                });
              }
            }
          });

          setContacts(Array.from(recruiterMap.values()));
        }
      } catch (error) {
        console.error("Failed to fetch contacts:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user?._id) {
      fetchContacts();
    }
  }, [user]);

  // Load conversation
  const loadConversation = async (contactId) => {
    if (!contactId) return;

    setLoadingConversation(true);
    try {
      const res = await axios.get(
        `${MESSAGE_API_END_POINT}/conversation/${contactId}`,
        { withCredentials: true },
      );
      if (res.data.success) {
        setConversation(res.data.data?.messages || []);
      }
    } catch (error) {
      console.error("Failed to load conversation:", error);
      setConversation([]);
    } finally {
      setLoadingConversation(false);
    }
  };

  // Handle contact selection
  const handleSelectContact = (contact) => {
    setActiveContact(contact);
    setMessageText("");
    loadConversation(contact._id);
  };

  // Send message
  const handleSendMessage = async () => {
    if (!messageText.trim() || !activeContact?._id) return;

    const currentMessage = messageText;
    setSending(true);
    try {
      const res = await axios.post(
        `${MESSAGE_API_END_POINT}/send`,
        {
          receiverId: activeContact._id,
          subject: `Message from ${user?.fullname || "Student"}`,
          content: currentMessage,
        },
        { withCredentials: true },
      );

      if (res.data.success) {
        setMessageText("");
        setConversation((prev) => [
          ...prev,
          {
            _id: res.data.data?._id || Date.now(),
            sender: { _id: user?._id, fullname: user?.fullname },
            content: currentMessage,
            createdAt: new Date().toISOString(),
          },
        ]);

        // Send via Realtime
        sendRealtimeMessage(activeContact._id, currentMessage);

        toast.success("Message sent!");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  // Handle typing
  const handleTyping = (e) => {
    setMessageText(e.target.value);
    if (activeContact?._id && e.target.value) {
      startTyping(activeContact._id, activeContact._id);
    }
  };

  const handleBlur = () => {
    if (activeContact?._id) {
      stopTyping(activeContact._id, activeContact._id);
    }
  };

  // Handle Call
  const handleCall = (type) => {
    if (!activeContact) return;

    const callId = initiateCall(activeContact._id, type);
    if (callId) {
      toast.success(`Calling ${activeContact.fullname}...`);
    } else {
      toast.error("Connection not available");
    }
  };

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

  // Filter contacts
  const filteredContacts = contacts.filter((c) => {
    if (!searchQuery) return true;
    return (
      c.fullname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.companyName?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Get typing indicator
  const typingUsers = activeContact ? getTypingUsers(activeContact._id) : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FFD700]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      <Navbar />

      <div className="flex-1 pt-20 pb-4 px-4">
        <div className="h-[calc(100vh-6rem)] max-w-7xl mx-auto flex bg-[#0D0D0D] rounded-lg border border-white/10 overflow-hidden">
          {/* Contacts Sidebar */}
          <div className="w-80 border-r border-white/10 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-white/10">
              <h1 className="text-white font-bold text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#FFD700]" />
                Messages
                {isConnected && (
                  <span
                    className="w-2 h-2 bg-emerald-500 rounded-full ml-auto"
                    title="Connected"
                  />
                )}
              </h1>
              <p className="text-gray-500 text-xs mt-1">Contact recruiters</p>
            </div>

            {/* Search */}
            <div className="p-3 border-b border-white/10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-white/5 border-white/10 text-white text-sm"
                />
              </div>
            </div>

            {/* Contacts List */}
            <div className="flex-1 overflow-y-auto">
              {filteredContacts.length > 0 ? (
                filteredContacts.map((contact) => (
                  <button
                    key={contact._id}
                    onClick={() => handleSelectContact(contact)}
                    className={`w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-colors border-b border-white/5 ${
                      activeContact?._id === contact._id
                        ? "bg-[#FFD700]/10 border-l-2 border-l-[#FFD700]"
                        : ""
                    }`}
                  >
                    <div className="relative">
                      <Avatar className="h-12 w-12 border border-white/10">
                        <AvatarImage src={contact.profile?.profilePhoto} />
                        <AvatarFallback className="bg-white/10 text-white text-sm">
                          {contact.fullname?.charAt(0) || "R"}
                        </AvatarFallback>
                      </Avatar>
                      {isUserOnline(contact._id) && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0D0D0D]" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-white font-medium text-sm">
                        {contact.fullname}
                      </div>
                      <div className="text-gray-500 text-xs flex items-center gap-1">
                        <Building className="w-3 h-3" />
                        {contact.companyName || "Company"}
                      </div>
                      <div className="text-gray-600 text-xs truncate">
                        {contact.jobTitle}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-8 text-center">
                  <User className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No contacts found</p>
                  <p className="text-gray-600 text-xs mt-1">
                    Apply to jobs to connect with recruiters
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {activeContact ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-white/10 flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-10 w-10 border border-white/10">
                      <AvatarImage src={activeContact.profile?.profilePhoto} />
                      <AvatarFallback className="bg-white/10 text-white">
                        {activeContact.fullname?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    {isUserOnline(activeContact._id) && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#0D0D0D]" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-white font-bold">
                      {activeContact.fullname}
                    </h2>
                    <p className="text-gray-500 text-xs">
                      {isUserOnline(activeContact._id) ? (
                        <span className="text-emerald-400">Online</span>
                      ) : (
                        "Offline"
                      )}
                      {activeContact.companyName &&
                        ` • ${activeContact.companyName}`}
                    </p>
                  </div>

                  {/* Call Buttons */}
                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCall("audio")}
                      className="text-gray-400 hover:text-white w-10 h-10 p-0"
                    >
                      <Phone className="w-5 h-5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCall("video")}
                      className="text-gray-400 hover:text-white w-10 h-10 p-0"
                    >
                      <Video className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {loadingConversation ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#FFD700]" />
                    </div>
                  ) : conversation.length > 0 ? (
                    <>
                      {conversation.map((msg) => {
                        const senderId =
                          msg.sender?._id || msg.senderId?._id || msg.senderId;
                        const isMe = senderId === user?._id;

                        return (
                          <motion.div
                            key={msg._id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[70%] ${
                                isMe
                                  ? "bg-gradient-to-br from-[#FFD700] to-[#FFA500] text-black rounded-2xl rounded-br-sm"
                                  : "bg-white/10 text-white rounded-2xl rounded-bl-sm"
                              } px-4 py-3`}
                            >
                              <p
                                className={`text-sm ${isMe ? "text-[#000000]" : "text-white"}`}
                              >
                                {msg.content}
                              </p>
                              <div
                                className={`flex items-center justify-end gap-1 mt-1 ${
                                  isMe ? "text-[#000000]/50" : "text-gray-500"
                                }`}
                              >
                                <span className="text-[10px]">
                                  {format(new Date(msg.createdAt), "HH:mm")}
                                </span>
                                {isMe &&
                                  (msg.isRead ? (
                                    <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                                  ) : (
                                    <CheckCheck className="w-3.5 h-3.5" />
                                  ))}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <MessageSquare className="w-16 h-16 text-gray-700 mb-4" />
                      <h3 className="text-gray-400 font-bold">
                        Start a Conversation
                      </h3>
                      <p className="text-gray-600 text-sm mt-1">
                        Send a message to {activeContact.fullname}
                      </p>
                    </div>
                  )}

                  {/* Typing Indicator */}
                  {typingUsers.length > 0 && (
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                      <div className="flex gap-1">
                        <span
                          className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        />
                        <span
                          className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        />
                        <span
                          className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        />
                      </div>
                      {typingUsers[0]?.name} is typing...
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="p-4 border-t border-white/10">
                  <div className="flex gap-3">
                    <Input
                      value={messageText}
                      onChange={handleTyping}
                      onBlur={handleBlur}
                      onKeyDown={(e) =>
                        e.key === "Enter" && !e.shiftKey && handleSendMessage()
                      }
                      placeholder="Type a message..."
                      className="flex-1 bg-white/5 border-white/10 text-white"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!messageText.trim() || sending}
                      className="bg-[#FFD700] hover:bg-[#FFE44D] text-black px-6"
                    >
                      {sending ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="w-20 h-20 text-gray-700 mx-auto mb-4" />
                  <h2 className="text-gray-400 font-bold text-lg">
                    Select a Contact
                  </h2>
                  <p className="text-gray-600 text-sm mt-2">
                    Choose a recruiter to start messaging
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentMessagesPage;
