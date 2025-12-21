/**
 * LiveInterview.jsx - Real-time AI Voice Interview with ElevenLabs
 *
 * Features:
 * - ElevenLabs TTS for natural AI voice
 * - Web Speech API for STT
 * - Real-time conversation
 * - Video call style UI
 * - Voice selection
 * - Video/Audio call toggle
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/utils/api";  // Uses interceptor with JWT token
import { toast } from "sonner";
import {
  Video,
  Mic,
  MicOff,
  VideoOff,
  Play,
  Square,
  MessageSquare,
  User,
  Bot,
  Loader2,
  Clock,
  Volume2,
  VolumeX,
  Sparkles,
  Brain,
  PhoneOff,
  Phone,
  Settings,
  ChevronDown,
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

const LiveInterview = () => {
  // Core states
  const [mode, setMode] = useState("setup"); // setup, connecting, interview, ended
  const [interviewType, setInterviewType] = useState("behavioral");
  const [sessionId, setSessionId] = useState(null);
  const [interviewer, setInterviewer] = useState({
    name: "AI",
    type: "behavioral",
  });

  // Voice and call type selection
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [callType, setCallType] = useState("video"); // 'video' or 'audio'
  const [showVoiceDropdown, setShowVoiceDropdown] = useState(false);

  // Language and voice settings (NEW)
  const [availableLanguages, setAvailableLanguages] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState({
    id: "en",
    name: "English",
    flag: "🇺🇸",
  });
  const [speedPreset, setSpeedPreset] = useState("normal");
  const [stylePreset, setStylePreset] = useState("professional");
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Conversation states
  const [messages, setMessages] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 5 });

  // Media states
  const [isRecording, setIsRecording] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [typedAnswer, setTypedAnswer] = useState("");

  // AI states
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [summary, setSummary] = useState(null);

  // Character usage
  const [charUsage, setCharUsage] = useState({ used: 0, limit: 10000 });

  // Refs
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const recognitionRef = useRef(null);
  const audioRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const transcriptRef = useRef(""); // Track transcript for silence detection
  const interimTranscriptRef = useRef("");
  const sessionIdRef = useRef(null); // Track sessionId for timer callbacks
  const isRecordingRef = useRef(false);
  const isAISpeakingRef = useRef(false);
  const isProcessingRef = useRef(false);

  const interviewTypes = [
    {
      id: "behavioral",
      name: "Behavioral",
      icon: MessageSquare,
      color: "from-[#FFD700] to-[#CC9900]",
      description: "STAR method & soft skills",
    },
    {
      id: "technical",
      name: "Technical",
      icon: Brain,
      color: "from-[#FFD700] to-[#CC9900]",
      description: "Coding & problem solving",
    },
    {
      id: "hr",
      name: "HR Round",
      icon: User,
      color: "from-[#FFD700] to-[#CC9900]",
      description: "Career goals & culture fit",
    },
  ];

  // Fetch available voices and languages on mount
  useEffect(() => {
    const fetchVoices = async () => {
      try {
        console.log("🎤 [LiveInterview] Fetching available voices...");
        const response = await api.get(`${API_BASE}/live-interview/voices`);
        if (response.data.success && response.data.voices?.length > 0) {
          setAvailableVoices(response.data.voices);
          console.log(
            `✅ [LiveInterview] Loaded ${response.data.voices.length} voices`,
          );
        } else {
          throw new Error("No voices returned");
        }
      } catch (error) {
        console.log(
          "⚠️ [LiveInterview] Failed to fetch voices, using defaults",
        );
        // Set default voices as fallback
        setAvailableVoices([
          {
            id: "RACHEL",
            name: "Rachel",
            gender: "female",
            description: "Professional female voice",
          },
          {
            id: "MATILDA",
            name: "Matilda",
            gender: "female",
            description: "Professional woman, pleasing alto",
          },
          {
            id: "ALICE",
            name: "Alice",
            gender: "female",
            description: "Clear, engaging, British accent",
          },
          {
            id: "LIAM",
            name: "Liam",
            gender: "male",
            description: "Young adult with energy and warmth",
          },
          {
            id: "CLYDE",
            name: "Clyde",
            gender: "male",
            description: "Deep, intense male voice",
          },
          {
            id: "ADAM",
            name: "Adam",
            gender: "male",
            description: "Deep professional male voice",
          },
        ]);
      }
    };

    const fetchLanguages = async () => {
      try {
        console.log("🌐 [LiveInterview] Fetching available languages...");
        const response = await api.get(
          `${API_BASE}/live-interview/languages`,
        );
        if (response.data.success) {
          setAvailableLanguages(response.data.languages);
          console.log(
            `✅ [LiveInterview] Loaded ${response.data.languages.length} languages`,
          );
        }
      } catch (error) {
        console.log(
          "⚠️ [LiveInterview] Failed to fetch languages, using defaults",
        );
        // Set default languages
        setAvailableLanguages([
          { id: "en", name: "English", flag: "🇺🇸" },
          { id: "es", name: "Spanish", flag: "🇪🇸" },
          { id: "fr", name: "French", flag: "🇫🇷" },
          { id: "de", name: "German", flag: "🇩🇪" },
        ]);
      }
    };

    fetchVoices();
    fetchLanguages();

    return () => {
      stopMedia();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Keep transcriptRef in sync with transcript state
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    interimTranscriptRef.current = interimTranscript;
  }, [interimTranscript]);

  // Keep sessionIdRef in sync with sessionId state
  useEffect(() => {
    sessionIdRef.current = sessionId;
    console.log("[LiveInterview] SessionId updated:", sessionId);
  }, [sessionId]);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    isAISpeakingRef.current = isAISpeaking;
  }, [isAISpeaking]);

  useEffect(() => {
    isProcessingRef.current = isProcessing;
  }, [isProcessing]);

  // Initialize camera and mic
  const initializeMedia = async () => {
    try {
      console.log(
        `📹 [LiveInterview] Initializing media - Call type: ${callType}`,
      );
      const stream = await navigator.mediaDevices.getUserMedia({
        video: callType === "video",
        audio: true,
      });
      mediaStreamRef.current = stream;
      if (videoRef.current && callType === "video") {
        videoRef.current.srcObject = stream;
      }
      console.log("✅ [LiveInterview] Media initialized successfully");
      return true;
    } catch (error) {
      console.error("❌ [LiveInterview] Media error:", error);
      toast.error("Failed to access camera/microphone");
      return false;
    }
  };

  // Stop all media
  const stopMedia = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  // Initialize speech recognition with retry logic
  const initializeSpeechRecognition = () => {
    if (
      !("webkitSpeechRecognition" in window || "SpeechRecognition" in window)
    ) {
      toast.error(
        "Speech recognition not supported in this browser. Please use Chrome.",
      );
      return null;
    }

    const SpeechRecognition =
      window.webkitSpeechRecognition || window.SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let final = "";
      let interim = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + " ";
        } else {
          interim += result[0].transcript;
        }
      }

      if (final) {
        transcriptRef.current = (transcriptRef.current || "") + final;
        setTranscript(transcriptRef.current);
        resetSilenceTimer();
        console.log("[LiveInterview] Captured speech:", final.trim());
      }

      interimTranscriptRef.current = interim;
      setInterimTranscript(interim);

      if (interim) {
        resetSilenceTimer();
      }
    };

    recognition.onerror = (event) => {
      if (event.error !== "network") {
        console.error("[LiveInterview] Speech recognition error:", event.error);
      } else {
        console.log("[LiveInterview] Speech recognition network issue");
      }

      switch (event.error) {
        case "network":
          console.log(
            "[LiveInterview] Network error, disabling speech recognition for this session",
          );
          try {
            recognition.stop();
          } catch (e) {
            /* ignore */
          }
          setIsRecording(false);
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }
          toast.error(
            "Speech recognition network error. You can continue by typing your answers or refresh the page.",
          );
          break;
        case "no-speech":
          // No speech detected - this is normal, just log it
          console.log("[LiveInterview] No speech detected, waiting...");
          break;
        case "audio-capture":
          toast.error("Microphone not accessible. Please check permissions.");
          break;
        case "not-allowed":
          toast.error(
            "Microphone permission denied. Please allow microphone access.",
          );
          break;
        case "aborted":
          // Recognition was aborted, try to restart
          if (isRecordingRef.current && !isAISpeakingRef.current) {
            setTimeout(() => {
              try {
                recognition.start();
              } catch (e) {
                /* ignore */
              }
            }, 500);
          }
          break;
        default:
          console.log("[LiveInterview] Speech error:", event.error);
      }
    };

    recognition.onend = () => {
      console.log(
        "[LiveInterview] Speech recognition ended, isRecording:",
        isRecording,
        "isAISpeaking:",
        isAISpeaking,
      );
      // Restart if still recording and AI is not speaking
      if (isRecordingRef.current && !isAISpeakingRef.current) {
        setTimeout(() => {
          try {
            recognition.start();
            console.log("[LiveInterview] Speech recognition restarted");
          } catch (e) {
            console.error(
              "[LiveInterview] Failed to restart speech recognition:",
              e,
            );
          }
        }, 100);
      }
    };

    recognition.onaudiostart = () => {
      console.log("[LiveInterview] Audio capture started");
    };

    recognition.onspeechstart = () => {
      console.log("[LiveInterview] Speech detected");
    };

    recognition.onspeechend = () => {
      if (isProcessingRef.current || isAISpeakingRef.current) return;
      const currentTranscript = (transcriptRef.current || "").trim();
      const currentInterim = (interimTranscriptRef.current || "").trim();
      if (currentTranscript.length >= 5 || currentInterim.length >= 5) {
        resetSilenceTimer(700);
      }
    };

    return recognition;
  };

  const resetSilenceTimer = (silenceMs = 1200) => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    silenceTimerRef.current = setTimeout(() => {
      handleSilenceDetected();
    }, silenceMs);
  };

  const handleSilenceDetected = () => {
    console.log("[LiveInterview] Silence detected, checking auto-send...", {
      transcriptLength: transcriptRef.current?.length,
      isProcessing,
      isAISpeaking,
    });

    // Use ref to get current transcript value (avoids stale closure)
    const currentTranscript = (transcriptRef.current || transcript).trim();
    const currentInterim = (
      interimTranscriptRef.current || interimTranscript
    ).trim();

    const candidateText =
      currentTranscript.length >= 5 ? currentTranscript : currentInterim;

    if (
      candidateText.length >= 5 &&
      !isProcessingRef.current &&
      !isAISpeakingRef.current
    ) {
      console.log("[LiveInterview] Auto-sending response after silence");
      sendResponse(candidateText);
    } else {
      console.log("[LiveInterview] Not auto-sending:", {
        hasEnoughText: candidateText.length >= 5,
        notProcessing: !isProcessingRef.current,
        notAISpeaking: !isAISpeakingRef.current,
      });
    }
  };

  // Play audio from base64
  const playAudio = async (base64Audio, audioType = "audio/mpeg") => {
    return new Promise((resolve, reject) => {
      try {
        const audioBlob = base64ToBlob(base64Audio, audioType);
        const audioUrl = URL.createObjectURL(audioBlob);

        if (audioRef.current) {
          audioRef.current.pause();
        }

        audioRef.current = new Audio(audioUrl);
        audioRef.current.onplay = () => setIsAISpeaking(true);
        audioRef.current.onended = () => {
          setIsAISpeaking(false);
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        audioRef.current.onerror = (e) => {
          setIsAISpeaking(false);
          reject(e);
        };

        audioRef.current.playbackRate =
          speedPreset === "fast" ? 1.15 : speedPreset === "slow" ? 0.9 : 1.0;

        audioRef.current.play();
      } catch (error) {
        setIsAISpeaking(false);
        reject(error);
      }
    });
  };

  // Convert base64 to blob
  const base64ToBlob = (base64, mimeType) => {
    const byteChars = atob(base64);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNumbers[i] = byteChars.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  };

  // Start interview
  const startInterview = async () => {
    setMode("connecting");

    // Initialize media
    const mediaReady = await initializeMedia();
    if (!mediaReady) {
      setMode("setup");
      return;
    }

    try {
      console.log(
        `🚀 [LiveInterview] Starting interview - Type: ${interviewType}, Voice: ${selectedVoice?.name || "auto"}, Call: ${callType}`,
      );

      const response = await api.post(
        `${API_BASE}/live-interview/start`,
        {
          type: interviewType,
          candidateName: "Candidate", // Could get from user profile
          jobTitle: "Software Developer",
          voiceId: selectedVoice?.voiceId || null,
          callType,
        },
        { withCredentials: true },
      );

      if (response.data.success) {
        const {
          sessionId,
          interviewer,
          greeting,
          firstQuestion,
          characterUsage,
        } = response.data;

        setSessionId(sessionId);
        setInterviewer(interviewer);
        setCurrentQuestion(firstQuestion);
        setCharUsage(characterUsage);

        // Add greeting to messages
        setMessages([
          {
            role: "ai",
            text: greeting.text,
            timestamp: Date.now(),
          },
        ]);

        setMode("interview");
        toast.success(`Connected with ${interviewer.name}!`);

        // Play greeting audio
        if (greeting.audioBase64) {
          await playAudio(greeting.audioBase64, greeting.audioType);
        }

        // Start listening after AI speaks
        startListening();
      }
    } catch (error) {
      console.error("Start interview error:", error);
      toast.error("Failed to start interview");
      setMode("setup");
    }
  };

  // Start listening with enhanced initialization
  const startListening = () => {
    console.log("[LiveInterview] Starting speech recognition...");

    // Create new recognition instance if needed
    if (!recognitionRef.current) {
      console.log(
        "[LiveInterview] Initializing new speech recognition instance",
      );
      recognitionRef.current = initializeSpeechRecognition();
    }

    if (recognitionRef.current && !isAISpeaking) {
      try {
        // Stop first to ensure clean state
        try {
          recognitionRef.current.stop();
        } catch (e) {
          /* ignore */
        }

        // Small delay before starting
        setTimeout(() => {
          try {
            recognitionRef.current.start();
            setIsRecording(true);
            console.log(
              "[LiveInterview] Speech recognition started successfully",
            );
            toast.success("Microphone active - speak now", { duration: 2000 });
          } catch (error) {
            if (error.name === "InvalidStateError") {
              console.log("[LiveInterview] Recognition already running");
              setIsRecording(true);
            } else {
              console.error(
                "[LiveInterview] Failed to start recognition:",
                error,
              );
              toast.error(
                "Failed to start microphone. Please refresh the page.",
              );
            }
          }
        }, 50);
      } catch (error) {
        console.error("[LiveInterview] Start listening error:", error);
      }
    }
  };

  // Stop listening
  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
  };

  // Send user response to AI
  const sendResponse = async (overrideText) => {
    const userText = (
      overrideText ??
      (transcriptRef.current || transcript)
    ).trim();
    console.log("[LiveInterview] sendResponse called:", {
      userText,
      length: userText.length,
      sessionId,
    });

    if (!userText || userText.length < 5) {
      console.log("[LiveInterview] Response too short, skipping");
      return;
    }

    // Use ref for sessionId to avoid stale closure issues
    const currentSessionId = sessionIdRef.current || sessionId;

    if (!currentSessionId) {
      console.error(
        "[LiveInterview] No sessionId! Interview session not started properly.",
      );
      toast.error("Session expired. Please restart the interview.");
      setMode("setup");
      return;
    }

    console.log(
      "[LiveInterview] Sending response to AI:",
      userText.substring(0, 50) + "...",
    );
    stopListening();
    setIsProcessing(true);

    // Add user message
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        text: userText,
        timestamp: Date.now(),
      },
    ]);

    setTranscript("");
    setInterimTranscript("");

    try {
      const response = await api.post(
        `${API_BASE}/live-interview/respond`,
        {
          sessionId: currentSessionId,
          userSpeech: userText,
        },
        { withCredentials: true },
      );

      if (response.data.success) {
        const { aiResponse, progress: prog, characterUsage } = response.data;

        // Add AI message
        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            text: aiResponse.text,
            timestamp: Date.now(),
          },
        ]);

        setProgress({
          current: prog.currentQuestion,
          total: prog.totalQuestions,
        });
        setCurrentQuestion(prog.nextQuestion);
        setCharUsage(characterUsage);

        // Play AI audio
        if (aiResponse.audioBase64) {
          await playAudio(aiResponse.audioBase64, aiResponse.audioType);
        }

        // Continue or end
        if (prog.shouldContinue) {
          startListening();
        } else {
          endInterview();
        }
      }
    } catch (error) {
      console.error("Response error:", error);
      toast.error("Failed to process response");
      startListening();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendTypedAnswer = () => {
    const text = typedAnswer.trim();
    if (!text || text.length < 5) {
      toast.error("Please type a bit more before sending.");
      return;
    }
    transcriptRef.current = text;
    setTranscript(text);
    setTypedAnswer("");
    sendResponse(text);
  };

  // End interview
  const endInterview = async () => {
    stopListening();
    setIsProcessing(true);

    try {
      const response = await axios.post(
        `${API_BASE}/live-interview/end`,
        {
          sessionId,
        },
        { withCredentials: true },
      );

      if (response.data.success) {
        const { closing, summary } = response.data;

        // Add closing message
        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            text: closing.text,
            timestamp: Date.now(),
          },
        ]);

        // Play closing audio
        if (closing.audioBase64) {
          await playAudio(closing.audioBase64, closing.audioType);
        }

        setSummary(summary);
        setMode("ended");
      }
    } catch (error) {
      console.error("End interview error:", error);
    } finally {
      setIsProcessing(false);
      stopMedia();
    }
  };

  // Toggle microphone
  const toggleMic = () => {
    if (isRecording) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (mediaStreamRef.current) {
      const videoTracks = mediaStreamRef.current.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !videoEnabled;
      });
      setVideoEnabled(!videoEnabled);
    }
  };

  // Interrupt AI
  const interruptAI = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsAISpeaking(false);
    }
    startListening();
  };

  // Render setup screen - Premium Industrial Standard Design
  const renderSetup = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto"
    >
      {/* Header Section - Matching Website Style */}
      <div className="mb-8">
        {/* Badge */}
        <div className="flex justify-center mb-6">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FFD700]/10 border border-[#FFD700]/40"
          >
            <Sparkles className="w-4 h-4 text-[#FFD700]" />
            <span className="text-[#FFD700] text-sm font-semibold tracking-wide">
              HIRE.OS POWERED
            </span>
          </motion.div>
        </div>

        {/* Title */}
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-4xl md:text-5xl font-bold text-center mb-3"
        >
          <span className="text-white">AI Interview </span>
          <span className="text-[#FFD700]">Coach</span>
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-gray-500 text-base max-w-xl mx-auto"
        >
          AI-powered interview practice with natural voice feedback
        </motion.p>
      </div>

      {/* Main Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Left Column - Interview Type */}
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="rounded-sm border border-white/10 bg-[#0A0A0A] p-5 relative overflow-hidden"
        >
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            SELECT INTERVIEW TYPE
          </h3>

          <div className="space-y-3">
            {interviewTypes.map((type, idx) => (
              <motion.button
                key={type.id}
                onClick={() => setInterviewType(type.id)}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.6 + idx * 0.1 }}
                className={`w-full flex items-center gap-4 p-4 rounded-sm transition-all duration-200 ${interviewType === type.id
                  ? "bg-[#FFD700] border-2 border-[#FFD700]"
                  : "bg-transparent border-2 border-white/10 hover:border-[#FFD700]/30"
                  }`}
              >
                <div className="flex-1 text-left">
                  <h4
                    className={`font-bold ${interviewType === type.id ? "text-black" : "text-white"}`}
                  >
                    {type.name}
                  </h4>
                  <p
                    className={`text-sm ${interviewType === type.id ? "text-black/70" : "text-gray-500"}`}
                  >
                    {type.description}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Right Column - Call Settings */}
        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="rounded-sm border border-white/10 bg-[#0A0A0A] p-5 relative overflow-hidden"
        >
          {/* Call Type */}
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            CALL TYPE
          </h3>

          {/* Call Type Toggle */}
          <div className="mb-6">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setCallType("video")}
                className={`flex items-center justify-center gap-2 p-4 rounded-sm transition-all duration-200 ${callType === "video"
                  ? "bg-[#FFD700] text-black font-bold"
                  : "border-2 border-white/10 text-gray-400 hover:border-[#FFD700]/30"
                  }`}
              >
                <Video className="w-5 h-5" />
                <span className="font-semibold">Video</span>
              </button>
              <button
                onClick={() => setCallType("audio")}
                className={`flex items-center justify-center gap-2 p-4 rounded-sm transition-all duration-200 ${callType === "audio"
                  ? "bg-[#FFD700] text-black font-bold"
                  : "border-2 border-white/10 text-gray-400 hover:border-[#FFD700]/30"
                  }`}
              >
                <Phone className="w-5 h-5" />
                <span className="font-semibold">Audio</span>
              </button>
            </div>
          </div>

          {/* Voice Selection */}
          <div className="relative">
            <label className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 block">
              AI VOICE
            </label>
            <button
              onClick={() => setShowVoiceDropdown(!showVoiceDropdown)}
              className="w-full flex items-center justify-between p-4 rounded-sm border-2 border-white/10 hover:border-[#FFD700]/30 transition-all"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedVoice?.gender === "female"
                    ? "bg-gradient-to-br from-[#FF69B4] to-[#FF1493]"
                    : selectedVoice?.gender === "male"
                      ? "bg-gradient-to-br from-[#00BFFF] to-[#0080FF]"
                      : "bg-gradient-to-br from-[#FFD700] to-[#FFA500]"
                    }`}
                >
                  <Volume2 className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <span className="text-white font-medium block">
                    {selectedVoice?.name || "Auto Select"}
                  </span>
                  <span className="text-gray-500 text-xs">
                    {selectedVoice?.description || "Based on interview type"}
                  </span>
                </div>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-gray-400 transition-transform ${showVoiceDropdown ? "rotate-180" : ""}`}
              />
            </button>

            {/* Voice Selection Modal */}
            <AnimatePresence>
              {showVoiceDropdown && (
                <>
                  {/* Backdrop with flex centering */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowVoiceDropdown(false)}
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[90] flex items-center justify-center"
                  >
                    {/* Modal - Stop propagation so clicking modal doesn't close it */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 20 }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-[90%] max-w-md bg-[#111111] border border-white/20 rounded-sm shadow-2xl"
                    >
                      {/* Modal Header */}
                      <div className="p-4 border-b border-white/10 flex items-center justify-between">
                        <h3 className="text-white font-bold uppercase tracking-wider text-sm">
                          🎤 Select AI Voice
                        </h3>
                        <button
                          onClick={() => setShowVoiceDropdown(false)}
                          className="text-gray-400 hover:text-white p-1 text-lg"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Auto Select - Fixed at top */}
                      <button
                        onClick={() => {
                          setSelectedVoice(null);
                          setShowVoiceDropdown(false);
                        }}
                        className={`w-full px-4 py-4 flex items-center gap-4 hover:bg-white/5 transition-colors text-left border-b border-white/10 ${!selectedVoice ? "bg-[#FFD700]/10 border-l-4 border-l-[#FFD700]" : ""}`}
                      >
                        <div className="w-10 h-10 rounded-sm bg-[#FFD700] flex items-center justify-center flex-shrink-0">
                          <Settings className="w-5 h-5 text-black" />
                        </div>
                        <div className="flex-1">
                          <span className="text-white font-bold block">
                            ⚡ Auto Select
                          </span>
                          <p className="text-xs text-gray-500">
                            Based on interview type
                          </p>
                        </div>
                        {!selectedVoice && (
                          <span className="text-[#FFD700] text-xl">✓</span>
                        )}
                      </button>

                      {/* Voice List - Scrollable */}
                      <div className="max-h-[50vh] overflow-y-auto">
                        {availableVoices.map((voice) => (
                          <button
                            key={voice.id}
                            onClick={() => {
                              setSelectedVoice(voice);
                              setShowVoiceDropdown(false);
                              console.log(
                                `🎤 [LiveInterview] Selected voice: ${voice.name}`,
                              );
                            }}
                            className={`w-full px-4 py-4 flex items-center gap-4 hover:bg-white/5 transition-colors text-left border-b border-white/5 ${selectedVoice?.id === voice.id ? "bg-[#FFD700]/10 border-l-4 border-l-[#FFD700]" : ""}`}
                          >
                            <div
                              className={`w-10 h-10 rounded-sm flex items-center justify-center flex-shrink-0 ${voice.gender === "female" ? "bg-[#FF69B4]" : "bg-[#00D4FF]"}`}
                            >
                              <Volume2 className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <span className="text-white font-bold block">
                                {voice.name}
                              </span>
                              <p className="text-xs text-gray-500">
                                {voice.description}
                              </p>
                            </div>
                            <Badge
                              className={`text-[10px] uppercase rounded-sm ${voice.gender === "female" ? "bg-[#FF69B4]/20 text-[#FF69B4] border-[#FF69B4]/30" : "bg-[#00D4FF]/20 text-[#00D4FF] border-[#00D4FF]/30"}`}
                            >
                              {voice.gender}
                            </Badge>
                            {selectedVoice?.id === voice.id && (
                              <span className="text-[#FFD700] text-xl">✓</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Language & Voice Settings Row */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.75 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
      >
        {/* Language Selection */}
        <div className="rounded-sm border border-[#2a2a2a] bg-transparent p-4">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 block">
            🌐 LANGUAGE
          </label>
          <button
            onClick={() => setShowLanguageModal(true)}
            className="w-full flex items-center justify-between p-3 rounded-sm border border-[#2a2a2a] hover:border-[#FFD700]/50 bg-[#111111] transition-all"
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl">{selectedLanguage.flag}</span>
              <span className="text-white font-medium">
                {selectedLanguage.name}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Speed Preset */}
        <div className="rounded-sm border border-[#2a2a2a] bg-transparent p-4">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 block">
            ⚡ SPEAKING SPEED
          </label>
          <div className="flex gap-2">
            {["slow", "normal", "fast"].map((speed) => (
              <button
                key={speed}
                onClick={() => setSpeedPreset(speed)}
                className={`flex-1 py-2 px-3 rounded-sm text-sm font-medium transition-all capitalize ${speedPreset === speed
                  ? "bg-[#FFD700] text-black"
                  : "border border-[#2a2a2a] bg-[#111111] text-gray-400 hover:border-[#FFD700]/50"
                  }`}
              >
                {speed}
              </button>
            ))}
          </div>
        </div>

        {/* Style Preset */}
        <div className="rounded-sm border border-[#2a2a2a] bg-transparent p-4">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 block">
            🎭 VOICE STYLE
          </label>
          <div className="flex gap-2">
            {["professional", "casual", "expressive"].map((style) => (
              <button
                key={style}
                onClick={() => setStylePreset(style)}
                className={`flex-1 py-2 px-3 rounded-sm text-xs font-medium transition-all capitalize ${stylePreset === style
                  ? "bg-[#FFD700] text-black"
                  : "border border-[#2a2a2a] bg-[#111111] text-gray-400 hover:border-[#FFD700]/50"
                  }`}
              >
                {style}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Language Selection Modal */}
      <AnimatePresence>
        {showLanguageModal && (
          <>
            {/* Backdrop with flex centering */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLanguageModal(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[90] flex items-center justify-center"
            >
              {/* Modal */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="w-[90%] max-w-md bg-[#111111] border border-[#2a2a2a] rounded-sm shadow-2xl"
              >
                <div className="p-4 border-b border-[#2a2a2a] flex items-center justify-between">
                  <h3 className="text-white font-bold uppercase tracking-wider text-sm">
                    🌐 Select Interview Language
                  </h3>
                  <button
                    onClick={() => setShowLanguageModal(false)}
                    className="text-gray-400 hover:text-white p-1 text-lg"
                  >
                    ✕
                  </button>
                </div>
                <div className="max-h-[50vh] overflow-y-auto">
                  {availableLanguages.map((lang) => (
                    <button
                      key={lang.id}
                      onClick={() => {
                        setSelectedLanguage(lang);
                        setShowLanguageModal(false);
                        console.log(
                          `🌐 [LiveInterview] Selected language: ${lang.name}`,
                        );
                      }}
                      className={`w-full px-4 py-4 flex items-center gap-4 hover:bg-white/5 transition-colors text-left border-b border-[#2a2a2a] ${selectedLanguage.id === lang.id ? "bg-[#FFD700]/10 border-l-4 border-l-[#FFD700]" : ""}`}
                    >
                      <span className="text-3xl">{lang.flag}</span>
                      <span className="text-white font-bold flex-1">
                        {lang.name}
                      </span>
                      {selectedLanguage.id === lang.id && (
                        <span className="text-[#FFD700] text-xl">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Start Button */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <motion.button
          onClick={startInterview}
          whileHover={{
            scale: 1.01,
            boxShadow: "0 10px 30px rgba(255, 215, 0, 0.3)",
          }}
          whileTap={{ scale: 0.99 }}
          className="w-full py-4 bg-[#FFD700] hover:bg-[#E6C200] rounded-sm font-bold text-black text-lg flex items-center justify-center gap-3 transition-all duration-200 uppercase tracking-wider"
        >
          <Play className="w-5 h-5" />
          <span className="uppercase tracking-wider">
            Start {callType === "video" ? "Video" : "Voice"} Interview
          </span>
        </motion.button>

        {/* Helper Text */}
        <div className="flex items-center justify-center gap-6 mt-6 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4" />
            <span>Microphone required</span>
          </div>
          {callType === "video" && (
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              <span>Camera optional</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>AI-powered feedback</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );

  // Render connecting screen - Hire.OS Style
  const renderConnecting = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-20"
    >
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-[#FFD700] animate-pulse" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-black animate-spin" />
        </div>
      </div>
      <h2 className="text-xl font-bold text-white mt-6">
        Connecting to AI Interviewer...
      </h2>
      <p className="text-gray-500 mt-2">Initializing voice and video</p>
    </motion.div>
  );

  // Render interview screen - Hire.OS Style
  const renderInterview = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Interview Area */}
      <div className="lg:col-span-2 space-y-4">
        {/* Video feeds */}
        <div className="grid grid-cols-2 gap-4">
          {/* AI Video (avatar) */}
          <motion.div
            animate={{
              borderColor: isAISpeaking ? "#FFD700" : "#2a2a2a",
            }}
            className="relative aspect-video bg-[#0a0a0a] rounded-xl border-2 border-[#2a2a2a] flex items-center justify-center overflow-hidden"
          >
            {/* AI Avatar */}
            <div
              className={`w-20 h-20 rounded-full bg-[#FFD700] flex items-center justify-center ${isAISpeaking ? "animate-pulse" : ""}`}
            >
              <Bot className="w-10 h-10 text-black" />
            </div>

            {/* AI name badge */}
            <div className="absolute bottom-3 left-3 px-3 py-1.5 bg-black/80 rounded-lg flex items-center gap-2 border border-[#2a2a2a]">
              <span
                className={`w-2 h-2 rounded-full ${isAISpeaking ? "bg-[#FFD700] animate-pulse" : "bg-gray-500"}`}
              />
              <span className="text-white text-sm font-medium">
                {interviewer.name}
              </span>
            </div>

            {/* Speaking indicator */}
            {isAISpeaking && (
              <div className="absolute top-3 right-3 px-3 py-1.5 bg-[#FFD700]/20 rounded-lg flex items-center gap-2 border border-[#FFD700]/40">
                <Volume2 className="w-4 h-4 text-[#FFD700] animate-pulse" />
                <span className="text-[#FFD700] text-sm font-medium">
                  Speaking
                </span>
              </div>
            )}
          </motion.div>

          {/* User Video */}
          <motion.div
            animate={{
              borderColor: isRecording ? "#FFD700" : "#2a2a2a",
            }}
            className="relative aspect-video bg-[#0a0a0a] rounded-xl border-2 border-[#2a2a2a] overflow-hidden flex items-center justify-center"
          >
            {callType === "video" ? (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className={`w-20 h-20 rounded-full bg-[#333] flex items-center justify-center ${isRecording ? "ring-4 ring-[#FFD700]/50" : ""}`}
              >
                <User className="w-10 h-10 text-gray-400" />
              </div>
            )}

            {/* User badge */}
            <div className="absolute bottom-3 left-3 px-3 py-1.5 bg-black/80 rounded-lg flex items-center gap-2 border border-[#2a2a2a]">
              <span
                className={`w-2 h-2 rounded-full ${isRecording ? "bg-red-500 animate-pulse" : "bg-gray-500"}`}
              />
              <span className="text-white text-sm font-medium">You</span>
            </div>

            {/* Listening indicator */}
            {isRecording && (
              <div className="absolute top-3 right-3 px-3 py-1.5 bg-red-500/20 rounded-lg flex items-center gap-2 border border-red-500/40">
                <Mic className="w-4 h-4 text-red-400 animate-pulse" />
                <span className="text-red-400 text-sm font-medium">
                  Listening
                </span>
              </div>
            )}
          </motion.div>
        </div>

        {/* Live transcript */}
        <div className="bg-[#0a0a0a] rounded-xl p-4 border border-[#2a2a2a] space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              YOUR SPEECH
            </h3>
            <div className="min-h-[60px]">
              {transcript && (
                <p className="text-white text-base">{transcript}</p>
              )}
              {interimTranscript && (
                <p className="text-gray-500 italic">{interimTranscript}</p>
              )}
              {!transcript && !interimTranscript && (
                <p className="text-gray-600">Start speaking...</p>
              )}
            </div>
          </div>
          <div className="pt-2 border-t border-[#2a2a2a] space-y-2">
            <textarea
              value={typedAnswer}
              onChange={(e) => setTypedAnswer(e.target.value)}
              rows={3}
              className="w-full bg-[#050505] border border-[#2a2a2a] rounded-md px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#FFD700]/60"
              placeholder="Type your answer here if the microphone is not working"
            />
            <Button
              onClick={handleSendTypedAnswer}
              disabled={!typedAnswer.trim() || isProcessing}
              className="w-full bg-[#FFD700] text-black hover:bg-[#FFE44D] text-xs font-semibold uppercase tracking-wider"
            >
              Send Typed Answer
            </Button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 p-4 bg-[#0a0a0a] rounded-xl border border-[#2a2a2a]">
          <button
            onClick={toggleMic}
            className={`rounded-full w-12 h-12 flex items-center justify-center transition-all ${isRecording ? "bg-red-500 hover:bg-red-600 text-white" : "bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 hover:border-[#444]"}`}
          >
            {isRecording ? (
              <Mic className="w-5 h-5" />
            ) : (
              <MicOff className="w-5 h-5" />
            )}
          </button>

          <button
            onClick={toggleVideo}
            className={`rounded-full w-12 h-12 flex items-center justify-center transition-all ${videoEnabled ? "bg-[#1a1a1a] border border-[#2a2a2a] text-white" : "bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400"} hover:border-[#444]`}
          >
            {videoEnabled ? (
              <Video className="w-5 h-5" />
            ) : (
              <VideoOff className="w-5 h-5" />
            )}
          </button>

          {isAISpeaking && (
            <button
              onClick={interruptAI}
              className="rounded-full px-5 h-12 flex items-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] text-gray-300 hover:border-[#444] transition-all"
            >
              <VolumeX className="w-5 h-5" />
              <span className="font-medium">Interrupt</span>
            </button>
          )}

          {/* Status indicator instead of send button - auto-sends on silence */}
          <div className="rounded-full px-6 h-12 flex items-center gap-2 transition-all">
            {isProcessing ? (
              <div className="flex items-center gap-2 bg-[#FFD700]/20 px-4 py-2 rounded-lg border border-[#FFD700]/40">
                <Loader2 className="w-5 h-5 text-[#FFD700] animate-spin" />
                <span className="text-[#FFD700] font-medium">
                  Processing...
                </span>
              </div>
            ) : isRecording && transcript.length > 5 ? (
              <div className="flex items-center gap-2 bg-green-500/20 px-4 py-2 rounded-lg border border-green-500/40">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-green-400 text-sm">
                  Auto-send in 3s of silence
                </span>
              </div>
            ) : null}
          </div>

          <button
            onClick={endInterview}
            className="rounded-full w-12 h-12 flex items-center justify-center bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-all"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        {/* Progress */}
        <div className="bg-[#0a0a0a] rounded-xl p-4 border border-[#2a2a2a]">
          <div className="flex justify-between text-sm mb-3">
            <span className="text-gray-400 font-semibold uppercase tracking-wider">
              Progress
            </span>
            <span className="text-[#FFD700] font-bold">
              {progress.current}/{progress.total}
            </span>
          </div>
          <Progress
            value={(progress.current / progress.total) * 100}
            className="h-2 bg-[#1a1a1a]"
          />
        </div>

        {/* Current question */}
        {currentQuestion && (
          <div className="bg-[#0a0a0a] rounded-xl p-4 border border-[#FFD700]/30">
            <span className="inline-block px-3 py-1 bg-[#FFD700]/10 text-[#FFD700] text-xs font-semibold uppercase tracking-wider rounded-full mb-3">
              {currentQuestion.category}
            </span>
            <p className="text-white text-sm leading-relaxed">
              {currentQuestion.question}
            </p>
            {currentQuestion.tips && (
              <p className="text-gray-500 text-xs mt-3 flex items-start gap-2">
                <span className="text-[#FFD700]">💡</span>
                <span>{currentQuestion.tips}</span>
              </p>
            )}
          </div>
        )}

        {/* Conversation history */}
        <div className="bg-[#0a0a0a] rounded-xl p-4 border border-[#2a2a2a] max-h-[350px] overflow-y-auto">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            CONVERSATION
          </h3>
          <div className="space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                {msg.role === "ai" && (
                  <div className="w-7 h-7 rounded-full bg-[#FFD700] flex-shrink-0 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-black" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${msg.role === "user"
                    ? "bg-[#2a2a2a] text-white"
                    : "bg-[#1a1a1a] text-gray-300 border border-[#2a2a2a]"
                    }`}
                >
                  {msg.text}
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-[#333] flex-shrink-0 flex items-center justify-center">
                    <User className="w-4 h-4 text-gray-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Character usage */}
        <div className="text-center text-xs text-gray-500">
          Voice: {charUsage.used.toLocaleString()}/
          {charUsage.limit.toLocaleString()} chars
        </div>
      </div>
    </div>
  );

  // Render summary screen - Hire.OS Style
  const renderSummary = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto"
    >
      <div className="text-center mb-8">
        <div
          className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-4 ${summary.overallScore >= 80
            ? "bg-[#00FF94]/20 border-2 border-[#00FF94]/40"
            : summary.overallScore >= 60
              ? "bg-[#FFD700]/20 border-2 border-[#FFD700]/40"
              : "bg-red-500/20 border-2 border-red-500/40"
            }`}
        >
          <span
            className={`text-4xl font-bold ${summary.overallScore >= 80
              ? "text-[#00FF94]"
              : summary.overallScore >= 60
                ? "text-[#FFD700]"
                : "text-red-400"
              }`}
          >
            {summary.overallScore}
          </span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Interview Complete!
        </h2>
        <span className="inline-block px-4 py-1 bg-[#FFD700]/10 text-[#FFD700] rounded-full text-sm font-semibold border border-[#FFD700]/30">
          {summary.grade}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-[#0a0a0a] rounded-xl p-4 border border-[#00FF94]/30">
          <h3 className="text-[#00FF94] font-semibold mb-2">✓ Strengths</h3>
          <ul className="space-y-1">
            {summary.strengths?.map((s, i) => (
              <li key={i} className="text-gray-300 text-sm">
                • {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-[#0a0a0a] rounded-xl p-4 border border-[#FFD700]/30">
          <h3 className="text-[#FFD700] font-semibold mb-2">↗ Improvements</h3>
          <ul className="space-y-1">
            {summary.improvements?.map((s, i) => (
              <li key={i} className="text-gray-300 text-sm">
                • {s}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="text-gray-400 text-center mb-6">{summary.summary}</p>

      <button
        onClick={() => {
          setMode("setup");
          setSummary(null);
          setMessages([]);
          setSessionId(null);
        }}
        className="w-full py-4 bg-[#FFD700] hover:bg-[#E6C200] text-black font-bold rounded-xl transition-all"
      >
        Start New Interview
      </button>
    </motion.div>
  );

  return (
    <div className="min-h-[600px] p-6">
      <AnimatePresence mode="wait">
        {mode === "setup" && renderSetup()}
        {mode === "connecting" && renderConnecting()}
        {mode === "interview" && renderInterview()}
        {mode === "ended" && summary && renderSummary()}
      </AnimatePresence>
    </div>
  );
};

export default LiveInterview;
