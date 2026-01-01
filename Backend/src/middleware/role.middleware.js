// Role-based access control middleware

const ROLES = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student',
  STAFF: 'staff'
};

// Check if user has required role
const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
};

// Admin only middleware
const adminOnly = checkRole(ROLES.ADMIN);

// Teacher or Admin middleware
const teacherOrAdmin = checkRole(ROLES.ADMIN, ROLES.TEACHER);

// Student, Teacher, or Admin middleware
const authenticated = checkRole(ROLES.ADMIN, ROLES.TEACHER, ROLES.STUDENT, ROLES.STAFF);

module.exports = {
  ROLES,
  checkRole,
  adminOnly,
  teacherOrAdmin,
  authenticated
};
