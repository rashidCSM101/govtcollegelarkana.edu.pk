const resultService = require('./result.service');

class ResultController {

  // ==================== GRADE SCALE ====================

  async getGradeScale(req, res, next) {
    try {
      const scale = await resultService.getGradeScale();
      res.json({
        success: true,
        data: scale
      });
    } catch (error) {
      next(error);
    }
  }

  async updateGradeScale(req, res, next) {
    try {
      const result = await resultService.updateGradeScale(req.body);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== MARKS ENTRY (Teacher) ====================

  async enterMarks(req, res, next) {
    try {
      const result = await resultService.enterMarks(req.user.id, req.body);
      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async editMarks(req, res, next) {
    try {
      const result = await resultService.editMarks(req.user.id, req.params.id, req.body);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async bulkUploadMarks(req, res, next) {
    try {
      const result = await resultService.bulkUploadMarks(req.user.id, req.body);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async lockMarks(req, res, next) {
    try {
      const result = await resultService.lockMarks(req.user.id, req.body);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== GRADE CALCULATION (Admin) ====================

  async calculateCourseGrades(req, res, next) {
    try {
      const result = await resultService.calculateCourseGrades(req.body);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async calculateSemesterGrades(req, res, next) {
    try {
      const result = await resultService.calculateSemesterGrades(req.body);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== GPA CALCULATION (Admin) ====================

  async calculateGPA(req, res, next) {
    try {
      const result = await resultService.calculateGPAForSemester(req.body);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getStudentCGPA(req, res, next) {
    try {
      const result = await resultService.calculateCGPA(req.params.studentId);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== RESULT PROCESSING (Admin) ====================

  async processResults(req, res, next) {
    try {
      const result = await resultService.processResults(req.body);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async promoteStudents(req, res, next) {
    try {
      const result = await resultService.promoteStudents(req.body);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== RESULT PUBLICATION (Admin) ====================

  async publishResults(req, res, next) {
    try {
      const result = await resultService.publishResults(req.body);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async freezeResults(req, res, next) {
    try {
      const result = await resultService.freezeResults(req.body);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== STUDENT RESULTS ====================

  async getStudentResults(req, res, next) {
    try {
      // If student is viewing their own results
      const studentId = req.params.studentId || req.user.studentId;
      const result = await resultService.getStudentResults(studentId);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getStudentSemesterResults(req, res, next) {
    try {
      const studentId = req.params.studentId || req.user.studentId;
      const { semesterId } = req.params;
      const result = await resultService.getStudentSemesterResults(studentId, semesterId);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getMyResults(req, res, next) {
    try {
      const result = await resultService.getStudentResults(req.user.studentId);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getMySemesterResults(req, res, next) {
    try {
      const { semesterId } = req.params;
      const result = await resultService.getStudentSemesterResults(req.user.studentId, semesterId);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== RESULT REPORTS (Admin) ====================

  async getClassResultSummary(req, res, next) {
    try {
      const { semester_id, department_id } = req.query;
      const result = await resultService.getClassResultSummary(semester_id, department_id);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getToppers(req, res, next) {
    try {
      const { semester_id, limit } = req.query;
      const result = await resultService.getToppers(semester_id, parseInt(limit) || 10);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ResultController();
