const pool = require('../../config/database');

/**
 * Complaint Service
 * Handles complaint submission, tracking, assignment, and resolution
 */
class ComplaintService {

  // ==================== STUDENT: COMPLAINT SUBMISSION ====================

  /**
   * Generate unique complaint ticket number
   * @returns {Promise<string>} Ticket number
   */
  async generateTicketNumber() {
    try {
      const year = new Date().getFullYear();
      const prefix = 'CMP';

      // Get the count of complaints this year
      const query = `
        SELECT COUNT(*) as count 
        FROM complaints 
        WHERE EXTRACT(YEAR FROM created_at) = $1
      `;
      const result = await pool.query(query, [year]);
      const count = parseInt(result.rows[0].count) + 1;

      // Format: CMP/2026/00001
      const ticketNumber = `${prefix}/${year}/${count.toString().padStart(5, '0')}`;
      return ticketNumber;

    } catch (error) {
      console.error('Generate Ticket Number Error:', error);
      throw new Error('Failed to generate ticket number');
    }
  }

  /**
   * Submit a new complaint
   * @param {number} studentId
   * @param {Object} complaintData
   * @returns {Promise<Object>} Created complaint
   */
  async submitComplaint(studentId, complaintData) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const {
        category,
        subject,
        description,
        priority,
        attachment_path,
        attachment_name
      } = complaintData;

      // Validate required fields
      if (!category || !subject || !description) {
        throw new Error('Category, subject, and description are required');
      }

      // Validate category
      const validCategories = [
        'Academic',
        'Fee',
        'Facility',
        'Examination',
        'Library',
        'Hostel',
        'Transport',
        'Harassment',
        'Other'
      ];

      if (!validCategories.includes(category)) {
        throw new Error(`Invalid category. Must be one of: ${validCategories.join(', ')}`);
      }

      // Validate priority
      const validPriorities = ['Low', 'Medium', 'High', 'Urgent'];
      const complaintPriority = priority || 'Medium';

      if (!validPriorities.includes(complaintPriority)) {
        throw new Error(`Invalid priority. Must be one of: ${validPriorities.join(', ')}`);
      }

      // Generate ticket number
      const ticketNumber = await this.generateTicketNumber();

      // Create complaint
      const insertQuery = `
        INSERT INTO complaints (
          ticket_number, student_id, category, subject,
          description, priority, status, attachment_path,
          attachment_name, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING *
      `;

      const values = [
        ticketNumber,
        studentId,
        category,
        subject,
        description,
        complaintPriority,
        'Pending',
        attachment_path || null,
        attachment_name || null
      ];

      const result = await client.query(insertQuery, values);
      const complaint = result.rows[0];

      // Create initial status log
      const logQuery = `
        INSERT INTO complaint_logs (
          complaint_id, action, status, remarks,
          created_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
      `;

      await client.query(logQuery, [
        complaint.id,
        'Created',
        'Pending',
        'Complaint submitted',
        studentId
      ]);

      await client.query('COMMIT');

      // TODO: Send notification to admin about new complaint
      // await notificationService.sendNewComplaint(complaint.id, category, priority);

      return complaint;

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Submit Complaint Error:', error);
      throw new Error(error.message || 'Failed to submit complaint');
    } finally {
      client.release();
    }
  }

  /**
   * Get student complaints
   * @param {number} studentId
   * @param {Object} filters
   * @returns {Promise<Array>} Student complaints
   */
  async getStudentComplaints(studentId, filters = {}) {
    try {
      let query = `
        SELECT 
          c.*,
          d.name as assigned_department_name,
          u.full_name as assigned_to_name,
          (SELECT COUNT(*) FROM complaint_logs WHERE complaint_id = c.id) as log_count
        FROM complaints c
        LEFT JOIN departments d ON c.assigned_department = d.id
        LEFT JOIN users u ON c.assigned_to = u.id
        WHERE c.student_id = $1
      `;

      const values = [studentId];
      let paramCount = 2;

      if (filters.category) {
        query += ` AND c.category = $${paramCount}`;
        values.push(filters.category);
        paramCount++;
      }

      if (filters.status) {
        query += ` AND c.status = $${paramCount}`;
        values.push(filters.status);
        paramCount++;
      }

      if (filters.priority) {
        query += ` AND c.priority = $${paramCount}`;
        values.push(filters.priority);
        paramCount++;
      }

      query += ` ORDER BY c.created_at DESC`;

      const result = await pool.query(query, values);
      return result.rows;

    } catch (error) {
      console.error('Get Student Complaints Error:', error);
      throw new Error('Failed to fetch complaints');
    }
  }

  /**
   * Get complaint by ID (Student view)
   * @param {number} complaintId
   * @param {number} studentId
   * @returns {Promise<Object>} Complaint details
   */
  async getComplaintById(complaintId, studentId) {
    try {
      const query = `
        SELECT 
          c.*,
          s.name as student_name,
          s.registration_number,
          s.email as student_email,
          s.phone as student_phone,
          d.name as assigned_department_name,
          u.full_name as assigned_to_name,
          u.email as assigned_to_email
        FROM complaints c
        INNER JOIN students s ON c.student_id = s.id
        LEFT JOIN departments d ON c.assigned_department = d.id
        LEFT JOIN users u ON c.assigned_to = u.id
        WHERE c.id = $1 AND c.student_id = $2
      `;

      const result = await pool.query(query, [complaintId, studentId]);

      if (result.rows.length === 0) {
        throw new Error('Complaint not found');
      }

      const complaint = result.rows[0];

      // Get complaint logs (communication thread)
      const logsQuery = `
        SELECT 
          cl.*,
          u.full_name as created_by_name,
          u.role as created_by_role
        FROM complaint_logs cl
        LEFT JOIN users u ON cl.created_by = u.id
        ORDER BY cl.created_at ASC
      `;

      const logsResult = await pool.query(logsQuery.replace('ORDER BY', 'WHERE cl.complaint_id = $1 ORDER BY'), [complaintId]);

      complaint.logs = logsResult.rows;

      return complaint;

    } catch (error) {
      console.error('Get Complaint By ID Error:', error);
      throw new Error(error.message || 'Failed to fetch complaint');
    }
  }

  /**
   * Add comment to complaint
   * @param {number} complaintId
   * @param {number} userId
   * @param {string} comment
   * @returns {Promise<Object>} Added comment
   */
  async addComment(complaintId, userId, comment) {
    try {
      if (!comment) {
        throw new Error('Comment is required');
      }

      const query = `
        INSERT INTO complaint_logs (
          complaint_id, action, remarks, created_by, created_at
        ) VALUES ($1, $2, $3, $4, NOW())
        RETURNING *
      `;

      const result = await pool.query(query, [
        complaintId,
        'Comment',
        comment,
        userId
      ]);

      // Update complaint updated_at
      await pool.query(
        'UPDATE complaints SET updated_at = NOW() WHERE id = $1',
        [complaintId]
      );

      // TODO: Send notification to student about new comment
      // await notificationService.sendComplaintComment(complaintId, userId);

      return result.rows[0];

    } catch (error) {
      console.error('Add Comment Error:', error);
      throw new Error(error.message || 'Failed to add comment');
    }
  }

  // ==================== ADMIN: COMPLAINT MANAGEMENT ====================

  /**
   * Get all complaints (Admin view)
   * @param {Object} filters
   * @param {number} page
   * @param {number} limit
   * @returns {Promise<Object>} Complaints with pagination
   */
  async getAllComplaints(filters = {}, page = 1, limit = 20) {
    try {
      let query = `
        SELECT 
          c.*,
          s.name as student_name,
          s.registration_number,
          s.email as student_email,
          s.phone as student_phone,
          sd.name as student_department,
          d.name as assigned_department_name,
          u.full_name as assigned_to_name,
          (SELECT COUNT(*) FROM complaint_logs WHERE complaint_id = c.id) as log_count
        FROM complaints c
        INNER JOIN students s ON c.student_id = s.id
        LEFT JOIN departments sd ON s.department_id = sd.id
        LEFT JOIN departments d ON c.assigned_department = d.id
        LEFT JOIN users u ON c.assigned_to = u.id
        WHERE 1=1
      `;

      const values = [];
      let paramCount = 1;

      if (filters.category) {
        query += ` AND c.category = $${paramCount}`;
        values.push(filters.category);
        paramCount++;
      }

      if (filters.status) {
        query += ` AND c.status = $${paramCount}`;
        values.push(filters.status);
        paramCount++;
      }

      if (filters.priority) {
        query += ` AND c.priority = $${paramCount}`;
        values.push(filters.priority);
        paramCount++;
      }

      if (filters.assigned_department) {
        query += ` AND c.assigned_department = $${paramCount}`;
        values.push(filters.assigned_department);
        paramCount++;
      }

      if (filters.assigned_to) {
        query += ` AND c.assigned_to = $${paramCount}`;
        values.push(filters.assigned_to);
        paramCount++;
      }

      if (filters.student_id) {
        query += ` AND c.student_id = $${paramCount}`;
        values.push(filters.student_id);
        paramCount++;
      }

      if (filters.search) {
        query += ` AND (
          c.ticket_number ILIKE $${paramCount} OR
          c.subject ILIKE $${paramCount} OR
          c.description ILIKE $${paramCount} OR
          s.name ILIKE $${paramCount} OR
          s.registration_number ILIKE $${paramCount}
        )`;
        values.push(`%${filters.search}%`);
        paramCount++;
      }

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM (${query}) as count_query`;
      const countResult = await pool.query(countQuery, values);
      const total = parseInt(countResult.rows[0].total);

      // Add pagination
      const offset = (page - 1) * limit;
      query += ` ORDER BY c.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      values.push(limit, offset);

      const result = await pool.query(query, values);

      return {
        complaints: result.rows,
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      console.error('Get All Complaints Error:', error);
      throw new Error('Failed to fetch complaints');
    }
  }

  /**
   * Get complaint by ID (Admin view)
   * @param {number} complaintId
   * @returns {Promise<Object>} Complaint details
   */
  async getComplaintByIdAdmin(complaintId) {
    try {
      const query = `
        SELECT 
          c.*,
          s.name as student_name,
          s.registration_number,
          s.email as student_email,
          s.phone as student_phone,
          sd.name as student_department,
          d.name as assigned_department_name,
          u.full_name as assigned_to_name,
          u.email as assigned_to_email
        FROM complaints c
        INNER JOIN students s ON c.student_id = s.id
        LEFT JOIN departments sd ON s.department_id = sd.id
        LEFT JOIN departments d ON c.assigned_department = d.id
        LEFT JOIN users u ON c.assigned_to = u.id
        WHERE c.id = $1
      `;

      const result = await pool.query(query, [complaintId]);

      if (result.rows.length === 0) {
        throw new Error('Complaint not found');
      }

      const complaint = result.rows[0];

      // Get complaint logs
      const logsQuery = `
        SELECT 
          cl.*,
          u.full_name as created_by_name,
          u.role as created_by_role
        FROM complaint_logs cl
        LEFT JOIN users u ON cl.created_by = u.id
        WHERE cl.complaint_id = $1
        ORDER BY cl.created_at ASC
      `;

      const logsResult = await pool.query(logsQuery, [complaintId]);
      complaint.logs = logsResult.rows;

      return complaint;

    } catch (error) {
      console.error('Get Complaint By ID Admin Error:', error);
      throw new Error(error.message || 'Failed to fetch complaint');
    }
  }

  /**
   * Assign complaint to department/person
   * @param {number} complaintId
   * @param {number} assignedBy
   * @param {Object} assignmentData
   * @returns {Promise<Object>} Assignment result
   */
  async assignComplaint(complaintId, assignedBy, assignmentData) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const { assigned_department, assigned_to, remarks } = assignmentData;

      if (!assigned_department && !assigned_to) {
        throw new Error('Either department or person must be assigned');
      }

      // Get complaint
      const complaintQuery = `SELECT * FROM complaints WHERE id = $1`;
      const complaintResult = await client.query(complaintQuery, [complaintId]);

      if (complaintResult.rows.length === 0) {
        throw new Error('Complaint not found');
      }

      const complaint = complaintResult.rows[0];

      // Update complaint
      const updateQuery = `
        UPDATE complaints
        SET assigned_department = $1,
            assigned_to = $2,
            status = CASE 
              WHEN status = 'Pending' THEN 'In Progress'
              ELSE status
            END,
            updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `;

      const result = await client.query(updateQuery, [
        assigned_department || null,
        assigned_to || null,
        complaintId
      ]);

      // Create log entry
      const logQuery = `
        INSERT INTO complaint_logs (
          complaint_id, action, status, remarks, created_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
      `;

      await client.query(logQuery, [
        complaintId,
        'Assigned',
        result.rows[0].status,
        remarks || 'Complaint assigned for review',
        assignedBy
      ]);

      await client.query('COMMIT');

      // TODO: Send notification to assigned person/department
      // TODO: Send notification to student about assignment
      // await notificationService.sendComplaintAssigned(complaint.student_id, complaintId);

      return {
        message: 'Complaint assigned successfully',
        complaint: result.rows[0]
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Assign Complaint Error:', error);
      throw new Error(error.message || 'Failed to assign complaint');
    } finally {
      client.release();
    }
  }

  /**
   * Update complaint status
   * @param {number} complaintId
   * @param {number} updatedBy
   * @param {string} status
   * @param {string} remarks
   * @returns {Promise<Object>} Update result
   */
  async updateStatus(complaintId, updatedBy, status, remarks = '') {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Validate status
      const validStatuses = ['Pending', 'In Progress', 'Resolved', 'Closed', 'Rejected'];
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }

      // Get complaint
      const complaintQuery = `SELECT * FROM complaints WHERE id = $1`;
      const complaintResult = await client.query(complaintQuery, [complaintId]);

      if (complaintResult.rows.length === 0) {
        throw new Error('Complaint not found');
      }

      const complaint = complaintResult.rows[0];
      const oldStatus = complaint.status;

      // Update complaint status
      const updateQuery = `
        UPDATE complaints
        SET status = $1,
            resolved_at = CASE WHEN $1 IN ('Resolved', 'Closed') THEN NOW() ELSE resolved_at END,
            resolved_by = CASE WHEN $1 IN ('Resolved', 'Closed') THEN $2 ELSE resolved_by END,
            updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `;

      const result = await client.query(updateQuery, [status, updatedBy, complaintId]);

      // Create log entry
      const logQuery = `
        INSERT INTO complaint_logs (
          complaint_id, action, status, remarks, created_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
      `;

      await client.query(logQuery, [
        complaintId,
        'Status Updated',
        status,
        remarks || `Status changed from ${oldStatus} to ${status}`,
        updatedBy
      ]);

      await client.query('COMMIT');

      // TODO: Send notification to student about status change
      // await notificationService.sendComplaintStatusUpdate(complaint.student_id, complaintId, status);

      return {
        message: 'Complaint status updated successfully',
        complaint: result.rows[0]
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Update Status Error:', error);
      throw new Error(error.message || 'Failed to update status');
    } finally {
      client.release();
    }
  }

  /**
   * Resolve complaint
   * @param {number} complaintId
   * @param {number} resolvedBy
   * @param {string} resolution
   * @returns {Promise<Object>} Resolution result
   */
  async resolveComplaint(complaintId, resolvedBy, resolution) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      if (!resolution) {
        throw new Error('Resolution details are required');
      }

      // Get complaint
      const complaintQuery = `SELECT * FROM complaints WHERE id = $1`;
      const complaintResult = await client.query(complaintQuery, [complaintId]);

      if (complaintResult.rows.length === 0) {
        throw new Error('Complaint not found');
      }

      const complaint = complaintResult.rows[0];

      if (complaint.status === 'Resolved' || complaint.status === 'Closed') {
        throw new Error('Complaint is already resolved/closed');
      }

      // Update complaint
      const updateQuery = `
        UPDATE complaints
        SET status = 'Resolved',
            resolution = $1,
            resolved_at = NOW(),
            resolved_by = $2,
            updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `;

      const result = await client.query(updateQuery, [resolution, resolvedBy, complaintId]);

      // Create log entry
      const logQuery = `
        INSERT INTO complaint_logs (
          complaint_id, action, status, remarks, created_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
      `;

      await client.query(logQuery, [
        complaintId,
        'Resolved',
        'Resolved',
        resolution,
        resolvedBy
      ]);

      await client.query('COMMIT');

      // TODO: Send resolution notification to student
      // await notificationService.sendComplaintResolved(complaint.student_id, complaintId, resolution);

      return {
        message: 'Complaint resolved successfully',
        complaint: result.rows[0]
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Resolve Complaint Error:', error);
      throw new Error(error.message || 'Failed to resolve complaint');
    } finally {
      client.release();
    }
  }

  /**
   * Get complaint statistics
   * @returns {Promise<Object>} Statistics
   */
  async getComplaintStatistics() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_complaints,
          COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'In Progress' THEN 1 END) as in_progress,
          COUNT(CASE WHEN status = 'Resolved' THEN 1 END) as resolved,
          COUNT(CASE WHEN status = 'Closed' THEN 1 END) as closed,
          COUNT(CASE WHEN status = 'Rejected' THEN 1 END) as rejected,
          COUNT(CASE WHEN priority = 'Urgent' THEN 1 END) as urgent,
          COUNT(CASE WHEN priority = 'High' THEN 1 END) as high_priority,
          AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/86400)::numeric(10,2) as avg_resolution_days
        FROM complaints
      `;

      const result = await pool.query(query);

      // Get category-wise statistics
      const categoryQuery = `
        SELECT 
          category,
          COUNT(*) as count,
          COUNT(CASE WHEN status = 'Resolved' THEN 1 END) as resolved_count
        FROM complaints
        GROUP BY category
        ORDER BY count DESC
      `;

      const categoryResult = await pool.query(categoryQuery);

      // Get recent complaints
      const recentQuery = `
        SELECT 
          c.*,
          s.name as student_name,
          s.registration_number
        FROM complaints c
        INNER JOIN students s ON c.student_id = s.id
        ORDER BY c.created_at DESC
        LIMIT 10
      `;

      const recentResult = await pool.query(recentQuery);

      return {
        overall: result.rows[0],
        by_category: categoryResult.rows,
        recent_complaints: recentResult.rows
      };

    } catch (error) {
      console.error('Get Complaint Statistics Error:', error);
      throw new Error('Failed to fetch complaint statistics');
    }
  }
}

module.exports = new ComplaintService();
