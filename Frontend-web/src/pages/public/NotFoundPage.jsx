const NotFoundPage = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12 text-center">
      <h1 className="text-4xl font-bold text-theme mb-4">
        404 - Page Not Found
      </h1>
      <p className="text-xl text-theme-secondary mb-8">
        The page you're looking for doesn't exist.
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

export default NotFoundPage;
