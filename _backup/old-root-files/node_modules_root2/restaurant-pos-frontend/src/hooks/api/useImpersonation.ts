import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useImpersonationStore } from '@/store/impersonationStore';
import { useAuthStore } from '@/store/authStore';
import { useTenantStore } from '@/store/tenantStore';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

// ── Start Impersonation ─────────────────────────────────────────────────────
export const useStartImpersonation = () => {
  const navigate = useNavigate();
  const { startImpersonation } = useImpersonationStore();
  const { setAuth, session, user, role } = useAuthStore();
  const { setTenant } = useTenantStore();

  return useMutation({
    mutationFn: async ({ restaurantId, restaurantName }: { restaurantId: string; restaurantName: string }) => {
      // Get current session for auth header
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) throw new Error('Not authenticated');

      // Log the impersonation to the audit_logs table via Supabase (RLS enforced)
      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert({
          super_admin_id: currentSession.user.id,
          super_admin_email: currentSession.user.email || '',
          restaurant_id: restaurantId,
          restaurant_name: restaurantName,
          action: 'IMPERSONATE_START',
          ip_address: null, // Will be captured server-side if needed
          user_agent: navigator.userAgent,
        });

      if (auditError) {
        console.error('Failed to create audit log:', auditError);
        // Don't block impersonation if audit log fails, but log it
      }

      return { restaurantId, restaurantName };
    },
    onSuccess: ({ restaurantId, restaurantName }) => {
      // 1. Set impersonation state
      startImpersonation(restaurantId, restaurantName);

      // 2. Update tenant store with impersonated restaurant
      setTenant(restaurantId, restaurantName);

      // 3. Update auth store to set the restaurantId context
      setAuth({
        session,
        user,
        role,
        restaurantId,
        isSubscriptionExpired: false, // Super Admin bypasses subscription
      });

      toast({
        title: 'Impersonation Started',
        description: `Now viewing as ${restaurantName} admin.`,
      });

      // 4. Navigate to admin dashboard
      navigate('/admin');
    },
    onError: (error: Error) => {
      toast({
        title: 'Impersonation Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

// ── End Impersonation ───────────────────────────────────────────────────────
export const useEndImpersonation = () => {
  const navigate = useNavigate();
  const { impersonatedRestaurantId, impersonatedRestaurantName, endImpersonation } = useImpersonationStore();
  const { setAuth, session, user, role } = useAuthStore();
  const { clearTenant } = useTenantStore();

  return useMutation({
    mutationFn: async () => {
      // Log the end of impersonation
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) throw new Error('Not authenticated');

      if (impersonatedRestaurantId) {
        const { error: auditError } = await supabase
          .from('audit_logs')
          .insert({
            super_admin_id: currentSession.user.id,
            super_admin_email: currentSession.user.email || '',
            restaurant_id: impersonatedRestaurantId,
            restaurant_name: impersonatedRestaurantName || 'Unknown',
            action: 'IMPERSONATE_END',
            ip_address: null,
            user_agent: navigator.userAgent,
          });

        if (auditError) {
          console.error('Failed to create audit log:', auditError);
        }
      }

      return true;
    },
    onSuccess: () => {
      // 1. Clear impersonation state
      endImpersonation();

      // 2. Clear tenant store
      clearTenant();

      // 3. Reset auth store restaurantId to null (Super Admin has no restaurant)
      setAuth({
        session,
        user,
        role,
        restaurantId: null,
        isSubscriptionExpired: false,
      });

      toast({
        title: 'Impersonation Ended',
        description: 'Returned to Super Admin view.',
      });

      // 4. Navigate back to super admin
      navigate('/super-admin');
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

// ── Fetch Audit Logs ────────────────────────────────────────────────────────
export const useAuditLogs = (page: number = 1, limit: number = 20, restaurantFilter?: string) => {
  return useQuery({
    queryKey: ['audit-logs', page, limit, restaurantFilter],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (restaurantFilter) {
        query = query.eq('restaurant_id', restaurantFilter);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        logs: data || [],
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      };
    },
  });
};
