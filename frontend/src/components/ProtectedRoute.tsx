import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';

/**
 * Blocks unauthenticated users (→ /login). When `roles` is given, users
 * outside those roles are redirected to their profile page.
 */
export default function ProtectedRoute({ roles }: { roles?: Role[] }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/profile" replace />;
  return <Outlet />;
}
