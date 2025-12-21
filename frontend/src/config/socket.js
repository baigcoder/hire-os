/**
 * Socket.io Client Configuration
 * Connects to standalone Socket.io server (Render in production)
 */

import io from "socket.io-client";

// Determine Socket.io server URL
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "http://localhost:3001";

console.log(`🔌 Connecting to Socket.io server: ${SOCKET_URL}`);

// Create Socket.io connection
export const socket = io(SOCKET_URL, {
  auth: {
    token: localStorage.getItem("token") || "",
  },
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
  transports: ["websocket", "polling"],
  secure: SOCKET_URL.startsWith("https"),
  rejectUnauthorized: false,
});

// Connection event handlers
socket.on("connect", () => {
  console.log("✅ Socket.io connected:", socket.id);
});

socket.on("disconnect", (reason) => {
  console.log("❌ Socket.io disconnected:", reason);
});

socket.on("connect_error", (error) => {
  console.error("❌ Socket.io connection error:", error);
});

socket.on("error", (error) => {
  console.error("❌ Socket.io error:", error);
});

// Reconnection events
socket.on("reconnect", (attemptNumber) => {
  console.log("🔄 Socket.io reconnected after", attemptNumber, "attempts");
});

socket.on("reconnect_attempt", (attemptNumber) => {
  console.log("🔄 Socket.io reconnection attempt", attemptNumber);
});

export default socket;
