import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useCustomerMenu } from '@/hooks/api/useCustomerMenu';
import { useCartStore } from '@/store/cartStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Minus } from 'lucide-react';

export const CustomerMenu = () => {
  const { restaurantId } = useParams();
  const { data, isLoading } = useCustomerMenu(restaurantId);
  const { items: cartItems, addItem, updateQuantity } = useCartStore();
  
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    if (activeCategory === 'all') return data.items;
    return data.items.filter(item => item.category_id === activeCategory);
  }, [data?.items, activeCategory]);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Categories Horizontal Scroll */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide sticky top-16 bg-muted/10 backdrop-blur-sm z-40 py-2">
        <Button 
          variant={activeCategory === 'all' ? "default" : "secondary"}
          onClick={() => setActiveCategory('all')}
          className="rounded-full whitespace-nowrap"
        >
          All Menu
        </Button>
        {data?.categories?.map((cat) => (
          <Button 
            key={cat.id} 
            variant={activeCategory === cat.id ? "default" : "secondary"}
            onClick={() => setActiveCategory(cat.id)}
            className="rounded-full whitespace-nowrap"
          >
            {cat.name}
          </Button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredItems.map(item => {
          const cartItem = cartItems.find(i => i.menu_item_id === item.id);
          const quantity = cartItem?.quantity || 0;

          return (
            <Card key={item.id} className="overflow-hidden border-0 shadow-sm">
              <CardContent className="p-4 flex gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full border-2 ${item.type === 'veg' ? 'border-green-500' : 'border-red-500'}`}>
                      <div className={`w-1 h-1 m-[2px] rounded-full ${item.type === 'veg' ? 'bg-green-500' : 'bg-red-500'}`} />
                    </div>
                    <h3 className="font-semibold text-lg">{item.name}</h3>
                  </div>
                  <p className="font-bold text-base">₹{item.price}</p>
                  {item.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                  )}
                </div>
                
                <div className="w-24 flex flex-col items-center justify-center">
                  {quantity === 0 ? (
                    <Button 
                      variant="outline" 
                      className="w-full font-bold text-primary border-primary/20 hover:bg-primary/5"
                      onClick={() => addItem({
                        id: Math.random().toString(),
                        menu_item_id: item.id,
                        name: item.name,
                        price: item.price,
                        quantity: 1,
                        type: item.type
                      })}
                    >
                      ADD
                    </Button>
                  ) : (
                    <div className="flex items-center justify-between w-full bg-primary/10 rounded-md border border-primary/20 p-1">
                      <button 
                        onClick={() => updateQuantity(cartItem!.id, quantity - 1)}
                        className="w-6 h-6 flex items-center justify-center rounded bg-background shadow-sm text-primary"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-bold text-primary">{quantity}</span>
                      <button 
                        onClick={() => updateQuantity(cartItem!.id, quantity + 1)}
                        className="w-6 h-6 flex items-center justify-center rounded bg-background shadow-sm text-primary"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
