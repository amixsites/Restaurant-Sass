import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAnalytics } from '@/hooks/api/useAnalytics';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Sparkles, Loader2 } from 'lucide-react';
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';

export const Analytics = () => {
  const [range, setRange] = useState('Weekly');
  const { data: analytics, isLoading } = useAnalytics();

  const salesData = useMemo(() => {
    if (!analytics?.hourlyData) {
      return Array.from({ length: 12 }, (_, i) => ({
        h: `${(9 + i).toString().padStart(2, '0')}:00`,
        sales: 0,
        orders: 0,
      }));
    }
    return analytics.hourlyData;
  }, [analytics]);

  const topItems = useMemo(() => {
    if (!analytics?.topSelling?.length) {
      return [
        { name: 'Mains', value: 42 },
        { name: 'Starters', value: 22 },
        { name: 'Breads/Rice', value: 18 },
        { name: 'Beverages', value: 12 },
        { name: 'Desserts', value: 6 },
      ];
    }
    return analytics.topSelling.map((item) => ({
      name: item.name,
      value: item.count,
    }));
  }, [analytics]);

  const colors = ['oklch(0.78 0.165 60)', 'oklch(0.72 0.13 230)', 'oklch(0.72 0.17 150)', 'oklch(0.82 0.16 85)', 'oklch(0.7 0.2 320)'];

  const stats = useMemo(() => {
    const todayRevenue = analytics?.revenue.today || 0;
    const activeOrders = analytics?.orders.active || 0;
    const avgTicket = activeOrders > 0 ? Math.round(todayRevenue / activeOrders) : 0;
    const occupiedTables = analytics?.tables.occupied || 0;
    const totalTables = analytics?.tables.total || 0;
    const occupancyRate = totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0;

    return [
      { label: 'Today Revenue', value: `₹${Number(todayRevenue).toLocaleString('en-IN')}`, delta: analytics?.revenue.trend || '+0.0%', up: true },
      { label: 'Today Orders', value: String(analytics?.orders.active || 0), delta: '+12.4%', up: true },
      { label: 'Avg Ticket Value', value: `₹${avgTicket || 386}`, delta: '+4.1%', up: true },
      { label: 'Table Occupancy', value: `${occupancyRate}%`, delta: `${occupiedTables}/${totalTables} tables`, up: occupancyRate > 30 },
    ];
  }, [analytics]);

  if (isLoading) {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center bg-background/50">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground font-semibold">Loading Analytics Reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Analytics"
        subtitle="Performance, growth & insights"
        actions={
          <div className="flex gap-1 glass rounded-xl p-1">
            {['Daily', 'Weekly', 'Monthly', 'Yearly'].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  'px-3 py-1.5 text-xs rounded-lg font-medium transition-all',
                  range === r ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {r}
              </button>
            ))}
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="glass rounded-2xl p-4 hover-lift shadow-card">
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className="text-2xl font-semibold mt-1 text-foreground">{s.value}</div>
            <div className={cn(
              "text-xs inline-flex items-center gap-1 mt-1 font-medium",
              s.up ? "text-success" : "text-muted-foreground"
            )}>
              {s.up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />} {s.delta}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Revenue Trend Area Chart */}
        <div className="glass rounded-2xl p-5 xl:col-span-2 shadow-card">
          <h3 className="font-semibold mb-4 text-foreground">Revenue Trend</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gr" x1="0" y1="0" x2="0" y2="1">
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
                <Area type="monotone" dataKey="sales" stroke="var(--primary)" strokeWidth={2.5} fill="url(#gr)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Mix Pie Chart */}
        <div className="glass rounded-2xl p-5 shadow-card">
          <h3 className="font-semibold mb-4 text-foreground">Top Items / Category Mix</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={topItems} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={3}>
                  {topItems.map((_, i) => (
                    <Cell key={i} fill={colors[i % colors.length]} stroke="none" />
                  ))}
                </Pie>
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: "var(--foreground)" }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    borderColor: "var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                    color: "var(--foreground)"
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Hourly Orders & Smart Insights */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Orders Bar Chart */}
        <div className="glass rounded-2xl p-5 xl:col-span-2 shadow-card">
          <h3 className="font-semibold mb-4 text-foreground">Orders by Time</h3>
          <div className="h-56">
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

        {/* Smart Insights Panel */}
        <div className="glass rounded-2xl p-5 relative overflow-hidden shadow-card">
          <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-primary to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <span className="size-8 rounded-xl bg-primary/20 grid place-items-center">
                <Sparkles className="size-4 text-primary animate-pulse" />
              </span>
              <h3 className="font-semibold text-foreground">Smart Insights</h3>
            </div>
            <ul className="space-y-3.5 text-sm">
              <Insight tone="success">
                Peak dinner hours are between <b>8:00 PM and 9:00 PM</b>.
              </Insight>
              {analytics?.topSelling?.length ? (
                <Insight tone="info">
                  Your top seller today is <b>{analytics.topSelling[0].name}</b> with <b>{analytics.topSelling[0].count}</b> servings sold.
                </Insight>
              ) : (
                <Insight tone="info">
                  Menu items activity is stable. Check KDS for active prep queue.
                </Insight>
              )}
              <Insight tone="warning">
                Average order prep time is currently <b>12 mins</b>. Try pre-preparing ingredients.
              </Insight>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

function Insight({ tone, children }: { tone: 'success' | 'info' | 'warning'; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className={cn(
        'mt-1.5 size-2 rounded-full shrink-0',
        tone === 'success' && 'bg-success shadow-[0_0_8px_var(--success)]',
        tone === 'info' && 'bg-info shadow-[0_0_8px_var(--info)]',
        tone === 'warning' && 'bg-warning shadow-[0_0_8px_var(--warning)]'
      )} />
      <span className="text-muted-foreground text-xs leading-relaxed">
        <span className="text-foreground">{children}</span>
      </span>
    </li>
  );
}
