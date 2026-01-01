const { query, getClient } = require('../../config/database');
const { validateRequired } = require('../../utils/validator');

class LeaveService {

  // ==================== STUDENT LEAVE APPLICATION ====================

  async applyStudentLeave(studentId, leaveData) {
    const {
      leave_type,
      from_date,
      to_date,
      reason,
      document_path
    } = leaveData;

    const validation = validateRequired(
      { leave_type, from_date, to_date, reason },
      ['leave_type', 'from_date', 'to_date', 'reason']
    );
    if (!validation.isValid) {
      throw { status: 400, message: validation.errors.join(', ') };
    }

    // Validate dates
    const fromDate = new Date(from_date);
    const toDate = new Date(to_date);
    
    if (toDate < fromDate) {
      throw { status: 400, message: 'To date cannot be before from date' };
    }

    // Calculate leave days
    const days = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1;

    // Check leave balance (assuming 30 days per year)
    const balanceResult = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'approved') as approved_leaves,
        SUM(EXTRACT(DAY FROM (to_date - from_date)) + 1) FILTER (WHERE status = 'approved') as total_days
      FROM leave_applications
      WHERE student_id = $1 
        AND EXTRACT(YEAR FROM application_date) = EXTRACT(YEAR FROM CURRENT_DATE)
    `, [studentId]);

    const totalDays = parseInt(balanceResult.rows[0].total_days) || 0;
    const maxAllowedLeaves = 30;

    if (totalDays + days > maxAllowedLeaves) {
      throw { 
        status: 400, 
        message: `Insufficient leave balance. You have ${maxAllowedLeaves - totalDays} days remaining` 
      };
    }

    const result = await query(`
      INSERT INTO leave_applications (
        student_id, leave_type, from_date, to_date,
        reason, document_path, application_date, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, 'pending')
      RETURNING *
    `, [studentId, leave_type, from_date, to_date, reason, document_path]);

    return {
      message: 'Leave application submitted successfully',
      leave: {
        ...result.rows[0],
        days: days
      },
      balance: {
        used: totalDays,
        remaining: maxAllowedLeaves - totalDays - days,
        total: maxAllowedLeaves
      }
    };
  }

  // ==================== STUDENT LEAVE HISTORY ====================

  async getStudentLeaveHistory(studentId, filters = {}) {
    const { status, leave_type, year, page = 1, limit = 50 } = filters;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT 
        la.*,
        u.email as approver_email,
        EXTRACT(DAY FROM (la.to_date - la.from_date)) + 1 as days
      FROM leave_applications la
      LEFT JOIN users u ON la.approved_by = u.id
      WHERE la.student_id = $1
    `;
    const params = [studentId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      sql += ` AND la.status = $${paramCount}`;
      params.push(status);
    }

    if (leave_type) {
      paramCount++;
      sql += ` AND la.leave_type = $${paramCount}`;
      params.push(leave_type);
    }

    if (year) {
      paramCount++;
      sql += ` AND EXTRACT(YEAR FROM la.application_date) = $${paramCount}`;
      params.push(year);
    }

    sql += ` ORDER BY la.application_date DESC`;
    sql += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    // Get total count
    let countSql = `SELECT COUNT(*) FROM leave_applications WHERE student_id = $1`;
    const countParams = [studentId];
    
    if (status) countSql += ` AND status = $2`;
    if (leave_type) countSql += ` AND leave_type = $${status ? 3 : 2}`;

    const countResult = await query(
      countSql, 
      status && leave_type ? [studentId, status, leave_type] 
      : status ? [studentId, status]
      : leave_type ? [studentId, leave_type]
      : [studentId]
    );

    return {
      leaves: result.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        pages: Math.ceil(countResult.rows[0].count / limit)
      }
    };
  }

  // ==================== STUDENT LEAVE BALANCE ====================

  async getStudentLeaveBalance(studentId) {
    const currentYear = new Date().getFullYear();

    const result = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'approved') as approved_leaves,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_leaves,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected_leaves,
        SUM(EXTRACT(DAY FROM (to_date - from_date)) + 1) FILTER (WHERE status = 'approved') as approved_days,
        SUM(EXTRACT(DAY FROM (to_date - from_date)) + 1) FILTER (WHERE status = 'pending') as pending_days
      FROM leave_applications
      WHERE student_id = $1 
        AND EXTRACT(YEAR FROM application_date) = $2
    `, [studentId, currentYear]);

    const approvedDays = parseInt(result.rows[0].approved_days) || 0;
    const pendingDays = parseInt(result.rows[0].pending_days) || 0;
    const maxAllowedLeaves = 30;

    // Get leave breakdown by type
    const typeBreakdown = await query(`
      SELECT 
        leave_type,
        COUNT(*) as count,
        SUM(EXTRACT(DAY FROM (to_date - from_date)) + 1) as total_days
      FROM leave_applications
      WHERE student_id = $1 
        AND status = 'approved'
        AND EXTRACT(YEAR FROM application_date) = $2
      GROUP BY leave_type
    `, [studentId, currentYear]);

    return {
      balance: {
        total_allowed: maxAllowedLeaves,
        used: approvedDays,
        pending: pendingDays,
        available: maxAllowedLeaves - approvedDays - pendingDays,
        year: currentYear
      },
      statistics: {
        approved: parseInt(result.rows[0].approved_leaves),
        pending: parseInt(result.rows[0].pending_leaves),
        rejected: parseInt(result.rows[0].rejected_leaves)
      },
      breakdown_by_type: typeBreakdown.rows
    };
  }

  // ==================== TEACHER: VIEW PENDING LEAVES ====================

  async getPendingLeaves(teacherId, filters = {}) {
    const { department_id, leave_type, page = 1, limit = 50 } = filters;
    const offset = (page - 1) * limit;

    // Get teacher's department
    const teacherInfo = await query(
      'SELECT department_id FROM teachers WHERE id = $1',
      [teacherId]
    );

    if (teacherInfo.rows.length === 0) {
      throw { status: 404, message: 'Teacher not found' };
    }

    const deptId = department_id || teacherInfo.rows[0].department_id;

    let sql = `
      SELECT 
        la.*,
        s.name as student_name,
        s.roll_no as student_roll_no,
        s.department_id,
        d.name as department_name,
        EXTRACT(DAY FROM (la.to_date - la.from_date)) + 1 as days
      FROM leave_applications la
      JOIN students s ON la.student_id = s.id
      JOIN departments d ON s.department_id = d.id
      WHERE la.status = 'pending'
    `;
    const params = [];
    let paramCount = 0;

    if (deptId) {
      paramCount++;
      sql += ` AND s.department_id = $${paramCount}`;
      params.push(deptId);
    }

    if (leave_type) {
      paramCount++;
      sql += ` AND la.leave_type = $${paramCount}`;
      params.push(leave_type);
    }

    sql += ` ORDER BY la.application_date ASC`;
    sql += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    return {
      pending_leaves: result.rows,
      count: result.rows.length
    };
  }

  // ==================== TEACHER: APPROVE LEAVE ====================

  async approveLeave(teacherId, leaveId, approvalData = {}) {
    const { remarks } = approvalData;

    // Get teacher's user_id
    const teacherInfo = await query(
      'SELECT user_id FROM teachers WHERE id = $1',
      [teacherId]
    );

    if (teacherInfo.rows.length === 0) {
      throw { status: 404, message: 'Teacher not found' };
    }

    const userId = teacherInfo.rows[0].user_id;

    // Check if leave exists and is pending
    const leaveCheck = await query(
      'SELECT * FROM leave_applications WHERE id = $1 AND status = $2',
      [leaveId, 'pending']
    );

    if (leaveCheck.rows.length === 0) {
      throw { status: 404, message: 'Leave application not found or already processed' };
    }

    const result = await query(`
      UPDATE leave_applications
      SET status = 'approved',
          approved_by = $1,
          approved_at = CURRENT_TIMESTAMP,
          remarks = $2
      WHERE id = $3
      RETURNING *
    `, [userId, remarks, leaveId]);

    return {
      message: 'Leave approved successfully',
      leave: result.rows[0]
    };
  }

  // ==================== TEACHER: REJECT LEAVE ====================

  async rejectLeave(teacherId, leaveId, rejectionData) {
    const { remarks } = rejectionData;

    if (!remarks) {
      throw { status: 400, message: 'Remarks are required for rejection' };
    }

    // Get teacher's user_id
    const teacherInfo = await query(
      'SELECT user_id FROM teachers WHERE id = $1',
      [teacherId]
    );

    if (teacherInfo.rows.length === 0) {
      throw { status: 404, message: 'Teacher not found' };
    }

    const userId = teacherInfo.rows[0].user_id;

    // Check if leave exists and is pending
    const leaveCheck = await query(
      'SELECT * FROM leave_applications WHERE id = $1 AND status = $2',
      [leaveId, 'pending']
    );

    if (leaveCheck.rows.length === 0) {
      throw { status: 404, message: 'Leave application not found or already processed' };
    }

    const result = await query(`
      UPDATE leave_applications
      SET status = 'rejected',
          approved_by = $1,
          approved_at = CURRENT_TIMESTAMP,
          remarks = $2
      WHERE id = $3
      RETURNING *
    `, [userId, remarks, leaveId]);

    return {
      message: 'Leave rejected',
      leave: result.rows[0]
    };
  }

  // ==================== TEACHER LEAVE APPLICATION ====================

  async applyTeacherLeave(teacherId, leaveData) {
    const {
      leave_type,
      from_date,
      to_date,
      reason
    } = leaveData;

    const validation = validateRequired(
      { leave_type, from_date, to_date, reason },
      ['leave_type', 'from_date', 'to_date', 'reason']
    );
    if (!validation.isValid) {
      throw { status: 400, message: validation.errors.join(', ') };
    }

    // Validate dates
    const fromDate = new Date(from_date);
    const toDate = new Date(to_date);
    
    if (toDate < fromDate) {
      throw { status: 400, message: 'To date cannot be before from date' };
    }

    // Calculate leave days
    const days = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1;

    // Check leave balance based on type
    const currentYear = new Date().getFullYear();
    const balanceResult = await query(`
      SELECT 
        SUM(EXTRACT(DAY FROM (to_date - from_date)) + 1) FILTER (WHERE status = 'approved' AND leave_type = 'casual') as casual_used,
        SUM(EXTRACT(DAY FROM (to_date - from_date)) + 1) FILTER (WHERE status = 'approved' AND leave_type = 'sick') as sick_used,
        SUM(EXTRACT(DAY FROM (to_date - from_date)) + 1) FILTER (WHERE status = 'approved' AND leave_type = 'earned') as earned_used
      FROM teacher_leaves
      WHERE teacher_id = $1 
        AND EXTRACT(YEAR FROM from_date) = $2
    `, [teacherId, currentYear]);

    const casualUsed = parseInt(balanceResult.rows[0].casual_used) || 0;
    const sickUsed = parseInt(balanceResult.rows[0].sick_used) || 0;
    const earnedUsed = parseInt(balanceResult.rows[0].earned_used) || 0;

    // Leave limits
    const leaveLimits = {
      casual: 10,
      sick: 15,
      earned: 20,
      maternity: 90
    };

    if (leave_type !== 'other' && leave_type !== 'maternity') {
      const used = leave_type === 'casual' ? casualUsed 
                  : leave_type === 'sick' ? sickUsed 
                  : earnedUsed;
      const limit = leaveLimits[leave_type] || 0;

      if (used + days > limit) {
        throw { 
          status: 400, 
          message: `Insufficient ${leave_type} leave balance. You have ${limit - used} days remaining` 
        };
      }
    }

    const result = await query(`
      INSERT INTO teacher_leaves (
        teacher_id, leave_type, from_date, to_date, reason, status
      )
      VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING *
    `, [teacherId, leave_type, from_date, to_date, reason]);

    return {
      message: 'Leave application submitted successfully',
      leave: {
        ...result.rows[0],
        days: days
      }
    };
  }

  // ==================== TEACHER: GET MY LEAVES ====================

  async getTeacherLeaves(teacherId, filters = {}) {
    const { status, year, page = 1, limit = 50 } = filters;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT 
        tl.*,
        u.email as approver_email,
        EXTRACT(DAY FROM (tl.to_date - tl.from_date)) + 1 as days
      FROM teacher_leaves tl
      LEFT JOIN users u ON tl.approved_by = u.id
      WHERE tl.teacher_id = $1
    `;
    const params = [teacherId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      sql += ` AND tl.status = $${paramCount}`;
      params.push(status);
    }

    if (year) {
      paramCount++;
      sql += ` AND EXTRACT(YEAR FROM tl.from_date) = $${paramCount}`;
      params.push(year);
    }

    sql += ` ORDER BY tl.from_date DESC`;
    sql += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    return {
      leaves: result.rows,
      pagination: {
        page,
        limit,
        total: result.rows.length,
        pages: Math.ceil(result.rows.length / limit)
      }
    };
  }

  // ==================== TEACHER LEAVE BALANCE ====================

  async getTeacherLeaveBalance(teacherId) {
    const currentYear = new Date().getFullYear();

    const result = await query(`
      SELECT 
        SUM(EXTRACT(DAY FROM (to_date - from_date)) + 1) FILTER (WHERE status = 'approved' AND leave_type = 'casual') as casual_used,
        SUM(EXTRACT(DAY FROM (to_date - from_date)) + 1) FILTER (WHERE status = 'approved' AND leave_type = 'sick') as sick_used,
        SUM(EXTRACT(DAY FROM (to_date - from_date)) + 1) FILTER (WHERE status = 'approved' AND leave_type = 'earned') as earned_used,
        SUM(EXTRACT(DAY FROM (to_date - from_date)) + 1) FILTER (WHERE status = 'approved' AND leave_type = 'maternity') as maternity_used,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count
      FROM teacher_leaves
      WHERE teacher_id = $1 
        AND EXTRACT(YEAR FROM from_date) = $2
    `, [teacherId, currentYear]);

    const casualUsed = parseInt(result.rows[0].casual_used) || 0;
    const sickUsed = parseInt(result.rows[0].sick_used) || 0;
    const earnedUsed = parseInt(result.rows[0].earned_used) || 0;
    const maternityUsed = parseInt(result.rows[0].maternity_used) || 0;

    return {
      balance: {
        casual: {
          total: 10,
          used: casualUsed,
          remaining: 10 - casualUsed
        },
        sick: {
          total: 15,
          used: sickUsed,
          remaining: 15 - sickUsed
        },
        earned: {
          total: 20,
          used: earnedUsed,
          remaining: 20 - earnedUsed
        },
        maternity: {
          total: 90,
          used: maternityUsed,
          remaining: 90 - maternityUsed
        }
      },
      pending_applications: parseInt(result.rows[0].pending_count),
      year: currentYear
    };
  }

  // ==================== ADMIN: VIEW ALL TEACHER LEAVES ====================

  async getAllTeacherLeaves(filters = {}) {
    const { status, teacher_id, department_id, leave_type, page = 1, limit = 50 } = filters;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT 
        tl.*,
        t.name as teacher_name,
        u.email as teacher_email,
        d.name as department_name,
        u2.email as approver_email,
        EXTRACT(DAY FROM (tl.to_date - tl.from_date)) + 1 as days
      FROM teacher_leaves tl
      JOIN teachers t ON tl.teacher_id = t.id
      JOIN users u ON t.user_id = u.id
      LEFT JOIN departments d ON t.department_id = d.id
      LEFT JOIN users u2 ON tl.approved_by = u2.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      sql += ` AND tl.status = $${paramCount}`;
      params.push(status);
    }

    if (teacher_id) {
      paramCount++;
      sql += ` AND tl.teacher_id = $${paramCount}`;
      params.push(teacher_id);
    }

    if (department_id) {
      paramCount++;
      sql += ` AND t.department_id = $${paramCount}`;
      params.push(department_id);
    }

    if (leave_type) {
      paramCount++;
      sql += ` AND tl.leave_type = $${paramCount}`;
      params.push(leave_type);
    }

    sql += ` ORDER BY tl.from_date DESC`;
    sql += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    // Get statistics
    const stats = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected
      FROM teacher_leaves
    `);

    return {
      leaves: result.rows,
      statistics: stats.rows[0],
      pagination: {
        page,
        limit,
        total: result.rows.length,
        pages: Math.ceil(result.rows.length / limit)
      }
    };
  }

  // ==================== ADMIN: APPROVE/REJECT TEACHER LEAVE ====================

  async approveTeacherLeave(userId, leaveId, approvalData = {}) {
    const { remarks } = approvalData;

    const leaveCheck = await query(
      'SELECT * FROM teacher_leaves WHERE id = $1 AND status = $2',
      [leaveId, 'pending']
    );

    if (leaveCheck.rows.length === 0) {
      throw { status: 404, message: 'Leave application not found or already processed' };
    }

    const result = await query(`
      UPDATE teacher_leaves
      SET status = 'approved',
          approved_by = $1,
          approved_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [userId, leaveId]);

    return {
      message: 'Teacher leave approved successfully',
      leave: result.rows[0]
    };
  }

  async rejectTeacherLeave(userId, leaveId) {
    const leaveCheck = await query(
      'SELECT * FROM teacher_leaves WHERE id = $1 AND status = $2',
      [leaveId, 'pending']
    );

    if (leaveCheck.rows.length === 0) {
      throw { status: 404, message: 'Leave application not found or already processed' };
    }

    const result = await query(`
      UPDATE teacher_leaves
      SET status = 'rejected',
          approved_by = $1,
          approved_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [userId, leaveId]);

    return {
      message: 'Teacher leave rejected',
      leave: result.rows[0]
    };
  }

  // ==================== LEAVE CALENDAR ====================

  async getLeaveCalendar(filters = {}) {
    const { month, year, type = 'all' } = filters;
    const currentDate = new Date();
    const targetMonth = month || (currentDate.getMonth() + 1);
    const targetYear = year || currentDate.getFullYear();

    let leaves = [];

    if (type === 'all' || type === 'student') {
      const studentLeaves = await query(`
        SELECT 
          la.id,
          la.from_date,
          la.to_date,
          la.leave_type,
          s.name as person_name,
          s.roll_no as identifier,
          'student' as leave_for,
          d.name as department_name
        FROM leave_applications la
        JOIN students s ON la.student_id = s.id
        LEFT JOIN departments d ON s.department_id = d.id
        WHERE la.status = 'approved'
          AND EXTRACT(YEAR FROM la.from_date) = $1
          AND EXTRACT(MONTH FROM la.from_date) = $2
      `, [targetYear, targetMonth]);

      leaves = [...leaves, ...studentLeaves.rows];
    }

    if (type === 'all' || type === 'teacher') {
      const teacherLeaves = await query(`
        SELECT 
          tl.id,
          tl.from_date,
          tl.to_date,
          tl.leave_type,
          t.name as person_name,
          u.email as identifier,
          'teacher' as leave_for,
          d.name as department_name
        FROM teacher_leaves tl
        JOIN teachers t ON tl.teacher_id = t.id
        JOIN users u ON t.user_id = u.id
        LEFT JOIN departments d ON t.department_id = d.id
        WHERE tl.status = 'approved'
          AND EXTRACT(YEAR FROM tl.from_date) = $1
          AND EXTRACT(MONTH FROM tl.from_date) = $2
      `, [targetYear, targetMonth]);

      leaves = [...leaves, ...teacherLeaves.rows];
    }

    return {
      calendar: {
        month: targetMonth,
        year: targetYear,
        leaves: leaves
      },
      statistics: {
        total_leaves: leaves.length,
        student_leaves: leaves.filter(l => l.leave_for === 'student').length,
        teacher_leaves: leaves.filter(l => l.leave_for === 'teacher').length
      }
    };
  }
}

module.exports = new LeaveService();
