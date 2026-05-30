import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Plus, Printer, UtensilsCrossed, Grid3x3, TrendingUp, TrendingDown,
  Clock, Receipt, ChefHat, Users, IndianRupee,
} from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid,
} from "recharts";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: Dashboard });

const salesData = Array.from({ length: 12 }, (_, i) => ({
  h: `${(i * 2).toString().padStart(2, "0")}:00`,
  sales: Math.round(800 + Math.sin(i / 2) * 600 + Math.random() * 400),
  orders: Math.round(8 + Math.sin(i / 2) * 6 + Math.random() * 4),
}));

const topItems = [
  { name: "Butter Chicken", count: 84, revenue: 25200 },
  { name: "Paneer Tikka", count: 67, revenue: 16750 },
  { name: "Veg Biryani", count: 52, revenue: 13000 },
  { name: "Masala Dosa", count: 48, revenue: 7200 },
  { name: "Tandoori Roti", count: 124, revenue: 4960 },
];

const activity = [
  { type: "order", text: "New order #1284 · Table 7", time: "just now", tone: "primary" },
  { type: "kitchen", text: "Order #1281 marked ready", time: "1m", tone: "success" },
  { type: "bill", text: "Bill paid · Table 3 · ₹1,840", time: "3m", tone: "info" },
  { type: "table", text: "Table 12 cleaned & available", time: "5m", tone: "muted" },
  { type: "order", text: "New order #1283 · Takeaway", time: "7m", tone: "primary" },
];

const stats = [
  { label: "Today Sales", value: "₹84,250", delta: "+12.4%", up: true, icon: IndianRupee, tint: "primary" },
  { label: "Active Orders", value: "24", delta: "+6", up: true, icon: ChefHat, tint: "info" },
  { label: "Occupied Tables", value: "18/28", delta: "64%", up: true, icon: Grid3x3, tint: "success" },
  { label: "Pending Bills", value: "7", delta: "-2", up: false, icon: Receipt, tint: "warning" },
  { label: "Kitchen Queue", value: "11", delta: "avg 9m", up: true, icon: Clock, tint: "primary" },
  { label: "Customers", value: "312", delta: "+18%", up: true, icon: Users, tint: "info" },
];

function Dashboard() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Good evening, Ravi 👋"
        subtitle="Here's how Spice Symphony is performing tonight."
        actions={
          <>
            <Button variant="outline" size="sm"><Printer /> Print Z-Report</Button>
            <Button variant="premium" size="sm"><Plus /> New Order</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
        {stats.map((s) => (
          <div key={s.label} className="hover-lift glass rounded-2xl p-4 shadow-card">
            <div className="flex items-center justify-between">
              <span className={cn(
                "size-9 rounded-xl grid place-items-center",
                s.tint === "primary" && "bg-primary/15 text-primary",
                s.tint === "info" && "bg-info/15 text-info",
                s.tint === "success" && "bg-success/15 text-success",
                s.tint === "warning" && "bg-warning/15 text-warning",
              )}>
                <s.icon className="size-4" />
              </span>
              <span className={cn(
                "text-[11px] font-medium inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md",
                s.up ? "text-success bg-success/10" : "text-destructive bg-destructive/10",
              )}>
                {s.up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                {s.delta}
              </span>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">{s.label}</div>
            <div className="text-xl md:text-2xl font-semibold tracking-tight">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 glass rounded-2xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Revenue · Today</h3>
              <p className="text-xs text-muted-foreground">Hourly sales vs. orders</p>
            </div>
            <div className="flex gap-1 text-xs">
              {["Today", "Week", "Month"].map((t, i) => (
                <button key={t} className={cn(
                  "px-3 py-1.5 rounded-lg",
                  i === 0 ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent",
                )}>{t}</button>
              ))}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={salesData}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.78 0.165 60)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="oklch(0.78 0.165 60)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 6%)" vertical={false} />
                <XAxis dataKey="h" stroke="oklch(0.68 0 0)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.68 0 0)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "oklch(0.18 0.013 250)", border: "1px solid oklch(0.28 0 0 / 60%)", borderRadius: 12, fontSize: 12 }} />
                <Area type="monotone" dataKey="sales" stroke="oklch(0.78 0.165 60)" strokeWidth={2.5} fill="url(#g1)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-2xl p-5 shadow-card">
          <h3 className="font-semibold">Top Selling</h3>
          <p className="text-xs text-muted-foreground mb-4">Last 24 hours</p>
          <div className="space-y-3">
            {topItems.map((it, i) => {
              const max = topItems[0].count;
              return (
                <div key={it.name}>
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="size-6 grid place-items-center text-[10px] font-semibold rounded-md bg-accent text-muted-foreground">
                        #{i + 1}
                      </span>
                      {it.name}
                    </span>
                    <span className="text-muted-foreground">{it.count}×</span>
                  </div>
                  <div className="h-1.5 mt-1.5 rounded-full bg-accent overflow-hidden">
                    <div
                      className="h-full gradient-primary rounded-full transition-all"
                      style={{ width: `${(it.count / max) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-5 shadow-card xl:col-span-2">
          <h3 className="font-semibold mb-1">Hourly Orders</h3>
          <p className="text-xs text-muted-foreground mb-4">Peak rush detection</p>
          <div className="h-48">
            <ResponsiveContainer>
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 6%)" vertical={false} />
                <XAxis dataKey="h" stroke="oklch(0.68 0 0)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.68 0 0)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "oklch(0.18 0.013 250)", border: "1px solid oklch(0.28 0 0 / 60%)", borderRadius: 12, fontSize: 12 }} cursor={{ fill: "oklch(1 0 0 / 4%)" }} />
                <Bar dataKey="orders" fill="oklch(0.72 0.13 230)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-2xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Live Activity</h3>
            <span className="text-[11px] inline-flex items-center gap-1.5 text-success">
              <span className="size-1.5 rounded-full bg-success pulse-ring" /> Realtime
            </span>
          </div>
          <ul className="space-y-3">
            {activity.map((a, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className={cn(
                  "size-8 rounded-lg grid place-items-center shrink-0",
                  a.tone === "primary" && "bg-primary/15 text-primary",
                  a.tone === "success" && "bg-success/15 text-success",
                  a.tone === "info" && "bg-info/15 text-info",
                  a.tone === "muted" && "bg-accent text-muted-foreground",
                )}>
                  {a.type === "order" && <ChefHat className="size-4" />}
                  {a.type === "kitchen" && <UtensilsCrossed className="size-4" />}
                  {a.type === "bill" && <Receipt className="size-4" />}
                  {a.type === "table" && <Grid3x3 className="size-4" />}
                </span>
                <div className="flex-1">
                  <div>{a.text}</div>
                  <div className="text-[11px] text-muted-foreground">{a.time}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
