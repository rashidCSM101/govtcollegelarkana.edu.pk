const pool = require('../../config/database');
const path = require('path');
const fs = require('fs');

class DocumentService {
  // ==================== DOCUMENT UPLOAD (STUDENT) ====================

  /**
   * Upload document
   * @param {number} studentId - Student ID
   * @param {string} documentType - Document type (CNIC, Certificate, Domicile, Photo, etc.)
   * @param {string} documentPath - File path
   * @param {string} fileName - Original file name
   * @param {number} fileSize - File size in bytes
   * @param {string} mimeType - File MIME type
   */
  async uploadDocument(studentId, documentType, documentPath, fileName, fileSize, mimeType) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Validate document type
      const validTypes = [
        'CNIC',
        'Birth Certificate',
        'Domicile',
        'Matric Certificate',
        'Intermediate Certificate',
        'Previous Degree',
        'Photo',
        'Character Certificate',
        'Migration Certificate',
        'Other'
      ];

      if (!validTypes.includes(documentType)) {
        throw new Error('Invalid document type');
      }

      // Check if document already exists and is pending/verified
      const existingDoc = await client.query(
        `SELECT id, status FROM student_documents 
         WHERE student_id = $1 AND document_type = $2 
         ORDER BY uploaded_at DESC LIMIT 1`,
        [studentId, documentType]
      );

      // If document exists and is verified, prevent re-upload
      if (existingDoc.rows.length > 0 && existingDoc.rows[0].status === 'Verified') {
        throw new Error('This document is already verified. Contact admin if you need to update it.');
      }

      // If document exists and is pending, mark old one as replaced
      if (existingDoc.rows.length > 0 && existingDoc.rows[0].status === 'Pending') {
        await client.query(
          `UPDATE student_documents 
           SET status = 'Replaced', updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [existingDoc.rows[0].id]
        );
      }

      // Insert new document
      const result = await client.query(
        `INSERT INTO student_documents (
          student_id, document_type, file_path, file_name, 
          file_size, mime_type, status, uploaded_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
        RETURNING *`,
        [studentId, documentType, documentPath, fileName, fileSize, mimeType, 'Pending']
      );

      await client.query('COMMIT');

      return result.rows[0];

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get student documents
   * @param {number} studentId - Student ID
   * @param {object} filters - Filters (document_type, status)
   */
  async getStudentDocuments(studentId, filters = {}) {
    let conditions = ['student_id = $1'];
    let params = [studentId];
    let paramIndex = 2;

    // Exclude replaced documents
    conditions.push("status != 'Replaced'");

    if (filters.document_type) {
      conditions.push(`document_type = $${paramIndex}`);
      params.push(filters.document_type);
      paramIndex++;
    }

    if (filters.status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    const result = await pool.query(
      `SELECT sd.*, 
              a.first_name || ' ' || a.last_name as verified_by_name
       FROM student_documents sd
       LEFT JOIN admins a ON sd.verified_by = a.id
       WHERE ${whereClause}
       ORDER BY sd.uploaded_at DESC`,
      params
    );

    return result.rows;
  }

  /**
   * Get document status summary
   * @param {number} studentId - Student ID
   */
  async getDocumentStatus(studentId) {
    const result = await pool.query(
      `SELECT 
        COUNT(*) as total_documents,
        COUNT(*) FILTER (WHERE status = 'Pending') as pending,
        COUNT(*) FILTER (WHERE status = 'Verified') as verified,
        COUNT(*) FILTER (WHERE status = 'Rejected') as rejected
       FROM student_documents
       WHERE student_id = $1 AND status != 'Replaced'`,
      [studentId]
    );

    const summary = result.rows[0];

    // Get list of verified document types
    const verifiedDocs = await pool.query(
      `SELECT document_type 
       FROM student_documents 
       WHERE student_id = $1 AND status = 'Verified'`,
      [studentId]
    );

    // Get list of pending document types
    const pendingDocs = await pool.query(
      `SELECT document_type 
       FROM student_documents 
       WHERE student_id = $1 AND status = 'Pending'`,
      [studentId]
    );

    // Get list of rejected document types with remarks
    const rejectedDocs = await pool.query(
      `SELECT document_type, verification_remarks 
       FROM student_documents 
       WHERE student_id = $1 AND status = 'Rejected'
       ORDER BY updated_at DESC`,
      [studentId]
    );

    return {
      total_documents: parseInt(summary.total_documents),
      pending: parseInt(summary.pending),
      verified: parseInt(summary.verified),
      rejected: parseInt(summary.rejected),
      verified_documents: verifiedDocs.rows.map(d => d.document_type),
      pending_documents: pendingDocs.rows.map(d => d.document_type),
      rejected_documents: rejectedDocs.rows.map(d => ({
        document_type: d.document_type,
        remarks: d.verification_remarks
      }))
    };
  }

  /**
   * Get single document
   * @param {number} documentId - Document ID
   * @param {number} studentId - Student ID (for authorization)
   */
  async getDocument(documentId, studentId) {
    const result = await pool.query(
      `SELECT sd.*, 
              s.first_name || ' ' || s.last_name as student_name,
              s.roll_number,
              a.first_name || ' ' || a.last_name as verified_by_name
       FROM student_documents sd
       LEFT JOIN students s ON sd.student_id = s.id
       LEFT JOIN admins a ON sd.verified_by = a.id
       WHERE sd.id = $1 AND sd.student_id = $2`,
      [documentId, studentId]
    );

    if (result.rows.length === 0) {
      throw new Error('Document not found or access denied');
    }

    return result.rows[0];
  }

  /**
   * Download document
   * @param {number} documentId - Document ID
   * @param {number} studentId - Student ID (for authorization)
   */
  async downloadDocument(documentId, studentId) {
    const document = await this.getDocument(documentId, studentId);

    const fullPath = path.join(__dirname, '../..', document.file_path);

    if (!fs.existsSync(fullPath)) {
      throw new Error('File not found on server');
    }

    return {
      path: fullPath,
      filename: document.file_name,
      mimeType: document.mime_type
    };
  }

  // ==================== DOCUMENT VERIFICATION (ADMIN) ====================

  /**
   * Get pending documents for verification
   * @param {object} filters - Filters (document_type, student_id)
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   */
  async getPendingDocuments(filters = {}, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    let conditions = ["status = 'Pending'"];
    let params = [];
    let paramIndex = 1;

    if (filters.document_type) {
      conditions.push(`sd.document_type = $${paramIndex}`);
      params.push(filters.document_type);
      paramIndex++;
    }

    if (filters.student_id) {
      conditions.push(`sd.student_id = $${paramIndex}`);
      params.push(filters.student_id);
      paramIndex++;
    }

    if (filters.department_id) {
      conditions.push(`s.department_id = $${paramIndex}`);
      params.push(filters.department_id);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total 
       FROM student_documents sd
       LEFT JOIN students s ON sd.student_id = s.id
       WHERE ${whereClause}`,
      params
    );

    // Get documents
    const result = await pool.query(
      `SELECT sd.*, 
              s.first_name || ' ' || s.last_name as student_name,
              s.roll_number,
              s.email,
              d.name as department_name,
              p.name as program_name
       FROM student_documents sd
       LEFT JOIN students s ON sd.student_id = s.id
       LEFT JOIN departments d ON s.department_id = d.id
       LEFT JOIN programs p ON s.program_id = p.id
       WHERE ${whereClause}
       ORDER BY sd.uploaded_at ASC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return {
      documents: result.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].total),
        totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
      }
    };
  }

  /**
   * Get document by ID (Admin)
   * @param {number} documentId - Document ID
   */
  async getDocumentById(documentId) {
    const result = await pool.query(
      `SELECT sd.*, 
              s.first_name || ' ' || s.last_name as student_name,
              s.roll_number,
              s.email,
              s.phone,
              d.name as department_name,
              p.name as program_name,
              a.first_name || ' ' || a.last_name as verified_by_name
       FROM student_documents sd
       LEFT JOIN students s ON sd.student_id = s.id
       LEFT JOIN departments d ON s.department_id = d.id
       LEFT JOIN programs p ON s.program_id = p.id
       LEFT JOIN admins a ON sd.verified_by = a.id
       WHERE sd.id = $1`,
      [documentId]
    );

    if (result.rows.length === 0) {
      throw new Error('Document not found');
    }

    return result.rows[0];
  }

  /**
   * Verify document
   * @param {number} documentId - Document ID
   * @param {number} adminId - Admin ID
   * @param {string} remarks - Verification remarks (optional)
   */
  async verifyDocument(documentId, adminId, remarks = null) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get document details
      const docResult = await client.query(
        'SELECT * FROM student_documents WHERE id = $1',
        [documentId]
      );

      if (docResult.rows.length === 0) {
        throw new Error('Document not found');
      }

      const document = docResult.rows[0];

      if (document.status !== 'Pending') {
        throw new Error('Only pending documents can be verified');
      }

      // Update document status
      await client.query(
        `UPDATE student_documents 
         SET status = 'Verified',
             verified_by = $1,
             verified_at = CURRENT_TIMESTAMP,
             verification_remarks = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [adminId, remarks, documentId]
      );

      await client.query('COMMIT');

      // TODO: Send notification to student
      // await notificationService.createNotification(
      //   document.student_id,
      //   'student',
      //   'document',
      //   'Document Verified',
      //   `Your ${document.document_type} has been verified.`,
      //   { document_type: document.document_type },
      //   'normal'
      // );

      return {
        message: 'Document verified successfully',
        document_id: documentId
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Reject document
   * @param {number} documentId - Document ID
   * @param {number} adminId - Admin ID
   * @param {string} remarks - Rejection reason (required)
   */
  async rejectDocument(documentId, adminId, remarks) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      if (!remarks || remarks.trim() === '') {
        throw new Error('Rejection remarks are required');
      }

      // Get document details
      const docResult = await client.query(
        'SELECT * FROM student_documents WHERE id = $1',
        [documentId]
      );

      if (docResult.rows.length === 0) {
        throw new Error('Document not found');
      }

      const document = docResult.rows[0];

      if (document.status !== 'Pending') {
        throw new Error('Only pending documents can be rejected');
      }

      // Update document status
      await client.query(
        `UPDATE student_documents 
         SET status = 'Rejected',
             verified_by = $1,
             verified_at = CURRENT_TIMESTAMP,
             verification_remarks = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [adminId, remarks, documentId]
      );

      await client.query('COMMIT');

      // TODO: Send notification to student
      // await notificationService.createNotification(
      //   document.student_id,
      //   'student',
      //   'document',
      //   'Document Rejected',
      //   `Your ${document.document_type} has been rejected. Reason: ${remarks}`,
      //   { document_type: document.document_type, remarks },
      //   'high'
      // );

      return {
        message: 'Document rejected successfully',
        document_id: documentId
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all documents (Admin)
   * @param {object} filters - Filters
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   */
  async getAllDocuments(filters = {}, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    let conditions = ["sd.status != 'Replaced'"];
    let params = [];
    let paramIndex = 1;

    if (filters.document_type) {
      conditions.push(`sd.document_type = $${paramIndex}`);
      params.push(filters.document_type);
      paramIndex++;
    }

    if (filters.status) {
      conditions.push(`sd.status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.student_id) {
      conditions.push(`sd.student_id = $${paramIndex}`);
      params.push(filters.student_id);
      paramIndex++;
    }

    if (filters.department_id) {
      conditions.push(`s.department_id = $${paramIndex}`);
      params.push(filters.department_id);
      paramIndex++;
    }

    if (filters.search) {
      conditions.push(`(s.first_name ILIKE $${paramIndex} OR s.last_name ILIKE $${paramIndex} OR s.roll_number ILIKE $${paramIndex})`);
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total 
       FROM student_documents sd
       LEFT JOIN students s ON sd.student_id = s.id
       WHERE ${whereClause}`,
      params
    );

    // Get documents
    const result = await pool.query(
      `SELECT sd.*, 
              s.first_name || ' ' || s.last_name as student_name,
              s.roll_number,
              d.name as department_name,
              a.first_name || ' ' || a.last_name as verified_by_name
       FROM student_documents sd
       LEFT JOIN students s ON sd.student_id = s.id
       LEFT JOIN departments d ON s.department_id = d.id
       LEFT JOIN admins a ON sd.verified_by = a.id
       WHERE ${whereClause}
       ORDER BY sd.uploaded_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return {
      documents: result.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].total),
        totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
      }
    };
  }

  /**
   * Download document (Admin)
   * @param {number} documentId - Document ID
   */
  async downloadDocumentAdmin(documentId) {
    const document = await this.getDocumentById(documentId);

    const fullPath = path.join(__dirname, '../..', document.file_path);

    if (!fs.existsSync(fullPath)) {
      throw new Error('File not found on server');
    }

    return {
      path: fullPath,
      filename: document.file_name,
      mimeType: document.mime_type
    };
  }

  /**
   * Get document verification statistics
   */
  async getVerificationStatistics() {
    const result = await pool.query(
      `SELECT 
        COUNT(*) as total_documents,
        COUNT(*) FILTER (WHERE status = 'Pending') as pending,
        COUNT(*) FILTER (WHERE status = 'Verified') as verified,
        COUNT(*) FILTER (WHERE status = 'Rejected') as rejected,
        COUNT(DISTINCT student_id) as total_students,
        COUNT(DISTINCT student_id) FILTER (WHERE status = 'Pending') as students_with_pending
       FROM student_documents
       WHERE status != 'Replaced'`
    );

    const stats = result.rows[0];

    // Get verification stats by document type
    const typeStats = await pool.query(
      `SELECT 
        document_type,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'Pending') as pending,
        COUNT(*) FILTER (WHERE status = 'Verified') as verified,
        COUNT(*) FILTER (WHERE status = 'Rejected') as rejected
       FROM student_documents
       WHERE status != 'Replaced'
       GROUP BY document_type
       ORDER BY document_type`
    );

    return {
      overall: {
        total_documents: parseInt(stats.total_documents),
        pending: parseInt(stats.pending),
        verified: parseInt(stats.verified),
        rejected: parseInt(stats.rejected),
        total_students: parseInt(stats.total_students),
        students_with_pending: parseInt(stats.students_with_pending)
      },
      by_type: typeStats.rows.map(row => ({
        document_type: row.document_type,
        total: parseInt(row.total),
        pending: parseInt(row.pending),
        verified: parseInt(row.verified),
        rejected: parseInt(row.rejected)
      }))
    };
  }
}

module.exports = new DocumentService();
