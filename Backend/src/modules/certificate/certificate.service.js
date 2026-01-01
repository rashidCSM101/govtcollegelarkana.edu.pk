const pool = require('../../config/database');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class CertificateService {
  // ==================== CERTIFICATE REQUEST (STUDENT) ====================

  /**
   * Request a certificate
   * @param {number} studentId - Student ID
   * @param {string} certificateType - Type of certificate
   * @param {string} purpose - Purpose of certificate
   * @param {object} additionalDetails - Additional details based on type
   * @returns {object} Certificate request
   */
  async requestCertificate(studentId, certificateType, purpose, additionalDetails = {}) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Validate certificate type
      const validTypes = [
        'Bonafide',
        'Character',
        'Course Completion',
        'Migration',
        'Provisional',
        'Degree'
      ];

      if (!validTypes.includes(certificateType)) {
        throw new Error('Invalid certificate type');
      }

      // Get student details
      const studentResult = await client.query(
        `SELECT s.*, d.name as department_name, d.id as department_id,
                ss.session_year, p.name as program_name
         FROM students s
         LEFT JOIN departments d ON s.department_id = d.id
         LEFT JOIN student_sessions ss ON s.id = ss.student_id AND ss.is_active = true
         LEFT JOIN programs p ON s.program_id = p.id
         WHERE s.id = $1`,
        [studentId]
      );

      if (studentResult.rows.length === 0) {
        throw new Error('Student not found');
      }

      const student = studentResult.rows[0];

      // Check for pending requests of same type
      const pendingCheck = await client.query(
        `SELECT id FROM certificate_requests 
         WHERE student_id = $1 AND certificate_type = $2 
         AND status IN ('Pending', 'Processing')`,
        [studentId, certificateType]
      );

      if (pendingCheck.rows.length > 0) {
        throw new Error(`You already have a pending ${certificateType} certificate request`);
      }

      // Determine fee based on certificate type
      const feeMap = {
        'Bonafide': 100,
        'Character': 150,
        'Course Completion': 200,
        'Migration': 500,
        'Provisional': 300,
        'Degree': 1000
      };

      const fee = feeMap[certificateType] || 100;

      // Generate request number
      const requestNumber = await this.generateRequestNumber(client);

      // Insert certificate request
      const insertResult = await client.query(
        `INSERT INTO certificate_requests (
          request_number, student_id, certificate_type, purpose, 
          additional_details, fee_amount, status, requested_date
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
        RETURNING *`,
        [
          requestNumber,
          studentId,
          certificateType,
          purpose,
          JSON.stringify(additionalDetails),
          fee,
          'Pending'
        ]
      );

      await client.query('COMMIT');

      const request = insertResult.rows[0];

      return {
        ...request,
        additional_details: JSON.parse(request.additional_details || '{}'),
        student_name: `${student.first_name} ${student.last_name}`,
        department_name: student.department_name,
        program_name: student.program_name
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Generate unique request number
   */
  async generateRequestNumber(client) {
    const year = new Date().getFullYear();
    const prefix = `CRT${year}`;

    const result = await client.query(
      `SELECT request_number FROM certificate_requests 
       WHERE request_number LIKE $1 
       ORDER BY request_number DESC LIMIT 1`,
      [`${prefix}%`]
    );

    let nextNumber = 1;
    if (result.rows.length > 0) {
      const lastNumber = result.rows[0].request_number.replace(prefix, '');
      nextNumber = parseInt(lastNumber) + 1;
    }

    return `${prefix}${String(nextNumber).padStart(5, '0')}`;
  }

  /**
   * Get student's certificate requests
   * @param {number} studentId - Student ID
   * @param {object} filters - Filters (status, certificate_type)
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   */
  async getStudentRequests(studentId, filters = {}, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    let conditions = ['cr.student_id = $1'];
    let params = [studentId];
    let paramIndex = 2;

    if (filters.status) {
      conditions.push(`cr.status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.certificate_type) {
      conditions.push(`cr.certificate_type = $${paramIndex}`);
      params.push(filters.certificate_type);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM certificate_requests cr WHERE ${whereClause}`,
      params
    );

    // Get requests with details
    const result = await pool.query(
      `SELECT cr.*, 
              s.first_name, s.last_name, s.roll_number,
              d.name as department_name,
              p.name as program_name,
              admin.first_name as issued_by_name
       FROM certificate_requests cr
       LEFT JOIN students s ON cr.student_id = s.id
       LEFT JOIN departments d ON s.department_id = d.id
       LEFT JOIN programs p ON s.program_id = p.id
       LEFT JOIN admins admin ON cr.issued_by = admin.id
       WHERE ${whereClause}
       ORDER BY cr.requested_date DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const requests = result.rows.map(req => ({
      ...req,
      additional_details: JSON.parse(req.additional_details || '{}'),
      student_name: `${req.first_name} ${req.last_name}`
    }));

    return {
      requests,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].total),
        totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
      }
    };
  }

  // ==================== CERTIFICATE GENERATION (ADMIN) ====================

  /**
   * Get pending certificate requests
   * @param {object} filters - Filters
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   */
  async getPendingRequests(filters = {}, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    let conditions = ["cr.status IN ('Pending', 'Processing')"];
    let params = [];
    let paramIndex = 1;

    if (filters.certificate_type) {
      conditions.push(`cr.certificate_type = $${paramIndex}`);
      params.push(filters.certificate_type);
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
       FROM certificate_requests cr
       LEFT JOIN students s ON cr.student_id = s.id
       WHERE ${whereClause}`,
      params
    );

    // Get requests
    const result = await pool.query(
      `SELECT cr.*, 
              s.first_name, s.last_name, s.roll_number, s.email,
              s.father_name, s.cnic, s.date_of_birth,
              d.name as department_name,
              p.name as program_name,
              ss.session_year
       FROM certificate_requests cr
       LEFT JOIN students s ON cr.student_id = s.id
       LEFT JOIN departments d ON s.department_id = d.id
       LEFT JOIN programs p ON s.program_id = p.id
       LEFT JOIN student_sessions ss ON s.id = ss.student_id AND ss.is_active = true
       WHERE ${whereClause}
       ORDER BY cr.requested_date ASC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const requests = result.rows.map(req => ({
      ...req,
      additional_details: JSON.parse(req.additional_details || '{}'),
      student_name: `${req.first_name} ${req.last_name}`
    }));

    return {
      requests,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].total),
        totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
      }
    };
  }

  /**
   * Generate certificate
   * @param {number} requestId - Certificate request ID
   * @param {number} adminId - Admin who is generating
   * @param {object} additionalInfo - Additional information for certificate
   */
  async generateCertificate(requestId, adminId, additionalInfo = {}) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get certificate request with full student details
      const requestResult = await client.query(
        `SELECT cr.*, 
                s.first_name, s.last_name, s.roll_number, s.email,
                s.father_name, s.cnic, s.date_of_birth, s.gender,
                d.name as department_name,
                p.name as program_name,
                ss.session_year
         FROM certificate_requests cr
         LEFT JOIN students s ON cr.student_id = s.id
         LEFT JOIN departments d ON s.department_id = d.id
         LEFT JOIN programs p ON s.program_id = p.id
         LEFT JOIN student_sessions ss ON s.id = ss.student_id AND ss.is_active = true
         WHERE cr.id = $1`,
        [requestId]
      );

      if (requestResult.rows.length === 0) {
        throw new Error('Certificate request not found');
      }

      const request = requestResult.rows[0];

      if (request.status === 'Issued') {
        throw new Error('Certificate already issued');
      }

      if (request.status === 'Rejected') {
        throw new Error('Cannot generate certificate for rejected request');
      }

      // Check if fee is paid (if applicable)
      if (request.fee_amount > 0 && !request.fee_paid) {
        throw new Error('Certificate fee not paid');
      }

      // Generate certificate number
      const certificateNumber = await this.generateCertificateNumber(client, request.certificate_type);

      // Generate verification code
      const verificationCode = this.generateVerificationCode();

      // Generate PDF
      const pdfPath = await this.generateCertificatePDF(request, certificateNumber, verificationCode, additionalInfo);

      // Update request status
      await client.query(
        `UPDATE certificate_requests 
         SET status = 'Issued',
             certificate_number = $1,
             verification_code = $2,
             certificate_path = $3,
             issued_by = $4,
             issued_date = CURRENT_TIMESTAMP
         WHERE id = $5`,
        [certificateNumber, verificationCode, pdfPath, adminId, requestId]
      );

      await client.query('COMMIT');

      return {
        request_id: requestId,
        certificate_number: certificateNumber,
        verification_code: verificationCode,
        certificate_path: pdfPath,
        message: 'Certificate generated successfully'
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Generate unique certificate number
   */
  async generateCertificateNumber(client, certificateType) {
    const year = new Date().getFullYear();
    const typeCode = {
      'Bonafide': 'BON',
      'Character': 'CHR',
      'Course Completion': 'CC',
      'Migration': 'MIG',
      'Provisional': 'PRV',
      'Degree': 'DEG'
    }[certificateType] || 'CRT';

    const prefix = `${typeCode}/${year}/`;

    const result = await client.query(
      `SELECT certificate_number FROM certificate_requests 
       WHERE certificate_number LIKE $1 
       ORDER BY certificate_number DESC LIMIT 1`,
      [`${prefix}%`]
    );

    let nextNumber = 1;
    if (result.rows.length > 0) {
      const lastNumber = result.rows[0].certificate_number.split('/').pop();
      nextNumber = parseInt(lastNumber) + 1;
    }

    return `${prefix}${String(nextNumber).padStart(5, '0')}`;
  }

  /**
   * Generate verification code
   */
  generateVerificationCode() {
    return crypto.randomBytes(16).toString('hex').toUpperCase();
  }

  /**
   * Generate Certificate PDF
   */
  async generateCertificatePDF(request, certificateNumber, verificationCode, additionalInfo) {
    return new Promise(async (resolve, reject) => {
      try {
        // Ensure certificates directory exists
        const certificatesDir = path.join(__dirname, '../../uploads/certificates');
        if (!fs.existsSync(certificatesDir)) {
          fs.mkdirSync(certificatesDir, { recursive: true });
        }

        const fileName = `${certificateNumber.replace(/\//g, '-')}.pdf`;
        const filePath = path.join(certificatesDir, fileName);

        const doc = new PDFDocument({
          size: 'A4',
          margin: 50
        });

        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Generate QR code for verification
        const verificationUrl = `${process.env.APP_URL || 'http://localhost:3000'}/api/public/verify-certificate/${certificateNumber}`;
        const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl);
        const qrCodeBuffer = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');

        const studentName = `${request.first_name} ${request.last_name}`;

        // Header
        doc.fontSize(20)
           .font('Helvetica-Bold')
           .text('GOVERNMENT COLLEGE LARKANA', { align: 'center' })
           .fontSize(12)
           .font('Helvetica')
           .text('Affiliated with University of Sindh', { align: 'center' })
           .moveDown(0.5);

        doc.moveTo(50, doc.y)
           .lineTo(545, doc.y)
           .stroke();

        doc.moveDown(2);

        // Certificate Type Title
        doc.fontSize(18)
           .font('Helvetica-Bold')
           .text(`${request.certificate_type.toUpperCase()} CERTIFICATE`, { align: 'center' })
           .moveDown(1);

        // Certificate Number
        doc.fontSize(10)
           .font('Helvetica')
           .text(`Certificate No: ${certificateNumber}`, { align: 'right' })
           .text(`Issue Date: ${new Date().toLocaleDateString('en-GB')}`, { align: 'right' })
           .moveDown(1.5);

        // Certificate Body - Different content based on type
        doc.fontSize(12)
           .font('Helvetica');

        switch (request.certificate_type) {
          case 'Bonafide':
            doc.text(`This is to certify that ${studentName}, S/O ${request.father_name}, bearing Roll Number ${request.roll_number}, is a bonafide student of ${request.program_name} in ${request.department_name} for the academic session ${request.session_year}.`, {
              align: 'justify',
              lineGap: 5
            });
            doc.moveDown();
            doc.text(`Purpose: ${request.purpose}`, { align: 'justify' });
            break;

          case 'Character':
            doc.text(`This is to certify that ${studentName}, S/O ${request.father_name}, bearing Roll Number ${request.roll_number}, has been a student of ${request.program_name} in ${request.department_name} for the academic session ${request.session_year}.`, {
              align: 'justify',
              lineGap: 5
            });
            doc.moveDown();
            doc.text(`During his/her stay in this institution, his/her conduct and character have been found satisfactory. He/She bears a good moral character.`, {
              align: 'justify',
              lineGap: 5
            });
            break;

          case 'Course Completion':
            doc.text(`This is to certify that ${studentName}, S/O ${request.father_name}, bearing Roll Number ${request.roll_number}, has successfully completed ${request.program_name} from ${request.department_name} during the academic session ${request.session_year}.`, {
              align: 'justify',
              lineGap: 5
            });
            break;

          case 'Migration':
            doc.text(`This is to certify that ${studentName}, S/O ${request.father_name}, bearing Roll Number ${request.roll_number}, was a regular student of ${request.program_name} in ${request.department_name} for the academic session ${request.session_year}.`, {
              align: 'justify',
              lineGap: 5
            });
            doc.moveDown();
            doc.text(`He/She is hereby granted Migration Certificate to join another institution. His/Her character and conduct during the stay in this college were satisfactory.`, {
              align: 'justify',
              lineGap: 5
            });
            break;

          case 'Provisional':
            doc.text(`This is to certify that ${studentName}, S/O ${request.father_name}, bearing Roll Number ${request.roll_number}, has passed the examination of ${request.program_name} from ${request.department_name} held in ${request.session_year}.`, {
              align: 'justify',
              lineGap: 5
            });
            doc.moveDown();
            doc.text(`This certificate is issued provisionally pending the award of the final degree/certificate.`, {
              align: 'justify',
              lineGap: 5
            });
            break;

          case 'Degree':
            doc.text(`This is to certify that ${studentName}, S/O ${request.father_name}, bearing Roll Number ${request.roll_number}, has successfully completed ${request.program_name} from ${request.department_name} and has been awarded the degree in ${request.session_year}.`, {
              align: 'justify',
              lineGap: 5
            });
            break;

          default:
            doc.text(`This is to certify that ${studentName}, S/O ${request.father_name}, bearing Roll Number ${request.roll_number}, is associated with ${request.department_name}.`, {
              align: 'justify'
            });
        }

        doc.moveDown(3);

        // QR Code and Verification Code
        doc.image(qrCodeBuffer, 50, doc.y, { width: 80, height: 80 });

        doc.fontSize(8)
           .text(`Scan to verify`, 50, doc.y + 85, { width: 80, align: 'center' })
           .moveDown(0.5)
           .text(`Verification Code:`, 50, doc.y, { width: 80, align: 'center' })
           .text(verificationCode, 50, doc.y, { width: 80, align: 'center' });

        // Signature Section
        const signatureY = doc.page.height - 150;
        doc.fontSize(10)
           .text('Principal', 400, signatureY, { align: 'center', width: 120 })
           .text('Government College Larkana', 400, signatureY + 15, { align: 'center', width: 120 });

        // Footer
        doc.fontSize(8)
           .font('Helvetica-Oblique')
           .text('This is a computer-generated certificate. Verification can be done at college portal.', 50, doc.page.height - 50, {
             align: 'center',
             width: 495
           });

        doc.end();

        stream.on('finish', () => {
          resolve(`/uploads/certificates/${fileName}`);
        });

        stream.on('error', reject);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Download certificate
   * @param {number} requestId - Certificate request ID
   */
  async downloadCertificate(requestId) {
    const result = await pool.query(
      `SELECT cr.*, 
              s.first_name, s.last_name, s.roll_number
       FROM certificate_requests cr
       LEFT JOIN students s ON cr.student_id = s.id
       WHERE cr.id = $1`,
      [requestId]
    );

    if (result.rows.length === 0) {
      throw new Error('Certificate request not found');
    }

    const request = result.rows[0];

    if (request.status !== 'Issued') {
      throw new Error('Certificate not yet issued');
    }

    if (!request.certificate_path) {
      throw new Error('Certificate file not found');
    }

    const fullPath = path.join(__dirname, '../..', request.certificate_path);

    if (!fs.existsSync(fullPath)) {
      throw new Error('Certificate file does not exist on server');
    }

    return {
      path: fullPath,
      filename: `Certificate-${request.certificate_number.replace(/\//g, '-')}.pdf`,
      certificate_number: request.certificate_number
    };
  }

  // ==================== CERTIFICATE VERIFICATION (PUBLIC) ====================

  /**
   * Verify certificate by certificate number
   * @param {string} certificateNumber - Certificate number
   */
  async verifyCertificate(certificateNumber) {
    const result = await pool.query(
      `SELECT cr.*, 
              s.first_name, s.last_name, s.roll_number,
              s.father_name, s.date_of_birth,
              d.name as department_name,
              p.name as program_name,
              ss.session_year,
              admin.first_name as issued_by_first_name,
              admin.last_name as issued_by_last_name
       FROM certificate_requests cr
       LEFT JOIN students s ON cr.student_id = s.id
       LEFT JOIN departments d ON s.department_id = d.id
       LEFT JOIN programs p ON s.program_id = p.id
       LEFT JOIN student_sessions ss ON s.id = ss.student_id AND ss.is_active = true
       LEFT JOIN admins admin ON cr.issued_by = admin.id
       WHERE cr.certificate_number = $1 AND cr.status = 'Issued'`,
      [certificateNumber]
    );

    if (result.rows.length === 0) {
      return {
        valid: false,
        message: 'Certificate not found or not issued'
      };
    }

    const certificate = result.rows[0];

    return {
      valid: true,
      certificate: {
        certificate_number: certificate.certificate_number,
        certificate_type: certificate.certificate_type,
        student_name: `${certificate.first_name} ${certificate.last_name}`,
        father_name: certificate.father_name,
        roll_number: certificate.roll_number,
        department: certificate.department_name,
        program: certificate.program_name,
        session: certificate.session_year,
        issued_date: certificate.issued_date,
        issued_by: certificate.issued_by_first_name ? `${certificate.issued_by_first_name} ${certificate.issued_by_last_name}` : 'N/A',
        verification_code: certificate.verification_code
      },
      message: 'Certificate is valid'
    };
  }

  /**
   * Verify certificate by verification code
   * @param {string} verificationCode - Verification code
   */
  async verifyCertificateByCode(verificationCode) {
    const result = await pool.query(
      `SELECT cr.*, 
              s.first_name, s.last_name, s.roll_number,
              d.name as department_name,
              p.name as program_name
       FROM certificate_requests cr
       LEFT JOIN students s ON cr.student_id = s.id
       LEFT JOIN departments d ON s.department_id = d.id
       LEFT JOIN programs p ON s.program_id = p.id
       WHERE cr.verification_code = $1 AND cr.status = 'Issued'`,
      [verificationCode]
    );

    if (result.rows.length === 0) {
      return {
        valid: false,
        message: 'Invalid verification code'
      };
    }

    const certificate = result.rows[0];

    return {
      valid: true,
      certificate: {
        certificate_number: certificate.certificate_number,
        certificate_type: certificate.certificate_type,
        student_name: `${certificate.first_name} ${certificate.last_name}`,
        roll_number: certificate.roll_number,
        department: certificate.department_name,
        program: certificate.program_name,
        issued_date: certificate.issued_date
      }
    };
  }
}

module.exports = new CertificateService();
