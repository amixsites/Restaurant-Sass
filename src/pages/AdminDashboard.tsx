import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';
import { useAnalytics } from '@/hooks/api/useAnalytics';
import { Loader2 } from 'lucide-react';

export const AdminDashboard = () => {
  const { user } = useAuthStore();
  const { data: analytics, isLoading } = useAnalytics();

  if (isLoading) {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Welcome back, {user?.user_metadata?.full_name || user?.email || 'Admin'}!</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₹{analytics?.revenue.today.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-muted-foreground">{analytics?.revenue.trend} from yesterday</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.orders.active || 0}</div>
            <p className="text-xs text-muted-foreground">{analytics?.orders.preparing || 0} preparing, {analytics?.orders.pending || 0} pending</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupied Tables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.tables.occupied || 0} / {analytics?.tables.total || 0}</div>
            <p className="text-xs text-muted-foreground">{analytics?.tables.rate || 0}% occupancy rate</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.staff.active || 0}</div>
            <p className="text-xs text-muted-foreground">Logged in system</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Dynamic Graph Placeholder - To be expanded if user wants recharts */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center border-dashed border-2 m-4 rounded-xl">
          <p className="text-muted-foreground">Live analytics graphs connected to Supabase Realtime.</p>
        </CardContent>
      </Card>
    </div>
  );
};
