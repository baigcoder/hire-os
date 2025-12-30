/**
 * Supabase Realtime Broadcast Utility for Backend
 * Used to send real-time notifications to frontend dashboards
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

let supabase = null;

// Initialize Supabase client
const getSupabase = () => {
    if (!supabase && supabaseUrl && supabaseKey) {
        supabase = createClient(supabaseUrl, supabaseKey);
    }
    return supabase;
};

/**
 * Broadcast a message to a Supabase Realtime channel
 * @param {string} channelName - The channel name to broadcast to
 * @param {string} event - The event name
 * @param {object} payload - The data to broadcast
 */
export const broadcastToChannel = async (channelName, event, payload) => {
    const client = getSupabase();
    if (!client) {
        console.log("⚠️ Supabase client not available for broadcasting");
        return false;
    }

    try {
        const channel = client.channel(channelName);

        await channel.subscribe((status) => {
            if (status === "SUBSCRIBED") {
                channel.send({
                    type: "broadcast",
                    event,
                    payload: { ...payload, timestamp: new Date().toISOString() },
                });
                console.log(`📡 Broadcasted ${event} to ${channelName}`);
            }
        });

        // Cleanup after sending
        setTimeout(() => {
            client.removeChannel(channel);
        }, 1000);

        return true;
    } catch (error) {
        console.error("Supabase broadcast error:", error.message);
        return false;
    }
};

/**
 * Broadcast new application notification to recruiter dashboard
 * @param {string} companyId - The company ID (for channel targeting)
 * @param {object} applicationData - Application details
 */
export const broadcastNewApplication = async (companyId, applicationData) => {
    const channelName = `recruiter-dashboard-${companyId}`;
    return broadcastToChannel(channelName, "new_application", applicationData);
};

/**
 * Broadcast application status update
 * @param {string} companyId - The company ID
 * @param {object} statusData - Status update details
 */
export const broadcastStatusUpdate = async (companyId, statusData) => {
    const channelName = `recruiter-dashboard-${companyId}`;
    return broadcastToChannel(channelName, "status_update", statusData);
};

/**
 * Broadcast interview scheduled notification
 * @param {string} userId - The applicant's user ID
 * @param {object} interviewData - Interview details
 */
export const broadcastInterviewScheduled = async (userId, interviewData) => {
    const channelName = `student-dashboard-${userId}`;
    return broadcastToChannel(channelName, "interview_scheduled", interviewData);
};

export default {
    broadcastToChannel,
    broadcastNewApplication,
    broadcastStatusUpdate,
    broadcastInterviewScheduled,
};
