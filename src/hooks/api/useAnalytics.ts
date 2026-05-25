import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export const useAnalytics = () => {
  const { restaurantId } = useAuthStore();

  return useQuery({
    queryKey: ['analytics', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return null;

      // 1. Get today's bounds
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayIso = today.toISOString();

      // 2. Fetch today's invoices for revenue
      const { data: invoices, error: invError } = await supabase
        .from('invoices')
        .select('total_amount, created_at')
        .eq('restaurant_id', restaurantId)
        .gte('created_at', todayIso);

      if (invError) throw invError;

      // 3. Fetch active orders
      const { data: orders, error: ordError } = await supabase
        .from('orders')
        .select('id, status')
        .eq('restaurant_id', restaurantId)
        .neq('status', 'COMPLETED');

      if (ordError) throw ordError;

      // 4. Fetch tables
      const { data: tables, error: tbError } = await supabase
        .from('tables')
        .select('id, status')
        .eq('restaurant_id', restaurantId);

      if (tbError) throw tbError;

      // 5. Fetch active staff count
      const { count: staffCount, error: stfError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true);

      if (stfError) throw stfError;

      // Calculations
      const todayRevenue = invoices?.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0) || 0;
      
      const activeOrdersCount = orders?.length || 0;
      const preparingCount = orders?.filter(o => o.status === 'PREPARING').length || 0;
      const pendingCount = activeOrdersCount - preparingCount;

      const totalTables = tables?.length || 0;
      const occupiedTables = tables?.filter(t => t.status === 'occupied').length || 0;
      const occupancyRate = totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0;

      return {
        revenue: {
          today: todayRevenue,
          trend: '+5.2%', // Mock trend for now until we query yesterday's data
        },
        orders: {
          active: activeOrdersCount,
          preparing: preparingCount,
          pending: pendingCount
        },
        tables: {
          total: totalTables,
          occupied: occupiedTables,
          rate: occupancyRate
        },
        staff: {
          active: staffCount || 0
        }
      };
    },
    enabled: !!restaurantId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};
