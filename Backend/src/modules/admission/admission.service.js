const { query, getClient } = require('../../config/database');
const { validateRequired } = require('../../utils/validator');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class AdmissionService {

  // ==================== ONLINE ADMISSION APPLICATION ====================

  // Submit admission application
  async submitApplication(applicationData) {
    const {
      // Personal Details
      full_name,
      father_name,
      mother_name,
      date_of_birth,
      gender,
      cnic,
      phone,
      email,
      address,
      city,
      province,
      postal_code,
      
      // Academic Details
      previous_qualification,
      previous_institution,
      passing_year,
      obtained_marks,
      total_marks,
      percentage,
      board_university,
      
      // Admission Details
      program_id, // department_id
      preferred_shift,
      
      // Documents
      photo_path,
      cnic_path,
      matric_certificate_path,
      inter_certificate_path,
      domicile_path
    } = applicationData;

    const validation = validateRequired(
      { 
        full_name, 
        father_name, 
        date_of_birth, 
        gender, 
        phone, 
        email,
        previous_qualification,
        obtained_marks,
        total_marks,
        program_id
      },
      [
        'full_name', 
        'father_name', 
        'date_of_birth', 
        'gender', 
        'phone', 
        'email',
        'previous_qualification',
        'obtained_marks',
        'total_marks',
        'program_id'
      ]
    );
    if (!validation.isValid) {
      throw { status: 400, message: validation.errors.join(', ') };
    }

    // Verify program/department exists
    const programResult = await query(
      'SELECT id, name FROM departments WHERE id = $1 AND is_active = true',
      [program_id]
    );
    if (programResult.rows.length === 0) {
      throw { status: 404, message: 'Program/Department not found or not accepting admissions' };
    }

    // Calculate percentage if not provided
    const calculatedPercentage = percentage || (
      (parseFloat(obtained_marks) / parseFloat(total_marks)) * 100
    ).toFixed(2);

    // Generate application number: ADM-YEAR-RANDOM
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 900000) + 100000;
    const application_no = `ADM-${year}-${random}`;

    // Calculate merit score (can be customized based on college policy)
    // For now: 60% previous qualification + 40% test score (if test is conducted later)
    const merit_score = parseFloat(calculatedPercentage) * 0.6;

    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Insert application
      const result = await client.query(`
        INSERT INTO admission_applications (
          application_no, full_name, father_name, mother_name,
          date_of_birth, gender, cnic, phone, email,
          address, city, province, postal_code,
          previous_qualification, previous_institution, passing_year,
          obtained_marks, total_marks, percentage,
          board_university, program_id, preferred_shift,
          photo_path, cnic_path, matric_certificate_path,
          inter_certificate_path, domicile_path,
          merit_score, status, application_date
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19,
          $20, $21, $22, $23, $24, $25, $26, $27, $28,
          'submitted', CURRENT_TIMESTAMP
        )
        RETURNING *
      `, [
        application_no, full_name, father_name, mother_name,
        date_of_birth, gender, cnic, phone, email,
        address, city, province, postal_code,
        previous_qualification, previous_institution, passing_year,
        obtained_marks, total_marks, calculatedPercentage,
        board_university, program_id, preferred_shift,
        photo_path, cnic_path, matric_certificate_path,
        inter_certificate_path, domicile_path,
        merit_score
      ]);

      await client.query('COMMIT');

      return {
        message: 'Application submitted successfully',
        application: {
          id: result.rows[0].id,
          application_no: result.rows[0].application_no,
          full_name: result.rows[0].full_name,
          program_id: result.rows[0].program_id,
          status: result.rows[0].status,
          application_date: result.rows[0].application_date
        },
        instructions: [
          'Please note your application number for future reference',
          'You can track your application status using the application number',
          'Keep checking for merit list publication',
          'Make sure to upload all required documents'
        ]
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ==================== APPLICATION TRACKING ====================

  // Get application status
  async getApplicationStatus(applicationNo) {
    const result = await query(`
      SELECT 
        aa.*,
        d.name as program_name,
        d.code as program_code,
        u.email as reviewed_by_email,
        u2.email as approved_by_email
      FROM admission_applications aa
      JOIN departments d ON aa.program_id = d.id
      LEFT JOIN users u ON aa.reviewed_by = u.id
      LEFT JOIN users u2 ON aa.approved_by = u2.id
      WHERE aa.application_no = $1
    `, [applicationNo]);

    if (result.rows.length === 0) {
      throw { status: 404, message: 'Application not found' };
    }

    const app = result.rows[0];

    return {
      application: {
        application_no: app.application_no,
        full_name: app.full_name,
        email: app.email,
        phone: app.phone,
        program: {
          id: app.program_id,
          name: app.program_name,
          code: app.program_code
        },
        status: app.status,
        application_date: app.application_date,
        reviewed_at: app.reviewed_at,
        approved_at: app.approved_at,
        merit_score: parseFloat(app.merit_score).toFixed(2),
        merit_position: app.merit_position,
        remarks: app.remarks
      },
      timeline: this.getApplicationTimeline(app),
      documents: {
        photo: app.photo_path ? true : false,
        cnic: app.cnic_path ? true : false,
        matric_certificate: app.matric_certificate_path ? true : false,
        inter_certificate: app.inter_certificate_path ? true : false,
        domicile: app.domicile_path ? true : false
      },
      next_steps: this.getNextSteps(app.status)
    };
  }

  // Get application timeline
  getApplicationTimeline(app) {
    const timeline = [
      {
        step: 'Application Submitted',
        status: 'completed',
        date: app.application_date
      }
    ];

    if (app.status === 'under_review' || app.status === 'approved' || app.status === 'rejected') {
      timeline.push({
        step: 'Under Review',
        status: 'completed',
        date: app.reviewed_at || null
      });
    }

    if (app.status === 'approved') {
      timeline.push({
        step: 'Approved',
        status: 'completed',
        date: app.approved_at
      });
    }

    if (app.status === 'rejected') {
      timeline.push({
        step: 'Rejected',
        status: 'completed',
        date: app.reviewed_at
      });
    }

    if (app.status === 'merit_list_published' || app.status === 'admitted') {
      timeline.push({
        step: 'Merit List Published',
        status: 'completed',
        date: app.merit_list_date || null
      });
    }

    if (app.status === 'admitted') {
      timeline.push({
        step: 'Admission Confirmed',
        status: 'completed',
        date: app.admission_date
      });
    }

    return timeline;
  }

  // Get next steps based on status
  getNextSteps(status) {
    const steps = {
      submitted: [
        'Your application is submitted and will be reviewed shortly',
        'Ensure all documents are uploaded',
        'Wait for review notification'
      ],
      under_review: [
        'Your application is under review',
        'Document verification in progress',
        'You will be notified once review is complete'
      ],
      approved: [
        'Your application has been approved',
        'Wait for merit list publication',
        'Check merit list regularly'
      ],
      rejected: [
        'Your application has been rejected',
        'Contact admissions office for details',
        'You may reapply in the next admission cycle'
      ],
      merit_list_published: [
        'Merit list has been published',
        'Check your merit position',
        'If selected, complete admission formalities'
      ],
      admitted: [
        'Congratulations! You have been admitted',
        'Pay admission fee',
        'Collect admission letter',
        'Register for courses'
      ]
    };

    return steps[status] || ['Contact admissions office for more information'];
  }

  // ==================== ADMIN: APPLICATION REVIEW ====================

  // Get all applications for review
  async getApplications(filters = {}) {
    const { 
      status, 
      program_id, 
      merit_threshold,
      page = 1, 
      limit = 50 
    } = filters;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT 
        aa.*,
        d.name as program_name,
        d.code as program_code
      FROM admission_applications aa
      JOIN departments d ON aa.program_id = d.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      sql += ` AND aa.status = $${paramCount}`;
      params.push(status);
    }

    if (program_id) {
      paramCount++;
      sql += ` AND aa.program_id = $${paramCount}`;
      params.push(program_id);
    }

    if (merit_threshold) {
      paramCount++;
      sql += ` AND aa.merit_score >= $${paramCount}`;
      params.push(merit_threshold);
    }

    sql += ` ORDER BY aa.merit_score DESC, aa.application_date ASC`;
    sql += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    // Get total count
    let countSql = `
      SELECT COUNT(*) 
      FROM admission_applications aa
      WHERE 1=1
    `;
    const countParams = [];
    let countParamCount = 0;

    if (status) {
      countParamCount++;
      countSql += ` AND aa.status = $${countParamCount}`;
      countParams.push(status);
    }

    if (program_id) {
      countParamCount++;
      countSql += ` AND aa.program_id = $${countParamCount}`;
      countParams.push(program_id);
    }

    if (merit_threshold) {
      countParamCount++;
      countSql += ` AND aa.merit_score >= $${countParamCount}`;
      countParams.push(merit_threshold);
    }

    const countResult = await query(countSql, countParams);

    return {
      applications: result.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        pages: Math.ceil(countResult.rows[0].count / limit)
      }
    };
  }

  // Review application (verify documents)
  async reviewApplication(userId, applicationId, reviewData) {
    const { status, remarks } = reviewData;

    if (!['approved', 'rejected'].includes(status)) {
      throw { status: 400, message: 'Status must be either approved or rejected' };
    }

    // Get application
    const appResult = await query(
      'SELECT * FROM admission_applications WHERE id = $1',
      [applicationId]
    );

    if (appResult.rows.length === 0) {
      throw { status: 404, message: 'Application not found' };
    }

    const app = appResult.rows[0];

    if (app.status !== 'submitted' && app.status !== 'under_review') {
      throw { 
        status: 400, 
        message: `Cannot review application with status: ${app.status}` 
      };
    }

    const result = await query(`
      UPDATE admission_applications 
      SET status = $1,
          reviewed_by = $2,
          reviewed_at = CURRENT_TIMESTAMP,
          remarks = $3
      WHERE id = $4
      RETURNING *
    `, [status === 'approved' ? 'approved' : 'rejected', userId, remarks, applicationId]);

    return {
      message: `Application ${status} successfully`,
      application: result.rows[0]
    };
  }

  // ==================== MERIT LIST GENERATION ====================

  // Generate merit list
  async generateMeritList(mergedData) {
    const { 
      program_id, 
      merit_criteria = 'percentage', // percentage, test_score, combined
      available_seats,
      cutoff_percentage = 0
    } = mergedData;

    if (!program_id) {
      throw { status: 400, message: 'program_id is required' };
    }

    // Get all approved applications for the program
    const applicationsResult = await query(`
      SELECT *
      FROM admission_applications
      WHERE program_id = $1 
        AND status = 'approved'
        AND percentage >= $2
      ORDER BY merit_score DESC, percentage DESC, application_date ASC
    `, [program_id, cutoff_percentage]);

    if (applicationsResult.rows.length === 0) {
      throw { status: 404, message: 'No approved applications found for this program' };
    }

    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Assign merit positions
      let position = 1;
      const meritList = [];

      for (const app of applicationsResult.rows) {
        // Update application with merit position
        await client.query(`
          UPDATE admission_applications
          SET merit_position = $1,
              status = 'merit_list_published',
              merit_list_date = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [position, app.id]);

        meritList.push({
          application_no: app.application_no,
          full_name: app.full_name,
          father_name: app.father_name,
          merit_position: position,
          merit_score: parseFloat(app.merit_score).toFixed(2),
          percentage: parseFloat(app.percentage).toFixed(2),
          status: position <= available_seats ? 'Selected' : 'Waiting List'
        });

        position++;
      }

      await client.query('COMMIT');

      return {
        message: 'Merit list generated successfully',
        program_id,
        total_applications: meritList.length,
        available_seats,
        selected_candidates: Math.min(meritList.length, available_seats),
        waiting_list: Math.max(0, meritList.length - available_seats),
        merit_list: meritList
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Get merit list (public)
  async getMeritList(filters = {}) {
    const { program_id } = filters;

    let sql = `
      SELECT 
        aa.application_no,
        aa.full_name,
        aa.father_name,
        aa.merit_position,
        aa.merit_score,
        aa.percentage,
        d.name as program_name,
        d.code as program_code
      FROM admission_applications aa
      JOIN departments d ON aa.program_id = d.id
      WHERE aa.status IN ('merit_list_published', 'admitted')
        AND aa.merit_position IS NOT NULL
    `;
    const params = [];

    if (program_id) {
      sql += ' AND aa.program_id = $1';
      params.push(program_id);
    }

    sql += ' ORDER BY aa.merit_position ASC';

    const result = await query(sql, params);

    // Group by program
    const meritListByProgram = {};
    
    result.rows.forEach(row => {
      const programKey = row.program_id || `${row.program_code}`;
      
      if (!meritListByProgram[programKey]) {
        meritListByProgram[programKey] = {
          program_name: row.program_name,
          program_code: row.program_code,
          candidates: []
        };
      }

      meritListByProgram[programKey].candidates.push({
        merit_position: row.merit_position,
        application_no: row.application_no,
        full_name: row.full_name,
        father_name: row.father_name,
        merit_score: parseFloat(row.merit_score).toFixed(2),
        percentage: parseFloat(row.percentage).toFixed(2)
      });
    });

    return {
      merit_lists: Object.values(meritListByProgram),
      total_candidates: result.rows.length
    };
  }

  // ==================== ADMISSION APPROVAL & LETTER ====================

  // Approve admission (final step)
  async approveAdmission(userId, applicationId, approvalData) {
    const { 
      admission_fee_amount,
      admission_date = new Date(),
      remarks
    } = approvalData;

    // Get application
    const appResult = await query(
      'SELECT * FROM admission_applications WHERE id = $1',
      [applicationId]
    );

    if (appResult.rows.length === 0) {
      throw { status: 404, message: 'Application not found' };
    }

    const app = appResult.rows[0];

    if (app.status !== 'merit_list_published') {
      throw { 
        status: 400, 
        message: 'Application must be in merit list to approve admission' 
      };
    }

    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Update application status
      await client.query(`
        UPDATE admission_applications
        SET status = 'admitted',
            approved_by = $1,
            approved_at = CURRENT_TIMESTAMP,
            admission_date = $2,
            remarks = $3
        WHERE id = $4
      `, [userId, admission_date, remarks, applicationId]);

      // Create student record
      // First create user account
      const userResult = await client.query(`
        INSERT INTO users (email, password, role, is_active, email_verified)
        VALUES ($1, $2, 'student', true, false)
        RETURNING id
      `, [app.email, '$2b$10$defaultpassword']); // Should generate proper password

      const userId = userResult.rows[0].id;

      // Generate roll number: YEAR-DEPT-SERIAL
      const year = new Date().getFullYear();
      const deptResult = await client.query(
        'SELECT code FROM departments WHERE id = $1',
        [app.program_id]
      );
      const deptCode = deptResult.rows[0].code;
      
      // Get next serial number for this department
      const serialResult = await client.query(`
        SELECT COUNT(*) as count 
        FROM students 
        WHERE batch = $1 AND department_id = $2
      `, [year.toString(), app.program_id]);
      
      const serial = parseInt(serialResult.rows[0].count) + 1;
      const roll_no = `${year}-${deptCode}-${String(serial).padStart(3, '0')}`;

      // Create student record
      await client.query(`
        INSERT INTO students (
          user_id, roll_no, name, father_name, dob,
          cnic, phone, address, department_id,
          batch, semester, status, admission_date, photo
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1, 'active', $11, $12)
      `, [
        userId, roll_no, app.full_name, app.father_name,
        app.date_of_birth, app.cnic, app.phone, app.address,
        app.program_id, year.toString(), admission_date, app.photo_path
      ]);

      await client.query('COMMIT');

      return {
        message: 'Admission approved successfully',
        student: {
          roll_no,
          name: app.full_name,
          program_id: app.program_id,
          email: app.email
        },
        credentials: {
          email: app.email,
          temporary_password: 'Student@123',
          note: 'Please change your password after first login'
        }
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Generate admission letter PDF
  async generateAdmissionLetter(applicationNo) {
    const appResult = await query(`
      SELECT 
        aa.*,
        d.name as program_name,
        d.code as program_code,
        s.roll_no
      FROM admission_applications aa
      JOIN departments d ON aa.program_id = d.id
      LEFT JOIN students s ON s.cnic = aa.cnic
      WHERE aa.application_no = $1 AND aa.status = 'admitted'
    `, [applicationNo]);

    if (appResult.rows.length === 0) {
      throw { status: 404, message: 'Admission not found or not approved' };
    }

    const app = appResult.rows[0];

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        // Header
        doc.fontSize(20).text('Government College Larkana', { align: 'center' });
        doc.fontSize(14).text('Admission Letter', { align: 'center' });
        doc.moveDown();

        // Date
        doc.fontSize(10).text(`Date: ${new Date().toLocaleDateString()}`, { align: 'right' });
        doc.moveDown();

        // Letter content
        doc.fontSize(12);
        doc.text(`Dear ${app.full_name},`, { align: 'left' });
        doc.moveDown();

        doc.fontSize(11);
        doc.text(
          `Congratulations! We are pleased to inform you that you have been selected for admission to ` +
          `${app.program_name} (${app.program_code}) for the academic session ${new Date().getFullYear()}.`,
          { align: 'justify' }
        );
        doc.moveDown();

        // Student Details
        doc.fontSize(12).text('Admission Details:', { underline: true });
        doc.fontSize(10);
        doc.text(`Application No: ${app.application_no}`);
        doc.text(`Roll Number: ${app.roll_no}`);
        doc.text(`Student Name: ${app.full_name}`);
        doc.text(`Father's Name: ${app.father_name}`);
        doc.text(`Program: ${app.program_name}`);
        doc.text(`Merit Position: ${app.merit_position}`);
        doc.text(`Merit Score: ${parseFloat(app.merit_score).toFixed(2)}%`);
        doc.moveDown();

        // Instructions
        doc.fontSize(12).text('Instructions:', { underline: true });
        doc.fontSize(10);
        doc.list([
          'Report to the admissions office within 7 days',
          'Bring original documents for verification',
          'Pay admission fee at the accounts office',
          'Complete biometric registration',
          'Collect your student ID card',
          'Attend orientation session'
        ]);
        doc.moveDown();

        // Documents Required
        doc.fontSize(12).text('Documents Required:', { underline: true });
        doc.fontSize(10);
        doc.list([
          'Original & photocopy of Matric certificate',
          'Original & photocopy of Intermediate certificate',
          'Original & photocopy of CNIC',
          'Original & photocopy of Domicile',
          '4 passport size photographs',
          'Character certificate from previous institution'
        ]);
        doc.moveDown();

        // Footer
        doc.fontSize(10);
        doc.text('We look forward to welcoming you to Government College Larkana.', { align: 'center' });
        doc.moveDown();
        doc.text('Principal', { align: 'right' });
        doc.text('Government College Larkana', { align: 'right' });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // ==================== STATISTICS ====================

  // Get admission statistics
  async getStatistics(filters = {}) {
    const { program_id, session_year } = filters;

    let sql = `
      SELECT 
        COUNT(*) as total_applications,
        COUNT(CASE WHEN status = 'submitted' THEN 1 END) as submitted,
        COUNT(CASE WHEN status = 'under_review' THEN 1 END) as under_review,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
        COUNT(CASE WHEN status = 'merit_list_published' THEN 1 END) as merit_list,
        COUNT(CASE WHEN status = 'admitted' THEN 1 END) as admitted,
        AVG(merit_score) as avg_merit_score,
        MAX(merit_score) as max_merit_score,
        MIN(merit_score) as min_merit_score
      FROM admission_applications
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (program_id) {
      paramCount++;
      sql += ` AND program_id = $${paramCount}`;
      params.push(program_id);
    }

    if (session_year) {
      paramCount++;
      sql += ` AND EXTRACT(YEAR FROM application_date) = $${paramCount}`;
      params.push(session_year);
    }

    const result = await query(sql, params);

    return {
      statistics: {
        total_applications: parseInt(result.rows[0].total_applications),
        submitted: parseInt(result.rows[0].submitted),
        under_review: parseInt(result.rows[0].under_review),
        approved: parseInt(result.rows[0].approved),
        rejected: parseInt(result.rows[0].rejected),
        merit_list_published: parseInt(result.rows[0].merit_list),
        admitted: parseInt(result.rows[0].admitted),
        avg_merit_score: parseFloat(result.rows[0].avg_merit_score || 0).toFixed(2),
        max_merit_score: parseFloat(result.rows[0].max_merit_score || 0).toFixed(2),
        min_merit_score: parseFloat(result.rows[0].min_merit_score || 0).toFixed(2)
      }
    };
  }
}

module.exports = new AdmissionService();
