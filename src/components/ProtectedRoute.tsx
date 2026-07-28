import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { FullPageLoading } from './Feedback';
import { useAuth } from '@/lib/auth-context';

// Guards all dashboard routes. While the auth state is still loading, we show
// a loading screen. Once resolved, unauthenticated users are redirected to
// the login page (preserving where they were trying to go), and authenticated
// users see the protected layout.
export function ProtectedRoute() {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <FullPageLoading label="Verifying your session…" />;
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
