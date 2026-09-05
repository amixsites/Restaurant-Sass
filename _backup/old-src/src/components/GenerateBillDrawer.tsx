import { useState, useMemo, useEffect } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose, DrawerDescription } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Receipt, CreditCard, Banknote, Smartphone, SplitSquareHorizontal, Printer, RefreshCcw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { useTenantStore } from '@/store/tenantStore';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

interface GenerateBillDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  order: any; // Using any for the order structure
  onComplete?: () => void;
}

export const GenerateBillDrawer = ({ isOpen, onOpenChange, order, onComplete }: GenerateBillDrawerProps) => {
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  
  const [restaurant, setRestaurant] = useState<any>(null);
  const [loadingRestaurant, setLoadingRestaurant] = useState(false);
  
  const [invoice, setInvoice] = useState<any>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);

  const { restaurantId: authRestaurantId } = useAuthStore();
  const { restaurantId: tenantRestaurantId } = useTenantStore();
  const restaurantId = authRestaurantId || tenantRestaurantId;

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 1. Fetch Restaurant details dynamically
  useEffect(() => {
    const fetchRestaurantDetails = async () => {
      if (!restaurantId) return;
      setLoadingRestaurant(true);
      try {
        logger.start('BILLING', 'FETCH_RESTAURANT', `Fetching info for ID: ${restaurantId}`);
        const { data, error } = await supabase
          .from('restaurants')
          .select('*')
          .eq('id', restaurantId)
          .single();
        if (error) throw error;
        setRestaurant(data);
      } catch (err) {
        logger.error('BILLING', 'FETCH_RESTAURANT', err, 'Error fetching restaurant details');
      } finally {
        setLoadingRestaurant(false);
      }
    };

    if (isOpen && restaurantId) {
      fetchRestaurantDetails();
    }
  }, [isOpen, restaurantId]);

  // 2. Fetch Invoice details if the order is already completed or cancelled
  useEffect(() => {
    const fetchInvoiceDetails = async () => {
      if (!order?.id) return;
      setLoadingInvoice(true);
      try {
        logger.start('BILLING', 'FETCH_INVOICE', `Fetching invoice for order: ${order.id}`);
        const { data, error } = await supabase
          .from('invoices')
          .select('*')
          .eq('order_id', order.id)
          .maybeSingle();
        if (error) throw error;
        setInvoice(data);
      } catch (err) {
        logger.error('BILLING', 'FETCH_INVOICE', err, 'Error fetching invoice');
      } finally {
        setLoadingInvoice(false);
      }
    };

    if (isOpen && order?.id) {
      fetchInvoiceDetails();
    } else {
      setInvoice(null);
    }
  }, [isOpen, order?.id]);

  // Calculations
  const subtotal = useMemo(() => {
    if (!order?.order_items) return order?.total_amount || 0;
    return order.order_items.reduce((sum: number, item: any) => sum + (item.unit_price * item.quantity), 0);
  }, [order]);

  const discountAmount = useMemo(() => {
    if (invoice) return invoice.discount_amount || 0;
    return (subtotal * discountPercent) / 100;
  }, [subtotal, discountPercent, invoice]);

  const cgstAmount = useMemo(() => {
    // CGST 9%
    return (subtotal * 9) / 100;
  }, [subtotal]);

  const sgstAmount = useMemo(() => {
    // SGST 9%
    return (subtotal * 9) / 100;
  }, [subtotal]);

  const grandTotal = useMemo(() => {
    if (invoice) return invoice.total_amount || 0;
    return subtotal + cgstAmount + sgstAmount - discountAmount;
  }, [subtotal, cgstAmount, sgstAmount, discountAmount, invoice]);

  const tempInvoiceNumber = useMemo(() => {
    const year = new Date().getFullYear();
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `INV-${year}${month}-${random}`;
  }, []);

  const handleCompletePayment = async () => {
    if (!order || !restaurantId) return;
    setIsProcessing(true);
    
    try {
      logger.start('BILLING', 'CHECKOUT', `Generating invoice for order: ${order.id}`);
      const invNum = tempInvoiceNumber;
      
      // 1. Create Invoice in Supabase
      const { error: invoiceError } = await supabase.from('invoices').insert([{
        restaurant_id: restaurantId,
        order_id: order.id,
        invoice_number: invNum,
        subtotal: subtotal,
        tax_amount: cgstAmount + sgstAmount,
        discount_amount: discountAmount,
        total_amount: grandTotal,
        payment_method: paymentMethod.toUpperCase() as any,
        payment_status: 'completed'
      }]);
      
      if (invoiceError) throw invoiceError;

      // 2. Update Order Status to COMPLETED
      logger.info('BILLING', 'CHECKOUT', 'Updating order status to COMPLETED');
      const { error: orderError } = await supabase.from('orders')
        .update({ status: 'COMPLETED' })
        .eq('id', order.id);
        
      if (orderError) throw orderError;

      // 3. Update Table Status to AVAILABLE and clear active order
      if (order.table_id) {
        logger.info('BILLING', 'CHECKOUT', `Clearing table ${order.table_id}`);
        const { error: tableError } = await supabase.from('tables')
          .update({ status: 'AVAILABLE', current_order_id: null })
          .eq('id', order.table_id);
          
        if (tableError) throw tableError;
      }

      await queryClient.invalidateQueries({ queryKey: ['orders', restaurantId] });
      await queryClient.invalidateQueries({ queryKey: ['tables', restaurantId] });
      
      setPaymentSuccess(true);
      logger.success('BILLING', 'CHECKOUT', `Invoice ${invNum} generated successfully`);
      toast({ title: 'Payment Completed', description: 'Bill generated successfully and table is cleared.' });
      if (onComplete) onComplete();
      
    } catch (err: any) {
      logger.error('BILLING', 'CHECKOUT', err, 'Error processing payment');
      toast({ 
        title: 'Payment Failed', 
        description: err.message || 'Failed to complete payment.', 
        variant: 'destructive' 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRefund = async () => {
    if (!order || !restaurantId) return;
    setIsProcessing(true);
    
    try {
      logger.start('BILLING', 'REFUND', `Reversing payment for order: ${order.id}`);
      
      const { error: invoiceError } = await supabase.from('invoices')
        .update({ payment_status: 'refunded' })
        .eq('order_id', order.id);
        
      if (invoiceError) throw invoiceError;

      logger.info('BILLING', 'REFUND', 'Updating order status to CANCELLED');
      const { error: orderError } = await supabase.from('orders')
        .update({ status: 'CANCELLED' })
        .eq('id', order.id);
        
      if (orderError) throw orderError;

      if (order.table_id) {
        logger.info('BILLING', 'REFUND', `Clearing table ${order.table_id}`);
        const { error: tableError } = await supabase.from('tables')
          .update({ status: 'AVAILABLE', current_order_id: null })
          .eq('id', order.table_id);
          
        if (tableError) throw tableError;
      }

      await queryClient.invalidateQueries({ queryKey: ['orders', restaurantId] });
      await queryClient.invalidateQueries({ queryKey: ['tables', restaurantId] });
      
      logger.success('BILLING', 'REFUND', `Order ${order.id} refunded successfully`);
      toast({ title: 'Order Refunded', description: 'Transaction rolled back and table is now available.' });
      onOpenChange(false);
      if (onComplete) onComplete();
      
    } catch (err: any) {
      logger.error('BILLING', 'REFUND', err, 'Error processing refund');
      toast({ 
        title: 'Refund Failed', 
        description: err.message || 'Failed to process refund.', 
        variant: 'destructive' 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Status mapping
  const getPaymentStatusLabel = () => {
    if (invoice) {
      return invoice.payment_status; // 'completed', 'refunded'
    }
    if (order.status === 'COMPLETED') return 'completed';
    if (order.status === 'CANCELLED') return 'refunded';
    return 'pending';
  };

  const getPaymentStatusBadgeStyle = () => {
    const statusVal = getPaymentStatusLabel().toLowerCase();
    if (statusVal === 'completed' || statusVal === 'paid') {
      return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800';
    } else if (statusVal === 'refunded') {
      return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800';
    } else {
      return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800';
    }
  };

  // Fallback restaurant metadata
  const restaurantName = restaurant?.name || useTenantStore.getState().restaurantName || 'Gourmet Bistro';
  const restaurantAddress = restaurant?.address || '123 Gourmet Street, Food District';
  const restaurantPhone = restaurant?.phone || '+91 98765 43210';
  const restaurantGST = (restaurant as any)?.gst_number || '27AAPCS1234M1Z5';

  if (!order) return null;

  const isOrderAlreadyPaid = order.status === 'COMPLETED';
  const isOrderCancelled = order.status === 'CANCELLED';

  return (
    <Drawer open={isOpen} onOpenChange={(open) => {
      if (!open && paymentSuccess) setPaymentSuccess(false);
      onOpenChange(open);
    }}>
      <DrawerContent className="px-4 flex flex-col rounded-t-[2.5rem] max-h-[96dvh] bg-background">
        <DrawerHeader className="px-0 pb-4 border-b no-print">
          <DrawerTitle className="text-2xl font-black tracking-tight flex items-center justify-between">
            <span>{isOrderAlreadyPaid ? 'Invoice Details' : 'Checkout & Generate Bill'}</span>
            <Badge variant="outline" className="text-sm font-bold bg-muted/60 px-3 py-1 rounded-full">
              Table T-{order.tables?.table_number || 'N/A'}
            </Badge>
          </DrawerTitle>
          <DrawerDescription className="sr-only">
            Invoice view and processing drawer
          </DrawerDescription>
        </DrawerHeader>

        {loadingRestaurant || loadingInvoice ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-3">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground animate-pulse font-semibold">Generating Bill Elements...</p>
          </div>
        ) : (
          <ScrollArea className="flex-1 py-4 custom-scrollbar">
            <div className="space-y-6">
              
              {/* Premium Printable Receipt Card */}
              <div className="print-container bg-white border border-border shadow-md rounded-2xl p-5 max-w-md mx-auto print:shadow-none print:border-none print:max-w-[80mm] print:p-2 text-black">
                {/* Header */}
                <div className="text-center pb-4 border-b border-dashed border-zinc-300">
                  <div className="flex justify-center mb-1 no-print">
                    <Receipt className="w-8 h-8 text-primary shrink-0" />
                  </div>
                  <h2 className="text-2xl font-black tracking-tight text-zinc-900 uppercase print-receipt-bold">
                    {restaurantName}
                  </h2>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed print-receipt-text">
                    {restaurantAddress}
                  </p>
                  <p className="text-xs text-zinc-500 leading-relaxed print-receipt-text">
                    Phone: {restaurantPhone}
                  </p>
                  <p className="text-xs font-bold text-zinc-700 mt-1 print-receipt-text">
                    GSTIN: {restaurantGST}
                  </p>
                </div>

                {/* Metadata */}
                <div className="py-4 border-b border-dashed border-zinc-300 grid grid-cols-2 gap-y-2 gap-x-4 text-xs text-zinc-700 print-receipt-text font-mono">
                  <div>
                    <span className="text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">Invoice No</span>
                    <p className="font-black text-zinc-900 mt-0.5 print-receipt-bold">
                      {invoice?.invoice_number || tempInvoiceNumber}
                    </p>
                  </div>
                  <div>
                    <span className="text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">Date & Time</span>
                    <p className="font-bold text-zinc-850 mt-0.5">
                      {invoice?.created_at 
                        ? new Date(invoice.created_at).toLocaleString() 
                        : new Date(order.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">Table No</span>
                    <p className="font-black text-zinc-900 mt-0.5 print-receipt-bold">
                      Table T-{order.tables?.table_number || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">Staff (Waiter)</span>
                    <p className="font-bold text-zinc-850 mt-0.5">
                      {order.users?.full_name || 'Staff'}
                    </p>
                  </div>
                  <div>
                    <span className="text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">Customer Phone</span>
                    <p className="font-bold text-zinc-850 mt-0.5">
                      {order.customer_phone || 'Walk-in'}
                    </p>
                  </div>
                  <div>
                    <span className="text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">Payment Mode</span>
                    <p className="font-black text-zinc-950 mt-0.5 uppercase print-receipt-bold">
                      {invoice?.payment_method || paymentMethod}
                    </p>
                  </div>
                </div>

                {/* Items Table */}
                <div className="py-4 border-b border-dashed border-zinc-300 print-receipt-text font-mono">
                  <table className="w-full text-xs text-left text-zinc-750">
                    <thead>
                      <tr className="border-b border-zinc-200 text-zinc-400 font-bold uppercase text-[10px] tracking-wider">
                        <th className="py-2 font-black">Item Description</th>
                        <th className="py-2 text-center font-black">Qty</th>
                        <th className="py-2 text-right font-black">Price</th>
                        <th className="py-2 text-right font-black">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {order.order_items?.map((item: any) => (
                        <tr key={item.id} className="text-zinc-800">
                          <td className="py-2.5 font-bold leading-tight">
                            {item.menu_items?.name || 'Unknown Item'}
                            {item.notes && (
                              <span className="block text-[10px] text-orange-600 font-semibold leading-none mt-0.5">
                                * {item.notes}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 text-center font-bold">{item.quantity}</td>
                          <td className="py-2.5 text-right font-medium">₹{item.unit_price}</td>
                          <td className="py-2.5 text-right font-black text-zinc-900">₹{item.total_price}</td>
                        </tr>
                      ))}
                      {!order.order_items?.length && (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-zinc-450 font-bold">
                            No items found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Calculations */}
                <div className="py-4 space-y-2 border-b border-dashed border-zinc-300 text-xs print-receipt-text font-mono">
                  <div className="flex justify-between items-center text-zinc-500 font-medium">
                    <span>Subtotal</span>
                    <span className="font-bold text-zinc-900">₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-500 font-medium">
                    <span>CGST (9%)</span>
                    <span className="font-bold text-zinc-900">₹{cgstAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-500 font-medium">
                    <span>SGST (9%)</span>
                    <span className="font-bold text-zinc-900">₹{sgstAmount.toFixed(2)}</span>
                  </div>
                  
                  {/* Discount Section */}
                  {!invoice && !isOrderAlreadyPaid && (
                    <div className="flex items-center gap-2 py-1 no-print">
                      <Label className="text-zinc-500 font-semibold text-xs whitespace-nowrap">Discount (%)</Label>
                      <Input 
                        type="number" 
                        min="0"
                        max="100"
                        value={discountPercent} 
                        onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))} 
                        className="h-8 w-16 text-right rounded-lg bg-zinc-50 border-zinc-200"
                      />
                      <div className="flex-1 border-b border-dashed border-zinc-200 font-mono"></div>
                      <span className="font-black text-zinc-900">-₹{discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {(invoice || discountAmount > 0) && (
                    <div className="flex justify-between items-center text-rose-600 font-medium">
                      <span>Discount ({invoice ? 'Applied' : `${discountPercent}%`})</span>
                      <span className="font-bold">-₹{discountAmount.toFixed(2)}</span>
                    </div>
                  )}

                  {/* Grand Total */}
                  <div className="pt-3.5 flex justify-between items-center text-base font-black border-t border-zinc-200 text-zinc-900 uppercase tracking-tight print-receipt-bold">
                    <span>Total Amount</span>
                    <span className="text-xl text-primary font-black">₹{grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Footer Section */}
                <div className="pt-4 text-center space-y-3">
                  {/* Status Badge */}
                  <div className="flex justify-center">
                    <Badge className={`font-black text-[10px] uppercase tracking-wider px-3.5 py-0.5 rounded-full border shadow-sm ${getPaymentStatusBadgeStyle()}`}>
                      {getPaymentStatusLabel()}
                    </Badge>
                  </div>

                  <div className="text-zinc-400 font-black text-[10px] uppercase tracking-widest leading-relaxed mt-3 print-receipt-text">
                    <p>Thank You For Visiting</p>
                    <p className="mt-0.5">Visit Again</p>
                  </div>
                  
                  {/* Review Link QR Placeholder */}
                  <div className="flex flex-col items-center gap-1.5 pt-3 border-t border-dashed border-zinc-200 mt-3 text-[9px] text-zinc-400 no-print">
                    <div className="w-14 h-14 bg-zinc-50 rounded-xl flex items-center justify-center border border-zinc-200">
                      <div className="grid grid-cols-4 gap-1 p-2.5 w-full h-full opacity-40">
                        <div className="bg-zinc-800 rounded-sm"></div>
                        <div className="bg-zinc-800 rounded-sm col-span-2"></div>
                        <div className="bg-zinc-800 rounded-sm"></div>
                        <div className="bg-zinc-800 rounded-sm col-span-3"></div>
                        <div className="bg-zinc-800 rounded-sm"></div>
                        <div className="bg-zinc-800 rounded-sm col-span-2"></div>
                        <div className="bg-zinc-800 rounded-sm"></div>
                      </div>
                    </div>
                    <span>Scan to review on Google</span>
                  </div>
                </div>
              </div>

              {/* Cashier Payment Selection (Only show if checkout is not finalized) */}
              {!isOrderAlreadyPaid && !isOrderCancelled && !paymentSuccess && (
                <div className="space-y-3 no-print max-w-md mx-auto">
                  <Label className="text-base font-black text-foreground">Select Payment Mode</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      variant={paymentMethod === 'cash' ? 'default' : 'outline'} 
                      className={`h-14 rounded-2xl flex gap-2 font-bold text-base transition-all active:scale-[0.98] ${
                        paymentMethod === 'cash' ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md' : 'border-zinc-200'
                      }`}
                      onClick={() => setPaymentMethod('cash')}
                    >
                      <Banknote className="w-5 h-5 shrink-0" /> Cash
                    </Button>
                    <Button 
                      variant={paymentMethod === 'card' ? 'default' : 'outline'} 
                      className={`h-14 rounded-2xl flex gap-2 font-bold text-base transition-all active:scale-[0.98] ${
                        paymentMethod === 'card' ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md' : 'border-zinc-200'
                      }`}
                      onClick={() => setPaymentMethod('card')}
                    >
                      <CreditCard className="w-5 h-5 shrink-0" /> Card
                    </Button>
                    <Button 
                      variant={paymentMethod === 'upi' ? 'default' : 'outline'} 
                      className={`h-14 rounded-2xl flex gap-2 font-bold text-base transition-all active:scale-[0.98] ${
                        paymentMethod === 'upi' ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md' : 'border-zinc-200'
                      }`}
                      onClick={() => setPaymentMethod('upi')}
                    >
                      <Smartphone className="w-5 h-5 shrink-0" /> UPI
                    </Button>
                    <Button 
                      variant={paymentMethod === 'split' ? 'default' : 'outline'} 
                      className={`h-14 rounded-2xl flex gap-2 font-bold text-base transition-all active:scale-[0.98] ${
                        paymentMethod === 'split' ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md' : 'border-zinc-200'
                      }`}
                      onClick={() => setPaymentMethod('split')}
                    >
                      <SplitSquareHorizontal className="w-5 h-5 shrink-0" /> Split
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {/* Footer Actions */}
        <DrawerFooter className="px-0 pt-4 border-t flex-col sm:flex-row gap-3 no-print max-w-md mx-auto w-full">
          {!paymentSuccess && !isOrderAlreadyPaid && !isOrderCancelled ? (
            <>
              <Button 
                className="flex-[2] h-14 rounded-2xl bg-green-600 hover:bg-green-700 text-lg font-black shadow-md transition-all active:scale-[0.98]"
                onClick={handleCompletePayment}
                disabled={isProcessing}
              >
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                Complete Payment
              </Button>
              <Button variant="outline" className="flex-1 h-14 rounded-2xl font-bold border-zinc-200" onClick={handlePrint}>
                <Printer className="w-5 h-5 mr-2 shrink-0" /> Print
              </Button>
            </>
          ) : (
            <div className="flex w-full gap-3">
              <Button className="flex-1 h-14 rounded-2xl font-bold border-zinc-200" variant="outline" onClick={handlePrint}>
                <Printer className="w-5 h-5 mr-2 shrink-0" /> Print Receipt
              </Button>
              
              {/* Only show Refund button if payment was completed and not cancelled already */}
              {isOrderAlreadyPaid && !isOrderCancelled && (
                <Button 
                  className="flex-1 h-14 rounded-2xl font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md transition-all active:scale-[0.98]"
                  onClick={handleRefund}
                  disabled={isProcessing}
                >
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <RefreshCcw className="w-4 h-4 mr-2 shrink-0" />}
                  Refund Order
                </Button>
              )}
            </div>
          )}
          
          <DrawerClose asChild>
            <Button variant="ghost" className="h-12 rounded-2xl font-semibold no-print">
              Close
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
