import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export const useStaff = () => {
  const { restaurantId } = useAuthStore();

  return useQuery({
    queryKey: ['staff', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });
};
