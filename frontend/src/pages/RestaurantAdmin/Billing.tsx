import { useOrders } from '@/hooks/api/useOrders';
import { Button } from '@/components/ui/button';
import { 
  Loader2, Printer, Banknote, Receipt, Clock, Search, 
  CheckCircle2, CreditCard, Calendar, X, Check 
} from 'lucide-react';
import { GenerateBillDrawer } from '@/components/GenerateBillDrawer';
import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export const Billing = () => {
  const { data: orders, isLoading } = useOrders();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isBillDrawerOpen, setIsBillDrawerOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'paid' | 'approvals'>('pending');

  const pendingOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter(order => order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && order.approval_status !== 'PENDING_APPROVAL');
  }, [orders]);

  const paidOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter(order => (order.status === 'COMPLETED' || order.status === 'CANCELLED') && order.approval_status !== 'PENDING_APPROVAL');
  }, [orders]);

  const approvalQueue = useMemo(() => {
    if (!orders) return [];
    return orders.filter(order => order.approval_status === 'PENDING_APPROVAL');
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const targetList = activeTab === 'pending' 
      ? pendingOrders 
      : (activeTab === 'paid' ? paidOrders : approvalQueue);
    if (!searchQuery) return targetList;
    return targetList.filter(order => {
      const orderIdMatch = order.id.toLowerCase().includes(searchQuery.toLowerCase());
      const tableMatch = `t-${order.tables?.table_number || ''}`.toLowerCase().includes(searchQuery.toLowerCase());
      const notesMatch = order.notes?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
      const customerMatch = order.customer_phone?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
      
      const invoice = order.invoices?.[0] || (order as any).invoice;
      const invoiceMatch = invoice?.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
      
      return orderIdMatch || tableMatch || notesMatch || customerMatch || invoiceMatch;
    });
  }, [activeTab, pendingOrders, paidOrders, searchQuery]);

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
      case 'SERVED':
        return { label: 'Served', cls: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' };
      default:
        return { label: status, cls: 'bg-muted text-muted-foreground border-border' };
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.max(0, Math.floor(diffMs / 60000));
    if (diffMins === 0) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const handleApproveOrder = async (orderId: string) => {
    try {
      const { data: orderData, error: fetchError } = await supabase
        .from('orders')
        .select('table_id')
        .eq('id', orderId)
        .single();

      const { error } = await supabase
        .from('orders')
        .update({ approval_status: 'APPROVED' })
        .eq('id', orderId);

      if (error) throw error;

      if (!fetchError && orderData?.table_id) {
        await supabase
          .from('tables')
          .update({ status: 'occupied' })
          .eq('id', orderData.table_id);
      }

      toast({
        title: '✅ Order Approved',
        description: 'The order has been approved and sent to the kitchen.',
      });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    } catch (err: any) {
      toast({
        title: 'Error Approving Order',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const handleRejectOrder = async (orderId: string, tableId: string) => {
    if (!window.confirm('Are you sure you want to reject this order? It will be cancelled immediately.')) {
      return;
    }
    try {
      const { error: orderError } = await supabase
        .from('orders')
        .update({ approval_status: 'REJECTED', status: 'CANCELLED' })
        .eq('id', orderId);

      if (orderError) throw orderError;

      if (tableId) {
        await supabase
          .from('tables')
          .update({ status: 'available' })
          .eq('id', tableId);
      }

      toast({
        title: '❌ Order Rejected',
        description: 'The order has been rejected and cancelled.',
      });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    } catch (err: any) {
      toast({
        title: 'Error Rejecting Order',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6 px-2 sm:px-4 md:px-0">
      <PageHeader
        title="Billing & Invoices"
        subtitle="Manage payments, issue tax invoices, and print receipts."
        actions={
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              placeholder="Search table, order, invoice..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 rounded-xl bg-card/60 border border-border pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/40 text-foreground transition-all"
            />
          </div>
        }
      />

      {/* Tabs Layout Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex gap-2 p-1 rounded-xl bg-card border border-border w-fit">
          <button
            onClick={() => setActiveTab('pending')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2.5",
              activeTab === 'pending'
                ? "bg-primary text-primary-foreground shadow-sm font-bold"
                : "text-muted-foreground hover:bg-accent"
            )}
          >
            <Clock className="w-4 h-4" />
            Pending Checkout
            {pendingOrders.length > 0 && (
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full font-black",
                activeTab === 'pending' 
                  ? "bg-primary-foreground text-primary" 
                  : "bg-primary text-primary-foreground"
              )}>
                {pendingOrders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('paid')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2.5",
              activeTab === 'paid'
                ? "bg-primary text-primary-foreground shadow-sm font-bold"
                : "text-muted-foreground hover:bg-accent"
            )}
          >
            <Receipt className="w-4 h-4" />
            Paid Registry
            {paidOrders.length > 0 && (
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full font-black",
                activeTab === 'paid'
                  ? "bg-primary-foreground text-primary"
                  : "bg-muted-foreground/20 text-muted-foreground"
              )}>
                {paidOrders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('approvals')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2.5",
              activeTab === 'approvals'
                ? "bg-primary text-primary-foreground shadow-sm font-bold"
                : "text-muted-foreground hover:bg-accent"
            )}
          >
            <CheckCircle2 className="w-4 h-4" />
            Pending Approvals
            {approvalQueue.length > 0 && (
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full font-black animate-pulse",
                activeTab === 'approvals'
                  ? "bg-primary-foreground text-primary"
                  : "bg-red-500 text-white"
              )}>
                {approvalQueue.length}
              </span>
            )}
          </button>
        </div>

        <p className="text-xs text-muted-foreground font-medium italic hidden sm:block">
          {activeTab === 'pending' 
            ? "Showing unpaid active orders that require payment collection." 
            : activeTab === 'paid'
              ? "Showing completed transactions and historical invoice records."
              : "Review customer-submitted orders and approve them to send to the kitchen."}
        </p>
      </div>

      {/* Conditionally Render views */}
      {activeTab === 'pending' && (
        /* PENDING ORDERS BOARD */
        <div>
          {filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center glass rounded-2xl border border-border bg-card/10">
              <div className="size-16 rounded-2xl bg-emerald-500/10 text-emerald-500 grid place-items-center mb-4">
                <CheckCircle2 className="size-8" />
              </div>
              <h3 className="font-bold text-foreground text-lg">All Cleared & Settled</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs px-4">
                No orders are currently waiting for checkout. Excellent job!
              </p>
            </div>
          ) : (
            /* RESPONSIVE LAYOUT FOR PENDING */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredOrders.map((order) => {
                const statusMeta = getOrderStatusMeta(order.status);
                const timeAgo = formatTimeAgo(order.created_at);
                
                return (
                  <div 
                    key={order.id} 
                    className="hover-lift glass rounded-2xl p-4 sm:p-5 shadow-card border border-border/80 flex flex-col justify-between h-full bg-card/20 relative overflow-hidden"
                  >
                    <div>
                      {/* Top Accent line for Served or Ready states */}
                      {order.status === 'READY' && <div className="absolute top-0 left-0 right-0 h-1 bg-info" />}
                      {order.status === 'SERVED' && <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />}
                      
                      {/* Header */}
                      <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className={cn(
                            "size-10 sm:size-11 rounded-xl font-black text-base sm:text-lg grid place-items-center shadow-sm shrink-0",
                            order.status === 'READY' ? "bg-info/10 text-info" :
                            order.status === 'SERVED' ? "bg-indigo-500/10 text-indigo-400" :
                            "bg-primary/10 text-primary"
                          )}>
                            T-{order.tables?.table_number || 'N/A'}
                          </span>
                          <div>
                            <h4 className="font-bold text-foreground text-sm flex items-center gap-1">
                              Table Seating
                            </h4>
                            <span className="text-[10px] text-muted-foreground font-mono bg-accent/60 px-1.5 py-0.5 rounded-md">
                              #{order.id.substring(0, 8).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={cn(
                            'text-[9px] uppercase font-black px-2 py-0.5 rounded-full border tracking-wide',
                            statusMeta.cls
                          )}>
                            {statusMeta.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="size-3" />
                            {timeAgo}
                          </span>
                        </div>
                      </div>

                      {/* Content - Items Summary */}
                      <div className="py-4 flex-1">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-2">Order Items Summary</p>
                        <div className="space-y-2">
                          {order.order_items?.slice(0, 3).map((item: any) => (
                            <div key={item.id} className="flex justify-between items-center text-sm">
                              <span className="text-foreground font-medium truncate flex items-center gap-1.5">
                                <span className={cn(
                                  "size-1.5 rounded-full shrink-0",
                                  item.menu_items?.type === 'veg' ? "bg-emerald-500" : "bg-rose-500"
                                )} />
                                {item.menu_items?.name || 'Item'}
                              </span>
                              <span className="text-muted-foreground font-bold text-xs bg-muted px-1.5 py-0.5 rounded-md font-mono">
                                x{item.quantity}
                              </span>
                            </div>
                          ))}
                          {order.order_items?.length > 3 && (
                            <div className="text-[11px] text-muted-foreground italic pl-3">
                              + {order.order_items.length - 3} more items...
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Footer Info and CTA */}
                    <div className="border-t border-border/40 pt-4 mt-auto space-y-4">
                      <div className="flex justify-between items-end">
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Amount Due</span>
                          <p className="text-xl sm:text-2xl font-black text-foreground">₹{Number(order.total_amount).toFixed(2)}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground italic">GST incl.</span>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedOrder(order);
                            setIsBillDrawerOpen(true);
                          }}
                          className="flex-1 h-10 rounded-xl border-border hover:bg-muted font-bold text-xs"
                        >
                          <Receipt className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" /> Details
                        </Button>
                        <Button
                          className="flex-[2] bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl h-10 shadow-sm active:scale-95 transition-all text-xs animate-pulse hover:animate-none"
                          size="sm"
                          onClick={() => {
                            setSelectedOrder(order);
                            setIsBillDrawerOpen(true);
                          }}
                        >
                          <Banknote className="w-3.5 h-3.5 mr-1.5 shrink-0" /> Checkout
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'paid' && (
        /* PAID ORDERS REGISTRY (DIFFERENT DESIGNS FOR DESKTOP & MOBILE) */
        <div>
          {filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center glass rounded-2xl border border-border bg-card/10">
              <div className="size-16 rounded-2xl bg-muted text-muted-foreground grid place-items-center mb-4">
                <Receipt className="size-8" />
              </div>
              <h3 className="font-bold text-foreground text-lg">No Paid Records</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs px-4">
                No past transactions match your search filter.
              </p>
            </div>
          ) : (
            <>
              {/* DESKTOP VIEW: CLEAN DATA TABLE */}
              <div className="hidden md:block glass rounded-2xl shadow-card overflow-hidden">
                <div className="p-5 border-b border-border bg-card/10 flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h3 className="font-semibold text-foreground">Completed Bills Registry</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Audit payment method receipts, print copies, and process refunds.
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider bg-muted/60 px-3 py-1.5 rounded-lg">
                    <Calendar className="w-3.5 h-3.5" /> Past 12 Hours
                  </div>
                </div>

                <div className="w-full overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-muted/20 border-b border-border">
                      <tr>
                        <th className="px-6 py-4 font-semibold">Invoice ID</th>
                        <th className="px-6 py-4 font-semibold">Table No</th>
                        <th className="px-6 py-4 font-semibold">Settled At</th>
                        <th className="px-6 py-4 font-semibold">Method</th>
                        <th className="px-6 py-4 font-semibold">Status</th>
                        <th className="px-6 py-4 font-semibold">Amount</th>
                        <th className="px-6 py-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {filteredOrders.map((order) => {
                        const statusMeta = getOrderStatusMeta(order.status);
                        const orderTime = new Date(order.created_at);
                        const formattedTime = orderTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const formattedDate = orderTime.toLocaleDateString([], { month: 'short', day: 'numeric' });

                        const invoice = order.invoices?.[0];
                        const invoiceNum = invoice?.invoice_number || `INV-${order.id.substring(0, 6).toUpperCase()}`;
                        const paymentMethod = invoice?.payment_method || 'CASH';

                        return (
                          <tr key={order.id} className="hover:bg-card/10 transition-colors">
                            <td className="px-6 py-4 font-semibold text-foreground">
                              <span className="font-mono text-xs">{invoiceNum}</span>
                            </td>
                            <td className="px-6 py-4 font-bold text-foreground">
                              T-{order.tables?.table_number || 'N/A'}
                            </td>
                            <td className="px-6 py-4 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <Clock className="size-3 text-muted-foreground" />
                                <span>{formattedDate}, {formattedTime}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground uppercase">
                                {paymentMethod === 'UPI' && <CreditCard className="size-3.5 text-blue-500" />}
                                {paymentMethod === 'CASH' && <Banknote className="size-3.5 text-emerald-500" />}
                                {paymentMethod === 'CARD' && <CreditCard className="size-3.5 text-violet-500" />}
                                {paymentMethod}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                'text-[9px] uppercase font-black px-2.5 py-0.5 rounded-full border tracking-wide',
                                statusMeta.cls
                              )}>
                                {statusMeta.label}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-bold text-foreground">
                              ₹{Number(order.total_amount).toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
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
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* MOBILE VIEW: COMPACT INVOICE CARD LIST */}
              <div className="block md:hidden space-y-3">
                {filteredOrders.map((order) => {
                  const statusMeta = getOrderStatusMeta(order.status);
                  const orderTime = new Date(order.created_at);
                  const formattedTime = orderTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const formattedDate = orderTime.toLocaleDateString([], { month: 'short', day: 'numeric' });

                  const invoice = order.invoices?.[0];
                  const invoiceNum = invoice?.invoice_number || `INV-${order.id.substring(0, 6).toUpperCase()}`;
                  const paymentMethod = invoice?.payment_method || 'CASH';

                  return (
                    <div key={order.id} className="glass rounded-2xl p-4 space-y-3.5 bg-card/25 border border-border">
                      <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
                        <div className="flex flex-col">
                          <span className="font-mono text-xs font-black text-foreground">{invoiceNum}</span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="size-2.5" /> {formattedDate}, {formattedTime}
                          </span>
                        </div>
                        <span className={cn(
                          'text-[9px] uppercase font-black px-2 py-0.5 rounded-full border tracking-wide',
                          statusMeta.cls
                        )}>
                          {statusMeta.label}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="text-[9px] text-muted-foreground uppercase font-black tracking-wider">Table</p>
                          <p className="font-extrabold text-foreground text-sm mt-0.5">Table T-{order.tables?.table_number || 'N/A'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] text-muted-foreground uppercase font-black tracking-wider">Payment Method</p>
                          <span className="inline-flex items-center gap-1 font-bold text-foreground text-xs mt-1">
                            {paymentMethod === 'UPI' && <CreditCard className="size-3 text-blue-500" />}
                            {paymentMethod === 'CASH' && <Banknote className="size-3 text-emerald-500" />}
                            {paymentMethod === 'CARD' && <CreditCard className="size-3 text-violet-500" />}
                            {paymentMethod}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-border/40 pt-3">
                        <div>
                          <p className="text-[9px] text-muted-foreground uppercase font-black tracking-wider">Total Settled</p>
                          <p className="font-black text-primary text-base">₹{Number(order.total_amount).toFixed(2)}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedOrder(order);
                              setIsBillDrawerOpen(true);
                            }}
                            className="h-9 w-9 rounded-xl p-0 border-border hover:bg-muted"
                          >
                            <Receipt className="w-4 h-4 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePrintOrder(order)}
                            className="h-9 rounded-xl px-3 border-border hover:bg-muted font-bold text-xs"
                          >
                            <Printer className="w-3.5 h-3.5 mr-1" /> Print
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'approvals' && (
        <div className="space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center glass rounded-2xl border border-border bg-card/10">
              <div className="size-16 rounded-2xl bg-emerald-500/10 text-emerald-500 grid place-items-center mb-4">
                <CheckCircle2 className="size-8" />
              </div>
              <h3 className="font-bold text-foreground text-lg">No Pending Approvals</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs px-4">
                There are no customer orders waiting for review. All clear!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredOrders.map((order) => {
                const orderTime = new Date(order.created_at);
                const formattedTime = orderTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                return (
                  <div key={order.id} className="glass rounded-2xl p-4 flex flex-col justify-between bg-card/25 border border-border shadow-card hover-lift transition-all">
                    <div>
                      {/* Header */}
                      <div className="flex items-center justify-between border-b border-border/40 pb-2.5 mb-3">
                        <div className="flex flex-col">
                          <span className="font-extrabold text-foreground text-lg">Table T-{order.tables?.table_number || 'N/A'}</span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5 font-medium">
                            <Clock className="size-2.5" /> {formatTimeAgo(order.created_at)} ({formattedTime})
                          </span>
                        </div>
                        <span className="bg-yellow-500/10 text-yellow-600 dark:bg-yellow-950/30 dark:text-yellow-400 border border-yellow-500/20 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider">
                          Reviewing
                        </span>
                      </div>

                      {/* Customer Info */}
                      {order.notes && (
                        <div className="text-xs font-semibold text-foreground bg-muted/30 border px-3 py-1.5 rounded-lg mb-3">
                          {order.notes} {order.customer_phone ? ` · +91 ${order.customer_phone}` : ''}
                        </div>
                      )}

                      {/* Items Details */}
                      <div className="space-y-2 mb-4 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                        <p className="text-[9px] text-muted-foreground uppercase font-black tracking-wider mb-1.5">Order Items</p>
                        {order.order_items?.map((item: any) => (
                          <div key={item.id} className="flex justify-between items-center text-xs border-b border-border/10 pb-1.5 last:border-0 last:pb-0">
                            <span className="font-medium text-foreground">
                              {item.quantity}x {item.menu_items?.name || 'Unknown'}
                            </span>
                            <span className="text-muted-foreground font-semibold">₹ {item.total_price}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="border-t border-border/40 pt-3 flex flex-col gap-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Total Amount</span>
                        <span className="font-black text-primary text-base">₹{Number(order.total_amount).toFixed(2)}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          onClick={() => handleRejectOrder(order.id, order.table_id)}
                          className="h-10 rounded-xl font-bold border-zinc-200 text-xs text-destructive hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                        >
                          <X className="w-3.5 h-3.5 mr-1" /> Reject
                        </Button>
                        <Button
                          onClick={() => handleApproveOrder(order.id)}
                          className="h-10 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white text-xs shadow-md shadow-emerald-500/10 transition-all"
                        >
                          <Check className="w-3.5 h-3.5 mr-1" /> Approve
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <GenerateBillDrawer
        isOpen={isBillDrawerOpen}
        onOpenChange={setIsBillDrawerOpen}
        order={selectedOrder}
        onComplete={() => setActiveTab('paid')}
      />
    </div>
  );
};
