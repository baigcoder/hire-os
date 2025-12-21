/**
 * RecruiterMessagesPage - Messaging System for Recruiters
 * Industrial HIRE.OS Theme
 *
 * Features:
 * - CEO/Admin as default contact with direct chat
 * - Interview candidates in conversation list
 * - Click contact to open chat directly
 * - Profile details panel when chat opens
 * - Real-time typing indicators and call signaling
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
  Users,
  Search,
  ArrowLeft,
  RefreshCw,
  Crown,
  Phone,
  Video,
  Mail,
  MapPin,
  Briefcase,
  X,
  Calendar,
  Clock,
  Check,
  CheckCheck,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Textarea } from "../ui/textarea";
import Navbar from "../shared/Navbar";
import {
  MESSAGE_API_END_POINT,
  COMPANY_API_END_POINT,
  INTERVIEW_API_END_POINT,
} from "@/utils/constant";
import { useRealtime } from "@/context/SocketContext";

const RecruiterMessagesPage = () => {
  const navigate = useNavigate();
  const { user } = useSelector((store) => store.auth);
  const messagesEndRef = useRef(null);
  const {
    isConnected,
    isUserOnline,
    getUserPresence,
    getTypingUsers,
    startTyping,
    stopTyping,
    initiateCall,
    sendRealtimeMessage,
    newMessage,
  } = useRealtime();

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Active chat
  const [activeContact, setActiveContact] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(false);

  // Profile panel
  const [showProfile, setShowProfile] = useState(false);

  // Contacts
  const [contacts, setContacts] = useState([]);
  const [ceoContact, setCeoContact] = useState(null);

  // Call state
  const [isCallActive, setIsCallActive] = useState(false);
  const [callType, setCallType] = useState(null); // 'audio' or 'video'

  // Listen for incoming realtime messages
  useEffect(() => {
    if (
      newMessage &&
      activeContact &&
      (newMessage.senderId === activeContact._id ||
        newMessage.receiverId === user?._id)
    ) {
      setConversation((prev) => {
        // Deduplicate based on content and close timestamp
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

  // Fetch data on mount
  useEffect(() => {
    fetchAllData();
  }, []);

  // Scroll to bottom when conversation updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

  const fetchAllData = async () => {
    setLoading(true);
    await fetchContacts();
    setLoading(false);
  };

  const fetchContacts = async () => {
    try {
      // Fetch companies for the recruiter
      const companyRes = await axios.get(`${COMPANY_API_END_POINT}/get`, {
        withCredentials: true,
      });

      if (companyRes.data.success && companyRes.data.companies?.length > 0) {
        const company = companyRes.data.companies[0];

        // Now fetch company by ID to get populated adminUser
        const detailRes = await axios.get(
          `${COMPANY_API_END_POINT}/get/${company._id}`,
          {
            withCredentials: true,
          },
        );

        if (detailRes.data.success && detailRes.data.company?.adminUser) {
          const ceo = detailRes.data.company.adminUser;
          const ceoData = {
            _id: ceo._id,
            fullname: ceo.fullname || "Company Admin",
            email: ceo.email || "",
            role: "company_admin",
            isCEO: true,
            profile: ceo.profile || {},
            companyName: company.name,
          };
          setCeoContact(ceoData);
          // Default to CEO chat if no active contact
          if (!activeContact) {
            setActiveContact(ceoData);
            loadConversation(ceoData._id);
          }
        }
      }

      // Fetch interview candidates
      const interviewRes = await axios.get(
        `${INTERVIEW_API_END_POINT}/recruiter/my-interviews`,
        {
          withCredentials: true,
        },
      );

      if (interviewRes.data.success) {
        const candidates = (interviewRes.data.interviews || [])
          .filter((int) => int.studentId)
          .map((int) => ({
            _id: int.studentId._id,
            fullname: int.studentId.fullname,
            email: int.studentId.email || "",
            role: "student",
            jobTitle: int.jobId?.title || "Candidate",
            profile: int.studentId.profile || {},
            interviewDate: int.scheduledAt,
          }));

        const uniqueCandidates = candidates.filter(
          (c, i, arr) => arr.findIndex((x) => x._id === c._id) === i,
        );

        setContacts(uniqueCandidates);
      }
    } catch (error) {
      console.error("Failed to fetch contacts:", error);
      // Don't toast error here to avoid annoyance if just empty
    }
  };

  const handleCall = (type) => {
    if (!activeContact) return;

    // In a real implementation, this would open a call modal/overlay
    // For now, we'll simulate the signaling
    const callId = initiateCall(activeContact._id, type);
    if (callId) {
      setCallType(type);
      setIsCallActive(true);
      toast.success(`Calling ${activeContact.fullname}...`);
      // Here you would mount the WebRTC component with callId
    } else {
      toast.error("Connection not available. Attempting to reconnect...");
    }
  };

  const loadConversation = async (contactId) => {
    if (!contactId) {
      setConversation([]);
      return;
    }

    setLoadingConversation(true);
    try {
      const res = await axios.get(
        `${MESSAGE_API_END_POINT}/conversation/${contactId}`,
        { withCredentials: true },
      );
      if (res.data.success) {
        // Backend returns data.messages
        setConversation(res.data.data?.messages || []);
      }
    } catch (error) {
      console.error("Failed to load conversation:", error);
      setConversation([]);
    } finally {
      setLoadingConversation(false);
    }
  };

  const handleSelectContact = (contact) => {
    setActiveContact(contact);
    setMessageText("");
    setShowProfile(false);
    loadConversation(contact._id);
  };

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

  const handleSendMessage = async () => {
    if (!messageText.trim() || !activeContact?._id) {
      return;
    }

    setSending(true);
    try {
      const res = await axios.post(
        `${MESSAGE_API_END_POINT}/send`,
        {
          receiverId: activeContact._id,
          subject: `Chat with ${user?.fullname || "Recruiter"}`,
          content: messageText,
        },
        { withCredentials: true },
      );

      if (res.data.success) {
        const msgContent = messageText;
        setMessageText("");
        // Backend returns data._id
        setConversation((prev) => [
          ...prev,
          {
            _id: res.data.data?._id || Date.now(),
            sender: { _id: user?._id, fullname: user?.fullname },
            receiver: activeContact,
            content: msgContent,
            createdAt: new Date().toISOString(),
          },
        ]);

        // Send via Realtime
        sendRealtimeMessage(activeContact._id, msgContent);

        toast.success("Message sent!");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (activeContact) {
      await loadConversation(activeContact._id);
    }
    setRefreshing(false);
    toast.success("Messages refreshed");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const filteredContacts = [
    ...(ceoContact ? [ceoContact] : []),
    ...contacts,
  ].filter((c) => {
    if (!searchQuery) return true;
    return c.fullname?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FFD700]" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#0A0A0A] text-white font-['Space_Grotesk',sans-serif] flex flex-col overflow-hidden">
      <Navbar />

      {/* Main Content - Full Height */}
      <div className="flex-1 flex overflow-hidden pt-16">
        {/* Contacts Sidebar */}
        <div className="w-80 flex-shrink-0 bg-[#0D0D0D] border-r border-white/10 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-lg font-bold uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#FFD700]" />
                Messages
                {isConnected && (
                  <span
                    className="w-2 h-2 bg-emerald-500 rounded-full ml-auto"
                    title="Connected"
                  />
                )}
              </h1>
              <Button
                onClick={handleRefresh}
                disabled={refreshing}
                size="sm"
                variant="ghost"
                className="text-gray-400 hover:text-white"
              >
                <RefreshCw
                  className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="pl-10 bg-white/5 border-white/10 text-white text-sm h-10"
              />
            </div>
          </div>

          {/* Contacts List */}
          <div className="flex-1 overflow-y-auto">
            {/* CEO Section */}
            {ceoContact && (
              <div>
                <div className="px-4 py-2 bg-[#FFD700]/5 flex items-center gap-2">
                  <Crown className="w-3 h-3 text-[#FFD700]" />
                  <span className="text-[10px] text-[#FFD700] uppercase tracking-wider font-bold">
                    Company Admin
                  </span>
                </div>
                <button
                  onClick={() => handleSelectContact(ceoContact)}
                  className={`w-full flex items-center gap-3 p-4 transition-all border-l-2 ${
                    activeContact?._id === ceoContact._id
                      ? "bg-[#FFD700]/10 border-[#FFD700]"
                      : "border-transparent hover:bg-white/5"
                  }`}
                >
                  <div className="relative">
                    <Avatar className="h-12 w-12 border-2 border-[#FFD700]/30">
                      <AvatarImage src={ceoContact.profile?.profilePhoto} />
                      <AvatarFallback className="bg-[#FFD700]/10 text-[#FFD700] font-bold text-lg">
                        {ceoContact.fullname?.charAt(0) || "C"}
                      </AvatarFallback>
                    </Avatar>
                    {isUserOnline(ceoContact._id) && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0D0D0D]" />
                    )}
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <div className="font-bold text-white truncate">
                      {ceoContact.fullname}
                    </div>
                    <div className="text-gray-500 text-xs truncate">
                      {ceoContact.companyName || "CEO / Administrator"}
                    </div>
                  </div>
                </button>
              </div>
            )}

            {/* Candidates Section */}
            {contacts.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-cyan-500/5 flex items-center gap-2 mt-2">
                  <Users className="w-3 h-3 text-cyan-400" />
                  <span className="text-[10px] text-cyan-400 uppercase tracking-wider font-bold">
                    Candidates ({contacts.length})
                  </span>
                </div>
                {contacts.map((contact) => (
                  <button
                    key={contact._id}
                    onClick={() => handleSelectContact(contact)}
                    className={`w-full flex items-center gap-3 p-4 transition-all border-l-2 ${
                      activeContact?._id === contact._id
                        ? "bg-cyan-500/10 border-cyan-400"
                        : "border-transparent hover:bg-white/5"
                    }`}
                  >
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={contact.profile?.profilePhoto} />
                        <AvatarFallback className="bg-cyan-500/10 text-cyan-400">
                          {contact.fullname?.charAt(0) || "C"}
                        </AvatarFallback>
                      </Avatar>
                      {isUserOnline(contact._id) && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0D0D0D]" />
                      )}
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <div className="font-medium text-white truncate">
                        {contact.fullname}
                      </div>
                      <div className="text-gray-600 text-xs truncate">
                        {contact.jobTitle}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!ceoContact && contacts.length === 0 && (
              <div className="p-8 text-center">
                <Users className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-600 text-sm">No contacts available</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-[#0A0A0A]">
          {activeContact ? (
            <>
              {/* Chat Header */}
              <div className="h-16 px-6 flex items-center justify-between bg-[#0D0D0D] border-b border-white/10 flex-shrink-0">
                <button
                  onClick={() => setShowProfile(!showProfile)}
                  className="flex items-center gap-4 hover:opacity-80 transition-opacity"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={activeContact.profile?.profilePhoto} />
                    <AvatarFallback
                      className={
                        activeContact.isCEO
                          ? "bg-[#FFD700]/10 text-[#FFD700]"
                          : "bg-cyan-500/10 text-cyan-400"
                      }
                    >
                      {activeContact.fullname?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-bold text-white flex items-center gap-2">
                      {activeContact.fullname}
                      {activeContact.isCEO && (
                        <Crown className="w-4 h-4 text-[#FFD700]" />
                      )}
                    </div>
                    <div className="text-gray-500 text-xs flex items-center gap-2">
                      <span>
                        {activeContact.isCEO
                          ? "Company Admin"
                          : activeContact.jobTitle || "Candidate"}
                      </span>
                      {isUserOnline(activeContact._id) && (
                        <>
                          <span className="w-1 h-1 bg-gray-600 rounded-full" />
                          <span className="text-emerald-400 font-medium">
                            Online
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </button>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCall("audio")}
                    className="text-gray-500 hover:text-white w-10 h-10 p-0"
                  >
                    <Phone className="w-5 h-5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCall("video")}
                    className="text-gray-500 hover:text-white w-10 h-10 p-0"
                  >
                    <Video className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 flex overflow-hidden">
                {/* Messages */}
                <div
                  className={`flex-1 flex flex-col ${showProfile ? "border-r border-white/10" : ""}`}
                >
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {loadingConversation ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#FFD700]" />
                      </div>
                    ) : conversation.length > 0 ? (
                      <>
                        {conversation.map((msg) => {
                          const senderId =
                            msg.sender?._id ||
                            msg.senderId?._id ||
                            msg.senderId;
                          const isMe = senderId === user?._id;

                          return (
                            <motion.div
                              key={msg._id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[60%] ${
                                  isMe
                                    ? "bg-gradient-to-br from-[#FFD700] to-[#FFA500] text-[#000000] rounded-2xl rounded-br-sm shadow-lg shadow-[#FFD700]/20"
                                    : "bg-white/10 text-white rounded-2xl rounded-bl-sm backdrop-blur-sm"
                                } px-4 py-3`}
                              >
                                <p
                                  className={`text-sm leading-relaxed ${isMe ? "text-[#000000]" : "text-white"}`}
                                >
                                  {msg.content}
                                </p>
                                <div
                                  className={`flex items-center justify-end gap-1 mt-2 ${
                                    isMe ? "text-[#000000]/50" : "text-gray-500"
                                  }`}
                                >
                                  <span className="text-[10px]">
                                    {format(new Date(msg.createdAt), "HH:mm")}
                                  </span>
                                  {/* Tick indicators for sent messages */}
                                  {isMe &&
                                    (msg.isRead ? (
                                      <CheckCheck className="w-3.5 h-3.5 text-blue-600" />
                                    ) : msg._id ? (
                                      <CheckCheck className="w-3.5 h-3.5" />
                                    ) : (
                                      <Check className="w-3.5 h-3.5" />
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
                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
                          <MessageSquare className="w-10 h-10 text-gray-600" />
                        </div>
                        <h3 className="text-gray-400 font-bold text-lg mb-2">
                          Start a Conversation
                        </h3>
                        <p className="text-gray-600 text-sm max-w-xs">
                          Send a message to {activeContact.fullname}
                        </p>
                      </div>
                    )}

                    {/* Typing Indicator */}
                    {getTypingUsers(activeContact?._id).length > 0 && (
                      <div className="flex items-center gap-2 text-gray-500 text-xs px-2">
                        <div className="flex gap-1">
                          <span
                            className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"
                            style={{ animationDelay: "0ms" }}
                          />
                          <span
                            className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"
                            style={{ animationDelay: "150ms" }}
                          />
                          <span
                            className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"
                            style={{ animationDelay: "300ms" }}
                          />
                        </div>
                        typing...
                      </div>
                    )}
                  </div>

                  {/* Message Input */}
                  <div className="p-4 bg-[#0D0D0D] border-t border-white/10 flex-shrink-0">
                    <div className="flex items-end gap-3">
                      <Textarea
                        value={messageText}
                        onChange={handleTyping}
                        onBlur={handleBlur}
                        onKeyDown={(e) =>
                          e.key === "Enter" &&
                          !e.shiftKey &&
                          handleSendMessage()
                        }
                        placeholder={`Message ${activeContact.fullname}...`}
                        className="flex-1 bg-white/5 border-white/10 text-white resize-none min-h-[50px] max-h-32 text-sm"
                        rows={1}
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={sending || !messageText.trim()}
                        className="bg-[#FFD700] hover:bg-[#FFE44D] text-black font-bold h-12 w-12 p-0 rounded-xl"
                      >
                        {sending ? (
                          <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : (
                          <Send className="w-5 h-5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Profile Panel */}
                {showProfile && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 320, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    className="w-80 bg-[#0D0D0D] border-l border-white/10 overflow-y-auto flex-shrink-0"
                  >
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-6">
                        <h3 className="text-xs text-gray-500 uppercase tracking-wider font-bold">
                          Profile Details
                        </h3>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowProfile(false)}
                          className="text-gray-500 hover:text-white -mr-2 -mt-2"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Avatar */}
                      <div className="text-center mb-6">
                        <Avatar className="h-24 w-24 mx-auto mb-4 border-4 border-white/10">
                          <AvatarImage
                            src={activeContact.profile?.profilePhoto}
                          />
                          <AvatarFallback
                            className={`text-3xl ${
                              activeContact.isCEO
                                ? "bg-[#FFD700]/10 text-[#FFD700]"
                                : "bg-cyan-500/10 text-cyan-400"
                            }`}
                          >
                            {activeContact.fullname?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <h2 className="text-xl font-bold text-white mb-1">
                          {activeContact.fullname}
                        </h2>
                        <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
                          {activeContact.isCEO ? (
                            <>
                              <Crown className="w-4 h-4 text-[#FFD700]" />
                              <span>Company Admin</span>
                            </>
                          ) : (
                            <>
                              <Briefcase className="w-4 h-4 text-cyan-400" />
                              <span>
                                {activeContact.jobTitle || "Candidate"}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Info Cards */}
                      <div className="space-y-3">
                        {activeContact.email && (
                          <div className="bg-white/5 rounded-lg p-4">
                            <div className="flex items-center gap-3">
                              <Mail className="w-5 h-5 text-gray-500" />
                              <div>
                                <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                                  Email
                                </p>
                                <p className="text-white text-sm">
                                  {activeContact.email}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {activeContact.companyName && (
                          <div className="bg-white/5 rounded-lg p-4">
                            <div className="flex items-center gap-3">
                              <Briefcase className="w-5 h-5 text-gray-500" />
                              <div>
                                <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                                  Company
                                </p>
                                <p className="text-white text-sm">
                                  {activeContact.companyName}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {activeContact.interviewDate && (
                          <div className="bg-white/5 rounded-lg p-4">
                            <div className="flex items-center gap-3">
                              <Calendar className="w-5 h-5 text-gray-500" />
                              <div>
                                <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                                  Interview
                                </p>
                                <p className="text-white text-sm">
                                  {format(
                                    new Date(activeContact.interviewDate),
                                    "MMM d, yyyy",
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="bg-white/5 rounded-lg p-4">
                          <div className="flex items-center gap-3">
                            <User className="w-5 h-5 text-gray-500" />
                            <div>
                              <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                                Role
                              </p>
                              <p className="text-white text-sm capitalize">
                                {activeContact.role === "company_admin"
                                  ? "Administrator"
                                  : activeContact.role}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6">
                <MessageSquare className="w-12 h-12 text-gray-600" />
              </div>
              <h3 className="text-gray-400 font-bold text-xl mb-2">
                No Chat Selected
              </h3>
              <p className="text-gray-600 text-sm max-w-xs">
                Select a contact from the sidebar to start messaging
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecruiterMessagesPage;
