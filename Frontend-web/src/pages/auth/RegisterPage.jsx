import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { ButtonLoader } from '../../components/ui/Loading';
import api from '../../utils/api';

const RegisterPage = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student',
    phone: '',
    rollNo: '',
    fatherName: '',
    departmentId: '',
    agreeTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const { success, error: showError } = useToast();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateStep1 = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    if (formData.role === 'student' && !formData.fatherName.trim()) {
      newErrors.fatherName = "Father's name is required";
    }
    if (!formData.agreeTerms) newErrors.agreeTerms = 'You must agree to the terms';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep1()) setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep2()) return;

    setLoading(true);
    try {
      const payload = {
        email: formData.email,
        password: formData.password,
        name: formData.name,
        role: formData.role,
        phone: formData.phone,
        father_name: formData.fatherName,
        roll_no: formData.rollNo,
        department_id: formData.departmentId || null,
      };
      await api.post('/auth/register', payload);
      success('Registration successful! Please check your email to verify your account.');
      navigate('/login');
    } catch (err) {
      showError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold text-center text-[var(--text-primary)] mb-2">
        Create Account
      </h2>
      <p className="text-center text-[var(--text-secondary)] mb-6">
        {step === 1 ? 'Enter your basic information' : 'Complete your profile'}
      </p>

      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 1 ? 'bg-primary text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]'}`}>1</div>
          <div className={`w-16 h-1 mx-2 ${step >= 2 ? 'bg-primary' : 'bg-[var(--bg-tertiary)]'}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 2 ? 'bg-primary text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]'}`}>2</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {step === 1 ? (
          <>
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Full Name</label>
              <input name="name" type="text" value={formData.name} onChange={handleChange}
                className={`w-full px-4 py-3 rounded-lg border ${errors.name ? 'border-error' : 'border-[var(--border-color)]'} bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:border-primary`}
                placeholder="John Doe" />
              {errors.name && <p className="mt-1 text-xs text-error">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Email Address</label>
              <input name="email" type="email" value={formData.email} onChange={handleChange}
                className={`w-full px-4 py-3 rounded-lg border ${errors.email ? 'border-error' : 'border-[var(--border-color)]'} bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:border-primary`}
                placeholder="you@example.com" />
              {errors.email && <p className="mt-1 text-xs text-error">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Password</label>
              <div className="relative">
                <input name="password" type={showPassword ? 'text' : 'password'} value={formData.password} onChange={handleChange}
                  className={`w-full px-4 py-3 pr-11 rounded-lg border ${errors.password ? 'border-error' : 'border-[var(--border-color)]'} bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:border-primary`}
                  placeholder="Min 8 characters" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-[var(--text-tertiary)]">
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-error">{errors.password}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Confirm Password</label>
              <input name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange}
                className={`w-full px-4 py-3 rounded-lg border ${errors.confirmPassword ? 'border-error' : 'border-[var(--border-color)]'} bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:border-primary`}
                placeholder="Repeat password" />
              {errors.confirmPassword && <p className="mt-1 text-xs text-error">{errors.confirmPassword}</p>}
            </div>

            <button type="button" onClick={handleNext}
              className="w-full py-3 px-4 bg-primary text-white rounded-lg font-medium hover:bg-primary-500 transition-colors">
              Continue
            </button>
          </>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">I am a</label>
              <div className="grid grid-cols-2 gap-3">
                {['student', 'teacher'].map((role) => (
                  <button key={role} type="button" onClick={() => setFormData(prev => ({ ...prev, role }))}
                    className={`py-3 px-4 rounded-lg border-2 font-medium capitalize transition-colors ${
                      formData.role === role ? 'border-primary bg-primary/10 text-primary' : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--text-tertiary)]'
                    }`}>
                    {role}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Phone Number</label>
              <input name="phone" type="tel" value={formData.phone} onChange={handleChange}
                className={`w-full px-4 py-3 rounded-lg border ${errors.phone ? 'border-error' : 'border-[var(--border-color)]'} bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:border-primary`}
                placeholder="03XX-XXXXXXX" />
              {errors.phone && <p className="mt-1 text-xs text-error">{errors.phone}</p>}
            </div>

            {formData.role === 'student' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Father's Name</label>
                  <input name="fatherName" type="text" value={formData.fatherName} onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-lg border ${errors.fatherName ? 'border-error' : 'border-[var(--border-color)]'} bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:border-primary`}
                    placeholder="Father's full name" />
                  {errors.fatherName && <p className="mt-1 text-xs text-error">{errors.fatherName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Roll Number (Optional)</label>
                  <input name="rollNo" type="text" value={formData.rollNo} onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:border-primary"
                    placeholder="If already assigned" />
                </div>
              </>
            )}

            <div>
              <label className="flex items-start gap-2">
                <input type="checkbox" name="agreeTerms" checked={formData.agreeTerms} onChange={handleChange}
                  className="w-4 h-4 mt-0.5 rounded border-[var(--border-color)] text-primary focus:ring-primary" />
                <span className="text-sm text-[var(--text-secondary)]">
                  I agree to the <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link> and <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                </span>
              </label>
              {errors.agreeTerms && <p className="mt-1 text-xs text-error">{errors.agreeTerms}</p>}
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(1)}
                className="flex-1 py-3 px-4 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg font-medium hover:bg-[var(--bg-tertiary)] transition-colors">
                Back
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 py-3 px-4 bg-primary text-white rounded-lg font-medium hover:bg-primary-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                {loading ? (<><ButtonLoader className="border-white border-t-transparent" /><span>Creating...</span></>) : 'Create Account'}
              </button>
            </div>
          </>
        )}
      </form>

      <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
        Already have an account? <Link to="/login" className="text-primary hover:text-primary-500 font-medium">Sign in</Link>
      </p>
    </div>
  );
};

export default RegisterPage;
