import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState } from "react";
import { Search, ArrowLeft, ShoppingBag, Plus, Minus, LayoutGrid, List } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { useOrder } from "@/store/order-store";
import { menuApi } from "@/api/pos-api";
import {
  categories as fallbackCategories,
  foods as fallbackFoods,
  type FoodItem as FallbackFoodItem,
} from "@/lib/pos-data";
import type { MenuItem as ApiMenuItem } from "@/types/pos";

export const Route = createFileRoute("/menu")({ component: MenuScreen });

type DisplayFood = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  veg: boolean;
  available: boolean;
};

function VegDot({ veg }: { veg: boolean }) {
  return (
    <span
      className={`inline-block size-3.5 border-2 rounded-[3px] grid place-items-center ${veg ? "border-success" : "border-destructive"}`}
    >
      <span className={`size-1.5 rounded-full ${veg ? "bg-success" : "bg-destructive"}`} />
    </span>
  );
}

function QtyControl({ qty, onInc, onDec }: { qty: number; onInc: () => void; onDec: () => void }) {
  return (
    <motion.div
      layout
      className="flex items-center bg-gradient-primary rounded-full text-primary-foreground shadow-glow overflow-hidden"
    >
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={onDec}
        className="size-9 grid place-items-center tap-highlight-none"
      >
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
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={onInc}
        className="size-9 grid place-items-center tap-highlight-none"
      >
        <Plus className="size-4" strokeWidth={3} />
      </motion.button>
    </motion.div>
  );
}

function FoodCard({ item }: { item: DisplayFood }) {
  const cart = useOrder((s) => s.cart);
  const add = useOrder((s) => s.add);
  const setQty = useOrder((s) => s.setQty);
  const cartItem = cart.find((c) => c.id === item.id);

  return (
    <motion.div
      layout
      whileTap={{ scale: 0.985 }}
      className="bg-card rounded-3xl p-3 shadow-card border border-border/60 flex gap-3"
    >
      <div className="relative size-24 rounded-2xl overflow-hidden flex-shrink-0 bg-muted">
        <img
          src={item.image}
          alt={item.name}
          loading="lazy"
          width={512}
          height={512}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-1.5 left-1.5 bg-card/90 rounded-md p-0.5">
          <VegDot veg={item.veg} />
        </div>
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex-1">
          <h3 className="font-bold text-sm leading-tight truncate">{item.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
        </div>
        <div className="flex items-end justify-between mt-1.5">
          <div className="font-extrabold text-base">Rs {item.price}</div>
          {cartItem ? (
            <QtyControl
              qty={cartItem.qty}
              onInc={() => setQty(item.id, cartItem.qty + 1)}
              onDec={() => setQty(item.id, cartItem.qty - 1)}
            />
          ) : (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() =>
                add({
                  id: item.id,
                  name: item.name,
                  description: item.description,
                  price: item.price,
                  image: item.image,
                  categoryName: item.category,
                  veg: item.veg,
                  available: item.available,
                })
              }
              className="px-4 h-9 rounded-full bg-primary/10 text-primary border-2 border-primary font-bold text-xs tap-highlight-none"
            >
              ADD +
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function adaptItems(items: ApiMenuItem[]): DisplayFood[] {
  const fallbackImage = fallbackFoods[0]?.image ?? "";

  return items.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description || "Freshly prepared item",
    price: item.price,
    image: item.image || fallbackImage,
    category: item.categoryName || "All",
    veg: item.veg,
    available: item.available,
  }));
}

function adaptFallback(items: FallbackFoodItem[]): DisplayFood[] {
  return items.map((item) => ({ ...item, category: item.category }));
}

function MenuScreen() {
  const navigate = useNavigate();
  const { customer, cart } = useOrder();
  const [active, setActive] = useState<string>("Starters");
  const [search, setSearch] = useState("");
  const [viewAll, setViewAll] = useState(false);

  const categoriesQuery = useQuery({
    queryKey: ["menu", "categories"],
    queryFn: () => menuApi.getCategories(),
    staleTime: 120_000,
    retry: 1,
  });

  const itemsQuery = useQuery({
    queryKey: ["menu", "items"],
    queryFn: () => menuApi.getItems(),
    staleTime: 60_000,
    retry: 1,
  });

  const categoryList = useMemo(() => {
    if (categoriesQuery.data?.length) {
      return categoriesQuery.data.map((category) => category.name);
    }

    return fallbackCategories;
  }, [categoriesQuery.data]);

  const availableFoods = useMemo(() => {
    if (itemsQuery.data?.length) {
      return adaptItems(itemsQuery.data);
    }

    return adaptFallback(fallbackFoods);
  }, [itemsQuery.data]);

  const totalItems = cart.reduce((s, i) => s + i.qty, 0);
  const totalAmount = cart.reduce((s, i) => s + i.qty * i.price, 0);

  const filtered = useMemo(() => {
    let list = availableFoods;
    if (!viewAll) list = list.filter((f) => f.category === active);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (f) => f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q),
      );
    }
    return list;
  }, [active, search, viewAll, availableFoods]);

  if (!customer.name) {
    return (
      <MobileShell>
        <div className="flex-1 grid place-items-center p-6 text-center">
          <div>
            <p className="text-muted-foreground mb-4">No active order</p>
            <Link to="/" className="text-primary font-bold">
              Start a new order
            </Link>
          </div>
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <div className="px-5 pt-6 pb-3 bg-background sticky top-0 z-20">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => navigate({ to: "/" })}
            className="size-10 rounded-full bg-secondary grid place-items-center tap-highlight-none"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div className="text-center">
            <div className="text-[11px] text-muted-foreground font-medium">
              Table {customer.table} · {customer.name.split(" ")[0]}
            </div>
            <div className="font-bold text-sm">Menu</div>
          </div>
          <button
            onClick={() => navigate({ to: "/cart" })}
            className="size-10 relative rounded-full bg-secondary grid place-items-center tap-highlight-none"
          >
            <ShoppingBag className="size-5" />
            {totalItems > 0 && (
              <motion.span
                key={totalItems}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold grid place-items-center shadow-glow"
              >
                {totalItems}
              </motion.span>
            )}
          </button>
        </div>

        <div className="relative">
          <Search className="size-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search dishes..."
            className="w-full h-11 pl-11 pr-4 rounded-2xl bg-secondary border border-border text-sm font-medium outline-none focus:border-primary transition-colors"
          />
        </div>

        <div className="flex items-center gap-1 mt-3 p-1 bg-secondary rounded-full w-fit">
          <button
            onClick={() => setViewAll(false)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
              !viewAll ? "bg-card shadow-card text-foreground" : "text-muted-foreground"
            }`}
          >
            <LayoutGrid className="size-3.5" /> Category
          </button>
          <button
            onClick={() => setViewAll(true)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
              viewAll ? "bg-card shadow-card text-foreground" : "text-muted-foreground"
            }`}
          >
            <List className="size-3.5" /> All
          </button>
        </div>
      </div>

      {!viewAll && (
        <div className="px-5 pb-2">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {categoryList.map((c) => {
              const isActive = active === c;
              return (
                <motion.button
                  key={c}
                  whileTap={{ scale: 0.92 }}
                  animate={{ scale: isActive ? 1.04 : 1 }}
                  onClick={() => setActive(c)}
                  className={`px-4 h-10 rounded-full text-xs font-bold whitespace-nowrap tap-highlight-none transition-colors ${
                    isActive
                      ? "bg-gradient-primary text-primary-foreground shadow-glow"
                      : "bg-secondary text-foreground"
                  }`}
                >
                  {c}
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pt-3 pb-36 space-y-3">
        <AnimatePresence mode="popLayout">
          {filtered.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <FoodCard item={item} />
            </motion.div>
          ))}
        </AnimatePresence>

        {itemsQuery.isLoading && (
          <div className="text-center text-sm text-muted-foreground py-10">Loading menu...</div>
        )}

        {filtered.length === 0 && !itemsQuery.isLoading && (
          <div className="text-center text-sm text-muted-foreground py-10">
            No dishes match your search.
          </div>
        )}
      </div>

      <AnimatePresence>
        {totalItems > 0 && (
          <motion.button
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={() => navigate({ to: "/cart" })}
            className="absolute bottom-5 left-5 right-5 h-14 rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow flex items-center justify-between px-5 tap-highlight-none"
          >
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-full bg-white/20 grid place-items-center">
                <ShoppingBag className="size-4" />
              </div>
              <div className="text-left">
                <div className="text-[11px] opacity-90 font-medium">
                  {totalItems} item{totalItems > 1 ? "s" : ""}
                </div>
                <div className="text-sm font-extrabold">Rs {totalAmount}</div>
              </div>
            </div>
            <div className="font-bold text-sm flex items-center gap-1">View Cart {">"}</div>
          </motion.button>
        )}
      </AnimatePresence>
    </MobileShell>
  );
}
