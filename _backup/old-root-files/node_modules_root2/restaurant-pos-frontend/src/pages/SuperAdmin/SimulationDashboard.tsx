import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Play, Pause, Square, Trash2, Loader2, Terminal, Key, Copy, Check, Activity, Shield, Percent, AlertCircle, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api, fetchWithRetry } from '@/lib/api';
import { Link } from 'react-router-dom';

export const SimulationDashboard = () => {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const [numRestaurants, setNumRestaurants] = useState(10);
  
  // Super admin credentials
  const [email, setEmail] = useState('amixsites@gmail.com');
  const [password, setPassword] = useState('amixsites');

  const [metrics, setMetrics] = useState({
    total_orders: 0,
    total_sales: 0.0,
    active_orders: 0,
    completed_orders: 0,
    onboarded_restaurants: 0
  });

  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const terminalRef = useRef<HTMLDivElement>(null);

  // Poll status every 2 seconds
  useEffect(() => {
    let intervalId: any;

    const fetchStatus = async () => {
      try {
        const res = await fetchWithRetry(api.simStatus());
        if (res.ok) {
          const data = await res.json();
          setIsRunning(data.is_running);
          setIsPaused(data.is_paused);
          setSpeed(data.speed);
          
          setMetrics(prev => {
            if (JSON.stringify(prev) === JSON.stringify(data.metrics)) return prev;
            return data.metrics;
          });
          setRestaurants(prev => {
            if (JSON.stringify(prev) === JSON.stringify(data.restaurants)) return prev;
            return data.restaurants || [];
          });
          setLogs(prev => {
            if (JSON.stringify(prev) === JSON.stringify(data.logs)) return prev;
            return data.logs || [];
          });
          setErrors(prev => {
            if (JSON.stringify(prev) === JSON.stringify(data.errors)) return prev;
            return data.errors || [];
          });
        }
      } catch (err) {
        console.error('Failed to fetch simulation status:', err);
      }
    };

    fetchStatus();
    intervalId = setInterval(fetchStatus, 2000);

    return () => clearInterval(intervalId);
  }, []);

  // Scroll terminal container to bottom instead of scrolling the page window
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const handleStart = async () => {
    setIsActionLoading(true);
    try {
      const res = await fetchWithRetry(api.simStart(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, num_restaurants: numRestaurants, speed }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast({ title: 'Simulation Started', description: 'Bot is initializing testing restaurants.' });
      } else {
        toast({ title: 'Start Failed', description: data.detail || 'Failed to start bot', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Network Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handlePause = async () => {
    try {
      const res = await fetchWithRetry(api.simPause(), { method: 'POST' });
      if (res.ok) {
        toast({ title: 'Simulation Paused', description: 'Bot order generation is temporarily paused.' });
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleStop = async () => {
    try {
      const res = await fetchWithRetry(api.simStop(), { method: 'POST' });
      if (res.ok) {
        toast({ title: 'Simulation Stopped', description: 'Bot order generation stopped.' });
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleClear = async () => {
    if (!window.confirm('Are you sure you want to CLEAR all bot-generated restaurants, tables, menus, orders, and invoices? This cannot be undone.')) {
      return;
    }
    setIsActionLoading(true);
    try {
      const res = await fetchWithRetry(api.simClear(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast({ title: 'Cleanup Completed', description: 'All bot-generated test data cleared.' });
      } else {
        toast({ title: 'Cleanup Failed', description: data.detail || 'Failed to clear data', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Network Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsActionLoading(false);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
    toast({ title: 'Credentials Copied', description: 'Copied email & password to clipboard.' });
  };

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Activity className="w-8 h-8 text-primary animate-pulse" />
          Automated Restaurant Testing Simulator
        </h2>
        <p className="text-muted-foreground mt-1">
          Stress-test the order system, kitchen displays, real-time sync, and analytics dashboards by generating automated restaurant traffic.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
        <Card className="glass shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider">Restaurants</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-foreground">{metrics.onboarded_restaurants} / {numRestaurants}</div>
          </CardContent>
        </Card>

        <Card className="glass shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider">Total Orders</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-foreground">{metrics.total_orders}</div>
          </CardContent>
        </Card>

        <Card className="glass shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider">Total Sales</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-green-650">₹{metrics.total_sales.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          </CardContent>
        </Card>

        <Card className="glass shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider">Active Orders</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-orange-500">{metrics.active_orders}</div>
          </CardContent>
        </Card>

        <Card className="glass shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider">Bot Status</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`h-3.5 w-3.5 rounded-full ${isRunning ? (isPaused ? 'bg-orange-500 animate-pulse' : 'bg-green-500 animate-ping-slow') : 'bg-destructive'}`} />
              <span className="text-sm font-bold uppercase">
                {isRunning ? (isPaused ? 'Paused' : 'Running') : 'Stopped'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Side: Controls */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5 text-muted-foreground" /> Bot Setup</CardTitle>
            <CardDescription>Configure credentials and speed settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Super Admin Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={isRunning} />
            </div>
            <div className="space-y-2">
              <Label>Super Admin Password</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} disabled={isRunning} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Restaurants Count</Label>
                <Input type="number" min="1" max="20" value={numRestaurants} onChange={e => setNumRestaurants(parseInt(e.target.value) || 1)} disabled={isRunning} />
              </div>
              <div className="space-y-2">
                <Label>Speed (multiplier)</Label>
                <select className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  value={speed} onChange={e => setSpeed(parseFloat(e.target.value))}
                >
                  <option value="1.0">1x (Normal)</option>
                  <option value="2.0">2x (Fast)</option>
                  <option value="5.0">5x (Accelerated)</option>
                  <option value="10.0">10x (Extreme Stress)</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              {!isRunning ? (
                <Button onClick={handleStart} className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-extrabold text-base" disabled={isActionLoading}>
                  {isActionLoading ? <Loader2 className="mr-2 size-5 animate-spin" /> : <Play className="mr-2 size-5 fill-current" />}
                  Start Full Simulation
                </Button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {!isPaused ? (
                    <Button onClick={handlePause} variant="outline" className="h-12 border-orange-200 text-orange-650 hover:bg-orange-50 font-bold">
                      <Pause className="mr-2 size-4 fill-current" /> Pause Bot
                    </Button>
                  ) : (
                    <Button onClick={handleStart} className="h-12 bg-primary text-white font-bold" disabled={isActionLoading}>
                      <Play className="mr-2 size-4 fill-current" /> Resume Bot
                    </Button>
                  )}
                  <Button onClick={handleStop} variant="destructive" className="h-12 font-bold">
                    <Square className="mr-2 size-4 fill-current" /> Stop Bot
                  </Button>
                </div>
              )}
            </div>

            {/* Danger Zone */}
            <div className="pt-4 border-t border-dashed border-border mt-4">
              <h4 className="text-xs font-bold text-destructive uppercase tracking-wider mb-2">Danger Zone</h4>
              <Button onClick={handleClear} variant="outline" className="w-full h-11 border-destructive text-destructive hover:bg-red-50 dark:hover:bg-red-950/20 font-bold" disabled={isActionLoading}>
                {isActionLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Trash2 className="mr-2 size-4" />}
                Clear Simulation Data
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Right Side: Terminal Logs */}
        <Card className="md:col-span-2 flex flex-col h-[460px]">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Terminal className="w-5 h-5 text-muted-foreground" /> Execution Console</CardTitle>
              <CardDescription>Live testing logs and reports.</CardDescription>
            </div>
            {isRunning && !isPaused && <span className="flex h-2.5 w-2.5 rounded-full bg-green-500 animate-ping" />}
          </CardHeader>
          <CardContent className="flex-1 p-4 pt-0 overflow-hidden flex flex-col">
            <div ref={terminalRef} className="flex-1 bg-black/95 dark:bg-black/90 text-green-400 font-mono text-xs rounded-xl p-3.5 overflow-y-auto no-scrollbar shadow-inner select-text border border-zinc-800">
              {logs.length === 0 ? (
                <div className="text-zinc-500 italic">Waiting for simulation to start... Logs will appear here.</div>
              ) : (
                <div className="space-y-1">
                  {[...logs].reverse().map((log, idx) => (
                    <div key={idx} className={log.includes('[ERROR]') ? 'text-rose-400 font-semibold' : log.includes('[WARN]') ? 'text-yellow-400' : 'text-zinc-300'}>
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {errors.length > 0 && (
              <div className="mt-3 p-3 bg-red-950/30 border border-red-900/50 rounded-xl text-xs text-rose-300 flex items-start gap-2 max-h-24 overflow-y-auto">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <div>
                  <div className="font-bold">Errors Logged ({errors.length}):</div>
                  <ul className="list-disc pl-4 space-y-0.5 mt-1 font-mono">
                    {errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Generated Restaurants Credentials */}
      {restaurants.length > 0 && (
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Key className="w-5 h-5 text-muted-foreground" /> Generated Restaurant Accounts ({restaurants.length})</CardTitle>
            <CardDescription>Use these credentials to log in as restaurant admins in another window or view their dashboards.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b border-border">
                <tr>
                  <th className="px-6 py-3 font-semibold">Restaurant Name</th>
                  <th className="px-6 py-3 font-semibold">Slug (URL)</th>
                  <th className="px-6 py-3 font-semibold">Admin Email</th>
                  <th className="px-6 py-3 font-semibold">Password</th>
                  <th className="px-6 py-3 font-semibold">Seeded Data</th>
                  <th className="px-6 py-3 font-semibold">Simulated Activity</th>
                  <th className="px-6 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {restaurants.map((rest, idx) => (
                  <tr key={idx} className="hover:bg-card/10 transition-colors">
                    <td className="px-6 py-3.5 font-bold text-foreground">
                      <div>{rest.name}</div>
                      <div className="text-[11px] text-muted-foreground font-normal mt-0.5">{rest.address || 'Seeding Address...'}</div>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-xs text-muted-foreground">/{rest.slug}</td>
                    <td className="px-6 py-3.5 text-muted-foreground">{rest.email}</td>
                    <td className="px-6 py-3.5 font-mono text-xs text-muted-foreground">{rest.password}</td>
                    <td className="px-6 py-3.5">
                      <div className="text-xs font-semibold text-foreground">{rest.tables_count || 0} Tables</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{rest.menu_items_count || 0} Items</div>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="text-xs font-semibold text-foreground">{rest.orders_count || 0} Orders</div>
                      <div className="text-[11px] text-green-650 mt-0.5 font-bold">₹{Math.round(rest.sales_amount || 0).toLocaleString()} Sales</div>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(`Email: ${rest.email}\nPassword: ${rest.password}`, idx)}
                          className="h-8 rounded-lg px-2 text-xs font-bold border-zinc-200"
                        >
                          {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-green-500 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                          Copy Login
                        </Button>
                        <Link to="/login" target="_blank">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 rounded-lg px-2 text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20"
                          >
                            Visit POS
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
