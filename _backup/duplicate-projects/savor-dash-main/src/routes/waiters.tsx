import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, IndianRupee, ClipboardList, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/waiters")({ component: Waiters });

const waiters = [
  { name: "Asha Menon", initial: "A", status: "active", orders: 18, revenue: 24800, tables: [1, 6], rating: 4.9 },
  { name: "Vikram Singh", initial: "V", status: "active", orders: 14, revenue: 19200, tables: [4, 10], rating: 4.7 },
  { name: "Neha Patel", initial: "N", status: "active", orders: 21, revenue: 31400, tables: [7, 12], rating: 4.8 },
  { name: "Rohan Das", initial: "R", status: "break", orders: 9, revenue: 12300, tables: [], rating: 4.6 },
  { name: "Priya Sharma", initial: "P", status: "active", orders: 16, revenue: 22100, tables: [3], rating: 4.9 },
  { name: "Karan Mehta", initial: "K", status: "offline", orders: 0, revenue: 0, tables: [], rating: 4.5 },
];

const statusCls = {
  active: "bg-success/15 text-success border-success/30",
  break: "bg-warning/15 text-warning border-warning/30",
  offline: "bg-muted text-muted-foreground border-border",
} as const;

function Waiters() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Waiters"
        subtitle="Staff status, assignments & performance"
        actions={<Button variant="premium" size="sm"><Plus /> Add Waiter</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {waiters.map(w => (
          <div key={w.name} className="glass rounded-2xl p-5 hover-lift">
            <div className="flex items-start gap-4">
              <div className="size-14 rounded-2xl gradient-primary grid place-items-center text-primary-foreground font-bold text-xl shadow-glow">
                {w.initial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold truncate">{w.name}</h3>
                  <span className={cn("text-[10px] uppercase font-medium border px-2 py-0.5 rounded-full", statusCls[w.status as keyof typeof statusCls])}>
                    {w.status}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">★ {w.rating} · Server</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4">
              <Metric icon={ClipboardList} label="Orders" value={w.orders.toString()} />
              <Metric icon={IndianRupee} label="Revenue" value={`₹${(w.revenue / 1000).toFixed(1)}k`} />
              <Metric icon={TrendingUp} label="Tables" value={w.tables.length.toString()} />
            </div>

            {w.tables.length > 0 && (
              <div className="mt-4 pt-3 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
                Tables:
                {w.tables.map(t => (
                  <span key={t} className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-medium">T-{t.toString().padStart(2, "0")}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-card/60 border border-border p-3">
      <Icon className="size-3.5 text-muted-foreground" />
      <div className="text-base font-semibold mt-1">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
