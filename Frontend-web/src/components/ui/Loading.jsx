// Spinner Loading
export const Spinner = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
    xl: 'w-16 h-16 border-4',
  };

  return (
    <div
      className={`${sizes[size]} border-primary border-t-transparent rounded-full animate-spin ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
};

// Full Page Loading
export const PageLoader = ({ message = 'Loading...' }) => {
  return (
    <div className="fixed inset-0 bg-[var(--bg-primary)] flex flex-col items-center justify-center z-50">
      <Spinner size="xl" />
      <p className="mt-4 text-[var(--text-secondary)] animate-pulse">{message}</p>
    </div>
  );
};

// Section Loading
export const SectionLoader = ({ message = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Spinner size="lg" />
      <p className="mt-4 text-[var(--text-secondary)]">{message}</p>
    </div>
  );
};

// Button Loading
export const ButtonLoader = ({ className = '' }) => {
  return <Spinner size="sm" className={className} />;
};

// Skeleton Loaders
export const Skeleton = ({ className = '' }) => {
  return (
    <div 
      className={`animate-pulse bg-[var(--bg-tertiary)] rounded ${className}`} 
    />
  );
};

export const SkeletonText = ({ lines = 3, className = '' }) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`} 
        />
      ))}
    </div>
  );
};

export const SkeletonCard = () => {
  return (
    <div className="p-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg">
      <Skeleton className="h-32 w-full mb-4" />
      <Skeleton className="h-4 w-3/4 mb-2" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
};

export const SkeletonTable = ({ rows = 5, cols = 4 }) => {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border-color)]">
      <div className="bg-[var(--bg-tertiary)] p-4">
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-[var(--border-color)]">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="p-4 flex gap-4">
            {Array.from({ length: cols }).map((_, colIdx) => (
              <Skeleton key={colIdx} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Spinner;
