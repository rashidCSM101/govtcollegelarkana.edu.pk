const { query, getClient } = require('../../config/database');
const { validateRequired } = require('../../utils/validator');

class ResultService {

  // ==================== GRADE SCALE MANAGEMENT ====================

  // Initialize default grade scale
  async initGradeScale() {
    const existingScale = await query('SELECT COUNT(*) as count FROM grade_scale');
    
    if (parseInt(existingScale.rows[0].count) === 0) {
      // Insert default HEC Pakistan grade scale
      const defaultScale = [
        { min: 85, max: 100, grade: 'A+', point: 4.00 },
        { min: 80, max: 84.99, grade: 'A', point: 4.00 },
        { min: 75, max: 79.99, grade: 'B+', point: 3.50 },
        { min: 70, max: 74.99, grade: 'B', point: 3.00 },
        { min: 65, max: 69.99, grade: 'C+', point: 2.50 },
        { min: 60, max: 64.99, grade: 'C', point: 2.00 },
        { min: 55, max: 59.99, grade: 'D+', point: 1.50 },
        { min: 50, max: 54.99, grade: 'D', point: 1.00 },
        { min: 0, max: 49.99, grade: 'F', point: 0.00 }
      ];

      for (const g of defaultScale) {
        await query(
          'INSERT INTO grade_scale (min_marks, max_marks, grade, grade_point) VALUES ($1, $2, $3, $4)',
          [g.min, g.max, g.grade, g.point]
        );
      }
    }
  }

  // Get grade scale
  async getGradeScale() {
    await this.initGradeScale(); // Ensure scale exists
    
    const result = await query('SELECT * FROM grade_scale ORDER BY min_marks DESC');
    return result.rows;
  }

  // Update grade scale
  async updateGradeScale(scaleData) {
    const { scale } = scaleData;

    if (!Array.isArray(scale) || scale.length === 0) {
      throw { status: 400, message: 'Grade scale array is required' };
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Clear existing scale
      await client.query('DELETE FROM grade_scale');

      // Insert new scale
      for (const g of scale) {
        await client.query(
          'INSERT INTO grade_scale (min_marks, max_marks, grade, grade_point) VALUES ($1, $2, $3, $4)',
          [g.min_marks, g.max_marks, g.grade, g.grade_point]
        );
      }

      await client.query('COMMIT');
      
      return {
        message: 'Grade scale updated successfully',
        scale: await this.getGradeScale()
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ==================== ENHANCED MARKS ENTRY ====================

  // Enter marks with validation
  async enterMarks(userId, marksData) {
    const { student_id, exam_schedule_id, obtained_marks } = marksData;

    const validation = validateRequired(
      { student_id, exam_schedule_id, obtained_marks },
      ['student_id', 'exam_schedule_id', 'obtained_marks']
    );
    if (!validation.isValid) {
      throw { status: 400, message: validation.errors.join(', ') };
    }

    // Validate marks range (0-100)
    if (obtained_marks < 0 || obtained_marks > 100) {
      throw { status: 400, message: 'Marks must be between 0 and 100' };
    }

    // Verify exam schedule exists and get details
    const scheduleResult = await query(`
      SELECT es.*, c.name as course_name, c.credit_hours,
             e.type as exam_type,
             CASE WHEN es.marks_locked = true THEN true ELSE false END as is_locked
      FROM exam_schedule es
      JOIN courses c ON es.course_id = c.id
      JOIN exams e ON es.exam_id = e.id
      WHERE es.id = $1
    `, [exam_schedule_id]);

    if (scheduleResult.rows.length === 0) {
      throw { status: 404, message: 'Exam schedule not found' };
    }

    const schedule = scheduleResult.rows[0];

    // Check if marks are locked
    if (schedule.is_locked) {
      throw { status: 403, message: 'Marks are locked for this exam. Cannot modify.' };
    }

    // Verify student exists
    const studentResult = await query('SELECT id, name, roll_no FROM students WHERE id = $1', [student_id]);
    if (studentResult.rows.length === 0) {
      throw { status: 404, message: 'Student not found' };
    }

    // Upsert marks
    const result = await query(`
      INSERT INTO marks (student_id, exam_schedule_id, obtained_marks, total_marks, entered_by)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (student_id, exam_schedule_id)
      DO UPDATE SET 
        obtained_marks = EXCLUDED.obtained_marks, 
        total_marks = EXCLUDED.total_marks,
        entered_by = EXCLUDED.entered_by,
        entry_date = CURRENT_TIMESTAMP
      RETURNING *
    `, [student_id, exam_schedule_id, obtained_marks, schedule.total_marks, userId]);

    return {
      message: 'Marks entered successfully',
      marks: result.rows[0],
      student: studentResult.rows[0],
      course: schedule.course_name
    };
  }

  // Edit marks (with validation)
  async editMarks(userId, markId, editData) {
    const { obtained_marks } = editData;

    if (obtained_marks === undefined) {
      throw { status: 400, message: 'obtained_marks is required' };
    }

    // Validate marks range
    if (obtained_marks < 0 || obtained_marks > 100) {
      throw { status: 400, message: 'Marks must be between 0 and 100' };
    }

    // Check if mark exists and if locked
    const markResult = await query(`
      SELECT m.*, es.marks_locked, es.total_marks, c.name as course_name
      FROM marks m
      JOIN exam_schedule es ON m.exam_schedule_id = es.id
      JOIN courses c ON es.course_id = c.id
      WHERE m.id = $1
    `, [markId]);

    if (markResult.rows.length === 0) {
      throw { status: 404, message: 'Mark record not found' };
    }

    if (markResult.rows[0].marks_locked) {
      throw { status: 403, message: 'Marks are locked. Cannot edit.' };
    }

    const result = await query(`
      UPDATE marks 
      SET obtained_marks = $1, entered_by = $2, entry_date = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [obtained_marks, userId, markId]);

    return {
      message: 'Marks updated successfully',
      marks: result.rows[0]
    };
  }

  // Bulk upload marks from CSV data
  async bulkUploadMarks(userId, bulkData) {
    const { exam_schedule_id, marks_list } = bulkData;

    if (!exam_schedule_id) {
      throw { status: 400, message: 'exam_schedule_id is required' };
    }

    if (!Array.isArray(marks_list) || marks_list.length === 0) {
      throw { status: 400, message: 'marks_list array is required' };
    }

    // Check if exam schedule exists and is not locked
    const scheduleResult = await query(`
      SELECT es.*, c.name as course_name
      FROM exam_schedule es
      JOIN courses c ON es.course_id = c.id
      WHERE es.id = $1
    `, [exam_schedule_id]);

    if (scheduleResult.rows.length === 0) {
      throw { status: 404, message: 'Exam schedule not found' };
    }

    if (scheduleResult.rows[0].marks_locked) {
      throw { status: 403, message: 'Marks are locked for this exam' };
    }

    const results = { success: [], failed: [] };

    for (const item of marks_list) {
      try {
        // Find student by roll_no if student_id not provided
        let studentId = item.student_id;
        
        if (!studentId && item.roll_no) {
          const studentResult = await query('SELECT id FROM students WHERE roll_no = $1', [item.roll_no]);
          if (studentResult.rows.length > 0) {
            studentId = studentResult.rows[0].id;
          } else {
            throw new Error(`Student with roll_no ${item.roll_no} not found`);
          }
        }

        if (!studentId) {
          throw new Error('student_id or roll_no is required');
        }

        // Validate marks
        const marks = parseFloat(item.obtained_marks);
        if (isNaN(marks) || marks < 0 || marks > 100) {
          throw new Error('Marks must be between 0 and 100');
        }

        const result = await this.enterMarks(userId, {
          student_id: studentId,
          exam_schedule_id,
          obtained_marks: marks
        });
        
        results.success.push({
          student_id: studentId,
          roll_no: item.roll_no,
          obtained_marks: marks
        });
      } catch (err) {
        results.failed.push({
          roll_no: item.roll_no,
          student_id: item.student_id,
          error: err.message
        });
      }
    }

    return {
      message: `Processed ${results.success.length + results.failed.length} records`,
      total_success: results.success.length,
      total_failed: results.failed.length,
      success: results.success,
      failed: results.failed
    };
  }

  // Lock marks for an exam schedule
  async lockMarks(userId, lockData) {
    const { exam_schedule_id, lock = true } = lockData;

    if (!exam_schedule_id) {
      throw { status: 400, message: 'exam_schedule_id is required' };
    }

    // Check if exam schedule exists
    const scheduleResult = await query('SELECT id FROM exam_schedule WHERE id = $1', [exam_schedule_id]);
    if (scheduleResult.rows.length === 0) {
      throw { status: 404, message: 'Exam schedule not found' };
    }

    // Update marks_locked status
    const result = await query(`
      UPDATE exam_schedule 
      SET marks_locked = $1
      WHERE id = $2
      RETURNING *
    `, [lock, exam_schedule_id]);

    return {
      message: lock ? 'Marks locked successfully' : 'Marks unlocked successfully',
      exam_schedule: result.rows[0]
    };
  }

  // ==================== GRADE CALCULATION ====================

  // Get grade from marks
  async getGradeForMarks(percentage) {
    await this.initGradeScale();
    
    const result = await query(`
      SELECT grade, grade_point FROM grade_scale 
      WHERE $1 >= min_marks AND $1 <= max_marks
      LIMIT 1
    `, [percentage]);

    if (result.rows.length === 0) {
      return { grade: 'F', grade_point: 0 };
    }

    return result.rows[0];
  }

  // Calculate grades for a course
  async calculateCourseGrades(gradeData) {
    const { course_id, semester_id, exam_id } = gradeData;

    const validation = validateRequired({ course_id, semester_id }, ['course_id', 'semester_id']);
    if (!validation.isValid) {
      throw { status: 400, message: validation.errors.join(', ') };
    }

    // Get course details
    const courseResult = await query('SELECT * FROM courses WHERE id = $1', [course_id]);
    if (courseResult.rows.length === 0) {
      throw { status: 404, message: 'Course not found' };
    }

    const course = courseResult.rows[0];

    // Get all exam schedules for this course/exam combination
    let sql = `
      SELECT es.id, es.total_marks, es.weightage, e.type as exam_type
      FROM exam_schedule es
      JOIN exams e ON es.exam_id = e.id
      WHERE es.course_id = $1 AND e.semester_id = $2
    `;
    const params = [course_id, semester_id];

    if (exam_id) {
      sql += ' AND e.id = $3';
      params.push(exam_id);
    }

    const schedulesResult = await query(sql, params);

    if (schedulesResult.rows.length === 0) {
      throw { status: 404, message: 'No exam schedules found for this course' };
    }

    // Get all students registered for this course
    const studentsResult = await query(`
      SELECT DISTINCT cr.student_id, s.name, s.roll_no
      FROM course_registrations cr
      JOIN students s ON cr.student_id = s.id
      WHERE cr.course_id = $1 AND cr.semester_id = $2 AND cr.status = 'approved'
    `, [course_id, semester_id]);

    if (studentsResult.rows.length === 0) {
      throw { status: 404, message: 'No students registered for this course' };
    }

    const client = await getClient();
    const results = { success: [], failed: [] };

    try {
      await client.query('BEGIN');

      for (const student of studentsResult.rows) {
        try {
          // Calculate total weighted marks for this student
          let totalWeightedMarks = 0;
          let totalWeight = 0;

          for (const schedule of schedulesResult.rows) {
            const marksResult = await client.query(
              'SELECT obtained_marks, total_marks FROM marks WHERE student_id = $1 AND exam_schedule_id = $2',
              [student.student_id, schedule.id]
            );

            if (marksResult.rows.length > 0) {
              const marks = marksResult.rows[0];
              const percentage = (marks.obtained_marks / marks.total_marks) * 100;
              const weight = schedule.weightage || 100;
              totalWeightedMarks += (percentage * weight / 100);
              totalWeight += weight;
            }
          }

          // Calculate final percentage
          const finalPercentage = totalWeight > 0 ? (totalWeightedMarks / totalWeight) * 100 : 0;
          
          // Get grade
          const gradeInfo = await this.getGradeForMarks(finalPercentage);

          // Upsert grade
          await client.query(`
            INSERT INTO grades (student_id, course_id, semester_id, marks, grade, grade_points, credit_hours)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (student_id, course_id, semester_id)
            DO UPDATE SET 
              marks = EXCLUDED.marks,
              grade = EXCLUDED.grade,
              grade_points = EXCLUDED.grade_points,
              credit_hours = EXCLUDED.credit_hours
          `, [student.student_id, course_id, semester_id, finalPercentage, gradeInfo.grade, gradeInfo.grade_point, course.credit_hours]);

          results.success.push({
            student_id: student.student_id,
            name: student.name,
            roll_no: student.roll_no,
            marks: finalPercentage.toFixed(2),
            grade: gradeInfo.grade,
            grade_points: gradeInfo.grade_point
          });
        } catch (err) {
          results.failed.push({
            student_id: student.student_id,
            name: student.name,
            error: err.message
          });
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return {
      message: `Grades calculated for ${results.success.length} students`,
      course: { id: course_id, name: course.name },
      semester_id,
      total_success: results.success.length,
      total_failed: results.failed.length,
      grades: results.success,
      failed: results.failed
    };
  }

  // Calculate grades for all courses in a semester
  async calculateSemesterGrades(gradeData) {
    const { semester_id, exam_id } = gradeData;

    if (!semester_id) {
      throw { status: 400, message: 'semester_id is required' };
    }

    // Get all courses in this semester
    const coursesResult = await query(`
      SELECT DISTINCT cr.course_id, c.name, c.credit_hours
      FROM course_registrations cr
      JOIN courses c ON cr.course_id = c.id
      WHERE cr.semester_id = $1 AND cr.status = 'approved'
    `, [semester_id]);

    if (coursesResult.rows.length === 0) {
      throw { status: 404, message: 'No courses found for this semester' };
    }

    const results = [];

    for (const course of coursesResult.rows) {
      try {
        const result = await this.calculateCourseGrades({
          course_id: course.course_id,
          semester_id,
          exam_id
        });
        results.push({
          course_id: course.course_id,
          course_name: course.name,
          status: 'success',
          students_processed: result.total_success
        });
      } catch (err) {
        results.push({
          course_id: course.course_id,
          course_name: course.name,
          status: 'failed',
          error: err.message
        });
      }
    }

    return {
      message: `Processed ${results.length} courses`,
      semester_id,
      courses: results
    };
  }

  // ==================== GPA/CGPA CALCULATION ====================

  // Calculate SGPA for a student in a semester
  async calculateSGPA(studentId, semesterId) {
    // Get all grades for this student in this semester
    const gradesResult = await query(`
      SELECT g.*, c.credit_hours, c.name as course_name
      FROM grades g
      JOIN courses c ON g.course_id = c.id
      WHERE g.student_id = $1 AND g.semester_id = $2
    `, [studentId, semesterId]);

    if (gradesResult.rows.length === 0) {
      return { sgpa: 0, total_credits: 0, courses: [] };
    }

    let totalGradePoints = 0;
    let totalCredits = 0;
    const courses = [];

    for (const grade of gradesResult.rows) {
      const credits = grade.credit_hours || 3; // Default to 3 if not specified
      const gradePoints = parseFloat(grade.grade_points) || 0;
      
      totalGradePoints += gradePoints * credits;
      totalCredits += credits;

      courses.push({
        course_id: grade.course_id,
        course_name: grade.course_name,
        marks: grade.marks,
        grade: grade.grade,
        grade_points: gradePoints,
        credit_hours: credits
      });
    }

    const sgpa = totalCredits > 0 ? (totalGradePoints / totalCredits) : 0;

    return {
      sgpa: parseFloat(sgpa.toFixed(2)),
      total_credits: totalCredits,
      total_grade_points: parseFloat(totalGradePoints.toFixed(2)),
      courses
    };
  }

  // Calculate CGPA for a student (all semesters)
  async calculateCGPA(studentId) {
    // Get all semesters with grades for this student
    const semestersResult = await query(`
      SELECT DISTINCT g.semester_id, s.name as semester_name, s.semester_number
      FROM grades g
      JOIN semesters s ON g.semester_id = s.id
      WHERE g.student_id = $1
      ORDER BY s.semester_number
    `, [studentId]);

    if (semestersResult.rows.length === 0) {
      return { cgpa: 0, total_credits: 0, semesters: [] };
    }

    let totalGradePoints = 0;
    let totalCredits = 0;
    const semesters = [];

    for (const semester of semestersResult.rows) {
      const sgpaData = await this.calculateSGPA(studentId, semester.semester_id);
      
      totalGradePoints += sgpaData.total_grade_points;
      totalCredits += sgpaData.total_credits;

      semesters.push({
        semester_id: semester.semester_id,
        semester_name: semester.semester_name,
        semester_number: semester.semester_number,
        sgpa: sgpaData.sgpa,
        credits: sgpaData.total_credits,
        courses: sgpaData.courses
      });
    }

    const cgpa = totalCredits > 0 ? (totalGradePoints / totalCredits) : 0;

    return {
      cgpa: parseFloat(cgpa.toFixed(2)),
      total_credits: totalCredits,
      total_semesters: semesters.length,
      semesters
    };
  }

  // Calculate GPA for all students in a semester
  async calculateGPAForSemester(gpaData) {
    const { semester_id } = gpaData;

    if (!semester_id) {
      throw { status: 400, message: 'semester_id is required' };
    }

    // Get all students with grades in this semester
    const studentsResult = await query(`
      SELECT DISTINCT g.student_id, s.name, s.roll_no
      FROM grades g
      JOIN students s ON g.student_id = s.id
      WHERE g.semester_id = $1
    `, [semester_id]);

    if (studentsResult.rows.length === 0) {
      throw { status: 404, message: 'No students with grades found for this semester' };
    }

    const client = await getClient();
    const results = [];

    try {
      await client.query('BEGIN');

      for (const student of studentsResult.rows) {
        const sgpaData = await this.calculateSGPA(student.student_id, semester_id);
        const cgpaData = await this.calculateCGPA(student.student_id);

        // Update or insert semester result
        await client.query(`
          INSERT INTO semester_results (student_id, semester_id, sgpa, cgpa, total_credits, status)
          VALUES ($1, $2, $3, $4, $5, 'pending')
          ON CONFLICT (student_id, semester_id)
          DO UPDATE SET 
            sgpa = EXCLUDED.sgpa,
            cgpa = EXCLUDED.cgpa,
            total_credits = EXCLUDED.total_credits
        `, [student.student_id, semester_id, sgpaData.sgpa, cgpaData.cgpa, sgpaData.total_credits]);

        results.push({
          student_id: student.student_id,
          name: student.name,
          roll_no: student.roll_no,
          sgpa: sgpaData.sgpa,
          cgpa: cgpaData.cgpa,
          credits: sgpaData.total_credits
        });
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    // Calculate class statistics
    const sgpas = results.map(r => r.sgpa);
    const stats = {
      highest_sgpa: Math.max(...sgpas),
      lowest_sgpa: Math.min(...sgpas),
      average_sgpa: parseFloat((sgpas.reduce((a, b) => a + b, 0) / sgpas.length).toFixed(2)),
      total_students: results.length
    };

    return {
      message: `GPA calculated for ${results.length} students`,
      semester_id,
      statistics: stats,
      results
    };
  }

  // ==================== RESULT PROCESSING ====================

  // Process semester results (Pass/Fail, Probation)
  async processResults(processData) {
    const { 
      semester_id, 
      passing_cgpa = 2.0, 
      probation_cgpa = 1.5 
    } = processData;

    if (!semester_id) {
      throw { status: 400, message: 'semester_id is required' };
    }

    // First, calculate GPA for all students
    await this.calculateGPAForSemester({ semester_id });

    // Get all semester results
    const resultsResult = await query(`
      SELECT sr.*, s.name, s.roll_no, s.current_semester
      FROM semester_results sr
      JOIN students s ON sr.student_id = s.id
      WHERE sr.semester_id = $1
    `, [semester_id]);

    if (resultsResult.rows.length === 0) {
      throw { status: 404, message: 'No results found for this semester' };
    }

    const client = await getClient();
    const processed = {
      passed: [],
      failed: [],
      probation: [],
      promoted: []
    };

    try {
      await client.query('BEGIN');

      for (const result of resultsResult.rows) {
        let status = 'pending';
        const cgpa = parseFloat(result.cgpa);
        const sgpa = parseFloat(result.sgpa);

        // Check for failed grades (F)
        const failedGradesResult = await client.query(`
          SELECT COUNT(*) as failed_count 
          FROM grades 
          WHERE student_id = $1 AND semester_id = $2 AND grade = 'F'
        `, [result.student_id, semester_id]);

        const failedCount = parseInt(failedGradesResult.rows[0].failed_count);

        // Determine status
        if (cgpa >= passing_cgpa && failedCount === 0) {
          status = 'pass';
          processed.passed.push(result);
        } else if (cgpa < probation_cgpa || failedCount > 2) {
          status = 'fail';
          processed.failed.push(result);
        } else if (cgpa < passing_cgpa && cgpa >= probation_cgpa) {
          // Probation - Student can continue but needs improvement
          status = 'pass'; // Still pass but flagged for probation
          processed.probation.push(result);
        } else {
          status = 'pass';
          processed.passed.push(result);
        }

        // Update result status
        await client.query(`
          UPDATE semester_results 
          SET status = $1
          WHERE id = $2
        `, [status, result.id]);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return {
      message: 'Results processed successfully',
      semester_id,
      criteria: { passing_cgpa, probation_cgpa },
      summary: {
        total_students: resultsResult.rows.length,
        passed: processed.passed.length,
        failed: processed.failed.length,
        on_probation: processed.probation.length
      },
      details: {
        passed: processed.passed.map(r => ({
          student_id: r.student_id,
          name: r.name,
          roll_no: r.roll_no,
          sgpa: r.sgpa,
          cgpa: r.cgpa
        })),
        failed: processed.failed.map(r => ({
          student_id: r.student_id,
          name: r.name,
          roll_no: r.roll_no,
          sgpa: r.sgpa,
          cgpa: r.cgpa
        })),
        probation: processed.probation.map(r => ({
          student_id: r.student_id,
          name: r.name,
          roll_no: r.roll_no,
          sgpa: r.sgpa,
          cgpa: r.cgpa
        }))
      }
    };
  }

  // Promote students to next semester
  async promoteStudents(promotionData) {
    const { semester_id, next_semester_id } = promotionData;

    if (!semester_id || !next_semester_id) {
      throw { status: 400, message: 'semester_id and next_semester_id are required' };
    }

    // Get passed students
    const passedResult = await query(`
      SELECT sr.student_id, s.name, s.roll_no
      FROM semester_results sr
      JOIN students s ON sr.student_id = s.id
      WHERE sr.semester_id = $1 AND sr.status = 'pass'
    `, [semester_id]);

    if (passedResult.rows.length === 0) {
      throw { status: 404, message: 'No passed students found for promotion' };
    }

    // Verify next semester exists
    const nextSemResult = await query('SELECT * FROM semesters WHERE id = $1', [next_semester_id]);
    if (nextSemResult.rows.length === 0) {
      throw { status: 404, message: 'Next semester not found' };
    }

    const client = await getClient();
    const promoted = [];

    try {
      await client.query('BEGIN');

      for (const student of passedResult.rows) {
        // Update student's current semester
        await client.query(`
          UPDATE students 
          SET current_semester = (SELECT semester_number FROM semesters WHERE id = $1)
          WHERE id = $2
        `, [next_semester_id, student.student_id]);

        // Update semester result status
        await client.query(`
          UPDATE semester_results 
          SET status = 'promoted'
          WHERE student_id = $1 AND semester_id = $2
        `, [student.student_id, semester_id]);

        promoted.push({
          student_id: student.student_id,
          name: student.name,
          roll_no: student.roll_no
        });
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return {
      message: `${promoted.length} students promoted to next semester`,
      from_semester: semester_id,
      to_semester: next_semester_id,
      promoted_students: promoted
    };
  }

  // ==================== RESULT PUBLICATION ====================

  // Publish results for a semester
  async publishResults(publishData) {
    const { semester_id, notify_students = true } = publishData;

    if (!semester_id) {
      throw { status: 400, message: 'semester_id is required' };
    }

    // Check if results are processed
    const resultsResult = await query(`
      SELECT COUNT(*) as count FROM semester_results 
      WHERE semester_id = $1 AND status != 'pending'
    `, [semester_id]);

    if (parseInt(resultsResult.rows[0].count) === 0) {
      throw { status: 400, message: 'Results must be processed before publishing' };
    }

    // Update semester to published
    const result = await query(`
      UPDATE semesters 
      SET results_published = true, 
          results_published_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [semester_id]);

    // Get summary for response
    const summary = await query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pass' THEN 1 ELSE 0 END) as passed,
        SUM(CASE WHEN status = 'fail' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'promoted' THEN 1 ELSE 0 END) as promoted,
        AVG(sgpa) as avg_sgpa,
        AVG(cgpa) as avg_cgpa
      FROM semester_results
      WHERE semester_id = $1
    `, [semester_id]);

    // TODO: Send notifications to students if enabled
    // if (notify_students) {
    //   await this.sendResultNotifications(semester_id);
    // }

    return {
      message: 'Results published successfully',
      semester: result.rows[0],
      summary: {
        total_students: parseInt(summary.rows[0].total),
        passed: parseInt(summary.rows[0].passed),
        failed: parseInt(summary.rows[0].failed),
        promoted: parseInt(summary.rows[0].promoted),
        average_sgpa: parseFloat(summary.rows[0].avg_sgpa).toFixed(2),
        average_cgpa: parseFloat(summary.rows[0].avg_cgpa).toFixed(2)
      }
    };
  }

  // Freeze results (prevent further changes)
  async freezeResults(freezeData) {
    const { semester_id } = freezeData;

    if (!semester_id) {
      throw { status: 400, message: 'semester_id is required' };
    }

    // Lock all marks for this semester
    await query(`
      UPDATE exam_schedule es
      SET marks_locked = true
      FROM exams e
      WHERE es.exam_id = e.id AND e.semester_id = $1
    `, [semester_id]);

    // Update semester to frozen
    const result = await query(`
      UPDATE semesters 
      SET results_frozen = true, 
          results_frozen_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [semester_id]);

    return {
      message: 'Results frozen successfully. No further changes allowed.',
      semester: result.rows[0]
    };
  }

  // ==================== STUDENT RESULTS VIEW ====================

  // Get student results (all semesters)
  async getStudentResults(studentId) {
    // Verify student exists
    const studentResult = await query(`
      SELECT s.*, d.name as department_name
      FROM students s
      JOIN departments d ON s.department_id = d.id
      WHERE s.id = $1
    `, [studentId]);

    if (studentResult.rows.length === 0) {
      throw { status: 404, message: 'Student not found' };
    }

    const student = studentResult.rows[0];

    // Get CGPA data
    const cgpaData = await this.calculateCGPA(studentId);

    // Get semester-wise results
    const resultsResult = await query(`
      SELECT sr.*, sem.name as semester_name, sem.semester_number
      FROM semester_results sr
      JOIN semesters sem ON sr.semester_id = sem.id
      WHERE sr.student_id = $1
      ORDER BY sem.semester_number
    `, [studentId]);

    return {
      student: {
        id: student.id,
        name: student.name,
        roll_no: student.roll_no,
        department: student.department_name,
        current_semester: student.current_semester
      },
      cgpa: cgpaData.cgpa,
      total_credits: cgpaData.total_credits,
      total_semesters: cgpaData.total_semesters,
      semesters: cgpaData.semesters,
      semester_results: resultsResult.rows
    };
  }

  // Get student results for a specific semester
  async getStudentSemesterResults(studentId, semesterId) {
    // Check if results are published
    const semesterResult = await query(`
      SELECT * FROM semesters WHERE id = $1
    `, [semesterId]);

    if (semesterResult.rows.length === 0) {
      throw { status: 404, message: 'Semester not found' };
    }

    const semester = semesterResult.rows[0];

    // Get SGPA data
    const sgpaData = await this.calculateSGPA(studentId, semesterId);

    if (sgpaData.courses.length === 0) {
      throw { status: 404, message: 'No grades found for this semester' };
    }

    // Get semester result
    const resultResult = await query(`
      SELECT * FROM semester_results 
      WHERE student_id = $1 AND semester_id = $2
    `, [studentId, semesterId]);

    // Get student info
    const studentResult = await query(`
      SELECT s.*, d.name as department_name
      FROM students s
      JOIN departments d ON s.department_id = d.id
      WHERE s.id = $1
    `, [studentId]);

    return {
      student: {
        id: studentResult.rows[0].id,
        name: studentResult.rows[0].name,
        roll_no: studentResult.rows[0].roll_no,
        department: studentResult.rows[0].department_name
      },
      semester: {
        id: semester.id,
        name: semester.name,
        semester_number: semester.semester_number,
        results_published: semester.results_published
      },
      sgpa: sgpaData.sgpa,
      total_credits: sgpaData.total_credits,
      courses: sgpaData.courses,
      result: resultResult.rows[0] || null
    };
  }

  // ==================== RESULT REPORTS ====================

  // Get class result summary
  async getClassResultSummary(semesterId, departmentId = null) {
    let sql = `
      SELECT 
        sr.semester_id,
        s.department_id,
        d.name as department_name,
        COUNT(*) as total_students,
        SUM(CASE WHEN sr.status = 'pass' THEN 1 ELSE 0 END) as passed,
        SUM(CASE WHEN sr.status = 'fail' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN sr.status = 'promoted' THEN 1 ELSE 0 END) as promoted,
        ROUND(AVG(sr.sgpa), 2) as avg_sgpa,
        ROUND(AVG(sr.cgpa), 2) as avg_cgpa,
        MAX(sr.sgpa) as highest_sgpa,
        MIN(sr.sgpa) as lowest_sgpa
      FROM semester_results sr
      JOIN students s ON sr.student_id = s.id
      JOIN departments d ON s.department_id = d.id
      WHERE sr.semester_id = $1
    `;
    
    const params = [semesterId];

    if (departmentId) {
      sql += ' AND s.department_id = $2';
      params.push(departmentId);
    }

    sql += ' GROUP BY sr.semester_id, s.department_id, d.name';

    const result = await query(sql, params);

    // Get grade distribution
    const gradeDistResult = await query(`
      SELECT g.grade, COUNT(*) as count
      FROM grades g
      WHERE g.semester_id = $1
      GROUP BY g.grade
      ORDER BY g.grade
    `, [semesterId]);

    return {
      semester_id: semesterId,
      departments: result.rows,
      grade_distribution: gradeDistResult.rows,
      overall: result.rows.length > 0 ? {
        total_students: result.rows.reduce((sum, r) => sum + parseInt(r.total_students), 0),
        passed: result.rows.reduce((sum, r) => sum + parseInt(r.passed), 0),
        failed: result.rows.reduce((sum, r) => sum + parseInt(r.failed), 0),
        pass_percentage: ((result.rows.reduce((sum, r) => sum + parseInt(r.passed), 0) / 
                          result.rows.reduce((sum, r) => sum + parseInt(r.total_students), 0)) * 100).toFixed(2)
      } : null
    };
  }

  // Get toppers list
  async getToppers(semesterId, limit = 10) {
    const result = await query(`
      SELECT sr.*, s.name, s.roll_no, d.name as department_name
      FROM semester_results sr
      JOIN students s ON sr.student_id = s.id
      JOIN departments d ON s.department_id = d.id
      WHERE sr.semester_id = $1 AND sr.status IN ('pass', 'promoted')
      ORDER BY sr.sgpa DESC, sr.cgpa DESC
      LIMIT $2
    `, [semesterId, limit]);

    return {
      semester_id: semesterId,
      toppers: result.rows.map((r, index) => ({
        rank: index + 1,
        student_id: r.student_id,
        name: r.name,
        roll_no: r.roll_no,
        department: r.department_name,
        sgpa: r.sgpa,
        cgpa: r.cgpa
      }))
    };
  }
}

module.exports = new ResultService();
