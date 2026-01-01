const express = require('express');
const router = express.Router();
const attendanceController = require('./attendance.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');
const { adminOnly, teacherOnly, studentOnly, teacherOrAdmin } = require('../../middleware/role.middleware');

// All routes require authentication
router.use(authMiddleware);

// ==================== ADMIN ROUTES ====================

// Get attendance reports (with filters)
router.get('/reports', adminOnly, attendanceController.getAttendanceReports.bind(attendanceController));

// Get defaulters list
router.get('/defaulters', adminOnly, attendanceController.getDefaultersList.bind(attendanceController));

// Get attendance analytics
router.get('/analytics', adminOnly, attendanceController.getAttendanceAnalytics.bind(attendanceController));

module.exports = router;
