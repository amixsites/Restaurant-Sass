import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore, UserRole } from '@/store/authStore';
import { useTenantStore } from '@/store/tenantStore';
import { useImpersonationStore } from '@/store/impersonationStore';
import { Loader2 } from 'lucide-react';
import { Session } from '@supabase/supabase-js';
import { toast } from '@/hooks/use-toast';

const SUPER_ADMIN_EMAILS = ['amixsites@gmail.com', 'amixsites1@gmail.com', 'riyaans@platform', 'testadmin@gmail.com', 'botadmin-test@gmail.com'];

const isSuperAdminEmail = (email: string | undefined): boolean => {
  if (!email) return false;
  const lowerEmail = email.toLowerCase().trim();
  return (
    SUPER_ADMIN_EMAILS.includes(lowerEmail) ||
    lowerEmail.includes('superadmin') ||
    lowerEmail.startsWith('system@') ||
    lowerEmail === 'admin@system.com'
  );
};

// Helper function to map case-insensitive database roles to the expected frontend UserRole types
const mapDbRoleToFrontendRole = (dbRole: string | null, restaurantId: string | null, email: string | undefined): UserRole => {
  if (!dbRole) {
    console.warn('[AuthInitializer] Profile role is empty. Defaulting to CUSTOMER.');
    return 'CUSTOMER';
  }
  const roleUpper = dbRole.toUpperCase().trim();
  
  if (roleUpper === 'SUPER_ADMIN' || roleUpper === 'SUPERADMIN') {
    return 'SUPER_ADMIN';
  }
  
  if (roleUpper === 'ADMIN') {
    // If user has email in Super Admin list, they are SUPER_ADMIN (global system admin)
    // Otherwise, they are a RESTAURANT_ADMIN managing their restaurant space
    const resolvedRole = isSuperAdminEmail(email) ? 'SUPER_ADMIN' : 'RESTAURANT_ADMIN';
    console.log(`[AuthInitializer] Mapping role 'ADMIN' with email '${email}' and restaurantId '${restaurantId}' -> resolved role: ${resolvedRole}`);
    return resolvedRole;
  }
  
  if (roleUpper === 'RESTAURANT_ADMIN' || roleUpper === 'RESTAURANTADMIN') {
    return 'RESTAURANT_ADMIN';
  }
  
  if (roleUpper === 'MANAGER') {
    return 'MANAGER';
  }
  
  if (roleUpper === 'WAITER' || roleUpper === 'STAFF') {
    return 'WAITER';
  }
  
  if (roleUpper === 'KITCHEN') {
    return 'KITCHEN';
  }
  
  if (roleUpper === 'CASHIER') {
    return 'CASHIER';
  }
  
  if (roleUpper === 'CUSTOMER') {
    return 'CUSTOMER';
  }
  
  console.warn(`[AuthInitializer] Unknown role from database: '${dbRole}'. Defaulting to CUSTOMER.`);
  return 'CUSTOMER';
};

export const AuthInitializer = ({ children }: { children: React.ReactNode }) => {
  const { isInitialized, setAuth, resetAuth } = useAuthStore();
  const { setTenant, clearTenant } = useTenantStore();
  const { restoreFromSession, endImpersonation } = useImpersonationStore();

  useEffect(() => {
    const fetchProfileAndSetAuth = async (session: Session | null) => {
      console.log('[AuthInitializer] Starting auth state check. Session:', session ? 'Active' : 'None');

      if (!session?.user) {
        console.log('[AuthInitializer] No active session found. Resetting auth state.');
        resetAuth();
        clearTenant();
        return;
      }

      try {
        console.log('[AuthInitializer] Session user detected:', {
          id: session.user.id,
          email: session.user.email
        });

        // Fetch user profile to get role and restaurant_id
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('role, restaurant_id')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('[AuthInitializer] Error fetching user profile from database:', profileError);
          
          if (profileError.code === 'PGRST116') {
            toast({
              title: 'Account Setup Incomplete',
              description: 'No profile record found for this login. Please contact support.',
              variant: 'destructive',
            });
            await supabase.auth.signOut();
          }
          
          resetAuth();
          clearTenant();
          return;
        }

        console.log('[AuthInitializer] Profile loaded from public.users:', profile);

        // Map database role to expected frontend role
        const mappedRole = mapDbRoleToFrontendRole(profile.role, profile.restaurant_id, session.user.email);
        console.log('[AuthInitializer] Role mapping result:', {
          originalRole: profile.role,
          mappedRole: mappedRole,
          restaurantId: profile.restaurant_id
        });

        let isSubExpired = false;

        // If the user belongs to a restaurant, check the subscription status
        if (profile.restaurant_id && mappedRole !== 'SUPER_ADMIN') {
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('status, valid_until')
            .eq('restaurant_id', profile.restaurant_id)
            .maybeSingle();

          console.log('[AuthInitializer] Subscription details loaded:', sub);

          if (sub) {
            const isPastValidDate = new Date(sub.valid_until) < new Date();
            if (sub.status === 'expired' || sub.status === 'cancelled' || isPastValidDate) {
              isSubExpired = true;
            }
          }
        }

        // Setup tenant store for app-wide use if they are bound to a tenant
        if (profile.restaurant_id) {
          setTenant(profile.restaurant_id, '');
        } else {
          clearTenant();
        }

        console.log('[AuthInitializer] Completed authorization audit for login session:', {
          currentUser: {
            id: session.user.id,
            email: session.user.email
          },
          session: session,
          loadedProfile: profile,
          finalRole: mappedRole,
          restaurantId: profile.restaurant_id,
          subscriptionExpired: isSubExpired,
          authorizationDecision: 'User profile loaded and mapped successfully.'
        });

        setAuth({
          session,
          user: session.user,
          role: mappedRole,
          restaurantId: profile.restaurant_id,
          isSubscriptionExpired: isSubExpired,
        });

        // If SUPER_ADMIN, try to restore impersonation state from sessionStorage
        if (mappedRole === 'SUPER_ADMIN') {
          const restored = restoreFromSession();
          if (restored) {
            console.log('[AuthInitializer] Restoring Super Admin Impersonation:', restored);
            // Override auth/tenant with impersonated context
            setTenant(restored.restaurantId, restored.restaurantName);
            setAuth({
              session,
              user: session.user,
              role: 'SUPER_ADMIN',
              restaurantId: restored.restaurantId,
              isSubscriptionExpired: false,
            });
          }
        }

      } catch (err) {
        console.error('[AuthInitializer] Unexpected error fetching auth state:', err);
        resetAuth();
      }
    };

    // 1. Initial check on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchProfileAndSetAuth(session);
    });

    // 2. Listen to auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      // For token refresh or sign in, reload the profile
      if (_event === 'SIGNED_IN' || _event === 'TOKEN_REFRESHED' || (_event as string) === 'INITIAL_SESSION') {
        fetchProfileAndSetAuth(session);
      } else if (_event === 'SIGNED_OUT' || (_event as string) === 'TOKEN_REFRESH_FAILED') {
        await supabase.auth.signOut();
        resetAuth();
        clearTenant();
        endImpersonation(); // Clear impersonation on sign out or failed refresh
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setAuth, resetAuth, setTenant, clearTenant]);

  if (!isInitialized) {
    return (
      <div className="flex min-h-dvh w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">Initializing Security...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
