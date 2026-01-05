import { Card, Form, Select, Button, Table, Input, Breadcrumb, Typography, Space, message } from 'antd';
import { HomeOutlined, SaveOutlined, UploadOutlined } from '@ant-design/icons';
import { useState } from 'react';

const { Title } = Typography;

const ResultProcessing = () => {
  const [form] = Form.useForm();
  const [students, setStudents] = useState([]);

  const loadStudents = () => {
    // Mock student data
    setStudents([
      { id: 1, rollNo: 'STD001', name: 'Ahmed Ali', obtainedMarks: '', totalMarks: 100, grade: '' },
      { id: 2, rollNo: 'STD002', name: 'Fatima Khan', obtainedMarks: '', totalMarks: 100, grade: '' },
    ]);
  };

  const handleSave = () => {
    message.success('Results saved successfully!');
  };

  const columns = [
    { title: 'Roll No', dataIndex: 'rollNo', key: 'rollNo' },
    { title: 'Student Name', dataIndex: 'name', key: 'name' },
    {
      title: 'Obtained Marks',
      dataIndex: 'obtainedMarks',
      key: 'obtainedMarks',
      render: () => <Input type="number" placeholder="Enter marks" style={{ width: 100 }} />,
    },
    { title: 'Total Marks', dataIndex: 'totalMarks', key: 'totalMarks' },
    {
      title: 'Grade',
      dataIndex: 'grade',
      key: 'grade',
      render: () => <Select style={{ width: 80 }} placeholder="Grade" options={[{value:'A'},{value:'B'},{value:'C'},{value:'D'},{value:'F'}]} />,
    },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ href: '/admin', title: <HomeOutlined /> }, { title: 'Results' }, { title: 'Process Results' }]} />
      <div>
        <Title level={2} className="!mb-0">Result Processing</Title>
        <p className="text-[var(--text-secondary)] mt-1">Enter and process student results</p>
      </div>
      <Card title="Select Exam">
        <Form form={form} layout="vertical" onFinish={loadStudents}>
          <div className="grid grid-cols-3 gap-4">
            <Form.Item label="Department" name="department" rules={[{ required: true }]}>
              <Select placeholder="Select department" options={[{value:'cs',label:'Computer Science'},{value:'bba',label:'Business'}]} />
            </Form.Item>
            <Form.Item label="Semester" name="semester" rules={[{ required: true }]}>
              <Select placeholder="Select semester" options={[{value:'6',label:'6th'},{value:'4',label:'4th'}]} />
            </Form.Item>
            <Form.Item label="Exam" name="exam" rules={[{ required: true }]}>
              <Select placeholder="Select exam" options={[{value:'mid',label:'Mid Term'},{value:'final',label:'Final Term'}]} />
            </Form.Item>
          </div>
          <Button type="primary" htmlType="submit">Load Students</Button>
        </Form>
      </Card>
      {students.length > 0 && (
        <Card title="Enter Marks">
          <Table columns={columns} dataSource={students} rowKey="id" pagination={false} />
          <Space className="mt-4">
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>Save Results</Button>
            <Button icon={<UploadOutlined />}>Bulk Upload</Button>
          </Space>
        </Card>
      )}
    </div>
  );
};

export default ResultProcessing;
