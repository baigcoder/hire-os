import { useState, useEffect } from "react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Calendar,
  Clock,
  Building,
  Play,
  Video,
  FileCheck,
  CheckCircle,
} from "lucide-react";
import axios from "axios";
import { APPLICATION_API_END_POINT } from "@/utils/constant";
import { useNavigate } from "react-router-dom";

const InterviewCard = ({ application = {} }) => {
  const [loading] = useState(false);
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


  // An interview scheduled through the newer flow has no date on the application yet
  const valid = (d) => d && !Number.isNaN(new Date(d).getTime());
  const formatDate = (d) =>
    valid(d) ? new Date(d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) : "Not scheduled yet";
  const formatTime = (d) => (valid(d) ? new Date(d).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "—");

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
      return { text: "Done", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
    }
    switch (appStatus) {
      case "mcq_pending": return { text: "Test to take", color: "bg-primary/10 text-primary border-primary/20" };
      case "mcq_passed": return { text: "Test passed", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
      case "video_scheduled": return { text: "Ready to join", color: "bg-[#172a1d] text-[#3fc07a] border-transparent" };
      case "video_completed": return { text: "Done", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
      default: return { text: "Scheduled", color: "bg-primary/10 text-primary border-primary/20" };
    }
  };

  const statusBadge = getStatusBadge();

  return (
    <div className="bg-background border border-white/10 rounded-sm overflow-hidden relative group hover:border-primary/30 transition-all">
      {/* HUD Scanner Effect */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-primary/20 animate-scanline pointer-events-none opacity-0 group-hover:opacity-100" />

      <div className="p-5">
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1">
            <div className="text-xs text-primary mb-1 opacity-60">
              Interview
            </div>
            <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors leading-tight">
              {application.job?.title}
            </h3>
            <div className="flex items-center gap-2 mt-2">
              <Building className="h-3 w-3 text-gray-500" />
              <span className="text-xs text-gray-400">
                {application.job?.company?.name}
              </span>
            </div>
          </div>
          <Badge className={`text-xs py-1 px-3 ${statusBadge.color} border rounded-sm`}>
            {statusBadge.text}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white/5 border border-white/5 p-3 rounded-sm">
            <div className="flex items-center gap-2 mb-1 opacity-40">
              <Calendar className="h-3 w-3 text-primary" />
              <span className="text-xs text-white">Date</span>
            </div>
            <div className="text-sm font-bold text-white">
              {formatDate(application.interviewDetails?.date)}
            </div>
          </div>
          <div className="bg-white/5 border border-white/5 p-3 rounded-sm">
            <div className="flex items-center gap-2 mb-1 opacity-40">
              <Clock className="h-3 w-3 text-primary" />
              <span className="text-xs text-white">Time</span>
            </div>
            <div className="text-sm font-bold text-white">
              {formatTime(application.interviewDetails?.date)}
            </div>
          </div>
        </div>

        {application.interviewDetails?.details && (
          <div className="bg-card border-l-2 border-primary p-3 mb-6">
            <div className="text-xs text-gray-500 mb-1">
              Notes
            </div>
            <p className="text-xs text-gray-400 leading-relaxed italic">
              &quot;{application.interviewDetails.details}&quot;
            </p>
          </div>
        )}

        {!application.interviewDetails?.completed && (
          <div className="flex items-center justify-center py-2 mb-4 bg-white/5 border border-white/10 rounded-sm">
            <span className={`text-xs font-bold ${status.isActive ? 'text-emerald-400' : 'text-primary'}`}>
              {status.isActive ? ">> TERMINAL READY <<" : timeRemaining}
            </span>
          </div>
        )}
      </div>

      <div className="px-5 pb-5">
        {/* MCQ Test Pending - Start Test button */}
        {appStatus === "mcq_pending" && !application.interviewDetails?.completed && (
          <Button
            className={`w-full text-xs py-6 transition-all ${status.isActive ? 'bg-primary hover:bg-primary/90 text-black border-black/20' : 'bg-card text-gray-500 border-white/5 cursor-not-allowed opacity-50' }`}
            onClick={status.isActive ? handleStartMCQ : undefined}
            disabled={loading || !status.isActive}
          >
            <FileCheck className="mr-2 h-4 w-4" />
            {status.isActive ? "Start the test" : "Not scheduled yet"}
          </Button>
        )}

        {/* MCQ Passed or Video Scheduled - Join Video button */}
        {(appStatus === "mcq_passed" || appStatus === "video_scheduled") && !application.interviewDetails?.completed && (
          <Button
            className={`w-full text-xs py-6 transition-all ${status.isActive ? 'bg-primary hover:bg-primary/90 text-black border-black/20' : 'bg-card text-gray-500 border-white/5 cursor-not-allowed opacity-50' }`}
            onClick={status.isActive ? handleJoinVideo : undefined}
            disabled={loading || !status.isActive}
          >
            <Video className="mr-2 h-4 w-4" />
            {status.isActive ? "Join interview" : "Opens 15 minutes before"}
          </Button>
        )}

        {/* Default interview status */}
        {appStatus === "interview" && !application.interviewDetails?.completed && (
          <Button
            className={`w-full text-xs py-6 transition-all ${status.isActive ? 'bg-primary hover:bg-primary/90 text-black border-black/20' : 'bg-card text-gray-500 border-white/5 cursor-not-allowed opacity-50' }`}
            onClick={status.isActive ? handleJoinVideo : undefined}
            disabled={loading || !status.isActive}
          >
            <Play className="mr-2 h-4 w-4" />
            {status.isActive ? "Join interview" : "Not scheduled yet"}
          </Button>
        )}

        {/* Completed state */}
        {application.interviewDetails?.completed && (
          <div className="w-full py-4 border border-emerald-500/20 bg-emerald-500/5 text-center text-xs text-emerald-400">
            <CheckCircle className="inline h-4 w-4 mr-2" />
            Interview complete
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewCard;
