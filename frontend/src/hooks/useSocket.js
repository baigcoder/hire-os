/**
 * useSocket Hook - Socket.io Client Management
 * Handles connection, reconnection, and event management
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { io } from "socket.io-client";
import { useSelector } from "react-redux";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:8000";

export const useSocket = (interviewId, options = {}) => {
  const { user } = useSelector((state) => state.auth);
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [roomState, setRoomState] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);

  // Initialize socket connection
  useEffect(() => {
    const token = localStorage.getItem("token");

    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      ...options.socketOptions,
    });

    const socket = socketRef.current;

    // Connection events
    socket.on("connect", () => {
      console.log("🔗 Socket connected:", socket.id);
      setIsConnected(true);
      setConnectionError(null);

      // Join interview room if ID provided
      if (interviewId) {
        socket.emit("join-interview", {
          interviewId,
          role:
            user?.role === "recruiter" || user?.role === "company_admin"
              ? "recruiter"
              : "candidate",
        });
      }
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      setConnectionError(error.message);
      setIsConnected(false);
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
      setIsConnected(false);
    });

    // Room events
    socket.on("room-joined", (data) => {
      console.log("✅ Joined room:", data.room);
      setRoomState(data.room.state);
      setParticipants(data.room.participants || []);
      setMessages(data.messages || []);
    });

    socket.on("participant-joined", ({ participant, participantCount }) => {
      console.log("👤 Participant joined:", participant.fullname);
      setParticipants((prev) => {
        const exists = prev.some((p) => p.socketId === participant.socketId);
        if (exists) return prev;
        return [...prev, participant];
      });
    });

    socket.on("participant-left", ({ socketId, name, participantCount }) => {
      console.log("👋 Participant left:", name);
      setParticipants((prev) => prev.filter((p) => p.socketId !== socketId));
    });

    socket.on(
      "participant-media-changed",
      ({ socketId, isAudioOn, isVideoOn, isScreenSharing }) => {
        setParticipants((prev) =>
          prev.map((p) =>
            p.socketId === socketId
              ? { ...p, isAudioOn, isVideoOn, isScreenSharing }
              : p,
          ),
        );
      },
    );

    // Chat events
    socket.on("new-message", (message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on("user-typing", ({ socketId, name }) => {
      setTypingUsers((prev) => {
        if (prev.some((u) => u.socketId === socketId)) return prev;
        return [...prev, { socketId, name }];
      });
    });

    socket.on("user-stopped-typing", ({ socketId }) => {
      setTypingUsers((prev) => prev.filter((u) => u.socketId !== socketId));
    });

    // Interview state events
    socket.on("interview-started", ({ startedAt }) => {
      console.log("🎬 Interview started:", startedAt);
      setRoomState("active");
    });

    socket.on("interview-ended", ({ endedAt, duration }) => {
      console.log("🏁 Interview ended. Duration:", duration, "seconds");
      setRoomState("ended");
    });

    // Error handling
    socket.on("error", ({ message }) => {
      console.error("Socket error:", message);
      setConnectionError(message);
    });

    // Cleanup
    return () => {
      if (interviewId) {
        socket.emit("leave-interview", interviewId);
      }
      socket.disconnect();
    };
  }, [interviewId, user?.role]);

  // Send chat message
  const sendMessage = useCallback(
    (message, type = "text") => {
      if (!socketRef.current || !interviewId) return;
      socketRef.current.emit("send-message", { interviewId, message, type });
    },
    [interviewId],
  );

  // Typing indicators
  const startTyping = useCallback(() => {
    if (!socketRef.current || !interviewId) return;
    socketRef.current.emit("typing-start", { interviewId });
  }, [interviewId]);

  const stopTyping = useCallback(() => {
    if (!socketRef.current || !interviewId) return;
    socketRef.current.emit("typing-stop", { interviewId });
  }, [interviewId]);

  // Media state updates
  const updateMediaState = useCallback(
    (state) => {
      if (!socketRef.current || !interviewId) return;
      socketRef.current.emit("media-state-change", { interviewId, ...state });
    },
    [interviewId],
  );

  // End interview (recruiter only)
  const endInterview = useCallback(() => {
    if (!socketRef.current || !interviewId) return;
    socketRef.current.emit("end-interview", { interviewId });
  }, [interviewId]);

  // Report fraud alert
  const reportFraudAlert = useCallback(
    (type, details) => {
      if (!socketRef.current || !interviewId) return;
      socketRef.current.emit("fraud-alert", { interviewId, type, details });
    },
    [interviewId],
  );

  // Get socket instance for WebRTC signaling
  const getSocket = useCallback(() => socketRef.current, []);

  return {
    socket: socketRef.current,
    getSocket,
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
  };
};

export default useSocket;
