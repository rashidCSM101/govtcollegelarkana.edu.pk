const express = require('express');
const router = express.Router();
const timetableController = require('./timetable.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');
const { adminOnly, teacherOrAdmin, studentOnly, teacherOnly } = require('../../middleware/role.middleware');

// All routes require authentication
router.use(authMiddleware);

// ==================== ADMIN ROUTES ====================

// Create timetable slot (Admin/Teacher)
router.post('/', teacherOrAdmin, timetableController.createSlot.bind(timetableController));

// Bulk create slots (Admin only)
router.post('/bulk', adminOnly, timetableController.bulkCreateSlots.bind(timetableController));

// Update slot (Admin/Teacher)
router.put('/:id', teacherOrAdmin, timetableController.updateSlot.bind(timetableController));

// Delete slot (Admin/Teacher)
router.delete('/:id', teacherOrAdmin, timetableController.deleteSlot.bind(timetableController));

// Clear all slots for a section (Admin only)
router.delete('/section/:sectionId/clear', adminOnly, timetableController.clearSectionSlots.bind(timetableController));

// Get all conflicts (Admin only)
router.get('/conflicts', adminOnly, timetableController.getAllConflicts.bind(timetableController));

// Check specific conflict (Admin/Teacher)
router.post('/check-conflicts', teacherOrAdmin, timetableController.checkConflicts.bind(timetableController));

// Export PDF
router.get('/export-pdf', timetableController.exportPDF.bind(timetableController));

// Get master timetable (Admin only)
router.get('/master', adminOnly, timetableController.getMasterTimetable.bind(timetableController));

// Get all rooms
router.get('/rooms', timetableController.getAllRooms.bind(timetableController));

// Get room timetable
router.get('/room', timetableController.getRoomTimetable.bind(timetableController));

// Get all slots with filters (Admin/Teacher)
router.get('/slots', teacherOrAdmin, timetableController.getSlots.bind(timetableController));

module.exports = router;
