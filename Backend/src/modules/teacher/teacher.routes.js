const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../middleware/auth.middleware');
const { teacherOnly, teacherOrAdmin } = require('../../middleware/role.middleware');
const timetableController = require('../timetable/timetable.controller');
const attendanceController = require('../attendance/attendance.controller');
const examController = require('../exam/exam.controller');
const resultController = require('../result/result.controller');
const reEvaluationController = require('../re-evaluation/re-evaluation.controller');
const assignmentController = require('../assignment/assignment.controller');
const leaveController = require('../leave/leave.controller');
const notificationController = require('../notification/notification.controller');
const dashboardController = require('../dashboard/dashboard.controller');

// All routes require authentication
router.use(authMiddleware);

// ==================== DASHBOARD ====================
router.get('/dashboard', teacherOnly, dashboardController.getTeacherDashboard.bind(dashboardController));

// ==================== TIMETABLE ROUTE (Teacher) ====================
router.get('/timetable', teacherOnly, timetableController.getTeacherTimetable.bind(timetableController));

// ==================== ATTENDANCE ROUTES (Teacher) ====================

// Mark single attendance
router.post('/attendance/mark', teacherOnly, attendanceController.markAttendance.bind(attendanceController));

// Bulk mark attendance
router.post('/attendance/bulk-mark', teacherOnly, attendanceController.bulkMarkAttendance.bind(attendanceController));

// Edit attendance
router.put('/attendance/edit/:id', teacherOnly, attendanceController.editAttendance.bind(attendanceController));

// Get students for marking attendance
router.get('/attendance/students', teacherOnly, attendanceController.getStudentsForAttendance.bind(attendanceController));

// Get section attendance
router.get('/attendance/section/:sectionId', teacherOnly, attendanceController.getSectionAttendance.bind(attendanceController));

// ==================== ONLINE EXAM ROUTES (Teacher) ====================

// Create online exam
router.post('/online-exam', teacherOrAdmin, examController.createOnlineExam.bind(examController));

// Add questions to online exam
router.post('/online-exam/:id/questions', teacherOrAdmin, examController.addQuestions.bind(examController));

// Get online exam with questions
router.get('/online-exam/:id', teacherOrAdmin, examController.getOnlineExamQuestions.bind(examController));

// Update question
router.put('/online-exam/question/:questionId', teacherOrAdmin, examController.updateQuestion.bind(examController));

// Delete question
router.delete('/online-exam/question/:questionId', teacherOrAdmin, examController.deleteQuestion.bind(examController));

// Activate/Deactivate online exam
router.patch('/online-exam/:id/toggle', teacherOrAdmin, examController.toggleOnlineExam.bind(examController));

// ==================== MARKS ENTRY (Teacher) ====================

// Enter marks
router.post('/marks/enter', teacherOrAdmin, examController.enterMarks.bind(examController));

// Edit marks
router.put('/marks/edit/:id', teacherOrAdmin, resultController.editMarks.bind(resultController));

// Bulk enter marks
router.post('/marks/bulk-enter', teacherOrAdmin, examController.bulkEnterMarks.bind(examController));

// Bulk upload marks from CSV
router.post('/marks/bulk-upload', teacherOrAdmin, resultController.bulkUploadMarks.bind(resultController));

// Lock marks
router.post('/marks/lock', teacherOrAdmin, resultController.lockMarks.bind(resultController));

// Get marks for exam
router.get('/marks/:examId', teacherOrAdmin, examController.getExamMarks.bind(examController));

// Grade individual answer
router.put('/grade/answer/:answerId', teacherOrAdmin, examController.gradeAnswer.bind(examController));

// Finalize grading
router.post('/grade/finalize/:attemptId', teacherOrAdmin, examController.finalizeGrading.bind(examController));

// ==================== RE-EVALUATION ROUTES (Teacher) ====================

// Get assigned re-evaluation requests
router.get('/re-evaluation/requests', teacherOnly, reEvaluationController.getAssignedRequests.bind(reEvaluationController));

// Update re-evaluation result
router.post('/re-evaluation/requests/:requestId/update', teacherOnly, reEvaluationController.updateResult.bind(reEvaluationController));

// ==================== ASSIGNMENT ROUTES (Teacher) ====================

// Create assignment
router.post('/assignments', teacherOnly, assignmentController.createAssignment.bind(assignmentController));

// Get teacher's assignments
router.get('/assignments', teacherOnly, assignmentController.getTeacherAssignments.bind(assignmentController));

// Update assignment
router.put('/assignments/:id', teacherOnly, assignmentController.updateAssignment.bind(assignmentController));

// Get assignment submissions
router.get('/assignments/:id/submissions', teacherOnly, assignmentController.getAssignmentSubmissions.bind(assignmentController));

// Grade submission
router.post('/assignments/:id/submissions/:submissionId/grade', teacherOnly, assignmentController.gradeSubmission.bind(assignmentController));

// Bulk grade submissions
router.post('/assignments/:id/bulk-grade', teacherOnly, assignmentController.bulkGrade.bind(assignmentController));

// Get assignment analytics
router.get('/assignments/:id/analytics', teacherOnly, assignmentController.getAssignmentAnalytics.bind(assignmentController));

// ==================== LEAVE ROUTES (Teacher) ====================

// Apply for leave
router.post('/leave/apply', teacherOnly, leaveController.applyTeacherLeave.bind(leaveController));

// Get my leaves
router.get('/leave/history', teacherOnly, leaveController.getTeacherLeaves.bind(leaveController));

// Get leave balance
router.get('/leave/balance', teacherOnly, leaveController.getTeacherLeaveBalance.bind(leaveController));

// Get pending student leaves (for approval)
router.get('/leave/pending', teacherOnly, leaveController.getPendingLeaves.bind(leaveController));

// Approve student leave
router.post('/leave/approve/:id', teacherOnly, leaveController.approveLeave.bind(leaveController));

// Reject student leave
router.post('/leave/reject/:id', teacherOnly, leaveController.rejectLeave.bind(leaveController));

// ==================== NOTIFICATION PREFERENCES ROUTES (Teacher) ====================
router.get('/notification-preferences', teacherOnly, notificationController.getPreferences.bind(notificationController));
router.put('/notification-preferences', teacherOnly, notificationController.updatePreferences.bind(notificationController));

module.exports = router;
