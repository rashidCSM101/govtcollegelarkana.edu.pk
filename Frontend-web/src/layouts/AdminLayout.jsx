import { Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';

const AdminLayout = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-theme-secondary transition-colors duration-300">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-dark text-white">
        <div className="p-6 border-b border-dark-700">
          <h2 className="text-xl font-bold text-primary">Admin Panel</h2>
          <p className="text-sm text-gray-400 mt-1">{user?.name}</p>
        </div>
        
        {/* Navigation will be added later */}
        <nav className="mt-6 px-3">
          {/* Nav items placeholder */}
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-dark-700">
          <button
            onClick={logout}
            className="w-full px-4 py-2 text-sm text-white bg-error rounded-lg hover:bg-error-500 transition-colors"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="ml-64 min-h-screen">
        {/* Header */}
        <header className="bg-theme border-b border-theme shadow-theme-sm">
          <div className="px-6 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-theme">Dashboard</h1>
            <ThemeToggle />
          </div>
        </header>

        {/* Content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
