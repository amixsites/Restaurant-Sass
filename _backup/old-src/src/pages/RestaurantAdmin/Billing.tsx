import { useOrders } from '@/hooks/api/useOrders';
import { Button } from '@/components/ui/button';
import { Loader2, Printer, Banknote, Receipt, Clock, Search } from 'lucide-react';
import { GenerateBillDrawer } from '@/components/GenerateBillDrawer';
import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { cn } from '@/lib/utils';

export const Billing = () => {
  const { data: orders, isLoading } = useOrders();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isBillDrawerOpen, setIsBillDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter(order => {
      const orderIdMatch = order.id.toLowerCase().includes(searchQuery.toLowerCase());
      const tableMatch = `t-${order.tables?.table_number || ''}`.toLowerCase().includes(searchQuery.toLowerCase());
      return orderIdMatch || tableMatch;
    });
  }, [orders, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center bg-background/50">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground font-semibold">Loading Invoices & Billing...</p>
        </div>
      </div>
    );
  }

  const handlePrintOrder = (order: any) => {
    setSelectedOrder(order);
    setIsBillDrawerOpen(true);
    setTimeout(() => {
      window.print();
    }, 450);
  };

  const getOrderStatusMeta = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return { label: 'Paid', cls: 'bg-success/10 text-success border-success/20' };
      case 'CANCELLED':
        return { label: 'Refunded', cls: 'bg-destructive/10 text-destructive border-destructive/20' };
      case 'READY':
        return { label: 'Ready', cls: 'bg-info/10 text-info border-info/20' };
      case 'PREPARING':
        return { label: 'Cooking', cls: 'bg-warning/10 text-warning border-warning/20' };
      default:
        return { label: status, cls: 'bg-muted text-muted-foreground border-border' };
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Billing & Invoices"
        subtitle="Manage payments, issue tax invoices, and print receipts."
        actions={
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              placeholder="Search table or invoice..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 rounded-xl bg-card/60 border border-border pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
            />
          </div>
        }
      />

      {/* Orders Grid/Table Container */}
      <div className="glass rounded-2xl shadow-card overflow-hidden">
        <div className="p-5 border-b border-border bg-card/10">
          <h3 className="font-semibold text-foreground">Recent Order Registry</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select any active order to collect payment, or view past invoices for refunds.
          </p>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/20 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-semibold">Order ID</th>
                <th className="px-6 py-4 font-semibold">Table No</th>
                <th className="px-6 py-4 font-semibold hidden md:table-cell">Date & Time</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Total Amount</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredOrders.map((order) => {
                const statusMeta = getOrderStatusMeta(order.status);
                const orderTime = new Date(order.created_at);
                const formattedTime = orderTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const formattedDate = orderTime.toLocaleDateString([], { month: 'short', day: 'numeric' });

                return (
                  <tr key={order.id} className="hover:bg-card/10 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                      #{order.id.substring(0, 8).toUpperCase()}
                    </td>
                    <td className="px-6 py-4 font-semibold text-foreground">
                      T-{order.tables?.table_number || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground hidden md:table-cell">
                      <div className="flex items-center gap-1.5">
                        <Clock className="size-3 text-muted-foreground" />
                        <span>{formattedDate}, {formattedTime}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        'text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border',
                        statusMeta.cls
                      )}>
                        {statusMeta.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-foreground">
                      ₹{order.total_amount}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' ? (
                          <Button
                            className="bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl h-9 px-3.5 shadow-sm active:scale-95 transition-all text-xs"
                            size="sm"
                            onClick={() => {
                              setSelectedOrder(order);
                              setIsBillDrawerOpen(true);
                            }}
                          >
                            <Banknote className="w-3.5 h-3.5 mr-1.5 shrink-0" /> Checkout
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedOrder(order);
                                setIsBillDrawerOpen(true);
                              }}
                              className="h-9 rounded-xl px-3 border-border hover:bg-muted font-bold text-xs"
                            >
                              <Receipt className="w-3.5 h-3.5 mr-1.5 shrink-0" /> View Bill
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePrintOrder(order)}
                              className="h-9 rounded-xl px-3 border-border hover:bg-muted font-bold text-xs"
                            >
                              <Printer className="w-3.5 h-3.5 mr-1.5 shrink-0" /> Print
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground font-semibold">
                    No orders matching your criteria found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <GenerateBillDrawer
        isOpen={isBillDrawerOpen}
        onOpenChange={setIsBillDrawerOpen}
        order={selectedOrder}
      />
    </div>
  );
};
