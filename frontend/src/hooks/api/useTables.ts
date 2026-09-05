import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useTenantStore } from '@/store/tenantStore';
import { useAuthStore } from '@/store/authStore';
import { useEffect } from 'react';
import { logger } from '@/lib/logger';

export const useTables = () => {
  const { restaurantId: authRestaurantId } = useAuthStore();
  const { restaurantId: tenantRestaurantId } = useTenantStore();
  const restaurantId = authRestaurantId || tenantRestaurantId;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!restaurantId) {
      logger.warn('TABLES', 'REALTIME_SETUP', 'No restaurantId available, skipping subscription.');
      return;
    }

    logger.info('TABLES', 'REALTIME_SETUP', `Setting up subscription for restaurant: ${restaurantId}`);

    const channel = supabase
      .channel('tables-changes')
      .on(
        'postgres_changes',
        {
          event: '*', 
          schema: 'public',
          table: 'tables',
          filter: `restaurant_id=eq.${restaurantId}`
        },
        (payload) => {
          logger.info('TABLES', 'REALTIME_EVENT', `Received ${payload.eventType}`, payload.new);
          queryClient.invalidateQueries({ queryKey: ['tables', restaurantId] });
        }
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR') {
          logger.error('TABLES', 'REALTIME_CHANNEL_ERROR', err);
        }
      });

    return () => {
      logger.info('TABLES', 'REALTIME_CLEANUP', 'Cleaning up table subscription...');
      supabase.removeChannel(channel);
    };
  }, [restaurantId, queryClient]);

  return useQuery({
    queryKey: ['tables', restaurantId],
    queryFn: async () => {
      if (!restaurantId) {
        logger.warn('TABLES', 'FETCH', 'No restaurantId, returning empty array.');
        return [];
      }
      
      logger.start('TABLES', 'FETCH', `Fetching tables for restaurant: ${restaurantId}`);
      const { data, error } = await supabase
        .from('tables')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('table_number', { ascending: true });

      if (error) {
        logger.error('TABLES', 'FETCH', error, 'Failed to fetch tables');
        throw error;
      }
      
      logger.success('TABLES', 'FETCH', `Successfully fetched ${data?.length || 0} tables.`);
      return data;
    },
    enabled: !!restaurantId,
  });
};
