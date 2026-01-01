const pool = require('../../config/database');
const nodemailer = require('nodemailer');

class NotificationService {
  constructor() {
    // Configure email transporter
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // ==================== CREATE NOTIFICATIONS ====================

  /**
   * Create notification
   * @param {number} userId - User ID
   * @param {string} userRole - User role (student/teacher/admin)
   * @param {string} type - Notification type
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {object} data - Additional data
   * @param {string} priority - Priority (low/normal/high)
   */
  async createNotification(userId, userRole, type, title, message, data = {}, priority = 'normal') {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert in-app notification
      const notificationResult = await client.query(
        `INSERT INTO notifications (
          user_id, user_role, type, title, message, 
          data, priority, is_read, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
        RETURNING *`,
        [userId, userRole, type, title, message, JSON.stringify(data), priority, false]
      );

      const notification = notificationResult.rows[0];

      // Get user preferences
      const preferencesResult = await client.query(
        `SELECT * FROM notification_preferences 
         WHERE user_id = $1 AND user_role = $2`,
        [userId, userRole]
      );

      let preferences = preferencesResult.rows[0];

      // If no preferences exist, use defaults
      if (!preferences) {
        preferences = {
          email_enabled: true,
          sms_enabled: false,
          push_enabled: true,
          email_frequency: 'instant'
        };
      }

      // Get user email and phone
      const userResult = await this.getUserContactInfo(userId, userRole, client);

      // Send email notification if enabled
      if (preferences.email_enabled && userResult.email) {
        await this.sendEmailNotification(
          userResult.email,
          title,
          message,
          type,
          data
        );
      }

      // Send SMS notification if enabled (placeholder)
      if (preferences.sms_enabled && userResult.phone) {
        await this.sendSMSNotification(
          userResult.phone,
          title,
          message
        );
      }

      // Send push notification if enabled (placeholder)
      if (preferences.push_enabled) {
        await this.sendPushNotification(
          userId,
          userRole,
          title,
          message,
          data
        );
      }

      await client.query('COMMIT');

      return {
        ...notification,
        data: JSON.parse(notification.data)
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Create Notification Error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get user contact information
   */
  async getUserContactInfo(userId, userRole, client) {
    let query;
    
    if (userRole === 'student') {
      query = 'SELECT email, phone FROM students WHERE id = $1';
    } else if (userRole === 'teacher') {
      query = 'SELECT email, phone FROM teachers WHERE id = $1';
    } else if (userRole === 'admin') {
      query = 'SELECT email, phone FROM admins WHERE id = $1';
    } else {
      return { email: null, phone: null };
    }

    const result = await client.query(query, [userId]);
    return result.rows[0] || { email: null, phone: null };
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(email, title, message, type, data) {
    try {
      const emailTemplate = this.getEmailTemplate(type, title, message, data);

      await this.emailTransporter.sendMail({
        from: `"Government College Larkana" <${process.env.SMTP_USER}>`,
        to: email,
        subject: title,
        html: emailTemplate
      });

      console.log(`Email sent to ${email}`);
    } catch (error) {
      console.error('Email sending error:', error);
      // Don't throw - email failure shouldn't break notification creation
    }
  }

  /**
   * Get email template based on notification type
   */
  getEmailTemplate(type, title, message, data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1a56db; color: white; padding: 20px; text-align: center; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          .button { display: inline-block; background: #1a56db; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 4px; margin-top: 20px; }
          .info-box { background: white; padding: 15px; border-left: 4px solid #1a56db; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Government College Larkana</h1>
          </div>
          <div class="content">
            <h2>${title}</h2>
            <p>${message}</p>
            ${data && Object.keys(data).length > 0 ? `
              <div class="info-box">
                ${Object.entries(data).map(([key, value]) => 
                  `<p><strong>${key}:</strong> ${value}</p>`
                ).join('')}
              </div>
            ` : ''}
            <a href="${process.env.APP_URL || 'http://localhost:3000'}" class="button">
              View in Portal
            </a>
          </div>
          <div class="footer">
            <p>This is an automated notification from Government College Larkana.</p>
            <p>Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Send SMS notification (placeholder)
   */
  async sendSMSNotification(phone, title, message) {
    try {
      // TODO: Integrate SMS service (Twilio, Nexmo, etc.)
      console.log(`SMS would be sent to ${phone}: ${title} - ${message}`);
      
      // Example SMS integration:
      // const sms = require('twilio')(accountSid, authToken);
      // await sms.messages.create({
      //   body: `${title}: ${message}`,
      //   from: process.env.TWILIO_PHONE,
      //   to: phone
      // });
    } catch (error) {
      console.error('SMS sending error:', error);
    }
  }

  /**
   * Send push notification (placeholder)
   */
  async sendPushNotification(userId, userRole, title, message, data) {
    try {
      // TODO: Integrate push notification service (Firebase, OneSignal, etc.)
      console.log(`Push notification for user ${userId}: ${title}`);
      
      // Example Firebase integration:
      // const admin = require('firebase-admin');
      // await admin.messaging().send({
      //   token: userDeviceToken,
      //   notification: { title, body: message },
      //   data: data
      // });
    } catch (error) {
      console.error('Push notification error:', error);
    }
  }

  // ==================== PREDEFINED NOTIFICATION CREATORS ====================

  /**
   * Send registration confirmation
   */
  async sendRegistrationConfirmation(userId, userRole, userName, registrationDetails) {
    return await this.createNotification(
      userId,
      userRole,
      'registration',
      'Registration Successful',
      `Welcome ${userName}! Your registration has been completed successfully.`,
      registrationDetails,
      'normal'
    );
  }

  /**
   * Send fee due reminder
   */
  async sendFeeDueReminder(userId, userRole, amount, dueDate) {
    return await this.createNotification(
      userId,
      userRole,
      'fee_reminder',
      'Fee Payment Reminder',
      `Your fee payment of Rs. ${amount} is due on ${dueDate}. Please pay to avoid late fees.`,
      { amount, due_date: dueDate },
      'high'
    );
  }

  /**
   * Send result published notification
   */
  async sendResultPublished(userId, userRole, examName, semester) {
    return await this.createNotification(
      userId,
      userRole,
      'result',
      'Result Published',
      `Your result for ${examName} (${semester}) has been published. Check your portal for details.`,
      { exam: examName, semester },
      'high'
    );
  }

  /**
   * Send assignment due reminder
   */
  async sendAssignmentDueReminder(userId, assignmentTitle, dueDate) {
    return await this.createNotification(
      userId,
      'student',
      'assignment',
      'Assignment Due Soon',
      `Assignment "${assignmentTitle}" is due on ${dueDate}. Please submit before the deadline.`,
      { assignment: assignmentTitle, due_date: dueDate },
      'normal'
    );
  }

  /**
   * Send leave status notification
   */
  async sendLeaveStatusUpdate(userId, userRole, leaveType, status, remarks) {
    return await this.createNotification(
      userId,
      userRole,
      'leave',
      `Leave Application ${status}`,
      `Your ${leaveType} leave application has been ${status.toLowerCase()}. ${remarks || ''}`,
      { leave_type: leaveType, status, remarks },
      'normal'
    );
  }

  /**
   * Send certificate ready notification
   */
  async sendCertificateReady(userId, certificateType, certificateNumber) {
    return await this.createNotification(
      userId,
      'student',
      'certificate',
      'Certificate Ready',
      `Your ${certificateType} certificate is ready for download. Certificate No: ${certificateNumber}`,
      { certificate_type: certificateType, certificate_number: certificateNumber },
      'normal'
    );
  }

  /**
   * Send exam schedule notification
   */
  async sendExamSchedule(userId, userRole, examName, examDate, venue) {
    return await this.createNotification(
      userId,
      userRole,
      'exam',
      'Exam Schedule Announced',
      `${examName} is scheduled on ${examDate} at ${venue}. Download your hall ticket from the portal.`,
      { exam: examName, date: examDate, venue },
      'high'
    );
  }

  /**
   * Send attendance marked notification
   */
  async sendAttendanceMarked(userId, courseName, status, date) {
    return await this.createNotification(
      userId,
      'student',
      'attendance',
      'Attendance Marked',
      `Your attendance for ${courseName} has been marked as ${status} on ${date}.`,
      { course: courseName, status, date },
      'low'
    );
  }

  /**
   * Send new assignment notification
   */
  async sendNewAssignment(userId, assignmentTitle, courseName, dueDate) {
    return await this.createNotification(
      userId,
      'student',
      'assignment',
      'New Assignment Posted',
      `New assignment "${assignmentTitle}" has been posted for ${courseName}. Due date: ${dueDate}`,
      { assignment: assignmentTitle, course: courseName, due_date: dueDate },
      'normal'
    );
  }

  /**
   * Send new notice notification
   */
  async sendNewNotice(userId, userRole, noticeTitle, noticeType) {
    return await this.createNotification(
      userId,
      userRole,
      'notice',
      'New Notice Published',
      `A new ${noticeType} notice has been published: ${noticeTitle}`,
      { notice_title: noticeTitle, notice_type: noticeType },
      'normal'
    );
  }

  // ==================== GET NOTIFICATIONS ====================

  /**
   * Get user notifications
   * @param {number} userId - User ID
   * @param {string} userRole - User role
   * @param {object} filters - Filters
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   */
  async getUserNotifications(userId, userRole, filters = {}, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    let conditions = ['user_id = $1', 'user_role = $2'];
    let params = [userId, userRole];
    let paramIndex = 3;

    if (filters.type) {
      conditions.push(`type = $${paramIndex}`);
      params.push(filters.type);
      paramIndex++;
    }

    if (filters.is_read !== undefined) {
      conditions.push(`is_read = $${paramIndex}`);
      params.push(filters.is_read);
      paramIndex++;
    }

    if (filters.priority) {
      conditions.push(`priority = $${paramIndex}`);
      params.push(filters.priority);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM notifications WHERE ${whereClause}`,
      params
    );

    // Get notifications
    const result = await pool.query(
      `SELECT * FROM notifications 
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const notifications = result.rows.map(notif => ({
      ...notif,
      data: JSON.parse(notif.data || '{}')
    }));

    return {
      notifications,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].total),
        totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
      }
    };
  }

  /**
   * Get unread notification count
   * @param {number} userId - User ID
   * @param {string} userRole - User role
   */
  async getUnreadCount(userId, userRole) {
    const result = await pool.query(
      `SELECT COUNT(*) as unread_count 
       FROM notifications 
       WHERE user_id = $1 AND user_role = $2 AND is_read = false`,
      [userId, userRole]
    );

    return {
      unread_count: parseInt(result.rows[0].unread_count)
    };
  }

  /**
   * Mark notification as read
   * @param {number} notificationId - Notification ID
   * @param {number} userId - User ID
   * @param {string} userRole - User role
   */
  async markAsRead(notificationId, userId, userRole) {
    const result = await pool.query(
      `UPDATE notifications 
       SET is_read = true, read_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2 AND user_role = $3
       RETURNING *`,
      [notificationId, userId, userRole]
    );

    if (result.rows.length === 0) {
      throw new Error('Notification not found or access denied');
    }

    return {
      ...result.rows[0],
      data: JSON.parse(result.rows[0].data || '{}')
    };
  }

  /**
   * Mark all notifications as read
   * @param {number} userId - User ID
   * @param {string} userRole - User role
   */
  async markAllAsRead(userId, userRole) {
    const result = await pool.query(
      `UPDATE notifications 
       SET is_read = true, read_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND user_role = $2 AND is_read = false
       RETURNING COUNT(*) as count`,
      [userId, userRole]
    );

    return {
      message: 'All notifications marked as read',
      count: result.rowCount
    };
  }

  // ==================== NOTIFICATION PREFERENCES ====================

  /**
   * Get notification preferences
   * @param {number} userId - User ID
   * @param {string} userRole - User role
   */
  async getPreferences(userId, userRole) {
    let result = await pool.query(
      `SELECT * FROM notification_preferences 
       WHERE user_id = $1 AND user_role = $2`,
      [userId, userRole]
    );

    // Return default preferences if none exist
    if (result.rows.length === 0) {
      return {
        user_id: userId,
        user_role: userRole,
        email_enabled: true,
        sms_enabled: false,
        push_enabled: true,
        email_frequency: 'instant',
        notification_types: {
          registration: true,
          fee_reminder: true,
          result: true,
          assignment: true,
          leave: true,
          certificate: true,
          exam: true,
          attendance: true,
          notice: true
        }
      };
    }

    const preferences = result.rows[0];
    return {
      ...preferences,
      notification_types: JSON.parse(preferences.notification_types || '{}')
    };
  }

  /**
   * Update notification preferences
   * @param {number} userId - User ID
   * @param {string} userRole - User role
   * @param {object} preferences - Preferences to update
   */
  async updatePreferences(userId, userRole, preferences) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const {
        email_enabled,
        sms_enabled,
        push_enabled,
        email_frequency,
        notification_types
      } = preferences;

      // Check if preferences exist
      const existingResult = await client.query(
        `SELECT id FROM notification_preferences 
         WHERE user_id = $1 AND user_role = $2`,
        [userId, userRole]
      );

      let result;

      if (existingResult.rows.length === 0) {
        // Create new preferences
        result = await client.query(
          `INSERT INTO notification_preferences (
            user_id, user_role, email_enabled, sms_enabled, 
            push_enabled, email_frequency, notification_types
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *`,
          [
            userId,
            userRole,
            email_enabled !== undefined ? email_enabled : true,
            sms_enabled !== undefined ? sms_enabled : false,
            push_enabled !== undefined ? push_enabled : true,
            email_frequency || 'instant',
            JSON.stringify(notification_types || {})
          ]
        );
      } else {
        // Update existing preferences
        const updates = [];
        const params = [userId, userRole];
        let paramIndex = 3;

        if (email_enabled !== undefined) {
          updates.push(`email_enabled = $${paramIndex}`);
          params.push(email_enabled);
          paramIndex++;
        }

        if (sms_enabled !== undefined) {
          updates.push(`sms_enabled = $${paramIndex}`);
          params.push(sms_enabled);
          paramIndex++;
        }

        if (push_enabled !== undefined) {
          updates.push(`push_enabled = $${paramIndex}`);
          params.push(push_enabled);
          paramIndex++;
        }

        if (email_frequency) {
          updates.push(`email_frequency = $${paramIndex}`);
          params.push(email_frequency);
          paramIndex++;
        }

        if (notification_types) {
          updates.push(`notification_types = $${paramIndex}`);
          params.push(JSON.stringify(notification_types));
          paramIndex++;
        }

        if (updates.length === 0) {
          throw new Error('No preferences to update');
        }

        result = await client.query(
          `UPDATE notification_preferences 
           SET ${updates.join(', ')}
           WHERE user_id = $1 AND user_role = $2
           RETURNING *`,
          params
        );
      }

      await client.query('COMMIT');

      const updatedPreferences = result.rows[0];
      return {
        ...updatedPreferences,
        notification_types: JSON.parse(updatedPreferences.notification_types || '{}')
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete old notifications (cleanup)
   * @param {number} daysOld - Delete notifications older than this many days
   */
  async deleteOldNotifications(daysOld = 90) {
    const result = await pool.query(
      `DELETE FROM notifications 
       WHERE created_at < NOW() - INTERVAL '${daysOld} days'
       RETURNING COUNT(*) as count`
    );

    return {
      message: `Deleted ${result.rowCount} old notifications`,
      count: result.rowCount
    };
  }
}

module.exports = new NotificationService();
