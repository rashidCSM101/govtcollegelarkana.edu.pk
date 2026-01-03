import ThemeToggle from '../components/ThemeToggle';
import { useTheme } from '../context/ThemeContext';

const TestTheme = () => {
  const { theme } = useTheme();

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <header className="shadow-md" style={{ backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-light)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
            Government College Larkana
          </h1>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            Theme System Test
          </h2>
          <p className="text-xl" style={{ color: 'var(--text-secondary)' }}>
            Current theme: <span className="font-semibold capitalize">{theme}</span>
          </p>
        </div>

        {/* Color Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {/* Primary Color */}
          <div className="rounded-lg p-6 shadow-md" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
            <div className="w-full h-20 rounded mb-4" style={{ backgroundColor: 'var(--color-primary)' }}></div>
            <h3 className="font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Primary</h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>#21CCEE</p>
          </div>

          {/* Primary Light */}
          <div className="rounded-lg p-6 shadow-md" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
            <div className="w-full h-20 rounded mb-4" style={{ backgroundColor: 'var(--color-primary-light)' }}></div>
            <h3 className="font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Primary Light</h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>#A5F0FC</p>
          </div>

          {/* Primary Super Light */}
          <div className="rounded-lg p-6 shadow-md" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
            <div className="w-full h-20 rounded mb-4 border" style={{ backgroundColor: 'var(--color-primary-super-light)', borderColor: 'var(--border-medium)' }}></div>
            <h3 className="font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Primary Super Light</h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>#ECFDFF</p>
          </div>

          {/* Success */}
          <div className="rounded-lg p-6 shadow-md" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
            <div className="w-full h-20 rounded mb-4" style={{ backgroundColor: 'var(--color-success)' }}></div>
            <h3 className="font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Success</h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>#4DDB62</p>
          </div>

          {/* Warning */}
          <div className="rounded-lg p-6 shadow-md" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
            <div className="w-full h-20 rounded mb-4" style={{ backgroundColor: 'var(--color-warning)' }}></div>
            <h3 className="font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Warning</h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>#FFBF66</p>
          </div>

          {/* Error */}
          <div className="rounded-lg p-6 shadow-md" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
            <div className="w-full h-20 rounded mb-4" style={{ backgroundColor: 'var(--color-error)' }}></div>
            <h3 className="font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Error</h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>#E64F4F</p>
          </div>
        </div>

        {/* Buttons Demo */}
        <div className="rounded-lg p-8 shadow-md mb-12" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
          <h3 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>Button Examples</h3>
          <div className="flex flex-wrap gap-4">
            <button className="px-6 py-3 rounded-lg font-semibold transition-all" style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
              Primary Button
            </button>
            <button className="px-6 py-3 rounded-lg font-semibold transition-all" style={{ backgroundColor: 'var(--color-success)', color: 'white' }}>
              Success Button
            </button>
            <button className="px-6 py-3 rounded-lg font-semibold transition-all" style={{ backgroundColor: 'var(--color-warning)', color: 'white' }}>
              Warning Button
            </button>
            <button className="px-6 py-3 rounded-lg font-semibold transition-all" style={{ backgroundColor: 'var(--color-error)', color: 'white' }}>
              Error Button
            </button>
            <button className="px-6 py-3 rounded-lg font-semibold transition-all" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)' }}>
              Outline Button
            </button>
          </div>
        </div>

        {/* Status Messages */}
        <div className="space-y-4">
          <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--color-success)', color: 'white' }}>
            <p className="font-semibold">✓ Success: Operation completed successfully!</p>
          </div>
          <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--color-warning)', color: 'white' }}>
            <p className="font-semibold">⚠ Warning: Please check your input.</p>
          </div>
          <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--color-error)', color: 'white' }}>
            <p className="font-semibold">✕ Error: Something went wrong.</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TestTheme;
