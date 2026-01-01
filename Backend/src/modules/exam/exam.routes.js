const express = require('express');
const router = express.Router();
const examController = require('./exam.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');
const { adminOnly, teacherOnly, teacherOrAdmin } = require('../../middleware/role.middleware');

// All routes require authentication
router.use(authMiddleware);

// ==================== ADMIN ROUTES - EXAM MANAGEMENT ====================

// Exams CRUD
router.post('/exams', adminOnly, examController.createExam.bind(examController));
router.get('/exams', teacherOrAdmin, examController.getExams.bind(examController));
router.get('/exams/:id', teacherOrAdmin, examController.getExamById.bind(examController));
router.put('/exams/:id', adminOnly, examController.updateExam.bind(examController));
router.delete('/exams/:id', adminOnly, examController.deleteExam.bind(examController));

// ==================== ADMIN ROUTES - EXAM SCHEDULE ====================

router.post('/exam-schedule', adminOnly, examController.createExamSchedule.bind(examController));
router.get('/exam-schedule', teacherOrAdmin, examController.getExamSchedules.bind(examController));
router.put('/exam-schedule/:id', adminOnly, examController.updateExamSchedule.bind(examController));
router.delete('/exam-schedule/:id', adminOnly, examController.deleteExamSchedule.bind(examController));

// ==================== ADMIN ROUTES - HALL TICKETS ====================

router.post('/generate-hall-tickets', adminOnly, examController.generateHallTickets.bind(examController));

module.exports = router;
