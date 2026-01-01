const express = require('express');
const router = express.Router();
const noticeController = require('../modules/notice/notice.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authMiddleware);

// ==================== NOTICE ROUTES (All Users) ====================

// Get unread count (must be before /:id route to avoid conflict)
router.get('/unread-count', noticeController.getUnreadCount.bind(noticeController));

// Get all published notices
router.get('/', noticeController.getPublishedNotices.bind(noticeController));

// Get single notice
router.get('/:id', noticeController.getNoticeById.bind(noticeController));

// Mark notice as read
router.post('/:id/mark-read', noticeController.markNoticeAsRead.bind(noticeController));

module.exports = router;
