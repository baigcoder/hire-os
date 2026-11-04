/**
 * Realtime Context - Supabase Realtime for Messages & Presence
 * Vercel-compatible alternative to Socket.io
 *
 * Features:
 * - Online/offline presence tracking
 * - Real-time direct messaging
 * - Typing indicators
 * - Calls: rung by the API, WebRTC on a private "call:<id>" topic (CallCenter)
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import api from "../utils/api";
import { useUserTopic } from "../hooks/useUserTopic";

const RealtimeContext = createContext(null);

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    console.warn("useRealtime must be used within a RealtimeProvider");
    return {
      isConnected: false,
      isUserOnline: () => false,
      onlineUsers: new Set(),
      sendMessage: () => false,
      startTyping: () => { },
      stopTyping: () => { },
      getTypingUsers: () => [],
      initiateCall: () => null,
      incomingCall: null,
    };
  }
  return context;
};

export const RealtimeProvider = ({ children }) => {
  const { user } = useSelector((store) => store.auth);
  const channelRef = useRef(null);
  const presenceChannelRef = useRef(null);

  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Map()); // userId -> presence data
  const [typingUsers, setTypingUsers] = useState(new Map()); // chatId -> [userIds typing]
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null); // { config, role, peerName }
  const [callUpdate, setCallUpdate] = useState(null);
  const [newMessage, setNewMessage] = useState(null);

  // Clear typing indicator after timeout
  const typingTimeouts = useRef(new Map());

  // Initialize presence channel
  useEffect(() => {
    if (!user?._id) return;

    const userId = user?._id;

    // Create presence channel for online status
    const presenceChannel = supabase.channel("presence:online", {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        const users = new Map();
        Object.entries(state).forEach(([key, presences]) => {
          if (presences.length > 0) {
            users.set(key, presences[0]);
          }
        });
        setOnlineUsers(users);
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        setOnlineUsers((prev) => {
          const next = new Map(prev);
          if (newPresences.length > 0) {
            next.set(key, newPresences[0]);
          }
          return next;
        });
      })
      .on("presence", { event: "leave" }, ({ key }) => {
        setOnlineUsers((prev) => {
          const next = new Map(prev);
          next.delete(key);
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({
            online_at: new Date().toISOString(),
            user_name: user?.fullname || 'Unknown',
            user_role: user?.role || 'unknown',
          });
          setIsConnected(true);
        }
      });

    presenceChannelRef.current = presenceChannel;

    return () => {
      presenceChannel.unsubscribe();
      presenceChannelRef.current = null;
    };
  }, [user?._id, user?.fullname, user?.role]);

  // Server pushes on the private "user:<id>" topic: messages, calls, alerts.
  // Senders can't fake these; the API checked who may contact whom.
  useUserTopic(user?._id, {
    "new-message": (payload) => setNewMessage(payload),
    "incoming-call": (payload) => setIncomingCall(payload),
    "call-update": (payload) => setCallUpdate(payload),
    "integrity-alert": (payload) =>
      toast.warning(payload.title, {
        description: payload.message,
        action: { label: "Open", onClick: () => window.location.assign(payload.actionUrl) },
      }),
  });

  // Typing indicators: a public topic, sent by the other browser
  useEffect(() => {
    if (!user?._id) return;

    const userId = user?._id;
    const userChannel = supabase.channel(`user:${userId}:typing`);

    userChannel
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const { chatId, senderId, senderName, isTyping } = payload;

        if (isTyping) {
          setTypingUsers((prev) => {
            const next = new Map(prev);
            const typingInChat = next.get(chatId) || [];
            if (!typingInChat.find((t) => t.userId === senderId)) {
              next.set(chatId, [
                ...typingInChat,
                { userId: senderId, name: senderName },
              ]);
            }
            return next;
          });

          // Clear after 3 seconds
          const timeoutKey = `${chatId}:${senderId}`;
          if (typingTimeouts.current.has(timeoutKey)) {
            clearTimeout(typingTimeouts.current.get(timeoutKey));
          }
          typingTimeouts.current.set(
            timeoutKey,
            setTimeout(() => {
              setTypingUsers((prev) => {
                const next = new Map(prev);
                const typingInChat = next.get(chatId) || [];
                next.set(
                  chatId,
                  typingInChat.filter((t) => t.userId !== senderId),
                );
                return next;
              });
            }, 3000),
          );
        } else {
          setTypingUsers((prev) => {
            const next = new Map(prev);
            const typingInChat = next.get(chatId) || [];
            next.set(
              chatId,
              typingInChat.filter((t) => t.userId !== senderId),
            );
            return next;
          });
        }
      })
      .subscribe();

    channelRef.current = userChannel;

    return () => {
      userChannel.unsubscribe();
      channelRef.current = null;
    };
  }, [user?._id]);

  // Sending is the API's POST /message/send, which also pushes it live
  const sendRealtimeMessage = useCallback(async () => true, []);

  // Typing indicators
  const startTyping = useCallback(
    (recipientId, chatId) => {
      if (!user?._id) return;

      const recipientChannel = supabase.channel(`user:${recipientId}:typing`);
      recipientChannel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          recipientChannel.send({
            type: "broadcast",
            event: "typing",
            payload: {
              chatId,
              senderId: user?._id,
              senderName: user?.fullname || 'Unknown',
              isTyping: true,
            },
          });
          setTimeout(() => supabase.removeChannel(recipientChannel), 1000);
        }
      });
    },
    [user],
  );

  const stopTyping = useCallback(
    (recipientId, chatId) => {
      if (!user?._id) return;

      const recipientChannel = supabase.channel(`user:${recipientId}:typing`);
      recipientChannel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          recipientChannel.send({
            type: "broadcast",
            event: "typing",
            payload: {
              chatId,
              senderId: user?._id,
              senderName: user?.fullname || 'Unknown',
              isTyping: false,
            },
          });
          setTimeout(() => supabase.removeChannel(recipientChannel), 1000);
        }
      });
    },
    [user],
  );

  // Calls go through the API (routes/call.route.js): it checks who may call
  // whom, rings the callee and hands both sides TURN + a private call topic.
  const initiateCall = useCallback(async (recipientId, callType = "video", peerName = "") => {
    try {
      const { data } = await api.post("/calls", { calleeId: recipientId, type: callType });
      setActiveCall({ config: data, role: "caller", peerName });
      return data.call._id;
    } catch (error) {
      toast.error(error.response?.data?.message || "Couldn't start the call");
      return null;
    }
  }, []);

  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;
    const call = incomingCall;
    setIncomingCall(null);
    try {
      const { data } = await api.post(`/calls/${call.callId}/accept`);
      setActiveCall({ config: data, role: "callee", peerName: call.caller?.fullname });
    } catch (error) {
      toast.error(error.response?.data?.message || "This call has ended");
    }
  }, [incomingCall]);

  const rejectCall = useCallback(() => {
    if (!incomingCall) return;
    api.post(`/calls/${incomingCall.callId}/decline`).catch(() => {});
    setIncomingCall(null);
  }, [incomingCall]);

  const activeCallRef = useRef(null);
  activeCallRef.current = activeCall;
  const endCall = useCallback(() => {
    const current = activeCallRef.current;
    if (current) api.post(`/calls/${current.config.call._id}/end`).catch(() => {});
    setActiveCall(null);
  }, []);

  // The other side declined, missed or hung up
  useEffect(() => {
    if (!callUpdate) return;
    if (incomingCall?.callId === callUpdate.callId && callUpdate.status !== "accepted") setIncomingCall(null);
    if (activeCall?.config.call._id === callUpdate.callId && ["declined", "missed", "ended"].includes(callUpdate.status)) {
      if (callUpdate.status === "declined") toast("Call declined");
      setActiveCall(null);
    }
  }, [callUpdate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check if user is online
  const isUserOnline = useCallback(
    (userId) => {
      return onlineUsers.has(userId);
    },
    [onlineUsers],
  );

  // Get user presence data
  const getUserPresence = useCallback(
    (userId) => {
      return onlineUsers.get(userId) || null;
    },
    [onlineUsers],
  );

  // Get typing users for a chat
  const getTypingUsers = useCallback(
    (chatId) => {
      return typingUsers.get(chatId) || [];
    },
    [typingUsers],
  );

  const value = {
    isConnected,
    onlineUsers,
    isUserOnline,
    getUserPresence,
    sendRealtimeMessage,
    startTyping,
    stopTyping,
    getTypingUsers,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    incomingCall,
    activeCall,
    newMessage,
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
};

export default RealtimeContext;
