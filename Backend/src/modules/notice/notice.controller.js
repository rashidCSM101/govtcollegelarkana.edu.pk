const noticeService = require('./notice.service');

class NoticeController {
  // ==================== ADMIN/TEACHER ENDPOINTS ====================

  /**
   * Create notice
   * POST /api/admin/notices
   */
  async createNotice(req, res) {
    try {
      const createdBy = req.user.id;
      const createdByRole = req.user.role; // 'admin' or 'teacher'

      const {
        title,
        content,
        notice_type,
        priority,
        target_audience,
        target_filters,
        attachments,
        expiry_date,
        status,
        is_pinned
      } = req.body;

      // Validate required fields
      if (!title || !content || !notice_type || !priority || !target_audience) {
        return res.status(400).json({
          success: false,
          message: 'Title, content, notice type, priority, and target audience are required'
        });
      }

      const result = await noticeService.createNotice(
        title,
        content,
        notice_type,
        priority,
        target_audience,
        target_filters || {},
        attachments || [],
        expiry_date,
        status || 'Published',
        is_pinned || false,
        createdBy,
        createdByRole
      );

      res.status(201).json({
        success: true,
        message: 'Notice created successfully',
        data: result
      });

    } catch (error) {
      console.error('Create Notice Error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create notice'
      });
    }
  }

  /**
   * Get all notices (Admin view)
   * GET /api/admin/notices
   */
  async getAllNoticesAdmin(req, res) {
    try {
      const {
        notice_type,
        priority,
        status,
        target_audience,
        is_pinned,
        search,
        page = 1,
        limit = 20
      } = req.query;

      const filters = {};
      if (notice_type) filters.notice_type = notice_type;
      if (priority) filters.priority = priority;
      if (status) filters.status = status;
      if (target_audience) filters.target_audience = target_audience;
      if (is_pinned !== undefined) filters.is_pinned = is_pinned === 'true';
      if (search) filters.search = search;

      const result = await noticeService.getAllNoticesAdmin(
        filters,
        parseInt(page),
        parseInt(limit)
      );

      res.json({
        success: true,
        data: result.notices,
        pagination: result.pagination
      });

    } catch (error) {
      console.error('Get All Notices Admin Error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch notices'
      });
    }
  }

  /**
   * Update notice
   * PUT /api/admin/notices/:id
   */
  async updateNotice(req, res) {
    try {
      const noticeId = parseInt(req.params.id);
      const updateData = req.body;

      const result = await noticeService.updateNotice(noticeId, updateData);

      res.json({
        success: true,
        message: 'Notice updated successfully',
        data: result
      });

    } catch (error) {
      console.error('Update Notice Error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update notice'
      });
    }
  }

  /**
   * Delete notice
   * DELETE /api/admin/notices/:id
   */
  async deleteNotice(req, res) {
    try {
      const noticeId = parseInt(req.params.id);

      const result = await noticeService.deleteNotice(noticeId);

      res.json({
        success: true,
        message: result.message
      });

    } catch (error) {
      console.error('Delete Notice Error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to delete notice'
      });
    }
  }

  // ==================== USER ENDPOINTS ====================

  /**
   * Get published notices for users
   * GET /api/notices
   */
  async getPublishedNotices(req, res) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role; // 'student', 'teacher', or 'admin'

      const {
        notice_type,
        priority,
        search,
        page = 1,
        limit = 20
      } = req.query;

      const filters = {};
      if (notice_type) filters.notice_type = notice_type;
      if (priority) filters.priority = priority;
      if (search) filters.search = search;

      const result = await noticeService.getPublishedNotices(
        userId,
        userRole,
        filters,
        parseInt(page),
        parseInt(limit)
      );

      res.json({
        success: true,
        data: result.notices,
        pagination: result.pagination
      });

    } catch (error) {
      console.error('Get Published Notices Error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch notices'
      });
    }
  }

  /**
   * Get single notice by ID
   * GET /api/notices/:id
   */
  async getNoticeById(req, res) {
    try {
      const noticeId = parseInt(req.params.id);
      const userId = req.user.id;
      const userRole = req.user.role;

      const result = await noticeService.getNoticeById(noticeId, userId, userRole);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Get Notice By ID Error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to fetch notice'
      });
    }
  }

  /**
   * Mark notice as read
   * POST /api/notices/:id/mark-read
   */
  async markNoticeAsRead(req, res) {
    try {
      const noticeId = parseInt(req.params.id);
      const userId = req.user.id;
      const userRole = req.user.role;

      const result = await noticeService.markNoticeAsRead(noticeId, userId, userRole);

      res.json({
        success: true,
        message: result.message
      });

    } catch (error) {
      console.error('Mark Notice As Read Error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to mark notice as read'
      });
    }
  }

  /**
   * Get unread notice count
   * GET /api/notices/unread-count
   */
  async getUnreadCount(req, res) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;

      const result = await noticeService.getUnreadCount(userId, userRole);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Get Unread Count Error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch unread count'
      });
    }
  }
}

module.exports = new NoticeController();
