import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[var(--bg-primary)] border-t border-[var(--border-color)] py-4 px-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-sm text-[var(--text-secondary)]">
          © {currentYear} Government College Larkana. All rights reserved.
        </p>
        
        <div className="flex items-center gap-6">
          <Link 
            to="/privacy" 
            className="text-sm text-[var(--text-secondary)] hover:text-primary transition-colors"
          >
            Privacy Policy
          </Link>
          <Link 
            to="/terms" 
            className="text-sm text-[var(--text-secondary)] hover:text-primary transition-colors"
          >
            Terms of Service
          </Link>
          <Link 
            to="/help" 
            className="text-sm text-[var(--text-secondary)] hover:text-primary transition-colors"
          >
            Help Center
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
