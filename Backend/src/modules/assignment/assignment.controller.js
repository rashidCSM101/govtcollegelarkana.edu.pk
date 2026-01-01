const assignmentService = require('./assignment.service');
const { handleError } = require('../../utils/errorHandler');

class AssignmentController {

  // ==================== TEACHER ENDPOINTS ====================

  // Create assignment
  async createAssignment(req, res) {
    try {
      const result = await assignmentService.createAssignment(
        req.user.userId,
        req.body
      );
      res.status(201).json(result);
    } catch (error) {
      handleError(res, error);
    }
  }

  // Get teacher's assignments
  async getTeacherAssignments(req, res) {
    try {
      const filters = {
        course_id: req.query.course_id,
        section_id: req.query.section_id,
        status: req.query.status,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50
      };
      const result = await assignmentService.getTeacherAssignments(
        req.user.userId,
        filters
      );
      res.json(result);
    } catch (error) {
      handleError(res, error);
    }
  }

  // Update assignment
  async updateAssignment(req, res) {
    try {
      const { id } = req.params;
      const result = await assignmentService.updateAssignment(
        req.user.userId,
        id,
        req.body
      );
      res.json(result);
    } catch (error) {
      handleError(res, error);
    }
  }

  // Get assignment submissions
  async getAssignmentSubmissions(req, res) {
    try {
      const { id } = req.params;
      const filters = {
        status: req.query.status,
        student_id: req.query.student_id
      };
      const result = await assignmentService.getAssignmentSubmissions(
        req.user.userId,
        id,
        filters
      );
      res.json(result);
    } catch (error) {
      handleError(res, error);
    }
  }

  // Grade submission
  async gradeSubmission(req, res) {
    try {
      const { id, submissionId } = req.params;
      const result = await assignmentService.gradeSubmission(
        req.user.userId,
        submissionId,
        req.body
      );
      res.json(result);
    } catch (error) {
      handleError(res, error);
    }
  }

  // Bulk grade submissions
  async bulkGrade(req, res) {
    try {
      const { id } = req.params;
      const result = await assignmentService.bulkGrade(
        req.user.userId,
        id,
        req.body
      );
      res.json(result);
    } catch (error) {
      handleError(res, error);
    }
  }

  // Get assignment analytics
  async getAssignmentAnalytics(req, res) {
    try {
      const { id } = req.params;
      const result = await assignmentService.getAssignmentAnalytics(
        req.user.userId,
        id
      );
      res.json(result);
    } catch (error) {
      handleError(res, error);
    }
  }

  // ==================== STUDENT ENDPOINTS ====================

  // Get student's assignments
  async getStudentAssignments(req, res) {
    try {
      const filters = {
        course_id: req.query.course_id,
        status: req.query.status,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50
      };
      const result = await assignmentService.getStudentAssignments(
        req.user.studentId,
        filters
      );
      res.json(result);
    } catch (error) {
      handleError(res, error);
    }
  }

  // Get assignment details
  async getAssignmentDetails(req, res) {
    try {
      const { id } = req.params;
      const result = await assignmentService.getAssignmentDetails(
        req.user.studentId,
        id
      );
      res.json(result);
    } catch (error) {
      handleError(res, error);
    }
  }

  // Submit assignment
  async submitAssignment(req, res) {
    try {
      const { id } = req.params;
      const result = await assignmentService.submitAssignment(
        req.user.studentId,
        id,
        req.body
      );
      res.status(201).json(result);
    } catch (error) {
      handleError(res, error);
    }
  }

  // Get submitted assignments
  async getSubmittedAssignments(req, res) {
    try {
      const result = await assignmentService.getSubmittedAssignments(
        req.user.studentId
      );
      res.json(result);
    } catch (error) {
      handleError(res, error);
    }
  }
}

module.exports = new AssignmentController();
