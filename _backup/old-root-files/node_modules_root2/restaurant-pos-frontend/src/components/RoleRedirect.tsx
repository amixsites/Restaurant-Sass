import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useImpersonationStore } from '@/store/impersonationStore';

export const RoleRedirect = () => {
  const { user, role, restaurantId } = useAuthStore();
  const { isImpersonating } = useImpersonationStore();

  console.log('[RoleRedirect] Evaluating root path redirect:', {
    userEmail: user?.email,
    userRole: role,
    restaurantId: restaurantId,
    isImpersonating: isImpersonating
  });

  if (!user) {
    console.warn('[RoleRedirect] No user session found. Redirecting to /login.');
    return <Navigate to="/login" replace />;
  }

  // Map roles to their specific dashboards
  switch (role) {
    case 'SUPER_ADMIN':
      if (isImpersonating) {
        console.log('[RoleRedirect] Super Admin is impersonating a tenant. Redirecting to /admin.');
        return <Navigate to="/admin" replace />;
      }
      console.log('[RoleRedirect] Redirecting Super Admin to /super-admin.');
      return <Navigate to="/super-admin" replace />;
    case 'RESTAURANT_ADMIN':
    case 'MANAGER': // MANAGER shares the admin dashboard
      console.log(`[RoleRedirect] Redirecting ${role} to /admin.`);
      return <Navigate to="/admin" replace />;
    case 'WAITER':
      console.log('[RoleRedirect] Redirecting Waiter to /waiter.');
      return <Navigate to="/waiter" replace />;
    case 'KITCHEN':
      console.log('[RoleRedirect] Redirecting Kitchen Staff to /kitchen.');
      return <Navigate to="/kitchen" replace />;
    case 'CASHIER':
      console.log('[RoleRedirect] Redirecting Cashier to /admin/billing.');
      return <Navigate to="/admin/billing" replace />;
    case 'CUSTOMER':
      // Customers scan a QR code and are routed directly to their table.
      return <Navigate to="/unauthorized" replace />;
    default:
      console.warn('[RoleRedirect] Unknown or unmapped user role redirecting to /unauthorized. Role:', role);
      return <Navigate to="/unauthorized" replace />;
  }
};

