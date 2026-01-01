const express = require('express');
const router = express.Router();
const reEvaluationController = require('./re-evaluation.controller');

// ==================== RE-EVALUATION ROUTES ====================

// Get all re-evaluation requests (with filters)
// GET /api/admin/re-evaluation/requests?status=pending&course_id=1&page=1&limit=20
router.get('/requests', reEvaluationController.getRequests);

// Approve/Reject request
// POST /api/admin/re-evaluation/requests/:requestId/process
// Body: { action: 'approve' | 'reject', remarks: 'reason for decision' }
router.post('/requests/:requestId/process', reEvaluationController.processRequest);

// Assign request to teacher
// POST /api/admin/re-evaluation/requests/:requestId/assign
// Body: { teacher_id: 1, instructions: 'Please review carefully' }
router.post('/requests/:requestId/assign', reEvaluationController.assignToTeacher);

// Get re-evaluation statistics
// GET /api/admin/re-evaluation/statistics?department_id=1
router.get('/statistics', reEvaluationController.getStatistics);

module.exports = router;
