import { useRestaurants, useUpdateRestaurantStatus } from '@/hooks/api/useRestaurants';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Loader2, Store, Users, Activity, Plus, Phone } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/PageHeader';
import { cn } from '@/lib/utils';

export const SuperAdminDashboard = () => {
  const { data: restaurants, isLoading } = useRestaurants();
  const toggleStatusMutation = useUpdateRestaurantStatus();

  const { data: usersCount } = useQuery({
    queryKey: ['super-admin-users-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .neq('role', 'superadmin');
        
      if (error) throw error;
      return count || 0;
    }
  });

  const handleToggleStatus = (id: string, currentStatus: boolean) => {
    toggleStatusMutation.mutate({ id, is_active: !currentStatus });
  };

  if (isLoading) {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center bg-background/50">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground font-semibold">Loading Tenant Overview...</p>
        </div>
      </div>
    );
  }

  const activeCount = restaurants?.filter(r => r.is_active).length || 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Super Admin Overview"
        subtitle="Manage platform tenants, subscriptions, and global access."
        actions={
          <Link to="/super-admin/create">
            <Button className="rounded-xl bg-primary hover:opacity-95 text-white font-bold transition-all shadow-glow h-10">
              <Plus className="w-4 h-4 mr-2" /> Add Restaurant
            </Button>
          </Link>
        }
      />

      {/* Stats Widgets */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="glass rounded-2xl p-5 hover-lift shadow-card flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Total Restaurants</div>
            <div className="text-3xl font-black mt-1 text-foreground">{restaurants?.length || 0}</div>
          </div>
          <span className="size-11 rounded-xl bg-primary/10 text-primary grid place-items-center">
            <Store className="size-5" />
          </span>
        </div>

        <div className="glass rounded-2xl p-5 hover-lift shadow-card flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Active Tenants</div>
            <div className="text-3xl font-black mt-1 text-success">{activeCount}</div>
          </div>
          <span className="size-11 rounded-xl bg-success/10 text-success grid place-items-center">
            <Activity className="size-5" />
          </span>
        </div>

        <div className="glass rounded-2xl p-5 hover-lift shadow-card flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Total Active Users</div>
            <div className="text-3xl font-black mt-1 text-info">{usersCount ?? 0}</div>
          </div>
          <span className="size-11 rounded-xl bg-info/10 text-info grid place-items-center">
            <Users className="size-5" />
          </span>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="glass rounded-2xl shadow-card overflow-hidden">
        <div className="p-5 border-b border-border bg-card/10">
          <h3 className="font-semibold text-foreground">Registered Tenants</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Overview of all restaurant applications using the platform.
          </p>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/20 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-semibold">Restaurant</th>
                <th className="px-6 py-4 font-semibold">System Slug</th>
                <th className="px-6 py-4 font-semibold hidden sm:table-cell">Contact Phone</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {restaurants?.map((restaurant) => (
                <tr key={restaurant.id} className="hover:bg-card/10 transition-colors">
                  <td className="px-6 py-4 font-bold text-foreground">
                    {restaurant.name}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                    /{restaurant.slug}
                  </td>
                  <td className="px-6 py-4 text-xs text-muted-foreground hidden sm:table-cell">
                    <div className="flex items-center gap-1.5">
                      <Phone className="size-3 text-muted-foreground/75" />
                      <span>{restaurant.phone || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      'text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border',
                      restaurant.is_active 
                        ? 'bg-success/10 text-success border-success/20' 
                        : 'bg-destructive/10 text-destructive border-destructive/20'
                    )}>
                      {restaurant.is_active ? 'Active' : 'Paused'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleToggleStatus(restaurant.id, restaurant.is_active)}
                      disabled={toggleStatusMutation.isPending}
                      className={cn(
                        "h-8 rounded-xl px-3 text-xs font-bold transition-all active:scale-95",
                        restaurant.is_active 
                          ? "text-destructive border-destructive/20 hover:bg-destructive/5" 
                          : "text-success border-success/20 hover:bg-success/5"
                      )}
                    >
                      {restaurant.is_active ? 'Pause' : 'Activate'}
                    </Button>
                  </td>
                </tr>
              ))}
              {(!restaurants || restaurants.length === 0) && (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-muted-foreground font-semibold">
                    No restaurant tenants found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
