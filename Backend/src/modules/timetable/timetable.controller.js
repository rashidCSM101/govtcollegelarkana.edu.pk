const timetableService = require('./timetable.service');

class TimetableController {

  // ==================== SLOT MANAGEMENT ====================

  // Create timetable slot
  async createSlot(req, res) {
    try {
      const result = await timetableService.createSlot(req.body);
      res.status(201).json(result);
    } catch (error) {
      res.status(error.status || 500).json({ 
        message: error.message || 'Error creating timetable slot',
        conflicts: error.conflicts || null
      });
    }
  }

  // Get all slots
  async getSlots(req, res) {
    try {
      const slots = await timetableService.getSlots(req.query);
      res.json({ slots, count: slots.length });
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || 'Error fetching slots' });
    }
  }

  // Update slot
  async updateSlot(req, res) {
    try {
      const result = await timetableService.updateSlot(req.params.id, req.body);
      res.json(result);
    } catch (error) {
      res.status(error.status || 500).json({ 
        message: error.message || 'Error updating slot',
        conflicts: error.conflicts || null
      });
    }
  }

  // Delete slot
  async deleteSlot(req, res) {
    try {
      const result = await timetableService.deleteSlot(req.params.id);
      res.json(result);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || 'Error deleting slot' });
    }
  }

  // Bulk create slots
  async bulkCreateSlots(req, res) {
    try {
      const result = await timetableService.bulkCreateSlots(req.body.slots);
      res.status(201).json(result);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || 'Error creating slots' });
    }
  }

  // Clear section slots
  async clearSectionSlots(req, res) {
    try {
      const result = await timetableService.clearSectionSlots(req.params.sectionId);
      res.json(result);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || 'Error clearing slots' });
    }
  }

  // ==================== CONFLICT DETECTION ====================

  // Check slot conflicts
  async checkConflicts(req, res) {
    try {
      const conflicts = await timetableService.checkSlotConflicts(req.body);
      res.json(conflicts);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || 'Error checking conflicts' });
    }
  }

  // Get all conflicts for semester
  async getAllConflicts(req, res) {
    try {
      const { semester_id } = req.query;
      if (!semester_id) {
        return res.status(400).json({ message: 'semester_id is required' });
      }
      const conflicts = await timetableService.getAllConflicts(semester_id);
      res.json(conflicts);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || 'Error fetching conflicts' });
    }
  }

  // ==================== VIEW TIMETABLES ====================

  // Get student timetable
  async getStudentTimetable(req, res) {
    try {
      const { semester_id } = req.query;
      const result = await timetableService.getStudentTimetable(req.user.id, semester_id);
      res.json(result);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || 'Error fetching timetable' });
    }
  }

  // Get teacher timetable
  async getTeacherTimetable(req, res) {
    try {
      const { semester_id } = req.query;
      const result = await timetableService.getTeacherTimetable(req.user.id, semester_id);
      res.json(result);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || 'Error fetching timetable' });
    }
  }

  // Get room timetable
  async getRoomTimetable(req, res) {
    try {
      const { room_no, semester_id } = req.query;
      const result = await timetableService.getRoomTimetable(room_no, semester_id);
      res.json(result);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || 'Error fetching room timetable' });
    }
  }

  // Get all rooms
  async getAllRooms(req, res) {
    try {
      const { semester_id } = req.query;
      const rooms = await timetableService.getAllRooms(semester_id);
      res.json({ rooms, count: rooms.length });
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || 'Error fetching rooms' });
    }
  }

  // Get master timetable
  async getMasterTimetable(req, res) {
    try {
      const { semester_id } = req.query;
      const result = await timetableService.getMasterTimetable(semester_id);
      res.json(result);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || 'Error fetching master timetable' });
    }
  }

  // ==================== PDF EXPORT ====================

  // Export timetable as PDF data
  async exportPDF(req, res) {
    try {
      const { type, id, semester_id } = req.query;
      
      if (!type) {
        return res.status(400).json({ message: 'Timetable type is required (student/teacher/room/master)' });
      }

      let targetId = id;
      
      // For student/teacher, use logged-in user if no ID provided
      if (type === 'student' && !targetId) {
        targetId = req.user.id;
      } else if (type === 'teacher' && !targetId) {
        targetId = req.user.id;
      } else if (type === 'room' && !targetId) {
        return res.status(400).json({ message: 'Room number (id) is required for room timetable' });
      }

      const pdfData = await timetableService.generateTimetablePDF(type, targetId, semester_id);
      
      // Return JSON data for PDF generation on frontend
      // Frontend can use libraries like jsPDF or pdfmake to generate actual PDF
      res.json({
        message: 'PDF data generated successfully',
        data: pdfData
      });
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || 'Error generating PDF' });
    }
  }
}

module.exports = new TimetableController();
