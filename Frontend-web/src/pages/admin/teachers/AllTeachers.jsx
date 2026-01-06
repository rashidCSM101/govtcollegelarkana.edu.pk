import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getTeachers, deleteTeacher, toggleTeacherStatus, getTeacherStatistics } from '../../../services/teacher.service';
import { getDepartments } from '../../../services/department.service';
import { 
  Card, 
  Table, 
  Button, 
  Input,
  Select,
  Switch,
  Row,
  Col,
  Statistic,
  Space,
  Dropdown,
  Breadcrumb,
  Typography,
  message
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  DownloadOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  MoreOutlined,
  HomeOutlined,
  TeamOutlined,
  UserOutlined,
  ManOutlined,
  WomanOutlined
} from '@ant-design/icons';

const { Title } = Typography;

const AllTeachers = () => {
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [showStatistics, setShowStatistics] = useState(false);
  const [filters, setFilters] = useState({
    department_id: null,
    designation: null,
    status: null
  });

  useEffect(() => {
    loadDepartments();
    loadStatistics();
  }, []);

  useEffect(() => {
    loadTeachers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText, filters]);

  const loadDepartments = async () => {
    try {
      const response = await getDepartments();
      setDepartments(response.data || []);
    } catch (error) {
      console.error('Failed to load departments');
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await getTeacherStatistics();
      setStatistics(response.data);
    } catch (error) {
      console.error('Failed to load statistics');
    }
  };

  const loadTeachers = async () => {
    try {
      setLoading(true);
      const response = await getTeachers({ 
        search: searchText,
        ...filters 
      });
      setTeachers(response.data || mockTeachers);
    } catch (error) {
      message.error('Failed to load teachers');
      setTeachers(mockTeachers);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await toggleTeacherStatus(id);
      message.success(`Teacher ${currentStatus === 'active' ? 'deactivated' : 'activated'} successfully`);
      loadTeachers();
      loadStatistics();
    } catch (error) {
      message.error('Failed to update teacher status');
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
      render: (status, row) => (
        <Switch
          checked={status === 'active'}
          onChange={() => handleToggleStatus(row.id, status)}
          checkedChildren="Active"
          unCheckedChildren="Inactive"
        />
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

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Title level={2} className="!mb-0">All Teachers</Title>
          <p className="text-[var(--text-secondary)] mt-1">Manage teaching staff</p>
        </div>
        <Space>
          <Button 
            icon={<TeamOutlined />} 
            onClick={() => setShowStatistics(!showStatistics)}
          >
            {showStatistics ? 'Hide' : 'Show'} Statistics
          </Button>
          <Link to="/admin/teachers/add">
            <Button type="primary" icon={<PlusOutlined />}>
              Add Teacher
            </Button>
          </Link>
        </Space>
      </div>

      {/* Statistics Cards */}
      {showStatistics && statistics && (
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Total Teachers"
                value={statistics.overview?.total_teachers || 0}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Active Teachers"
                value={statistics.overview?.active_teachers || 0}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Male Teachers"
                value={statistics.overview?.male_teachers || 0}
                prefix={<ManOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Female Teachers"
                value={statistics.overview?.female_teachers || 0}
                prefix={<WomanOutlined />}
                valueStyle={{ color: '#eb2f96' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Filters Card */}
      <Card>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={12} lg={6}>
            <Input
              placeholder="Search teachers..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} lg={5}>
            <Select
              placeholder="Department"
              value={filters.department_id}
              onChange={(value) => setFilters({ ...filters, department_id: value })}
              style={{ width: '100%' }}
              allowClear
            >
              {departments.map(dept => (
                <Select.Option key={dept.id} value={dept.id}>
                  {dept.name}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Select
              placeholder="Designation"
              value={filters.designation}
              onChange={(value) => setFilters({ ...filters, designation: value })}
              style={{ width: '100%' }}
              allowClear
            >
              <Select.Option value="Professor">Professor</Select.Option>
              <Select.Option value="Associate Professor">Associate Professor</Select.Option>
              <Select.Option value="Assistant Professor">Assistant Professor</Select.Option>
              <Select.Option value="Lecturer">Lecturer</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Select
              placeholder="Status"
              value={filters.status}
              onChange={(value) => setFilters({ ...filters, status: value })}
              style={{ width: '100%' }}
              allowClear
            >
              <Select.Option value="active">Active</Select.Option>
              <Select.Option value="inactive">Inactive</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} lg={5} className="flex justify-end">
            <Button 
              icon={<DownloadOutlined />}
              block
            >
              Export
            </Button>
          </Col>
        </Row>
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
