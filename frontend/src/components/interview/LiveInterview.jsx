import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  MessageSquare,
  Monitor,
  MonitorOff,
  BrainCircuit,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Users,
  Settings,
  Send,
  Loader2,
  WifiOff,
  Wifi,
  Copy,
  FileText,
  Star,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";
import { useVideoCall } from "@/hooks/useVideoCall";
import ReportGenerationModal from "./ReportGenerationModal";

const LiveInterview = () => {
  const { id: interviewId } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((store) => store.auth);

  // Supabase Realtime hook for room management and chat (replaces Socket.io)
  const {
    channel,
    isConnected,
    connectionError,
    roomState,
    participants,
    messages,
    typingUsers,
    sendMessage,
    startTyping,
    stopTyping,
    updateMediaState,
    endInterview,
    reportFraudAlert,
    toggleMonitoring, // Recruiter can toggle monitoring on/off
    // WebRTC signaling via Supabase
    sendOffer,
    sendAnswer,
    sendIceCandidate,
  } = useSupabaseRealtime(interviewId, {
    onOffer: (data) => {
      // Handle incoming WebRTC offer
      if (videoCallRef.current?.handleOffer) {
        videoCallRef.current.handleOffer(data);
      }
    },
    onAnswer: (data) => {
      // Handle incoming WebRTC answer
      if (videoCallRef.current?.handleAnswer) {
        videoCallRef.current.handleAnswer(data);
      }
    },
    onIceCandidate: (data) => {
      // Handle incoming ICE candidate
      if (videoCallRef.current?.handleIceCandidate) {
        videoCallRef.current.handleIceCandidate(data);
      }
    },
    onFraudAlert: (data) => {
      // Add to fraud alerts state for recruiter panel
      const newAlert = {
        id: Date.now(),
        type: data.type,
        details: data.details,
        timestamp: new Date().toISOString(),
        severity: data.type === 'tab_switch' ? 'high' :
          data.type === 'copy_paste' ? 'medium' : 'low',
      };
      setFraudAlerts(prev => [newAlert, ...prev].slice(0, 10));
      toast.warning(`⚠️ Fraud Alert: ${data.type}`);
    },
    onMonitoringToggle: (enabled) => {
      // Candidate receives monitoring state from recruiter
      setIsMonitoringEnabled(enabled);
    },
  });

  const videoCallRef = useRef(null);

  // Video call hook for WebRTC (passing Supabase signaling functions)
  const {
    localStream,
    remoteStream,
    localVideoRef,
    remoteVideoRef,
    isAudioOn,
    isVideoOn,
    isScreenSharing,
    connectionState,
    callError,
    initializeMedia,
    createOffer,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    cleanup,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
  } = useVideoCall({ sendOffer, sendAnswer, sendIceCandidate }, interviewId);

  // Store video call ref for signaling callbacks from Supabase
  useEffect(() => {
    videoCallRef.current = {
      handleOffer,
      handleAnswer,
      handleIceCandidate,
    };
  }, [handleOffer, handleAnswer, handleIceCandidate]);

  // Local state
  const [inputMessage, setInputMessage] = useState("");
  const [aiFeedback, setAiFeedback] = useState([]);
  const [confidenceScore, setConfidenceScore] = useState(85);
  const [timer, setTimer] = useState(0);
  const [showChat, setShowChat] = useState(true);
  const [isWaiting, setIsWaiting] = useState(true);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [fraudAlerts, setFraudAlerts] = useState([]); // Real-time fraud alerts for recruiter
  const [isMonitoringEnabled, setIsMonitoringEnabled] = useState(true); // Fraud monitoring state (controllable by recruiter)

  // Recruiter-only enhancements
  const [interviewNotes, setInterviewNotes] = useState("");
  const [candidateRating, setCandidateRating] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [suggestedQuestions] = useState([
    "Tell me about your most challenging project and how you handled it.",
    "Describe a situation where you had to work with a difficult team member.",
    "What's your approach to learning new technologies?",
    "How do you prioritize tasks when facing multiple deadlines?",
    "Tell me about a time you failed and what you learned from it.",
    "What motivates you in your professional career?",
    "How do you handle constructive criticism?",
    "Where do you see yourself in 5 years?",
  ]);

  const chatEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const isRecruiter =
    user?.role === "recruiter" || user?.role === "company_admin";

  // Timer
  useEffect(() => {
    if (roomState !== "active") return;
    const interval = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [roomState]);

  // Initialize media on mount
  useEffect(() => {
    initializeMedia().catch(console.error);
  }, []);

  // Update waiting state based on room
  useEffect(() => {
    setIsWaiting(roomState === "waiting" || !roomState);
  }, [roomState]);

  // Handle connection state
  useEffect(() => {
    if (connectionState === "connected") {
      toast.success("Video connection established!");
    } else if (connectionState === "failed") {
      toast.error("Connection failed. Try refreshing the page.");
    }
  }, [connectionState]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Comprehensive fraud detection for candidates (silently broadcast to recruiter)
  // Only runs when monitoring is enabled by recruiter
  useEffect(() => {
    if (!isRecruiter && roomState === "active" && isMonitoringEnabled) {
      // Tab switch detection (silent - don't alert student)
      const handleVisibility = () => {
        if (document.hidden) {
          reportFraudAlert("tab_switch", "Candidate switched tabs during interview");
        }
      };

      // Copy/paste detection
      const handleCopy = () => {
        reportFraudAlert("copy_paste", "Candidate used copy action during interview");
      };

      const handlePaste = () => {
        reportFraudAlert("copy_paste", "Candidate used paste action during interview");
      };

      // Window blur detection (alt+tab, etc)
      const handleBlur = () => {
        reportFraudAlert("window_blur", "Candidate switched away from interview window");
      };

      // Developer tools detection
      const handleKeydown = (e) => {
        // Detect F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
        if (e.key === "F12" ||
          (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J")) ||
          (e.ctrlKey && e.key === "u")) {
          reportFraudAlert("dev_tools", "Candidate attempted to open developer tools");
          e.preventDefault();
        }
        // Detect Alt+Tab capture (limited)
        if (e.altKey && e.key === "Tab") {
          reportFraudAlert("window_switch", "Candidate used Alt+Tab shortcut");
        }
      };

      // Right-click detection (potential copy attempt)
      const handleContextMenu = (e) => {
        reportFraudAlert("context_menu", "Candidate opened context menu");
      };

      document.addEventListener("visibilitychange", handleVisibility);
      document.addEventListener("copy", handleCopy);
      document.addEventListener("paste", handlePaste);
      window.addEventListener("blur", handleBlur);
      document.addEventListener("keydown", handleKeydown);
      document.addEventListener("contextmenu", handleContextMenu);

      return () => {
        document.removeEventListener("visibilitychange", handleVisibility);
        document.removeEventListener("copy", handleCopy);
        document.removeEventListener("paste", handlePaste);
        window.removeEventListener("blur", handleBlur);
        document.removeEventListener("keydown", handleKeydown);
        document.removeEventListener("contextmenu", handleContextMenu);
      };
    }
  }, [roomState, reportFraudAlert, isRecruiter]);

  // AI Feedback simulation
  useEffect(() => {
    if (roomState !== "active") return;

    const feedbacks = [
      { type: "positive", text: "Great eye contact maintained." },
      {
        type: "neutral",
        text: "Try to slow down your speaking pace slightly.",
      },
      { type: "warning", text: "Technical term explained vaguely." },
      {
        type: "positive",
        text: "Excellent structured answer using STAR method.",
      },
    ];

    const interval = setInterval(() => {
      const randomFeedback =
        feedbacks[Math.floor(Math.random() * feedbacks.length)];
      setAiFeedback((prev) => [randomFeedback, ...prev].slice(0, 3));
      setConfidenceScore((prev) =>
        Math.min(100, Math.max(60, prev + (Math.random() * 10 - 5))),
      );
    }, 10000);

    return () => clearInterval(interval);
  }, [roomState]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    sendMessage(inputMessage);
    setInputMessage("");
    stopTyping();
  };

  const handleInputChange = (e) => {
    setInputMessage(e.target.value);
    startTyping();

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(stopTyping, 1500);
  };

  const handleToggleAudio = () => {
    toggleAudio();
    updateMediaState({ isAudioOn: !isAudioOn });
  };

  const handleToggleVideo = () => {
    toggleVideo();
    updateMediaState({ isVideoOn: !isVideoOn });
  };

  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      await stopScreenShare();
    } else {
      await startScreenShare();
    }
    updateMediaState({ isScreenSharing: !isScreenSharing });
  };

  const handleEndCall = () => {
    if (isRecruiter) {
      // Simply end the call first, recruiter can generate report after
      endInterview();
      setIsReportModalOpen(true); // Auto open report modal
    } else {
      navigate(-1);
      cleanup();
    }
  };

  const copyMeetingLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Meeting link copied!");
  };

  const handleReportSubmitted = () => {
    navigate("/recruiter/dashboard"); // Or wherever appropriate
    cleanup();
  };

  // Get other participant for display (compare by user ID since we use Supabase presence)
  const otherParticipant = participants.find((p) => p.id !== user?._id);

  // Waiting Room
  if (isWaiting) {
    return (
      <div className="h-screen bg-[#0A0A0A] text-white flex items-center justify-center font-['Space_Grotesk',sans-serif]">
        <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md px-6 relative z-10"
        >
          <div className="w-20 h-20 mx-auto mb-6 bg-[#FFD700] rounded-sm flex items-center justify-center border border-[#FFD700]/50 shadow-[0_0_30px_rgba(255,215,0,0.3)]">
            <Video className="w-10 h-10 text-black" />
          </div>

          <h1 className="text-2xl font-bold mb-2 uppercase tracking-tight">
            Waiting Room
          </h1>
          <div className="text-gray-500 mb-8 text-sm font-mono">
            {isRecruiter
              ? "Awaiting candidate connection..."
              : "Awaiting interviewer connection..."}
          </div>

          {/* Connection Status */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {isConnected ? (
              <Badge className="bg-[#00FF94]/10 text-[#00FF94] border-[#00FF94]/30 rounded-sm text-xs uppercase tracking-wider font-mono">
                <Wifi className="w-3 h-3 mr-1" /> Connected
              </Badge>
            ) : (
              <Badge className="bg-red-500/10 text-red-400 border-red-500/30 rounded-sm text-xs uppercase tracking-wider font-mono">
                <WifiOff className="w-3 h-3 mr-1" /> Connecting...
              </Badge>
            )}
          </div>

          {/* Participants */}
          <div className="bg-[#111111] rounded-sm p-4 mb-6 text-left border border-white/10">
            <div className="text-xs text-gray-500 mb-3 flex items-center gap-2 uppercase tracking-wider">
              <Users size={14} /> In Room ({participants.length})
            </div>
            {participants.map((p, idx) => (
              <div key={idx} className="flex items-center gap-3 py-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-zinc-800 text-xs">
                    {p.fullname?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-white text-sm font-medium">{p.fullname}</p>
                  <p className="text-xs text-gray-500 capitalize">{p.role}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Self Preview */}
          <div className="relative rounded-xl overflow-hidden mb-6 bg-zinc-900 aspect-video">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            {!isVideoOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                <VideoOff className="text-gray-500" size={48} />
              </div>
            )}
          </div>

          {/* Media Controls */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <Button
              onClick={handleToggleAudio}
              variant={isAudioOn ? "secondary" : "destructive"}
              size="icon"
              className="rounded-sm h-11 w-11"
            >
              {isAudioOn ? <Mic size={18} /> : <MicOff size={18} />}
            </Button>
            <Button
              onClick={handleToggleVideo}
              variant={isVideoOn ? "secondary" : "destructive"}
              size="icon"
              className="rounded-sm h-11 w-11"
            >
              {isVideoOn ? <Video size={18} /> : <VideoOff size={18} />}
            </Button>
          </div>

          {/* Share Link */}
          <Button
            variant="outline"
            onClick={copyMeetingLink}
            className="border-white/10 mt-4 rounded-sm text-xs uppercase tracking-wider"
          >
            <Copy className="mr-2" size={14} /> Copy Link
          </Button>

          {/* Start button for recruiter */}
          {isRecruiter && participants.length > 1 && (
            <Button
              onClick={createOffer}
              className="w-full mt-4 bg-[#00FF94] hover:bg-[#00FF94]/80 text-black font-bold rounded-sm uppercase tracking-wider"
            >
              Start Interview
            </Button>
          )}
        </motion.div>
      </div>
    );
  }

  // Main Interview View
  return (
    <div className="h-screen bg-[#0A0A0A] text-white flex flex-col font-['Space_Grotesk',sans-serif] overflow-hidden">
      <div className="fixed inset-0 bg-grid opacity-20 pointer-events-none" />
      <ReportGenerationModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        interviewId={interviewId}
        onReportSubmitted={handleReportSubmitted}
      />

      {/* Header */}
      <div className="h-14 border-b border-white/10 bg-[#111111] flex items-center justify-between px-6 shrink-0 relative z-20">
        <div className="flex items-center gap-4">
          <div className="bg-red-500/10 border border-red-500/30 text-red-500 px-2 py-0.5 rounded-sm text-[10px] font-bold flex items-center gap-2 animate-pulse uppercase tracking-wider">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div> Live
          </div>
          <div className="h-6 w-px bg-white/10"></div>
          <div>
            <h2 className="font-bold text-xs text-gray-300 uppercase tracking-wider">
              Interview Session
            </h2>
            <p className="text-[10px] text-gray-500 font-mono">
              {formatTime(timer)} • {participants.length} Connected
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Connection Status */}
          <Badge
            className={`rounded-sm text-[10px] uppercase tracking-wider font-mono ${isConnected ? "bg-[#00FF94]/10 text-[#00FF94] border-[#00FF94]/30" : "bg-red-500/10 text-red-400 border-red-500/30"}`}
          >
            {isConnected ? (
              <Wifi size={10} className="mr-1" />
            ) : (
              <WifiOff size={10} className="mr-1" />
            )}
            {connectionState}
          </Badge>

          {/* AI Confidence */}
          <div className="hidden md:flex flex-col items-end mr-4">
            <div className="flex items-center gap-2 text-[10px] text-[#FFD700] font-bold mb-1 uppercase tracking-wider">
              <BrainCircuit size={12} /> AI Analysis
            </div>
            <div className="w-24 h-1 bg-white/5 rounded-sm overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400"
                animate={{ width: `${confidenceScore}%` }}
                transition={{ type: "spring", stiffness: 50 }}
              />
            </div>
          </div>

          {isRecruiter && (
            <>
              {/* Monitoring Toggle */}
              <Button
                variant="outline"
                onClick={() => {
                  const newState = !isMonitoringEnabled;
                  setIsMonitoringEnabled(newState);
                  toggleMonitoring(newState);
                  toast.info(newState ? "🔒 Monitoring enabled" : "🔓 Monitoring disabled");
                }}
                className={`${isMonitoringEnabled
                  ? 'bg-green-600/10 text-green-400 border-green-600/30 hover:bg-green-600/20'
                  : 'bg-gray-600/10 text-gray-400 border-gray-600/30 hover:bg-gray-600/20'
                  }`}
              >
                {isMonitoringEnabled ? <Eye className="mr-2 h-4 w-4" /> : <EyeOff className="mr-2 h-4 w-4" />}
                {isMonitoringEnabled ? "Monitoring ON" : "Monitoring OFF"}
              </Button>

              <Button
                variant="outline"
                className="bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 border-purple-600/30"
                onClick={() => setIsReportModalOpen(true)}
              >
                <FileText className="mr-2 h-4 w-4" /> Generate Report
              </Button>
            </>
          )}

          <Button
            variant="destructive"
            className="bg-red-600 hover:bg-red-700 rounded-full px-6"
            onClick={handleEndCall}
          >
            <PhoneOff className="mr-2 h-4 w-4" />{" "}
            {isRecruiter ? "End & Report" : "End Call"}
          </Button>
        </div>
      </div>

      {/* Main Stage */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Video Grid */}
        <div className="flex-1 bg-[#050505] p-4 flex flex-col gap-4 relative">
          {/* Main Speaker (Remote) */}
          <div className="flex-1 relative rounded-2xl overflow-hidden border border-white/10 bg-zinc-900 group">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            {!remoteStream && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Avatar className="h-32 w-32 border-4 border-white/10">
                  <AvatarFallback className="text-4xl bg-zinc-800">
                    {otherParticipant?.fullname?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
              </div>
            )}

            {/* Overlay Info */}
            <div className="absolute bottom-6 left-6 z-20">
              <h3 className="text-xl font-bold text-white mb-1">
                {otherParticipant?.fullname ||
                  (isRecruiter ? "Candidate" : "Interviewer")}
              </h3>
              <div className="text-sm text-gray-400 flex items-center gap-2">
                <Badge className="bg-blue-500/20 text-blue-400 border-none capitalize">
                  {otherParticipant?.role || "Participant"}
                </Badge>
                {otherParticipant?.isAudioOn === false && (
                  <MicOff size={14} className="text-red-400" />
                )}
              </div>
            </div>

            {/* AI Insights */}
            <div className="absolute top-6 right-6 z-20 max-w-xs space-y-2">
              <AnimatePresence>
                {aiFeedback.map((fb, idx) => (
                  <motion.div
                    key={`${fb.text}-${idx}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className={`p-3 rounded-lg backdrop-blur-md border border-white/10 text-xs font-medium shadow-lg
                                            ${fb.type === "positive"
                        ? "bg-green-500/10 text-green-300"
                        : fb.type === "warning"
                          ? "bg-red-500/10 text-red-300"
                          : "bg-blue-500/10 text-cyan-300"
                      }`}
                  >
                    <div className="flex gap-2">
                      {fb.type === "positive" ? (
                        <CheckCircle size={14} />
                      ) : fb.type === "warning" ? (
                        <AlertTriangle size={14} />
                      ) : (
                        <Sparkles size={14} />
                      )}
                      {fb.text}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Fraud Alerts Panel - Recruiter Only */}
            {isRecruiter && fraudAlerts.length > 0 && (
              <div className="absolute top-6 left-6 z-20 w-72">
                <div className="bg-red-500/10 backdrop-blur-md border border-red-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-red-400 font-bold text-xs mb-2 uppercase tracking-wider">
                    <AlertTriangle size={14} />
                    Fraud Detection ({fraudAlerts.length})
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {fraudAlerts.slice(0, 5).map((alert) => (
                      <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`p-2 rounded text-xs border ${alert.severity === 'high'
                          ? 'bg-red-500/20 border-red-500/40 text-red-300'
                          : alert.severity === 'medium'
                            ? 'bg-orange-500/20 border-orange-500/40 text-orange-300'
                            : 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300'
                          }`}
                      >
                        <div className="font-semibold capitalize">{alert.type.replace(/_/g, ' ')}</div>
                        <div className="text-[10px] opacity-80">
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Recruiter Tools Panel - Enhanced Interview Controls */}
            {isRecruiter && (
              <div className="absolute bottom-6 left-6 z-20 w-80 space-y-3">
                {/* Quick Rating */}
                <div className="bg-[#111111]/95 backdrop-blur-md border border-white/10 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Quick Rating</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setCandidateRating(star)}
                          className={`p-1 rounded transition-all ${candidateRating >= star
                            ? 'text-[#FFD700]'
                            : 'text-gray-600 hover:text-gray-400'
                            }`}
                        >
                          <Star size={14} fill={candidateRating >= star ? '#FFD700' : 'none'} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Question Prompts */}
                <div className="bg-[#111111]/95 backdrop-blur-md border border-white/10 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Suggested Question</span>
                    <span className="text-[10px] text-[#FFD700]">{currentQuestionIndex + 1}/{suggestedQuestions.length}</span>
                  </div>
                  <p className="text-xs text-gray-300 mb-3 leading-relaxed">
                    "{suggestedQuestions[currentQuestionIndex]}"
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                      disabled={currentQuestionIndex === 0}
                      className="flex-1 h-7 text-xs border-white/10 text-gray-400"
                    >
                      <ChevronLeft size={12} className="mr-1" /> Prev
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setCurrentQuestionIndex(prev => Math.min(suggestedQuestions.length - 1, prev + 1))}
                      disabled={currentQuestionIndex === suggestedQuestions.length - 1}
                      className="flex-1 h-7 text-xs bg-[#FFD700]/20 text-[#FFD700] hover:bg-[#FFD700]/30 border border-[#FFD700]/30"
                    >
                      Next <ChevronRight size={12} className="ml-1" />
                    </Button>
                  </div>
                </div>

                {/* Notes Toggle */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowNotes(!showNotes)}
                  className="w-full h-8 text-xs border-white/10 text-gray-400 hover:text-white"
                >
                  <FileText size={12} className="mr-2" />
                  {showNotes ? 'Hide Notes' : 'Take Notes'}
                </Button>

                {/* Notes Panel */}
                {showNotes && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-[#111111]/95 backdrop-blur-md border border-white/10 rounded-lg p-3"
                  >
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold block mb-2">Interview Notes</span>
                    <textarea
                      value={interviewNotes}
                      onChange={(e) => setInterviewNotes(e.target.value)}
                      placeholder="Type your observations here..."
                      className="w-full h-24 bg-black/30 border border-white/10 rounded text-xs text-gray-300 p-2 resize-none focus:outline-none focus:border-[#FFD700]/50"
                    />
                    <div className="text-[10px] text-gray-500 mt-1">
                      {interviewNotes.length} characters
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>

          {/* Self View (PiP) */}
          <div className="absolute bottom-24 right-8 w-48 h-36 rounded-xl overflow-hidden border-2 border-white/10 shadow-2xl bg-zinc-800 z-30 hover:scale-105 transition-transform cursor-pointer">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            {!isVideoOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                <VideoOff className="text-gray-500" size={24} />
              </div>
            )}
            <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/50 rounded text-[10px] font-bold">
              You
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex justify-center gap-4 py-2">
            <Button
              onClick={handleToggleAudio}
              className={`rounded-full h-12 w-12 p-0 transition-all ${isAudioOn ? "bg-white/10 hover:bg-white/20 text-white" : "bg-red-500/20 text-red-500 border border-red-500/50"}`}
            >
              {isAudioOn ? <Mic size={20} /> : <MicOff size={20} />}
            </Button>
            <Button
              onClick={handleToggleVideo}
              className={`rounded-full h-12 w-12 p-0 transition-all ${isVideoOn ? "bg-white/10 hover:bg-white/20 text-white" : "bg-red-500/20 text-red-500 border border-red-500/50"}`}
            >
              {isVideoOn ? <Video size={20} /> : <VideoOff size={20} />}
            </Button>
            <Button
              onClick={handleToggleScreenShare}
              className={`rounded-full h-12 w-12 p-0 transition-all ${isScreenSharing ? "bg-green-500 text-black" : "bg-white/10 hover:bg-white/20 text-white"}`}
            >
              {isScreenSharing ? (
                <MonitorOff size={20} />
              ) : (
                <Monitor size={20} />
              )}
            </Button>
            <Button
              variant="ghost"
              className="rounded-full h-12 w-12 p-0 text-gray-400 hover:text-white"
            >
              <Settings size={20} />
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowChat(!showChat)}
              className={`rounded-full h-12 w-12 p-0 lg:hidden ${showChat ? "text-yellow-400" : "text-gray-400"}`}
            >
              <MessageSquare size={20} />
            </Button>
          </div>
        </div>

        {/* Chat Panel */}
        <AnimatePresence>
          {showChat && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="bg-[#0a0a0a] border-l border-white/10 flex flex-col overflow-hidden"
            >
              <div className="p-4 border-b border-white/5 font-bold text-sm flex justify-between items-center">
                INTERVIEW CHAT
                <Badge variant="secondary" className="text-xs">
                  {messages.length}
                </Badge>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                  <div className="text-center text-gray-600 text-xs mt-10">
                    Interview started. Say hello!
                  </div>
                )}
                {messages.map((msg, idx) => (
                  <div
                    key={msg.id || idx}
                    className={`flex flex-col ${msg.senderId === user?._id || msg.senderName === user?.fullname ? "items-end" : "items-start"}`}
                  >
                    <p className="text-[10px] text-gray-500 mb-1">
                      {msg.senderName}
                    </p>
                    <div
                      className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.senderId === user?._id ||
                        msg.senderName === user?.fullname
                        ? "bg-yellow-500/20 text-yellow-200 rounded-tr-sm border border-yellow-500/20"
                        : "bg-white/10 text-gray-200 rounded-tl-sm border border-white/5"
                        }`}
                    >
                      {msg.message}
                    </div>
                    <span className="text-[10px] text-gray-600 mt-1 px-1">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Typing Indicator */}
              {typingUsers.length > 0 && (
                <div className="px-4 py-2 text-xs text-gray-500">
                  {typingUsers.map((u) => u.name).join(", ")} is typing...
                </div>
              )}

              {/* Chat Input */}
              <div className="p-4 border-t border-white/10">
                <form onSubmit={handleSendMessage} className="relative">
                  <Input
                    type="text"
                    className="w-full bg-white/5 border-white/10 rounded-full pl-4 pr-12 py-3 text-sm text-white"
                    placeholder="Type a message..."
                    value={inputMessage}
                    onChange={handleInputChange}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-yellow-500 text-black hover:bg-yellow-400 h-8 w-8"
                  >
                    <Send size={14} />
                  </Button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default LiveInterview;
