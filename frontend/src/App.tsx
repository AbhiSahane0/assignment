import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import OrgChart from './pages/OrgChart';
import Profile from './pages/Profile';

function Home() {
  // Employees land on their profile; admins/HR land on the dashboard
  const { user } = useAuth();
  return user?.role === 'EMPLOYEE' ? <Navigate to="/profile" replace /> : <Dashboard />;
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Home />} />
                <Route path="/organization" element={<OrgChart />} />
                <Route path="/profile" element={<Profile />} />
                <Route element={<ProtectedRoute roles={['SUPER_ADMIN', 'HR_MANAGER']} />}>
                  <Route path="/employees" element={<Employees />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
