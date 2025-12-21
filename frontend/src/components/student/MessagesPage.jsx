import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import {
  Mail,
  MailOpen,
  Inbox,
  Send,
  Trash2,
  Reply,
  Star,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  RefreshCw,
  User,
  Building2,
  Shield,
  Crown,
  MessageSquare,
  MailPlus,
  Loader2,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

const MessagesPage = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [activeTab, setActiveTab] = useState("inbox"); // 'inbox' | 'sent'
  const [unreadCount, setUnreadCount] = useState(0);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, [activeTab, pagination.page, filterRole]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const endpoint =
        activeTab === "inbox" ? "/message/inbox" : "/message/sent";
      const params = new URLSearchParams({
        page: pagination.page,
        limit: 15,
      });
      if (filterRole) params.append("senderRole", filterRole);

      const res = await axios.get(`${API_BASE}${endpoint}?${params}`, {
        withCredentials: true,
      });

      if (res.data.success) {
        setMessages(res.data.data.messages || []);
        setPagination(
          res.data.data.pagination || { page: 1, pages: 1, total: 0 },
        );
        if (activeTab === "inbox") {
          setUnreadCount(res.data.data.unreadCount || 0);
        }
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
      toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const res = await axios.get(`${API_BASE}/message/unread-count`, {
        withCredentials: true,
      });
      if (res.data.success) {
        setUnreadCount(res.data.data.unreadCount);
      }
    } catch (error) {
      console.log("Failed to fetch unread count");
    }
  };

  const openMessage = async (message) => {
    try {
      const res = await axios.get(`${API_BASE}/message/${message._id}`, {
        withCredentials: true,
      });
      if (res.data.success) {
        setSelectedMessage(res.data.data);
        // Update local state to mark as read
        if (!message.isRead) {
          setMessages((prev) =>
            prev.map((m) =>
              m._id === message._id ? { ...m, isRead: true } : m,
            ),
          );
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      }
    } catch (error) {
      toast.error("Failed to load message");
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put(
        `${API_BASE}/message/mark-all-read`,
        {},
        {
          withCredentials: true,
        },
      );
      setMessages((prev) => prev.map((m) => ({ ...m, isRead: true })));
      setUnreadCount(0);
      toast.success("All messages marked as read");
    } catch (error) {
      toast.error("Failed to mark messages as read");
    }
  };

  const deleteMessage = async (messageId) => {
    try {
      await axios.delete(`${API_BASE}/message/${messageId}`, {
        withCredentials: true,
      });
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
      if (selectedMessage?._id === messageId) {
        setSelectedMessage(null);
      }
      toast.success("Message deleted");
    } catch (error) {
      toast.error("Failed to delete message");
    }
  };

  const sendReply = async () => {
    if (!replyContent.trim() || !selectedMessage) return;

    setSending(true);
    try {
      await axios.post(
        `${API_BASE}/message/reply/${selectedMessage._id}`,
        {
          content: replyContent,
        },
        {
          withCredentials: true,
        },
      );
      toast.success("Reply sent!");
      setShowReplyModal(false);
      setReplyContent("");
      fetchMessages();
    } catch (error) {
      toast.error("Failed to send reply");
    } finally {
      setSending(false);
    }
  };

  const getSenderIcon = (role) => {
    switch (role) {
      case "admin":
      case "ceo":
        return <Crown className="w-4 h-4 text-[#FFD700]" />;
      case "recruiter":
      case "company_admin":
        return <Building2 className="w-4 h-4 text-blue-400" />;
      default:
        return <User className="w-4 h-4 text-gray-400" />;
    }
  };

  const getPriorityBadge = (priority) => {
    const styles = {
      urgent: "bg-red-500/20 text-red-400 border-red-500/30",
      high: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      normal: "bg-gray-500/20 text-gray-400 border-gray-500/30",
      low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    };
    return styles[priority] || styles.normal;
  };

  const getTypeBadge = (type) => {
    const styles = {
      interview: "bg-purple-500/20 text-purple-400",
      application: "bg-cyan-500/20 text-cyan-400",
      announcement: "bg-[#FFD700]/20 text-[#FFD700]",
      offer: "bg-emerald-500/20 text-emerald-400",
      general: "bg-gray-500/20 text-gray-400",
    };
    return styles[type] || styles.general;
  };

  const filteredMessages = messages.filter(
    (m) =>
      m.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.senderId?.fullname?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-[#FFD700]/20 to-amber-500/10 rounded-sm flex items-center justify-center border border-[#FFD700]/30">
            <Mail className="w-5 h-5 text-[#FFD700]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">MESSAGES</h1>
            <p className="text-xs text-gray-500 font-mono">
              {unreadCount > 0 ? `${unreadCount} UNREAD` : "ALL CAUGHT UP"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && activeTab === "inbox" && (
            <Button
              onClick={markAllAsRead}
              variant="ghost"
              size="sm"
              className="text-xs text-gray-400 hover:text-white"
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Mark all read
            </Button>
          )}
          <Button
            onClick={fetchMessages}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 mb-6 border-b border-white/10 pb-4">
        <button
          onClick={() => {
            setActiveTab("inbox");
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-mono transition-all ${
            activeTab === "inbox"
              ? "bg-[#FFD700] text-black"
              : "bg-white/5 text-gray-400 hover:bg-white/10"
          }`}
        >
          <Inbox className="w-4 h-4" />
          INBOX
          {unreadCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
              {unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => {
            setActiveTab("sent");
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-mono transition-all ${
            activeTab === "sent"
              ? "bg-[#FFD700] text-black"
              : "bg-white/5 text-gray-400 hover:bg-white/10"
          }`}
        >
          <Send className="w-4 h-4" />
          SENT
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages..."
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
          />
        </div>

        {activeTab === "inbox" && (
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-sm text-sm text-gray-300 focus:outline-none focus:border-[#FFD700]/50"
          >
            <option value="">All Senders</option>
            <option value="admin">Admin</option>
            <option value="ceo">CEO</option>
            <option value="recruiter">Recruiter</option>
          </select>
        )}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Message List */}
        <div className="lg:col-span-1 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-[#FFD700] animate-spin" />
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="font-mono text-sm">NO MESSAGES</p>
            </div>
          ) : (
            <>
              {filteredMessages.map((message) => (
                <motion.div
                  key={message._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => openMessage(message)}
                  className={`p-4 rounded-sm border cursor-pointer transition-all ${
                    selectedMessage?._id === message._id
                      ? "bg-[#FFD700]/10 border-[#FFD700]/30"
                      : message.isRead
                        ? "bg-white/5 border-white/10 hover:bg-white/10"
                        : "bg-white/10 border-white/20 hover:bg-white/15"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Unread indicator */}
                    <div
                      className={`w-2 h-2 rounded-full mt-2 ${
                        message.isRead ? "bg-transparent" : "bg-[#FFD700]"
                      }`}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getSenderIcon(
                          activeTab === "inbox"
                            ? message.senderRole
                            : message.receiverRole,
                        )}
                        <span className="text-sm font-medium text-white truncate">
                          {activeTab === "inbox"
                            ? message.senderId?.fullname
                            : message.receiverId?.fullname}
                        </span>
                      </div>
                      <p
                        className={`text-sm truncate ${
                          message.isRead
                            ? "text-gray-400"
                            : "text-white font-medium"
                        }`}
                      >
                        {message.subject}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(message.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                        {message.type !== "general" && (
                          <Badge
                            className={`text-[10px] ${getTypeBadge(message.type)}`}
                          >
                            {message.type}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <Button
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        page: prev.page - 1,
                      }))
                    }
                    disabled={pagination.page === 1}
                    variant="ghost"
                    size="sm"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-gray-400">
                    {pagination.page} / {pagination.pages}
                  </span>
                  <Button
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        page: prev.page + 1,
                      }))
                    }
                    disabled={pagination.page === pagination.pages}
                    variant="ghost"
                    size="sm"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Message Detail */}
        <div className="lg:col-span-2">
          {selectedMessage ? (
            <motion.div
              key={selectedMessage._id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-[#111111] border border-white/10 rounded-sm"
            >
              {/* Header */}
              <div className="p-6 border-b border-white/10">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FFD700]/20 to-amber-500/10 flex items-center justify-center">
                      {selectedMessage.senderId?.profile?.profilePhoto ? (
                        <img
                          src={selectedMessage.senderId.profile.profilePhoto}
                          alt=""
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        getSenderIcon(selectedMessage.senderRole)
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-white">
                        {selectedMessage.senderId?.fullname}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        {getSenderIcon(selectedMessage.senderRole)}
                        <span className="capitalize">
                          {selectedMessage.senderRole}
                        </span>
                        <span>•</span>
                        <span>{selectedMessage.senderId?.email}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeTab === "inbox" && (
                      <Button
                        onClick={() => setShowReplyModal(true)}
                        size="sm"
                        className="bg-[#FFD700] text-black hover:bg-[#FFD700]/90"
                      >
                        <Reply className="w-4 h-4 mr-1" />
                        Reply
                      </Button>
                    )}
                    <Button
                      onClick={() => deleteMessage(selectedMessage._id)}
                      size="sm"
                      variant="ghost"
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <h2 className="text-xl font-bold text-white mb-2">
                  {selectedMessage.subject}
                </h2>

                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(new Date(selectedMessage.createdAt), "PPP p")}
                  </span>
                  {selectedMessage.type !== "general" && (
                    <Badge className={getTypeBadge(selectedMessage.type)}>
                      {selectedMessage.type}
                    </Badge>
                  )}
                  <Badge className={getPriorityBadge(selectedMessage.priority)}>
                    {selectedMessage.priority}
                  </Badge>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="prose prose-invert max-w-none">
                  <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {selectedMessage.content}
                  </p>
                </div>

                {/* Related Info */}
                {(selectedMessage.relatedTo?.jobId ||
                  selectedMessage.relatedTo?.applicationId) && (
                  <div className="mt-6 p-4 bg-white/5 rounded-sm">
                    <p className="text-xs text-gray-500 uppercase mb-2">
                      Related To
                    </p>
                    {selectedMessage.relatedTo?.jobId && (
                      <p className="text-sm text-gray-300">
                        Job: {selectedMessage.relatedTo.jobId.title}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center h-96 text-gray-500">
              <MailOpen className="w-16 h-16 mb-4 opacity-30" />
              <p className="font-mono text-sm">SELECT A MESSAGE TO READ</p>
            </div>
          )}
        </div>
      </div>

      {/* Reply Modal */}
      <AnimatePresence>
        {showReplyModal && selectedMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setShowReplyModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#111111] border border-white/10 rounded-sm w-full max-w-lg"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="font-bold text-white">
                  Reply to {selectedMessage.senderId?.fullname}
                </h3>
                <button onClick={() => setShowReplyModal(false)}>
                  <X className="w-5 h-5 text-gray-400 hover:text-white" />
                </button>
              </div>
              <div className="p-4">
                <p className="text-xs text-gray-500 mb-2">
                  Re: {selectedMessage.subject}
                </p>
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write your reply..."
                  className="w-full h-40 px-4 py-3 bg-white/5 border border-white/10 rounded-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#FFD700]/50 resize-none"
                />
              </div>
              <div className="p-4 border-t border-white/10 flex justify-end gap-2">
                <Button
                  onClick={() => setShowReplyModal(false)}
                  variant="ghost"
                  className="text-gray-400"
                >
                  Cancel
                </Button>
                <Button
                  onClick={sendReply}
                  disabled={sending || !replyContent.trim()}
                  className="bg-[#FFD700] text-black hover:bg-[#FFD700]/90"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-1" />
                      Send Reply
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MessagesPage;
