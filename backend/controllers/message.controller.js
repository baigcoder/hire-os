import { Message } from "../models/message.model.js";
import { User } from "../models/user.model.js";
import { Notification } from "../models/notification.model.js";
import { sendEmail } from "../utils/emailService.js";
import logger from "../utils/logger.js";

/**
 * Send a message to a user
 * If sender is recruiter and receiver is company_admin (CEO), send email notification
 */
export const sendMessage = async (req, res) => {
  try {
    const senderId = req.id;
    const {
      receiverId,
      subject,
      content,
      type = "general",
      priority = "normal",
      relatedTo = {},
    } = req.body;

    // Validate required fields
    if (!receiverId || !subject || !content) {
      return res.status(400).json({
        message: "Receiver, subject, and content are required",
        success: false,
      });
    }

    // Get sender info
    const sender = await User.findById(senderId).select(
      "fullname role companyId",
    );
    if (!sender) {
      return res.status(404).json({
        message: "Sender not found",
        success: false,
      });
    }

    // Get receiver info
    const receiver = await User.findById(receiverId).select(
      "fullname role email",
    );
    if (!receiver) {
      return res.status(404).json({
        message: "Receiver not found",
        success: false,
      });
    }

    // Create message
    const message = await Message.create({
      senderId,
      senderRole: sender.role,
      receiverId,
      receiverRole: receiver.role,
      subject,
      content,
      type,
      priority,
      relatedTo,
    });

    // Create notification for receiver
    await Notification.create({
      userId: receiverId,
      type: "message",
      title: `New message from ${sender.fullname}`,
      message: subject.substring(0, 100),
      relatedEntities: {
        messageId: message._id,
      },
      priority: receiver.role === "company_admin" ? "high" : "normal",
    });

    // Send email notification if recruiter messages CEO/Admin
    if (
      sender.role === "recruiter" &&
      receiver.role === "company_admin" &&
      receiver.email
    ) {
      try {
        await sendEmail({
          to: receiver.email,
          subject: `📨 New Message from ${sender.fullname} - HIRE.OS`,
          html: `
                        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #fff; padding: 40px; border-radius: 12px;">
                            <div style="text-align: center; margin-bottom: 30px;">
                                <h1 style="color: #FFD700; margin: 0;">HIRE.OS</h1>
                                <p style="color: #888; margin-top: 5px;">New Message Notification</p>
                            </div>
                            
                            <div style="background: #111; border: 1px solid #333; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                                <h2 style="color: #fff; margin: 0 0 10px 0; font-size: 18px;">Message from ${sender.fullname}</h2>
                                <p style="color: #888; margin: 0 0 20px 0; font-size: 12px;">Recruiter</p>
                                
                                <div style="background: #1a1a1a; border-left: 3px solid #FFD700; padding: 16px; border-radius: 4px;">
                                    <p style="color: #ccc; margin: 0; font-size: 14px; line-height: 1.6;">${content.substring(0, 500)}${content.length > 500 ? "..." : ""}</p>
                                </div>
                            </div>
                            
                            <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/recruiter/messages" 
                               style="display: block; background: #FFD700; color: #000; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; text-align: center;">
                                View & Reply
                            </a>
                            
                            <hr style="border: none; border-top: 1px solid #333; margin: 30px 0;">
                            
                            <p style="color: #666; font-size: 12px; text-align: center;">
                                © ${new Date().getFullYear()} HIRE.OS - Industrial Recruitment Platform
                            </p>
                        </div>
                    `,
        });
        logger.info(`📧 Email notification sent to CEO ${receiver.email}`);
      } catch (emailError) {
        logger.error("Failed to send email to CEO:", emailError);
        // Don't fail the message send if email fails
      }
    }

    logger.info(
      `📨 Message sent from ${sender.fullname} to ${receiver.fullname}`,
    );

    return res.status(201).json({
      message: "Message sent successfully",
      success: true,
      data: {
        _id: message._id,
        subject: message.subject,
        createdAt: message.createdAt,
      },
    });
  } catch (error) {
    logger.error("Send message error:", error);
    return res.status(500).json({
      message: "Failed to send message",
      success: false,
    });
  }
};

/**
 * Get inbox messages for current user
 */
export const getInbox = async (req, res) => {
  try {
    const userId = req.id;
    const { page = 1, limit = 20, type, senderRole, isRead } = req.query;

    const result = await Message.getInbox(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      type,
      senderRole,
      isRead: isRead === "true" ? true : isRead === "false" ? false : null,
    });

    // Get unread count
    const unreadCount = await Message.getUnreadCount(userId);

    return res.status(200).json({
      success: true,
      data: {
        messages: result.messages,
        pagination: result.pagination,
        unreadCount,
      },
    });
  } catch (error) {
    logger.error("Get inbox error:", error);
    return res.status(500).json({
      message: "Failed to fetch messages",
      success: false,
    });
  }
};

/**
 * Get sent messages for current user
 */
export const getSentMessages = async (req, res) => {
  try {
    const userId = req.id;
    const { page = 1, limit = 20 } = req.query;

    const result = await Message.getSentMessages(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error("Get sent messages error:", error);
    return res.status(500).json({
      message: "Failed to fetch sent messages",
      success: false,
    });
  }
};

/**
 * Get single message by ID
 */
export const getMessage = async (req, res) => {
  try {
    const userId = req.id;
    const { messageId } = req.params;

    const message = await Message.findById(messageId)
      .populate("senderId", "fullname email profile.profilePhoto role")
      .populate("receiverId", "fullname email profile.profilePhoto role")
      .populate("relatedTo.jobId", "title")
      .populate("relatedTo.applicationId", "status")
      .populate("parentMessageId");

    if (!message) {
      return res.status(404).json({
        message: "Message not found",
        success: false,
      });
    }

    // Check access - only sender or receiver can view
    if (
      message.senderId._id.toString() !== userId &&
      message.receiverId._id.toString() !== userId
    ) {
      return res.status(403).json({
        message: "Access denied",
        success: false,
      });
    }

    // Mark as read if receiver is viewing
    if (message.receiverId._id.toString() === userId && !message.isRead) {
      await message.markAsRead();
    }

    return res.status(200).json({
      success: true,
      data: message,
    });
  } catch (error) {
    logger.error("Get message error:", error);
    return res.status(500).json({
      message: "Failed to fetch message",
      success: false,
    });
  }
};

/**
 * Mark message as read
 */
export const markAsRead = async (req, res) => {
  try {
    const userId = req.id;
    const { messageId } = req.params;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        message: "Message not found",
        success: false,
      });
    }

    // Only receiver can mark as read
    if (message.receiverId.toString() !== userId) {
      return res.status(403).json({
        message: "Access denied",
        success: false,
      });
    }

    await message.markAsRead();

    return res.status(200).json({
      message: "Message marked as read",
      success: true,
    });
  } catch (error) {
    logger.error("Mark as read error:", error);
    return res.status(500).json({
      message: "Failed to mark message as read",
      success: false,
    });
  }
};

/**
 * Mark all messages as read
 */
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.id;

    await Message.updateMany(
      { receiverId: userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );

    return res.status(200).json({
      message: "All messages marked as read",
      success: true,
    });
  } catch (error) {
    logger.error("Mark all as read error:", error);
    return res.status(500).json({
      message: "Failed to mark messages as read",
      success: false,
    });
  }
};

/**
 * Get unread message count
 */
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.id;
    const count = await Message.getUnreadCount(userId);

    return res.status(200).json({
      success: true,
      data: { unreadCount: count },
    });
  } catch (error) {
    logger.error("Get unread count error:", error);
    return res.status(500).json({
      message: "Failed to get unread count",
      success: false,
    });
  }
};

/**
 * Delete message (soft delete)
 */
export const deleteMessage = async (req, res) => {
  try {
    const userId = req.id;
    const { messageId } = req.params;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        message: "Message not found",
        success: false,
      });
    }

    // Check access
    if (
      message.senderId.toString() !== userId &&
      message.receiverId.toString() !== userId
    ) {
      return res.status(403).json({
        message: "Access denied",
        success: false,
      });
    }

    await message.softDelete(userId);

    return res.status(200).json({
      message: "Message deleted",
      success: true,
    });
  } catch (error) {
    logger.error("Delete message error:", error);
    return res.status(500).json({
      message: "Failed to delete message",
      success: false,
    });
  }
};

/**
 * Reply to a message
 */
export const replyToMessage = async (req, res) => {
  try {
    const senderId = req.id;
    const { messageId } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        message: "Reply content is required",
        success: false,
      });
    }

    // Get original message
    const originalMessage = await Message.findById(messageId).populate(
      "senderId",
      "fullname role",
    );

    if (!originalMessage) {
      return res.status(404).json({
        message: "Original message not found",
        success: false,
      });
    }

    // Get sender info
    const sender = await User.findById(senderId).select("fullname role");

    // Create reply (swap sender and receiver)
    const reply = await Message.create({
      senderId,
      senderRole: sender.role,
      receiverId: originalMessage.senderId._id,
      receiverRole: originalMessage.senderRole,
      subject: `Re: ${originalMessage.subject}`,
      content,
      type: originalMessage.type,
      priority: "normal",
      relatedTo: originalMessage.relatedTo,
      parentMessageId: messageId,
    });

    // Create notification
    await Notification.create({
      userId: originalMessage.senderId._id,
      type: "message",
      title: `Reply from ${sender.fullname}`,
      message: `Re: ${originalMessage.subject}`.substring(0, 100),
      relatedEntities: {
        messageId: reply._id,
      },
    });

    logger.info(`📨 Reply sent from ${sender.fullname}`);

    return res.status(201).json({
      message: "Reply sent successfully",
      success: true,
      data: {
        _id: reply._id,
        subject: reply.subject,
        createdAt: reply.createdAt,
      },
    });
  } catch (error) {
    logger.error("Reply to message error:", error);
    return res.status(500).json({
      message: "Failed to send reply",
      success: false,
    });
  }
};

/**
 * Send broadcast message (Admin/CEO only)
 */
export const sendBroadcast = async (req, res) => {
  try {
    const senderId = req.id;
    const {
      subject,
      content,
      targetRole = "student", // Who to send to
      priority = "normal",
    } = req.body;

    // Validate sender is admin or CEO
    const sender = await User.findById(senderId).select("fullname role");
    if (!["admin", "ceo", "company_admin"].includes(sender.role)) {
      return res.status(403).json({
        message: "Only admins can send broadcast messages",
        success: false,
      });
    }

    if (!subject || !content) {
      return res.status(400).json({
        message: "Subject and content are required",
        success: false,
      });
    }

    // Get all users of target role
    const targetUsers = await User.find({ role: targetRole }).select(
      "_id role",
    );

    if (targetUsers.length === 0) {
      return res.status(400).json({
        message: `No users found with role: ${targetRole}`,
        success: false,
      });
    }

    // Create messages for all target users
    const messages = targetUsers.map((user) => ({
      senderId,
      senderRole: sender.role,
      receiverId: user._id,
      receiverRole: user.role,
      subject,
      content,
      type: "announcement",
      priority,
    }));

    await Message.insertMany(messages);

    // Create notifications
    const notifications = targetUsers.map((user) => ({
      userId: user._id,
      type: "announcement",
      title: `Announcement from ${sender.fullname}`,
      message: subject.substring(0, 100),
    }));

    await Notification.insertMany(notifications);

    logger.info(
      `📢 Broadcast sent to ${targetUsers.length} ${targetRole}s by ${sender.fullname}`,
    );

    return res.status(201).json({
      message: `Broadcast sent to ${targetUsers.length} users`,
      success: true,
      data: {
        recipientCount: targetUsers.length,
        targetRole,
      },
    });
  } catch (error) {
    logger.error("Send broadcast error:", error);
    return res.status(500).json({
      message: "Failed to send broadcast",
      success: false,
    });
  }
};

/**
 * Get conversation thread
 */
export const getConversation = async (req, res) => {
  try {
    const userId = req.id;
    const { partnerId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get all messages between these two users
    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: partnerId },
        { senderId: partnerId, receiverId: userId },
      ],
      isDeleted: false,
    })
      .populate("senderId", "fullname profile.profilePhoto")
      .populate("receiverId", "fullname profile.profilePhoto")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Mark received messages as read
    await Message.updateMany(
      { senderId: partnerId, receiverId: userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );

    return res.status(200).json({
      success: true,
      data: {
        messages: messages.reverse(), // Oldest first for chat display
        hasMore: messages.length === parseInt(limit),
      },
    });
  } catch (error) {
    logger.error("Get conversation error:", error);
    return res.status(500).json({
      message: "Failed to fetch conversation",
      success: false,
    });
  }
};
