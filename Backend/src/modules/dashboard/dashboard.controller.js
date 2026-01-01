const dashboardService = require('./dashboard.service');

/**
 * Dashboard Controller
 * Handles HTTP requests for dashboard data
 */

/**
 * Get admin dashboard
 * @route GET /api/admin/dashboard
 */
exports.getAdminDashboard = async (req, res) => {
  try {
    const dashboardData = await dashboardService.getAdminDashboard();

    res.status(200).json({
      success: true,
      message: 'Admin dashboard data retrieved successfully',
      data: dashboardData
    });

  } catch (error) {
    console.error('Get Admin Dashboard Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve admin dashboard data',
      error: error.message
    });
  }
};

/**
 * Get student dashboard
 * @route GET /api/student/dashboard
 */
exports.getStudentDashboard = async (req, res) => {
  try {
    const studentId = req.user.id; // From auth middleware

    const dashboardData = await dashboardService.getStudentDashboard(studentId);

    res.status(200).json({
      success: true,
      message: 'Student dashboard data retrieved successfully',
      data: dashboardData
    });

  } catch (error) {
    console.error('Get Student Dashboard Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve student dashboard data',
      error: error.message
    });
  }
};

/**
 * Get teacher dashboard
 * @route GET /api/teacher/dashboard
 */
exports.getTeacherDashboard = async (req, res) => {
  try {
    const teacherId = req.user.id; // From auth middleware

    const dashboardData = await dashboardService.getTeacherDashboard(teacherId);

    res.status(200).json({
      success: true,
      message: 'Teacher dashboard data retrieved successfully',
      data: dashboardData
    });

  } catch (error) {
    console.error('Get Teacher Dashboard Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve teacher dashboard data',
      error: error.message
    });
  }
};

module.exports = exports;
