/**
 * Standalone Socket.io Server for Render Deployment
 * Handles real-time features: interviews, chat, notifications, WebRTC signaling
 */

import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";

// Load environment variables
dotenv.config();

const PORT = process.env.SOCKET_PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || "development";

// Create HTTP server
const httpServer = createServer();

// Initialize Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      process.env.FRONTEND_URL,
    ].filter(Boolean),
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ["websocket", "polling"],
});

// Room states and user maps
const activeRooms = new Map();
const userSocketMap = new Map();
const socketUserMap = new Map();

// Initialize Redis adapter for horizontal scaling
const initRedisAdapter = async () => {
  if (process.env.REDIS_URL) {
    try {
      const pubClient = createClient({ url: process.env.REDIS_URL });
      const subClient = pubClient.duplicate();

      await Promise.all([pubClient.connect(), subClient.connect()]);
      io.adapter(createAdapter(pubClient, subClient));
      console.log("✅ Socket.io Redis adapter connected");
      return true;
    } catch (err) {
      console.log(
        "⚠️ Redis not available, using in-memory adapter:",
        err.message,
      );
      return false;
    }
  }
  return false;
};

// Authentication middleware
io.use(async (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(" ")[1];

    if (!token) {
      socket.user = { id: `anon_${socket.id}`, role: "guest" };
      return next();
    }

    const decoded = jwt.verify(
      token,
      process.env.SECRET_KEY || "your-secret-key",
    );
    socket.user = {
      id: decoded.userId,
      role: decoded.role,
      fullname: decoded.fullname,
    };
    next();
  } catch (err) {
    console.log("Socket auth error:", err.message);
    socket.user = { id: `anon_${socket.id}`, role: "guest" };
    next();
  }
});

// Connection handler
io.on("connection", (socket) => {
  console.log(
    `🔗 [Socket] Connected: ${socket.id} (User: ${socket.user?.id || "anonymous"})`,
  );

  // ========== INTERVIEW ROOM EVENTS ==========

  // Join interview room
  socket.on("join-interview", async (data) => {
    try {
      const { interviewId, role } = data;
      const roomId = `interview_${interviewId}`;

      socket.join(roomId);
      userSocketMap.set(socket.user.id, socket.id);
      socketUserMap.set(socket.id, {
        userId: socket.user.id,
        role,
        interviewId,
      });

      // Notify others in room
      io.to(roomId).emit("user-joined", {
        userId: socket.user.id,
        fullname: socket.user.fullname,
        role,
        socketId: socket.id,
        timestamp: new Date(),
      });

      console.log(`📍 User ${socket.user.id} joined interview room: ${roomId}`);
    } catch (error) {
      console.error("Error joining interview:", error);
      socket.emit("error", { message: "Failed to join interview" });
    }
  });

  // Leave interview room
  socket.on("leave-interview", (data) => {
    try {
      const { interviewId } = data;
      const roomId = `interview_${interviewId}`;

      socket.leave(roomId);
      userSocketMap.delete(socket.user.id);
      socketUserMap.delete(socket.id);

      io.to(roomId).emit("user-left", {
        userId: socket.user.id,
        timestamp: new Date(),
      });

      console.log(`📍 User ${socket.user.id} left interview room: ${roomId}`);
    } catch (error) {
      console.error("Error leaving interview:", error);
    }
  });

  // ========== CHAT EVENTS ==========

  // Send message
  socket.on("send-message", (data) => {
    try {
      const { roomId, message, type = "text" } = data;

      io.to(roomId).emit("receive-message", {
        userId: socket.user.id,
        fullname: socket.user.fullname,
        message,
        type,
        timestamp: new Date(),
        socketId: socket.id,
      });

      console.log(`💬 Message in ${roomId} from ${socket.user.id}`);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  });

  // ========== WEBRTC SIGNALING ==========

  // WebRTC offer
  socket.on("webrtc-offer", (data) => {
    try {
      const { targetUserId, offer, roomId } = data;
      const targetSocketId = userSocketMap.get(targetUserId);

      if (targetSocketId) {
        io.to(targetSocketId).emit("webrtc-offer", {
          from: socket.user.id,
          offer,
          roomId,
        });
        console.log(
          `🎥 WebRTC offer from ${socket.user.id} to ${targetUserId}`,
        );
      }
    } catch (error) {
      console.error("Error sending WebRTC offer:", error);
    }
  });

  // WebRTC answer
  socket.on("webrtc-answer", (data) => {
    try {
      const { targetUserId, answer, roomId } = data;
      const targetSocketId = userSocketMap.get(targetUserId);

      if (targetSocketId) {
        io.to(targetSocketId).emit("webrtc-answer", {
          from: socket.user.id,
          answer,
          roomId,
        });
        console.log(
          `🎥 WebRTC answer from ${socket.user.id} to ${targetUserId}`,
        );
      }
    } catch (error) {
      console.error("Error sending WebRTC answer:", error);
    }
  });

  // ICE candidate
  socket.on("ice-candidate", (data) => {
    try {
      const { targetUserId, candidate, roomId } = data;
      const targetSocketId = userSocketMap.get(targetUserId);

      if (targetSocketId) {
        io.to(targetSocketId).emit("ice-candidate", {
          from: socket.user.id,
          candidate,
          roomId,
        });
      }
    } catch (error) {
      console.error("Error sending ICE candidate:", error);
    }
  });

  // ========== NOTIFICATIONS ==========

  socket.on("send-notification", (data) => {
    try {
      const { targetUserId, notification } = data;
      const targetSocketId = userSocketMap.get(targetUserId);

      if (targetSocketId) {
        io.to(targetSocketId).emit("receive-notification", {
          from: socket.user.id,
          ...notification,
          timestamp: new Date(),
        });
        console.log(`🔔 Notification sent to ${targetUserId}`);
      }
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  });

  // ========== PRESENCE ==========

  socket.on("user-status", (data) => {
    try {
      const { status, roomId } = data;

      if (roomId) {
        io.to(roomId).emit("user-status-changed", {
          userId: socket.user.id,
          status,
          timestamp: new Date(),
        });
      }
    } catch (error) {
      console.error("Error updating user status:", error);
    }
  });

  // ========== DISCONNECT ==========

  socket.on("disconnect", () => {
    try {
      userSocketMap.delete(socket.user.id);
      socketUserMap.delete(socket.id);

      io.emit("user-disconnected", {
        userId: socket.user.id,
        timestamp: new Date(),
      });

      console.log(
        `❌ [Socket] Disconnected: ${socket.id} (User: ${socket.user?.id || "anonymous"})`,
      );
    } catch (error) {
      console.error("Error handling disconnect:", error);
    }
  });

  // ========== ERROR HANDLING ==========

  socket.on("error", (error) => {
    console.error(`❌ Socket error for ${socket.id}:`, error);
  });
});

// Health check endpoint
httpServer.on("request", (req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        timestamp: new Date().toISOString(),
        environment: NODE_ENV,
        connectedClients: io.engine.clientsCount,
      }),
    );
  }
});

// Start server
const startServer = async () => {
  try {
    // Initialize Redis adapter
    await initRedisAdapter();

    httpServer.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║         🚀 Socket.io Server Started Successfully           ║
╠════════════════════════════════════════════════════════════╣
║ Port: ${PORT}
║ Environment: ${NODE_ENV}
║ WebSocket: ✅ Enabled
║ Polling: ✅ Enabled
║ Health Check: http://localhost:${PORT}/health
╚════════════════════════════════════════════════════════════╝
            `);
    });
  } catch (error) {
    console.error("❌ Failed to start Socket.io server:", error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on("SIGTERM", () => {
  console.log("📋 SIGTERM received, shutting down gracefully...");
  httpServer.close(() => {
    console.log("✅ Socket.io server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("📋 SIGINT received, shutting down gracefully...");
  httpServer.close(() => {
    console.log("✅ Socket.io server closed");
    process.exit(0);
  });
});

// Start the server
startServer();

export { io, httpServer };
