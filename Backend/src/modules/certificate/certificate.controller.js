const certificateService = require('./certificate.service');

class CertificateController {
  // ==================== STUDENT ENDPOINTS ====================

  /**
   * Request a certificate
   * POST /api/student/certificate/request
   */
  async requestCertificate(req, res) {
    try {
      const studentId = req.user.id;
      const { certificate_type, purpose, additional_details } = req.body;

      if (!certificate_type || !purpose) {
        return res.status(400).json({
          success: false,
          message: 'Certificate type and purpose are required'
        });
      }

      const result = await certificateService.requestCertificate(
        studentId,
        certificate_type,
        purpose,
        additional_details
      );

      res.status(201).json({
        success: true,
        message: 'Certificate request submitted successfully',
        data: result
      });

    } catch (error) {
      console.error('Request Certificate Error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to submit certificate request'
      });
    }
  }

  /**
   * Get student's certificate requests
   * GET /api/student/certificate/requests
   */
  async getStudentRequests(req, res) {
    try {
      const studentId = req.user.id;
      const { status, certificate_type, page = 1, limit = 10 } = req.query;

      const filters = {};
      if (status) filters.status = status;
      if (certificate_type) filters.certificate_type = certificate_type;

      const result = await certificateService.getStudentRequests(
        studentId,
        filters,
        parseInt(page),
        parseInt(limit)
      );

      res.json({
        success: true,
        data: result.requests,
        pagination: result.pagination
      });

    } catch (error) {
      console.error('Get Student Requests Error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch certificate requests'
      });
    }
  }

  // ==================== ADMIN ENDPOINTS ====================

  /**
   * Get pending certificate requests
   * GET /api/admin/certificate/pending
   */
  async getPendingRequests(req, res) {
    try {
      const { certificate_type, department_id, page = 1, limit = 20 } = req.query;

      const filters = {};
      if (certificate_type) filters.certificate_type = certificate_type;
      if (department_id) filters.department_id = parseInt(department_id);

      const result = await certificateService.getPendingRequests(
        filters,
        parseInt(page),
        parseInt(limit)
      );

      res.json({
        success: true,
        data: result.requests,
        pagination: result.pagination
      });

    } catch (error) {
      console.error('Get Pending Requests Error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch pending requests'
      });
    }
  }

  /**
   * Generate certificate
   * POST /api/admin/certificate/generate/:id
   */
  async generateCertificate(req, res) {
    try {
      const requestId = parseInt(req.params.id);
      const adminId = req.user.id;
      const { additional_info } = req.body;

      const result = await certificateService.generateCertificate(
        requestId,
        adminId,
        additional_info || {}
      );

      res.json({
        success: true,
        message: 'Certificate generated successfully',
        data: result
      });

    } catch (error) {
      console.error('Generate Certificate Error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to generate certificate'
      });
    }
  }

  /**
   * Download certificate
   * GET /api/admin/certificate/download/:id
   */
  async downloadCertificate(req, res) {
    try {
      const requestId = parseInt(req.params.id);

      const result = await certificateService.downloadCertificate(requestId);

      res.download(result.path, result.filename, (err) => {
        if (err) {
          console.error('Download Error:', err);
          res.status(500).json({
            success: false,
            message: 'Failed to download certificate'
          });
        }
      });

    } catch (error) {
      console.error('Download Certificate Error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to download certificate'
      });
    }
  }

  // ==================== PUBLIC ENDPOINTS ====================

  /**
   * Verify certificate by certificate number
   * GET /api/public/verify-certificate/:certNo
   */
  async verifyCertificate(req, res) {
    try {
      const certificateNumber = req.params.certNo;

      const result = await certificateService.verifyCertificate(certificateNumber);

      res.json({
        success: result.valid,
        message: result.message,
        data: result.certificate || null
      });

    } catch (error) {
      console.error('Verify Certificate Error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to verify certificate'
      });
    }
  }

  /**
   * Verify certificate by verification code
   * GET /api/public/verify-certificate-code/:code
   */
  async verifyCertificateByCode(req, res) {
    try {
      const verificationCode = req.params.code;

      const result = await certificateService.verifyCertificateByCode(verificationCode);

      res.json({
        success: result.valid,
        message: result.message,
        data: result.certificate || null
      });

    } catch (error) {
      console.error('Verify Certificate By Code Error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to verify certificate'
      });
    }
  }
}

module.exports = new CertificateController();
