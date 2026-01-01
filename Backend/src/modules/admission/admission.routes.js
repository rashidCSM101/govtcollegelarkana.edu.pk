const express = require('express');
const router = express.Router();
const admissionController = require('./admission.controller');
const { authenticate, authorize } = require('../../middleware/auth');

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
  authenticate,
  authorize(['admin', 'super_admin']),
  admissionController.getApplications
);

// Review application
router.post(
  '/applications/:id/review',
  authenticate,
  authorize(['admin', 'super_admin']),
  admissionController.reviewApplication
);

// Generate merit list
router.post(
  '/merit-list/generate',
  authenticate,
  authorize(['admin', 'super_admin']),
  admissionController.generateMeritList
);

// Approve admission (final step)
router.post(
  '/applications/:id/approve',
  authenticate,
  authorize(['admin', 'super_admin']),
  admissionController.approveAdmission
);

// Get admission statistics
router.get(
  '/statistics',
  authenticate,
  authorize(['admin', 'super_admin']),
  admissionController.getStatistics
);

module.exports = router;
