const exportService = require('./export.service');
const path = require('path');
const fs = require('fs');

/**
 * Export Controller
 * Handles HTTP requests for data export
 */

/**
 * Export module data
 * @route GET /api/admin/export/:module
 * @query format - Export format (excel, csv, pdf)
 * @query filters - JSON string of filters
 */
exports.exportModuleData = async (req, res) => {
  try {
    const { module } = req.params;
    const format = req.query.format || 'excel';
    const filters = req.query.filters ? JSON.parse(req.query.filters) : {};
    const userId = req.user.id;

    // Validate module
    const validModules = ['students', 'teachers', 'attendance', 'results', 'fees', 'departments', 'courses'];
    if (!validModules.includes(module.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid module. Supported modules: ${validModules.join(', ')}`
      });
    }

    // Validate format
    const validFormats = ['excel', 'csv', 'pdf'];
    if (!validFormats.includes(format.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid format. Supported formats: ${validFormats.join(', ')}`
      });
    }

    const exportResult = await exportService.exportModuleData(module, format, filters, userId);

    // Check if file exists
    if (!fs.existsSync(exportResult.filePath)) {
      return res.status(500).json({
        success: false,
        message: 'Export file generation failed'
      });
    }

    // Set appropriate headers for file download
    const contentTypes = {
      excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      csv: 'text/csv',
      pdf: 'application/pdf'
    };

    res.setHeader('Content-Type', contentTypes[format.toLowerCase()]);
    res.setHeader('Content-Disposition', `attachment; filename="${exportResult.fileName}"`);

    // Send file
    const fileStream = fs.createReadStream(exportResult.filePath);
    fileStream.pipe(res);

    // Delete file after sending (optional - cleanup)
    fileStream.on('end', () => {
      setTimeout(() => {
        try {
          if (fs.existsSync(exportResult.filePath)) {
            fs.unlinkSync(exportResult.filePath);
          }
        } catch (error) {
          console.error('File cleanup error:', error);
        }
      }, 5000); // Delete after 5 seconds
    });

  } catch (error) {
    console.error('Export Module Data Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to export module data',
      error: error.message
    });
  }
};

module.exports = exports;
