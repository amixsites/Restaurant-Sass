import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChefHat, CheckCircle, Table, Timer, User, CheckCircle2 } from 'lucide-react';
import { Order, OrderItem } from '@/hooks/api/useOrders';
import { useKitchenActions } from '@/hooks/api/useKitchenActions';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

interface KitchenOrderCardProps {
  order: Order;
  status: 'PENDING' | 'PREPARING' | 'READY';
}

export const KitchenOrderCard = ({ order, status }: KitchenOrderCardProps) => {
  const [elapsed, setElapsed] = useState('00:00');
  const [minutesElapsed, setMinutesElapsed] = useState(0);
  const { updateOrderStatus, updateItemStatus } = useKitchenActions();
  const { toast } = useToast();

  useEffect(() => {
    const start = new Date(order.created_at).getTime();
    
    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = Math.max(0, Math.floor((now - start) / 1000)); // in seconds
      const minutes = Math.floor(diff / 60);
      const seconds = diff % 60;
      const mStr = minutes.toString().padStart(2, '0');
      const sStr = seconds.toString().padStart(2, '0');
      
      setElapsed(`${mStr}:${sStr}`);
      setMinutesElapsed(minutes);
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [order.created_at]);

  const handleStatusChange = async (newStatus: 'PREPARING' | 'READY' | 'SERVED') => {
    try {
      console.log(`[KITCHEN] [CARD] Requesting order status update for ${order.id} to ${newStatus}`);
      await updateOrderStatus.mutateAsync({ orderId: order.id, status: newStatus });
      toast({
        title: `Order Status Updated`,
        description: `Table T-${order.tables?.table_number || 'N/A'} is now ${newStatus}`,
      });
    } catch (err: any) {
      console.error('[KITCHEN] [CARD] Status update failed:', err);
      toast({ 
        title: "Error updating order", 
        description: err.message || "Failed to update order status.", 
        variant: "destructive" 
      });
    }
  };

  const toggleItemStatus = async (item: OrderItem) => {
    // Only allow ticking off items if order is in PREPARING status
    if (status !== 'PREPARING') return;

    const nextStatus = item.status === 'READY' ? 'PREPARING' : 'READY';
    try {
      console.log(`[KITCHEN] [CARD] Toggling item ${item.id} status to ${nextStatus}`);
      await updateItemStatus.mutateAsync({ itemId: item.id, status: nextStatus });
    } catch (err: any) {
      console.error('[KITCHEN] [CARD] Item status toggle failed:', err);
      toast({ 
        title: "Error updating item", 
        description: err.message || "Failed to update item status.", 
        variant: "destructive" 
      });
    }
  };

  // Determine timer color styling based on time elapsed
  const getTimerBadgeStyle = () => {
    if (minutesElapsed < 10) {
      // 0-10 mins: Green
      return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800';
    } else if (minutesElapsed < 20) {
      // 10-20 mins: Yellow
      return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800';
    } else {
      // 20+ mins: Red
      return 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800 animate-pulse';
    }
  };

  // Border and accent color of the card based on the column status
  const getCardAccentStyle = () => {
    switch (status) {
      case 'PENDING':
        return 'border-t-yellow-500 shadow-yellow-50/50 hover:shadow-yellow-100/50';
      case 'PREPARING':
        return 'border-t-orange-500 shadow-orange-50/50 hover:shadow-orange-100/50';
      case 'READY':
        return 'border-t-green-500 shadow-green-50/50 hover:shadow-green-100/50';
      default:
        return 'border-t-muted';
    }
  };

  return (
    <Card className={`border-t-[8px] rounded-2xl shadow-md transition-all hover:scale-[1.01] flex flex-col h-full bg-card ${getCardAccentStyle()}`}>
      {/* Top Section */}
      <CardHeader className="p-4 pb-3 border-b bg-muted/5 flex flex-col gap-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 text-primary p-2 rounded-xl">
              <Table className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-2xl font-black tracking-tight text-foreground">
                T-{order.tables?.table_number || 'N/A'}
              </CardTitle>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5 font-medium">
                <User className="w-3.5 h-3.5" />
                <span>Waiter: {order.users?.full_name || 'Staff'}</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-1.5">
            {/* Live Timer Badge */}
            <div className={`flex items-center text-sm font-black px-2.5 py-1 rounded-lg border shadow-sm ${getTimerBadgeStyle()}`}>
              <Timer className="w-4 h-4 mr-1 shrink-0 animate-spin-slow" />
              <span>{elapsed}</span>
            </div>
            
            <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
              ID: {order.id.substring(0, 8)}
            </span>
          </div>
        </div>
      </CardHeader>

      {/* Middle Section: Ordered Items */}
      <CardContent className="p-0 flex-1 flex flex-col">
        <ul className="divide-y divide-border/60 flex-1">
          {order.order_items?.map((item) => (
            <li 
              key={item.id} 
              className={`flex flex-col p-3 transition-colors ${
                status === 'PREPARING' ? 'cursor-pointer hover:bg-muted/40' : ''
              }`}
              onClick={() => toggleItemStatus(item)}
            >
              <div className="flex justify-between items-center gap-3">
                <span className="font-bold flex items-center gap-2 text-base text-foreground">
                  <span className="bg-muted text-foreground border border-border/80 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black shrink-0">
                    {item.quantity}x
                  </span>
                  <span className={`${item.status === 'READY' ? 'line-through text-muted-foreground opacity-60' : ''}`}>
                    {item.menu_items?.name || 'Unknown Item'}
                  </span>
                </span>
                
                {/* Touch Checkbox for Items (only visible during Preparing) */}
                {status === 'PREPARING' && (
                  <div className={`w-6.5 h-6.5 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${
                    item.status === 'READY' 
                      ? 'bg-green-500 border-green-500 text-white' 
                      : 'border-muted-foreground/60 bg-transparent'
                  }`}>
                    {item.status === 'READY' && <CheckCircle className="w-4 h-4" />}
                  </div>
                )}
              </div>
              
              {/* Item-level notes */}
              {item.notes && (
                <div className="ml-10 mt-1.5 bg-yellow-50 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-300 p-2 rounded-xl text-xs font-semibold border border-yellow-100 dark:border-yellow-900/50">
                  Note: {item.notes}
                </div>
              )}
            </li>
          ))}
        </ul>

        {/* Global Order notes */}
        {order.notes && (
          <div className="m-3 p-3 bg-yellow-50 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-300 rounded-xl text-sm font-bold border border-yellow-100 dark:border-yellow-900/50">
            Order Note: {order.notes}
          </div>
        )}
      </CardContent>

      {/* Bottom Section: Action Buttons */}
      <CardFooter className="p-4 pt-3 border-t bg-muted/5">
        {status === 'PENDING' && (
          <Button 
            className="w-full h-14 text-xl font-bold bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2" 
            onClick={() => handleStatusChange('PREPARING')}
          >
            <ChefHat className="w-6 h-6" /> Start Preparing
          </Button>
        )}
        {status === 'PREPARING' && (
          <Button 
            className="w-full h-14 text-xl font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2" 
            onClick={() => handleStatusChange('READY')}
          >
            <CheckCircle className="w-6 h-6" /> Mark Ready
          </Button>
        )}
        {status === 'READY' && (
          <Button 
            className="w-full h-14 text-xl font-bold bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2" 
            onClick={() => handleStatusChange('SERVED')}
          >
            <CheckCircle2 className="w-6 h-6" /> Mark Served
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
