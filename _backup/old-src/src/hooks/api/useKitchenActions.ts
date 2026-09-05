import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useTenantStore } from '@/store/tenantStore';
import { useAuthStore } from '@/store/authStore';
import { logger } from '@/lib/logger';

type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'SERVED';

export const useKitchenActions = () => {
  const { restaurantId: authRestaurantId } = useAuthStore();
  const { restaurantId: tenantRestaurantId } = useTenantStore();
  const restaurantId = authRestaurantId || tenantRestaurantId;
  const queryClient = useQueryClient();

  const updateOrderStatus = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      logger.start('KITCHEN', 'UPDATE_ORDER_STATUS', `Updating order ${orderId} to ${status}`);

      const { error: orderError } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);

      if (orderError) {
        logger.error('KITCHEN', 'UPDATE_ORDER_STATUS', orderError, 'Failed to update order status');
        throw orderError;
      }

      // Sync individual items when moving to PREPARING or READY
      if (status === 'PREPARING' || status === 'READY') {
        logger.info('KITCHEN', 'SYNC_ITEM_STATUS', `Syncing order items to ${status} for order: ${orderId}`);
        const { error: itemsError } = await supabase
          .from('order_items')
          .update({ status })
          .eq('order_id', orderId)
          .in('status', status === 'PREPARING' ? ['PENDING'] : ['PENDING', 'PREPARING']);
        
        if (itemsError) {
          logger.error('KITCHEN', 'SYNC_ITEM_STATUS', itemsError, 'Failed to sync order items status');
          throw itemsError;
        }
      }
      
      logger.success('KITCHEN', 'UPDATE_ORDER_STATUS', `Order ${orderId} updated to ${status}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['tables', restaurantId] });
    }
  });

  const updateItemStatus = useMutation({
    mutationFn: async ({ itemId, status }: { itemId: string; status: OrderStatus }) => {
      logger.start('KITCHEN', 'UPDATE_ITEM_STATUS', `Updating item ${itemId} to ${status}`);

      const { error } = await supabase
        .from('order_items')
        .update({ status })
        .eq('id', itemId);

      if (error) {
        logger.error('KITCHEN', 'UPDATE_ITEM_STATUS', error, 'Failed to update item status');
        throw error;
      }
      
      logger.success('KITCHEN', 'UPDATE_ITEM_STATUS', `Item ${itemId} updated to ${status}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', restaurantId] });
    }
  });

  return { updateOrderStatus, updateItemStatus };
};
