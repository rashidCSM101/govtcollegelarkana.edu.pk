const backupService = require('./backup.service');

/**
 * Backup Controller
 * Handles HTTP requests for database backup and restore
 */

/**
 * Create database backup
 * @route POST /api/admin/backup/create
 */
exports.createBackup = async (req, res) => {
  try {
    const userId = req.user.id;
    const backupType = 'manual';

    const backupResult = await backupService.createBackup(backupType, userId);

    res.status(201).json({
      success: true,
      message: 'Database backup created successfully',
      data: backupResult
    });

  } catch (error) {
    console.error('Create Backup Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create database backup',
      error: error.message
    });
  }
};

/**
 * Get list of all backups
 * @route GET /api/admin/backup/list
 */
exports.listBackups = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      backup_type: req.query.backup_type,
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0
    };

    const backupList = await backupService.listBackups(filters);

    res.status(200).json({
      success: true,
      message: 'Backup list retrieved successfully',
      data: backupList
    });

  } catch (error) {
    console.error('List Backups Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve backup list',
      error: error.message
    });
  }
};

/**
 * Restore database from backup
 * @route POST /api/admin/backup/restore
 * @body backupId - Backup ID to restore
 */
exports.restoreBackup = async (req, res) => {
  try {
    const { backupId } = req.body;
    const userId = req.user.id;

    if (!backupId) {
      return res.status(400).json({
        success: false,
        message: 'Backup ID is required'
      });
    }

    // Validate backup ID
    if (isNaN(backupId) || backupId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid backup ID'
      });
    }

    const restoreResult = await backupService.restoreBackup(backupId, userId);

    res.status(200).json({
      success: true,
      message: 'Database restored successfully',
      data: restoreResult,
      warning: 'Database has been restored. Please refresh your application.'
    });

  } catch (error) {
    console.error('Restore Backup Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to restore database from backup',
      error: error.message
    });
  }
};

/**
 * Download backup file
 * @route GET /api/admin/backup/download/:backupId
 */
exports.downloadBackup = async (req, res) => {
  try {
    const { backupId } = req.params;
    const pool = require('../../config/database');
    const fs = require('fs');

    // Get backup details
    const backupResult = await pool.query(
      'SELECT * FROM database_backups WHERE id = $1',
      [backupId]
    );

    if (backupResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Backup not found'
      });
    }

    const backup = backupResult.rows[0];

    // Check if file exists
    if (!fs.existsSync(backup.file_path)) {
      return res.status(404).json({
        success: false,
        message: 'Backup file not found on disk'
      });
    }

    // Set headers for download
    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', `attachment; filename="${backup.file_name}"`);

    // Stream file
    const fileStream = fs.createReadStream(backup.file_path);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Download Backup Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to download backup file',
      error: error.message
    });
  }
};

module.exports = exports;
