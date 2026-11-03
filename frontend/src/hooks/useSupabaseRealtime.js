/**
 * useSupabaseRealtime Hook - Supabase Realtime for Interview Rooms
 * Replaces Socket.io with Supabase Broadcast/Presence
 * Handles: chat, presence, typing, WebRTC signaling
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { useSelector } from "react-redux";
import { supabase } from "../lib/supabase";
import { createPrivateRealtime } from "../lib/privateRealtime";
import { fetchCallConfig } from "./useCallConfig";
import api from "../utils/api";

export const useSupabaseRealtime = (interviewId, options = {}) => {
  const { user } = useSelector((state) => state.auth);
  const channelRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [roomState, setRoomState] = useState("waiting");
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);

  // options.callConfig: undefined while loading (wait), null when the
  // caller isn't a participant (don't join), else the API's call config
  const callConfig = options.callConfig;
  const usePrivate = Boolean(callConfig?.realtime?.privateChannels);
  const configReady = callConfig !== undefined;

  // Initialize Supabase channel
  useEffect(() => {
    if (!interviewId || !configReady || callConfig === null) return;

    const userRole =
      user?.role === "recruiter" || user?.role === "company_admin"
        ? "recruiter"
        : "candidate";

    const userId = user?._id || `anon_${Date.now()}`;
    const userName = user?.fullname || "Anonymous";

    // Private channel (RLS: only this interview's participants) when the
    // API minted a token; the legacy public channel otherwise
    const privateRt = usePrivate
      ? createPrivateRealtime({
          initial: callConfig.realtime,
          fetchToken: () => fetchCallConfig(interviewId).then((c) => c.realtime),
        })
      : null;
    const rtClient = privateRt?.client ?? supabase;
    const channel = rtClient.channel(`interview:${interviewId}`, {
      config: {
        ...(usePrivate && { private: true }),
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

      // (The recruiter's dashboard is notified by the API, on their
      // private topic, when the candidate calls /video/join below.)

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

      // Integrity signals no longer travel on this (unauthenticated) channel:
    // they go to /api/v1/integrity, signed, and only recruiters read them.

    // Subscribe to channel
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        setIsConnected(true);
        setConnectionError(null);
        console.log("✅ Supabase Realtime connected:", interviewId);

        // The API tells the recruiter (privately) that we're here
        if (userRole === "candidate") {
          api.post(`/interview/${interviewId}/video/join`).catch(() => {});
        }

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
      if (privateRt) privateRt.stop();
      else supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- callConfig is read once per connection
  }, [interviewId, user?._id, user?.fullname, user?.role, configReady, callConfig === null, usePrivate]);

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
    // WebRTC signaling
    sendOffer,
    sendAnswer,
    sendIceCandidate,
  };
};

export default useSupabaseRealtime;
