const pool = require('../../config/database');

/**
 * Report Service
 * Handles comprehensive reporting for students, attendance, academics, financials, and teachers
 */
class ReportService {

  // ==================== STUDENT REPORTS ====================

  /**
   * Generate student reports
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Student report data
   */
  async getStudentReports(filters = {}) {
    try {
      // Overall statistics
      const overallQuery = `
        SELECT 
          COUNT(*) as total_students,
          COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_students,
          COUNT(CASE WHEN status = 'Inactive' THEN 1 END) as inactive_students,
          COUNT(CASE WHEN status = 'Graduated' THEN 1 END) as graduated_students,
          COUNT(CASE WHEN status = 'Dropout' THEN 1 END) as dropout_students,
          COUNT(CASE WHEN gender = 'Male' THEN 1 END) as male_students,
          COUNT(CASE WHEN gender = 'Female' THEN 1 END) as female_students
        FROM students
      `;

      const overallResult = await pool.query(overallQuery);

      // Department-wise strength
      const departmentQuery = `
        SELECT 
          d.name as department_name,
          d.code as department_code,
          COUNT(s.id) as total_students,
          COUNT(CASE WHEN s.status = 'Active' THEN 1 END) as active_students,
          COUNT(CASE WHEN s.gender = 'Male' THEN 1 END) as male_students,
          COUNT(CASE WHEN s.gender = 'Female' THEN 1 END) as female_students
        FROM departments d
        LEFT JOIN students s ON d.id = s.department_id
        GROUP BY d.id, d.name, d.code
        ORDER BY total_students DESC
      `;

      const departmentResult = await pool.query(departmentQuery);

      // Batch/Session-wise analysis
      const batchQuery = `
        SELECT 
          ses.name as session_name,
          ses.start_year,
          ses.end_year,
          COUNT(s.id) as total_students,
          COUNT(CASE WHEN s.status = 'Active' THEN 1 END) as active_students,
          COUNT(CASE WHEN s.status = 'Graduated' THEN 1 END) as graduated_students,
          COUNT(CASE WHEN s.status = 'Dropout' THEN 1 END) as dropout_students
        FROM sessions ses
        LEFT JOIN students s ON ses.id = s.session_id
        GROUP BY ses.id, ses.name, ses.start_year, ses.end_year
        ORDER BY ses.start_year DESC
      `;

      const batchResult = await pool.query(batchQuery);

      // Enrollment trend (last 12 months)
      const enrollmentQuery = `
        SELECT 
          TO_CHAR(admission_date, 'YYYY-MM') as month,
          COUNT(*) as enrollments
        FROM students
        WHERE admission_date >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY TO_CHAR(admission_date, 'YYYY-MM')
        ORDER BY month DESC
      `;

      const enrollmentResult = await pool.query(enrollmentQuery);

      // Dropout analysis
      const dropoutQuery = `
        SELECT 
          d.name as department_name,
          ses.name as session_name,
          COUNT(s.id) as dropout_count,
          ROUND(COUNT(s.id) * 100.0 / NULLIF(
            (SELECT COUNT(*) FROM students WHERE department_id = s.department_id AND session_id = s.session_id), 0
          ), 2) as dropout_percentage
        FROM students s
        LEFT JOIN departments d ON s.department_id = d.id
        LEFT JOIN sessions ses ON s.session_id = ses.id
        WHERE s.status = 'Dropout'
        GROUP BY d.name, ses.name, s.department_id, s.session_id
        ORDER BY dropout_count DESC
      `;

      const dropoutResult = await pool.query(dropoutQuery);

      // Gender-wise statistics by department
      const genderQuery = `
        SELECT 
          d.name as department_name,
          COUNT(CASE WHEN s.gender = 'Male' THEN 1 END) as male_count,
          COUNT(CASE WHEN s.gender = 'Female' THEN 1 END) as female_count,
          ROUND(COUNT(CASE WHEN s.gender = 'Male' THEN 1 END) * 100.0 / NULLIF(COUNT(s.id), 0), 2) as male_percentage,
          ROUND(COUNT(CASE WHEN s.gender = 'Female' THEN 1 END) * 100.0 / NULLIF(COUNT(s.id), 0), 2) as female_percentage
        FROM departments d
        LEFT JOIN students s ON d.id = s.department_id
        WHERE s.status = 'Active'
        GROUP BY d.id, d.name
        ORDER BY d.name
      `;

      const genderResult = await pool.query(genderQuery);

      return {
        overall: overallResult.rows[0],
        by_department: departmentResult.rows,
        by_batch: batchResult.rows,
        enrollment_trend: enrollmentResult.rows,
        dropout_analysis: dropoutResult.rows,
        gender_statistics: genderResult.rows
      };

    } catch (error) {
      console.error('Get Student Reports Error:', error);
      throw new Error('Failed to generate student reports');
    }
  }

  // ==================== ATTENDANCE REPORTS ====================

  /**
   * Generate attendance reports
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Attendance report data
   */
  async getAttendanceReports(filters = {}) {
    try {
      const { start_date, end_date, department_id, course_id } = filters;

      // Overall attendance statistics
      const overallQuery = `
        SELECT 
          COUNT(*) as total_attendance_records,
          COUNT(CASE WHEN status = 'Present' THEN 1 END) as present_count,
          COUNT(CASE WHEN status = 'Absent' THEN 1 END) as absent_count,
          COUNT(CASE WHEN status = 'Late' THEN 1 END) as late_count,
          COUNT(CASE WHEN status = 'Leave' THEN 1 END) as leave_count,
          ROUND(COUNT(CASE WHEN status = 'Present' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 2) as attendance_percentage
        FROM attendance
        WHERE 1=1
        ${start_date ? "AND date >= '" + start_date + "'" : ''}
        ${end_date ? "AND date <= '" + end_date + "'" : ''}
      `;

      const overallResult = await pool.query(overallQuery);

      // Department-wise attendance
      const departmentQuery = `
        SELECT 
          d.name as department_name,
          COUNT(a.id) as total_records,
          COUNT(CASE WHEN a.status = 'Present' THEN 1 END) as present_count,
          COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) as absent_count,
          ROUND(COUNT(CASE WHEN a.status = 'Present' THEN 1 END) * 100.0 / NULLIF(COUNT(a.id), 0), 2) as attendance_percentage
        FROM departments d
        LEFT JOIN students s ON d.id = s.department_id
        LEFT JOIN attendance a ON s.id = a.student_id
        WHERE a.id IS NOT NULL
        ${start_date ? "AND a.date >= '" + start_date + "'" : ''}
        ${end_date ? "AND a.date <= '" + end_date + "'" : ''}
        GROUP BY d.id, d.name
        ORDER BY attendance_percentage DESC
      `;

      const departmentResult = await pool.query(departmentQuery);

      // Course-wise attendance
      const courseQuery = `
        SELECT 
          c.name as course_name,
          c.code as course_code,
          d.name as department_name,
          COUNT(a.id) as total_records,
          COUNT(CASE WHEN a.status = 'Present' THEN 1 END) as present_count,
          ROUND(COUNT(CASE WHEN a.status = 'Present' THEN 1 END) * 100.0 / NULLIF(COUNT(a.id), 0), 2) as attendance_percentage
        FROM courses c
        LEFT JOIN departments d ON c.department_id = d.id
        LEFT JOIN attendance a ON c.id = a.course_id
        WHERE a.id IS NOT NULL
        ${start_date ? "AND a.date >= '" + start_date + "'" : ''}
        ${end_date ? "AND a.date <= '" + end_date + "'" : ''}
        ${course_id ? "AND c.id = " + course_id : ''}
        GROUP BY c.id, c.name, c.code, d.name
        ORDER BY attendance_percentage ASC
      `;

      const courseResult = await pool.query(courseQuery);

      // Defaulter list (< 75% attendance)
      const defaulterQuery = `
        SELECT 
          s.name as student_name,
          s.registration_number,
          d.name as department_name,
          COUNT(a.id) as total_classes,
          COUNT(CASE WHEN a.status = 'Present' THEN 1 END) as present_count,
          ROUND(COUNT(CASE WHEN a.status = 'Present' THEN 1 END) * 100.0 / NULLIF(COUNT(a.id), 0), 2) as attendance_percentage
        FROM students s
        LEFT JOIN departments d ON s.department_id = d.id
        LEFT JOIN attendance a ON s.id = a.student_id
        WHERE a.id IS NOT NULL
        ${start_date ? "AND a.date >= '" + start_date + "'" : ''}
        ${end_date ? "AND a.date <= '" + end_date + "'" : ''}
        ${department_id ? "AND d.id = " + department_id : ''}
        GROUP BY s.id, s.name, s.registration_number, d.name
        HAVING ROUND(COUNT(CASE WHEN a.status = 'Present' THEN 1 END) * 100.0 / NULLIF(COUNT(a.id), 0), 2) < 75
        ORDER BY attendance_percentage ASC
      `;

      const defaulterResult = await pool.query(defaulterQuery);

      // Monthly attendance trend
      const trendQuery = `
        SELECT 
          TO_CHAR(date, 'YYYY-MM') as month,
          COUNT(*) as total_records,
          COUNT(CASE WHEN status = 'Present' THEN 1 END) as present_count,
          ROUND(COUNT(CASE WHEN status = 'Present' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 2) as attendance_percentage
        FROM attendance
        WHERE date >= CURRENT_DATE - INTERVAL '6 months'
        GROUP BY TO_CHAR(date, 'YYYY-MM')
        ORDER BY month DESC
      `;

      const trendResult = await pool.query(trendQuery);

      return {
        overall: overallResult.rows[0],
        by_department: departmentResult.rows,
        by_course: courseResult.rows,
        defaulters: defaulterResult.rows,
        monthly_trend: trendResult.rows
      };

    } catch (error) {
      console.error('Get Attendance Reports Error:', error);
      throw new Error('Failed to generate attendance reports');
    }
  }

  // ==================== ACADEMIC REPORTS ====================

  /**
   * Generate academic reports
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Academic report data
   */
  async getAcademicReports(filters = {}) {
    try {
      const { semester_id, department_id, session_id } = filters;

      // Overall result statistics
      const overallQuery = `
        SELECT 
          COUNT(DISTINCT sr.student_id) as total_students,
          COUNT(CASE WHEN sr.grade IN ('A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C') THEN sr.student_id END) as passed_students,
          COUNT(CASE WHEN sr.grade = 'F' THEN sr.student_id END) as failed_students,
          ROUND(COUNT(CASE WHEN sr.grade IN ('A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C') THEN sr.student_id END) * 100.0 / 
            NULLIF(COUNT(DISTINCT sr.student_id), 0), 2) as pass_percentage,
          ROUND(AVG(sr.marks_obtained), 2) as average_marks,
          ROUND(AVG(sr.gpa), 2) as average_gpa
        FROM student_results sr
        WHERE 1=1
        ${semester_id ? "AND sr.semester_id = " + semester_id : ''}
      `;

      const overallResult = await pool.query(overallQuery);

      // Grade distribution
      const gradeQuery = `
        SELECT 
          grade,
          COUNT(*) as count,
          ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM student_results WHERE 1=1 
            ${semester_id ? "AND semester_id = " + semester_id : ''}), 0), 2) as percentage
        FROM student_results
        WHERE 1=1
        ${semester_id ? "AND semester_id = " + semester_id : ''}
        GROUP BY grade
        ORDER BY 
          CASE grade
            WHEN 'A+' THEN 1
            WHEN 'A' THEN 2
            WHEN 'A-' THEN 3
            WHEN 'B+' THEN 4
            WHEN 'B' THEN 5
            WHEN 'B-' THEN 6
            WHEN 'C+' THEN 7
            WHEN 'C' THEN 8
            WHEN 'D' THEN 9
            WHEN 'F' THEN 10
            ELSE 11
          END
      `;

      const gradeResult = await pool.query(gradeQuery);

      // Top performers (by CGPA)
      const topPerformersQuery = `
        SELECT 
          s.name as student_name,
          s.registration_number,
          d.name as department_name,
          s.cgpa,
          COUNT(sr.id) as courses_taken,
          COUNT(CASE WHEN sr.grade IN ('A+', 'A') THEN 1 END) as a_grades
        FROM students s
        LEFT JOIN departments d ON s.department_id = d.id
        LEFT JOIN student_results sr ON s.id = sr.student_id
        WHERE s.cgpa IS NOT NULL
        ${department_id ? "AND d.id = " + department_id : ''}
        ${session_id ? "AND s.session_id = " + session_id : ''}
        GROUP BY s.id, s.name, s.registration_number, d.name, s.cgpa
        ORDER BY s.cgpa DESC
        LIMIT 20
      `;

      const topPerformersResult = await pool.query(topPerformersQuery);

      // Subject-wise performance
      const subjectQuery = `
        SELECT 
          c.name as course_name,
          c.code as course_code,
          COUNT(sr.id) as total_students,
          COUNT(CASE WHEN sr.grade IN ('A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C') THEN 1 END) as passed,
          COUNT(CASE WHEN sr.grade = 'F' THEN 1 END) as failed,
          ROUND(AVG(sr.marks_obtained), 2) as average_marks,
          ROUND(COUNT(CASE WHEN sr.grade IN ('A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C') THEN 1 END) * 100.0 / 
            NULLIF(COUNT(sr.id), 0), 2) as pass_percentage
        FROM courses c
        LEFT JOIN student_results sr ON c.id = sr.course_id
        WHERE sr.id IS NOT NULL
        ${semester_id ? "AND sr.semester_id = " + semester_id : ''}
        GROUP BY c.id, c.name, c.code
        ORDER BY pass_percentage ASC
      `;

      const subjectResult = await pool.query(subjectQuery);

      // Department comparison
      const departmentQuery = `
        SELECT 
          d.name as department_name,
          COUNT(DISTINCT sr.student_id) as total_students,
          ROUND(AVG(s.cgpa), 2) as average_cgpa,
          COUNT(CASE WHEN sr.grade IN ('A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C') THEN sr.id END) as passed_courses,
          COUNT(CASE WHEN sr.grade = 'F' THEN sr.id END) as failed_courses,
          ROUND(COUNT(CASE WHEN sr.grade IN ('A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C') THEN sr.id END) * 100.0 / 
            NULLIF(COUNT(sr.id), 0), 2) as pass_percentage
        FROM departments d
        LEFT JOIN students s ON d.id = s.department_id
        LEFT JOIN student_results sr ON s.id = sr.student_id
        WHERE sr.id IS NOT NULL
        ${semester_id ? "AND sr.semester_id = " + semester_id : ''}
        GROUP BY d.id, d.name
        ORDER BY average_cgpa DESC
      `;

      const departmentResult = await pool.query(departmentQuery);

      // Semester-wise comparison
      const semesterQuery = `
        SELECT 
          sem.name as semester_name,
          COUNT(DISTINCT sr.student_id) as total_students,
          ROUND(AVG(sr.gpa), 2) as average_gpa,
          ROUND(COUNT(CASE WHEN sr.grade IN ('A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C') THEN sr.id END) * 100.0 / 
            NULLIF(COUNT(sr.id), 0), 2) as pass_percentage
        FROM semesters sem
        LEFT JOIN student_results sr ON sem.id = sr.semester_id
        WHERE sr.id IS NOT NULL
        GROUP BY sem.id, sem.name
        ORDER BY sem.id DESC
      `;

      const semesterResult = await pool.query(semesterQuery);

      return {
        overall: overallResult.rows[0],
        grade_distribution: gradeResult.rows,
        top_performers: topPerformersResult.rows,
        subject_performance: subjectResult.rows,
        department_comparison: departmentResult.rows,
        semester_comparison: semesterResult.rows
      };

    } catch (error) {
      console.error('Get Academic Reports Error:', error);
      throw new Error('Failed to generate academic reports');
    }
  }

  // ==================== FINANCIAL REPORTS ====================

  /**
   * Generate financial reports
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Financial report data
   */
  async getFinancialReports(filters = {}) {
    try {
      const { start_date, end_date, department_id, payment_mode } = filters;

      // Overall fee collection statistics
      const overallQuery = `
        SELECT 
          COUNT(*) as total_fee_records,
          SUM(total_amount) as total_billed,
          SUM(paid_amount) as total_collected,
          SUM(remaining_amount) as total_pending,
          ROUND(SUM(paid_amount) * 100.0 / NULLIF(SUM(total_amount), 0), 2) as collection_percentage,
          COUNT(CASE WHEN payment_status = 'Paid' THEN 1 END) as fully_paid_count,
          COUNT(CASE WHEN payment_status = 'Partial' THEN 1 END) as partial_paid_count,
          COUNT(CASE WHEN payment_status = 'Pending' THEN 1 END) as pending_count
        FROM student_fees
        WHERE 1=1
        ${start_date ? "AND due_date >= '" + start_date + "'" : ''}
        ${end_date ? "AND due_date <= '" + end_date + "'" : ''}
      `;

      const overallResult = await pool.query(overallQuery);

      // Department-wise collection
      const departmentQuery = `
        SELECT 
          d.name as department_name,
          COUNT(sf.id) as total_records,
          SUM(sf.total_amount) as total_billed,
          SUM(sf.paid_amount) as total_collected,
          SUM(sf.remaining_amount) as total_pending,
          ROUND(SUM(sf.paid_amount) * 100.0 / NULLIF(SUM(sf.total_amount), 0), 2) as collection_percentage
        FROM departments d
        LEFT JOIN students s ON d.id = s.department_id
        LEFT JOIN student_fees sf ON s.id = sf.student_id
        WHERE sf.id IS NOT NULL
        ${start_date ? "AND sf.due_date >= '" + start_date + "'" : ''}
        ${end_date ? "AND sf.due_date <= '" + end_date + "'" : ''}
        GROUP BY d.id, d.name
        ORDER BY total_collected DESC
      `;

      const departmentResult = await pool.query(departmentQuery);

      // Monthly collection trend
      const monthlyQuery = `
        SELECT 
          TO_CHAR(payment_date, 'YYYY-MM') as month,
          SUM(amount) as total_collected,
          COUNT(*) as transaction_count
        FROM fee_payments
        WHERE payment_date >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY TO_CHAR(payment_date, 'YYYY-MM')
        ORDER BY month DESC
      `;

      const monthlyResult = await pool.query(monthlyQuery);

      // Payment mode analysis
      const paymentModeQuery = `
        SELECT 
          payment_mode,
          COUNT(*) as transaction_count,
          SUM(amount) as total_amount,
          ROUND(SUM(amount) * 100.0 / NULLIF((SELECT SUM(amount) FROM fee_payments WHERE 1=1
            ${start_date ? "AND payment_date >= '" + start_date + "'" : ''}
            ${end_date ? "AND payment_date <= '" + end_date + "'" : ''}), 0), 2) as percentage
        FROM fee_payments
        WHERE 1=1
        ${start_date ? "AND payment_date >= '" + start_date + "'" : ''}
        ${end_date ? "AND payment_date <= '" + end_date + "'" : ''}
        ${payment_mode ? "AND payment_mode = '" + payment_mode + "'" : ''}
        GROUP BY payment_mode
        ORDER BY total_amount DESC
      `;

      const paymentModeResult = await pool.query(paymentModeQuery);

      // Pending dues by student
      const pendingQuery = `
        SELECT 
          s.name as student_name,
          s.registration_number,
          s.phone,
          d.name as department_name,
          SUM(sf.remaining_amount) as total_pending,
          COUNT(sf.id) as pending_fee_records,
          MIN(sf.due_date) as oldest_due_date
        FROM students s
        LEFT JOIN departments d ON s.department_id = d.id
        LEFT JOIN student_fees sf ON s.id = sf.student_id
        WHERE sf.remaining_amount > 0
        ${department_id ? "AND d.id = " + department_id : ''}
        GROUP BY s.id, s.name, s.registration_number, s.phone, d.name
        ORDER BY total_pending DESC
        LIMIT 50
      `;

      const pendingResult = await pool.query(pendingQuery);

      // Fee type breakdown
      const feeTypeQuery = `
        SELECT 
          fee_type,
          SUM(total_amount) as total_billed,
          SUM(paid_amount) as total_collected,
          COUNT(*) as record_count
        FROM student_fees
        WHERE 1=1
        ${start_date ? "AND due_date >= '" + start_date + "'" : ''}
        ${end_date ? "AND due_date <= '" + end_date + "'" : ''}
        GROUP BY fee_type
        ORDER BY total_collected DESC
      `;

      const feeTypeResult = await pool.query(feeTypeQuery);

      return {
        overall: overallResult.rows[0],
        by_department: departmentResult.rows,
        monthly_collection: monthlyResult.rows,
        payment_mode_analysis: paymentModeResult.rows,
        pending_dues: pendingResult.rows,
        fee_type_breakdown: feeTypeResult.rows
      };

    } catch (error) {
      console.error('Get Financial Reports Error:', error);
      throw new Error('Failed to generate financial reports');
    }
  }

  // ==================== TEACHER REPORTS ====================

  /**
   * Generate teacher reports
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Teacher report data
   */
  async getTeacherReports(filters = {}) {
    try {
      const { department_id, teacher_id } = filters;

      // Overall teacher statistics
      const overallQuery = `
        SELECT 
          COUNT(*) as total_teachers,
          COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_teachers,
          COUNT(CASE WHEN status = 'Inactive' THEN 1 END) as inactive_teachers
        FROM teachers
      `;

      const overallResult = await pool.query(overallQuery);

      // Course load by teacher
      const courseLoadQuery = `
        SELECT 
          t.name as teacher_name,
          t.employee_id,
          d.name as department_name,
          COUNT(DISTINCT ca.course_id) as total_courses,
          COUNT(DISTINCT ca.section_id) as total_sections,
          SUM(c.credit_hours) as total_credit_hours,
          COUNT(DISTINCT e.student_id) as total_students
        FROM teachers t
        LEFT JOIN departments d ON t.department_id = d.id
        LEFT JOIN course_assignments ca ON t.id = ca.teacher_id
        LEFT JOIN courses c ON ca.course_id = c.id
        LEFT JOIN enrollments e ON ca.course_id = e.course_id
        WHERE t.status = 'Active'
        ${department_id ? "AND t.department_id = " + department_id : ''}
        ${teacher_id ? "AND t.id = " + teacher_id : ''}
        GROUP BY t.id, t.name, t.employee_id, d.name
        ORDER BY total_credit_hours DESC
      `;

      const courseLoadResult = await pool.query(courseLoadQuery);

      // Attendance marking rate
      const attendanceMarkingQuery = `
        SELECT 
          t.name as teacher_name,
          t.employee_id,
          d.name as department_name,
          COUNT(DISTINCT a.date) as days_marked,
          COUNT(DISTINCT ca.course_id) as courses_assigned,
          ROUND(COUNT(DISTINCT a.date) * 100.0 / NULLIF(
            (SELECT COUNT(DISTINCT date) FROM attendance WHERE date >= CURRENT_DATE - INTERVAL '30 days'), 0
          ), 2) as marking_rate_percentage
        FROM teachers t
        LEFT JOIN departments d ON t.department_id = d.id
        LEFT JOIN course_assignments ca ON t.id = ca.teacher_id
        LEFT JOIN attendance a ON ca.course_id = a.course_id AND a.date >= CURRENT_DATE - INTERVAL '30 days'
        WHERE t.status = 'Active'
        ${department_id ? "AND t.department_id = " + department_id : ''}
        GROUP BY t.id, t.name, t.employee_id, d.name
        ORDER BY marking_rate_percentage DESC
      `;

      const attendanceMarkingResult = await pool.query(attendanceMarkingQuery);

      // Result submission status
      const resultSubmissionQuery = `
        SELECT 
          t.name as teacher_name,
          t.employee_id,
          COUNT(DISTINCT ca.course_id) as courses_assigned,
          COUNT(DISTINCT CASE WHEN sr.id IS NOT NULL THEN ca.course_id END) as courses_with_results,
          ROUND(COUNT(DISTINCT CASE WHEN sr.id IS NOT NULL THEN ca.course_id END) * 100.0 / 
            NULLIF(COUNT(DISTINCT ca.course_id), 0), 2) as submission_percentage
        FROM teachers t
        LEFT JOIN course_assignments ca ON t.id = ca.teacher_id
        LEFT JOIN student_results sr ON ca.course_id = sr.course_id
        WHERE t.status = 'Active'
        ${department_id ? "AND t.department_id = " + department_id : ''}
        GROUP BY t.id, t.name, t.employee_id
        ORDER BY submission_percentage ASC
      `;

      const resultSubmissionResult = await pool.query(resultSubmissionQuery);

      // Student feedback summary
      const feedbackQuery = `
        SELECT 
          t.name as teacher_name,
          t.employee_id,
          d.name as department_name,
          COUNT(fs.id) as total_feedbacks,
          ROUND(AVG(
            CASE 
              WHEN fs.response::json->>'rating' ~ '^[0-9]+$' 
              THEN (fs.response::json->>'rating')::numeric 
              ELSE NULL 
            END
          ), 2) as average_rating,
          COUNT(CASE WHEN (fs.response::json->>'rating')::numeric >= 4 THEN 1 END) as positive_feedbacks,
          COUNT(CASE WHEN (fs.response::json->>'rating')::numeric <= 2 THEN 1 END) as negative_feedbacks
        FROM teachers t
        LEFT JOIN departments d ON t.department_id = d.id
        LEFT JOIN feedback_forms ff ON ff.target_type = 'Teacher'
        LEFT JOIN feedback_submissions fs ON ff.id = fs.form_id
        WHERE t.status = 'Active'
        ${department_id ? "AND t.department_id = " + department_id : ''}
        GROUP BY t.id, t.name, t.employee_id, d.name
        HAVING COUNT(fs.id) > 0
        ORDER BY average_rating DESC
      `;

      const feedbackResult = await pool.query(feedbackQuery);

      // Department-wise teacher distribution
      const departmentDistributionQuery = `
        SELECT 
          d.name as department_name,
          COUNT(t.id) as teacher_count,
          COUNT(CASE WHEN t.status = 'Active' THEN 1 END) as active_count,
          SUM(
            (SELECT COUNT(*) FROM course_assignments WHERE teacher_id = t.id)
          ) as total_course_assignments
        FROM departments d
        LEFT JOIN teachers t ON d.id = t.department_id
        GROUP BY d.id, d.name
        ORDER BY teacher_count DESC
      `;

      const departmentDistributionResult = await pool.query(departmentDistributionQuery);

      return {
        overall: overallResult.rows[0],
        course_load: courseLoadResult.rows,
        attendance_marking: attendanceMarkingResult.rows,
        result_submission: resultSubmissionResult.rows,
        student_feedback: feedbackResult.rows,
        department_distribution: departmentDistributionResult.rows
      };

    } catch (error) {
      console.error('Get Teacher Reports Error:', error);
      throw new Error('Failed to generate teacher reports');
    }
  }

  // ==================== EXPORT FUNCTIONALITY ====================

  /**
   * Get report data for export
   * @param {string} reportType - Type of report
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Report data for export
   */
  async getReportDataForExport(reportType, filters = {}) {
    try {
      let reportData;

      switch (reportType) {
        case 'students':
          reportData = await this.getStudentReports(filters);
          break;
        case 'attendance':
          reportData = await this.getAttendanceReports(filters);
          break;
        case 'academic':
          reportData = await this.getAcademicReports(filters);
          break;
        case 'financial':
          reportData = await this.getFinancialReports(filters);
          break;
        case 'teachers':
          reportData = await this.getTeacherReports(filters);
          break;
        default:
          throw new Error('Invalid report type');
      }

      return {
        reportType,
        generatedAt: new Date().toISOString(),
        filters,
        data: reportData
      };

    } catch (error) {
      console.error('Get Report Data For Export Error:', error);
      throw new Error(error.message || 'Failed to get report data for export');
    }
  }
}

module.exports = new ReportService();
