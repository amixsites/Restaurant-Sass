import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useTenantStore } from '@/store/tenantStore';
import { useAuthStore } from '@/store/authStore';
import { logger } from '@/lib/logger';

export const useMenuCategories = () => {
  const { restaurantId: authRestaurantId } = useAuthStore();
  const { restaurantId: tenantRestaurantId } = useTenantStore();
  const restaurantId = authRestaurantId || tenantRestaurantId;
  
  return useQuery({
    queryKey: ['menu_categories', restaurantId],
    queryFn: async () => {
      if (!restaurantId) {
        logger.warn('MENU', 'FETCH_CATEGORIES', 'No restaurantId, returning empty array.');
        return [];
      }
      
      logger.start('MENU', 'FETCH_CATEGORIES', `Fetching categories for restaurant: ${restaurantId}`);
      const { data, error } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('sort_order', { ascending: true });

      if (error) {
        logger.error('MENU', 'FETCH_CATEGORIES', error, 'Failed to fetch categories');
        throw error;
      }
      return data;
    },
    enabled: !!restaurantId,
  });
};

export const useMenuItems = (categoryId?: string) => {
  const { restaurantId: authRestaurantId } = useAuthStore();
  const { restaurantId: tenantRestaurantId } = useTenantStore();
  const restaurantId = authRestaurantId || tenantRestaurantId;

  return useQuery({
    queryKey: ['menu_items', restaurantId, categoryId],
    queryFn: async () => {
      if (!restaurantId) {
        logger.warn('MENU', 'FETCH_ITEMS', 'No restaurantId, returning empty array.');
        return [];
      }
      
      logger.start('MENU', 'FETCH_ITEMS', `Fetching items for restaurant: ${restaurantId}, category: ${categoryId || 'All'}`);
      let query = supabase
        .from('menu_items')
        .select('*, menu_categories(name)')
        .eq('restaurant_id', restaurantId);
        
      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        logger.error('MENU', 'FETCH_ITEMS', error, 'Failed to fetch menu items');
        throw error;
      }
      return data;
    },
    enabled: !!restaurantId,
  });
};
