import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getStudentById, deleteStudent } from '../../../services/student.service';
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
  Modal
} from 'antd';
import {
  HomeOutlined,
  EditOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined
} from '@ant-design/icons';

const { Title } = Typography;

const StudentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudent();
  }, [id]);

  const loadStudent = async () => {
    try {
      setLoading(true);
      const response = await getStudentById(id);
      setStudent(response.data);
    } catch (error) {
      message.error('Failed to load student details');
      navigate('/admin/students');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Modal.confirm({
      title: 'Delete Student',
      content: `Are you sure you want to delete ${student?.name}? This action cannot be undone.`,
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await deleteStudent(id);
          message.success('Student deleted successfully');
          navigate('/admin/students');
        } catch (error) {
          message.error(error.message || 'Failed to delete student');
        }
      },
    });
  };

  const courseColumns = [
    { title: 'Course Code', dataIndex: 'code', key: 'code' },
    { title: 'Course Name', dataIndex: 'name', key: 'name' },
    { title: 'Credits', dataIndex: 'credits', key: 'credits' },
    { title: 'Grade', dataIndex: 'grade', key: 'grade', render: (grade) => <Tag color="blue">{grade}</Tag> },
  ];

  const courses = [
    { key: 1, code: 'CS101', name: 'Programming Fundamentals', credits: 3, grade: 'A' },
    { key: 2, code: 'CS201', name: 'Data Structures', credits: 4, grade: 'A-' },
    { key: 3, code: 'CS301', name: 'Database Systems', credits: 3, grade: 'B+' },
  ];

  const attendanceColumns = [
    { title: 'Month', dataIndex: 'month', key: 'month' },
    { title: 'Present', dataIndex: 'present', key: 'present' },
    { title: 'Absent', dataIndex: 'absent', key: 'absent' },
    { title: 'Percentage', dataIndex: 'percentage', key: 'percentage', render: (p) => `${p}%` },
  ];

  const attendance = [
    { key: 1, month: 'January', present: 22, absent: 2, percentage: 91.6 },
    { key: 2, month: 'February', present: 20, absent: 4, percentage: 83.3 },
    { key: 3, month: 'March', present: 23, absent: 1, percentage: 95.8 },
  ];

  const tabItems = [
    {
      key: '1',
      label: 'Courses',
      children: <Table columns={courseColumns} dataSource={courses} pagination={false} />
    },
    {
      key: '2',
      label: 'Attendance',
      children: <Table columns={attendanceColumns} dataSource={attendance} pagination={false} />
    },
    {
      key: '3',
      label: 'Fee Details',
      children: <div>Fee information will be displayed here</div>
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" tip="Loading student details..." />
      </div>
    );
  }

  if (!student) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { href: '/admin', title: <HomeOutlined /> },
          { href: '/admin/students', title: 'Students' },
          { title: 'Student Details' },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Title level={2} className="!mb-0">Student Details</Title>
          <p className="text-[var(--text-secondary)] mt-1">View complete student information</p>
        </div>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/students')}>
            Back
          </Button>
          <Button icon={<EditOutlined />} onClick={() => navigate(`/admin/students/edit/${id}`)}>
            Edit
          </Button>
          <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
            Delete
          </Button>
        </Space>
      </div>

      {/* Profile Card */}
      <Card>
        <div className="flex items-start gap-6">
          <Avatar 
            size={120} 
            src={student?.profile_photo ? `http://localhost:3000/uploads/${student.profile_photo}` : null}
            icon={<UserOutlined />} 
            className="bg-primary" 
          />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <Title level={3} className="!mb-1">{student.name}</Title>
                <Space size="large" className="text-[var(--text-secondary)]">
                  <span><UserOutlined /> {student.roll_no || 'N/A'}</span>
                  <span><MailOutlined /> {student.email}</span>
                  <span><PhoneOutlined /> {student.phone}</span>
                </Space>
              </div>
              <Tag color={student.status === 'active' ? 'success' : 'error'} className="text-base px-4 py-1">
                {student.status.toUpperCase()}
              </Tag>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-4">
              <div className="bg-[var(--bg-secondary)] p-4 rounded-lg">
                <div className="text-[var(--text-tertiary)] text-sm">Department</div>
                <div className="text-[var(--text-primary)] font-semibold mt-1">{student.department_name || 'N/A'}</div>
              </div>
              <div className="bg-[var(--bg-secondary)] p-4 rounded-lg">
                <div className="text-[var(--text-tertiary)] text-sm">Semester</div>
                <div className="text-[var(--text-primary)] font-semibold mt-1">{student.semester || 'N/A'}</div>
              </div>
              <div className="bg-[var(--bg-secondary)] p-4 rounded-lg">
                <div className="text-[var(--text-tertiary)] text-sm">CGPA</div>
                <div className="text-[var(--text-primary)] font-semibold mt-1">3.45</div>
              </div>
              <div className="bg-[var(--bg-secondary)] p-4 rounded-lg">
                <div className="text-[var(--text-tertiary)] text-sm">Attendance</div>
                <div className="text-[var(--text-primary)] font-semibold mt-1">92%</div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Details Card */}
      <Card title="Personal Information">
        <Descriptions column={2}>
          <Descriptions.Item label="Full Name">{student.name}</Descriptions.Item>
          <Descriptions.Item label="Roll Number">{student.roll_no || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="CNIC">{student.cnic || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="Date of Birth">{student.date_of_birth || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="Gender">{student.gender || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="Blood Group">{student.blood_group || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="Email">{student.email}</Descriptions.Item>
          <Descriptions.Item label="Phone">{student.phone || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="Address" span={2}>{student.address || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="Guardian Name">{student.father_name || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="Guardian Phone">{student.father_phone || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="Admission Date">{student.admission_date || 'N/A'}</Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Academic Info Tabs */}
      <Card>
        <Tabs items={tabItems} />
      </Card>
    </div>
  );
};

export default StudentDetails;
