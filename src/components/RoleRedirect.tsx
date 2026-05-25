import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export const RoleRedirect = () => {
  const { user, role } = useAuthStore();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Map roles to their specific dashboards
  switch (role) {
    case 'SUPER_ADMIN':
      return <Navigate to="/super-admin" replace />;
    case 'RESTAURANT_ADMIN':
      return <Navigate to="/admin" replace />;
    case 'MANAGER':
      return <Navigate to="/manager" replace />;
    case 'WAITER':
      return <Navigate to="/waiter" replace />;
    case 'KITCHEN':
      return <Navigate to="/kitchen" replace />;
    case 'CASHIER':
      // Currently billing routes are under /admin/billing for Cashiers
      return <Navigate to="/admin/billing" replace />;
    case 'CUSTOMER':
      // Customers usually don't log in through this general flow, 
      // they scan a QR code and are routed directly to their table.
      return <Navigate to="/unauthorized" replace />;
    default:
      return <Navigate to="/unauthorized" replace />;
  }
};
