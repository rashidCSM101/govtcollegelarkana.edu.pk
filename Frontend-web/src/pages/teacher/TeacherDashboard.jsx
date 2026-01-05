import { Row, Col, Typography, Breadcrumb, ConfigProvider, theme, Card, Progress, Table, Tag, Avatar, List, Button } from 'antd';
import { 
  TeamOutlined, 
  BookOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  HomeOutlined,
  CalendarOutlined,
  EditOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { StatCard, UpcomingEvents, ChartCard } from '../../components/dashboard';
import { 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const { Title, Text } = Typography;

// Mock Data
const classesData = [
  { key: '1', class: 'BS-IV Computer Science', students: 45, subject: 'Data Structures', schedule: 'Mon, Wed, Fri - 9:00 AM' },
  { key: '2', class: 'BS-III Computer Science', students: 52, subject: 'Database Systems', schedule: 'Tue, Thu - 11:00 AM' },
  { key: '3', class: 'BS-II Computer Science', students: 48, subject: 'OOP', schedule: 'Mon, Wed - 2:00 PM' },
];

const attendanceByClass = [
  { name: 'BS-IV CS', present: 42, absent: 3 },
  { name: 'BS-III CS', present: 48, absent: 4 },
  { name: 'BS-II CS', present: 44, absent: 4 },
];

const assignmentsToGrade = [
  { key: '1', title: 'DS Lab Assignment 5', class: 'BS-IV CS', submitted: 40, total: 45, deadline: '2026-01-05' },
  { key: '2', title: 'SQL Queries Exercise', class: 'BS-III CS', submitted: 48, total: 52, deadline: '2026-01-03' },
  { key: '3', title: 'OOP Project Phase 1', class: 'BS-II CS', submitted: 35, total: 48, deadline: '2026-01-08' },
];

const upcomingClasses = [
  { title: 'Data Structures - BS-IV', date: new Date(), time: '09:00 AM', type: 'meeting', location: 'Room 201' },
  { title: 'Database Lab - BS-III', date: new Date(), time: '11:00 AM', type: 'event', location: 'Lab 3' },
  { title: 'OOP Lecture - BS-II', date: new Date(Date.now() + 86400000), time: '02:00 PM', type: 'meeting', location: 'Room 105' },
];

const performanceData = [
  { name: 'A+', value: 15, color: '#4DDB62' },
  { name: 'A', value: 25, color: '#21CCEE' },
  { name: 'B+', value: 30, color: '#FFBF66' },
  { name: 'B', value: 20, color: '#A78BFA' },
  { name: 'C', value: 10, color: '#E64F4F' },
];

const TeacherDashboard = () => {
  const { isDark } = useTheme();
  const { user } = useAuth();

  const columns = [
    {
      title: 'Class',
      dataIndex: 'class',
      key: 'class',
      render: (text, record) => (
        <div>
          <Text className="text-[var(--text-primary)] font-medium block">{text}</Text>
          <Text className="text-xs text-[var(--text-tertiary)]">{record.subject}</Text>
        </div>
      )
    },
    {
      title: 'Students',
      dataIndex: 'students',
      key: 'students',
      render: (count) => (
        <span className="flex items-center gap-1">
          <TeamOutlined className="text-primary" />
          {count}
        </span>
      )
    },
    {
      title: 'Schedule',
      dataIndex: 'schedule',
      key: 'schedule',
      render: (text) => (
        <span className="text-[var(--text-secondary)] text-sm">{text}</span>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: () => (
        <Button type="link" size="small" icon={<EditOutlined />}>
          Take Attendance
        </Button>
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
          <Text className="text-xs text-[var(--text-tertiary)]">{record.class}</Text>
        </div>
      )
    },
    {
      title: 'Submissions',
      key: 'submissions',
      render: (_, record) => (
        <div>
          <Progress 
            percent={Math.round((record.submitted / record.total) * 100)} 
            size="small" 
            strokeColor="#21CCEE"
            format={() => `${record.submitted}/${record.total}`}
          />
        </div>
      )
    },
    {
      title: 'Deadline',
      dataIndex: 'deadline',
      key: 'deadline',
      render: (date) => {
        const isPast = new Date(date) < new Date();
        return (
          <Tag color={isPast ? 'red' : 'blue'}>
            {new Date(date).toLocaleDateString()}
          </Tag>
        );
      }
    },
    {
      title: 'Action',
      key: 'action',
      render: () => (
        <Button type="primary" size="small" ghost>
          Grade
        </Button>
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
      <div className="teacher-dashboard">
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
                Welcome, {user?.name || 'Teacher'}! 👨‍🏫
              </Title>
              <Text className="text-[var(--text-secondary)]">
                Manage your classes and track student progress.
              </Text>
            </div>
            <Button type="primary" icon={<PlusOutlined />}>
              Create Assignment
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} sm={12} lg={6}>
            <StatCard 
              title="My Classes"
              value={3}
              icon={<BookOutlined style={{ fontSize: 28 }} />}
              color="#21CCEE"
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard 
              title="Total Students"
              value={145}
              icon={<TeamOutlined style={{ fontSize: 28 }} />}
              color="#4DDB62"
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard 
              title="Pending Grades"
              value={123}
              icon={<FileTextOutlined style={{ fontSize: 28 }} />}
              color="#FFBF66"
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard 
              title="Today's Classes"
              value={2}
              icon={<CalendarOutlined style={{ fontSize: 28 }} />}
              color="#A78BFA"
            />
          </Col>
        </Row>

        {/* Attendance Chart & Performance */}
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} lg={16}>
            <ChartCard 
              title="Today's Attendance by Class"
              height={250}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendanceByClass} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis type="number" stroke="var(--text-tertiary)" />
                  <YAxis dataKey="name" type="category" stroke="var(--text-tertiary)" width={80} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 8
                    }}
                  />
                  <Bar dataKey="present" name="Present" fill="#4DDB62" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="absent" name="Absent" fill="#E64F4F" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </Col>
          <Col xs={24} lg={8}>
            <ChartCard 
              title="Grade Distribution"
              subtitle="All classes combined"
              height={250}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={performanceData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {performanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </Col>
        </Row>

        {/* Classes & Schedule */}
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} lg={16}>
            <Card 
              title="My Classes"
              style={{ borderRadius: 16 }}
              styles={{ body: { padding: '12px' } }}
            >
              <Table 
                columns={columns} 
                dataSource={classesData}
                pagination={false}
                size="small"
              />
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <UpcomingEvents events={upcomingClasses} />
          </Col>
        </Row>

        {/* Assignments to Grade */}
        <Row gutter={[16, 16]}>
          <Col xs={24}>
            <Card 
              title="Assignments to Grade"
              extra={<a className="text-primary">View All</a>}
              style={{ borderRadius: 16 }}
              styles={{ body: { padding: '12px' } }}
            >
              <Table 
                columns={assignmentColumns} 
                dataSource={assignmentsToGrade}
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

export default TeacherDashboard;
