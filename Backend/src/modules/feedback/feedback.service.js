const pool = require('../../config/database');

class FeedbackService {
  // ==================== FEEDBACK FORM MANAGEMENT (ADMIN) ====================

  /**
   * Create feedback form
   * @param {string} formType - Type of feedback form (Course/Teacher/Facility/Custom)
   * @param {string} title - Form title
   * @param {string} description - Form description
   * @param {array} questions - Array of questions with type, text, options, required
   * @param {object} targetFilters - Target filters (semester_id, course_id, teacher_id, department_id)
   * @param {boolean} isAnonymous - Allow anonymous submissions
   * @param {date} startDate - Form available from
   * @param {date} endDate - Form available until
   * @param {number} adminId - Admin creating the form
   */
  async createFeedbackForm(formType, title, description, questions, targetFilters, isAnonymous, startDate, endDate, adminId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Validate form type
      const validTypes = ['Course', 'Teacher', 'Facility', 'Custom'];
      if (!validTypes.includes(formType)) {
        throw new Error('Invalid form type');
      }

      // Validate questions
      if (!questions || questions.length === 0) {
        throw new Error('At least one question is required');
      }

      // Validate date range
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end <= start) {
        throw new Error('End date must be after start date');
      }

      // Insert feedback form
      const formResult = await client.query(
        `INSERT INTO feedback_forms (
          form_type, title, description, questions, 
          target_filters, is_anonymous, start_date, end_date,
          created_by, status, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
        RETURNING *`,
        [
          formType,
          title,
          description,
          JSON.stringify(questions),
          JSON.stringify(targetFilters || {}),
          isAnonymous,
          startDate,
          endDate,
          adminId,
          'Active'
        ]
      );

      await client.query('COMMIT');

      const form = formResult.rows[0];
      return {
        ...form,
        questions: JSON.parse(form.questions),
        target_filters: JSON.parse(form.target_filters)
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all feedback forms (Admin)
   * @param {object} filters - Filters (form_type, status)
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   */
  async getAllFeedbackForms(filters = {}, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    let conditions = [];
    let params = [];
    let paramIndex = 1;

    if (filters.form_type) {
      conditions.push(`ff.form_type = $${paramIndex}`);
      params.push(filters.form_type);
      paramIndex++;
    }

    if (filters.status) {
      conditions.push(`ff.status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM feedback_forms ff ${whereClause}`,
      params
    );

    // Get forms with submission count
    const result = await pool.query(
      `SELECT ff.*, 
              a.first_name || ' ' || a.last_name as created_by_name,
              COUNT(DISTINCT fs.id) as submission_count
       FROM feedback_forms ff
       LEFT JOIN admins a ON ff.created_by = a.id
       LEFT JOIN feedback_submissions fs ON ff.id = fs.form_id
       ${whereClause}
       GROUP BY ff.id, a.first_name, a.last_name
       ORDER BY ff.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const forms = result.rows.map(form => ({
      ...form,
      questions: JSON.parse(form.questions || '[]'),
      target_filters: JSON.parse(form.target_filters || '{}')
    }));

    return {
      forms,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].total),
        totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
      }
    };
  }

  /**
   * Get feedback form by ID
   * @param {number} formId - Form ID
   */
  async getFeedbackFormById(formId) {
    const result = await pool.query(
      `SELECT ff.*, 
              a.first_name || ' ' || a.last_name as created_by_name,
              COUNT(DISTINCT fs.id) as submission_count
       FROM feedback_forms ff
       LEFT JOIN admins a ON ff.created_by = a.id
       LEFT JOIN feedback_submissions fs ON ff.id = fs.form_id
       WHERE ff.id = $1
       GROUP BY ff.id, a.first_name, a.last_name`,
      [formId]
    );

    if (result.rows.length === 0) {
      throw new Error('Feedback form not found');
    }

    const form = result.rows[0];
    return {
      ...form,
      questions: JSON.parse(form.questions),
      target_filters: JSON.parse(form.target_filters)
    };
  }

  // ==================== FEEDBACK SUBMISSION (STUDENT) ====================

  /**
   * Get available feedback forms for student
   * @param {number} studentId - Student ID
   */
  async getAvailableFeedbackForms(studentId) {
    // Get student details
    const studentResult = await pool.query(
      `SELECT s.*, 
              ss.semester_id,
              d.id as department_id
       FROM students s
       LEFT JOIN student_sessions ss ON s.id = ss.student_id AND ss.is_active = true
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE s.id = $1`,
      [studentId]
    );

    if (studentResult.rows.length === 0) {
      throw new Error('Student not found');
    }

    const student = studentResult.rows[0];
    const now = new Date();

    // Get active forms within date range
    const formsResult = await pool.query(
      `SELECT ff.*, 
              COUNT(DISTINCT fs.id) FILTER (WHERE fs.student_id = $1) as student_submission_count
       FROM feedback_forms ff
       LEFT JOIN feedback_submissions fs ON ff.id = fs.form_id
       WHERE ff.status = 'Active'
         AND ff.start_date <= $2
         AND ff.end_date >= $2
       GROUP BY ff.id
       ORDER BY ff.created_at DESC`,
      [studentId, now]
    );

    // Filter forms based on target criteria and check if already submitted
    const availableForms = [];

    for (const form of formsResult.rows) {
      const targetFilters = JSON.parse(form.target_filters || '{}');
      let isEligible = true;

      // Check if form targets specific criteria
      if (targetFilters.semester_id && targetFilters.semester_id !== student.semester_id) {
        isEligible = false;
      }

      if (targetFilters.department_id && targetFilters.department_id !== student.department_id) {
        isEligible = false;
      }

      // Check if form targets specific course
      if (targetFilters.course_id) {
        const enrollmentCheck = await pool.query(
          `SELECT 1 FROM enrollments 
           WHERE student_id = $1 AND course_id = $2 AND status = 'Enrolled'`,
          [studentId, targetFilters.course_id]
        );
        if (enrollmentCheck.rows.length === 0) {
          isEligible = false;
        }
      }

      // Check if form targets specific teacher
      if (targetFilters.teacher_id) {
        const enrollmentCheck = await pool.query(
          `SELECT 1 FROM enrollments e
           JOIN course_assignments ca ON e.course_id = ca.course_id
           WHERE e.student_id = $1 AND ca.teacher_id = $2 AND e.status = 'Enrolled'`,
          [studentId, targetFilters.teacher_id]
        );
        if (enrollmentCheck.rows.length === 0) {
          isEligible = false;
        }
      }

      // Check if already submitted
      const alreadySubmitted = parseInt(form.student_submission_count) > 0;

      if (isEligible) {
        availableForms.push({
          ...form,
          questions: JSON.parse(form.questions),
          target_filters: JSON.parse(form.target_filters),
          already_submitted: alreadySubmitted,
          can_submit: !alreadySubmitted
        });
      }
    }

    return availableForms;
  }

  /**
   * Submit feedback
   * @param {number} formId - Feedback form ID
   * @param {number} studentId - Student ID
   * @param {array} responses - Array of responses {question_id, answer, rating}
   * @param {boolean} isAnonymous - Submit anonymously
   */
  async submitFeedback(formId, studentId, responses, isAnonymous = false) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get feedback form
      const formResult = await client.query(
        `SELECT * FROM feedback_forms WHERE id = $1`,
        [formId]
      );

      if (formResult.rows.length === 0) {
        throw new Error('Feedback form not found');
      }

      const form = formResult.rows[0];

      // Check if form is active and within date range
      if (form.status !== 'Active') {
        throw new Error('Feedback form is not active');
      }

      const now = new Date();
      if (now < new Date(form.start_date) || now > new Date(form.end_date)) {
        throw new Error('Feedback form is not available at this time');
      }

      // Check if anonymous submission is allowed
      if (isAnonymous && !form.is_anonymous) {
        throw new Error('Anonymous submissions are not allowed for this form');
      }

      // Check if student already submitted
      const existingSubmission = await client.query(
        `SELECT id FROM feedback_submissions 
         WHERE form_id = $1 AND student_id = $2`,
        [formId, studentId]
      );

      if (existingSubmission.rows.length > 0) {
        throw new Error('You have already submitted feedback for this form');
      }

      // Validate responses against form questions
      const questions = JSON.parse(form.questions);
      const questionIds = questions.map(q => q.id);
      const responseQuestionIds = responses.map(r => r.question_id);

      // Check required questions
      for (const question of questions) {
        if (question.required && !responseQuestionIds.includes(question.id)) {
          throw new Error(`Question "${question.text}" is required`);
        }
      }

      // Insert feedback submission
      const submissionResult = await client.query(
        `INSERT INTO feedback_submissions (
          form_id, student_id, responses, is_anonymous, submitted_at
        )
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        RETURNING *`,
        [
          formId,
          studentId,
          JSON.stringify(responses),
          isAnonymous
        ]
      );

      await client.query('COMMIT');

      const submission = submissionResult.rows[0];
      return {
        ...submission,
        responses: JSON.parse(submission.responses),
        message: 'Feedback submitted successfully'
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ==================== FEEDBACK REPORTS (ADMIN) ====================

  /**
   * Generate feedback reports
   * @param {object} filters - Report filters
   */
  async generateFeedbackReports(filters = {}) {
    const { form_id, teacher_id, course_id, department_id, report_type } = filters;

    let reportData = {};

    if (report_type === 'teacher' || teacher_id) {
      reportData.teacher_reports = await this.getTeacherFeedbackReport(teacher_id, form_id);
    }

    if (report_type === 'course' || course_id) {
      reportData.course_reports = await this.getCourseFeedbackReport(course_id, form_id);
    }

    if (report_type === 'department' || department_id) {
      reportData.department_reports = await this.getDepartmentFeedbackReport(department_id, form_id);
    }

    if (report_type === 'summary' || form_id) {
      reportData.summary = await this.getFormSummaryReport(form_id);
    }

    return reportData;
  }

  /**
   * Get teacher-wise feedback report
   */
  async getTeacherFeedbackReport(teacherId = null, formId = null) {
    let conditions = ["ff.form_type = 'Teacher'"];
    let params = [];
    let paramIndex = 1;

    if (teacherId) {
      conditions.push(`(ff.target_filters->>'teacher_id')::int = $${paramIndex}`);
      params.push(teacherId);
      paramIndex++;
    }

    if (formId) {
      conditions.push(`ff.id = $${paramIndex}`);
      params.push(formId);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    const result = await pool.query(
      `SELECT 
        ff.id as form_id,
        ff.title as form_title,
        ff.target_filters->>'teacher_id' as teacher_id,
        t.first_name || ' ' || t.last_name as teacher_name,
        d.name as department_name,
        COUNT(fs.id) as total_responses,
        COUNT(fs.id) FILTER (WHERE fs.is_anonymous = true) as anonymous_responses,
        ff.questions,
        json_agg(fs.responses) as all_responses
      FROM feedback_forms ff
      LEFT JOIN feedback_submissions fs ON ff.id = fs.form_id
      LEFT JOIN teachers t ON (ff.target_filters->>'teacher_id')::int = t.id
      LEFT JOIN departments d ON t.department_id = d.id
      WHERE ${whereClause}
      GROUP BY ff.id, t.first_name, t.last_name, d.name`,
      params
    );

    // Calculate analytics for each teacher
    const reports = result.rows.map(row => {
      const questions = JSON.parse(row.questions || '[]');
      const allResponses = row.all_responses.filter(r => r !== null).map(r => 
        typeof r === 'string' ? JSON.parse(r) : r
      );

      const analytics = this.calculateAnalytics(questions, allResponses);

      return {
        form_id: row.form_id,
        form_title: row.form_title,
        teacher_id: row.teacher_id,
        teacher_name: row.teacher_name,
        department_name: row.department_name,
        total_responses: parseInt(row.total_responses),
        anonymous_responses: parseInt(row.anonymous_responses),
        analytics
      };
    });

    return reports;
  }

  /**
   * Get course-wise feedback report
   */
  async getCourseFeedbackReport(courseId = null, formId = null) {
    let conditions = ["ff.form_type = 'Course'"];
    let params = [];
    let paramIndex = 1;

    if (courseId) {
      conditions.push(`(ff.target_filters->>'course_id')::int = $${paramIndex}`);
      params.push(courseId);
      paramIndex++;
    }

    if (formId) {
      conditions.push(`ff.id = $${paramIndex}`);
      params.push(formId);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    const result = await pool.query(
      `SELECT 
        ff.id as form_id,
        ff.title as form_title,
        ff.target_filters->>'course_id' as course_id,
        c.name as course_name,
        c.code as course_code,
        d.name as department_name,
        COUNT(fs.id) as total_responses,
        ff.questions,
        json_agg(fs.responses) as all_responses
      FROM feedback_forms ff
      LEFT JOIN feedback_submissions fs ON ff.id = fs.form_id
      LEFT JOIN courses c ON (ff.target_filters->>'course_id')::int = c.id
      LEFT JOIN departments d ON c.department_id = d.id
      WHERE ${whereClause}
      GROUP BY ff.id, c.name, c.code, d.name`,
      params
    );

    const reports = result.rows.map(row => {
      const questions = JSON.parse(row.questions || '[]');
      const allResponses = row.all_responses.filter(r => r !== null).map(r => 
        typeof r === 'string' ? JSON.parse(r) : r
      );

      const analytics = this.calculateAnalytics(questions, allResponses);

      return {
        form_id: row.form_id,
        form_title: row.form_title,
        course_id: row.course_id,
        course_name: row.course_name,
        course_code: row.course_code,
        department_name: row.department_name,
        total_responses: parseInt(row.total_responses),
        analytics
      };
    });

    return reports;
  }

  /**
   * Get department-wise feedback report
   */
  async getDepartmentFeedbackReport(departmentId = null, formId = null) {
    let conditions = ["ff.form_type IN ('Facility', 'Custom')"];
    let params = [];
    let paramIndex = 1;

    if (departmentId) {
      conditions.push(`(ff.target_filters->>'department_id')::int = $${paramIndex}`);
      params.push(departmentId);
      paramIndex++;
    }

    if (formId) {
      conditions.push(`ff.id = $${paramIndex}`);
      params.push(formId);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    const result = await pool.query(
      `SELECT 
        ff.id as form_id,
        ff.title as form_title,
        ff.form_type,
        ff.target_filters->>'department_id' as department_id,
        d.name as department_name,
        COUNT(fs.id) as total_responses,
        ff.questions,
        json_agg(fs.responses) as all_responses
      FROM feedback_forms ff
      LEFT JOIN feedback_submissions fs ON ff.id = fs.form_id
      LEFT JOIN departments d ON (ff.target_filters->>'department_id')::int = d.id
      WHERE ${whereClause}
      GROUP BY ff.id, d.name`,
      params
    );

    const reports = result.rows.map(row => {
      const questions = JSON.parse(row.questions || '[]');
      const allResponses = row.all_responses.filter(r => r !== null).map(r => 
        typeof r === 'string' ? JSON.parse(r) : r
      );

      const analytics = this.calculateAnalytics(questions, allResponses);

      return {
        form_id: row.form_id,
        form_title: row.form_title,
        form_type: row.form_type,
        department_id: row.department_id,
        department_name: row.department_name,
        total_responses: parseInt(row.total_responses),
        analytics
      };
    });

    return reports;
  }

  /**
   * Get form summary report
   */
  async getFormSummaryReport(formId) {
    if (!formId) {
      throw new Error('Form ID is required for summary report');
    }

    const result = await pool.query(
      `SELECT 
        ff.*,
        COUNT(fs.id) as total_responses,
        COUNT(fs.id) FILTER (WHERE fs.is_anonymous = true) as anonymous_responses,
        COUNT(fs.id) FILTER (WHERE fs.is_anonymous = false) as named_responses,
        json_agg(
          json_build_object(
            'responses', fs.responses,
            'submitted_at', fs.submitted_at,
            'is_anonymous', fs.is_anonymous,
            'student_name', CASE 
              WHEN fs.is_anonymous THEN 'Anonymous'
              ELSE s.first_name || ' ' || s.last_name
            END
          )
        ) FILTER (WHERE fs.id IS NOT NULL) as submissions
      FROM feedback_forms ff
      LEFT JOIN feedback_submissions fs ON ff.id = fs.form_id
      LEFT JOIN students s ON fs.student_id = s.id
      WHERE ff.id = $1
      GROUP BY ff.id`,
      [formId]
    );

    if (result.rows.length === 0) {
      throw new Error('Feedback form not found');
    }

    const form = result.rows[0];
    const questions = JSON.parse(form.questions || '[]');
    const submissions = form.submissions || [];

    const allResponses = submissions.map(sub => 
      typeof sub.responses === 'string' ? JSON.parse(sub.responses) : sub.responses
    );

    const analytics = this.calculateAnalytics(questions, allResponses);

    return {
      form_id: form.id,
      form_title: form.title,
      form_type: form.form_type,
      description: form.description,
      start_date: form.start_date,
      end_date: form.end_date,
      is_anonymous: form.is_anonymous,
      status: form.status,
      total_responses: parseInt(form.total_responses),
      anonymous_responses: parseInt(form.anonymous_responses),
      named_responses: parseInt(form.named_responses),
      target_filters: JSON.parse(form.target_filters),
      analytics,
      submissions: submissions.map(sub => ({
        ...sub,
        responses: typeof sub.responses === 'string' ? JSON.parse(sub.responses) : sub.responses
      }))
    };
  }

  /**
   * Calculate analytics for responses
   */
  calculateAnalytics(questions, allResponses) {
    const analytics = [];

    for (const question of questions) {
      const questionResponses = allResponses.map(responseSet => 
        responseSet.find(r => r.question_id === question.id)
      ).filter(r => r);

      let questionAnalytics = {
        question_id: question.id,
        question_text: question.text,
        question_type: question.type,
        total_responses: questionResponses.length
      };

      if (question.type === 'rating') {
        // Calculate rating statistics
        const ratings = questionResponses.map(r => parseFloat(r.rating)).filter(r => !isNaN(r));
        
        if (ratings.length > 0) {
          const sum = ratings.reduce((a, b) => a + b, 0);
          const avg = sum / ratings.length;
          const max = Math.max(...ratings);
          const min = Math.min(...ratings);

          // Rating distribution
          const distribution = {};
          for (let i = 1; i <= 5; i++) {
            distribution[i] = ratings.filter(r => r === i).length;
          }

          questionAnalytics.statistics = {
            average: parseFloat(avg.toFixed(2)),
            max,
            min,
            total_ratings: ratings.length,
            distribution
          };
        }
      } else if (question.type === 'multiple_choice') {
        // Calculate choice distribution
        const distribution = {};
        questionResponses.forEach(r => {
          const answer = r.answer;
          distribution[answer] = (distribution[answer] || 0) + 1;
        });

        questionAnalytics.distribution = distribution;
      } else if (question.type === 'text') {
        // Collect text responses (exclude for anonymous)
        questionAnalytics.text_responses = questionResponses.map(r => r.answer);
      }

      analytics.push(questionAnalytics);
    }

    return analytics;
  }
}

module.exports = new FeedbackService();
