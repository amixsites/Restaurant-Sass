import { useState } from 'react';
import { useOrders } from '@/hooks/api/useOrders';
import { KitchenOrderCard } from './KitchenOrderCard';
import { Button } from '@/components/ui/button';
import { Loader2, ChefHat, Clock, CheckCircle } from 'lucide-react';

export const KitchenDashboard = () => {
  const { data: orders, isLoading } = useOrders();
  const [activeTab, setActiveTab] = useState<'PENDING' | 'PREPARING' | 'READY'>('PENDING');

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground font-semibold animate-pulse">Loading Kitchen Display...</p>
        </div>
      </div>
    );
  }

  // Filter orders by status, excluding unapproved customer orders
  const pendingOrders = orders?.filter(o => o.status === 'PENDING' && o.approval_status !== 'PENDING_APPROVAL') || [];
  const preparingOrders = orders?.filter(o => o.status === 'PREPARING' && o.approval_status !== 'PENDING_APPROVAL') || [];
  const readyOrders = orders?.filter(o => o.status === 'READY' && o.approval_status !== 'PENDING_APPROVAL') || [];

  // Active orders total count
  const totalActiveCount = pendingOrders.length + preparingOrders.length + readyOrders.length;

  // Selected tab list
  const getFilteredOrders = () => {
    switch (activeTab) {
      case 'PENDING':
        return pendingOrders;
      case 'PREPARING':
        return preparingOrders;
      case 'READY':
        return readyOrders;
      default:
        return [];
    }
  };

  const filteredOrders = getFilteredOrders();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Header */}
      <div className="bg-card border-b p-4 sm:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <ChefHat className="w-8 h-8 text-orange-500 animate-bounce-slow" /> Kitchen Display System (KDS)
          </h1>
          <p className="text-muted-foreground mt-1">Real-time restaurant kitchen queue and item management</p>
        </div>
        
        {/* KDS Stats Header */}
        <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-1 md:pb-0">
          <div className="bg-muted/60 border rounded-xl p-3 px-5 min-w-[120px] flex flex-col justify-center shadow-inner">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Live Orders</span>
            <span className="text-2xl font-black text-foreground">{totalActiveCount}</span>
          </div>
          <div className="bg-orange-50/50 border border-orange-100 dark:bg-orange-950/20 dark:border-orange-900/50 rounded-xl p-3 px-5 min-w-[120px] flex flex-col justify-center">
            <span className="text-xs font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wider flex items-center gap-1">
              <ChefHat className="w-3.5 h-3.5" /> Preparing
            </span>
            <span className="text-2xl font-black text-orange-800 dark:text-orange-300">{preparingOrders.length}</span>
          </div>
          <div className="bg-green-50/50 border border-green-100 dark:bg-green-950/20 dark:border-green-900/50 rounded-xl p-3 px-5 min-w-[120px] flex flex-col justify-center">
            <span className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> Ready
            </span>
            <span className="text-2xl font-black text-green-800 dark:text-green-300">{readyOrders.length}</span>
          </div>
        </div>
      </div>

      {/* Top Filter Tabs */}
      <div className="px-4 sm:px-6 py-4 bg-muted/20 border-b flex gap-2 overflow-x-auto">
        <Button
          variant={activeTab === 'PENDING' ? 'default' : 'outline'}
          className={`rounded-xl px-6 py-5 text-lg font-bold gap-2 transition-all shrink-0 ${
            activeTab === 'PENDING' 
              ? 'bg-yellow-500 hover:bg-yellow-600 text-white shadow-md' 
              : 'hover:bg-yellow-50 dark:hover:bg-yellow-950/20 border-yellow-200'
          }`}
          onClick={() => setActiveTab('PENDING')}
        >
          <Clock className="w-5 h-5 text-yellow-600 shrink-0" />
          Pending
          <span className="bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300 text-xs font-black rounded-full px-2 py-0.5 ml-1">
            {pendingOrders.length}
          </span>
        </Button>
        
        <Button
          variant={activeTab === 'PREPARING' ? 'default' : 'outline'}
          className={`rounded-xl px-6 py-5 text-lg font-bold gap-2 transition-all shrink-0 ${
            activeTab === 'PREPARING' 
              ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md' 
              : 'hover:bg-orange-50 dark:hover:bg-orange-950/20 border-orange-200'
          }`}
          onClick={() => setActiveTab('PREPARING')}
        >
          <ChefHat className="w-5 h-5 text-orange-600 shrink-0" />
          Preparing
          <span className="bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 text-xs font-black rounded-full px-2 py-0.5 ml-1">
            {preparingOrders.length}
          </span>
        </Button>
        
        <Button
          variant={activeTab === 'READY' ? 'default' : 'outline'}
          className={`rounded-xl px-6 py-5 text-lg font-bold gap-2 transition-all shrink-0 ${
            activeTab === 'READY' 
              ? 'bg-green-600 hover:bg-green-700 text-white shadow-md' 
              : 'hover:bg-green-50 dark:hover:bg-green-950/20 border-green-200'
          }`}
          onClick={() => setActiveTab('READY')}
        >
          <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
          Ready
          <span className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300 text-xs font-black rounded-full px-2 py-0.5 ml-1">
            {readyOrders.length}
          </span>
        </Button>
      </div>

      {/* Main Grid Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
        {filteredOrders.length === 0 ? (
          <div className="h-full min-h-[350px] flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-muted rounded-3xl p-10 bg-muted/5">
            <ChefHat className="w-20 h-20 mb-4 opacity-20 text-muted-foreground" />
            <h3 className="text-2xl font-bold text-foreground">No {activeTab.toLowerCase()} orders</h3>
            <p className="text-muted-foreground text-center mt-1 max-w-sm">New orders placed by waiters will appear here automatically in real-time.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
            {filteredOrders.map(order => (
              <KitchenOrderCard 
                key={order.id} 
                order={order} 
                status={activeTab} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
