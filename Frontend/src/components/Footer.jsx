const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer 
      className="py-6 px-6 border-t"
      style={{ 
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-light)'
      }}
    >
      <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
        <div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            © {currentYear} Government College Larkana. All rights reserved.
          </p>
        </div>
        <div className="flex space-x-6">
          <a 
            href="#" 
            className="text-sm hover:underline"
            style={{ color: 'var(--text-secondary)' }}
          >
            Privacy Policy
          </a>
          <a 
            href="#" 
            className="text-sm hover:underline"
            style={{ color: 'var(--text-secondary)' }}
          >
            Terms of Service
          </a>
          <a 
            href="#" 
            className="text-sm hover:underline"
            style={{ color: 'var(--text-secondary)' }}
          >
            Contact Support
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
