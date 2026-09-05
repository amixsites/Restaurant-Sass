import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useTenantStore } from '@/store/tenantStore';
import { Loader2 } from 'lucide-react';
import { Session } from '@supabase/supabase-js';
import { toast } from '@/hooks/use-toast';

export const AuthInitializer = ({ children }: { children: React.ReactNode }) => {
  const { isInitialized, setAuth, resetAuth } = useAuthStore();
  const { setTenant, clearTenant } = useTenantStore();

  useEffect(() => {
    const fetchProfileAndSetAuth = async (session: Session | null) => {
      if (!session?.user) {
        resetAuth();
        clearTenant();
        return;
      }

      try {
        // Fetch user profile to get role and restaurant_id
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('role, restaurant_id')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('Error fetching user profile:', profileError);
          
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

        let isSubExpired = false;

        // If the user belongs to a restaurant, check the subscription status
        if (profile.restaurant_id && profile.role !== 'SUPER_ADMIN') {
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('status, valid_until')
            .eq('restaurant_id', profile.restaurant_id)
            .maybeSingle();

          if (sub) {
            const isPastValidDate = new Date(sub.valid_until) < new Date();
            if (sub.status === 'expired' || sub.status === 'cancelled' || isPastValidDate) {
              isSubExpired = true;
            }
          }
        }

        // Setup tenant store for app-wide use if they are bound to a tenant
        // Note: we don't have the restaurant name in profile, so just set the ID or fetch it
        if (profile.restaurant_id) {
          setTenant(profile.restaurant_id, ''); // The name might need to be fetched separately, or handled elsewhere
        } else {
          clearTenant();
        }

        setAuth({
          session,
          user: session.user,
          role: profile.role,
          restaurantId: profile.restaurant_id,
          isSubscriptionExpired: isSubExpired,
        });

      } catch (err) {
        console.error('Unexpected error fetching auth state:', err);
        resetAuth();
      }
    };

    // 1. Initial check on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchProfileAndSetAuth(session);
    });

    // 2. Listen to auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // For token refresh or sign in, we want to reload the profile
      if (_event === 'SIGNED_IN' || _event === 'TOKEN_REFRESHED' || _event === 'INITIAL_SESSION') {
        fetchProfileAndSetAuth(session);
      } else if (_event === 'SIGNED_OUT') {
        resetAuth();
        clearTenant();
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
