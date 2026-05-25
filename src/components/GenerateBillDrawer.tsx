import { useState, useMemo } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose, DrawerDescription } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Receipt, CreditCard, Banknote, Smartphone, SplitSquareHorizontal } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { useTenantStore } from '@/store/tenantStore';

interface GenerateBillDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  order: any; // Using any for the order structure
  onComplete?: () => void;
}

export const GenerateBillDrawer = ({ isOpen, onOpenChange, order, onComplete }: GenerateBillDrawerProps) => {
  const [taxPercent, setTaxPercent] = useState<number>(5);
  const [paymentMethod, setPaymentMethod] = useState<string>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  
  const { restaurantId } = useAuthStore();
  const { restaurantName } = useTenantStore();
  const queryClient = useQueryClient();

  const subtotal = order?.total_amount || 0;
  
  const taxAmount = useMemo(() => {
    return (subtotal * taxPercent) / 100;
  }, [subtotal, taxPercent]);

  const grandTotal = subtotal + taxAmount;

  const handleCompletePayment = async () => {
    if (!order || !restaurantId) return;
    setIsProcessing(true);
    
    try {
      // 1. Create Invoice
      const invoiceNumber = `INV-${new Date().getFullYear()}${(new Date().getMonth()+1).toString().padStart(2, '0')}-${Math.floor(Math.random() * 10000)}`;
      const { error: invoiceError } = await supabase.from('invoices').insert([{
        restaurant_id: restaurantId,
        order_id: order.id,
        invoice_number: invoiceNumber,
        subtotal: subtotal,
        tax_amount: taxAmount,
        total_amount: grandTotal,
        payment_method: paymentMethod,
        payment_status: 'completed'
      }]);
      
      if (invoiceError) throw invoiceError;

      // 2. Update Order Status
      const { error: orderError } = await supabase.from('orders')
        .update({ status: 'COMPLETED' })
        .eq('id', order.id);
        
      if (orderError) throw orderError;

      // 3. Update Table Status to empty
      if (order.table_id) {
        const { error: tableError } = await supabase.from('tables')
          .update({ status: 'empty', current_order_id: null })
          .eq('id', order.table_id);
          
        if (tableError) throw tableError;
      }

      await queryClient.invalidateQueries({ queryKey: ['orders', restaurantId] });
      await queryClient.invalidateQueries({ queryKey: ['tables', restaurantId] });
      
      setPaymentSuccess(true);
      if (onComplete) onComplete();
      
    } catch (err) {
      console.error("Error processing payment:", err);
      alert("Failed to process payment");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = () => {
    // A quick hacky print using window.print for the specific element
    window.print();
  };

  if (!order) return null;

  return (
    <Drawer open={isOpen} onOpenChange={(open) => {
      if (!open && paymentSuccess) setPaymentSuccess(false);
      onOpenChange(open);
    }}>
      <DrawerContent className="px-4 flex flex-col rounded-t-[2rem] max-h-[90vh]">
        <DrawerHeader className="px-0 pb-4 border-b">
          <DrawerTitle className="text-2xl font-bold flex items-center justify-between">
            <span>Checkout</span>
            <Badge variant="outline" className="text-sm bg-muted/50">
              Table {order.tables?.table_number || 'N/A'}
            </Badge>
          </DrawerTitle>
          <DrawerDescription className="sr-only">
            Generate bill and process payment
          </DrawerDescription>
        </DrawerHeader>

        <ScrollArea className="flex-1 py-4">
          {paymentSuccess ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-4">
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2">
                <Receipt className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-center">Payment Successful!</h2>
              <p className="text-muted-foreground text-center">Order has been completed and table is cleared.</p>
              
              <div className="flex gap-3 mt-6 w-full max-w-xs">
                <Button className="flex-1" variant="outline" onClick={handlePrint}>Print Receipt</Button>
                <DrawerClose asChild>
                  <Button className="flex-1">Done</Button>
                </DrawerClose>
              </div>
            </div>
          ) : (
            <div className="space-y-6 print-section">
              {/* Receipt Preview */}
              <div className="bg-muted/30 border border-dashed rounded-xl p-5 space-y-4">
                <div className="text-center pb-4 border-b border-dashed">
                  <h3 className="font-bold text-lg">{restaurantName}</h3>
                  <p className="text-xs text-muted-foreground">Order #{order.id.substring(0, 8).toUpperCase()}</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">₹ {subtotal.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 py-2">
                    <Label className="text-sm text-muted-foreground whitespace-nowrap">Tax (%)</Label>
                    <Input 
                      type="number" 
                      value={taxPercent} 
                      onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)} 
                      className="h-8 w-20 text-right no-print"
                    />
                    <div className="flex-1 border-b border-dashed"></div>
                    <span className="font-medium text-sm">₹ {taxAmount.toFixed(2)}</span>
                  </div>
                </div>

                <div className="pt-3 border-t flex justify-between items-end">
                  <span className="font-bold text-muted-foreground">Grand Total</span>
                  <span className="text-3xl font-bold text-primary">₹ {grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-3 no-print">
                <Label className="text-base font-semibold">Payment Method</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant={paymentMethod === 'cash' ? 'default' : 'outline'} 
                    className="h-14 rounded-xl flex gap-2"
                    onClick={() => setPaymentMethod('cash')}
                  >
                    <Banknote className="w-5 h-5" /> Cash
                  </Button>
                  <Button 
                    variant={paymentMethod === 'card' ? 'default' : 'outline'} 
                    className="h-14 rounded-xl flex gap-2"
                    onClick={() => setPaymentMethod('card')}
                  >
                    <CreditCard className="w-5 h-5" /> Card
                  </Button>
                  <Button 
                    variant={paymentMethod === 'upi' ? 'default' : 'outline'} 
                    className="h-14 rounded-xl flex gap-2"
                    onClick={() => setPaymentMethod('upi')}
                  >
                    <Smartphone className="w-5 h-5" /> UPI
                  </Button>
                  <Button 
                    variant={paymentMethod === 'split' ? 'default' : 'outline'} 
                    className="h-14 rounded-xl flex gap-2"
                    onClick={() => setPaymentMethod('split')}
                  >
                    <SplitSquareHorizontal className="w-5 h-5" /> Split
                  </Button>
                </div>
              </div>
            </div>
          )}
        </ScrollArea>

        {!paymentSuccess && (
          <DrawerFooter className="px-0 pt-4 border-t flex-row gap-3">
            <Button 
              className="flex-[2] h-14 rounded-xl bg-green-600 hover:bg-green-700 text-lg font-bold"
              onClick={handleCompletePayment}
              disabled={isProcessing}
            >
              {isProcessing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              Collect ₹{grandTotal.toFixed(2)}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline" className="flex-1 h-14 rounded-xl">
                Cancel
              </Button>
            </DrawerClose>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
};
