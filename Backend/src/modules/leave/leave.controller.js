const leaveService = require('./leave.service');
const { handleError } = require('../../utils/errorHandler');

class LeaveController {

  // ==================== STUDENT LEAVE ENDPOINTS ====================

  // Apply for leave
  async applyStudentLeave(req, res) {
    try {
      const result = await leaveService.applyStudentLeave(
        req.user.studentId,
        req.body
      );
      res.status(201).json(result);
    } catch (error) {
      handleError(res, error);
    }
  }

  // Get leave history
  async getStudentLeaveHistory(req, res) {
    try {
      const filters = {
        status: req.query.status,
        leave_type: req.query.leave_type,
        year: req.query.year,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50
      };
      const result = await leaveService.getStudentLeaveHistory(
        req.user.studentId,
        filters
      );
      res.json(result);
    } catch (error) {
      handleError(res, error);
    }
  }

  // Get leave balance
  async getStudentLeaveBalance(req, res) {
    try {
      const result = await leaveService.getStudentLeaveBalance(
        req.user.studentId
      );
      res.json(result);
    } catch (error) {
      handleError(res, error);
    }
  }

  // ==================== TEACHER APPROVAL ENDPOINTS ====================

  // Get pending leaves
  async getPendingLeaves(req, res) {
    try {
      const filters = {
        department_id: req.query.department_id,
        leave_type: req.query.leave_type,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50
      };
      const result = await leaveService.getPendingLeaves(
        req.user.teacherId,
        filters
      );
      res.json(result);
    } catch (error) {
      handleError(res, error);
    }
  }

  // Approve leave
  async approveLeave(req, res) {
    try {
      const { id } = req.params;
      const result = await leaveService.approveLeave(
        req.user.teacherId,
        id,
        req.body
      );
      res.json(result);
    } catch (error) {
      handleError(res, error);
    }
  }

  // Reject leave
  async rejectLeave(req, res) {
    try {
      const { id } = req.params;
      const result = await leaveService.rejectLeave(
        req.user.teacherId,
        id,
        req.body
      );
      res.json(result);
    } catch (error) {
      handleError(res, error);
    }
  }

  // ==================== TEACHER LEAVE ENDPOINTS ====================

  // Apply for teacher leave
  async applyTeacherLeave(req, res) {
    try {
      const result = await leaveService.applyTeacherLeave(
        req.user.teacherId,
        req.body
      );
      res.status(201).json(result);
    } catch (error) {
      handleError(res, error);
    }
  }

  // Get teacher's own leaves
  async getTeacherLeaves(req, res) {
    try {
      const filters = {
        status: req.query.status,
        year: req.query.year,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50
      };
      const result = await leaveService.getTeacherLeaves(
        req.user.teacherId,
        filters
      );
      res.json(result);
    } catch (error) {
      handleError(res, error);
    }
  }

  // Get teacher leave balance
  async getTeacherLeaveBalance(req, res) {
    try {
      const result = await leaveService.getTeacherLeaveBalance(
        req.user.teacherId
      );
      res.json(result);
    } catch (error) {
      handleError(res, error);
    }
  }

  // ==================== ADMIN ENDPOINTS ====================

  // Get all teacher leaves
  async getAllTeacherLeaves(req, res) {
    try {
      const filters = {
        status: req.query.status,
        teacher_id: req.query.teacher_id,
        department_id: req.query.department_id,
        leave_type: req.query.leave_type,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50
      };
      const result = await leaveService.getAllTeacherLeaves(filters);
      res.json(result);
    } catch (error) {
      handleError(res, error);
    }
  }

  // Approve teacher leave
  async approveTeacherLeave(req, res) {
    try {
      const { id } = req.params;
      const result = await leaveService.approveTeacherLeave(
        req.user.userId,
        id,
        req.body
      );
      res.json(result);
    } catch (error) {
      handleError(res, error);
    }
  }

  // Reject teacher leave
  async rejectTeacherLeave(req, res) {
    try {
      const { id } = req.params;
      const result = await leaveService.rejectTeacherLeave(
        req.user.userId,
        id
      );
      res.json(result);
    } catch (error) {
      handleError(res, error);
    }
  }

  // Get leave calendar
  async getLeaveCalendar(req, res) {
    try {
      const filters = {
        month: req.query.month,
        year: req.query.year,
        type: req.query.type
      };
      const result = await leaveService.getLeaveCalendar(filters);
      res.json(result);
    } catch (error) {
      handleError(res, error);
    }
  }
}

module.exports = new LeaveController();
