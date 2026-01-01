const pool = require('../../config/database');

/**
 * Calendar Service
 * Handles academic calendar events, exam dates, holidays, and event management
 */
class CalendarService {

  // ==================== ADMIN: EVENT MANAGEMENT ====================

  /**
   * Create a calendar event
   * @param {Object} eventData - Event details
   * @returns {Promise<Object>} Created event
   */
  async createEvent(eventData) {
    try {
      const {
        title,
        description,
        event_type, // Exam, Holiday, Academic, Registration, Event, Deadline, Other
        start_date,
        end_date,
        start_time,
        end_time,
        location,
        target_audience, // All, Students, Teachers, Department-Specific
        department_id,
        semester_id,
        is_registration_required,
        registration_deadline,
        max_participants,
        organizer,
        contact_email,
        contact_phone,
        attachment_url,
        color,
        is_recurring,
        recurrence_pattern,
        created_by
      } = eventData;

      // Validate required fields
      if (!title || !event_type || !start_date) {
        throw new Error('Title, event type, and start date are required');
      }

      // Validate event type
      const validTypes = [
        'Exam',
        'Holiday',
        'Academic',
        'Registration',
        'Event',
        'Deadline',
        'Semester Start',
        'Semester End',
        'Other'
      ];

      if (!validTypes.includes(event_type)) {
        throw new Error(`Invalid event type. Must be one of: ${validTypes.join(', ')}`);
      }

      // Validate target audience
      const validAudiences = ['All', 'Students', 'Teachers', 'Department-Specific'];
      const targetAudience = target_audience || 'All';

      if (!validAudiences.includes(targetAudience)) {
        throw new Error(`Invalid target audience. Must be one of: ${validAudiences.join(', ')}`);
      }

      // Validate dates
      const startDate = new Date(start_date);
      const endDate = end_date ? new Date(end_date) : startDate;

      if (endDate < startDate) {
        throw new Error('End date cannot be before start date');
      }

      const query = `
        INSERT INTO calendar_events (
          title, description, event_type, start_date, end_date,
          start_time, end_time, location, target_audience,
          department_id, semester_id, is_registration_required,
          registration_deadline, max_participants, current_participants,
          organizer, contact_email, contact_phone, attachment_url,
          color, is_recurring, recurrence_pattern, status,
          created_by, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
          $14, 0, $15, $16, $17, $18, $19, $20, $21, 'Active', $22, NOW(), NOW()
        ) RETURNING *
      `;

      const values = [
        title,
        description || null,
        event_type,
        start_date,
        end_date || start_date,
        start_time || null,
        end_time || null,
        location || null,
        targetAudience,
        department_id || null,
        semester_id || null,
        is_registration_required || false,
        registration_deadline || null,
        max_participants || null,
        organizer || null,
        contact_email || null,
        contact_phone || null,
        attachment_url || null,
        color || '#3B82F6',
        is_recurring || false,
        recurrence_pattern || null,
        created_by
      ];

      const result = await pool.query(query, values);

      // TODO: Send notifications for the new event
      // await notificationService.sendNewEvent(result.rows[0].id, targetAudience);

      return result.rows[0];

    } catch (error) {
      console.error('Create Event Error:', error);
      throw new Error(error.message || 'Failed to create event');
    }
  }

  /**
   * Get all calendar events with filters (Admin view)
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} List of events
   */
  async getAllEvents(filters = {}) {
    try {
      let query = `
        SELECT 
          ce.*,
          d.name as department_name,
          sem.name as semester_name,
          u.full_name as created_by_name
        FROM calendar_events ce
        LEFT JOIN departments d ON ce.department_id = d.id
        LEFT JOIN semesters sem ON ce.semester_id = sem.id
        LEFT JOIN users u ON ce.created_by = u.id
        WHERE 1=1
      `;

      const values = [];
      let paramCount = 1;

      if (filters.event_type) {
        query += ` AND ce.event_type = $${paramCount}`;
        values.push(filters.event_type);
        paramCount++;
      }

      if (filters.target_audience) {
        query += ` AND ce.target_audience = $${paramCount}`;
        values.push(filters.target_audience);
        paramCount++;
      }

      if (filters.department_id) {
        query += ` AND (ce.department_id = $${paramCount} OR ce.department_id IS NULL)`;
        values.push(filters.department_id);
        paramCount++;
      }

      if (filters.semester_id) {
        query += ` AND (ce.semester_id = $${paramCount} OR ce.semester_id IS NULL)`;
        values.push(filters.semester_id);
        paramCount++;
      }

      if (filters.status) {
        query += ` AND ce.status = $${paramCount}`;
        values.push(filters.status);
        paramCount++;
      }

      if (filters.start_date) {
        query += ` AND ce.start_date >= $${paramCount}`;
        values.push(filters.start_date);
        paramCount++;
      }

      if (filters.end_date) {
        query += ` AND ce.end_date <= $${paramCount}`;
        values.push(filters.end_date);
        paramCount++;
      }

      query += ` ORDER BY ce.start_date ASC, ce.start_time ASC`;

      const result = await pool.query(query, values);
      return result.rows;

    } catch (error) {
      console.error('Get All Events Error:', error);
      throw new Error('Failed to fetch events');
    }
  }

  /**
   * Get event by ID
   * @param {number} eventId
   * @returns {Promise<Object>} Event details
   */
  async getEventById(eventId) {
    try {
      const query = `
        SELECT 
          ce.*,
          d.name as department_name,
          sem.name as semester_name,
          u.full_name as created_by_name,
          (SELECT COUNT(*) FROM event_registrations WHERE event_id = ce.id) as total_registrations
        FROM calendar_events ce
        LEFT JOIN departments d ON ce.department_id = d.id
        LEFT JOIN semesters sem ON ce.semester_id = sem.id
        LEFT JOIN users u ON ce.created_by = u.id
        WHERE ce.id = $1
      `;

      const result = await pool.query(query, [eventId]);

      if (result.rows.length === 0) {
        throw new Error('Event not found');
      }

      return result.rows[0];

    } catch (error) {
      console.error('Get Event By ID Error:', error);
      throw new Error(error.message || 'Failed to fetch event');
    }
  }

  /**
   * Update event
   * @param {number} eventId
   * @param {Object} updateData
   * @returns {Promise<Object>} Updated event
   */
  async updateEvent(eventId, updateData) {
    try {
      // Get existing event
      const existingEvent = await this.getEventById(eventId);

      const {
        title,
        description,
        event_type,
        start_date,
        end_date,
        start_time,
        end_time,
        location,
        target_audience,
        department_id,
        semester_id,
        is_registration_required,
        registration_deadline,
        max_participants,
        organizer,
        contact_email,
        contact_phone,
        attachment_url,
        color,
        status,
        is_recurring,
        recurrence_pattern
      } = updateData;

      // Build update query dynamically
      const updates = [];
      const values = [];
      let paramCount = 1;

      if (title !== undefined) {
        updates.push(`title = $${paramCount}`);
        values.push(title);
        paramCount++;
      }

      if (description !== undefined) {
        updates.push(`description = $${paramCount}`);
        values.push(description);
        paramCount++;
      }

      if (event_type !== undefined) {
        updates.push(`event_type = $${paramCount}`);
        values.push(event_type);
        paramCount++;
      }

      if (start_date !== undefined) {
        updates.push(`start_date = $${paramCount}`);
        values.push(start_date);
        paramCount++;
      }

      if (end_date !== undefined) {
        updates.push(`end_date = $${paramCount}`);
        values.push(end_date);
        paramCount++;
      }

      if (start_time !== undefined) {
        updates.push(`start_time = $${paramCount}`);
        values.push(start_time);
        paramCount++;
      }

      if (end_time !== undefined) {
        updates.push(`end_time = $${paramCount}`);
        values.push(end_time);
        paramCount++;
      }

      if (location !== undefined) {
        updates.push(`location = $${paramCount}`);
        values.push(location);
        paramCount++;
      }

      if (target_audience !== undefined) {
        updates.push(`target_audience = $${paramCount}`);
        values.push(target_audience);
        paramCount++;
      }

      if (department_id !== undefined) {
        updates.push(`department_id = $${paramCount}`);
        values.push(department_id);
        paramCount++;
      }

      if (semester_id !== undefined) {
        updates.push(`semester_id = $${paramCount}`);
        values.push(semester_id);
        paramCount++;
      }

      if (is_registration_required !== undefined) {
        updates.push(`is_registration_required = $${paramCount}`);
        values.push(is_registration_required);
        paramCount++;
      }

      if (registration_deadline !== undefined) {
        updates.push(`registration_deadline = $${paramCount}`);
        values.push(registration_deadline);
        paramCount++;
      }

      if (max_participants !== undefined) {
        updates.push(`max_participants = $${paramCount}`);
        values.push(max_participants);
        paramCount++;
      }

      if (organizer !== undefined) {
        updates.push(`organizer = $${paramCount}`);
        values.push(organizer);
        paramCount++;
      }

      if (contact_email !== undefined) {
        updates.push(`contact_email = $${paramCount}`);
        values.push(contact_email);
        paramCount++;
      }

      if (contact_phone !== undefined) {
        updates.push(`contact_phone = $${paramCount}`);
        values.push(contact_phone);
        paramCount++;
      }

      if (attachment_url !== undefined) {
        updates.push(`attachment_url = $${paramCount}`);
        values.push(attachment_url);
        paramCount++;
      }

      if (color !== undefined) {
        updates.push(`color = $${paramCount}`);
        values.push(color);
        paramCount++;
      }

      if (status !== undefined) {
        updates.push(`status = $${paramCount}`);
        values.push(status);
        paramCount++;
      }

      if (is_recurring !== undefined) {
        updates.push(`is_recurring = $${paramCount}`);
        values.push(is_recurring);
        paramCount++;
      }

      if (recurrence_pattern !== undefined) {
        updates.push(`recurrence_pattern = $${paramCount}`);
        values.push(recurrence_pattern);
        paramCount++;
      }

      if (updates.length === 0) {
        throw new Error('No fields to update');
      }

      updates.push(`updated_at = NOW()`);
      values.push(eventId);

      const query = `
        UPDATE calendar_events
        SET ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await pool.query(query, values);

      return result.rows[0];

    } catch (error) {
      console.error('Update Event Error:', error);
      throw new Error(error.message || 'Failed to update event');
    }
  }

  /**
   * Delete event
   * @param {number} eventId
   * @returns {Promise<Object>} Deletion result
   */
  async deleteEvent(eventId) {
    try {
      // Check if event exists
      await this.getEventById(eventId);

      const query = `DELETE FROM calendar_events WHERE id = $1`;
      await pool.query(query, [eventId]);

      return { message: 'Event deleted successfully' };

    } catch (error) {
      console.error('Delete Event Error:', error);
      throw new Error(error.message || 'Failed to delete event');
    }
  }

  // ==================== USER: CALENDAR ACCESS ====================

  /**
   * Get calendar events for users (with role-based filtering)
   * @param {Object} filters - Filter options
   * @param {string} userRole - User role (student, teacher, admin)
   * @param {number} departmentId - User's department ID
   * @returns {Promise<Array>} Calendar events
   */
  async getCalendarEvents(filters = {}, userRole = null, departmentId = null) {
    try {
      let query = `
        SELECT 
          ce.*,
          d.name as department_name,
          sem.name as semester_name
        FROM calendar_events ce
        LEFT JOIN departments d ON ce.department_id = d.id
        LEFT JOIN semesters sem ON ce.semester_id = sem.id
        WHERE ce.status = 'Active'
      `;

      const values = [];
      let paramCount = 1;

      // Role-based filtering
      if (userRole) {
        if (userRole === 'student') {
          query += ` AND (ce.target_audience IN ('All', 'Students')`;
          if (departmentId) {
            query += ` OR (ce.target_audience = 'Department-Specific' AND (ce.department_id = $${paramCount} OR ce.department_id IS NULL))`;
            values.push(departmentId);
            paramCount++;
          }
          query += `)`;
        } else if (userRole === 'teacher') {
          query += ` AND (ce.target_audience IN ('All', 'Teachers')`;
          if (departmentId) {
            query += ` OR (ce.target_audience = 'Department-Specific' AND (ce.department_id = $${paramCount} OR ce.department_id IS NULL))`;
            values.push(departmentId);
            paramCount++;
          }
          query += `)`;
        }
      }

      if (filters.event_type) {
        query += ` AND ce.event_type = $${paramCount}`;
        values.push(filters.event_type);
        paramCount++;
      }

      if (filters.start_date) {
        query += ` AND ce.start_date >= $${paramCount}`;
        values.push(filters.start_date);
        paramCount++;
      }

      if (filters.end_date) {
        query += ` AND ce.end_date <= $${paramCount}`;
        values.push(filters.end_date);
        paramCount++;
      }

      if (filters.month) {
        // Month view: YYYY-MM
        const [year, month] = filters.month.split('-');
        query += ` AND EXTRACT(YEAR FROM ce.start_date) = $${paramCount}`;
        values.push(parseInt(year));
        paramCount++;
        query += ` AND EXTRACT(MONTH FROM ce.start_date) = $${paramCount}`;
        values.push(parseInt(month));
        paramCount++;
      }

      if (filters.year) {
        query += ` AND EXTRACT(YEAR FROM ce.start_date) = $${paramCount}`;
        values.push(parseInt(filters.year));
        paramCount++;
      }

      query += ` ORDER BY ce.start_date ASC, ce.start_time ASC`;

      const result = await pool.query(query, values);
      return result.rows;

    } catch (error) {
      console.error('Get Calendar Events Error:', error);
      throw new Error('Failed to fetch calendar events');
    }
  }

  /**
   * Get upcoming events
   * @param {string} userRole - User role
   * @param {number} departmentId - User's department ID
   * @param {number} limit - Number of events to return
   * @returns {Promise<Array>} Upcoming events
   */
  async getUpcomingEvents(userRole = null, departmentId = null, limit = 10) {
    try {
      let query = `
        SELECT 
          ce.*,
          d.name as department_name,
          sem.name as semester_name
        FROM calendar_events ce
        LEFT JOIN departments d ON ce.department_id = d.id
        LEFT JOIN semesters sem ON ce.semester_id = sem.id
        WHERE ce.status = 'Active'
          AND ce.start_date >= CURRENT_DATE
      `;

      const values = [];
      let paramCount = 1;

      // Role-based filtering
      if (userRole) {
        if (userRole === 'student') {
          query += ` AND (ce.target_audience IN ('All', 'Students')`;
          if (departmentId) {
            query += ` OR (ce.target_audience = 'Department-Specific' AND (ce.department_id = $${paramCount} OR ce.department_id IS NULL))`;
            values.push(departmentId);
            paramCount++;
          }
          query += `)`;
        } else if (userRole === 'teacher') {
          query += ` AND (ce.target_audience IN ('All', 'Teachers')`;
          if (departmentId) {
            query += ` OR (ce.target_audience = 'Department-Specific' AND (ce.department_id = $${paramCount} OR ce.department_id IS NULL))`;
            values.push(departmentId);
            paramCount++;
          }
          query += `)`;
        }
      }

      query += ` ORDER BY ce.start_date ASC, ce.start_time ASC LIMIT $${paramCount}`;
      values.push(limit);

      const result = await pool.query(query, values);
      return result.rows;

    } catch (error) {
      console.error('Get Upcoming Events Error:', error);
      throw new Error('Failed to fetch upcoming events');
    }
  }

  /**
   * Get events for a specific date range (Week/Month view)
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @param {string} userRole - User role
   * @param {number} departmentId - User's department ID
   * @returns {Promise<Array>} Events in date range
   */
  async getEventsByDateRange(startDate, endDate, userRole = null, departmentId = null) {
    try {
      const filters = {
        start_date: startDate,
        end_date: endDate
      };

      return await this.getCalendarEvents(filters, userRole, departmentId);

    } catch (error) {
      console.error('Get Events By Date Range Error:', error);
      throw new Error('Failed to fetch events for date range');
    }
  }

  /**
   * Export calendar in iCalendar format
   * @param {string} userRole - User role
   * @param {number} departmentId - User's department ID
   * @returns {Promise<string>} iCalendar format string
   */
  async exportCalendar(userRole = null, departmentId = null) {
    try {
      const events = await this.getCalendarEvents({}, userRole, departmentId);

      // Generate iCalendar format
      let ical = 'BEGIN:VCALENDAR\r\n';
      ical += 'VERSION:2.0\r\n';
      ical += 'PRODID:-//Government College Larkana//Academic Calendar//EN\r\n';
      ical += 'CALSCALE:GREGORIAN\r\n';
      ical += 'METHOD:PUBLISH\r\n';
      ical += 'X-WR-CALNAME:Academic Calendar\r\n';
      ical += 'X-WR-TIMEZONE:Asia/Karachi\r\n';

      events.forEach(event => {
        const startDate = new Date(event.start_date);
        const endDate = event.end_date ? new Date(event.end_date) : startDate;

        // Format dates for iCalendar (YYYYMMDD)
        const formatDate = (date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}${month}${day}`;
        };

        ical += 'BEGIN:VEVENT\r\n';
        ical += `UID:${event.id}@govtcollegelarkana.edu.pk\r\n`;
        ical += `DTSTAMP:${formatDate(new Date())}T000000Z\r\n`;
        ical += `DTSTART:${formatDate(startDate)}${event.start_time ? 'T' + event.start_time.replace(/:/g, '') + '00' : ''}\r\n`;
        ical += `DTEND:${formatDate(endDate)}${event.end_time ? 'T' + event.end_time.replace(/:/g, '') + '00' : ''}\r\n`;
        ical += `SUMMARY:${event.title}\r\n`;
        
        if (event.description) {
          ical += `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}\r\n`;
        }
        
        if (event.location) {
          ical += `LOCATION:${event.location}\r\n`;
        }

        ical += `CATEGORIES:${event.event_type}\r\n`;
        ical += `STATUS:CONFIRMED\r\n`;
        ical += 'END:VEVENT\r\n';
      });

      ical += 'END:VCALENDAR\r\n';

      return ical;

    } catch (error) {
      console.error('Export Calendar Error:', error);
      throw new Error('Failed to export calendar');
    }
  }

  // ==================== EVENT REGISTRATION ====================

  /**
   * Register for an event
   * @param {number} eventId
   * @param {number} userId
   * @param {string} userType - student, teacher, other
   * @returns {Promise<Object>} Registration result
   */
  async registerForEvent(eventId, userId, userType) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get event details
      const eventQuery = `
        SELECT * FROM calendar_events 
        WHERE id = $1 AND status = 'Active'
        FOR UPDATE
      `;
      const eventResult = await client.query(eventQuery, [eventId]);

      if (eventResult.rows.length === 0) {
        throw new Error('Event not found or not active');
      }

      const event = eventResult.rows[0];

      // Check if registration is required
      if (!event.is_registration_required) {
        throw new Error('Registration is not required for this event');
      }

      // Check registration deadline
      if (event.registration_deadline && new Date(event.registration_deadline) < new Date()) {
        throw new Error('Registration deadline has passed');
      }

      // Check if already registered
      const checkQuery = `
        SELECT * FROM event_registrations 
        WHERE event_id = $1 AND user_id = $2 AND user_type = $3
      `;
      const checkResult = await client.query(checkQuery, [eventId, userId, userType]);

      if (checkResult.rows.length > 0) {
        throw new Error('You have already registered for this event');
      }

      // Check maximum participants
      if (event.max_participants && event.current_participants >= event.max_participants) {
        throw new Error('Event is full. Maximum participants reached.');
      }

      // Create registration
      const insertQuery = `
        INSERT INTO event_registrations (
          event_id, user_id, user_type, registration_date, status
        ) VALUES ($1, $2, $3, NOW(), 'Confirmed')
        RETURNING *
      `;

      const result = await client.query(insertQuery, [eventId, userId, userType]);

      // Update current participants count
      await client.query(
        `UPDATE calendar_events SET current_participants = current_participants + 1 WHERE id = $1`,
        [eventId]
      );

      await client.query('COMMIT');

      // TODO: Send registration confirmation
      // await notificationService.sendEventRegistrationConfirmation(userId, eventId);

      return {
        message: 'Successfully registered for the event',
        registration: result.rows[0]
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Register For Event Error:', error);
      throw new Error(error.message || 'Failed to register for event');
    } finally {
      client.release();
    }
  }

  /**
   * Get calendar statistics
   * @returns {Promise<Object>} Statistics
   */
  async getCalendarStatistics() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_events,
          COUNT(CASE WHEN event_type = 'Exam' THEN 1 END) as exams,
          COUNT(CASE WHEN event_type = 'Holiday' THEN 1 END) as holidays,
          COUNT(CASE WHEN event_type = 'Academic' THEN 1 END) as academic_events,
          COUNT(CASE WHEN event_type = 'Event' THEN 1 END) as general_events,
          COUNT(CASE WHEN start_date >= CURRENT_DATE THEN 1 END) as upcoming_events,
          COUNT(CASE WHEN is_registration_required = true THEN 1 END) as events_with_registration,
          SUM(current_participants) as total_registrations
        FROM calendar_events
        WHERE status = 'Active'
      `;

      const result = await pool.query(query);
      return result.rows[0];

    } catch (error) {
      console.error('Get Calendar Statistics Error:', error);
      throw new Error('Failed to fetch calendar statistics');
    }
  }
}

module.exports = new CalendarService();
