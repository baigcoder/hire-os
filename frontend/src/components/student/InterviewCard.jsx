import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Calendar, Clock, Building } from "lucide-react";
import axios from "axios";
import { APPLICATION_API_END_POINT } from "@/utils/constant";
import { toast } from "sonner";

const InterviewCard = ({ application = {} }) => {
  const [loading, setLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState("");

  // Mark notification as viewed when card is rendered
  useEffect(() => {
    if (application._id && !application.interviewDetails?.viewed) {
      markAsViewed();
    }
  }, [application._id]);

  // Update time remaining counter
  useEffect(() => {
    if (
      !application.interviewDetails?.date ||
      application.interviewDetails?.completed
    ) {
      return;
    }

    const updateTimeRemaining = () => {
      const now = new Date();
      const interviewDate = new Date(application.interviewDetails.date);
      const diffMs = interviewDate - now;

      if (diffMs <= 0) {
        setTimeRemaining("Now");
        return;
      }

      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor(
        (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
      );
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      if (diffDays > 0) {
        setTimeRemaining(
          `${diffDays} day${diffDays > 1 ? "s" : ""} ${diffHours} hr${diffHours > 1 ? "s" : ""}`,
        );
      } else if (diffHours > 0) {
        setTimeRemaining(
          `${diffHours} hour${diffHours > 1 ? "s" : ""} ${diffMinutes} min${diffMinutes > 1 ? "s" : ""}`,
        );
      } else {
        setTimeRemaining(`${diffMinutes} minute${diffMinutes > 1 ? "s" : ""}`);
      }
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [
    application.interviewDetails?.date,
    application.interviewDetails?.completed,
  ]);

  // Function to mark notification as viewed
  const markAsViewed = async () => {
    try {
      await axios.post(
        `${APPLICATION_API_END_POINT}/interview/${application._id}/view`,
        {},
        { withCredentials: true },
      );
    } catch (error) {
      console.error("Failed to mark notification as viewed:", error);
    }
  };

  const isInterviewToday = () => {
    if (!application.interviewDetails?.date) return false;

    const today = new Date();
    const interviewDate = new Date(application.interviewDetails.date);

    return (
      today.getDate() === interviewDate.getDate() &&
      today.getMonth() === interviewDate.getMonth() &&
      today.getFullYear() === interviewDate.getFullYear()
    );
  };

  // Function to check if the current time is within the interview time window
  const isInterviewTime = () => {
    if (!application.interviewDetails?.date) return false;

    const now = new Date();
    const interviewDate = new Date(application.interviewDetails.date);

    // Allow access 15 minutes before and up to 1 hour after scheduled time
    const fifteenMinutesBefore = new Date(interviewDate);
    fifteenMinutesBefore.setMinutes(fifteenMinutesBefore.getMinutes() - 15);

    const oneHourAfter = new Date(interviewDate);
    oneHourAfter.setHours(oneHourAfter.getHours() + 1);

    // Calculate minutes remaining for more precise status
    const minutesRemaining = Math.floor((interviewDate - now) / (1000 * 60));

    return {
      isActive: now >= fifteenMinutesBefore && now <= oneHourAfter,
      minutesRemaining: minutesRemaining > 0 ? minutesRemaining : 0,
      isSoon: minutesRemaining > 0 && minutesRemaining <= 30,
    };
  };

  const completeInterview = async () => {
    try {
      setLoading(true);
      const res = await axios.post(
        `${APPLICATION_API_END_POINT}/interview/${application._id}/complete`,
        {},
        { withCredentials: true },
      );

      if (res.data.success) {
        toast.success(res.data.message);
        // You might want to refresh the application data here
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error.response?.data?.message || "Failed to complete interview",
      );
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

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>{application.job?.title}</CardTitle>
          <Badge
            variant="outline"
            className={
              application.interviewDetails?.completed
                ? "bg-green-100 text-green-800"
                : "bg-blue-100 text-blue-800"
            }
          >
            {application.interviewDetails?.completed
              ? "Completed"
              : "Scheduled"}
          </Badge>
        </div>
        <CardDescription className="flex items-center gap-1">
          <Building className="h-4 w-4" />
          {application.job?.company?.name}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-md">
            <h3 className="font-semibold text-blue-800 mb-2">
              Interview Details
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span>{formatDate(application.interviewDetails?.date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span>{formatTime(application.interviewDetails?.date)}</span>
              </div>
            </div>
            {application.interviewDetails?.details && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                <p className="text-sm">
                  {application.interviewDetails.details}
                </p>
              </div>
            )}

            {!application.interviewDetails?.completed && (
              <div className="mt-3 pt-3 border-t border-blue-200 text-sm text-blue-600">
                {isInterviewTime().isActive
                  ? "Interview is happening now!"
                  : isInterviewTime().isSoon
                    ? `Interview starting soon! (${isInterviewTime().minutesRemaining} minutes)`
                    : `Time remaining: ${timeRemaining}`}
              </div>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter>
        {application.status === "interview" &&
          !application.interviewDetails?.completed && (
            <Button
              className="w-full"
              onClick={completeInterview}
              disabled={loading || !isInterviewTime()}
              variant={
                isInterviewTime().isActive
                  ? "default"
                  : isInterviewTime().isSoon
                    ? "secondary"
                    : "outline"
              }
            >
              {isInterviewTime().isActive
                ? "Join Interview Now"
                : isInterviewTime().isSoon
                  ? `Interview Starting Soon (${isInterviewTime().minutesRemaining} min)`
                  : "Interview Button Will Activate at Scheduled Time"}
            </Button>
          )}

        {application.interviewDetails?.completed && (
          <div className="w-full text-center text-sm text-green-600 font-medium">
            You have completed this interview.
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

export default InterviewCard;
