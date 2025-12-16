import express from 'express';
import {
    getInterviewNotifications,
    markInterviewAsViewed,
    getAllNotifications,
    markNotificationAsRead,
    markAllAsRead,
    deleteNotification,
    getUnreadCount
} from '../controllers/notification.controller.js';
import isAuthenticated from '../middlewares/isAuthenticated.js';

const router = express.Router();

// All routes require authentication
router.use(isAuthenticated);

// Get all notifications for current user
router.get('/', getAllNotifications);

// Get unread count
router.get('/unread-count', getUnreadCount);

// Get interview-specific notifications
router.get('/interviews', getInterviewNotifications);

// Mark notification as read
router.put('/:id/read', markNotificationAsRead);

// Mark all as read
router.put('/read-all', markAllAsRead);

// Mark interview notification as viewed (legacy support)
router.put('/interview/:id/viewed', markInterviewAsViewed);

// Delete notification
router.delete('/:id', deleteNotification);

export default router;
