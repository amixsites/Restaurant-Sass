import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { ArrowLeft, Minus, Plus, Trash2, Check, ChefHat, Receipt, Loader2 } from 'lucide-react';
import { MobileShell } from '@/components/MobileShell';
import { useCartStore } from '@/store/cartStore';
import { getApiUrl } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

function SuccessModal({ onNew, onView }: { onNew: () => void; onView: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-6"
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        className="bg-card rounded-3xl w-full max-w-sm p-7 text-center shadow-elevated border border-border/60"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.1 }}
          className="size-24 rounded-full bg-gradient-success mx-auto grid place-items-center shadow-glow mb-2 relative"
        >
          <motion.div
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex items-center justify-center text-white"
          >
            <Check className="size-12" strokeWidth={3.5} />
          </motion.div>
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.5, type: "spring" }}
            className="absolute -bottom-1 -right-1 size-10 rounded-full bg-card border-2 border-card grid place-items-center shadow-md"
          >
            <ChefHat className="size-5 text-primary" />
          </motion.div>
        </motion.div>
        <h2 className="text-xl font-extrabold mt-4 text-foreground">Order Sent to Kitchen!</h2>
        <p className="text-sm text-muted-foreground mt-1.5">Kitchen staff has received your order and started preparing it.</p>

        <div className="grid grid-cols-2 gap-2.5 mt-6">
          <button 
            onClick={onView} 
            className="h-12 rounded-2xl bg-secondary hover:bg-secondary/80 font-bold text-sm tap-highlight-none text-foreground transition-all"
          >
            View Menu
          </button>
          <button 
            onClick={onNew} 
            className="h-12 rounded-2xl bg-gradient-primary hover:opacity-95 text-white font-bold text-sm shadow-glow tap-highlight-none transition-all"
          >
            New Order
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export const Cart = () => {
  const { restaurantId: routeRestaurantId, tableId: routeTableId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { 
    items, 
    customerName, 
    customerPhone, 
    sessionId,
    restaurantId: storeRestaurantId,
    tableId: storeTableId,
    updateQuantity, 
    removeItem, 
    clearCart, 
    resetCart, 
    total 
  } = useCartStore();

  const isSessionRoute = window.location.pathname.startsWith('/menu');
  const restaurantId = routeRestaurantId || storeRestaurantId;
  const tableId = routeTableId || storeTableId;

  const getMenuPath = () => isSessionRoute 
    ? (sessionId ? `/menu?session_id=${sessionId}` : '/menu') 
    : `/m/${restaurantId}/${tableId}`;

  const [showTax, setShowTax] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [success, setSuccess] = useState(false);

  const subtotal = useMemo(() => total(), [items]);
  const tax = useMemo(() => (showTax ? Math.round(subtotal * 0.05) : 0), [subtotal, showTax]);
  const grandTotal = subtotal + tax;

  const handlePlaceOrder = async () => {
    if (items.length === 0 || !restaurantId || !tableId) return;

    setPlacing(true);
    try {
      if (isSessionRoute && sessionId) {
        // Place order securely via backend API
        const payload = {
          session_id: sessionId,
          customer_name: customerName,
          customer_phone: customerPhone,
          items: items.map(item => ({
            menu_item_id: item.menu_item_id,
            quantity: item.quantity,
            notes: item.notes || ''
          }))
        };

        const res = await fetch(getApiUrl('/api/orders/place'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || 'Failed to place order.');
        }
      } else {
        // Fallback: direct Supabase insert (for waiter/testing without tokens)
        // 1. Create the order
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert([{
            restaurant_id: restaurantId,
            table_id: tableId,
            status: 'PENDING',
            total_amount: grandTotal,
            customer_phone: customerPhone || null,
            notes: customerName ? `Customer: ${customerName}` : null
          }])
          .select()
          .single();

        if (orderError) throw orderError;

        // 2. Create order items (verify correct column names: unit_price, total_price)
        const orderItemsToInsert = items.map(item => ({
          order_id: order.id,
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity,
          notes: item.notes || '',
          status: 'PENDING'
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItemsToInsert);

        if (itemsError) throw itemsError;

        // 3. Update table status to occupied
        await supabase
          .from('tables')
          .update({ status: 'OCCUPIED' })
          .eq('id', tableId)
          .eq('status', 'AVAILABLE');
      }

      // Clear local cart
      clearCart();
      
      // Success modal & confetti
      setSuccess(true);
      confetti({ 
        particleCount: 120, 
        spread: 80, 
        origin: { y: 0.5 }, 
        colors: ["#f97316", "#fbbf24", "#10b981", "#fff"] 
      });

      toast({ 
        title: '🔔 Order Placed Successfully', 
        description: 'Your order has been sent to the kitchen.' 
      });
    } catch (error: any) {
      console.error('Failed to place order:', error);
      toast({ 
        title: '❌ Order Submission Failed', 
        description: error.message || 'Failed to place order. Please try again.', 
        variant: 'destructive' 
      });
    } finally {
      setPlacing(false);
    }
  };

  if (items.length === 0 && !success) {
    return (
      <MobileShell>
        <div className="px-5 pt-6 pb-3 flex items-center gap-3">
          <button 
            onClick={() => navigate(getMenuPath())} 
            className="size-10 rounded-full bg-secondary grid place-items-center text-foreground hover:bg-secondary/80 transition-all"
          >
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="font-bold text-lg text-foreground">Cart</h1>
        </div>
        <div className="flex-1 grid place-items-center p-8 text-center">
          <div>
            <div className="size-20 rounded-full bg-secondary grid place-items-center mx-auto mb-4">
              <Receipt className="size-8 text-muted-foreground" />
            </div>
            <p className="font-bold mb-1 text-foreground">Your cart is empty</p>
            <p className="text-sm text-muted-foreground mb-5">Add some delicious dishes from the menu</p>
            <button 
              onClick={() => navigate(getMenuPath())} 
              className="inline-flex px-6 h-12 items-center justify-center rounded-2xl bg-gradient-primary text-white font-bold shadow-glow hover:opacity-95 transition-all"
            >
              Browse Menu
            </button>
          </div>
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex items-center justify-between">
        <button 
          onClick={() => navigate(getMenuPath())} 
          className="size-10 rounded-full bg-secondary grid place-items-center tap-highlight-none text-foreground hover:bg-secondary/80 transition-all"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="text-center">
          <div className="text-[11px] text-muted-foreground font-medium">Review Order</div>
          <div className="font-bold text-sm text-foreground">My Cart</div>
        </div>
        <div className="size-10" />
      </div>

      {/* Customer details card */}
      <div className="px-5 mb-3">
        <div className="rounded-2xl bg-gradient-primary text-white p-4 shadow-glow flex items-center justify-between">
          <div>
            <div className="text-[11px] opacity-90 font-medium">Customer</div>
            <div className="font-extrabold text-base">{customerName || 'Walk-in'}</div>
            {customerPhone && <div className="text-xs opacity-90 mt-0.5">+91 {customerPhone}</div>}
          </div>
          <div className="text-right">
            <div className="text-[11px] opacity-90 font-medium">Restaurant POS</div>
            <div className="font-extrabold text-lg">DineSwift</div>
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-44 space-y-2.5">
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-2 mb-1">Items ({items.length})</div>
        <AnimatePresence>
          {items.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className="bg-card rounded-2xl p-3 border border-border/60 shadow-card flex gap-3 items-center"
            >
              <img 
                src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'} 
                alt={item.name} 
                className="size-14 rounded-xl object-cover" 
              />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate text-foreground">{item.name}</div>
                <div className="text-xs text-muted-foreground">₹{item.price} each</div>
                <div className="flex items-center gap-2 mt-1.5">
                  <button 
                    onClick={() => updateQuantity(item.id, item.quantity - 1)} 
                    className="size-7 rounded-full bg-secondary text-foreground hover:bg-secondary/85 grid place-items-center tap-highlight-none transition-all"
                  >
                    <Minus className="size-3" strokeWidth={3} />
                  </button>
                  <AnimatePresence mode="popLayout">
                    <motion.span
                      key={item.quantity}
                      initial={{ y: -8, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 8, opacity: 0 }}
                      className="font-extrabold text-sm w-5 text-center text-foreground"
                    >
                      {item.quantity}
                    </motion.span>
                  </AnimatePresence>
                  <button 
                    onClick={() => updateQuantity(item.id, item.quantity + 1)} 
                    className="size-7 rounded-full bg-primary text-white hover:bg-primary/90 grid place-items-center tap-highlight-none transition-all"
                  >
                    <Plus className="size-3" strokeWidth={3} />
                  </button>
                </div>
              </div>
              <div className="flex flex-col items-end justify-between h-full self-stretch">
                <button 
                  onClick={() => removeItem(item.id)} 
                  className="size-7 rounded-full grid place-items-center text-destructive hover:bg-red-50 dark:hover:bg-red-950/20 tap-highlight-none transition-all"
                >
                  <Trash2 className="size-3.5" />
                </button>
                <div className="font-extrabold text-sm text-foreground">₹{item.quantity * item.price}</div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Bill Summary */}
        <div className="bg-card rounded-2xl p-4 border border-border/60 shadow-card mt-4 space-y-2.5">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Bill Summary</div>
          <Row label={`Subtotal (${items.reduce((s, i) => s + i.quantity, 0)} items)`} value={`₹${subtotal}`} />
          
          <div className="flex items-center justify-between text-sm">
            <button onClick={() => setShowTax((v) => !v)} className="flex items-center gap-2 text-muted-foreground select-none">
              <span className={`size-4 rounded border-2 grid place-items-center transition-colors ${showTax ? "bg-primary border-primary text-white" : "border-border"}`}>
                {showTax && <Check className="size-3" strokeWidth={4} />}
              </span>
              Tax (5% GST)
            </button>
            <span className="font-bold text-foreground">₹{tax}</span>
          </div>
          
          <div className="border-t border-dashed border-border pt-2.5 flex items-center justify-between">
            <span className="font-extrabold text-foreground">Grand Total</span>
            <span className="font-extrabold text-xl text-primary">₹{grandTotal}</span>
          </div>
        </div>
      </div>

      {/* Place Order CTA Button */}
      <div className="absolute bottom-0 left-0 right-0 p-5 glass border-t border-border/60">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handlePlaceOrder}
          disabled={placing}
          className="w-full h-14 rounded-2xl bg-gradient-primary text-white shadow-glow font-extrabold text-base flex items-center justify-center gap-3 tap-highlight-none hover:opacity-95 transition-all"
        >
          {placing ? (
            <>
              <Loader2 className="size-5 animate-spin" />
              Sending to Kitchen…
            </>
          ) : (
            <>Place Order · ₹{grandTotal}</>
          )}
        </motion.button>
      </div>

      <AnimatePresence>
        {success && (
          <SuccessModal 
            onNew={() => { 
              resetCart(); 
              navigate(getMenuPath()); 
            }} 
            onView={() => { 
              setSuccess(false); 
              navigate(getMenuPath()); 
            }} 
          />
        )}
      </AnimatePresence>
    </MobileShell>
  );
};
