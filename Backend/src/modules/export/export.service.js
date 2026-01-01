const pool = require('../../config/database');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Export Service
 * Handles data export to Excel, CSV, and PDF formats
 */
class ExportService {

  /**
   * Export module data to specified format
   * @param {string} module - Module name (students, teachers, attendance, etc.)
   * @param {string} format - Export format (excel, csv, pdf)
   * @param {Object} filters - Filter options
   * @param {number} userId - User performing the export
   * @returns {Promise<Object>} Export file details
   */
  async exportModuleData(module, format, filters = {}, userId) {
    try {
      // Get data based on module
      const data = await this.getModuleData(module, filters);

      // Generate export file based on format
      let filePath;
      switch (format.toLowerCase()) {
        case 'excel':
          filePath = await this.exportToExcel(module, data, filters);
          break;
        case 'csv':
          filePath = await this.exportToCSV(module, data, filters);
          break;
        case 'pdf':
          filePath = await this.exportToPDF(module, data, filters);
          break;
        default:
          throw new Error('Invalid export format. Supported formats: excel, csv, pdf');
      }

      // Log the export activity
      await this.logExport(module, format, userId, filePath);

      return {
        filePath,
        fileName: path.basename(filePath),
        format,
        module,
        recordCount: data.length,
        generatedAt: new Date()
      };

    } catch (error) {
      console.error('Export Module Data Error:', error);
      throw new Error(error.message || 'Failed to export module data');
    }
  }

  /**
   * Get data for specified module
   * @param {string} module - Module name
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Module data
   */
  async getModuleData(module, filters = {}) {
    try {
      let query;
      let params = [];

      switch (module.toLowerCase()) {
        case 'students':
          query = `
            SELECT 
              s.id, s.name, s.registration_number, s.email, s.phone, s.gender,
              s.cnic, s.date_of_birth, s.address, s.status, s.cgpa,
              s.admission_date, d.name as department, ses.name as session
            FROM students s
            LEFT JOIN departments d ON s.department_id = d.id
            LEFT JOIN sessions ses ON s.session_id = ses.id
            WHERE 1=1
            ${filters.department_id ? 'AND s.department_id = $1' : ''}
            ${filters.session_id ? 'AND s.session_id = $' + (params.length + 1) : ''}
            ${filters.status ? 'AND s.status = $' + (params.length + 1) : ''}
            ORDER BY s.id
          `;
          if (filters.department_id) params.push(filters.department_id);
          if (filters.session_id) params.push(filters.session_id);
          if (filters.status) params.push(filters.status);
          break;

        case 'teachers':
          query = `
            SELECT 
              t.id, t.name, t.employee_id, t.email, t.phone, t.cnic,
              t.designation, t.qualification, t.joining_date, t.status,
              d.name as department
            FROM teachers t
            LEFT JOIN departments d ON t.department_id = d.id
            WHERE 1=1
            ${filters.department_id ? 'AND t.department_id = $1' : ''}
            ${filters.status ? 'AND t.status = $' + (params.length + 1) : ''}
            ORDER BY t.id
          `;
          if (filters.department_id) params.push(filters.department_id);
          if (filters.status) params.push(filters.status);
          break;

        case 'attendance':
          query = `
            SELECT 
              a.date, s.name as student_name, s.registration_number,
              c.name as course_name, c.code as course_code,
              a.status, t.name as marked_by
            FROM attendance a
            LEFT JOIN students s ON a.student_id = s.id
            LEFT JOIN courses c ON a.course_id = c.id
            LEFT JOIN teachers t ON a.teacher_id = t.id
            WHERE 1=1
            ${filters.start_date ? 'AND a.date >= $1' : ''}
            ${filters.end_date ? 'AND a.date <= $' + (params.length + 1) : ''}
            ${filters.course_id ? 'AND a.course_id = $' + (params.length + 1) : ''}
            ORDER BY a.date DESC, s.name
          `;
          if (filters.start_date) params.push(filters.start_date);
          if (filters.end_date) params.push(filters.end_date);
          if (filters.course_id) params.push(filters.course_id);
          break;

        case 'results':
          query = `
            SELECT 
              s.name as student_name, s.registration_number,
              c.name as course_name, c.code as course_code,
              sr.marks_obtained, sr.total_marks, sr.grade, sr.gpa,
              sem.name as semester
            FROM student_results sr
            LEFT JOIN students s ON sr.student_id = s.id
            LEFT JOIN courses c ON sr.course_id = c.id
            LEFT JOIN semesters sem ON sr.semester_id = sem.id
            WHERE 1=1
            ${filters.semester_id ? 'AND sr.semester_id = $1' : ''}
            ${filters.department_id ? 'AND s.department_id = $' + (params.length + 1) : ''}
            ORDER BY s.name, c.name
          `;
          if (filters.semester_id) params.push(filters.semester_id);
          if (filters.department_id) params.push(filters.department_id);
          break;

        case 'fees':
          query = `
            SELECT 
              s.name as student_name, s.registration_number,
              sf.fee_type, sf.total_amount, sf.paid_amount, sf.remaining_amount,
              sf.payment_status, sf.due_date, d.name as department
            FROM student_fees sf
            LEFT JOIN students s ON sf.student_id = s.id
            LEFT JOIN departments d ON s.department_id = d.id
            WHERE 1=1
            ${filters.payment_status ? 'AND sf.payment_status = $1' : ''}
            ${filters.department_id ? 'AND s.department_id = $' + (params.length + 1) : ''}
            ORDER BY sf.due_date, s.name
          `;
          if (filters.payment_status) params.push(filters.payment_status);
          if (filters.department_id) params.push(filters.department_id);
          break;

        case 'departments':
          query = `
            SELECT 
              d.name, d.code, d.description,
              COUNT(DISTINCT s.id) as total_students,
              COUNT(DISTINCT t.id) as total_teachers,
              COUNT(DISTINCT c.id) as total_courses
            FROM departments d
            LEFT JOIN students s ON d.id = s.department_id AND s.status = 'Active'
            LEFT JOIN teachers t ON d.id = t.department_id AND t.status = 'Active'
            LEFT JOIN courses c ON d.id = c.department_id
            GROUP BY d.id, d.name, d.code, d.description
            ORDER BY d.name
          `;
          break;

        case 'courses':
          query = `
            SELECT 
              c.name, c.code, c.credit_hours, c.course_type,
              d.name as department, c.status,
              COUNT(DISTINCT e.student_id) as enrolled_students
            FROM courses c
            LEFT JOIN departments d ON c.department_id = d.id
            LEFT JOIN enrollments e ON c.id = e.course_id
            WHERE 1=1
            ${filters.department_id ? 'AND c.department_id = $1' : ''}
            GROUP BY c.id, c.name, c.code, c.credit_hours, c.course_type, d.name, c.status
            ORDER BY d.name, c.name
          `;
          if (filters.department_id) params.push(filters.department_id);
          break;

        default:
          throw new Error('Invalid module. Supported modules: students, teachers, attendance, results, fees, departments, courses');
      }

      const result = await pool.query(query, params);
      return result.rows;

    } catch (error) {
      console.error('Get Module Data Error:', error);
      throw new Error(error.message || 'Failed to fetch module data');
    }
  }

  /**
   * Export data to Excel format
   * @param {string} module - Module name
   * @param {Array} data - Data to export
   * @param {Object} filters - Applied filters
   * @returns {Promise<string>} File path
   */
  async exportToExcel(module, data, filters) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(module.toUpperCase());

      // Set workbook properties
      workbook.creator = 'Government College Larkana';
      workbook.created = new Date();

      if (data.length === 0) {
        worksheet.addRow(['No data available']);
        const filePath = path.join(__dirname, `../../exports/${module}_${Date.now()}.xlsx`);
        
        // Ensure exports directory exists
        const exportsDir = path.dirname(filePath);
        if (!fs.existsSync(exportsDir)) {
          fs.mkdirSync(exportsDir, { recursive: true });
        }

        await workbook.xlsx.writeFile(filePath);
        return filePath;
      }

      // Get headers from first data object
      const headers = Object.keys(data[0]);
      
      // Style header row
      const headerRow = worksheet.addRow(headers.map(h => h.toUpperCase().replace(/_/g, ' ')));
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E40AF' }
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

      // Add data rows
      data.forEach(row => {
        const rowData = headers.map(header => row[header]);
        worksheet.addRow(rowData);
      });

      // Auto-fit columns
      worksheet.columns.forEach((column, index) => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, (cell) => {
          const length = cell.value ? cell.value.toString().length : 10;
          if (length > maxLength) maxLength = length;
        });
        column.width = maxLength < 10 ? 10 : maxLength + 2;
      });

      // Add filters
      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: headers.length }
      };

      // Save file
      const filePath = path.join(__dirname, `../../exports/${module}_${Date.now()}.xlsx`);
      
      // Ensure exports directory exists
      const exportsDir = path.dirname(filePath);
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true });
      }

      await workbook.xlsx.writeFile(filePath);
      return filePath;

    } catch (error) {
      console.error('Export to Excel Error:', error);
      throw new Error('Failed to export to Excel format');
    }
  }

  /**
   * Export data to CSV format
   * @param {string} module - Module name
   * @param {Array} data - Data to export
   * @param {Object} filters - Applied filters
   * @returns {Promise<string>} File path
   */
  async exportToCSV(module, data, filters) {
    try {
      const filePath = path.join(__dirname, `../../exports/${module}_${Date.now()}.csv`);
      
      // Ensure exports directory exists
      const exportsDir = path.dirname(filePath);
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true });
      }

      if (data.length === 0) {
        fs.writeFileSync(filePath, 'No data available');
        return filePath;
      }

      // Get headers
      const headers = Object.keys(data[0]);
      
      // Create CSV content
      let csvContent = headers.map(h => `"${h.toUpperCase().replace(/_/g, ' ')}"`).join(',') + '\n';

      // Add data rows
      data.forEach(row => {
        const rowData = headers.map(header => {
          const value = row[header];
          if (value === null || value === undefined) return '';
          const stringValue = String(value);
          // Escape quotes and wrap in quotes if contains comma or quote
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        });
        csvContent += rowData.join(',') + '\n';
      });

      // Write to file
      fs.writeFileSync(filePath, csvContent);
      return filePath;

    } catch (error) {
      console.error('Export to CSV Error:', error);
      throw new Error('Failed to export to CSV format');
    }
  }

  /**
   * Export data to PDF format
   * @param {string} module - Module name
   * @param {Array} data - Data to export
   * @param {Object} filters - Applied filters
   * @returns {Promise<string>} File path
   */
  async exportToPDF(module, data, filters) {
    try {
      const filePath = path.join(__dirname, `../../exports/${module}_${Date.now()}.pdf`);
      
      // Ensure exports directory exists
      const exportsDir = path.dirname(filePath);
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true });
      }

      const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Header
      doc.fontSize(18).fillColor('#1E40AF').text('Government College Larkana', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(14).fillColor('#000000').text(`${module.toUpperCase()} REPORT`, { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown(1);

      if (data.length === 0) {
        doc.fontSize(12).text('No data available', { align: 'center' });
        doc.end();
        return new Promise((resolve, reject) => {
          stream.on('finish', () => resolve(filePath));
          stream.on('error', reject);
        });
      }

      // Get headers
      const headers = Object.keys(data[0]);
      const maxHeaders = 8; // Limit columns for readability in landscape
      const displayHeaders = headers.slice(0, maxHeaders);

      // Calculate column widths
      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const columnWidth = pageWidth / displayHeaders.length;

      // Table header
      let yPosition = doc.y;
      doc.fontSize(9).fillColor('#1E40AF');
      
      displayHeaders.forEach((header, index) => {
        const xPosition = doc.page.margins.left + (index * columnWidth);
        doc.text(header.toUpperCase().replace(/_/g, ' '), xPosition, yPosition, {
          width: columnWidth - 5,
          align: 'left'
        });
      });

      doc.moveDown(0.5);
      doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
      doc.moveDown(0.5);

      // Table rows
      doc.fontSize(8).fillColor('#000000');
      
      data.forEach((row, rowIndex) => {
        // Check if we need a new page
        if (doc.y > doc.page.height - 100) {
          doc.addPage();
          yPosition = doc.page.margins.top;
          
          // Repeat headers on new page
          doc.fontSize(9).fillColor('#1E40AF');
          displayHeaders.forEach((header, index) => {
            const xPosition = doc.page.margins.left + (index * columnWidth);
            doc.text(header.toUpperCase().replace(/_/g, ' '), xPosition, yPosition, {
              width: columnWidth - 5,
              align: 'left'
            });
          });
          doc.moveDown(0.5);
          doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
          doc.moveDown(0.5);
          doc.fontSize(8).fillColor('#000000');
        }

        yPosition = doc.y;
        
        displayHeaders.forEach((header, index) => {
          const xPosition = doc.page.margins.left + (index * columnWidth);
          const value = row[header];
          const displayValue = value === null || value === undefined ? '' : String(value);
          
          doc.text(displayValue, xPosition, yPosition, {
            width: columnWidth - 5,
            align: 'left',
            ellipsis: true
          });
        });

        doc.moveDown(0.8);
      });

      // Footer
      doc.fontSize(8).fillColor('#666666');
      doc.text(`Total Records: ${data.length}`, doc.page.margins.left, doc.page.height - 50, {
        align: 'center'
      });

      doc.end();

      return new Promise((resolve, reject) => {
        stream.on('finish', () => resolve(filePath));
        stream.on('error', reject);
      });

    } catch (error) {
      console.error('Export to PDF Error:', error);
      throw new Error('Failed to export to PDF format');
    }
  }

  /**
   * Log export activity
   * @param {string} module - Module name
   * @param {string} format - Export format
   * @param {number} userId - User ID
   * @param {string} filePath - Generated file path
   */
  async logExport(module, format, userId, filePath) {
    try {
      await pool.query(
        `INSERT INTO audit_logs (user_id, action, module, details, ip_address, created_at)
         VALUES ($1, 'EXPORT', $2, $3, $4, NOW())`,
        [
          userId,
          module,
          JSON.stringify({ format, filePath, fileName: path.basename(filePath) }),
          'system' // TODO: Get actual IP from request
        ]
      );
    } catch (error) {
      console.error('Log Export Error:', error);
      // Don't throw error, just log it
    }
  }
}

module.exports = new ExportService();
