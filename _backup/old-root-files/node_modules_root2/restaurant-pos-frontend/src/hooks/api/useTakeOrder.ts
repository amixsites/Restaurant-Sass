import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useTenantStore } from '@/store/tenantStore';
import { useTakeOrderCart } from '@/store/useTakeOrderCart';
import { logger } from '@/lib/logger';

export const useTakeOrder = () => {
  const { restaurantId: authRestaurantId, user } = useAuthStore();
  const { restaurantId: tenantRestaurantId } = useTenantStore();
  const restaurantId = authRestaurantId || tenantRestaurantId;
  const queryClient = useQueryClient();
  const clearCart = useTakeOrderCart(state => state.clearCart);

  return useMutation({
    mutationFn: async (payload: {
      tableId: string;
      items: { id: string; price: number; quantity: number; notes: string }[];
      customerPhone?: string;
      customerName?: string;
    }) => {
      if (!restaurantId) throw new Error("Missing restaurant ID");
      
      const totalAmount = payload.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      logger.start('ORDERS', 'CREATE_ORDER', 'Submitting order to kitchen', payload);

      // 1. Create the order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{
          restaurant_id: restaurantId,
          table_id: payload.tableId,
          waiter_id: user?.id || null,
          status: 'PENDING',
          approval_status: 'APPROVED',
          total_amount: totalAmount,
          customer_phone: payload.customerPhone || null,
          notes: payload.customerName ? `Customer: ${payload.customerName}` : null
        }])
        .select()
        .single();

      if (orderError) {
        logger.error('ORDERS', 'CREATE_ORDER_FAILED', orderError);
        throw orderError;
      }

      // 2. Create order items
      const orderItemsToInsert = payload.items.map(item => ({
        order_id: order.id,
        menu_item_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
        notes: item.notes,
        status: 'PENDING'
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsToInsert);

      if (itemsError) {
        logger.error('ORDERS', 'CREATE_ORDER_ITEMS_FAILED', itemsError);
        throw itemsError;
      }

      // 3. Update table status to occupied if it isn't already
      const { error: tableError } = await supabase
        .from('tables')
        .update({ status: 'occupied' })
        .eq('id', payload.tableId)
        .eq('status', 'available'); // only update if it was available

      if (tableError) {
        logger.warn('ORDERS', 'UPDATE_TABLE_STATUS_FAILED', tableError.message, tableError);
        // We don't fail the order if the table update fails
      }

      logger.success('ORDERS', 'CREATE_ORDER_SUCCESS', 'Order submitted successfully', order);
      return order;
    },
    onSuccess: () => {
      clearCart();
      queryClient.invalidateQueries({ queryKey: ['orders', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['tables', restaurantId] });
    }
  });
};
