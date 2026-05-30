import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import { Search, Plus, Minus, Leaf, Drumstick, ShoppingBag, IndianRupee, Trash2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/take-order")({ component: TakeOrder });

const categories = ["All", "Starters", "Mains", "Breads", "Rice", "Beverages", "Desserts"];

type Item = { id: string; name: string; price: number; cat: string; veg: boolean; available: boolean; emoji: string };
const items: Item[] = [
  { id: "1", name: "Paneer Tikka", price: 280, cat: "Starters", veg: true, available: true, emoji: "🧀" },
  { id: "2", name: "Chicken 65", price: 320, cat: "Starters", veg: false, available: true, emoji: "🍗" },
  { id: "3", name: "Veg Spring Roll", price: 220, cat: "Starters", veg: true, available: true, emoji: "🥢" },
  { id: "4", name: "Butter Chicken", price: 380, cat: "Mains", veg: false, available: true, emoji: "🍛" },
  { id: "5", name: "Paneer Butter Masala", price: 320, cat: "Mains", veg: true, available: true, emoji: "🥘" },
  { id: "6", name: "Dal Makhani", price: 260, cat: "Mains", veg: true, available: true, emoji: "🫘" },
  { id: "7", name: "Tandoori Roti", price: 40, cat: "Breads", veg: true, available: true, emoji: "🫓" },
  { id: "8", name: "Butter Naan", price: 60, cat: "Breads", veg: true, available: true, emoji: "🥯" },
  { id: "9", name: "Veg Biryani", price: 280, cat: "Rice", veg: true, available: true, emoji: "🍚" },
  { id: "10", name: "Chicken Biryani", price: 340, cat: "Rice", veg: false, available: false, emoji: "🍛" },
  { id: "11", name: "Masala Chai", price: 60, cat: "Beverages", veg: true, available: true, emoji: "🍵" },
  { id: "12", name: "Fresh Lime", price: 80, cat: "Beverages", veg: true, available: true, emoji: "🍋" },
  { id: "13", name: "Gulab Jamun", price: 120, cat: "Desserts", veg: true, available: true, emoji: "🍮" },
  { id: "14", name: "Kulfi", price: 100, cat: "Desserts", veg: true, available: true, emoji: "🍦" },
];

function TakeOrder() {
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const [table, setTable] = useState("T-07");
  const [cart, setCart] = useState<Record<string, number>>({ "4": 2, "8": 4 });

  const filtered = useMemo(() => items.filter(i =>
    (cat === "All" || i.cat === cat) && i.name.toLowerCase().includes(q.toLowerCase())
  ), [cat, q]);

  const cartItems = Object.entries(cart).map(([id, qty]) => ({ ...items.find(i => i.id === id)!, qty }));
  const subtotal = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + tax;

  const add = (id: string) => setCart(c => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  const sub = (id: string) => setCart(c => {
    const n = (c[id] ?? 0) - 1;
    const { [id]: _, ...rest } = c;
    return n <= 0 ? rest : { ...c, [id]: n };
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Take Order" subtitle="Build the order, send to kitchen in seconds." />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={table}
              onChange={e => setTable(e.target.value)}
              className="h-10 px-3 rounded-xl bg-card border border-border text-sm"
            >
              {Array.from({ length: 12 }, (_, i) => `T-${(i + 1).toString().padStart(2, "0")}`).map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
              <option value="TA">Takeaway</option>
            </select>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                value={q} onChange={e => setQ(e.target.value)}
                placeholder="Search foods..."
                className="w-full h-10 rounded-xl bg-card/60 border border-border pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
            {categories.map(c => (
              <button key={c} onClick={() => setCat(c)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition border",
                  cat === c
                    ? "gradient-primary text-primary-foreground border-transparent shadow-glow"
                    : "bg-card/40 border-border text-muted-foreground hover:text-foreground",
                )}>
                {c}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map(it => (
              <div key={it.id} className={cn("group glass rounded-2xl p-3 hover-lift", !it.available && "opacity-50")}>
                <div className="aspect-square rounded-xl bg-gradient-to-br from-accent to-secondary grid place-items-center text-5xl">
                  {it.emoji}
                </div>
                <div className="mt-3 flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium leading-tight">{it.name}</div>
                    <div className="text-[11px] text-muted-foreground">{it.cat}</div>
                  </div>
                  <span className={cn("size-4 rounded grid place-items-center border", it.veg ? "border-success" : "border-destructive")}>
                    {it.veg ? <Leaf className="size-2.5 text-success" /> : <Drumstick className="size-2.5 text-destructive" />}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="font-semibold inline-flex items-center text-sm"><IndianRupee className="size-3" />{it.price}</span>
                  {it.available ? (
                    <button onClick={() => { add(it.id); toast.success(`${it.name} added`); }}
                      className="size-7 rounded-lg gradient-primary text-primary-foreground grid place-items-center active:scale-90 transition">
                      <Plus className="size-4" />
                    </button>
                  ) : <span className="text-[10px] text-destructive">86'd</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cart */}
        <aside className="lg:sticky lg:top-20 lg:self-start glass-strong rounded-2xl border border-border p-4 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <ShoppingBag className="size-4 text-primary" />
            <h3 className="font-semibold">Order · {table}</h3>
            <span className="ml-auto text-xs text-muted-foreground">{cartItems.length} items</span>
          </div>
          {cartItems.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Cart is empty</div>
          ) : (
            <ul className="space-y-2 max-h-[40vh] overflow-y-auto scrollbar-thin pr-1">
              {cartItems.map(i => (
                <li key={i.id} className="flex items-center gap-3 p-2 rounded-xl bg-card/60">
                  <div className="size-10 rounded-lg bg-accent grid place-items-center text-xl">{i.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{i.name}</div>
                    <div className="text-[11px] text-muted-foreground inline-flex items-center"><IndianRupee className="size-2.5" />{i.price} each</div>
                  </div>
                  <div className="flex items-center gap-1 bg-background rounded-lg p-1 border border-border">
                    <button onClick={() => sub(i.id)} className="size-6 grid place-items-center rounded-md hover:bg-accent">
                      {i.qty === 1 ? <Trash2 className="size-3 text-destructive" /> : <Minus className="size-3" />}
                    </button>
                    <span className="w-5 text-center text-xs font-semibold">{i.qty}</span>
                    <button onClick={() => add(i.id)} className="size-6 grid place-items-center rounded-md hover:bg-accent">
                      <Plus className="size-3" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 pt-3 border-t border-border space-y-1.5 text-sm">
            <Row label="Subtotal" value={subtotal} />
            <Row label="GST (5%)" value={tax} />
            <div className="flex justify-between pt-2 border-t border-border text-base font-semibold">
              <span>Total</span>
              <span className="inline-flex items-center"><IndianRupee className="size-4" />{total}</span>
            </div>
          </div>
          <Button variant="premium" className="w-full mt-4 h-11"
            onClick={() => toast.success("Order sent to kitchen", { icon: <CheckCircle2 className="size-4" /> })}>
            Send to Kitchen
          </Button>
          <Button variant="outline" className="w-full mt-2 h-10">Save Draft</Button>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="inline-flex items-center text-foreground"><IndianRupee className="size-3" />{value}</span>
    </div>
  );
}
