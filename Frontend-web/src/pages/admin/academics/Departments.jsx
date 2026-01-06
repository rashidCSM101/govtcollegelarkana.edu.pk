import { useState, useEffect } from 'react';
import { getDepartments, addDepartment, updateDepartment, getDepartmentStats } from '../../../services/department.service';
import { getTeachers } from '../../../services/teacher.service';
import { 
  Card, 
  Table, 
  Button, 
  Input, 
  Space, 
  Tag, 
  Breadcrumb, 
  Typography, 
  message,
  Modal,
  Form,
  Select,
  Statistic,
  Row,
  Col,
  Descriptions
} from 'antd';
import { 
  PlusOutlined, 
  SearchOutlined, 
  EditOutlined, 
  EyeOutlined,
  HomeOutlined,
  UserOutlined,
  TeamOutlined,
  BookOutlined
} from '@ant-design/icons';

const { Title } = Typography;
const { TextArea } = Input;

const Departments = () => {
  const [searchText, setSearchText] = useState('');
  const [departments, setDepartments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [departmentStats, setDepartmentStats] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadDepartments();
    loadTeachers();
  }, []);

  const loadDepartments = async () => {
    try {
      setLoading(true);
      const response = await getDepartments();
      setDepartments(response.data || []);
    } catch (error) {
      message.error('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  const loadTeachers = async () => {
    try {
      const response = await getTeachers({ limit: 1000 });
      setTeachers(response.data || []);
    } catch (error) {
      console.error('Failed to load teachers');
    }
  };

  const handleAdd = () => {
    setEditingDepartment(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (record) => {
    setEditingDepartment(record);
    form.setFieldsValue({
      name: record.name,
      code: record.code,
      description: record.description,
      hod_teacher_id: record.hod_teacher_id,
      is_active: record.is_active !== false
    });
    setIsModalOpen(true);
  };

  const handleViewStats = async (record) => {
    try {
      setLoading(true);
      const response = await getDepartmentStats(record.id);
      setDepartmentStats(response.data);
      setIsStatsModalOpen(true);
    } catch (error) {
      message.error('Failed to load department statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      if (editingDepartment) {
        await updateDepartment(editingDepartment.id, values);
        message.success('Department updated successfully');
      } else {
        await addDepartment(values);
        message.success('Department created successfully');
      }
      setIsModalOpen(false);
      form.resetFields();
      loadDepartments();
    } catch (error) {
      message.error(error.response?.data?.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const filteredDepartments = departments.filter(dept => 
    dept.name?.toLowerCase().includes(searchText.toLowerCase()) ||
    dept.code?.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns = [
    { 
      title: 'Code', 
      dataIndex: 'code', 
      key: 'code',
      width: 100,
      sorter: (a, b) => (a.code || '').localeCompare(b.code || '')
    },
    { 
      title: 'Department Name', 
      dataIndex: 'name', 
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name)
    },
    { 
      title: 'HOD', 
      dataIndex: 'hod_name', 
      key: 'hod_name',
      render: (text) => text || <span className="text-gray-400">Not Assigned</span>
    },
    { 
      title: 'Students', 
      dataIndex: 'student_count', 
      key: 'student_count',
      align: 'center',
      sorter: (a, b) => (a.student_count || 0) - (b.student_count || 0),
      render: (count) => <Tag color="blue">{count || 0}</Tag>
    },
    { 
      title: 'Teachers', 
      dataIndex: 'teacher_count', 
      key: 'teacher_count',
      align: 'center',
      sorter: (a, b) => (a.teacher_count || 0) - (b.teacher_count || 0),
      render: (count) => <Tag color="green">{count || 0}</Tag>
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      align: 'center',
      render: (isActive) => (
        <Tag color={isActive !== false ? 'success' : 'error'}>
          {isActive !== false ? 'ACTIVE' : 'INACTIVE'}
        </Tag>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      align: 'center',
      render: (_, record) => (
        <Space>
          <Button 
            type="link" 
            icon={<EyeOutlined />}
            onClick={() => handleViewStats(record)}
          >
            Stats
          </Button>
          <Button 
            type="link" 
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Edit
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { href: '/admin', title: <HomeOutlined /> },
          { title: 'Academics' },
          { title: 'Departments' },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <Title level={2} className="!mb-0">Departments</Title>
          <p className="text-[var(--text-secondary)] mt-1">Manage academic departments</p>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={handleAdd}
        >
          Add Department
        </Button>
      </div>

      <Card>
        <Input
          placeholder="Search departments..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 300, marginBottom: 16 }}
          allowClear
        />
        <Table
          columns={columns}
          dataSource={filteredDepartments}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} departments`,
          }}
        />
      </Card>

      {/* Add/Edit Department Modal */}
      <Modal
        title={editingDepartment ? 'Edit Department' : 'Add New Department'}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        footer={null}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ is_active: true }}
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="name"
                label="Department Name"
                rules={[{ required: true, message: 'Please enter department name' }]}
              >
                <Input placeholder="e.g., Computer Science" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="code"
                label="Department Code"
                rules={[
                  { required: true, message: 'Please enter department code' },
                  { max: 10, message: 'Code must be maximum 10 characters' }
                ]}
              >
                <Input placeholder="e.g., CS" style={{ textTransform: 'uppercase' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Description"
          >
            <TextArea 
              rows={3} 
              placeholder="Enter department description"
            />
          </Form.Item>

          <Form.Item
            name="hod_teacher_id"
            label="Head of Department"
          >
            <Select 
              placeholder={editingDepartment ? "Select HOD from this department (optional)" : "Select HOD (optional)"}
              allowClear
              showSearch
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
            >
              {teachers
                .filter(teacher => {
                  // When editing, only show teachers from the same department
                  if (editingDepartment) {
                    return teacher.department_id === editingDepartment.id;
                  }
                  // When adding new department, show all teachers (or none)
                  return true;
                })
                .map(teacher => (
                  <Select.Option key={teacher.id} value={teacher.id}>
                    {teacher.name} - {teacher.designation}
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>

          {editingDepartment && (
            <Form.Item
              name="is_active"
              label="Status"
              valuePropName="checked"
            >
              <Select>
                <Select.Option value={true}>Active</Select.Option>
                <Select.Option value={false}>Inactive</Select.Option>
              </Select>
            </Form.Item>
          )}

          <Form.Item className="mb-0">
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                {editingDepartment ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => {
                setIsModalOpen(false);
                form.resetFields();
              }}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Department Statistics Modal */}
      <Modal
        title="Department Statistics"
        open={isStatsModalOpen}
        onCancel={() => setIsStatsModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsStatsModalOpen(false)}>
            Close
          </Button>
        ]}
        width={800}
      >
        {departmentStats && (
          <div className="space-y-6">
            <Descriptions title="Department Information" bordered>
              <Descriptions.Item label="Name" span={2}>
                {departmentStats.name}
              </Descriptions.Item>
              <Descriptions.Item label="Code">
                {departmentStats.code}
              </Descriptions.Item>
              <Descriptions.Item label="HOD" span={3}>
                {departmentStats.hod_name || 'Not Assigned'}
              </Descriptions.Item>
              <Descriptions.Item label="Description" span={3}>
                {departmentStats.description || 'No description'}
              </Descriptions.Item>
            </Descriptions>

            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <Card>
                  <Statistic
                    title="Total Students"
                    value={departmentStats.total_students || 0}
                    prefix={<UserOutlined />}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card>
                  <Statistic
                    title="Total Teachers"
                    value={departmentStats.total_teachers || 0}
                    prefix={<TeamOutlined />}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card>
                  <Statistic
                    title="Total Courses"
                    value={departmentStats.total_courses || 0}
                    prefix={<BookOutlined />}
                    valueStyle={{ color: '#faad14' }}
                  />
                </Card>
              </Col>
            </Row>

            {departmentStats.students_by_semester && (
              <Card title="Students by Semester">
                <Row gutter={[8, 8]}>
                  {departmentStats.students_by_semester.map((item) => (
                    <Col xs={12} sm={6} key={item.semester}>
                      <Statistic
                        title={`Semester ${item.semester}`}
                        value={item.count}
                        valueStyle={{ fontSize: '18px' }}
                      />
                    </Col>
                  ))}
                </Row>
              </Card>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Departments;
