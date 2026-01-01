const scholarshipService = require('./scholarship.service');

class ScholarshipController {

  // ==================== ADMIN ENDPOINTS ====================

  /**
   * Create scholarship program
   * POST /api/admin/scholarships
   */
  async createScholarship(req, res) {
    try {
      const adminId = req.user.id;
      const scholarshipData = {
        ...req.body,
        created_by: adminId
      };

      const scholarship = await scholarshipService.createScholarship(scholarshipData);

      res.status(201).json({
        success: true,
        message: 'Scholarship created successfully',
        data: scholarship
      });

    } catch (error) {
      console.error('Create Scholarship Error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create scholarship'
      });
    }
  }

  /**
   * Get all scholarships (Admin view)
   * GET /api/admin/scholarships
   */
  async getAllScholarships(req, res) {
    try {
      const { scholarship_type, status, session_id, semester_id, department_id } = req.query;

      const filters = {};
      if (scholarship_type) filters.scholarship_type = scholarship_type;
      if (status) filters.status = status;
      if (session_id) filters.session_id = parseInt(session_id);
      if (semester_id) filters.semester_id = parseInt(semester_id);
      if (department_id) filters.department_id = parseInt(department_id);

      const scholarships = await scholarshipService.getAllScholarships(filters);

      res.json({
        success: true,
        data: scholarships,
        total: scholarships.length
      });

    } catch (error) {
      console.error('Get All Scholarships Error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch scholarships'
      });
    }
  }

  /**
   * Get scholarship applications
   * GET /api/admin/scholarship/:id/applications
   */
  async getScholarshipApplications(req, res) {
    try {
      const scholarshipId = parseInt(req.params.id);
      const { status, department_id } = req.query;

      const filters = {};
      if (status) filters.status = status;
      if (department_id) filters.department_id = parseInt(department_id);

      const result = await scholarshipService.getScholarshipApplications(scholarshipId, filters);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Get Scholarship Applications Error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to fetch applications'
      });
    }
  }

  /**
   * Approve scholarship application
   * POST /api/admin/scholarship/application/:id/approve
   */
  async approveApplication(req, res) {
    try {
      const applicationId = parseInt(req.params.id);
      const adminId = req.user.id;
      const { review_remarks } = req.body;

      const result = await scholarshipService.approveApplication(
        applicationId,
        adminId,
        review_remarks
      );

      res.json({
        success: true,
        message: result.message
      });

    } catch (error) {
      console.error('Approve Application Error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to approve application'
      });
    }
  }

  /**
   * Reject scholarship application
   * POST /api/admin/scholarship/application/:id/reject
   */
  async rejectApplication(req, res) {
    try {
      const applicationId = parseInt(req.params.id);
      const adminId = req.user.id;
      const { review_remarks } = req.body;

      if (!review_remarks) {
        return res.status(400).json({
          success: false,
          message: 'Review remarks are required for rejection'
        });
      }

      const result = await scholarshipService.rejectApplication(
        applicationId,
        adminId,
        review_remarks
      );

      res.json({
        success: true,
        message: result.message
      });

    } catch (error) {
      console.error('Reject Application Error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to reject application'
      });
    }
  }

  /**
   * Process scholarship distribution
   * POST /api/admin/scholarship/distribution/:applicationId
   */
  async processDistribution(req, res) {
    try {
      const applicationId = parseInt(req.params.applicationId);
      const { semester_id, fee_id } = req.body;

      const distributionData = {
        semester_id: semester_id ? parseInt(semester_id) : null,
        fee_id: fee_id ? parseInt(fee_id) : null
      };

      const result = await scholarshipService.processDistribution(applicationId, distributionData);

      res.json({
        success: true,
        message: result.message,
        data: result.distribution
      });

    } catch (error) {
      console.error('Process Distribution Error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to process distribution'
      });
    }
  }

  /**
   * Get scholarship statistics
   * GET /api/admin/scholarship/statistics
   */
  async getStatistics(req, res) {
    try {
      const stats = await scholarshipService.getScholarshipStatistics();

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Get Scholarship Statistics Error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch statistics'
      });
    }
  }

  // ==================== STUDENT ENDPOINTS ====================

  /**
   * Get available scholarships (Student view)
   * GET /api/student/scholarships
   */
  async getAvailableScholarships(req, res) {
    try {
      const studentId = req.user.id;

      const scholarships = await scholarshipService.getAvailableScholarships(studentId);

      res.json({
        success: true,
        data: scholarships,
        total: scholarships.length
      });

    } catch (error) {
      console.error('Get Available Scholarships Error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch scholarships'
      });
    }
  }

  /**
   * Apply for scholarship
   * POST /api/student/scholarship/apply
   */
  async applyForScholarship(req, res) {
    try {
      const studentId = req.user.id;
      const { scholarship_id, ...applicationData } = req.body;

      if (!scholarship_id) {
        return res.status(400).json({
          success: false,
          message: 'Scholarship ID is required'
        });
      }

      const result = await scholarshipService.applyForScholarship(
        studentId,
        parseInt(scholarship_id),
        applicationData
      );

      res.status(201).json({
        success: true,
        message: result.message,
        data: result.application
      });

    } catch (error) {
      console.error('Apply For Scholarship Error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to apply for scholarship'
      });
    }
  }

  /**
   * Get student's application status
   * GET /api/student/scholarship/status
   */
  async getApplicationStatus(req, res) {
    try {
      const studentId = req.user.id;

      const applications = await scholarshipService.getStudentApplications(studentId);

      res.json({
        success: true,
        data: applications,
        total: applications.length
      });

    } catch (error) {
      console.error('Get Application Status Error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch application status'
      });
    }
  }
}

module.exports = new ScholarshipController();
