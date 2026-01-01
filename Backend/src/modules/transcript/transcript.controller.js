const transcriptService = require('./transcript.service');

class TranscriptController {

  // ==================== DIGITAL MARKSHEET ====================

  async getMarksheet(req, res, next) {
    try {
      const studentId = req.params.studentId || req.user.studentId;
      const { semesterId } = req.params;
      const result = await transcriptService.getMarksheet(studentId, semesterId);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async downloadMarksheet(req, res, next) {
    try {
      const studentId = req.params.studentId || req.user.studentId;
      const { semesterId } = req.params;
      const pdfBuffer = await transcriptService.generateMarksheetPDF(studentId, semesterId);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=marksheet-sem${semesterId}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  }

  // ==================== TRANSCRIPT REQUESTS ====================

  async requestTranscript(req, res, next) {
    try {
      const studentId = req.user.studentId;
      const result = await transcriptService.requestTranscript(studentId, req.body);
      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getTranscriptRequests(req, res, next) {
    try {
      const result = await transcriptService.getTranscriptRequests(req.query);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async approveTranscript(req, res, next) {
    try {
      const { id } = req.params;
      const result = await transcriptService.processTranscriptRequest(req.user.id, id, {
        action: 'approve',
        remarks: req.body.remarks
      });
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async rejectTranscript(req, res, next) {
    try {
      const { id } = req.params;
      const result = await transcriptService.processTranscriptRequest(req.user.id, id, {
        action: 'reject',
        remarks: req.body.remarks
      });
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== STUDENT TRANSCRIPTS ====================

  async getStudentTranscripts(req, res, next) {
    try {
      const studentId = req.params.studentId || req.user.studentId;
      const result = await transcriptService.getStudentTranscripts(studentId);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getMyTranscripts(req, res, next) {
    try {
      const result = await transcriptService.getStudentTranscripts(req.user.studentId);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getMyTranscriptRequests(req, res, next) {
    try {
      const result = await transcriptService.getMyTranscriptRequests(req.user.studentId);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async downloadTranscript(req, res, next) {
    try {
      const studentId = req.params.studentId || req.user.studentId;
      const { transcriptId } = req.params;

      // Get verification code from transcript if provided
      let verificationCode = null;
      if (transcriptId) {
        const transcripts = await transcriptService.getStudentTranscripts(studentId);
        const transcript = transcripts.find(t => t.id == transcriptId);
        if (transcript) {
          verificationCode = transcript.verification_code;
        }
      }

      const pdfBuffer = await transcriptService.generateTranscriptPDF(studentId, verificationCode);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=transcript-${studentId}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  }

  // ==================== TRANSCRIPT VERIFICATION ====================

  async verifyTranscript(req, res, next) {
    try {
      const { code } = req.params;
      const result = await transcriptService.verifyTranscript(code);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== DEGREE AUDIT ====================

  async getDegreeAudit(req, res, next) {
    try {
      const studentId = req.params.studentId || req.user.studentId;
      const result = await transcriptService.getDegreeAudit(studentId);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getStudentProgress(req, res, next) {
    try {
      const studentId = req.params.studentId || req.user.studentId;
      const result = await transcriptService.getStudentProgress(studentId);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== ADMIN - VIEW TRANSCRIPT DATA ====================

  async getTranscriptData(req, res, next) {
    try {
      const { studentId } = req.params;
      const result = await transcriptService.getTranscriptData(studentId);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TranscriptController();
