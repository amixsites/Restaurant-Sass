import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, Search, Pencil, Leaf, Drumstick, IndianRupee } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/menu")({ component: MenuPage });

const data = [
  { id: 1, name: "Paneer Tikka", cat: "Starters", price: 280, veg: true, available: true, emoji: "🧀" },
  { id: 2, name: "Chicken 65", cat: "Starters", price: 320, veg: false, available: true, emoji: "🍗" },
  { id: 3, name: "Butter Chicken", cat: "Mains", price: 380, veg: false, available: true, emoji: "🍛" },
  { id: 4, name: "Paneer Butter Masala", cat: "Mains", price: 320, veg: true, available: true, emoji: "🥘" },
  { id: 5, name: "Dal Makhani", cat: "Mains", price: 260, veg: true, available: true, emoji: "🫘" },
  { id: 6, name: "Tandoori Roti", cat: "Breads", price: 40, veg: true, available: true, emoji: "🫓" },
  { id: 7, name: "Butter Naan", cat: "Breads", price: 60, veg: true, available: true, emoji: "🥯" },
  { id: 8, name: "Veg Biryani", cat: "Rice", price: 280, veg: true, available: true, emoji: "🍚" },
  { id: 9, name: "Chicken Biryani", cat: "Rice", price: 340, veg: false, available: false, emoji: "🍛" },
  { id: 10, name: "Gulab Jamun", cat: "Desserts", price: 120, veg: true, available: true, emoji: "🍮" },
];

function MenuPage() {
  const [items, setItems] = useState(data);
  const toggle = (id: number) =>
    setItems(items => items.map(i => i.id === id ? { ...i, available: !i.available } : i));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Menu Management"
        subtitle={`${items.length} items · ${items.filter(i => i.available).length} available`}
        actions={
          <>
            <Button variant="outline" size="sm">Bulk Update</Button>
            <Button variant="premium" size="sm"><Plus /> Add Item</Button>
          </>
        }
      />

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input placeholder="Search items..." className="w-full h-10 rounded-xl bg-card/60 border border-border pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
        </div>
        {["All", "Starters", "Mains", "Breads", "Rice", "Desserts"].map((c, i) => (
          <button key={c} className={cn(
            "px-4 h-10 rounded-xl text-sm border",
            i === 0 ? "bg-primary/15 border-primary/40 text-primary" : "bg-card/40 border-border text-muted-foreground",
          )}>{c}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {items.map(i => (
          <div key={i.id} className="glass rounded-2xl p-4 hover-lift">
            <div className="flex gap-3">
              <div className="size-20 rounded-xl bg-gradient-to-br from-accent to-secondary grid place-items-center text-4xl shrink-0">{i.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn("size-4 rounded grid place-items-center border", i.veg ? "border-success" : "border-destructive")}>
                    {i.veg ? <Leaf className="size-2.5 text-success" /> : <Drumstick className="size-2.5 text-destructive" />}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{i.cat}</span>
                </div>
                <div className="font-semibold mt-0.5 truncate">{i.name}</div>
                <div className="text-lg font-bold inline-flex items-center mt-1"><IndianRupee className="size-4" />{i.price}</div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <span className={cn("relative inline-flex h-5 w-9 rounded-full transition", i.available ? "bg-success" : "bg-muted")}>
                  <span className={cn("absolute top-0.5 size-4 rounded-full bg-white transition-transform", i.available ? "translate-x-4" : "translate-x-0.5")} />
                </span>
                <span className="text-xs text-muted-foreground">{i.available ? "Available" : "Out of stock"}</span>
                <input type="checkbox" className="hidden" checked={i.available} onChange={() => toggle(i.id)} />
              </label>
              <button onClick={() => toggle(i.id)} className="size-8 grid place-items-center rounded-lg hover:bg-accent">
                <Pencil className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
