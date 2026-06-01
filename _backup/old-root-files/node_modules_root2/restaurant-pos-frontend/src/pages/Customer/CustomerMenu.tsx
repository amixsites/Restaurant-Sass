import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ArrowLeft, ShoppingBag, Plus, Minus, LayoutGrid, List, User, Phone, Hash, ArrowRight, ChefHat, Loader2, AlertCircle } from 'lucide-react';
import { MobileShell } from '@/components/MobileShell';
import { useCustomerMenu } from '@/hooks/api/useCustomerMenu';
import { useCartStore } from '@/store/cartStore';
import { getApiUrl } from '@/lib/api';
import { supabase } from '@/lib/supabase';

// Veg/Non-veg dot indicator
function VegDot({ veg }: { veg: boolean }) {
  return (
    <span className={`inline-block size-3.5 border-2 rounded-[3px] grid place-items-center ${veg ? "border-green-500" : "border-red-500"}`}>
      <span className={`size-1.5 rounded-full ${veg ? "bg-green-500" : "bg-red-500"}`} />
    </span>
  );
}

// Qty Control Component
function QtyControl({ qty, onInc, onDec }: { qty: number; onInc: () => void; onDec: () => void }) {
  return (
    <motion.div
      layout
      className="flex items-center bg-gradient-primary rounded-full text-white shadow-glow overflow-hidden"
    >
      <motion.button whileTap={{ scale: 0.85 }} onClick={onDec} className="size-9 grid place-items-center tap-highlight-none">
        <Minus className="size-4" strokeWidth={3} />
      </motion.button>
      <AnimatePresence mode="popLayout">
        <motion.span
          key={qty}
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 10, opacity: 0 }}
          className="w-6 text-center text-sm font-extrabold"
        >
          {qty}
        </motion.span>
      </AnimatePresence>
      <motion.button whileTap={{ scale: 0.85 }} onClick={onInc} className="size-9 grid place-items-center tap-highlight-none">
        <Plus className="size-4" strokeWidth={3} />
      </motion.button>
    </motion.div>
  );
}

// Category Emoji Mapper
function getCategoryEmoji(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('pizza')) return '🍕';
  if (lower.includes('burger')) return '🍔';
  if (lower.includes('shake') || lower.includes('drink') || lower.includes('beverage') || lower.includes('coffee') || lower.includes('juice')) return '🍹';
  if (lower.includes('dessert') || lower.includes('cake') || lower.includes('sweet') || lower.includes('ice')) return '🍰';
  if (lower.includes('starter') || lower.includes('appetizer')) return '🍢';
  if (lower.includes('chinese') || lower.includes('noodle')) return '🍜';
  if (lower.includes('rice') || lower.includes('biryani')) return '🍛';
  if (lower.includes('pasta')) return '🍝';
  if (lower.includes('salad')) return '🥗';
  return '🍽️';
}

// Floating Input for the customer details form
function FloatingInput({
  label, value, onChange, type = "text", icon: Icon, inputMode, disabled = false
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; icon: React.ComponentType<{ className?: string }>;
  inputMode?: "numeric" | "tel" | "text"; disabled?: boolean;
}) {
  const [focus, setFocus] = useState(false);
  const float = focus || value.length > 0;
  return (
    <div className="relative">
      <div
        className={`flex items-center gap-3 px-4 pt-6 pb-2 rounded-2xl border-2 transition-all bg-card ${
          focus ? "border-primary shadow-glow" : "border-border"
        } ${disabled ? "opacity-75 bg-muted/10" : ""}`}
      >
        <Icon className={`size-5 transition-colors ${focus ? "text-primary" : "text-muted-foreground"}`} />
        <div className="flex-1 relative">
          <label
            className={`absolute left-0 pointer-events-none transition-all font-medium ${
              float ? "-top-4 text-xs text-primary" : "top-0 text-base text-muted-foreground"
            }`}
          >
            {label}
          </label>
          <input
            type={type}
            inputMode={inputMode}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => !disabled && setFocus(true)}
            onBlur={() => setFocus(false)}
            disabled={disabled}
            className="w-full bg-transparent outline-none text-base font-semibold text-foreground disabled:text-muted-foreground"
          />
        </div>
      </div>
    </div>
  );
}

export const CustomerMenu = () => {
  const { restaurantId: routeRestaurantId, tableId: routeTableId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [restaurantId, setRestaurantId] = useState<string>(routeRestaurantId || '');
  const [tableId, setTableId] = useState<string>(routeTableId || '');
  const [restaurantName, setRestaurantName] = useState<string>('DineSwift');
  const [tableNumber, setTableNumber] = useState<string>('');
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const { data, isLoading: isMenuLoading } = useCustomerMenu(restaurantId);
  const { items: cartItems, addItem, updateQuantity, customerName, customerPhone, setCustomerDetails } = useCartStore();

  const isSessionRoute = window.location.pathname.startsWith('/menu');
  const getCartPath = () => isSessionRoute ? '/menu/cart' : `/m/${restaurantId}/${tableId}/cart`;

  // Fetch session details if session-based route
  useEffect(() => {
    const initSession = async () => {
      const querySessionId = searchParams.get('session_id');
      const storedSessionId = localStorage.getItem('dine_swift_session_id');
      const activeSessionId = querySessionId || storedSessionId;

      if (activeSessionId && !routeRestaurantId && !routeTableId) {
        setIsSessionLoading(true);
        setSessionError(null);
        try {
          const url = getApiUrl(`/api/session/${activeSessionId}`);
          console.log('SESSION_FETCH', { sessionId: activeSessionId, url });
          const res = await fetch(url);
          console.log('SESSION_STATUS', { status: res.status, ok: res.ok });

          let data: any = null;
          try {
            data = await res.json();
          } catch (parseErr) {
            console.error('SESSION_PARSE_ERROR', parseErr);
            setSessionError(parseErr instanceof Error ? parseErr.message : JSON.stringify(parseErr));
            setIsSessionLoading(false);
            return;
          }

          console.log('SESSION_DATA', data);

          if (res.ok) {
            // Defensive checks for expected response shape
            if (!data || !data.session_id || !data.restaurant_id || !data.table_id) {
              console.error('SESSION_INVALID_PAYLOAD', data);
              setSessionError('SESSION_INVALID_PAYLOAD: unexpected session response shape.');
            } else {
              setRestaurantId(data.restaurant_id);
              setTableId(data.table_id);
              setRestaurantName(data.restaurant_name || 'DineSwift');
              setTableNumber(data.table_number || '');

              // Sync with Zustand and localStorage
              useCartStore.getState().setSessionDetails(activeSessionId, data.restaurant_id, data.table_id);
              localStorage.setItem('dine_swift_session_id', activeSessionId);
            }
          } else {
            console.error('SESSION_LOAD_FAILED', data);
            setSessionError(data?.detail || (typeof data === 'string' ? data : JSON.stringify(data)) || 'Invalid or expired session. Please scan table QR again.');
          }
        } catch (err: any) {
          console.error('SESSION_LOAD_ERROR', err);
          setSessionError(err instanceof Error ? err.message : JSON.stringify(err));
        } finally {
          setIsSessionLoading(false);
        }
      } else if (routeRestaurantId && routeTableId) {
        setRestaurantId(routeRestaurantId);
        setTableId(routeTableId);
        
        // Fetch restaurant details
        const fetchRest = async () => {
          const { data: restData } = await supabase.from('restaurants').select('name').eq('id', routeRestaurantId).single();
          if (restData?.name) setRestaurantName(restData.name);
        };
        fetchRest();
        
        // Fetch table details
        const fetchTable = async () => {
          const { data: tableData } = await supabase.from('tables').select('table_number').eq('id', routeTableId).single();
          if (tableData?.table_number) setTableNumber(tableData.table_number);
        };
        fetchTable();
      } else {
        setSessionError('No session found. Please scan a table QR code to view the menu.');
      }
    };
    initSession();
  }, [routeRestaurantId, routeTableId, searchParams]);

  // Registration Form State
  const [name, setName] = useState(customerName);
  const [mobile, setMobile] = useState(customerPhone);
  const [time, setTime] = useState("");

  // Menu State
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [search, setSearch] = useState("");
  const [viewAll, setViewAll] = useState(false);

  // Time tracker
  useEffect(() => {
    const t = () => setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    t();
    const id = setInterval(t, 30000);
    return () => clearInterval(id);
  }, []);

  const totalItems = useMemo(() => cartItems.reduce((s, i) => s + i.quantity, 0), [cartItems]);
  const totalAmount = useMemo(() => cartItems.reduce((s, i) => s + i.quantity * i.price, 0), [cartItems]);

  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    let list = data.items;
    if (!viewAll && activeCategory !== 'all') {
      list = list.filter((f) => f.category_id === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((f) => f.name.toLowerCase().includes(q) || (f.description && f.description.toLowerCase().includes(q)));
    }
    return list;
  }, [data?.items, activeCategory, search, viewAll]);

  // Handle setting first category as active when loaded
  useEffect(() => {
    if (data?.categories?.length && activeCategory === 'all') {
      setActiveCategory(data.categories[0].id);
    }
  }, [data?.categories]);

  const validRegistration = name.trim().length > 1 && mobile.length >= 10;

  const submitRegistration = () => {
    if (!validRegistration) return;
    setCustomerDetails(name, mobile);
  };

  if (isMenuLoading || isSessionLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (sessionError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-6 text-center bg-background text-foreground">
        <div className="size-16 rounded-full bg-destructive/15 text-destructive grid place-items-center mb-4">
          <AlertCircle className="size-8" />
        </div>
        <h3 className="text-xl font-bold">QR Session Error</h3>
        <p className="text-muted-foreground mt-2 max-w-xs text-sm">{sessionError}</p>
        <p className="text-xs text-muted-foreground mt-4 italic">Please scan your table QR code again to restore ordering.</p>
      </div>
    );
  }

  // SCREEN 1: Registration form if customer details are missing
  if (!customerName || !customerPhone) {
    return (
      <MobileShell>
        <div className="flex-1 overflow-y-auto no-scrollbar px-6 pt-10 pb-32">
          {/* Header */}
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-2.5">
              <div className="size-11 rounded-2xl bg-gradient-primary grid place-items-center shadow-glow">
                <ChefHat className="size-5 text-white" />
              </div>
              <div>
                <div className="font-extrabold text-lg leading-tight truncate max-w-[150px]">{restaurantName}</div>
                <div className="text-[11px] text-muted-foreground font-medium">Digital Ordering</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Now</div>
                <div className="text-sm font-bold">{time}</div>
              </div>
              <div className="size-10 rounded-full bg-orange-100 dark:bg-orange-950/30 grid place-items-center font-bold text-primary border border-orange-200 dark:border-orange-900/50">
                T
              </div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-extrabold tracking-tight">New Order</h1>
            <p className="text-muted-foreground text-sm mt-1">Add your details to access the menu</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="rounded-3xl bg-card shadow-card p-5 space-y-5 border border-border/60"
          >
            <FloatingInput label="Your Name" value={name} onChange={setName} icon={User} />
            <FloatingInput label="Mobile Number" value={mobile} onChange={(v) => setMobile(v.replace(/\D/g, "").slice(0, 10))} icon={Phone} type="tel" inputMode="tel" />
            <FloatingInput label="Table Number" value={tableNumber ? `T-${tableNumber}` : 'Loading...'} onChange={() => {}} icon={Hash} disabled={true} />
          </motion.div>
        </div>

        {/* Sticky CTA */}
        <div className="absolute bottom-0 left-0 right-0 p-5 glass border-t border-border/60">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={submitRegistration}
            disabled={!validRegistration}
            className={`w-full h-14 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all tap-highlight-none ${
              validRegistration ? "bg-gradient-primary text-white shadow-glow" : "bg-muted text-muted-foreground"
            }`}
          >
            Continue to Menu
            <ArrowRight className="size-5" />
          </motion.button>
        </div>
      </MobileShell>
    );
  }

  // SCREEN 2: Menu Listing (Original dine-swift-pos-main layout)
  return (
    <MobileShell>
      {/* Header */}
      <div className="px-5 pt-6 pb-3 bg-background sticky top-0 z-20">
        <div className="flex items-center justify-between mb-3">
          <button 
            onClick={() => setCustomerDetails('', '')} // Let them edit their details/go back
            className="size-10 rounded-full bg-secondary grid place-items-center tap-highlight-none"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div className="text-center">
            <div className="text-[11px] text-muted-foreground font-medium">Table T-{tableNumber} · {customerName.split(" ")[0]}</div>
            <div className="font-bold text-sm">Menu</div>
          </div>
          <button 
            onClick={() => navigate(getCartPath())} 
            className="size-10 relative rounded-full bg-secondary grid place-items-center tap-highlight-none"
          >
            <ShoppingBag className="size-5" />
            {totalItems > 0 && (
              <motion.span
                key={totalItems}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-primary text-white text-[10px] font-bold grid place-items-center shadow-glow"
              >
                {totalItems}
              </motion.span>
            )}
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="size-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search dishes…"
            className="w-full h-11 pl-11 pr-4 rounded-2xl bg-secondary border border-border text-sm font-medium outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 mt-3 p-1 bg-secondary rounded-full w-fit">
          <button
            onClick={() => setViewAll(false)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${!viewAll ? "bg-card shadow-card text-foreground" : "text-muted-foreground"}`}
          >
            <LayoutGrid className="size-3.5" /> Category
          </button>
          <button
            onClick={() => setViewAll(true)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${viewAll ? "bg-card shadow-card text-foreground" : "text-muted-foreground"}`}
          >
            <List className="size-3.5" /> All
          </button>
        </div>
      </div>

      {/* Categories */}
      {!viewAll && data?.categories && (
        <div className="px-5 pb-2">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {data.categories.map((c) => {
              const isActive = activeCategory === c.id;
              return (
                <motion.button
                  key={c.id}
                  whileTap={{ scale: 0.92 }}
                  animate={{ scale: isActive ? 1.04 : 1 }}
                  onClick={() => setActiveCategory(c.id)}
                  className={`px-4 h-10 rounded-full text-xs font-bold whitespace-nowrap tap-highlight-none transition-colors ${
                    isActive
                      ? "bg-gradient-primary text-white shadow-glow"
                      : "bg-secondary text-foreground"
                  }`}
                >
                  {getCategoryEmoji(c.name)} {c.name}
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* Food List */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pt-3 pb-36 space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredItems.map((item) => {
            const cartItem = cartItems.find((c) => c.menu_item_id === item.id);
            const quantity = cartItem?.quantity || 0;

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="bg-card rounded-3xl p-3 shadow-card border border-border/60 flex gap-3">
                  <div className="relative size-24 rounded-2xl overflow-hidden flex-shrink-0 bg-muted">
                    <img 
                      src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'} 
                      alt={item.name} 
                      loading="lazy" 
                      className="w-full h-full object-cover" 
                    />
                    <div className="absolute top-1.5 left-1.5 bg-card/90 rounded-md p-0.5">
                      <VegDot veg={item.type === 'veg'} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex-1">
                      <h3 className="font-bold text-sm leading-tight truncate">{item.name}</h3>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                      )}
                    </div>
                    <div className="flex items-end justify-between mt-1.5">
                      <div className="font-extrabold text-base">₹{item.price}</div>
                      {quantity > 0 ? (
                        <QtyControl
                          qty={quantity}
                          onInc={() => updateQuantity(cartItem!.id, quantity + 1)}
                          onDec={() => updateQuantity(cartItem!.id, quantity - 1)}
                        />
                      ) : (
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => addItem({
                            id: Math.random().toString(36).substring(7),
                            menu_item_id: item.id,
                            name: item.name,
                            price: Number(item.price),
                            quantity: 1,
                            type: item.type,
                            image_url: item.image_url
                          })}
                          className="px-4 h-9 rounded-full bg-primary/10 text-primary border-2 border-primary font-bold text-xs tap-highlight-none hover:bg-primary hover:text-white transition-all"
                        >
                          ADD +
                        </motion.button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {filteredItems.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-10">No dishes match your search.</div>
        )}
      </div>

      {/* Floating cart */}
      <AnimatePresence>
        {totalItems > 0 && (
          <motion.button
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={() => navigate(getCartPath())}
            className="absolute bottom-5 left-5 right-5 h-14 rounded-2xl bg-gradient-primary text-white shadow-glow flex items-center justify-between px-5 tap-highlight-none"
          >
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-full bg-white/20 grid place-items-center">
                <ShoppingBag className="size-4" />
              </div>
              <div className="text-left">
                <div className="text-[11px] opacity-90 font-medium">{totalItems} item{totalItems > 1 ? "s" : ""}</div>
                <div className="text-sm font-extrabold">₹{totalAmount}</div>
              </div>
            </div>
            <div className="font-bold text-sm flex items-center gap-1">View Cart →</div>
          </motion.button>
        )}
      </AnimatePresence>
    </MobileShell>
  );
};
