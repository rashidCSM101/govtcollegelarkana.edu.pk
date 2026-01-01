const { query, getClient } = require('../../config/database');
const { validateRequired } = require('../../utils/validator');
const crypto = require('crypto');

class ExamService {

  // ==================== EXAM MANAGEMENT (Admin) ====================

  // Create exam
  async createExam(userId, examData) {
    const { name, type, semester_id, start_date, end_date } = examData;

    const validation = validateRequired({ name, type, semester_id }, ['name', 'type', 'semester_id']);
    if (!validation.isValid) {
      throw { status: 400, message: validation.errors.join(', ') };
    }

    const validTypes = ['midterm', 'final', 'quiz', 'assignment', 'practical'];
    if (!validTypes.includes(type)) {
      throw { status: 400, message: `Invalid exam type. Must be one of: ${validTypes.join(', ')}` };
    }

    // Verify semester exists
    const semesterResult = await query('SELECT id FROM semesters WHERE id = $1', [semester_id]);
    if (semesterResult.rows.length === 0) {
      throw { status: 404, message: 'Semester not found' };
    }

    const result = await query(`
      INSERT INTO exams (name, type, semester_id, start_date, end_date, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [name, type, semester_id, start_date, end_date, userId]);

    return {
      message: 'Exam created successfully',
      exam: result.rows[0]
    };
  }

  // Get all exams
  async getExams(filters = {}) {
    const { semester_id, type, status } = filters;

    let sql = `
      SELECT e.*, s.name as semester_name, ses.name as session_name,
             u.email as created_by_email,
             (SELECT COUNT(*) FROM exam_schedule WHERE exam_id = e.id) as schedule_count
      FROM exams e
      JOIN semesters s ON e.semester_id = s.id
      JOIN sessions ses ON s.session_id = ses.id
      LEFT JOIN users u ON e.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (semester_id) {
      paramCount++;
      sql += ` AND e.semester_id = $${paramCount}`;
      params.push(semester_id);
    }

    if (type) {
      paramCount++;
      sql += ` AND e.type = $${paramCount}`;
      params.push(type);
    }

    if (status === 'upcoming') {
      sql += ` AND e.start_date > CURRENT_DATE`;
    } else if (status === 'ongoing') {
      sql += ` AND e.start_date <= CURRENT_DATE AND e.end_date >= CURRENT_DATE`;
    } else if (status === 'completed') {
      sql += ` AND e.end_date < CURRENT_DATE`;
    }

    sql += ` ORDER BY e.start_date DESC`;

    const result = await query(sql, params);
    return result.rows;
  }

  // Get exam by ID
  async getExamById(examId) {
    const result = await query(`
      SELECT e.*, s.name as semester_name, ses.name as session_name,
             u.email as created_by_email
      FROM exams e
      JOIN semesters s ON e.semester_id = s.id
      JOIN sessions ses ON s.session_id = ses.id
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.id = $1
    `, [examId]);

    if (result.rows.length === 0) {
      throw { status: 404, message: 'Exam not found' };
    }

    // Get exam schedules
    const schedules = await query(`
      SELECT es.*, c.name as course_name, c.code as course_code
      FROM exam_schedule es
      JOIN courses c ON es.course_id = c.id
      WHERE es.exam_id = $1
      ORDER BY es.date, es.start_time
    `, [examId]);

    return {
      ...result.rows[0],
      schedules: schedules.rows
    };
  }

  // Update exam
  async updateExam(examId, updateData) {
    const { name, type, start_date, end_date } = updateData;

    const existingExam = await query('SELECT id FROM exams WHERE id = $1', [examId]);
    if (existingExam.rows.length === 0) {
      throw { status: 404, message: 'Exam not found' };
    }

    const result = await query(`
      UPDATE exams 
      SET name = COALESCE($1, name),
          type = COALESCE($2, type),
          start_date = COALESCE($3, start_date),
          end_date = COALESCE($4, end_date)
      WHERE id = $5
      RETURNING *
    `, [name, type, start_date, end_date, examId]);

    return {
      message: 'Exam updated successfully',
      exam: result.rows[0]
    };
  }

  // Delete exam
  async deleteExam(examId) {
    const existingExam = await query('SELECT id FROM exams WHERE id = $1', [examId]);
    if (existingExam.rows.length === 0) {
      throw { status: 404, message: 'Exam not found' };
    }

    await query('DELETE FROM exams WHERE id = $1', [examId]);
    return { message: 'Exam deleted successfully' };
  }

  // ==================== EXAM SCHEDULE ====================

  // Create exam schedule
  async createExamSchedule(scheduleData) {
    const { exam_id, course_id, date, start_time, end_time, room_no, total_marks, invigilator_id } = scheduleData;

    const validation = validateRequired(
      { exam_id, course_id, date, start_time, end_time },
      ['exam_id', 'course_id', 'date', 'start_time', 'end_time']
    );
    if (!validation.isValid) {
      throw { status: 400, message: validation.errors.join(', ') };
    }

    // Verify exam exists
    const examResult = await query('SELECT id FROM exams WHERE id = $1', [exam_id]);
    if (examResult.rows.length === 0) {
      throw { status: 404, message: 'Exam not found' };
    }

    // Verify course exists
    const courseResult = await query('SELECT id FROM courses WHERE id = $1', [course_id]);
    if (courseResult.rows.length === 0) {
      throw { status: 404, message: 'Course not found' };
    }

    // Check for room conflicts
    if (room_no) {
      const roomConflict = await query(`
        SELECT es.id, c.name as course_name
        FROM exam_schedule es
        JOIN courses c ON es.course_id = c.id
        WHERE es.date = $1 AND es.room_no = $2
          AND ((es.start_time < $4 AND es.end_time > $3))
      `, [date, room_no, start_time, end_time]);

      if (roomConflict.rows.length > 0) {
        throw { 
          status: 409, 
          message: `Room ${room_no} is already booked for ${roomConflict.rows[0].course_name} at this time` 
        };
      }
    }

    const result = await query(`
      INSERT INTO exam_schedule (exam_id, course_id, date, start_time, end_time, room_no, total_marks)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [exam_id, course_id, date, start_time, end_time, room_no, total_marks || 100]);

    return {
      message: 'Exam schedule created successfully',
      schedule: result.rows[0]
    };
  }

  // Get exam schedules
  async getExamSchedules(filters = {}) {
    const { exam_id, course_id, date, start_date, end_date } = filters;

    let sql = `
      SELECT es.*, 
             e.name as exam_name, e.type as exam_type,
             c.name as course_name, c.code as course_code,
             d.name as department_name
      FROM exam_schedule es
      JOIN exams e ON es.exam_id = e.id
      JOIN courses c ON es.course_id = c.id
      LEFT JOIN departments d ON c.department_id = d.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (exam_id) {
      paramCount++;
      sql += ` AND es.exam_id = $${paramCount}`;
      params.push(exam_id);
    }

    if (course_id) {
      paramCount++;
      sql += ` AND es.course_id = $${paramCount}`;
      params.push(course_id);
    }

    if (date) {
      paramCount++;
      sql += ` AND es.date = $${paramCount}`;
      params.push(date);
    }

    if (start_date) {
      paramCount++;
      sql += ` AND es.date >= $${paramCount}`;
      params.push(start_date);
    }

    if (end_date) {
      paramCount++;
      sql += ` AND es.date <= $${paramCount}`;
      params.push(end_date);
    }

    sql += ` ORDER BY es.date, es.start_time`;

    const result = await query(sql, params);
    return result.rows;
  }

  // Get student exam schedule
  async getStudentExamSchedule(userId) {
    // Get student
    const studentResult = await query('SELECT id FROM students WHERE user_id = $1', [userId]);
    if (studentResult.rows.length === 0) {
      throw { status: 404, message: 'Student profile not found' };
    }
    const studentId = studentResult.rows[0].id;

    // Get schedules for registered courses
    const result = await query(`
      SELECT es.*, 
             e.name as exam_name, e.type as exam_type,
             c.name as course_name, c.code as course_code,
             ht.ticket_number as hall_ticket
      FROM exam_schedule es
      JOIN exams e ON es.exam_id = e.id
      JOIN courses c ON es.course_id = c.id
      JOIN course_registrations cr ON cr.section_id IN (
        SELECT id FROM course_sections WHERE course_id = es.course_id
      )
      LEFT JOIN hall_tickets ht ON ht.student_id = $1 AND ht.exam_id = e.id
      WHERE cr.student_id = $1 AND cr.status = 'registered'
        AND es.date >= CURRENT_DATE
      ORDER BY es.date, es.start_time
    `, [studentId]);

    return {
      student_id: studentId,
      schedules: result.rows
    };
  }

  // Update exam schedule
  async updateExamSchedule(scheduleId, updateData) {
    const { date, start_time, end_time, room_no, total_marks } = updateData;

    const existingSchedule = await query('SELECT id FROM exam_schedule WHERE id = $1', [scheduleId]);
    if (existingSchedule.rows.length === 0) {
      throw { status: 404, message: 'Exam schedule not found' };
    }

    const result = await query(`
      UPDATE exam_schedule 
      SET date = COALESCE($1, date),
          start_time = COALESCE($2, start_time),
          end_time = COALESCE($3, end_time),
          room_no = COALESCE($4, room_no),
          total_marks = COALESCE($5, total_marks)
      WHERE id = $6
      RETURNING *
    `, [date, start_time, end_time, room_no, total_marks, scheduleId]);

    return {
      message: 'Exam schedule updated successfully',
      schedule: result.rows[0]
    };
  }

  // Delete exam schedule
  async deleteExamSchedule(scheduleId) {
    const existingSchedule = await query('SELECT id FROM exam_schedule WHERE id = $1', [scheduleId]);
    if (existingSchedule.rows.length === 0) {
      throw { status: 404, message: 'Exam schedule not found' };
    }

    await query('DELETE FROM exam_schedule WHERE id = $1', [scheduleId]);
    return { message: 'Exam schedule deleted successfully' };
  }

  // ==================== HALL TICKETS ====================

  // Generate hall tickets for exam
  async generateHallTickets(examId) {
    // Get exam
    const examResult = await query(`
      SELECT e.*, s.name as semester_name
      FROM exams e
      JOIN semesters s ON e.semester_id = s.id
      WHERE e.id = $1
    `, [examId]);

    if (examResult.rows.length === 0) {
      throw { status: 404, message: 'Exam not found' };
    }

    // Get all students registered for courses in this exam's schedules
    const studentsResult = await query(`
      SELECT DISTINCT s.id as student_id, s.name, s.roll_no
      FROM students s
      JOIN course_registrations cr ON cr.student_id = s.id
      JOIN course_sections cs ON cr.section_id = cs.id
      JOIN exam_schedule es ON es.course_id = cs.course_id
      WHERE es.exam_id = $1 AND cr.status = 'registered' AND s.status = 'active'
    `, [examId]);

    const client = await getClient();
    const results = { generated: [], skipped: [] };

    try {
      await client.query('BEGIN');

      for (const student of studentsResult.rows) {
        // Check if ticket already exists
        const existingTicket = await client.query(
          'SELECT id FROM hall_tickets WHERE student_id = $1 AND exam_id = $2',
          [student.student_id, examId]
        );

        if (existingTicket.rows.length > 0) {
          results.skipped.push({ student_id: student.student_id, reason: 'Ticket already exists' });
          continue;
        }

        // Generate unique ticket number
        const ticketNumber = `HT-${examId}-${student.roll_no}-${Date.now().toString(36).toUpperCase()}`;

        await client.query(`
          INSERT INTO hall_tickets (student_id, exam_id, ticket_number)
          VALUES ($1, $2, $3)
        `, [student.student_id, examId, ticketNumber]);

        results.generated.push({
          student_id: student.student_id,
          name: student.name,
          roll_no: student.roll_no,
          ticket_number: ticketNumber
        });
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return {
      message: `Generated ${results.generated.length} hall tickets, ${results.skipped.length} skipped`,
      exam_id: examId,
      generated: results.generated,
      skipped: results.skipped
    };
  }

  // Get student hall ticket
  async getStudentHallTicket(userId, examId) {
    // Get student
    const studentResult = await query(`
      SELECT s.*, d.name as department_name
      FROM students s
      LEFT JOIN departments d ON s.department_id = d.id
      WHERE s.user_id = $1
    `, [userId]);

    if (studentResult.rows.length === 0) {
      throw { status: 404, message: 'Student profile not found' };
    }
    const student = studentResult.rows[0];

    // Get hall ticket
    const ticketResult = await query(`
      SELECT ht.*, e.name as exam_name, e.type as exam_type,
             s.name as semester_name, ses.name as session_name
      FROM hall_tickets ht
      JOIN exams e ON ht.exam_id = e.id
      JOIN semesters s ON e.semester_id = s.id
      JOIN sessions ses ON s.session_id = ses.id
      WHERE ht.student_id = $1 AND ht.exam_id = $2
    `, [student.id, examId]);

    if (ticketResult.rows.length === 0) {
      throw { status: 404, message: 'Hall ticket not found' };
    }

    // Get exam schedules for this student
    const schedulesResult = await query(`
      SELECT es.*, c.name as course_name, c.code as course_code
      FROM exam_schedule es
      JOIN courses c ON es.course_id = c.id
      JOIN course_sections cs ON cs.course_id = c.id
      JOIN course_registrations cr ON cr.section_id = cs.id
      WHERE es.exam_id = $1 AND cr.student_id = $2 AND cr.status = 'registered'
      ORDER BY es.date, es.start_time
    `, [examId, student.id]);

    // Generate QR code data
    const qrData = {
      ticket: ticketResult.rows[0].ticket_number,
      student: student.roll_no,
      exam: examId
    };

    return {
      ticket: ticketResult.rows[0],
      student: {
        id: student.id,
        name: student.name,
        roll_no: student.roll_no,
        father_name: student.father_name,
        photo: student.photo,
        department: student.department_name
      },
      schedules: schedulesResult.rows,
      qr_code_data: JSON.stringify(qrData),
      college: 'Government College Larkana',
      generated_at: new Date().toISOString()
    };
  }

  // ==================== ONLINE EXAM MANAGEMENT ====================

  // Create online exam
  async createOnlineExam(userId, examData) {
    const { exam_schedule_id, duration_minutes, passing_marks, instructions, shuffle_questions, shuffle_options } = examData;

    const validation = validateRequired({ exam_schedule_id, duration_minutes }, ['exam_schedule_id', 'duration_minutes']);
    if (!validation.isValid) {
      throw { status: 400, message: validation.errors.join(', ') };
    }

    // Verify exam schedule exists
    const scheduleResult = await query(`
      SELECT es.*, e.name as exam_name, c.name as course_name
      FROM exam_schedule es
      JOIN exams e ON es.exam_id = e.id
      JOIN courses c ON es.course_id = c.id
      WHERE es.id = $1
    `, [exam_schedule_id]);

    if (scheduleResult.rows.length === 0) {
      throw { status: 404, message: 'Exam schedule not found' };
    }

    // Check if online exam already exists
    const existingOnlineExam = await query(
      'SELECT id FROM online_exams WHERE exam_schedule_id = $1',
      [exam_schedule_id]
    );

    if (existingOnlineExam.rows.length > 0) {
      throw { status: 409, message: 'Online exam already exists for this schedule' };
    }

    const result = await query(`
      INSERT INTO online_exams (exam_schedule_id, duration_minutes, passing_marks, instructions, is_active)
      VALUES ($1, $2, $3, $4, FALSE)
      RETURNING *
    `, [exam_schedule_id, duration_minutes, passing_marks || 40, instructions]);

    return {
      message: 'Online exam created successfully',
      online_exam: {
        ...result.rows[0],
        exam_name: scheduleResult.rows[0].exam_name,
        course_name: scheduleResult.rows[0].course_name
      }
    };
  }

  // Add questions to online exam
  async addQuestions(onlineExamId, questions) {
    if (!Array.isArray(questions) || questions.length === 0) {
      throw { status: 400, message: 'Questions array is required' };
    }

    // Verify online exam exists
    const examResult = await query('SELECT id FROM online_exams WHERE id = $1', [onlineExamId]);
    if (examResult.rows.length === 0) {
      throw { status: 404, message: 'Online exam not found' };
    }

    const client = await getClient();
    const results = { success: [], failed: [] };

    try {
      await client.query('BEGIN');

      for (const q of questions) {
        const { question_text, question_type, options, correct_answer, marks } = q;

        if (!question_text) {
          results.failed.push({ question: q, error: 'Question text is required' });
          continue;
        }

        const validTypes = ['mcq', 'short', 'long', 'true_false'];
        const qType = question_type || 'mcq';
        if (!validTypes.includes(qType)) {
          results.failed.push({ question: q, error: 'Invalid question type' });
          continue;
        }

        // For MCQ, validate options
        if (qType === 'mcq' && (!options || !Array.isArray(options) || options.length < 2)) {
          results.failed.push({ question: q, error: 'MCQ requires at least 2 options' });
          continue;
        }

        const result = await client.query(`
          INSERT INTO exam_questions (online_exam_id, question_text, question_type, options, correct_answer, marks)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `, [onlineExamId, question_text, qType, options ? JSON.stringify(options) : null, correct_answer, marks || 1]);

        results.success.push(result.rows[0]);
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return {
      message: `Added ${results.success.length} questions, ${results.failed.length} failed`,
      questions: results.success,
      failed: results.failed
    };
  }

  // Get online exam questions (Teacher view)
  async getOnlineExamQuestions(onlineExamId) {
    const examResult = await query(`
      SELECT oe.*, es.date, es.start_time, es.end_time, es.total_marks,
             e.name as exam_name, c.name as course_name, c.code as course_code
      FROM online_exams oe
      JOIN exam_schedule es ON oe.exam_schedule_id = es.id
      JOIN exams e ON es.exam_id = e.id
      JOIN courses c ON es.course_id = c.id
      WHERE oe.id = $1
    `, [onlineExamId]);

    if (examResult.rows.length === 0) {
      throw { status: 404, message: 'Online exam not found' };
    }

    const questionsResult = await query(`
      SELECT * FROM exam_questions WHERE online_exam_id = $1 ORDER BY id
    `, [onlineExamId]);

    return {
      exam: examResult.rows[0],
      questions: questionsResult.rows,
      total_questions: questionsResult.rows.length,
      total_marks: questionsResult.rows.reduce((sum, q) => sum + q.marks, 0)
    };
  }

  // Update question
  async updateQuestion(questionId, updateData) {
    const { question_text, options, correct_answer, marks } = updateData;

    const result = await query(`
      UPDATE exam_questions 
      SET question_text = COALESCE($1, question_text),
          options = COALESCE($2, options),
          correct_answer = COALESCE($3, correct_answer),
          marks = COALESCE($4, marks)
      WHERE id = $5
      RETURNING *
    `, [question_text, options ? JSON.stringify(options) : null, correct_answer, marks, questionId]);

    if (result.rows.length === 0) {
      throw { status: 404, message: 'Question not found' };
    }

    return {
      message: 'Question updated successfully',
      question: result.rows[0]
    };
  }

  // Delete question
  async deleteQuestion(questionId) {
    const result = await query('DELETE FROM exam_questions WHERE id = $1 RETURNING id', [questionId]);
    if (result.rows.length === 0) {
      throw { status: 404, message: 'Question not found' };
    }
    return { message: 'Question deleted successfully' };
  }

  // Activate/Deactivate online exam
  async toggleOnlineExam(onlineExamId, isActive) {
    const result = await query(`
      UPDATE online_exams SET is_active = $1 WHERE id = $2 RETURNING *
    `, [isActive, onlineExamId]);

    if (result.rows.length === 0) {
      throw { status: 404, message: 'Online exam not found' };
    }

    return {
      message: `Online exam ${isActive ? 'activated' : 'deactivated'} successfully`,
      exam: result.rows[0]
    };
  }

  // ==================== STUDENT ONLINE EXAM ====================

  // Get available online exams for student
  async getStudentOnlineExams(userId) {
    const studentResult = await query('SELECT id FROM students WHERE user_id = $1', [userId]);
    if (studentResult.rows.length === 0) {
      throw { status: 404, message: 'Student profile not found' };
    }
    const studentId = studentResult.rows[0].id;

    const result = await query(`
      SELECT oe.id, oe.duration_minutes, oe.passing_marks, oe.is_active,
             es.date, es.start_time, es.end_time, es.total_marks,
             e.name as exam_name, e.type as exam_type,
             c.name as course_name, c.code as course_code,
             ea.status as attempt_status, ea.submitted_at,
             (SELECT COUNT(*) FROM exam_questions WHERE online_exam_id = oe.id) as question_count
      FROM online_exams oe
      JOIN exam_schedule es ON oe.exam_schedule_id = es.id
      JOIN exams e ON es.exam_id = e.id
      JOIN courses c ON es.course_id = c.id
      JOIN course_sections cs ON cs.course_id = c.id AND cs.semester_id = e.semester_id
      JOIN course_registrations cr ON cr.section_id = cs.id
      LEFT JOIN exam_attempts ea ON ea.online_exam_id = oe.id AND ea.student_id = $1
      WHERE cr.student_id = $1 AND cr.status = 'registered'
      ORDER BY es.date, es.start_time
    `, [studentId]);

    return {
      student_id: studentId,
      exams: result.rows
    };
  }

  // Get online exam details for student (with questions if started)
  async getStudentOnlineExamDetails(userId, onlineExamId) {
    const studentResult = await query('SELECT id FROM students WHERE user_id = $1', [userId]);
    if (studentResult.rows.length === 0) {
      throw { status: 404, message: 'Student profile not found' };
    }
    const studentId = studentResult.rows[0].id;

    // Get exam details
    const examResult = await query(`
      SELECT oe.*, es.date, es.start_time, es.end_time, es.total_marks,
             e.name as exam_name, c.name as course_name, c.code as course_code
      FROM online_exams oe
      JOIN exam_schedule es ON oe.exam_schedule_id = es.id
      JOIN exams e ON es.exam_id = e.id
      JOIN courses c ON es.course_id = c.id
      WHERE oe.id = $1
    `, [onlineExamId]);

    if (examResult.rows.length === 0) {
      throw { status: 404, message: 'Online exam not found' };
    }

    const exam = examResult.rows[0];

    // Check attempt status
    const attemptResult = await query(`
      SELECT * FROM exam_attempts WHERE online_exam_id = $1 AND student_id = $2
    `, [onlineExamId, studentId]);

    const attempt = attemptResult.rows[0];

    // If exam started, get questions (without correct answers)
    let questions = [];
    let answers = [];

    if (attempt && attempt.status === 'in_progress') {
      questions = await query(`
        SELECT id, question_text, question_type, options, marks
        FROM exam_questions WHERE online_exam_id = $1 ORDER BY id
      `, [onlineExamId]);

      // Get saved answers
      answers = await query(`
        SELECT question_id, student_answer FROM exam_answers WHERE attempt_id = $1
      `, [attempt.id]);
    }

    return {
      exam,
      attempt: attempt || null,
      questions: questions.rows || [],
      saved_answers: answers.rows || [],
      can_start: exam.is_active && !attempt,
      time_remaining: attempt ? this.calculateTimeRemaining(attempt.start_time, exam.duration_minutes) : null
    };
  }

  // Start online exam
  async startOnlineExam(userId, onlineExamId) {
    const studentResult = await query('SELECT id FROM students WHERE user_id = $1', [userId]);
    if (studentResult.rows.length === 0) {
      throw { status: 404, message: 'Student profile not found' };
    }
    const studentId = studentResult.rows[0].id;

    // Get exam
    const examResult = await query(`
      SELECT oe.*, es.date, es.start_time, es.end_time
      FROM online_exams oe
      JOIN exam_schedule es ON oe.exam_schedule_id = es.id
      WHERE oe.id = $1
    `, [onlineExamId]);

    if (examResult.rows.length === 0) {
      throw { status: 404, message: 'Online exam not found' };
    }

    const exam = examResult.rows[0];

    if (!exam.is_active) {
      throw { status: 403, message: 'This exam is not active' };
    }

    // Check if already attempted
    const existingAttempt = await query(
      'SELECT id, status FROM exam_attempts WHERE online_exam_id = $1 AND student_id = $2',
      [onlineExamId, studentId]
    );

    if (existingAttempt.rows.length > 0) {
      if (existingAttempt.rows[0].status === 'submitted' || existingAttempt.rows[0].status === 'graded') {
        throw { status: 403, message: 'You have already submitted this exam' };
      }
      // Return existing attempt
      return {
        message: 'Resuming exam',
        attempt_id: existingAttempt.rows[0].id
      };
    }

    // Get total marks
    const totalMarks = await query(
      'SELECT SUM(marks) as total FROM exam_questions WHERE online_exam_id = $1',
      [onlineExamId]
    );

    // Create attempt
    const endTime = new Date(Date.now() + exam.duration_minutes * 60 * 1000);
    const result = await query(`
      INSERT INTO exam_attempts (online_exam_id, student_id, start_time, end_time, total_marks, status)
      VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, 'in_progress')
      RETURNING *
    `, [onlineExamId, studentId, endTime, totalMarks.rows[0].total || 0]);

    // Get questions (shuffled if needed)
    const questions = await query(`
      SELECT id, question_text, question_type, options, marks
      FROM exam_questions WHERE online_exam_id = $1 ORDER BY RANDOM()
    `, [onlineExamId]);

    return {
      message: 'Exam started successfully',
      attempt: result.rows[0],
      questions: questions.rows,
      duration_minutes: exam.duration_minutes,
      end_time: endTime
    };
  }

  // Save answer (auto-save)
  async saveAnswer(userId, onlineExamId, answerData) {
    const { question_id, answer } = answerData;

    const studentResult = await query('SELECT id FROM students WHERE user_id = $1', [userId]);
    if (studentResult.rows.length === 0) {
      throw { status: 404, message: 'Student profile not found' };
    }
    const studentId = studentResult.rows[0].id;

    // Get attempt
    const attemptResult = await query(`
      SELECT id, status, end_time FROM exam_attempts 
      WHERE online_exam_id = $1 AND student_id = $2
    `, [onlineExamId, studentId]);

    if (attemptResult.rows.length === 0) {
      throw { status: 404, message: 'Exam attempt not found. Please start the exam first.' };
    }

    const attempt = attemptResult.rows[0];

    if (attempt.status !== 'in_progress') {
      throw { status: 403, message: 'This exam has already been submitted' };
    }

    // Check time
    if (new Date() > new Date(attempt.end_time)) {
      throw { status: 403, message: 'Time is up! Exam auto-submitted.' };
    }

    // Upsert answer
    await query(`
      INSERT INTO exam_answers (attempt_id, question_id, student_answer)
      VALUES ($1, $2, $3)
      ON CONFLICT (attempt_id, question_id) 
      DO UPDATE SET student_answer = EXCLUDED.student_answer
    `, [attempt.id, question_id, answer]);

    return { message: 'Answer saved', question_id };
  }

  // Submit exam
  async submitOnlineExam(userId, onlineExamId) {
    const studentResult = await query('SELECT id FROM students WHERE user_id = $1', [userId]);
    if (studentResult.rows.length === 0) {
      throw { status: 404, message: 'Student profile not found' };
    }
    const studentId = studentResult.rows[0].id;

    // Get attempt
    const attemptResult = await query(`
      SELECT ea.*, oe.passing_marks FROM exam_attempts ea
      JOIN online_exams oe ON ea.online_exam_id = oe.id
      WHERE ea.online_exam_id = $1 AND ea.student_id = $2
    `, [onlineExamId, studentId]);

    if (attemptResult.rows.length === 0) {
      throw { status: 404, message: 'Exam attempt not found' };
    }

    const attempt = attemptResult.rows[0];

    if (attempt.status !== 'in_progress') {
      throw { status: 403, message: 'This exam has already been submitted' };
    }

    // Auto-grade MCQ and true_false questions
    const gradingResult = await this.autoGrade(attempt.id);

    // Update attempt
    const result = await query(`
      UPDATE exam_attempts 
      SET status = 'submitted', 
          submitted_at = CURRENT_TIMESTAMP,
          obtained_marks = $1
      WHERE id = $2
      RETURNING *
    `, [gradingResult.total_obtained, attempt.id]);

    return {
      message: 'Exam submitted successfully',
      attempt: result.rows[0],
      auto_graded: gradingResult.auto_graded,
      obtained_marks: gradingResult.total_obtained,
      total_marks: attempt.total_marks,
      passed: gradingResult.total_obtained >= attempt.passing_marks
    };
  }

  // Auto-grade MCQ questions
  async autoGrade(attemptId) {
    // Get answers with correct answers
    const answersResult = await query(`
      SELECT ea.id, ea.question_id, ea.student_answer, 
             eq.correct_answer, eq.question_type, eq.marks
      FROM exam_answers ea
      JOIN exam_questions eq ON ea.question_id = eq.id
      WHERE ea.attempt_id = $1
    `, [attemptId]);

    let totalObtained = 0;
    let autoGraded = 0;

    for (const answer of answersResult.rows) {
      if (answer.question_type === 'mcq' || answer.question_type === 'true_false') {
        const isCorrect = answer.student_answer?.toLowerCase() === answer.correct_answer?.toLowerCase();
        const marksObtained = isCorrect ? answer.marks : 0;

        await query(`
          UPDATE exam_answers 
          SET is_correct = $1, marks_obtained = $2 
          WHERE id = $3
        `, [isCorrect, marksObtained, answer.id]);

        totalObtained += marksObtained;
        autoGraded++;
      }
    }

    return { total_obtained: totalObtained, auto_graded: autoGraded };
  }

  // ==================== MARKS ENTRY & EVALUATION ====================

  // Enter marks (manual)
  async enterMarks(userId, marksData) {
    const { student_id, exam_schedule_id, obtained_marks, total_marks } = marksData;

    const validation = validateRequired(
      { student_id, exam_schedule_id, obtained_marks },
      ['student_id', 'exam_schedule_id', 'obtained_marks']
    );
    if (!validation.isValid) {
      throw { status: 400, message: validation.errors.join(', ') };
    }

    // Verify exam schedule exists
    const scheduleResult = await query(`
      SELECT es.*, c.name as course_name FROM exam_schedule es
      JOIN courses c ON es.course_id = c.id
      WHERE es.id = $1
    `, [exam_schedule_id]);

    if (scheduleResult.rows.length === 0) {
      throw { status: 404, message: 'Exam schedule not found' };
    }

    // Upsert marks
    const result = await query(`
      INSERT INTO marks (student_id, exam_schedule_id, obtained_marks, total_marks, entered_by)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (student_id, exam_schedule_id)
      DO UPDATE SET obtained_marks = EXCLUDED.obtained_marks, 
                    total_marks = EXCLUDED.total_marks,
                    entered_by = EXCLUDED.entered_by,
                    entry_date = CURRENT_TIMESTAMP
      RETURNING *
    `, [student_id, exam_schedule_id, obtained_marks, total_marks || scheduleResult.rows[0].total_marks, userId]);

    return {
      message: 'Marks entered successfully',
      marks: result.rows[0]
    };
  }

  // Bulk enter marks
  async bulkEnterMarks(userId, bulkData) {
    const { exam_schedule_id, marks_list } = bulkData;

    if (!Array.isArray(marks_list) || marks_list.length === 0) {
      throw { status: 400, message: 'marks_list array is required' };
    }

    const scheduleResult = await query('SELECT total_marks FROM exam_schedule WHERE id = $1', [exam_schedule_id]);
    if (scheduleResult.rows.length === 0) {
      throw { status: 404, message: 'Exam schedule not found' };
    }

    const defaultTotal = scheduleResult.rows[0].total_marks;
    const results = { success: [], failed: [] };

    for (const item of marks_list) {
      try {
        const result = await this.enterMarks(userId, {
          student_id: item.student_id,
          exam_schedule_id,
          obtained_marks: item.obtained_marks,
          total_marks: item.total_marks || defaultTotal
        });
        results.success.push(result.marks);
      } catch (err) {
        results.failed.push({ student_id: item.student_id, error: err.message });
      }
    }

    return {
      message: `Entered marks for ${results.success.length} students, ${results.failed.length} failed`,
      success: results.success,
      failed: results.failed
    };
  }

  // Get marks for exam
  async getExamMarks(examScheduleId) {
    const result = await query(`
      SELECT m.*, s.name as student_name, s.roll_no,
             es.total_marks as max_marks, c.name as course_name
      FROM marks m
      JOIN students s ON m.student_id = s.id
      JOIN exam_schedule es ON m.exam_schedule_id = es.id
      JOIN courses c ON es.course_id = c.id
      WHERE m.exam_schedule_id = $1
      ORDER BY s.roll_no
    `, [examScheduleId]);

    // Calculate statistics
    const marks = result.rows.map(r => parseFloat(r.obtained_marks));
    const stats = marks.length > 0 ? {
      highest: Math.max(...marks),
      lowest: Math.min(...marks),
      average: (marks.reduce((a, b) => a + b, 0) / marks.length).toFixed(2),
      passed: marks.filter(m => m >= 40).length,
      failed: marks.filter(m => m < 40).length
    } : null;

    return {
      exam_schedule_id: examScheduleId,
      marks: result.rows,
      total_students: result.rows.length,
      statistics: stats
    };
  }

  // Grade answer (manual grading for short/long answers)
  async gradeAnswer(answerId, gradeData) {
    const { marks_obtained, feedback } = gradeData;

    const result = await query(`
      UPDATE exam_answers 
      SET marks_obtained = $1, is_correct = $1 > 0
      WHERE id = $2
      RETURNING *
    `, [marks_obtained, answerId]);

    if (result.rows.length === 0) {
      throw { status: 404, message: 'Answer not found' };
    }

    // Update attempt total
    const answer = result.rows[0];
    await query(`
      UPDATE exam_attempts 
      SET obtained_marks = (
        SELECT SUM(marks_obtained) FROM exam_answers WHERE attempt_id = $1
      )
      WHERE id = $1
    `, [answer.attempt_id]);

    return {
      message: 'Answer graded successfully',
      answer: result.rows[0]
    };
  }

  // Finalize grading
  async finalizeGrading(attemptId) {
    const attemptResult = await query(`
      SELECT ea.*, oe.passing_marks FROM exam_attempts ea
      JOIN online_exams oe ON ea.online_exam_id = oe.id
      WHERE ea.id = $1
    `, [attemptId]);

    if (attemptResult.rows.length === 0) {
      throw { status: 404, message: 'Attempt not found' };
    }

    const attempt = attemptResult.rows[0];

    // Calculate final marks
    const marksResult = await query(
      'SELECT SUM(marks_obtained) as total FROM exam_answers WHERE attempt_id = $1',
      [attemptId]
    );

    const obtainedMarks = marksResult.rows[0].total || 0;

    const result = await query(`
      UPDATE exam_attempts 
      SET status = 'graded', obtained_marks = $1
      WHERE id = $2
      RETURNING *
    `, [obtainedMarks, attemptId]);

    return {
      message: 'Grading finalized',
      attempt: result.rows[0],
      passed: obtainedMarks >= attempt.passing_marks
    };
  }

  // ==================== HELPER FUNCTIONS ====================

  calculateTimeRemaining(startTime, durationMinutes) {
    const start = new Date(startTime);
    const endTime = new Date(start.getTime() + durationMinutes * 60 * 1000);
    const now = new Date();
    const remainingMs = endTime - now;

    if (remainingMs <= 0) return 0;
    return Math.floor(remainingMs / 1000); // Return seconds
  }
}

module.exports = new ExamService();
