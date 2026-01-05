import { useState, useEffect } from 'react';
import { getCourses, deleteCourse } from '../../../services/course.service';
import { Card, Table, Button, Input, Space, Tag, Breadcrumb, Typography, message } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, HomeOutlined } from '@ant-design/icons';

const { Title } = Typography;

const Courses = () => {
  const [searchText, setSearchText] = useState('');
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const response = await getCourses();
      setCourses(response.data || mockCourses);
    } catch (error) {
      message.error('Failed to load courses');
      setCourses(mockCourses);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteCourse(id);
      message.success('Course deleted successfully');
      loadCourses();
    } catch (error) {
      message.error('Failed to delete course');
    }
  };

  const mockCourses = [
    { id: 1, code: 'CS101', name: 'Programming Fundamentals', credits: 3, department: 'Computer Science', semester: '1st', status: 'active' },
    { id: 2, code: 'CS201', name: 'Data Structures', credits: 4, department: 'Computer Science', semester: '2nd', status: 'active' },
    { id: 3, code: 'BBA101', name: 'Business Management', credits: 3, department: 'Business', semester: '1st', status: 'active' },
  ];

  const columns = [
    { title: 'Course Code', dataIndex: 'code', key: 'code' },
    { title: 'Course Name', dataIndex: 'name', key: 'name' },
    { title: 'Credits', dataIndex: 'credits', key: 'credits' },
    { title: 'Department', dataIndex: 'department', key: 'department' },
    { title: 'Semester', dataIndex: 'semester', key: 'semester' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => <Tag color={status === 'active' ? 'success' : 'error'}>{status.toUpperCase()}</Tag>,
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EditOutlined />}>Edit</Button>
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)}>Delete</Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ href: '/admin', title: <HomeOutlined /> }, { title: 'Academics' }, { title: 'Courses' }]} />
      <div className="flex items-center justify-between">
        <div>
          <Title level={2} className="!mb-0">Courses</Title>
          <p className="text-[var(--text-secondary)] mt-1">Manage courses</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />}>Add Course</Button>
      </div>
      <Card>
        <Input placeholder="Search courses..." prefix={<SearchOutlined />} value={searchText} onChange={(e) => setSearchText(e.target.value)} style={{ width: 300, marginBottom: 16 }} />
        <Table columns={columns} dataSource={courses} rowKey="id" loading={loading} />
      </Card>
    </div>
  );
};

export default Courses;
