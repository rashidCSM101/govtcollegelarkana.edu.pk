const pool = require('../../config/database');

/**
 * Scholarship Service
 * Handles scholarship creation, applications, evaluation, and distribution
 */
class ScholarshipService {
  
  // ==================== ADMIN: SCHOLARSHIP MANAGEMENT ====================

  /**
   * Create a new scholarship program
   * @param {Object} scholarshipData - Scholarship details
   * @returns {Promise<Object>} Created scholarship
   */
  async createScholarship(scholarshipData) {
    const {
      name,
      description,
      scholarship_type, // Merit-Based, Need-Based, Sports, Academic Excellence, Minority
      criteria_gpa_min,
      criteria_income_max,
      criteria_other,
      amount,
      percentage,
      total_seats,
      session_id,
      semester_id,
      department_id,
      application_start_date,
      application_end_date,
      distribution_type, // Fee Waiver, Direct Payment, Both
      created_by
    } = scholarshipData;

    // Validate required fields
    if (!name || !scholarship_type || !total_seats || !application_end_date || !distribution_type) {
      throw new Error('Name, type, total seats, deadline, and distribution type are required');
    }

    // Validate that either amount or percentage is provided
    if (!amount && !percentage) {
      throw new Error('Either fixed amount or percentage must be specified');
    }

    // Validate scholarship type
    const validTypes = ['Merit-Based', 'Need-Based', 'Sports', 'Academic Excellence', 'Minority', 'Financial Aid'];
    if (!validTypes.includes(scholarship_type)) {
      throw new Error(`Invalid scholarship type. Must be one of: ${validTypes.join(', ')}`);
    }

    // Validate distribution type
    const validDistributionTypes = ['Fee Waiver', 'Direct Payment', 'Both'];
    if (!validDistributionTypes.includes(distribution_type)) {
      throw new Error(`Invalid distribution type. Must be one of: ${validDistributionTypes.join(', ')}`);
    }

    try {
      const query = `
        INSERT INTO scholarships (
          name, description, scholarship_type,
          criteria_gpa_min, criteria_income_max, criteria_other,
          amount, percentage, total_seats, available_seats,
          session_id, semester_id, department_id,
          application_start_date, application_end_date,
          distribution_type, status, created_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW())
        RETURNING *
      `;

      const values = [
        name,
        description,
        scholarship_type,
        criteria_gpa_min || null,
        criteria_income_max || null,
        criteria_other || null,
        amount || null,
        percentage || null,
        total_seats,
        total_seats, // available_seats = total_seats initially
        session_id || null,
        semester_id || null,
        department_id || null,
        application_start_date || new Date(),
        application_end_date,
        distribution_type,
        'Active',
        created_by
      ];

      const result = await pool.query(query, values);
      return result.rows[0];

    } catch (error) {
      console.error('Create Scholarship Error:', error);
      throw new Error('Failed to create scholarship: ' + error.message);
    }
  }

  /**
   * Get all scholarships with filters
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} List of scholarships
   */
  async getAllScholarships(filters = {}) {
    try {
      let query = `
        SELECT 
          s.*,
          ses.name as session_name,
          sem.name as semester_name,
          d.name as department_name,
          u.full_name as created_by_name,
          (SELECT COUNT(*) FROM scholarship_applications WHERE scholarship_id = s.id) as total_applications,
          (SELECT COUNT(*) FROM scholarship_applications WHERE scholarship_id = s.id AND status = 'Approved') as approved_applications
        FROM scholarships s
        LEFT JOIN sessions ses ON s.session_id = ses.id
        LEFT JOIN semesters sem ON s.semester_id = sem.id
        LEFT JOIN departments d ON s.department_id = d.id
        LEFT JOIN users u ON s.created_by = u.id
        WHERE 1=1
      `;

      const values = [];
      let paramCount = 1;

      if (filters.scholarship_type) {
        query += ` AND s.scholarship_type = $${paramCount}`;
        values.push(filters.scholarship_type);
        paramCount++;
      }

      if (filters.status) {
        query += ` AND s.status = $${paramCount}`;
        values.push(filters.status);
        paramCount++;
      }

      if (filters.session_id) {
        query += ` AND s.session_id = $${paramCount}`;
        values.push(filters.session_id);
        paramCount++;
      }

      if (filters.semester_id) {
        query += ` AND s.semester_id = $${paramCount}`;
        values.push(filters.semester_id);
        paramCount++;
      }

      if (filters.department_id) {
        query += ` AND s.department_id = $${paramCount}`;
        values.push(filters.department_id);
        paramCount++;
      }

      query += ` ORDER BY s.created_at DESC`;

      const result = await pool.query(query, values);
      return result.rows;

    } catch (error) {
      console.error('Get All Scholarships Error:', error);
      throw new Error('Failed to fetch scholarships');
    }
  }

  /**
   * Get scholarship by ID
   * @param {number} scholarshipId
   * @returns {Promise<Object>} Scholarship details
   */
  async getScholarshipById(scholarshipId) {
    try {
      const query = `
        SELECT 
          s.*,
          ses.name as session_name,
          sem.name as semester_name,
          d.name as department_name,
          u.full_name as created_by_name,
          (SELECT COUNT(*) FROM scholarship_applications WHERE scholarship_id = s.id) as total_applications,
          (SELECT COUNT(*) FROM scholarship_applications WHERE scholarship_id = s.id AND status = 'Approved') as approved_applications,
          (SELECT COUNT(*) FROM scholarship_applications WHERE scholarship_id = s.id AND status = 'Pending') as pending_applications
        FROM scholarships s
        LEFT JOIN sessions ses ON s.session_id = ses.id
        LEFT JOIN semesters sem ON s.semester_id = sem.id
        LEFT JOIN departments d ON s.department_id = d.id
        LEFT JOIN users u ON s.created_by = u.id
        WHERE s.id = $1
      `;

      const result = await pool.query(query, [scholarshipId]);

      if (result.rows.length === 0) {
        throw new Error('Scholarship not found');
      }

      return result.rows[0];

    } catch (error) {
      console.error('Get Scholarship By ID Error:', error);
      throw new Error(error.message || 'Failed to fetch scholarship');
    }
  }

  /**
   * Get applications for a scholarship
   * @param {number} scholarshipId
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Applications with pagination
   */
  async getScholarshipApplications(scholarshipId, filters = {}) {
    try {
      // First, verify scholarship exists
      await this.getScholarshipById(scholarshipId);

      let query = `
        SELECT 
          sa.*,
          s.name as student_name,
          s.registration_number,
          s.email,
          s.phone,
          d.name as department_name,
          sem.name as semester_name,
          u.full_name as reviewed_by_name,
          (SELECT json_agg(json_build_object(
            'id', sd.id,
            'document_type', sd.document_type,
            'file_name', sd.file_name,
            'status', sd.status
          )) FROM student_documents sd WHERE sd.student_id = sa.student_id) as documents
        FROM scholarship_applications sa
        INNER JOIN students s ON sa.student_id = s.id
        LEFT JOIN departments d ON s.department_id = d.id
        LEFT JOIN semesters sem ON s.current_semester_id = sem.id
        LEFT JOIN users u ON sa.reviewed_by = u.id
        WHERE sa.scholarship_id = $1
      `;

      const values = [scholarshipId];
      let paramCount = 2;

      if (filters.status) {
        query += ` AND sa.status = $${paramCount}`;
        values.push(filters.status);
        paramCount++;
      }

      if (filters.department_id) {
        query += ` AND s.department_id = $${paramCount}`;
        values.push(filters.department_id);
        paramCount++;
      }

      query += ` ORDER BY sa.application_date DESC`;

      const result = await pool.query(query, values);

      return {
        scholarship_id: scholarshipId,
        total_applications: result.rows.length,
        applications: result.rows
      };

    } catch (error) {
      console.error('Get Scholarship Applications Error:', error);
      throw new Error(error.message || 'Failed to fetch applications');
    }
  }

  // ==================== STUDENT: APPLICATION MANAGEMENT ====================

  /**
   * Get available scholarships for students
   * @param {number} studentId
   * @returns {Promise<Array>} Available scholarships
   */
  async getAvailableScholarships(studentId) {
    try {
      // Get student details
      const studentQuery = `
        SELECT s.*, d.id as department_id, sem.id as current_semester_id
        FROM students s
        LEFT JOIN departments d ON s.department_id = d.id
        LEFT JOIN semesters sem ON s.current_semester_id = sem.id
        WHERE s.id = $1
      `;
      const studentResult = await pool.query(studentQuery, [studentId]);

      if (studentResult.rows.length === 0) {
        throw new Error('Student not found');
      }

      const student = studentResult.rows[0];

      // Get available scholarships
      const query = `
        SELECT 
          s.*,
          ses.name as session_name,
          sem.name as semester_name,
          d.name as department_name,
          (SELECT COUNT(*) FROM scholarship_applications WHERE scholarship_id = s.id AND student_id = $1) as applied,
          (SELECT status FROM scholarship_applications WHERE scholarship_id = s.id AND student_id = $1 ORDER BY application_date DESC LIMIT 1) as application_status
        FROM scholarships s
        LEFT JOIN sessions ses ON s.session_id = ses.id
        LEFT JOIN semesters sem ON s.semester_id = sem.id
        LEFT JOIN departments d ON s.department_id = d.id
        WHERE s.status = 'Active'
          AND s.application_end_date >= CURRENT_DATE
          AND s.available_seats > 0
          AND (s.department_id IS NULL OR s.department_id = $2)
        ORDER BY s.application_end_date ASC
      `;

      const result = await pool.query(query, [studentId, student.department_id]);

      // Check eligibility for each scholarship
      const scholarshipsWithEligibility = result.rows.map(scholarship => {
        const eligibility = this.checkEligibility(student, scholarship);
        return {
          ...scholarship,
          is_eligible: eligibility.eligible,
          eligibility_message: eligibility.message,
          can_apply: eligibility.eligible && scholarship.applied === 0
        };
      });

      return scholarshipsWithEligibility;

    } catch (error) {
      console.error('Get Available Scholarships Error:', error);
      throw new Error(error.message || 'Failed to fetch available scholarships');
    }
  }

  /**
   * Check student eligibility for scholarship
   * @param {Object} student - Student data
   * @param {Object} scholarship - Scholarship data
   * @returns {Object} Eligibility result
   */
  checkEligibility(student, scholarship) {
    const reasons = [];

    // Check GPA criteria
    if (scholarship.criteria_gpa_min && student.cgpa < scholarship.criteria_gpa_min) {
      reasons.push(`Minimum GPA required: ${scholarship.criteria_gpa_min} (Your GPA: ${student.cgpa || 'N/A'})`);
    }

    // Check income criteria (for need-based)
    if (scholarship.criteria_income_max && student.family_income > scholarship.criteria_income_max) {
      reasons.push(`Maximum family income: ${scholarship.criteria_income_max} (Your income: ${student.family_income || 'N/A'})`);
    }

    // Check department criteria
    if (scholarship.department_id && scholarship.department_id !== student.department_id) {
      reasons.push('This scholarship is not available for your department');
    }

    const eligible = reasons.length === 0;

    return {
      eligible,
      message: eligible ? 'You are eligible to apply' : reasons.join(', ')
    };
  }

  /**
   * Apply for scholarship
   * @param {number} studentId
   * @param {number} scholarshipId
   * @param {Object} applicationData
   * @returns {Promise<Object>} Application result
   */
  async applyForScholarship(studentId, scholarshipId, applicationData) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get scholarship details
      const scholarshipQuery = `
        SELECT * FROM scholarships 
        WHERE id = $1 AND status = 'Active' 
        FOR UPDATE
      `;
      const scholarshipResult = await client.query(scholarshipQuery, [scholarshipId]);

      if (scholarshipResult.rows.length === 0) {
        throw new Error('Scholarship not found or not active');
      }

      const scholarship = scholarshipResult.rows[0];

      // Check if deadline passed
      if (new Date(scholarship.application_end_date) < new Date()) {
        throw new Error('Application deadline has passed');
      }

      // Check available seats
      if (scholarship.available_seats <= 0) {
        throw new Error('No seats available for this scholarship');
      }

      // Check if already applied
      const existingQuery = `
        SELECT * FROM scholarship_applications 
        WHERE scholarship_id = $1 AND student_id = $2
      `;
      const existingResult = await client.query(existingQuery, [scholarshipId, studentId]);

      if (existingResult.rows.length > 0) {
        throw new Error('You have already applied for this scholarship');
      }

      // Get student details for eligibility check
      const studentQuery = `SELECT * FROM students WHERE id = $1`;
      const studentResult = await client.query(studentQuery, [studentId]);

      if (studentResult.rows.length === 0) {
        throw new Error('Student not found');
      }

      const student = studentResult.rows[0];

      // Check eligibility
      const eligibility = this.checkEligibility(student, scholarship);
      if (!eligibility.eligible) {
        throw new Error('You are not eligible for this scholarship: ' + eligibility.message);
      }

      // Create application
      const insertQuery = `
        INSERT INTO scholarship_applications (
          scholarship_id, student_id, application_date,
          reason, family_income, academic_achievements,
          extra_curricular, other_info, status
        ) VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7, 'Pending')
        RETURNING *
      `;

      const insertValues = [
        scholarshipId,
        studentId,
        applicationData.reason || '',
        applicationData.family_income || null,
        applicationData.academic_achievements || '',
        applicationData.extra_curricular || '',
        applicationData.other_info || ''
      ];

      const result = await client.query(insertQuery, insertValues);

      await client.query('COMMIT');

      // TODO: Send notification to student about application received
      // TODO: Notify admin about new scholarship application

      return {
        message: 'Scholarship application submitted successfully',
        application: result.rows[0]
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Apply For Scholarship Error:', error);
      throw new Error(error.message || 'Failed to submit scholarship application');
    } finally {
      client.release();
    }
  }

  /**
   * Get student's scholarship application status
   * @param {number} studentId
   * @returns {Promise<Array>} Student applications
   */
  async getStudentApplications(studentId) {
    try {
      const query = `
        SELECT 
          sa.*,
          s.name as scholarship_name,
          s.scholarship_type,
          s.amount,
          s.percentage,
          s.distribution_type,
          u.full_name as reviewed_by_name,
          (SELECT json_agg(json_build_object(
            'distribution_date', sd.distribution_date,
            'amount', sd.amount,
            'semester_id', sd.semester_id,
            'status', sd.status
          )) FROM scholarship_distributions sd WHERE sd.application_id = sa.id) as distributions
        FROM scholarship_applications sa
        INNER JOIN scholarships s ON sa.scholarship_id = s.id
        LEFT JOIN users u ON sa.reviewed_by = u.id
        WHERE sa.student_id = $1
        ORDER BY sa.application_date DESC
      `;

      const result = await pool.query(query, [studentId]);
      return result.rows;

    } catch (error) {
      console.error('Get Student Applications Error:', error);
      throw new Error('Failed to fetch student applications');
    }
  }

  // ==================== ADMIN: EVALUATION & APPROVAL ====================

  /**
   * Approve scholarship application
   * @param {number} applicationId
   * @param {number} reviewedBy
   * @param {string} reviewRemarks
   * @returns {Promise<Object>} Approval result
   */
  async approveApplication(applicationId, reviewedBy, reviewRemarks = '') {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get application details
      const appQuery = `
        SELECT sa.*, s.available_seats, s.amount, s.percentage, s.distribution_type
        FROM scholarship_applications sa
        INNER JOIN scholarships s ON sa.scholarship_id = s.id
        WHERE sa.id = $1 AND sa.status = 'Pending'
        FOR UPDATE
      `;
      const appResult = await client.query(appQuery, [applicationId]);

      if (appResult.rows.length === 0) {
        throw new Error('Application not found or already processed');
      }

      const application = appResult.rows[0];

      // Check available seats
      if (application.available_seats <= 0) {
        throw new Error('No seats available for this scholarship');
      }

      // Update application status
      const updateAppQuery = `
        UPDATE scholarship_applications
        SET status = 'Approved',
            approval_date = NOW(),
            reviewed_by = $1,
            review_remarks = $2,
            updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `;
      await client.query(updateAppQuery, [reviewedBy, reviewRemarks, applicationId]);

      // Decrease available seats
      const updateSeatsQuery = `
        UPDATE scholarships
        SET available_seats = available_seats - 1
        WHERE id = $1
      `;
      await client.query(updateSeatsQuery, [application.scholarship_id]);

      // Create initial distribution record
      const distributionQuery = `
        INSERT INTO scholarship_distributions (
          application_id, student_id, scholarship_id,
          distribution_date, amount, status, created_at
        ) VALUES ($1, $2, $3, NOW(), $4, 'Pending', NOW())
        RETURNING *
      `;

      // Calculate amount based on percentage or fixed amount
      const distributionAmount = application.amount || 0; // Will be calculated during actual distribution

      await client.query(distributionQuery, [
        applicationId,
        application.student_id,
        application.scholarship_id,
        distributionAmount
      ]);

      await client.query('COMMIT');

      // TODO: Send approval notification to student
      // await notificationService.sendScholarshipApproval(application.student_id, application.scholarship_id);

      return {
        message: 'Scholarship application approved successfully'
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Approve Application Error:', error);
      throw new Error(error.message || 'Failed to approve application');
    } finally {
      client.release();
    }
  }

  /**
   * Reject scholarship application
   * @param {number} applicationId
   * @param {number} reviewedBy
   * @param {string} reviewRemarks - Required
   * @returns {Promise<Object>} Rejection result
   */
  async rejectApplication(applicationId, reviewedBy, reviewRemarks) {
    if (!reviewRemarks) {
      throw new Error('Review remarks are required for rejection');
    }

    try {
      const query = `
        UPDATE scholarship_applications
        SET status = 'Rejected',
            reviewed_by = $1,
            review_remarks = $2,
            updated_at = NOW()
        WHERE id = $3 AND status = 'Pending'
        RETURNING *
      `;

      const result = await pool.query(query, [reviewedBy, reviewRemarks, applicationId]);

      if (result.rows.length === 0) {
        throw new Error('Application not found or already processed');
      }

      // TODO: Send rejection notification to student
      // await notificationService.sendScholarshipRejection(result.rows[0].student_id, reviewRemarks);

      return {
        message: 'Scholarship application rejected'
      };

    } catch (error) {
      console.error('Reject Application Error:', error);
      throw new Error(error.message || 'Failed to reject application');
    }
  }

  // ==================== ADMIN: DISTRIBUTION ====================

  /**
   * Process scholarship distribution
   * @param {number} applicationId
   * @param {Object} distributionData
   * @returns {Promise<Object>} Distribution result
   */
  async processDistribution(applicationId, distributionData) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get application and scholarship details
      const query = `
        SELECT sa.*, s.amount, s.percentage, s.distribution_type, st.id as student_id
        FROM scholarship_applications sa
        INNER JOIN scholarships s ON sa.scholarship_id = s.id
        INNER JOIN students st ON sa.student_id = st.id
        WHERE sa.id = $1 AND sa.status = 'Approved'
      `;
      const result = await client.query(query, [applicationId]);

      if (result.rows.length === 0) {
        throw new Error('Approved application not found');
      }

      const application = result.rows[0];
      const { semester_id, fee_id } = distributionData;

      // Calculate distribution amount
      let distributionAmount = application.amount;

      if (application.percentage && fee_id) {
        // Get fee amount to calculate percentage
        const feeQuery = `SELECT total_amount FROM student_fees WHERE id = $1`;
        const feeResult = await client.query(feeQuery, [fee_id]);

        if (feeResult.rows.length > 0) {
          const feeAmount = parseFloat(feeResult.rows[0].total_amount);
          distributionAmount = (feeAmount * application.percentage) / 100;
        }
      }

      // Create distribution record
      const insertQuery = `
        INSERT INTO scholarship_distributions (
          application_id, student_id, scholarship_id, semester_id,
          distribution_date, amount, payment_method, status, created_at
        ) VALUES ($1, $2, $3, $4, NOW(), $5, $6, 'Completed', NOW())
        RETURNING *
      `;

      const insertValues = [
        applicationId,
        application.student_id,
        application.scholarship_id,
        semester_id,
        distributionAmount,
        application.distribution_type
      ];

      const distributionResult = await client.query(insertQuery, insertValues);

      // If fee waiver, update student fee
      if (application.distribution_type === 'Fee Waiver' || application.distribution_type === 'Both') {
        if (fee_id) {
          const updateFeeQuery = `
            UPDATE student_fees
            SET scholarship_amount = COALESCE(scholarship_amount, 0) + $1,
                remaining_amount = total_amount - paid_amount - COALESCE(scholarship_amount, 0) - $1,
                updated_at = NOW()
            WHERE id = $2
          `;
          await client.query(updateFeeQuery, [distributionAmount, fee_id]);
        }
      }

      await client.query('COMMIT');

      // TODO: Send distribution notification to student
      // await notificationService.sendScholarshipDistributed(application.student_id, distributionAmount);

      return {
        message: 'Scholarship distributed successfully',
        distribution: distributionResult.rows[0]
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Process Distribution Error:', error);
      throw new Error(error.message || 'Failed to process distribution');
    } finally {
      client.release();
    }
  }

  /**
   * Get scholarship statistics
   * @returns {Promise<Object>} Statistics
   */
  async getScholarshipStatistics() {
    try {
      const query = `
        SELECT 
          COUNT(DISTINCT s.id) as total_scholarships,
          COUNT(DISTINCT CASE WHEN s.status = 'Active' THEN s.id END) as active_scholarships,
          SUM(s.total_seats) as total_seats,
          SUM(s.available_seats) as available_seats,
          COUNT(DISTINCT sa.id) as total_applications,
          COUNT(DISTINCT CASE WHEN sa.status = 'Pending' THEN sa.id END) as pending_applications,
          COUNT(DISTINCT CASE WHEN sa.status = 'Approved' THEN sa.id END) as approved_applications,
          COUNT(DISTINCT CASE WHEN sa.status = 'Rejected' THEN sa.id END) as rejected_applications,
          COALESCE(SUM(sd.amount), 0) as total_distributed_amount,
          COUNT(DISTINCT sd.id) as total_distributions
        FROM scholarships s
        LEFT JOIN scholarship_applications sa ON s.id = sa.scholarship_id
        LEFT JOIN scholarship_distributions sd ON sa.id = sd.application_id AND sd.status = 'Completed'
      `;

      const result = await pool.query(query);

      // Get type-wise statistics
      const typeQuery = `
        SELECT 
          s.scholarship_type,
          COUNT(DISTINCT s.id) as count,
          COUNT(DISTINCT sa.id) as applications,
          COUNT(DISTINCT CASE WHEN sa.status = 'Approved' THEN sa.id END) as approved
        FROM scholarships s
        LEFT JOIN scholarship_applications sa ON s.id = sa.scholarship_id
        GROUP BY s.scholarship_type
      `;

      const typeResult = await pool.query(typeQuery);

      return {
        overall: result.rows[0],
        by_type: typeResult.rows
      };

    } catch (error) {
      console.error('Get Scholarship Statistics Error:', error);
      throw new Error('Failed to fetch scholarship statistics');
    }
  }
}

module.exports = new ScholarshipService();
