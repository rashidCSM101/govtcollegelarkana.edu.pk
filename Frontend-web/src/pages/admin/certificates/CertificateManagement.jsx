import { Card, Table, Button, Select, Space, Breadcrumb, Typography, Tag } from 'antd';
import { FileTextOutlined, DownloadOutlined, PrinterOutlined, HomeOutlined } from '@ant-design/icons';

const { Title } = Typography;

const CertificateManagement = () => {
  const certificates = [
    { id: 1, student: 'Ahmed Ali', rollNo: 'STD001', type: 'Degree', issueDate: '2024-01-10', status: 'issued' },
    { id: 2, student: 'Fatima Khan', rollNo: 'STD002', type: 'Transcript', issueDate: '2024-01-08', status: 'pending' },
    { id: 3, student: 'Hassan Ahmed', rollNo: 'STD003', type: 'Character Certificate', issueDate: '2024-01-05', status: 'issued' },
  ];

  const columns = [
    { title: 'Roll No', dataIndex: 'rollNo', key: 'rollNo' },
    { title: 'Student Name', dataIndex: 'student', key: 'student' },
    { title: 'Certificate Type', dataIndex: 'type', key: 'type' },
    { title: 'Issue Date', dataIndex: 'issueDate', key: 'issueDate' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => <Tag color={status === 'issued' ? 'success' : 'processing'}>{status.toUpperCase()}</Tag>,
    },
    {
      title: 'Action',
      key: 'action',
      render: () => (
        <Space>
          <Button type="link" icon={<DownloadOutlined />}>Download</Button>
          <Button type="link" icon={<PrinterOutlined />}>Print</Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ href: '/admin', title: <HomeOutlined /> }, { title: 'Certificates' }]} />
      <div className="flex items-center justify-between">
        <div>
          <Title level={2} className="!mb-0">Certificate Management</Title>
          <p className="text-[var(--text-secondary)] mt-1">Issue and manage certificates</p>
        </div>
        <Button type="primary" icon={<FileTextOutlined />}>Issue Certificate</Button>
      </div>
      <Card>
        <div className="flex gap-4 mb-4">
          <Select placeholder="Filter by type" style={{ width: 200 }} options={[{value:'degree'},{value:'transcript'},{value:'character'}]} />
          <Select placeholder="Filter by status" style={{ width: 200 }} options={[{value:'issued'},{value:'pending'}]} />
        </div>
        <Table columns={columns} dataSource={certificates} rowKey="id" />
      </Card>
    </div>
  );
};

export default CertificateManagement;
