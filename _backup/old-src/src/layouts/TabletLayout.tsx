import { Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { LogOut, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTenantStore } from '@/store/tenantStore';

export const TabletLayout = () => {
  const { user, role } = useAuthStore();
  const signOut = async () => await supabase.auth.signOut();
  const { restaurantName } = useTenantStore();

  return (
    <div className="flex flex-col min-h-dvh bg-muted/20">
      <header className="h-16 flex-none bg-card border-b flex items-center justify-between px-4 md:px-6 shadow-sm">
        <div className="flex items-center gap-4">
          <h1 className="font-bold text-xl text-primary">{restaurantName || 'Restaurant POS'}</h1>
          <span className="text-sm px-2 py-1 bg-muted rounded-md text-muted-foreground hidden sm:inline-block">
            {role === 'WAITER' ? 'Waiter Interface' : 'Kitchen Display'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium">{user?.user_metadata?.full_name || user?.email || 'Staff'}</div>
            <div className="text-xs text-muted-foreground">{role}</div>
          </div>
          <Button variant="ghost" size="icon">
            <Settings className="w-5 h-5" />
          </Button>
          <Button variant="destructive" size="icon" onClick={signOut}>
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-x-hidden overflow-y-auto p-3 md:p-4">
        <Outlet />
      </main>
    </div>
  );
};
