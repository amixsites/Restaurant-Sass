import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export const RoleRedirect = () => {
  const { user, role, restaurantId } = useAuthStore();

  console.log('[RoleRedirect - Feature] Evaluating root path redirect:', {
    userEmail: user?.email,
    userRole: role,
    restaurantId: restaurantId
  });

  if (!user) {
    console.warn('[RoleRedirect - Feature] No user session found. Redirecting to /login.');
    return <Navigate to="/login" replace />;
  }

  // Map roles to their specific dashboards
  switch (role) {
    case 'SUPER_ADMIN':
      console.log('[RoleRedirect - Feature] Redirecting Super Admin to /super-admin.');
      return <Navigate to="/super-admin" replace />;
    case 'RESTAURANT_ADMIN':
    case 'MANAGER': // MANAGER shares the admin dashboard
      console.log(`[RoleRedirect - Feature] Redirecting ${role} to /admin.`);
      return <Navigate to="/admin" replace />;
    case 'WAITER':
      console.log('[RoleRedirect - Feature] Redirecting Waiter to /waiter.');
      return <Navigate to="/waiter" replace />;
    case 'KITCHEN':
      console.log('[RoleRedirect - Feature] Redirecting Kitchen Staff to /kitchen.');
      return <Navigate to="/kitchen" replace />;
    case 'CASHIER':
      console.log('[RoleRedirect - Feature] Redirecting Cashier to /admin/billing.');
      return <Navigate to="/admin/billing" replace />;
    case 'CUSTOMER':
      console.warn('[RoleRedirect - Feature] Customers must sit at a table via QR scan. Redirecting to /unauthorized.');
      return <Navigate to="/unauthorized" replace />;
    default:
      console.warn('[RoleRedirect - Feature] Unknown or unmapped user role redirecting to /unauthorized. Role:', role);
      return <Navigate to="/unauthorized" replace />;
  }
};
