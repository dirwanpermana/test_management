import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './useAuth';

export function PrivateRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="page-loading">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
