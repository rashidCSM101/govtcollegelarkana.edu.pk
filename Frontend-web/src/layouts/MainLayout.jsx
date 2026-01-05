import { Outlet } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const MainLayout = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] transition-colors duration-300">
      {/* Header */}
      <header className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">
            Government College Larkana
          </h1>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="bg-[var(--bg-primary)] min-h-[calc(100vh-140px)]">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-[var(--bg-secondary)] border-t border-[var(--border-color)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-[var(--text-secondary)] text-sm">
            © 2024 Government College Larkana. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
