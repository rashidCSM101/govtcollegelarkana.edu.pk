const notificationService = require('./notification.service');

class NotificationController {
  /**
   * Get user notifications
   * GET /api/notifications
   */
  async getUserNotifications(req, res) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;

      const {
        type,
        is_read,
        priority,
        page = 1,
        limit = 20
      } = req.query;

      const filters = {};
      if (type) filters.type = type;
      if (is_read !== undefined) filters.is_read = is_read === 'true';
      if (priority) filters.priority = priority;

      const result = await notificationService.getUserNotifications(
        userId,
        userRole,
        filters,
        parseInt(page),
        parseInt(limit)
      );

      res.json({
        success: true,
        data: result.notifications,
        pagination: result.pagination
      });

    } catch (error) {
      console.error('Get User Notifications Error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch notifications'
      });
    }
  }

  /**
   * Get unread notification count
   * GET /api/notifications/unread-count
   */
  async getUnreadCount(req, res) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;

      const result = await notificationService.getUnreadCount(userId, userRole);

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

  /**
   * Mark notification as read
   * POST /api/notifications/:id/mark-read
   */
  async markAsRead(req, res) {
    try {
      const notificationId = parseInt(req.params.id);
      const userId = req.user.id;
      const userRole = req.user.role;

      const result = await notificationService.markAsRead(
        notificationId,
        userId,
        userRole
      );

      res.json({
        success: true,
        message: 'Notification marked as read',
        data: result
      });

    } catch (error) {
      console.error('Mark As Read Error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to mark notification as read'
      });
    }
  }

  /**
   * Mark all notifications as read
   * POST /api/notifications/mark-all-read
   */
  async markAllAsRead(req, res) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;

      const result = await notificationService.markAllAsRead(userId, userRole);

      res.json({
        success: true,
        message: result.message,
        data: { count: result.count }
      });

    } catch (error) {
      console.error('Mark All As Read Error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to mark all notifications as read'
      });
    }
  }

  /**
   * Get notification preferences
   * GET /api/user/notification-preferences
   */
  async getPreferences(req, res) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;

      const preferences = await notificationService.getPreferences(userId, userRole);

      res.json({
        success: true,
        data: preferences
      });

    } catch (error) {
      console.error('Get Preferences Error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch notification preferences'
      });
    }
  }

  /**
   * Update notification preferences
   * PUT /api/user/notification-preferences
   */
  async updatePreferences(req, res) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      const preferences = req.body;

      const result = await notificationService.updatePreferences(
        userId,
        userRole,
        preferences
      );

      res.json({
        success: true,
        message: 'Notification preferences updated successfully',
        data: result
      });

    } catch (error) {
      console.error('Update Preferences Error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update notification preferences'
      });
    }
  }
}

module.exports = new NotificationController();
