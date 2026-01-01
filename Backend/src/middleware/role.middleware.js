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

// Teacher only middleware
const teacherOnly = checkRole(ROLES.TEACHER);

// Student only middleware
const studentOnly = checkRole(ROLES.STUDENT);

// Teacher or Admin middleware
const teacherOrAdmin = checkRole(ROLES.ADMIN, ROLES.TEACHER);

// Student or Admin middleware
const studentOrAdmin = checkRole(ROLES.ADMIN, ROLES.STUDENT);

// Student, Teacher, or Admin middleware
const authenticated = checkRole(ROLES.ADMIN, ROLES.TEACHER, ROLES.STUDENT, ROLES.STAFF);

module.exports = {
  ROLES,
  checkRole,
  adminOnly,
  teacherOnly,
  studentOnly,
  teacherOrAdmin,
  studentOrAdmin,
  authenticated
};
