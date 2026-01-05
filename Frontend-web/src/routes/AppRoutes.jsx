import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';

// Layouts
import MainLayout from '../layouts/MainLayout';
import AuthLayout from '../layouts/AuthLayout';
import { DashboardLayout } from '../layouts';

// Public Pages
import HomePage from '../pages/public/HomePage';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import UnauthorizedPage from '../pages/public/UnauthorizedPage';
import NotFoundPage from '../pages/public/NotFoundPage';

// Dashboard Pages
import AdminDashboard from '../pages/admin/AdminDashboard';
import StudentDashboard from '../pages/student/StudentDashboard';
import TeacherDashboard from '../pages/teacher/TeacherDashboard';

// Admin - Student Management
import AllStudents from '../pages/admin/students/AllStudents';
import AddStudent from '../pages/admin/students/AddStudent';
import EditStudent from '../pages/admin/students/EditStudent';
import StudentDetails from '../pages/admin/students/StudentDetails';
import BulkUploadStudents from '../pages/admin/students/BulkUploadStudents';

// Admin - Teacher Management
import AllTeachers from '../pages/admin/teachers/AllTeachers';

// Admin - Academics
import Departments from '../pages/admin/academics/Departments';
import Courses from '../pages/admin/academics/Courses';

// Admin - Fee Management
import FeeManagement from '../pages/admin/fees/FeeManagement';

// Admin - Examinations
import Examinations from '../pages/admin/exams/Examinations';

// Admin - Results
import ResultProcessing from '../pages/admin/results/ResultProcessing';

// Admin - Certificates
import CertificateManagement from '../pages/admin/certificates/CertificateManagement';

// Admin - Reports & Settings
import Reports from '../pages/admin/reports/Reports';
import Settings from '../pages/admin/settings/Settings';

const AppRoutes = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route 
          path="/login" 
          element={<LoginPage />}
        />
        <Route 
          path="/register" 
          element={<RegisterPage />} 
        />
        <Route 
          path="/forgot-password" 
          element={<ForgotPasswordPage />} 
        />
      </Route>

      {/* Admin Routes */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        
        {/* Student Management */}
        <Route path="students" element={<AllStudents />} />
        <Route path="students/add" element={<AddStudent />} />
        <Route path="students/edit/:id" element={<EditStudent />} />
        <Route path="students/:id" element={<StudentDetails />} />
        <Route path="students/bulk-upload" element={<BulkUploadStudents />} />
        
        {/* Teacher Management */}
        <Route path="teachers" element={<AllTeachers />} />
        
        {/* Academics */}
        <Route path="departments" element={<Departments />} />
        <Route path="courses" element={<Courses />} />
        
        {/* Fee Management */}
        <Route path="fees" element={<FeeManagement />} />
        
        {/* Examinations */}
        <Route path="exams" element={<Examinations />} />
        
        {/* Results */}
        <Route path="results" element={<ResultProcessing />} />
        
        {/* Certificates */}
        <Route path="certificates" element={<CertificateManagement />} />
        
        {/* Reports & Settings */}
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Student Routes */}
      <Route
        path="/student/*"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<StudentDashboard />} />
        {/* More student routes will be added here */}
      </Route>

      {/* Teacher Routes */}
      <Route
        path="/teacher/*"
        element={
          <ProtectedRoute allowedRoles={['teacher']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<TeacherDashboard />} />
        {/* More teacher routes will be added here */}
      </Route>
    </Routes>
  );
};

export default AppRoutes;
