import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { useEffect } from 'react';

function formatTimeAgo(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMins === 0) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export const useAnalytics = (_range: string = 'Weekly') => {
  const { restaurantId } = useAuthStore();
  const queryClient = useQueryClient();

  // Realtime: invalidate analytics when orders or invoices change
  useEffect(() => {
    if (!restaurantId) return;

    const channel = supabase
      .channel('analytics-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
        () => queryClient.invalidateQueries({ queryKey: ['analytics', restaurantId] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices', filter: `restaurant_id=eq.${restaurantId}` },
        () => queryClient.invalidateQueries({ queryKey: ['analytics', restaurantId] }))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [restaurantId, queryClient]);

  return useQuery({
    queryKey: ['analytics', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return null;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayIso = today.toISOString();

      // Run all queries in parallel
      const [
        invoicesRes,
        ordersRes,
        tablesRes,
        staffRes,
        orderItemsRes,
        recentOrdersRes,
        recentInvoicesRes,
      ] = await Promise.all([
        supabase.from('invoices')
          .select('total_amount, created_at')
          .eq('restaurant_id', restaurantId)
          .gte('created_at', todayIso),

        supabase.from('orders')
          .select('id, status, created_at, table_id, tables!orders_table_id_fkey(table_number)')
          .eq('restaurant_id', restaurantId)
          .neq('status', 'COMPLETED')
          .neq('status', 'CANCELLED'),

        supabase.from('tables')
          .select('id, status')
          .eq('restaurant_id', restaurantId),

        supabase.from('users')
          .select('*', { count: 'exact', head: true })
          .eq('restaurant_id', restaurantId),

        supabase.from('order_items')
          .select('quantity, unit_price, menu_items(name)')
          .gte('created_at', todayIso),

        supabase.from('orders')
          .select('id, created_at, status, tables!orders_table_id_fkey(table_number)')
          .eq('restaurant_id', restaurantId)
          .order('created_at', { ascending: false })
          .limit(5),

        supabase.from('invoices')
          .select('total_amount, created_at, order_id, orders(tables!orders_table_id_fkey(table_number))')
          .eq('restaurant_id', restaurantId)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      if (invoicesRes.error) throw invoicesRes.error;
      if (ordersRes.error) throw ordersRes.error;
      if (tablesRes.error) throw tablesRes.error;

      const invoices = invoicesRes.data || [];
      const orders = ordersRes.data || [];
      const tables = tablesRes.data || [];
      const staffCount = staffRes.count || 0;
      const orderItems = orderItemsRes.data || [];

      // Revenue
      const todayRevenue = invoices.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);

      // Orders
      const activeOrdersCount = orders.length;
      const preparingCount = orders.filter(o => o.status === 'PREPARING').length;
      const pendingCount = orders.filter(o => o.status === 'PENDING').length;

      // Tables
      const totalTables = tables.length;
      const occupiedTables = tables.filter(t =>
        t.status === 'occupied' || t.status === 'OCCUPIED'
      ).length;
      const occupancyRate = totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0;

      // Hourly data (9am–8pm)
      const hourlyData = Array.from({ length: 12 }, (_, i) => ({
        h: `${(9 + i).toString().padStart(2, '0')}:00`,
        sales: 0,
        orders: 0,
      }));
      invoices.forEach(inv => {
        const hour = new Date(inv.created_at).getHours();
        const idx = hour - 9;
        if (idx >= 0 && idx < 12) {
          hourlyData[idx].sales += Number(inv.total_amount) || 0;
          hourlyData[idx].orders += 1;
        }
      });

      // Top selling items
      const itemCounts: Record<string, { name: string; count: number; revenue: number }> = {};
      orderItems.forEach(item => {
        const name = (item.menu_items as any)?.name || 'Unknown';
        const qty = item.quantity || 1;
        const price = Number(item.unit_price) || 0;
        if (!itemCounts[name]) itemCounts[name] = { name, count: 0, revenue: 0 };
        itemCounts[name].count += qty;
        itemCounts[name].revenue += qty * price;
      });
      const topSelling = Object.values(itemCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Activity feed
      const activityFeed: { type: string; text: string; time: string; tone: string; rawTime: Date }[] = [];

      (recentOrdersRes.data || []).forEach(o => {
        const tableInfo = o.tables as any;
        const resolved = Array.isArray(tableInfo) ? tableInfo[0] : tableInfo;
        const tableNum = resolved?.table_number ? `Table T-${resolved.table_number}` : 'Takeaway';
        const idShort = o.id.substring(0, 4).toUpperCase();
        let text = `New order #${idShort} · ${tableNum}`;
        let tone = 'primary';
        let type = 'order';
        if (o.status === 'READY') { text = `Order #${idShort} ready · ${tableNum}`; tone = 'success'; type = 'kitchen'; }
        else if (o.status === 'PREPARING') { text = `Order #${idShort} preparing · ${tableNum}`; tone = 'info'; type = 'kitchen'; }
        else if (o.status === 'SERVED') { text = `Order #${idShort} served · ${tableNum}`; tone = 'muted'; type = 'table'; }
        else if (o.status === 'CANCELLED') { text = `Order #${idShort} cancelled`; tone = 'destructive'; type = 'table'; }
        activityFeed.push({ type, text, tone, rawTime: new Date(o.created_at), time: formatTimeAgo(new Date(o.created_at)) });
      });

      (recentInvoicesRes.data || []).forEach(inv => {
        const orderInfo = inv.orders as any;
        const tableNum = orderInfo?.tables?.table_number ? `Table T-${orderInfo.tables.table_number}` : 'Takeaway';
        activityFeed.push({
          type: 'bill',
          text: `Bill paid · ${tableNum} · ₹${Number(inv.total_amount).toFixed(0)}`,
          tone: 'info',
          rawTime: new Date(inv.created_at),
          time: formatTimeAgo(new Date(inv.created_at)),
        });
      });

      const recentActivity = activityFeed
        .sort((a, b) => b.rawTime.getTime() - a.rawTime.getTime())
        .slice(0, 5);

      return {
        revenue: { today: todayRevenue, trend: '+0%' },
        orders: { active: activeOrdersCount, preparing: preparingCount, pending: pendingCount },
        tables: { total: totalTables, occupied: occupiedTables, rate: occupancyRate },
        staff: { active: staffCount },
        hourlyData,
        topSelling,
        recentActivity,
      };
    },
    enabled: !!restaurantId,
    refetchInterval: 30000, // Fallback polling every 30s
  });
};
