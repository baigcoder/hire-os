/**
 * useSupabaseRealtime Hook - Supabase Realtime for Interview Rooms
 * Replaces Socket.io with Supabase Broadcast/Presence
 * Handles: chat, presence, typing, WebRTC signaling
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { useSelector } from "react-redux";
import { supabase } from "../lib/supabase";

export const useSupabaseRealtime = (interviewId, options = {}) => {
  const { user } = useSelector((state) => state.auth);
  const channelRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [roomState, setRoomState] = useState("waiting");
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);

  // Initialize Supabase channel
  useEffect(() => {
    if (!interviewId) return;

    const userRole =
      user?.role === "recruiter" || user?.role === "company_admin"
        ? "recruiter"
        : "candidate";

    const userId = user?._id || `anon_${Date.now()}`;
    const userName = user?.fullname || "Anonymous";

    // Create channel for this interview room
    const channel = supabase.channel(`interview:${interviewId}`, {
      config: {
        broadcast: { self: true },
        presence: { key: userId },
      },
    });

    channelRef.current = channel;

    // ========== PRESENCE (Participants) ==========
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const participantList = Object.entries(state).map(([key, presences]) => {
        const presence = presences[0]; // Get first presence for this key
        return {
          id: key,
          socketId: key, // For compatibility
          fullname: presence.fullname,
          role: presence.role,
          isAudioOn: presence.isAudioOn ?? true,
          isVideoOn: presence.isVideoOn ?? true,
          isScreenSharing: presence.isScreenSharing ?? false,
          joinedAt: presence.joinedAt,
        };
      });
      setParticipants(participantList);
      console.log("👥 Participants:", participantList.length);
    });

    channel.on("presence", { event: "join" }, ({ key, newPresences }) => {
      const presence = newPresences[0];
      console.log(`👤 ${presence.fullname} joined`);

      // Check if interview should start (both parties present)
      setTimeout(() => {
        const state = channel.presenceState();
        const roles = Object.values(state)
          .flat()
          .map((p) => p.role);
        if (roles.includes("recruiter") && roles.includes("candidate")) {
          setRoomState("active");
        }
      }, 500);
    });

    channel.on("presence", { event: "leave" }, ({ key, leftPresences }) => {
      const presence = leftPresences[0];
      console.log(`👋 ${presence?.fullname || key} left`);
    });

    // ========== BROADCAST (Messages & Signaling) ==========

    // Chat messages
    channel.on("broadcast", { event: "chat-message" }, ({ payload }) => {
      setMessages((prev) => [...prev, payload]);
    });

    // Typing indicators
    channel.on("broadcast", { event: "typing-start" }, ({ payload }) => {
      if (payload.userId !== userId) {
        setTypingUsers((prev) => {
          if (prev.some((u) => u.id === payload.userId)) return prev;
          return [...prev, { id: payload.userId, name: payload.name }];
        });
      }
    });

    channel.on("broadcast", { event: "typing-stop" }, ({ payload }) => {
      setTypingUsers((prev) => prev.filter((u) => u.id !== payload.userId));
    });

    // Interview state changes
    channel.on("broadcast", { event: "interview-started" }, ({ payload }) => {
      console.log("🎬 Interview started");
      setRoomState("active");
    });

    channel.on("broadcast", { event: "interview-ended" }, ({ payload }) => {
      console.log("🏁 Interview ended");
      setRoomState("ended");
    });

    // WebRTC signaling
    channel.on("broadcast", { event: "webrtc-offer" }, ({ payload }) => {
      if (options.onOffer && payload.targetId === userId) {
        options.onOffer(payload);
      }
    });

    channel.on("broadcast", { event: "webrtc-answer" }, ({ payload }) => {
      if (options.onAnswer && payload.targetId === userId) {
        options.onAnswer(payload);
      }
    });

    channel.on(
      "broadcast",
      { event: "webrtc-ice-candidate" },
      ({ payload }) => {
        if (options.onIceCandidate && payload.targetId === userId) {
          options.onIceCandidate(payload);
        }
      },
    );

    // Media state changes
    channel.on("broadcast", { event: "media-state-change" }, ({ payload }) => {
      setParticipants((prev) =>
        prev.map((p) =>
          p.id === payload.userId ? { ...p, ...payload.state } : p,
        ),
      );
    });

    // Fraud alerts (recruiter only)
    channel.on("broadcast", { event: "fraud-alert" }, ({ payload }) => {
      if (options.onFraudAlert && userRole === "recruiter") {
        options.onFraudAlert(payload);
      }
    });

    // Subscribe to channel
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        setIsConnected(true);
        setConnectionError(null);
        console.log("✅ Supabase Realtime connected:", interviewId);

        // Track presence
        await channel.track({
          fullname: userName,
          role: userRole,
          isAudioOn: true,
          isVideoOn: true,
          isScreenSharing: false,
          joinedAt: new Date().toISOString(),
        });
      } else if (status === "CHANNEL_ERROR") {
        setConnectionError("Failed to connect to realtime channel");
        setIsConnected(false);
      }
    });

    // Cleanup
    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [interviewId, user?._id, user?.fullname, user?.role]);

  // ========== ACTIONS ==========

  const sendMessage = useCallback(
    (message, type = "text") => {
      if (!channelRef.current || !message?.trim()) return;

      const chatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        senderId: user?._id || "anonymous",
        senderName: user?.fullname || "Anonymous",
        senderRole: user?.role || "guest",
        message: message.trim(),
        type,
        timestamp: new Date().toISOString(),
      };

      channelRef.current.send({
        type: "broadcast",
        event: "chat-message",
        payload: chatMessage,
      });
    },
    [user],
  );

  const startTyping = useCallback(() => {
    if (!channelRef.current) return;
    channelRef.current.send({
      type: "broadcast",
      event: "typing-start",
      payload: { userId: user?._id, name: user?.fullname },
    });
  }, [user]);

  const stopTyping = useCallback(() => {
    if (!channelRef.current) return;
    channelRef.current.send({
      type: "broadcast",
      event: "typing-stop",
      payload: { userId: user?._id },
    });
  }, [user]);

  const updateMediaState = useCallback(
    (state) => {
      if (!channelRef.current) return;

      // Update local presence
      channelRef.current.track({
        fullname: user?.fullname,
        role: user?.role,
        ...state,
        joinedAt: new Date().toISOString(),
      });

      // Broadcast to others
      channelRef.current.send({
        type: "broadcast",
        event: "media-state-change",
        payload: { userId: user?._id, state },
      });
    },
    [user],
  );

  const endInterview = useCallback(() => {
    if (!channelRef.current) return;
    channelRef.current.send({
      type: "broadcast",
      event: "interview-ended",
      payload: { endedAt: new Date().toISOString() },
    });
    setRoomState("ended");
  }, []);

  const reportFraudAlert = useCallback((type, details) => {
    if (!channelRef.current) return;
    channelRef.current.send({
      type: "broadcast",
      event: "fraud-alert",
      payload: { type, details, timestamp: new Date().toISOString() },
    });
  }, []);

  // WebRTC signaling methods
  const sendOffer = useCallback(
    (offer, targetId) => {
      if (!channelRef.current) return;
      channelRef.current.send({
        type: "broadcast",
        event: "webrtc-offer",
        payload: { offer, senderId: user?._id, targetId },
      });
    },
    [user],
  );

  const sendAnswer = useCallback(
    (answer, targetId) => {
      if (!channelRef.current) return;
      channelRef.current.send({
        type: "broadcast",
        event: "webrtc-answer",
        payload: { answer, senderId: user?._id, targetId },
      });
    },
    [user],
  );

  const sendIceCandidate = useCallback(
    (candidate, targetId) => {
      if (!channelRef.current) return;
      channelRef.current.send({
        type: "broadcast",
        event: "webrtc-ice-candidate",
        payload: { candidate, senderId: user?._id, targetId },
      });
    },
    [user],
  );

  return {
    channel: channelRef.current,
    isConnected,
    connectionError,
    roomState,
    participants,
    messages,
    typingUsers,
    // Chat
    sendMessage,
    startTyping,
    stopTyping,
    // Media
    updateMediaState,
    // Interview control
    endInterview,
    reportFraudAlert,
    // WebRTC signaling
    sendOffer,
    sendAnswer,
    sendIceCandidate,
  };
};

export default useSupabaseRealtime;
