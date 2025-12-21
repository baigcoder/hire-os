import React, { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Badge } from "../ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import axios from "axios";
import { APPLICATION_API_END_POINT } from "@/utils/constant";
import { formatDistanceToNow } from "date-fns";
import { Button } from "../ui/button";
import { Link } from "react-router-dom";

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await axios.get(`${APPLICATION_API_END_POINT}/interviews`, {
          withCredentials: true,
        });
        if (res.data.success) {
          setNotifications(res.data.interviews || []);
          setUnreadCount(
            res.data.interviews.filter(
              (interview) => !interview.interviewDetails.viewed,
            ).length,
          );
        }
      } catch (error) {
        console.error(error);
      }
    };

    fetchNotifications();
  }, []);

  const markAsViewed = async (id) => {
    try {
      await axios.post(
        `${APPLICATION_API_END_POINT}/interview/${id}/view`,
        {},
        { withCredentials: true },
      );

      // Update local state
      setNotifications((prev) =>
        prev.map((notification) =>
          notification._id === id
            ? {
                ...notification,
                interviewDetails: {
                  ...notification.interviewDetails,
                  viewed: true,
                },
              }
            : notification,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Bell className="h-5 w-5" />
        <h2 className="text-xl font-bold">Notifications</h2>
        {unreadCount > 0 && (
          <Badge className="bg-red-500">{unreadCount} new</Badge>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="text-gray-500">No notifications at this time.</p>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <Card
              key={notification._id}
              className={`${!notification.interviewDetails.viewed ? "border-l-4 border-l-blue-500" : ""}`}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base">
                    Interview Scheduled: {notification.job.title}
                  </CardTitle>
                  <Badge
                    variant={
                      notification.interviewDetails.viewed
                        ? "outline"
                        : "default"
                    }
                  >
                    {notification.interviewDetails.viewed ? "Read" : "New"}
                  </Badge>
                </div>
                <CardDescription>
                  {notification.job.company?.name} •{" "}
                  {formatDistanceToNow(
                    new Date(notification.interviewDetails.date),
                    { addSuffix: true },
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-2">
                  <strong>Date:</strong>{" "}
                  {new Date(
                    notification.interviewDetails.date,
                  ).toLocaleString()}
                </p>
                <p className="mb-4">
                  <strong>Details:</strong>{" "}
                  {notification.interviewDetails.details}
                </p>

                <div className="flex justify-between">
                  {!notification.interviewDetails.viewed && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => markAsViewed(notification._id)}
                    >
                      Mark as Read
                    </Button>
                  )}
                  <Link to="/applied-jobs">
                    <Button size="sm">View Application</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
