import api from '../utils/api';

// Get all teachers with filters
export const getTeachers = async (filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.page) params.append('page', filters.page);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.search) params.append('search', filters.search);
  if (filters.department_id) params.append('department_id', filters.department_id);
  
  return await api.get(`/admin/teachers?${params.toString()}`);
};

// Get teacher by ID
export const getTeacherById = async (id) => {
  return await api.get(`/admin/teachers/${id}`);
};

// Add new teacher
export const addTeacher = async (teacherData) => {
  return await api.post('/admin/teachers', teacherData);
};

// Update teacher
export const updateTeacher = async (id, teacherData) => {
  return await api.put(`/admin/teachers/${id}`, teacherData);
};

// Delete teacher
export const deleteTeacher = async (id) => {
  return await api.delete(`/admin/teachers/${id}`);
};

export default {
  getTeachers,
  getTeacherById,
  addTeacher,
  updateTeacher,
  deleteTeacher,
};
