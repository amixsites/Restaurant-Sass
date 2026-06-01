import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { useEffect } from 'react';
import { api, getAuthHeaders, fetchWithRetry } from '@/lib/api';

export const useAnalytics = (range: string = 'Weekly') => {
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
    queryKey: ['analytics', restaurantId, range],
    queryFn: async () => {
      if (!restaurantId) return null;

      const headers = await getAuthHeaders();
      const res = await fetchWithRetry(api.analytics(restaurantId, range), { headers });

      if (!res.ok) {
        throw new Error('Failed to fetch analytics from backend.');
      }

      return res.json();
    },
    enabled: !!restaurantId,
    refetchInterval: 30000, // Fallback polling every 30s
  });
};
