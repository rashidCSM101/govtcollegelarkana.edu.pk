const pool = require('../../config/database');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const execPromise = util.promisify(exec);

/**
 * Backup Service
 * Handles database backup and restore operations
 */
class BackupService {

  /**
   * Create database backup
   * @param {string} backupType - Backup type (manual, auto)
   * @param {number} userId - User ID performing backup
   * @returns {Promise<Object>} Backup details
   */
  async createBackup(backupType = 'manual', userId) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `backup_govt_college_larkana_${timestamp}.sql`;
      const backupDir = path.join(__dirname, '../../backups');
      const backupPath = path.join(backupDir, backupFileName);

      // Ensure backup directory exists
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // Get database connection details from environment or config
      const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'govt_college_larkana',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || ''
      };

      // Create PostgreSQL backup using pg_dump
      // Note: pg_dump should be installed and available in PATH
      const pgDumpCommand = `PGPASSWORD="${dbConfig.password}" pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} -F p -f "${backupPath}"`;

      console.log('Starting database backup...');
      
      try {
        await execPromise(pgDumpCommand);
      } catch (execError) {
        console.error('pg_dump execution error:', execError);
        throw new Error('Database backup command failed. Ensure pg_dump is installed and accessible.');
      }

      // Verify backup file was created
      if (!fs.existsSync(backupPath)) {
        throw new Error('Backup file was not created');
      }

      // Get file size
      const stats = fs.statSync(backupPath);
      const fileSizeInBytes = stats.size;
      const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);

      // Save backup metadata to database
      const backupRecord = await pool.query(
        `INSERT INTO database_backups (file_name, file_path, file_size, backup_type, status, created_by, created_at)
         VALUES ($1, $2, $3, $4, 'Completed', $5, NOW())
         RETURNING *`,
        [backupFileName, backupPath, fileSizeInMB + ' MB', backupType, userId]
      );

      // Log backup activity
      await this.logBackupActivity(userId, 'CREATE_BACKUP', {
        fileName: backupFileName,
        fileSize: fileSizeInMB + ' MB',
        backupType
      });

      // TODO: Upload to cloud storage (AWS S3, Google Cloud, etc.)
      // await this.uploadToCloud(backupPath);

      return {
        id: backupRecord.rows[0].id,
        fileName: backupFileName,
        filePath: backupPath,
        fileSize: fileSizeInMB + ' MB',
        backupType,
        status: 'Completed',
        createdAt: new Date()
      };

    } catch (error) {
      console.error('Create Backup Error:', error);
      
      // Log failed backup attempt
      try {
        await pool.query(
          `INSERT INTO database_backups (file_name, backup_type, status, error_message, created_by, created_at)
           VALUES ($1, $2, 'Failed', $3, $4, NOW())`,
          [`backup_failed_${Date.now()}.sql`, backupType, error.message, userId]
        );
      } catch (logError) {
        console.error('Failed to log backup error:', logError);
      }

      throw new Error(error.message || 'Failed to create database backup');
    }
  }

  /**
   * Get list of all backups
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} List of backups
   */
  async listBackups(filters = {}) {
    try {
      const { status, backup_type, limit = 50, offset = 0 } = filters;

      let query = `
        SELECT 
          db.id,
          db.file_name,
          db.file_path,
          db.file_size,
          db.backup_type,
          db.status,
          db.error_message,
          db.created_at,
          u.name as created_by_name
        FROM database_backups db
        LEFT JOIN users u ON db.created_by = u.id
        WHERE 1=1
      `;

      const params = [];
      
      if (status) {
        params.push(status);
        query += ` AND db.status = $${params.length}`;
      }

      if (backup_type) {
        params.push(backup_type);
        query += ` AND db.backup_type = $${params.length}`;
      }

      query += ` ORDER BY db.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM database_backups
        WHERE 1=1
        ${status ? `AND status = '${status}'` : ''}
        ${backup_type ? `AND backup_type = '${backup_type}'` : ''}
      `;
      const countResult = await pool.query(countQuery);

      return {
        backups: result.rows,
        total: parseInt(countResult.rows[0].total),
        limit,
        offset
      };

    } catch (error) {
      console.error('List Backups Error:', error);
      throw new Error('Failed to fetch backup list');
    }
  }

  /**
   * Restore database from backup
   * @param {number} backupId - Backup ID to restore
   * @param {number} userId - User ID performing restore
   * @returns {Promise<Object>} Restore result
   */
  async restoreBackup(backupId, userId) {
    try {
      // Get backup details
      const backupResult = await pool.query(
        'SELECT * FROM database_backups WHERE id = $1',
        [backupId]
      );

      if (backupResult.rows.length === 0) {
        throw new Error('Backup not found');
      }

      const backup = backupResult.rows[0];

      // Check if backup file exists
      if (!fs.existsSync(backup.file_path)) {
        throw new Error('Backup file not found on disk');
      }

      // Get database connection details
      const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'govt_college_larkana',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || ''
      };

      // WARNING: This will drop and recreate the database
      // In production, you might want to create a temporary database first
      
      console.log('Starting database restore...');
      console.warn('WARNING: This operation will replace current database!');

      // Restore using psql
      const psqlCommand = `PGPASSWORD="${dbConfig.password}" psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} -f "${backup.file_path}"`;

      try {
        await execPromise(psqlCommand);
      } catch (execError) {
        console.error('psql execution error:', execError);
        throw new Error('Database restore command failed. Ensure psql is installed and accessible.');
      }

      // Log restore activity
      await this.logBackupActivity(userId, 'RESTORE_BACKUP', {
        backupId: backup.id,
        fileName: backup.file_name,
        restoredAt: new Date()
      });

      // Update backup record
      await pool.query(
        `UPDATE database_backups SET last_restored_at = NOW(), last_restored_by = $1 WHERE id = $2`,
        [userId, backupId]
      );

      return {
        success: true,
        message: 'Database restored successfully',
        backupId: backup.id,
        fileName: backup.file_name,
        restoredAt: new Date()
      };

    } catch (error) {
      console.error('Restore Backup Error:', error);
      throw new Error(error.message || 'Failed to restore database from backup');
    }
  }

  /**
   * Delete old backups (retention policy)
   * @param {number} retentionDays - Number of days to keep backups
   * @returns {Promise<Object>} Deletion result
   */
  async deleteOldBackups(retentionDays = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // Get old backups
      const oldBackups = await pool.query(
        `SELECT * FROM database_backups 
         WHERE created_at < $1 AND backup_type = 'auto'
         ORDER BY created_at ASC`,
        [cutoffDate]
      );

      let deletedCount = 0;
      let deletedSize = 0;

      // Delete files and database records
      for (const backup of oldBackups.rows) {
        try {
          // Delete file if exists
          if (fs.existsSync(backup.file_path)) {
            const stats = fs.statSync(backup.file_path);
            deletedSize += stats.size;
            fs.unlinkSync(backup.file_path);
          }

          // Delete database record
          await pool.query('DELETE FROM database_backups WHERE id = $1', [backup.id]);
          deletedCount++;
        } catch (fileError) {
          console.error(`Failed to delete backup ${backup.id}:`, fileError);
        }
      }

      return {
        deletedCount,
        deletedSize: (deletedSize / (1024 * 1024)).toFixed(2) + ' MB',
        retentionDays
      };

    } catch (error) {
      console.error('Delete Old Backups Error:', error);
      throw new Error('Failed to delete old backups');
    }
  }

  /**
   * Schedule automatic backups (called by cron job)
   * @returns {Promise<Object>} Backup result
   */
  async scheduledBackup() {
    try {
      console.log('Running scheduled backup...');
      
      // Create auto backup
      const result = await this.createBackup('auto', null); // System user

      // Clean old backups (keep last 30 days)
      await this.deleteOldBackups(30);

      return result;

    } catch (error) {
      console.error('Scheduled Backup Error:', error);
      throw error;
    }
  }

  /**
   * Upload backup to cloud storage (placeholder)
   * @param {string} backupPath - Local backup file path
   * @returns {Promise<Object>} Upload result
   */
  async uploadToCloud(backupPath) {
    try {
      // TODO: Implement cloud upload
      // Examples:
      // - AWS S3: Use aws-sdk
      // - Google Cloud Storage: Use @google-cloud/storage
      // - Azure Blob Storage: Use @azure/storage-blob
      
      console.log('Cloud upload not implemented yet:', backupPath);
      
      return {
        success: false,
        message: 'Cloud upload feature not implemented'
      };

    } catch (error) {
      console.error('Upload to Cloud Error:', error);
      throw new Error('Failed to upload backup to cloud');
    }
  }

  /**
   * Log backup activity
   * @param {number} userId - User ID
   * @param {string} action - Action performed
   * @param {Object} details - Action details
   */
  async logBackupActivity(userId, action, details) {
    try {
      await pool.query(
        `INSERT INTO audit_logs (user_id, action, module, details, ip_address, created_at)
         VALUES ($1, $2, 'BACKUP', $3, 'system', NOW())`,
        [userId, action, JSON.stringify(details)]
      );
    } catch (error) {
      console.error('Log Backup Activity Error:', error);
      // Don't throw error, just log it
    }
  }
}

module.exports = new BackupService();
