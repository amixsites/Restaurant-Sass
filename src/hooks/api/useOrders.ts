import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useTenantStore } from '@/store/tenantStore';
import { useEffect } from 'react';

export const useOrders = () => {
  const { restaurantId } = useTenantStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!restaurantId) return;

    // Set up Realtime subscription for orders
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`
        },
        () => {
          // Invalidate queries to trigger a refetch
          queryClient.invalidateQueries({ queryKey: ['orders', restaurantId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, queryClient]);

  return useQuery({
    queryKey: ['orders', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          tables (table_number),
          order_items (*)
        `)
        .eq('restaurant_id', restaurantId)
        .in('status', ['PENDING', 'PREPARING', 'READY'])
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });
};
