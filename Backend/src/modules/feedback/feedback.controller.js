const feedbackService = require('./feedback.service');

class FeedbackController {
  // ==================== ADMIN ENDPOINTS ====================

  /**
   * Create feedback form
   * POST /api/admin/feedback-forms
   */
  async createFeedbackForm(req, res) {
    try {
      const adminId = req.user.id;
      const {
        form_type,
        title,
        description,
        questions,
        target_filters,
        is_anonymous,
        start_date,
        end_date
      } = req.body;

      // Validate required fields
      if (!form_type || !title || !questions || !start_date || !end_date) {
        return res.status(400).json({
          success: false,
          message: 'Form type, title, questions, start date, and end date are required'
        });
      }

      const result = await feedbackService.createFeedbackForm(
        form_type,
        title,
        description,
        questions,
        target_filters || {},
        is_anonymous || false,
        start_date,
        end_date,
        adminId
      );

      res.status(201).json({
        success: true,
        message: 'Feedback form created successfully',
        data: result
      });

    } catch (error) {
      console.error('Create Feedback Form Error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create feedback form'
      });
    }
  }

  /**
   * Get all feedback forms
   * GET /api/admin/feedback-forms
   */
  async getAllFeedbackForms(req, res) {
    try {
      const { form_type, status, page = 1, limit = 20 } = req.query;

      const filters = {};
      if (form_type) filters.form_type = form_type;
      if (status) filters.status = status;

      const result = await feedbackService.getAllFeedbackForms(
        filters,
        parseInt(page),
        parseInt(limit)
      );

      res.json({
        success: true,
        data: result.forms,
        pagination: result.pagination
      });

    } catch (error) {
      console.error('Get Feedback Forms Error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch feedback forms'
      });
    }
  }

  /**
   * Get feedback reports
   * GET /api/admin/feedback-reports
   */
  async getFeedbackReports(req, res) {
    try {
      const { 
        form_id, 
        teacher_id, 
        course_id, 
        department_id, 
        report_type 
      } = req.query;

      const filters = {};
      if (form_id) filters.form_id = parseInt(form_id);
      if (teacher_id) filters.teacher_id = parseInt(teacher_id);
      if (course_id) filters.course_id = parseInt(course_id);
      if (department_id) filters.department_id = parseInt(department_id);
      if (report_type) filters.report_type = report_type;

      const reports = await feedbackService.generateFeedbackReports(filters);

      res.json({
        success: true,
        data: reports
      });

    } catch (error) {
      console.error('Get Feedback Reports Error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate feedback reports'
      });
    }
  }

  // ==================== STUDENT ENDPOINTS ====================

  /**
   * Get available feedback forms for student
   * GET /api/student/feedback-forms
   */
  async getAvailableFeedbackForms(req, res) {
    try {
      const studentId = req.user.id;

      const forms = await feedbackService.getAvailableFeedbackForms(studentId);

      res.json({
        success: true,
        data: forms,
        total: forms.length
      });

    } catch (error) {
      console.error('Get Available Feedback Forms Error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch available feedback forms'
      });
    }
  }

  /**
   * Submit feedback
   * POST /api/student/feedback/submit
   */
  async submitFeedback(req, res) {
    try {
      const studentId = req.user.id;
      const { form_id, responses, is_anonymous } = req.body;

      if (!form_id || !responses) {
        return res.status(400).json({
          success: false,
          message: 'Form ID and responses are required'
        });
      }

      if (!Array.isArray(responses) || responses.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Responses must be a non-empty array'
        });
      }

      const result = await feedbackService.submitFeedback(
        parseInt(form_id),
        studentId,
        responses,
        is_anonymous || false
      );

      res.status(201).json({
        success: true,
        message: result.message,
        data: {
          submission_id: result.id,
          submitted_at: result.submitted_at
        }
      });

    } catch (error) {
      console.error('Submit Feedback Error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to submit feedback'
      });
    }
  }
}

module.exports = new FeedbackController();
