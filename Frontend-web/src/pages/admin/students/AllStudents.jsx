import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getStudents, deleteStudent, toggleStudentStatus, getStudentStatistics } from '../../../services/student.service';
import { getDepartments } from '../../../services/department.service';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
} from '@tanstack/react-table';
import { 
  Card, 
  Button, 
  Input, 
  Space, 
  Tag, 
  Dropdown,
  Breadcrumb,
  Typography,
  message,
  Modal,
  Select,
  Row,
  Col,
  Statistic,
  Switch
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  DownloadOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  MoreOutlined,
  HomeOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  UserOutlined,
  ManOutlined,
  WomanOutlined,
  TeamOutlined
} from '@ant-design/icons';

const { Title } = Typography;

const AllStudents = () => {
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [sorting, setSorting] = useState([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [departments, setDepartments] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [showStatistics, setShowStatistics] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    department_id: null,
    semester: null,
    batch: null,
    status: null
  });
  
  const navigate = useNavigate();

  useEffect(() => {
    loadDepartments();
    loadStatistics();
  }, []);

  useEffect(() => {
    loadStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIndex, pageSize, searchText, filters]);

  const loadDepartments = async () => {
    try {
      const response = await getDepartments();
      setDepartments(response.data || []);
    } catch (error) {
      console.error('Failed to load departments');
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await getStudentStatistics();
      setStatistics(response.data || null);
    } catch (error) {
      console.error('Failed to load statistics');
    }
  };

  const loadStudents = async () => {
    try {
      setLoading(true);
      const response = await getStudents({
        page: pageIndex + 1,
        limit: pageSize,
        search: searchText,
        ...filters,
      });
      setStudents(response.data || []);
      setTotalRecords(response.pagination?.totalRecords || 0);
    } catch (error) {
      message.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id, name) => {
    Modal.confirm({
      title: 'Delete Student',
      content: `Are you sure you want to delete ${name}? This action cannot be undone.`,
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await deleteStudent(id);
          message.success('Student deleted successfully');
          loadStudents();
          loadStatistics();
        } catch (error) {
          message.error(error.message || 'Failed to delete student');
        }
      },
    });
  };

  const handleToggleStatus = async (id, name, currentStatus) => {
    try {
      await toggleStudentStatus(id);
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      message.success(`${name}'s status changed to ${newStatus}`);
      loadStudents();
      loadStatistics();
    } catch (error) {
      message.error(error.message || 'Failed to toggle status');
    }
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      const response = await getStudents({
        page: 1,
        limit: 10000,
        search: searchText,
      });
      
      const exportData = response.data || [];
      
      if (exportData.length === 0) {
        message.warning('No students to export');
        return;
      }

      const headers = ['Roll No', 'Name', 'Email', 'Phone', 'Department', 'Semester', 'Status'];
      const csvContent = [
        headers.join(','),
        ...exportData.map(student => [
          student.roll_no || '',
          `"${student.name || ''}"`,
          student.email || '',
          student.phone || '',
          `"${student.department_name || ''}"`,
          student.semester || '',
          student.status || ''
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `students_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      message.success(`Exported ${exportData.length} students successfully`);
    } catch (error) {
      message.error('Failed to export students');
    } finally {
      setLoading(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: 'roll_no',
        header: 'Roll No',
        cell: info => info.getValue(),
      },
      {
        accessorKey: 'name',
        header: 'Name',
        cell: info => (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
              {info.getValue()?.charAt(0) || '?'}
            </div>
            <span>{info.getValue()}</span>
          </div>
        ),
      },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: info => info.getValue(),
      },
      {
        accessorKey: 'phone',
        header: 'Phone',
        cell: info => info.getValue(),
      },
      {
        accessorKey: 'department_name',
        header: 'Department',
        cell: info => info.getValue(),
      },
      {
        accessorKey: 'semester',
        header: 'Semester',
        cell: info => info.getValue(),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <Switch
              checked={row.original.status === 'active'}
              onChange={() => handleToggleStatus(row.original.id, row.original.name, row.original.status)}
              checkedChildren="Active"
              unCheckedChildren="Inactive"
            />
          </div>
        ),
      },
      {
        id: 'actions',
        header: 'Action',
        cell: ({ row }) => (
          <Dropdown
            menu={{
              items: [
                {
                  key: 'view',
                  icon: <EyeOutlined />,
                  label: <Link to={`/admin/students/${row.original.id}`}>View Details</Link>,
                },
                {
                  key: 'edit',
                  icon: <EditOutlined />,
                  label: <Link to={`/admin/students/edit/${row.original.id}`}>Edit</Link>,
                },
                {
                  type: 'divider',
                },
                {
                  key: 'delete',
                  icon: <DeleteOutlined />,
                  label: 'Delete',
                  danger: true,
                  onClick: () => handleDelete(row.original.id, row.original.name),
                },
              ],
            }}
          >
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: students,
    columns,
    pageCount: Math.ceil(totalRecords / pageSize),
    state: {
      sorting,
      pagination: {
        pageIndex,
        pageSize,
      },
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
  });

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { href: '/admin', title: <HomeOutlined /> },
          { title: 'Students' },
          { title: 'All Students' },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Title level={2} className="!mb-0">All Students</Title>
          <p className="text-[var(--text-secondary)] mt-1">Manage your students</p>
        </div>
        <Space>
          <Button 
            icon={<TeamOutlined />} 
            onClick={() => setShowStatistics(!showStatistics)}
          >
            {showStatistics ? 'Hide' : 'Show'} Statistics
          </Button>
          <Link to="/admin/students/bulk-upload">
            <Button icon={<DownloadOutlined />}>Bulk Upload</Button>
          </Link>
          <Link to="/admin/students/add">
            <Button type="primary" icon={<PlusOutlined />}>
              Add Student
            </Button>
          </Link>
        </Space>
      </div>

      {/* Statistics Cards */}
      {showStatistics && statistics && (
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Total Students"
                value={statistics.overview?.total_students || 0}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Active Students"
                value={statistics.overview?.active_students || 0}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Male Students"
                value={statistics.overview?.male_students || 0}
                prefix={<ManOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Female Students"
                value={statistics.overview?.female_students || 0}
                prefix={<WomanOutlined />}
                valueStyle={{ color: '#eb2f96' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Filters Card */}
      <Card>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={12} lg={6}>
            <Input
              placeholder="Search students..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Select
              placeholder="Department"
              value={filters.department_id}
              onChange={(value) => {
                setFilters({ ...filters, department_id: value });
                setPageIndex(0);
              }}
              style={{ width: '100%' }}
              allowClear
            >
              {departments.map(dept => (
                <Select.Option key={dept.id} value={dept.id}>
                  {dept.name}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} lg={3}>
            <Select
              placeholder="Semester"
              value={filters.semester}
              onChange={(value) => {
                setFilters({ ...filters, semester: value });
                setPageIndex(0);
              }}
              style={{ width: '100%' }}
              allowClear
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                <Select.Option key={sem} value={sem}>
                  Semester {sem}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} lg={3}>
            <Select
              placeholder="Batch"
              value={filters.batch}
              onChange={(value) => {
                setFilters({ ...filters, batch: value });
                setPageIndex(0);
              }}
              style={{ width: '100%' }}
              allowClear
            >
              {['2024', '2023', '2022', '2021', '2020', '2019'].map(batch => (
                <Select.Option key={batch} value={batch}>
                  {batch}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} lg={3}>
            <Select
              placeholder="Status"
              value={filters.status}
              onChange={(value) => {
                setFilters({ ...filters, status: value });
                setPageIndex(0);
              }}
              style={{ width: '100%' }}
              allowClear
            >
              <Select.Option value="active">Active</Select.Option>
              <Select.Option value="inactive">Inactive</Select.Option>
              <Select.Option value="graduated">Graduated</Select.Option>
              <Select.Option value="suspended">Suspended</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} lg={5} className="flex justify-end">
            <Button 
              icon={<DownloadOutlined />} 
              onClick={handleExport} 
              loading={loading}
              block
            >
              Export
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Students Table */}
      <Card>
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id} className="border-b border-gray-200">
                      {headerGroup.headers.map(header => (
                        <th
                          key={header.id}
                          className="px-4 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50"
                        >
                          {header.isPlaceholder ? null : (
                            <div
                              className={header.column.getCanSort() ? 'cursor-pointer select-none flex items-center gap-2' : ''}
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                              {{
                                asc: <ArrowUpOutlined className="text-xs" />,
                                desc: <ArrowDownOutlined className="text-xs" />,
                              }[header.column.getIsSorted()] ?? null}
                            </div>
                          )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length} className="text-center py-8 text-gray-500">
                        No students found
                      </td>
                    </tr>
                  ) : (
                    table.getRowModel().rows.map(row => (
                      <tr 
                        key={row.id} 
                        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={(e) => {
                          // Don't navigate if clicking on action buttons
                          if (!e.target.closest('button') && !e.target.closest('a')) {
                            navigate(`/admin/students/${row.original.id}`);
                          }
                        }}
                      >
                        {row.getVisibleCells().map(cell => (
                          <td key={cell.id} className="px-4 py-3 text-sm text-gray-700">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  Showing {pageIndex * pageSize + 1} to {Math.min((pageIndex + 1) * pageSize, totalRecords)} of {totalRecords} students
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={pageSize}
                  onChange={(value) => {
                    setPageSize(value);
                    setPageIndex(0);
                  }}
                  options={[
                    { value: 10, label: '10 / page' },
                    { value: 20, label: '20 / page' },
                    { value: 50, label: '50 / page' },
                    { value: 100, label: '100 / page' },
                  ]}
                  style={{ width: 120 }}
                />
                <Button
                  onClick={() => setPageIndex(0)}
                  disabled={pageIndex === 0}
                >
                  First
                </Button>
                <Button
                  onClick={() => setPageIndex(prev => Math.max(0, prev - 1))}
                  disabled={pageIndex === 0}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600 px-2">
                  Page {pageIndex + 1} of {Math.ceil(totalRecords / pageSize)}
                </span>
                <Button
                  onClick={() => setPageIndex(prev => prev + 1)}
                  disabled={pageIndex >= Math.ceil(totalRecords / pageSize) - 1}
                >
                  Next
                </Button>
                <Button
                  onClick={() => setPageIndex(Math.ceil(totalRecords / pageSize) - 1)}
                  disabled={pageIndex >= Math.ceil(totalRecords / pageSize) - 1}
                >
                  Last
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default AllStudents;
