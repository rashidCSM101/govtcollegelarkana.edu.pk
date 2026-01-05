import { Card, Table, Button, Space, Tag, Breadcrumb, Typography } from 'antd';
import { PlusOutlined, EditOutlined, EyeOutlined, HomeOutlined } from '@ant-design/icons';

const { Title } = Typography;

const Examinations = () => {
  const exams = [
    { id: 1, name: 'Mid Term Exam', semester: '6th', department: 'Computer Science', startDate: '2024-02-01', endDate: '2024-02-15', status: 'upcoming' },
    { id: 2, name: 'Final Term Exam', semester: '6th', department: 'All', startDate: '2024-05-01', endDate: '2024-05-20', status: 'scheduled' },
    { id: 3, name: 'Mid Term Exam', semester: '4th', department: 'Business', startDate: '2023-12-10', endDate: '2023-12-20', status: 'completed' },
  ];

  const columns = [
    { title: 'Exam Name', dataIndex: 'name', key: 'name' },
    { title: 'Semester', dataIndex: 'semester', key: 'semester' },
    { title: 'Department', dataIndex: 'department', key: 'department' },
    { title: 'Start Date', dataIndex: 'startDate', key: 'startDate' },
    { title: 'End Date', dataIndex: 'endDate', key: 'endDate' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colors = { upcoming: 'processing', scheduled: 'warning', completed: 'success' };
        return <Tag color={colors[status]}>{status.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Action',
      key: 'action',
      render: () => (
        <Space>
          <Button type="link" icon={<EyeOutlined />}>View</Button>
          <Button type="link" icon={<EditOutlined />}>Edit</Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ href: '/admin', title: <HomeOutlined /> }, { title: 'Examinations' }]} />
      <div className="flex items-center justify-between">
        <div>
          <Title level={2} className="!mb-0">Examinations</Title>
          <p className="text-[var(--text-secondary)] mt-1">Manage exam schedules</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />}>Schedule Exam</Button>
      </div>
      <Card>
        <Table columns={columns} dataSource={exams} rowKey="id" />
      </Card>
    </div>
  );
};

export default Examinations;
