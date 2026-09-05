import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChefHat,
  Hash,
  LayoutGrid,
  List,
  Minus,
  Phone,
  Plus,
  Receipt,
  Search,
  ShoppingBag,
  Trash2,
  User,
} from 'lucide-react';
import { MobileShell } from '@/components/MobileShell';
import { useTables } from '@/hooks/api/useTables';
import { useMenuCategories, useMenuItems } from '@/hooks/api/useMenu';
import { useTakeOrderCart } from '@/store/useTakeOrderCart';
import { useTakeOrder } from '@/hooks/api/useTakeOrder';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

function FloatingInput({
  label,
  value,
  onChange,
  type = 'text',
  icon: Icon,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  icon: React.ComponentType<{ className?: string }>;
  inputMode?: 'numeric' | 'tel' | 'text';
}) {
  const [focus, setFocus] = useState(false);
  const float = focus || value.length > 0;

  return (
    <div className="relative">
      <div
        className={cn(
          'flex items-center gap-3 rounded-2xl border-2 bg-surface px-4 pb-2 pt-6 transition-all',
          focus ? 'border-primary shadow-glow' : 'border-border'
        )}
      >
        <Icon className={cn('size-5 transition-colors', focus ? 'text-primary' : 'text-muted-foreground')} />
        <div className="relative flex-1">
          <label
            className={cn(
              'pointer-events-none absolute left-0 font-medium transition-all',
              float ? '-top-4 text-xs text-primary' : 'top-0 text-base text-muted-foreground'
            )}
          >
            {label}
          </label>
          <input
            type={type}
            inputMode={inputMode}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
            className="w-full bg-transparent text-base font-semibold text-foreground outline-none"
          />
        </div>
      </div>
    </div>
  );
}

function VegDot({ type }: { type?: string }) {
  const isVeg = type?.toLowerCase() !== 'non-veg';

  return (
    <span className={cn('grid size-3.5 place-items-center rounded-[3px] border-2', isVeg ? 'border-green-600' : 'border-destructive')}>
      <span className={cn('size-1.5 rounded-full', isVeg ? 'bg-green-600' : 'bg-destructive')} />
    </span>
  );
}

function QtyControl({ qty, onInc, onDec }: { qty: number; onInc: () => void; onDec: () => void }) {
  return (
    <motion.div layout className="flex items-center overflow-hidden rounded-full bg-gradient-primary text-primary-foreground shadow-glow">
      <motion.button whileTap={{ scale: 0.85 }} onClick={onDec} className="grid size-9 place-items-center tap-highlight-none">
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
      <motion.button whileTap={{ scale: 0.85 }} onClick={onInc} className="grid size-9 place-items-center tap-highlight-none">
        <Plus className="size-4" strokeWidth={3} />
      </motion.button>
    </motion.div>
  );
}

function FoodImage({ src, name }: { src?: string | null; name: string }) {
  if (src) {
    return <img src={src} alt={name} loading="lazy" width={512} height={512} className="h-full w-full object-cover" />;
  }

  return (
    <div className="grid h-full w-full place-items-center bg-gradient-to-br from-orange-100 to-amber-50 text-primary">
      <ChefHat className="size-9" />
    </div>
  );
}

function OrderSuccessModal({ onNew, onView }: { onNew: () => void; onView: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 grid place-items-center bg-black/50 p-6 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
        className="w-full max-w-sm rounded-3xl border border-border/60 bg-card p-7 text-center shadow-elevated"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.1 }}
          className="relative mx-auto mb-2 grid size-24 place-items-center rounded-full bg-gradient-success shadow-glow"
        >
          <Check className="size-12 text-white" strokeWidth={3.5} />
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.5, type: 'spring' }}
            className="absolute -bottom-1 -right-1 grid size-10 place-items-center rounded-full border-2 border-card bg-card shadow-md"
          >
            <ChefHat className="size-5 text-primary" />
          </motion.div>
        </motion.div>
        <h2 className="mt-4 text-xl font-extrabold">Order Sent to Kitchen!</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">Kitchen staff has received the order and started preparing it.</p>

        <div className="mt-6 grid grid-cols-2 gap-2.5">
          <button onClick={onView} className="h-12 rounded-2xl bg-secondary text-sm font-bold tap-highlight-none">
            View Orders
          </button>
          <button onClick={onNew} className="h-12 rounded-2xl bg-gradient-primary text-sm font-bold text-primary-foreground shadow-glow tap-highlight-none">
            New Order
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export const TakeOrder = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [screen, setScreen] = useState<'customer' | 'menu' | 'cart'>('customer');
  const [activeCategory, setActiveCategory] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  const [viewAll, setViewAll] = useState(false);
  const [success, setSuccess] = useState(false);
  const [time, setTime] = useState('');

  const { data: tables } = useTables();
  const { data: categories, isLoading: categoriesLoading } = useMenuCategories();
  const effectiveCategory = viewAll ? undefined : activeCategory || categories?.[0]?.id;
  const { data: menuItems, isLoading: itemsLoading } = useMenuItems(effectiveCategory);
  const { mutateAsync: submitOrder, isPending } = useTakeOrder();

  const {
    selectedTableId,
    customerName,
    customerPhone,
    items,
    setSelectedTable,
    setCustomerDetails,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
  } = useTakeOrderCart();

  const selectedTable = useMemo(() => tables?.find((table) => table.id === selectedTableId), [tables, selectedTableId]);
  const selectedTableNumber = selectedTable?.table_number || '';
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const tableId = searchParams.get('table');
    if (tableId && tableId !== selectedTableId) {
      setSelectedTable(tableId);
    }
  }, [searchParams, selectedTableId, setSelectedTable]);


  const categoryNameById = useMemo(() => {
    return new Map((categories || []).map((category) => [category.id, category.name]));
  }, [categories]);

  const filteredItems = useMemo(() => {
    let list = menuItems || [];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((item) => item.name.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q));
    }
    return list;
  }, [menuItems, search]);

  const validateCustomer = customerName.trim().length > 1 && !!selectedTableId;

  const submitCustomer = () => {
    if (!validateCustomer) {
      toast({ title: 'Details Required', description: 'Please enter customer name and select a table.', variant: 'destructive' });
      return;
    }
    setScreen('menu');
  };

  const handleSendToKitchen = async () => {
    if (!selectedTableId) {
      toast({ title: 'Table Required', description: 'Please select a table before placing the order.', variant: 'destructive' });
      setScreen('customer');
      return;
    }

    if (items.length === 0) {
      toast({ title: 'Empty Cart', description: 'Please add food items before sending to kitchen.', variant: 'destructive' });
      setScreen('menu');
      return;
    }

    try {
      await submitOrder({ tableId: selectedTableId, items, customerPhone, customerName });
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      await queryClient.invalidateQueries({ queryKey: ['tables'] });
      setSuccess(true);
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 }, colors: ['#f59e0b', '#fbbf24', '#10b981', '#fff'] });
    } catch (error) {
      toast({
        title: 'Order Placement Failed',
        description: error instanceof Error ? error.message : 'Could not send order to kitchen.',
        variant: 'destructive',
      });
    }
  };

  const returnToDashboard = () => {
    if (location.pathname.startsWith('/waiter')) {
      navigate('/waiter');
    } else if (location.pathname.startsWith('/admin')) {
      navigate('/admin');
    } else {
      navigate('/');
    }
  };

  const startNewOrder = () => {
    clearCart();
    setSearch('');
    setViewAll(false);
    setSuccess(false);
    setScreen('customer');
  };

  const customerScreen = (
    <>
      <div className="flex-1 overflow-y-auto px-6 pb-32 pt-10 no-scrollbar">
        <div className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid size-11 place-items-center rounded-2xl bg-gradient-primary shadow-glow">
              <ChefHat className="size-5 text-primary-foreground" />
            </div>
            <div>
              <div className="text-lg font-extrabold leading-tight">Servo</div>
              <div className="text-[11px] font-medium text-muted-foreground">Restaurant POS</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Now</div>
              <div className="text-sm font-bold">{time}</div>
            </div>
            <div className="grid size-10 place-items-center rounded-full border border-border bg-accent font-bold text-accent-foreground">R</div>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight">New Order</h1>
          <p className="mt-1 text-sm text-muted-foreground">Add customer details to get started</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="space-y-5 rounded-3xl border border-border/60 bg-card p-5 shadow-card"
        >
          <FloatingInput label="Customer Name" value={customerName} onChange={(value) => setCustomerDetails(customerPhone, value)} icon={User} />
          <FloatingInput
            label="Mobile Number"
            value={customerPhone}
            onChange={(value) => setCustomerDetails(value.replace(/\D/g, '').slice(0, 10), customerName)}
            icon={Phone}
            type="tel"
            inputMode="tel"
          />
          <FloatingInput label="Table Number" value={selectedTableNumber} onChange={() => undefined} icon={Hash} inputMode="numeric" />
        </motion.div>

        <div className="mt-5 grid grid-cols-4 gap-2">
          {(tables || []).slice(0, 12).map((table) => (
            <button
              key={table.id}
              onClick={() => setSelectedTable(table.id)}
              className={cn(
                'rounded-2xl border-2 py-3 text-sm font-bold transition-all tap-highlight-none',
                selectedTableId === table.id
                  ? 'border-primary bg-primary text-primary-foreground shadow-glow'
                  : 'border-border bg-surface text-foreground'
              )}
            >
              T{table.table_number}
            </button>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 border-t border-border/60 p-5 glass">
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={submitCustomer}
          disabled={!validateCustomer}
          className={cn(
            'flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-base font-bold transition-all tap-highlight-none',
            validateCustomer ? 'bg-gradient-primary text-primary-foreground shadow-glow' : 'bg-muted text-muted-foreground'
          )}
        >
          Continue to Menu
          <ArrowRight className="size-5" />
        </motion.button>
      </div>
    </>
  );

  const menuScreen = (
    <>
      <div className="sticky top-0 z-20 bg-background px-5 pb-3 pt-6">
        <div className="mb-3 flex items-center justify-between">
          <button onClick={() => setScreen('customer')} className="grid size-10 place-items-center rounded-full bg-secondary tap-highlight-none">
            <ArrowLeft className="size-5" />
          </button>
          <div className="text-center">
            <div className="text-[11px] font-medium text-muted-foreground">Table {selectedTableNumber || '--'} - {customerName.split(' ')[0]}</div>
            <div className="text-sm font-bold">Menu</div>
          </div>
          <button onClick={() => setScreen('cart')} className="relative grid size-10 place-items-center rounded-full bg-secondary tap-highlight-none">
            <ShoppingBag className="size-5" />
            {totalItems > 0 && (
              <motion.span
                key={totalItems}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-glow"
              >
                {totalItems}
              </motion.span>
            )}
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search dishes..."
            className="h-11 w-full rounded-2xl border border-border bg-secondary pl-11 pr-4 text-sm font-medium outline-none transition-colors focus:border-primary"
          />
        </div>

        <div className="mt-3 flex w-fit items-center gap-1 rounded-full bg-secondary p-1">
          <button
            onClick={() => setViewAll(false)}
            className={cn('flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all', !viewAll ? 'bg-card text-foreground shadow-card' : 'text-muted-foreground')}
          >
            <LayoutGrid className="size-3.5" /> Category
          </button>
          <button
            onClick={() => setViewAll(true)}
            className={cn('flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all', viewAll ? 'bg-card text-foreground shadow-card' : 'text-muted-foreground')}
          >
            <List className="size-3.5" /> All
          </button>
        </div>
      </div>

      {!viewAll && (
        <div className="px-5 pb-2">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {categoriesLoading && <div className="py-2 text-xs font-bold text-muted-foreground">Loading categories...</div>}
            {categories?.map((category) => {
              const isActive = effectiveCategory === category.id;
              return (
                <motion.button
                  key={category.id}
                  whileTap={{ scale: 0.92 }}
                  animate={{ scale: isActive ? 1.04 : 1 }}
                  onClick={() => setActiveCategory(category.id)}
                  className={cn(
                    'h-10 whitespace-nowrap rounded-full px-4 text-xs font-bold transition-colors tap-highlight-none',
                    isActive ? 'bg-gradient-primary text-primary-foreground shadow-glow' : 'bg-secondary text-foreground'
                  )}
                >
                  {category.name}
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto px-5 pb-36 pt-3 no-scrollbar">
        <AnimatePresence mode="popLayout">
          {filteredItems.map((item) => {
            const cartItem = items.find((cartEntry) => cartEntry.id === item.id);
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <motion.div layout whileTap={{ scale: 0.985 }} className="flex gap-3 rounded-3xl border border-border/60 bg-card p-3 shadow-card">
                  <div className="relative size-24 flex-shrink-0 overflow-hidden rounded-2xl bg-muted">
                    <FoodImage src={item.image_url} name={item.name} />
                    <div className="absolute left-1.5 top-1.5 rounded-md bg-card/90 p-0.5">
                      <VegDot type={item.type} />
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex-1">
                      <h3 className="truncate text-sm font-bold leading-tight">{item.name}</h3>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.description || `From ${categoryNameById.get(item.category_id) || 'menu'}`}</p>
                    </div>
                    <div className="mt-1.5 flex items-end justify-between">
                      <div className="text-base font-extrabold">Rs {item.price}</div>
                      {cartItem ? (
                        <QtyControl
                          qty={cartItem.quantity}
                          onInc={() => updateQuantity(item.id, 1)}
                          onDec={() => (cartItem.quantity <= 1 ? removeItem(item.id) : updateQuantity(item.id, -1))}
                        />
                      ) : (
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => addItem({ id: item.id, name: item.name, price: item.price })}
                          disabled={!item.is_available}
                          className={cn(
                            'h-9 rounded-full border-2 px-4 text-xs font-bold tap-highlight-none',
                            item.is_available ? 'border-primary bg-primary/10 text-primary' : 'border-muted bg-muted text-muted-foreground'
                          )}
                        >
                          {item.is_available ? 'ADD +' : 'SOLD'}
                        </motion.button>
                      )}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {itemsLoading && <div className="py-10 text-center text-sm text-muted-foreground">Loading menu...</div>}
        {!itemsLoading && filteredItems.length === 0 && <div className="py-10 text-center text-sm text-muted-foreground">No dishes match your search.</div>}
      </div>

      <AnimatePresence>
        {totalItems > 0 && (
          <motion.button
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onClick={() => setScreen('cart')}
            className="absolute bottom-5 left-5 right-5 flex h-14 items-center justify-between rounded-2xl bg-gradient-primary px-5 text-primary-foreground shadow-glow tap-highlight-none"
          >
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-full bg-white/20">
                <ShoppingBag className="size-4" />
              </div>
              <div className="text-left">
                <div className="text-[11px] font-medium opacity-90">{totalItems} item{totalItems > 1 ? 's' : ''}</div>
                <div className="text-sm font-extrabold">Rs {subtotal}</div>
              </div>
            </div>
            <div className="flex items-center gap-1 text-sm font-bold">View Cart {'>'}</div>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );

  const cartScreen = (
    <>
      <div className="flex items-center justify-between px-5 pb-4 pt-6">
        <button onClick={() => setScreen('menu')} className="grid size-10 place-items-center rounded-full bg-secondary tap-highlight-none">
          <ArrowLeft className="size-5" />
        </button>
        <div className="text-center">
          <div className="text-[11px] font-medium text-muted-foreground">Table {selectedTableNumber || '--'}</div>
          <div className="text-sm font-bold">Review Order</div>
        </div>
        <div className="size-10" />
      </div>

      {items.length === 0 ? (
        <div className="grid flex-1 place-items-center p-8 text-center">
          <div>
            <div className="mx-auto mb-4 grid size-20 place-items-center rounded-full bg-secondary">
              <Receipt className="size-8 text-muted-foreground" />
            </div>
            <p className="mb-1 font-bold">Your cart is empty</p>
            <p className="mb-5 text-sm text-muted-foreground">Add some delicious dishes from the menu</p>
            <button onClick={() => setScreen('menu')} className="inline-flex h-12 items-center rounded-2xl bg-gradient-primary px-6 font-bold text-primary-foreground shadow-glow">
              Browse Menu
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-3 px-5">
            <div className="flex items-center justify-between rounded-2xl bg-gradient-primary p-4 text-primary-foreground shadow-glow">
              <div>
                <div className="text-[11px] font-medium opacity-90">Customer</div>
                <div className="text-base font-extrabold">{customerName}</div>
                {customerPhone && <div className="mt-0.5 text-xs opacity-90">+91 {customerPhone}</div>}
              </div>
              <div className="text-right">
                <div className="text-[11px] font-medium opacity-90">Table</div>
                <div className="text-2xl font-extrabold">{selectedTableNumber || '--'}</div>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-2.5 overflow-y-auto px-5 pb-44 no-scrollbar">
            <div className="mb-1 mt-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Items ({items.length})</div>
            <AnimatePresence>
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 100 }}
                  className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 shadow-card"
                >
                  <div className="grid size-14 flex-none place-items-center rounded-xl bg-secondary text-primary">
                    <ChefHat className="size-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">{item.name}</div>
                    <div className="text-xs text-muted-foreground">Rs {item.price} each</div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <button onClick={() => (item.quantity <= 1 ? removeItem(item.id) : updateQuantity(item.id, -1))} className="grid size-7 place-items-center rounded-full bg-secondary tap-highlight-none">
                        <Minus className="size-3" strokeWidth={3} />
                      </button>
                      <AnimatePresence mode="popLayout">
                        <motion.span
                          key={item.quantity}
                          initial={{ y: -8, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: 8, opacity: 0 }}
                          className="w-5 text-center text-sm font-extrabold"
                        >
                          {item.quantity}
                        </motion.span>
                      </AnimatePresence>
                      <button onClick={() => updateQuantity(item.id, 1)} className="grid size-7 place-items-center rounded-full bg-primary text-primary-foreground tap-highlight-none">
                        <Plus className="size-3" strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                  <div className="flex h-full self-stretch flex-col items-end justify-between">
                    <button onClick={() => removeItem(item.id)} className="grid size-7 place-items-center rounded-full text-destructive tap-highlight-none">
                      <Trash2 className="size-3.5" />
                    </button>
                    <div className="text-sm font-extrabold">Rs {item.quantity * item.price}</div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            <div className="mt-4 space-y-2.5 rounded-2xl border border-border/60 bg-card p-4 shadow-card">
              <div className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Bill Summary</div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal ({totalItems} items)</span>
                <span className="font-bold">Rs {subtotal}</span>
              </div>
              <div className="border-t border-dashed border-border pt-2.5 flex items-center justify-between">
                <span className="font-extrabold">Total</span>
                <span className="text-xl font-extrabold text-primary">Rs {subtotal}</span>
              </div>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 border-t border-border/60 p-5 glass">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSendToKitchen}
              disabled={isPending}
              className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-gradient-primary text-base font-extrabold text-primary-foreground shadow-glow tap-highlight-none"
            >
              {isPending ? (
                <>
                  <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} className="size-5 rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Sending to Kitchen...
                </>
              ) : (
                <>Place Order - Rs {subtotal}</>
              )}
            </motion.button>
          </div>
        </>
      )}
    </>
  );

  return (
    <div className="dine-swift-order -m-3 min-h-[calc(100dvh-4rem)] md:-m-4">
      <MobileShell>
        {screen === 'customer' && customerScreen}
        {screen === 'menu' && menuScreen}
        {screen === 'cart' && cartScreen}
        <AnimatePresence>
          {success && (
            <OrderSuccessModal
              onNew={startNewOrder}
              onView={() => {
                setSuccess(false);
                returnToDashboard();
              }}
            />
          )}
        </AnimatePresence>
      </MobileShell>
    </div>
  );
};
