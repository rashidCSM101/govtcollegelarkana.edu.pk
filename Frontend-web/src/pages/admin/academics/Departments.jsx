import { useState, useEffect } from 'react';
import { getDepartments, updateDepartment } from '../../../services/department.service';
import { Card, Table, Button, Input, Space, Tag, Breadcrumb, Typography, message } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, HomeOutlined } from '@ant-design/icons';

const { Title } = Typography;

const Departments = () => {
  const [searchText, setSearchText] = useState('');
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      setLoading(true);
      const response = await getDepartments();
      setDepartments(response.data || mockDepartments);
    } catch (error) {
      message.error('Failed to load departments');
      setDepartments(mockDepartments);
    } finally {
      setLoading(false);
    }
  };

  const mockDepartments = [
    { id: 1, name: 'Computer Science', code: 'CS', head: 'Dr. Muhammad Tariq', students: 450, teachers: 15, status: 'active' },
    { id: 2, name: 'Business Administration', code: 'BBA', head: 'Dr. Ayesha Khan', students: 320, teachers: 12, status: 'active' },
    { id: 3, name: 'Engineering', code: 'ENG', head: 'Dr. Hassan Ali', students: 280, teachers: 10, status: 'active' },
  ];

  const columns = [
    { title: 'Code', dataIndex: 'code', key: 'code' },
    { title: 'Department Name', dataIndex: 'name', key: 'name' },
    { title: 'HOD', dataIndex: 'head', key: 'head' },
    { title: 'Students', dataIndex: 'students', key: 'students' },
    { title: 'Teachers', dataIndex: 'teachers', key: 'teachers' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => <Tag color={status === 'active' ? 'success' : 'error'}>{status.toUpperCase()}</Tag>,
    },
    {
      title: 'Action',
      key: 'action',
      render: () => (
        <Space>
          <Button type="link" icon={<EditOutlined />}>Edit</Button>
          <Button type="link" danger icon={<DeleteOutlined />}>Delete</Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ href: '/admin', title: <HomeOutlined /> }, { title: 'Academics' }, { title: 'Departments' }]} />
      <div className="flex items-center justify-between">
        <div>
          <Title level={2} className="!mb-0">Departments</Title>
          <p className="text-[var(--text-secondary)] mt-1">Manage academic departments</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />}>Add Department</Button>
      </div>
      <Card>
        <Input placeholder="Search departments..." prefix={<SearchOutlined />} value={searchText} onChange={(e) => setSearchText(e.target.value)} style={{ width: 300, marginBottom: 16 }} />
        <Table columns={columns} dataSource={departments} rowKey="id" loading={loading} />
      </Card>
    </div>
  );
};

export default Departments;
