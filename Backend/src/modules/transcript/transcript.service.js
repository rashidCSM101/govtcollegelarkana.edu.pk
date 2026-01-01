const { query, getClient } = require('../../config/database');
const { validateRequired } = require('../../utils/validator');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');

class TranscriptService {

  // ==================== DIGITAL MARKSHEET ====================

  // Get semester marksheet for a student
  async getMarksheet(studentId, semesterId) {
    // Verify student exists
    const studentResult = await query(`
      SELECT s.*, d.name as department_name, d.code as department_code,
             ses.name as session_name
      FROM students s
      JOIN departments d ON s.department_id = d.id
      LEFT JOIN sessions ses ON s.session_id = ses.id
      WHERE s.id = $1
    `, [studentId]);

    if (studentResult.rows.length === 0) {
      throw { status: 404, message: 'Student not found' };
    }

    const student = studentResult.rows[0];

    // Get semester details
    const semesterResult = await query(`
      SELECT sem.*, ses.name as session_name
      FROM semesters sem
      JOIN sessions ses ON sem.session_id = ses.id
      WHERE sem.id = $1
    `, [semesterId]);

    if (semesterResult.rows.length === 0) {
      throw { status: 404, message: 'Semester not found' };
    }

    const semester = semesterResult.rows[0];

    // Get grades for all courses in this semester
    const gradesResult = await query(`
      SELECT g.*, c.code as course_code, c.name as course_name, c.credit_hours
      FROM grades g
      JOIN courses c ON g.course_id = c.id
      WHERE g.student_id = $1 AND g.semester_id = $2
      ORDER BY c.code
    `, [studentId, semesterId]);

    if (gradesResult.rows.length === 0) {
      throw { status: 404, message: 'No grades found for this semester' };
    }

    // Calculate SGPA
    let totalGradePoints = 0;
    let totalCredits = 0;

    const courses = gradesResult.rows.map(grade => {
      const credits = grade.credit_hours || 3;
      const gradePoints = parseFloat(grade.grade_points) || 0;
      totalGradePoints += gradePoints * credits;
      totalCredits += credits;

      return {
        course_code: grade.course_code,
        course_name: grade.course_name,
        credit_hours: credits,
        marks: parseFloat(grade.marks).toFixed(2),
        grade: grade.grade,
        grade_points: gradePoints
      };
    });

    const sgpa = totalCredits > 0 ? (totalGradePoints / totalCredits) : 0;

    // Get semester result
    const resultResult = await query(`
      SELECT * FROM semester_results 
      WHERE student_id = $1 AND semester_id = $2
    `, [studentId, semesterId]);

    const semesterResult_ = resultResult.rows[0] || null;

    return {
      marksheet: {
        student: {
          id: student.id,
          name: student.name,
          roll_no: student.roll_no,
          father_name: student.father_name,
          department: student.department_name,
          department_code: student.department_code,
          session: student.session_name
        },
        semester: {
          id: semester.id,
          name: semester.name,
          number: semester.number,
          session: semester.session_name
        },
        courses,
        summary: {
          total_courses: courses.length,
          total_credits: totalCredits,
          total_grade_points: parseFloat(totalGradePoints.toFixed(2)),
          sgpa: parseFloat(sgpa.toFixed(2)),
          status: semesterResult_?.status || 'pending',
          cgpa: semesterResult_?.cgpa || null
        },
        generated_at: new Date().toISOString()
      }
    };
  }

  // Generate marksheet PDF
  async generateMarksheetPDF(studentId, semesterId) {
    const marksheetData = await this.getMarksheet(studentId, semesterId);
    const { marksheet } = marksheetData;

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        doc.fontSize(20).font('Helvetica-Bold')
           .text('GOVERNMENT COLLEGE LARKANA', { align: 'center' });
        doc.fontSize(12).font('Helvetica')
           .text('Larkana, Sindh, Pakistan', { align: 'center' });
        doc.moveDown();
        doc.fontSize(16).font('Helvetica-Bold')
           .text('SEMESTER MARKSHEET', { align: 'center' });
        doc.moveDown();

        // Student Info
        doc.fontSize(11).font('Helvetica-Bold').text('Student Information', { underline: true });
        doc.moveDown(0.5);
        doc.font('Helvetica');
        
        const leftCol = 50;
        const rightCol = 300;
        let y = doc.y;

        doc.text(`Name: ${marksheet.student.name}`, leftCol, y);
        doc.text(`Roll No: ${marksheet.student.roll_no}`, rightCol, y);
        y += 18;
        doc.text(`Father's Name: ${marksheet.student.father_name || 'N/A'}`, leftCol, y);
        doc.text(`Department: ${marksheet.student.department}`, rightCol, y);
        y += 18;
        doc.text(`Session: ${marksheet.student.session || 'N/A'}`, leftCol, y);
        doc.text(`Semester: ${marksheet.semester.name}`, rightCol, y);
        
        doc.moveDown(2);

        // Course Table Header
        const tableTop = doc.y;
        const tableLeft = 50;
        const colWidths = [80, 180, 50, 50, 50, 60];
        
        doc.font('Helvetica-Bold').fontSize(10);
        doc.rect(tableLeft, tableTop, 495, 20).fill('#f0f0f0').stroke();
        doc.fillColor('black');
        
        let x = tableLeft + 5;
        const headers = ['Code', 'Course Name', 'Credits', 'Marks', 'Grade', 'Grade Pts'];
        headers.forEach((header, i) => {
          doc.text(header, x, tableTop + 5, { width: colWidths[i] - 10 });
          x += colWidths[i];
        });

        // Course Rows
        doc.font('Helvetica').fontSize(10);
        let rowY = tableTop + 25;
        
        marksheet.courses.forEach((course, index) => {
          if (index % 2 === 0) {
            doc.rect(tableLeft, rowY - 3, 495, 18).fill('#f9f9f9').stroke();
            doc.fillColor('black');
          }
          
          x = tableLeft + 5;
          doc.text(course.course_code, x, rowY, { width: colWidths[0] - 10 });
          x += colWidths[0];
          doc.text(course.course_name, x, rowY, { width: colWidths[1] - 10 });
          x += colWidths[1];
          doc.text(course.credit_hours.toString(), x, rowY, { width: colWidths[2] - 10 });
          x += colWidths[2];
          doc.text(course.marks, x, rowY, { width: colWidths[3] - 10 });
          x += colWidths[3];
          doc.text(course.grade, x, rowY, { width: colWidths[4] - 10 });
          x += colWidths[4];
          doc.text(course.grade_points.toFixed(2), x, rowY, { width: colWidths[5] - 10 });
          
          rowY += 18;
        });

        // Draw table border
        doc.rect(tableLeft, tableTop, 495, rowY - tableTop + 5).stroke();

        // Summary
        doc.moveDown(2);
        y = rowY + 20;
        
        doc.font('Helvetica-Bold').fontSize(11);
        doc.text('RESULT SUMMARY', tableLeft, y, { underline: true });
        y += 20;
        
        doc.font('Helvetica').fontSize(10);
        doc.text(`Total Courses: ${marksheet.summary.total_courses}`, tableLeft, y);
        doc.text(`Total Credit Hours: ${marksheet.summary.total_credits}`, 200, y);
        y += 15;
        doc.text(`Total Grade Points: ${marksheet.summary.total_grade_points}`, tableLeft, y);
        doc.font('Helvetica-Bold');
        doc.text(`SGPA: ${marksheet.summary.sgpa}`, 200, y);
        if (marksheet.summary.cgpa) {
          doc.text(`CGPA: ${marksheet.summary.cgpa}`, 350, y);
        }
        y += 15;
        doc.text(`Status: ${marksheet.summary.status.toUpperCase()}`, tableLeft, y);

        // Digital Signature Section
        doc.moveDown(3);
        y = doc.y + 30;
        
        doc.font('Helvetica').fontSize(9);
        doc.text('_______________________', tableLeft, y);
        doc.text('_______________________', 250, y);
        doc.text('_______________________', 400, y);
        y += 12;
        doc.text('Controller of Exams', tableLeft, y);
        doc.text('Registrar', 250, y);
        doc.text('Principal', 400, y);

        // Footer
        doc.fontSize(8).text(
          `Generated on: ${new Date().toLocaleString()} | Document ID: MS-${studentId}-${semesterId}-${Date.now()}`,
          50, 780, { align: 'center' }
        );
        doc.text('This is a computer-generated document.', { align: 'center' });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // ==================== TRANSCRIPT SYSTEM ====================

  // Generate verification code
  generateVerificationCode() {
    return `GCL-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }

  // Request transcript
  async requestTranscript(studentId, requestData = {}) {
    const { purpose = 'General', copies = 1, delivery_type = 'pickup' } = requestData;

    // Verify student exists
    const studentResult = await query('SELECT id, name, roll_no FROM students WHERE id = $1', [studentId]);
    if (studentResult.rows.length === 0) {
      throw { status: 404, message: 'Student not found' };
    }

    // Check if there's already a pending request
    const pendingResult = await query(`
      SELECT id FROM transcript_requests 
      WHERE student_id = $1 AND status = 'pending'
    `, [studentId]);

    if (pendingResult.rows.length > 0) {
      throw { status: 400, message: 'You already have a pending transcript request' };
    }

    // Create request
    const result = await query(`
      INSERT INTO transcript_requests (student_id, purpose, copies, delivery_type, status)
      VALUES ($1, $2, $3, $4, 'pending')
      RETURNING *
    `, [studentId, purpose, copies, delivery_type]);

    return {
      message: 'Transcript request submitted successfully',
      request: result.rows[0]
    };
  }

  // Get transcript requests (Admin)
  async getTranscriptRequests(filters = {}) {
    const { status, student_id, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT tr.*, s.name as student_name, s.roll_no, d.name as department_name,
             u.email as approved_by_email
      FROM transcript_requests tr
      JOIN students s ON tr.student_id = s.id
      JOIN departments d ON s.department_id = d.id
      LEFT JOIN users u ON tr.approved_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      sql += ` AND tr.status = $${paramCount}`;
      params.push(status);
    }

    if (student_id) {
      paramCount++;
      sql += ` AND tr.student_id = $${paramCount}`;
      params.push(student_id);
    }

    sql += ` ORDER BY tr.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    // Get total count
    let countSql = 'SELECT COUNT(*) FROM transcript_requests tr WHERE 1=1';
    const countParams = [];
    let countParamCount = 0;

    if (status) {
      countParamCount++;
      countSql += ` AND tr.status = $${countParamCount}`;
      countParams.push(status);
    }

    const countResult = await query(countSql, countParams);

    return {
      requests: result.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        pages: Math.ceil(countResult.rows[0].count / limit)
      }
    };
  }

  // Approve/Reject transcript request (Admin)
  async processTranscriptRequest(userId, requestId, processData) {
    const { action, remarks } = processData;

    if (!['approve', 'reject'].includes(action)) {
      throw { status: 400, message: 'Action must be either approve or reject' };
    }

    // Get request
    const requestResult = await query(`
      SELECT tr.*, s.name as student_name, s.roll_no
      FROM transcript_requests tr
      JOIN students s ON tr.student_id = s.id
      WHERE tr.id = $1
    `, [requestId]);

    if (requestResult.rows.length === 0) {
      throw { status: 404, message: 'Transcript request not found' };
    }

    const request = requestResult.rows[0];

    if (request.status !== 'pending') {
      throw { status: 400, message: `Request is already ${request.status}` };
    }

    const client = await getClient();
    
    try {
      await client.query('BEGIN');

      if (action === 'approve') {
        // Generate verification code
        const verificationCode = this.generateVerificationCode();

        // Create transcript record
        const transcriptResult = await client.query(`
          INSERT INTO transcripts (student_id, verification_code, generated_by, status)
          VALUES ($1, $2, $3, 'issued')
          RETURNING *
        `, [request.student_id, verificationCode, userId]);

        // Update request
        await client.query(`
          UPDATE transcript_requests 
          SET status = 'approved', approved_by = $1, approved_at = CURRENT_TIMESTAMP,
              transcript_id = $2, remarks = $3
          WHERE id = $4
        `, [userId, transcriptResult.rows[0].id, remarks, requestId]);

        await client.query('COMMIT');

        return {
          message: 'Transcript request approved',
          transcript: transcriptResult.rows[0],
          verification_code: verificationCode
        };
      } else {
        // Reject request
        await client.query(`
          UPDATE transcript_requests 
          SET status = 'rejected', approved_by = $1, approved_at = CURRENT_TIMESTAMP, remarks = $2
          WHERE id = $3
        `, [userId, remarks || 'Request rejected', requestId]);

        await client.query('COMMIT');

        return {
          message: 'Transcript request rejected',
          remarks
        };
      }
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Get student's transcripts
  async getStudentTranscripts(studentId) {
    const result = await query(`
      SELECT t.*, u.email as generated_by_email
      FROM transcripts t
      LEFT JOIN users u ON t.generated_by = u.id
      WHERE t.student_id = $1
      ORDER BY t.generated_at DESC
    `, [studentId]);

    return result.rows;
  }

  // Get complete transcript data
  async getTranscriptData(studentId) {
    // Get student info
    const studentResult = await query(`
      SELECT s.*, d.name as department_name, d.code as department_code,
             ses.name as session_name, ses.start_date as session_start,
             ses.end_date as session_end
      FROM students s
      JOIN departments d ON s.department_id = d.id
      LEFT JOIN sessions ses ON s.session_id = ses.id
      WHERE s.id = $1
    `, [studentId]);

    if (studentResult.rows.length === 0) {
      throw { status: 404, message: 'Student not found' };
    }

    const student = studentResult.rows[0];

    // Get all semester grades
    const semestersResult = await query(`
      SELECT DISTINCT g.semester_id, sem.name as semester_name, sem.number as semester_number,
             sr.sgpa, sr.cgpa, sr.status, sr.total_credits
      FROM grades g
      JOIN semesters sem ON g.semester_id = sem.id
      LEFT JOIN semester_results sr ON g.student_id = sr.student_id AND g.semester_id = sr.semester_id
      WHERE g.student_id = $1
      ORDER BY sem.number
    `, [studentId]);

    const semesters = [];
    let grandTotalCredits = 0;
    let grandTotalGradePoints = 0;

    for (const sem of semestersResult.rows) {
      // Get courses for this semester
      const coursesResult = await query(`
        SELECT g.*, c.code as course_code, c.name as course_name, c.credit_hours
        FROM grades g
        JOIN courses c ON g.course_id = c.id
        WHERE g.student_id = $1 AND g.semester_id = $2
        ORDER BY c.code
      `, [studentId, sem.semester_id]);

      let semCredits = 0;
      let semGradePoints = 0;

      const courses = coursesResult.rows.map(course => {
        const credits = course.credit_hours || 3;
        const gp = parseFloat(course.grade_points) || 0;
        semCredits += credits;
        semGradePoints += gp * credits;

        return {
          code: course.course_code,
          name: course.course_name,
          credits,
          marks: parseFloat(course.marks).toFixed(2),
          grade: course.grade,
          grade_points: gp
        };
      });

      grandTotalCredits += semCredits;
      grandTotalGradePoints += semGradePoints;

      semesters.push({
        semester_id: sem.semester_id,
        semester_name: sem.semester_name,
        semester_number: sem.semester_number,
        courses,
        credits: semCredits,
        sgpa: parseFloat(sem.sgpa) || (semCredits > 0 ? parseFloat((semGradePoints / semCredits).toFixed(2)) : 0),
        status: sem.status || 'completed'
      });
    }

    const cgpa = grandTotalCredits > 0 ? parseFloat((grandTotalGradePoints / grandTotalCredits).toFixed(2)) : 0;

    return {
      student: {
        id: student.id,
        name: student.name,
        roll_no: student.roll_no,
        father_name: student.father_name,
        cnic: student.cnic,
        department: student.department_name,
        department_code: student.department_code,
        session: student.session_name,
        admission_date: student.admission_date,
        date_of_birth: student.date_of_birth
      },
      academic_record: {
        semesters,
        total_semesters: semesters.length,
        total_credits: grandTotalCredits,
        cgpa
      },
      generated_at: new Date().toISOString()
    };
  }

  // Generate transcript PDF
  async generateTranscriptPDF(studentId, verificationCode = null) {
    const transcriptData = await this.getTranscriptData(studentId);
    const { student, academic_record } = transcriptData;

    // If no verification code provided, generate one
    if (!verificationCode) {
      verificationCode = this.generateVerificationCode();
    }

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header with border
        doc.rect(30, 30, 535, 80).stroke();
        doc.fontSize(18).font('Helvetica-Bold')
           .text('GOVERNMENT COLLEGE LARKANA', 40, 45, { align: 'center' });
        doc.fontSize(10).font('Helvetica')
           .text('Larkana, Sindh, Pakistan', { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(14).font('Helvetica-Bold')
           .text('OFFICIAL ACADEMIC TRANSCRIPT', { align: 'center' });
        
        doc.moveDown();

        // Student Information Box
        const infoBoxTop = 120;
        doc.rect(30, infoBoxTop, 535, 90).stroke();
        doc.fontSize(10).font('Helvetica-Bold')
           .text('STUDENT INFORMATION', 40, infoBoxTop + 5);
        
        doc.font('Helvetica').fontSize(9);
        let y = infoBoxTop + 22;
        const col1 = 40, col2 = 200, col3 = 350;

        doc.text(`Name: ${student.name}`, col1, y);
        doc.text(`Roll No: ${student.roll_no}`, col2, y);
        doc.text(`CNIC: ${student.cnic || 'N/A'}`, col3, y);
        y += 15;
        doc.text(`Father's Name: ${student.father_name || 'N/A'}`, col1, y);
        doc.text(`Department: ${student.department}`, col2, y);
        y += 15;
        doc.text(`Session: ${student.session || 'N/A'}`, col1, y);
        doc.text(`Admission Date: ${student.admission_date || 'N/A'}`, col2, y);
        y += 15;
        doc.text(`Program: Bachelor's Degree`, col1, y);
        doc.text(`Date of Birth: ${student.date_of_birth || 'N/A'}`, col2, y);

        // Academic Record
        y = infoBoxTop + 100;
        
        for (const semester of academic_record.semesters) {
          // Semester Header
          doc.fontSize(10).font('Helvetica-Bold');
          doc.rect(30, y, 535, 18).fill('#e0e0e0').stroke();
          doc.fillColor('black');
          doc.text(`SEMESTER ${semester.semester_number}: ${semester.semester_name}`, 40, y + 4);
          y += 22;

          // Course Table Header
          doc.fontSize(8).font('Helvetica-Bold');
          doc.rect(30, y, 535, 15).fill('#f5f5f5').stroke();
          doc.fillColor('black');
          
          doc.text('Code', 35, y + 3, { width: 60 });
          doc.text('Course Title', 100, y + 3, { width: 200 });
          doc.text('Credits', 310, y + 3, { width: 45 });
          doc.text('Marks', 360, y + 3, { width: 45 });
          doc.text('Grade', 415, y + 3, { width: 45 });
          doc.text('GP', 465, y + 3, { width: 45 });
          doc.text('Quality Pts', 510, y + 3, { width: 55 });
          y += 18;

          // Course Rows
          doc.font('Helvetica').fontSize(8);
          for (const course of semester.courses) {
            doc.text(course.code, 35, y, { width: 60 });
            doc.text(course.name, 100, y, { width: 200 });
            doc.text(course.credits.toString(), 310, y, { width: 45 });
            doc.text(course.marks, 360, y, { width: 45 });
            doc.text(course.grade, 415, y, { width: 45 });
            doc.text(course.grade_points.toFixed(2), 465, y, { width: 45 });
            doc.text((course.credits * course.grade_points).toFixed(2), 510, y, { width: 55 });
            y += 13;
          }

          // Semester Summary
          doc.font('Helvetica-Bold').fontSize(8);
          doc.text(`Semester Credits: ${semester.credits}`, 310, y);
          doc.text(`SGPA: ${semester.sgpa}`, 420, y);
          y += 20;

          // Check for page break
          if (y > 700) {
            doc.addPage();
            y = 50;
          }
        }

        // Final Summary
        y += 10;
        doc.rect(30, y, 535, 50).stroke();
        doc.fontSize(11).font('Helvetica-Bold');
        doc.text('CUMULATIVE ACADEMIC SUMMARY', 40, y + 5);
        y += 22;
        doc.fontSize(10).font('Helvetica');
        doc.text(`Total Semesters Completed: ${academic_record.total_semesters}`, 40, y);
        doc.text(`Total Credit Hours: ${academic_record.total_credits}`, 220, y);
        doc.font('Helvetica-Bold');
        doc.text(`CGPA: ${academic_record.cgpa}`, 400, y);

        // Grading Scale
        y += 40;
        doc.fontSize(9).font('Helvetica-Bold').text('GRADING SCALE:', 40, y);
        y += 12;
        doc.font('Helvetica').fontSize(8);
        doc.text('A+ (85-100) = 4.00 | A (80-84) = 4.00 | B+ (75-79) = 3.50 | B (70-74) = 3.00 | C+ (65-69) = 2.50', 40, y);
        y += 10;
        doc.text('C (60-64) = 2.00 | D+ (55-59) = 1.50 | D (50-54) = 1.00 | F (0-49) = 0.00', 40, y);

        // Signatures
        y += 40;
        doc.fontSize(9);
        doc.text('_________________________', 50, y);
        doc.text('_________________________', 230, y);
        doc.text('_________________________', 410, y);
        y += 12;
        doc.text('Controller of Examinations', 50, y);
        doc.text('Registrar', 230, y);
        doc.text('Principal', 410, y);

        // Verification Code & Footer
        doc.fontSize(8);
        doc.text(`Verification Code: ${verificationCode}`, 40, 760);
        doc.text(`Verify at: https://govtcollegelarkana.edu.pk/verify/${verificationCode}`, 40, 772);
        doc.text(`Issue Date: ${new Date().toLocaleDateString()}`, 400, 760);
        doc.text('Page 1 of 1', 400, 772);
        
        doc.fontSize(7).text(
          'This transcript is valid only with the college seal and authorized signatures.',
          40, 790, { align: 'center' }
        );

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // Verify transcript
  async verifyTranscript(verificationCode) {
    const result = await query(`
      SELECT t.*, s.name as student_name, s.roll_no, d.name as department_name,
             u.email as issued_by
      FROM transcripts t
      JOIN students s ON t.student_id = s.id
      JOIN departments d ON s.department_id = d.id
      LEFT JOIN users u ON t.generated_by = u.id
      WHERE t.verification_code = $1
    `, [verificationCode]);

    if (result.rows.length === 0) {
      return {
        valid: false,
        message: 'Invalid verification code. This transcript could not be verified.'
      };
    }

    const transcript = result.rows[0];

    if (transcript.status === 'revoked') {
      return {
        valid: false,
        message: 'This transcript has been revoked and is no longer valid.',
        revoked_at: transcript.revoked_at
      };
    }

    return {
      valid: true,
      message: 'This is a valid transcript issued by Government College Larkana.',
      transcript: {
        student_name: transcript.student_name,
        roll_no: transcript.roll_no,
        department: transcript.department_name,
        issued_date: transcript.generated_at,
        status: transcript.status
      }
    };
  }

  // ==================== DEGREE AUDIT ====================

  // Get degree audit for student
  async getDegreeAudit(studentId) {
    // Get student info
    const studentResult = await query(`
      SELECT s.*, d.name as department_name, d.code as department_code,
             ses.name as session_name, ses.start_date as session_start
      FROM students s
      JOIN departments d ON s.department_id = d.id
      LEFT JOIN sessions ses ON s.session_id = ses.id
      WHERE s.id = $1
    `, [studentId]);

    if (studentResult.rows.length === 0) {
      throw { status: 404, message: 'Student not found' };
    }

    const student = studentResult.rows[0];

    // Get program requirements (default: 4-year BS = 8 semesters, ~130 credits)
    const totalRequiredCredits = 130; // Default for BS degree
    const totalRequiredSemesters = 8;

    // Get completed courses and credits
    const completedResult = await query(`
      SELECT g.course_id, g.semester_id, g.grade, g.grade_points, 
             c.code as course_code, c.name as course_name, c.credit_hours,
             sem.number as semester_number
      FROM grades g
      JOIN courses c ON g.course_id = c.id
      JOIN semesters sem ON g.semester_id = sem.id
      WHERE g.student_id = $1 AND g.grade != 'F'
      ORDER BY sem.number, c.code
    `, [studentId]);

    // Get failed/incomplete courses
    const failedResult = await query(`
      SELECT g.course_id, c.code as course_code, c.name as course_name, 
             c.credit_hours, g.grade, sem.name as semester_name
      FROM grades g
      JOIN courses c ON g.course_id = c.id
      JOIN semesters sem ON g.semester_id = sem.id
      WHERE g.student_id = $1 AND g.grade = 'F'
      ORDER BY sem.number
    `, [studentId]);

    // Get all department courses (requirements)
    const requirementsResult = await query(`
      SELECT c.id, c.code, c.name, c.credit_hours, c.semester_number,
             CASE WHEN g.id IS NOT NULL THEN true ELSE false END as completed,
             g.grade
      FROM courses c
      LEFT JOIN grades g ON c.id = g.course_id AND g.student_id = $1
      WHERE c.department_id = $2 AND c.is_active = true
      ORDER BY c.semester_number, c.code
    `, [studentId, student.department_id]);

    // Calculate statistics
    const completedCredits = completedResult.rows.reduce((sum, c) => sum + (c.credit_hours || 3), 0);
    const remainingCredits = Math.max(0, totalRequiredCredits - completedCredits);
    const progressPercentage = Math.min(100, (completedCredits / totalRequiredCredits) * 100);

    // Get completed semesters
    const completedSemestersResult = await query(`
      SELECT DISTINCT semester_id FROM grades WHERE student_id = $1
    `, [studentId]);
    const completedSemesters = completedSemestersResult.rows.length;
    const remainingSemesters = Math.max(0, totalRequiredSemesters - completedSemesters);

    // Calculate expected graduation
    const sessionStart = student.session_start ? new Date(student.session_start) : new Date();
    const expectedGraduation = new Date(sessionStart);
    expectedGraduation.setFullYear(expectedGraduation.getFullYear() + 4);

    // Group completed courses by semester
    const completedBySemester = {};
    completedResult.rows.forEach(course => {
      const semNum = course.semester_number;
      if (!completedBySemester[semNum]) {
        completedBySemester[semNum] = [];
      }
      completedBySemester[semNum].push({
        code: course.course_code,
        name: course.course_name,
        credits: course.credit_hours,
        grade: course.grade,
        grade_points: course.grade_points
      });
    });

    // Get remaining required courses
    const remainingCourses = requirementsResult.rows.filter(c => !c.completed);

    // Calculate CGPA
    let totalGradePoints = 0;
    let totalCreditsForGPA = 0;
    completedResult.rows.forEach(c => {
      const credits = c.credit_hours || 3;
      totalGradePoints += (parseFloat(c.grade_points) || 0) * credits;
      totalCreditsForGPA += credits;
    });
    const cgpa = totalCreditsForGPA > 0 ? (totalGradePoints / totalCreditsForGPA) : 0;

    return {
      student: {
        id: student.id,
        name: student.name,
        roll_no: student.roll_no,
        department: student.department_name,
        department_code: student.department_code,
        current_semester: student.current_semester
      },
      degree_requirements: {
        program: 'Bachelor of Science (BS)',
        total_credits_required: totalRequiredCredits,
        total_semesters_required: totalRequiredSemesters
      },
      progress: {
        completed_credits: completedCredits,
        remaining_credits: remainingCredits,
        completed_semesters: completedSemesters,
        remaining_semesters: remainingSemesters,
        progress_percentage: parseFloat(progressPercentage.toFixed(2)),
        cgpa: parseFloat(cgpa.toFixed(2)),
        expected_graduation: expectedGraduation.toISOString().split('T')[0],
        on_track: remainingCredits <= (remainingSemesters * 18) // ~18 credits per semester
      },
      completed_courses: completedBySemester,
      total_completed_courses: completedResult.rows.length,
      failed_courses: failedResult.rows.map(c => ({
        code: c.course_code,
        name: c.course_name,
        credits: c.credit_hours,
        grade: c.grade,
        semester: c.semester_name
      })),
      remaining_courses: remainingCourses.map(c => ({
        code: c.code,
        name: c.name,
        credits: c.credit_hours,
        semester_number: c.semester_number
      })),
      generated_at: new Date().toISOString()
    };
  }

  // Get student progress summary
  async getStudentProgress(studentId) {
    const audit = await this.getDegreeAudit(studentId);

    return {
      student: audit.student,
      progress: {
        ...audit.progress,
        total_courses_completed: audit.total_completed_courses,
        courses_to_retake: audit.failed_courses.length,
        courses_remaining: audit.remaining_courses.length
      },
      summary: {
        credits_completed: `${audit.progress.completed_credits}/${audit.degree_requirements.total_credits_required}`,
        semesters_completed: `${audit.progress.completed_semesters}/${audit.degree_requirements.total_semesters_required}`,
        status: audit.progress.on_track ? 'On Track' : 'Behind Schedule'
      }
    };
  }

  // Get my transcript requests (Student)
  async getMyTranscriptRequests(studentId) {
    const result = await query(`
      SELECT tr.*, 
             CASE WHEN t.id IS NOT NULL THEN t.verification_code ELSE NULL END as verification_code
      FROM transcript_requests tr
      LEFT JOIN transcripts t ON tr.transcript_id = t.id
      WHERE tr.student_id = $1
      ORDER BY tr.created_at DESC
    `, [studentId]);

    return result.rows;
  }
}

module.exports = new TranscriptService();
