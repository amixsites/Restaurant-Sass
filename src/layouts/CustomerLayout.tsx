import { Outlet, useParams, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingBag, UtensilsCrossed } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { Button } from '@/components/ui/button';

export const CustomerLayout = () => {
  const { restaurantId, tableId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const items = useCartStore(state => state.items);
  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);

  const isCartOrSuccessPage = location.pathname.includes('/cart') || location.pathname.includes('/success');

  return (
    <div className="flex flex-col min-h-screen bg-muted/10 pb-20">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b flex items-center justify-between px-4 h-16">
        <div className="flex items-center gap-2 text-primary font-bold text-xl">
          <UtensilsCrossed className="w-6 h-6" />
          <span>Our Menu</span>
        </div>
        <div className="text-sm font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">
          Table {tableId}
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto p-4">
        <Outlet />
      </main>

      {!isCartOrSuccessPage && totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-50">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">{totalItems} items</div>
              <div className="font-bold text-lg">₹{useCartStore.getState().total()}</div>
            </div>
            <Button size="lg" className="rounded-full px-8 gap-2" onClick={() => navigate(`/m/${restaurantId}/${tableId}/cart`)}>
              <ShoppingBag className="w-5 h-5" /> View Cart
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
