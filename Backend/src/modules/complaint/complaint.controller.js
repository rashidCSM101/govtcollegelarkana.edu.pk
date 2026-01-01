const complaintService = require('./complaint.service');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for complaint attachments
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/complaints');
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `complaint-${uniqueSuffix}${ext}`);
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

class ComplaintController {

  // Multer middleware
  get uploadMiddleware() {
    return upload.single('attachment');
  }

  // ==================== STUDENT ENDPOINTS ====================

  /**
   * Submit complaint
   * POST /api/student/complaints
   */
  async submitComplaint(req, res) {
    try {
      const studentId = req.user.id;
      const { category, subject, description, priority } = req.body;

      if (!category || !subject || !description) {
        return res.status(400).json({
          success: false,
          message: 'Category, subject, and description are required'
        });
      }

      const complaintData = {
        category,
        subject,
        description,
        priority: priority || 'Medium',
        attachment_path: req.file ? `/uploads/complaints/${req.file.filename}` : null,
        attachment_name: req.file ? req.file.originalname : null
      };

      const complaint = await complaintService.submitComplaint(studentId, complaintData);

      res.status(201).json({
        success: true,
        message: 'Complaint submitted successfully',
        data: complaint
      });

    } catch (error) {
      console.error('Submit Complaint Error:', error);
      
      // Delete uploaded file if database operation fails
      if (req.file) {
        const filePath = req.file.path;
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      res.status(400).json({
        success: false,
        message: error.message || 'Failed to submit complaint'
      });
    }
  }

  /**
   * Get student's complaints
   * GET /api/student/complaints
   */
  async getStudentComplaints(req, res) {
    try {
      const studentId = req.user.id;
      const { category, status, priority } = req.query;

      const filters = {};
      if (category) filters.category = category;
      if (status) filters.status = status;
      if (priority) filters.priority = priority;

      const complaints = await complaintService.getStudentComplaints(studentId, filters);

      res.json({
        success: true,
        data: complaints,
        total: complaints.length
      });

    } catch (error) {
      console.error('Get Student Complaints Error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch complaints'
      });
    }
  }

  /**
   * Get complaint details
   * GET /api/student/complaints/:id
   */
  async getComplaintDetails(req, res) {
    try {
      const studentId = req.user.id;
      const complaintId = parseInt(req.params.id);

      const complaint = await complaintService.getComplaintById(complaintId, studentId);

      res.json({
        success: true,
        data: complaint
      });

    } catch (error) {
      console.error('Get Complaint Details Error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to fetch complaint details'
      });
    }
  }

  /**
   * Add comment to complaint
   * POST /api/student/complaints/:id/comment
   */
  async addComment(req, res) {
    try {
      const studentId = req.user.id;
      const complaintId = parseInt(req.params.id);
      const { comment } = req.body;

      if (!comment) {
        return res.status(400).json({
          success: false,
          message: 'Comment is required'
        });
      }

      const result = await complaintService.addComment(complaintId, studentId, comment);

      res.json({
        success: true,
        message: 'Comment added successfully',
        data: result
      });

    } catch (error) {
      console.error('Add Comment Error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to add comment'
      });
    }
  }

  // ==================== ADMIN ENDPOINTS ====================

  /**
   * Get all complaints (Admin view)
   * GET /api/admin/complaints
   */
  async getAllComplaints(req, res) {
    try {
      const {
        category,
        status,
        priority,
        assigned_department,
        assigned_to,
        student_id,
        search,
        page = 1,
        limit = 20
      } = req.query;

      const filters = {};
      if (category) filters.category = category;
      if (status) filters.status = status;
      if (priority) filters.priority = priority;
      if (assigned_department) filters.assigned_department = parseInt(assigned_department);
      if (assigned_to) filters.assigned_to = parseInt(assigned_to);
      if (student_id) filters.student_id = parseInt(student_id);
      if (search) filters.search = search;

      const result = await complaintService.getAllComplaints(
        filters,
        parseInt(page),
        parseInt(limit)
      );

      res.json({
        success: true,
        data: result.complaints,
        pagination: result.pagination
      });

    } catch (error) {
      console.error('Get All Complaints Error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch complaints'
      });
    }
  }

  /**
   * Get complaint by ID (Admin view)
   * GET /api/admin/complaints/:id
   */
  async getComplaintByIdAdmin(req, res) {
    try {
      const complaintId = parseInt(req.params.id);

      const complaint = await complaintService.getComplaintByIdAdmin(complaintId);

      res.json({
        success: true,
        data: complaint
      });

    } catch (error) {
      console.error('Get Complaint By ID Admin Error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to fetch complaint'
      });
    }
  }

  /**
   * Assign complaint
   * POST /api/admin/complaints/:id/assign
   */
  async assignComplaint(req, res) {
    try {
      const adminId = req.user.id;
      const complaintId = parseInt(req.params.id);
      const { assigned_department, assigned_to, remarks } = req.body;

      const assignmentData = {
        assigned_department: assigned_department ? parseInt(assigned_department) : null,
        assigned_to: assigned_to ? parseInt(assigned_to) : null,
        remarks
      };

      const result = await complaintService.assignComplaint(complaintId, adminId, assignmentData);

      res.json({
        success: true,
        message: result.message,
        data: result.complaint
      });

    } catch (error) {
      console.error('Assign Complaint Error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to assign complaint'
      });
    }
  }

  /**
   * Update complaint status
   * PUT /api/admin/complaints/:id/status
   */
  async updateStatus(req, res) {
    try {
      const adminId = req.user.id;
      const complaintId = parseInt(req.params.id);
      const { status, remarks } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Status is required'
        });
      }

      const result = await complaintService.updateStatus(complaintId, adminId, status, remarks);

      res.json({
        success: true,
        message: result.message,
        data: result.complaint
      });

    } catch (error) {
      console.error('Update Status Error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update status'
      });
    }
  }

  /**
   * Resolve complaint
   * POST /api/admin/complaints/:id/resolve
   */
  async resolveComplaint(req, res) {
    try {
      const adminId = req.user.id;
      const complaintId = parseInt(req.params.id);
      const { resolution } = req.body;

      if (!resolution) {
        return res.status(400).json({
          success: false,
          message: 'Resolution details are required'
        });
      }

      const result = await complaintService.resolveComplaint(complaintId, adminId, resolution);

      res.json({
        success: true,
        message: result.message,
        data: result.complaint
      });

    } catch (error) {
      console.error('Resolve Complaint Error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to resolve complaint'
      });
    }
  }

  /**
   * Add comment to complaint (Admin)
   * POST /api/admin/complaints/:id/comment
   */
  async addCommentAdmin(req, res) {
    try {
      const adminId = req.user.id;
      const complaintId = parseInt(req.params.id);
      const { comment } = req.body;

      if (!comment) {
        return res.status(400).json({
          success: false,
          message: 'Comment is required'
        });
      }

      const result = await complaintService.addComment(complaintId, adminId, comment);

      res.json({
        success: true,
        message: 'Comment added successfully',
        data: result
      });

    } catch (error) {
      console.error('Add Comment Admin Error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to add comment'
      });
    }
  }

  /**
   * Get complaint statistics
   * GET /api/admin/complaints/statistics
   */
  async getStatistics(req, res) {
    try {
      const stats = await complaintService.getComplaintStatistics();

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Get Complaint Statistics Error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch statistics'
      });
    }
  }
}

module.exports = new ComplaintController();
