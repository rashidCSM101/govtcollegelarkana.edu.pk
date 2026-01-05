import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getStudentById, updateStudent } from '../../../services/student.service';
import { getDepartments } from '../../../services/department.service';
import {
  Card,
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Upload,
  Row,
  Col,
  Breadcrumb,
  Typography,
  message,
  Spin
} from 'antd';
import {
  HomeOutlined,
  UploadOutlined,
  SaveOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title } = Typography;
const { TextArea } = Input;

const EditStudent = () => {
  const { id } = useParams();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [photoFile, setPhotoFile] = useState(null);
  const [currentPhoto, setCurrentPhoto] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadDepartments();
    loadStudent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadDepartments = async () => {
    try {
      const response = await getDepartments();
      setDepartments(response.data || []);
    } catch (error) {
      message.error('Failed to load departments');
    }
  };

  const loadStudent = async () => {
    try {
      setFetchingData(true);
      const response = await getStudentById(id);
      const student = response.data;
      
      // Split name into first and last name
      const nameParts = student.name?.split(' ') || ['', ''];
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');

      // Set form values
      form.setFieldsValue({
        firstName,
        lastName,
        email: student.email,
        phone: student.phone,
        emergencyContact: student.emergency_contact,
        address: student.address,
        gender: student.gender,
        cnic: student.cnic,
        bloodGroup: student.blood_group,
        dob: student.date_of_birth ? dayjs(student.date_of_birth) : null,
        department_id: student.department_id,
        semester: student.semester,
        admissionDate: student.admission_date ? dayjs(student.admission_date) : null,
        fatherName: student.father_name,
        fatherPhone: student.father_phone,
        fatherCNIC: student.father_cnic,
        rollNo: student.roll_no,
      });

      setCurrentPhoto(student.profile_photo);
    } catch (error) {
      message.error('Failed to load student details');
      navigate('/admin/students');
    } finally {
      setFetchingData(false);
    }
  };

  const onFinish = async (values) => {
    try {
      setLoading(true);
      
      // Check for missing required fields
      const missingFields = [];
      if (!values.firstName) missingFields.push('First Name');
      if (!values.lastName) missingFields.push('Last Name');
      if (!values.email) missingFields.push('Email');
      if (!values.phone) missingFields.push('Phone');
      if (!values.dob) missingFields.push('Date of Birth');
      if (!values.gender) missingFields.push('Gender');
      if (!values.cnic) missingFields.push('CNIC');
      if (!values.address) missingFields.push('Address');
      if (!values.department_id) missingFields.push('Department');
      if (!values.semester) missingFields.push('Semester');
      if (!values.admissionDate) missingFields.push('Admission Date');
      
      if (missingFields.length > 0) {
        message.error(`Missing required fields: ${missingFields.join(', ')}`);
        return;
      }
      
      // Format data for API
      const studentData = {
        name: `${values.firstName} ${values.lastName}`.trim(),
        email: values.email,
        phone: values.phone,
        emergency_contact: values.emergencyContact,
        address: values.address,
        gender: values.gender,
        cnic: values.cnic,
        blood_group: values.bloodGroup,
        date_of_birth: values.dob?.format('YYYY-MM-DD'),
        department_id: values.department_id,
        semester: values.semester,
        admission_date: values.admissionDate?.format('YYYY-MM-DD'),
        father_name: values.fatherName,
        father_phone: values.fatherPhone,
        father_cnic: values.fatherCNIC,
        roll_no: values.rollNo,
      };

      // Convert photo to base64 if uploaded
      if (photoFile) {
        const reader = new FileReader();
        reader.readAsDataURL(photoFile);
        await new Promise((resolve) => {
          reader.onload = () => {
            studentData.profile_photo = reader.result;
            resolve();
          };
        });
      }
      
      const response = await updateStudent(id, studentData);
      message.success(response.message || 'Student updated successfully!');
      navigate(`/admin/students/${id}`);
    } catch (error) {
      message.error(error.message || 'Failed to update student');
    } finally {
      setLoading(false);
    }
  };

  if (fetchingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" tip="Loading student data..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { href: '/admin', title: <HomeOutlined /> },
          { href: '/admin/students', title: 'Students' },
          { href: `/admin/students/${id}`, title: 'Student Details' },
          { title: 'Edit Student' },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Title level={2} className="!mb-0">Edit Student</Title>
          <p className="text-[var(--text-secondary)] mt-1">Update student information</p>
        </div>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/admin/students/${id}`)}>
          Back to Details
        </Button>
      </div>

      {/* Form Card */}
      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          autoComplete="off"
        >
          <Title level={4}>Personal Information</Title>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="First Name"
                name="firstName"
                rules={[{ required: true, message: 'Please enter first name' }]}
              >
                <Input placeholder="Enter first name" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Last Name"
                name="lastName"
                rules={[{ required: true, message: 'Please enter last name' }]}
              >
                <Input placeholder="Enter last name" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Date of Birth"
                name="dob"
                rules={[{ required: true, message: 'Please select date of birth' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="Gender"
                name="gender"
                rules={[{ required: true, message: 'Please select gender' }]}
              >
                <Select placeholder="Select gender">
                  <Select.Option value="male">Male</Select.Option>
                  <Select.Option value="female">Female</Select.Option>
                  <Select.Option value="other">Other</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="CNIC"
                name="cnic"
                rules={[{ required: true, message: 'Please enter CNIC' }]}
              >
                <Input placeholder="XXXXX-XXXXXXX-X" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Blood Group"
                name="bloodGroup"
              >
                <Select placeholder="Select blood group">
                  <Select.Option value="A+">A+</Select.Option>
                  <Select.Option value="A-">A-</Select.Option>
                  <Select.Option value="B+">B+</Select.Option>
                  <Select.Option value="B-">B-</Select.Option>
                  <Select.Option value="O+">O+</Select.Option>
                  <Select.Option value="O-">O-</Select.Option>
                  <Select.Option value="AB+">AB+</Select.Option>
                  <Select.Option value="AB-">AB-</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Title level={4} className="!mt-6">Contact Information</Title>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="Email"
                name="email"
                rules={[
                  { required: true, message: 'Please enter email' },
                  { type: 'email', message: 'Please enter valid email' }
                ]}
              >
                <Input placeholder="student@example.com" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Phone"
                name="phone"
                rules={[{ required: true, message: 'Please enter phone number' }]}
              >
                <Input placeholder="03XX-XXXXXXX" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Emergency Contact"
                name="emergencyContact"
              >
                <Input placeholder="03XX-XXXXXXX" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                label="Address"
                name="address"
                rules={[{ required: true, message: 'Please enter address' }]}
              >
                <TextArea rows={3} placeholder="Enter complete address" />
              </Form.Item>
            </Col>
          </Row>

          <Title level={4} className="!mt-6">Academic Information</Title>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="Roll Number"
                name="rollNo"
              >
                <Input placeholder="Enter roll number" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Department"
                name="department_id"
                rules={[{ required: true, message: 'Please select department' }]}
              >
                <Select placeholder="Select department" loading={departments.length === 0}>
                  {departments.map(dept => (
                    <Select.Option key={dept.id} value={dept.id}>
                      {dept.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Semester"
                name="semester"
                rules={[{ required: true, message: 'Please select semester' }]}
              >
                <Select placeholder="Select semester">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                    <Select.Option key={sem} value={sem}>{sem}th Semester</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="Admission Date"
                name="admissionDate"
                rules={[{ required: true, message: 'Please select admission date' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Father Name"
                name="fatherName"
              >
                <Input placeholder="Enter father name" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Father Phone"
                name="fatherPhone"
              >
                <Input placeholder="03XX-XXXXXXX" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="Father CNIC"
                name="fatherCNIC"
              >
                <Input placeholder="XXXXX-XXXXXXX-X" />
              </Form.Item>
            </Col>
          </Row>

          <Title level={4} className="!mt-6">Documents</Title>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Profile Photo"
                name="photo"
              >
                {currentPhoto && !photoFile && (
                  <div className="mb-4">
                    <img 
                      src={`http://localhost:3000/uploads/${currentPhoto}`} 
                      alt="Current" 
                      className="w-32 h-32 rounded object-cover"
                    />
                    <p className="text-sm text-[var(--text-secondary)] mt-2">Current Photo</p>
                  </div>
                )}
                <Upload 
                  maxCount={1} 
                  listType="picture-card"
                  beforeUpload={(file) => {
                    setPhotoFile(file);
                    return false;
                  }}
                  onRemove={() => setPhotoFile(null)}
                >
                  <div>
                    <UploadOutlined />
                    <div style={{ marginTop: 8 }}>
                      {currentPhoto ? 'Change Photo' : 'Upload'}
                    </div>
                  </div>
                </Upload>
              </Form.Item>
            </Col>
          </Row>

          {/* Actions */}
          <div className="flex gap-4 justify-end mt-6">
            <Button onClick={() => navigate(`/admin/students/${id}`)}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
              Update Student
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default EditStudent;
