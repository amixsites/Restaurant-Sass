import { useOrders } from '@/hooks/api/useOrders';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Download, Printer, Banknote } from 'lucide-react';
import { sendOrderConfirmation } from '@/services/whatsappService';
import { GenerateBillDrawer } from '@/components/GenerateBillDrawer';
import { useState } from 'react';

export const Billing = () => {
  const { data: orders, isLoading } = useOrders(); // Can be expanded to use past orders for billing
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isBillDrawerOpen, setIsBillDrawerOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };
  
  const handleSendWA = async (orderId: string, amount: number) => {
    // Mock sending whatsapp
    await sendOrderConfirmation('+919876543210', orderId, amount);
    alert('WhatsApp confirmation sent (mock)!');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Billing & Invoices</h2>
          <p className="text-muted-foreground">Manage order payments, print invoices, and send digital receipts.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>Click to generate invoice or send receipt.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders?.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">#{order.id.substring(0, 8)}</TableCell>
                  <TableCell>T-{order.tables?.table_number || 'N/A'}</TableCell>
                  <TableCell>{new Date(order.created_at).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={order.status === 'READY' ? "default" : "secondary"}>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-bold">₹{order.total_amount}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {order.status !== 'COMPLETED' ? (
                        <Button 
                          className="bg-green-600 hover:bg-green-700" 
                          size="sm" 
                          onClick={() => {
                            setSelectedOrder(order);
                            setIsBillDrawerOpen(true);
                          }}
                        >
                          <Banknote className="w-4 h-4 mr-2" /> Checkout
                        </Button>
                      ) : (
                        <>
                          <Button variant="outline" size="sm" onClick={handlePrint}>
                            <Printer className="w-4 h-4 mr-2" /> Print
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleSendWA(order.id, order.total_amount)}>
                            <Download className="w-4 h-4 mr-2" /> WA Receipt
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {orders?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    No recent orders found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <GenerateBillDrawer 
        isOpen={isBillDrawerOpen}
        onOpenChange={setIsBillDrawerOpen}
        order={selectedOrder}
      />
    </div>
  );
};
