import { Row, Col, Typography, Breadcrumb, ConfigProvider, theme, Card, Progress, Table, Tag, Avatar, Calendar, Badge } from 'antd';
import { 
  BookOutlined, 
  ClockCircleOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  HomeOutlined,
  CalendarOutlined,
  TrophyOutlined,
  ScheduleOutlined
} from '@ant-design/icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { StatCard, UpcomingEvents } from '../../components/dashboard';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

const { Title, Text } = Typography;

// Mock Data
const attendanceData = [
  { month: 'Jul', attendance: 92 },
  { month: 'Aug', attendance: 88 },
  { month: 'Sep', attendance: 95 },
  { month: 'Oct', attendance: 90 },
  { month: 'Nov', attendance: 93 },
  { month: 'Dec', attendance: 91 },
];

const coursesData = [
  { key: '1', course: 'Data Structures', code: 'CS-201', teacher: 'Dr. Ahmed', progress: 75, grade: 'A' },
  { key: '2', course: 'Database Systems', code: 'CS-301', teacher: 'Prof. Ali', progress: 60, grade: 'B+' },
  { key: '3', course: 'Operating Systems', code: 'CS-302', teacher: 'Dr. Fatima', progress: 45, grade: 'A-' },
  { key: '4', course: 'Computer Networks', code: 'CS-303', teacher: 'Prof. Hassan', progress: 80, grade: 'A' },
];

const assignmentsData = [
  { key: '1', title: 'DS Lab 5', course: 'Data Structures', dueDate: '2026-01-10', status: 'pending' },
  { key: '2', title: 'SQL Queries', course: 'Database Systems', dueDate: '2026-01-08', status: 'submitted' },
  { key: '3', title: 'Process Scheduling', course: 'Operating Systems', dueDate: '2026-01-15', status: 'pending' },
];

const upcomingClasses = [
  { title: 'Data Structures', date: new Date(), time: '09:00 AM', type: 'meeting', location: 'Room 201' },
  { title: 'Database Lab', date: new Date(), time: '11:00 AM', type: 'event', location: 'Lab 3' },
  { title: 'OS Lecture', date: new Date(Date.now() + 86400000), time: '10:00 AM', type: 'meeting', location: 'Room 105' },
];

const StudentDashboard = () => {
  const { isDark } = useTheme();
  const { user } = useAuth();

  const columns = [
    {
      title: 'Course',
      dataIndex: 'course',
      key: 'course',
      render: (text, record) => (
        <div>
          <Text className="text-[var(--text-primary)] font-medium block">{text}</Text>
          <Text className="text-xs text-[var(--text-tertiary)]">{record.code}</Text>
        </div>
      )
    },
    {
      title: 'Teacher',
      dataIndex: 'teacher',
      key: 'teacher',
    },
    {
      title: 'Progress',
      dataIndex: 'progress',
      key: 'progress',
      render: (progress) => (
        <Progress 
          percent={progress} 
          size="small" 
          strokeColor="#21CCEE"
          trailColor="var(--bg-tertiary)"
        />
      )
    },
    {
      title: 'Grade',
      dataIndex: 'grade',
      key: 'grade',
      render: (grade) => (
        <Tag color={grade.startsWith('A') ? 'green' : grade.startsWith('B') ? 'blue' : 'orange'}>
          {grade}
        </Tag>
      )
    },
  ];

  const assignmentColumns = [
    {
      title: 'Assignment',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => (
        <div>
          <Text className="text-[var(--text-primary)] font-medium block">{text}</Text>
          <Text className="text-xs text-[var(--text-tertiary)]">{record.course}</Text>
        </div>
      )
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (date) => (
        <span className="flex items-center gap-1 text-[var(--text-secondary)]">
          <CalendarOutlined />
          {new Date(date).toLocaleDateString()}
        </span>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'submitted' ? 'green' : 'orange'}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Tag>
      )
    },
  ];

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#21CCEE',
          borderRadius: 8,
          fontFamily: 'Inter, system-ui, sans-serif',
        },
        components: {
          Card: {
            colorBgContainer: isDark ? '#1a1d2e' : '#ffffff',
            colorBorderSecondary: isDark ? '#334155' : '#e2e8f0',
          },
          Table: {
            colorBgContainer: isDark ? '#1a1d2e' : '#ffffff',
            headerBg: isDark ? '#242839' : '#f8fafc',
          }
        }
      }}
    >
      <div className="student-dashboard">
        {/* Header */}
        <div className="mb-6">
          <Breadcrumb
            items={[
              { title: <><HomeOutlined /> Home</> },
              { title: 'Dashboard' },
            ]}
            className="mb-2"
          />
          <div className="flex items-center justify-between">
            <div>
              <Title level={3} className="!mb-1 !text-[var(--text-primary)]">
                Welcome, {user?.name || 'Student'}! 📚
              </Title>
              <Text className="text-[var(--text-secondary)]">
                Track your academic progress and stay updated.
              </Text>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} sm={12} lg={6}>
            <StatCard 
              title="Enrolled Courses"
              value={4}
              icon={<BookOutlined style={{ fontSize: 28 }} />}
              color="#21CCEE"
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard 
              title="Attendance"
              value={91}
              suffix="%"
              icon={<CheckCircleOutlined style={{ fontSize: 28 }} />}
              color="#4DDB62"
              trend="up"
              trendValue={3}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard 
              title="Pending Tasks"
              value={5}
              icon={<FileTextOutlined style={{ fontSize: 28 }} />}
              color="#FFBF66"
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard 
              title="CGPA"
              value={3.75}
              icon={<TrophyOutlined style={{ fontSize: 28 }} />}
              color="#A78BFA"
              trend="up"
              trendValue={0.15}
            />
          </Col>
        </Row>

        {/* Attendance Chart & Schedule */}
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} lg={16}>
            <Card 
              title="Attendance Trend"
              style={{ borderRadius: 16 }}
              styles={{ body: { padding: '20px 24px' } }}
            >
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={attendanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="month" stroke="var(--text-tertiary)" />
                  <YAxis domain={[70, 100]} stroke="var(--text-tertiary)" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 8
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="attendance" 
                    stroke="#21CCEE" 
                    strokeWidth={3}
                    dot={{ fill: '#21CCEE', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <UpcomingEvents events={upcomingClasses} />
          </Col>
        </Row>

        {/* Courses & Assignments */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={14}>
            <Card 
              title="My Courses"
              style={{ borderRadius: 16 }}
              styles={{ body: { padding: '12px' } }}
            >
              <Table 
                columns={columns} 
                dataSource={coursesData}
                pagination={false}
                size="small"
              />
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card 
              title="Pending Assignments"
              extra={<a className="text-primary">View All</a>}
              style={{ borderRadius: 16 }}
              styles={{ body: { padding: '12px' } }}
            >
              <Table 
                columns={assignmentColumns} 
                dataSource={assignmentsData}
                pagination={false}
                size="small"
              />
            </Card>
          </Col>
        </Row>
      </div>
    </ConfigProvider>
  );
};

export default StudentDashboard;
