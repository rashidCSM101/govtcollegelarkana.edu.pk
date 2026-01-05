const express = require('express');
const router = express.Router();
const admissionController = require('./admission.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');
const { adminOnly } = require('../../middleware/role.middleware');

// ==================== PUBLIC ROUTES ====================

// Submit admission application
router.post('/apply', admissionController.submitApplication);

// Get application status
router.get('/status/:applicationNo', admissionController.getApplicationStatus);

// Get merit list
router.get('/merit-list', admissionController.getMeritList);

// Generate admission letter (can be accessed by student with applicationNo)
router.get('/letter/:applicationNo', admissionController.generateAdmissionLetter);

// ==================== ADMIN ROUTES ====================

// Get all applications
router.get(
  '/applications',
  authMiddleware,
  adminOnly,
  admissionController.getApplications
);

// Review application
router.post(
  '/applications/:id/review',
  authMiddleware,
  adminOnly,
  admissionController.reviewApplication
);

// Generate merit list
router.post(
  '/merit-list/generate',
  authMiddleware,
  adminOnly,
  admissionController.generateMeritList
);

// Approve admission (final step)
router.post(
  '/applications/:id/approve',
  authMiddleware,
  adminOnly,
  admissionController.approveAdmission
);

// Get admission statistics
router.get(
  '/statistics',
  authMiddleware,
  adminOnly,
  admissionController.getStatistics
);

module.exports = router;
