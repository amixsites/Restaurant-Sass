import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

function formatTimeAgo(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMins === 0) return 'just now';
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

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
        .select('id, status, created_at, tables(table_number)')
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
        .eq('restaurant_id', restaurantId);

      if (stfError) throw stfError;

      // 6. Fetch today's order items for Top Selling items
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('quantity, unit_price, menu_items(name)')
        .gte('created_at', todayIso);

      if (itemsError) throw itemsError;

      // Calculations
      const todayRevenue = invoices?.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0) || 0;
      
      const activeOrdersCount = orders?.length || 0;
      const preparingCount = orders?.filter(o => o.status === 'PREPARING').length || 0;
      const pendingCount = activeOrdersCount - preparingCount;

      const totalTables = tables?.length || 0;
      const occupiedTables = tables?.filter(t => t.status === 'occupied' || t.status === 'OCCUPIED').length || 0;
      const occupancyRate = totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0;

      // Hourly sales calculator (last 12 hours from 8 AM to 7 PM or based on today)
      const hourlyData = Array.from({ length: 12 }, (_, i) => {
        const hour = 9 + i; // from 9:00 to 20:00
        return {
          h: `${hour.toString().padStart(2, '0')}:00`,
          sales: 0,
          orders: 0
        };
      });

      invoices?.forEach(inv => {
        const date = new Date(inv.created_at);
        const hour = date.getHours();
        const index = hour - 9;
        if (index >= 0 && index < 12) {
          hourlyData[index].sales += Number(inv.total_amount) || 0;
          hourlyData[index].orders += 1;
        }
      });

      // Top Selling calculator
      const itemCounts: Record<string, { name: string; count: number; revenue: number }> = {};
      orderItems?.forEach(item => {
        const name = (item.menu_items as any)?.name || 'Unknown Item';
        const qty = item.quantity || 1;
        const price = Number(item.unit_price) || 0;
        if (!itemCounts[name]) {
          itemCounts[name] = { name, count: 0, revenue: 0 };
        }
        itemCounts[name].count += qty;
        itemCounts[name].revenue += qty * price;
      });

      const topSelling = Object.values(itemCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Activity Feed compiler
      const { data: recentOrders } = await supabase
        .from('orders')
        .select('id, created_at, status, tables(table_number)')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: recentInvoices } = await supabase
        .from('invoices')
        .select('total_amount, created_at, order_id, orders(tables(table_number))')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(5);

      const activityFeed: { type: string; text: string; time: string; tone: string; rawTime: Date }[] = [];

      recentOrders?.forEach(o => {
        const tableInfo = o.tables as any;
        const resolvedTable = Array.isArray(tableInfo) ? tableInfo[0] : tableInfo;
        const tableNum = resolvedTable?.table_number ? `Table T-${resolvedTable.table_number}` : 'Takeaway';
        const idShort = o.id.substring(0, 4).toUpperCase();
        let text = `New order #${idShort} · ${tableNum}`;
        let tone = 'primary';
        let type = 'order';

        if (o.status === 'READY') {
          text = `Order #${idShort} marked ready · ${tableNum}`;
          tone = 'success';
          type = 'kitchen';
        } else if (o.status === 'PREPARING') {
          text = `Order #${idShort} preparing · ${tableNum}`;
          tone = 'info';
          type = 'kitchen';
        } else if (o.status === 'SERVED') {
          text = `Order #${idShort} served · ${tableNum}`;
          tone = 'muted';
          type = 'table';
        } else if (o.status === 'CANCELLED') {
          text = `Order #${idShort} cancelled`;
          tone = 'destructive';
          type = 'table';
        }

        activityFeed.push({
          type,
          text,
          tone,
          rawTime: new Date(o.created_at),
          time: formatTimeAgo(new Date(o.created_at))
        });
      });

      recentInvoices?.forEach(inv => {
        const orderInfo = inv.orders as any;
        const tableNum = orderInfo?.tables?.table_number ? `Table T-${orderInfo.tables.table_number}` : 'Takeaway';
        activityFeed.push({
          type: 'bill',
          text: `Bill paid · ${tableNum} · ₹${Number(inv.total_amount).toFixed(0)}`,
          tone: 'info',
          rawTime: new Date(inv.created_at),
          time: formatTimeAgo(new Date(inv.created_at))
        });
      });

      const sortedActivity = activityFeed
        .sort((a, b) => b.rawTime.getTime() - a.rawTime.getTime())
        .slice(0, 5);

      return {
        revenue: {
          today: todayRevenue,
          trend: '+5.2%',
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
        },
        hourlyData,
        topSelling,
        recentActivity: sortedActivity
      };
    },
    enabled: !!restaurantId,
    refetchInterval: 30000,
  });
};
