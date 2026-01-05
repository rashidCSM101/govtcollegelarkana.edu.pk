import { Link } from 'react-router-dom';

const HomePage = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-4">
          Welcome to Government College Larkana
        </h1>
        <p className="text-xl text-[var(--text-secondary)] mb-8">
          Management System
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            to="/login"
            className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-500 transition-colors"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="px-6 py-3 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg font-medium hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            Register
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
