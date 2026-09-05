import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export const useCustomerMenu = (restaurantId: string | undefined) => {
  return useQuery({
    queryKey: ['customer_menu', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return { categories: [], items: [] };

      const [categoriesRes, itemsRes] = await Promise.all([
        supabase.from('menu_categories').select('*').eq('restaurant_id', restaurantId).order('sort_order', { ascending: true }),
        supabase.from('menu_items').select('*').eq('restaurant_id', restaurantId).eq('is_available', true)
      ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (itemsRes.error) throw itemsRes.error;

      return {
        categories: categoriesRes.data,
        items: itemsRes.data
      };
    },
    enabled: !!restaurantId,
  });
};
