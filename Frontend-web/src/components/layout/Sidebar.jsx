import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  DashboardOutlined,
  TeamOutlined,
  UserOutlined,
  ReadOutlined,
  BookOutlined,
  CalendarOutlined,
  CheckSquareOutlined,
  FileTextOutlined,
  BarChartOutlined,
  DollarOutlined,
  SettingOutlined,
  DownOutlined,
  ApartmentOutlined,
  ClockCircleOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined
} from '@ant-design/icons';

// Menu configurations based on role
const menuConfig = {
  admin: [
    { title: 'Dashboard', path: '/admin', icon: DashboardOutlined },
    { 
      title: 'Students', 
      icon: TeamOutlined,
      submenu: [
        { title: 'All Students', path: '/admin/students' },
        { title: 'Add Student', path: '/admin/students/add' },
        { title: 'Bulk Upload', path: '/admin/students/bulk-upload' },
      ]
    },
    { 
      title: 'Teachers', 
      icon: UserOutlined,
      submenu: [
        { title: 'All Teachers', path: '/admin/teachers' },
        { title: 'Add Teacher', path: '/admin/teachers/add' },
      ]
    },
    { 
      title: 'Academics', 
      icon: ReadOutlined,
      submenu: [
        { title: 'Departments', path: '/admin/departments' },
        { title: 'Courses', path: '/admin/courses' },
        { title: 'Semesters', path: '/admin/semesters' },
        { title: 'Sessions', path: '/admin/sessions' },
      ]
    },
    { title: 'Timetable', path: '/admin/timetable', icon: CalendarOutlined },
    { title: 'Attendance', path: '/admin/attendance', icon: CheckSquareOutlined },
    { title: 'Examinations', path: '/admin/exams', icon: FileTextOutlined },
    { title: 'Results', path: '/admin/results', icon: BarChartOutlined },
    { title: 'Fee Management', path: '/admin/fees', icon: DollarOutlined },
    { title: 'Settings', path: '/admin/settings', icon: SettingOutlined },
  ],
  student: [
    { title: 'Dashboard', path: '/student', icon: DashboardOutlined },
    { title: 'My Courses', path: '/student/courses', icon: BookOutlined },
    { title: 'Timetable', path: '/student/timetable', icon: CalendarOutlined },
    { title: 'Attendance', path: '/student/attendance', icon: CheckSquareOutlined },
    { title: 'Results', path: '/student/results', icon: BarChartOutlined },
    { title: 'Fee Status', path: '/student/fees', icon: DollarOutlined },
    { title: 'Assignments', path: '/student/assignments', icon: FileTextOutlined },
    { title: 'Settings', path: '/student/settings', icon: SettingOutlined },
  ],
  teacher: [
    { title: 'Dashboard', path: '/teacher', icon: DashboardOutlined },
    { title: 'My Classes', path: '/teacher/classes', icon: BookOutlined },
    { title: 'Timetable', path: '/teacher/timetable', icon: CalendarOutlined },
    { title: 'Attendance', path: '/teacher/attendance', icon: CheckSquareOutlined },
    { title: 'Assignments', path: '/teacher/assignments', icon: FileTextOutlined },
    { title: 'Results Entry', path: '/teacher/results', icon: BarChartOutlined },
    { title: 'Leave Requests', path: '/teacher/leave', icon: ClockCircleOutlined },
    { title: 'Settings', path: '/teacher/settings', icon: SettingOutlined },
  ],
};

const Sidebar = ({ isOpen, onClose, collapsed, onToggleCollapse }) => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState({});

  const menuItems = menuConfig[user?.role] || [];

  const toggleSubmenu = (title) => {
    setExpandedMenus(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const isActive = (path) => location.pathname === path;
  const isSubmenuActive = (submenu) => submenu?.some(item => location.pathname === item.path);

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full
          bg-[var(--bg-primary)] border-r border-[var(--border-color)]
          transform transition-all duration-300 ease-in-out
          lg:translate-x-0 lg:z-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          ${collapsed ? 'w-20' : 'w-64'}
        `}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-center border-b border-[var(--border-color)] px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">GC</span>
            </div>
            {!collapsed && (
              <div className="hidden sm:block">
                <h1 className="text-sm font-bold text-[var(--text-primary)]">Govt College</h1>
                <p className="text-xs text-[var(--text-secondary)]">Larkana</p>
              </div>
            )}
          </Link>
        </div>

        {/* Toggle Button - Desktop Only */}
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex absolute -right-3 top-[72px] w-7 h-7 bg-primary text-white rounded-full items-center justify-center shadow-lg hover:bg-primary/90 transition-all z-[60]"
        >
          {collapsed ? <MenuUnfoldOutlined className="text-[10px]" /> : <MenuFoldOutlined className="text-[10px]" />}
        </button>

        {/* Navigation */}
        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100%-4rem)]">
          {menuItems.map((item) => (
            <div key={item.title}>
              {item.submenu ? (
                // Menu with submenu
                <div>
                  <button
                    onClick={() => !collapsed && toggleSubmenu(item.title)}
                    className={`
                      w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-3 py-2.5 rounded-lg
                      text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]
                      transition-colors
                      ${isSubmenuActive(item.submenu) ? 'bg-primary/10 text-primary' : ''}
                    `}
                    title={collapsed ? item.title : ''}
                  >
                    <div className={`flex items-center ${collapsed ? '' : 'gap-3'}`}>
                      <item.icon className="text-base" />
                      {!collapsed && <span className="text-sm font-medium">{item.title}</span>}
                    </div>
                    {!collapsed && <DownOutlined className={`text-xs transform transition-transform ${expandedMenus[item.title] ? 'rotate-180' : ''}`} />}
                  </button>
                  
                  {/* Submenu */}
                  {!collapsed && expandedMenus[item.title] && (
                    <div className="ml-4 mt-1 space-y-1 border-l-2 border-[var(--border-color)] pl-4">
                      {item.submenu.map((subItem) => (
                        <Link
                          key={subItem.path}
                          to={subItem.path}
                          className={`
                            block px-3 py-2 rounded-lg text-sm
                            transition-colors
                            ${isActive(subItem.path)
                              ? 'bg-primary text-white'
                              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                            }
                          `}
                        >
                          {subItem.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                // Single menu item
                <Link
                  to={item.path}
                  className={`
                    flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-lg
                    transition-colors
                    ${isActive(item.path)
                      ? 'bg-primary text-white'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                    }
                  `}
                  title={collapsed ? item.title : ''}
                >
                  <item.icon className="text-base" />
                  {!collapsed && <span className="text-sm font-medium">{item.title}</span>}
                </Link>
              )}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
