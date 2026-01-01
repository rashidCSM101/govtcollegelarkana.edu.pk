const express = require('express');
const router = express.Router();
const notificationController = require('../modules/notification/notification.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authMiddleware);

// ==================== NOTIFICATION ROUTES ====================

// Get unread count (must be before /:id routes to avoid conflict)
router.get('/unread-count', notificationController.getUnreadCount.bind(notificationController));

// Mark all as read
router.post('/mark-all-read', notificationController.markAllAsRead.bind(notificationController));

// Get all notifications
router.get('/', notificationController.getUserNotifications.bind(notificationController));

// Mark single notification as read
router.post('/:id/mark-read', notificationController.markAsRead.bind(notificationController));

module.exports = router;
