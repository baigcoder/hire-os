import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { toast } from "sonner";
import {
  Video,
  Mic,
  MicOff,
  VideoOff,
  Play,
  Square,
  RefreshCw,
  MessageSquare,
  User,
  Bot,
  Loader2,
  Clock,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  Star,
  Award,
  AlertCircle,
  Volume2,
  VolumeX,
  Sparkles,
  Brain,
  Send,
  StopCircle,
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

const MockInterview = () => {
  const [mode, setMode] = useState("setup"); // setup, interview, feedback
  const [interviewType, setInterviewType] = useState("behavioral"); // behavioral, technical, hr
  const [questions, setQuestions] = useState([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(false);

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [transcript, setTranscript] = useState("");
  const [typedResponse, setTypedResponse] = useState("");

  // AI Voice states
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [aiModel, setAiModel] = useState("gpt-4o-mini"); // Track which model
  const [autoContinue, setAutoContinue] = useState(true); // Auto-advance to next question
  const [conversationMode, setConversationMode] = useState("live"); // 'live' or 'manual'

  // Feedback
  const [feedback, setFeedback] = useState(null);
  const [overallScore, setOverallScore] = useState(null);

  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);

  const interviewTypes = [
    {
      id: "behavioral",
      name: "Behavioral",
      icon: MessageSquare,
      description: "STAR method questions about past experiences",
    },
    {
      id: "technical",
      name: "Technical",
      icon: Brain,
      description: "Coding concepts and problem-solving",
    },
    {
      id: "hr",
      name: "HR Round",
      icon: User,
      description: "General questions about career and goals",
    },
  ];

  // Generate interview questions using backend GPT-4o-mini API
  const generateQuestions = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        `${API_BASE}/mock-interview/generate-questions`,
        {
          type: interviewType,
          jobTitle: "Software Developer",
          skills: ["JavaScript", "React", "Node.js"],
        },
        { withCredentials: true },
      );

      if (response.data.success) {
        setQuestions(response.data.questions);
        setAiModel(response.data.generatedBy || "gpt-4o-mini");
        setMode("interview");
        await initializeMedia();
        toast.success(
          `Interview ready! Powered by ${response.data.generatedBy || "AI"}`,
        );
      } else {
        throw new Error("Failed to generate questions");
      }
    } catch (error) {
      console.error("Generate questions error:", error);
      // Fallback questions
      setQuestions(getFallbackQuestions(interviewType));
      setMode("interview");
      await initializeMedia();
      toast.info("Using standard questions (login for AI-powered questions)");
    } finally {
      setLoading(false);
    }
  };

  const getFallbackQuestions = (type) => {
    const fallbacks = {
      behavioral: [
        {
          question:
            "Tell me about a time you had to lead a team through a difficult project.",
          category: "Leadership",
          tips: "Use STAR method, quantify results",
        },
        {
          question:
            "Describe a situation where you had to resolve a conflict with a colleague.",
          category: "Conflict Resolution",
          tips: "Focus on collaboration and outcome",
        },
        {
          question:
            "Give an example of a time you failed and what you learned from it.",
          category: "Growth",
          tips: "Show self-awareness and learning",
        },
        {
          question: "Tell me about your greatest professional achievement.",
          category: "Achievement",
          tips: "Be specific about your contribution",
        },
        {
          question:
            "How do you handle working under pressure or tight deadlines?",
          category: "Stress Management",
          tips: "Give concrete examples",
        },
      ],
      technical: [
        {
          question: "Explain the difference between REST and GraphQL APIs.",
          category: "APIs",
          tips: "Compare use cases and trade-offs",
        },
        {
          question: "How would you optimize a slow database query?",
          category: "Database",
          tips: "Mention indexing, query analysis, caching",
        },
        {
          question: "What is the difference between SQL and NoSQL databases?",
          category: "Database",
          tips: "Discuss ACID, scalability, use cases",
        },
        {
          question: "Explain how you would design a URL shortening service.",
          category: "System Design",
          tips: "Cover hashing, storage, scalability",
        },
        {
          question:
            "What are the key principles of object-oriented programming?",
          category: "OOP",
          tips: "Explain with examples",
        },
      ],
      hr: [
        {
          question: "Where do you see yourself in 5 years?",
          category: "Career Goals",
          tips: "Align with company growth",
        },
        {
          question: "Why are you looking to leave your current position?",
          category: "Motivation",
          tips: "Be positive, focus on growth",
        },
        {
          question: "What are your salary expectations?",
          category: "Negotiation",
          tips: "Research market rates beforehand",
        },
        {
          question: "Why should we hire you over other candidates?",
          category: "Value Proposition",
          tips: "Highlight unique strengths",
        },
        {
          question: "Do you have any questions for us?",
          category: "Engagement",
          tips: "Ask thoughtful questions about role/culture",
        },
      ],
    };
    return fallbacks[type] || fallbacks.behavioral;
  };

  // AI Voice - Speak question using Web Speech API
  const speakQuestion = (text) => {
    if (!voiceEnabled || !("speechSynthesis" in window)) return;

    // Stop any current speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95; // Slightly slower for clarity
    utterance.pitch = 1;
    utterance.volume = 1;

    // Try to get a professional sounding voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) =>
        v.name.includes("Google") ||
        v.name.includes("Microsoft") ||
        v.name.includes("Samantha") ||
        v.lang.startsWith("en"),
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // Stop AI voice
  const stopSpeaking = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  // Initialize camera and microphone
  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoEnabled,
        audio: audioEnabled,
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Initialize speech recognition with enhanced real-time features
      if (
        "webkitSpeechRecognition" in window ||
        "SpeechRecognition" in window
      ) {
        const SpeechRecognition =
          window.webkitSpeechRecognition || window.SpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = "en-US";
        recognitionRef.current.maxAlternatives = 1;

        recognitionRef.current.onresult = (event) => {
          let finalTranscript = "";
          let interimText = "";

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
              finalTranscript += result[0].transcript + " ";
            } else {
              interimText += result[0].transcript;
            }
          }

          // Update final transcript
          if (finalTranscript) {
            setTranscript((prev) => prev + finalTranscript);
          }

          // Show interim results live (what user is currently saying)
          setInterimTranscript(interimText);
        };

        recognitionRef.current.onerror = (event) => {
          console.log("Speech recognition error:", event.error);
          if (event.error === "no-speech") {
            toast.info(
              "No speech detected. Try speaking closer to the microphone.",
            );
          }
        };
      }

      // Pre-load voices for speech synthesis
      if ("speechSynthesis" in window) {
        window.speechSynthesis.getVoices();
      }
    } catch (error) {
      console.error("Media initialization error:", error);
      toast.error("Could not access camera/microphone");
    }
  };

  // Toggle recording
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = () => {
    setIsRecording(true);
    setTranscript("");
    if (recognitionRef.current) {
      recognitionRef.current.start();
    }
  };

  // Real-time interim transcript for live display
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const stopRecording = async () => {
    setIsRecording(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    // Save response
    const response = transcript || typedResponse;
    if (response.trim()) {
      const newResponse = {
        question: questions[currentQIndex],
        answer: response.trim(),
        timestamp: new Date(),
      };
      setResponses((prev) => [...prev, newResponse]);
      setInterimTranscript("");

      // Get immediate feedback for this response (non-blocking)
      getFeedbackForResponse(newResponse);

      // Speak acknowledgment quickly
      if (voiceEnabled) {
        speakAcknowledgment();
      }
    }
  };

  // Quick acknowledgment phrases
  const speakAcknowledgment = () => {
    const phrases = [
      "Good answer. Let me analyze that.",
      "Thank you for your response.",
      "I see. Let me consider that.",
      "Interesting perspective.",
      "Got it. Moving on.",
    ];
    const phrase = phrases[Math.floor(Math.random() * phrases.length)];

    const utterance = new SpeechSynthesisUtterance(phrase);
    utterance.rate = 1.1; // Slightly faster for acknowledgment
    utterance.volume = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  // Get AI feedback for a response - uses backend GPT-4o mini for speed
  const getFeedbackForResponse = async (response) => {
    setIsAnalyzing(true);
    try {
      const res = await axios.post(
        `${API_BASE}/mock-interview/feedback`,
        {
          question: response.question.question,
          answer: response.answer,
          previousQA: responses.map((r) => ({
            question: r.question.question,
            answer: r.answer,
          })),
        },
        { withCredentials: true },
      );

      if (res.data.success) {
        const fb = res.data.feedback;
        setResponses((prev) => {
          const updated = [...prev];
          if (updated.length > 0) {
            updated[updated.length - 1].feedback = fb;
          }
          return updated;
        });

        // Speak feedback summary if voice enabled
        if (voiceEnabled && fb.feedback) {
          const feedbackMsg =
            fb.score >= 7 ? `${fb.feedback}` : `${fb.feedback}`;

          // Wait a moment then speak feedback, then auto-advance in live mode
          setTimeout(() => {
            const utterance = new SpeechSynthesisUtterance(feedbackMsg);
            utterance.rate = 1.0;

            // Auto-advance to next question after feedback in live conversation mode
            utterance.onend = () => {
              if (autoContinue && conversationMode === "live") {
                setTimeout(() => {
                  nextQuestion();
                }, 800); // Brief pause before next question
              }
            };

            window.speechSynthesis.speak(utterance);
          }, 1500);
        } else if (autoContinue && conversationMode === "live") {
          // If no voice, still auto-advance after a delay
          setTimeout(() => nextQuestion(), 2000);
        }
      }
    } catch (error) {
      console.log("Feedback generation error:", error);
      // In live mode, continue to next question even on error
      if (autoContinue && conversationMode === "live") {
        setTimeout(() => nextQuestion(), 1500);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Move to next question
  const nextQuestion = () => {
    setTranscript("");
    setTypedResponse("");
    setInterimTranscript("");
    stopSpeaking(); // Stop any current speech before next question
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex((prev) => prev + 1);
    } else {
      finishInterview();
    }
  };

  // Finish interview and get overall feedback
  const finishInterview = async () => {
    setLoading(true);
    cleanupMedia();

    try {
      // Calculate overall score
      const scores = responses
        .filter((r) => r.feedback?.score)
        .map((r) => r.feedback.score);
      const avgScore =
        scores.length > 0
          ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10)
          : 70;

      setOverallScore(avgScore);
      setMode("feedback");
      toast.success("Interview completed!");
    } catch (error) {
      console.error("Finish interview error:", error);
      setOverallScore(70);
      setMode("feedback");
    } finally {
      setLoading(false);
    }
  };

  // Cleanup media streams
  const cleanupMedia = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    stopSpeaking();
  };

  // Reset interview
  const resetInterview = () => {
    cleanupMedia();
    setMode("setup");
    setQuestions([]);
    setCurrentQIndex(0);
    setResponses([]);
    setTranscript("");
    setTypedResponse("");
    setOverallScore(null);
  };

  // Speak question when it changes
  useEffect(() => {
    if (mode === "interview" && questions.length > 0 && voiceEnabled) {
      const question = questions[currentQIndex]?.question;
      if (question) {
        // Small delay to let UI update first
        const timer = setTimeout(() => speakQuestion(question), 500);
        return () => clearTimeout(timer);
      }
    }
  }, [currentQIndex, mode, questions, voiceEnabled]);

  useEffect(() => {
    return () => cleanupMedia();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-sm bg-[#FFD700]/10 flex items-center justify-center border border-[#FFD700]/30">
              <Video className="w-4 h-4 sm:w-5 sm:h-5 text-[#FFD700]" />
            </div>
            Mock Interview
          </h2>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">
            Practice with AI-powered interview simulation
          </p>
        </div>
        {mode !== "setup" && (
          <Button
            onClick={resetInterview}
            variant="outline"
            size="sm"
            className="border-white/10 text-gray-400 hover:bg-white/5 w-full sm:w-auto"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            New Interview
          </Button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {/* Setup Mode */}
        {mode === "setup" && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Interview Type Selection */}
            <div className="bg-[#111111] border border-white/10 rounded-md p-6">
              <label className="text-xs text-gray-500 uppercase tracking-wider mb-4 block font-mono">
                Select Interview Type
              </label>
              <div className="grid grid-cols-1 gap-3">
                {interviewTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setInterviewType(type.id)}
                    className={`p-4 rounded-sm border transition-all text-left ${interviewType === type.id
                      ? "bg-[#FFD700]/10 border-[#FFD700]/50 text-white"
                      : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"
                      }`}
                  >
                    <div className="font-semibold text-sm">{type.name}</div>
                    <div
                      className={`text-xs mt-1 ${interviewType === type.id ? "text-gray-300" : "text-gray-500"}`}
                    >
                      {type.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Media Settings */}
            <div className="bg-[#111111] border border-white/10 rounded-md p-6">
              <label className="text-xs text-gray-500 uppercase tracking-wider mb-4 block font-mono">
                Recording Settings
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <button
                  onClick={() => setVideoEnabled(!videoEnabled)}
                  className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2.5 sm:py-3 rounded-sm border text-xs sm:text-sm font-medium ${videoEnabled
                    ? "bg-[#FFD700]/10 border-[#FFD700]/50 text-[#FFD700]"
                    : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"
                    }`}
                >
                  {videoEnabled ? (
                    <Video className="w-4 h-4 sm:w-5 sm:h-5" />
                  ) : (
                    <VideoOff className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                  <span className="hidden xs:inline">Video</span> {videoEnabled ? "On" : "Off"}
                </button>
                <button
                  onClick={() => setAudioEnabled(!audioEnabled)}
                  className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2.5 sm:py-3 rounded-sm border text-xs sm:text-sm font-medium ${audioEnabled
                    ? "bg-[#FFD700]/10 border-[#FFD700]/50 text-[#FFD700]"
                    : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"
                    }`}
                >
                  {audioEnabled ? (
                    <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
                  ) : (
                    <MicOff className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                  <span className="hidden xs:inline">Mic</span> {audioEnabled ? "On" : "Off"}
                </button>
                <button
                  onClick={() => setVoiceEnabled(!voiceEnabled)}
                  className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2.5 sm:py-3 rounded-sm border text-xs sm:text-sm font-medium ${voiceEnabled
                    ? "bg-purple-500/10 border-purple-500/50 text-purple-400"
                    : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"
                    }`}
                >
                  {voiceEnabled ? (
                    <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
                  ) : (
                    <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                  <span className="hidden xs:inline">AI</span> {voiceEnabled ? "On" : "Off"}
                </button>
                <button
                  onClick={() =>
                    setConversationMode(
                      conversationMode === "live" ? "manual" : "live",
                    )
                  }
                  className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2.5 sm:py-3 rounded-sm border text-xs sm:text-sm font-medium ${conversationMode === "live"
                    ? "bg-[#FFD700]/10 border-[#FFD700]/50 text-[#FFD700]"
                    : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"
                    }`}
                >
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                  {conversationMode === "live" ? "Live" : "Manual"}
                </button>
              </div>
              <p className="text-[10px] sm:text-xs text-gray-500 mt-3">
                {conversationMode === "live"
                  ? "🔴 LIVE: AI speaks, listens, and auto-advances"
                  : "💡 MANUAL: You control the pace"}
              </p>
            </div>

            {/* Start Button */}
            <Button
              onClick={generateQuestions}
              disabled={loading}
              className="w-full py-6 bg-[#FFD700] text-black hover:bg-[#FFE44D] font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Preparing Interview...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Start Voice Interview
                </>
              )}
            </Button>
          </motion.div>
        )}

        {/* Interview Mode */}
        {mode === "interview" && questions.length > 0 && (
          <motion.div
            key="interview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Progress */}
            <div className="bg-[#111111] border border-white/10 rounded-md p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/30">
                    {interviewTypes.find((t) => t.id === interviewType)?.name}{" "}
                    Interview
                  </Badge>
                  {conversationMode === "live" && (
                    <Badge className="bg-red-500/10 text-red-400 border-red-500/30 flex items-center gap-1">
                      <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                      LIVE
                    </Badge>
                  )}
                </div>
                <span className="text-gray-500 text-sm">
                  Question {currentQIndex + 1} of {questions.length}
                </span>
              </div>
              <Progress
                value={((currentQIndex + 1) / questions.length) * 100}
                className="h-2 bg-white/10"
              />
            </div>

            {/* Video Preview & Question */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {/* Video */}
              <div className="bg-[#111111] border border-white/10 rounded-md p-3 sm:p-4 relative overflow-hidden order-2 md:order-1">
                <div className="absolute top-2 right-2 z-10 flex gap-2">
                  {isRecording && (
                    <Badge className="bg-red-500 text-white animate-pulse text-xs">
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full mr-1.5 sm:mr-2" />
                      REC
                    </Badge>
                  )}
                </div>

                {videoEnabled ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full aspect-video rounded-sm bg-black object-cover"
                  />
                ) : (
                  <div className="w-full aspect-video rounded-sm bg-[#0A0A0A] flex items-center justify-center">
                    <User className="w-12 h-12 sm:w-20 sm:h-20 text-gray-600" />
                  </div>
                )}

                <div className="flex justify-center gap-2 mt-3 sm:mt-4">
                  <Button
                    onClick={toggleRecording}
                    size="sm"
                    className={`${isRecording
                      ? "bg-red-500 hover:bg-red-600"
                      : "bg-green-500 hover:bg-green-600"
                      } text-white text-xs sm:text-sm px-4 sm:px-6`}
                  >
                    {isRecording ? (
                      <>
                        <StopCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" /> Stop
                      </>
                    ) : (
                      <>
                        <Mic className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" /> Record
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Question & Response */}
              <div className="space-y-3 sm:space-y-4 order-1 md:order-2">
                <div className="bg-[#111111] border border-[#FFD700]/30 rounded-md p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-2 sm:mb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-[#FFD700]" />
                      <span className="text-[10px] sm:text-xs text-[#FFD700] uppercase tracking-wider font-mono">
                        Interviewer
                      </span>
                      {isSpeaking && (
                        <Badge className="bg-[#FFD700]/15 text-[#FFD700] border-[#FFD700]/30 animate-pulse text-[10px] sm:text-xs">
                          <Volume2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
                          Speaking
                        </Badge>
                      )}
                    </div>
                    <Button
                      onClick={() =>
                        speakQuestion(questions[currentQIndex]?.question)
                      }
                      variant="ghost"
                      size="sm"
                      disabled={isSpeaking}
                      className="text-[#FFD700] hover:bg-[#FFD700]/10 text-xs h-7 px-2"
                    >
                      <Volume2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                      <span className="hidden sm:inline">Replay</span>
                    </Button>
                  </div>
                  <p className="text-white text-sm sm:text-base md:text-lg leading-relaxed">
                    {questions[currentQIndex]?.question}
                  </p>
                  {questions[currentQIndex]?.tips && (
                    <p className="text-gray-500 text-[10px] sm:text-xs mt-2 sm:mt-3 italic">
                      💡 {questions[currentQIndex].tips}
                    </p>
                  )}
                </div>

                {/* Transcript / Type Response */}
                <div className="bg-[#111111] border border-white/10 rounded-md p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-gray-500 uppercase tracking-wider font-mono">
                      Your Response{" "}
                      {audioEnabled ? "(Live Speech-to-Text)" : "(Type)"}
                    </label>
                    {isRecording && (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-xs text-red-400">
                          Recording...
                        </span>
                      </div>
                    )}
                    {isAnalyzing && (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-3 h-3 text-[#FFD700] animate-spin" />
                        <span className="text-xs text-[#FFD700]">
                          Analyzing...
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Live transcript display */}
                  <div className="w-full min-h-[100px] px-3 py-2 bg-[#0A0A0A] border border-white/10 rounded-sm text-sm">
                    <span className="text-white">
                      {transcript || typedResponse}
                    </span>
                    {interimTranscript && (
                      <span className="text-gray-400 italic">
                        {interimTranscript}
                      </span>
                    )}
                    {!transcript && !typedResponse && !interimTranscript && (
                      <span className="text-gray-600">
                        {audioEnabled
                          ? "🎤 Start speaking... Your words will appear here in real-time"
                          : "Type your response..."}
                      </span>
                    )}
                  </div>

                  {/* Text input fallback */}
                  {!audioEnabled && (
                    <textarea
                      value={typedResponse}
                      onChange={(e) => setTypedResponse(e.target.value)}
                      placeholder="Type your response..."
                      rows={3}
                      className="w-full mt-2 px-3 py-2 bg-[#0A0A0A] border border-white/10 rounded-sm text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-[#FFD700]/50 resize-none"
                    />
                  )}

                  {/* Last response feedback */}
                  {responses.length > 0 &&
                    responses[responses.length - 1]?.feedback && (
                      <div className="mt-3 p-3 bg-[#FFD700]/5 border border-[#FFD700]/25 rounded">
                        <div className="flex items-center gap-2 mb-1">
                          <Star className="w-4 h-4 text-[#FFD700]" />
                          <span className="text-sm font-medium text-[#FFD700]">
                            Score:{" "}
                            {responses[responses.length - 1].feedback.score}/10
                          </span>
                          <Badge className="bg-[#FFD700]/15 text-[#FFD700] text-xs">
                            {responses[responses.length - 1].feedback.verdict ||
                              "Analyzed"}
                          </Badge>
                        </div>
                        {responses[responses.length - 1].feedback.tip && (
                          <p className="text-xs text-gray-400">
                            💡 {responses[responses.length - 1].feedback.tip}
                          </p>
                        )}
                      </div>
                    )}
                </div>

                {/* Next Button */}
                <Button
                  onClick={nextQuestion}
                  disabled={
                    (!transcript && !typedResponse) ||
                    isRecording ||
                    isAnalyzing
                  }
                  className="w-full py-2.5 sm:py-3 bg-[#FFD700] text-black hover:bg-[#FFE44D] text-[10px] sm:text-xs font-semibold rounded-full tracking-wider uppercase flex items-center justify-center gap-1.5 sm:gap-2"
                >
                  {currentQIndex < questions.length - 1 ? (
                    <>
                      Next <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                    </>
                  ) : (
                    <>
                      Finish <Award className="w-3 h-3 sm:w-4 sm:h-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Feedback Mode */}
        {mode === "feedback" && (
          <motion.div
            key="feedback"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4 sm:space-y-6"
          >
            {/* Overall Score */}
            <div className="bg-[#111111] border border-white/10 rounded-md p-5 sm:p-8 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-10 h-10 sm:w-16 sm:h-16 border-t border-r border-[#FFD700]/30" />
              <div className="absolute bottom-0 left-0 w-10 h-10 sm:w-16 sm:h-16 border-b border-l border-[#FFD700]/30" />

              <Award className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-[#FFD700]" />

              <div className="text-4xl sm:text-5xl font-bold font-mono text-white mb-2">
                {overallScore}%
              </div>

              <Badge
                className={`text-sm sm:text-lg px-3 sm:px-4 py-0.5 sm:py-1 ${overallScore >= 80
                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                  : overallScore >= 60
                    ? "bg-[#FFD700]/20 text-[#FFD700] border-[#FFD700]/30"
                    : "bg-red-500/20 text-red-400 border-red-500/30"
                  }`}
              >
                {overallScore >= 80
                  ? "Excellent!"
                  : overallScore >= 60
                    ? "Good Job!"
                    : "Keep Practicing!"}
              </Badge>

              <p className="text-gray-500 text-xs sm:text-sm mt-3 sm:mt-4">
                {responses.length}/{questions.length} questions answered
              </p>
            </div>

            {/* Response Reviews */}
            <div className="bg-[#111111] border border-white/10 rounded-md p-4 sm:p-6">
              <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider mb-3 sm:mb-4">
                Response Review
              </h3>
              <div className="space-y-3 sm:space-y-4 max-h-[300px] sm:max-h-[400px] overflow-y-auto">
                {responses.map((r, idx) => (
                  <div
                    key={idx}
                    className="p-3 sm:p-4 border border-white/5 rounded-sm bg-white/5"
                  >
                    <div className="flex items-start justify-between gap-2 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm text-[#FFD700] font-medium mb-1 line-clamp-2">
                          Q{idx + 1}: {r.question.question}
                        </p>
                        <p className="text-gray-300 text-xs sm:text-sm line-clamp-3">{r.answer}</p>
                      </div>
                      {r.feedback && (
                        <Badge
                          className={`flex-shrink-0 text-xs ${r.feedback.score >= 7
                            ? "bg-green-500/20 text-green-400"
                            : r.feedback.score >= 5
                              ? "bg-[#FFD700]/20 text-[#FFD700]"
                              : "bg-red-500/20 text-red-400"
                            }`}
                        >
                          {r.feedback.score}/10
                        </Badge>
                      )}
                    </div>
                    {r.feedback?.tip && (
                      <p className="text-[10px] sm:text-xs text-gray-500 mt-2 italic line-clamp-2">
                        💡 {r.feedback.tip}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Try Again */}
            <Button
              onClick={resetInterview}
              className="w-full py-4 sm:py-6 bg-[#FFD700] text-black hover:bg-[#FFE44D] font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
              Practice Again
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MockInterview;
