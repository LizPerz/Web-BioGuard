import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context';
import { LoadingSpinner } from '../components/ui';

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingSpinner />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
