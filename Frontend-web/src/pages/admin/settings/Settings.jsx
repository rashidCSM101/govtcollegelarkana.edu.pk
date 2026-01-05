import { Card, Tabs, Form, Input, Select, Switch, Button, Breadcrumb, Typography, message } from 'antd';
import { HomeOutlined, SaveOutlined } from '@ant-design/icons';

const { Title } = Typography;

const Settings = () => {
  const [form] = Form.useForm();

  const onFinish = (values) => {
    console.log('Settings:', values);
    message.success('Settings saved successfully!');
  };

  const tabItems = [
    {
      key: '1',
      label: 'General',
      children: (
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item label="College Name" name="collegeName" initialValue="Government College Larkana">
            <Input />
          </Form.Item>
          <Form.Item label="College Code" name="collegeCode" initialValue="GCL">
            <Input />
          </Form.Item>
          <Form.Item label="Email" name="email" initialValue="info@gcl.edu.pk">
            <Input />
          </Form.Item>
          <Form.Item label="Phone" name="phone" initialValue="03001234567">
            <Input />
          </Form.Item>
          <Form.Item label="Address" name="address" initialValue="Station Road, Larkana">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>Save Settings</Button>
        </Form>
      ),
    },
    {
      key: '2',
      label: 'Academic',
      children: (
        <Form layout="vertical">
          <Form.Item label="Current Session" name="session" initialValue="2023-2024">
            <Select options={[{value:'2023-2024'},{value:'2024-2025'}]} />
          </Form.Item>
          <Form.Item label="Active Semester" name="semester" initialValue="spring">
            <Select options={[{value:'spring',label:'Spring'},{value:'fall',label:'Fall'}]} />
          </Form.Item>
          <Form.Item label="Grading System" name="grading" initialValue="cgpa">
            <Select options={[{value:'cgpa',label:'CGPA'},{value:'percentage',label:'Percentage'}]} />
          </Form.Item>
          <Form.Item label="Attendance Required %" name="attendance" initialValue="75">
            <Input type="number" suffix="%" />
          </Form.Item>
          <Button type="primary" icon={<SaveOutlined />}>Save Settings</Button>
        </Form>
      ),
    },
    {
      key: '3',
      label: 'System',
      children: (
        <Form layout="vertical">
          <Form.Item label="Enable Email Notifications" name="emailNotif" valuePropName="checked">
            <Switch defaultChecked />
          </Form.Item>
          <Form.Item label="Enable SMS Notifications" name="smsNotif" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item label="Auto Backup" name="autoBackup" valuePropName="checked">
            <Switch defaultChecked />
          </Form.Item>
          <Form.Item label="Backup Frequency" name="backupFreq" initialValue="daily">
            <Select options={[{value:'daily'},{value:'weekly'},{value:'monthly'}]} />
          </Form.Item>
          <Button type="primary" icon={<SaveOutlined />}>Save Settings</Button>
        </Form>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ href: '/admin', title: <HomeOutlined /> }, { title: 'Settings' }]} />
      <div>
        <Title level={2} className="!mb-0">System Settings</Title>
        <p className="text-[var(--text-secondary)] mt-1">Configure system preferences</p>
      </div>
      <Card>
        <Tabs items={tabItems} />
      </Card>
    </div>
  );
};

export default Settings;
