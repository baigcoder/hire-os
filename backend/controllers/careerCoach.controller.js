import { CareerCoachSession } from "../models/careerCoachSession.model.js";
import { User } from "../models/user.model.js";
import { callAI } from "../utils/aiServiceV3.js";

// Start or continue session
export const startSession = async (req, res) => {
    try {
        const userId = req.id;
        const { topic, sessionId } = req.body;

        let session;

        if (sessionId) {
            session = await CareerCoachSession.findOne({ _id: sessionId, user: userId, status: "active" });
        }

        if (!session) {
            const user = await User.findById(userId).select("fullname profile");
            session = await CareerCoachSession.create({
                user: userId,
                topic: topic || "general",
                context: {
                    userProfile: user?.profile || {},
                },
                messages: [{
                    role: "system",
                    content: `You are a professional AI career coach helping ${user?.fullname || 'a job seeker'}. 
          Provide actionable advice on career development, job searching, interview preparation, salary negotiation, and skills development.
          Be encouraging, specific, and practical. Ask clarifying questions when needed.`,
                }],
            });
        }

        return res.status(200).json({
            success: true,
            session: {
                _id: session._id,
                topic: session.topic,
                messages: session.messages.filter(m => m.role !== "system"),
                recommendations: session.recommendations,
            },
        });
    } catch (error) {
        console.error("Start session error:", error);
        return res.status(500).json({ success: false, message: "Failed to start session" });
    }
};

// Send message
export const sendMessage = async (req, res) => {
    try {
        const userId = req.id;
        const { sessionId, message } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({ success: false, message: "Message required" });
        }

        const session = await CareerCoachSession.findOne({ _id: sessionId, user: userId, status: "active" });
        if (!session) {
            return res.status(404).json({ success: false, message: "Session not found" });
        }

        // Add user message
        session.messages.push({ role: "user", content: message.trim() });

        // Prepare messages for AI (trim to last 20 messages to stay within token limits)
        const recentMessages = session.messages.slice(-20);
        const aiMessages = recentMessages.map(m => ({ role: m.role, content: m.content }));

        // Call AI with retry logic
        let aiResponse;
        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries) {
            try {
                aiResponse = await callAI(aiMessages, {
                    temperature: 0.7,
                    maxTokens: 1000,
                });
                break; // Success, exit retry loop
            } catch (aiError) {
                retryCount++;
                console.error(`AI call attempt ${retryCount} failed:`, aiError.message);
                if (retryCount >= maxRetries) {
                    // Return a fallback message instead of failing completely
                    aiResponse = {
                        content: "I'm having trouble processing your request right now. Please try again in a moment, or rephrase your question."
                    };
                } else {
                    // Exponential backoff: 500ms, 1000ms, 2000ms
                    await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retryCount - 1)));
                }
            }
        }

        const assistantMessage = aiResponse.content || aiResponse;

        // Add assistant response
        session.messages.push({ role: "assistant", content: assistantMessage });

        // Auto-generate title from first exchange
        if (!session.title && session.messages.length <= 4) {
            session.title = message.slice(0, 50) + (message.length > 50 ? "..." : "");
        }

        await session.save();

        return res.status(200).json({
            success: true,
            message: assistantMessage,
            messageCount: session.messages.length,
            retriesUsed: retryCount,
        });
    } catch (error) {
        console.error("Send message error:", error);
        return res.status(500).json({ success: false, message: "Failed to process message" });
    }
};

// Get user sessions
export const getSessions = async (req, res) => {
    try {
        const userId = req.id;
        const { status = "active", page = 1, limit = 10 } = req.query;

        const sessions = await CareerCoachSession.find({ user: userId, status })
            .select("title topic messageCount createdAt updatedAt")
            .sort({ updatedAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await CareerCoachSession.countDocuments({ user: userId, status });

        return res.status(200).json({
            success: true,
            sessions,
            pagination: { page: parseInt(page), limit: parseInt(limit), total },
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch sessions" });
    }
};

// Get session details
export const getSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const userId = req.id;

        const session = await CareerCoachSession.findOne({ _id: sessionId, user: userId });
        if (!session) {
            return res.status(404).json({ success: false, message: "Session not found" });
        }

        return res.status(200).json({
            success: true,
            session: {
                ...session.toObject(),
                messages: session.messages.filter(m => m.role !== "system"),
            },
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch session" });
    }
};

// Add career goal
export const addGoal = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { goal, timeline } = req.body;
        const userId = req.id;

        const session = await CareerCoachSession.findOne({ _id: sessionId, user: userId });
        if (!session) return res.status(404).json({ success: false, message: "Session not found" });

        session.careerGoals.push({ goal, timeline, status: "active" });
        await session.save();

        return res.status(200).json({ success: true, goals: session.careerGoals });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to add goal" });
    }
};

// Update goal progress
export const updateGoal = async (req, res) => {
    try {
        const { sessionId, goalId } = req.params;
        const { progress, status } = req.body;
        const userId = req.id;

        const session = await CareerCoachSession.findOne({ _id: sessionId, user: userId });
        if (!session) return res.status(404).json({ success: false, message: "Session not found" });

        const goal = session.careerGoals.id(goalId);
        if (!goal) return res.status(404).json({ success: false, message: "Goal not found" });

        if (progress !== undefined) goal.progress = progress;
        if (status) goal.status = status;
        await session.save();

        return res.status(200).json({ success: true, goal });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to update goal" });
    }
};

// End session with feedback
export const endSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { rating, feedback } = req.body;
        const userId = req.id;

        const session = await CareerCoachSession.findOne({ _id: sessionId, user: userId });
        if (!session) return res.status(404).json({ success: false, message: "Session not found" });

        session.status = "completed";
        if (rating) session.rating = rating;
        if (feedback) session.feedback = feedback;
        await session.save();

        return res.status(200).json({ success: true, message: "Session completed" });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to end session" });
    }
};
