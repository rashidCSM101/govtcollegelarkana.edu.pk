const { query, getClient } = require('../../config/database');
const { validateRequired } = require('../../utils/validator');

class TimetableService {

  // ==================== TIMETABLE SLOT MANAGEMENT ====================

  // Create a timetable slot
  async createSlot(slotData) {
    const { section_id, day, start_time, end_time, room_no } = slotData;

    // Validate required fields
    const validation = validateRequired(
      { section_id, day, start_time, end_time },
      ['section_id', 'day', 'start_time', 'end_time']
    );
    if (!validation.isValid) {
      throw { status: 400, message: validation.errors.join(', ') };
    }

    // Validate day
    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    if (!validDays.includes(day)) {
      throw { status: 400, message: `Invalid day. Must be one of: ${validDays.join(', ')}` };
    }

    // Validate time format and logic
    if (start_time >= end_time) {
      throw { status: 400, message: 'End time must be after start time' };
    }

    // Check if section exists
    const sectionResult = await query(`
      SELECT cs.id, cs.course_id, cs.teacher_id, cs.semester_id, cs.room_no as default_room,
             c.name as course_name, c.code as course_code,
             t.name as teacher_name
      FROM course_sections cs
      JOIN courses c ON cs.course_id = c.id
      LEFT JOIN teachers t ON cs.teacher_id = t.id
      WHERE cs.id = $1
    `, [section_id]);

    if (sectionResult.rows.length === 0) {
      throw { status: 404, message: 'Course section not found' };
    }

    const section = sectionResult.rows[0];
    const roomToUse = room_no || section.default_room;

    // Check for conflicts before creating
    const conflicts = await this.checkSlotConflicts({
      section_id,
      day,
      start_time,
      end_time,
      room_no: roomToUse,
      teacher_id: section.teacher_id,
      semester_id: section.semester_id
    });

    if (conflicts.hasConflicts) {
      throw { 
        status: 409, 
        message: 'Timetable conflict detected',
        conflicts: conflicts.details
      };
    }

    // Create the slot
    const result = await query(`
      INSERT INTO timetable_slots (section_id, day, start_time, end_time, room_no)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [section_id, day, start_time, end_time, roomToUse]);

    return {
      message: 'Timetable slot created successfully',
      slot: {
        ...result.rows[0],
        course_name: section.course_name,
        course_code: section.course_code,
        teacher_name: section.teacher_name
      }
    };
  }

  // Get all timetable slots with filtering
  async getSlots(filters = {}) {
    const { semester_id, day, section_id, room_no, teacher_id, course_id } = filters;

    let sql = `
      SELECT ts.*, 
             cs.section_name, cs.capacity, cs.course_id, cs.teacher_id, cs.semester_id,
             c.name as course_name, c.code as course_code, c.credit_hours,
             t.name as teacher_name,
             d.name as department_name,
             s.name as semester_name, s.start_date as semester_start, s.end_date as semester_end
      FROM timetable_slots ts
      JOIN course_sections cs ON ts.section_id = cs.id
      JOIN courses c ON cs.course_id = c.id
      LEFT JOIN teachers t ON cs.teacher_id = t.id
      LEFT JOIN departments d ON c.department_id = d.id
      JOIN semesters s ON cs.semester_id = s.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (semester_id) {
      paramCount++;
      sql += ` AND cs.semester_id = $${paramCount}`;
      params.push(semester_id);
    }

    if (day) {
      paramCount++;
      sql += ` AND ts.day = $${paramCount}`;
      params.push(day);
    }

    if (section_id) {
      paramCount++;
      sql += ` AND ts.section_id = $${paramCount}`;
      params.push(section_id);
    }

    if (room_no) {
      paramCount++;
      sql += ` AND ts.room_no = $${paramCount}`;
      params.push(room_no);
    }

    if (teacher_id) {
      paramCount++;
      sql += ` AND cs.teacher_id = $${paramCount}`;
      params.push(teacher_id);
    }

    if (course_id) {
      paramCount++;
      sql += ` AND cs.course_id = $${paramCount}`;
      params.push(course_id);
    }

    sql += ` ORDER BY 
      CASE ts.day 
        WHEN 'Monday' THEN 1
        WHEN 'Tuesday' THEN 2
        WHEN 'Wednesday' THEN 3
        WHEN 'Thursday' THEN 4
        WHEN 'Friday' THEN 5
        WHEN 'Saturday' THEN 6
      END, ts.start_time`;

    const result = await query(sql, params);
    return result.rows;
  }

  // Update timetable slot
  async updateSlot(slotId, updateData) {
    const { day, start_time, end_time, room_no } = updateData;

    // Get existing slot
    const existingSlot = await query(`
      SELECT ts.*, cs.teacher_id, cs.semester_id
      FROM timetable_slots ts
      JOIN course_sections cs ON ts.section_id = cs.id
      WHERE ts.id = $1
    `, [slotId]);

    if (existingSlot.rows.length === 0) {
      throw { status: 404, message: 'Timetable slot not found' };
    }

    const current = existingSlot.rows[0];
    const newDay = day || current.day;
    const newStartTime = start_time || current.start_time;
    const newEndTime = end_time || current.end_time;
    const newRoomNo = room_no || current.room_no;

    // Validate time logic
    if (newStartTime >= newEndTime) {
      throw { status: 400, message: 'End time must be after start time' };
    }

    // Check for conflicts (excluding this slot)
    const conflicts = await this.checkSlotConflicts({
      section_id: current.section_id,
      day: newDay,
      start_time: newStartTime,
      end_time: newEndTime,
      room_no: newRoomNo,
      teacher_id: current.teacher_id,
      semester_id: current.semester_id,
      exclude_slot_id: slotId
    });

    if (conflicts.hasConflicts) {
      throw { 
        status: 409, 
        message: 'Timetable conflict detected',
        conflicts: conflicts.details
      };
    }

    const result = await query(`
      UPDATE timetable_slots
      SET day = $1, start_time = $2, end_time = $3, room_no = $4
      WHERE id = $5
      RETURNING *
    `, [newDay, newStartTime, newEndTime, newRoomNo, slotId]);

    return {
      message: 'Timetable slot updated successfully',
      slot: result.rows[0]
    };
  }

  // Delete timetable slot
  async deleteSlot(slotId) {
    const existingSlot = await query('SELECT * FROM timetable_slots WHERE id = $1', [slotId]);
    if (existingSlot.rows.length === 0) {
      throw { status: 404, message: 'Timetable slot not found' };
    }

    await query('DELETE FROM timetable_slots WHERE id = $1', [slotId]);
    return { message: 'Timetable slot deleted successfully' };
  }

  // ==================== CONFLICT DETECTION ====================

  // Check for slot conflicts
  async checkSlotConflicts(slotData) {
    const { section_id, day, start_time, end_time, room_no, teacher_id, semester_id, exclude_slot_id } = slotData;
    
    const conflicts = {
      hasConflicts: false,
      details: {
        room: [],
        teacher: [],
        section: []
      }
    };

    // Build exclude condition
    const excludeCondition = exclude_slot_id ? ` AND ts.id != ${exclude_slot_id}` : '';

    // 1. Check room conflicts (same room, same day, overlapping time, same semester)
    if (room_no) {
      const roomConflicts = await query(`
        SELECT ts.*, cs.section_name, c.name as course_name, c.code as course_code
        FROM timetable_slots ts
        JOIN course_sections cs ON ts.section_id = cs.id
        JOIN courses c ON cs.course_id = c.id
        WHERE ts.room_no = $1 
          AND ts.day = $2 
          AND cs.semester_id = $3
          AND ts.section_id != $4
          AND (
            (ts.start_time < $6 AND ts.end_time > $5)
          )
          ${excludeCondition}
      `, [room_no, day, semester_id, section_id, start_time, end_time]);

      if (roomConflicts.rows.length > 0) {
        conflicts.hasConflicts = true;
        conflicts.details.room = roomConflicts.rows.map(c => ({
          type: 'Room Conflict',
          room: room_no,
          conflicting_course: `${c.course_code} - ${c.course_name}`,
          section: c.section_name,
          day: c.day,
          time: `${c.start_time} - ${c.end_time}`
        }));
      }
    }

    // 2. Check teacher conflicts (same teacher, same day, overlapping time, same semester)
    if (teacher_id) {
      const teacherConflicts = await query(`
        SELECT ts.*, cs.section_name, c.name as course_name, c.code as course_code, t.name as teacher_name
        FROM timetable_slots ts
        JOIN course_sections cs ON ts.section_id = cs.id
        JOIN courses c ON cs.course_id = c.id
        JOIN teachers t ON cs.teacher_id = t.id
        WHERE cs.teacher_id = $1 
          AND ts.day = $2 
          AND cs.semester_id = $3
          AND ts.section_id != $4
          AND (
            (ts.start_time < $6 AND ts.end_time > $5)
          )
          ${excludeCondition}
      `, [teacher_id, day, semester_id, section_id, start_time, end_time]);

      if (teacherConflicts.rows.length > 0) {
        conflicts.hasConflicts = true;
        conflicts.details.teacher = teacherConflicts.rows.map(c => ({
          type: 'Teacher Conflict',
          teacher: c.teacher_name,
          conflicting_course: `${c.course_code} - ${c.course_name}`,
          section: c.section_name,
          day: c.day,
          time: `${c.start_time} - ${c.end_time}`
        }));
      }
    }

    // 3. Check section conflicts (same section can't have overlapping slots)
    const sectionConflicts = await query(`
      SELECT ts.*, c.name as course_name, c.code as course_code
      FROM timetable_slots ts
      JOIN course_sections cs ON ts.section_id = cs.id
      JOIN courses c ON cs.course_id = c.id
      WHERE ts.section_id = $1 
        AND ts.day = $2
        AND (
          (ts.start_time < $4 AND ts.end_time > $3)
        )
        ${excludeCondition}
    `, [section_id, day, start_time, end_time]);

    if (sectionConflicts.rows.length > 0) {
      conflicts.hasConflicts = true;
      conflicts.details.section = sectionConflicts.rows.map(c => ({
        type: 'Section Conflict',
        course: `${c.course_code} - ${c.course_name}`,
        day: c.day,
        time: `${c.start_time} - ${c.end_time}`
      }));
    }

    return conflicts;
  }

  // Get all conflicts for a semester
  async getAllConflicts(semesterId) {
    const allSlots = await query(`
      SELECT ts.*, cs.section_name, cs.teacher_id, cs.semester_id,
             c.name as course_name, c.code as course_code,
             t.name as teacher_name
      FROM timetable_slots ts
      JOIN course_sections cs ON ts.section_id = cs.id
      JOIN courses c ON cs.course_id = c.id
      LEFT JOIN teachers t ON cs.teacher_id = t.id
      WHERE cs.semester_id = $1
      ORDER BY ts.day, ts.start_time
    `, [semesterId]);

    const conflicts = {
      room: [],
      teacher: [],
      total: 0
    };

    // Check each slot against others
    const slots = allSlots.rows;
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const slot1 = slots[i];
        const slot2 = slots[j];

        // Only check same day
        if (slot1.day !== slot2.day) continue;

        // Check time overlap
        const hasOverlap = slot1.start_time < slot2.end_time && slot1.end_time > slot2.start_time;
        if (!hasOverlap) continue;

        // Room conflict
        if (slot1.room_no && slot1.room_no === slot2.room_no) {
          conflicts.room.push({
            type: 'Room Conflict',
            room: slot1.room_no,
            day: slot1.day,
            slot1: {
              course: `${slot1.course_code} - ${slot1.course_name}`,
              section: slot1.section_name,
              time: `${slot1.start_time} - ${slot1.end_time}`
            },
            slot2: {
              course: `${slot2.course_code} - ${slot2.course_name}`,
              section: slot2.section_name,
              time: `${slot2.start_time} - ${slot2.end_time}`
            }
          });
          conflicts.total++;
        }

        // Teacher conflict
        if (slot1.teacher_id && slot1.teacher_id === slot2.teacher_id) {
          conflicts.teacher.push({
            type: 'Teacher Conflict',
            teacher: slot1.teacher_name,
            day: slot1.day,
            slot1: {
              course: `${slot1.course_code} - ${slot1.course_name}`,
              section: slot1.section_name,
              time: `${slot1.start_time} - ${slot1.end_time}`
            },
            slot2: {
              course: `${slot2.course_code} - ${slot2.course_name}`,
              section: slot2.section_name,
              time: `${slot2.start_time} - ${slot2.end_time}`
            }
          });
          conflicts.total++;
        }
      }
    }

    return conflicts;
  }

  // ==================== VIEW TIMETABLES ====================

  // Get student timetable
  async getStudentTimetable(userId, semesterId) {
    // Get student
    const studentResult = await query('SELECT id FROM students WHERE user_id = $1', [userId]);
    if (studentResult.rows.length === 0) {
      throw { status: 404, message: 'Student profile not found' };
    }
    const studentId = studentResult.rows[0].id;

    // Get active semester if not provided
    let targetSemesterId = semesterId;
    if (!targetSemesterId) {
      const activeSemester = await query(`
        SELECT s.id FROM semesters s
        JOIN sessions ses ON s.session_id = ses.id
        WHERE ses.is_active = TRUE AND s.is_active = TRUE
        ORDER BY s.start_date DESC LIMIT 1
      `);
      if (activeSemester.rows.length > 0) {
        targetSemesterId = activeSemester.rows[0].id;
      }
    }

    if (!targetSemesterId) {
      throw { status: 404, message: 'No active semester found' };
    }

    // Get student's registered courses and their timetable slots
    const timetable = await query(`
      SELECT ts.id, ts.day, ts.start_time, ts.end_time, ts.room_no,
             cs.section_name,
             c.name as course_name, c.code as course_code, c.credit_hours,
             t.name as teacher_name,
             d.name as department_name
      FROM course_registrations cr
      JOIN course_sections cs ON cr.section_id = cs.id
      JOIN courses c ON cs.course_id = c.id
      LEFT JOIN teachers t ON cs.teacher_id = t.id
      LEFT JOIN departments d ON c.department_id = d.id
      LEFT JOIN timetable_slots ts ON ts.section_id = cs.id
      WHERE cr.student_id = $1 
        AND cr.semester_id = $2
        AND cr.status = 'registered'
      ORDER BY 
        CASE ts.day 
          WHEN 'Monday' THEN 1
          WHEN 'Tuesday' THEN 2
          WHEN 'Wednesday' THEN 3
          WHEN 'Thursday' THEN 4
          WHEN 'Friday' THEN 5
          WHEN 'Saturday' THEN 6
        END, ts.start_time
    `, [studentId, targetSemesterId]);

    // Group by day
    const grouped = this.groupByDay(timetable.rows);

    return {
      semester_id: targetSemesterId,
      student_id: studentId,
      timetable: grouped,
      slots: timetable.rows
    };
  }

  // Get teacher timetable
  async getTeacherTimetable(userId, semesterId) {
    // Get teacher
    const teacherResult = await query('SELECT id, name FROM teachers WHERE user_id = $1', [userId]);
    if (teacherResult.rows.length === 0) {
      throw { status: 404, message: 'Teacher profile not found' };
    }
    const teacher = teacherResult.rows[0];

    // Get active semester if not provided
    let targetSemesterId = semesterId;
    if (!targetSemesterId) {
      const activeSemester = await query(`
        SELECT s.id FROM semesters s
        JOIN sessions ses ON s.session_id = ses.id
        WHERE ses.is_active = TRUE AND s.is_active = TRUE
        ORDER BY s.start_date DESC LIMIT 1
      `);
      if (activeSemester.rows.length > 0) {
        targetSemesterId = activeSemester.rows[0].id;
      }
    }

    if (!targetSemesterId) {
      throw { status: 404, message: 'No active semester found' };
    }

    // Get teacher's course sections and their timetable slots
    const timetable = await query(`
      SELECT ts.id, ts.day, ts.start_time, ts.end_time, ts.room_no,
             cs.id as section_id, cs.section_name, cs.capacity,
             c.name as course_name, c.code as course_code, c.credit_hours,
             d.name as department_name,
             (SELECT COUNT(*) FROM course_registrations cr 
              WHERE cr.section_id = cs.id AND cr.status = 'registered') as enrolled_count
      FROM course_sections cs
      JOIN courses c ON cs.course_id = c.id
      LEFT JOIN departments d ON c.department_id = d.id
      LEFT JOIN timetable_slots ts ON ts.section_id = cs.id
      WHERE cs.teacher_id = $1 
        AND cs.semester_id = $2
      ORDER BY 
        CASE ts.day 
          WHEN 'Monday' THEN 1
          WHEN 'Tuesday' THEN 2
          WHEN 'Wednesday' THEN 3
          WHEN 'Thursday' THEN 4
          WHEN 'Friday' THEN 5
          WHEN 'Saturday' THEN 6
        END, ts.start_time
    `, [teacher.id, targetSemesterId]);

    // Group by day
    const grouped = this.groupByDay(timetable.rows);

    return {
      semester_id: targetSemesterId,
      teacher_id: teacher.id,
      teacher_name: teacher.name,
      timetable: grouped,
      slots: timetable.rows
    };
  }

  // Get room timetable
  async getRoomTimetable(roomNo, semesterId) {
    if (!roomNo) {
      throw { status: 400, message: 'Room number is required' };
    }

    // Get active semester if not provided
    let targetSemesterId = semesterId;
    if (!targetSemesterId) {
      const activeSemester = await query(`
        SELECT s.id FROM semesters s
        JOIN sessions ses ON s.session_id = ses.id
        WHERE ses.is_active = TRUE AND s.is_active = TRUE
        ORDER BY s.start_date DESC LIMIT 1
      `);
      if (activeSemester.rows.length > 0) {
        targetSemesterId = activeSemester.rows[0].id;
      }
    }

    if (!targetSemesterId) {
      throw { status: 404, message: 'No active semester found' };
    }

    // Get all slots for this room
    const timetable = await query(`
      SELECT ts.id, ts.day, ts.start_time, ts.end_time, ts.room_no,
             cs.section_name,
             c.name as course_name, c.code as course_code, c.credit_hours,
             t.name as teacher_name,
             d.name as department_name
      FROM timetable_slots ts
      JOIN course_sections cs ON ts.section_id = cs.id
      JOIN courses c ON cs.course_id = c.id
      LEFT JOIN teachers t ON cs.teacher_id = t.id
      LEFT JOIN departments d ON c.department_id = d.id
      WHERE ts.room_no = $1 
        AND cs.semester_id = $2
      ORDER BY 
        CASE ts.day 
          WHEN 'Monday' THEN 1
          WHEN 'Tuesday' THEN 2
          WHEN 'Wednesday' THEN 3
          WHEN 'Thursday' THEN 4
          WHEN 'Friday' THEN 5
          WHEN 'Saturday' THEN 6
        END, ts.start_time
    `, [roomNo, targetSemesterId]);

    // Group by day
    const grouped = this.groupByDay(timetable.rows);

    return {
      semester_id: targetSemesterId,
      room_no: roomNo,
      timetable: grouped,
      slots: timetable.rows
    };
  }

  // Get all rooms
  async getAllRooms(semesterId) {
    let sql = `
      SELECT DISTINCT room_no 
      FROM timetable_slots ts
      JOIN course_sections cs ON ts.section_id = cs.id
      WHERE ts.room_no IS NOT NULL
    `;
    const params = [];

    if (semesterId) {
      sql += ` AND cs.semester_id = $1`;
      params.push(semesterId);
    }

    sql += ` ORDER BY room_no`;

    const result = await query(sql, params);
    return result.rows.map(r => r.room_no);
  }

  // ==================== PDF GENERATION ====================

  // Generate timetable PDF data
  async generateTimetablePDF(type, id, semesterId) {
    let data;
    let title;
    let subtitle;

    switch (type) {
      case 'student':
        data = await this.getStudentTimetable(id, semesterId);
        const student = await query(`
          SELECT s.name, s.roll_no, d.name as department
          FROM students s
          LEFT JOIN departments d ON s.department_id = d.id
          WHERE s.user_id = $1
        `, [id]);
        title = 'Student Timetable';
        subtitle = student.rows[0] ? 
          `${student.rows[0].name} (${student.rows[0].roll_no}) - ${student.rows[0].department || 'N/A'}` : 
          'Unknown Student';
        break;

      case 'teacher':
        data = await this.getTeacherTimetable(id, semesterId);
        const teacher = await query(`
          SELECT t.name, t.designation, d.name as department
          FROM teachers t
          LEFT JOIN departments d ON t.department_id = d.id
          WHERE t.user_id = $1
        `, [id]);
        title = 'Teacher Timetable';
        subtitle = teacher.rows[0] ? 
          `${teacher.rows[0].name} (${teacher.rows[0].designation || 'Faculty'}) - ${teacher.rows[0].department || 'N/A'}` : 
          'Unknown Teacher';
        break;

      case 'room':
        data = await this.getRoomTimetable(id, semesterId);
        title = 'Room Timetable';
        subtitle = `Room: ${id}`;
        break;

      case 'master':
        data = await this.getMasterTimetable(semesterId);
        title = 'Master Timetable';
        const semester = await query('SELECT name FROM semesters WHERE id = $1', [semesterId]);
        subtitle = semester.rows[0] ? semester.rows[0].name : 'All Classes';
        break;

      default:
        throw { status: 400, message: 'Invalid timetable type' };
    }

    // Get semester info
    const semesterInfo = await query(`
      SELECT s.name as semester, ses.name as session
      FROM semesters s
      JOIN sessions ses ON s.session_id = ses.id
      WHERE s.id = $1
    `, [data.semester_id || semesterId]);

    return {
      title,
      subtitle,
      session: semesterInfo.rows[0]?.session || 'N/A',
      semester: semesterInfo.rows[0]?.semester || 'N/A',
      generated_at: new Date().toISOString(),
      college: 'Government College Larkana',
      timetable: data.timetable,
      slots: data.slots
    };
  }

  // Get master timetable (all sections)
  async getMasterTimetable(semesterId) {
    if (!semesterId) {
      const activeSemester = await query(`
        SELECT s.id FROM semesters s
        JOIN sessions ses ON s.session_id = ses.id
        WHERE ses.is_active = TRUE AND s.is_active = TRUE
        ORDER BY s.start_date DESC LIMIT 1
      `);
      if (activeSemester.rows.length > 0) {
        semesterId = activeSemester.rows[0].id;
      } else {
        throw { status: 404, message: 'No active semester found' };
      }
    }

    const timetable = await query(`
      SELECT ts.id, ts.day, ts.start_time, ts.end_time, ts.room_no,
             cs.section_name,
             c.name as course_name, c.code as course_code, c.credit_hours,
             t.name as teacher_name,
             d.name as department_name
      FROM timetable_slots ts
      JOIN course_sections cs ON ts.section_id = cs.id
      JOIN courses c ON cs.course_id = c.id
      LEFT JOIN teachers t ON cs.teacher_id = t.id
      LEFT JOIN departments d ON c.department_id = d.id
      WHERE cs.semester_id = $1
      ORDER BY 
        CASE ts.day 
          WHEN 'Monday' THEN 1
          WHEN 'Tuesday' THEN 2
          WHEN 'Wednesday' THEN 3
          WHEN 'Thursday' THEN 4
          WHEN 'Friday' THEN 5
          WHEN 'Saturday' THEN 6
        END, ts.start_time, ts.room_no
    `, [semesterId]);

    const grouped = this.groupByDay(timetable.rows);

    return {
      semester_id: semesterId,
      timetable: grouped,
      slots: timetable.rows
    };
  }

  // ==================== BULK OPERATIONS ====================

  // Bulk create slots
  async bulkCreateSlots(slots) {
    if (!Array.isArray(slots) || slots.length === 0) {
      throw { status: 400, message: 'Slots array is required' };
    }

    const client = await getClient();
    const results = { success: [], failed: [] };

    try {
      await client.query('BEGIN');

      for (const slot of slots) {
        try {
          const created = await this.createSlot(slot);
          results.success.push(created.slot);
        } catch (err) {
          results.failed.push({
            slot,
            error: err.message || 'Unknown error'
          });
        }
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return {
      message: `Created ${results.success.length} slots, ${results.failed.length} failed`,
      success: results.success,
      failed: results.failed
    };
  }

  // Delete all slots for a section
  async clearSectionSlots(sectionId) {
    const result = await query('DELETE FROM timetable_slots WHERE section_id = $1 RETURNING id', [sectionId]);
    return {
      message: `Deleted ${result.rowCount} timetable slots`,
      deleted_count: result.rowCount
    };
  }

  // ==================== HELPER FUNCTIONS ====================

  // Group slots by day
  groupByDay(slots) {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const grouped = {};

    days.forEach(day => {
      grouped[day] = slots.filter(s => s.day === day);
    });

    return grouped;
  }
}

module.exports = new TimetableService();
