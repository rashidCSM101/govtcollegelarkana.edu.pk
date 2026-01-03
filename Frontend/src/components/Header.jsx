import { useState } from 'react';
import { FiSearch, FiBell, FiMail, FiUser, FiSettings, FiLogOut, FiMenu } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import { useNavigate } from 'react-router-dom';

const Header = ({ onMenuClick, sidebarCollapsed }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const notifications = [
    { id: 1, title: 'New student admission', time: '5 min ago', unread: true },
    { id: 2, title: 'Fee payment received', time: '1 hour ago', unread: true },
    { id: 3, title: 'Exam schedule updated', time: '2 hours ago', unread: false },
  ];

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <header 
      className={`fixed top-0 right-0 z-30 transition-all duration-300 ${
        sidebarCollapsed ? 'left-20' : 'left-64'
      }`}
      style={{ 
        backgroundColor: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-light)'
      }}
    >
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left Section - Search */}
        <div className="flex items-center space-x-4 flex-1">
          <button 
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            style={{ color: 'var(--text-primary)' }}
          >
            <FiMenu size={20} />
          </button>
          
          <div className="hidden md:flex items-center flex-1 max-w-md">
            <div className="relative w-full">
              <FiSearch 
                className="absolute left-3 top-1/2 transform -translate-y-1/2" 
                style={{ color: 'var(--text-light)' }}
                size={18}
              />
              <input
                type="text"
                placeholder="Search anything..."
                className="w-full pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  borderColor: 'var(--border-light)',
                  border: '1px solid'
                }}
              />
            </div>
          </div>
        </div>

        {/* Right Section - Actions */}
        <div className="flex items-center space-x-3">
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Messages */}
          <button 
            className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            style={{ color: 'var(--text-primary)' }}
          >
            <FiMail size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-error)' }}></span>
          </button>

          {/* Notifications */}
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              style={{ color: 'var(--text-primary)' }}
            >
              <FiBell size={20} />
              {unreadCount > 0 && (
                <span 
                  className="absolute top-0 right-0 w-5 h-5 rounded-full text-xs text-white flex items-center justify-center"
                  style={{ backgroundColor: 'var(--color-error)' }}
                >
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div 
                className="absolute right-0 mt-2 w-80 rounded-lg shadow-lg overflow-hidden"
                style={{ 
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-light)'
                }}
              >
                <div className="p-4 border-b" style={{ borderColor: 'var(--border-light)' }}>
                  <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Notifications</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.map(notif => (
                    <div 
                      key={notif.id}
                      className="p-4 border-b hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                      style={{ borderColor: 'var(--border-light)' }}
                    >
                      <div className="flex items-start space-x-3">
                        {notif.unread && (
                          <div className="w-2 h-2 rounded-full mt-2" style={{ backgroundColor: 'var(--color-primary)' }}></div>
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {notif.title}
                          </p>
                          <p className="text-xs mt-1" style={{ color: 'var(--text-light)' }}>
                            {notif.time}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 text-center border-t" style={{ borderColor: 'var(--border-light)' }}>
                  <button className="text-sm font-medium" style={{ color: 'var(--color-primary)' }}>
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-primary)' }}>
                <span className="text-white text-sm font-semibold">
                  {user?.name?.charAt(0) || 'A'}
                </span>
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {user?.name || 'Admin User'}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-light)' }}>
                  {user?.role || 'Administrator'}
                </p>
              </div>
            </button>

            {/* Profile Dropdown */}
            {showProfileMenu && (
              <div 
                className="absolute right-0 mt-2 w-56 rounded-lg shadow-lg overflow-hidden"
                style={{ 
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-light)'
                }}
              >
                <div className="p-4 border-b" style={{ borderColor: 'var(--border-light)' }}>
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {user?.name || 'Admin User'}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text-light)' }}>
                    {user?.email || 'admin@gcl.edu.pk'}
                  </p>
                </div>
                <div className="py-2">
                  <button className="w-full px-4 py-2 text-left flex items-center space-x-3 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <FiUser size={16} style={{ color: 'var(--text-secondary)' }} />
                    <span style={{ color: 'var(--text-primary)' }}>My Profile</span>
                  </button>
                  <button className="w-full px-4 py-2 text-left flex items-center space-x-3 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <FiSettings size={16} style={{ color: 'var(--text-secondary)' }} />
                    <span style={{ color: 'var(--text-primary)' }}>Settings</span>
                  </button>
                </div>
                <div className="border-t" style={{ borderColor: 'var(--border-light)' }}>
                  <button 
                    onClick={handleLogout}
                    className="w-full px-4 py-3 text-left flex items-center space-x-3 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <FiLogOut size={16} style={{ color: 'var(--color-error)' }} />
                    <span style={{ color: 'var(--color-error)' }}>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
