import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus, FiEdit2, FiEye, FiTrash2, FiSearch, FiDownload, FiUpload } from 'react-icons/fi';
import axiosInstance from '../../../api/axios';

const StudentList = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterSemester, setFilterSemester] = useState('');

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await axiosInstance.get('/admin/students');
      setStudents(response.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching students:', error);
      // Mock data
      setStudents([
        { id: 1, roll_no: 'GCL-2024-001', name: 'Ahmed Ali Khan', department: 'Computer Science', semester: 1, phone: '0300-1234567', status: 'active' },
        { id: 2, roll_no: 'GCL-2024-002', name: 'Sara Fatima', department: 'Mathematics', semester: 2, phone: '0301-2345678', status: 'active' },
        { id: 3, roll_no: 'GCL-2024-003', name: 'Hassan Raza', department: 'Physics', semester: 1, phone: '0302-3456789', status: 'active' },
        { id: 4, roll_no: 'GCL-2024-004', name: 'Ayesha Noor', department: 'Chemistry', semester: 3, phone: '0303-4567890', status: 'inactive' },
      ]);
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        await axiosInstance.delete(`/admin/students/${id}`);
        fetchStudents();
      } catch (error) {
        console.error('Error deleting student:', error);
      }
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.roll_no.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = !filterDepartment || student.department === filterDepartment;
    const matchesSemester = !filterSemester || student.semester.toString() === filterSemester;
    return matchesSearch && matchesDepartment && matchesSemester;
  });

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Student Management
          </h1>
          <p className="mt-2" style={{ color: 'var(--text-secondary)' }}>
            Manage all students in the system
          </p>
        </div>
        <div className="flex space-x-3 mt-4 md:mt-0">
          <Link
            to="/admin/students/add"
            className="flex items-center space-x-2 px-4 py-2 rounded-lg text-white font-medium"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <FiPlus />
            <span>Add Student</span>
          </Link>
          <button
            className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-medium)'
            }}
          >
            <FiUpload />
            <span>Bulk Upload</span>
          </button>
          <button
            className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-medium)'
            }}
          >
            <FiDownload />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div
        className="rounded-lg p-6 mb-6 shadow-md"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-light)'
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <FiSearch
                className="absolute left-3 top-1/2 transform -translate-y-1/2"
                style={{ color: 'var(--text-light)' }}
              />
              <input
                type="text"
                placeholder="Search by name or roll number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  borderColor: 'var(--border-light)',
                  border: '1px solid'
                }}
              />
            </div>
          </div>

          {/* Department Filter */}
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="px-4 py-2 rounded-lg focus:outline-none focus:ring-2"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              borderColor: 'var(--border-light)',
              border: '1px solid'
            }}
          >
            <option value="">All Departments</option>
            <option value="Computer Science">Computer Science</option>
            <option value="Mathematics">Mathematics</option>
            <option value="Physics">Physics</option>
            <option value="Chemistry">Chemistry</option>
          </select>

          {/* Semester Filter */}
          <select
            value={filterSemester}
            onChange={(e) => setFilterSemester(e.target.value)}
            className="px-4 py-2 rounded-lg focus:outline-none focus:ring-2"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              borderColor: 'var(--border-light)',
              border: '1px solid'
            }}
          >
            <option value="">All Semesters</option>
            <option value="1">Semester 1</option>
            <option value="2">Semester 2</option>
            <option value="3">Semester 3</option>
            <option value="4">Semester 4</option>
          </select>
        </div>
      </div>

      {/* Students Table */}
      <div
        className="rounded-lg shadow-md overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-light)'
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  Roll No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  Semester
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ divideColor: 'var(--border-light)' }}>
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4 whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
                    {student.roll_no}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
                    {student.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                    {student.department}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                    {student.semester}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                    {student.phone}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        student.status === 'active'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}
                    >
                      {student.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-3">
                      <Link
                        to={`/admin/students/${student.id}`}
                        className="hover:opacity-75"
                        style={{ color: 'var(--color-primary)' }}
                        title="View Details"
                      >
                        <FiEye size={18} />
                      </Link>
                      <Link
                        to={`/admin/students/${student.id}/edit`}
                        className="hover:opacity-75"
                        style={{ color: 'var(--color-warning)' }}
                        title="Edit"
                      >
                        <FiEdit2 size={18} />
                      </Link>
                      <button
                        onClick={() => handleDelete(student.id)}
                        className="hover:opacity-75"
                        style={{ color: 'var(--color-error)' }}
                        title="Delete"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div
          className="px-6 py-4 flex items-center justify-between border-t"
          style={{ borderColor: 'var(--border-light)' }}
        >
          <div style={{ color: 'var(--text-secondary)' }}>
            Showing {filteredStudents.length} of {students.length} students
          </div>
          <div className="flex space-x-2">
            <button
              className="px-4 py-2 rounded-lg"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-medium)'
              }}
            >
              Previous
            </button>
            <button
              className="px-4 py-2 rounded-lg text-white"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              1
            </button>
            <button
              className="px-4 py-2 rounded-lg"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-medium)'
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentList;
