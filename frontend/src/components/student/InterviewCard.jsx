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
import { Calendar, Clock, Building, Play, Video, FileCheck, CheckCircle } from "lucide-react";
import axios from "axios";
import { APPLICATION_API_END_POINT } from "@/utils/constant";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const InterviewCard = ({ application = {} }) => {
  const [loading, setLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState("");
  const navigate = useNavigate();

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
        setTimeRemaining("NOW ACTIVE");
        return;
      }

      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor(
        (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
      );
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      if (diffDays > 0) {
        setTimeRemaining(
          `T-MINUS ${diffDays}D ${diffHours}H`,
        );
      } else if (diffHours > 0) {
        setTimeRemaining(
          `T-MINUS ${diffHours}H ${diffMinutes}M`,
        );
      } else {
        setTimeRemaining(`T-MINUS ${diffMinutes}M`);
      }
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 60000);

    return () => clearInterval(interval);
  }, [
    application.interviewDetails?.date,
    application.interviewDetails?.completed,
  ]);

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

  const isInterviewTime = () => {
    if (!application.interviewDetails?.date) return { isActive: false };

    const now = new Date();
    const interviewDate = new Date(application.interviewDetails.date);

    const fifteenMinutesBefore = new Date(interviewDate);
    fifteenMinutesBefore.setMinutes(fifteenMinutesBefore.getMinutes() - 15);

    const oneHourAfter = new Date(interviewDate);
    oneHourAfter.setHours(oneHourAfter.getHours() + 1);

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
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: '2-digit',
      year: 'numeric'
    }).toUpperCase();
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
  };

  const status = isInterviewTime();
  const appStatus = application.status?.toLowerCase();

  // Get interview ID for navigation
  const getInterviewId = () => {
    return application.interviewId || application.interviewDetails?.interviewId || application._id;
  };

  const handleStartMCQ = () => navigate(`/interview/${getInterviewId()}/mcq`);
  const handleJoinVideo = () => navigate(`/interview/${getInterviewId()}/video`);

  // Status-based badge styling
  const getStatusBadge = () => {
    if (application.interviewDetails?.completed) {
      return { text: "COMPLETED", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
    }
    switch (appStatus) {
      case "mcq_pending": return { text: "MCQ PENDING", color: "bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/20 animate-pulse" };
      case "mcq_passed": return { text: "MCQ PASSED ✓", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
      case "video_scheduled": return { text: "VIDEO READY", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 animate-pulse" };
      case "video_completed": return { text: "COMPLETE", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
      default: return { text: "SCHEDULED", color: "bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/20" };
    }
  };

  const statusBadge = getStatusBadge();

  return (
    <div className="bg-[#0A0A0A] border border-white/10 rounded-sm overflow-hidden relative group hover:border-[#FFD700]/30 transition-all">
      {/* HUD Scanner Effect */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-[#FFD700]/20 animate-scanline pointer-events-none opacity-0 group-hover:opacity-100" />

      <div className="p-5">
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1">
            <div className="text-[10px] font-mono text-[#FFD700] tracking-widest uppercase mb-1 opacity-60">
              INTERVIEW SESSION // ACTIVE
            </div>
            <h3 className="text-xl font-bold text-white uppercase group-hover:text-[#FFD700] transition-colors leading-tight">
              {application.job?.title}
            </h3>
            <div className="flex items-center gap-2 mt-2">
              <Building className="h-3 w-3 text-gray-500" />
              <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">
                {application.job?.company?.name}
              </span>
            </div>
          </div>
          <Badge className={`font-mono text-[10px] tracking-tighter py-1 px-3 ${statusBadge.color} border uppercase rounded-sm`}>
            {statusBadge.text}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white/5 border border-white/5 p-3 rounded-sm">
            <div className="flex items-center gap-2 mb-1 opacity-40">
              <Calendar className="h-3 w-3 text-[#FFD700]" />
              <span className="text-[9px] font-mono text-white">DATE</span>
            </div>
            <div className="text-sm font-bold text-white font-mono tracking-tighter">
              {formatDate(application.interviewDetails?.date)}
            </div>
          </div>
          <div className="bg-white/5 border border-white/5 p-3 rounded-sm">
            <div className="flex items-center gap-2 mb-1 opacity-40">
              <Clock className="h-3 w-3 text-[#FFD700]" />
              <span className="text-[9px] font-mono text-white">SYSTEM CLOCK</span>
            </div>
            <div className="text-sm font-bold text-white font-mono tracking-tighter">
              {formatTime(application.interviewDetails?.date)}
            </div>
          </div>
        </div>

        {application.interviewDetails?.details && (
          <div className="bg-[#111111] border-l-2 border-[#FFD700] p-3 mb-6">
            <div className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-1">
              COMMAND INSTRUCTIONS:
            </div>
            <p className="text-xs text-gray-400 leading-relaxed italic">
              "{application.interviewDetails.details}"
            </p>
          </div>
        )}

        {!application.interviewDetails?.completed && (
          <div className="flex items-center justify-center py-2 mb-4 bg-white/5 border border-white/10 rounded-sm">
            <span className={`text-[11px] font-mono font-bold tracking-widest ${status.isActive ? 'text-emerald-400' : 'text-[#FFD700]'}`}>
              {status.isActive ? ">> TERMINAL READY <<" : timeRemaining}
            </span>
          </div>
        )}
      </div>

      <div className="px-5 pb-5">
        {/* MCQ Test Pending - Start Test button */}
        {appStatus === "mcq_pending" && !application.interviewDetails?.completed && (
          <Button
            className={`w-full font-mono text-xs tracking-widest py-6 border-b-2 active:translate-y-[1px] transition-all
              ${status.isActive
                ? 'bg-[#FFD700] hover:bg-[#FFD700]/90 text-black border-black/20 shadow-[0_0_20px_rgba(255,215,0,0.2)]'
                : 'bg-[#111111] text-gray-500 border-white/5 cursor-not-allowed opacity-50'
              }
            `}
            onClick={status.isActive ? handleStartMCQ : undefined}
            disabled={loading || !status.isActive}
          >
            <FileCheck className="mr-2 h-4 w-4" />
            {status.isActive ? "START MCQ TEST" : "AWAITING_SCHEDULE"}
          </Button>
        )}

        {/* MCQ Passed or Video Scheduled - Join Video button */}
        {(appStatus === "mcq_passed" || appStatus === "video_scheduled") && !application.interviewDetails?.completed && (
          <Button
            className={`w-full font-mono text-xs tracking-widest py-6 border-b-2 active:translate-y-[1px] transition-all
              ${status.isActive
                ? 'bg-cyan-500 hover:bg-cyan-500/90 text-black border-black/20 shadow-[0_0_20px_rgba(0,255,255,0.2)]'
                : 'bg-[#111111] text-gray-500 border-white/5 cursor-not-allowed opacity-50'
              }
            `}
            onClick={status.isActive ? handleJoinVideo : undefined}
            disabled={loading || !status.isActive}
          >
            <Video className="mr-2 h-4 w-4" />
            {status.isActive ? "JOIN VIDEO INTERVIEW" : "VIDEO_PENDING"}
          </Button>
        )}

        {/* Default interview status */}
        {appStatus === "interview" && !application.interviewDetails?.completed && (
          <Button
            className={`w-full font-mono text-xs tracking-widest py-6 border-b-2 active:translate-y-[1px] transition-all
              ${status.isActive
                ? 'bg-[#FFD700] hover:bg-[#FFD700]/90 text-black border-black/20 shadow-[0_0_20px_rgba(255,215,0,0.2)]'
                : 'bg-[#111111] text-gray-500 border-white/5 cursor-not-allowed opacity-50'
              }
            `}
            onClick={status.isActive ? handleJoinVideo : undefined}
            disabled={loading || !status.isActive}
          >
            <Play className="mr-2 h-4 w-4" />
            {status.isActive ? "JOIN INTERVIEW" : "AWAITING_SCHEDULE"}
          </Button>
        )}

        {/* Completed state */}
        {application.interviewDetails?.completed && (
          <div className="w-full py-4 border border-emerald-500/20 bg-emerald-500/5 text-center text-[10px] text-emerald-400 font-mono tracking-widest uppercase">
            <CheckCircle className="inline h-4 w-4 mr-2" />
            SESSION_COMPLETE // DATA_UPLOADED
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewCard;
