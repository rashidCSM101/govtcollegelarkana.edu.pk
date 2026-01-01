const express = require('express');
const router = express.Router();
const studentController = require('./student.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');
const { studentOnly, adminOnly, teacherOrAdmin } = require('../../middleware/role.middleware');
const timetableController = require('../timetable/timetable.controller');
const attendanceController = require('../attendance/attendance.controller');
const examController = require('../exam/exam.controller');
const resultController = require('../result/result.controller');
const transcriptController = require('../transcript/transcript.controller');
const reEvaluationController = require('../re-evaluation/re-evaluation.controller');
const feeController = require('../fee/fee.controller');
const assignmentController = require('../assignment/assignment.controller');
const leaveController = require('../leave/leave.controller');
const certificateController = require('../certificate/certificate.controller');
const feedbackController = require('../feedback/feedback.controller');

// All routes require authentication
router.use(authMiddleware);

// ==================== TIMETABLE ROUTE (Student) ====================
router.get('/timetable', studentOnly, timetableController.getStudentTimetable.bind(timetableController));

// ==================== ATTENDANCE ROUTES (Student) ====================
router.get('/attendance', studentOnly, attendanceController.getStudentAttendance.bind(attendanceController));
router.get('/attendance/summary', studentOnly, attendanceController.getStudentAttendanceSummary.bind(attendanceController));
router.get('/attendance/:courseId', studentOnly, attendanceController.getStudentCourseAttendance.bind(attendanceController));

// ==================== EXAM ROUTES (Student) ====================
router.get('/exam-schedule', studentOnly, examController.getStudentExamSchedule.bind(examController));
router.get('/hall-ticket/:examId', studentOnly, examController.getStudentHallTicket.bind(examController));
router.get('/online-exams', studentOnly, examController.getStudentOnlineExams.bind(examController));
router.get('/online-exam/:id', studentOnly, examController.getStudentOnlineExamDetails.bind(examController));
router.post('/online-exam/:id/start', studentOnly, examController.startOnlineExam.bind(examController));
router.post('/online-exam/:id/answer', studentOnly, examController.saveAnswer.bind(examController));
router.post('/online-exam/:id/submit', studentOnly, examController.submitOnlineExam.bind(examController));

// ==================== RESULTS ROUTES (Student) ====================
router.get('/results', studentOnly, resultController.getMyResults.bind(resultController));
router.get('/results/:semesterId', studentOnly, resultController.getMySemesterResults.bind(resultController));

// ==================== MARKSHEET ROUTES (Student) ====================
router.get('/marksheet/:semesterId', studentOnly, transcriptController.getMarksheet.bind(transcriptController));
router.get('/marksheet/download/:semesterId', studentOnly, transcriptController.downloadMarksheet.bind(transcriptController));

// ==================== TRANSCRIPT ROUTES (Student) ====================
router.post('/request-transcript', studentOnly, transcriptController.requestTranscript.bind(transcriptController));
router.get('/transcripts', studentOnly, transcriptController.getMyTranscripts.bind(transcriptController));
router.get('/transcript-requests', studentOnly, transcriptController.getMyTranscriptRequests.bind(transcriptController));
router.get('/transcript/download', studentOnly, transcriptController.downloadTranscript.bind(transcriptController));
router.get('/transcript/download/:transcriptId', studentOnly, transcriptController.downloadTranscript.bind(transcriptController));

// ==================== DEGREE AUDIT ROUTES (Student) ====================
router.get('/degree-audit', studentOnly, transcriptController.getDegreeAudit.bind(transcriptController));
router.get('/progress', studentOnly, transcriptController.getStudentProgress.bind(transcriptController));

// ==================== RE-EVALUATION ROUTES (Student) ====================
router.post('/re-evaluation/request', studentOnly, reEvaluationController.submitRequest.bind(reEvaluationController));
router.post('/re-evaluation/requests/:requestId/pay', studentOnly, reEvaluationController.payFee.bind(reEvaluationController));
router.get('/re-evaluation/requests', studentOnly, reEvaluationController.getStudentRequests.bind(reEvaluationController));
router.get('/re-evaluation/requests/:requestId/status', studentOnly, reEvaluationController.getRequestStatus.bind(reEvaluationController));

// ==================== FEE ROUTES (Student) ====================
router.get('/fees', studentOnly, feeController.getStudentFees.bind(feeController));
router.get('/fee-history', studentOnly, feeController.getFeeHistory.bind(feeController));
router.get('/voucher/:feeId', studentOnly, feeController.getVoucher.bind(feeController));
router.get('/voucher/:feeId/download', studentOnly, feeController.downloadVoucher.bind(feeController));
router.post('/pay-online', studentOnly, feeController.payOnline.bind(feeController));
router.get('/receipts', studentOnly, feeController.getReceipts.bind(feeController));
router.get('/receipt/:id/download', studentOnly, feeController.downloadReceipt.bind(feeController));

// ==================== ASSIGNMENT ROUTES (Student) ====================
router.get('/assignments', studentOnly, assignmentController.getStudentAssignments.bind(assignmentController));
router.get('/assignments/:id', studentOnly, assignmentController.getAssignmentDetails.bind(assignmentController));
router.post('/assignments/:id/submit', studentOnly, assignmentController.submitAssignment.bind(assignmentController));
router.get('/assignments/submitted', studentOnly, assignmentController.getSubmittedAssignments.bind(assignmentController));

// ==================== LEAVE ROUTES (Student) ====================
router.post('/leave/apply', studentOnly, leaveController.applyStudentLeave.bind(leaveController));
router.get('/leave/history', studentOnly, leaveController.getStudentLeaveHistory.bind(leaveController));
router.get('/leave/balance', studentOnly, leaveController.getStudentLeaveBalance.bind(leaveController));

// ==================== ENROLLMENT ROUTES (Student) ====================
router.post('/enroll', studentOnly, studentController.enrollInSemester);
router.get('/enrollment-history', studentOnly, studentController.getEnrollmentHistory);
router.get('/verify-enrollment/:semesterId', studentOnly, studentController.verifyEnrollment);

// ==================== COURSE REGISTRATION ROUTES (Student) ====================
router.get('/available-courses', studentOnly, studentController.getAvailableCourses);
router.post('/register-course', studentOnly, studentController.registerCourse);
router.get('/registered-courses', studentOnly, studentController.getRegisteredCourses);
router.delete('/drop-course/:id', studentOnly, studentController.dropCourse);
router.get('/check-prerequisites/:course_id', studentOnly, studentController.checkPrerequisites);

// ==================== WAITING LIST ROUTES (Student) ====================
router.post('/waiting-list', studentOnly, studentController.addToWaitingList);
router.get('/waiting-list', studentOnly, studentController.getWaitingList);
router.delete('/waiting-list/:id', studentOnly, studentController.removeFromWaitingList);

// ==================== CERTIFICATE ROUTES (Student) ====================
router.post('/certificate/request', studentOnly, certificateController.requestCertificate.bind(certificateController));
router.get('/certificate/requests', studentOnly, certificateController.getStudentRequests.bind(certificateController));

// ==================== FEEDBACK ROUTES (Student) ====================
router.get('/feedback-forms', studentOnly, feedbackController.getAvailableFeedbackForms.bind(feedbackController));
router.post('/feedback/submit', studentOnly, feedbackController.submitFeedback.bind(feedbackController));

// ==================== COURSE SECTIONS ROUTES (Admin) ====================
router.post('/sections', adminOnly, studentController.createSection);
router.get('/sections', teacherOrAdmin, studentController.getSections);
router.put('/sections/:id', adminOnly, studentController.updateSection);
router.delete('/sections/:id', adminOnly, studentController.deleteSection);

module.exports = router;
