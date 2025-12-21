import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Calendar, Clock, Building, AlertCircle } from "lucide-react";
import { Button } from "../ui/button";
import { Link } from "react-router-dom";
import axios from "axios";
import { APPLICATION_API_END_POINT } from "@/utils/constant";
import { toast } from "sonner";

const Notifications = () => {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUpcomingInterviews();
  }, []);

  const fetchUpcomingInterviews = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${APPLICATION_API_END_POINT}/interviews`, {
        withCredentials: true,
      });
      if (res.data.success) {
        // Filter for upcoming interviews (not completed)
        const upcomingInterviews = res.data.interviews.filter(
          (interview) =>
            !interview.interviewDetails.completed &&
            new Date(interview.interviewDetails.date) > new Date(),
        );
        setInterviews(upcomingInterviews);
      }
    } catch (error) {
      console.error("Failed to fetch upcoming interviews:", error);
      toast.error("Failed to load upcoming interviews");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const formatTime = (dateString) => {
    const options = { hour: "2-digit", minute: "2-digit" };
    return new Date(dateString).toLocaleTimeString(undefined, options);
  };

  // Calculate time remaining until interview
  const getTimeRemaining = (interviewDate) => {
    const now = new Date();
    const interview = new Date(interviewDate);
    const diffMs = interview - now;

    if (diffMs <= 0) return "Now";

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(
      (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
    );
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? "s" : ""} ${diffHours} hr${diffHours > 1 ? "s" : ""}`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ${diffMinutes} min${diffMinutes > 1 ? "s" : ""}`;
    } else {
      return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""}`;
    }
  };

  // Check if interview is happening soon (within 30 minutes)
  const isInterviewSoon = (interviewDate) => {
    const now = new Date();
    const interview = new Date(interviewDate);
    const diffMs = interview - now;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    return diffMinutes >= 0 && diffMinutes <= 30;
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Upcoming Interviews</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">Loading upcoming interviews...</div>
        </CardContent>
      </Card>
    );
  }

  if (interviews.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Upcoming Interviews</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-gray-500">
            You don't have any upcoming interviews scheduled.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Upcoming Interviews</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {interviews.map((interview) => {
            const interviewDate = new Date(interview.interviewDetails.date);
            const isUpcoming = isInterviewSoon(interviewDate);

            return (
              <div
                key={interview._id}
                className={`p-4 border rounded-md ${isUpcoming ? "bg-yellow-50 border-yellow-200" : "bg-blue-50 border-blue-200"}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {interview.job?.title}
                    </h3>
                    <div className="flex items-center gap-1 text-gray-600">
                      <Building className="h-4 w-4" />
                      <span>{interview.job?.company?.name}</span>
                    </div>
                  </div>
                  <Badge
                    className={
                      isUpcoming
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-blue-100 text-blue-800"
                    }
                  >
                    {isUpcoming ? "Starting Soon" : "Upcoming"}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span>{formatDate(interviewDate)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span>{formatTime(interviewDate)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm font-medium mb-3">
                  <AlertCircle
                    className={`h-4 w-4 ${isUpcoming ? "text-yellow-600" : "text-blue-600"}`}
                  />
                  <span>
                    {isUpcoming
                      ? "Starting soon"
                      : `Time remaining: ${getTimeRemaining(interviewDate)}`}
                  </span>
                </div>

                <Link to="/applied-jobs">
                  <Button
                    className="w-full"
                    variant={isUpcoming ? "default" : "outline"}
                  >
                    {isUpcoming ? "Join Interview Now" : "View Details"}
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default Notifications;
