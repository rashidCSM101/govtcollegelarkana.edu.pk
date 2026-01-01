const calendarService = require('./calendar.service');

class CalendarController {

  // ==================== ADMIN ENDPOINTS ====================

  /**
   * Create calendar event
   * POST /api/admin/calendar/events
   */
  async createEvent(req, res) {
    try {
      const adminId = req.user.id;
      const eventData = {
        ...req.body,
        created_by: adminId
      };

      const event = await calendarService.createEvent(eventData);

      res.status(201).json({
        success: true,
        message: 'Event created successfully',
        data: event
      });

    } catch (error) {
      console.error('Create Event Error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create event'
      });
    }
  }

  /**
   * Get all events (Admin view)
   * GET /api/admin/calendar/events
   */
  async getAllEvents(req, res) {
    try {
      const {
        event_type,
        target_audience,
        department_id,
        semester_id,
        status,
        start_date,
        end_date
      } = req.query;

      const filters = {};
      if (event_type) filters.event_type = event_type;
      if (target_audience) filters.target_audience = target_audience;
      if (department_id) filters.department_id = parseInt(department_id);
      if (semester_id) filters.semester_id = parseInt(semester_id);
      if (status) filters.status = status;
      if (start_date) filters.start_date = start_date;
      if (end_date) filters.end_date = end_date;

      const events = await calendarService.getAllEvents(filters);

      res.json({
        success: true,
        data: events,
        total: events.length
      });

    } catch (error) {
      console.error('Get All Events Error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch events'
      });
    }
  }

  /**
   * Get event by ID
   * GET /api/admin/calendar/events/:id
   */
  async getEventById(req, res) {
    try {
      const eventId = parseInt(req.params.id);

      const event = await calendarService.getEventById(eventId);

      res.json({
        success: true,
        data: event
      });

    } catch (error) {
      console.error('Get Event By ID Error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to fetch event'
      });
    }
  }

  /**
   * Update event
   * PUT /api/admin/calendar/events/:id
   */
  async updateEvent(req, res) {
    try {
      const eventId = parseInt(req.params.id);
      const updateData = req.body;

      const event = await calendarService.updateEvent(eventId, updateData);

      res.json({
        success: true,
        message: 'Event updated successfully',
        data: event
      });

    } catch (error) {
      console.error('Update Event Error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update event'
      });
    }
  }

  /**
   * Delete event
   * DELETE /api/admin/calendar/events/:id
   */
  async deleteEvent(req, res) {
    try {
      const eventId = parseInt(req.params.id);

      const result = await calendarService.deleteEvent(eventId);

      res.json({
        success: true,
        message: result.message
      });

    } catch (error) {
      console.error('Delete Event Error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to delete event'
      });
    }
  }

  /**
   * Get calendar statistics
   * GET /api/admin/calendar/statistics
   */
  async getStatistics(req, res) {
    try {
      const stats = await calendarService.getCalendarStatistics();

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Get Calendar Statistics Error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch statistics'
      });
    }
  }

  // ==================== USER ENDPOINTS ====================

  /**
   * Get calendar events (User view with role-based filtering)
   * GET /api/calendar
   */
  async getCalendar(req, res) {
    try {
      const {
        event_type,
        start_date,
        end_date,
        month,
        year
      } = req.query;

      const filters = {};
      if (event_type) filters.event_type = event_type;
      if (start_date) filters.start_date = start_date;
      if (end_date) filters.end_date = end_date;
      if (month) filters.month = month; // Format: YYYY-MM
      if (year) filters.year = year;

      // Get user role and department from authenticated user
      const userRole = req.user ? req.user.role : null;
      const departmentId = req.user ? req.user.department_id : null;

      const events = await calendarService.getCalendarEvents(filters, userRole, departmentId);

      res.json({
        success: true,
        data: events,
        total: events.length
      });

    } catch (error) {
      console.error('Get Calendar Error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch calendar'
      });
    }
  }

  /**
   * Get upcoming events
   * GET /api/calendar/upcoming
   */
  async getUpcomingEvents(req, res) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit) : 10;

      const userRole = req.user ? req.user.role : null;
      const departmentId = req.user ? req.user.department_id : null;

      const events = await calendarService.getUpcomingEvents(userRole, departmentId, limit);

      res.json({
        success: true,
        data: events,
        total: events.length
      });

    } catch (error) {
      console.error('Get Upcoming Events Error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch upcoming events'
      });
    }
  }

  /**
   * Get events by date range (Week/Month view)
   * GET /api/calendar/range
   */
  async getEventsByDateRange(req, res) {
    try {
      const { start_date, end_date } = req.query;

      if (!start_date || !end_date) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required'
        });
      }

      const userRole = req.user ? req.user.role : null;
      const departmentId = req.user ? req.user.department_id : null;

      const events = await calendarService.getEventsByDateRange(
        start_date,
        end_date,
        userRole,
        departmentId
      );

      res.json({
        success: true,
        data: events,
        total: events.length
      });

    } catch (error) {
      console.error('Get Events By Date Range Error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to fetch events'
      });
    }
  }

  /**
   * Export calendar in iCalendar format
   * GET /api/calendar/export
   */
  async exportCalendar(req, res) {
    try {
      const userRole = req.user ? req.user.role : null;
      const departmentId = req.user ? req.user.department_id : null;

      const icalContent = await calendarService.exportCalendar(userRole, departmentId);

      // Set headers for file download
      res.setHeader('Content-Type', 'text/calendar');
      res.setHeader('Content-Disposition', 'attachment; filename="academic-calendar.ics"');
      res.send(icalContent);

    } catch (error) {
      console.error('Export Calendar Error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to export calendar'
      });
    }
  }

  /**
   * Get event details
   * GET /api/calendar/events/:id
   */
  async getEventDetails(req, res) {
    try {
      const eventId = parseInt(req.params.id);

      const event = await calendarService.getEventById(eventId);

      res.json({
        success: true,
        data: event
      });

    } catch (error) {
      console.error('Get Event Details Error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to fetch event details'
      });
    }
  }

  /**
   * Register for event
   * POST /api/calendar/events/:id/register
   */
  async registerForEvent(req, res) {
    try {
      const eventId = parseInt(req.params.id);
      const userId = req.user.id;
      const userType = req.user.role; // student, teacher, admin

      const result = await calendarService.registerForEvent(eventId, userId, userType);

      res.json({
        success: true,
        message: result.message,
        data: result.registration
      });

    } catch (error) {
      console.error('Register For Event Error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to register for event'
      });
    }
  }
}

module.exports = new CalendarController();
