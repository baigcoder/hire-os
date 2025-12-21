import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  Calendar,
  Briefcase,
  Video,
  Gift,
  AlertTriangle,
  MessageSquare,
  CreditCard,
  Users,
  ChevronRight,
  Filter,
  RefreshCw,
  Eye,
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { ScrollArea } from "../ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { toast } from "sonner";
import axios from "axios";
import { NOTIFICATION_API_END_POINT } from "@/utils/constant";
import { formatDistanceToNow } from "date-fns";

// Notification Icon Mapping
const getNotificationIcon = (type) => {
  const icons = {
    interview_scheduled: Calendar,
    interview_reminder: Bell,
    application_received: Briefcase,
    application_status_update: Eye,
    mcq_available: MessageSquare,
    video_interview_ready: Video,
    offer_received: Gift,
    fraud_alert: AlertTriangle,
    payment_success: CreditCard,
    recruiter_joined: Users,
  };
  return icons[type] || Bell;
};

// Notification Color Mapping
const getNotificationColor = (type, priority) => {
  if (priority === "urgent") return "text-red-400 bg-red-500/20";
  if (priority === "high") return "text-yellow-400 bg-yellow-500/20";

  const colors = {
    interview_scheduled: "text-green-400 bg-green-500/20",
    offer_received: "text-yellow-400 bg-yellow-500/20",
    fraud_alert: "text-red-400 bg-red-500/20",
    payment_success: "text-green-400 bg-green-500/20",
    application_received: "text-blue-400 bg-blue-500/20",
  };
  return colors[type] || "text-gray-400 bg-gray-500/20";
};

// Single Notification Item
const NotificationItem = ({ notification, onRead, onDelete, onClick }) => {
  const Icon = getNotificationIcon(notification.type);
  const colorClass = getNotificationColor(
    notification.type,
    notification.priority,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className={`p-4 border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors cursor-pointer ${
        !notification.read ? "bg-zinc-900/50" : ""
      }`}
      onClick={() => onClick(notification)}
    >
      <div className="flex gap-4">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClass}`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4
              className={`font-medium ${notification.read ? "text-gray-400" : "text-white"}`}
            >
              {notification.title}
            </h4>
            {!notification.read && (
              <span className="w-2 h-2 bg-yellow-500 rounded-full flex-shrink-0 mt-2"></span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
            {notification.message}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-gray-600">
              {formatDistanceToNow(new Date(notification.createdAt), {
                addSuffix: true,
              })}
            </span>
            {notification.priority === "urgent" && (
              <Badge className="text-xs bg-red-500/20 text-red-400 px-2 py-0">
                Urgent
              </Badge>
            )}
            {notification.priority === "high" && (
              <Badge className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0">
                Important
              </Badge>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-500 hover:text-white"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                <circle cx="8" cy="3" r="1.5" />
                <circle cx="8" cy="8" r="1.5" />
                <circle cx="8" cy="13" r="1.5" />
              </svg>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-zinc-900 border-zinc-800">
            {!notification.read && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onRead(notification._id);
                }}
                className="text-gray-300 focus:bg-zinc-800"
              >
                <Check className="w-4 h-4 mr-2" />
                Mark as read
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete(notification._id);
              }}
              className="text-red-400 focus:bg-zinc-800"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
};

// Mini Notification Bell (for Navbar)
export const NotificationBell = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(
        `${NOTIFICATION_API_END_POINT}?limit=5`,
        {
          withCredentials: true,
        },
      );
      if (response.data.success) {
        setNotifications(response.data.notifications);
      }
    } catch (error) {
      console.error("Failed to fetch notifications");
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await axios.get(
        `${NOTIFICATION_API_END_POINT}/unread-count`,
        {
          withCredentials: true,
        },
      );
      if (response.data.success) {
        setUnreadCount(response.data.unreadCount);
      }
    } catch (error) {
      console.error("Failed to fetch unread count");
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await axios.put(
        `${NOTIFICATION_API_END_POINT}/${id}/read`,
        {},
        { withCredentials: true },
      );
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      toast.error("Failed to mark as read");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await axios.put(
        `${NOTIFICATION_API_END_POINT}/read-all`,
        {},
        { withCredentials: true },
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch (error) {
      toast.error("Failed to mark all as read");
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      handleMarkAsRead(notification._id);
    }
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="relative p-2">
          <Bell className="w-5 h-5 text-gray-400 hover:text-white transition-colors" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 text-black text-xs font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-96 p-0 bg-zinc-900 border-zinc-800"
        align="end"
        sideOffset={10}
      >
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="font-semibold text-white">Notifications</h3>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="text-gray-400 hover:text-white"
              >
                <CheckCheck className="w-4 h-4 mr-1" />
                Read all
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="max-h-96">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500 mx-auto"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <BellOff className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <AnimatePresence>
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification._id}
                  notification={notification}
                  onRead={handleMarkAsRead}
                  onDelete={() => {}}
                  onClick={handleNotificationClick}
                />
              ))}
            </AnimatePresence>
          )}
        </ScrollArea>

        <div className="p-3 border-t border-zinc-800">
          <Button
            variant="ghost"
            className="w-full text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10"
            onClick={() => {
              navigate("/notifications");
              setOpen(false);
            }}
          >
            View All Notifications
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Full Notifications Page
const NotificationCenter = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, [activeTab, page]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: 20,
        ...(activeTab === "unread" && { unreadOnly: "true" }),
      });

      const response = await axios.get(
        `${NOTIFICATION_API_END_POINT}?${params}`,
        {
          withCredentials: true,
        },
      );

      if (response.data.success) {
        setNotifications((prev) =>
          page === 1
            ? response.data.notifications
            : [...prev, ...response.data.notifications],
        );
        setHasMore(
          response.data.pagination.page < response.data.pagination.pages,
        );
      }
    } catch (error) {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await axios.put(
        `${NOTIFICATION_API_END_POINT}/${id}/read`,
        {},
        { withCredentials: true },
      );
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n)),
      );
    } catch (error) {
      toast.error("Failed to mark as read");
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${NOTIFICATION_API_END_POINT}/${id}`, {
        withCredentials: true,
      });
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      toast.success("Notification deleted");
    } catch (error) {
      toast.error("Failed to delete notification");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await axios.put(
        `${NOTIFICATION_API_END_POINT}/read-all`,
        {},
        { withCredentials: true },
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success("All notifications marked as read");
    } catch (error) {
      toast.error("Failed to mark all as read");
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      handleMarkAsRead(notification._id);
    }
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white">Notifications</h1>
              <p className="text-gray-500 mt-1">
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setPage(1);
                  fetchNotifications();
                }}
                className="border-zinc-700 text-gray-300"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              {unreadCount > 0 && (
                <Button
                  onClick={handleMarkAllAsRead}
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black"
                >
                  <CheckCheck className="w-4 h-4 mr-2" />
                  Mark all read
                </Button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={(v) => {
              setActiveTab(v);
              setPage(1);
            }}
          >
            <TabsList className="bg-zinc-900 border border-zinc-800 mb-6">
              <TabsTrigger
                value="all"
                className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black"
              >
                All
              </TabsTrigger>
              <TabsTrigger
                value="unread"
                className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black"
              >
                Unread {unreadCount > 0 && `(${unreadCount})`}
              </TabsTrigger>
            </TabsList>

            <Card className="bg-zinc-900/50 border-zinc-800 overflow-hidden">
              {loading && page === 1 ? (
                <div className="p-12 text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-yellow-500 mx-auto"></div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <BellOff className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No notifications</p>
                  <p className="text-sm mt-1">
                    {activeTab === "unread"
                      ? "All caught up!"
                      : "Check back later"}
                  </p>
                </div>
              ) : (
                <>
                  <AnimatePresence>
                    {notifications.map((notification) => (
                      <NotificationItem
                        key={notification._id}
                        notification={notification}
                        onRead={handleMarkAsRead}
                        onDelete={handleDelete}
                        onClick={handleNotificationClick}
                      />
                    ))}
                  </AnimatePresence>

                  {hasMore && (
                    <div className="p-4 text-center border-t border-zinc-800">
                      <Button
                        variant="outline"
                        onClick={() => setPage((prev) => prev + 1)}
                        disabled={loading}
                        className="border-zinc-700 text-gray-300"
                      >
                        {loading ? "Loading..." : "Load More"}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </Card>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
};

export default NotificationCenter;
