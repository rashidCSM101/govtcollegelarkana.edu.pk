const express = require('express');
const router = express.Router();
const calendarController = require('../modules/calendar/calendar.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

// ==================== PUBLIC CALENDAR ROUTES ====================

// Get calendar events (supports filters and role-based access)
router.get('/', authMiddleware, calendarController.getCalendar.bind(calendarController));

// Get upcoming events
router.get('/upcoming', authMiddleware, calendarController.getUpcomingEvents.bind(calendarController));

// Get events by date range (week/month view)
router.get('/range', authMiddleware, calendarController.getEventsByDateRange.bind(calendarController));

// Export calendar in iCalendar format
router.get('/export', authMiddleware, calendarController.exportCalendar.bind(calendarController));

// Get event details
router.get('/events/:id', authMiddleware, calendarController.getEventDetails.bind(calendarController));

// Register for event
router.post('/events/:id/register', authMiddleware, calendarController.registerForEvent.bind(calendarController));

module.exports = router;
