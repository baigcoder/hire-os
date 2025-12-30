/**
 * Realtime Context - Supabase Realtime for Messages & Presence
 * Vercel-compatible alternative to Socket.io
 *
 * Features:
 * - Online/offline presence tracking
 * - Real-time direct messaging
 * - Typing indicators
 * - Call signaling (WebRTC via Supabase broadcast)
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { useSelector } from "react-redux";
import { supabase } from "../lib/supabase";

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
  const [outgoingCall, setOutgoingCall] = useState(null);
  const [callSignal, setCallSignal] = useState(null);
  const [newMessage, setNewMessage] = useState(null);

  // Clear typing indicator after timeout
  const typingTimeouts = useRef(new Map());

  // Initialize presence channel
  useEffect(() => {
    if (!user?._id) return;

    const userId = user._id;

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

  // Initialize user-specific message channel
  useEffect(() => {
    if (!user?._id) return;

    const userId = user._id;

    // Channel for receiving messages, calls, typing notifications
    const userChannel = supabase.channel(`user:${userId}`);

    userChannel
      .on("broadcast", { event: "new-message" }, ({ payload }) => {
        setNewMessage(payload);
      })
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
      .on("broadcast", { event: "incoming-call" }, ({ payload }) => {
        console.log("📞 Incoming call:", payload);
        setIncomingCall(payload);
      })
      .on("broadcast", { event: "call-ended" }, () => {
        setIncomingCall(null);
        setCallSignal(null);
      })
      .on("broadcast", { event: "call-signal" }, ({ payload }) => {
        setCallSignal(payload);
      })
      .subscribe();

    channelRef.current = userChannel;

    return () => {
      userChannel.unsubscribe();
      channelRef.current = null;
    };
  }, [user?._id]);

  // Send a message to another user via broadcast
  const sendRealtimeMessage = useCallback(
    async (recipientId, message) => {
      if (!user?._id) return false;

      try {
        const recipientChannel = supabase.channel(`user:${recipientId}`);

        // Wait for subscription to complete
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Subscription timeout')), 5000);

          recipientChannel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              clearTimeout(timeout);
              resolve();
            } else if (status === 'CHANNEL_ERROR') {
              clearTimeout(timeout);
              reject(new Error('Channel error'));
            }
          });
        });

        // Send the message
        await recipientChannel.send({
          type: "broadcast",
          event: "new-message",
          payload: {
            senderId: user?._id,
            senderName: user?.fullname || 'Unknown',
            senderRole: user?.role || 'unknown',
            receiverId: recipientId,
            content: message,
            timestamp: new Date().toISOString(),
          },
        });

        // Cleanup channel after a longer delay to ensure message is delivered
        setTimeout(() => {
          supabase.removeChannel(recipientChannel);
        }, 1000);

        return true;
      } catch (error) {
        console.error('Failed to send realtime message:', error);
        return false;
      }
    },
    [user],
  );

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
              senderId: user._id,
              senderName: user.fullname,
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
              senderId: user._id,
              senderName: user.fullname,
              isTyping: false,
            },
          });
          setTimeout(() => supabase.removeChannel(recipientChannel), 1000);
        }
      });
    },
    [user],
  );

  // Initiate a call with improved reliability
  const initiateCall = useCallback(
    async (recipientId, callType = "video") => {
      if (!user?._id) return null;

      const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      try {
        const recipientChannel = supabase.channel(`user:${recipientId}`);

        // Wait for subscription to complete before sending
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Subscription timeout')), 5000);

          recipientChannel.subscribe((status) => {
            if (status === "SUBSCRIBED") {
              clearTimeout(timeout);
              resolve();
            } else if (status === "CHANNEL_ERROR") {
              clearTimeout(timeout);
              reject(new Error('Channel error'));
            }
          });
        });

        // Send the incoming call event
        await recipientChannel.send({
          type: "broadcast",
          event: "incoming-call",
          payload: {
            callId,
            callerId: user._id,
            callerName: user.fullname,
            callType,
            timestamp: new Date().toISOString(),
          },
        });

        console.log("📞 Call initiated to:", recipientId, "callId:", callId);

        // Cleanup channel after a delay
        setTimeout(() => supabase.removeChannel(recipientChannel), 1000);

        setOutgoingCall({
          callId,
          recipientId,
          callType,
          status: "calling",
        });

        return callId;
      } catch (error) {
        console.error("Failed to initiate call:", error);
        return null;
      }
    },
    [user],
  );

  // Send WebRTC Signal (SDP or ICE candidate)
  const sendCallSignal = useCallback(
    (recipientId, type, payload) => {
      if (!user?._id) return;

      const recipientChannel = supabase.channel(`user:${recipientId}`);
      recipientChannel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          recipientChannel.send({
            type: "broadcast",
            event: "call-signal",
            payload: {
              senderId: user._id,
              type, // 'offer', 'answer', 'ice-candidate'
              data: payload,
            },
          });
          setTimeout(() => recipientChannel.unsubscribe(), 500);
        }
      });
    },
    [user],
  );

  // Accept call
  const acceptCall = useCallback(() => {
    if (!incomingCall) return;
    // WebRTC connection would be established here
    // For now, just clear the incoming call
    setIncomingCall(null);
  }, [incomingCall]);

  // Reject call
  const rejectCall = useCallback(() => {
    if (!incomingCall) return;

    const callerChannel = supabase.channel(`user:${incomingCall.callerId}`);
    callerChannel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        callerChannel.send({
          type: "broadcast",
          event: "call-rejected",
          payload: { callId: incomingCall.callId },
        });
        setTimeout(() => callerChannel.unsubscribe(), 500);
      }
    });

    setIncomingCall(null);
  }, [incomingCall]);

  // End call
  const endCall = useCallback((callId, recipientId) => {
    const recipientChannel = supabase.channel(`user:${recipientId}`);
    recipientChannel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        recipientChannel.send({
          type: "broadcast",
          event: "call-ended",
          payload: { callId },
        });
        setTimeout(() => recipientChannel.unsubscribe(), 500);
      }
    });

    setIncomingCall(null);
    setOutgoingCall(null);
    setCallSignal(null);
  }, []);

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
    outgoingCall,
    callSignal,
    sendCallSignal,
    newMessage,
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
};

export default RealtimeContext;
