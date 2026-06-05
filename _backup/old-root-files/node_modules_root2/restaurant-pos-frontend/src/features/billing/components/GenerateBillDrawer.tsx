import { useState, useMemo, useEffect } from 'react';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle,
  DrawerClose, DrawerDescription,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Loader2, Receipt, CreditCard, Banknote,
  Smartphone, SplitSquareHorizontal, Printer, RefreshCcw, CheckCircle2, Clock, Users, Phone
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { useTenantStore } from '@/store/tenantStore';
import { useToast } from '@/hooks/use-toast';
import { useSettingsStore } from '@/store/settingsStore';
import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils';

interface GenerateBillDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
  onComplete?: () => void;
}

export const GenerateBillDrawer = ({
  isOpen, onOpenChange, order, onComplete,
}: GenerateBillDrawerProps) => {
  const [discountPercent, setDiscountPercent] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [loadingRestaurant, setLoadingRestaurant] = useState(false);
  const [invoice, setInvoice] = useState<any>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);

  const { restaurantId: authRestaurantId } = useAuthStore();
  const { restaurantId: tenantRestaurantId } = useTenantStore();
  const restaurantId = authRestaurantId || tenantRestaurantId;

  // Read GST config from settings store (persisted in localStorage)
  const { gst, restaurantGSTIN } = useSettingsStore();

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reset state when a new order is opened
  useEffect(() => {
    if (isOpen) {
      setDiscountPercent(0);
      setPaymentMethod('cash');
      setPaymentSuccess(false);
    }
  }, [isOpen, order?.id]);

  // Fetch restaurant details from Supabase
  useEffect(() => {
    if (!isOpen || !restaurantId) return;
    const fetchRestaurant = async () => {
      setLoadingRestaurant(true);
      try {
        const { data, error } = await supabase.from('restaurants').select('*').eq('id', restaurantId).single();
        if (!error) setRestaurant(data);
        else logger.error('BILLING', 'FETCH_RESTAURANT', error);
      } finally {
        setLoadingRestaurant(false);
      }
    };
    fetchRestaurant();
  }, [isOpen, restaurantId]);

  // Fetch existing invoice if order already completed/cancelled
  useEffect(() => {
    if (!isOpen || !order?.id) { setInvoice(null); return; }
    const fetchInvoice = async () => {
      setLoadingInvoice(true);
      try {
        const { data, error } = await supabase.from('invoices').select('*').eq('order_id', order.id).maybeSingle();
        if (!error) setInvoice(data);
        else logger.error('BILLING', 'FETCH_INVOICE', error);
      } finally {
        setLoadingInvoice(false);
      }
    };
    fetchInvoice();
  }, [isOpen, order?.id]);

  // ── Calculations ──────────────────────────────────────────────────
  const subtotal = useMemo(() => {
    if (!order?.order_items?.length) return Number(order?.total_amount) || 0;
    return order.order_items.reduce(
      (sum: number, item: any) => sum + Number(item.unit_price) * Number(item.quantity), 0
    );
  }, [order]);

  const discountAmount = useMemo(() => {
    if (invoice) return Number(invoice.discount_amount) || 0;
    return (subtotal * discountPercent) / 100;
  }, [subtotal, discountPercent, invoice]);

  const taxableAmount = subtotal - discountAmount;

  const cgstAmount = useMemo(() =>
    gst.enabled && !gst.useIGST ? (taxableAmount * gst.cgst) / 100 : 0,
    [taxableAmount, gst]);

  const sgstAmount = useMemo(() =>
    gst.enabled && !gst.useIGST ? (taxableAmount * gst.sgst) / 100 : 0,
    [taxableAmount, gst]);

  const igstAmount = useMemo(() =>
    gst.enabled && gst.useIGST ? (taxableAmount * gst.igst) / 100 : 0,
    [taxableAmount, gst]);

  const totalTax = cgstAmount + sgstAmount + igstAmount;

  const grandTotal = useMemo(() => {
    if (invoice) return Number(invoice.total_amount) || 0;
    return taxableAmount + totalTax;
  }, [taxableAmount, totalTax, invoice]);

  const tempInvoiceNumber = useMemo(() => {
    const y = new Date().getFullYear();
    const m = (new Date().getMonth() + 1).toString().padStart(2, '0');
    return `INV-${y}${m}-${Math.floor(1000 + Math.random() * 9000)}`;
  }, []);

  // Restaurant display info
  const restaurantName = restaurant?.name || useTenantStore.getState().restaurantName || 'Restaurant';
  const restaurantAddress = restaurant?.address || '';
  const restaurantPhone = restaurant?.phone || '';
  const displayGSTIN = restaurantGSTIN || restaurant?.gst_number || '';

  // ── Handlers ──────────────────────────────────────────────────────
  const handleCompletePayment = async () => {
    if (!order || !restaurantId) return;
    setIsProcessing(true);
    try {
      logger.start('BILLING', 'CHECKOUT', `Invoice for order: ${order.id}`);
      const invNum = tempInvoiceNumber;

      const { error: invErr } = await supabase.from('invoices').insert([{
        restaurant_id: restaurantId,
        order_id: order.id,
        invoice_number: invNum,
        subtotal,
        tax_amount: totalTax,
        discount_amount: discountAmount,
        total_amount: grandTotal,
        payment_method: paymentMethod.toUpperCase() as any,
        payment_status: 'paid',
      }]);
      if (invErr) throw invErr;

      const { error: ordErr } = await supabase.from('orders')
        .update({ status: 'COMPLETED' }).eq('id', order.id);
      if (ordErr) throw ordErr;

      const tableNum = order.tables?.table_number || 'N/A';
      if (order.table_id) {
        await supabase.from('tables')
          .update({ status: 'available', current_order_id: null })
          .eq('id', order.table_id);
      }

      // Refetch invoice to display saved data
      const { data: newInv } = await supabase.from('invoices')
        .select('*').eq('order_id', order.id).maybeSingle();
      if (newInv) setInvoice(newInv);

      await queryClient.invalidateQueries({ queryKey: ['orders', restaurantId] });
      await queryClient.invalidateQueries({ queryKey: ['tables', restaurantId] });
      await queryClient.invalidateQueries({ queryKey: ['analytics', restaurantId] });

      setPaymentSuccess(true);
      logger.success('BILLING', 'CHECKOUT', `Invoice ${invNum} saved`);
      toast({
        title: '✅ Payment Completed',
        description: `Invoice ${invNum} generated. Table T-${tableNum} cleared.`,
        className: 'bg-green-50 border-green-200 text-green-900',
      });
    } catch (err: any) {
      logger.error('BILLING', 'CHECKOUT', err);
      toast({ title: 'Payment Failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRefund = async () => {
    if (!order || !restaurantId) return;
    setIsProcessing(true);
    try {
      logger.start('BILLING', 'REFUND', `Refund for order: ${order.id}`);

      const { error: invErr } = await supabase.from('invoices')
        .update({ payment_status: 'refunded' }).eq('order_id', order.id);
      if (invErr) throw invErr;

      const { error: ordErr } = await supabase.from('orders')
        .update({ status: 'CANCELLED' }).eq('id', order.id);
      if (ordErr) throw ordErr;

      if (order.table_id) {
        await supabase.from('tables')
          .update({ status: 'available', current_order_id: null })
          .eq('id', order.table_id);
      }

      await queryClient.invalidateQueries({ queryKey: ['orders', restaurantId] });
      await queryClient.invalidateQueries({ queryKey: ['tables', restaurantId] });
      await queryClient.invalidateQueries({ queryKey: ['analytics', restaurantId] });

      logger.success('BILLING', 'REFUND', `Order ${order.id} refunded`);
      toast({ title: '↩️ Order Refunded', description: 'Transaction reversed. Table is now available.' });
      onOpenChange(false);
      if (onComplete) onComplete();
    } catch (err: any) {
      logger.error('BILLING', 'REFUND', err);
      toast({ title: 'Refund Failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = () => window.print();

  // ── Status helpers ────────────────────────────────────────────────
  const paymentStatusLabel = (() => {
    if (invoice) return invoice.payment_status;
    if (order?.status === 'COMPLETED') return 'completed';
    if (order?.status === 'CANCELLED') return 'refunded';
    return 'pending';
  })();

  const statusBadgeCls = (() => {
    if (paymentStatusLabel === 'completed' || paymentStatusLabel === 'paid')
      return 'bg-green-100 text-green-800 border-green-300';
    if (paymentStatusLabel === 'refunded')
      return 'bg-red-100 text-red-800 border-red-300';
    return 'bg-orange-100 text-orange-800 border-orange-300';
  })();

  if (!order) return null;

  const isAlreadyPaid = order.status === 'COMPLETED';
  const isCancelled = order.status === 'CANCELLED';
  const isLoading = loadingRestaurant || loadingInvoice;

  const paymentModes = [
    { id: 'cash', label: 'Cash', icon: Banknote },
    { id: 'card', label: 'Card', icon: CreditCard },
    { id: 'upi', label: 'UPI', icon: Smartphone },
    { id: 'split', label: 'Split', icon: SplitSquareHorizontal },
  ];

  return (
    <Drawer open={isOpen} onOpenChange={(open) => {
      if (!open && paymentSuccess) setPaymentSuccess(false);
      onOpenChange(open);
    }}>
      <DrawerContent className="flex flex-col rounded-t-[2rem] max-h-[96dvh] md:max-h-[90vh] md:h-[90vh] md:w-[92vw] lg:w-[85vw] xl:w-[75vw] max-w-5xl mx-auto bg-background border border-border overflow-hidden">
        {/* Header */}
        <DrawerHeader className="px-5 sm:px-6 py-4 border-b border-border/80 flex items-center justify-between no-print shrink-0 bg-card/40">
          <div className="flex items-center gap-3">
            <span className="size-9 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
              <Receipt className="size-5" />
            </span>
            <div>
              <DrawerTitle className="text-base sm:text-lg font-black tracking-tight text-foreground">
                {isAlreadyPaid ? 'Tax Invoice Details' : 'Collect Payment & Settle Table'}
              </DrawerTitle>
              <DrawerDescription className="text-xs text-muted-foreground hidden sm:block">
                Verify items, apply discounts, and generate formal GST receipt.
              </DrawerDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-bold bg-muted/60 px-3 py-1 rounded-full text-xs">
              Table T-{order.tables?.table_number || 'N/A'}
            </Badge>
            <Badge className={cn('font-bold text-[10px] uppercase px-2.5 py-0.5 rounded-full border', statusBadgeCls)}>
              {paymentStatusLabel}
            </Badge>
          </div>
        </DrawerHeader>

        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-3">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground animate-pulse font-semibold">Generating tax invoice...</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
            
            {/* INVOICE SHEET PREVIEW PANEL */}
            <div className="w-full lg:flex-1 lg:overflow-y-auto p-4 md:p-6 bg-muted/20 custom-scrollbar flex justify-center no-print">
              
              {/* DESKTOP/TABLET SCREEN INVOICE VIEW (Hidden on Mobile) */}
              <div className="hidden md:flex flex-col justify-between bg-white border border-zinc-200 shadow-md rounded-2xl text-black w-full max-w-xl p-8 min-h-[500px]">
                <div>
                  {/* Logo & Restaurant Header */}
                  <div className="border-b border-dashed border-zinc-300 pb-5">
                    <div className="flex flex-row items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="size-14 rounded-2xl bg-zinc-900 grid place-items-center text-white shrink-0 shadow-sm border border-zinc-700">
                          <svg className="size-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <div>
                          <h2 className="text-2xl font-black uppercase tracking-tight text-zinc-900 leading-none">{restaurantName}</h2>
                          {restaurantAddress && <p className="text-xs text-zinc-500 mt-1 max-w-xs">{restaurantAddress}</p>}
                          {restaurantPhone && <p className="text-xs text-zinc-500 font-medium">Ph: {restaurantPhone}</p>}
                        </div>
                      </div>
                      <div className="text-right flex flex-col justify-between items-end">
                        <span className="text-[10px] bg-zinc-900 text-white font-black tracking-widest px-3 py-1 rounded-md uppercase">
                          Tax Invoice
                        </span>
                        {displayGSTIN && <p className="text-[11px] font-bold text-zinc-700 mt-2">GSTIN: {displayGSTIN}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Seating / Client Meta Grid */}
                  <div className="py-4 border-b border-dashed border-zinc-200 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Bill Number</span>
                      <p className="font-bold text-zinc-900 mt-0.5 truncate">{invoice?.invoice_number || tempInvoiceNumber}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Date & Time</span>
                      <p className="font-bold text-zinc-900 mt-0.5">{new Date(invoice?.created_at || order.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Table Seating</span>
                      <p className="font-bold text-zinc-900 mt-0.5">T-{order.tables?.table_number || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Served By</span>
                      <p className="font-bold text-zinc-900 mt-0.5 truncate">{order.users?.full_name || 'Staff'}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Customer Details</span>
                      <p className="font-bold text-zinc-900 mt-0.5 truncate">Ph: {order.customer_phone || 'Walk-in Guest'}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Order ID</span>
                      <p className="font-bold text-zinc-900 mt-0.5 truncate text-[11px]">{order.id}</p>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="py-4 border-b border-dashed border-zinc-200">
                    <table className="w-full text-xs font-mono">
                      <thead>
                        <tr className="text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-200 pb-2">
                          <th className="py-2.5 text-left font-black">Item Description</th>
                          <th className="py-2.5 text-center font-black w-12">Qty</th>
                          <th className="py-2.5 text-right font-black w-20">Rate</th>
                          <th className="py-2.5 text-right font-black w-24">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {order.order_items?.map((item: any) => (
                          <tr key={item.id} className="align-middle">
                            <td className="py-3 pr-2">
                              <p className="font-bold text-zinc-900">{item.menu_items?.name || 'Item'}</p>
                              {item.notes && <p className="text-[10px] text-orange-600 font-medium mt-0.5">✦ {item.notes}</p>}
                            </td>
                            <td className="py-3 text-center font-bold text-zinc-800">{item.quantity}</td>
                            <td className="py-3 text-right text-zinc-600">₹{Number(item.unit_price).toFixed(2)}</td>
                            <td className="py-3 text-right font-black text-zinc-900">₹{Number(item.total_price).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals Section */}
                  <div className="py-4 space-y-2 text-xs font-mono bg-zinc-50/50 p-4 rounded-xl mt-4 border border-zinc-100">
                    <div className="flex justify-between text-zinc-500">
                      <span>Subtotal ({order.order_items?.length || 0} items)</span>
                      <span className="font-bold text-zinc-800">₹{subtotal.toFixed(2)}</span>
                    </div>

                    {discountAmount > 0 && (
                      <div className="flex justify-between text-rose-600">
                        <span>Discount ({invoice ? 'Applied' : `${discountPercent}%`})</span>
                        <span className="font-bold">-₹{discountAmount.toFixed(2)}</span>
                      </div>
                    )}

                    {gst.enabled ? (
                      gst.useIGST ? (
                        <div className="flex justify-between text-zinc-500">
                          <span>IGST ({gst.igst}%)</span>
                          <span className="font-bold text-zinc-800">₹{igstAmount.toFixed(2)}</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between text-zinc-500">
                            <span>CGST ({gst.cgst}%)</span>
                            <span className="font-bold text-zinc-800">₹{cgstAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-zinc-500">
                            <span>SGST ({gst.sgst}%)</span>
                            <span className="font-bold text-zinc-800">₹{sgstAmount.toFixed(2)}</span>
                          </div>
                        </>
                      )
                    ) : (
                      <div className="flex justify-between text-zinc-400 italic">
                        <span>GST Taxes</span>
                        <span>Not applicable</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2.5 border-t border-zinc-200 text-sm font-black text-zinc-900 uppercase">
                      <span>Grand Total Due</span>
                      <span className="text-xl text-primary font-black">₹{grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 text-center border-t border-dashed border-zinc-200">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-black">Thank You · Visit Us Again</p>
                </div>
              </div>

              {/* MOBILE NATIVE SCREEN INVOICE VIEW (Hidden on Desktop) */}
              <div className="flex md:hidden flex-col w-full space-y-4 text-foreground p-1 bg-transparent">
                
                {/* Meta details list */}
                <div className="glass rounded-2xl p-4 space-y-3 bg-card/60 border border-border">
                  <h4 className="font-black text-xs uppercase tracking-wider text-primary border-b border-border/40 pb-2">Seating & Info</h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Clock className="size-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase font-semibold">Date</p>
                        <p className="font-bold">{new Date(invoice?.created_at || order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="size-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase font-semibold">Waiter</p>
                        <p className="font-bold truncate max-w-[100px]">{order.users?.full_name || 'Staff'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="size-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase font-semibold">Customer</p>
                        <p className="font-bold truncate max-w-[100px]">{order.customer_phone ? order.customer_phone.substring(0, 11) : 'Walk-in'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Receipt className="size-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase font-semibold">Bill No</p>
                        <p className="font-bold font-mono">#{ (invoice?.invoice_number || tempInvoiceNumber).substring(0, 10) }</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items List */}
                <div className="glass rounded-2xl p-4 bg-card/60 border border-border">
                  <h4 className="font-black text-xs uppercase tracking-wider text-primary border-b border-border/40 pb-2.5 mb-2.5">
                    Ordered Dishes
                  </h4>
                  <div className="space-y-3.5">
                    {order.order_items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-start text-sm">
                        <div className="min-w-0 pr-2">
                          <p className="font-bold text-foreground truncate">{item.menu_items?.name || 'Dish Name'}</p>
                          {item.notes && <p className="text-[10px] text-orange-500 italic mt-0.5">"{item.notes}"</p>}
                        </div>
                        <div className="text-right shrink-0 flex flex-col items-end">
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {item.quantity} × ₹{Number(item.unit_price).toFixed(0)}
                          </span>
                          <span className="font-bold text-foreground text-xs mt-0.5">
                            ₹{Number(item.total_price).toFixed(0)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Breakdown Summary */}
                <div className="glass rounded-2xl p-4 bg-card/60 border border-border space-y-2.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="font-bold">₹{subtotal.toFixed(2)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-xs text-rose-500 font-bold">
                      <span>Discount</span>
                      <span>-₹{discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {gst.enabled && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>GST Taxes</span>
                      <span className="font-bold">₹{totalTax.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2.5 border-t border-border/40 text-sm font-black text-foreground uppercase">
                    <span>Total Amount Due</span>
                    <span className="text-lg text-primary font-black">₹{grandTotal.toFixed(2)}</span>
                  </div>
                </div>

              </div>
            </div>

            {/* PRINT-ONLY INVOICE (Hidden on screen, styled for 80mm thermal printers) */}
            <div className="print-container hidden bg-white text-black font-mono text-xs w-full max-w-[80mm] p-2 leading-tight">
              <div className="text-center pb-3 border-b border-zinc-300">
                <h3 className="text-sm font-black uppercase">{restaurantName}</h3>
                {restaurantAddress && <p className="text-[10px] text-zinc-500">{restaurantAddress}</p>}
                {restaurantPhone && <p className="text-[10px] text-zinc-500">Ph: {restaurantPhone}</p>}
                {displayGSTIN && <p className="text-[10px] text-zinc-700 font-bold">GSTIN: {displayGSTIN}</p>}
              </div>

              <div className="py-2 border-b border-zinc-200 text-[10px] space-y-0.5">
                <p><strong>BILL NO:</strong> {invoice?.invoice_number || tempInvoiceNumber}</p>
                <p><strong>DATE:</strong> {new Date(invoice?.created_at || order.created_at).toLocaleString()}</p>
                <p><strong>TABLE:</strong> T-{order.tables?.table_number || 'N/A'}</p>
                <p><strong>WAITER:</strong> {order.users?.full_name || 'Staff'}</p>
                <p><strong>CLIENT:</strong> {order.customer_phone || 'Walk-in'}</p>
              </div>

              <table className="w-full text-[10px] my-2">
                <thead>
                  <tr className="border-b border-zinc-300">
                    <th className="text-left py-1">ITEM</th>
                    <th className="text-center py-1 w-8">QTY</th>
                    <th className="text-right py-1 w-12">RATE</th>
                    <th className="text-right py-1 w-14">AMT</th>
                  </tr>
                </thead>
                <tbody>
                  {order.order_items?.map((item: any) => (
                    <tr key={item.id}>
                      <td className="py-1">{item.menu_items?.name || 'Item'}</td>
                      <td className="text-center py-1">{item.quantity}</td>
                      <td className="text-right py-1">₹{Number(item.unit_price).toFixed(0)}</td>
                      <td className="text-right py-1 font-bold">₹{Number(item.total_price).toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-t border-zinc-300 py-1.5 space-y-1 text-[10px] text-right">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between font-bold text-zinc-600">
                    <span>Discount:</span>
                    <span>-₹{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                {gst.enabled && (
                  <div className="flex justify-between">
                    <span>Tax (GST):</span>
                    <span>₹{totalTax.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[11px] font-black border-t border-zinc-200 pt-1 mt-1 text-black">
                  <span>TOTAL DUE:</span>
                  <span>₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="text-center pt-3 border-t border-zinc-200 mt-2 text-[10px]">
                <p className="font-bold">THANK YOU - VISIT AGAIN</p>
                <p className="text-[8px] text-zinc-400">Powered by DineSwift</p>
              </div>
            </div>

            {/* RIGHT SIDE: PAYMENT PANEL CONTROL (no-print) */}
            <div className="w-full lg:w-80 p-6 bg-card border-t lg:border-t-0 lg:border-l border-border/80 flex flex-col justify-between shrink-0 no-print">
              <div className="space-y-6">
                
                {/* Billing Summary Box */}
                <div className="p-4 rounded-2xl bg-muted/30 border border-border/60 space-y-3">
                  <h4 className="font-bold text-sm text-foreground">Checkout Summary</h4>
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Table Number:</span>
                      <span className="font-bold text-foreground">T-{order.tables?.table_number || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Order Items:</span>
                      <span className="font-bold text-foreground">{order.order_items?.length || 0} items</span>
                    </div>
                    <div className="flex justify-between border-t border-border/40 pt-1.5 mt-1.5 text-sm font-bold text-foreground">
                      <span>Total Amount:</span>
                      <span className="text-primary font-black">₹{grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Discount Percentage Slider (only for unpaid bills) */}
                {!invoice && !isAlreadyPaid && !isCancelled && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label className="text-sm font-bold text-foreground">Add Discount</Label>
                      <span className="text-xs font-black text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded-md">
                        {discountPercent}% Off
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input 
                        type="range" min="0" max="100" step="5"
                        value={discountPercent} 
                        onChange={(e) => setDiscountPercent(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                      <Input
                        type="number" min="0" max="100"
                        value={discountPercent}
                        onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                        className="h-8 w-14 text-center rounded-xl bg-card border-border text-xs font-bold"
                      />
                    </div>
                  </div>
                )}

                {/* Payment Methods (only for unpaid bills) */}
                {!invoice && !isAlreadyPaid && !isCancelled && !paymentSuccess && (
                  <div className="space-y-3">
                    <Label className="text-sm font-bold text-foreground">Select Payment Mode</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {paymentModes.map(({ id, label, icon: Icon }) => (
                        <button
                          key={id}
                          onClick={() => setPaymentMethod(id)}
                          className={cn(
                            'h-12 rounded-xl flex items-center gap-2 px-3.5 font-bold text-xs transition-all active:scale-[0.97] border',
                            paymentMethod === id
                              ? 'bg-primary border-primary text-primary-foreground shadow-sm'
                              : 'bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                          )}
                        >
                          <Icon className="w-4 h-4 shrink-0" /> {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Success Message Banner */}
                {paymentSuccess && (
                  <div className="flex flex-col items-center gap-2 py-4 text-center">
                    <div className="size-12 rounded-full bg-success/15 grid place-items-center text-success animate-bounce">
                      <CheckCircle2 className="size-6" />
                    </div>
                    <p className="font-black text-sm text-foreground">Payment Received</p>
                    <p className="text-xs text-muted-foreground">The table is cleared and set to available.</p>
                  </div>
                )}

              </div>

              {/* Actions Section */}
              <div className="pt-6 border-t border-border/80 space-y-2">
                {paymentSuccess ? (
                  <div className="flex flex-col gap-2">
                    <Button
                      className="w-full h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-black shadow-md flex items-center justify-center gap-2"
                      onClick={() => {
                        const phone = order?.customer_phone || "";
                        const cleanPhone = phone.replace(/\D/g, "");
                        let waNumber = "";
                        if (cleanPhone.length === 10) {
                          waNumber = `91${cleanPhone}`;
                        } else if (cleanPhone.length > 10) {
                          waNumber = cleanPhone;
                        }
                        
                        const waText = encodeURIComponent(`Hi, here is your bill for Table T-${order.tables?.table_number || "N/A"} from ${restaurantName}. Total Amount: ₹${grandTotal.toFixed(2)}.`);
                        
                        if (waNumber) {
                          window.open(`https://wa.me/${waNumber}?text=${waText}`, '_blank');
                        } else {
                          toast({
                            title: "WhatsApp Status",
                            description: "No customer phone number registered for this order.",
                            variant: "destructive",
                          });
                        }
                        
                        onOpenChange(false);
                        if (onComplete) onComplete();
                      }}
                    >
                      <svg className="w-5 h-5 fill-current mr-1.5" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.73-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.967C16.528 2.012 14.053.99 11.433.99c-5.437 0-9.862 4.37-9.866 9.8.001 1.968.517 3.888 1.498 5.607l-.979 3.57 3.674-.959z" />
                      </svg>
                      Send Bill on WhatsApp
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full h-11 rounded-xl font-bold text-xs"
                      onClick={() => {
                        onOpenChange(false);
                        if (onComplete) onComplete();
                      }}
                    >
                      Close & Go to Transaction History
                    </Button>
                  </div>
                ) : !isAlreadyPaid && !isCancelled ? (
                  <div className="flex flex-col gap-2">
                    <Button
                      className="w-full h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-black shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                      onClick={handleCompletePayment}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                      )}
                      Complete Payment (₹{grandTotal.toFixed(0)})
                    </Button>
                    <Button variant="outline" className="w-full h-11 rounded-xl font-bold text-xs" onClick={handlePrint}>
                      <Printer className="w-4 h-4 mr-2 text-muted-foreground" /> Print Guest Bill
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1 h-11 rounded-xl font-bold text-xs" onClick={handlePrint}>
                        <Printer className="w-4 h-4 mr-1.5 text-muted-foreground" /> Print Invoice
                      </Button>
                      {isAlreadyPaid && !isCancelled && (
                        <Button
                          className="flex-1 h-11 rounded-xl font-bold bg-rose-600 hover:bg-rose-700 text-white text-xs"
                          onClick={handleRefund}
                          disabled={isProcessing}
                        >
                          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <RefreshCcw className="w-4 h-4 mr-1.5" />}
                          Void Invoice
                        </Button>
                      )}
                    </div>
                    <Button
                      className="w-full h-11 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-black shadow-sm flex items-center justify-center gap-1.5"
                      onClick={() => {
                        const phone = order?.customer_phone || "";
                        const cleanPhone = phone.replace(/\D/g, "");
                        let waNumber = "";
                        if (cleanPhone.length === 10) {
                          waNumber = `91${cleanPhone}`;
                        } else if (cleanPhone.length > 10) {
                          waNumber = cleanPhone;
                        }
                        
                        const waText = encodeURIComponent(`Hi, here is your bill for Table T-${order.tables?.table_number || "N/A"} from ${restaurantName}. Total Amount: ₹${grandTotal.toFixed(2)}.`);
                        
                        if (waNumber) {
                          window.open(`https://wa.me/${waNumber}?text=${waText}`, '_blank');
                        } else {
                          toast({
                            title: "WhatsApp Status",
                            description: "No customer phone number registered for this order.",
                            variant: "destructive",
                          });
                        }
                        
                        onOpenChange(false);
                        if (onComplete) onComplete();
                      }}
                    >
                      <svg className="w-4 h-4 fill-current mr-1" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.73-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.967C16.528 2.012 14.053.99 11.433.99c-5.437 0-9.862 4.37-9.866 9.8.001 1.968.517 3.888 1.498 5.607l-.979 3.57 3.674-.959z" />
                      </svg>
                      Send Bill on WhatsApp
                    </Button>
                  </div>
                )}

                <DrawerClose asChild>
                  <Button variant="ghost" className="w-full h-10 rounded-xl font-semibold text-xs text-muted-foreground mt-2">
                    Close Panel
                  </Button>
                </DrawerClose>
              </div>

            </div>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
};
