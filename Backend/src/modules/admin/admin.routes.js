const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');
const leaveController = require('../leave/leave.controller');
const certificateController = require('../certificate/certificate.controller');
const feedbackController = require('../feedback/feedback.controller');
const noticeController = require('../notice/notice.controller');
const notificationController = require('../notification/notification.controller');
const documentController = require('../document/document.controller');
const scholarshipController = require('../scholarship/scholarship.controller');
const complaintController = require('../complaint/complaint.controller');
const calendarController = require('../calendar/calendar.controller');
const idcardController = require('../idcard/idcard.controller');
const reportController = require('../report/report.controller');
const dashboardController = require('../dashboard/dashboard.controller');
const exportController = require('../export/export.controller');
const backupController = require('../backup/backup.controller');
const auditController = require('../audit/audit.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');
const { adminOnly } = require('../../middleware/role.middleware');
const multer = require('multer');

// Configure multer for CSV upload
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// All routes require authentication and admin role
router.use(authMiddleware);
router.use(adminOnly);

// ==================== DASHBOARD ====================
router.get('/dashboard', dashboardController.getAdminDashboard.bind(dashboardController));

// ==================== STUDENT ROUTES ====================
router.post('/students', adminController.addStudent);
router.get('/students', adminController.getStudents);
router.get('/students/statistics', adminController.getStudentStatistics);
router.get('/students/search', adminController.searchStudents);
router.post('/students/bulk-upload', upload.single('file'), adminController.bulkUploadStudents);
router.get('/students/:id', adminController.getStudentById);
router.put('/students/:id', adminController.updateStudent);
router.patch('/students/:id/toggle-status', adminController.toggleStudentStatus);
router.delete('/students/:id', adminController.deleteStudent);

// ==================== TEACHER ROUTES ====================
router.post('/teachers', adminController.addTeacher);
router.get('/teachers/statistics', adminController.getTeacherStatistics);
router.get('/teachers', adminController.getTeachers);
router.get('/teachers/:id', adminController.getTeacherById);
router.put('/teachers/:id', adminController.updateTeacher);
router.patch('/teachers/:id/toggle-status', adminController.toggleTeacherStatus);
router.delete('/teachers/:id', adminController.deleteTeacher);
router.post('/teachers/:id/assign-course', adminController.assignCourseToTeacher);

// ==================== ADMIN ROUTES ====================
router.post('/admins', adminController.addAdmin);
router.get('/admins', adminController.getAdmins);
router.put('/admins/:id/role', adminController.updateAdminRole);

// ==================== DEPARTMENT ROUTES ====================
router.get('/departments', adminController.getDepartments);
router.post('/departments', adminController.addDepartment);
router.get('/departments/:id/stats', adminController.getDepartmentStats);
router.put('/departments/:id', adminController.updateDepartment);

// ==================== SESSION ROUTES ====================
router.post('/sessions', adminController.createSession);
router.get('/sessions', adminController.getSessions);
router.put('/sessions/:id', adminController.updateSession);

// ==================== SEMESTER ROUTES ====================
router.post('/semesters', adminController.createSemester);
router.get('/semesters', adminController.getSemesters);
router.get('/semesters/:id', adminController.getSemesterDetails);
router.put('/semesters/:id', adminController.updateSemester);

// ==================== COURSE ROUTES ====================
router.post('/courses', adminController.createCourse);
router.get('/courses', adminController.getCourses);
router.get('/courses/:id', adminController.getCourseDetails);
router.put('/courses/:id', adminController.updateCourse);
router.delete('/courses/:id', adminController.deleteCourse);
router.post('/courses/:id/prerequisites', adminController.addCoursePrerequisite);
router.delete('/courses/:id/prerequisites/:prereqId', adminController.removeCoursePrerequisite);

// ==================== LEAVE ROUTES (Admin) ====================

// Get all teacher leaves
router.get('/teacher-leaves', leaveController.getAllTeacherLeaves.bind(leaveController));

// Approve teacher leave
router.post('/teacher-leaves/:id/approve', leaveController.approveTeacherLeave.bind(leaveController));

// Reject teacher leave
router.post('/teacher-leaves/:id/reject', leaveController.rejectTeacherLeave.bind(leaveController));

// Get leave calendar
router.get('/leave-calendar', leaveController.getLeaveCalendar.bind(leaveController));

// ==================== CERTIFICATE ROUTES (Admin) ====================

// Get pending certificate requests
router.get('/certificate/pending', certificateController.getPendingRequests.bind(certificateController));

// Generate certificate
router.post('/certificate/generate/:id', certificateController.generateCertificate.bind(certificateController));

// Download certificate
router.get('/certificate/download/:id', certificateController.downloadCertificate.bind(certificateController));

// ==================== FEEDBACK ROUTES (Admin) ====================

// Create feedback form
router.post('/feedback-forms', feedbackController.createFeedbackForm.bind(feedbackController));

// Get all feedback forms
router.get('/feedback-forms', feedbackController.getAllFeedbackForms.bind(feedbackController));

// Get feedback reports
router.get('/feedback-reports', feedbackController.getFeedbackReports.bind(feedbackController));

// ==================== NOTICE ROUTES (Admin) ====================

// Create notice
router.post('/notices', noticeController.createNotice.bind(noticeController));

// Get all notices (admin view)
router.get('/notices', noticeController.getAllNoticesAdmin.bind(noticeController));

// Update notice
router.put('/notices/:id', noticeController.updateNotice.bind(noticeController));

// Delete notice
router.delete('/notices/:id', noticeController.deleteNotice.bind(noticeController));

// ==================== NOTIFICATION PREFERENCES ROUTES (Admin) ====================
router.get('/notification-preferences', notificationController.getPreferences.bind(notificationController));
router.put('/notification-preferences', notificationController.updatePreferences.bind(notificationController));

// ==================== DOCUMENT ROUTES (Admin) ====================

// Get pending documents for verification
router.get('/documents/pending', documentController.getPendingDocuments.bind(documentController));

// Get all documents with filters
router.get('/documents', documentController.getAllDocuments.bind(documentController));

// Verify document
router.post('/documents/verify/:id', documentController.verifyDocument.bind(documentController));

// Reject document
router.post('/documents/reject/:id', documentController.rejectDocument.bind(documentController));

// Download document
router.get('/documents/download/:id', documentController.downloadDocumentAdmin.bind(documentController));

// Get verification statistics
router.get('/documents/statistics', documentController.getVerificationStatistics.bind(documentController));

// ==================== SCHOLARSHIP ROUTES (Admin) ====================

// Create scholarship
router.post('/scholarships', scholarshipController.createScholarship.bind(scholarshipController));

// Get all scholarships
router.get('/scholarships', scholarshipController.getAllScholarships.bind(scholarshipController));

// Get applications for a scholarship
router.get('/scholarship/:id/applications', scholarshipController.getScholarshipApplications.bind(scholarshipController));

// Approve application
router.post('/scholarship/application/:id/approve', scholarshipController.approveApplication.bind(scholarshipController));

// Reject application
router.post('/scholarship/application/:id/reject', scholarshipController.rejectApplication.bind(scholarshipController));

// Process distribution
router.post('/scholarship/distribution/:applicationId', scholarshipController.processDistribution.bind(scholarshipController));

// Get statistics
router.get('/scholarship/statistics', scholarshipController.getStatistics.bind(scholarshipController));

// ==================== COMPLAINT ROUTES (Admin) ====================

// Get all complaints
router.get('/complaints', complaintController.getAllComplaints.bind(complaintController));

// Get complaint statistics (must be before :id route)
router.get('/complaints/statistics', complaintController.getStatistics.bind(complaintController));

// Get complaint by ID
router.get('/complaints/:id', complaintController.getComplaintByIdAdmin.bind(complaintController));

// Assign complaint
router.post('/complaints/:id/assign', complaintController.assignComplaint.bind(complaintController));

// Resolve complaint
router.post('/complaints/:id/resolve', complaintController.resolveComplaint.bind(complaintController));

// Update complaint status
router.put('/complaints/:id/status', complaintController.updateStatus.bind(complaintController));

// Add comment to complaint
router.post('/complaints/:id/comment', complaintController.addCommentAdmin.bind(complaintController));

// ==================== CALENDAR ROUTES (Admin) ====================

// Create event
router.post('/calendar/events', calendarController.createEvent.bind(calendarController));

// Get calendar statistics (must be before :id route)
router.get('/calendar/statistics', calendarController.getStatistics.bind(calendarController));

// Get all events
router.get('/calendar/events', calendarController.getAllEvents.bind(calendarController));

// Get event by ID
router.get('/calendar/events/:id', calendarController.getEventById.bind(calendarController));

// Update event
router.put('/calendar/events/:id', calendarController.updateEvent.bind(calendarController));

// Delete event
router.delete('/calendar/events/:id', calendarController.deleteEvent.bind(calendarController));

// ==================== ID CARD ROUTES (Admin) ====================

// Generate ID cards
router.post('/generate-id-cards', idcardController.generateIDCards.bind(idcardController));

// Verify ID card by QR code
router.get('/verify-id-card/:qrCode', idcardController.verifyIDCard.bind(idcardController));

// Get all ID cards
router.get('/id-cards', idcardController.getAllIDCards.bind(idcardController));

// Get ID card statistics
router.get('/id-cards/statistics', idcardController.getStatistics.bind(idcardController));

// Download ID card (Admin)
router.get('/id-card/download/:studentId', idcardController.downloadIDCardAdmin.bind(idcardController));

// ==================== REPORT ROUTES ====================

// Student reports
router.get('/reports/students', reportController.getStudentReports.bind(reportController));

// Attendance reports
router.get('/reports/attendance', reportController.getAttendanceReports.bind(reportController));

// Academic reports
router.get('/reports/academic', reportController.getAcademicReports.bind(reportController));

// Financial reports
router.get('/reports/financial', reportController.getFinancialReports.bind(reportController));

// Teacher reports
router.get('/reports/teachers', reportController.getTeacherReports.bind(reportController));

// Export report
router.get('/reports/export/:type', reportController.exportReport.bind(reportController));

// ==================== EXPORT ROUTES ====================

// Export module data (students, teachers, attendance, results, fees, departments, courses)
router.get('/export/:module', exportController.exportModuleData.bind(exportController));

// ==================== BACKUP ROUTES ====================

// Create manual backup
router.post('/backup/create', backupController.createBackup.bind(backupController));

// List all backups
router.get('/backup/list', backupController.listBackups.bind(backupController));

// Restore from backup
router.post('/backup/restore', backupController.restoreBackup.bind(backupController));

// Download backup file
router.get('/backup/download/:backupId', backupController.downloadBackup.bind(backupController));

// ==================== AUDIT LOG ROUTES ====================

// Get all audit logs
router.get('/audit-logs', auditController.getAuditLogs.bind(auditController));

// Get login/logout logs
router.get('/audit-logs/login', auditController.getLoginLogs.bind(auditController));

// Get data modification logs
router.get('/audit-logs/modifications', auditController.getDataModificationLogs.bind(auditController));

// Get security logs
router.get('/audit-logs/security', auditController.getSecurityLogs.bind(auditController));

// Get audit statistics
router.get('/audit-logs/statistics', auditController.getAuditStatistics.bind(auditController));

module.exports = router;
