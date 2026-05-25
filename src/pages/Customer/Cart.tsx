import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCartStore } from '@/store/cartStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { Loader2, ArrowLeft, Plus, Minus, Trash2 } from 'lucide-react';

export const Cart = () => {
  const { restaurantId, tableId } = useParams();
  const navigate = useNavigate();
  const { items, updateQuantity, removeItem, total, clearCart } = useCartStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePlaceOrder = async () => {
    if (items.length === 0 || !restaurantId || !tableId) return;
    
    setIsSubmitting(true);
    try {
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{
          restaurant_id: restaurantId,
          table_id: tableId, // Needs proper UUID in real scenario based on table lookup
          status: 'PENDING',
          total_amount: total(),
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Insert items
      const orderItems = items.map(item => ({
        order_id: order.id,
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        unit_price: item.price,
        subtotal: item.price * item.quantity,
        notes: item.notes
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      clearCart();
      navigate(`/m/${restaurantId}/${tableId}/success`);
    } catch (error) {
      console.error('Failed to place order:', error);
      alert('Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
          <Trash2 className="w-10 h-10 text-muted-foreground opacity-50" />
        </div>
        <h2 className="text-2xl font-bold">Your cart is empty</h2>
        <p className="text-muted-foreground">Looks like you haven't added anything yet.</p>
        <Button onClick={() => navigate(-1)} className="mt-4 rounded-full px-8">Browse Menu</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold">Your Order</h1>
      </div>

      <div className="space-y-4">
        {items.map(item => (
          <Card key={item.id} className="border-0 shadow-sm">
            <CardContent className="p-4 flex gap-4 items-center">
              <div className="flex-1 space-y-1">
                <h3 className="font-semibold text-lg">{item.name}</h3>
                <p className="font-bold text-base text-muted-foreground">₹{item.price * item.quantity}</p>
                {item.notes && <p className="text-sm text-yellow-600">Note: {item.notes}</p>}
              </div>
              
              <div className="flex items-center gap-3 bg-muted rounded-md p-1">
                <button 
                  onClick={() => removeItem(item.id)}
                  className="w-8 h-8 flex items-center justify-center rounded text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2 bg-background rounded border px-2 py-1">
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="font-bold text-sm w-4 text-center">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-sm bg-primary/5 border-primary/10">
        <CardContent className="p-4 space-y-2">
          <div className="flex justify-between text-muted-foreground">
            <span>Item Total</span>
            <span>₹{total()}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Taxes & Charges</span>
            <span>₹{Math.round(total() * 0.05)}</span>
          </div>
          <div className="border-t border-primary/10 my-2 pt-2 flex justify-between font-bold text-lg">
            <span>Grand Total</span>
            <span>₹{total() + Math.round(total() * 0.05)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-50">
        <div className="max-w-2xl mx-auto flex gap-4">
          <Button 
            size="lg" 
            variant="outline" 
            className="flex-1 rounded-full"
            onClick={() => navigate(-1)}
          >
            Add More
          </Button>
          <Button 
            size="lg" 
            className="flex-1 rounded-full text-lg"
            onClick={handlePlaceOrder}
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Place Order'}
          </Button>
        </div>
      </div>
    </div>
  );
};
