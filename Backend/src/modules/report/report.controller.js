const reportService = require('./report.service');
const fs = require('fs');
const path = require('path');

/**
 * Report Controller
 * Handles HTTP requests for comprehensive reporting
 */

/**
 * Get student reports
 * @route GET /api/admin/reports/students
 */
exports.getStudentReports = async (req, res) => {
  try {
    const filters = req.query;
    
    const reportData = await reportService.getStudentReports(filters);

    res.status(200).json({
      success: true,
      message: 'Student reports retrieved successfully',
      data: reportData
    });

  } catch (error) {
    console.error('Get Student Reports Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve student reports',
      error: error.message
    });
  }
};

/**
 * Get attendance reports
 * @route GET /api/admin/reports/attendance
 */
exports.getAttendanceReports = async (req, res) => {
  try {
    const filters = {
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      department_id: req.query.department_id,
      course_id: req.query.course_id
    };
    
    const reportData = await reportService.getAttendanceReports(filters);

    res.status(200).json({
      success: true,
      message: 'Attendance reports retrieved successfully',
      data: reportData
    });

  } catch (error) {
    console.error('Get Attendance Reports Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve attendance reports',
      error: error.message
    });
  }
};

/**
 * Get academic reports
 * @route GET /api/admin/reports/academic
 */
exports.getAcademicReports = async (req, res) => {
  try {
    const filters = {
      semester_id: req.query.semester_id,
      department_id: req.query.department_id,
      session_id: req.query.session_id
    };
    
    const reportData = await reportService.getAcademicReports(filters);

    res.status(200).json({
      success: true,
      message: 'Academic reports retrieved successfully',
      data: reportData
    });

  } catch (error) {
    console.error('Get Academic Reports Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve academic reports',
      error: error.message
    });
  }
};

/**
 * Get financial reports
 * @route GET /api/admin/reports/financial
 */
exports.getFinancialReports = async (req, res) => {
  try {
    const filters = {
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      department_id: req.query.department_id,
      payment_mode: req.query.payment_mode
    };
    
    const reportData = await reportService.getFinancialReports(filters);

    res.status(200).json({
      success: true,
      message: 'Financial reports retrieved successfully',
      data: reportData
    });

  } catch (error) {
    console.error('Get Financial Reports Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve financial reports',
      error: error.message
    });
  }
};

/**
 * Get teacher reports
 * @route GET /api/admin/reports/teachers
 */
exports.getTeacherReports = async (req, res) => {
  try {
    const filters = {
      department_id: req.query.department_id,
      teacher_id: req.query.teacher_id
    };
    
    const reportData = await reportService.getTeacherReports(filters);

    res.status(200).json({
      success: true,
      message: 'Teacher reports retrieved successfully',
      data: reportData
    });

  } catch (error) {
    console.error('Get Teacher Reports Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve teacher reports',
      error: error.message
    });
  }
};

/**
 * Export report data
 * @route GET /api/admin/reports/export/:type
 */
exports.exportReport = async (req, res) => {
  try {
    const { type } = req.params;
    const filters = req.query;
    const format = req.query.format || 'json'; // json, csv (future: pdf, xlsx)

    // Validate report type
    const validTypes = ['students', 'attendance', 'academic', 'financial', 'teachers'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid report type. Valid types: students, attendance, academic, financial, teachers'
      });
    }

    const reportData = await reportService.getReportDataForExport(type, filters);

    if (format === 'json') {
      // Set headers for JSON download
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${type}_report_${Date.now()}.json"`);
      
      return res.status(200).json(reportData);
    } 
    else if (format === 'csv') {
      // Convert to CSV format
      const csvData = convertToCSV(reportData);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${type}_report_${Date.now()}.csv"`);
      
      return res.status(200).send(csvData);
    }
    else {
      return res.status(400).json({
        success: false,
        message: 'Invalid format. Supported formats: json, csv'
      });
    }

  } catch (error) {
    console.error('Export Report Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to export report',
      error: error.message
    });
  }
};

/**
 * Helper function to convert JSON to CSV
 * @param {Object} reportData - Report data object
 * @returns {string} CSV formatted string
 */
function convertToCSV(reportData) {
  try {
    let csvContent = '';
    
    // Add report metadata
    csvContent += `Report Type: ${reportData.reportType}\n`;
    csvContent += `Generated At: ${reportData.generatedAt}\n`;
    csvContent += `Filters: ${JSON.stringify(reportData.filters)}\n\n`;

    // Process each section of the report
    for (const [sectionName, sectionData] of Object.entries(reportData.data)) {
      csvContent += `\n${sectionName.toUpperCase()}\n`;
      
      if (Array.isArray(sectionData) && sectionData.length > 0) {
        // Get headers from first object
        const headers = Object.keys(sectionData[0]);
        csvContent += headers.join(',') + '\n';
        
        // Add data rows
        sectionData.forEach(row => {
          const values = headers.map(header => {
            const value = row[header];
            // Escape commas and quotes in values
            if (value === null || value === undefined) return '';
            const stringValue = String(value);
            if (stringValue.includes(',') || stringValue.includes('"')) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          });
          csvContent += values.join(',') + '\n';
        });
      } else if (typeof sectionData === 'object' && sectionData !== null) {
        // Single object (like overall statistics)
        csvContent += Object.keys(sectionData).join(',') + '\n';
        csvContent += Object.values(sectionData).join(',') + '\n';
      }
      
      csvContent += '\n';
    }

    return csvContent;

  } catch (error) {
    console.error('Convert to CSV Error:', error);
    throw new Error('Failed to convert report to CSV format');
  }
}

module.exports = exports;
