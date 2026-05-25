import { useOrders } from '@/hooks/api/useOrders';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Clock } from 'lucide-react';

export const KitchenDashboard = () => {
  const { data: orders, isLoading } = useOrders();

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const pendingOrders = orders?.filter(o => o.status === 'PENDING') || [];
  const preparingOrders = orders?.filter(o => o.status === 'PREPARING') || [];
  const readyOrders = orders?.filter(o => o.status === 'READY') || [];

  const Column = ({ title, items, colorClass }: { title: string, items: any[], colorClass: string }) => (
    <div className="flex-1 flex flex-col min-w-[320px] bg-muted/30 rounded-xl p-4 overflow-hidden h-full">
      <div className="flex justify-between items-center mb-4 px-2">
        <h3 className="font-bold text-lg">{title}</h3>
        <Badge variant="secondary" className="text-sm px-2 py-1">{items.length}</Badge>
      </div>
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-4">
        {items.map(order => (
          <Card key={order.id} className={`border-l-4 shadow-sm ${colorClass}`}>
            <CardHeader className="p-4 pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-xl font-black">T-{order.tables?.table_number}</CardTitle>
                <div className="flex items-center text-muted-foreground text-sm font-medium">
                  <Clock className="w-4 h-4 mr-1" /> 12m
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <ul className="space-y-2 mb-4">
                {order.order_items?.map((item: any, idx: number) => (
                  <li key={idx} className="flex justify-between text-lg border-b border-border/50 pb-1 last:border-0">
                    <span className="font-medium">{item.quantity}x <span className="font-normal text-muted-foreground">Item {item.menu_item_id.substring(0,4)}</span></span>
                  </li>
                ))}
              </ul>
              {order.notes && (
                <div className="bg-yellow-100 text-yellow-800 p-2 rounded text-sm font-medium mb-2">
                  Note: {order.notes}
                </div>
              )}
            </CardContent>
            <CardFooter className="p-4 pt-0">
              <Button className="w-full h-12 text-lg font-bold" variant={title === 'Ready' ? 'outline' : 'default'}>
                {title === 'Pending' ? 'Start Preparing' : title === 'Preparing' ? 'Mark Ready' : 'Served'}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col md:flex-row gap-6 overflow-x-auto">
      <Column title="Pending" items={pendingOrders} colorClass="border-l-yellow-500" />
      <Column title="Preparing" items={preparingOrders} colorClass="border-l-blue-500" />
      <Column title="Ready" items={readyOrders} colorClass="border-l-green-500" />
    </div>
  );
};
