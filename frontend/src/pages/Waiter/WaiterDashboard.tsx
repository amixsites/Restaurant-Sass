import { useTables } from '@/hooks/api/useTables';
import { useOrders } from '@/hooks/api/useOrders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ShoppingBag, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const WaiterDashboard = () => {
  const { data: tables, isLoading: tablesLoading } = useTables();
  const { data: orders, isLoading: ordersLoading } = useOrders();
  const navigate = useNavigate();

  if (tablesLoading || ordersLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Map orders to tables, excluding unapproved customer orders
  const activeOrdersByTable = (orders || []).reduce((acc: any, order) => {
    if (order.table_id && order.status !== 'SERVED' && order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && order.approval_status !== 'PENDING_APPROVAL') {
      // If there are multiple active orders for a table, we take the most "advanced" one
      // but ideally there's only 1 active order per table.
      acc[order.table_id] = order;
    }
    return acc;
  }, {});

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col bg-background">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Tables</h2>
          <p className="text-muted-foreground mt-1">Select a table to manage orders</p>
        </div>
        <Button size="lg" className="text-lg h-14 px-8 rounded-xl shadow-lg bg-gradient-to-r from-gray-900 to-black hover:from-gray-800 text-white" onClick={() => navigate('/waiter/take-order')}>
          <ShoppingBag className="w-5 h-5 mr-3"/> Take Order
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 overflow-y-auto custom-scrollbar pb-20">
        {tables?.map((table) => {
          const activeOrder = activeOrdersByTable[table.id];
          
          let statusColor = "border-green-500 bg-green-50/50 text-green-700"; // Empty
          let statusLabel = "EMPTY";
          
          if (table.status === 'reserved') {
            statusColor = "border-yellow-500 bg-yellow-50/50 text-yellow-700";
            statusLabel = "RESERVED";
          } else if (activeOrder) {
            switch (activeOrder.status) {
              case 'PENDING':
                statusColor = "border-red-500 bg-red-50/50 text-red-700";
                statusLabel = "OCCUPIED";
                break;
              case 'PREPARING':
                statusColor = "border-orange-500 bg-orange-50/50 text-orange-800";
                statusLabel = "PREPARING";
                break;
              case 'READY':
                statusColor = "border-blue-500 bg-blue-50/50 text-blue-800 shadow-blue-200 shadow-md scale-[1.02] ring-2 ring-blue-500/50";
                statusLabel = "READY FOR SERVING";
                break;
              default:
                statusColor = "border-red-500 bg-red-50/50 text-red-700";
                statusLabel = "OCCUPIED";
            }
          } else if (table.status === 'billing') {
             statusColor = "border-purple-500 bg-purple-50/50 text-purple-700";
             statusLabel = "BILLING";
          } else if (table.status === 'OCCUPIED' && !activeOrder) {
             // Table is marked occupied but no active order fetched (maybe completed but table not cleared)
             statusColor = "border-red-500 bg-red-50/50 text-red-700";
             statusLabel = "OCCUPIED";
          }

          return (
            <Card 
              key={table.id} 
              className={`border-l-8 cursor-pointer transition-all hover:scale-[1.03] active:scale-95 min-h-[160px] flex flex-col justify-between ${statusColor}`}
              onClick={() => navigate(`/waiter/take-order?table=${table.id}`)}
            >
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-2xl font-black flex justify-between items-center">
                  T-{table.table_number}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <Badge variant="outline" className={`font-bold text-xs py-1 px-2 border-2 ${statusColor.split(' ')[0]} bg-white/80`}>
                  {statusLabel}
                </Badge>
                
                {activeOrder && (
                  <div className="mt-4">
                    <div className="text-2xl font-black mb-1">
                      ₹{activeOrder.total_amount}
                    </div>
                    <div className="flex items-center text-xs font-semibold opacity-80">
                      <Clock className="w-3 h-3 mr-1" />
                      {activeOrder.order_items?.length || 0} items
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
