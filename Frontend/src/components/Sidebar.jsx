import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  FiHome, FiUsers, FiBookOpen, FiDollarSign, FiFileText, 
  FiSettings, FiAward, FiBarChart2, FiCalendar, FiLayers,
  FiChevronLeft, FiChevronRight 
} from 'react-icons/fi';
import { HiOutlineAcademicCap } from 'react-icons/hi2';

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { path: '/admin', icon: FiHome, label: 'Dashboard', exact: true },
    { 
      label: 'Academic', 
      isSection: true,
      items: [
        { path: '/admin/students', icon: FiUsers, label: 'Students' },
        { path: '/admin/teachers', icon: HiOutlineAcademicCap, label: 'Teachers' },
        { path: '/admin/departments', icon: FiLayers, label: 'Departments' },
        { path: '/admin/courses', icon: FiBookOpen, label: 'Courses' },
        { path: '/admin/semesters', icon: FiCalendar, label: 'Semesters' },
      ]
    },
    {
      label: 'Management',
      isSection: true,
      items: [
        { path: '/admin/fees', icon: FiDollarSign, label: 'Fee Management' },
        { path: '/admin/exams', icon: FiFileText, label: 'Examinations' },
        { path: '/admin/results', icon: FiAward, label: 'Results' },
        { path: '/admin/certificates', icon: FiAward, label: 'Certificates' },
      ]
    },
    {
      label: 'System',
      isSection: true,
      items: [
        { path: '/admin/reports', icon: FiBarChart2, label: 'Reports & Analytics' },
        { path: '/admin/settings', icon: FiSettings, label: 'Settings' },
      ]
    }
  ];

  return (
    <aside 
      className={`fixed left-0 top-0 h-screen transition-all duration-300 z-40 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
      style={{ 
        backgroundColor: 'var(--bg-dark)',
        borderRight: '1px solid var(--border-light)'
      }}
    >
      {/* Logo Section */}
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border-light)' }}>
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-primary)' }}>
              <HiOutlineAcademicCap className="text-white text-xl" />
            </div>
            <div>
              <h2 className="text-sm font-bold" style={{ color: 'var(--text-white)' }}>GC Larkana</h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Admin Panel</p>
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-lg hover:bg-gray-700 transition-colors"
          style={{ color: 'var(--text-white)' }}
        >
          {collapsed ? <FiChevronRight size={20} /> : <FiChevronLeft size={20} />}
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="p-2 overflow-y-auto h-[calc(100vh-80px)]">
        {menuItems.map((item, index) => {
          if (item.isSection) {
            return (
              <div key={index} className="mb-4">
                {!collapsed && (
                  <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    {item.label}
                  </p>
                )}
                {item.items.map((subItem, subIndex) => (
                  <NavLink
                    key={subIndex}
                    to={subItem.path}
                    className={({ isActive }) =>
                      `flex items-center space-x-3 px-4 py-3 rounded-lg mb-1 transition-all ${
                        isActive 
                          ? 'bg-primary text-white' 
                          : 'hover:bg-gray-700'
                      }`
                    }
                    style={({ isActive }) => ({
                      backgroundColor: isActive ? 'var(--color-primary)' : 'transparent',
                      color: isActive ? 'white' : 'var(--text-white)'
                    })}
                    title={collapsed ? subItem.label : ''}
                  >
                    <subItem.icon size={20} />
                    {!collapsed && <span className="text-sm font-medium">{subItem.label}</span>}
                  </NavLink>
                ))}
              </div>
            );
          }

          return (
            <NavLink
              key={index}
              to={item.path}
              end={item.exact}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-lg mb-1 transition-all ${
                  isActive 
                    ? 'bg-primary text-white' 
                    : 'hover:bg-gray-700'
                }`
              }
              style={({ isActive }) => ({
                backgroundColor: isActive ? 'var(--color-primary)' : 'transparent',
                color: isActive ? 'white' : 'var(--text-white)'
              })}
              title={collapsed ? item.label : ''}
            >
              <item.icon size={20} />
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
