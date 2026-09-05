import { useAuthStore } from '@/store/authStore';
import { useAnalytics } from '@/hooks/api/useAnalytics';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Printer, UtensilsCrossed, Grid3X3, TrendingUp, TrendingDown,
  Clock, Receipt, ChefHat, Users, IndianRupee, Loader2
} from 'lucide-react';
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid,
} from 'recharts';
import { cn } from '@/lib/utils';

export const AdminDashboard = () => {
  const { user } = useAuthStore();
  const { data: analytics, isLoading } = useAnalytics();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center bg-background/50">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground font-semibold">Loading Dashboard Analytics...</p>
        </div>
      </div>
    );
  }

  const salesData = analytics?.hourlyData || Array.from({ length: 12 }, (_, i) => ({
    h: `${(9 + i).toString().padStart(2, '0')}:00`,
    sales: 0,
    orders: 0,
  }));

  const stats = [
    { label: "Today Sales", value: `₹${Number(analytics?.revenue.today || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, delta: analytics?.revenue.trend || "+0%", up: true, icon: IndianRupee, tint: "primary" },
    { label: "Active Orders", value: String(analytics?.orders.active || 0), delta: `+${analytics?.orders.pending || 0} new`, up: true, icon: ChefHat, tint: "info" },
    { label: "Occupied Tables", value: `${analytics?.tables.occupied || 0}/${analytics?.tables.total || 0}`, delta: `${analytics?.tables.rate || 0}%`, up: true, icon: Grid3X3, tint: "success" },
    { label: "Preparing Orders", value: String(analytics?.orders.preparing || 0), delta: "kitchen", up: true, icon: Clock, tint: "warning" },
    { label: "Pending Bills", value: String(analytics?.orders.pending || 0), delta: "waiting", up: false, icon: Receipt, tint: "primary" },
    { label: "Staff Members", value: String(analytics?.staff.active || 0), delta: "active", up: true, icon: Users, tint: "info" },
  ];

  // Fallback for top selling items if database has no orders yet today
  const topItems = analytics?.topSelling?.length ? analytics.topSelling : [
    { name: "No dishes sold yet", count: 0, revenue: 0 }
  ];

  // Fallback for recent activity
  const recentActivities = analytics?.recentActivity?.length ? analytics.recentActivity : [
    { type: "table", text: "KDS is active and ready", time: "now", tone: "muted" }
  ];

  const handlePrintZReport = () => {
    window.print();
  };

  const fullName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Admin';

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Good evening, ${fullName} 👋`}
        subtitle="Here's how DineSwift is performing tonight."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handlePrintZReport}>
              <Printer className="w-4 h-4 mr-2" /> Print Z-Report
            </Button>
            <Button variant="default" size="sm" onClick={() => navigate('/admin/take-order')} className="bg-primary hover:opacity-95 text-white font-bold transition-all shadow-glow">
              <Plus className="w-4 h-4 mr-2" /> New Order
            </Button>
          </>
        }
      />

      {/* Stats Widgets Grid */}
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
            <div className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Area Chart & Top Selling Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 glass rounded-2xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-foreground">Revenue · Today</h3>
              <p className="text-xs text-muted-foreground">Hourly sales vs. orders</p>
            </div>
            <div className="flex gap-1 text-xs">
              {["Today", "Week", "Month"].map((t, i) => (
                <button key={t} className={cn(
                  "px-3 py-1.5 rounded-lg font-medium",
                  i === 0 ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent",
                )}>{t}</button>
              ))}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="h" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    background: "var(--card)", 
                    borderColor: "var(--border)", 
                    borderRadius: 12, 
                    fontSize: 12,
                    color: "var(--foreground)"
                  }} 
                />
                <Area type="monotone" dataKey="sales" stroke="var(--primary)" strokeWidth={2.5} fill="url(#g1)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Selling Items */}
        <div className="glass rounded-2xl p-5 shadow-card">
          <h3 className="font-semibold text-foreground">Top Selling</h3>
          <p className="text-xs text-muted-foreground mb-4">Last 24 hours</p>
          <div className="space-y-4">
            {topItems.map((it, i) => {
              const max = topItems[0].count || 1;
              return (
                <div key={it.name}>
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2 text-foreground font-medium">
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
                      style={{ width: `${max > 0 ? (it.count / max) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bar Chart & Live Activity Feed */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-5 shadow-card xl:col-span-2">
          <h3 className="font-semibold mb-1 text-foreground">Hourly Orders</h3>
          <p className="text-xs text-muted-foreground mb-4">Peak rush detection</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="h" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    background: "var(--card)", 
                    borderColor: "var(--border)", 
                    borderRadius: 12, 
                    fontSize: 12,
                    color: "var(--foreground)"
                  }} 
                  cursor={{ fill: "var(--accent)", opacity: 0.15 }} 
                />
                <Bar dataKey="orders" fill="var(--info)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Activity Feed */}
        <div className="glass rounded-2xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Live Activity</h3>
            <span className="text-[11px] inline-flex items-center gap-1.5 text-success font-medium">
              <span className="size-1.5 rounded-full bg-success pulse-ring" /> Realtime
            </span>
          </div>
          <ul className="space-y-3.5">
            {recentActivities.map((a, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className={cn(
                  "size-8 rounded-lg grid place-items-center shrink-0 shadow-sm",
                  a.tone === "primary" && "bg-primary/15 text-primary",
                  a.tone === "success" && "bg-success/15 text-success",
                  a.tone === "info" && "bg-info/15 text-info",
                  a.tone === "destructive" && "bg-destructive/15 text-destructive",
                  a.tone === "muted" && "bg-accent text-muted-foreground",
                )}>
                  {a.type === "order" && <ChefHat className="size-4" />}
                  {a.type === "kitchen" && <UtensilsCrossed className="size-4" />}
                  {a.type === "bill" && <Receipt className="size-4" />}
                  {a.type === "table" && <Grid3X3 className="size-4" />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-foreground font-medium truncate">{a.text}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{a.time}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
