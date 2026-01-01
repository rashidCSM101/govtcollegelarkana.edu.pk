-- User Management
1. users (id, email, password, role, is_active, created_at)
2. students (id, user_id, roll_no, name, father_name, dob, cnic, phone, address, photo, batch, department_id, semester, status)
3. teachers (id, user_id, name, cnic, phone, designation, department_id, qualification, experience, photo)
4. admins (id, user_id, name, role)

-- Academic Structure
5. departments (id, name, code, hod_teacher_id, created_at)
6. sessions (id, name, start_date, end_date, is_active)
7. semesters (id, session_id, name, number, start_date, end_date, is_active)
8. courses (id, code, name, credit_hours, department_id, semester_number, description)
9. course_prerequisites (id, course_id, prerequisite_course_id)

-- Enrollment & Registration
10. student_enrollments (id, student_id, session_id, semester_id, enrollment_date, status)
11. course_registrations (id, student_id, course_id, semester_id, session_id, registration_date, status)
12. course_sections (id, course_id, semester_id, teacher_id, section_name, capacity, room_no)
13. waiting_lists (id, course_id, student_id, position, requested_at, status)

-- Timetable
14. timetable_slots (id, section_id, day, start_time, end_time, room_no)

-- Attendance
15. attendance (id, section_id, date, student_id, status, marked_by, marked_at)
16. attendance_summary (id, student_id, course_id, semester_id, total_classes, present, absent, percentage)

-- Examination
17. exams (id, name, type, semester_id, start_date, end_date, created_by)
18. exam_schedule (id, exam_id, course_id, date, start_time, end_time, room_no, total_marks)
19. online_exams (id, exam_schedule_id, duration_minutes, passing_marks, instructions)
20. exam_questions (id, online_exam_id, question_text, question_type, options, correct_answer, marks)
21. exam_attempts (id, online_exam_id, student_id, start_time, end_time, submitted_at, total_marks, obtained_marks)
22. exam_answers (id, attempt_id, question_id, student_answer, is_correct, marks_obtained)
23. hall_tickets (id, student_id, exam_id, ticket_number, generated_at)

-- Results & Grades
24. marks (id, student_id, exam_schedule_id, obtained_marks, total_marks, entered_by, entry_date)
25. grades (id, student_id, course_id, semester_id, marks, grade, grade_points, credit_hours)
26. grade_scale (id, min_marks, max_marks, grade, grade_point)
27. semester_results (id, student_id, semester_id, sgpa, cgpa, total_credits, status)
28. transcripts (id, student_id, generated_at, generated_by, status)
29. re_evaluation_requests (id, student_id, exam_schedule_id, reason, request_date, status, resolved_by, resolved_at)

-- Fee Management
30. fee_structures (id, department_id, semester_number, session_id, tuition_fee, lab_fee, library_fee, sports_fee, other_fee, total_fee)
31. student_fees (id, student_id, semester_id, fee_structure_id, total_amount, paid_amount, due_amount, due_date, status)
32. fee_payments (id, student_fee_id, amount, payment_method, transaction_id, payment_date, receipt_no, received_by)
33. fee_vouchers (id, student_id, student_fee_id, voucher_no, bank_name, issue_date, valid_until, status)

-- Assignments
34. assignments (id, course_id, section_id, title, description, total_marks, due_date, file_path, created_by, created_at)
35. assignment_submissions (id, assignment_id, student_id, submission_text, file_path, submitted_at, marks_obtained, graded_by, graded_at, feedback)

-- Leave Management
36. leave_applications (id, student_id, leave_type, from_date, to_date, reason, document_path, application_date, status, approved_by, approved_at, remarks)
37. teacher_leaves (id, teacher_id, leave_type, from_date, to_date, reason, status, approved_by)

-- Certificates & Documents
38. certificates (id, student_id, certificate_type, issue_date, certificate_no, issued_by, file_path, status)
39. document_verifications (id, student_id, document_type, document_path, uploaded_at, verified_by, verified_at, status, remarks)

-- Notice & Communication
40. notices (id, title, content, notice_type, priority, target_audience, department_id, published_by, published_at, expiry_date, attachments)
41. notice_reads (id, notice_id, user_id, read_at)

-- Feedback & Surveys
42. feedback_forms (id, title, type, target_role, semester_id, questions, is_active, created_by, created_at)
43. feedback_responses (id, form_id, student_id, teacher_id, course_id, responses, submitted_at)

-- Scholarship
44. scholarships (id, name, description, eligibility_criteria, amount, type, available_seats, application_start, application_end, status)
45. scholarship_applications (id, scholarship_id, student_id, cgpa, documents, application_date, status, approved_by, approved_at)

-- Complaints & Grievances
46. complaints (id, student_id, category, subject, description, priority, submitted_at, assigned_to, status, resolved_at, resolution)

-- System Logs & Audit
47. activity_logs (id, user_id, action, module, details, ip_address, timestamp)
48. system_settings (id, key, value, description, updated_by, updated_at)

-- Notifications
49. notifications (id, user_id, type, title, message, is_read, created_at)
50. notification_preferences (id, user_id, email_enabled, sms_enabled, push_enabled)