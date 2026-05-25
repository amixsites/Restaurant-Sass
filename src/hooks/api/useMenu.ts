import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useTenantStore } from '@/store/tenantStore';

export const useMenuCategories = () => {
  const { restaurantId } = useTenantStore();
  
  return useQuery({
    queryKey: ['menu_categories', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });
};

export const useMenuItems = (categoryId?: string) => {
  const { restaurantId } = useTenantStore();

  return useQuery({
    queryKey: ['menu_items', restaurantId, categoryId],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      let query = supabase
        .from('menu_items')
        .select('*, menu_categories(name)')
        .eq('restaurant_id', restaurantId);
        
      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });
};
