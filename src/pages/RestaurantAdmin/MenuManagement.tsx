import { useState, useMemo } from 'react';
import { useMenuCategories, useMenuItems } from '@/hooks/api/useMenu';
import { useAuthStore } from '@/store/authStore';
import { useTenantStore } from '@/store/tenantStore';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from '@/components/ui/drawer';
import { Label } from '@/components/ui/label';

import { Search, SlidersHorizontal, Plus, Loader2 } from 'lucide-react';
import { FoodCard } from '@/components/FoodCard';
import { AddFoodDrawer } from '@/components/AddFoodDrawer';
import { AddCategoryDrawer, PartialCategory } from '@/components/AddCategoryDrawer';

export type MenuItem = any;

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
  
  const { restaurantId } = useAuthStore();
  const { restaurantName } = useTenantStore();
  const queryClient = useQueryClient();

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

  // Handlers
  const handleSaveCategory = async (categoryData: PartialCategory) => {
    if (!restaurantId) return;
    try {
      if (categoryData.id) {
        const { error } = await supabase
          .from('menu_categories')
          .update({
            name: categoryData.name,
            description: categoryData.description,
            image_url: categoryData.image_url,
            sort_order: categoryData.sort_order,
            is_active: categoryData.is_active
          })
          .eq('id', categoryData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('menu_categories')
          .insert([{ 
            name: categoryData.name, 
            description: categoryData.description,
            image_url: categoryData.image_url,
            sort_order: categoryData.sort_order,
            is_active: categoryData.is_active,
            restaurant_id: restaurantId 
          }]);
        if (error) throw error;
      }
      
      await queryClient.invalidateQueries({ queryKey: ['menu_categories', restaurantId] });
      setIsCategoryDrawerOpen(false);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to save category');
    }
  };

  const handleSaveFood = async (itemData: Partial<MenuItem>) => {
    if (!restaurantId) return;
    try {
      if (itemToEdit) {
        // Update
        const { error } = await supabase
          .from('menu_items')
          .update(itemData)
          .eq('id', itemToEdit.id);
        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('menu_items')
          .insert([{ ...itemData, restaurant_id: restaurantId } as any]);
        if (error) throw error;
      }
      await queryClient.invalidateQueries({ queryKey: ['menu_items'] });
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleDeleteFood = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      const { error } = await supabase.from('menu_items').delete().eq('id', id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['menu_items'] });
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleAvailability = async (id: string, isAvailable: boolean) => {
    try {
      const { error } = await supabase.from('menu_items').update({ is_available: isAvailable }).eq('id', id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['menu_items'] });
    } catch (err) {
      console.error(err);
    }
  };

  const resetFilters = () => {
    setFilterVegType(null);
    setFilterAvailability(null);
    setIsFilterDrawerOpen(false);
  };

  return (
    <div className="flex flex-col h-full bg-muted/10 pb-24 relative">
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b shadow-sm rounded-b-xl px-4 py-3">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Menu</h1>
            <p className="text-xs text-muted-foreground">{restaurantName}</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="rounded-full shadow-sm text-xs"
            onClick={() => {
              setCategoryToEdit(null);
              setIsCategoryDrawerOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1" /> Category
          </Button>
        </div>
      </header>

      {/* Category Horizontal Scroll */}
      <div className="px-4 py-4 w-full overflow-hidden">
        <div className="flex gap-3 overflow-x-auto snap-x touch-pan-x custom-scrollbar pb-2">
          <Button 
            variant={!selectedCategory ? "default" : "outline"}
            onClick={() => setSelectedCategory(undefined)}
            className={`whitespace-nowrap rounded-full shrink-0 shadow-sm transition-all ${
              !selectedCategory ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-background hover:bg-muted'
            }`}
          >
            All Items
          </Button>
          {categories?.map((category) => (
            <div key={category.id} className="relative flex-shrink-0 group">
              <Button 
                variant={selectedCategory === category.id ? "default" : "outline"}
                onClick={() => setSelectedCategory(category.id)}
                className={`whitespace-nowrap rounded-full shrink-0 shadow-sm transition-all flex items-center gap-2 ${
                  selectedCategory === category.id ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-background hover:bg-muted'
                }`}
              >
                {category.image_url && (
                  <img src={category.image_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                )}
                {category.name}
              </Button>
            </div>
          ))}
          {categoriesLoading && (
            <div className="flex gap-2">
              {[1, 2, 3].map(i => <div key={i} className="h-10 w-24 bg-muted animate-pulse rounded-full" />)}
            </div>
          )}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="px-4 mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search food..." 
            className="pl-9 h-12 rounded-xl bg-background shadow-sm border-muted"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button 
          variant="outline" 
          size="icon" 
          className={`h-12 w-12 rounded-xl shadow-sm bg-background border-muted shrink-0 ${
            (filterVegType || filterAvailability !== null) ? 'border-orange-500 text-orange-500 bg-orange-50' : ''
          }`}
          onClick={() => setIsFilterDrawerOpen(true)}
        >
          <SlidersHorizontal className="w-5 h-5" />
        </Button>
      </div>

      {/* Food Items Grid */}
      <div className="px-4 flex-1">
        {itemsLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="bg-muted h-24 w-24 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground">No items found</h3>
            <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
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

      {/* Floating Action Button (FAB) */}
      <button 
        onClick={() => {
          setItemToEdit(null);
          setIsFoodDrawerOpen(true);
        }}
        className="fixed bottom-6 right-6 h-16 w-16 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full shadow-[0_8px_16px_rgba(249,115,22,0.4)] flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all z-30"
      >
        <Plus className="w-8 h-8" />
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
        <DrawerContent className="rounded-t-[2rem]">
          <DrawerHeader>
            <DrawerTitle className="text-xl font-bold">Filters</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 py-2 space-y-6">
            <div className="space-y-3">
              <Label className="text-base text-muted-foreground">Type</Label>
              <div className="flex gap-2">
                <Button 
                  variant={filterVegType === 'veg' ? 'default' : 'outline'} 
                  className={`flex-1 rounded-xl ${filterVegType === 'veg' ? 'bg-green-500 hover:bg-green-600 text-white' : ''}`}
                  onClick={() => setFilterVegType(filterVegType === 'veg' ? null : 'veg')}
                >Veg</Button>
                <Button 
                  variant={filterVegType === 'non-veg' ? 'default' : 'outline'} 
                  className={`flex-1 rounded-xl ${filterVegType === 'non-veg' ? 'bg-red-500 hover:bg-red-600 text-white' : ''}`}
                  onClick={() => setFilterVegType(filterVegType === 'non-veg' ? null : 'non-veg')}
                >Non-Veg</Button>
                <Button 
                  variant={filterVegType === 'egg' ? 'default' : 'outline'} 
                  className={`flex-1 rounded-xl ${filterVegType === 'egg' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : ''}`}
                  onClick={() => setFilterVegType(filterVegType === 'egg' ? null : 'egg')}
                >Egg</Button>
              </div>
            </div>
            
            <div className="space-y-3">
              <Label className="text-base text-muted-foreground">Availability</Label>
              <div className="flex gap-2">
                <Button 
                  variant={filterAvailability === true ? 'default' : 'outline'} 
                  className="flex-1 rounded-xl"
                  onClick={() => setFilterAvailability(filterAvailability === true ? null : true)}
                >Available</Button>
                <Button 
                  variant={filterAvailability === false ? 'default' : 'outline'} 
                  className="flex-1 rounded-xl"
                  onClick={() => setFilterAvailability(filterAvailability === false ? null : false)}
                >Unavailable</Button>
              </div>
            </div>
          </div>
          <DrawerFooter className="flex-row gap-3 pt-4 border-t mt-4">
            <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={resetFilters}>Reset</Button>
            <DrawerClose asChild>
              <Button className="flex-[2] h-12 rounded-xl bg-primary text-primary-foreground">Apply Filters</Button>
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
