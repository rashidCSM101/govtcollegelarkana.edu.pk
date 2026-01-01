const documentService = require('./document.service');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for document uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/documents');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `doc-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept images and PDFs
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and PDF files are allowed'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

class DocumentController {
  // Multer middleware
  get uploadMiddleware() {
    return upload.single('document');
  }

  // ==================== STUDENT ENDPOINTS ====================

  /**
   * Upload document
   * POST /api/student/documents/upload
   */
  async uploadDocument(req, res) {
    try {
      const studentId = req.user.id;
      const { document_type } = req.body;

      if (!document_type) {
        return res.status(400).json({
          success: false,
          message: 'Document type is required'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      const documentPath = `/uploads/documents/${req.file.filename}`;
      const fileName = req.file.originalname;
      const fileSize = req.file.size;
      const mimeType = req.file.mimetype;

      const result = await documentService.uploadDocument(
        studentId,
        document_type,
        documentPath,
        fileName,
        fileSize,
        mimeType
      );

      res.status(201).json({
        success: true,
        message: 'Document uploaded successfully',
        data: result
      });

    } catch (error) {
      console.error('Upload Document Error:', error);
      
      // Delete uploaded file if database operation fails
      if (req.file) {
        const filePath = req.file.path;
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      res.status(400).json({
        success: false,
        message: error.message || 'Failed to upload document'
      });
    }
  }

  /**
   * Get student documents
   * GET /api/student/documents
   */
  async getStudentDocuments(req, res) {
    try {
      const studentId = req.user.id;
      const { document_type, status } = req.query;

      const filters = {};
      if (document_type) filters.document_type = document_type;
      if (status) filters.status = status;

      const documents = await documentService.getStudentDocuments(studentId, filters);

      res.json({
        success: true,
        data: documents,
        total: documents.length
      });

    } catch (error) {
      console.error('Get Student Documents Error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch documents'
      });
    }
  }

  /**
   * Get document status summary
   * GET /api/student/documents/status
   */
  async getDocumentStatus(req, res) {
    try {
      const studentId = req.user.id;

      const status = await documentService.getDocumentStatus(studentId);

      res.json({
        success: true,
        data: status
      });

    } catch (error) {
      console.error('Get Document Status Error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch document status'
      });
    }
  }

  /**
   * Download document (Student)
   * GET /api/student/documents/download/:id
   */
  async downloadDocument(req, res) {
    try {
      const studentId = req.user.id;
      const documentId = parseInt(req.params.id);

      const result = await documentService.downloadDocument(documentId, studentId);

      res.download(result.path, result.filename, (err) => {
        if (err) {
          console.error('Download Error:', err);
          res.status(500).json({
            success: false,
            message: 'Failed to download document'
          });
        }
      });

    } catch (error) {
      console.error('Download Document Error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to download document'
      });
    }
  }

  // ==================== ADMIN ENDPOINTS ====================

  /**
   * Get pending documents
   * GET /api/admin/documents/pending
   */
  async getPendingDocuments(req, res) {
    try {
      const {
        document_type,
        student_id,
        department_id,
        page = 1,
        limit = 20
      } = req.query;

      const filters = {};
      if (document_type) filters.document_type = document_type;
      if (student_id) filters.student_id = parseInt(student_id);
      if (department_id) filters.department_id = parseInt(department_id);

      const result = await documentService.getPendingDocuments(
        filters,
        parseInt(page),
        parseInt(limit)
      );

      res.json({
        success: true,
        data: result.documents,
        pagination: result.pagination
      });

    } catch (error) {
      console.error('Get Pending Documents Error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch pending documents'
      });
    }
  }

  /**
   * Get all documents (Admin)
   * GET /api/admin/documents
   */
  async getAllDocuments(req, res) {
    try {
      const {
        document_type,
        status,
        student_id,
        department_id,
        search,
        page = 1,
        limit = 20
      } = req.query;

      const filters = {};
      if (document_type) filters.document_type = document_type;
      if (status) filters.status = status;
      if (student_id) filters.student_id = parseInt(student_id);
      if (department_id) filters.department_id = parseInt(department_id);
      if (search) filters.search = search;

      const result = await documentService.getAllDocuments(
        filters,
        parseInt(page),
        parseInt(limit)
      );

      res.json({
        success: true,
        data: result.documents,
        pagination: result.pagination
      });

    } catch (error) {
      console.error('Get All Documents Error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch documents'
      });
    }
  }

  /**
   * Verify document
   * POST /api/admin/documents/verify/:id
   */
  async verifyDocument(req, res) {
    try {
      const adminId = req.user.id;
      const documentId = parseInt(req.params.id);
      const { remarks } = req.body;

      const result = await documentService.verifyDocument(
        documentId,
        adminId,
        remarks
      );

      res.json({
        success: true,
        message: result.message
      });

    } catch (error) {
      console.error('Verify Document Error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to verify document'
      });
    }
  }

  /**
   * Reject document
   * POST /api/admin/documents/reject/:id
   */
  async rejectDocument(req, res) {
    try {
      const adminId = req.user.id;
      const documentId = parseInt(req.params.id);
      const { remarks } = req.body;

      if (!remarks) {
        return res.status(400).json({
          success: false,
          message: 'Rejection remarks are required'
        });
      }

      const result = await documentService.rejectDocument(
        documentId,
        adminId,
        remarks
      );

      res.json({
        success: true,
        message: result.message
      });

    } catch (error) {
      console.error('Reject Document Error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to reject document'
      });
    }
  }

  /**
   * Download document (Admin)
   * GET /api/admin/documents/download/:id
   */
  async downloadDocumentAdmin(req, res) {
    try {
      const documentId = parseInt(req.params.id);

      const result = await documentService.downloadDocumentAdmin(documentId);

      res.download(result.path, result.filename, (err) => {
        if (err) {
          console.error('Download Error:', err);
          res.status(500).json({
            success: false,
            message: 'Failed to download document'
          });
        }
      });

    } catch (error) {
      console.error('Download Document Admin Error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to download document'
      });
    }
  }

  /**
   * Get verification statistics
   * GET /api/admin/documents/statistics
   */
  async getVerificationStatistics(req, res) {
    try {
      const stats = await documentService.getVerificationStatistics();

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Get Verification Statistics Error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch statistics'
      });
    }
  }
}

module.exports = new DocumentController();
