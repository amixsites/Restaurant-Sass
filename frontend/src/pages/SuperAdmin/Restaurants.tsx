import { useRestaurants } from '@/hooks/api/useRestaurants';
import { useStartImpersonation } from '@/hooks/api/useImpersonation';
import { Button } from '@/components/ui/button';
import { Loader2, Store, Eye, LogIn, Phone, Search, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/PageHeader';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Link } from 'react-router-dom';

export const Restaurants = () => {
  const { data: restaurants, isLoading } = useRestaurants();
  const startImpersonation = useStartImpersonation();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch owner info for each restaurant
  const { data: ownerMap } = useQuery({
    queryKey: ['restaurant-owners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('restaurant_id, full_name, email')
        .eq('role', 'admin');

      if (error) throw error;

      const map: Record<string, { name: string; email: string }> = {};
      for (const user of data || []) {
        if (user.restaurant_id) {
          map[user.restaurant_id] = {
            name: user.full_name,
            email: user.email,
          };
        }
      }
      return map;
    },
  });

  const filteredRestaurants = restaurants?.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const owner = ownerMap?.[r.id];
    return (
      r.name.toLowerCase().includes(q) ||
      r.slug.toLowerCase().includes(q) ||
      (owner?.name?.toLowerCase().includes(q)) ||
      (owner?.email?.toLowerCase().includes(q))
    );
  });

  const handleImpersonate = (restaurantId: string, restaurantName: string) => {
    startImpersonation.mutate({ restaurantId, restaurantName });
  };

  if (isLoading) {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center bg-background/50">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground font-semibold">Loading Restaurants...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Restaurant Management"
        subtitle="View all registered restaurants. Impersonate any restaurant for support and troubleshooting."
      />

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          placeholder="Search by name, slug, or owner..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-10 rounded-xl bg-card/60 border border-border pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground text-foreground"
        />
      </div>

      {/* Stats Row */}
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
            <div className="text-xs text-muted-foreground">Active</div>
            <div className="text-3xl font-black mt-1 text-green-500">
              {restaurants?.filter((r) => r.is_active).length || 0}
            </div>
          </div>
          <span className="size-11 rounded-xl bg-green-500/10 text-green-500 grid place-items-center">
            <Store className="size-5" />
          </span>
        </div>

        <div className="glass rounded-2xl p-5 hover-lift shadow-card flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Paused</div>
            <div className="text-3xl font-black mt-1 text-orange-500">
              {restaurants?.filter((r) => !r.is_active).length || 0}
            </div>
          </div>
          <span className="size-11 rounded-xl bg-orange-500/10 text-orange-500 grid place-items-center">
            <Store className="size-5" />
          </span>
        </div>
      </div>

      {/* Restaurant Table */}
      <div className="glass rounded-2xl shadow-card overflow-hidden">
        <div className="p-5 border-b border-border bg-card/10">
          <h3 className="font-semibold text-foreground">All Restaurants</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Click "Login As Admin" to impersonate a restaurant for support.
          </p>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/20 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-semibold">Restaurant</th>
                <th className="px-6 py-4 font-semibold hidden lg:table-cell">Owner</th>
                <th className="px-6 py-4 font-semibold hidden sm:table-cell">Contact</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredRestaurants?.map((restaurant) => {
                const owner = ownerMap?.[restaurant.id];
                return (
                  <tr key={restaurant.id} className="hover:bg-card/10 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-bold text-foreground">{restaurant.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">/{restaurant.slug}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      {owner ? (
                        <div>
                          <div className="text-sm font-medium text-foreground flex items-center gap-1.5">
                            <Users className="size-3 text-muted-foreground/75" />
                            {owner.name}
                          </div>
                          <div className="text-xs text-muted-foreground">{owner.email}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No admin assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground hidden sm:table-cell">
                      <div className="flex items-center gap-1.5">
                        <Phone className="size-3 text-muted-foreground/75" />
                        <span>{restaurant.phone || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          'text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border',
                          restaurant.is_active
                            ? 'bg-success/10 text-success border-success/20'
                            : 'bg-destructive/10 text-destructive border-destructive/20'
                        )}
                      >
                        {restaurant.is_active ? 'Active' : 'Paused'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-xl px-3 text-xs font-bold transition-all active:scale-95 text-foreground border-border/40 hover:bg-card/10"
                          asChild
                        >
                          <Link to={`/super-admin`}>
                            <Eye className="size-3.5 mr-1.5" />
                            View
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleImpersonate(restaurant.id, restaurant.name)}
                          disabled={startImpersonation.isPending}
                          className="h-8 rounded-xl px-3 text-xs font-bold transition-all active:scale-95 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0 shadow-md hover:shadow-lg"
                        >
                          {startImpersonation.isPending ? (
                            <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <LogIn className="size-3.5 mr-1.5" />
                          )}
                          Login As Admin
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {(!filteredRestaurants || filteredRestaurants.length === 0) && (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-muted-foreground font-semibold">
                    {searchQuery ? 'No restaurants match your search.' : 'No restaurants found.'}
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
