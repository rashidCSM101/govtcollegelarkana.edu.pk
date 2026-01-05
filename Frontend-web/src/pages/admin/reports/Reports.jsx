import { Card, Row, Col, Select, Button, Breadcrumb, Typography } from 'antd';
import { LineChartOutlined, PieChartOutlined, DownloadOutlined, HomeOutlined } from '@ant-design/icons';
import { LineChart, Line, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

const { Title } = Typography;

const Reports = () => {
  const enrollmentData = [
    { month: 'Jan', students: 120 },
    { month: 'Feb', students: 135 },
    { month: 'Mar', students: 150 },
    { month: 'Apr', students: 148 },
  ];

  const departmentData = [
    { name: 'CS', value: 450 },
    { name: 'Business', value: 320 },
    { name: 'Engineering', value: 280 },
    { name: 'Arts', value: 198 },
  ];

  const COLORS = ['#21CCEE', '#4DDB62', '#FFBF66', '#A78BFA'];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ href: '/admin', title: <HomeOutlined /> }, { title: 'Reports & Analytics' }]} />
      <div className="flex items-center justify-between">
        <div>
          <Title level={2} className="!mb-0">Reports & Analytics</Title>
          <p className="text-[var(--text-secondary)] mt-1">View comprehensive reports</p>
        </div>
        <Button type="primary" icon={<DownloadOutlined />}>Export Report</Button>
      </div>
      <Card>
        <div className="flex gap-4 mb-4">
          <Select defaultValue="semester" style={{ width: 200 }} options={[{value:'semester',label:'This Semester'},{value:'month',label:'This Month'},{value:'year',label:'This Year'}]} />
          <Select defaultValue="all" style={{ width: 200 }} options={[{value:'all',label:'All Departments'},{value:'cs',label:'Computer Science'}]} />
        </div>
      </Card>
      <Row gutter={16}>
        <Col span={12}>
          <Card title={<><LineChartOutlined /> Enrollment Trend</>}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={enrollmentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="students" stroke="#21CCEE" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={12}>
          <Card title={<><PieChartOutlined /> Department Distribution</>}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={departmentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {departmentData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Reports;
