import { Card, Row, Col, Statistic, Table, Button, Breadcrumb, Typography, Tag } from 'antd';
import { DollarOutlined, CheckCircleOutlined, ClockCircleOutlined, HomeOutlined, PlusOutlined } from '@ant-design/icons';

const { Title } = Typography;

const FeeManagement = () => {
  const stats = [
    { title: 'Total Collection', value: 'Rs. 2,450,000', icon: <DollarOutlined />, color: '#4DDB62' },
    { title: 'Pending', value: 'Rs. 485,000', icon: <ClockCircleOutlined />, color: '#FFBF66' },
    { title: 'Collected This Month', value: 'Rs. 850,000', icon: <CheckCircleOutlined />, color: '#21CCEE' },
  ];

  const feeRecords = [
    { id: 1, student: 'Ahmed Ali', rollNo: 'STD001', amount: 25000, paid: 25000, pending: 0, status: 'paid', dueDate: '2024-01-15' },
    { id: 2, student: 'Fatima Khan', rollNo: 'STD002', amount: 25000, paid: 15000, pending: 10000, status: 'partial', dueDate: '2024-01-15' },
    { id: 3, student: 'Hassan Ahmed', rollNo: 'STD003', amount: 25000, paid: 0, pending: 25000, status: 'unpaid', dueDate: '2024-01-15' },
  ];

  const columns = [
    { title: 'Roll No', dataIndex: 'rollNo', key: 'rollNo' },
    { title: 'Student Name', dataIndex: 'student', key: 'student' },
    { title: 'Total Amount', dataIndex: 'amount', key: 'amount', render: (val) => `Rs. ${val.toLocaleString()}` },
    { title: 'Paid', dataIndex: 'paid', key: 'paid', render: (val) => `Rs. ${val.toLocaleString()}` },
    { title: 'Pending', dataIndex: 'pending', key: 'pending', render: (val) => `Rs. ${val.toLocaleString()}` },
    { title: 'Due Date', dataIndex: 'dueDate', key: 'dueDate' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colors = { paid: 'success', partial: 'warning', unpaid: 'error' };
        return <Tag color={colors[status]}>{status.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Action',
      key: 'action',
      render: () => <Button type="link">Collect Fee</Button>,
    },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ href: '/admin', title: <HomeOutlined /> }, { title: 'Fee Management' }]} />
      <div className="flex items-center justify-between">
        <div>
          <Title level={2} className="!mb-0">Fee Management</Title>
          <p className="text-[var(--text-secondary)] mt-1">Manage student fees and collections</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />}>Collect Fee</Button>
      </div>
      <Row gutter={16}>
        {stats.map((stat, i) => (
          <Col span={8} key={i}>
            <Card>
              <Statistic title={stat.title} value={stat.value} prefix={stat.icon} valueStyle={{ color: stat.color }} />
            </Card>
          </Col>
        ))}
      </Row>
      <Card>
        <Table columns={columns} dataSource={feeRecords} rowKey="id" />
      </Card>
    </div>
  );
};

export default FeeManagement;
