import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Upload,
  Button,
  Steps,
  Table,
  Alert,
  Breadcrumb,
  Typography,
  message,
  Tag,
  Progress,
  Space,
  Divider
} from 'antd';
import {
  HomeOutlined,
  UploadOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  ArrowLeftOutlined,
  FileTextOutlined,
  CloudUploadOutlined,
  CheckCircleFilled,
  InfoCircleOutlined
} from '@ant-design/icons';
import { bulkUploadStudents } from '../../../services/student.service';

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

const BulkUploadStudents = () => {
  const [current, setCurrent] = useState(0);
  const [fileList, setFileList] = useState([]);
  const [uploadedData, setUploadedData] = useState([]);
  const [uploadResults, setUploadResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const steps = [
    { 
      title: 'Download', 
      icon: <DownloadOutlined />,
      description: 'Get template'
    },
    { 
      title: 'Upload', 
      icon: <UploadOutlined />,
      description: 'Select file'
    },
    { 
      title: 'Verify', 
      icon: <CheckCircleOutlined />,
      description: 'Review data'
    },
    { 
      title: 'Complete', 
      icon: <CheckCircleFilled />,
      description: 'Finish'
    },
  ];

  const columns = [
    { 
      title: 'Roll No', 
      dataIndex: 'roll_no', 
      key: 'roll_no',
      width: 120,
      render: (text) => <Text strong>{text}</Text>
    },
    { 
      title: 'First Name', 
      dataIndex: 'first_name', 
      key: 'first_name',
      width: 150
    },
    { 
      title: 'Last Name', 
      dataIndex: 'last_name', 
      key: 'last_name',
      width: 150
    },
    { 
      title: 'Email', 
      dataIndex: 'email', 
      key: 'email',
      width: 200,
      render: (text) => <Text type="secondary">{text}</Text>
    },
    { 
      title: 'Department', 
      dataIndex: 'department', 
      key: 'department',
      width: 180
    },
    { 
      title: 'Semester', 
      dataIndex: 'semester', 
      key: 'semester',
      width: 100,
      align: 'center'
    },
    { 
      title: 'Status', 
      key: 'status',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        record.error ? 
          <Tag color="error" icon={<InfoCircleOutlined />}>Invalid</Tag> : 
          <Tag color="success" icon={<CheckCircleOutlined />}>Valid</Tag>
      )
    },
  ];

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV file is empty or invalid');
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const students = [];

    for (let i = 1; i < lines.length; i++) {
      const values = [];
      let current = '';
      let inQuotes = false;

      for (let char of lines[i]) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim().replace(/"/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim().replace(/"/g, ''));

      if (values.length === headers.length) {
        const student = {};
        headers.forEach((header, index) => {
          const normalizedHeader = header
            .toLowerCase()
            .replace(/\s*\*\s*$/, '')
            .replace(/\s*\(.*?\)\s*$/, '')
            .replace(/\s+/g, '_');
          student[normalizedHeader] = values[index] || null;
        });
        students.push(student);
      }
    }

    return students;
  };

  const uploadProps = {
    name: 'file',
    multiple: false,
    fileList,
    accept: '.csv',
    beforeUpload: (file) => {
      const isCSV = file.type === 'text/csv' || file.name.endsWith('.csv');
      if (!isCSV) {
        message.error('You can only upload CSV files!');
        return false;
      }
      setFileList([file]);
      
      // Read and parse the file
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const parsedData = parseCSV(text);
          setUploadedData(parsedData.map((item, index) => ({ ...item, key: index })));
          message.success(`Parsed ${parsedData.length} students from file`);
        } catch (error) {
          message.error('Failed to parse CSV file: ' + error.message);
          setFileList([]);
        }
      };
      reader.readAsText(file);
      
      return false;
    },
    onRemove: () => {
      setFileList([]);
      setUploadedData([]);
    },
  };

  const handleNext = () => {
    if (current === 1 && fileList.length === 0) {
      message.warning('Please upload a file first!');
      return;
    }
    if (current === 1 && uploadedData.length === 0) {
      message.warning('No valid data found in the file!');
      return;
    }
    setCurrent(current + 1);
  };

  const handlePrevious = () => {
    setCurrent(current - 1);
  };

  const downloadTemplate = () => {
    // Create CSV template with all required fields
    const headers = [
      'roll_no',
      'first_name',
      'last_name',
      'email',
      'phone',
      'department',
      'semester',
      'gender',
      'date_of_birth',
      'blood_group',
      'father_name',
      'father_phone',
      'father_cnic',
      'emergency_contact',
      'address',
      'batch',
      'status'
    ];

    // Sample data row
    const sampleData = [
      'STD001',
      'Ahmed',
      'Ali',
      'ahmed@example.com',
      '03001234567',
      'Computer Science',
      '1',
      'Male',
      '2000-01-15',
      'B+',
      'Ali Khan',
      '03009876543',
      '12345-1234567-1',
      '03001111111',
      'House 123, Street 5, Larkana',
      '2024',
      'active'
    ];

    // Create CSV content
    const csvContent = [
      headers.join(','),
      sampleData.map(d => d.includes(',') ? `"${d}"` : d).join(',')
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `student_upload_template_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    message.success('Template downloaded successfully!');
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const response = await bulkUploadStudents(fileList[0]);
      setUploadResults(response.data);
      message.success(`Successfully uploaded ${response.data.success} out of ${response.data.total} students`);
      setCurrent(current + 1);
    } catch (error) {
      message.error(error.message || 'Failed to upload students');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { href: '/admin', title: <HomeOutlined /> },
          { href: '/admin/students', title: 'Students' },
          { title: 'Bulk Upload' },
        ]}
      />

      {/* Header */}
      <Card className="border-l-4 border-l-primary">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <CloudUploadOutlined className="text-2xl text-primary" />
            </div>
            <div>
              <Title level={2} className="!mb-1">Bulk Upload Students</Title>
              <Text type="secondary">Import multiple student records efficiently using CSV files</Text>
            </div>
          </div>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/students')} size="large">
            Back
          </Button>
        </div>
      </Card>

      {/* Progress Indicator */}
      <Card>
        <Steps 
          current={current} 
          items={steps}
          className="px-8"
        />
        <div className="mt-6">
          <Progress 
            percent={(current / (steps.length - 1)) * 100} 
            strokeColor="#21CCEE"
            showInfo={false}
          />
        </div>
      </Card>

      {/* Step Content */}
      <Card className="min-h-[500px]">
        {current === 0 && (
          <div className="max-w-3xl mx-auto">
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 mb-6">
                <FileTextOutlined className="text-5xl text-primary" />
              </div>
              <Title level={3} className="!mb-2">Download CSV Template</Title>
              <Paragraph type="secondary" className="text-lg mb-8">
                Get the pre-formatted CSV template with all required fields to start adding student data
              </Paragraph>
              
              <Card className="text-left bg-blue-50 border-blue-200 mb-8">
                <Space direction="vertical" size="middle" className="w-full">
                  <div>
                    <Text strong className="text-blue-900">
                      <InfoCircleOutlined className="mr-2" />
                      Template Guidelines
                    </Text>
                  </div>
                  <Divider className="!my-2" />
                  <ul className="space-y-2 text-blue-900">
                    <li className="flex items-start gap-2">
                      <CheckCircleOutlined className="mt-1 text-green-600" />
                      <span>Fill all required fields: first_name, last_name, email, phone, department, semester</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircleOutlined className="mt-1 text-green-600" />
                      <span>Use date format: YYYY-MM-DD (e.g., 2000-01-15)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircleOutlined className="mt-1 text-green-600" />
                      <span>Do not modify or delete column headers</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircleOutlined className="mt-1 text-green-600" />
                      <span>Remove sample data row before uploading</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircleOutlined className="mt-1 text-green-600" />
                      <span>Each row represents one student record</span>
                    </li>
                  </ul>
                </Space>
              </Card>

              <Button 
                type="primary" 
                size="large" 
                icon={<DownloadOutlined />} 
                onClick={downloadTemplate}
                className="px-12 h-12 text-lg shadow-lg"
              >
                Download CSV Template
              </Button>
            </div>
          </div>
        )}

        {current === 1 && (
          <div className="max-w-3xl mx-auto py-12">
            <div className="text-center mb-8">
              <Title level={3} className="!mb-2">Upload Your CSV File</Title>
              <Text type="secondary" className="text-base">
                Select the filled CSV file from your computer
              </Text>
            </div>
            
            <Dragger {...uploadProps} className="!border-2 !border-dashed hover:!border-primary">
              <p className="ant-upload-drag-icon mb-4">
                <CloudUploadOutlined style={{ fontSize: 64, color: '#21CCEE' }} />
              </p>
              <p className="ant-upload-text text-lg font-semibold mb-2">
                Click or drag CSV file to this area
              </p>
              <p className="ant-upload-hint text-base px-8">
                Support for CSV files only • File will be automatically parsed and validated
              </p>
            </Dragger>

            {uploadedData.length > 0 && (
              <Alert
                message="File Parsed Successfully!"
                description={`Found ${uploadedData.length} student records in your file`}
                type="success"
                showIcon
                className="mt-6"
              />
            )}
          </div>
        )}

        {current === 2 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Title level={4} className="!mb-1">Verify Student Data</Title>
                <Text type="secondary">Review the parsed data before final upload</Text>
              </div>
              <Tag color="blue" className="px-4 py-1">
                {uploadedData.length} Records Found
              </Tag>
            </div>
            
            <Alert
              message="Data Validation Complete"
              description={`All ${uploadedData.length} records have been validated and are ready for upload. Please review below.`}
              type="info"
              showIcon
              icon={<CheckCircleOutlined />}
            />
            
            <Card className="shadow-sm">
              <Table 
                columns={columns} 
                dataSource={uploadedData} 
                pagination={{ 
                  pageSize: 10,
                  showSizeChanger: true,
                  showTotal: (total) => `Total ${total} records`
                }}
                scroll={{ x: 1200, y: 400 }}
                bordered
              />
            </Card>
          </div>
        )}

        {current === 3 && uploadResults && (
          <div className="max-w-4xl mx-auto space-y-6 py-8">
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 mb-6">
                <CheckCircleFilled style={{ fontSize: 64, color: '#52c41a' }} />
              </div>
              <Title level={2} className="!mb-2">Upload Complete!</Title>
              <Paragraph type="secondary" className="text-lg">
                Your bulk upload process has been completed
              </Paragraph>
            </div>

            <Card className="shadow-md">
              <div className="grid grid-cols-3 gap-6 text-center">
                <div className="p-4">
                  <div className="text-3xl font-bold text-blue-600 mb-2">{uploadResults.total}</div>
                  <Text type="secondary">Total Records</Text>
                </div>
                <div className="p-4">
                  <div className="text-3xl font-bold text-green-600 mb-2">{uploadResults.success}</div>
                  <Text type="secondary">Successfully Added</Text>
                </div>
                <div className="p-4">
                  <div className="text-3xl font-bold text-red-600 mb-2">{uploadResults.failed}</div>
                  <Text type="secondary">Failed</Text>
                </div>
              </div>
              
              {uploadResults.success > 0 && (
                <div className="mt-4">
                  <Progress 
                    percent={Math.round((uploadResults.success / uploadResults.total) * 100)} 
                    strokeColor="#52c41a"
                    format={percent => `${percent}% Success Rate`}
                  />
                </div>
              )}
            </Card>
            
            {uploadResults.failed > 0 && (
              <Alert
                message={`${uploadResults.failed} Student(s) Failed to Upload`}
                description={
                  <div className="mt-2">
                    <Text className="block mb-3">The following records encountered errors:</Text>
                    <div className="max-h-48 overflow-y-auto bg-red-50 rounded p-3">
                      {uploadResults.failedList?.map((item, index) => (
                        <div key={index} className="mb-2 pb-2 border-b border-red-100 last:border-0">
                          <Text strong>{item.name}</Text>
                          <Text type="secondary" className="block text-sm">
                            {item.email} • {item.error}
                          </Text>
                        </div>
                      ))}
                    </div>
                  </div>
                }
                type="warning"
                showIcon
              />
            )}
            
            {uploadResults.success > 0 && (
              <Alert
                message={`${uploadResults.success} Student(s) Added Successfully`}
                description={
                  <div className="mt-2">
                    <div className="max-h-48 overflow-y-auto bg-green-50 rounded p-3">
                      {uploadResults.successList?.slice(0, 10).map((item, index) => (
                        <div key={index} className="mb-2 pb-2 border-b border-green-100 last:border-0">
                          <Text strong>{item.name}</Text>
                          <Text type="secondary" className="block text-sm">
                            {item.email} • Roll No: {item.roll_no}
                          </Text>
                        </div>
                      ))}
                      {uploadResults.successList?.length > 10 && (
                        <Text type="secondary" className="block text-center mt-2">
                          ... and {uploadResults.successList.length - 10} more
                        </Text>
                      )}
                    </div>
                  </div>
                }
                type="success"
                showIcon
              />
            )}
            
            <div className="text-center mt-8">
              <Space size="large">
                <Button 
                  type="primary" 
                  size="large"
                  icon={<HomeOutlined />}
                  onClick={() => navigate('/admin/students')}
                >
                  View All Students
                </Button>
                <Button 
                  size="large"
                  onClick={() => {
                    setCurrent(0);
                    setFileList([]);
                    setUploadedData([]);
                    setUploadResults(null);
                  }}
                >
                  Upload More Students
                </Button>
              </Space>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        {current < 3 && (
          <div className="flex justify-between mt-8 pt-6 border-t">
            <Button 
              onClick={handlePrevious} 
              disabled={current === 0 || loading}
              size="large"
            >
              Previous
            </Button>
            <Button 
              type="primary" 
              onClick={current === 2 ? handleSubmit : handleNext}
              loading={loading}
              size="large"
              disabled={current === 1 && uploadedData.length === 0}
            >
              {current === 2 ? 'Upload Students' : 'Next Step'}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default BulkUploadStudents;
