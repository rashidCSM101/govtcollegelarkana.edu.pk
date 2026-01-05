import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getTeachers, deleteTeacher } from '../../../services/teacher.service';
import { 
  Card, 
  Table, 
  Button, 
  Input, 
  Tag, 
  Dropdown,
  Breadcrumb,
  Typography,
  message
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  DownloadOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  MoreOutlined,
  HomeOutlined
} from '@ant-design/icons';

const { Title } = Typography;

const AllTeachers = () => {
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState([]);

  useEffect(() => {
    loadTeachers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  const loadTeachers = async () => {
    try {
      setLoading(true);
      const response = await getTeachers({ search: searchText });
      setTeachers(response.data || mockTeachers);
    } catch (error) {
      message.error('Failed to load teachers');
      setTeachers(mockTeachers);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteTeacher(id);
      message.success('Teacher deleted successfully');
      loadTeachers();
    } catch (error) {
      message.error('Failed to delete teacher');
    }
  };

  const mockTeachers = [
    {
      id: 1,
      employeeId: 'TCH001',
      name: 'Dr. Muhammad Tariq',
      email: 'tariq@gcl.edu.pk',
      phone: '03001234567',
      department: 'Computer Science',
      designation: 'Professor',
      status: 'active',
    },
    {
      id: 2,
      employeeId: 'TCH002',
      name: 'Ms. Ayesha Siddiqui',
      email: 'ayesha@gcl.edu.pk',
      phone: '03001234568',
      department: 'Business',
      designation: 'Assistant Professor',
      status: 'active',
    },
  ];

  const columns = [
    {
      title: 'Employee ID',
      dataIndex: 'employeeId',
      key: 'employeeId',
      sorter: (a, b) => a.employeeId.localeCompare(b.employeeId),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
            {text.charAt(0)}
          </div>
          <span>{text}</span>
        </div>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
    },
    {
      title: 'Designation',
      dataIndex: 'designation',
      key: 'designation',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'active' ? 'success' : 'error'}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Dropdown
          menu={{
            items: [
              {
                key: 'view',
                icon: <EyeOutlined />,
                label: <Link to={`/admin/teachers/${record.id}`}>View Details</Link>,
              },
              {
                key: 'edit',
                icon: <EditOutlined />,
                label: <Link to={`/admin/teachers/edit/${record.id}`}>Edit</Link>,
              },
              {
                type: 'divider',
              },
              {
                key: 'delete',
                icon: <DeleteOutlined />,
                label: 'Delete',
                danger: true,
              },
            ],
          }}
        >
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { href: '/admin', title: <HomeOutlined /> },
          { title: 'Teachers' },
          { title: 'All Teachers' },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <Title level={2} className="!mb-0">All Teachers</Title>
          <p className="text-[var(--text-secondary)] mt-1">Manage teaching staff</p>
        </div>
        <Link to="/admin/teachers/add">
          <Button type="primary" icon={<PlusOutlined />}>
            Add Teacher
          </Button>
        </Link>
      </div>

      <Card>
        <div className="flex gap-4">
          <Input
            placeholder="Search teachers..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
          />
          <Button icon={<FilterOutlined />}>Filters</Button>
          <Button icon={<DownloadOutlined />}>Export</Button>
        </div>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={teachers}
          loading={loading}
          rowKey="id"
          pagination={{
            total: teachers.length,
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} teachers`,
          }}
        />
      </Card>
    </div>
  );
};

export default AllTeachers;
