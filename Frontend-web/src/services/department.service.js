import api from '../utils/api';

// Get all departments
export const getDepartments = async () => {
  return await api.get('/admin/departments');
};

// Get department stats
export const getDepartmentStats = async (id) => {
  return await api.get(`/admin/departments/${id}/stats`);
};

// Add new department
export const addDepartment = async (departmentData) => {
  return await api.post('/admin/departments', departmentData);
};

// Update department
export const updateDepartment = async (id, departmentData) => {
  return await api.put(`/admin/departments/${id}`, departmentData);
};

export default {
  getDepartments,
  getDepartmentStats,
  addDepartment,
  updateDepartment,
};
