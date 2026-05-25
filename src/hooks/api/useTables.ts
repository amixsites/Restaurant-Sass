import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useTenantStore } from '@/store/tenantStore';
import { useEffect } from 'react';

export const useTables = () => {
  const { restaurantId } = useTenantStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!restaurantId) return;

    // Set up Realtime subscription for tables
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
        () => {
          // Invalidate queries to trigger a refetch when a table status changes
          queryClient.invalidateQueries({ queryKey: ['tables', restaurantId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, queryClient]);

  return useQuery({
    queryKey: ['tables', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      const { data, error } = await supabase
        .from('tables')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('table_number', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });
};
