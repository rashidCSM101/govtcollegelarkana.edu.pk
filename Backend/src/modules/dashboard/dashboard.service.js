const pool = require('../../config/database');

/**
 * Dashboard Service
 * Handles dashboard data for admin, student, and teacher roles
 */
class DashboardService {

  // ==================== ADMIN DASHBOARD ====================

  /**
   * Get admin dashboard data
   * @returns {Promise<Object>} Admin dashboard data
   */
  async getAdminDashboard() {
    try {
      // Student statistics
      const studentStatsQuery = `
        SELECT 
          COUNT(*) as total_students,
          COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_students,
          COUNT(CASE WHEN status = 'Inactive' THEN 1 END) as inactive_students,
          COUNT(CASE WHEN status = 'Graduated' THEN 1 END) as graduated_students,
          COUNT(CASE WHEN gender = 'Male' THEN 1 END) as male_students,
          COUNT(CASE WHEN gender = 'Female' THEN 1 END) as female_students
        FROM students
      `;
      const studentStats = await pool.query(studentStatsQuery);

      // Teacher statistics
      const teacherStatsQuery = `
        SELECT 
          COUNT(*) as total_teachers,
          COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_teachers,
          COUNT(CASE WHEN status = 'Inactive' THEN 1 END) as inactive_teachers
        FROM teachers
      `;
      const teacherStats = await pool.query(teacherStatsQuery);

      // Department and course statistics
      const deptCourseStatsQuery = `
        SELECT 
          (SELECT COUNT(*) FROM departments) as total_departments,
          (SELECT COUNT(*) FROM courses) as total_courses,
          (SELECT COUNT(*) FROM courses WHERE status = 'Active') as active_courses
      `;
      const deptCourseStats = await pool.query(deptCourseStatsQuery);

      // Fee collection statistics
      const feeStatsQuery = `
        SELECT 
          COALESCE(SUM(CASE WHEN fp.payment_date = CURRENT_DATE THEN fp.amount END), 0) as today_collection,
          COALESCE(SUM(CASE WHEN DATE_TRUNC('month', fp.payment_date) = DATE_TRUNC('month', CURRENT_DATE) THEN fp.amount END), 0) as month_collection,
          COALESCE(SUM(CASE WHEN DATE_TRUNC('year', fp.payment_date) = DATE_TRUNC('year', CURRENT_DATE) THEN fp.amount END), 0) as year_collection,
          COALESCE(SUM(sf.remaining_amount), 0) as total_pending_dues,
          COUNT(CASE WHEN sf.remaining_amount > 0 THEN 1 END) as students_with_dues
        FROM fee_payments fp
        FULL OUTER JOIN student_fees sf ON TRUE
      `;
      const feeStats = await pool.query(feeStatsQuery);

      // Overall attendance percentage (last 30 days)
      const attendanceStatsQuery = `
        SELECT 
          COUNT(*) as total_attendance_records,
          COUNT(CASE WHEN status = 'Present' THEN 1 END) as present_count,
          ROUND(COUNT(CASE WHEN status = 'Present' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 2) as attendance_percentage
        FROM attendance
        WHERE date >= CURRENT_DATE - INTERVAL '30 days'
      `;
      const attendanceStats = await pool.query(attendanceStatsQuery);

      // Upcoming exams (next 30 days)
      const upcomingExamsQuery = `
        SELECT 
          c.name as course_name,
          c.code as course_code,
          d.name as department_name,
          ce.event_name,
          ce.event_date,
          ce.start_time,
          ce.end_time,
          ce.location
        FROM calendar_events ce
        LEFT JOIN courses c ON ce.course_id = c.id
        LEFT JOIN departments d ON c.department_id = d.id
        WHERE ce.event_type = 'Exam'
          AND ce.event_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
        ORDER BY ce.event_date ASC, ce.start_time ASC
        LIMIT 10
      `;
      const upcomingExams = await pool.query(upcomingExamsQuery);

      // Recent activities (last 50)
      const recentActivitiesQuery = `
        SELECT 
          'Student Admission' as activity_type,
          s.name as description,
          s.admission_date as activity_date
        FROM students s
        WHERE s.admission_date >= CURRENT_DATE - INTERVAL '7 days'
        
        UNION ALL
        
        SELECT 
          'Fee Payment' as activity_type,
          CONCAT(st.name, ' - Rs. ', fp.amount) as description,
          fp.payment_date as activity_date
        FROM fee_payments fp
        LEFT JOIN student_fees sf ON fp.fee_id = sf.id
        LEFT JOIN students st ON sf.student_id = st.id
        WHERE fp.payment_date >= CURRENT_DATE - INTERVAL '7 days'
        
        UNION ALL
        
        SELECT 
          'Leave Request' as activity_type,
          CONCAT(s.name, ' - ', l.status) as description,
          l.created_at as activity_date
        FROM leaves l
        LEFT JOIN students s ON l.student_id = s.id
        WHERE l.created_at >= CURRENT_DATE - INTERVAL '7 days'
        
        UNION ALL
        
        SELECT 
          'Complaint Submitted' as activity_type,
          CONCAT(c.ticket_number, ' - ', c.category) as description,
          c.created_at as activity_date
        FROM complaints c
        WHERE c.created_at >= CURRENT_DATE - INTERVAL '7 days'
        
        ORDER BY activity_date DESC
        LIMIT 50
      `;
      const recentActivities = await pool.query(recentActivitiesQuery);

      // Department-wise student count for chart
      const departmentChartQuery = `
        SELECT 
          d.name as department_name,
          d.code as department_code,
          COUNT(s.id) as student_count
        FROM departments d
        LEFT JOIN students s ON d.id = s.department_id AND s.status = 'Active'
        GROUP BY d.id, d.name, d.code
        ORDER BY student_count DESC
        LIMIT 10
      `;
      const departmentChart = await pool.query(departmentChartQuery);

      // Monthly enrollment trend (last 12 months)
      const enrollmentTrendQuery = `
        SELECT 
          TO_CHAR(admission_date, 'Mon YYYY') as month,
          COUNT(*) as enrollment_count
        FROM students
        WHERE admission_date >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY TO_CHAR(admission_date, 'YYYY-MM'), TO_CHAR(admission_date, 'Mon YYYY')
        ORDER BY TO_CHAR(admission_date, 'YYYY-MM') ASC
      `;
      const enrollmentTrend = await pool.query(enrollmentTrendQuery);

      // Fee collection trend (last 6 months)
      const feeCollectionTrendQuery = `
        SELECT 
          TO_CHAR(payment_date, 'Mon YYYY') as month,
          SUM(amount) as total_collection
        FROM fee_payments
        WHERE payment_date >= CURRENT_DATE - INTERVAL '6 months'
        GROUP BY TO_CHAR(payment_date, 'YYYY-MM'), TO_CHAR(payment_date, 'Mon YYYY')
        ORDER BY TO_CHAR(payment_date, 'YYYY-MM') ASC
      `;
      const feeCollectionTrend = await pool.query(feeCollectionTrendQuery);

      // Quick stats
      const quickStatsQuery = `
        SELECT 
          (SELECT COUNT(*) FROM notices WHERE status = 'Published' AND created_at >= CURRENT_DATE - INTERVAL '7 days') as new_notices,
          (SELECT COUNT(*) FROM complaints WHERE status = 'Pending') as pending_complaints,
          (SELECT COUNT(*) FROM leaves WHERE status = 'Pending') as pending_leaves,
          (SELECT COUNT(*) FROM scholarship_applications WHERE status = 'Pending') as pending_scholarships,
          (SELECT COUNT(*) FROM documents WHERE status = 'Pending') as pending_documents
      `;
      const quickStats = await pool.query(quickStatsQuery);

      return {
        students: studentStats.rows[0],
        teachers: teacherStats.rows[0],
        departments_courses: deptCourseStats.rows[0],
        fee_collection: feeStats.rows[0],
        attendance: attendanceStats.rows[0],
        upcoming_exams: upcomingExams.rows,
        recent_activities: recentActivities.rows,
        charts: {
          department_distribution: departmentChart.rows,
          enrollment_trend: enrollmentTrend.rows,
          fee_collection_trend: feeCollectionTrend.rows
        },
        quick_stats: quickStats.rows[0]
      };

    } catch (error) {
      console.error('Get Admin Dashboard Error:', error);
      throw new Error('Failed to fetch admin dashboard data');
    }
  }

  // ==================== STUDENT DASHBOARD ====================

  /**
   * Get student dashboard data
   * @param {number} studentId - Student ID
   * @returns {Promise<Object>} Student dashboard data
   */
  async getStudentDashboard(studentId) {
    try {
      // Profile summary
      const profileQuery = `
        SELECT 
          s.id,
          s.name,
          s.registration_number,
          s.email,
          s.phone,
          s.photo,
          s.status,
          s.cgpa,
          s.gender,
          d.name as department_name,
          d.code as department_code,
          ses.name as session_name,
          sem.name as current_semester
        FROM students s
        LEFT JOIN departments d ON s.department_id = d.id
        LEFT JOIN sessions ses ON s.session_id = ses.id
        LEFT JOIN semesters sem ON s.current_semester_id = sem.id
        WHERE s.id = $1
      `;
      const profile = await pool.query(profileQuery, [studentId]);

      if (profile.rows.length === 0) {
        throw new Error('Student not found');
      }

      // Attendance percentage (last 30 days and overall)
      const attendanceQuery = `
        SELECT 
          COUNT(*) as total_classes,
          COUNT(CASE WHEN status = 'Present' THEN 1 END) as present_count,
          COUNT(CASE WHEN status = 'Absent' THEN 1 END) as absent_count,
          COUNT(CASE WHEN status = 'Late' THEN 1 END) as late_count,
          COUNT(CASE WHEN status = 'Leave' THEN 1 END) as leave_count,
          ROUND(COUNT(CASE WHEN status = 'Present' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 2) as attendance_percentage
        FROM attendance
        WHERE student_id = $1
          AND date >= CURRENT_DATE - INTERVAL '30 days'
      `;
      const attendance = await pool.query(attendanceQuery, [studentId]);

      // Current semester results (SGPA)
      const semesterResultsQuery = `
        SELECT 
          sem.name as semester_name,
          COUNT(sr.id) as total_courses,
          ROUND(AVG(sr.gpa), 2) as sgpa,
          COUNT(CASE WHEN sr.grade IN ('A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C') THEN 1 END) as passed_courses,
          COUNT(CASE WHEN sr.grade = 'F' THEN 1 END) as failed_courses
        FROM students s
        LEFT JOIN semesters sem ON s.current_semester_id = sem.id
        LEFT JOIN student_results sr ON s.id = sr.student_id AND sr.semester_id = sem.id
        WHERE s.id = $1
        GROUP BY sem.id, sem.name
      `;
      const semesterResults = await pool.query(semesterResultsQuery, [studentId]);

      // Upcoming exams
      const upcomingExamsQuery = `
        SELECT 
          c.name as course_name,
          c.code as course_code,
          ce.event_name,
          ce.event_date,
          ce.start_time,
          ce.end_time,
          ce.location,
          ce.description
        FROM enrollments e
        LEFT JOIN courses c ON e.course_id = c.id
        LEFT JOIN calendar_events ce ON c.id = ce.course_id
        WHERE e.student_id = $1
          AND ce.event_type = 'Exam'
          AND ce.event_date >= CURRENT_DATE
        ORDER BY ce.event_date ASC, ce.start_time ASC
        LIMIT 10
      `;
      const upcomingExams = await pool.query(upcomingExamsQuery, [studentId]);

      // Pending assignments
      const pendingAssignmentsQuery = `
        SELECT 
          a.id,
          a.title,
          a.description,
          a.due_date,
          c.name as course_name,
          c.code as course_code,
          CASE 
            WHEN a.due_date < CURRENT_DATE THEN 'Overdue'
            WHEN a.due_date = CURRENT_DATE THEN 'Due Today'
            ELSE 'Upcoming'
          END as status
        FROM assignments a
        LEFT JOIN courses c ON a.course_id = c.id
        LEFT JOIN enrollments e ON c.id = e.course_id
        WHERE e.student_id = $1
          AND a.due_date >= CURRENT_DATE - INTERVAL '1 day'
          AND NOT EXISTS (
            SELECT 1 FROM assignment_submissions asub
            WHERE asub.assignment_id = a.id AND asub.student_id = $1
          )
        ORDER BY a.due_date ASC
        LIMIT 10
      `;
      const pendingAssignments = await pool.query(pendingAssignmentsQuery, [studentId]);

      // Fee status
      const feeStatusQuery = `
        SELECT 
          SUM(total_amount) as total_billed,
          SUM(paid_amount) as total_paid,
          SUM(remaining_amount) as total_pending,
          COUNT(CASE WHEN payment_status = 'Pending' THEN 1 END) as pending_invoices,
          MIN(CASE WHEN payment_status != 'Paid' THEN due_date END) as next_due_date
        FROM student_fees
        WHERE student_id = $1
      `;
      const feeStatus = await pool.query(feeStatusQuery, [studentId]);

      // Recent notices (last 10)
      const recentNoticesQuery = `
        SELECT 
          n.id,
          n.title,
          n.priority,
          n.created_at,
          n.expiry_date
        FROM notices n
        WHERE n.status = 'Published'
          AND (n.target_audience = 'All' OR n.target_audience = 'Students')
          AND (n.expiry_date IS NULL OR n.expiry_date >= CURRENT_DATE)
        ORDER BY n.created_at DESC
        LIMIT 10
      `;
      const recentNotices = await pool.query(recentNoticesQuery);

      // Today's timetable
      const todayTimetableQuery = `
        SELECT 
          c.name as course_name,
          c.code as course_code,
          t.name as teacher_name,
          tt.day_of_week,
          tt.start_time,
          tt.end_time,
          tt.room_number
        FROM timetable tt
        LEFT JOIN courses c ON tt.course_id = c.id
        LEFT JOIN teachers t ON tt.teacher_id = t.id
        LEFT JOIN enrollments e ON c.id = e.course_id
        WHERE e.student_id = $1
          AND tt.day_of_week = EXTRACT(DOW FROM CURRENT_DATE)
        ORDER BY tt.start_time ASC
      `;
      const todayTimetable = await pool.query(todayTimetableQuery, [studentId]);

      // Enrolled courses
      const enrolledCoursesQuery = `
        SELECT 
          c.name as course_name,
          c.code as course_code,
          c.credit_hours,
          t.name as teacher_name
        FROM enrollments e
        LEFT JOIN courses c ON e.course_id = c.id
        LEFT JOIN course_assignments ca ON c.id = ca.course_id
        LEFT JOIN teachers t ON ca.teacher_id = t.id
        WHERE e.student_id = $1
          AND e.status = 'Active'
      `;
      const enrolledCourses = await pool.query(enrolledCoursesQuery, [studentId]);

      return {
        profile: profile.rows[0],
        attendance: attendance.rows[0] || { total_classes: 0, present_count: 0, attendance_percentage: 0 },
        academic: {
          cgpa: profile.rows[0].cgpa,
          sgpa: semesterResults.rows[0]?.sgpa || 0,
          current_semester: profile.rows[0].current_semester,
          semester_details: semesterResults.rows[0] || {}
        },
        upcoming_exams: upcomingExams.rows,
        pending_assignments: pendingAssignments.rows,
        fee_status: feeStatus.rows[0] || { total_pending: 0 },
        recent_notices: recentNotices.rows,
        today_timetable: todayTimetable.rows,
        enrolled_courses: enrolledCourses.rows
      };

    } catch (error) {
      console.error('Get Student Dashboard Error:', error);
      throw new Error(error.message || 'Failed to fetch student dashboard data');
    }
  }

  // ==================== TEACHER DASHBOARD ====================

  /**
   * Get teacher dashboard data
   * @param {number} teacherId - Teacher ID
   * @returns {Promise<Object>} Teacher dashboard data
   */
  async getTeacherDashboard(teacherId) {
    try {
      // Profile summary
      const profileQuery = `
        SELECT 
          t.id,
          t.name,
          t.employee_id,
          t.email,
          t.phone,
          t.photo,
          t.status,
          t.designation,
          d.name as department_name,
          d.code as department_code
        FROM teachers t
        LEFT JOIN departments d ON t.department_id = d.id
        WHERE t.id = $1
      `;
      const profile = await pool.query(profileQuery, [teacherId]);

      if (profile.rows.length === 0) {
        throw new Error('Teacher not found');
      }

      // Assigned courses
      const assignedCoursesQuery = `
        SELECT 
          c.id as course_id,
          c.name as course_name,
          c.code as course_code,
          c.credit_hours,
          sec.name as section_name,
          COUNT(DISTINCT e.student_id) as enrolled_students
        FROM course_assignments ca
        LEFT JOIN courses c ON ca.course_id = c.id
        LEFT JOIN sections sec ON ca.section_id = sec.id
        LEFT JOIN enrollments e ON c.id = e.course_id
        WHERE ca.teacher_id = $1
        GROUP BY c.id, c.name, c.code, c.credit_hours, sec.name
        ORDER BY c.name
      `;
      const assignedCourses = await pool.query(assignedCoursesQuery, [teacherId]);

      // Today's classes
      const todayClassesQuery = `
        SELECT 
          c.name as course_name,
          c.code as course_code,
          sec.name as section_name,
          tt.start_time,
          tt.end_time,
          tt.room_number,
          COUNT(DISTINCT e.student_id) as expected_students,
          CASE 
            WHEN EXISTS (
              SELECT 1 FROM attendance a 
              WHERE a.course_id = c.id 
                AND a.date = CURRENT_DATE
                AND a.teacher_id = $1
            ) THEN true
            ELSE false
          END as attendance_marked
        FROM timetable tt
        LEFT JOIN courses c ON tt.course_id = c.id
        LEFT JOIN sections sec ON tt.section_id = sec.id
        LEFT JOIN enrollments e ON c.id = e.course_id
        WHERE tt.teacher_id = $1
          AND tt.day_of_week = EXTRACT(DOW FROM CURRENT_DATE)
        GROUP BY c.id, c.name, c.code, sec.name, tt.start_time, tt.end_time, tt.room_number
        ORDER BY tt.start_time ASC
      `;
      const todayClasses = await pool.query(todayClassesQuery, [teacherId]);

      // Pending attendance (courses without attendance today)
      const pendingAttendanceQuery = `
        SELECT 
          c.id as course_id,
          c.name as course_name,
          c.code as course_code,
          sec.name as section_name,
          COUNT(DISTINCT e.student_id) as student_count
        FROM course_assignments ca
        LEFT JOIN courses c ON ca.course_id = c.id
        LEFT JOIN sections sec ON ca.section_id = sec.id
        LEFT JOIN enrollments e ON c.id = e.course_id
        WHERE ca.teacher_id = $1
          AND NOT EXISTS (
            SELECT 1 FROM attendance a
            WHERE a.course_id = c.id
              AND a.teacher_id = $1
              AND a.date = CURRENT_DATE
          )
        GROUP BY c.id, c.name, c.code, sec.name
      `;
      const pendingAttendance = await pool.query(pendingAttendanceQuery, [teacherId]);

      // Pending marks entry (assignments without marks)
      const pendingMarksQuery = `
        SELECT 
          a.id as assignment_id,
          a.title as assignment_title,
          c.name as course_name,
          c.code as course_code,
          a.due_date,
          COUNT(asub.id) as total_submissions,
          COUNT(CASE WHEN asub.marks IS NULL THEN 1 END) as pending_marks
        FROM assignments a
        LEFT JOIN courses c ON a.course_id = c.id
        LEFT JOIN course_assignments ca ON c.id = ca.course_id
        LEFT JOIN assignment_submissions asub ON a.id = asub.assignment_id
        WHERE ca.teacher_id = $1
          AND asub.id IS NOT NULL
        GROUP BY a.id, a.title, c.name, c.code, a.due_date
        HAVING COUNT(CASE WHEN asub.marks IS NULL THEN 1 END) > 0
        ORDER BY a.due_date DESC
        LIMIT 10
      `;
      const pendingMarks = await pool.query(pendingMarksQuery, [teacherId]);

      // Assignment submissions (recent)
      const assignmentSubmissionsQuery = `
        SELECT 
          asub.id,
          a.title as assignment_title,
          c.name as course_name,
          s.name as student_name,
          s.registration_number,
          asub.submitted_at,
          asub.marks,
          CASE 
            WHEN asub.submitted_at > a.due_date THEN 'Late'
            ELSE 'On Time'
          END as submission_status
        FROM assignment_submissions asub
        LEFT JOIN assignments a ON asub.assignment_id = a.id
        LEFT JOIN courses c ON a.course_id = c.id
        LEFT JOIN students s ON asub.student_id = s.id
        LEFT JOIN course_assignments ca ON c.id = ca.course_id
        WHERE ca.teacher_id = $1
          AND asub.submitted_at >= CURRENT_DATE - INTERVAL '7 days'
        ORDER BY asub.submitted_at DESC
        LIMIT 20
      `;
      const assignmentSubmissions = await pool.query(assignmentSubmissionsQuery, [teacherId]);

      // Student queries (recent complaints/feedback)
      const studentQueriesQuery = `
        SELECT 
          'Complaint' as query_type,
          c.ticket_number as reference,
          c.subject as title,
          c.status,
          c.created_at
        FROM complaints c
        WHERE c.assigned_to = $1
          AND c.status NOT IN ('Resolved', 'Closed')
        
        UNION ALL
        
        SELECT 
          'Feedback' as query_type,
          'FB-' || fs.id as reference,
          ff.title as title,
          'Submitted' as status,
          fs.submitted_at as created_at
        FROM feedback_submissions fs
        LEFT JOIN feedback_forms ff ON fs.form_id = ff.id
        WHERE ff.target_type = 'Teacher'
          AND ff.target_id = $1
          AND fs.submitted_at >= CURRENT_DATE - INTERVAL '30 days'
        
        ORDER BY created_at DESC
        LIMIT 10
      `;
      const studentQueries = await pool.query(studentQueriesQuery, [teacherId]);

      // Teaching statistics
      const teachingStatsQuery = `
        SELECT 
          COUNT(DISTINCT ca.course_id) as total_courses,
          COUNT(DISTINCT e.student_id) as total_students,
          SUM(c.credit_hours) as total_credit_hours,
          COUNT(DISTINCT CASE WHEN a.date >= CURRENT_DATE - INTERVAL '30 days' THEN a.date END) as attendance_days_last_month
        FROM course_assignments ca
        LEFT JOIN courses c ON ca.course_id = c.id
        LEFT JOIN enrollments e ON c.id = e.course_id
        LEFT JOIN attendance a ON c.id = a.course_id AND a.teacher_id = $1
        WHERE ca.teacher_id = $1
      `;
      const teachingStats = await pool.query(teachingStatsQuery, [teacherId]);

      return {
        profile: profile.rows[0],
        assigned_courses: assignedCourses.rows,
        today_classes: todayClasses.rows,
        pending_attendance: pendingAttendance.rows,
        pending_marks: pendingMarks.rows,
        assignment_submissions: assignmentSubmissions.rows,
        student_queries: studentQueriesQuery.rows,
        teaching_stats: teachingStats.rows[0] || { total_courses: 0, total_students: 0 }
      };

    } catch (error) {
      console.error('Get Teacher Dashboard Error:', error);
      throw new Error(error.message || 'Failed to fetch teacher dashboard data');
    }
  }
}

module.exports = new DashboardService();
