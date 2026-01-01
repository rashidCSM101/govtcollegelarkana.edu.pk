const idcardService = require('./idcard.service');
const fs = require('fs');

class IDCardController {

  // ==================== ADMIN ENDPOINTS ====================

  /**
   * Generate ID cards for students
   * POST /api/admin/generate-id-cards
   */
  async generateIDCards(req, res) {
    try {
      const adminId = req.user.id;
      const { department_id, session_id, semester_id, student_id } = req.body;

      const filters = {};
      if (department_id) filters.department_id = parseInt(department_id);
      if (session_id) filters.session_id = parseInt(session_id);
      if (semester_id) filters.semester_id = parseInt(semester_id);
      if (student_id) filters.student_id = parseInt(student_id);

      const result = await idcardService.generateIDCards(filters, adminId);

      res.status(201).json({
        success: true,
        message: result.message,
        data: {
          total: result.total,
          cards: result.cards
        }
      });

    } catch (error) {
      console.error('Generate ID Cards Error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to generate ID cards'
      });
    }
  }

  /**
   * Verify ID card by QR code
   * GET /api/admin/verify-id-card/:qrCode
   */
  async verifyIDCard(req, res) {
    try {
      const qrCode = req.params.qrCode;

      const result = await idcardService.verifyIDCard(qrCode);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Verify ID Card Error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to verify ID card'
      });
    }
  }

  /**
   * Get all ID cards (Admin view)
   * GET /api/admin/id-cards
   */
  async getAllIDCards(req, res) {
    try {
      const { department_id, session_id, status, expired } = req.query;

      const filters = {};
      if (department_id) filters.department_id = parseInt(department_id);
      if (session_id) filters.session_id = parseInt(session_id);
      if (status) filters.status = status;
      if (expired) filters.expired = expired;

      const idCards = await idcardService.getAllIDCards(filters);

      res.json({
        success: true,
        data: idCards,
        total: idCards.length
      });

    } catch (error) {
      console.error('Get All ID Cards Error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch ID cards'
      });
    }
  }

  /**
   * Get ID card statistics
   * GET /api/admin/id-cards/statistics
   */
  async getStatistics(req, res) {
    try {
      const stats = await idcardService.getIDCardStatistics();

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Get ID Card Statistics Error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch statistics'
      });
    }
  }

  // ==================== STUDENT ENDPOINTS ====================

  /**
   * Get student's ID card
   * GET /api/student/id-card
   */
  async getStudentIDCard(req, res) {
    try {
      const studentId = req.user.id;

      const idCard = await idcardService.getStudentIDCard(studentId);

      res.json({
        success: true,
        data: idCard
      });

    } catch (error) {
      console.error('Get Student ID Card Error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to fetch ID card'
      });
    }
  }

  /**
   * Download ID card PDF
   * GET /api/student/id-card/download
   */
  async downloadIDCard(req, res) {
    try {
      const studentId = req.user.id;

      const result = await idcardService.generateIDCardPDF(studentId);

      // Send file for download
      res.download(result.filePath, result.fileName, (err) => {
        if (err) {
          console.error('Download Error:', err);
          res.status(500).json({
            success: false,
            message: 'Failed to download ID card'
          });
        }

        // Optionally delete file after download
        // fs.unlinkSync(result.filePath);
      });

    } catch (error) {
      console.error('Download ID Card Error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to download ID card'
      });
    }
  }

  /**
   * Download ID card PDF (Admin)
   * GET /api/admin/id-card/download/:studentId
   */
  async downloadIDCardAdmin(req, res) {
    try {
      const studentId = parseInt(req.params.studentId);

      const result = await idcardService.generateIDCardPDF(studentId);

      // Send file for download
      res.download(result.filePath, result.fileName, (err) => {
        if (err) {
          console.error('Download Error:', err);
          res.status(500).json({
            success: false,
            message: 'Failed to download ID card'
          });
        }
      });

    } catch (error) {
      console.error('Download ID Card Admin Error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to download ID card'
      });
    }
  }
}

module.exports = new IDCardController();
