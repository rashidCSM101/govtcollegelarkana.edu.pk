const express = require('express');
const router = express.Router();
const transcriptController = require('./transcript.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');
const { adminOnly } = require('../../middleware/role.middleware');

// All routes require authentication and admin role
router.use(authMiddleware);
router.use(adminOnly);

// ==================== TRANSCRIPT REQUESTS MANAGEMENT ====================
router.get('/transcript-requests', transcriptController.getTranscriptRequests.bind(transcriptController));
router.post('/approve-transcript/:id', transcriptController.approveTranscript.bind(transcriptController));
router.post('/reject-transcript/:id', transcriptController.rejectTranscript.bind(transcriptController));

// ==================== VIEW STUDENT DATA (Admin) ====================
router.get('/student/:studentId/transcript-data', transcriptController.getTranscriptData.bind(transcriptController));
router.get('/student/:studentId/transcripts', transcriptController.getStudentTranscripts.bind(transcriptController));
router.get('/student/:studentId/marksheet/:semesterId', transcriptController.getMarksheet.bind(transcriptController));
router.get('/student/:studentId/marksheet/download/:semesterId', transcriptController.downloadMarksheet.bind(transcriptController));
router.get('/student/:studentId/degree-audit', transcriptController.getDegreeAudit.bind(transcriptController));
router.get('/student/:studentId/progress', transcriptController.getStudentProgress.bind(transcriptController));
router.get('/student/:studentId/transcript/download', transcriptController.downloadTranscript.bind(transcriptController));

module.exports = router;
