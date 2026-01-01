const feeService = require('./fee.service');

class FeeController {

  // ==================== FEE STRUCTURE ENDPOINTS ====================

  // Create fee structure
  async createFeeStructure(req, res, next) {
    try {
      const result = await feeService.createFeeStructure(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Get fee structures
  async getFeeStructures(req, res, next) {
    try {
      const result = await feeService.getFeeStructures(req.query);
      res.json({
        message: 'Fee structures fetched successfully',
        fee_structures: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Update fee structure
  async updateFeeStructure(req, res, next) {
    try {
      const { id } = req.params;
      const result = await feeService.updateFeeStructure(id, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // ==================== STUDENT FEE ASSIGNMENT ENDPOINTS ====================

  // Auto-assign fees
  async autoAssignFees(req, res, next) {
    try {
      const result = await feeService.autoAssignFees(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Manual assign fee
  async manualAssignFee(req, res, next) {
    try {
      const result = await feeService.manualAssignFee(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Get student fees (student view)
  async getStudentFees(req, res, next) {
    try {
      const studentId = req.user.student_id;
      const result = await feeService.getStudentFees(studentId, req.query);
      res.json({
        message: 'Student fees fetched successfully',
        fees: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Get fee history
  async getFeeHistory(req, res, next) {
    try {
      const studentId = req.user.student_id;
      const result = await feeService.getFeeHistory(studentId);
      res.json({
        message: 'Fee history fetched successfully',
        payments: result
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== VOUCHER ENDPOINTS ====================

  // Generate voucher
  async generateVoucher(req, res, next) {
    try {
      const result = await feeService.generateVoucher(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Get voucher (student view)
  async getVoucher(req, res, next) {
    try {
      const studentId = req.user.student_id;
      const { feeId } = req.params;
      const result = await feeService.getVoucher(studentId, feeId);
      res.json({
        message: 'Voucher fetched successfully',
        voucher: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Download voucher PDF
  async downloadVoucher(req, res, next) {
    try {
      const studentId = req.user.student_id;
      const { feeId } = req.params;
      const pdfBuffer = await feeService.generateVoucherPDF(studentId, feeId);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=fee-voucher-${feeId}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  }

  // ==================== PAYMENT ENDPOINTS ====================

  // Record payment (admin)
  async recordPayment(req, res, next) {
    try {
      const userId = req.user.id;
      const result = await feeService.recordPayment(userId, req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Pay online (student)
  async payOnline(req, res, next) {
    try {
      const studentId = req.user.student_id;
      const result = await feeService.processOnlinePayment(studentId, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // Verify payment
  async verifyPayment(req, res, next) {
    try {
      const { transactionId } = req.params;
      const result = await feeService.verifyPayment(transactionId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // Get receipts (student)
  async getReceipts(req, res, next) {
    try {
      const studentId = req.user.student_id;
      const result = await feeService.getReceipts(studentId);
      res.json({
        message: 'Receipts fetched successfully',
        receipts: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Download receipt PDF
  async downloadReceipt(req, res, next) {
    try {
      const studentId = req.user.student_id;
      const { id } = req.params;
      const pdfBuffer = await feeService.generateReceiptPDF(id, studentId);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=receipt-${id}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  }

  // ==================== REPORTS ENDPOINTS ====================

  // Get unpaid fees report
  async getUnpaidFeesReport(req, res, next) {
    try {
      const result = await feeService.getUnpaidFeesReport(req.query);
      res.json({
        message: 'Unpaid fees report fetched successfully',
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  // Get collection report
  async getCollectionReport(req, res, next) {
    try {
      const result = await feeService.getCollectionReport(req.query);
      res.json({
        message: 'Collection report fetched successfully',
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  // Get fee statistics
  async getFeeStatistics(req, res, next) {
    try {
      const result = await feeService.getFeeStatistics(req.query);
      res.json({
        message: 'Fee statistics fetched successfully',
        ...result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new FeeController();
