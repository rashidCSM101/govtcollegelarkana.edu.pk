const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { pool } = require('./config/database');
const initDatabase = require('./config/initDB');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static folder for uploads
app.use('/uploads', express.static('uploads'));

// Health check route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Government College Larkana API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', require('./modules/auth/auth.routes'));
app.use('/api/admin', require('./modules/admin/admin.routes'));
// app.use('/api/students', require('./modules/student/student.routes'));
// app.use('/api/teachers', require('./modules/teacher/teacher.routes'));
// app.use('/api/admin', require('./modules/admin/admin.routes'));
// app.use('/api/attendance', require('./modules/attendance/attendance.routes'));
// app.use('/api/exams', require('./modules/exam/exam.routes'));
// app.use('/api/fees', require('./modules/fee/fee.routes'));
// app.use('/api/assignments', require('./modules/assignment/assignment.routes'));
// app.use('/api/timetable', require('./modules/timetable/timetable.routes'));
// app.use('/api/certificates', require('./modules/certificate/certificate.routes'));
// app.use('/api/notices', require('./modules/notice/notice.routes'));
// app.use('/api/reports', require('./modules/report/report.routes'));

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 3000;

// Initialize database and start server
const startServer = async () => {
  try {
    // Initialize database (create tables if not exist)
    await initDatabase();
    
    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV}`);
      console.log(`🌐 API URL: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;
