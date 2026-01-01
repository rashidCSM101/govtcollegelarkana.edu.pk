const pool = require('../../config/database');

/**
 * Audit Service
 * Handles audit logging and retrieval
 */
class AuditService {

  /**
   * Create audit log entry
   * @param {Object} logData - Log data
   * @returns {Promise<Object>} Created log entry
   */
  async createAuditLog(logData) {
    try {
      const {
        user_id,
        action,
        module,
        details,
        ip_address,
        user_agent
      } = logData;

      const result = await pool.query(
        `INSERT INTO audit_logs (user_id, action, module, details, ip_address, user_agent, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING *`,
        [user_id, action, module, details ? JSON.stringify(details) : null, ip_address, user_agent]
      );

      return result.rows[0];

    } catch (error) {
      console.error('Create Audit Log Error:', error);
      throw new Error('Failed to create audit log entry');
    }
  }

  /**
   * Get audit logs with filters
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Audit logs with pagination
   */
  async getAuditLogs(filters = {}) {
    try {
      const {
        user_id,
        action,
        module,
        start_date,
        end_date,
        search,
        limit = 50,
        offset = 0
      } = filters;

      let query = `
        SELECT 
          al.id,
          al.user_id,
          COALESCE(u.name, 'System') as user_name,
          COALESCE(u.email, 'system@govt.edu.pk') as user_email,
          al.action,
          al.module,
          al.details,
          al.ip_address,
          al.user_agent,
          al.created_at
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE 1=1
      `;

      const params = [];

      if (user_id) {
        params.push(user_id);
        query += ` AND al.user_id = $${params.length}`;
      }

      if (action) {
        params.push(action);
        query += ` AND al.action = $${params.length}`;
      }

      if (module) {
        params.push(module);
        query += ` AND al.module = $${params.length}`;
      }

      if (start_date) {
        params.push(start_date);
        query += ` AND al.created_at >= $${params.length}`;
      }

      if (end_date) {
        params.push(end_date);
        query += ` AND al.created_at <= $${params.length}`;
      }

      if (search) {
        params.push(`%${search}%`);
        query += ` AND (
          u.name ILIKE $${params.length} OR 
          u.email ILIKE $${params.length} OR 
          al.action ILIKE $${params.length} OR 
          al.module ILIKE $${params.length}
        )`;
      }

      query += ` ORDER BY al.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);

      // Get total count
      let countQuery = `
        SELECT COUNT(*) as total
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE 1=1
      `;

      const countParams = [];

      if (user_id) {
        countParams.push(user_id);
        countQuery += ` AND al.user_id = $${countParams.length}`;
      }

      if (action) {
        countParams.push(action);
        countQuery += ` AND al.action = $${countParams.length}`;
      }

      if (module) {
        countParams.push(module);
        countQuery += ` AND al.module = $${countParams.length}`;
      }

      if (start_date) {
        countParams.push(start_date);
        countQuery += ` AND al.created_at >= $${countParams.length}`;
      }

      if (end_date) {
        countParams.push(end_date);
        countQuery += ` AND al.created_at <= $${countParams.length}`;
      }

      if (search) {
        countParams.push(`%${search}%`);
        countQuery += ` AND (
          u.name ILIKE $${countParams.length} OR 
          u.email ILIKE $${countParams.length} OR 
          al.action ILIKE $${countParams.length} OR 
          al.module ILIKE $${countParams.length}
        )`;
      }

      const countResult = await pool.query(countQuery, countParams);

      return {
        logs: result.rows,
        total: parseInt(countResult.rows[0].total),
        limit,
        offset
      };

    } catch (error) {
      console.error('Get Audit Logs Error:', error);
      throw new Error('Failed to fetch audit logs');
    }
  }

  /**
   * Get login/logout logs
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Login/logout logs
   */
  async getLoginLogs(filters = {}) {
    try {
      const {
        user_id,
        start_date,
        end_date,
        limit = 50,
        offset = 0
      } = filters;

      let query = `
        SELECT 
          al.id,
          al.user_id,
          u.name as user_name,
          u.email as user_email,
          al.action,
          al.ip_address,
          al.user_agent,
          al.created_at
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE al.action IN ('LOGIN', 'LOGOUT', 'LOGIN_FAILED')
      `;

      const params = [];

      if (user_id) {
        params.push(user_id);
        query += ` AND al.user_id = $${params.length}`;
      }

      if (start_date) {
        params.push(start_date);
        query += ` AND al.created_at >= $${params.length}`;
      }

      if (end_date) {
        params.push(end_date);
        query += ` AND al.created_at <= $${params.length}`;
      }

      query += ` ORDER BY al.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);

      // Get total count
      let countQuery = `
        SELECT COUNT(*) as total
        FROM audit_logs al
        WHERE al.action IN ('LOGIN', 'LOGOUT', 'LOGIN_FAILED')
      `;

      const countParams = [];

      if (user_id) {
        countParams.push(user_id);
        countQuery += ` AND al.user_id = $${countParams.length}`;
      }

      if (start_date) {
        countParams.push(start_date);
        countQuery += ` AND al.created_at >= $${countParams.length}`;
      }

      if (end_date) {
        countParams.push(end_date);
        countQuery += ` AND al.created_at <= $${countParams.length}`;
      }

      const countResult = await pool.query(countQuery, countParams);

      return {
        logs: result.rows,
        total: parseInt(countResult.rows[0].total),
        limit,
        offset
      };

    } catch (error) {
      console.error('Get Login Logs Error:', error);
      throw new Error('Failed to fetch login logs');
    }
  }

  /**
   * Get data modification logs
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Data modification logs
   */
  async getDataModificationLogs(filters = {}) {
    try {
      const {
        module,
        start_date,
        end_date,
        limit = 50,
        offset = 0
      } = filters;

      let query = `
        SELECT 
          al.id,
          al.user_id,
          u.name as user_name,
          u.email as user_email,
          al.action,
          al.module,
          al.details,
          al.ip_address,
          al.created_at
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE al.action IN ('CREATE', 'UPDATE', 'DELETE', 'BULK_CREATE', 'BULK_UPDATE', 'BULK_DELETE')
      `;

      const params = [];

      if (module) {
        params.push(module);
        query += ` AND al.module = $${params.length}`;
      }

      if (start_date) {
        params.push(start_date);
        query += ` AND al.created_at >= $${params.length}`;
      }

      if (end_date) {
        params.push(end_date);
        query += ` AND al.created_at <= $${params.length}`;
      }

      query += ` ORDER BY al.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);

      // Get total count
      let countQuery = `
        SELECT COUNT(*) as total
        FROM audit_logs al
        WHERE al.action IN ('CREATE', 'UPDATE', 'DELETE', 'BULK_CREATE', 'BULK_UPDATE', 'BULK_DELETE')
      `;

      const countParams = [];

      if (module) {
        countParams.push(module);
        countQuery += ` AND al.module = $${countParams.length}`;
      }

      if (start_date) {
        countParams.push(start_date);
        countQuery += ` AND al.created_at >= $${countParams.length}`;
      }

      if (end_date) {
        countParams.push(end_date);
        countQuery += ` AND al.created_at <= $${countParams.length}`;
      }

      const countResult = await pool.query(countQuery, countParams);

      return {
        logs: result.rows,
        total: parseInt(countResult.rows[0].total),
        limit,
        offset
      };

    } catch (error) {
      console.error('Get Data Modification Logs Error:', error);
      throw new Error('Failed to fetch data modification logs');
    }
  }

  /**
   * Get security logs (failed logins, permission violations, etc.)
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Security logs
   */
  async getSecurityLogs(filters = {}) {
    try {
      const {
        start_date,
        end_date,
        limit = 50,
        offset = 0
      } = filters;

      let query = `
        SELECT 
          al.id,
          al.user_id,
          u.name as user_name,
          u.email as user_email,
          al.action,
          al.module,
          al.details,
          al.ip_address,
          al.user_agent,
          al.created_at
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE al.action IN ('LOGIN_FAILED', 'UNAUTHORIZED_ACCESS', 'PERMISSION_DENIED', 'SUSPICIOUS_ACTIVITY')
      `;

      const params = [];

      if (start_date) {
        params.push(start_date);
        query += ` AND al.created_at >= $${params.length}`;
      }

      if (end_date) {
        params.push(end_date);
        query += ` AND al.created_at <= $${params.length}`;
      }

      query += ` ORDER BY al.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);

      // Get total count
      let countQuery = `
        SELECT COUNT(*) as total
        FROM audit_logs al
        WHERE al.action IN ('LOGIN_FAILED', 'UNAUTHORIZED_ACCESS', 'PERMISSION_DENIED', 'SUSPICIOUS_ACTIVITY')
      `;

      const countParams = [];

      if (start_date) {
        countParams.push(start_date);
        countQuery += ` AND al.created_at >= $${countParams.length}`;
      }

      if (end_date) {
        countParams.push(end_date);
        countQuery += ` AND al.created_at <= $${countParams.length}`;
      }

      const countResult = await pool.query(countQuery, countParams);

      return {
        logs: result.rows,
        total: parseInt(countResult.rows[0].total),
        limit,
        offset
      };

    } catch (error) {
      console.error('Get Security Logs Error:', error);
      throw new Error('Failed to fetch security logs');
    }
  }

  /**
   * Get audit statistics
   * @returns {Promise<Object>} Audit statistics
   */
  async getAuditStatistics() {
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) as total_logs,
          COUNT(CASE WHEN action IN ('LOGIN', 'LOGOUT') THEN 1 END) as login_logout_count,
          COUNT(CASE WHEN action = 'LOGIN_FAILED' THEN 1 END) as failed_login_count,
          COUNT(CASE WHEN action IN ('CREATE', 'UPDATE', 'DELETE') THEN 1 END) as data_modification_count,
          COUNT(CASE WHEN action = 'EXPORT' THEN 1 END) as export_count,
          COUNT(CASE WHEN action IN ('CREATE_BACKUP', 'RESTORE_BACKUP') THEN 1 END) as backup_count,
          COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as today_logs,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as week_logs,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as month_logs
        FROM audit_logs
      `;

      const statsResult = await pool.query(statsQuery);

      // Get most active users
      const activeUsersQuery = `
        SELECT 
          u.name,
          u.email,
          COUNT(al.id) as activity_count
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE al.created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY u.id, u.name, u.email
        ORDER BY activity_count DESC
        LIMIT 10
      `;

      const activeUsersResult = await pool.query(activeUsersQuery);

      // Get activity by action type
      const actionStatsQuery = `
        SELECT 
          action,
          COUNT(*) as count
        FROM audit_logs
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY action
        ORDER BY count DESC
        LIMIT 15
      `;

      const actionStatsResult = await pool.query(actionStatsQuery);

      return {
        overall: statsResult.rows[0],
        most_active_users: activeUsersResult.rows,
        action_distribution: actionStatsResult.rows
      };

    } catch (error) {
      console.error('Get Audit Statistics Error:', error);
      throw new Error('Failed to fetch audit statistics');
    }
  }
}

module.exports = new AuditService();
