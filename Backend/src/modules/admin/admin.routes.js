const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');
const leaveController = require('../leave/leave.controller');
const certificateController = require('../certificate/certificate.controller');
const feedbackController = require('../feedback/feedback.controller');
const noticeController = require('../notice/notice.controller');
const notificationController = require('../notification/notification.controller');
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
router.get('/dashboard', adminController.getDashboardStats);

// ==================== STUDENT ROUTES ====================
router.post('/students', adminController.addStudent);
router.get('/students', adminController.getStudents);
router.get('/students/search', adminController.searchStudents);
router.post('/students/bulk-upload', upload.single('file'), adminController.bulkUploadStudents);
router.get('/students/:id', adminController.getStudentById);
router.put('/students/:id', adminController.updateStudent);
router.delete('/students/:id', adminController.deleteStudent);

// ==================== TEACHER ROUTES ====================
router.post('/teachers', adminController.addTeacher);
router.get('/teachers', adminController.getTeachers);
router.get('/teachers/:id', adminController.getTeacherById);
router.put('/teachers/:id', adminController.updateTeacher);
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

module.exports = router;
