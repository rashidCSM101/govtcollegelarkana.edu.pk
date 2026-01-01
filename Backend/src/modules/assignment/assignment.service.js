const { query, getClient } = require('../../config/database');
const { validateRequired } = require('../../utils/validator');

class AssignmentService {

  // ==================== TEACHER: CREATE ASSIGNMENT ====================

  async createAssignment(teacherId, assignmentData) {
    const {
      course_id,
      section_id,
      title,
      description,
      total_marks = 10,
      due_date,
      file_path,
      allow_multiple_submissions = false,
      allow_late_submissions = true,
      late_penalty_per_day = 0,
      instructions
    } = assignmentData;

    const validation = validateRequired(
      { course_id, title, due_date },
      ['course_id', 'title', 'due_date']
    );
    if (!validation.isValid) {
      throw { status: 400, message: validation.errors.join(', ') };
    }

    // Verify teacher teaches this course
    const teacherCourseCheck = await query(`
      SELECT cs.id 
      FROM course_sections cs
      JOIN courses c ON cs.course_id = c.id
      WHERE cs.teacher_id = $1 AND cs.course_id = $2
      ${section_id ? 'AND cs.id = $3' : ''}
    `, section_id ? [teacherId, course_id, section_id] : [teacherId, course_id]);

    if (teacherCourseCheck.rows.length === 0) {
      throw { status: 403, message: 'You do not teach this course/section' };
    }

    const result = await query(`
      INSERT INTO assignments (
        course_id, section_id, title, description,
        total_marks, due_date, file_path,
        allow_multiple_submissions, allow_late_submissions,
        late_penalty_per_day, instructions, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      course_id, section_id, title, description,
      total_marks, due_date, file_path,
      allow_multiple_submissions, allow_late_submissions,
      late_penalty_per_day, instructions, teacherId
    ]);

    return {
      message: 'Assignment created successfully',
      assignment: result.rows[0]
    };
  }

  // ==================== TEACHER: GET ASSIGNMENTS ====================

  async getTeacherAssignments(teacherId, filters = {}) {
    const { course_id, section_id, status, page = 1, limit = 50 } = filters;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT 
        a.*,
        c.name as course_name,
        c.code as course_code,
        cs.name as section_name,
        COUNT(DISTINCT asub.id) as total_submissions,
        COUNT(DISTINCT CASE WHEN asub.status = 'graded' THEN asub.id END) as graded_count,
        COUNT(DISTINCT se.student_id) as total_students
      FROM assignments a
      JOIN courses c ON a.course_id = c.id
      LEFT JOIN course_sections cs ON a.section_id = cs.id
      LEFT JOIN assignment_submissions asub ON a.id = asub.assignment_id
      LEFT JOIN section_enrollments se ON cs.id = se.section_id
      WHERE a.created_by = $1
    `;
    const params = [teacherId];
    let paramCount = 1;

    if (course_id) {
      paramCount++;
      sql += ` AND a.course_id = $${paramCount}`;
      params.push(course_id);
    }

    if (section_id) {
      paramCount++;
      sql += ` AND a.section_id = $${paramCount}`;
      params.push(section_id);
    }

    sql += ` GROUP BY a.id, c.id, cs.id`;
    sql += ` ORDER BY a.created_at DESC`;
    sql += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    // Get total count
    let countSql = `
      SELECT COUNT(DISTINCT a.id) 
      FROM assignments a
      WHERE a.created_by = $1
    `;
    const countParams = [teacherId];
    let countParamCount = 1;

    if (course_id) {
      countParamCount++;
      countSql += ` AND a.course_id = $${countParamCount}`;
      countParams.push(course_id);
    }

    if (section_id) {
      countParamCount++;
      countSql += ` AND a.section_id = $${countParamCount}`;
      countParams.push(section_id);
    }

    const countResult = await query(countSql, countParams);

    return {
      assignments: result.rows.map(a => ({
        ...a,
        is_overdue: new Date(a.due_date) < new Date(),
        submission_rate: a.total_students > 0 
          ? ((a.total_submissions / a.total_students) * 100).toFixed(2) 
          : 0
      })),
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        pages: Math.ceil(countResult.rows[0].count / limit)
      }
    };
  }

  // ==================== TEACHER: UPDATE ASSIGNMENT ====================

  async updateAssignment(teacherId, assignmentId, updateData) {
    // Verify ownership
    const assignmentCheck = await query(
      'SELECT * FROM assignments WHERE id = $1 AND created_by = $2',
      [assignmentId, teacherId]
    );

    if (assignmentCheck.rows.length === 0) {
      throw { status: 404, message: 'Assignment not found or you do not have permission' };
    }

    const {
      title,
      description,
      total_marks,
      due_date,
      file_path,
      allow_multiple_submissions,
      allow_late_submissions,
      late_penalty_per_day,
      instructions
    } = updateData;

    const updates = [];
    const values = [];
    let paramCount = 0;

    if (title !== undefined) {
      paramCount++;
      updates.push(`title = $${paramCount}`);
      values.push(title);
    }
    if (description !== undefined) {
      paramCount++;
      updates.push(`description = $${paramCount}`);
      values.push(description);
    }
    if (total_marks !== undefined) {
      paramCount++;
      updates.push(`total_marks = $${paramCount}`);
      values.push(total_marks);
    }
    if (due_date !== undefined) {
      paramCount++;
      updates.push(`due_date = $${paramCount}`);
      values.push(due_date);
    }
    if (file_path !== undefined) {
      paramCount++;
      updates.push(`file_path = $${paramCount}`);
      values.push(file_path);
    }
    if (allow_multiple_submissions !== undefined) {
      paramCount++;
      updates.push(`allow_multiple_submissions = $${paramCount}`);
      values.push(allow_multiple_submissions);
    }
    if (allow_late_submissions !== undefined) {
      paramCount++;
      updates.push(`allow_late_submissions = $${paramCount}`);
      values.push(allow_late_submissions);
    }
    if (late_penalty_per_day !== undefined) {
      paramCount++;
      updates.push(`late_penalty_per_day = $${paramCount}`);
      values.push(late_penalty_per_day);
    }
    if (instructions !== undefined) {
      paramCount++;
      updates.push(`instructions = $${paramCount}`);
      values.push(instructions);
    }

    if (updates.length === 0) {
      throw { status: 400, message: 'No fields to update' };
    }

    paramCount++;
    values.push(assignmentId);

    const sql = `
      UPDATE assignments 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await query(sql, values);

    return {
      message: 'Assignment updated successfully',
      assignment: result.rows[0]
    };
  }

  // ==================== TEACHER: VIEW SUBMISSIONS ====================

  async getAssignmentSubmissions(teacherId, assignmentId, filters = {}) {
    // Verify ownership
    const assignmentCheck = await query(
      'SELECT * FROM assignments WHERE id = $1 AND created_by = $2',
      [assignmentId, teacherId]
    );

    if (assignmentCheck.rows.length === 0) {
      throw { status: 404, message: 'Assignment not found or you do not have permission' };
    }

    const assignment = assignmentCheck.rows[0];

    const { status, student_id } = filters;

    let sql = `
      SELECT 
        asub.*,
        s.name as student_name,
        s.roll_no as student_roll_no,
        u.email as student_email,
        CASE 
          WHEN asub.submitted_at > a.due_date THEN true
          ELSE false
        END as is_late,
        EXTRACT(DAY FROM (asub.submitted_at - a.due_date)) as days_late
      FROM assignment_submissions asub
      JOIN students s ON asub.student_id = s.id
      JOIN users u ON s.user_id = u.id
      JOIN assignments a ON asub.assignment_id = a.id
      WHERE asub.assignment_id = $1
    `;
    const params = [assignmentId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      sql += ` AND asub.status = $${paramCount}`;
      params.push(status);
    }

    if (student_id) {
      paramCount++;
      sql += ` AND asub.student_id = $${paramCount}`;
      params.push(student_id);
    }

    sql += ` ORDER BY asub.submitted_at DESC`;

    const result = await query(sql, params);

    // Get students who haven't submitted
    const enrolledStudents = await query(`
      SELECT 
        s.id, s.name, s.roll_no, u.email
      FROM section_enrollments se
      JOIN students s ON se.student_id = s.id
      JOIN users u ON s.user_id = u.id
      WHERE se.section_id = $1
        AND s.id NOT IN (
          SELECT student_id FROM assignment_submissions WHERE assignment_id = $2
        )
    `, [assignment.section_id, assignmentId]);

    return {
      assignment: {
        id: assignment.id,
        title: assignment.title,
        total_marks: assignment.total_marks,
        due_date: assignment.due_date
      },
      submissions: result.rows,
      not_submitted: enrolledStudents.rows,
      statistics: {
        total_students: result.rows.length + enrolledStudents.rows.length,
        submitted: result.rows.length,
        not_submitted: enrolledStudents.rows.length,
        graded: result.rows.filter(s => s.status === 'graded').length,
        pending_grading: result.rows.filter(s => s.status !== 'graded').length,
        late_submissions: result.rows.filter(s => s.is_late).length
      }
    };
  }

  // ==================== TEACHER: GRADE ASSIGNMENT ====================

  async gradeSubmission(teacherId, submissionId, gradeData) {
    const { marks_obtained, feedback } = gradeData;

    if (marks_obtained === undefined) {
      throw { status: 400, message: 'marks_obtained is required' };
    }

    // Verify teacher owns the assignment
    const submissionCheck = await query(`
      SELECT asub.*, a.total_marks, a.created_by, a.late_penalty_per_day
      FROM assignment_submissions asub
      JOIN assignments a ON asub.assignment_id = a.id
      WHERE asub.id = $1
    `, [submissionId]);

    if (submissionCheck.rows.length === 0) {
      throw { status: 404, message: 'Submission not found' };
    }

    const submission = submissionCheck.rows[0];

    if (submission.created_by !== teacherId) {
      throw { status: 403, message: 'You do not have permission to grade this submission' };
    }

    if (parseFloat(marks_obtained) > parseFloat(submission.total_marks)) {
      throw { 
        status: 400, 
        message: `Marks cannot exceed total marks (${submission.total_marks})` 
      };
    }

    const result = await query(`
      UPDATE assignment_submissions
      SET marks_obtained = $1,
          feedback = $2,
          graded_by = $3,
          graded_at = CURRENT_TIMESTAMP,
          status = 'graded'
      WHERE id = $4
      RETURNING *
    `, [marks_obtained, feedback, teacherId, submissionId]);

    return {
      message: 'Assignment graded successfully',
      submission: result.rows[0]
    };
  }

  // ==================== TEACHER: BULK GRADE ====================

  async bulkGrade(teacherId, assignmentId, gradesData) {
    // Verify ownership
    const assignmentCheck = await query(
      'SELECT * FROM assignments WHERE id = $1 AND created_by = $2',
      [assignmentId, teacherId]
    );

    if (assignmentCheck.rows.length === 0) {
      throw { status: 404, message: 'Assignment not found or you do not have permission' };
    }

    const client = await getClient();
    const results = [];

    try {
      await client.query('BEGIN');

      for (const grade of gradesData.grades) {
        const { submission_id, marks_obtained, feedback } = grade;

        const result = await client.query(`
          UPDATE assignment_submissions
          SET marks_obtained = $1,
              feedback = $2,
              graded_by = $3,
              graded_at = CURRENT_TIMESTAMP,
              status = 'graded'
          WHERE id = $4 AND assignment_id = $5
          RETURNING *
        `, [marks_obtained, feedback, teacherId, submission_id, assignmentId]);

        if (result.rows.length > 0) {
          results.push(result.rows[0]);
        }
      }

      await client.query('COMMIT');

      return {
        message: `Successfully graded ${results.length} submissions`,
        graded_submissions: results
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ==================== TEACHER: ASSIGNMENT ANALYTICS ====================

  async getAssignmentAnalytics(teacherId, assignmentId) {
    // Verify ownership
    const assignmentCheck = await query(
      'SELECT * FROM assignments WHERE id = $1 AND created_by = $2',
      [assignmentId, teacherId]
    );

    if (assignmentCheck.rows.length === 0) {
      throw { status: 404, message: 'Assignment not found or you do not have permission' };
    }

    const assignment = assignmentCheck.rows[0];

    // Get submission statistics
    const submissions = await query(`
      SELECT 
        asub.*,
        CASE 
          WHEN asub.submitted_at > a.due_date THEN true
          ELSE false
        END as is_late
      FROM assignment_submissions asub
      JOIN assignments a ON asub.assignment_id = a.id
      WHERE asub.assignment_id = $1
    `, [assignmentId]);

    // Get enrolled students count
    const enrolledCount = await query(`
      SELECT COUNT(*) as count
      FROM section_enrollments
      WHERE section_id = $1
    `, [assignment.section_id]);

    const totalStudents = parseInt(enrolledCount.rows[0].count);
    const submissionsList = submissions.rows;
    const totalSubmissions = submissionsList.length;
    const onTimeSubmissions = submissionsList.filter(s => !s.is_late).length;
    const lateSubmissions = submissionsList.filter(s => s.is_late).length;
    const gradedSubmissions = submissionsList.filter(s => s.status === 'graded').length;

    // Grade distribution
    const gradedList = submissionsList.filter(s => s.status === 'graded');
    const grades = gradedList.map(s => parseFloat(s.marks_obtained));
    const avgGrade = grades.length > 0 
      ? (grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(2)
      : 0;
    const maxGrade = grades.length > 0 ? Math.max(...grades) : 0;
    const minGrade = grades.length > 0 ? Math.min(...grades) : 0;

    // Grade ranges
    const gradeRanges = {
      excellent: gradedList.filter(s => 
        (parseFloat(s.marks_obtained) / parseFloat(assignment.total_marks)) >= 0.9
      ).length,
      good: gradedList.filter(s => {
        const percentage = parseFloat(s.marks_obtained) / parseFloat(assignment.total_marks);
        return percentage >= 0.7 && percentage < 0.9;
      }).length,
      average: gradedList.filter(s => {
        const percentage = parseFloat(s.marks_obtained) / parseFloat(assignment.total_marks);
        return percentage >= 0.5 && percentage < 0.7;
      }).length,
      below_average: gradedList.filter(s => 
        (parseFloat(s.marks_obtained) / parseFloat(assignment.total_marks)) < 0.5
      ).length
    };

    return {
      assignment: {
        id: assignment.id,
        title: assignment.title,
        total_marks: assignment.total_marks,
        due_date: assignment.due_date
      },
      submission_statistics: {
        total_students: totalStudents,
        total_submissions: totalSubmissions,
        not_submitted: totalStudents - totalSubmissions,
        submission_rate: totalStudents > 0 
          ? ((totalSubmissions / totalStudents) * 100).toFixed(2) 
          : 0,
        on_time_submissions: onTimeSubmissions,
        late_submissions: lateSubmissions,
        on_time_rate: totalSubmissions > 0 
          ? ((onTimeSubmissions / totalSubmissions) * 100).toFixed(2)
          : 0
      },
      grading_statistics: {
        graded: gradedSubmissions,
        pending: totalSubmissions - gradedSubmissions,
        grading_progress: totalSubmissions > 0 
          ? ((gradedSubmissions / totalSubmissions) * 100).toFixed(2)
          : 0
      },
      grade_statistics: {
        average_grade: avgGrade,
        max_grade: maxGrade,
        min_grade: minGrade,
        total_marks: assignment.total_marks
      },
      grade_distribution: {
        excellent_90_plus: gradeRanges.excellent,
        good_70_89: gradeRanges.good,
        average_50_69: gradeRanges.average,
        below_average_0_49: gradeRanges.below_average
      }
    };
  }

  // ==================== STUDENT: VIEW ASSIGNMENTS ====================

  async getStudentAssignments(studentId, filters = {}) {
    const { course_id, status, page = 1, limit = 50 } = filters;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT 
        a.*,
        c.name as course_name,
        c.code as course_code,
        cs.name as section_name,
        asub.id as submission_id,
        asub.submitted_at,
        asub.marks_obtained,
        asub.status as submission_status,
        asub.feedback,
        CASE 
          WHEN asub.id IS NULL THEN false
          ELSE true
        END as is_submitted,
        CASE 
          WHEN a.due_date < CURRENT_TIMESTAMP AND asub.id IS NULL THEN true
          ELSE false
        END as is_overdue
      FROM section_enrollments se
      JOIN course_sections cs ON se.section_id = cs.id
      JOIN assignments a ON (a.section_id = cs.id OR (a.course_id = cs.course_id AND a.section_id IS NULL))
      JOIN courses c ON a.course_id = c.id
      LEFT JOIN assignment_submissions asub ON a.id = asub.assignment_id AND asub.student_id = se.student_id
      WHERE se.student_id = $1
    `;
    const params = [studentId];
    let paramCount = 1;

    if (course_id) {
      paramCount++;
      sql += ` AND a.course_id = $${paramCount}`;
      params.push(course_id);
    }

    if (status === 'submitted') {
      sql += ` AND asub.id IS NOT NULL`;
    } else if (status === 'pending') {
      sql += ` AND asub.id IS NULL`;
    } else if (status === 'graded') {
      sql += ` AND asub.status = 'graded'`;
    }

    sql += ` ORDER BY a.due_date DESC`;
    sql += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    return {
      assignments: result.rows,
      pagination: {
        page,
        limit,
        total: result.rows.length,
        pages: Math.ceil(result.rows.length / limit)
      }
    };
  }

  // ==================== STUDENT: VIEW ASSIGNMENT DETAILS ====================

  async getAssignmentDetails(studentId, assignmentId) {
    const result = await query(`
      SELECT 
        a.*,
        c.name as course_name,
        c.code as course_code,
        cs.name as section_name,
        u.email as teacher_email,
        t.name as teacher_name,
        asub.id as submission_id,
        asub.submission_text,
        asub.file_path as submission_file,
        asub.submitted_at,
        asub.marks_obtained,
        asub.status as submission_status,
        asub.feedback,
        asub.graded_at,
        CASE 
          WHEN asub.id IS NULL THEN false
          ELSE true
        END as is_submitted,
        CASE 
          WHEN a.due_date < CURRENT_TIMESTAMP AND asub.id IS NULL THEN true
          WHEN asub.submitted_at > a.due_date THEN true
          ELSE false
        END as is_late,
        CASE 
          WHEN a.due_date < CURRENT_TIMESTAMP THEN true
          ELSE false
        END as is_overdue
      FROM assignments a
      JOIN courses c ON a.course_id = c.id
      LEFT JOIN course_sections cs ON a.section_id = cs.id
      JOIN users u ON a.created_by = u.id
      LEFT JOIN teachers t ON u.id = t.user_id
      LEFT JOIN assignment_submissions asub ON a.id = asub.assignment_id AND asub.student_id = $1
      WHERE a.id = $2
    `, [studentId, assignmentId]);

    if (result.rows.length === 0) {
      throw { status: 404, message: 'Assignment not found' };
    }

    const assignment = result.rows[0];

    return {
      assignment: {
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,
        instructions: assignment.instructions,
        total_marks: assignment.total_marks,
        due_date: assignment.due_date,
        file_path: assignment.file_path,
        allow_multiple_submissions: assignment.allow_multiple_submissions,
        allow_late_submissions: assignment.allow_late_submissions,
        late_penalty_per_day: assignment.late_penalty_per_day,
        course: {
          name: assignment.course_name,
          code: assignment.course_code
        },
        section: assignment.section_name,
        teacher: {
          name: assignment.teacher_name,
          email: assignment.teacher_email
        },
        created_at: assignment.created_at
      },
      submission: assignment.submission_id ? {
        id: assignment.submission_id,
        submission_text: assignment.submission_text,
        file_path: assignment.submission_file,
        submitted_at: assignment.submitted_at,
        marks_obtained: assignment.marks_obtained,
        status: assignment.submission_status,
        feedback: assignment.feedback,
        graded_at: assignment.graded_at,
        is_late: assignment.is_late
      } : null,
      can_submit: !assignment.is_submitted || assignment.allow_multiple_submissions,
      is_overdue: assignment.is_overdue,
      late_submission_allowed: assignment.allow_late_submissions
    };
  }

  // ==================== STUDENT: SUBMIT ASSIGNMENT ====================

  async submitAssignment(studentId, assignmentId, submissionData) {
    const { submission_text, file_path } = submissionData;

    if (!submission_text && !file_path) {
      throw { status: 400, message: 'Either submission_text or file_path is required' };
    }

    // Get assignment details
    const assignmentResult = await query(
      'SELECT * FROM assignments WHERE id = $1',
      [assignmentId]
    );

    if (assignmentResult.rows.length === 0) {
      throw { status: 404, message: 'Assignment not found' };
    }

    const assignment = assignmentResult.rows[0];

    // Check if already submitted
    const existingSubmission = await query(
      'SELECT * FROM assignment_submissions WHERE assignment_id = $1 AND student_id = $2',
      [assignmentId, studentId]
    );

    if (existingSubmission.rows.length > 0 && !assignment.allow_multiple_submissions) {
      throw { 
        status: 400, 
        message: 'Multiple submissions not allowed for this assignment' 
      };
    }

    // Check if late
    const now = new Date();
    const dueDate = new Date(assignment.due_date);
    const isLate = now > dueDate;

    if (isLate && !assignment.allow_late_submissions) {
      throw { 
        status: 400, 
        message: 'Late submissions not allowed for this assignment' 
      };
    }

    const status = isLate ? 'late' : 'submitted';

    // If multiple submissions allowed, delete previous one
    if (existingSubmission.rows.length > 0 && assignment.allow_multiple_submissions) {
      await query(
        'DELETE FROM assignment_submissions WHERE assignment_id = $1 AND student_id = $2',
        [assignmentId, studentId]
      );
    }

    const result = await query(`
      INSERT INTO assignment_submissions (
        assignment_id, student_id, submission_text,
        file_path, status
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [assignmentId, studentId, submission_text, file_path, status]);

    return {
      message: isLate 
        ? 'Assignment submitted late' 
        : 'Assignment submitted successfully',
      submission: result.rows[0],
      warning: isLate && assignment.late_penalty_per_day > 0
        ? `Late submission penalty: ${assignment.late_penalty_per_day} marks per day`
        : null
    };
  }

  // ==================== STUDENT: VIEW SUBMITTED ASSIGNMENTS ====================

  async getSubmittedAssignments(studentId) {
    const result = await query(`
      SELECT 
        a.*,
        c.name as course_name,
        c.code as course_code,
        asub.id as submission_id,
        asub.submission_text,
        asub.file_path as submission_file,
        asub.submitted_at,
        asub.marks_obtained,
        asub.status as submission_status,
        asub.feedback,
        asub.graded_at,
        CASE 
          WHEN asub.submitted_at > a.due_date THEN true
          ELSE false
        END as is_late
      FROM assignment_submissions asub
      JOIN assignments a ON asub.assignment_id = a.id
      JOIN courses c ON a.course_id = c.id
      WHERE asub.student_id = $1
      ORDER BY asub.submitted_at DESC
    `, [studentId]);

    return {
      submissions: result.rows,
      statistics: {
        total_submitted: result.rows.length,
        graded: result.rows.filter(s => s.submission_status === 'graded').length,
        pending_grading: result.rows.filter(s => s.submission_status !== 'graded').length,
        late_submissions: result.rows.filter(s => s.is_late).length
      }
    };
  }
}

module.exports = new AssignmentService();
