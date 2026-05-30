import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useImpersonationStore } from '@/store/impersonationStore';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, role, isLoading, isSubscriptionExpired } = useAuthStore();
  const { isImpersonating } = useImpersonationStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Handle subscription lockdown (Super Admin is completely bypassed)
  if (isSubscriptionExpired && role !== 'SUPER_ADMIN') {
    return <Navigate to="/expired" replace />;
  }

  // Handle Role-based restrictions
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // If SUPER_ADMIN is accessing /admin/* routes, ensure they are impersonating
  if (role === 'SUPER_ADMIN' && location.pathname.startsWith('/admin') && !isImpersonating) {
    return <Navigate to="/super-admin" replace />;
  }

  return <>{children}</>;
};

