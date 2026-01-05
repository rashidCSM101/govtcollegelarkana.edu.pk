import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getStudents, deleteStudent } from '../../../services/student.service';
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
  Select
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
  ArrowDownOutlined
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
  const navigate = useNavigate();

  useEffect(() => {
    loadStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIndex, pageSize, searchText]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const response = await getStudents({
        page: pageIndex + 1,
        limit: pageSize,
        search: searchText,
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
        } catch (error) {
          message.error(error.message || 'Failed to delete student');
        }
      },
    });
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
        cell: info => (
          <Tag color={info.getValue() === 'active' ? 'success' : 'error'}>
            {info.getValue()?.toUpperCase()}
          </Tag>
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

      {/* Filters Card */}
      <Card>
        <div className="flex gap-4">
          <Input
            placeholder="Search students..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
          />
          <Button icon={<FilterOutlined />}>Filters</Button>
          <Button icon={<DownloadOutlined />} onClick={handleExport} loading={loading}>Export</Button>
        </div>
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
