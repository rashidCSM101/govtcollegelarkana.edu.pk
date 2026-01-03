import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './routes/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import TestTheme from './pages/TestTheme';
import AdminDashboard from './pages/admin/AdminDashboard';
import StudentList from './pages/admin/students/StudentList';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<TestTheme />} />
            <Route path="/test" element={<TestTheme />} />
            <Route path="/login" element={<div>Login Page</div>} />
            <Route path="/unauthorized" element={<div>Unauthorized Access</div>} />

            {/* Protected Routes - Admin */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <MainLayout>
                    <AdminDashboard />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <MainLayout>
                    <StudentList />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/teachers"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <MainLayout>
                    <div>Teacher Management</div>
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/departments"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <MainLayout>
                    <div>Department Management</div>
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/courses"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <MainLayout>
                    <div>Course Management</div>
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/semesters"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <MainLayout>
                    <div>Semester Management</div>
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/fees"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <MainLayout>
                    <div>Fee Management</div>
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/exams"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <MainLayout>
                    <div>Examination Management</div>
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/results"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <MainLayout>
                    <div>Result Processing</div>
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/certificates"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <MainLayout>
                    <div>Certificate Management</div>
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <MainLayout>
                    <div>Reports & Analytics</div>
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <MainLayout>
                    <div>System Settings</div>
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            {/* Protected Routes - Student */}
            <Route
              path="/student/*"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <div>Student Dashboard</div>
                </ProtectedRoute>
              }
            />

            {/* Protected Routes - Teacher */}
            <Route
              path="/teacher/*"
              element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <div>Teacher Dashboard</div>
                </ProtectedRoute>
              }
            />

            {/* 404 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
