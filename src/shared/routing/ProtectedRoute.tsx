import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import { LoadingState } from '@/shared/ui/LoadingState';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Waits for auth to resolve, then allows the route or redirects to /auth?next=...
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <LoadingState message="Checking session..." className="min-h-screen" />
      </div>
    );
  }

  if (!user) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/auth?next=${encodeURIComponent(next)}`} replace />;
  }

  return <>{children}</>;
}
