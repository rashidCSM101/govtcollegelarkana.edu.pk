import api from '../utils/api';

// Get all courses
export const getCourses = async (filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.department_id) params.append('department_id', filters.department_id);
  if (filters.semester) params.append('semester', filters.semester);
  
  return await api.get(`/admin/courses?${params.toString()}`);
};

// Get course by ID
export const getCourseDetails = async (id) => {
  return await api.get(`/admin/courses/${id}`);
};

// Add new course
export const createCourse = async (courseData) => {
  return await api.post('/admin/courses', courseData);
};

// Update course
export const updateCourse = async (id, courseData) => {
  return await api.put(`/admin/courses/${id}`, courseData);
};

// Delete course
export const deleteCourse = async (id) => {
  return await api.delete(`/admin/courses/${id}`);
};

export default {
  getCourses,
  getCourseDetails,
  createCourse,
  updateCourse,
  deleteCourse,
};
