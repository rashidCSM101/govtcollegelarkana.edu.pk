import { Row, Col, Typography, Breadcrumb, ConfigProvider, theme } from 'antd';
import { 
  TeamOutlined, 
  UserOutlined, 
  BookOutlined, 
  DollarOutlined,
  HomeOutlined
} from '@ant-design/icons';
import { useTheme } from '../../context/ThemeContext';
import {
  StatCard,
  QuickActions,
  RecentActivity,
  UpcomingEvents,
  TopStudents,
  AttendanceChart,
  FeeCollectionChart,
  StudentDistributionChart
} from '../../components/dashboard';

const { Title, Text } = Typography;

// Mock Data
const statsData = [
  {
    title: 'Total Students',
    value: 1248,
    icon: <TeamOutlined style={{ fontSize: 28 }} />,
    color: '#21CCEE',
    trend: 'up',
    trendValue: 12,
    tooltip: 'Active students enrolled this semester'
  },
  {
    title: 'Total Teachers',
    value: 86,
    icon: <UserOutlined style={{ fontSize: 28 }} />,
    color: '#4DDB62',
    trend: 'up',
    trendValue: 5,
    tooltip: 'Teaching staff members'
  },
  {
    title: 'Active Courses',
    value: 42,
    icon: <BookOutlined style={{ fontSize: 28 }} />,
    color: '#FFBF66',
    trend: 'up',
    trendValue: 8,
    tooltip: 'Courses running this semester'
  },
  {
    title: 'Fee Collected',
    value: 485000,
    prefix: 'Rs.',
    icon: <DollarOutlined style={{ fontSize: 28 }} />,
    color: '#A78BFA',
    trend: 'up',
    trendValue: 18,
    tooltip: 'Total fee collected this month'
  },
];

const recentActivities = [
  {
    type: 'student',
    title: 'New Student Registered',
    description: 'Ahmed Khan enrolled in BS Computer Science',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    tags: [{ label: 'New Admission', color: 'blue' }]
  },
  {
    type: 'fee',
    title: 'Fee Payment Received',
    description: 'Rs. 15,000 received from Roll# 2024-CS-042',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    tags: [{ label: 'Payment', color: 'green' }]
  },
  {
    type: 'attendance',
    title: 'Attendance Marked',
    description: 'BS-II attendance marked by Prof. Ali',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4),
  },
  {
    type: 'assignment',
    title: 'Assignment Submitted',
    description: '45 students submitted Programming Lab assignment',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6),
    tags: [{ label: 'Assignment', color: 'orange' }]
  },
  {
    type: 'notification',
    title: 'Notice Published',
    description: 'Exam schedule for Fall 2025 published',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8),
  },
];

const upcomingEvents = [
  {
    title: 'Mid-Term Examinations',
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
    time: '09:00 AM',
    type: 'exam',
    location: 'Examination Hall'
  },
  {
    title: 'Staff Meeting',
    date: new Date(Date.now() + 1000 * 60 * 60 * 24),
    time: '02:00 PM',
    type: 'meeting',
    location: 'Conference Room'
  },
  {
    title: 'Sports Day',
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    time: '10:00 AM',
    type: 'event',
    location: 'College Ground'
  },
  {
    title: 'Fee Submission Deadline',
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10),
    type: 'deadline',
  },
];

const topStudents = [
  { name: 'Fatima Ali', class: 'BS-IV CS', rollNo: '2021-CS-001', score: 95, avatar: null },
  { name: 'Muhammad Hassan', class: 'BS-III CS', rollNo: '2022-CS-015', score: 92, avatar: null },
  { name: 'Ayesha Khan', class: 'BS-IV CS', rollNo: '2021-CS-023', score: 90, avatar: null },
  { name: 'Ahmed Raza', class: 'BS-II CS', rollNo: '2023-CS-008', score: 88, avatar: null },
  { name: 'Sara Malik', class: 'BS-III CS', rollNo: '2022-CS-042', score: 87, avatar: null },
];

const AdminDashboard = () => {
  const { isDark } = useTheme();

  const handleQuickAction = (actionKey) => {
    console.log('Quick action clicked:', actionKey);
    // Handle navigation or modal opening
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#21CCEE',
          colorSuccess: '#4DDB62',
          colorWarning: '#FFBF66',
          colorError: '#E64F4F',
          borderRadius: 8,
          fontFamily: 'Inter, system-ui, sans-serif',
        },
        components: {
          Card: {
            colorBgContainer: isDark ? '#1a1d2e' : '#ffffff',
            colorBorderSecondary: isDark ? '#334155' : '#e2e8f0',
          },
          Select: {
            colorBgContainer: isDark ? '#242839' : '#f8fafc',
          }
        }
      }}
    >
      <div className="admin-dashboard">
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
                Welcome back, Admin! 👋
              </Title>
              <Text className="text-[var(--text-secondary)]">
                Here's what's happening at your college today.
              </Text>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <Row gutter={[16, 16]} className="mb-6">
          {statsData.map((stat, index) => (
            <Col xs={24} sm={12} lg={6} key={index}>
              <StatCard {...stat} />
            </Col>
          ))}
        </Row>

        {/* Charts Row */}
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} lg={16}>
            <AttendanceChart />
          </Col>
          <Col xs={24} lg={8}>
            <StudentDistributionChart />
          </Col>
        </Row>

        {/* Fee & Quick Actions Row */}
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} lg={16}>
            <FeeCollectionChart />
          </Col>
          <Col xs={24} lg={8}>
            <QuickActions onAction={handleQuickAction} columns={2} />
          </Col>
        </Row>

        {/* Bottom Row */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={8}>
            <RecentActivity activities={recentActivities} />
          </Col>
          <Col xs={24} lg={8}>
            <UpcomingEvents events={upcomingEvents} />
          </Col>
          <Col xs={24} lg={8}>
            <TopStudents students={topStudents} />
          </Col>
        </Row>
      </div>
    </ConfigProvider>
  );
};

export default AdminDashboard;
