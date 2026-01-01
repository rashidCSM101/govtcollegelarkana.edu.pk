const pool = require('../../config/database');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const crypto = require('crypto');

/**
 * ID Card Service
 * Handles digital ID card generation, verification, and PDF creation
 */
class IDCardService {

  /**
   * Generate unique verification code for ID card
   * @returns {string} Unique verification code
   */
  generateVerificationCode() {
    return crypto.randomBytes(16).toString('hex'); // 32-character code
  }

  /**
   * Generate barcode number (can be registration number or unique ID)
   * @param {string} registrationNumber
   * @returns {string} Barcode number
   */
  generateBarcodeNumber(registrationNumber) {
    // Use registration number as barcode, or generate unique number
    return registrationNumber.replace(/[^0-9]/g, ''); // Remove non-numeric characters
  }

  // ==================== ADMIN: ID CARD GENERATION ====================

  /**
   * Generate ID cards for students
   * @param {Object} filters - Filter criteria for students
   * @param {number} generatedBy - Admin ID
   * @returns {Promise<Object>} Generation result
   */
  async generateIDCards(filters = {}, generatedBy) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Build student query with filters
      let query = `
        SELECT 
          s.*,
          d.name as department_name,
          d.code as department_code,
          ses.name as session_name,
          ses.start_year,
          ses.end_year,
          sem.name as current_semester_name
        FROM students s
        LEFT JOIN departments d ON s.department_id = d.id
        LEFT JOIN sessions ses ON s.session_id = ses.id
        LEFT JOIN semesters sem ON s.current_semester_id = sem.id
        WHERE s.status = 'Active'
      `;

      const values = [];
      let paramCount = 1;

      if (filters.department_id) {
        query += ` AND s.department_id = $${paramCount}`;
        values.push(filters.department_id);
        paramCount++;
      }

      if (filters.session_id) {
        query += ` AND s.session_id = $${paramCount}`;
        values.push(filters.session_id);
        paramCount++;
      }

      if (filters.semester_id) {
        query += ` AND s.current_semester_id = $${paramCount}`;
        values.push(filters.semester_id);
        paramCount++;
      }

      if (filters.student_id) {
        query += ` AND s.id = $${paramCount}`;
        values.push(filters.student_id);
        paramCount++;
      }

      query += ` ORDER BY s.registration_number ASC`;

      const studentsResult = await client.query(query, values);

      if (studentsResult.rows.length === 0) {
        throw new Error('No students found matching the criteria');
      }

      const students = studentsResult.rows;
      const generatedCards = [];

      // Calculate validity (1 year from issue date)
      const issueDate = new Date();
      const validUntil = new Date(issueDate);
      validUntil.setFullYear(validUntil.getFullYear() + 1);

      for (const student of students) {
        // Check if ID card already exists
        const existingQuery = `
          SELECT * FROM id_cards 
          WHERE student_id = $1 AND status = 'Active'
        `;
        const existingResult = await client.query(existingQuery, [student.id]);

        if (existingResult.rows.length > 0) {
          // Update existing card
          const verificationCode = this.generateVerificationCode();
          const barcodeNumber = this.generateBarcodeNumber(student.registration_number);

          const updateQuery = `
            UPDATE id_cards
            SET verification_code = $1,
                barcode_number = $2,
                issue_date = $3,
                valid_until = $4,
                generated_by = $5,
                updated_at = NOW()
            WHERE student_id = $6 AND status = 'Active'
            RETURNING *
          `;

          const result = await client.query(updateQuery, [
            verificationCode,
            barcodeNumber,
            issueDate,
            validUntil,
            generatedBy,
            student.id
          ]);

          generatedCards.push(result.rows[0]);
        } else {
          // Create new ID card
          const verificationCode = this.generateVerificationCode();
          const barcodeNumber = this.generateBarcodeNumber(student.registration_number);

          const insertQuery = `
            INSERT INTO id_cards (
              student_id, card_number, verification_code, barcode_number,
              issue_date, valid_until, status, generated_by, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, 'Active', $7, NOW(), NOW())
            RETURNING *
          `;

          // Card number format: GCL-DEPT-YEAR-XXXX
          const cardNumber = `GCL-${student.department_code || 'STD'}-${issueDate.getFullYear()}-${student.registration_number.slice(-4)}`;

          const result = await client.query(insertQuery, [
            student.id,
            cardNumber,
            verificationCode,
            barcodeNumber,
            issueDate,
            validUntil,
            generatedBy
          ]);

          generatedCards.push(result.rows[0]);
        }
      }

      await client.query('COMMIT');

      return {
        message: `Successfully generated ${generatedCards.length} ID card(s)`,
        total: generatedCards.length,
        cards: generatedCards
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Generate ID Cards Error:', error);
      throw new Error(error.message || 'Failed to generate ID cards');
    } finally {
      client.release();
    }
  }

  /**
   * Verify ID card by QR code
   * @param {string} qrCode - Verification code from QR
   * @returns {Promise<Object>} Student and ID card details
   */
  async verifyIDCard(qrCode) {
    try {
      const query = `
        SELECT 
          ic.*,
          s.name as student_name,
          s.registration_number,
          s.email,
          s.phone,
          s.photo,
          s.blood_group,
          s.date_of_birth,
          s.address,
          d.name as department_name,
          ses.name as session_name,
          sem.name as semester_name
        FROM id_cards ic
        INNER JOIN students s ON ic.student_id = s.id
        LEFT JOIN departments d ON s.department_id = d.id
        LEFT JOIN sessions ses ON s.session_id = ses.id
        LEFT JOIN semesters sem ON s.current_semester_id = sem.id
        WHERE ic.verification_code = $1
      `;

      const result = await pool.query(query, [qrCode]);

      if (result.rows.length === 0) {
        throw new Error('Invalid verification code');
      }

      const idCard = result.rows[0];

      // Check if card is expired
      const currentDate = new Date();
      const validUntil = new Date(idCard.valid_until);

      if (currentDate > validUntil) {
        return {
          ...idCard,
          is_valid: false,
          verification_status: 'Expired',
          message: 'ID card has expired'
        };
      }

      // Check if card is active
      if (idCard.status !== 'Active') {
        return {
          ...idCard,
          is_valid: false,
          verification_status: 'Inactive',
          message: 'ID card is not active'
        };
      }

      return {
        ...idCard,
        is_valid: true,
        verification_status: 'Valid',
        message: 'ID card is valid'
      };

    } catch (error) {
      console.error('Verify ID Card Error:', error);
      throw new Error(error.message || 'Failed to verify ID card');
    }
  }

  // ==================== STUDENT: ID CARD ACCESS ====================

  /**
   * Get student's ID card
   * @param {number} studentId
   * @returns {Promise<Object>} ID card details
   */
  async getStudentIDCard(studentId) {
    try {
      const query = `
        SELECT 
          ic.*,
          s.name as student_name,
          s.registration_number,
          s.email,
          s.phone,
          s.photo,
          s.blood_group,
          s.date_of_birth,
          s.father_name,
          s.address,
          d.name as department_name,
          d.code as department_code,
          ses.name as session_name,
          sem.name as semester_name
        FROM id_cards ic
        INNER JOIN students s ON ic.student_id = s.id
        LEFT JOIN departments d ON s.department_id = d.id
        LEFT JOIN sessions ses ON s.session_id = ses.id
        LEFT JOIN semesters sem ON s.current_semester_id = sem.id
        WHERE ic.student_id = $1 AND ic.status = 'Active'
        ORDER BY ic.issue_date DESC
        LIMIT 1
      `;

      const result = await pool.query(query, [studentId]);

      if (result.rows.length === 0) {
        throw new Error('ID card not found. Please contact administration.');
      }

      const idCard = result.rows[0];

      // Check if expired
      const currentDate = new Date();
      const validUntil = new Date(idCard.valid_until);
      idCard.is_expired = currentDate > validUntil;

      return idCard;

    } catch (error) {
      console.error('Get Student ID Card Error:', error);
      throw new Error(error.message || 'Failed to fetch ID card');
    }
  }

  /**
   * Generate ID card PDF
   * @param {number} studentId
   * @returns {Promise<Object>} PDF file path
   */
  async generateIDCardPDF(studentId) {
    try {
      // Get ID card details
      const idCard = await this.getStudentIDCard(studentId);

      // Create uploads directory if not exists
      const uploadsDir = path.join(__dirname, '../../uploads/idcards');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const fileName = `idcard-${idCard.card_number}-${Date.now()}.pdf`;
      const filePath = path.join(uploadsDir, fileName);

      // Generate QR code as data URL
      const qrCodeData = await QRCode.toDataURL(idCard.verification_code, {
        width: 200,
        margin: 1
      });

      // Create PDF
      const doc = new PDFDocument({
        size: [252, 396], // ID card size: 3.5" x 5.5" at 72 DPI (credit card size scaled up)
        margins: { top: 20, bottom: 20, left: 20, right: 20 }
      });

      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // ==================== FRONT SIDE ====================

      // Header background
      doc.rect(0, 0, 252, 80)
         .fill('#1E40AF'); // Blue background

      // College name
      doc.fillColor('#FFFFFF')
         .fontSize(14)
         .font('Helvetica-Bold')
         .text('GOVERNMENT COLLEGE', 20, 15, { align: 'center', width: 212 });

      doc.fontSize(12)
         .text('LARKANA', 20, 32, { align: 'center', width: 212 });

      doc.fontSize(8)
         .font('Helvetica')
         .text('STUDENT ID CARD', 20, 52, { align: 'center', width: 212 });

      // Student photo (if available)
      const photoY = 90;
      if (idCard.photo && fs.existsSync(path.join(__dirname, '../..', idCard.photo))) {
        try {
          doc.image(path.join(__dirname, '../..', idCard.photo), 76, photoY, {
            width: 100,
            height: 100,
            align: 'center'
          });
        } catch (err) {
          // If photo fails, show placeholder
          doc.rect(76, photoY, 100, 100)
             .stroke('#CCCCCC');
          doc.fillColor('#999999')
             .fontSize(8)
             .text('No Photo', 76, photoY + 45, { width: 100, align: 'center' });
        }
      } else {
        // Photo placeholder
        doc.rect(76, photoY, 100, 100)
           .stroke('#CCCCCC');
        doc.fillColor('#999999')
           .fontSize(8)
           .text('No Photo', 76, photoY + 45, { width: 100, align: 'center' });
      }

      // Student details
      let detailsY = photoY + 110;

      doc.fillColor('#000000')
         .fontSize(11)
         .font('Helvetica-Bold')
         .text(idCard.student_name.toUpperCase(), 20, detailsY, { align: 'center', width: 212 });

      detailsY += 20;

      doc.fontSize(8)
         .font('Helvetica');

      const details = [
        { label: 'Roll No:', value: idCard.registration_number },
        { label: 'Department:', value: idCard.department_name },
        { label: 'Session:', value: idCard.session_name },
        { label: 'Blood Group:', value: idCard.blood_group || 'N/A' }
      ];

      details.forEach(detail => {
        doc.font('Helvetica-Bold')
           .text(detail.label, 30, detailsY, { continued: true, width: 70 })
           .font('Helvetica')
           .text(' ' + detail.value, { width: 152 });
        detailsY += 15;
      });

      // Card number
      detailsY += 5;
      doc.fontSize(7)
         .font('Helvetica-Bold')
         .text(`Card No: ${idCard.card_number}`, 20, detailsY, { align: 'center', width: 212 });

      // Issue and validity dates
      detailsY += 12;
      const issueDate = new Date(idCard.issue_date).toLocaleDateString('en-GB');
      const validUntil = new Date(idCard.valid_until).toLocaleDateString('en-GB');

      doc.fontSize(7)
         .font('Helvetica')
         .text(`Issued: ${issueDate}`, 30, detailsY)
         .text(`Valid Until: ${validUntil}`, 130, detailsY);

      // ==================== BACK SIDE ====================
      doc.addPage();

      // Back side header
      doc.rect(0, 0, 252, 40)
         .fill('#1E40AF');

      doc.fillColor('#FFFFFF')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('ID CARD VERIFICATION', 20, 15, { align: 'center', width: 212 });

      // QR Code
      let backY = 50;
      doc.image(qrCodeData, 76, backY, {
        width: 100,
        height: 100
      });

      backY += 110;

      // Barcode (as text representation)
      doc.fillColor('#000000')
         .fontSize(20)
         .font('Courier-Bold')
         .text(idCard.barcode_number, 20, backY, { align: 'center', width: 212 });

      backY += 25;

      // Instructions
      doc.fontSize(7)
         .font('Helvetica')
         .text('Scan QR code to verify authenticity', 20, backY, { align: 'center', width: 212 });

      backY += 20;

      // Emergency contact
      doc.fontSize(8)
         .font('Helvetica-Bold')
         .text('Emergency Contact:', 20, backY);

      backY += 12;

      doc.fontSize(7)
         .font('Helvetica')
         .text(`Phone: ${idCard.phone || 'N/A'}`, 20, backY);

      backY += 10;

      doc.text(`Email: ${idCard.email}`, 20, backY, { width: 212 });

      backY += 15;

      // College contact
      doc.fontSize(7)
         .font('Helvetica-Bold')
         .text('College Contact:', 20, backY);

      backY += 12;

      doc.fontSize(7)
         .font('Helvetica')
         .text('Government College Larkana', 20, backY);
      backY += 10;
      doc.text('Phone: +92-74-1234567', 20, backY);
      backY += 10;
      doc.text('Website: www.govtcollegelarkana.edu.pk', 20, backY);

      // Footer
      doc.fontSize(6)
         .fillColor('#666666')
         .text('This card is property of Government College Larkana', 20, 360, { 
           align: 'center', 
           width: 212 
         });

      doc.text('If found, please return to college office', 20, 370, { 
        align: 'center', 
        width: 212 
      });

      doc.end();

      // Wait for PDF to be written
      await new Promise((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
      });

      return {
        filePath,
        fileName,
        relativePath: `/uploads/idcards/${fileName}`
      };

    } catch (error) {
      console.error('Generate ID Card PDF Error:', error);
      throw new Error(error.message || 'Failed to generate ID card PDF');
    }
  }

  /**
   * Get all ID cards (Admin view)
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} ID cards list
   */
  async getAllIDCards(filters = {}) {
    try {
      let query = `
        SELECT 
          ic.*,
          s.name as student_name,
          s.registration_number,
          s.email,
          d.name as department_name,
          ses.name as session_name
        FROM id_cards ic
        INNER JOIN students s ON ic.student_id = s.id
        LEFT JOIN departments d ON s.department_id = d.id
        LEFT JOIN sessions ses ON s.session_id = ses.id
        WHERE 1=1
      `;

      const values = [];
      let paramCount = 1;

      if (filters.department_id) {
        query += ` AND s.department_id = $${paramCount}`;
        values.push(filters.department_id);
        paramCount++;
      }

      if (filters.session_id) {
        query += ` AND s.session_id = $${paramCount}`;
        values.push(filters.session_id);
        paramCount++;
      }

      if (filters.status) {
        query += ` AND ic.status = $${paramCount}`;
        values.push(filters.status);
        paramCount++;
      }

      if (filters.expired === 'true') {
        query += ` AND ic.valid_until < CURRENT_DATE`;
      } else if (filters.expired === 'false') {
        query += ` AND ic.valid_until >= CURRENT_DATE`;
      }

      query += ` ORDER BY ic.issue_date DESC`;

      const result = await pool.query(query, values);
      return result.rows;

    } catch (error) {
      console.error('Get All ID Cards Error:', error);
      throw new Error('Failed to fetch ID cards');
    }
  }

  /**
   * Get ID card statistics
   * @returns {Promise<Object>} Statistics
   */
  async getIDCardStatistics() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_cards,
          COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_cards,
          COUNT(CASE WHEN status = 'Inactive' THEN 1 END) as inactive_cards,
          COUNT(CASE WHEN valid_until < CURRENT_DATE THEN 1 END) as expired_cards,
          COUNT(CASE WHEN valid_until >= CURRENT_DATE AND status = 'Active' THEN 1 END) as valid_cards
        FROM id_cards
      `;

      const result = await pool.query(query);
      return result.rows[0];

    } catch (error) {
      console.error('Get ID Card Statistics Error:', error);
      throw new Error('Failed to fetch ID card statistics');
    }
  }
}

module.exports = new IDCardService();
