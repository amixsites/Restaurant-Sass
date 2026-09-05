import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, role, isLoading, isSubscriptionExpired, restaurantId } = useAuthStore() as any;
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  console.log('[ProtectedRoute - Feature] Evaluating route access:', {
    path: location.pathname,
    hasUser: !!user,
    userEmail: user?.email,
    userRole: role,
    restaurantId: restaurantId,
    allowedRolesForRoute: allowedRoles,
    isSubscriptionExpired: isSubscriptionExpired
  });

  if (!user) {
    console.warn('[ProtectedRoute - Feature] Redirecting to /login: No authenticated user session.');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Handle subscription lockdown (Super Admin is completely bypassed)
  if (isSubscriptionExpired && role !== 'SUPER_ADMIN') {
    console.warn('[ProtectedRoute - Feature] Redirecting to /expired: Subscription has expired for tenant restaurant.', {
      restaurantId: restaurantId,
      userRole: role
    });
    return <Navigate to="/expired" replace />;
  }

  // Handle Role-based restrictions
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    console.warn('[ProtectedRoute - Feature] Redirecting to /unauthorized: Role validation failed.', {
      userRole: role,
      allowedRoles: allowedRoles,
      reason: `User role "${role}" is not authorized for allowed roles: [${allowedRoles.join(', ')}] on route "${location.pathname}"`
    });
    return <Navigate to="/unauthorized" replace />;
  }

  console.log('[ProtectedRoute - Feature] Authorization Decision: ACCESS GRANTED.', {
    userEmail: user.email,
    role: role,
    path: location.pathname
  });

  return <>{children}</>;
};
