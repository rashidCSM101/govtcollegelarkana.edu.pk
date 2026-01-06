import api from '../utils/api';

// Get all students with filters
export const getStudents = async (filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.page) params.append('page', filters.page);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.search) params.append('search', filters.search);
  if (filters.department_id) params.append('department_id', filters.department_id);
  if (filters.semester) params.append('semester', filters.semester);
  if (filters.batch) params.append('batch', filters.batch);
  if (filters.status) params.append('status', filters.status);
  
  return await api.get(`/admin/students?${params.toString()}`);
};

// Get student by ID
export const getStudentById = async (id) => {
  return await api.get(`/admin/students/${id}`);
};

// Add new student
export const addStudent = async (studentData) => {
  return await api.post('/admin/students', studentData);
};

// Update student
export const updateStudent = async (id, studentData) => {
  return await api.put(`/admin/students/${id}`, studentData);
};

// Delete student
export const deleteStudent = async (id, permanent = false) => {
  return await api.delete(`/admin/students/${id}?permanent=${permanent}`);
};

// Toggle student status
export const toggleStudentStatus = async (id) => {
  return await api.patch(`/admin/students/${id}/toggle-status`);
};

// Get student statistics
export const getStudentStatistics = async () => {
  return await api.get('/admin/students/statistics');
};

// Search students
export const searchStudents = async (query) => {
  return await api.get(`/admin/students/search?q=${query}`);
};

// Bulk upload students
export const bulkUploadStudents = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  return await api.post('/admin/students/bulk-upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export default {
  getStudents,
  getStudentById,
  addStudent,
  updateStudent,
  deleteStudent,
  searchStudents,
  bulkUploadStudents,
};
