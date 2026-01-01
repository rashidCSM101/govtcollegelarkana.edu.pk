const { query, getClient } = require('../../config/database');
const { validateRequired } = require('../../utils/validator');

class AttendanceService {

  // ==================== TEACHER - MARK ATTENDANCE ====================

  // Mark attendance for a single student
  async markAttendance(teacherId, attendanceData) {
    const { section_id, student_id, date, status } = attendanceData;

    // Validate required fields
    const validation = validateRequired(
      { section_id, student_id, date, status },
      ['section_id', 'student_id', 'date', 'status']
    );
    if (!validation.isValid) {
      throw { status: 400, message: validation.errors.join(', ') };
    }

    // Validate status
    const validStatuses = ['present', 'absent', 'late', 'leave'];
    if (!validStatuses.includes(status)) {
      throw { status: 400, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` };
    }

    // Get teacher ID from user
    const teacherResult = await query('SELECT id FROM teachers WHERE user_id = $1', [teacherId]);
    if (teacherResult.rows.length === 0) {
      throw { status: 404, message: 'Teacher profile not found' };
    }
    const teacher = teacherResult.rows[0];

    // Verify teacher is assigned to this section
    const sectionResult = await query(`
      SELECT cs.id, cs.course_id, cs.semester_id, c.name as course_name
      FROM course_sections cs
      JOIN courses c ON cs.course_id = c.id
      WHERE cs.id = $1 AND cs.teacher_id = $2
    `, [section_id, teacher.id]);

    if (sectionResult.rows.length === 0) {
      throw { status: 403, message: 'You are not assigned to this section' };
    }

    const section = sectionResult.rows[0];

    // Verify student is registered in this section
    const studentCheck = await query(`
      SELECT cr.id FROM course_registrations cr
      WHERE cr.section_id = $1 AND cr.student_id = $2 AND cr.status = 'registered'
    `, [section_id, student_id]);

    if (studentCheck.rows.length === 0) {
      throw { status: 404, message: 'Student is not registered in this section' };
    }

    // Check if attendance already marked for this date
    const existingAttendance = await query(`
      SELECT id FROM attendance 
      WHERE section_id = $1 AND student_id = $2 AND date = $3
    `, [section_id, student_id, date]);

    let result;
    if (existingAttendance.rows.length > 0) {
      // Update existing attendance
      result = await query(`
        UPDATE attendance 
        SET status = $1, marked_by = $2, marked_at = CURRENT_TIMESTAMP
        WHERE section_id = $3 AND student_id = $4 AND date = $5
        RETURNING *
      `, [status, teacherId, section_id, student_id, date]);
    } else {
      // Insert new attendance
      result = await query(`
        INSERT INTO attendance (section_id, student_id, date, status, marked_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [section_id, student_id, date, status, teacherId]);
    }

    // Update attendance summary
    await this.updateAttendanceSummary(student_id, section.course_id, section.semester_id);

    return {
      message: 'Attendance marked successfully',
      attendance: result.rows[0]
    };
  }

  // Bulk mark attendance for multiple students
  async bulkMarkAttendance(teacherId, bulkData) {
    const { section_id, date, attendance_list } = bulkData;

    // Validate required fields
    const validation = validateRequired({ section_id, date, attendance_list }, ['section_id', 'date', 'attendance_list']);
    if (!validation.isValid) {
      throw { status: 400, message: validation.errors.join(', ') };
    }

    if (!Array.isArray(attendance_list) || attendance_list.length === 0) {
      throw { status: 400, message: 'attendance_list must be a non-empty array' };
    }

    // Get teacher ID
    const teacherResult = await query('SELECT id FROM teachers WHERE user_id = $1', [teacherId]);
    if (teacherResult.rows.length === 0) {
      throw { status: 404, message: 'Teacher profile not found' };
    }
    const teacher = teacherResult.rows[0];

    // Verify teacher is assigned to this section
    const sectionResult = await query(`
      SELECT cs.id, cs.course_id, cs.semester_id, c.name as course_name
      FROM course_sections cs
      JOIN courses c ON cs.course_id = c.id
      WHERE cs.id = $1 AND cs.teacher_id = $2
    `, [section_id, teacher.id]);

    if (sectionResult.rows.length === 0) {
      throw { status: 403, message: 'You are not assigned to this section' };
    }

    const section = sectionResult.rows[0];
    const client = await getClient();
    const results = { success: [], failed: [] };

    try {
      await client.query('BEGIN');

      for (const item of attendance_list) {
        const { student_id, status } = item;

        // Validate status
        const validStatuses = ['present', 'absent', 'late', 'leave'];
        if (!validStatuses.includes(status)) {
          results.failed.push({ student_id, error: 'Invalid status' });
          continue;
        }

        // Check if student is registered
        const studentCheck = await client.query(`
          SELECT cr.id FROM course_registrations cr
          WHERE cr.section_id = $1 AND cr.student_id = $2 AND cr.status = 'registered'
        `, [section_id, student_id]);

        if (studentCheck.rows.length === 0) {
          results.failed.push({ student_id, error: 'Student not registered in section' });
          continue;
        }

        // Upsert attendance
        await client.query(`
          INSERT INTO attendance (section_id, student_id, date, status, marked_by)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (section_id, date, student_id)
          DO UPDATE SET status = EXCLUDED.status, marked_by = EXCLUDED.marked_by, marked_at = CURRENT_TIMESTAMP
        `, [section_id, student_id, date, status, teacherId]);

        results.success.push({ student_id, status });
      }

      await client.query('COMMIT');

      // Update attendance summary for all students
      for (const item of results.success) {
        await this.updateAttendanceSummary(item.student_id, section.course_id, section.semester_id);
      }

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return {
      message: `Marked attendance for ${results.success.length} students, ${results.failed.length} failed`,
      date,
      section_id,
      course: section.course_name,
      success: results.success,
      failed: results.failed
    };
  }

  // Edit attendance record
  async editAttendance(teacherId, attendanceId, updateData) {
    const { status } = updateData;

    // Validate status
    const validStatuses = ['present', 'absent', 'late', 'leave'];
    if (!validStatuses.includes(status)) {
      throw { status: 400, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` };
    }

    // Get teacher ID
    const teacherResult = await query('SELECT id FROM teachers WHERE user_id = $1', [teacherId]);
    if (teacherResult.rows.length === 0) {
      throw { status: 404, message: 'Teacher profile not found' };
    }
    const teacher = teacherResult.rows[0];

    // Get attendance record and verify ownership
    const attendanceResult = await query(`
      SELECT a.*, cs.teacher_id, cs.course_id, cs.semester_id
      FROM attendance a
      JOIN course_sections cs ON a.section_id = cs.id
      WHERE a.id = $1
    `, [attendanceId]);

    if (attendanceResult.rows.length === 0) {
      throw { status: 404, message: 'Attendance record not found' };
    }

    const attendance = attendanceResult.rows[0];

    if (attendance.teacher_id !== teacher.id) {
      throw { status: 403, message: 'You are not authorized to edit this attendance' };
    }

    // Update attendance
    const result = await query(`
      UPDATE attendance 
      SET status = $1, marked_by = $2, marked_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [status, teacherId, attendanceId]);

    // Update summary
    await this.updateAttendanceSummary(attendance.student_id, attendance.course_id, attendance.semester_id);

    return {
      message: 'Attendance updated successfully',
      attendance: result.rows[0]
    };
  }

  // Get attendance for a section (Teacher view)
  async getSectionAttendance(teacherId, sectionId, filters = {}) {
    const { date, start_date, end_date } = filters;

    // Get teacher ID
    const teacherResult = await query('SELECT id FROM teachers WHERE user_id = $1', [teacherId]);
    if (teacherResult.rows.length === 0) {
      throw { status: 404, message: 'Teacher profile not found' };
    }
    const teacher = teacherResult.rows[0];

    // Verify teacher is assigned to this section
    const sectionResult = await query(`
      SELECT cs.*, c.name as course_name, c.code as course_code
      FROM course_sections cs
      JOIN courses c ON cs.course_id = c.id
      WHERE cs.id = $1 AND cs.teacher_id = $2
    `, [sectionId, teacher.id]);

    if (sectionResult.rows.length === 0) {
      throw { status: 403, message: 'You are not assigned to this section' };
    }

    const section = sectionResult.rows[0];

    // Get registered students
    const studentsResult = await query(`
      SELECT s.id, s.roll_no, s.name, s.photo
      FROM course_registrations cr
      JOIN students s ON cr.student_id = s.id
      WHERE cr.section_id = $1 AND cr.status = 'registered'
      ORDER BY s.roll_no
    `, [sectionId]);

    // Build attendance query
    let attendanceSql = `
      SELECT a.*, s.roll_no, s.name as student_name
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      WHERE a.section_id = $1
    `;
    const params = [sectionId];
    let paramCount = 1;

    if (date) {
      paramCount++;
      attendanceSql += ` AND a.date = $${paramCount}`;
      params.push(date);
    } else if (start_date && end_date) {
      paramCount++;
      attendanceSql += ` AND a.date >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
      attendanceSql += ` AND a.date <= $${paramCount}`;
      params.push(end_date);
    }

    attendanceSql += ` ORDER BY a.date DESC, s.roll_no`;

    const attendanceResult = await query(attendanceSql, params);

    // Get summary statistics
    const summaryResult = await query(`
      SELECT 
        COUNT(DISTINCT date) as total_classes,
        COUNT(CASE WHEN status = 'present' THEN 1 END) as total_present,
        COUNT(CASE WHEN status = 'absent' THEN 1 END) as total_absent,
        COUNT(CASE WHEN status = 'late' THEN 1 END) as total_late,
        COUNT(CASE WHEN status = 'leave' THEN 1 END) as total_leave
      FROM attendance
      WHERE section_id = $1
    `, [sectionId]);

    return {
      section: {
        id: section.id,
        name: section.section_name,
        course: `${section.course_code} - ${section.course_name}`
      },
      students: studentsResult.rows,
      attendance: attendanceResult.rows,
      summary: summaryResult.rows[0],
      total_students: studentsResult.rows.length
    };
  }

  // Get students list for marking attendance
  async getStudentsForAttendance(teacherId, sectionId, date) {
    // Get teacher ID
    const teacherResult = await query('SELECT id FROM teachers WHERE user_id = $1', [teacherId]);
    if (teacherResult.rows.length === 0) {
      throw { status: 404, message: 'Teacher profile not found' };
    }
    const teacher = teacherResult.rows[0];

    // Verify teacher is assigned to this section
    const sectionResult = await query(`
      SELECT cs.*, c.name as course_name, c.code as course_code
      FROM course_sections cs
      JOIN courses c ON cs.course_id = c.id
      WHERE cs.id = $1 AND cs.teacher_id = $2
    `, [sectionId, teacher.id]);

    if (sectionResult.rows.length === 0) {
      throw { status: 403, message: 'You are not assigned to this section' };
    }

    const section = sectionResult.rows[0];

    // Get students with their attendance status for the given date (if any)
    const result = await query(`
      SELECT 
        s.id as student_id, 
        s.roll_no, 
        s.name, 
        s.photo,
        a.status as current_status,
        a.id as attendance_id
      FROM course_registrations cr
      JOIN students s ON cr.student_id = s.id
      LEFT JOIN attendance a ON a.student_id = s.id AND a.section_id = cr.section_id AND a.date = $2
      WHERE cr.section_id = $1 AND cr.status = 'registered'
      ORDER BY s.roll_no
    `, [sectionId, date]);

    return {
      section: {
        id: section.id,
        name: section.section_name,
        course: `${section.course_code} - ${section.course_name}`
      },
      date,
      students: result.rows,
      total_students: result.rows.length,
      marked_count: result.rows.filter(s => s.current_status !== null).length
    };
  }

  // ==================== STUDENT - VIEW ATTENDANCE ====================

  // Get student's attendance (all courses or specific semester)
  async getStudentAttendance(userId, filters = {}) {
    const { semester_id, course_id } = filters;

    // Get student ID
    const studentResult = await query('SELECT id FROM students WHERE user_id = $1', [userId]);
    if (studentResult.rows.length === 0) {
      throw { status: 404, message: 'Student profile not found' };
    }
    const studentId = studentResult.rows[0].id;

    let sql = `
      SELECT 
        a.id, a.date, a.status, a.marked_at,
        c.id as course_id, c.name as course_name, c.code as course_code,
        cs.section_name,
        t.name as teacher_name,
        s.name as semester_name
      FROM attendance a
      JOIN course_sections cs ON a.section_id = cs.id
      JOIN courses c ON cs.course_id = c.id
      JOIN semesters s ON cs.semester_id = s.id
      LEFT JOIN teachers t ON cs.teacher_id = t.id
      WHERE a.student_id = $1
    `;
    const params = [studentId];
    let paramCount = 1;

    if (semester_id) {
      paramCount++;
      sql += ` AND cs.semester_id = $${paramCount}`;
      params.push(semester_id);
    }

    if (course_id) {
      paramCount++;
      sql += ` AND cs.course_id = $${paramCount}`;
      params.push(course_id);
    }

    sql += ` ORDER BY a.date DESC`;

    const result = await query(sql, params);

    return {
      student_id: studentId,
      filters: { semester_id, course_id },
      attendance: result.rows,
      total_records: result.rows.length
    };
  }

  // Get student attendance summary (percentage per course)
  async getStudentAttendanceSummary(userId, semesterId) {
    // Get student ID
    const studentResult = await query('SELECT id, name, roll_no FROM students WHERE user_id = $1', [userId]);
    if (studentResult.rows.length === 0) {
      throw { status: 404, message: 'Student profile not found' };
    }
    const student = studentResult.rows[0];

    // Get active semester if not provided
    let targetSemesterId = semesterId;
    if (!targetSemesterId) {
      const activeSemester = await query(`
        SELECT s.id FROM semesters s
        JOIN sessions ses ON s.session_id = ses.id
        WHERE ses.is_active = TRUE AND s.is_active = TRUE
        ORDER BY s.start_date DESC LIMIT 1
      `);
      if (activeSemester.rows.length > 0) {
        targetSemesterId = activeSemester.rows[0].id;
      }
    }

    // Get attendance summary per course
    const summaryResult = await query(`
      SELECT 
        ats.course_id,
        c.name as course_name,
        c.code as course_code,
        ats.total_classes,
        ats.present,
        ats.absent,
        ats.percentage,
        CASE WHEN ats.percentage < 75 THEN true ELSE false END as low_attendance_alert
      FROM attendance_summary ats
      JOIN courses c ON ats.course_id = c.id
      WHERE ats.student_id = $1 AND ats.semester_id = $2
      ORDER BY c.name
    `, [student.id, targetSemesterId]);

    // Calculate overall statistics
    let totalClasses = 0;
    let totalPresent = 0;
    let totalAbsent = 0;

    summaryResult.rows.forEach(row => {
      totalClasses += parseInt(row.total_classes) || 0;
      totalPresent += parseInt(row.present) || 0;
      totalAbsent += parseInt(row.absent) || 0;
    });

    const overallPercentage = totalClasses > 0 ? ((totalPresent / totalClasses) * 100).toFixed(2) : 0;

    return {
      student: {
        id: student.id,
        name: student.name,
        roll_no: student.roll_no
      },
      semester_id: targetSemesterId,
      courses: summaryResult.rows,
      overall: {
        total_classes: totalClasses,
        present: totalPresent,
        absent: totalAbsent,
        percentage: parseFloat(overallPercentage),
        low_attendance_alert: parseFloat(overallPercentage) < 75
      }
    };
  }

  // Get detailed attendance for a specific course
  async getStudentCourseAttendance(userId, courseId, semesterId) {
    // Get student ID
    const studentResult = await query('SELECT id FROM students WHERE user_id = $1', [userId]);
    if (studentResult.rows.length === 0) {
      throw { status: 404, message: 'Student profile not found' };
    }
    const studentId = studentResult.rows[0].id;

    // Get course info
    const courseResult = await query('SELECT id, name, code FROM courses WHERE id = $1', [courseId]);
    if (courseResult.rows.length === 0) {
      throw { status: 404, message: 'Course not found' };
    }
    const course = courseResult.rows[0];

    // Get attendance records
    let sql = `
      SELECT a.id, a.date, a.status, a.marked_at, cs.section_name
      FROM attendance a
      JOIN course_sections cs ON a.section_id = cs.id
      WHERE a.student_id = $1 AND cs.course_id = $2
    `;
    const params = [studentId, courseId];

    if (semesterId) {
      sql += ` AND cs.semester_id = $3`;
      params.push(semesterId);
    }

    sql += ` ORDER BY a.date DESC`;

    const attendanceResult = await query(sql, params);

    // Calculate statistics
    const stats = {
      present: 0,
      absent: 0,
      late: 0,
      leave: 0
    };

    attendanceResult.rows.forEach(row => {
      stats[row.status]++;
    });

    const total = attendanceResult.rows.length;
    const percentage = total > 0 ? (((stats.present + stats.late) / total) * 100).toFixed(2) : 0;

    return {
      course: {
        id: course.id,
        name: course.name,
        code: course.code
      },
      attendance: attendanceResult.rows,
      statistics: {
        ...stats,
        total_classes: total,
        percentage: parseFloat(percentage),
        low_attendance_alert: parseFloat(percentage) < 75
      }
    };
  }

  // ==================== ADMIN - REPORTS ====================

  // Get attendance reports with various filters
  async getAttendanceReports(filters = {}) {
    const { 
      department_id, 
      course_id, 
      semester_id, 
      section_id,
      student_id,
      start_date, 
      end_date,
      group_by = 'course' // course, department, student, date
    } = filters;

    let sql, params = [];
    let paramCount = 0;

    switch (group_by) {
      case 'department':
        sql = `
          SELECT 
            d.id as department_id,
            d.name as department_name,
            COUNT(DISTINCT a.student_id) as total_students,
            COUNT(a.id) as total_records,
            COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count,
            COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_count,
            ROUND(COUNT(CASE WHEN a.status = 'present' THEN 1 END)::DECIMAL / NULLIF(COUNT(a.id), 0) * 100, 2) as percentage
          FROM attendance a
          JOIN course_sections cs ON a.section_id = cs.id
          JOIN courses c ON cs.course_id = c.id
          JOIN departments d ON c.department_id = d.id
          WHERE 1=1
        `;
        break;

      case 'student':
        sql = `
          SELECT 
            s.id as student_id,
            s.roll_no,
            s.name as student_name,
            d.name as department_name,
            COUNT(a.id) as total_classes,
            COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count,
            COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_count,
            ROUND(COUNT(CASE WHEN a.status = 'present' THEN 1 END)::DECIMAL / NULLIF(COUNT(a.id), 0) * 100, 2) as percentage
          FROM attendance a
          JOIN students s ON a.student_id = s.id
          JOIN course_sections cs ON a.section_id = cs.id
          JOIN courses c ON cs.course_id = c.id
          LEFT JOIN departments d ON s.department_id = d.id
          WHERE 1=1
        `;
        break;

      case 'date':
        sql = `
          SELECT 
            a.date,
            COUNT(DISTINCT a.student_id) as students_marked,
            COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count,
            COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_count,
            COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_count,
            COUNT(CASE WHEN a.status = 'leave' THEN 1 END) as leave_count
          FROM attendance a
          JOIN course_sections cs ON a.section_id = cs.id
          WHERE 1=1
        `;
        break;

      default: // course
        sql = `
          SELECT 
            c.id as course_id,
            c.code as course_code,
            c.name as course_name,
            d.name as department_name,
            cs.section_name,
            COUNT(DISTINCT a.student_id) as total_students,
            COUNT(DISTINCT a.date) as total_classes,
            COUNT(a.id) as total_records,
            COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count,
            COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_count,
            ROUND(COUNT(CASE WHEN a.status = 'present' THEN 1 END)::DECIMAL / NULLIF(COUNT(a.id), 0) * 100, 2) as percentage
          FROM attendance a
          JOIN course_sections cs ON a.section_id = cs.id
          JOIN courses c ON cs.course_id = c.id
          LEFT JOIN departments d ON c.department_id = d.id
          WHERE 1=1
        `;
    }

    // Apply filters
    if (department_id) {
      paramCount++;
      sql += ` AND c.department_id = $${paramCount}`;
      params.push(department_id);
    }

    if (course_id) {
      paramCount++;
      sql += ` AND cs.course_id = $${paramCount}`;
      params.push(course_id);
    }

    if (semester_id) {
      paramCount++;
      sql += ` AND cs.semester_id = $${paramCount}`;
      params.push(semester_id);
    }

    if (section_id) {
      paramCount++;
      sql += ` AND a.section_id = $${paramCount}`;
      params.push(section_id);
    }

    if (student_id) {
      paramCount++;
      sql += ` AND a.student_id = $${paramCount}`;
      params.push(student_id);
    }

    if (start_date) {
      paramCount++;
      sql += ` AND a.date >= $${paramCount}`;
      params.push(start_date);
    }

    if (end_date) {
      paramCount++;
      sql += ` AND a.date <= $${paramCount}`;
      params.push(end_date);
    }

    // Add GROUP BY clause
    switch (group_by) {
      case 'department':
        sql += ` GROUP BY d.id, d.name ORDER BY d.name`;
        break;
      case 'student':
        sql += ` GROUP BY s.id, s.roll_no, s.name, d.name ORDER BY s.roll_no`;
        break;
      case 'date':
        sql += ` GROUP BY a.date ORDER BY a.date DESC`;
        break;
      default:
        sql += ` GROUP BY c.id, c.code, c.name, d.name, cs.section_name ORDER BY c.name`;
    }

    const result = await query(sql, params);

    return {
      group_by,
      filters: { department_id, course_id, semester_id, section_id, student_id, start_date, end_date },
      data: result.rows,
      total_records: result.rows.length
    };
  }

  // Get defaulters list (students with attendance below threshold)
  async getDefaultersList(filters = {}) {
    const { 
      semester_id, 
      department_id, 
      course_id,
      threshold = 75 // Default 75% threshold
    } = filters;

    let sql = `
      SELECT 
        s.id as student_id,
        s.roll_no,
        s.name as student_name,
        s.phone,
        d.name as department_name,
        c.id as course_id,
        c.code as course_code,
        c.name as course_name,
        ats.total_classes,
        ats.present,
        ats.absent,
        ats.percentage,
        ($1 - ats.percentage) as shortage
      FROM attendance_summary ats
      JOIN students s ON ats.student_id = s.id
      JOIN courses c ON ats.course_id = c.id
      LEFT JOIN departments d ON s.department_id = d.id
      WHERE ats.percentage < $1
    `;
    const params = [threshold];
    let paramCount = 1;

    if (semester_id) {
      paramCount++;
      sql += ` AND ats.semester_id = $${paramCount}`;
      params.push(semester_id);
    }

    if (department_id) {
      paramCount++;
      sql += ` AND s.department_id = $${paramCount}`;
      params.push(department_id);
    }

    if (course_id) {
      paramCount++;
      sql += ` AND ats.course_id = $${paramCount}`;
      params.push(course_id);
    }

    sql += ` ORDER BY ats.percentage ASC, s.roll_no`;

    const result = await query(sql, params);

    // Group by student for easier viewing
    const groupedByStudent = {};
    result.rows.forEach(row => {
      if (!groupedByStudent[row.student_id]) {
        groupedByStudent[row.student_id] = {
          student_id: row.student_id,
          roll_no: row.roll_no,
          name: row.student_name,
          phone: row.phone,
          department: row.department_name,
          courses: []
        };
      }
      groupedByStudent[row.student_id].courses.push({
        course_id: row.course_id,
        code: row.course_code,
        name: row.course_name,
        total_classes: row.total_classes,
        present: row.present,
        absent: row.absent,
        percentage: row.percentage,
        shortage: row.shortage
      });
    });

    return {
      threshold,
      filters: { semester_id, department_id, course_id },
      defaulters: Object.values(groupedByStudent),
      total_defaulters: Object.keys(groupedByStudent).length,
      total_course_shortages: result.rows.length
    };
  }

  // ==================== ANALYTICS ====================

  // Get attendance analytics
  async getAttendanceAnalytics(filters = {}) {
    const { semester_id, department_id, course_id, days = 30 } = filters;

    // Daily attendance trend
    let trendSql = `
      SELECT 
        a.date,
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present,
        COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent,
        COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late,
        COUNT(CASE WHEN a.status = 'leave' THEN 1 END) as leave,
        COUNT(a.id) as total,
        ROUND(COUNT(CASE WHEN a.status = 'present' THEN 1 END)::DECIMAL / NULLIF(COUNT(a.id), 0) * 100, 2) as percentage
      FROM attendance a
      JOIN course_sections cs ON a.section_id = cs.id
      JOIN courses c ON cs.course_id = c.id
      WHERE a.date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
    `;
    const params = [];
    let paramCount = 0;

    if (semester_id) {
      paramCount++;
      trendSql += ` AND cs.semester_id = $${paramCount}`;
      params.push(semester_id);
    }

    if (department_id) {
      paramCount++;
      trendSql += ` AND c.department_id = $${paramCount}`;
      params.push(department_id);
    }

    if (course_id) {
      paramCount++;
      trendSql += ` AND cs.course_id = $${paramCount}`;
      params.push(course_id);
    }

    trendSql += ` GROUP BY a.date ORDER BY a.date`;

    const trendResult = await query(trendSql, params);

    // Day-wise distribution (Monday, Tuesday, etc.)
    let dayWiseSql = `
      SELECT 
        TO_CHAR(a.date, 'Day') as day_name,
        EXTRACT(DOW FROM a.date) as day_number,
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present,
        COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent,
        COUNT(a.id) as total,
        ROUND(COUNT(CASE WHEN a.status = 'present' THEN 1 END)::DECIMAL / NULLIF(COUNT(a.id), 0) * 100, 2) as percentage
      FROM attendance a
      JOIN course_sections cs ON a.section_id = cs.id
      JOIN courses c ON cs.course_id = c.id
      WHERE a.date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
    `;

    if (semester_id) {
      dayWiseSql += ` AND cs.semester_id = $1`;
    }
    if (department_id) {
      const idx = semester_id ? 2 : 1;
      dayWiseSql += ` AND c.department_id = $${idx}`;
    }
    if (course_id) {
      const idx = (semester_id ? 1 : 0) + (department_id ? 1 : 0) + 1;
      dayWiseSql += ` AND cs.course_id = $${idx}`;
    }

    dayWiseSql += ` GROUP BY TO_CHAR(a.date, 'Day'), EXTRACT(DOW FROM a.date) ORDER BY day_number`;

    const dayWiseResult = await query(dayWiseSql, params);

    // Overall statistics
    let overallSql = `
      SELECT 
        COUNT(DISTINCT a.student_id) as unique_students,
        COUNT(DISTINCT a.date) as total_days,
        COUNT(DISTINCT cs.id) as total_sections,
        COUNT(a.id) as total_records,
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) as total_present,
        COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as total_absent,
        ROUND(COUNT(CASE WHEN a.status = 'present' THEN 1 END)::DECIMAL / NULLIF(COUNT(a.id), 0) * 100, 2) as overall_percentage
      FROM attendance a
      JOIN course_sections cs ON a.section_id = cs.id
      JOIN courses c ON cs.course_id = c.id
      WHERE a.date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
    `;

    if (semester_id) {
      overallSql += ` AND cs.semester_id = $1`;
    }
    if (department_id) {
      const idx = semester_id ? 2 : 1;
      overallSql += ` AND c.department_id = $${idx}`;
    }
    if (course_id) {
      const idx = (semester_id ? 1 : 0) + (department_id ? 1 : 0) + 1;
      overallSql += ` AND cs.course_id = $${idx}`;
    }

    const overallResult = await query(overallSql, params);

    // At-risk students (below 75%)
    let atRiskSql = `
      SELECT COUNT(DISTINCT student_id) as count
      FROM attendance_summary
      WHERE percentage < 75
    `;
    if (semester_id) {
      atRiskSql += ` AND semester_id = $1`;
    }

    const atRiskResult = await query(atRiskSql, semester_id ? [semester_id] : []);

    return {
      filters: { semester_id, department_id, course_id, days },
      daily_trend: trendResult.rows,
      day_wise_distribution: dayWiseResult.rows,
      overall_statistics: overallResult.rows[0],
      at_risk_students: atRiskResult.rows[0]?.count || 0,
      insights: this.generateInsights(trendResult.rows, overallResult.rows[0])
    };
  }

  // Generate insights from analytics data
  generateInsights(trendData, overall) {
    const insights = [];

    if (overall) {
      const percentage = parseFloat(overall.overall_percentage) || 0;
      
      if (percentage < 70) {
        insights.push({
          type: 'warning',
          message: `Overall attendance is critically low at ${percentage}%. Immediate action required.`
        });
      } else if (percentage < 80) {
        insights.push({
          type: 'caution',
          message: `Overall attendance is below target at ${percentage}%. Consider intervention.`
        });
      } else {
        insights.push({
          type: 'success',
          message: `Overall attendance is healthy at ${percentage}%.`
        });
      }
    }

    // Trend analysis
    if (trendData.length >= 7) {
      const recentWeek = trendData.slice(-7);
      const avgRecent = recentWeek.reduce((sum, d) => sum + parseFloat(d.percentage || 0), 0) / 7;
      
      const previousWeek = trendData.slice(-14, -7);
      if (previousWeek.length > 0) {
        const avgPrevious = previousWeek.reduce((sum, d) => sum + parseFloat(d.percentage || 0), 0) / previousWeek.length;
        
        const change = avgRecent - avgPrevious;
        if (change > 5) {
          insights.push({
            type: 'success',
            message: `Attendance improved by ${change.toFixed(1)}% compared to previous week.`
          });
        } else if (change < -5) {
          insights.push({
            type: 'warning',
            message: `Attendance dropped by ${Math.abs(change).toFixed(1)}% compared to previous week.`
          });
        }
      }
    }

    return insights;
  }

  // ==================== HELPER FUNCTIONS ====================

  // Update attendance summary for a student
  async updateAttendanceSummary(studentId, courseId, semesterId) {
    // Calculate attendance statistics
    const stats = await query(`
      SELECT 
        COUNT(a.id) as total_classes,
        COUNT(CASE WHEN a.status = 'present' OR a.status = 'late' THEN 1 END) as present,
        COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent
      FROM attendance a
      JOIN course_sections cs ON a.section_id = cs.id
      WHERE a.student_id = $1 AND cs.course_id = $2 AND cs.semester_id = $3
    `, [studentId, courseId, semesterId]);

    const { total_classes, present, absent } = stats.rows[0];
    const percentage = total_classes > 0 ? ((present / total_classes) * 100).toFixed(2) : 0;

    // Upsert attendance summary
    await query(`
      INSERT INTO attendance_summary (student_id, course_id, semester_id, total_classes, present, absent, percentage)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (student_id, course_id, semester_id)
      DO UPDATE SET 
        total_classes = EXCLUDED.total_classes,
        present = EXCLUDED.present,
        absent = EXCLUDED.absent,
        percentage = EXCLUDED.percentage,
        updated_at = CURRENT_TIMESTAMP
    `, [studentId, courseId, semesterId, total_classes, present, absent, percentage]);
  }
}

module.exports = new AttendanceService();
