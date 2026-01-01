const admissionService = require('./admission.service');
const { handleError } = require('../../utils/errorHandler');

class AdmissionController {

  // Submit admission application (Public)
  async submitApplication(req, res) {
    try {
      const result = await admissionService.submitApplication(req.body);
      res.status(201).json(result);
    } catch (error) {
      handleError(res, error);
    }
  }

  // Get application status (Public)
  async getApplicationStatus(req, res) {
    try {
      const { applicationNo } = req.params;
      const result = await admissionService.getApplicationStatus(applicationNo);
      res.json(result);
    } catch (error) {
      handleError(res, error);
    }
  }

  // Get all applications (Admin)
  async getApplications(req, res) {
    try {
      const filters = {
        status: req.query.status,
        program_id: req.query.program_id,
        merit_threshold: req.query.merit_threshold,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50
      };
      const result = await admissionService.getApplications(filters);
      res.json(result);
    } catch (error) {
      handleError(res, error);
    }
  }

  // Review application (Admin)
  async reviewApplication(req, res) {
    try {
      const { id } = req.params;
      const result = await admissionService.reviewApplication(
        req.user.userId,
        id,
        req.body
      );
      res.json(result);
    } catch (error) {
      handleError(res, error);
    }
  }

  // Generate merit list (Admin)
  async generateMeritList(req, res) {
    try {
      const result = await admissionService.generateMeritList(req.body);
      res.json(result);
    } catch (error) {
      handleError(res, error);
    }
  }

  // Get merit list (Public)
  async getMeritList(req, res) {
    try {
      const filters = {
        program_id: req.query.program_id
      };
      const result = await admissionService.getMeritList(filters);
      res.json(result);
    } catch (error) {
      handleError(res, error);
    }
  }

  // Approve admission (Admin)
  async approveAdmission(req, res) {
    try {
      const { id } = req.params;
      const result = await admissionService.approveAdmission(
        req.user.userId,
        id,
        req.body
      );
      res.json(result);
    } catch (error) {
      handleError(res, error);
    }
  }

  // Generate admission letter (Admin/Student)
  async generateAdmissionLetter(req, res) {
    try {
      const { applicationNo } = req.params;
      const pdfBuffer = await admissionService.generateAdmissionLetter(applicationNo);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=admission-letter-${applicationNo}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      handleError(res, error);
    }
  }

  // Get admission statistics (Admin)
  async getStatistics(req, res) {
    try {
      const filters = {
        program_id: req.query.program_id,
        session_year: req.query.session_year
      };
      const result = await admissionService.getStatistics(filters);
      res.json(result);
    } catch (error) {
      handleError(res, error);
    }
  }
}

module.exports = new AdmissionController();
