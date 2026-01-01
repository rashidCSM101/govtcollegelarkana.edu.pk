const reEvaluationService = require('./re-evaluation.service');

class ReEvaluationController {

  // ==================== STUDENT ENDPOINTS ====================

  // Submit re-evaluation request
  async submitRequest(req, res, next) {
    try {
      const studentId = req.user.student_id;
      const result = await reEvaluationService.submitRequest(studentId, req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Pay re-evaluation fee
  async payFee(req, res, next) {
    try {
      const studentId = req.user.student_id;
      const { requestId } = req.params;
      const result = await reEvaluationService.payFee(studentId, requestId, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // Get student's re-evaluation requests
  async getStudentRequests(req, res, next) {
    try {
      const studentId = req.user.student_id;
      const result = await reEvaluationService.getStudentRequests(studentId, req.query);
      res.json({
        message: 'Re-evaluation requests fetched successfully',
        requests: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Get request status
  async getRequestStatus(req, res, next) {
    try {
      const studentId = req.user.student_id;
      const { requestId } = req.params;
      const result = await reEvaluationService.getRequestStatus(studentId, requestId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // ==================== ADMIN ENDPOINTS ====================

  // Get all re-evaluation requests
  async getRequests(req, res, next) {
    try {
      const result = await reEvaluationService.getRequests(req.query);
      res.json({
        message: 'Re-evaluation requests fetched successfully',
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  // Approve/Reject request
  async processRequest(req, res, next) {
    try {
      const userId = req.user.id;
      const { requestId } = req.params;
      const result = await reEvaluationService.processRequest(userId, requestId, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // Assign to teacher
  async assignToTeacher(req, res, next) {
    try {
      const userId = req.user.id;
      const { requestId } = req.params;
      const result = await reEvaluationService.assignToTeacher(userId, requestId, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // Get statistics
  async getStatistics(req, res, next) {
    try {
      const result = await reEvaluationService.getStatistics(req.query);
      res.json({
        message: 'Statistics fetched successfully',
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== TEACHER ENDPOINTS ====================

  // Get assigned requests
  async getAssignedRequests(req, res, next) {
    try {
      const teacherId = req.user.teacher_id;
      const result = await reEvaluationService.getAssignedRequests(teacherId);
      res.json({
        message: 'Assigned re-evaluation requests fetched successfully',
        requests: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Update result
  async updateResult(req, res, next) {
    try {
      const teacherId = req.user.teacher_id;
      const { requestId } = req.params;
      const result = await reEvaluationService.updateResult(teacherId, requestId, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ReEvaluationController();
