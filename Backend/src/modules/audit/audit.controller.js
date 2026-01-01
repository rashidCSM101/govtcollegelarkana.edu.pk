const auditService = require('./audit.service');

/**
 * Audit Controller
 * Handles HTTP requests for audit logs
 */

/**
 * Get audit logs
 * @route GET /api/admin/audit-logs
 */
exports.getAuditLogs = async (req, res) => {
  try {
    const filters = {
      user_id: req.query.user_id,
      action: req.query.action,
      module: req.query.module,
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      search: req.query.search,
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0
    };

    const auditLogs = await auditService.getAuditLogs(filters);

    res.status(200).json({
      success: true,
      message: 'Audit logs retrieved successfully',
      data: auditLogs
    });

  } catch (error) {
    console.error('Get Audit Logs Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve audit logs',
      error: error.message
    });
  }
};

/**
 * Get login/logout logs
 * @route GET /api/admin/audit-logs/login
 */
exports.getLoginLogs = async (req, res) => {
  try {
    const filters = {
      user_id: req.query.user_id,
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0
    };

    const loginLogs = await auditService.getLoginLogs(filters);

    res.status(200).json({
      success: true,
      message: 'Login logs retrieved successfully',
      data: loginLogs
    });

  } catch (error) {
    console.error('Get Login Logs Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve login logs',
      error: error.message
    });
  }
};

/**
 * Get data modification logs
 * @route GET /api/admin/audit-logs/modifications
 */
exports.getDataModificationLogs = async (req, res) => {
  try {
    const filters = {
      module: req.query.module,
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0
    };

    const modificationLogs = await auditService.getDataModificationLogs(filters);

    res.status(200).json({
      success: true,
      message: 'Data modification logs retrieved successfully',
      data: modificationLogs
    });

  } catch (error) {
    console.error('Get Data Modification Logs Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve data modification logs',
      error: error.message
    });
  }
};

/**
 * Get security logs
 * @route GET /api/admin/audit-logs/security
 */
exports.getSecurityLogs = async (req, res) => {
  try {
    const filters = {
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0
    };

    const securityLogs = await auditService.getSecurityLogs(filters);

    res.status(200).json({
      success: true,
      message: 'Security logs retrieved successfully',
      data: securityLogs
    });

  } catch (error) {
    console.error('Get Security Logs Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve security logs',
      error: error.message
    });
  }
};

/**
 * Get audit statistics
 * @route GET /api/admin/audit-logs/statistics
 */
exports.getAuditStatistics = async (req, res) => {
  try {
    const statistics = await auditService.getAuditStatistics();

    res.status(200).json({
      success: true,
      message: 'Audit statistics retrieved successfully',
      data: statistics
    });

  } catch (error) {
    console.error('Get Audit Statistics Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve audit statistics',
      error: error.message
    });
  }
};

module.exports = exports;
