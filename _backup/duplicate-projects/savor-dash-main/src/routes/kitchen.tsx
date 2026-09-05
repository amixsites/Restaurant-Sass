import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui/PageHeader";
import { Clock, Flame, ChefHat, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/kitchen")({ component: Kitchen });

type Stage = "pending" | "preparing" | "ready" | "completed";
type Order = { id: string; table: string; waiter: string; mins: number; priority?: boolean; items: { name: string; qty: number; note?: string }[]; stage: Stage };

const orders: Order[] = [
  { id: "#1284", table: "T-07", waiter: "Asha", mins: 1, priority: true, stage: "pending",
    items: [{ name: "Butter Chicken", qty: 1 }, { name: "Butter Naan", qty: 4 }, { name: "Veg Biryani", qty: 1, note: "Less spicy" }] },
  { id: "#1285", table: "T-12", waiter: "Neha", mins: 2, stage: "pending",
    items: [{ name: "Paneer Tikka", qty: 2 }, { name: "Masala Chai", qty: 3 }] },
  { id: "#1282", table: "T-04", waiter: "Vikram", mins: 8, stage: "preparing",
    items: [{ name: "Chicken 65", qty: 2 }, { name: "Dal Makhani", qty: 1 }, { name: "Tandoori Roti", qty: 6 }] },
  { id: "#1283", table: "TA-22", waiter: "Online", mins: 5, stage: "preparing",
    items: [{ name: "Paneer Butter Masala", qty: 1 }, { name: "Butter Naan", qty: 3 }] },
  { id: "#1280", table: "T-10", waiter: "Vikram", mins: 14, priority: true, stage: "ready",
    items: [{ name: "Veg Biryani", qty: 2 }, { name: "Gulab Jamun", qty: 4 }] },
  { id: "#1279", table: "T-01", waiter: "Asha", mins: 22, stage: "completed",
    items: [{ name: "Masala Dosa", qty: 2 }] },
];

const stages: { key: Stage; title: string; tint: string; icon: any }[] = [
  { key: "pending", title: "Pending", tint: "warning", icon: Clock },
  { key: "preparing", title: "Preparing", tint: "primary", icon: Flame },
  { key: "ready", title: "Ready to Serve", tint: "success", icon: ChefHat },
  { key: "completed", title: "Completed", tint: "muted", icon: CheckCircle2 },
];

function Kitchen() {
  return (
    <div className="space-y-5">
      <PageHeader title="Kitchen Display" subtitle="Live order pipeline · drag between stages" />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {stages.map(s => {
          const list = orders.filter(o => o.stage === s.key);
          return (
            <div key={s.key} className="glass rounded-2xl p-3 flex flex-col min-h-[60vh]">
              <div className="flex items-center justify-between px-2 py-1 mb-2">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "size-7 rounded-lg grid place-items-center",
                    s.tint === "warning" && "bg-warning/15 text-warning",
                    s.tint === "primary" && "bg-primary/15 text-primary",
                    s.tint === "success" && "bg-success/15 text-success",
                    s.tint === "muted" && "bg-accent text-muted-foreground",
                  )}>
                    <s.icon className="size-4" />
                  </span>
                  <h3 className="font-semibold text-sm">{s.title}</h3>
                </div>
                <span className="text-xs text-muted-foreground">{list.length}</span>
              </div>
              <div className="space-y-3 overflow-y-auto scrollbar-thin pr-1 flex-1">
                {list.map(o => (
                  <article key={o.id} className={cn(
                    "rounded-xl border bg-card/80 p-3 shadow-soft hover-lift",
                    o.priority && s.key !== "completed" && "border-destructive/50 ring-1 ring-destructive/30",
                  )}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs text-muted-foreground">{o.id}</div>
                        <div className="font-semibold">{o.table}</div>
                      </div>
                      <div className={cn(
                        "text-xs font-medium inline-flex items-center gap-1 px-2 py-1 rounded-lg",
                        o.mins < 5 ? "bg-success/15 text-success" :
                        o.mins < 12 ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive",
                      )}>
                        <Clock className="size-3" /> {o.mins}m
                      </div>
                    </div>
                    <ul className="mt-3 space-y-1 text-sm">
                      {o.items.map((it, i) => (
                        <li key={i} className="flex justify-between gap-2">
                          <span className="truncate"><span className="text-muted-foreground mr-1">{it.qty}×</span>{it.name}</span>
                        </li>
                      ))}
                    </ul>
                    {o.items.some(i => i.note) && (
                      <div className="mt-2 text-[11px] text-warning bg-warning/10 px-2 py-1 rounded-md">
                        ⚠ {o.items.find(i => i.note)?.note}
                      </div>
                    )}
                    <div className="mt-3 pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{o.waiter}</span>
                      {o.priority && <span className="text-destructive font-semibold">PRIORITY</span>}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
