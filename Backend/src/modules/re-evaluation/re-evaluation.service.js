const { query, getClient } = require('../../config/database');
const { validateRequired } = require('../../utils/validator');

class ReEvaluationService {

  // ==================== STUDENT RE-EVALUATION REQUEST ====================

  // Submit re-evaluation request
  async submitRequest(studentId, requestData) {
    const { exam_schedule_id, reason } = requestData;

    const validation = validateRequired({ exam_schedule_id, reason }, ['exam_schedule_id', 'reason']);
    if (!validation.isValid) {
      throw { status: 400, message: validation.errors.join(', ') };
    }

    // Verify student exists
    const studentResult = await query('SELECT id, name, roll_no FROM students WHERE id = $1', [studentId]);
    if (studentResult.rows.length === 0) {
      throw { status: 404, message: 'Student not found' };
    }

    // Verify exam schedule exists and get details
    const examResult = await query(`
      SELECT es.*, c.name as course_name, c.code as course_code, 
             e.name as exam_name, e.type as exam_type,
             m.obtained_marks, m.total_marks
      FROM exam_schedule es
      JOIN courses c ON es.course_id = c.id
      JOIN exams e ON es.exam_id = e.id
      LEFT JOIN marks m ON es.id = m.exam_schedule_id AND m.student_id = $1
      WHERE es.id = $2
    `, [studentId, exam_schedule_id]);

    if (examResult.rows.length === 0) {
      throw { status: 404, message: 'Exam schedule not found' };
    }

    const exam = examResult.rows[0];

    // Check if student has marks for this exam
    if (!exam.obtained_marks) {
      throw { status: 400, message: 'No marks found for this exam. Cannot request re-evaluation.' };
    }

    // Check if already requested
    const existingResult = await query(`
      SELECT id, status FROM re_evaluation_requests 
      WHERE student_id = $1 AND exam_schedule_id = $2 AND status NOT IN ('rejected', 'completed')
    `, [studentId, exam_schedule_id]);

    if (existingResult.rows.length > 0) {
      throw { status: 400, message: `Re-evaluation request already exists with status: ${existingResult.rows[0].status}` };
    }

    // Check deadline (e.g., 7 days after exam date)
    const examDate = new Date(exam.date);
    const currentDate = new Date();
    const daysSinceExam = Math.floor((currentDate - examDate) / (1000 * 60 * 60 * 24));
    
    if (daysSinceExam > 30) {
      throw { status: 400, message: 'Re-evaluation request deadline has passed (30 days from exam date)' };
    }

    // Create request (fee payment would be handled separately in a real system)
    const result = await query(`
      INSERT INTO re_evaluation_requests (
        student_id, exam_schedule_id, reason, current_marks, fee_amount, fee_paid
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [studentId, exam_schedule_id, reason, exam.obtained_marks, 500.00, false]);

    return {
      message: 'Re-evaluation request submitted successfully',
      request: result.rows[0],
      exam_details: {
        course_name: exam.course_name,
        course_code: exam.course_code,
        exam_name: exam.exam_name,
        current_marks: exam.obtained_marks,
        total_marks: exam.total_marks
      },
      note: 'Please pay the re-evaluation fee to process your request.'
    };
  }

  // Pay re-evaluation fee
  async payFee(studentId, requestId, paymentData = {}) {
    const { payment_method = 'cash', transaction_id = null } = paymentData;

    // Get request
    const requestResult = await query(`
      SELECT r.*, s.name as student_name, s.roll_no
      FROM re_evaluation_requests r
      JOIN students s ON r.student_id = s.id
      WHERE r.id = $1 AND r.student_id = $2
    `, [requestId, studentId]);

    if (requestResult.rows.length === 0) {
      throw { status: 404, message: 'Re-evaluation request not found' };
    }

    const request = requestResult.rows[0];

    if (request.fee_paid) {
      throw { status: 400, message: 'Fee already paid for this request' };
    }

    // Update payment status
    const result = await query(`
      UPDATE re_evaluation_requests 
      SET fee_paid = true, 
          payment_method = $1, 
          transaction_id = $2, 
          paid_at = CURRENT_TIMESTAMP,
          status = 'paid'
      WHERE id = $3
      RETURNING *
    `, [payment_method, transaction_id, requestId]);

    return {
      message: 'Fee payment recorded successfully',
      request: result.rows[0]
    };
  }

  // Get student's re-evaluation requests
  async getStudentRequests(studentId, filters = {}) {
    const { status } = filters;

    let sql = `
      SELECT r.*, 
             es.date as exam_date, es.total_marks,
             c.name as course_name, c.code as course_code,
             e.name as exam_name, e.type as exam_type,
             u1.email as resolved_by_email,
             u2.email as assigned_to_email
      FROM re_evaluation_requests r
      JOIN exam_schedule es ON r.exam_schedule_id = es.id
      JOIN courses c ON es.course_id = c.id
      JOIN exams e ON es.exam_id = e.id
      LEFT JOIN users u1 ON r.resolved_by = u1.id
      LEFT JOIN users u2 ON r.assigned_to = u2.id
      WHERE r.student_id = $1
    `;
    const params = [studentId];

    if (status) {
      sql += ' AND r.status = $2';
      params.push(status);
    }

    sql += ' ORDER BY r.request_date DESC';

    const result = await query(sql, params);

    return result.rows.map(row => ({
      id: row.id,
      exam: {
        exam_name: row.exam_name,
        exam_type: row.exam_type,
        course_name: row.course_name,
        course_code: row.course_code,
        exam_date: row.exam_date
      },
      current_marks: row.current_marks,
      new_marks: row.new_marks,
      reason: row.reason,
      status: row.status,
      fee_amount: row.fee_amount,
      fee_paid: row.fee_paid,
      request_date: row.request_date,
      resolved_at: row.resolved_at,
      assigned_to: row.assigned_to_email,
      remarks: row.remarks
    }));
  }

  // Get request status
  async getRequestStatus(studentId, requestId) {
    const result = await query(`
      SELECT r.*, 
             es.date as exam_date, es.total_marks,
             c.name as course_name, c.code as course_code,
             e.name as exam_name, e.type as exam_type,
             s.name as student_name, s.roll_no,
             u1.email as resolved_by_email,
             u2.email as assigned_to_email,
             t.name as teacher_name
      FROM re_evaluation_requests r
      JOIN exam_schedule es ON r.exam_schedule_id = es.id
      JOIN courses c ON es.course_id = c.id
      JOIN exams e ON es.exam_id = e.id
      JOIN students s ON r.student_id = s.id
      LEFT JOIN users u1 ON r.resolved_by = u1.id
      LEFT JOIN users u2 ON r.assigned_to = u2.id
      LEFT JOIN teachers t ON u2.id = t.user_id
      WHERE r.id = $1 AND r.student_id = $2
    `, [requestId, studentId]);

    if (result.rows.length === 0) {
      throw { status: 404, message: 'Re-evaluation request not found' };
    }

    const row = result.rows[0];

    return {
      request: {
        id: row.id,
        status: row.status,
        request_date: row.request_date,
        resolved_at: row.resolved_at
      },
      exam: {
        exam_name: row.exam_name,
        exam_type: row.exam_type,
        course_name: row.course_name,
        course_code: row.course_code,
        exam_date: row.exam_date
      },
      marks: {
        current: row.current_marks,
        new: row.new_marks,
        total: row.total_marks,
        change: row.new_marks ? (row.new_marks - row.current_marks).toFixed(2) : null
      },
      fee: {
        amount: row.fee_amount,
        paid: row.fee_paid,
        payment_method: row.payment_method,
        paid_at: row.paid_at
      },
      reason: row.reason,
      remarks: row.remarks,
      assigned_to: row.teacher_name || row.assigned_to_email,
      timeline: this.getRequestTimeline(row)
    };
  }

  // Get request timeline
  getRequestTimeline(request) {
    const timeline = [
      {
        step: 'Submitted',
        status: 'completed',
        date: request.request_date
      }
    ];

    if (request.fee_paid) {
      timeline.push({
        step: 'Fee Paid',
        status: 'completed',
        date: request.paid_at
      });
    } else if (request.status !== 'rejected') {
      timeline.push({
        step: 'Fee Payment Pending',
        status: 'pending',
        date: null
      });
    }

    if (request.status === 'approved' || request.status === 'in_review' || request.status === 'completed') {
      timeline.push({
        step: 'Approved',
        status: 'completed',
        date: request.approved_at || null
      });
    }

    if (request.status === 'in_review' || request.status === 'completed') {
      timeline.push({
        step: 'Under Review',
        status: request.status === 'completed' ? 'completed' : 'in_progress',
        date: request.assigned_at || null
      });
    }

    if (request.status === 'completed') {
      timeline.push({
        step: 'Completed',
        status: 'completed',
        date: request.resolved_at
      });
    }

    if (request.status === 'rejected') {
      timeline.push({
        step: 'Rejected',
        status: 'completed',
        date: request.resolved_at
      });
    }

    return timeline;
  }

  // ==================== ADMIN RE-EVALUATION MANAGEMENT ====================

  // Get all re-evaluation requests (Admin)
  async getRequests(filters = {}) {
    const { status, course_id, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT r.*, 
             s.name as student_name, s.roll_no,
             d.name as department_name,
             es.date as exam_date,
             c.name as course_name, c.code as course_code,
             e.name as exam_name, e.type as exam_type,
             u1.email as resolved_by_email,
             u2.email as assigned_to_email,
             t.name as teacher_name
      FROM re_evaluation_requests r
      JOIN students s ON r.student_id = s.id
      JOIN departments d ON s.department_id = d.id
      JOIN exam_schedule es ON r.exam_schedule_id = es.id
      JOIN courses c ON es.course_id = c.id
      JOIN exams e ON es.exam_id = e.id
      LEFT JOIN users u1 ON r.resolved_by = u1.id
      LEFT JOIN users u2 ON r.assigned_to = u2.id
      LEFT JOIN teachers t ON u2.id = t.user_id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      sql += ` AND r.status = $${paramCount}`;
      params.push(status);
    }

    if (course_id) {
      paramCount++;
      sql += ` AND es.course_id = $${paramCount}`;
      params.push(course_id);
    }

    sql += ` ORDER BY r.request_date DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    // Get total count
    let countSql = `
      SELECT COUNT(*) 
      FROM re_evaluation_requests r
      JOIN exam_schedule es ON r.exam_schedule_id = es.id
      WHERE 1=1
    `;
    const countParams = [];
    let countParamCount = 0;

    if (status) {
      countParamCount++;
      countSql += ` AND r.status = $${countParamCount}`;
      countParams.push(status);
    }

    if (course_id) {
      countParamCount++;
      countSql += ` AND es.course_id = $${countParamCount}`;
      countParams.push(course_id);
    }

    const countResult = await query(countSql, countParams);

    return {
      requests: result.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        pages: Math.ceil(countResult.rows[0].count / limit)
      }
    };
  }

  // Approve/Reject re-evaluation request (Admin)
  async processRequest(userId, requestId, processData) {
    const { action, remarks } = processData;

    if (!['approve', 'reject'].includes(action)) {
      throw { status: 400, message: 'Action must be either approve or reject' };
    }

    // Get request
    const requestResult = await query(`
      SELECT r.*, s.name as student_name, s.roll_no
      FROM re_evaluation_requests r
      JOIN students s ON r.student_id = s.id
      WHERE r.id = $1
    `, [requestId]);

    if (requestResult.rows.length === 0) {
      throw { status: 404, message: 'Re-evaluation request not found' };
    }

    const request = requestResult.rows[0];

    if (request.status !== 'paid' && request.status !== 'pending') {
      throw { status: 400, message: `Cannot process request with status: ${request.status}` };
    }

    // Check if fee is paid
    if (!request.fee_paid && action === 'approve') {
      throw { status: 400, message: 'Fee must be paid before approving the request' };
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    const result = await query(`
      UPDATE re_evaluation_requests 
      SET status = $1, 
          resolved_by = $2, 
          approved_at = CURRENT_TIMESTAMP,
          remarks = $3
      WHERE id = $4
      RETURNING *
    `, [newStatus, userId, remarks, requestId]);

    return {
      message: `Re-evaluation request ${action}d successfully`,
      request: result.rows[0]
    };
  }

  // Assign re-evaluation to teacher (Admin)
  async assignToTeacher(userId, requestId, assignData) {
    const { teacher_id, instructions = null } = assignData;

    if (!teacher_id) {
      throw { status: 400, message: 'teacher_id is required' };
    }

    // Verify teacher exists
    const teacherResult = await query('SELECT id, user_id, name FROM teachers WHERE id = $1', [teacher_id]);
    if (teacherResult.rows.length === 0) {
      throw { status: 404, message: 'Teacher not found' };
    }

    // Get request
    const requestResult = await query(`
      SELECT r.*, s.name as student_name
      FROM re_evaluation_requests r
      JOIN students s ON r.student_id = s.id
      WHERE r.id = $1
    `, [requestId]);

    if (requestResult.rows.length === 0) {
      throw { status: 404, message: 'Re-evaluation request not found' };
    }

    const request = requestResult.rows[0];

    if (request.status !== 'approved') {
      throw { status: 400, message: 'Request must be approved before assigning to teacher' };
    }

    // Assign to teacher
    const result = await query(`
      UPDATE re_evaluation_requests 
      SET assigned_to = $1, 
          assigned_at = CURRENT_TIMESTAMP,
          status = 'in_review',
          instructions = $2
      WHERE id = $3
      RETURNING *
    `, [teacherResult.rows[0].user_id, instructions, requestId]);

    return {
      message: 'Re-evaluation assigned to teacher successfully',
      request: result.rows[0],
      teacher: {
        id: teacherResult.rows[0].id,
        name: teacherResult.rows[0].name
      }
    };
  }

  // ==================== TEACHER RE-EVALUATION ====================

  // Get assigned re-evaluation requests (Teacher)
  async getAssignedRequests(teacherId) {
    // Get user_id from teacher_id
    const teacherResult = await query('SELECT user_id FROM teachers WHERE id = $1', [teacherId]);
    if (teacherResult.rows.length === 0) {
      throw { status: 404, message: 'Teacher not found' };
    }

    const userId = teacherResult.rows[0].user_id;

    const result = await query(`
      SELECT r.*, 
             s.name as student_name, s.roll_no,
             d.name as department_name,
             es.date as exam_date, es.total_marks,
             c.name as course_name, c.code as course_code,
             e.name as exam_name, e.type as exam_type
      FROM re_evaluation_requests r
      JOIN students s ON r.student_id = s.id
      JOIN departments d ON s.department_id = d.id
      JOIN exam_schedule es ON r.exam_schedule_id = es.id
      JOIN courses c ON es.course_id = c.id
      JOIN exams e ON es.exam_id = e.id
      WHERE r.assigned_to = $1 AND r.status IN ('in_review', 'approved')
      ORDER BY r.assigned_at DESC
    `, [userId]);

    return result.rows;
  }

  // Update re-evaluation result (Teacher)
  async updateResult(teacherId, requestId, updateData) {
    const { new_marks, remarks } = updateData;

    if (new_marks === undefined || new_marks === null) {
      throw { status: 400, message: 'new_marks is required' };
    }

    // Validate marks range
    if (new_marks < 0 || new_marks > 100) {
      throw { status: 400, message: 'Marks must be between 0 and 100' };
    }

    // Get teacher's user_id
    const teacherResult = await query('SELECT user_id FROM teachers WHERE id = $1', [teacherId]);
    if (teacherResult.rows.length === 0) {
      throw { status: 404, message: 'Teacher not found' };
    }

    const userId = teacherResult.rows[0].user_id;

    // Get request
    const requestResult = await query(`
      SELECT r.*, s.name as student_name, s.roll_no,
             es.course_id, es.id as exam_schedule_id, es.total_marks
      FROM re_evaluation_requests r
      JOIN students s ON r.student_id = s.id
      JOIN exam_schedule es ON r.exam_schedule_id = es.id
      WHERE r.id = $1 AND r.assigned_to = $2
    `, [requestId, userId]);

    if (requestResult.rows.length === 0) {
      throw { status: 404, message: 'Re-evaluation request not found or not assigned to you' };
    }

    const request = requestResult.rows[0];

    if (request.status !== 'in_review') {
      throw { status: 400, message: `Cannot update request with status: ${request.status}` };
    }

    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Update re-evaluation request
      await client.query(`
        UPDATE re_evaluation_requests 
        SET new_marks = $1, 
            remarks = $2, 
            status = 'completed',
            resolved_by = $3,
            resolved_at = CURRENT_TIMESTAMP
        WHERE id = $4
      `, [new_marks, remarks, userId, requestId]);

      // Update marks in marks table
      await client.query(`
        UPDATE marks 
        SET obtained_marks = $1, 
            entered_by = $2,
            entry_date = CURRENT_TIMESTAMP
        WHERE student_id = $3 AND exam_schedule_id = $4
      `, [new_marks, userId, request.student_id, request.exam_schedule_id]);

      // Recalculate grades if needed
      // This would trigger grade recalculation in the result service
      // For now, we'll just update the marks

      await client.query('COMMIT');

      return {
        message: 'Re-evaluation completed and marks updated successfully',
        previous_marks: request.current_marks,
        new_marks,
        change: (new_marks - request.current_marks).toFixed(2)
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ==================== STATISTICS ====================

  // Get re-evaluation statistics
  async getStatistics(filters = {}) {
    const { department_id, semester_id } = filters;

    let sql = `
      SELECT 
        COUNT(*) as total_requests,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'in_review' THEN 1 ELSE 0 END) as in_review,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN fee_paid = true THEN 1 ELSE 0 END) as fees_collected,
        SUM(CASE WHEN new_marks > current_marks THEN 1 ELSE 0 END) as marks_increased,
        SUM(CASE WHEN new_marks < current_marks THEN 1 ELSE 0 END) as marks_decreased,
        AVG(CASE WHEN new_marks IS NOT NULL THEN new_marks - current_marks ELSE NULL END) as avg_change
      FROM re_evaluation_requests r
      JOIN students s ON r.student_id = s.id
    `;

    const params = [];
    let paramCount = 0;

    if (department_id) {
      paramCount++;
      sql += ` WHERE s.department_id = $${paramCount}`;
      params.push(department_id);
    }

    const result = await query(sql, params);

    return {
      statistics: {
        total_requests: parseInt(result.rows[0].total_requests),
        pending: parseInt(result.rows[0].pending),
        paid: parseInt(result.rows[0].paid),
        approved: parseInt(result.rows[0].approved),
        in_review: parseInt(result.rows[0].in_review),
        completed: parseInt(result.rows[0].completed),
        rejected: parseInt(result.rows[0].rejected),
        fees_collected: parseInt(result.rows[0].fees_collected),
        marks_increased: parseInt(result.rows[0].marks_increased),
        marks_decreased: parseInt(result.rows[0].marks_decreased),
        average_change: parseFloat(result.rows[0].avg_change || 0).toFixed(2)
      }
    };
  }
}

module.exports = new ReEvaluationService();
