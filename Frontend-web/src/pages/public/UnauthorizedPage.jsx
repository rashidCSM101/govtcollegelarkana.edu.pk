const UnauthorizedPage = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12 text-center">
      <h1 className="text-4xl font-bold text-error mb-4">
        403 - Unauthorized
      </h1>
      <p className="text-xl text-theme-secondary mb-8">
        You don't have permission to access this page.
      </p>
      <a
        href="/"
        className="btn btn-primary"
      >
        Go Home
      </a>
    </div>
  );
};

export default UnauthorizedPage;
