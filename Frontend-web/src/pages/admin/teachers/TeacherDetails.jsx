import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTeacherById, deleteTeacher } from '../../../services/teacher.service';
import {
  Card,
  Descriptions,
  Button,
  Space,
  Tag,
  Avatar,
  Tabs,
  Table,
  Breadcrumb,
  Typography,
  Spin,
  message,
  Modal,
  Row,
  Col
} from 'antd';
import {
  HomeOutlined,
  EditOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  IdcardOutlined
} from '@ant-design/icons';

const { Title } = Typography;

const TeacherDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeacher();
  }, [id]);

  const loadTeacher = async () => {
    try {
      setLoading(true);
      const response = await getTeacherById(id);
      setTeacher(response.data);
    } catch (error) {
      message.error('Failed to load teacher details');
      navigate('/admin/teachers');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Modal.confirm({
      title: 'Delete Teacher',
      content: `Are you sure you want to delete ${teacher?.name}? This action cannot be undone.`,
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await deleteTeacher(id);
          message.success('Teacher deleted successfully');
          navigate('/admin/teachers');
        } catch (error) {
          message.error(error.message || 'Failed to delete teacher');
        }
      },
    });
  };

  const courseColumns = [
    { 
      title: 'Course Code', 
      dataIndex: 'course_code', 
      key: 'course_code' 
    },
    { 
      title: 'Course Name', 
      dataIndex: 'course_name', 
      key: 'course_name' 
    },
    { 
      title: 'Section', 
      dataIndex: 'section', 
      key: 'section',
      render: (section) => <Tag color="blue">{section}</Tag>
    },
    { 
      title: 'Students', 
      dataIndex: 'students', 
      key: 'students',
      align: 'center'
    },
  ];

  const tabItems = [
    {
      key: '1',
      label: 'Personal Information',
      children: (
        <Descriptions bordered column={2}>
          <Descriptions.Item label="Full Name">{teacher?.name}</Descriptions.Item>
          <Descriptions.Item label="CNIC">{teacher?.cnic || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="Email">{teacher?.email}</Descriptions.Item>
          <Descriptions.Item label="Phone">{teacher?.phone}</Descriptions.Item>
          <Descriptions.Item label="Gender">{teacher?.gender || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="Address" span={2}>{teacher?.address || 'N/A'}</Descriptions.Item>
        </Descriptions>
      ),
    },
    {
      key: '2',
      label: 'Professional Information',
      children: (
        <Descriptions bordered column={2}>
          <Descriptions.Item label="Designation">{teacher?.designation}</Descriptions.Item>
          <Descriptions.Item label="Department">{teacher?.department_name || teacher?.department}</Descriptions.Item>
          <Descriptions.Item label="Qualification">{teacher?.qualification || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="Specialization">{teacher?.specialization || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="Experience">{teacher?.experience || 0} years</Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={teacher?.status === 'active' ? 'success' : 'error'}>
              {teacher?.status?.toUpperCase()}
            </Tag>
          </Descriptions.Item>
        </Descriptions>
      ),
    },
    {
      key: '3',
      label: 'Courses',
      children: (
        <Table
          columns={courseColumns}
          dataSource={teacher?.courses || []}
          rowKey="id"
          pagination={false}
        />
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { href: '/admin', title: <HomeOutlined /> },
          { href: '/admin/teachers', title: 'Teachers' },
          { title: 'Teacher Details' },
        ]}
      />

      <div className="flex items-center justify-between">
        <Title level={2} className="!mb-0">Teacher Details</Title>
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/admin/teachers')}
          >
            Back
          </Button>
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => navigate(`/admin/teachers/edit/${id}`)}
          >
            Edit
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card>
            <div className="text-center">
              <Avatar 
                size={120} 
                icon={<UserOutlined />} 
                src={teacher?.photo ? `http://localhost:3000/uploads/${teacher.photo}` : null}
                className="mb-4 mx-auto" 
              />
              <Title level={4} className="!mb-2">{teacher?.name}</Title>
              <p className="text-gray-500 mb-1">{teacher?.designation}</p>
              <p className="text-gray-500 mb-4">{teacher?.department_name || teacher?.department}</p>
              <Tag color={teacher?.status === 'active' ? 'success' : 'error'} className="mb-4">
                {teacher?.status?.toUpperCase()}
              </Tag>
            </div>

            <div className="space-y-3 mt-6">
              <div className="flex items-center gap-2">
                <MailOutlined className="text-gray-400" />
                <span className="text-sm">{teacher?.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <PhoneOutlined className="text-gray-400" />
                <span className="text-sm">{teacher?.phone}</span>
              </div>
              {teacher?.cnic && (
                <div className="flex items-center gap-2">
                  <IdcardOutlined className="text-gray-400" />
                  <span className="text-sm">{teacher?.cnic}</span>
                </div>
              )}
            </div>
          </Card>
        </Col>

        <Col xs={24} md={16}>
          <Card>
            <Tabs items={tabItems} />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default TeacherDetails;
