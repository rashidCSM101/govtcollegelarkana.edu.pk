const { pool } = require('./database');

const initDatabase = async () => {
  console.log('🔄 Initializing database...');
  
  try {
    // Test connection
    const client = await pool.connect();
    console.log('✅ Database connected successfully');
    
    // Create all tables
    await client.query(`
      -- =====================================================
      -- Enable UUID extension (optional)
      -- =====================================================
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      -- =====================================================
      -- 1. USERS TABLE (Core authentication)
      -- =====================================================
      CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'teacher', 'student', 'staff')),
          is_active BOOLEAN DEFAULT FALSE,
          email_verified BOOLEAN DEFAULT FALSE,
          verification_token VARCHAR(255),
          verification_expiry TIMESTAMP,
          reset_token VARCHAR(255),
          reset_expiry TIMESTAMP,
          refresh_token VARCHAR(255),
          last_login TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- =====================================================
      -- 2. DEPARTMENTS TABLE
      -- =====================================================
      CREATE TABLE IF NOT EXISTS departments (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          code VARCHAR(20) UNIQUE NOT NULL,
          hod_teacher_id INTEGER,
          description TEXT,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- =====================================================
      -- 3. STUDENTS TABLE
      -- =====================================================
      CREATE TABLE IF NOT EXISTS students (
          id SERIAL PRIMARY KEY,
          user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          roll_no VARCHAR(50) UNIQUE,
          name VARCHAR(100) NOT NULL,
          father_name VARCHAR(100),
          dob DATE,
          cnic VARCHAR(20),
          phone VARCHAR(20),
          address TEXT,
          photo VARCHAR(255),
          batch VARCHAR(20),
          department_id INTEGER REFERENCES departments(id),
          semester INTEGER DEFAULT 1,
          status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated', 'suspended', 'dropped')),
          admission_date DATE DEFAULT CURRENT_DATE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- =====================================================
      -- 4. TEACHERS TABLE
      -- =====================================================
      CREATE TABLE IF NOT EXISTS teachers (
          id SERIAL PRIMARY KEY,
          user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          name VARCHAR(100) NOT NULL,
          cnic VARCHAR(20),
          phone VARCHAR(20),
          designation VARCHAR(50),
          department_id INTEGER REFERENCES departments(id),
          qualification VARCHAR(100),
          specialization VARCHAR(100),
          experience INTEGER DEFAULT 0,
          photo VARCHAR(255),
          joining_date DATE DEFAULT CURRENT_DATE,
          status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave', 'retired')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- =====================================================
      -- 5. ADMINS TABLE
      -- =====================================================
      CREATE TABLE IF NOT EXISTS admins (
          id SERIAL PRIMARY KEY,
          user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          name VARCHAR(100) NOT NULL,
          role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'moderator')),
          permissions JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- =====================================================
      -- 6. SESSIONS TABLE
      -- =====================================================
      CREATE TABLE IF NOT EXISTS sessions (
          id SERIAL PRIMARY KEY,
          name VARCHAR(50) NOT NULL,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          is_active BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- =====================================================
      -- 7. SEMESTERS TABLE
      -- =====================================================
      CREATE TABLE IF NOT EXISTS semesters (
          id SERIAL PRIMARY KEY,
          session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
          name VARCHAR(50) NOT NULL,
          number INTEGER NOT NULL,
          start_date DATE,
          end_date DATE,
          is_active BOOLEAN DEFAULT FALSE,
          results_published BOOLEAN DEFAULT FALSE,
          results_published_at TIMESTAMP,
          results_frozen BOOLEAN DEFAULT FALSE,
          results_frozen_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- =====================================================
      -- 8. COURSES TABLE
      -- =====================================================
      CREATE TABLE IF NOT EXISTS courses (
          id SERIAL PRIMARY KEY,
          code VARCHAR(20) UNIQUE NOT NULL,
          name VARCHAR(100) NOT NULL,
          credit_hours INTEGER DEFAULT 3,
          department_id INTEGER REFERENCES departments(id),
          semester_number INTEGER,
          description TEXT,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- =====================================================
      -- 9. COURSE PREREQUISITES TABLE
      -- =====================================================
      CREATE TABLE IF NOT EXISTS course_prerequisites (
          id SERIAL PRIMARY KEY,
          course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
          prerequisite_course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
          UNIQUE(course_id, prerequisite_course_id)
      );

      -- =====================================================
      -- 10. STUDENT ENROLLMENTS TABLE
      -- =====================================================
      CREATE TABLE IF NOT EXISTS student_enrollments (
          id SERIAL PRIMARY KEY,
          student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
          session_id INTEGER REFERENCES sessions(id),
          semester_id INTEGER REFERENCES semesters(id),
          enrollment_date DATE DEFAULT CURRENT_DATE,
          status VARCHAR(20) DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'dropped', 'completed', 'suspended')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- =====================================================
      -- 11. COURSE REGISTRATIONS TABLE
      -- =====================================================
      CREATE TABLE IF NOT EXISTS course_registrations (
          id SERIAL PRIMARY KEY,
          student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
          course_id INTEGER REFERENCES courses(id),
          semester_id INTEGER REFERENCES semesters(id),
          session_id INTEGER REFERENCES sessions(id),
          registration_date DATE DEFAULT CURRENT_DATE,
          status VARCHAR(20) DEFAULT 'registered' CHECK (status IN ('registered', 'dropped', 'completed')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- =====================================================
      -- 12. COURSE SECTIONS TABLE
      -- =====================================================
      CREATE TABLE IF NOT EXISTS course_sections (
          id SERIAL PRIMARY KEY,
          course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
          semester_id INTEGER REFERENCES semesters(id),
          teacher_id INTEGER REFERENCES teachers(id),
          section_name VARCHAR(10) DEFAULT 'A',
          capacity INTEGER DEFAULT 50,
          room_no VARCHAR(20),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- =====================================================
      -- 13. WAITING LISTS TABLE
      -- =====================================================
      CREATE TABLE IF NOT EXISTS waiting_lists (
          id SERIAL PRIMARY KEY,
          course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
          student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
          position INTEGER,
          requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'enrolled', 'expired'))
      );

      -- =====================================================
      -- 14. TIMETABLE SLOTS TABLE
      -- =====================================================
      CREATE TABLE IF NOT EXISTS timetable_slots (
          id SERIAL PRIMARY KEY,
          section_id INTEGER REFERENCES course_sections(id) ON DELETE CASCADE,
          day VARCHAR(10) NOT NULL CHECK (day IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday')),
          start_time TIME NOT NULL,
          end_time TIME NOT NULL,
          room_no VARCHAR(20),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- =====================================================
      -- 15. ATTENDANCE TABLE
      -- =====================================================
      CREATE TABLE IF NOT EXISTS attendance (
          id SERIAL PRIMARY KEY,
          section_id INTEGER REFERENCES course_sections(id) ON DELETE CASCADE,
          date DATE NOT NULL,
          student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
          status VARCHAR(10) DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'leave')),
          marked_by INTEGER REFERENCES users(id),
          marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(section_id, date, student_id)
      );

      -- =====================================================
      -- 16. ATTENDANCE SUMMARY TABLE
      -- =====================================================
      CREATE TABLE IF NOT EXISTS attendance_summary (
          id SERIAL PRIMARY KEY,
          student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
          course_id INTEGER REFERENCES courses(id),
          semester_id INTEGER REFERENCES semesters(id),
          total_classes INTEGER DEFAULT 0,
          present INTEGER DEFAULT 0,
          absent INTEGER DEFAULT 0,
          percentage DECIMAL(5,2) DEFAULT 0,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(student_id, course_id, semester_id)
      );

      -- =====================================================
      -- 17. EXAMS TABLE
      -- =====================================================
      CREATE TABLE IF NOT EXISTS exams (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          type VARCHAR(20) NOT NULL CHECK (type IN ('midterm', 'final', 'quiz', 'assignment', 'practical')),
          semester_id INTEGER REFERENCES semesters(id),
          start_date DATE,
          end_date DATE,
          created_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- =====================================================
      -- 18. EXAM SCHEDULE TABLE
      -- =====================================================
      CREATE TABLE IF NOT EXISTS exam_schedule (
          id SERIAL PRIMARY KEY,
          exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE,
          course_id INTEGER REFERENCES courses(id),
          date DATE NOT NULL,
          start_time TIME,
          end_time TIME,
          room_no VARCHAR(20),
          total_marks INTEGER DEFAULT 100,
          weightage INTEGER DEFAULT 100,
          marks_locked BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- =====================================================
      -- 19. ONLINE EXAMS TABLE
      -- =====================================================
      CREATE TABLE IF NOT EXISTS online_exams (
          id SERIAL PRIMARY KEY,
          exam_schedule_id INTEGER REFERENCES exam_schedule(id) ON DELETE CASCADE,
          duration_minutes INTEGER DEFAULT 60,
          passing_marks INTEGER DEFAULT 40,
          instructions TEXT,
          is_active BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- =====================================================
      -- 20. EXAM QUESTIONS TABLE
      -- =====================================================
      CREATE TABLE IF NOT EXISTS exam_questions (
          id SERIAL PRIMARY KEY,
          online_exam_id INTEGER REFERENCES online_exams(id) ON DELETE CASCADE,
          question_text TEXT NOT NULL,
          question_type VARCHAR(20) DEFAULT 'mcq' CHECK (question_type IN ('mcq', 'short', 'long', 'true_false')),
          options JSONB,
          correct_answer TEXT,
          marks INTEGER DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- =====================================================
      -- 21. EXAM ATTEMPTS TABLE
      -- =====================================================
      CREATE TABLE IF NOT EXISTS exam_attempts (
          id SERIAL PRIMARY KEY,
          online_exam_id INTEGER REFERENCES online_exams(id) ON DELETE CASCADE,
          student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
          start_time TIMESTAMP,
          end_time TIMESTAMP,
          submitted_at TIMESTAMP,
          total_marks INTEGER,
          obtained_marks DECIMAL(5,2),
          status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'graded')),
          UNIQUE(online_exam_id, student_id)
      );

      -- =====================================================
      -- 22. EXAM ANSWERS TABLE
      -- =====================================================
      CREATE TABLE IF NOT EXISTS exam_answers (
          id SERIAL PRIMARY KEY,
          attempt_id INTEGER REFERENCES exam_attempts(id) ON DELETE CASCADE,
          question_id INTEGER REFERENCES exam_questions(id) ON DELETE CASCADE,
          student_answer TEXT,
          is_correct BOOLEAN,
          marks_obtained DECIMAL(5,2) DEFAULT 0,
          UNIQUE(attempt_id, question_id)
      );

      -- =====================================================
      -- 23. HALL TICKETS TABLE
      -- =====================================================
      CREATE TABLE IF NOT EXISTS hall_tickets (
          id SERIAL PRIMARY KEY,
          student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
          exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE,
          ticket_number VARCHAR(50) UNIQUE NOT NULL,
          generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(student_id, exam_id)
      );

      -- =====================================================
      -- 24. MARKS TABLE
      -- =====================================================
      CREATE TABLE IF NOT EXISTS marks (
          id SERIAL PRIMARY KEY,
          student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
          exam_schedule_id INTEGER REFERENCES exam_schedule(id) ON DELETE CASCADE,
          obtained_marks DECIMAL(5,2),
          total_marks INTEGER,
          entered_by INTEGER REFERENCES users(id),
          entry_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(student_id, exam_schedule_id)
      );

      -- =====================================================
      -- 25. GRADES TABLE
      -- =====================================================
      CREATE TABLE IF NOT EXISTS grades (
          id SERIAL PRIMARY KEY,
          student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
          course_id INTEGER REFERENCES courses(id),
          semester_id INTEGER REFERENCES semesters(id),
          marks DECIMAL(5,2),
          grade VARCHAR(5),
          grade_points DECIMAL(3,2),
          credit_hours INTEGER,
          UNIQUE(student_id, course_id, semester_id)
      );

      -- =====================================================
      -- 26. GRADE SCALE TABLE
      -- =====================================================
      CREATE TABLE IF NOT EXISTS grade_scale (
          id SERIAL PRIMARY KEY,
          min_marks DECIMAL(5,2) NOT NULL,
          max_marks DECIMAL(5,2) NOT NULL,
          grade VARCHAR(5) NOT NULL,
          grade_point DECIMAL(3,2) NOT NULL
      );

      -- =====================================================
      -- 27. SEMESTER RESULTS TABLE
      -- =====================================================
      CREATE TABLE IF NOT EXISTS semester_results (
          id SERIAL PRIMARY KEY,
          student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
          semester_id INTEGER REFERENCES semesters(id),
          sgpa DECIMAL(4,2),
          cgpa DECIMAL(4,2),
          total_credits INTEGER,
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'pass', 'fail', 'promoted')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(student_id, semester_id)
      );

      -- =====================================================
      -- 28. TRANSCRIPTS TABLE
      -- =====================================================
      CREATE TABLE IF NOT EXISTS transcripts (
          id SERIAL PRIMARY KEY,
          student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
          verification_code VARCHAR(50) UNIQUE,
          generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          generated_by INTEGER REFERENCES users(id),
          status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'revoked')),
          revoked_at TIMESTAMP,
          revoked_by INTEGER REFERENCES users(id)
      );

      -- =====================================================
      -- 28B. TRANSCRIPT REQUESTS TABLE
      -- =====================================================
      CREATE TABLE IF NOT EXISTS transcript_requests (
          id SERIAL PRIMARY KEY,
          student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
          purpose VARCHAR(200),
          copies INTEGER DEFAULT 1,
          delivery_type VARCHAR(20) DEFAULT 'pickup' CHECK (delivery_type IN ('pickup', 'courier', 'email')),
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'issued')),
          transcript_id INTEGER REFERENCES transcripts(id),
          approved_by INTEGER REFERENCES users(id),
          approved_at TIMESTAMP,
          remarks TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- =====================================================
      -- 29. RE-EVALUATION REQUESTS TABLE
      -- =====================================================
      CREATE TABLE IF NOT EXISTS re_evaluation_requests (
          id SERIAL PRIMARY KEY,
          student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
          exam_schedule_id INTEGER REFERENCES exam_schedule(id),
          reason TEXT NOT NULL,
          request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'approved', 'rejected', 'in_review', 'completed')),
          current_marks DECIMAL(5,2),
          new_marks DECIMAL(5,2),
          fee_amount DECIMAL(10,2) DEFAULT 500.00,
          fee_paid BOOLEAN DEFAULT FALSE,
          payment_method VARCHAR(50),
          transaction_id VARCHAR(100),
          paid_at TIMESTAMP,
          approved_at TIMESTAMP,
          assigned_to INTEGER REFERENCES users(id),
          assigned_at TIMESTAMP,
          resolved_by INTEGER REFERENCES users(id),
          resolved_at TIMESTAMP,
          remarks TEXT,
          instructions TEXT
      );

      -- =====================================================
      -- 30. FEE STRUCTURES TABLE
      -- =====================================================
      CREATE TABLE IF NOT EXISTS fee_structures (
          id SERIAL PRIMARY KEY,
          department_id INTEGER REFERENCES departments(id),
          semester_number INTEGER,
          session_id INTEGER REFERENCES sessions(id),
          tuition_fee DECIMAL(10,2) DEFAULT 0,
          lab_fee DECIMAL(10,2) DEFAULT 0,
          library_fee DECIMAL(10,2) DEFAULT 0,
          sports_fee DECIMAL(10,2) DEFAULT 0,
          exam_fee DECIMAL(10,2) DEFAULT 0,
          admission_fee DECIMAL(10,2) DEFAULT 0,
          other_fee DECIMAL(10,2) DEFAULT 0,
          total_fee DECIMAL(10,2) DEFAULT 0,
          late_fee_per_day DECIMAL(10,2) DEFAULT 50.00,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- =====================================================
      -- 31. STUDENT FEES TABLE
      -- =====================================================
      CREATE TABLE IF NOT EXISTS student_fees (
          id SERIAL PRIMARY KEY,
          student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
          semester_id INTEGER REFERENCES semesters(id),
          fee_structure_id INTEGER REFERENCES fee_structures(id),
          total_amount DECIMAL(10,2),
          paid_amount DECIMAL(10,2) DEFAULT 0,
          due_amount DECIMAL(10,2),
          due_date DATE,
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue')),
          remarks TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- =====================================================
      -- 32. FEE PAYMENTS TABLE
      -- =====================================================
      CREATE TABLE IF NOT EXISTS fee_payments (
          id SERIAL PRIMARY KEY,
          student_fee_id INTEGER REFERENCES student_fees(id) ON DELETE CASCADE,
          amount DECIMAL(10,2) NOT NULL,
          payment_method VARCHAR(20) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank', 'online', 'cheque')),
          transaction_id VARCHAR(100),
          payment_date DATE DEFAULT CURRENT_DATE,
          receipt_no VARCHAR(50) UNIQUE,
          received_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- =====================================================
      -- 33. FEE VOUCHERS TABLE
      -- =====================================================
      CREATE TABLE IF NOT EXISTS fee_vouchers (
          id SERIAL PRIMARY KEY,
          student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
          student_fee_id INTEGER REFERENCES student_fees(id),
          voucher_no VARCHAR(50) UNIQUE NOT NULL,
          bank_name VARCHAR(100),
          issue_date DATE DEFAULT CURRENT_DATE,
          valid_until DATE,
          status VARCHAR(20) DEFAULT 'issued' CHECK (status IN ('issued', 'paid', 'expired', 'cancelled')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- =====================================================
      -- 34. ASSIGNMENTS TABLE
      -- =====================================================
      CREATE TABLE IF NOT EXISTS assignments (
          id SERIAL PRIMARY KEY,
          course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
          section_id INTEGER REFERENCES course_sections(id),
          title VARCHAR(200) NOT NULL,
          description TEXT,
          total_marks INTEGER DEFAULT 10,
          due_date TIMESTAMP,
          file_path VARCHAR(255),
          created_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- =====================================================
      -- 35. ASSIGNMENT SUBMISSIONS TABLE
      -- =====================================================
      CREATE TABLE IF NOT EXISTS assignment_submissions (
          id SERIAL PRIMARY KEY,
          assignment_id INTEGER REFERENCES assignments(id) ON DELETE CASCADE,
          student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
          submission_text TEXT,
          file_path VARCHAR(255),
          submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          marks_obtained DECIMAL(5,2),
          graded_by INTEGER REFERENCES users(id),
          graded_at TIMESTAMP,
          feedback TEXT,
          status VARCHAR(20) DEFAULT 'submitted' CHECK (status IN ('submitted', 'late', 'graded')),
          UNIQUE(assignment_id, student_id)
      );

      -- =====================================================
      -- 36. LEAVE APPLICATIONS TABLE
      -- =====================================================
      CREATE TABLE IF NOT EXISTS leave_applications (
          id SERIAL PRIMARY KEY,
          student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
          leave_type VARCHAR(20) DEFAULT 'casual' CHECK (leave_type IN ('sick', 'casual', 'emergency', 'other')),
          from_date DATE NOT NULL,
          to_date DATE NOT NULL,
          reason TEXT,
          document_path VARCHAR(255),
          application_date DATE DEFAULT CURRENT_DATE,
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
          approved_by INTEGER REFERENCES users(id),
          approved_at TIMESTAMP,
          remarks TEXT
      );

      -- =====================================================
      -- 37. TEACHER LEAVES TABLE
      -- =====================================================
      CREATE TABLE IF NOT EXISTS teacher_leaves (
          id SERIAL PRIMARY KEY,
          teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
          leave_type VARCHAR(20) DEFAULT 'casual' CHECK (leave_type IN ('sick', 'casual', 'earned', 'maternity', 'other')),
          from_date DATE NOT NULL,
          to_date DATE NOT NULL,
          reason TEXT,
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
          approved_by INTEGER REFERENCES users(id),
          approved_at TIMESTAMP
      );

      -- =====================================================
      -- 38. CERTIFICATES TABLE
      -- =====================================================
      CREATE TABLE IF NOT EXISTS certificates (
          id SERIAL PRIMARY KEY,
          student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
          certificate_type VARCHAR(30) DEFAULT 'character' CHECK (certificate_type IN ('character', 'bonafide', 'migration', 'degree', 'provisional', 'other')),
          issue_date DATE,
          certificate_no VARCHAR(50) UNIQUE,
          issued_by INTEGER REFERENCES users(id),
          file_path VARCHAR(255),
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'issued', 'collected', 'cancelled')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- =====================================================
      -- 39. DOCUMENT VERIFICATIONS TABLE
      -- =====================================================
      CREATE TABLE IF NOT EXISTS document_verifications (
          id SERIAL PRIMARY KEY,
          student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
          document_type VARCHAR(50) NOT NULL,
          document_path VARCHAR(255),
          uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          verified_by INTEGER REFERENCES users(id),
          verified_at TIMESTAMP,
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
          remarks TEXT
      );

      -- =====================================================
      -- 40. NOTICES TABLE
      -- =====================================================
      CREATE TABLE IF NOT EXISTS notices (
          id SERIAL PRIMARY KEY,
          title VARCHAR(200) NOT NULL,
          content TEXT NOT NULL,
          notice_type VARCHAR(20) DEFAULT 'general' CHECK (notice_type IN ('general', 'academic', 'exam', 'fee', 'event', 'urgent')),
          priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
          target_audience VARCHAR(20) DEFAULT 'all' CHECK (target_audience IN ('all', 'students', 'teachers', 'department', 'staff')),
          department_id INTEGER REFERENCES departments(id),
          published_by INTEGER REFERENCES users(id),
          published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expiry_date DATE,
          attachments JSONB DEFAULT '[]',
          is_active BOOLEAN DEFAULT TRUE
      );

      -- =====================================================
      -- 41. NOTICE READS TABLE
      -- =====================================================
      CREATE TABLE IF NOT EXISTS notice_reads (
          id SERIAL PRIMARY KEY,
          notice_id INTEGER REFERENCES notices(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(notice_id, user_id)
      );

      -- =====================================================
      -- 42. FEEDBACK FORMS TABLE
      -- =====================================================
      CREATE TABLE IF NOT EXISTS feedback_forms (
          id SERIAL PRIMARY KEY,
          title VARCHAR(200) NOT NULL,
          type VARCHAR(30) DEFAULT 'general' CHECK (type IN ('teacher_evaluation', 'course_feedback', 'general', 'facility')),
          target_role VARCHAR(20) DEFAULT 'student',
          semester_id INTEGER REFERENCES semesters(id),
          questions JSONB NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          created_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- =====================================================
      -- 43. FEEDBACK RESPONSES TABLE
      -- =====================================================
      CREATE TABLE IF NOT EXISTS feedback_responses (
          id SERIAL PRIMARY KEY,
          form_id INTEGER REFERENCES feedback_forms(id) ON DELETE CASCADE,
          student_id INTEGER REFERENCES students(id),
          teacher_id INTEGER REFERENCES teachers(id),
          course_id INTEGER REFERENCES courses(id),
          responses JSONB NOT NULL,
          submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- =====================================================
      -- 44. SCHOLARSHIPS TABLE
      -- =====================================================
      CREATE TABLE IF NOT EXISTS scholarships (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          eligibility_criteria TEXT,
          amount DECIMAL(10,2),
          type VARCHAR(20) DEFAULT 'merit' CHECK (type IN ('merit', 'need', 'sports', 'special')),
          available_seats INTEGER,
          application_start DATE,
          application_end DATE,
          status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'completed'))
      );

      -- =====================================================
      -- 45. SCHOLARSHIP APPLICATIONS TABLE
      -- =====================================================
      CREATE TABLE IF NOT EXISTS scholarship_applications (
          id SERIAL PRIMARY KEY,
          scholarship_id INTEGER REFERENCES scholarships(id) ON DELETE CASCADE,
          student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
          cgpa DECIMAL(4,2),
          documents JSONB DEFAULT '[]',
          application_date DATE DEFAULT CURRENT_DATE,
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'waitlisted')),
          approved_by INTEGER REFERENCES users(id),
          approved_at TIMESTAMP,
          UNIQUE(scholarship_id, student_id)
      );

      -- =====================================================
      -- 46. COMPLAINTS TABLE
      -- =====================================================
      CREATE TABLE IF NOT EXISTS complaints (
          id SERIAL PRIMARY KEY,
          student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
          category VARCHAR(30) DEFAULT 'other' CHECK (category IN ('academic', 'facility', 'faculty', 'harassment', 'other')),
          subject VARCHAR(200) NOT NULL,
          description TEXT NOT NULL,
          priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
          submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          assigned_to INTEGER REFERENCES users(id),
          status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
          resolved_at TIMESTAMP,
          resolution TEXT
      );

      -- =====================================================
      -- 47. ACTIVITY LOGS TABLE
      -- =====================================================
      CREATE TABLE IF NOT EXISTS activity_logs (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          action VARCHAR(100) NOT NULL,
          module VARCHAR(50) NOT NULL,
          details JSONB DEFAULT '{}',
          ip_address VARCHAR(45),
          user_agent TEXT,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- =====================================================
      -- 48. SYSTEM SETTINGS TABLE
      -- =====================================================
      CREATE TABLE IF NOT EXISTS system_settings (
          id SERIAL PRIMARY KEY,
          key VARCHAR(100) UNIQUE NOT NULL,
          value TEXT,
          description TEXT,
          updated_by INTEGER REFERENCES users(id),
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- =====================================================
      -- 49. NOTIFICATIONS TABLE
      -- =====================================================
      CREATE TABLE IF NOT EXISTS notifications (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          type VARCHAR(20) DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error')),
          title VARCHAR(200) NOT NULL,
          message TEXT NOT NULL,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- =====================================================
      -- 50. NOTIFICATION PREFERENCES TABLE
      -- =====================================================
      CREATE TABLE IF NOT EXISTS notification_preferences (
          id SERIAL PRIMARY KEY,
          user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          email_enabled BOOLEAN DEFAULT TRUE,
          sms_enabled BOOLEAN DEFAULT FALSE,
          push_enabled BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('✅ All 50 tables created successfully');
    
    // Create indexes
    await client.query(`
      -- User indexes
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      
      -- Student indexes
      CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
      CREATE INDEX IF NOT EXISTS idx_students_roll_no ON students(roll_no);
      CREATE INDEX IF NOT EXISTS idx_students_department ON students(department_id);
      
      -- Teacher indexes
      CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON teachers(user_id);
      CREATE INDEX IF NOT EXISTS idx_teachers_department ON teachers(department_id);
      
      -- Attendance indexes
      CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
      CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
      
      -- Activity logs indexes
      CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp);
      
      -- Notifications indexes
      CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
    `);
    
    console.log('✅ Indexes created successfully');
    
    // Add columns if they don't exist (for existing databases)
    await client.query(`
      -- Add weightage and marks_locked to exam_schedule if not exists
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exam_schedule' AND column_name='weightage') THEN
          ALTER TABLE exam_schedule ADD COLUMN weightage INTEGER DEFAULT 100;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exam_schedule' AND column_name='marks_locked') THEN
          ALTER TABLE exam_schedule ADD COLUMN marks_locked BOOLEAN DEFAULT FALSE;
        END IF;
        
        -- Add result publication columns to semesters if not exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='semesters' AND column_name='results_published') THEN
          ALTER TABLE semesters ADD COLUMN results_published BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='semesters' AND column_name='results_published_at') THEN
          ALTER TABLE semesters ADD COLUMN results_published_at TIMESTAMP;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='semesters' AND column_name='results_frozen') THEN
          ALTER TABLE semesters ADD COLUMN results_frozen BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='semesters' AND column_name='results_frozen_at') THEN
          ALTER TABLE semesters ADD COLUMN results_frozen_at TIMESTAMP;
        END IF;
        
        -- Add verification_code and revoked columns to transcripts if not exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transcripts' AND column_name='verification_code') THEN
          ALTER TABLE transcripts ADD COLUMN verification_code VARCHAR(50) UNIQUE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transcripts' AND column_name='revoked_at') THEN
          ALTER TABLE transcripts ADD COLUMN revoked_at TIMESTAMP;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transcripts' AND column_name='revoked_by') THEN
          ALTER TABLE transcripts ADD COLUMN revoked_by INTEGER REFERENCES users(id);
        END IF;
        
        -- Create transcript_requests table if not exists
        CREATE TABLE IF NOT EXISTS transcript_requests (
          id SERIAL PRIMARY KEY,
          student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
          purpose VARCHAR(200),
          copies INTEGER DEFAULT 1,
          delivery_type VARCHAR(20) DEFAULT 'pickup' CHECK (delivery_type IN ('pickup', 'courier', 'email')),
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'issued')),
          transcript_id INTEGER REFERENCES transcripts(id),
          approved_by INTEGER REFERENCES users(id),
          approved_at TIMESTAMP,
          remarks TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      END $$;
    `);
    
    console.log('✅ Schema migrations applied');
    
    // Create update trigger function
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    
    console.log('✅ Trigger function created');
    
    // Insert default data
    await client.query(`
      -- Insert default departments
      INSERT INTO departments (name, code, description) VALUES
          ('Computer Science', 'CS', 'Department of Computer Science'),
          ('Electrical Engineering', 'EE', 'Department of Electrical Engineering'),
          ('Mechanical Engineering', 'ME', 'Department of Mechanical Engineering'),
          ('Civil Engineering', 'CE', 'Department of Civil Engineering'),
          ('Business Administration', 'BA', 'Department of Business Administration'),
          ('Mathematics', 'MATH', 'Department of Mathematics'),
          ('Physics', 'PHY', 'Department of Physics'),
          ('Chemistry', 'CHEM', 'Department of Chemistry'),
          ('English', 'ENG', 'Department of English'),
          ('Urdu', 'URD', 'Department of Urdu')
      ON CONFLICT (code) DO NOTHING;
      
      -- Insert default grade scale
      INSERT INTO grade_scale (min_marks, max_marks, grade, grade_point) VALUES
          (85, 100, 'A+', 4.00),
          (80, 84.99, 'A', 4.00),
          (75, 79.99, 'A-', 3.67),
          (70, 74.99, 'B+', 3.33),
          (65, 69.99, 'B', 3.00),
          (60, 64.99, 'B-', 2.67),
          (55, 59.99, 'C+', 2.33),
          (50, 54.99, 'C', 2.00),
          (45, 49.99, 'C-', 1.67),
          (40, 44.99, 'D', 1.00),
          (0, 39.99, 'F', 0.00)
      ON CONFLICT DO NOTHING;
      
      -- Insert default system settings
      INSERT INTO system_settings (key, value, description) VALUES
          ('college_name', 'Government College Larkana', 'College name'),
          ('college_address', 'Larkana, Sindh, Pakistan', 'College address'),
          ('college_email', 'info@govtcollegelarkana.edu.pk', 'College email'),
          ('college_phone', '+92-XXX-XXXXXXX', 'College phone'),
          ('academic_year', '2025-2026', 'Current academic year'),
          ('current_semester', 'Spring 2026', 'Current semester')
      ON CONFLICT (key) DO NOTHING;
    `);
    
    console.log('✅ Default data inserted');
    
    // Check if super admin exists
    const adminCheck = await client.query(
      `SELECT id FROM users WHERE email = 'admin@govtcollegelarkana.edu.pk'`
    );
    
    if (adminCheck.rows.length === 0) {
      // Create super admin (password: Admin@123)
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('Admin@123', 10);
      
      const userResult = await client.query(
        `INSERT INTO users (email, password, role, is_active, email_verified)
         VALUES ('admin@govtcollegelarkana.edu.pk', $1, 'admin', TRUE, TRUE)
         RETURNING id`,
        [hashedPassword]
      );
      
      await client.query(
        `INSERT INTO admins (user_id, name, role)
         VALUES ($1, 'Super Admin', 'super_admin')`,
        [userResult.rows[0].id]
      );
      
      console.log('✅ Super Admin created');
      console.log('   📧 Email: admin@govtcollegelarkana.edu.pk');
      console.log('   🔑 Password: Admin@123');
    }
    
    client.release();
    console.log('✅ Database initialization completed!');
    console.log('═══════════════════════════════════════════════════');
    
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
    throw error;
  }
};

module.exports = initDatabase;
