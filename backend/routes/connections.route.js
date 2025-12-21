/**
 * Connections Routes
 * Professional networking between users
 */

import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { Connection } from "../models/connection.model.js";
import { User } from "../models/user.model.js";
import { callAI, parseAIJson } from "../utils/aiServiceV3.js";

const router = express.Router();

/**
 * Send connection request
 * POST /api/v1/connections/request/:userId
 */
router.post("/request/:userId", isAuthenticated, async (req, res) => {
  try {
    const requesterId = req.id;
    const recipientId = req.params.userId;
    const { message, connectionType } = req.body;

    // Can't connect with yourself
    if (requesterId === recipientId) {
      return res.status(400).json({
        success: false,
        message: "Cannot send connection request to yourself",
      });
    }

    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if connection already exists
    const existingConnection = await Connection.connectionExists(
      requesterId,
      recipientId,
    );
    if (existingConnection) {
      return res.status(400).json({
        success: false,
        message:
          existingConnection.status === "pending"
            ? "Connection request already pending"
            : "Already connected with this user",
        status: existingConnection.status,
      });
    }

    // Create connection request
    const connection = await Connection.create({
      requester: requesterId,
      recipient: recipientId,
      message,
      connectionType: connectionType || "other",
      status: "pending",
    });

    res.status(201).json({
      success: true,
      message: "Connection request sent",
      connection,
    });
  } catch (error) {
    console.error("Connection request error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send connection request",
    });
  }
});

/**
 * Accept connection request
 * PUT /api/v1/connections/accept/:connectionId
 */
router.put("/accept/:connectionId", isAuthenticated, async (req, res) => {
  try {
    const userId = req.id;
    const { connectionId } = req.params;

    const connection = await Connection.findOne({
      _id: connectionId,
      recipient: userId,
      status: "pending",
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Connection request not found",
      });
    }

    connection.status = "accepted";
    connection.connectedAt = new Date();
    await connection.save();

    res.status(200).json({
      success: true,
      message: "Connection accepted",
      connection,
    });
  } catch (error) {
    console.error("Accept connection error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to accept connection",
    });
  }
});

/**
 * Reject/Remove connection
 * DELETE /api/v1/connections/:connectionId
 */
router.delete("/:connectionId", isAuthenticated, async (req, res) => {
  try {
    const userId = req.id;
    const { connectionId } = req.params;

    const connection = await Connection.findOne({
      _id: connectionId,
      $or: [{ requester: userId }, { recipient: userId }],
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Connection not found",
      });
    }

    await connection.deleteOne();

    res.status(200).json({
      success: true,
      message: "Connection removed",
    });
  } catch (error) {
    console.error("Remove connection error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove connection",
    });
  }
});

/**
 * Get all connections
 * GET /api/v1/connections
 */
router.get("/", isAuthenticated, async (req, res) => {
  try {
    const userId = req.id;
    const { status = "accepted" } = req.query;

    const connections = await Connection.find({
      $or: [
        { requester: userId, status },
        { recipient: userId, status },
      ],
    })
      .populate(
        "requester",
        "fullname email profile.profilePhoto profile.bio profile.skills role",
      )
      .populate(
        "recipient",
        "fullname email profile.profilePhoto profile.bio profile.skills role",
      )
      .sort({ connectedAt: -1, createdAt: -1 });

    // Map to get the other user in each connection
    const formattedConnections = connections.map((conn) => {
      const otherUser =
        conn.requester._id.toString() === userId
          ? conn.recipient
          : conn.requester;
      return {
        connectionId: conn._id,
        user: otherUser,
        status: conn.status,
        connectionType: conn.connectionType,
        connectedAt: conn.connectedAt || conn.createdAt,
        message: conn.message,
      };
    });

    res.status(200).json({
      success: true,
      count: formattedConnections.length,
      connections: formattedConnections,
    });
  } catch (error) {
    console.error("Get connections error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get connections",
    });
  }
});

/**
 * Get pending connection requests
 * GET /api/v1/connections/pending
 */
router.get("/pending", isAuthenticated, async (req, res) => {
  try {
    const userId = req.id;

    const pending = await Connection.find({
      recipient: userId,
      status: "pending",
    })
      .populate(
        "requester",
        "fullname email profile.profilePhoto profile.bio profile.skills",
      )
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: pending.length,
      requests: pending,
    });
  } catch (error) {
    console.error("Get pending requests error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get pending requests",
    });
  }
});

/**
 * Get AI-powered connection suggestions
 * GET /api/v1/connections/suggestions
 */
router.get("/suggestions", isAuthenticated, async (req, res) => {
  try {
    const userId = req.id;
    const currentUser = await User.findById(userId).select(
      "profile.skills role",
    );

    // Get existing connection IDs to exclude
    const existingConnections = await Connection.find({
      $or: [{ requester: userId }, { recipient: userId }],
    }).select("requester recipient");

    const connectedUserIds = existingConnections.flatMap((c) => [
      c.requester.toString(),
      c.recipient.toString(),
    ]);
    connectedUserIds.push(userId);

    // Find users with similar skills or in similar roles
    const suggestions = await User.find({
      _id: { $nin: connectedUserIds },
      isActive: true,
      $or: [
        { "profile.skills": { $in: currentUser.profile?.skills || [] } },
        { role: "recruiter" },
      ],
    })
      .select(
        "fullname email profile.profilePhoto profile.bio profile.skills role",
      )
      .limit(10)
      .lean();

    // Calculate match score based on shared skills
    const userSkills = new Set(
      (currentUser.profile?.skills || []).map((s) => s.toLowerCase()),
    );
    const scoredSuggestions = suggestions.map((user) => {
      const theirSkills = (user.profile?.skills || []).map((s) =>
        s.toLowerCase(),
      );
      const sharedSkills = theirSkills.filter((s) => userSkills.has(s));
      return {
        ...user,
        matchScore:
          theirSkills.length > 0
            ? Math.round((sharedSkills.length / theirSkills.length) * 100)
            : 0,
        sharedSkills,
        reason:
          user.role === "recruiter"
            ? "Hiring for positions matching your skills"
            : sharedSkills.length > 0
              ? `${sharedSkills.length} shared skills`
              : "Similar professional background",
      };
    });

    // Sort by match score
    scoredSuggestions.sort((a, b) => b.matchScore - a.matchScore);

    res.status(200).json({
      success: true,
      suggestions: scoredSuggestions,
    });
  } catch (error) {
    console.error("Connection suggestions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get suggestions",
    });
  }
});

export default router;
