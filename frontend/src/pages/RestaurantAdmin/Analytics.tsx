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
  const { data: analytics, isLoading } = useAnalytics(range);

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
        { name: 'No items sold yet', value: 1 }
      ];
    }
    return analytics.topSelling.map((item) => ({
      name: item.name,
      value: item.count,
    }));
  }, [analytics]);

  const colors = ['oklch(0.78 0.165 60)', 'oklch(0.72 0.13 230)', 'oklch(0.72 0.17 150)', 'oklch(0.82 0.16 85)', 'oklch(0.7 0.2 320)'];

  const stats = useMemo(() => {
    const totalRevenue = analytics?.revenue.total || 0;
    const totalOrders = analytics?.orders.total || 0;
    const averageOrderValue = analytics?.revenue.averageOrderValue || 0;
    const occupiedTables = analytics?.tables.occupied || 0;
    const totalTables = analytics?.tables.total || 0;
    const completedOrders = analytics?.orders.completed || 0;

    return [
      { label: 'Total Revenue', value: `₹${Number(totalRevenue).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, delta: analytics?.revenue.trend || '+0.0%', up: true },
      { label: 'Total Orders', value: String(totalOrders), delta: 'orders', up: true },
      { label: 'Average Order Value', value: `₹${Number(averageOrderValue).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, delta: 'average', up: true },
      { label: 'Active Tables', value: `${occupiedTables}/${totalTables}`, delta: 'occupied', up: occupiedTables > 0 },
      { label: 'Completed Orders', value: String(completedOrders), delta: 'completed', up: true },
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
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
          <div className="h-72 w-full min-w-0">
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

        {/* Category Mix Pie Chart & Top Selling List */}
        <div className="glass rounded-2xl p-5 shadow-card flex flex-col justify-between">
          <div>
            <h3 className="font-semibold mb-4 text-foreground">Top Items / Category Mix</h3>
            <div className="h-48 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={topItems} dataKey="value" nameKey="name" innerRadius={40} outerRadius={65} paddingAngle={3}>
                    {topItems.map((_, i) => (
                      <Cell key={i} fill={colors[i % colors.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 10, color: "var(--foreground)" }} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      borderColor: "var(--border)",
                      borderRadius: 12,
                      fontSize: 11,
                      color: "var(--foreground)"
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="mt-4 border-t border-border pt-4 space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Top Selling Details</h4>
            {analytics?.topSelling?.length ? (
              analytics.topSelling.map((it, idx) => (
                <div key={it.name} className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="size-5 rounded bg-primary/10 text-primary grid place-items-center font-bold text-[10px]">{idx + 1}</span>
                    <span className="text-foreground font-medium truncate max-w-[120px]">{it.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-foreground font-semibold">{it.count} sold</span>
                    <span className="text-muted-foreground block text-[10px]">₹{Number(it.revenue).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">No transactions recorded yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Hourly Orders & Smart Insights */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Orders Bar Chart */}
        <div className="glass rounded-2xl p-5 xl:col-span-2 shadow-card">
          <h3 className="font-semibold mb-4 text-foreground">Orders by Time</h3>
          <div className="h-56 w-full min-w-0">
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

      {/* Recent Transactions Section */}
      <div className="glass rounded-2xl p-5 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-foreground">Recent Transactions</h3>
            <p className="text-xs text-muted-foreground">Latest invoice payments settled</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/20 border-b border-border">
              <tr>
                <th className="px-4 py-3 font-semibold">Invoice Number</th>
                <th className="px-4 py-3 font-semibold">Date & Time</th>
                <th className="px-4 py-3 font-semibold">Table</th>
                <th className="px-4 py-3 font-semibold">Payment Method</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {analytics?.recentTransactions?.length ? (
                analytics.recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-card/10 transition-colors">
                    <td className="px-4 py-3 font-bold text-foreground font-mono">{tx.invoiceNumber}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(tx.createdAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-foreground">{tx.tableNumber}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground uppercase">{tx.paymentMethod}</td>
                    <td className="px-4 py-3 font-semibold text-foreground">₹{tx.totalAmount.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-success/15 text-success border border-success/20">
                        {tx.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-xs text-muted-foreground font-medium">
                    No transactions recorded yet in this range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
