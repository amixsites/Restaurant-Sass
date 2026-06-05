import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { useTenantStore } from '@/store/tenantStore';
import { supabase } from '@/lib/supabase';
import { useEffect } from 'react';
import { logger } from '@/lib/logger';

function formatTimeAgo(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMins === 0) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export const useAnalytics = (range: string = 'Weekly') => {
  const { restaurantId: authRestaurantId } = useAuthStore();
  const { restaurantId: tenantRestaurantId } = useTenantStore();
  const restaurantId = authRestaurantId || tenantRestaurantId;
  const queryClient = useQueryClient();

  // Realtime listener to invalidate analytics cache when orders or invoices change
  useEffect(() => {
    if (!restaurantId) return;

    const channel = supabase
      .channel('analytics-features-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
        () => queryClient.invalidateQueries({ queryKey: ['analytics', restaurantId] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices', filter: `restaurant_id=eq.${restaurantId}` },
        () => queryClient.invalidateQueries({ queryKey: ['analytics', restaurantId] }))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [restaurantId, queryClient]);

  return useQuery({
    queryKey: ['analytics', restaurantId, range],
    queryFn: async () => {
      if (!restaurantId) return null;
      logger.start('ANALYTICS', 'FETCH_FEATURES', `Direct Supabase analytics for restaurant ${restaurantId} (Range: ${range})`);

      try {
        const now = new Date();
        let startDate = new Date();
        
        if (range === 'Daily') {
          startDate.setHours(0, 0, 0, 0); // start of today
        } else if (range === 'Weekly') {
          startDate.setDate(now.getDate() - 7);
        } else if (range === 'Monthly') {
          startDate.setDate(now.getDate() - 30);
        } else if (range === 'Yearly') {
          startDate.setDate(now.getDate() - 365);
        } else {
          startDate.setDate(now.getDate() - 7);
        }
        
        const startDateIso = startDate.toISOString();

        // 1. Fetch invoices in range
        const { data: invoices, error: invError } = await supabase
          .from('invoices')
          .select('total_amount, created_at, order_id')
          .eq('restaurant_id', restaurantId)
          .gte('created_at', startDateIso);
        if (invError) throw invError;

        // 2. Fetch orders in range
        const { data: orders, error: ordError } = await supabase
          .from('orders')
          .select('id, status, created_at, total_amount, table_id, tables!orders_table_id_fkey(table_number)')
          .eq('restaurant_id', restaurantId)
          .gte('created_at', startDateIso);
        if (ordError) throw ordError;

        // 3. Fetch tables status
        const { data: tables, error: tbError } = await supabase
          .from('tables')
          .select('id, status')
          .eq('restaurant_id', restaurantId);
        if (tbError) throw tbError;

        // 4. Fetch staff members count
        const { count: staffCount, error: stfError } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('restaurant_id', restaurantId);
        if (stfError) throw stfError;

        // 5. Fetch order items for Top Selling items in range (scoped to restaurant)
        const { data: orderItems, error: itemsError } = await supabase
          .from('order_items')
          .select('quantity, unit_price, menu_items(name), orders!inner(restaurant_id, created_at)')
          .eq('orders.restaurant_id', restaurantId)
          .gte('orders.created_at', startDateIso)
          .limit(2000);
        if (itemsError) throw itemsError;

        // Calculations
        const totalRevenue = invoices?.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0) || 0;
        const totalOrdersCount = orders?.length || 0;
        const completedOrdersCount = orders?.filter(o => o.status === 'COMPLETED').length || 0;
        const averageOrderValue = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0;

        const activeOrders = orders?.filter(o => o.status !== 'COMPLETED' && o.status !== 'CANCELLED') || [];
        const activeOrdersCount = activeOrders.length;
        const preparingCount = activeOrders.filter(o => o.status === 'PREPARING').length;
        const pendingCount = activeOrders.filter(o => o.status === 'PENDING' || o.status === 'PENDING_APPROVAL').length;

        const totalTables = tables?.length || 0;
        const occupiedTables = tables?.filter(t => t.status === 'occupied').length || 0;
        const occupancyRate = totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0;

        // Calculate Trend percentage
        let prevStartDate = new Date(startDate);
        let prevEndDate = new Date(startDate);
        if (range === 'Daily') {
          prevStartDate.setDate(prevStartDate.getDate() - 1);
        } else if (range === 'Weekly') {
          prevStartDate.setDate(prevStartDate.getDate() - 7);
        } else if (range === 'Monthly') {
          prevStartDate.setDate(prevStartDate.getDate() - 30);
        } else if (range === 'Yearly') {
          prevStartDate.setDate(prevStartDate.getDate() - 365);
        }

        const { data: prevInvoices } = await supabase
          .from('invoices')
          .select('total_amount')
          .eq('restaurant_id', restaurantId)
          .gte('created_at', prevStartDate.toISOString())
          .lt('created_at', prevEndDate.toISOString());

        const prevRevenue = prevInvoices?.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0) || 0;
        let trendStr = "+0.0%";
        if (prevRevenue > 0) {
          const pct = ((totalRevenue - prevRevenue) / prevRevenue) * 100;
          trendStr = `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
        } else if (totalRevenue > 0) {
          trendStr = "+100%";
        }

        // Group hourly / daily / monthly sales trend
        let hourlyData: { h: string; sales: number; orders: number }[] = [];
        if (range === 'Daily') {
          const hours = Array.from({ length: 12 }, (_, i) => {
            const hour = 9 + i; // 9:00 to 20:00
            return { h: `${hour.toString().padStart(2, '0')}:00`, sales: 0, orders: 0 };
          });
          invoices?.forEach(inv => {
            const date = new Date(inv.created_at);
            const hour = date.getHours();
            const index = hour - 9;
            if (index >= 0 && index < 12) {
              hours[index].sales += Number(inv.total_amount) || 0;
              hours[index].orders += 1;
            }
          });
          hourlyData = hours;
        } else if (range === 'Weekly') {
          const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(now.getDate() - (6 - i));
            return { h: daysOfWeek[d.getDay()], dateStr: d.toDateString(), sales: 0, orders: 0 };
          });
          invoices?.forEach(inv => {
            const dateStr = new Date(inv.created_at).toDateString();
            const daySlot = last7Days.find(slot => slot.dateStr === dateStr);
            if (daySlot) {
              daySlot.sales += Number(inv.total_amount) || 0;
              daySlot.orders += 1;
            }
          });
          hourlyData = last7Days.map(({ h, sales, orders }) => ({ h, sales, orders }));
        } else if (range === 'Monthly') {
          const weeks = Array.from({ length: 4 }, (_, i) => ({
            h: `Week ${i + 1}`,
            sales: 0,
            orders: 0
          }));
          invoices?.forEach(inv => {
            const date = new Date(inv.created_at);
            const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
            const weekIndex = 3 - Math.floor(diffDays / 7);
            if (weekIndex >= 0 && weekIndex < 4) {
              weeks[weekIndex].sales += Number(inv.total_amount) || 0;
              weeks[weekIndex].orders += 1;
            }
          });
          hourlyData = weeks;
        } else if (range === 'Yearly') {
          const monthsLabel = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const months = Array.from({ length: 12 }, (_, i) => {
            const d = new Date();
            d.setMonth(now.getMonth() - (11 - i));
            return { h: monthsLabel[d.getMonth()], yearMonth: `${d.getFullYear()}-${d.getMonth()}`, sales: 0, orders: 0 };
          });
          invoices?.forEach(inv => {
            const d = new Date(inv.created_at);
            const ym = `${d.getFullYear()}-${d.getMonth()}`;
            const monthSlot = months.find(slot => slot.yearMonth === ym);
            if (monthSlot) {
              monthSlot.sales += Number(inv.total_amount) || 0;
              monthSlot.orders += 1;
            }
          });
          hourlyData = months.map(({ h, sales, orders }) => ({ h, sales, orders }));
        }

        // Top Selling items calculator
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

        // Activity feed compilation
        const { data: recentOrders } = await supabase
          .from('orders')
          .select('id, created_at, status, tables!orders_table_id_fkey(table_number)')
          .eq('restaurant_id', restaurantId)
          .order('created_at', { ascending: false })
          .limit(5);

        const { data: recentInvoices } = await supabase
          .from('invoices')
          .select('id, invoice_number, payment_method, payment_status, total_amount, created_at, orders(tables!orders_table_id_fkey(table_number))')
          .eq('restaurant_id', restaurantId)
          .order('created_at', { ascending: false })
          .limit(5);

        const activityFeed: { type: string; text: string; tone: string; rawTime: Date; time: string }[] = [];

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
          const resolvedOrder = Array.isArray(orderInfo) ? orderInfo[0] : orderInfo;
          const tableNum = resolvedOrder?.tables?.table_number ? `Table T-${resolvedOrder.tables.table_number}` : 'Takeaway';
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

        // Recent Transactions compilation
        const recentTransactions = recentInvoices?.map(inv => {
          const orderInfo = inv.orders as any;
          const resolvedOrder = Array.isArray(orderInfo) ? orderInfo[0] : orderInfo;
          const tableNum = resolvedOrder?.tables?.table_number ? `T-${resolvedOrder.tables.table_number}` : 'Takeaway';
          return {
            id: inv.id,
            invoiceNumber: inv.invoice_number,
            paymentMethod: inv.payment_method,
            paymentStatus: inv.payment_status,
            totalAmount: Number(inv.total_amount) || 0,
            createdAt: inv.created_at,
            tableNumber: tableNum,
          };
        }) || [];

        logger.success('ANALYTICS', 'FETCH_FEATURES', `Direct Supabase analytics fetched successfully`);
        return {
          revenue: {
            today: totalRevenue, // backward compat
            total: totalRevenue,
            trend: trendStr,
            averageOrderValue
          },
          orders: {
            total: totalOrdersCount,
            completed: completedOrdersCount,
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
          recentActivity: sortedActivity,
          recentTransactions
        };
      } catch (err: any) {
        logger.error('ANALYTICS', 'FETCH_FEATURES', err);
        throw err;
      }
    },
    enabled: !!restaurantId,
    refetchInterval: 15000, // Refresh every 15 seconds
  });
};
