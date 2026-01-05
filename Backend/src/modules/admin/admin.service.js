const bcrypt = require('bcrypt');
const { query, getClient } = require('../../config/database');
const { generatePassword, generateUniqueId, paginate, paginationResponse } = require('../../utils/helper');
const { isValidEmail, isValidCNIC, isValidPhone, validateRequired } = require('../../utils/validator');
const { sendEmail, emailTemplates } = require('../../utils/email');

const SALT_ROUNDS = 10;

class AdminService {

  // ==================== STUDENT MANAGEMENT ====================

  // Add new student
  async addStudent(studentData, createdBy) {
    const { email, name, roll_no, father_name, dob, cnic, phone, address, batch, department_id, semester, profile_photo, gender, blood_group, emergency_contact, father_phone, father_cnic, admission_date } = studentData;

    // Validate required fields
    const validation = validateRequired({ email, name }, ['email', 'name']);
    if (!validation.isValid) {
      throw { status: 400, message: validation.errors.join(', ') };
    }

    if (!isValidEmail(email)) {
      throw { status: 400, message: 'Invalid email format' };
    }

    // Check if email exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existingUser.rows.length > 0) {
      throw { status: 409, message: 'Email already registered' };
    }

    // Check if roll_no exists
    if (roll_no) {
      const existingRoll = await query('SELECT id FROM students WHERE roll_no = $1', [roll_no]);
      if (existingRoll.rows.length > 0) {
        throw { status: 409, message: 'Roll number already exists' };
      }
    }

    // Handle photo upload if base64
    let photoFilename = null;
    if (profile_photo && profile_photo.startsWith('data:image')) {
      const fs = require('fs');
      const path = require('path');
      const base64Data = profile_photo.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const filename = `student-${Date.now()}.jpg`;
      const uploadsDir = path.join(__dirname, '../../../uploads');
      
      // Create uploads directory if it doesn't exist
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      fs.writeFileSync(path.join(uploadsDir, filename), buffer);
      photoFilename = filename;
    }

    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Generate temporary password
      const tempPassword = generatePassword(10);
      const hashedPassword = await bcrypt.hash(tempPassword, SALT_ROUNDS);

      // Create user account
      const userResult = await client.query(
        `INSERT INTO users (email, password, role, is_active, email_verified, created_at)
         VALUES ($1, $2, 'student', TRUE, FALSE, NOW())
         RETURNING id`,
        [email.toLowerCase(), hashedPassword]
      );

      const userId = userResult.rows[0].id;

      // Create student profile
      const studentResult = await client.query(
        `INSERT INTO students (user_id, roll_no, name, father_name, father_phone, father_cnic, dob, date_of_birth, cnic, phone, emergency_contact, address, batch, department_id, semester, status, gender, blood_group, admission_date, profile_photo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'active', $16, $17, $18, $19)
         RETURNING *`,
        [userId, roll_no || generateUniqueId('STU-'), name, father_name, father_phone, father_cnic, dob || admission_date, dob || admission_date, cnic, phone, emergency_contact, address, batch, department_id, semester || 1, gender, blood_group, admission_date, photoFilename]
      );

      // Create notification preferences
      await client.query(
        `INSERT INTO notification_preferences (user_id) VALUES ($1)`,
        [userId]
      );

      await client.query('COMMIT');

      // Send welcome email (non-blocking)
      sendEmail({
        to: email,
        ...emailTemplates.welcome(name, email, tempPassword)
      }).catch(console.error);

      // Log activity
      await this.logActivity(createdBy, 'CREATE_STUDENT', 'admin', { studentId: studentResult.rows[0].id, email });

      return {
        student: studentResult.rows[0],
        credentials: {
          email: email,
          tempPassword: tempPassword
        },
        message: 'Student created successfully. Credentials sent to email.'
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Get all students with pagination and filters
  async getStudents(filters = {}) {
    const { page = 1, limit = 10, search, department_id, semester, batch, status } = filters;
    const { limit: queryLimit, offset } = paginate(page, limit);

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (s.name ILIKE $${paramIndex} OR s.roll_no ILIKE $${paramIndex} OR s.cnic ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (department_id) {
      whereClause += ` AND s.department_id = $${paramIndex}`;
      params.push(department_id);
      paramIndex++;
    }

    if (semester) {
      whereClause += ` AND s.semester = $${paramIndex}`;
      params.push(semester);
      paramIndex++;
    }

    if (batch) {
      whereClause += ` AND s.batch = $${paramIndex}`;
      params.push(batch);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND s.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM students s
       JOIN users u ON s.user_id = u.id
       ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get students
    const result = await query(
      `SELECT s.*, u.email, u.is_active as account_active, u.last_login,
              d.name as department_name, d.code as department_code
       FROM students s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN departments d ON s.department_id = d.id
       ${whereClause}
       ORDER BY s.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, queryLimit, offset]
    );

    return paginationResponse(result.rows, total, page, limit);
  }

  // Get student by ID
  async getStudentById(studentId) {
    const result = await query(
      `SELECT s.*, u.email, u.is_active as account_active, u.last_login, u.created_at as account_created,
              d.name as department_name, d.code as department_code
       FROM students s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE s.id = $1`,
      [studentId]
    );

    if (result.rows.length === 0) {
      throw { status: 404, message: 'Student not found' };
    }

    return result.rows[0];
  }

  // Update student
  async updateStudent(studentId, updateData, updatedBy) {
    const { 
      name, father_name, father_phone, father_cnic, dob, date_of_birth, cnic, phone, 
      emergency_contact, address, batch, department_id, semester, status, roll_no, 
      gender, blood_group, admission_date, profile_photo 
    } = updateData;

    // Check if student exists
    const existingStudent = await query('SELECT id, user_id, profile_photo FROM students WHERE id = $1', [studentId]);
    if (existingStudent.rows.length === 0) {
      throw { status: 404, message: 'Student not found' };
    }

    // Check roll_no uniqueness if changing
    if (roll_no) {
      const rollCheck = await query('SELECT id FROM students WHERE roll_no = $1 AND id != $2', [roll_no, studentId]);
      if (rollCheck.rows.length > 0) {
        throw { status: 409, message: 'Roll number already exists' };
      }
    }

    // Handle photo upload if base64
    let photoFilename = existingStudent.rows[0].profile_photo;
    if (profile_photo && profile_photo.startsWith('data:image')) {
      const fs = require('fs');
      const path = require('path');
      
      // Delete old photo if exists
      if (photoFilename) {
        const oldPhotoPath = path.join(__dirname, '../../../uploads', photoFilename);
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
        }
      }
      
      // Save new photo
      const base64Data = profile_photo.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const filename = `student-${Date.now()}.jpg`;
      const uploadsDir = path.join(__dirname, '../../../uploads');
      
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      fs.writeFileSync(path.join(uploadsDir, filename), buffer);
      photoFilename = filename;
    }

    const result = await query(
      `UPDATE students SET
       name = COALESCE($1, name),
       father_name = COALESCE($2, father_name),
       father_phone = COALESCE($3, father_phone),
       father_cnic = COALESCE($4, father_cnic),
       dob = COALESCE($5, dob),
       date_of_birth = COALESCE($6, date_of_birth),
       cnic = COALESCE($7, cnic),
       phone = COALESCE($8, phone),
       emergency_contact = COALESCE($9, emergency_contact),
       address = COALESCE($10, address),
       batch = COALESCE($11, batch),
       department_id = COALESCE($12, department_id),
       semester = COALESCE($13, semester),
       status = COALESCE($14, status),
       roll_no = COALESCE($15, roll_no),
       gender = COALESCE($16, gender),
       blood_group = COALESCE($17, blood_group),
       admission_date = COALESCE($18, admission_date),
       profile_photo = COALESCE($19, profile_photo),
       updated_at = NOW()
       WHERE id = $20
       RETURNING *`,
      [
        name, father_name, father_phone, father_cnic, 
        dob || date_of_birth, dob || date_of_birth, 
        cnic, phone, emergency_contact, address, batch, 
        department_id, semester, status, roll_no, 
        gender, blood_group, admission_date, photoFilename, 
        studentId
      ]
    );

    await this.logActivity(updatedBy, 'UPDATE_STUDENT', 'admin', { studentId, changes: updateData });

    return result.rows[0];
  }

  // Delete/Deactivate student
  async deleteStudent(studentId, deletedBy, permanent = false) {
    const existingStudent = await query('SELECT id, user_id, name FROM students WHERE id = $1', [studentId]);
    if (existingStudent.rows.length === 0) {
      throw { status: 404, message: 'Student not found' };
    }

    const userId = existingStudent.rows[0].user_id;

    if (permanent) {
      // Permanent delete (cascade will handle related records)
      await query('DELETE FROM users WHERE id = $1', [userId]);
      await this.logActivity(deletedBy, 'DELETE_STUDENT_PERMANENT', 'admin', { studentId, name: existingStudent.rows[0].name });
      return { message: 'Student permanently deleted' };
    } else {
      // Soft delete - deactivate
      await query('UPDATE students SET status = $1 WHERE id = $2', ['inactive', studentId]);
      await query('UPDATE users SET is_active = FALSE WHERE id = $1', [userId]);
      await this.logActivity(deletedBy, 'DEACTIVATE_STUDENT', 'admin', { studentId });
      return { message: 'Student deactivated successfully' };
    }
  }

  // Bulk upload students from CSV data
  async bulkUploadStudents(studentsData, createdBy) {
    const results = {
      success: [],
      failed: []
    };

    for (const student of studentsData) {
      try {
        // Handle both name and first_name/last_name combinations
        if (!student.name && student.first_name) {
          student.name = `${student.first_name} ${student.last_name || ''}`.trim();
        }
        
        const result = await this.addStudent(student, createdBy);
        results.success.push({
          email: student.email,
          name: student.name,
          roll_no: result.student.roll_no
        });
      } catch (error) {
        results.failed.push({
          email: student.email,
          name: student.name || `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Unknown',
          error: error.message
        });
      }
    }

    await this.logActivity(createdBy, 'BULK_UPLOAD_STUDENTS', 'admin', {
      total: studentsData.length,
      success: results.success.length,
      failed: results.failed.length
    });

    return results;
  }

  // Search students
  async searchStudents(searchTerm) {
    const result = await query(
      `SELECT s.id, s.roll_no, s.name, s.father_name, s.semester, s.status,
              u.email, d.name as department_name
       FROM students s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE s.name ILIKE $1 OR s.roll_no ILIKE $1 OR u.email ILIKE $1 OR s.cnic ILIKE $1
       ORDER BY s.name
       LIMIT 20`,
      [`%${searchTerm}%`]
    );

    return result.rows;
  }

  // ==================== TEACHER MANAGEMENT ====================

  // Add new teacher
  async addTeacher(teacherData, createdBy) {
    const { email, name, cnic, phone, designation, department_id, qualification, specialization, experience } = teacherData;

    const validation = validateRequired({ email, name }, ['email', 'name']);
    if (!validation.isValid) {
      throw { status: 400, message: validation.errors.join(', ') };
    }

    if (!isValidEmail(email)) {
      throw { status: 400, message: 'Invalid email format' };
    }

    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existingUser.rows.length > 0) {
      throw { status: 409, message: 'Email already registered' };
    }

    const client = await getClient();

    try {
      await client.query('BEGIN');

      const tempPassword = generatePassword(10);
      const hashedPassword = await bcrypt.hash(tempPassword, SALT_ROUNDS);

      const userResult = await client.query(
        `INSERT INTO users (email, password, role, is_active, email_verified, created_at)
         VALUES ($1, $2, 'teacher', TRUE, FALSE, NOW())
         RETURNING id`,
        [email.toLowerCase(), hashedPassword]
      );

      const userId = userResult.rows[0].id;

      const teacherResult = await client.query(
        `INSERT INTO teachers (user_id, name, cnic, phone, designation, department_id, qualification, specialization, experience, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')
         RETURNING *`,
        [userId, name, cnic, phone, designation, department_id, qualification, specialization, experience || 0]
      );

      await client.query(
        `INSERT INTO notification_preferences (user_id) VALUES ($1)`,
        [userId]
      );

      await client.query('COMMIT');

      sendEmail({
        to: email,
        ...emailTemplates.welcome(name, email, tempPassword)
      }).catch(console.error);

      await this.logActivity(createdBy, 'CREATE_TEACHER', 'admin', { teacherId: teacherResult.rows[0].id, email });

      return {
        teacher: teacherResult.rows[0],
        credentials: {
          email: email,
          tempPassword: tempPassword
        },
        message: 'Teacher created successfully. Credentials sent to email.'
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Get all teachers
  async getTeachers(filters = {}) {
    const { page = 1, limit = 10, search, department_id, designation, status } = filters;
    const { limit: queryLimit, offset } = paginate(page, limit);

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (t.name ILIKE $${paramIndex} OR t.cnic ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (department_id) {
      whereClause += ` AND t.department_id = $${paramIndex}`;
      params.push(department_id);
      paramIndex++;
    }

    if (designation) {
      whereClause += ` AND t.designation ILIKE $${paramIndex}`;
      params.push(`%${designation}%`);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND t.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM teachers t
       JOIN users u ON t.user_id = u.id
       ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT t.*, u.email, u.is_active as account_active, u.last_login,
              d.name as department_name, d.code as department_code
       FROM teachers t
       JOIN users u ON t.user_id = u.id
       LEFT JOIN departments d ON t.department_id = d.id
       ${whereClause}
       ORDER BY t.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, queryLimit, offset]
    );

    return paginationResponse(result.rows, total, page, limit);
  }

  // Get teacher by ID
  async getTeacherById(teacherId) {
    const result = await query(
      `SELECT t.*, u.email, u.is_active as account_active, u.last_login,
              d.name as department_name, d.code as department_code
       FROM teachers t
       JOIN users u ON t.user_id = u.id
       LEFT JOIN departments d ON t.department_id = d.id
       WHERE t.id = $1`,
      [teacherId]
    );

    if (result.rows.length === 0) {
      throw { status: 404, message: 'Teacher not found' };
    }

    // Get assigned courses
    const courses = await query(
      `SELECT cs.id as section_id, cs.section_name, c.code, c.name as course_name, c.credit_hours,
              sem.name as semester_name
       FROM course_sections cs
       JOIN courses c ON cs.course_id = c.id
       LEFT JOIN semesters sem ON cs.semester_id = sem.id
       WHERE cs.teacher_id = $1`,
      [teacherId]
    );

    return {
      ...result.rows[0],
      assigned_courses: courses.rows
    };
  }

  // Update teacher
  async updateTeacher(teacherId, updateData, updatedBy) {
    const { name, cnic, phone, designation, department_id, qualification, specialization, experience, status } = updateData;

    const existingTeacher = await query('SELECT id FROM teachers WHERE id = $1', [teacherId]);
    if (existingTeacher.rows.length === 0) {
      throw { status: 404, message: 'Teacher not found' };
    }

    const result = await query(
      `UPDATE teachers SET
       name = COALESCE($1, name),
       cnic = COALESCE($2, cnic),
       phone = COALESCE($3, phone),
       designation = COALESCE($4, designation),
       department_id = COALESCE($5, department_id),
       qualification = COALESCE($6, qualification),
       specialization = COALESCE($7, specialization),
       experience = COALESCE($8, experience),
       status = COALESCE($9, status),
       updated_at = NOW()
       WHERE id = $10
       RETURNING *`,
      [name, cnic, phone, designation, department_id, qualification, specialization, experience, status, teacherId]
    );

    await this.logActivity(updatedBy, 'UPDATE_TEACHER', 'admin', { teacherId, changes: updateData });

    return result.rows[0];
  }

  // Delete/Deactivate teacher
  async deleteTeacher(teacherId, deletedBy, permanent = false) {
    const existingTeacher = await query('SELECT id, user_id, name FROM teachers WHERE id = $1', [teacherId]);
    if (existingTeacher.rows.length === 0) {
      throw { status: 404, message: 'Teacher not found' };
    }

    const userId = existingTeacher.rows[0].user_id;

    if (permanent) {
      await query('DELETE FROM users WHERE id = $1', [userId]);
      await this.logActivity(deletedBy, 'DELETE_TEACHER_PERMANENT', 'admin', { teacherId });
      return { message: 'Teacher permanently deleted' };
    } else {
      await query('UPDATE teachers SET status = $1 WHERE id = $2', ['inactive', teacherId]);
      await query('UPDATE users SET is_active = FALSE WHERE id = $1', [userId]);
      await this.logActivity(deletedBy, 'DEACTIVATE_TEACHER', 'admin', { teacherId });
      return { message: 'Teacher deactivated successfully' };
    }
  }

  // Assign course to teacher
  async assignCourseToTeacher(teacherId, courseData, assignedBy) {
    const { course_id, semester_id, section_name, capacity, room_no } = courseData;

    // Verify teacher exists
    const teacher = await query('SELECT id FROM teachers WHERE id = $1', [teacherId]);
    if (teacher.rows.length === 0) {
      throw { status: 404, message: 'Teacher not found' };
    }

    // Check if section already exists
    const existingSection = await query(
      `SELECT id FROM course_sections WHERE course_id = $1 AND semester_id = $2 AND section_name = $3`,
      [course_id, semester_id, section_name || 'A']
    );

    let result;
    if (existingSection.rows.length > 0) {
      // Update existing section
      result = await query(
        `UPDATE course_sections SET teacher_id = $1, capacity = COALESCE($2, capacity), room_no = COALESCE($3, room_no)
         WHERE id = $4 RETURNING *`,
        [teacherId, capacity, room_no, existingSection.rows[0].id]
      );
    } else {
      // Create new section
      result = await query(
        `INSERT INTO course_sections (course_id, semester_id, teacher_id, section_name, capacity, room_no)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [course_id, semester_id, teacherId, section_name || 'A', capacity || 50, room_no]
      );
    }

    await this.logActivity(assignedBy, 'ASSIGN_COURSE', 'admin', { teacherId, courseData });

    return {
      section: result.rows[0],
      message: 'Course assigned successfully'
    };
  }

  // ==================== ADMIN MANAGEMENT ====================

  // Add new admin
  async addAdmin(adminData, createdBy) {
    const { email, name, admin_role } = adminData;

    const validation = validateRequired({ email, name }, ['email', 'name']);
    if (!validation.isValid) {
      throw { status: 400, message: validation.errors.join(', ') };
    }

    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existingUser.rows.length > 0) {
      throw { status: 409, message: 'Email already registered' };
    }

    const client = await getClient();

    try {
      await client.query('BEGIN');

      const tempPassword = generatePassword(10);
      const hashedPassword = await bcrypt.hash(tempPassword, SALT_ROUNDS);

      const userResult = await client.query(
        `INSERT INTO users (email, password, role, is_active, email_verified, created_at)
         VALUES ($1, $2, 'admin', TRUE, TRUE, NOW())
         RETURNING id`,
        [email.toLowerCase(), hashedPassword]
      );

      const userId = userResult.rows[0].id;

      const adminResult = await client.query(
        `INSERT INTO admins (user_id, name, role)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [userId, name, admin_role || 'admin']
      );

      await client.query('COMMIT');

      sendEmail({
        to: email,
        ...emailTemplates.welcome(name, email, tempPassword)
      }).catch(console.error);

      await this.logActivity(createdBy, 'CREATE_ADMIN', 'admin', { adminId: adminResult.rows[0].id });

      return {
        admin: adminResult.rows[0],
        credentials: { email, tempPassword },
        message: 'Admin created successfully'
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Get all admins
  async getAdmins() {
    const result = await query(
      `SELECT a.*, u.email, u.is_active, u.last_login, u.created_at as account_created
       FROM admins a
       JOIN users u ON a.user_id = u.id
       ORDER BY a.created_at DESC`
    );

    return result.rows;
  }

  // Update admin role
  async updateAdminRole(adminId, newRole, updatedBy) {
    const validRoles = ['super_admin', 'admin', 'moderator'];
    if (!validRoles.includes(newRole)) {
      throw { status: 400, message: 'Invalid role' };
    }

    const result = await query(
      `UPDATE admins SET role = $1 WHERE id = $2 RETURNING *`,
      [newRole, adminId]
    );

    if (result.rows.length === 0) {
      throw { status: 404, message: 'Admin not found' };
    }

    await this.logActivity(updatedBy, 'UPDATE_ADMIN_ROLE', 'admin', { adminId, newRole });

    return result.rows[0];
  }

  // ==================== DEPARTMENT MANAGEMENT ====================

  async getDepartments() {
    const result = await query(
      `SELECT d.*, t.name as hod_name,
              (SELECT COUNT(*) FROM students s WHERE s.department_id = d.id) as student_count,
              (SELECT COUNT(*) FROM teachers te WHERE te.department_id = d.id) as teacher_count
       FROM departments d
       LEFT JOIN teachers t ON d.hod_teacher_id = t.id
       ORDER BY d.name`
    );
    return result.rows;
  }

  async addDepartment(deptData, createdBy) {
    const { name, code, description, hod_teacher_id } = deptData;

    const result = await query(
      `INSERT INTO departments (name, code, description, hod_teacher_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, code, description, hod_teacher_id]
    );

    await this.logActivity(createdBy, 'CREATE_DEPARTMENT', 'admin', { departmentId: result.rows[0].id });

    return result.rows[0];
  }

  async updateDepartment(deptId, updateData, updatedBy) {
    const { name, code, description, hod_teacher_id, is_active } = updateData;

    const result = await query(
      `UPDATE departments SET
       name = COALESCE($1, name),
       code = COALESCE($2, code),
       description = COALESCE($3, description),
       hod_teacher_id = COALESCE($4, hod_teacher_id),
       is_active = COALESCE($5, is_active)
       WHERE id = $6
       RETURNING *`,
      [name, code, description, hod_teacher_id, is_active, deptId]
    );

    if (result.rows.length === 0) {
      throw { status: 404, message: 'Department not found' };
    }

    await this.logActivity(updatedBy, 'UPDATE_DEPARTMENT', 'admin', { deptId, changes: updateData });

    return result.rows[0];
  }

  // Get department statistics
  async getDepartmentStats(deptId) {
    const result = await query(
      `SELECT d.*,
              t.name as hod_name,
              (SELECT COUNT(*) FROM students s WHERE s.department_id = d.id AND s.status = 'active') as total_students,
              (SELECT COUNT(*) FROM teachers te WHERE te.department_id = d.id AND te.status = 'active') as total_teachers,
              (SELECT COUNT(*) FROM courses c WHERE c.department_id = d.id AND c.is_active = TRUE) as total_courses,
              (SELECT json_agg(json_build_object('semester', semester, 'count', cnt)) 
               FROM (SELECT semester, COUNT(*) as cnt FROM students WHERE department_id = d.id AND status = 'active' GROUP BY semester ORDER BY semester) sub
              ) as students_by_semester
       FROM departments d
       LEFT JOIN teachers t ON d.hod_teacher_id = t.id
       WHERE d.id = $1`,
      [deptId]
    );

    if (result.rows.length === 0) {
      throw { status: 404, message: 'Department not found' };
    }

    return result.rows[0];
  }

  // ==================== SESSION MANAGEMENT ====================

  async createSession(sessionData, createdBy) {
    const { name, start_date, end_date, is_active } = sessionData;

    // Validate required fields
    const validation = validateRequired({ name, start_date, end_date }, ['name', 'start_date', 'end_date']);
    if (!validation.isValid) {
      throw { status: 400, message: validation.errors.join(', ') };
    }

    const client = await getClient();

    try {
      await client.query('BEGIN');

      // If this session is active, deactivate other sessions
      if (is_active) {
        await client.query(`UPDATE sessions SET is_active = FALSE WHERE is_active = TRUE`);
      }

      const result = await client.query(
        `INSERT INTO sessions (name, start_date, end_date, is_active)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [name, start_date, end_date, is_active || false]
      );

      await client.query('COMMIT');

      await this.logActivity(createdBy, 'CREATE_SESSION', 'admin', { sessionId: result.rows[0].id, name });

      return result.rows[0];

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getSessions(includeInactive = true) {
    const whereClause = includeInactive ? '' : 'WHERE is_active = TRUE';
    const result = await query(
      `SELECT s.*,
              (SELECT COUNT(*) FROM semesters sem WHERE sem.session_id = s.id) as semester_count
       FROM sessions s
       ${whereClause}
       ORDER BY s.start_date DESC`
    );
    return result.rows;
  }

  async updateSession(sessionId, updateData, updatedBy) {
    const { name, start_date, end_date, is_active } = updateData;

    const client = await getClient();

    try {
      await client.query('BEGIN');

      // If setting as active, deactivate other sessions
      if (is_active) {
        await client.query(`UPDATE sessions SET is_active = FALSE WHERE is_active = TRUE AND id != $1`, [sessionId]);
      }

      const result = await client.query(
        `UPDATE sessions SET
         name = COALESCE($1, name),
         start_date = COALESCE($2, start_date),
         end_date = COALESCE($3, end_date),
         is_active = COALESCE($4, is_active)
         WHERE id = $5
         RETURNING *`,
        [name, start_date, end_date, is_active, sessionId]
      );

      if (result.rows.length === 0) {
        throw { status: 404, message: 'Session not found' };
      }

      await client.query('COMMIT');

      await this.logActivity(updatedBy, 'UPDATE_SESSION', 'admin', { sessionId, changes: updateData });

      return result.rows[0];

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ==================== SEMESTER MANAGEMENT ====================

  async createSemester(semesterData, createdBy) {
    const { session_id, name, number, start_date, end_date, is_active } = semesterData;

    // Validate required fields
    const validation = validateRequired({ session_id, name, number }, ['session_id', 'name', 'number']);
    if (!validation.isValid) {
      throw { status: 400, message: validation.errors.join(', ') };
    }

    // Check if session exists
    const sessionExists = await query('SELECT id FROM sessions WHERE id = $1', [session_id]);
    if (sessionExists.rows.length === 0) {
      throw { status: 404, message: 'Academic session not found' };
    }

    const client = await getClient();

    try {
      await client.query('BEGIN');

      // If this semester is active, deactivate other semesters
      if (is_active) {
        await client.query(`UPDATE semesters SET is_active = FALSE WHERE is_active = TRUE`);
      }

      const result = await client.query(
        `INSERT INTO semesters (session_id, name, number, start_date, end_date, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [session_id, name, number, start_date, end_date, is_active || false]
      );

      await client.query('COMMIT');

      await this.logActivity(createdBy, 'CREATE_SEMESTER', 'admin', { semesterId: result.rows[0].id, name });

      return result.rows[0];

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getSemesters(filters = {}) {
    const { session_id, is_active } = filters;
    
    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (session_id) {
      whereConditions.push(`sem.session_id = $${paramIndex++}`);
      params.push(session_id);
    }
    if (is_active !== undefined) {
      whereConditions.push(`sem.is_active = $${paramIndex++}`);
      params.push(is_active);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT sem.*, s.name as session_name,
              (SELECT COUNT(*) FROM course_sections cs WHERE cs.semester_id = sem.id) as course_count
       FROM semesters sem
       LEFT JOIN sessions s ON sem.session_id = s.id
       ${whereClause}
       ORDER BY sem.start_date DESC`,
      params
    );

    return result.rows;
  }

  async getSemesterDetails(semesterId) {
    const result = await query(
      `SELECT sem.*, s.name as session_name,
              (SELECT COUNT(*) FROM course_sections cs WHERE cs.semester_id = sem.id) as total_courses,
              (SELECT COUNT(DISTINCT cs.teacher_id) FROM course_sections cs WHERE cs.semester_id = sem.id) as total_teachers,
              (SELECT json_agg(json_build_object(
                'id', cs.id, 
                'course_name', c.name, 
                'course_code', c.code,
                'teacher_name', t.name,
                'section', cs.section_name
              ))
               FROM course_sections cs
               JOIN courses c ON cs.course_id = c.id
               LEFT JOIN teachers t ON cs.teacher_id = t.id
               WHERE cs.semester_id = sem.id
              ) as courses
       FROM semesters sem
       LEFT JOIN sessions s ON sem.session_id = s.id
       WHERE sem.id = $1`,
      [semesterId]
    );

    if (result.rows.length === 0) {
      throw { status: 404, message: 'Semester not found' };
    }

    return result.rows[0];
  }

  async updateSemester(semesterId, updateData, updatedBy) {
    const { name, number, start_date, end_date, is_active } = updateData;

    const client = await getClient();

    try {
      await client.query('BEGIN');

      // If setting as active, deactivate other semesters
      if (is_active) {
        await client.query(`UPDATE semesters SET is_active = FALSE WHERE is_active = TRUE AND id != $1`, [semesterId]);
      }

      const result = await client.query(
        `UPDATE semesters SET
         name = COALESCE($1, name),
         number = COALESCE($2, number),
         start_date = COALESCE($3, start_date),
         end_date = COALESCE($4, end_date),
         is_active = COALESCE($5, is_active)
         WHERE id = $6
         RETURNING *`,
        [name, number, start_date, end_date, is_active, semesterId]
      );

      if (result.rows.length === 0) {
        throw { status: 404, message: 'Semester not found' };
      }

      await client.query('COMMIT');

      await this.logActivity(updatedBy, 'UPDATE_SEMESTER', 'admin', { semesterId, changes: updateData });

      return result.rows[0];

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ==================== COURSE MANAGEMENT ====================

  async createCourse(courseData, createdBy) {
    const { code, name, description, credit_hours, department_id, semester_number } = courseData;

    // Validate required fields
    const validation = validateRequired({ code, name, department_id }, ['code', 'name', 'department_id']);
    if (!validation.isValid) {
      throw { status: 400, message: validation.errors.join(', ') };
    }

    // Check if course code exists
    const existingCourse = await query('SELECT id FROM courses WHERE code = $1', [code]);
    if (existingCourse.rows.length > 0) {
      throw { status: 409, message: 'Course code already exists' };
    }

    // Check if department exists
    const deptExists = await query('SELECT id FROM departments WHERE id = $1', [department_id]);
    if (deptExists.rows.length === 0) {
      throw { status: 404, message: 'Department not found' };
    }

    const result = await query(
      `INSERT INTO courses (code, name, description, credit_hours, department_id, semester_number)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [code, name, description, credit_hours || 3, department_id, semester_number || null]
    );

    await this.logActivity(createdBy, 'CREATE_COURSE', 'admin', { courseId: result.rows[0].id, code, name });

    return result.rows[0];
  }

  async getCourses(filters = {}) {
    const { department_id, is_active, search } = filters;
    
    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (department_id) {
      whereConditions.push(`c.department_id = $${paramIndex++}`);
      params.push(department_id);
    }
    if (is_active !== undefined) {
      whereConditions.push(`c.is_active = $${paramIndex++}`);
      params.push(is_active);
    }
    if (search) {
      whereConditions.push(`(c.name ILIKE $${paramIndex} OR c.code ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT c.*, d.name as department_name, d.code as department_code,
              (SELECT COUNT(*) FROM course_prerequisites cp WHERE cp.course_id = c.id) as prerequisite_count,
              (SELECT COUNT(*) FROM course_sections cs WHERE cs.course_id = c.id) as section_count
       FROM courses c
       LEFT JOIN departments d ON c.department_id = d.id
       ${whereClause}
       ORDER BY c.department_id, c.code`,
      params
    );

    return result.rows;
  }

  async getCourseDetails(courseId) {
    const result = await query(
      `SELECT c.*, d.name as department_name, d.code as department_code,
              (SELECT json_agg(json_build_object(
                'id', pc.id, 
                'code', pc.code, 
                'name', pc.name
              ))
               FROM course_prerequisites cp
               JOIN courses pc ON cp.prerequisite_course_id = pc.id
               WHERE cp.course_id = c.id
              ) as prerequisites,
              (SELECT json_agg(json_build_object(
                'id', cs.id,
                'semester_name', sem.name,
                'teacher_name', t.name,
                'section', cs.section_name
              ))
               FROM course_sections cs
               JOIN semesters sem ON cs.semester_id = sem.id
               LEFT JOIN teachers t ON cs.teacher_id = t.id
               WHERE cs.course_id = c.id
               ORDER BY sem.start_date DESC
               LIMIT 5
              ) as recent_sections
       FROM courses c
       LEFT JOIN departments d ON c.department_id = d.id
       WHERE c.id = $1`,
      [courseId]
    );

    if (result.rows.length === 0) {
      throw { status: 404, message: 'Course not found' };
    }

    return result.rows[0];
  }

  async updateCourse(courseId, updateData, updatedBy) {
    const { code, name, description, credit_hours, department_id, semester_number, is_active } = updateData;

    // Check if new code already exists (if changing)
    if (code) {
      const existingCourse = await query('SELECT id FROM courses WHERE code = $1 AND id != $2', [code, courseId]);
      if (existingCourse.rows.length > 0) {
        throw { status: 409, message: 'Course code already exists' };
      }
    }

    const result = await query(
      `UPDATE courses SET
       code = COALESCE($1, code),
       name = COALESCE($2, name),
       description = COALESCE($3, description),
       credit_hours = COALESCE($4, credit_hours),
       department_id = COALESCE($5, department_id),
       semester_number = COALESCE($6, semester_number),
       is_active = COALESCE($7, is_active)
       WHERE id = $8
       RETURNING *`,
      [code, name, description, credit_hours, department_id, semester_number, is_active, courseId]
    );

    if (result.rows.length === 0) {
      throw { status: 404, message: 'Course not found' };
    }

    await this.logActivity(updatedBy, 'UPDATE_COURSE', 'admin', { courseId, changes: updateData });

    return result.rows[0];
  }

  async deleteCourse(courseId, permanent, deletedBy) {
    // Check if course has sections
    const hasSections = await query('SELECT id FROM course_sections WHERE course_id = $1 LIMIT 1', [courseId]);
    
    if (hasSections.rows.length > 0 && permanent) {
      throw { status: 400, message: 'Cannot permanently delete course with existing sections. Deactivate instead.' };
    }

    let result;

    if (permanent) {
      // Delete prerequisites first
      await query('DELETE FROM course_prerequisites WHERE course_id = $1 OR prerequisite_course_id = $1', [courseId]);
      
      result = await query('DELETE FROM courses WHERE id = $1 RETURNING id, code, name', [courseId]);
    } else {
      // Soft delete - deactivate
      result = await query(
        `UPDATE courses SET is_active = FALSE WHERE id = $1 RETURNING id, code, name`,
        [courseId]
      );
    }

    if (result.rows.length === 0) {
      throw { status: 404, message: 'Course not found' };
    }

    await this.logActivity(deletedBy, permanent ? 'DELETE_COURSE' : 'DEACTIVATE_COURSE', 'admin', { courseId });

    return {
      message: permanent ? 'Course deleted permanently' : 'Course deactivated successfully',
      course: result.rows[0]
    };
  }

  async addCoursePrerequisite(courseId, prerequisiteId, createdBy) {
    // Check if course exists
    const courseExists = await query('SELECT id FROM courses WHERE id = $1', [courseId]);
    if (courseExists.rows.length === 0) {
      throw { status: 404, message: 'Course not found' };
    }

    // Check if prerequisite exists
    const prereqExists = await query('SELECT id, name FROM courses WHERE id = $1', [prerequisiteId]);
    if (prereqExists.rows.length === 0) {
      throw { status: 404, message: 'Prerequisite course not found' };
    }

    // Check if same course
    if (courseId == prerequisiteId) {
      throw { status: 400, message: 'A course cannot be its own prerequisite' };
    }

    // Check if already exists
    const existing = await query(
      'SELECT id FROM course_prerequisites WHERE course_id = $1 AND prerequisite_course_id = $2',
      [courseId, prerequisiteId]
    );
    if (existing.rows.length > 0) {
      throw { status: 409, message: 'Prerequisite already added' };
    }

    const result = await query(
      `INSERT INTO course_prerequisites (course_id, prerequisite_course_id)
       VALUES ($1, $2)
       RETURNING *`,
      [courseId, prerequisiteId]
    );

    await this.logActivity(createdBy, 'ADD_PREREQUISITE', 'admin', { courseId, prerequisiteId });

    return {
      message: 'Prerequisite added successfully',
      prerequisite: prereqExists.rows[0]
    };
  }

  async removeCoursePrerequisite(courseId, prerequisiteId, removedBy) {
    const result = await query(
      'DELETE FROM course_prerequisites WHERE course_id = $1 AND prerequisite_course_id = $2 RETURNING id',
      [courseId, prerequisiteId]
    );

    if (result.rows.length === 0) {
      throw { status: 404, message: 'Prerequisite not found' };
    }

    await this.logActivity(removedBy, 'REMOVE_PREREQUISITE', 'admin', { courseId, prerequisiteId });

    return { message: 'Prerequisite removed successfully' };
  }

  // ==================== DASHBOARD STATS ====================

  async getDashboardStats() {
    const stats = await query(`
      SELECT
        (SELECT COUNT(*) FROM students WHERE status = 'active') as total_students,
        (SELECT COUNT(*) FROM teachers WHERE status = 'active') as total_teachers,
        (SELECT COUNT(*) FROM departments WHERE is_active = TRUE) as total_departments,
        (SELECT COUNT(*) FROM courses WHERE is_active = TRUE) as total_courses,
        (SELECT COUNT(*) FROM sessions WHERE is_active = TRUE) as active_sessions,
        (SELECT COUNT(*) FROM semesters WHERE is_active = TRUE) as active_semesters,
        (SELECT COUNT(*) FROM users WHERE last_login > NOW() - INTERVAL '7 days') as active_users_week,
        (SELECT COUNT(*) FROM students WHERE created_at > NOW() - INTERVAL '30 days') as new_students_month
    `);

    const recentActivities = await query(`
      SELECT al.*, u.email
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.timestamp DESC
      LIMIT 10
    `);

    // Get current session info
    const currentSession = await query(`
      SELECT s.*, 
             (SELECT name FROM semesters WHERE is_active = TRUE LIMIT 1) as active_semester_name
      FROM sessions s 
      WHERE s.is_active = TRUE 
      LIMIT 1
    `);

    return {
      stats: stats.rows[0],
      currentSession: currentSession.rows[0] || null,
      recentActivities: recentActivities.rows
    };
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

module.exports = new AdminService();
