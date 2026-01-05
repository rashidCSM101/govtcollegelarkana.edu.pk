import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { ButtonLoader } from '../../components/ui/Loading';
import api from '../../utils/api';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const { success, error: showError } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      showError('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
      success('Password reset link sent to your email');
    } catch (err) {
      showError(err.message || 'Failed to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="w-full text-center">
        {/* Success Icon */}
        <div className="mx-auto w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
          Check Your Email
        </h2>
        <p className="text-[var(--text-secondary)] mb-6">
          We've sent a password reset link to<br />
          <span className="font-medium text-[var(--text-primary)]">{email}</span>
        </p>

        <p className="text-sm text-[var(--text-tertiary)] mb-6">
          Didn't receive the email? Check your spam folder or
        </p>

        <button
          onClick={() => {
            setSent(false);
            setEmail('');
          }}
          className="text-primary hover:text-primary-500 font-medium"
        >
          Try another email address
        </button>

        <div className="mt-8 pt-6 border-t border-[var(--border-color)]">
          <Link to="/login" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            ← Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Icon */}
      <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
        <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      </div>

      <h2 className="text-2xl font-bold text-center text-[var(--text-primary)] mb-2">
        Forgot Password?
      </h2>
      <p className="text-center text-[var(--text-secondary)] mb-8">
        No worries! Enter your email and we'll send you a reset link.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 pl-11 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              placeholder="you@example.com"
            />
            <svg className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
            </svg>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-primary text-white rounded-lg font-medium hover:bg-primary-500 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <ButtonLoader className="border-white border-t-transparent" />
              <span>Sending...</span>
            </>
          ) : (
            'Send Reset Link'
          )}
        </button>
      </form>

      {/* Back to Login */}
      <p className="mt-6 text-center">
        <Link to="/login" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Login
        </Link>
      </p>
    </div>
  );
};

export default ForgotPasswordPage;
