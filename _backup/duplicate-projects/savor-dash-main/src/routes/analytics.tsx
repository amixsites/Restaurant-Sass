import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui/PageHeader";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { TrendingUp, Sparkles } from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";

export const Route = createFileRoute("/analytics")({ component: Analytics });

const trend = Array.from({ length: 14 }, (_, i) => ({
  d: `D${i + 1}`,
  revenue: Math.round(60000 + Math.sin(i / 2) * 20000 + Math.random() * 15000),
  orders: Math.round(180 + Math.sin(i / 2) * 60 + Math.random() * 40),
}));
const cats = [
  { name: "Mains", value: 42 },
  { name: "Starters", value: 22 },
  { name: "Breads/Rice", value: 18 },
  { name: "Beverages", value: 12 },
  { name: "Desserts", value: 6 },
];
const colors = ["oklch(0.78 0.165 60)", "oklch(0.72 0.13 230)", "oklch(0.72 0.17 150)", "oklch(0.82 0.16 85)", "oklch(0.7 0.2 320)"];

function Analytics() {
  const [range, setRange] = useState("Weekly");
  return (
    <div className="space-y-5">
      <PageHeader
        title="Analytics"
        subtitle="Performance, growth & insights"
        actions={
          <div className="flex gap-1 glass rounded-xl p-1">
            {["Daily", "Weekly", "Monthly", "Yearly"].map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={cn("px-3 py-1.5 text-xs rounded-lg",
                  range === r ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")}>
                {r}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Revenue", value: "₹8.42L", delta: "+18.2%" },
          { label: "Orders", value: "2,184", delta: "+12.4%" },
          { label: "Avg Ticket", value: "₹386", delta: "+4.1%" },
          { label: "Repeat Customers", value: "62%", delta: "+8.0%" },
        ].map(s => (
          <div key={s.label} className="glass rounded-2xl p-4 hover-lift">
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className="text-2xl font-semibold mt-1">{s.value}</div>
            <div className="text-xs text-success inline-flex items-center gap-1 mt-1">
              <TrendingUp className="size-3" /> {s.delta}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-5 xl:col-span-2">
          <h3 className="font-semibold mb-4">Revenue Trend</h3>
          <div className="h-72">
            <ResponsiveContainer>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="gr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.78 0.165 60)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="oklch(0.78 0.165 60)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 6%)" vertical={false} />
                <XAxis dataKey="d" stroke="oklch(0.68 0 0)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.68 0 0)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "oklch(0.18 0.013 250)", border: "1px solid oklch(0.28 0 0 / 60%)", borderRadius: 12, fontSize: 12 }} />
                <Area type="monotone" dataKey="revenue" stroke="oklch(0.78 0.165 60)" strokeWidth={2.5} fill="url(#gr)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="font-semibold mb-4">Category Mix</h3>
          <div className="h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={cats} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={3}>
                  {cats.map((_, i) => <Cell key={i} fill={colors[i]} stroke="none" />)}
                </Pie>
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-5 xl:col-span-2">
          <h3 className="font-semibold mb-4">Orders by Day</h3>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 6%)" vertical={false} />
                <XAxis dataKey="d" stroke="oklch(0.68 0 0)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.68 0 0)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "oklch(0.18 0.013 250)", border: "1px solid oklch(0.28 0 0 / 60%)", borderRadius: 12, fontSize: 12 }} cursor={{ fill: "oklch(1 0 0 / 4%)" }} />
                <Bar dataKey="orders" fill="oklch(0.72 0.13 230)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute inset-0 opacity-40 gradient-primary pointer-events-none" style={{ maskImage: "radial-gradient(circle at top right, black, transparent 60%)" }} />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <span className="size-8 rounded-xl gradient-primary grid place-items-center"><Sparkles className="size-4 text-primary-foreground" /></span>
              <h3 className="font-semibold">Smart Insights</h3>
            </div>
            <ul className="space-y-3 text-sm">
              <Insight tone="success">Friday dinner rush grew <b>+22%</b> WoW. Consider adding 1 server.</Insight>
              <Insight tone="info">Butter Chicken paired with Naan in <b>74%</b> of orders. Bundle it.</Insight>
              <Insight tone="warning">Average wait at 8–9 PM is <b>14m</b>. Pre-prep mains by 7:30.</Insight>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function Insight({ tone, children }: { tone: "success" | "info" | "warning"; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className={cn("mt-1 size-2 rounded-full shrink-0",
        tone === "success" && "bg-success", tone === "info" && "bg-info", tone === "warning" && "bg-warning")} />
      <span className="text-muted-foreground"><span className="text-foreground">{children}</span></span>
    </li>
  );
}
