import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { addTeacher } from '../../../services/teacher.service';
import { getDepartments } from '../../../services/department.service';
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Row,
  Col,
  Space,
  Breadcrumb,
  Typography,
  message,
  InputNumber,
  Upload
} from 'antd';
import {
  HomeOutlined,
  SaveOutlined,
  ArrowLeftOutlined,
  UploadOutlined
} from '@ant-design/icons';

const { Title } = Typography;

const AddTeacher = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [photoFile, setPhotoFile] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      const response = await getDepartments();
      setDepartments(response.data || []);
    } catch (error) {
      message.error('Failed to load departments');
    }
  };

  const onFinish = async (values) => {
    try {
      setLoading(true);

      const teacherData = {
        name: values.name,
        email: values.email,
        cnic: values.cnic,
        phone: values.phone,
        designation: values.designation,
        department_id: values.department_id,
        qualification: values.qualification,
        specialization: values.specialization,
        experience: values.experience || 0,
        gender: values.gender,
        address: values.address,
      };

      // Convert photo to base64 if uploaded
      if (photoFile) {
        const reader = new FileReader();
        reader.readAsDataURL(photoFile);
        await new Promise((resolve) => {
          reader.onload = () => {
            teacherData.photo = reader.result;
            resolve();
          };
        });
      }

      const response = await addTeacher(teacherData);
      
      message.success(response.message || 'Teacher added successfully');
      
      if (response.data?.credentials) {
        message.info(`Login credentials sent to ${response.data.credentials.email}`, 5);
      }
      
      form.resetFields();
      navigate('/admin/teachers');
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to add teacher');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { href: '/admin', title: <HomeOutlined /> },
          { href: '/admin/teachers', title: 'Teachers' },
          { title: 'Add Teacher' },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <Title level={2} className="!mb-0">Add New Teacher</Title>
          <p className="text-[var(--text-secondary)] mt-1">Add a new teaching staff member</p>
        </div>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/teachers')}>
          Back to Teachers
        </Button>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        autoComplete="off"
      >
        <Card title="Basic Information" className="mb-6">
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="name"
                label="Full Name"
                rules={[{ required: true, message: 'Please enter full name' }]}
              >
                <Input placeholder="Enter full name" size="large" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: 'Please enter email' },
                  { type: 'email', message: 'Please enter valid email' }
                ]}
              >
                <Input placeholder="Enter email address" size="large" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="cnic"
                label="CNIC"
                rules={[
                  { required: true, message: 'Please enter CNIC' },
                  { pattern: /^\d{13}$/, message: 'CNIC must be 13 digits' }
                ]}
              >
                <Input placeholder="1234567890123" maxLength={13} size="large" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="phone"
                label="Phone Number"
                rules={[
                  { required: true, message: 'Please enter phone number' },
                  { pattern: /^03\d{9}$/, message: 'Phone must start with 03 and be 11 digits' }
                ]}
              >
                <Input placeholder="03001234567" maxLength={11} size="large" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="gender"
                label="Gender"
                rules={[{ required: true, message: 'Please select gender' }]}
              >
                <Select placeholder="Select gender" size="large">
                  <Select.Option value="male">Male</Select.Option>
                  <Select.Option value="female">Female</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="address"
                label="Address"
              >
                <Input placeholder="Enter address" size="large" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item
                label="Profile Photo"
              >
                <Upload
                  listType="picture-card"
                  maxCount={1}
                  beforeUpload={(file) => {
                    const isLt1M = file.size / 1024 / 1024 < 1;
                    if (!isLt1M) {
                      message.error('Photo must be smaller than 1MB!');
                      return Upload.LIST_IGNORE;
                    }
                    const isImage = file.type.startsWith('image/');
                    if (!isImage) {
                      message.error('You can only upload image files!');
                      return Upload.LIST_IGNORE;
                    }
                    setPhotoFile(file);
                    return false;
                  }}
                  onRemove={() => setPhotoFile(null)}
                >
                  {!photoFile && (
                    <div>
                      <UploadOutlined />
                      <div style={{ marginTop: 8 }}>Upload Photo</div>
                    </div>
                  )}
                </Upload>
                <p className="text-xs text-gray-500 mt-2">Maximum file size: 1MB</p>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="Professional Information" className="mb-6">
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="designation"
                label="Designation"
                rules={[{ required: true, message: 'Please select designation' }]}
              >
                <Select placeholder="Select designation" size="large">
                  <Select.Option value="Professor">Professor</Select.Option>
                  <Select.Option value="Associate Professor">Associate Professor</Select.Option>
                  <Select.Option value="Assistant Professor">Assistant Professor</Select.Option>
                  <Select.Option value="Lecturer">Lecturer</Select.Option>
                  <Select.Option value="Senior Lecturer">Senior Lecturer</Select.Option>
                  <Select.Option value="Visiting Faculty">Visiting Faculty</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="department_id"
                label="Department"
                rules={[{ required: true, message: 'Please select department' }]}
              >
                <Select 
                  placeholder="Select department" 
                  size="large"
                  showSearch
                  filterOption={(input, option) =>
                    option.children.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {departments.map(dept => (
                    <Select.Option key={dept.id} value={dept.id}>
                      {dept.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="qualification"
                label="Qualification"
                rules={[{ required: true, message: 'Please enter qualification' }]}
              >
                <Input placeholder="e.g., PhD Computer Science" size="large" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="specialization"
                label="Specialization"
              >
                <Input placeholder="e.g., Machine Learning, AI" size="large" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="experience"
                label="Experience (Years)"
                initialValue={0}
              >
                <InputNumber 
                  placeholder="Years of experience" 
                  size="large" 
                  min={0}
                  max={50}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card>
          <Space>
            <Button 
              type="primary" 
              htmlType="submit" 
              icon={<SaveOutlined />} 
              loading={loading}
              size="large"
            >
              Save Teacher
            </Button>
            <Button 
              onClick={() => navigate('/admin/teachers')}
              size="large"
            >
              Cancel
            </Button>
          </Space>
        </Card>
      </Form>
    </div>
  );
};

export default AddTeacher;
