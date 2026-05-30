import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useImpersonationStore } from '@/store/impersonationStore';

export const RoleRedirect = () => {
  const { user, role } = useAuthStore();
  const { isImpersonating } = useImpersonationStore();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Map roles to their specific dashboards
  switch (role) {
    case 'SUPER_ADMIN':
      // If impersonating, go to admin dashboard
      if (isImpersonating) {
        return <Navigate to="/admin" replace />;
      }
      return <Navigate to="/super-admin" replace />;
    case 'RESTAURANT_ADMIN':
    case 'MANAGER': // MANAGER shares the admin dashboard
      return <Navigate to="/admin" replace />;
    case 'WAITER':
      return <Navigate to="/waiter" replace />;
    case 'KITCHEN':
      return <Navigate to="/kitchen" replace />;
    case 'CASHIER':
      return <Navigate to="/admin/billing" replace />;
    case 'CUSTOMER':
      // Customers scan a QR code and are routed directly to their table.
      return <Navigate to="/unauthorized" replace />;
    default:
      return <Navigate to="/unauthorized" replace />;
  }
};

