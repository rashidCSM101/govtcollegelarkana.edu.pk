const pool = require('../../config/database');
const fs = require('fs');
const path = require('path');

class NoticeService {
  // ==================== NOTICE MANAGEMENT (ADMIN/TEACHER) ====================

  /**
   * Create notice
   * @param {string} title - Notice title
   * @param {string} content - Notice content
   * @param {string} noticeType - Type (Academic, Examination, Event, Holiday, General, Announcement)
   * @param {string} priority - Priority (Normal, Important, Urgent)
   * @param {string} targetAudience - Target (All, Students, Teachers, Department)
   * @param {object} targetFilters - Additional filters (department_id, semester_id, program_id)
   * @param {array} attachments - File attachments
   * @param {date} expiryDate - Expiry date
   * @param {string} status - Status (Draft, Published, Archived)
   * @param {boolean} isPinned - Pin to top
   * @param {number} createdBy - Admin/Teacher ID
   * @param {string} createdByRole - Role (admin/teacher)
   */
  async createNotice(title, content, noticeType, priority, targetAudience, targetFilters, attachments, expiryDate, status, isPinned, createdBy, createdByRole) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Validate notice type
      const validTypes = ['Academic', 'Examination', 'Event', 'Holiday', 'General', 'Announcement'];
      if (!validTypes.includes(noticeType)) {
        throw new Error('Invalid notice type');
      }

      // Validate priority
      const validPriorities = ['Normal', 'Important', 'Urgent'];
      if (!validPriorities.includes(priority)) {
        throw new Error('Invalid priority level');
      }

      // Validate target audience
      const validTargets = ['All', 'Students', 'Teachers', 'Department'];
      if (!validTargets.includes(targetAudience)) {
        throw new Error('Invalid target audience');
      }

      // Validate status
      const validStatuses = ['Draft', 'Published', 'Archived'];
      if (!validStatuses.includes(status)) {
        throw new Error('Invalid status');
      }

      // Validate expiry date if provided
      if (expiryDate) {
        const expiry = new Date(expiryDate);
        const now = new Date();
        if (expiry <= now) {
          throw new Error('Expiry date must be in the future');
        }
      }

      // Insert notice
      const noticeResult = await client.query(
        `INSERT INTO notices (
          title, content, notice_type, priority, 
          target_audience, target_filters, attachments,
          expiry_date, status, is_pinned,
          created_by, created_by_role, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
        RETURNING *`,
        [
          title,
          content,
          noticeType,
          priority,
          targetAudience,
          JSON.stringify(targetFilters || {}),
          JSON.stringify(attachments || []),
          expiryDate,
          status,
          isPinned || false,
          createdBy,
          createdByRole
        ]
      );

      await client.query('COMMIT');

      const notice = noticeResult.rows[0];
      return {
        ...notice,
        target_filters: JSON.parse(notice.target_filters),
        attachments: JSON.parse(notice.attachments)
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all notices (Admin view with filters)
   * @param {object} filters - Filters
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   */
  async getAllNoticesAdmin(filters = {}, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    let conditions = [];
    let params = [];
    let paramIndex = 1;

    if (filters.notice_type) {
      conditions.push(`n.notice_type = $${paramIndex}`);
      params.push(filters.notice_type);
      paramIndex++;
    }

    if (filters.priority) {
      conditions.push(`n.priority = $${paramIndex}`);
      params.push(filters.priority);
      paramIndex++;
    }

    if (filters.status) {
      conditions.push(`n.status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.target_audience) {
      conditions.push(`n.target_audience = $${paramIndex}`);
      params.push(filters.target_audience);
      paramIndex++;
    }

    if (filters.is_pinned !== undefined) {
      conditions.push(`n.is_pinned = $${paramIndex}`);
      params.push(filters.is_pinned);
      paramIndex++;
    }

    if (filters.search) {
      conditions.push(`(n.title ILIKE $${paramIndex} OR n.content ILIKE $${paramIndex})`);
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM notices n ${whereClause}`,
      params
    );

    // Get notices with creator info and read count
    const result = await pool.query(
      `SELECT n.*, 
              CASE 
                WHEN n.created_by_role = 'admin' THEN a.first_name || ' ' || a.last_name
                WHEN n.created_by_role = 'teacher' THEN t.first_name || ' ' || t.last_name
                ELSE 'Unknown'
              END as created_by_name,
              COUNT(DISTINCT nr.id) as read_count
       FROM notices n
       LEFT JOIN admins a ON n.created_by = a.id AND n.created_by_role = 'admin'
       LEFT JOIN teachers t ON n.created_by = t.id AND n.created_by_role = 'teacher'
       LEFT JOIN notice_reads nr ON n.id = nr.notice_id
       ${whereClause}
       GROUP BY n.id, a.first_name, a.last_name, t.first_name, t.last_name
       ORDER BY n.is_pinned DESC, n.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const notices = result.rows.map(notice => ({
      ...notice,
      target_filters: JSON.parse(notice.target_filters || '{}'),
      attachments: JSON.parse(notice.attachments || '[]')
    }));

    return {
      notices,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].total),
        totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
      }
    };
  }

  /**
   * Update notice
   * @param {number} noticeId - Notice ID
   * @param {object} updateData - Data to update
   */
  async updateNotice(noticeId, updateData) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check if notice exists
      const existingNotice = await client.query(
        'SELECT * FROM notices WHERE id = $1',
        [noticeId]
      );

      if (existingNotice.rows.length === 0) {
        throw new Error('Notice not found');
      }

      const {
        title,
        content,
        notice_type,
        priority,
        target_audience,
        target_filters,
        attachments,
        expiry_date,
        status,
        is_pinned
      } = updateData;

      // Build update query dynamically
      const updates = [];
      const params = [noticeId];
      let paramIndex = 2;

      if (title !== undefined) {
        updates.push(`title = $${paramIndex}`);
        params.push(title);
        paramIndex++;
      }

      if (content !== undefined) {
        updates.push(`content = $${paramIndex}`);
        params.push(content);
        paramIndex++;
      }

      if (notice_type !== undefined) {
        const validTypes = ['Academic', 'Examination', 'Event', 'Holiday', 'General', 'Announcement'];
        if (!validTypes.includes(notice_type)) {
          throw new Error('Invalid notice type');
        }
        updates.push(`notice_type = $${paramIndex}`);
        params.push(notice_type);
        paramIndex++;
      }

      if (priority !== undefined) {
        const validPriorities = ['Normal', 'Important', 'Urgent'];
        if (!validPriorities.includes(priority)) {
          throw new Error('Invalid priority level');
        }
        updates.push(`priority = $${paramIndex}`);
        params.push(priority);
        paramIndex++;
      }

      if (target_audience !== undefined) {
        const validTargets = ['All', 'Students', 'Teachers', 'Department'];
        if (!validTargets.includes(target_audience)) {
          throw new Error('Invalid target audience');
        }
        updates.push(`target_audience = $${paramIndex}`);
        params.push(target_audience);
        paramIndex++;
      }

      if (target_filters !== undefined) {
        updates.push(`target_filters = $${paramIndex}`);
        params.push(JSON.stringify(target_filters));
        paramIndex++;
      }

      if (attachments !== undefined) {
        updates.push(`attachments = $${paramIndex}`);
        params.push(JSON.stringify(attachments));
        paramIndex++;
      }

      if (expiry_date !== undefined) {
        if (expiry_date) {
          const expiry = new Date(expiry_date);
          const now = new Date();
          if (expiry <= now) {
            throw new Error('Expiry date must be in the future');
          }
        }
        updates.push(`expiry_date = $${paramIndex}`);
        params.push(expiry_date);
        paramIndex++;
      }

      if (status !== undefined) {
        const validStatuses = ['Draft', 'Published', 'Archived'];
        if (!validStatuses.includes(status)) {
          throw new Error('Invalid status');
        }
        updates.push(`status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }

      if (is_pinned !== undefined) {
        updates.push(`is_pinned = $${paramIndex}`);
        params.push(is_pinned);
        paramIndex++;
      }

      if (updates.length === 0) {
        throw new Error('No fields to update');
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);

      const updateQuery = `
        UPDATE notices 
        SET ${updates.join(', ')}
        WHERE id = $1
        RETURNING *
      `;

      const result = await client.query(updateQuery, params);

      await client.query('COMMIT');

      const notice = result.rows[0];
      return {
        ...notice,
        target_filters: JSON.parse(notice.target_filters),
        attachments: JSON.parse(notice.attachments)
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete notice
   * @param {number} noticeId - Notice ID
   */
  async deleteNotice(noticeId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check if notice exists
      const existingNotice = await client.query(
        'SELECT * FROM notices WHERE id = $1',
        [noticeId]
      );

      if (existingNotice.rows.length === 0) {
        throw new Error('Notice not found');
      }

      const notice = existingNotice.rows[0];

      // Delete associated reads
      await client.query('DELETE FROM notice_reads WHERE notice_id = $1', [noticeId]);

      // Delete notice
      await client.query('DELETE FROM notices WHERE id = $1', [noticeId]);

      // Delete attachments from filesystem if any
      const attachments = JSON.parse(notice.attachments || '[]');
      for (const attachment of attachments) {
        try {
          const filePath = path.join(__dirname, '../..', attachment.path);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (err) {
          console.error(`Failed to delete attachment: ${attachment.path}`, err);
        }
      }

      await client.query('COMMIT');

      return { message: 'Notice deleted successfully' };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ==================== NOTICE VIEWING (ALL USERS) ====================

  /**
   * Get all published notices for users
   * @param {number} userId - User ID
   * @param {string} userRole - User role (student/teacher/admin)
   * @param {object} filters - Filters
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   */
  async getPublishedNotices(userId, userRole, filters = {}, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    let conditions = ["n.status = 'Published'"];
    let params = [];
    let paramIndex = 1;

    // Filter expired notices
    conditions.push(`(n.expiry_date IS NULL OR n.expiry_date >= CURRENT_DATE)`);

    if (filters.notice_type) {
      conditions.push(`n.notice_type = $${paramIndex}`);
      params.push(filters.notice_type);
      paramIndex++;
    }

    if (filters.priority) {
      conditions.push(`n.priority = $${paramIndex}`);
      params.push(filters.priority);
      paramIndex++;
    }

    if (filters.search) {
      conditions.push(`(n.title ILIKE $${paramIndex} OR n.content ILIKE $${paramIndex})`);
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    // Filter by target audience
    if (userRole === 'student') {
      conditions.push(`(n.target_audience IN ('All', 'Students'))`);
      
      // Get student's department for department-specific notices
      const studentResult = await pool.query(
        'SELECT department_id FROM students WHERE id = $1',
        [userId]
      );
      
      if (studentResult.rows.length > 0) {
        const departmentId = studentResult.rows[0].department_id;
        conditions.push(`(n.target_audience != 'Department' OR (n.target_filters->>'department_id')::int = $${paramIndex})`);
        params.push(departmentId);
        paramIndex++;
      }
    } else if (userRole === 'teacher') {
      conditions.push(`(n.target_audience IN ('All', 'Teachers'))`);
      
      // Get teacher's department for department-specific notices
      const teacherResult = await pool.query(
        'SELECT department_id FROM teachers WHERE id = $1',
        [userId]
      );
      
      if (teacherResult.rows.length > 0) {
        const departmentId = teacherResult.rows[0].department_id;
        conditions.push(`(n.target_audience != 'Department' OR (n.target_filters->>'department_id')::int = $${paramIndex})`);
        params.push(departmentId);
        paramIndex++;
      }
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM notices n WHERE ${whereClause}`,
      params
    );

    // Get notices with read status
    const result = await pool.query(
      `SELECT n.*, 
              CASE 
                WHEN n.created_by_role = 'admin' THEN a.first_name || ' ' || a.last_name
                WHEN n.created_by_role = 'teacher' THEN t.first_name || ' ' || t.last_name
                ELSE 'System'
              END as created_by_name,
              EXISTS(
                SELECT 1 FROM notice_reads nr 
                WHERE nr.notice_id = n.id 
                  AND nr.user_id = $${paramIndex} 
                  AND nr.user_role = $${paramIndex + 1}
              ) as is_read
       FROM notices n
       LEFT JOIN admins a ON n.created_by = a.id AND n.created_by_role = 'admin'
       LEFT JOIN teachers t ON n.created_by = t.id AND n.created_by_role = 'teacher'
       WHERE ${whereClause}
       ORDER BY n.is_pinned DESC, n.created_at DESC
       LIMIT $${paramIndex + 2} OFFSET $${paramIndex + 3}`,
      [...params, userId, userRole, limit, offset]
    );

    const notices = result.rows.map(notice => ({
      ...notice,
      target_filters: JSON.parse(notice.target_filters || '{}'),
      attachments: JSON.parse(notice.attachments || '[]')
    }));

    return {
      notices,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].total),
        totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
      }
    };
  }

  /**
   * Get single notice by ID
   * @param {number} noticeId - Notice ID
   * @param {number} userId - User ID
   * @param {string} userRole - User role
   */
  async getNoticeById(noticeId, userId, userRole) {
    const result = await pool.query(
      `SELECT n.*, 
              CASE 
                WHEN n.created_by_role = 'admin' THEN a.first_name || ' ' || a.last_name
                WHEN n.created_by_role = 'teacher' THEN t.first_name || ' ' || t.last_name
                ELSE 'System'
              END as created_by_name,
              EXISTS(
                SELECT 1 FROM notice_reads nr 
                WHERE nr.notice_id = n.id 
                  AND nr.user_id = $2 
                  AND nr.user_role = $3
              ) as is_read
       FROM notices n
       LEFT JOIN admins a ON n.created_by = a.id AND n.created_by_role = 'admin'
       LEFT JOIN teachers t ON n.created_by = t.id AND n.created_by_role = 'teacher'
       WHERE n.id = $1`,
      [noticeId, userId, userRole]
    );

    if (result.rows.length === 0) {
      throw new Error('Notice not found');
    }

    const notice = result.rows[0];
    return {
      ...notice,
      target_filters: JSON.parse(notice.target_filters),
      attachments: JSON.parse(notice.attachments)
    };
  }

  /**
   * Mark notice as read
   * @param {number} noticeId - Notice ID
   * @param {number} userId - User ID
   * @param {string} userRole - User role
   */
  async markNoticeAsRead(noticeId, userId, userRole) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check if notice exists
      const noticeCheck = await client.query(
        'SELECT id FROM notices WHERE id = $1',
        [noticeId]
      );

      if (noticeCheck.rows.length === 0) {
        throw new Error('Notice not found');
      }

      // Check if already marked as read
      const existingRead = await client.query(
        'SELECT id FROM notice_reads WHERE notice_id = $1 AND user_id = $2 AND user_role = $3',
        [noticeId, userId, userRole]
      );

      if (existingRead.rows.length > 0) {
        await client.query('COMMIT');
        return { message: 'Notice already marked as read' };
      }

      // Insert read record
      await client.query(
        `INSERT INTO notice_reads (notice_id, user_id, user_role, read_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
        [noticeId, userId, userRole]
      );

      await client.query('COMMIT');

      return { message: 'Notice marked as read' };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get unread notice count
   * @param {number} userId - User ID
   * @param {string} userRole - User role
   */
  async getUnreadCount(userId, userRole) {
    let conditions = ["n.status = 'Published'"];
    let params = [userId, userRole];
    let paramIndex = 3;

    // Filter expired notices
    conditions.push(`(n.expiry_date IS NULL OR n.expiry_date >= CURRENT_DATE)`);

    // Filter by target audience
    if (userRole === 'student') {
      conditions.push(`(n.target_audience IN ('All', 'Students'))`);
      
      const studentResult = await pool.query(
        'SELECT department_id FROM students WHERE id = $1',
        [userId]
      );
      
      if (studentResult.rows.length > 0) {
        const departmentId = studentResult.rows[0].department_id;
        conditions.push(`(n.target_audience != 'Department' OR (n.target_filters->>'department_id')::int = $${paramIndex})`);
        params.push(departmentId);
        paramIndex++;
      }
    } else if (userRole === 'teacher') {
      conditions.push(`(n.target_audience IN ('All', 'Teachers'))`);
      
      const teacherResult = await pool.query(
        'SELECT department_id FROM teachers WHERE id = $1',
        [userId]
      );
      
      if (teacherResult.rows.length > 0) {
        const departmentId = teacherResult.rows[0].department_id;
        conditions.push(`(n.target_audience != 'Department' OR (n.target_filters->>'department_id')::int = $${paramIndex})`);
        params.push(departmentId);
        paramIndex++;
      }
    }

    const whereClause = conditions.join(' AND ');

    const result = await pool.query(
      `SELECT COUNT(*) as unread_count
       FROM notices n
       WHERE ${whereClause}
         AND NOT EXISTS(
           SELECT 1 FROM notice_reads nr 
           WHERE nr.notice_id = n.id 
             AND nr.user_id = $1 
             AND nr.user_role = $2
         )`,
      params
    );

    return {
      unread_count: parseInt(result.rows[0].unread_count)
    };
  }
}

module.exports = new NoticeService();
