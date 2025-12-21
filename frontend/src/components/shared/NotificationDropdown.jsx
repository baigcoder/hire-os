import React, { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Link } from "react-router-dom";
import axios from "axios";
import { APPLICATION_API_END_POINT } from "@/utils/constant";
import { toast } from "sonner";

const NotificationDropdown = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchInterviewNotifications();
    // Refresh notifications every minute
    const intervalId = setInterval(fetchInterviewNotifications, 60000);
    return () => clearInterval(intervalId);
  }, []);

  const fetchInterviewNotifications = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${APPLICATION_API_END_POINT}/interviews`, {
        withCredentials: true,
      });
      if (res.data.success) {
        setNotifications(res.data.interviews);
        // Count unread notifications (interviews that haven't been viewed)
        const unread = res.data.interviews.filter(
          (interview) => !interview.viewed,
        ).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error("Failed to fetch interview notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsViewed = async (notificationId) => {
    try {
      await axios.post(
        `${APPLICATION_API_END_POINT}/interview/${notificationId}/view`,
        {},
        { withCredentials: true },
      );
      // Update local state
      setNotifications((prev) =>
        prev.map((notification) =>
          notification._id === notificationId
            ? { ...notification, viewed: true }
            : notification,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark notification as viewed:", error);
    }
  };

  const formatDate = (dateString) => {
    const options = {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date(dateString).toLocaleString(undefined, options);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 max-h-96 overflow-auto">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold">Interview Notifications</h3>
        </div>
        {loading ? (
          <div className="p-4 text-center">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No interview notifications
          </div>
        ) : (
          <div>
            {notifications.map((notification) => (
              <Link
                key={notification._id}
                to="/applied-jobs"
                onClick={() => markAsViewed(notification._id)}
                className="block"
              >
                <div
                  className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${!notification.viewed ? "bg-blue-50" : ""}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{notification.job?.title}</p>
                      <p className="text-sm text-gray-600">
                        {notification.job?.company?.name}
                      </p>
                    </div>
                    {!notification.viewed && (
                      <Badge
                        variant="outline"
                        className="bg-blue-100 text-blue-800 text-xs"
                      >
                        New
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm mt-1">
                    Interview scheduled for{" "}
                    {formatDate(notification.interviewDetails?.date)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default NotificationDropdown;
