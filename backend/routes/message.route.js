import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import {
  sendMessage,
  getInbox,
  getSentMessages,
  getMessage,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteMessage,
  replyToMessage,
  sendBroadcast,
  getConversation,
  deleteConversation,
} from "../controllers/message.controller.js";

const router = express.Router();

// All routes require authentication
router.use(isAuthenticated);

// Inbox and message management
router.get("/inbox", getInbox);
router.get("/sent", getSentMessages);
router.get("/unread-count", getUnreadCount);
router.put("/mark-all-read", markAllAsRead);

// Single message operations
router.get("/:messageId", getMessage);
router.put("/read/:messageId", markAsRead);
router.delete("/:messageId", deleteMessage);
router.post("/reply/:messageId", replyToMessage);

// Conversation thread
router.get("/conversation/:partnerId", getConversation);
router.delete("/conversation/:partnerId", deleteConversation);

// Send message
router.post("/send", sendMessage);

// Broadcast (admin/CEO only)
router.post("/broadcast", sendBroadcast);

export default router;
