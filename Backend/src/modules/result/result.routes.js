const express = require('express');
const router = express.Router();
const resultController = require('./result.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');
const { adminOnly } = require('../../middleware/role.middleware');

// All routes require authentication and admin role
router.use(authMiddleware);
router.use(adminOnly);

// ==================== GRADE SCALE ====================
router.get('/grade-scale', resultController.getGradeScale.bind(resultController));
router.put('/grade-scale', resultController.updateGradeScale.bind(resultController));

// ==================== GRADE CALCULATION ====================
router.post('/calculate-grades', resultController.calculateCourseGrades.bind(resultController));
router.post('/calculate-semester-grades', resultController.calculateSemesterGrades.bind(resultController));

// ==================== GPA CALCULATION ====================
router.post('/calculate-gpa', resultController.calculateGPA.bind(resultController));
router.get('/student/:studentId/cgpa', resultController.getStudentCGPA.bind(resultController));

// ==================== RESULT PROCESSING ====================
router.post('/process-results', resultController.processResults.bind(resultController));
router.post('/promote-students', resultController.promoteStudents.bind(resultController));

// ==================== RESULT PUBLICATION ====================
router.post('/publish-results', resultController.publishResults.bind(resultController));
router.post('/freeze-results', resultController.freezeResults.bind(resultController));

// ==================== RESULT REPORTS ====================
router.get('/class-summary', resultController.getClassResultSummary.bind(resultController));
router.get('/toppers', resultController.getToppers.bind(resultController));

// ==================== VIEW STUDENT RESULTS (Admin) ====================
router.get('/student/:studentId', resultController.getStudentResults.bind(resultController));
router.get('/student/:studentId/semester/:semesterId', resultController.getStudentSemesterResults.bind(resultController));

module.exports = router;
