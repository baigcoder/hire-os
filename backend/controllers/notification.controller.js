import { Notification } from "../models/notification.model.js";
import { Application } from "../models/application.model.js";

// Get all notifications for current user
export const getAllNotifications = async (req, res) => {
  try {
    const userId = req.id;
    const { page = 1, limit = 20, unreadOnly = false, type } = req.query;

    const query = { userId, dismissed: false };

    if (unreadOnly === "true") {
      query.read = false;
    }

    if (type) {
      query.type = type;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("relatedEntities.jobId", "title company")
      .populate("relatedEntities.companyId", "name logo")
      .populate("relatedEntities.senderId", "fullname profile.profilePhoto");

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
      userId,
      read: false,
      dismissed: false,
    });

    return res.status(200).json({
      success: true,
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
      unreadCount,
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching notifications",
    });
  }
};

// Get unread count
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.id;
    const count = await Notification.getUnreadCount(userId);

    return res.status(200).json({
      success: true,
      unreadCount: count,
    });
  } catch (error) {
    console.error("Get unread count error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching unread count",
    });
  }
};

// Get interview-specific notifications
export const getInterviewNotifications = async (req, res) => {
  try {
    const userId = req.id;

    // Get notifications related to interviews
    const interviewTypes = [
      "interview_scheduled",
      "interview_reminder",
      "interview_started",
      "interview_cancelled",
      "mcq_available",
      "mcq_passed",
      "mcq_failed",
      "video_interview_ready",
    ];

    const notifications = await Notification.find({
      userId,
      type: { $in: interviewTypes },
      dismissed: false,
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("relatedEntities.jobId", "title company")
      .populate("relatedEntities.interviewId");

    // Also get upcoming interviews from applications
    const upcomingInterviews = await Application.find({
      applicant: userId,
      status: "interview",
      "interviewDetails.date": { $gte: new Date() },
    })
      .sort({ "interviewDetails.date": 1 })
      .populate({
        path: "job",
        populate: { path: "company" },
      });

    return res.status(200).json({
      success: true,
      notifications,
      upcomingInterviews,
    });
  } catch (error) {
    console.error("Get interview notifications error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching interview notifications",
    });
  }
};

// Mark notification as read
export const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.id;

    const notification = await Notification.findOne({ _id: id, userId });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    await notification.markAsRead();

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error) {
    console.error("Mark as read error:", error);
    return res.status(500).json({
      success: false,
      message: "Error marking notification as read",
    });
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.id;

    const result = await Notification.markAllAsRead(userId);

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Mark all as read error:", error);
    return res.status(500).json({
      success: false,
      message: "Error marking notifications as read",
    });
  }
};

// Mark interview notification as viewed (legacy support)
export const markInterviewAsViewed = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.id;

    // Update application interview viewed status
    const application = await Application.findOne({
      _id: id,
      applicant: userId,
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    if (application.interviewDetails) {
      application.interviewDetails.viewed = true;
      await application.save();
    }

    // Also mark related notification as read
    await Notification.updateMany(
      {
        userId,
        "relatedEntities.applicationId": id,
        type: "interview_scheduled",
      },
      { read: true, readAt: new Date() },
    );

    return res.status(200).json({
      success: true,
      message: "Interview notification marked as viewed",
    });
  } catch (error) {
    console.error("Mark interview as viewed error:", error);
    return res.status(500).json({
      success: false,
      message: "Error marking interview as viewed",
    });
  }
};

// Delete notification
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.id;

    const notification = await Notification.findOne({ _id: id, userId });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    await notification.dismiss();

    return res.status(200).json({
      success: true,
      message: "Notification deleted",
    });
  } catch (error) {
    console.error("Delete notification error:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting notification",
    });
  }
};

// Helper: Send notification (used by other controllers)
export const sendNotification = async (params) => {
  try {
    const notification = await Notification.createNotification(params);

    // TODO: Emit socket event for real-time notification
    // io.to(params.userId).emit('new-notification', notification);

    return notification;
  } catch (error) {
    console.error("Send notification error:", error);
    throw error;
  }
};

// Helper: Send bulk notifications
export const sendBulkNotifications = async (userIds, params) => {
  try {
    const notifications = await Promise.all(
      userIds.map((userId) =>
        Notification.createNotification({ ...params, userId }),
      ),
    );
    return notifications;
  } catch (error) {
    console.error("Send bulk notifications error:", error);
    throw error;
  }
};
