const attendanceService = require('./attendance.service');

class AttendanceController {

  // ==================== TEACHER - MARK ATTENDANCE ====================

  // Mark single student attendance
  async markAttendance(req, res) {
    try {
      const result = await attendanceService.markAttendance(req.user.id, req.body);
      res.status(201).json(result);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || 'Error marking attendance' });
    }
  }

  // Bulk mark attendance
  async bulkMarkAttendance(req, res) {
    try {
      const result = await attendanceService.bulkMarkAttendance(req.user.id, req.body);
      res.status(201).json(result);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || 'Error marking bulk attendance' });
    }
  }

  // Edit attendance
  async editAttendance(req, res) {
    try {
      const result = await attendanceService.editAttendance(req.user.id, req.params.id, req.body);
      res.json(result);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || 'Error editing attendance' });
    }
  }

  // Get section attendance (Teacher view)
  async getSectionAttendance(req, res) {
    try {
      const result = await attendanceService.getSectionAttendance(req.user.id, req.params.sectionId, req.query);
      res.json(result);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || 'Error fetching section attendance' });
    }
  }

  // Get students list for marking
  async getStudentsForAttendance(req, res) {
    try {
      const { section_id, date } = req.query;
      if (!section_id || !date) {
        return res.status(400).json({ message: 'section_id and date are required' });
      }
      const result = await attendanceService.getStudentsForAttendance(req.user.id, section_id, date);
      res.json(result);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || 'Error fetching students' });
    }
  }

  // ==================== STUDENT - VIEW ATTENDANCE ====================

  // Get student attendance
  async getStudentAttendance(req, res) {
    try {
      const result = await attendanceService.getStudentAttendance(req.user.id, req.query);
      res.json(result);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || 'Error fetching attendance' });
    }
  }

  // Get student attendance summary
  async getStudentAttendanceSummary(req, res) {
    try {
      const { semester_id } = req.query;
      const result = await attendanceService.getStudentAttendanceSummary(req.user.id, semester_id);
      res.json(result);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || 'Error fetching attendance summary' });
    }
  }

  // Get student course attendance
  async getStudentCourseAttendance(req, res) {
    try {
      const { semester_id } = req.query;
      const result = await attendanceService.getStudentCourseAttendance(req.user.id, req.params.courseId, semester_id);
      res.json(result);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || 'Error fetching course attendance' });
    }
  }

  // ==================== ADMIN - REPORTS ====================

  // Get attendance reports
  async getAttendanceReports(req, res) {
    try {
      const result = await attendanceService.getAttendanceReports(req.query);
      res.json(result);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || 'Error fetching reports' });
    }
  }

  // Get defaulters list
  async getDefaultersList(req, res) {
    try {
      const result = await attendanceService.getDefaultersList(req.query);
      res.json(result);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || 'Error fetching defaulters' });
    }
  }

  // ==================== ANALYTICS ====================

  // Get attendance analytics
  async getAttendanceAnalytics(req, res) {
    try {
      const result = await attendanceService.getAttendanceAnalytics(req.query);
      res.json(result);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || 'Error fetching analytics' });
    }
  }
}

module.exports = new AttendanceController();
