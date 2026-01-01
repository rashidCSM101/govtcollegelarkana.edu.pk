const examService = require('./exam.service');

class ExamController {

  // ==================== EXAM MANAGEMENT ====================

  async createExam(req, res) {
    try {
      const result = await examService.createExam(req.user.id, req.body);
      res.status(201).json(result);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || 'Error creating exam' });
    }
  }

  async getExams(req, res) {
    try {
      const exams = await examService.getExams(req.query);
      res.json({ exams, count: exams.length });
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || 'Error fetching exams' });
    }
  }

  async getExamById(req, res) {
    try {
      const exam = await examService.getExamById(req.params.id);
      res.json(exam);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || 'Error fetching exam' });
    }
  }

  async updateExam(req, res) {
    try {
      const result = await examService.updateExam(req.params.id, req.body);
      res.json(result);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || 'Error updating exam' });
    }
  }

  async deleteExam(req, res) {
    try {
      const result = await examService.deleteExam(req.params.id);
      res.json(result);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || 'Error deleting exam' });
    }
  }

  // ==================== EXAM SCHEDULE ====================

  async createExamSchedule(req, res) {
    try {
      const result = await examService.createExamSchedule(req.body);
      res.status(201).json(result);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || 'Error creating schedule' });
    }
  }

  async getExamSchedules(req, res) {
    try {
      const schedules = await examService.getExamSchedules(req.query);
      res.json({ schedules, count: schedules.length });
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || 'Error fetching schedules' });
    }
  }

  async getStudentExamSchedule(req, res) {
    try {
      const result = await examService.getStudentExamSchedule(req.user.id);
      res.json(result);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || 'Error fetching schedule' });
    }
  }

  async updateExamSchedule(req, res) {
    try {
      const result = await examService.updateExamSchedule(req.params.id, req.body);
      res.json(result);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || 'Error updating schedule' });
    }
  }

  async deleteExamSchedule(req, res) {
    try {
      const result = await examService.deleteExamSchedule(req.params.id);
      res.json(result);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || 'Error deleting schedule' });
    }
  }

  // ==================== HALL TICKETS ====================

  async generateHallTickets(req, res) {
    try {
      const { exam_id } = req.body;
      if (!exam_id) {
        return res.status(400).json({ message: 'exam_id is required' });
      }
      const result = await examService.generateHallTickets(exam_id);
      res.status(201).json(result);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || 'Error generating tickets' });
    }
  }

  async getStudentHallTicket(req, res) {
    try {
      const result = await examService.getStudentHallTicket(req.user.id, req.params.examId);
      res.json(result);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || 'Error fetching hall ticket' });
    }
  }

  // ==================== ONLINE EXAM MANAGEMENT ====================

  async createOnlineExam(req, res) {
    try {
      const result = await examService.createOnlineExam(req.user.id, req.body);
      res.status(201).json(result);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || 'Error creating online exam' });
    }
  }

  async addQuestions(req, res) {
    try {
      const result = await examService.addQuestions(req.params.id, req.body.questions);
      res.status(201).json(result);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || 'Error adding questions' });
    }
  }

  async getOnlineExamQuestions(req, res) {
    try {
      const result = await examService.getOnlineExamQuestions(req.params.id);
      res.json(result);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || 'Error fetching questions' });
    }
  }

  async updateQuestion(req, res) {
    try {
      const result = await examService.updateQuestion(req.params.questionId, req.body);
      res.json(result);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || 'Error updating question' });
    }
  }

  async deleteQuestion(req, res) {
    try {
      const result = await examService.deleteQuestion(req.params.questionId);
      res.json(result);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || 'Error deleting question' });
    }
  }

  async toggleOnlineExam(req, res) {
    try {
      const { is_active } = req.body;
      const result = await examService.toggleOnlineExam(req.params.id, is_active);
      res.json(result);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || 'Error toggling exam' });
    }
  }

  // ==================== STUDENT ONLINE EXAM ====================

  async getStudentOnlineExams(req, res) {
    try {
      const result = await examService.getStudentOnlineExams(req.user.id);
      res.json(result);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || 'Error fetching exams' });
    }
  }

  async getStudentOnlineExamDetails(req, res) {
    try {
      const result = await examService.getStudentOnlineExamDetails(req.user.id, req.params.id);
      res.json(result);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || 'Error fetching exam' });
    }
  }

  async startOnlineExam(req, res) {
    try {
      const result = await examService.startOnlineExam(req.user.id, req.params.id);
      res.json(result);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || 'Error starting exam' });
    }
  }

  async saveAnswer(req, res) {
    try {
      const result = await examService.saveAnswer(req.user.id, req.params.id, req.body);
      res.json(result);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || 'Error saving answer' });
    }
  }

  async submitOnlineExam(req, res) {
    try {
      const result = await examService.submitOnlineExam(req.user.id, req.params.id);
      res.json(result);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || 'Error submitting exam' });
    }
  }

  // ==================== MARKS & EVALUATION ====================

  async enterMarks(req, res) {
    try {
      const result = await examService.enterMarks(req.user.id, req.body);
      res.status(201).json(result);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || 'Error entering marks' });
    }
  }

  async bulkEnterMarks(req, res) {
    try {
      const result = await examService.bulkEnterMarks(req.user.id, req.body);
      res.status(201).json(result);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || 'Error entering marks' });
    }
  }

  async getExamMarks(req, res) {
    try {
      const result = await examService.getExamMarks(req.params.examId);
      res.json(result);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || 'Error fetching marks' });
    }
  }

  async gradeAnswer(req, res) {
    try {
      const result = await examService.gradeAnswer(req.params.answerId, req.body);
      res.json(result);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || 'Error grading answer' });
    }
  }

  async finalizeGrading(req, res) {
    try {
      const result = await examService.finalizeGrading(req.params.attemptId);
      res.json(result);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message || 'Error finalizing grading' });
    }
  }
}

module.exports = new ExamController();
