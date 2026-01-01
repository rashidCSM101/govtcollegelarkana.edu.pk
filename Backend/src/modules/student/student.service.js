const { query, getClient } = require('../../config/database');
const { validateRequired } = require('../../utils/validator');

class StudentService {

  // ==================== STUDENT ENROLLMENT ====================

  // Enroll student in a semester
  async enrollInSemester(userId, enrollmentData) {
    const { session_id, semester_id } = enrollmentData;

    // Validate required fields
    const validation = validateRequired({ session_id, semester_id }, ['session_id', 'semester_id']);
    if (!validation.isValid) {
      throw { status: 400, message: validation.errors.join(', ') };
    }

    // Get student ID from user
    const studentResult = await query('SELECT id, status FROM students WHERE user_id = $1', [userId]);
    if (studentResult.rows.length === 0) {
      throw { status: 404, message: 'Student profile not found' };
    }

    const student = studentResult.rows[0];
    
    if (student.status !== 'active') {
      throw { status: 403, message: 'Only active students can enroll' };
    }

    // Check if session exists and is active
    const sessionResult = await query('SELECT id, name FROM sessions WHERE id = $1 AND is_active = TRUE', [session_id]);
    if (sessionResult.rows.length === 0) {
      throw { status: 404, message: 'Active session not found' };
    }

    // Check if semester exists
    const semesterResult = await query(
      'SELECT id, name FROM semesters WHERE id = $1 AND session_id = $2',
      [semester_id, session_id]
    );
    if (semesterResult.rows.length === 0) {
      throw { status: 404, message: 'Semester not found in this session' };
    }

    // Check if already enrolled
    const existingEnrollment = await query(
      'SELECT id FROM student_enrollments WHERE student_id = $1 AND semester_id = $2',
      [student.id, semester_id]
    );
    if (existingEnrollment.rows.length > 0) {
      throw { status: 409, message: 'Already enrolled in this semester' };
    }

    const result = await query(
      `INSERT INTO student_enrollments (student_id, session_id, semester_id, enrollment_date, status)
       VALUES ($1, $2, $3, CURRENT_DATE, 'enrolled')
       RETURNING *`,
      [student.id, session_id, semester_id]
    );

    await this.logActivity(userId, 'SEMESTER_ENROLLMENT', 'student', { semester_id, session_id });

    return {
      enrollment: result.rows[0],
      session: sessionResult.rows[0],
      semester: semesterResult.rows[0],
      message: 'Successfully enrolled in semester'
    };
  }

  // Get enrollment history
  async getEnrollmentHistory(userId) {
    const studentResult = await query('SELECT id FROM students WHERE user_id = $1', [userId]);
    if (studentResult.rows.length === 0) {
      throw { status: 404, message: 'Student profile not found' };
    }

    const result = await query(
      `SELECT se.*, 
              s.name as session_name, s.start_date as session_start, s.end_date as session_end,
              sem.name as semester_name, sem.number as semester_number,
              (SELECT COUNT(*) FROM course_registrations cr 
               WHERE cr.student_id = se.student_id AND cr.semester_id = se.semester_id) as registered_courses
       FROM student_enrollments se
       JOIN sessions s ON se.session_id = s.id
       JOIN semesters sem ON se.semester_id = sem.id
       WHERE se.student_id = $1
       ORDER BY se.enrollment_date DESC`,
      [studentResult.rows[0].id]
    );

    return result.rows;
  }

  // Verify enrollment
  async verifyEnrollment(userId, semesterId) {
    const studentResult = await query('SELECT id FROM students WHERE user_id = $1', [userId]);
    if (studentResult.rows.length === 0) {
      throw { status: 404, message: 'Student profile not found' };
    }

    const result = await query(
      `SELECT se.*, s.name as session_name, sem.name as semester_name
       FROM student_enrollments se
       JOIN sessions s ON se.session_id = s.id
       JOIN semesters sem ON se.semester_id = sem.id
       WHERE se.student_id = $1 AND se.semester_id = $2 AND se.status = 'enrolled'`,
      [studentResult.rows[0].id, semesterId]
    );

    return {
      enrolled: result.rows.length > 0,
      enrollment: result.rows[0] || null
    };
  }

  // ==================== COURSE REGISTRATION ====================

  // Get available courses for registration
  async getAvailableCourses(userId, semesterId) {
    const studentResult = await query(
      'SELECT id, department_id, semester FROM students WHERE user_id = $1',
      [userId]
    );
    if (studentResult.rows.length === 0) {
      throw { status: 404, message: 'Student profile not found' };
    }

    const student = studentResult.rows[0];

    // Check enrollment
    const enrollmentCheck = await query(
      'SELECT id FROM student_enrollments WHERE student_id = $1 AND semester_id = $2 AND status = $3',
      [student.id, semesterId, 'enrolled']
    );
    if (enrollmentCheck.rows.length === 0) {
      throw { status: 403, message: 'You must be enrolled in this semester first' };
    }

    // Get available course sections
    const result = await query(
      `SELECT cs.id as section_id, cs.section_name, cs.capacity, cs.room_no,
              c.id as course_id, c.code, c.name, c.credit_hours, c.description,
              d.name as department_name,
              t.name as teacher_name, t.designation,
              (SELECT COUNT(*) FROM course_registrations cr 
               WHERE cr.course_id = c.id AND cr.semester_id = cs.semester_id AND cr.status = 'registered') as enrolled_count,
              (cs.capacity - (SELECT COUNT(*) FROM course_registrations cr 
               WHERE cr.course_id = c.id AND cr.semester_id = cs.semester_id AND cr.status = 'registered')) as available_seats,
              EXISTS(SELECT 1 FROM course_registrations cr 
                     WHERE cr.student_id = $1 AND cr.course_id = c.id AND cr.semester_id = $2 AND cr.status = 'registered') as already_registered,
              (SELECT json_agg(json_build_object('id', pc.id, 'code', pc.code, 'name', pc.name))
               FROM course_prerequisites cp
               JOIN courses pc ON cp.prerequisite_course_id = pc.id
               WHERE cp.course_id = c.id) as prerequisites
       FROM course_sections cs
       JOIN courses c ON cs.course_id = c.id
       LEFT JOIN departments d ON c.department_id = d.id
       LEFT JOIN teachers t ON cs.teacher_id = t.id
       WHERE cs.semester_id = $2 AND c.is_active = TRUE
       ORDER BY c.department_id, c.code`,
      [student.id, semesterId]
    );

    return result.rows;
  }

  // Register for a course
  async registerCourse(userId, registrationData) {
    const { course_id, section_id, semester_id } = registrationData;

    const validation = validateRequired({ course_id, semester_id }, ['course_id', 'semester_id']);
    if (!validation.isValid) {
      throw { status: 400, message: validation.errors.join(', ') };
    }

    const studentResult = await query(
      'SELECT id, department_id FROM students WHERE user_id = $1',
      [userId]
    );
    if (studentResult.rows.length === 0) {
      throw { status: 404, message: 'Student profile not found' };
    }

    const student = studentResult.rows[0];

    // Check enrollment
    const enrollmentCheck = await query(
      'SELECT id FROM student_enrollments WHERE student_id = $1 AND semester_id = $2 AND status = $3',
      [student.id, semester_id, 'enrolled']
    );
    if (enrollmentCheck.rows.length === 0) {
      throw { status: 403, message: 'You must be enrolled in this semester first' };
    }

    // Get course details
    const courseResult = await query(
      'SELECT id, code, name, credit_hours FROM courses WHERE id = $1 AND is_active = TRUE',
      [course_id]
    );
    if (courseResult.rows.length === 0) {
      throw { status: 404, message: 'Course not found or inactive' };
    }
    const course = courseResult.rows[0];

    // Check if already registered
    const existingReg = await query(
      'SELECT id FROM course_registrations WHERE student_id = $1 AND course_id = $2 AND semester_id = $3 AND status = $4',
      [student.id, course_id, semester_id, 'registered']
    );
    if (existingReg.rows.length > 0) {
      throw { status: 409, message: 'Already registered for this course' };
    }

    // Check prerequisites
    const prereqCheck = await this.checkPrerequisites(student.id, course_id);
    if (!prereqCheck.satisfied) {
      throw { status: 400, message: `Prerequisites not met: ${prereqCheck.missing.map(p => p.code).join(', ')}` };
    }

    // Check credit hour limit (max 21 per semester)
    const creditCheck = await query(
      `SELECT COALESCE(SUM(c.credit_hours), 0) as total_credits
       FROM course_registrations cr
       JOIN courses c ON cr.course_id = c.id
       WHERE cr.student_id = $1 AND cr.semester_id = $2 AND cr.status = 'registered'`,
      [student.id, semester_id]
    );
    const currentCredits = parseInt(creditCheck.rows[0].total_credits) || 0;
    if (currentCredits + course.credit_hours > 21) {
      throw { status: 400, message: `Credit hour limit exceeded. Current: ${currentCredits}, Adding: ${course.credit_hours}, Max: 21` };
    }

    // Check section capacity
    if (section_id) {
      const sectionResult = await query(
        `SELECT cs.id, cs.capacity,
                (SELECT COUNT(*) FROM course_registrations cr 
                 WHERE cr.course_id = cs.course_id AND cr.semester_id = cs.semester_id AND cr.status = 'registered') as enrolled
         FROM course_sections cs
         WHERE cs.id = $1 AND cs.course_id = $2`,
        [section_id, course_id]
      );

      if (sectionResult.rows.length === 0) {
        throw { status: 404, message: 'Section not found' };
      }

      const section = sectionResult.rows[0];
      if (section.enrolled >= section.capacity) {
        throw { status: 400, message: 'Section is full. Try joining the waiting list.' };
      }
    }

    // Get session_id from semester
    const semesterResult = await query('SELECT session_id FROM semesters WHERE id = $1', [semester_id]);
    const session_id = semesterResult.rows[0].session_id;

    const client = await getClient();

    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO course_registrations (student_id, course_id, semester_id, session_id, registration_date, status)
         VALUES ($1, $2, $3, $4, CURRENT_DATE, 'registered')
         RETURNING *`,
        [student.id, course_id, semester_id, session_id]
      );

      await client.query('COMMIT');

      await this.logActivity(userId, 'COURSE_REGISTRATION', 'student', { course_id, semester_id });

      return {
        registration: result.rows[0],
        course: course,
        message: 'Successfully registered for course'
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Check prerequisites
  async checkPrerequisites(studentId, courseId) {
    // Get prerequisites for the course
    const prereqResult = await query(
      `SELECT c.id, c.code, c.name
       FROM course_prerequisites cp
       JOIN courses c ON cp.prerequisite_course_id = c.id
       WHERE cp.course_id = $1`,
      [courseId]
    );

    if (prereqResult.rows.length === 0) {
      return { satisfied: true, missing: [] };
    }

    // Check which prerequisites the student has completed
    const completedResult = await query(
      `SELECT DISTINCT cr.course_id
       FROM course_registrations cr
       WHERE cr.student_id = $1 AND cr.status = 'completed'`,
      [studentId]
    );

    const completedCourses = completedResult.rows.map(r => r.course_id);
    const missing = prereqResult.rows.filter(p => !completedCourses.includes(p.id));

    return {
      satisfied: missing.length === 0,
      required: prereqResult.rows,
      completed: prereqResult.rows.filter(p => completedCourses.includes(p.id)),
      missing: missing
    };
  }

  // Get registered courses
  async getRegisteredCourses(userId, semesterId) {
    const studentResult = await query('SELECT id FROM students WHERE user_id = $1', [userId]);
    if (studentResult.rows.length === 0) {
      throw { status: 404, message: 'Student profile not found' };
    }

    let whereClause = 'WHERE cr.student_id = $1';
    let params = [studentResult.rows[0].id];

    if (semesterId) {
      whereClause += ' AND cr.semester_id = $2';
      params.push(semesterId);
    }

    const result = await query(
      `SELECT cr.*, 
              c.code, c.name as course_name, c.credit_hours, c.description,
              d.name as department_name,
              sem.name as semester_name,
              s.name as session_name,
              cs.section_name, cs.room_no,
              t.name as teacher_name
       FROM course_registrations cr
       JOIN courses c ON cr.course_id = c.id
       LEFT JOIN departments d ON c.department_id = d.id
       JOIN semesters sem ON cr.semester_id = sem.id
       JOIN sessions s ON cr.session_id = s.id
       LEFT JOIN course_sections cs ON cs.course_id = c.id AND cs.semester_id = cr.semester_id
       LEFT JOIN teachers t ON cs.teacher_id = t.id
       ${whereClause}
       ORDER BY cr.registration_date DESC`,
      params
    );

    // Calculate total credits
    const totalCredits = result.rows
      .filter(r => r.status === 'registered')
      .reduce((sum, r) => sum + (r.credit_hours || 0), 0);

    return {
      courses: result.rows,
      totalCredits,
      maxCredits: 21
    };
  }

  // Drop a course
  async dropCourse(userId, registrationId) {
    const studentResult = await query('SELECT id FROM students WHERE user_id = $1', [userId]);
    if (studentResult.rows.length === 0) {
      throw { status: 404, message: 'Student profile not found' };
    }

    // Check if registration exists and belongs to student
    const regResult = await query(
      `SELECT cr.*, c.code, c.name
       FROM course_registrations cr
       JOIN courses c ON cr.course_id = c.id
       WHERE cr.id = $1 AND cr.student_id = $2`,
      [registrationId, studentResult.rows[0].id]
    );

    if (regResult.rows.length === 0) {
      throw { status: 404, message: 'Registration not found' };
    }

    const registration = regResult.rows[0];

    if (registration.status === 'dropped') {
      throw { status: 400, message: 'Course already dropped' };
    }

    if (registration.status === 'completed') {
      throw { status: 400, message: 'Cannot drop a completed course' };
    }

    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Update registration status to dropped
      await client.query(
        `UPDATE course_registrations SET status = 'dropped' WHERE id = $1`,
        [registrationId]
      );

      // Check waiting list and auto-enroll next student
      await this.processWaitingList(registration.course_id, registration.semester_id, client);

      await client.query('COMMIT');

      await this.logActivity(userId, 'COURSE_DROP', 'student', { 
        registrationId, 
        course_code: registration.code 
      });

      return {
        message: `Successfully dropped ${registration.code} - ${registration.name}`,
        dropped: registration
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ==================== WAITING LIST ====================

  // Add to waiting list
  async addToWaitingList(userId, waitingData) {
    const { course_id, semester_id } = waitingData;

    const validation = validateRequired({ course_id, semester_id }, ['course_id', 'semester_id']);
    if (!validation.isValid) {
      throw { status: 400, message: validation.errors.join(', ') };
    }

    const studentResult = await query('SELECT id FROM students WHERE user_id = $1', [userId]);
    if (studentResult.rows.length === 0) {
      throw { status: 404, message: 'Student profile not found' };
    }

    const student = studentResult.rows[0];

    // Check if already registered
    const existingReg = await query(
      'SELECT id FROM course_registrations WHERE student_id = $1 AND course_id = $2 AND semester_id = $3 AND status = $4',
      [student.id, course_id, semester_id, 'registered']
    );
    if (existingReg.rows.length > 0) {
      throw { status: 409, message: 'Already registered for this course' };
    }

    // Check if already on waiting list
    const existingWait = await query(
      'SELECT id FROM waiting_lists WHERE student_id = $1 AND course_id = $2 AND status = $3',
      [student.id, course_id, 'waiting']
    );
    if (existingWait.rows.length > 0) {
      throw { status: 409, message: 'Already on waiting list for this course' };
    }

    // Get next position
    const positionResult = await query(
      'SELECT COALESCE(MAX(position), 0) + 1 as next_position FROM waiting_lists WHERE course_id = $1 AND status = $2',
      [course_id, 'waiting']
    );
    const nextPosition = positionResult.rows[0].next_position;

    const result = await query(
      `INSERT INTO waiting_lists (course_id, student_id, position, status)
       VALUES ($1, $2, $3, 'waiting')
       RETURNING *`,
      [course_id, student.id, nextPosition]
    );

    // Get course details
    const courseResult = await query('SELECT code, name FROM courses WHERE id = $1', [course_id]);

    await this.logActivity(userId, 'WAITING_LIST_ADD', 'student', { course_id });

    return {
      waitingList: result.rows[0],
      course: courseResult.rows[0],
      position: nextPosition,
      message: `Added to waiting list at position ${nextPosition}`
    };
  }

  // Get waiting list status
  async getWaitingList(userId) {
    const studentResult = await query('SELECT id FROM students WHERE user_id = $1', [userId]);
    if (studentResult.rows.length === 0) {
      throw { status: 404, message: 'Student profile not found' };
    }

    const result = await query(
      `SELECT wl.*, 
              c.code, c.name as course_name, c.credit_hours,
              (SELECT COUNT(*) FROM waiting_lists w2 
               WHERE w2.course_id = wl.course_id AND w2.status = 'waiting') as total_waiting
       FROM waiting_lists wl
       JOIN courses c ON wl.course_id = c.id
       WHERE wl.student_id = $1
       ORDER BY wl.status, wl.position`,
      [studentResult.rows[0].id]
    );

    return result.rows;
  }

  // Remove from waiting list
  async removeFromWaitingList(userId, waitingId) {
    const studentResult = await query('SELECT id FROM students WHERE user_id = $1', [userId]);
    if (studentResult.rows.length === 0) {
      throw { status: 404, message: 'Student profile not found' };
    }

    const result = await query(
      `DELETE FROM waiting_lists 
       WHERE id = $1 AND student_id = $2 AND status = 'waiting'
       RETURNING *`,
      [waitingId, studentResult.rows[0].id]
    );

    if (result.rows.length === 0) {
      throw { status: 404, message: 'Waiting list entry not found' };
    }

    // Reorder positions
    await query(
      `UPDATE waiting_lists 
       SET position = position - 1 
       WHERE course_id = $1 AND status = 'waiting' AND position > $2`,
      [result.rows[0].course_id, result.rows[0].position]
    );

    await this.logActivity(userId, 'WAITING_LIST_REMOVE', 'student', { waitingId });

    return { message: 'Removed from waiting list' };
  }

  // Process waiting list when a seat becomes available
  async processWaitingList(courseId, semesterId, client) {
    // Get first person in waiting list
    const waitingResult = await client.query(
      `SELECT wl.*, s.user_id
       FROM waiting_lists wl
       JOIN students s ON wl.student_id = s.id
       WHERE wl.course_id = $1 AND wl.status = 'waiting'
       ORDER BY wl.position ASC
       LIMIT 1`,
      [courseId]
    );

    if (waitingResult.rows.length === 0) {
      return; // No one waiting
    }

    const waiting = waitingResult.rows[0];

    // Get session_id
    const semesterResult = await client.query('SELECT session_id FROM semesters WHERE id = $1', [semesterId]);
    const session_id = semesterResult.rows[0].session_id;

    // Auto-enroll the student
    await client.query(
      `INSERT INTO course_registrations (student_id, course_id, semester_id, session_id, registration_date, status)
       VALUES ($1, $2, $3, $4, CURRENT_DATE, 'registered')`,
      [waiting.student_id, courseId, semesterId, session_id]
    );

    // Update waiting list status
    await client.query(
      `UPDATE waiting_lists SET status = 'enrolled' WHERE id = $1`,
      [waiting.id]
    );

    // Reorder positions
    await client.query(
      `UPDATE waiting_lists 
       SET position = position - 1 
       WHERE course_id = $1 AND status = 'waiting'`,
      [courseId]
    );

    console.log(`Auto-enrolled student ${waiting.student_id} from waiting list for course ${courseId}`);
  }

  // ==================== COURSE SECTIONS (Admin) ====================

  // Create course section
  async createSection(sectionData, createdBy) {
    const { course_id, semester_id, teacher_id, section_name, capacity, room_no } = sectionData;

    const validation = validateRequired({ course_id, semester_id }, ['course_id', 'semester_id']);
    if (!validation.isValid) {
      throw { status: 400, message: validation.errors.join(', ') };
    }

    // Check if course exists
    const courseExists = await query('SELECT id FROM courses WHERE id = $1', [course_id]);
    if (courseExists.rows.length === 0) {
      throw { status: 404, message: 'Course not found' };
    }

    // Check if semester exists
    const semesterExists = await query('SELECT id FROM semesters WHERE id = $1', [semester_id]);
    if (semesterExists.rows.length === 0) {
      throw { status: 404, message: 'Semester not found' };
    }

    // Check if teacher exists (if provided)
    if (teacher_id) {
      const teacherExists = await query('SELECT id FROM teachers WHERE id = $1', [teacher_id]);
      if (teacherExists.rows.length === 0) {
        throw { status: 404, message: 'Teacher not found' };
      }
    }

    const result = await query(
      `INSERT INTO course_sections (course_id, semester_id, teacher_id, section_name, capacity, room_no)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [course_id, semester_id, teacher_id, section_name || 'A', capacity || 50, room_no]
    );

    await this.logActivity(createdBy, 'CREATE_SECTION', 'admin', { sectionId: result.rows[0].id });

    return result.rows[0];
  }

  // Get course sections
  async getCourseSections(filters = {}) {
    const { course_id, semester_id, teacher_id } = filters;

    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (course_id) {
      whereConditions.push(`cs.course_id = $${paramIndex++}`);
      params.push(course_id);
    }
    if (semester_id) {
      whereConditions.push(`cs.semester_id = $${paramIndex++}`);
      params.push(semester_id);
    }
    if (teacher_id) {
      whereConditions.push(`cs.teacher_id = $${paramIndex++}`);
      params.push(teacher_id);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT cs.*, 
              c.code as course_code, c.name as course_name, c.credit_hours,
              sem.name as semester_name,
              t.name as teacher_name, t.designation,
              (SELECT COUNT(*) FROM course_registrations cr 
               WHERE cr.course_id = cs.course_id AND cr.semester_id = cs.semester_id AND cr.status = 'registered') as enrolled_count
       FROM course_sections cs
       JOIN courses c ON cs.course_id = c.id
       JOIN semesters sem ON cs.semester_id = sem.id
       LEFT JOIN teachers t ON cs.teacher_id = t.id
       ${whereClause}
       ORDER BY c.code, cs.section_name`,
      params
    );

    return result.rows;
  }

  // Update course section
  async updateSection(sectionId, updateData, updatedBy) {
    const { teacher_id, section_name, capacity, room_no } = updateData;

    const result = await query(
      `UPDATE course_sections SET
       teacher_id = COALESCE($1, teacher_id),
       section_name = COALESCE($2, section_name),
       capacity = COALESCE($3, capacity),
       room_no = COALESCE($4, room_no)
       WHERE id = $5
       RETURNING *`,
      [teacher_id, section_name, capacity, room_no, sectionId]
    );

    if (result.rows.length === 0) {
      throw { status: 404, message: 'Section not found' };
    }

    await this.logActivity(updatedBy, 'UPDATE_SECTION', 'admin', { sectionId, changes: updateData });

    return result.rows[0];
  }

  // Delete course section
  async deleteSection(sectionId, deletedBy) {
    // Check if section has registrations
    const hasRegistrations = await query(
      `SELECT cr.id FROM course_registrations cr
       JOIN course_sections cs ON cr.course_id = cs.course_id AND cr.semester_id = cs.semester_id
       WHERE cs.id = $1 AND cr.status = 'registered'
       LIMIT 1`,
      [sectionId]
    );

    if (hasRegistrations.rows.length > 0) {
      throw { status: 400, message: 'Cannot delete section with active registrations' };
    }

    const result = await query(
      'DELETE FROM course_sections WHERE id = $1 RETURNING id',
      [sectionId]
    );

    if (result.rows.length === 0) {
      throw { status: 404, message: 'Section not found' };
    }

    await this.logActivity(deletedBy, 'DELETE_SECTION', 'admin', { sectionId });

    return { message: 'Section deleted successfully' };
  }

  // ==================== HELPER METHODS ====================

  async logActivity(userId, action, module, details) {
    try {
      await query(
        `INSERT INTO activity_logs (user_id, action, module, details, timestamp)
         VALUES ($1, $2, $3, $4, NOW())`,
        [userId, action, module, JSON.stringify(details)]
      );
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }
}

module.exports = new StudentService();
