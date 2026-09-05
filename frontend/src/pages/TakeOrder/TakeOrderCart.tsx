import { useTakeOrderCart } from '@/store/useTakeOrderCart';
import { useTakeOrder } from '@/hooks/api/useTakeOrder';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Minus, Plus, Trash2, Send, X, FileText, ShoppingBag, Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';

interface TakeOrderCartProps {
  mode?: 'panel' | 'drawer';
  onRequestClose?: () => void;
  onOrderSuccess?: () => void;
}

export const TakeOrderCart = ({ mode = 'panel', onRequestClose, onOrderSuccess }: TakeOrderCartProps) => {
  const {
    items,
    customerPhone,
    customerName,
    setCustomerDetails,
    selectedTableId,
    removeItem,
    updateQuantity,
    getCartTotal,
    clearCart,
    updateNotes,
  } = useTakeOrderCart();

  const { mutateAsync: submitOrder, isPending } = useTakeOrder();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [tempNote, setTempNote] = useState('');

  const subtotal = getCartTotal();
  const totalItemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const handleSendToKitchen = async () => {
    if (!selectedTableId) {
      toast({
        title: 'Table Required',
        description: 'Please select a table before sending the order.',
        variant: 'destructive',
      });
      return;
    }

    if (items.length === 0) {
      toast({
        title: 'Empty Cart',
        description: 'Please add food items to the cart.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await submitOrder({
        tableId: selectedTableId,
        items,
        customerPhone,
        customerName,
      });

      onOrderSuccess?.();
      onRequestClose?.();

      toast({
        title: 'Order Sent To Kitchen',
        description: 'Order has been placed successfully.',
        className: 'bg-emerald-50 border-emerald-200 text-emerald-900 font-semibold',
      });

      if (location.pathname.startsWith('/waiter')) {
        navigate('/waiter');
      } else if (location.pathname.startsWith('/admin')) {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Could not submit order to kitchen.';
      toast({
        title: 'Order Placement Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const openNoteDialog = (id: string, currentNote: string) => {
    setEditingNoteId(id);
    setTempNote(currentNote || '');
  };

  const saveNote = () => {
    if (!editingNoteId) {
      return;
    }

    updateNotes(editingNoteId, tempNote);
    setEditingNoteId(null);
  };

  return (
    <div className="relative flex h-full flex-col bg-white">
      <div className="border-b border-slate-200 bg-gradient-to-r from-orange-50 via-white to-amber-50 px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white p-2.5 shadow-sm ring-1 ring-slate-200">
              <ShoppingBag className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-900">Live Cart</h2>
              <p className="text-xs text-slate-500">{totalItemCount} items currently in this order</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-bold text-white">
              Subtotal Rs {subtotal.toFixed(2)}
            </Badge>
            {mode === 'drawer' && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-11 w-11 rounded-xl"
                onClick={onRequestClose}
              >
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>

        <div className="mt-4">
          <Input
            placeholder="Customer Phone (optional)"
            type="tel"
            value={customerPhone}
            onChange={(e) => setCustomerDetails(e.target.value, customerName)}
            className="h-11 rounded-xl border-slate-200 bg-white text-sm"
            style={{ minHeight: 44 }}
          />
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/45 p-4 pb-32">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <div className="mb-4 rounded-2xl bg-orange-50 p-4 text-orange-500">
              <ShoppingBag className="h-8 w-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Your cart is empty</h3>
            <p className="mt-1 max-w-[220px] text-xs text-slate-500">
              Add dishes from the menu to build and send this order.
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {items.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <h4 className="line-clamp-2 text-sm font-bold leading-snug text-slate-900">{item.name}</h4>
                  <p className="shrink-0 text-sm font-black text-slate-900">Rs {(item.quantity * item.price).toFixed(2)}</p>
                </div>

                {item.notes && (
                  <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium text-amber-800">
                    Note: {item.notes}
                  </p>
                )}

                <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2.5 text-[11px] text-slate-600">
                  <div>
                    <p className="font-medium">Qty</p>
                    <p className="text-sm font-black text-slate-900">{item.quantity}</p>
                  </div>
                  <div>
                    <p className="font-medium">Unit</p>
                    <p className="text-sm font-black text-slate-900">Rs {item.price.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="font-medium">Total</p>
                    <p className="text-sm font-black text-slate-900">Rs {(item.quantity * item.price).toFixed(2)}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 rounded-xl"
                      onClick={() => updateQuantity(item.id, -1)}
                      style={{ minHeight: 44, minWidth: 44 }}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center text-base font-black text-slate-900">{item.quantity}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 rounded-xl"
                      onClick={() => updateQuantity(item.id, 1)}
                      style={{ minHeight: 44, minWidth: 44 }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-11 w-11 rounded-xl border-slate-200"
                      onClick={() => openNoteDialog(item.id, item.notes)}
                      style={{ minHeight: 44, minWidth: 44 }}
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-11 w-11 rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50"
                      onClick={() => removeItem(item.id)}
                      style={{ minHeight: 44, minWidth: 44 }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 p-4 backdrop-blur-sm">
        <div className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-600">Subtotal</span>
            <span className="text-lg font-black text-slate-900">Rs {subtotal.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-2xl border-slate-300"
            onClick={clearCart}
            disabled={items.length === 0 || isPending}
            style={{ minHeight: 44, minWidth: 44 }}
          >
            <X className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            className="h-12 flex-1 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-base font-black text-white shadow-lg transition-all hover:opacity-95"
            style={{ minHeight: 48 }}
            onClick={handleSendToKitchen}
            disabled={isPending || items.length === 0}
          >
            {isPending ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-5 w-5" />
            )}
            Send To Kitchen
            {!isPending && <Send className="ml-2 h-4.5 w-4.5" />}
          </Button>
        </div>
      </div>

      <Dialog open={!!editingNoteId} onOpenChange={(open) => !open && setEditingNoteId(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl border bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Add Cooking Instructions</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              value={tempNote}
              onChange={(e) => setTempNote(e.target.value)}
              placeholder="Example: less spicy, no onion, extra cheese"
              className="min-h-[100px] resize-none rounded-xl border-slate-200"
            />
          </div>
          <DialogFooter className="flex-row gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-xl sm:flex-none"
              onClick={() => setEditingNoteId(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={saveNote}
              className="flex-1 rounded-xl bg-slate-900 text-white hover:bg-slate-800 sm:flex-none"
            >
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
