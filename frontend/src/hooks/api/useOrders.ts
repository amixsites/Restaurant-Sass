import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useTenantStore } from '@/store/tenantStore';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';
import { logger } from '@/lib/logger';

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string;
  status: 'PENDING' | 'PREPARING' | 'READY' | 'SERVED';
  created_at: string;
  menu_items?: {
    name: string;
    type: string;
  };
}

export interface Order {
  id: string;
  restaurant_id: string;
  table_id: string;
  waiter_id: string;
  customer_phone: string;
  status: 'PENDING' | 'PREPARING' | 'READY' | 'SERVED' | 'COMPLETED' | 'CANCELLED';
  total_amount: number;
  notes: string;
  approval_status?: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  created_at: string;
  updated_at: string;
  tables?: {
    table_number: string;
  };
  users?: {
    full_name: string;
  };
  order_items: OrderItem[];
  invoices?: {
    invoice_number: string;
    payment_method: string;
    payment_status: string;
  }[];
}

export const useOrders = () => {
  const { restaurantId: authRestaurantId } = useAuthStore();
  const { restaurantId: tenantRestaurantId } = useTenantStore();
  const restaurantId = authRestaurantId || tenantRestaurantId;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (!restaurantId) {
      logger.warn('ORDERS', 'REALTIME_SETUP', 'No restaurantId available, skipping subscription.');
      return;
    }

    logger.info('ORDERS', 'REALTIME_SETUP', `Setting up subscription for restaurant: ${restaurantId}`);

    // Set up Realtime subscription for orders
    const ordersChannel = supabase
      .channel('schema-db-changes-orders')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`
        },
        async (payload) => {
          logger.info('ORDERS', 'REALTIME_EVENT', `Received ${payload.eventType}`, payload.new);
          
          // Invalidate queries to trigger refetch
          queryClient.invalidateQueries({ queryKey: ['orders', restaurantId] });
          queryClient.invalidateQueries({ queryKey: ['tables', restaurantId] });
          
          const order = payload.new as any;
          if (!order) return;

          // Resolve table number from queryClient cache if available
          const tables = queryClient.getQueryData<any[]>(['tables', restaurantId]);
          const table = tables?.find(t => t.id === order.table_id);
          const tableNum = table ? table.table_number : 'N/A';

          // Trigger toast notifications based on event type and status
          if (payload.eventType === 'INSERT') {
            if (order.status === 'PENDING') {
              toast({
                title: '🔔 New Order Received',
                description: `Table T-${tableNum} has placed a new order.`,
                className: 'bg-yellow-50 border-yellow-200 text-yellow-900 font-medium'
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            if (order.status === 'PREPARING') {
              toast({
                title: '🍳 Preparing Started',
                description: `Table T-${tableNum} order is now being prepared.`,
                className: 'bg-orange-50 border-orange-200 text-orange-950 font-medium'
              });
            } else if (order.status === 'READY') {
              toast({
                title: '✅ Order Ready',
                description: `Order for Table T-${tableNum} is ready to serve!`,
                className: 'bg-green-50 border-green-200 text-green-950 font-bold border-l-4 border-l-green-500 shadow-md animate-bounce'
              });
            } else if (order.status === 'SERVED') {
              toast({
                title: '📦 Kitchen Status Updated',
                description: `Order for Table T-${tableNum} has been served.`,
                className: 'bg-blue-50 border-blue-200 text-blue-950 font-medium'
              });
            }
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          logger.success('ORDERS', 'REALTIME_SUBSCRIBED', 'Subscribed to orders channel.');
        } else if (status === 'CHANNEL_ERROR') {
          logger.error('ORDERS', 'REALTIME_CHANNEL_ERROR', err);
        } else if (status === 'TIMED_OUT') {
          logger.warn('ORDERS', 'REALTIME_TIMEOUT', 'Channel timed out. Retrying...');
        }
      });

    // Set up Realtime subscription for order_items
    // Filter by joining through orders to ensure tenant isolation
    const itemsChannel = supabase
      .channel('schema-db-changes-order-items')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_items',
          // Note: order_items doesn't have restaurant_id directly.
          // RLS on the DB side enforces tenant isolation.
          // We invalidate and let the query re-fetch with proper RLS filtering.
        },
        (_payload) => {
          queryClient.invalidateQueries({ queryKey: ['orders', restaurantId] });
        }
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR') {
          logger.error('ORDERS', 'REALTIME_ORDER_ITEMS_ERROR', err);
        }
      });

    return () => {
      logger.info('ORDERS', 'REALTIME_CLEANUP', 'Cleaning up order subscriptions...');
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(itemsChannel);
    };
  }, [restaurantId, queryClient, toast]);

  return useQuery({
    queryKey: ['orders', restaurantId],
    queryFn: async () => {
      if (!restaurantId) {
        logger.warn('ORDERS', 'FETCH', 'No restaurantId, returning empty array.');
        return [];
      }
      
      logger.start('ORDERS', 'FETCH', `Fetching orders for restaurant: ${restaurantId}`);
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          tables!orders_table_id_fkey (table_number),
          users (full_name),
          order_items (
            *,
            menu_items (name, type)
          ),
          invoices (
            invoice_number,
            payment_method,
            payment_status
          )
        `)
        .eq('restaurant_id', restaurantId)
        .or('status.in.(PENDING,PREPARING,READY,SERVED),created_at.gte.' + new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        logger.error('ORDERS', 'FETCH', error, 'Failed to fetch orders');
        throw error;
      }
      
      logger.success('ORDERS', 'FETCH', `Successfully fetched ${data?.length || 0} orders.`);
      return data as unknown as Order[];
    },
    enabled: !!restaurantId,
    refetchInterval: 10000, // Backup polling in case realtime misses an event
  });
};
