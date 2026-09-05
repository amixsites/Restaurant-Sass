import { useState, useMemo, useEffect } from 'react';
import { useMenuCategories, useMenuItems } from '@/hooks/api/useMenu';
import { useAuthStore } from '@/store/authStore';
import { useTenantStore } from '@/store/tenantStore';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from '@/components/ui/drawer';
import { Label } from '@/components/ui/label';

import { Search, SlidersHorizontal, Plus, Loader2 } from 'lucide-react';
import { FoodCard } from '@/components/FoodCard';
import { AddFoodDrawer } from '@/components/AddFoodDrawer';
import { AddCategoryDrawer, PartialCategory } from '@/components/AddCategoryDrawer';
import { PageHeader } from '@/components/ui/PageHeader';
import { cn } from '@/lib/utils';

export type MenuItem = any;
const MISSING_COLUMN_CODES = new Set(['PGRST204', '42703']);

const isMissingColumnError = (error: any) =>
  !!error && (MISSING_COLUMN_CODES.has(error.code) || error?.message?.toLowerCase().includes('does not exist'));

export const MenuManagement = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filters
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [filterVegType, setFilterVegType] = useState<string | null>(null);
  const [filterAvailability, setFilterAvailability] = useState<boolean | null>(null);

  // Add/Edit Category
  const [isCategoryDrawerOpen, setIsCategoryDrawerOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<PartialCategory | null>(null);

  // Add/Edit Food
  const [isFoodDrawerOpen, setIsFoodDrawerOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<MenuItem | null>(null);

  const { data: categories, isLoading: categoriesLoading } = useMenuCategories();
  const { data: menuItems, isLoading: itemsLoading } = useMenuItems(selectedCategory);
  
  const { restaurantId: authRestaurantId } = useAuthStore();
  const { restaurantId: tenantRestaurantId } = useTenantStore();
  const restaurantId = authRestaurantId || tenantRestaurantId;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    logger.debug('MENU', 'RESTAURANT_CONTEXT', 'Resolved restaurant context for menu management', {
      authRestaurantId,
      tenantRestaurantId,
      effectiveRestaurantId: restaurantId,
    });
  }, [authRestaurantId, tenantRestaurantId, restaurantId]);

  const ensureMenuSchema = async () => {
    logger.warn('MENU', 'ENSURE_SCHEMA_START', 'Attempting schema self-heal via RPC ensure_menu_schema');
    const { data, error } = await supabase.rpc('ensure_menu_schema');
    if (error) {
      logger.error('MENU', 'ENSURE_SCHEMA_ERROR', error, 'Schema self-heal failed');
      throw error;
    }
    logger.success('MENU', 'ENSURE_SCHEMA_SUCCESS', 'Schema self-heal completed', data);
    return data;
  };

  // Filter items based on search & filters
  const filteredItems = useMemo(() => {
    if (!menuItems) return [];
    return menuItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesVeg = filterVegType ? item.type === filterVegType : true;
      const matchesAvailability = filterAvailability !== null ? item.is_available === filterAvailability : true;
      return matchesSearch && matchesVeg && matchesAvailability;
    });
  }, [menuItems, searchQuery, filterVegType, filterAvailability]);

  const totalItemsCount = menuItems?.length || 0;
  const availableItemsCount = menuItems?.filter(i => i.is_available).length || 0;

  // Handlers
  const handleSaveCategory = async (categoryData: PartialCategory) => {
    if (!restaurantId) {
      logger.error('MENU', 'SAVE_CATEGORY_NO_RESTAURANT', { message: 'restaurantId missing in auth store' });
      toast({
        title: 'Restaurant context missing',
        description: 'Please login again and select your restaurant.',
        variant: 'destructive',
      });
      return;
    }
    logger.start('MENU', 'SAVE_CATEGORY', `Saving ${categoryData.name}`, categoryData);
    
    try {
      if (categoryData.id) {
        let { error } = await supabase
          .from('menu_categories')
          .update({
            name: categoryData.name,
            description: categoryData.description,
            image_url: categoryData.image_url,
            sort_order: categoryData.sort_order,
            is_active: categoryData.is_active
          })
          .eq('id', categoryData.id);
          
        if (isMissingColumnError(error)) {
          logger.warn('MENU', 'UPDATE_CATEGORY_FALLBACK', 'Columns missing, attempting fallback update without new columns');
          await ensureMenuSchema();
          const retry = await supabase
            .from('menu_categories')
            .update({
              name: categoryData.name,
              description: categoryData.description,
              image_url: categoryData.image_url,
              sort_order: categoryData.sort_order,
              is_active: categoryData.is_active
            })
            .eq('id', categoryData.id);
          if (!retry.error) {
            logger.success('MENU', 'UPDATE_CATEGORY_RETRY_SUCCESS', 'Category update succeeded after schema heal');
          } else {
            const { error: fallbackError } = await supabase
              .from('menu_categories')
              .update({
                name: categoryData.name,
                sort_order: categoryData.sort_order
              })
              .eq('id', categoryData.id);
            if (fallbackError) throw fallbackError;
          }
        } else if (error) {
          throw error;
        }
      } else {
        let { error } = await supabase
          .from('menu_categories')
          .insert([{ 
            name: categoryData.name, 
            description: categoryData.description,
            image_url: categoryData.image_url,
            sort_order: categoryData.sort_order,
            is_active: categoryData.is_active,
            restaurant_id: restaurantId 
          }]);
          
        if (isMissingColumnError(error)) {
          logger.warn('MENU', 'INSERT_CATEGORY_FALLBACK', 'Columns missing, attempting fallback insert without new columns');
          await ensureMenuSchema();
          const retry = await supabase
            .from('menu_categories')
            .insert([{ 
              name: categoryData.name, 
              description: categoryData.description,
              image_url: categoryData.image_url,
              sort_order: categoryData.sort_order,
              is_active: categoryData.is_active,
              restaurant_id: restaurantId 
            }]);
          if (!retry.error) {
            logger.success('MENU', 'INSERT_CATEGORY_RETRY_SUCCESS', 'Category insert succeeded after schema heal');
          } else {
            const { error: fallbackError } = await supabase
              .from('menu_categories')
              .insert([{ 
                name: categoryData.name, 
                sort_order: categoryData.sort_order,
                restaurant_id: restaurantId 
              }]);
            if (fallbackError) throw fallbackError;
          }
        } else if (error) {
          throw error;
        }
      }
      
      await queryClient.invalidateQueries({ queryKey: ['menu_categories', restaurantId] });
      setIsCategoryDrawerOpen(false);
      logger.success('MENU', 'SAVE_CATEGORY_SUCCESS', 'Category saved successfully');
      toast({ title: categoryData.id ? 'Category Updated' : 'Category Created', description: 'Menu category is active.' });
    } catch (err: any) {
      logger.error('MENU', 'SAVE_CATEGORY_ERROR', err);
      toast({ title: 'Failed To Save Category', description: err.message || 'Please check logs.', variant: 'destructive' });
    }
  };

  const handleSaveFood = async (foodData: any) => {
    if (!restaurantId) return;
    logger.start('MENU', 'SAVE_FOOD', `Saving food ${foodData.name}`, foodData);
    
    try {
      const payload = {
        name: foodData.name,
        description: foodData.description,
        price: foodData.price,
        type: foodData.type,
        category_id: foodData.category_id,
        is_available: foodData.is_available,
        image_url: foodData.image_url,
        restaurant_id: restaurantId
      };
      
      if (foodData.id) {
        const { error } = await supabase.from('menu_items').update(payload).eq('id', foodData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('menu_items').insert([payload]);
        if (error) throw error;
      }
      
      await queryClient.invalidateQueries({ queryKey: ['menu_items', restaurantId] });
      if (selectedCategory) {
        await queryClient.invalidateQueries({ queryKey: ['menu_items', restaurantId, selectedCategory] });
      }
      setIsFoodDrawerOpen(false);
      logger.success('MENU', 'SAVE_FOOD_SUCCESS', 'Food item saved successfully');
      toast({ title: foodData.id ? 'Item Updated' : 'Item Created', description: `${foodData.name} saved successfully.` });
    } catch (err: any) {
      logger.error('MENU', 'SAVE_FOOD_ERROR', err);
      toast({ title: 'Failed To Save Food', description: err.message || 'Please check logs.', variant: 'destructive' });
    }
  };

  const handleDeleteFood = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this menu item?')) return;
    logger.start('MENU', 'DELETE_FOOD', `Deleting food id ${id}`);
    
    try {
      const { error } = await supabase.from('menu_items').delete().eq('id', id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['menu_items', restaurantId] });
      if (selectedCategory) {
        await queryClient.invalidateQueries({ queryKey: ['menu_items', restaurantId, selectedCategory] });
      }
      toast({ title: 'Item Deleted Successfully', description: 'Menu item removed from your list.' });
    } catch (err) {
      logger.error('MENU', 'DELETE_FOOD_ERROR', err);
      toast({ title: 'Failed To Delete Item', description: 'Please try again.', variant: 'destructive' });
    }
  };

  const handleToggleAvailability = async (id: string, isAvailable: boolean) => {
    try {
      const { error } = await supabase.from('menu_items').update({ is_available: isAvailable }).eq('id', id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['menu_items', restaurantId] });
      if (selectedCategory) {
        await queryClient.invalidateQueries({ queryKey: ['menu_items', restaurantId, selectedCategory] });
      }
      toast({ title: 'Item Updated', description: `Availability set to ${isAvailable ? 'available' : 'unavailable'}.` });
    } catch (err) {
      logger.error('MENU', 'TOGGLE_FOOD_AVAILABILITY_ERROR', err);
      toast({ title: 'Failed To Update Item', description: 'Availability update failed.', variant: 'destructive' });
    }
  };

  const resetFilters = () => {
    setFilterVegType(null);
    setFilterAvailability(null);
    setIsFilterDrawerOpen(false);
  };

  return (
    <div className="space-y-5 pb-24 relative">
      <PageHeader
        title="Menu Management"
        subtitle={`${totalItemsCount} items · ${availableItemsCount} available`}
        actions={
          <>
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-xl shadow-sm text-xs min-h-10 h-10 border-border bg-card/60"
              onClick={() => {
                setCategoryToEdit(null);
                setIsCategoryDrawerOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add Category
            </Button>
            <Button
              className="rounded-xl bg-primary hover:opacity-95 text-white font-bold transition-all shadow-glow shrink-0 h-10"
              onClick={() => {
                setItemToEdit(null);
                setIsFoodDrawerOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add Dish
            </Button>
          </>
        }
      />

      {/* Search & Category Tabs */}
      <div className="flex flex-wrap gap-2.5">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input 
            placeholder="Search items..." 
            className="w-full h-10 rounded-xl bg-card/60 border border-border pl-10 pr-10 text-sm outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button 
            className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-all size-6 grid place-items-center rounded-md",
              (filterVegType || filterAvailability !== null) ? "text-primary" : ""
            )}
            onClick={() => setIsFilterDrawerOpen(true)}
          >
            <SlidersHorizontal className="size-4" />
          </button>
        </div>

        <button 
          onClick={() => setSelectedCategory(undefined)}
          className={cn(
            "px-4 h-10 rounded-xl text-sm border font-medium transition-all",
            !selectedCategory 
              ? "bg-primary/15 border-primary/40 text-primary shadow-glow" 
              : "bg-card/40 border-border text-muted-foreground hover:text-foreground"
          )}
        >
          All Items
        </button>

        {categories?.map((cat) => (
          <button 
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={cn(
              "px-4 h-10 rounded-xl text-sm border font-medium transition-all flex items-center gap-2",
              selectedCategory === cat.id 
                ? "bg-primary/15 border-primary/40 text-primary shadow-glow" 
                : "bg-card/40 border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {cat.image_url && (
              <img src={cat.image_url} alt="" className="size-5 rounded-full object-cover" />
            )}
            <span>{cat.name}</span>
          </button>
        ))}

        {categoriesLoading && (
          <div className="flex gap-2">
            {[1, 2, 3].map(i => <div key={i} className="h-10 w-24 bg-card/60 animate-pulse border border-border rounded-xl" />)}
          </div>
        )}
      </div>

      {/* Food Items Grid */}
      <div>
        {itemsLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16 px-4 glass rounded-3xl border border-dashed border-border/40">
            <div className="bg-muted h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold text-foreground">No dishes found</h3>
            <p className="text-sm text-muted-foreground mt-1">Try adjusting filters or categories.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredItems.map(item => (
              <FoodCard 
                key={item.id} 
                item={item} 
                onEdit={(i) => {
                  setItemToEdit(i);
                  setIsFoodDrawerOpen(true);
                }}
                onDelete={handleDeleteFood}
                onToggleAvailability={handleToggleAvailability}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating Add FAB */}
      <button 
        onClick={() => {
          setItemToEdit(null);
          setIsFoodDrawerOpen(true);
        }}
        className="fixed bottom-20 md:bottom-6 right-4 md:right-6 h-14 w-14 bg-gradient-to-r from-primary to-primary/80 rounded-full shadow-[0_8px_16px_rgba(var(--color-primary-rgb),0.3)] flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all z-30"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* Add Food Drawer */}
      <AddFoodDrawer 
        isOpen={isFoodDrawerOpen} 
        onOpenChange={setIsFoodDrawerOpen}
        categories={categories || []}
        itemToEdit={itemToEdit}
        onSave={handleSaveFood}
      />

      {/* Filter Bottom Sheet */}
      <Drawer open={isFilterDrawerOpen} onOpenChange={setIsFilterDrawerOpen}>
        <DrawerContent className="rounded-t-[2.5rem] bg-background">
          <DrawerHeader>
            <DrawerTitle className="text-xl font-black text-foreground">Filters</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 py-2 space-y-6 max-w-md mx-auto w-full">
            <div className="space-y-3">
              <Label className="text-base font-bold text-foreground">Type</Label>
              <div className="flex gap-2">
                <Button 
                  variant={filterVegType === 'veg' ? 'default' : 'outline'} 
                  className={cn(
                    "flex-1 rounded-xl h-11 font-semibold",
                    filterVegType === 'veg' ? "bg-success text-white hover:bg-success/90" : "border-border"
                  )}
                  onClick={() => setFilterVegType(filterVegType === 'veg' ? null : 'veg')}
                >Veg</Button>
                <Button 
                  variant={filterVegType === 'non-veg' ? 'default' : 'outline'} 
                  className={cn(
                    "flex-1 rounded-xl h-11 font-semibold",
                    filterVegType === 'non-veg' ? "bg-destructive text-white hover:bg-destructive/90" : "border-border"
                  )}
                  onClick={() => setFilterVegType(filterVegType === 'non-veg' ? null : 'non-veg')}
                >Non-Veg</Button>
                <Button 
                  variant={filterVegType === 'egg' ? 'default' : 'outline'} 
                  className={cn(
                    "flex-1 rounded-xl h-11 font-semibold",
                    filterVegType === 'egg' ? "bg-warning text-warning-foreground hover:bg-warning/90" : "border-border"
                  )}
                  onClick={() => setFilterVegType(filterVegType === 'egg' ? null : 'egg')}
                >Egg</Button>
              </div>
            </div>
            
            <div className="space-y-3">
              <Label className="text-base font-bold text-foreground">Availability</Label>
              <div className="flex gap-2">
                <Button 
                  variant={filterAvailability === true ? 'default' : 'outline'} 
                  className={cn(
                    "flex-1 rounded-xl h-11 font-semibold",
                    filterAvailability === true ? "bg-success text-white hover:bg-success/90" : "border-border"
                  )}
                  onClick={() => setFilterAvailability(filterAvailability === true ? null : true)}
                >Available</Button>
                <Button 
                  variant={filterAvailability === false ? 'default' : 'outline'} 
                  className={cn(
                    "flex-1 rounded-xl h-11 font-semibold",
                    filterAvailability === false ? "bg-muted text-muted-foreground border-border" : "border-border"
                  )}
                  onClick={() => setFilterAvailability(filterAvailability === false ? null : false)}
                >Unavailable</Button>
              </div>
            </div>
          </div>
          <DrawerFooter className="flex-row gap-3 pt-4 border-t mt-6 max-w-md mx-auto w-full">
            <Button variant="outline" className="flex-1 h-12 rounded-xl font-bold" onClick={resetFilters}>Reset</Button>
            <DrawerClose asChild>
              <Button className="flex-[2] h-12 rounded-xl bg-primary text-primary-foreground font-bold">Apply Filters</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Add Category Drawer */}
      <AddCategoryDrawer
        isOpen={isCategoryDrawerOpen}
        onOpenChange={setIsCategoryDrawerOpen}
        categoryToEdit={categoryToEdit}
        onSave={handleSaveCategory}
      />
    </div>
  );
};
