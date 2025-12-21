/**
 * useSupabaseDashboard Hook - Supabase Realtime for Dashboard Updates
 * Replaces Socket.io with Supabase subscriptions
 * Handles: stats updates, application notifications, real-time alerts
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { useSelector } from "react-redux";
import { supabase } from "../lib/supabase";

export const useSupabaseDashboard = (options = {}) => {
  const { user } = useSelector((state) => state.auth);
  const channelRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Initialize Supabase channel for dashboard
  useEffect(() => {
    if (!user?._id) return;

    const userId = user._id;
    const userRole = user.role;

    // Create channel based on role
    const channelName =
      userRole === "company_admin" || userRole === "recruiter"
        ? `ceo-dashboard:${user.company || userId}`
        : `student-dashboard:${userId}`;

    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    channelRef.current = channel;

    // ========== BROADCAST EVENTS ==========

    // Stats updates
    channel.on("broadcast", { event: "stats-update" }, ({ payload }) => {
      console.log("📊 Stats update received:", payload);
      setLastUpdate(new Date());
      if (options.onStatsUpdate) options.onStatsUpdate(payload);
    });

    // Application updates
    channel.on("broadcast", { event: "application-update" }, ({ payload }) => {
      console.log("📊 Application update:", payload);
      setLastUpdate(new Date());
      if (options.onApplicationUpdate) options.onApplicationUpdate(payload);
    });

    // New application (for recruiters/CEOs)
    channel.on("broadcast", { event: "new-application" }, ({ payload }) => {
      console.log("📊 New application:", payload);
      setLastUpdate(new Date());
      if (options.onNewApplication) options.onNewApplication(payload);
    });

    // New approval pending (for CEOs)
    channel.on("broadcast", { event: "new-approval" }, ({ payload }) => {
      console.log("📊 New approval pending:", payload);
      if (options.onNewApproval) options.onNewApproval(payload);
    });

    // Notifications
    channel.on("broadcast", { event: "notification" }, ({ payload }) => {
      console.log("📊 New notification:", payload);
      if (options.onNotification) options.onNotification(payload);
    });

    // Job views (for recruiters)
    channel.on("broadcast", { event: "job-view" }, ({ payload }) => {
      console.log("📊 Job view:", payload);
      if (options.onJobView) options.onJobView(payload);
    });

    // Subscribe to channel
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setIsConnected(true);
        setIsLive(true);
        console.log("📊 Dashboard realtime connected:", channelName);
      } else if (status === "CHANNEL_ERROR") {
        setIsConnected(false);
        setIsLive(false);
      }
    });

    // Cleanup
    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [user?._id, user?.role, user?.company]);

  // Request stats refresh (triggers backend to broadcast new stats)
  const refreshStats = useCallback(async () => {
    // This would typically call your backend API to trigger a stats update
    // The backend would then broadcast to the Supabase channel
    console.log("📊 Stats refresh requested");

    // For now, we can make an API call that returns stats
    // and the backend can broadcast updates
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/v1/stats/refresh`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.ok) {
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error("Stats refresh failed:", error);
    }
  }, []);

  // Get channel instance
  const getChannel = useCallback(() => channelRef.current, []);

  return {
    channel: channelRef.current,
    getChannel,
    isConnected,
    isLive,
    lastUpdate,
    refreshStats,
  };
};

// ========== HELPER FUNCTIONS FOR BROADCASTING ==========

/**
 * Broadcast stats update to a dashboard channel
 * Call this from your backend or client when stats change
 */
export const broadcastStatsUpdate = async (channelName, statsData) => {
  const channel = supabase.channel(channelName);
  await channel.send({
    type: "broadcast",
    event: "stats-update",
    payload: {
      type: "STATS_UPDATE",
      timestamp: new Date().toISOString(),
      data: statsData,
    },
  });
};

/**
 * Broadcast new application notification
 */
export const broadcastNewApplication = async (companyId, applicationData) => {
  const channel = supabase.channel(`ceo-dashboard:${companyId}`);
  await channel.send({
    type: "broadcast",
    event: "new-application",
    payload: {
      type: "NEW_APPLICATION",
      timestamp: new Date().toISOString(),
      data: applicationData,
    },
  });
};

/**
 * Broadcast application status update to student
 */
export const broadcastApplicationUpdate = async (userId, applicationData) => {
  const channel = supabase.channel(`student-dashboard:${userId}`);
  await channel.send({
    type: "broadcast",
    event: "application-update",
    payload: {
      type: "APPLICATION_UPDATE",
      timestamp: new Date().toISOString(),
      data: applicationData,
    },
  });
};

export default useSupabaseDashboard;
