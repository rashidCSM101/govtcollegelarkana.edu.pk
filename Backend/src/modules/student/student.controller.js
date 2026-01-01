const studentService = require('./student.service');

class StudentController {

  // ==================== ENROLLMENT ====================

  // Enroll in semester
  async enrollInSemester(req, res, next) {
    try {
      const result = await studentService.enrollInSemester(req.user.userId, req.body);
      res.status(201).json({
        success: true,
        message: result.message,
        data: {
          enrollment: result.enrollment,
          session: result.session,
          semester: result.semester
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get enrollment history
  async getEnrollmentHistory(req, res, next) {
    try {
      const enrollments = await studentService.getEnrollmentHistory(req.user.userId);
      res.status(200).json({
        success: true,
        data: enrollments
      });
    } catch (error) {
      next(error);
    }
  }

  // Verify enrollment
  async verifyEnrollment(req, res, next) {
    try {
      const result = await studentService.verifyEnrollment(req.user.userId, req.params.semesterId);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== COURSE REGISTRATION ====================

  // Get available courses
  async getAvailableCourses(req, res, next) {
    try {
      const { semester_id } = req.query;
      if (!semester_id) {
        return res.status(400).json({
          success: false,
          message: 'semester_id is required'
        });
      }
      const courses = await studentService.getAvailableCourses(req.user.userId, semester_id);
      res.status(200).json({
        success: true,
        data: courses
      });
    } catch (error) {
      next(error);
    }
  }

  // Register for course
  async registerCourse(req, res, next) {
    try {
      const result = await studentService.registerCourse(req.user.userId, req.body);
      res.status(201).json({
        success: true,
        message: result.message,
        data: {
          registration: result.registration,
          course: result.course
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get registered courses
  async getRegisteredCourses(req, res, next) {
    try {
      const { semester_id } = req.query;
      const result = await studentService.getRegisteredCourses(req.user.userId, semester_id);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Drop course
  async dropCourse(req, res, next) {
    try {
      const result = await studentService.dropCourse(req.user.userId, req.params.id);
      res.status(200).json({
        success: true,
        message: result.message,
        data: result.dropped
      });
    } catch (error) {
      next(error);
    }
  }

  // Check prerequisites
  async checkPrerequisites(req, res, next) {
    try {
      const { course_id } = req.params;
      const studentResult = await require('../../config/database').query(
        'SELECT id FROM students WHERE user_id = $1',
        [req.user.userId]
      );
      if (studentResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Student profile not found'
        });
      }
      const result = await studentService.checkPrerequisites(studentResult.rows[0].id, course_id);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== WAITING LIST ====================

  // Add to waiting list
  async addToWaitingList(req, res, next) {
    try {
      const result = await studentService.addToWaitingList(req.user.userId, req.body);
      res.status(201).json({
        success: true,
        message: result.message,
        data: {
          waitingList: result.waitingList,
          course: result.course,
          position: result.position
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get waiting list
  async getWaitingList(req, res, next) {
    try {
      const waitingList = await studentService.getWaitingList(req.user.userId);
      res.status(200).json({
        success: true,
        data: waitingList
      });
    } catch (error) {
      next(error);
    }
  }

  // Remove from waiting list
  async removeFromWaitingList(req, res, next) {
    try {
      const result = await studentService.removeFromWaitingList(req.user.userId, req.params.id);
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== COURSE SECTIONS (Admin) ====================

  // Create section
  async createSection(req, res, next) {
    try {
      const section = await studentService.createSection(req.body, req.user.userId);
      res.status(201).json({
        success: true,
        message: 'Section created successfully',
        data: section
      });
    } catch (error) {
      next(error);
    }
  }

  // Get sections
  async getSections(req, res, next) {
    try {
      const filters = {
        course_id: req.query.course_id,
        semester_id: req.query.semester_id,
        teacher_id: req.query.teacher_id
      };
      const sections = await studentService.getCourseSections(filters);
      res.status(200).json({
        success: true,
        data: sections
      });
    } catch (error) {
      next(error);
    }
  }

  // Update section
  async updateSection(req, res, next) {
    try {
      const section = await studentService.updateSection(req.params.id, req.body, req.user.userId);
      res.status(200).json({
        success: true,
        message: 'Section updated successfully',
        data: section
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete section
  async deleteSection(req, res, next) {
    try {
      const result = await studentService.deleteSection(req.params.id, req.user.userId);
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new StudentController();
