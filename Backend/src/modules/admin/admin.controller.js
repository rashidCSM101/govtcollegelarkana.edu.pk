const adminService = require('./admin.service');
const csv = require('csv-parser');
const fs = require('fs');
const { Readable } = require('stream');

class AdminController {

  // ==================== STUDENT MANAGEMENT ====================

  // Add student
  async addStudent(req, res, next) {
    try {
      const result = await adminService.addStudent(req.body, req.user.userId);
      res.status(201).json({
        success: true,
        message: result.message,
        data: result.student,
        credentials: result.credentials
      });
    } catch (error) {
      next(error);
    }
  }

  // Get all students
  async getStudents(req, res, next) {
    try {
      const filters = {
        page: req.query.page,
        limit: req.query.limit,
        search: req.query.search,
        department_id: req.query.department_id,
        semester: req.query.semester,
        batch: req.query.batch,
        status: req.query.status
      };
      const result = await adminService.getStudents(filters);
      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  // Get student by ID
  async getStudentById(req, res, next) {
    try {
      const student = await adminService.getStudentById(req.params.id);
      res.status(200).json({
        success: true,
        data: student
      });
    } catch (error) {
      next(error);
    }
  }

  // Update student
  async updateStudent(req, res, next) {
    try {
      const student = await adminService.updateStudent(req.params.id, req.body, req.user.userId);
      res.status(200).json({
        success: true,
        message: 'Student updated successfully',
        data: student
      });
    } catch (error) {
      next(error);
    }
  }

  // Toggle student status
  async toggleStudentStatus(req, res, next) {
    try {
      const student = await adminService.toggleStudentStatus(req.params.id, req.user.userId);
      res.status(200).json({
        success: true,
        message: 'Student status updated successfully',
        data: student
      });
    } catch (error) {
      next(error);
    }
  }

  // Get student statistics
  async getStudentStatistics(req, res, next) {
    try {
      const statistics = await adminService.getStudentStatistics();
      res.status(200).json({
        success: true,
        data: statistics
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete student
  async deleteStudent(req, res, next) {
    try {
      const permanent = req.query.permanent === 'true';
      const result = await adminService.deleteStudent(req.params.id, req.user.userId, permanent);
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  // Bulk upload students
  async bulkUploadStudents(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'CSV file is required'
        });
      }

      const students = [];
      const fileContent = req.file.buffer.toString();
      
      // Parse CSV with proper quote handling
      const lines = fileContent.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'CSV file is empty or invalid'
        });
      }

      // Parse headers - remove asterisks and normalize
      const headerLine = lines[0];
      const headers = [];
      let current = '';
      let inQuotes = false;

      for (let char of headerLine) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          headers.push(current.trim().replace(/"/g, '').replace(/\*/g, '').replace(/\(.*?\)/g, '').toLowerCase().replace(/\s+/g, '_'));
          current = '';
        } else {
          current += char;
        }
      }
      headers.push(current.trim().replace(/"/g, '').replace(/\*/g, '').replace(/\(.*?\)/g, '').toLowerCase().replace(/\s+/g, '_'));
      
      // Parse data rows
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = [];
        current = '';
        inQuotes = false;

        for (let char of lines[i]) {
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim().replace(/^"|"$/g, ''));
            current = '';
          } else {
            current += char;
          }
        }
        values.push(current.trim().replace(/^"|"$/g, ''));

        if (values.length === headers.length) {
          const student = {};
          headers.forEach((header, index) => {
            student[header] = values[index] || null;
          });
          students.push(student);
        }
      }

      const result = await adminService.bulkUploadStudents(students, req.user.userId);
      
      res.status(200).json({
        success: true,
        message: `Processed ${students.length} students`,
        data: {
          total: students.length,
          success: result.success.length,
          failed: result.failed.length,
          successList: result.success,
          failedList: result.failed
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Search students
  async searchStudents(req, res, next) {
    try {
      const { q } = req.query;
      if (!q || q.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Search term must be at least 2 characters'
        });
      }
      const students = await adminService.searchStudents(q);
      res.status(200).json({
        success: true,
        data: students
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== TEACHER MANAGEMENT ====================

  // Add teacher
  async addTeacher(req, res, next) {
    try {
      const result = await adminService.addTeacher(req.body, req.user.userId);
      res.status(201).json({
        success: true,
        message: result.message,
        data: result.teacher,
        credentials: result.credentials
      });
    } catch (error) {
      next(error);
    }
  }

  // Get all teachers
  async getTeachers(req, res, next) {
    try {
      const filters = {
        page: req.query.page,
        limit: req.query.limit,
        search: req.query.search,
        department_id: req.query.department_id,
        designation: req.query.designation,
        status: req.query.status
      };
      const result = await adminService.getTeachers(filters);
      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  // Get teacher by ID
  async getTeacherById(req, res, next) {
    try {
      const teacher = await adminService.getTeacherById(req.params.id);
      res.status(200).json({
        success: true,
        data: teacher
      });
    } catch (error) {
      next(error);
    }
  }

  // Update teacher
  async updateTeacher(req, res, next) {
    try {
      const teacher = await adminService.updateTeacher(req.params.id, req.body, req.user.userId);
      res.status(200).json({
        success: true,
        message: 'Teacher updated successfully',
        data: teacher
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete teacher
  async deleteTeacher(req, res, next) {
    try {
      const permanent = req.query.permanent === 'true';
      const result = await adminService.deleteTeacher(req.params.id, req.user.userId, permanent);
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  // Toggle teacher status
  async toggleTeacherStatus(req, res, next) {
    try {
      const teacher = await adminService.toggleTeacherStatus(req.params.id, req.user.userId);
      res.status(200).json({
        success: true,
        message: 'Teacher status updated successfully',
        data: teacher
      });
    } catch (error) {
      next(error);
    }
  }

  // Get teacher statistics
  async getTeacherStatistics(req, res, next) {
    try {
      const statistics = await adminService.getTeacherStatistics();
      res.status(200).json({
        success: true,
        data: statistics
      });
    } catch (error) {
      next(error);
    }
  }

  // Assign course to teacher
  async assignCourseToTeacher(req, res, next) {
    try {
      const result = await adminService.assignCourseToTeacher(req.params.id, req.body, req.user.userId);
      res.status(200).json({
        success: true,
        message: result.message,
        data: result.section
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== ADMIN MANAGEMENT ====================

  // Add admin
  async addAdmin(req, res, next) {
    try {
      const result = await adminService.addAdmin(req.body, req.user.userId);
      res.status(201).json({
        success: true,
        message: result.message,
        data: result.admin,
        credentials: result.credentials
      });
    } catch (error) {
      next(error);
    }
  }

  // Get all admins
  async getAdmins(req, res, next) {
    try {
      const admins = await adminService.getAdmins();
      res.status(200).json({
        success: true,
        data: admins
      });
    } catch (error) {
      next(error);
    }
  }

  // Update admin role
  async updateAdminRole(req, res, next) {
    try {
      const { role } = req.body;
      const admin = await adminService.updateAdminRole(req.params.id, role, req.user.userId);
      res.status(200).json({
        success: true,
        message: 'Admin role updated successfully',
        data: admin
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== DEPARTMENT MANAGEMENT ====================

  // Get all departments
  async getDepartments(req, res, next) {
    try {
      const departments = await adminService.getDepartments();
      res.status(200).json({
        success: true,
        data: departments
      });
    } catch (error) {
      next(error);
    }
  }

  // Add department
  async addDepartment(req, res, next) {
    try {
      const department = await adminService.addDepartment(req.body, req.user.userId);
      res.status(201).json({
        success: true,
        message: 'Department created successfully',
        data: department
      });
    } catch (error) {
      next(error);
    }
  }

  // Update department
  async updateDepartment(req, res, next) {
    try {
      const department = await adminService.updateDepartment(req.params.id, req.body, req.user.userId);
      res.status(200).json({
        success: true,
        message: 'Department updated successfully',
        data: department
      });
    } catch (error) {
      next(error);
    }
  }

  // Get department statistics
  async getDepartmentStats(req, res, next) {
    try {
      const stats = await adminService.getDepartmentStats(req.params.id);
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== SESSION MANAGEMENT ====================

  // Create session
  async createSession(req, res, next) {
    try {
      const session = await adminService.createSession(req.body, req.user.userId);
      res.status(201).json({
        success: true,
        message: 'Academic session created successfully',
        data: session
      });
    } catch (error) {
      next(error);
    }
  }

  // Get all sessions
  async getSessions(req, res, next) {
    try {
      const includeInactive = req.query.all === 'true';
      const sessions = await adminService.getSessions(includeInactive);
      res.status(200).json({
        success: true,
        data: sessions
      });
    } catch (error) {
      next(error);
    }
  }

  // Update session
  async updateSession(req, res, next) {
    try {
      const session = await adminService.updateSession(req.params.id, req.body, req.user.userId);
      res.status(200).json({
        success: true,
        message: 'Session updated successfully',
        data: session
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== SEMESTER MANAGEMENT ====================

  // Create semester
  async createSemester(req, res, next) {
    try {
      const semester = await adminService.createSemester(req.body, req.user.userId);
      res.status(201).json({
        success: true,
        message: 'Semester created successfully',
        data: semester
      });
    } catch (error) {
      next(error);
    }
  }

  // Get all semesters
  async getSemesters(req, res, next) {
    try {
      const filters = {
        session_id: req.query.session_id,
        is_active: req.query.is_active === 'true' ? true : (req.query.is_active === 'false' ? false : undefined)
      };
      const semesters = await adminService.getSemesters(filters);
      res.status(200).json({
        success: true,
        data: semesters
      });
    } catch (error) {
      next(error);
    }
  }

  // Get semester details
  async getSemesterDetails(req, res, next) {
    try {
      const semester = await adminService.getSemesterDetails(req.params.id);
      res.status(200).json({
        success: true,
        data: semester
      });
    } catch (error) {
      next(error);
    }
  }

  // Update semester
  async updateSemester(req, res, next) {
    try {
      const semester = await adminService.updateSemester(req.params.id, req.body, req.user.userId);
      res.status(200).json({
        success: true,
        message: 'Semester updated successfully',
        data: semester
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== COURSE MANAGEMENT ====================

  // Create course
  async createCourse(req, res, next) {
    try {
      const course = await adminService.createCourse(req.body, req.user.userId);
      res.status(201).json({
        success: true,
        message: 'Course created successfully',
        data: course
      });
    } catch (error) {
      next(error);
    }
  }

  // Get all courses
  async getCourses(req, res, next) {
    try {
      const filters = {
        department_id: req.query.department_id,
        is_active: req.query.is_active === 'true' ? true : (req.query.is_active === 'false' ? false : undefined),
        search: req.query.search
      };
      const courses = await adminService.getCourses(filters);
      res.status(200).json({
        success: true,
        data: courses
      });
    } catch (error) {
      next(error);
    }
  }

  // Get course details
  async getCourseDetails(req, res, next) {
    try {
      const course = await adminService.getCourseDetails(req.params.id);
      res.status(200).json({
        success: true,
        data: course
      });
    } catch (error) {
      next(error);
    }
  }

  // Update course
  async updateCourse(req, res, next) {
    try {
      const course = await adminService.updateCourse(req.params.id, req.body, req.user.userId);
      res.status(200).json({
        success: true,
        message: 'Course updated successfully',
        data: course
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete course
  async deleteCourse(req, res, next) {
    try {
      const permanent = req.query.permanent === 'true';
      const result = await adminService.deleteCourse(req.params.id, permanent, req.user.userId);
      res.status(200).json({
        success: true,
        message: result.message,
        data: result.course
      });
    } catch (error) {
      next(error);
    }
  }

  // Add course prerequisite
  async addCoursePrerequisite(req, res, next) {
    try {
      const { prerequisite_id } = req.body;
      const result = await adminService.addCoursePrerequisite(req.params.id, prerequisite_id, req.user.userId);
      res.status(201).json({
        success: true,
        message: result.message,
        data: result.prerequisite
      });
    } catch (error) {
      next(error);
    }
  }

  // Remove course prerequisite
  async removeCoursePrerequisite(req, res, next) {
    try {
      const result = await adminService.removeCoursePrerequisite(req.params.id, req.params.prereqId, req.user.userId);
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== DASHBOARD ====================

  // Get dashboard stats
  async getDashboardStats(req, res, next) {
    try {
      const stats = await adminService.getDashboardStats();
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminController();
