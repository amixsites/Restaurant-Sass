import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { ArrowLeft, Minus, Plus, Trash2, Check, ChefHat, Receipt } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { useOrder } from "@/store/order-store";
import { orderApi } from "@/api/pos-api";

export const Route = createFileRoute("/cart")({ component: CartScreen });

function CartScreen() {
  const navigate = useNavigate();
  const { customer, cart, setQty, remove, reset } = useOrder();
  const [showTax, setShowTax] = useState(true);
  const [success, setSuccess] = useState(false);

  const subtotal = cart.reduce((s, i) => s + i.qty * i.price, 0);
  const tax = showTax ? Math.round(subtotal * 0.05) : 0;
  const total = subtotal + tax;

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!customer.tableId && !customer.table) {
        throw new Error("Please select a table before placing the order.");
      }

      return orderApi.create({
        tableId: customer.tableId || customer.table,
        customerName: customer.name,
        customerPhone: customer.mobile,
        items: cart.map((item) => ({
          menuItemId: item.id,
          quantity: item.qty,
          unitPrice: item.price,
          notes: item.notes,
        })),
      });
    },
    onSuccess: () => {
      setSuccess(true);
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.5 },
        colors: ["#f59e0b", "#fbbf24", "#10b981", "#fff"],
      });
      toast.success("Order sent to kitchen successfully");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Could not send order to kitchen.";
      toast.error(message);
    },
  });

  if (cart.length === 0 && !success) {
    return (
      <MobileShell>
        <div className="px-5 pt-6 pb-3 flex items-center gap-3">
          <button
            onClick={() => navigate({ to: "/menu" })}
            className="size-10 rounded-full bg-secondary grid place-items-center"
          >
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="font-bold text-lg">Cart</h1>
        </div>
        <div className="flex-1 grid place-items-center p-8 text-center">
          <div>
            <div className="size-20 rounded-full bg-secondary grid place-items-center mx-auto mb-4">
              <Receipt className="size-8 text-muted-foreground" />
            </div>
            <p className="font-bold mb-1">Your cart is empty</p>
            <p className="text-sm text-muted-foreground mb-5">
              Add some delicious dishes from the menu
            </p>
            <Link
              to="/menu"
              className="inline-flex px-6 h-12 items-center rounded-2xl bg-gradient-primary text-primary-foreground font-bold shadow-glow"
            >
              Browse Menu
            </Link>
          </div>
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <div className="px-5 pt-6 pb-4 flex items-center justify-between">
        <button
          onClick={() => navigate({ to: "/menu" })}
          className="size-10 rounded-full bg-secondary grid place-items-center tap-highlight-none"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="text-center">
          <div className="text-[11px] text-muted-foreground font-medium">
            Table {customer.table}
          </div>
          <div className="font-bold text-sm">Review Order</div>
        </div>
        <div className="size-10" />
      </div>

      <div className="px-5 mb-3">
        <div className="rounded-2xl bg-gradient-primary text-primary-foreground p-4 shadow-glow flex items-center justify-between">
          <div>
            <div className="text-[11px] opacity-90 font-medium">Customer</div>
            <div className="font-extrabold text-base">{customer.name}</div>
            <div className="text-xs opacity-90 mt-0.5">+91 {customer.mobile}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] opacity-90 font-medium">Table</div>
            <div className="font-extrabold text-2xl">{customer.table}</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-44 space-y-2.5">
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-2 mb-1">
          Items ({cart.length})
        </div>
        <AnimatePresence>
          {cart.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className="bg-card rounded-2xl p-3 border border-border/60 shadow-card flex gap-3 items-center"
            >
              <img
                src={item.image || ""}
                alt={item.name}
                width={512}
                height={512}
                loading="lazy"
                className="size-14 rounded-xl object-cover"
              />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate">{item.name}</div>
                <div className="text-xs text-muted-foreground">Rs {item.price} each</div>
                <div className="flex items-center gap-2 mt-1.5">
                  <button
                    onClick={() => setQty(item.id, item.qty - 1)}
                    className="size-7 rounded-full bg-secondary grid place-items-center tap-highlight-none"
                  >
                    <Minus className="size-3" strokeWidth={3} />
                  </button>
                  <AnimatePresence mode="popLayout">
                    <motion.span
                      key={item.qty}
                      initial={{ y: -8, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 8, opacity: 0 }}
                      className="font-extrabold text-sm w-5 text-center"
                    >
                      {item.qty}
                    </motion.span>
                  </AnimatePresence>
                  <button
                    onClick={() => setQty(item.id, item.qty + 1)}
                    className="size-7 rounded-full bg-primary text-primary-foreground grid place-items-center tap-highlight-none"
                  >
                    <Plus className="size-3" strokeWidth={3} />
                  </button>
                </div>
              </div>
              <div className="flex flex-col items-end justify-between h-full self-stretch">
                <button
                  onClick={() => remove(item.id)}
                  className="size-7 rounded-full grid place-items-center text-destructive tap-highlight-none"
                >
                  <Trash2 className="size-3.5" />
                </button>
                <div className="font-extrabold text-sm">Rs {item.qty * item.price}</div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        <div className="bg-card rounded-2xl p-4 border border-border/60 shadow-card mt-4 space-y-2.5">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
            Bill Summary
          </div>
          <Row
            label={`Subtotal (${cart.reduce((s, i) => s + i.qty, 0)} items)`}
            value={`Rs ${subtotal}`}
          />
          <div className="flex items-center justify-between text-sm">
            <button
              onClick={() => setShowTax((v) => !v)}
              className="flex items-center gap-2 text-muted-foreground"
            >
              <span
                className={`size-4 rounded border-2 grid place-items-center transition-colors ${
                  showTax ? "bg-primary border-primary" : "border-border"
                }`}
              >
                {showTax && <Check className="size-3 text-primary-foreground" strokeWidth={4} />}
              </span>
              Tax (5%)
            </button>
            <span className="font-bold">Rs {tax}</span>
          </div>
          <div className="border-t border-dashed border-border pt-2.5 flex items-center justify-between">
            <span className="font-extrabold">Grand Total</span>
            <span className="font-extrabold text-xl text-primary">Rs {total}</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-5 glass border-t border-border/60">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => createOrderMutation.mutate()}
          disabled={createOrderMutation.isPending}
          className="w-full h-14 rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow font-extrabold text-base flex items-center justify-center gap-3 tap-highlight-none"
        >
          {createOrderMutation.isPending ? (
            <>
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                className="size-5 border-2 border-primary-foreground border-t-transparent rounded-full"
              />
              Sending to Kitchen...
            </>
          ) : (
            <>Place Order � Rs {total}</>
          )}
        </motion.button>
      </div>

      <AnimatePresence>
        {success && (
          <SuccessModal
            onNew={() => {
              reset();
              navigate({ to: "/" });
            }}
            onView={() => {
              setSuccess(false);
              navigate({ to: "/menu" });
            }}
          />
        )}
      </AnimatePresence>
    </MobileShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

function SuccessModal({ onNew, onView }: { onNew: () => void; onView: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-6"
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        className="bg-card rounded-3xl w-full max-w-sm p-7 text-center shadow-elevated border border-border/60"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.1 }}
          className="size-24 rounded-full bg-gradient-success mx-auto grid place-items-center shadow-glow mb-2 relative"
        >
          <motion.div
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Check className="size-12 text-success-foreground" strokeWidth={3.5} />
          </motion.div>
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.5, type: "spring" }}
            className="absolute -bottom-1 -right-1 size-10 rounded-full bg-card border-2 border-card grid place-items-center shadow-md"
          >
            <ChefHat className="size-5 text-primary" />
          </motion.div>
        </motion.div>
        <h2 className="text-xl font-extrabold mt-4">Order Sent to Kitchen!</h2>
        <p className="text-sm text-muted-foreground mt-1.5">
          Kitchen staff has received the order and started preparing it.
        </p>

        <div className="grid grid-cols-2 gap-2.5 mt-6">
          <button
            onClick={onView}
            className="h-12 rounded-2xl bg-secondary font-bold text-sm tap-highlight-none"
          >
            View Orders
          </button>
          <button
            onClick={onNew}
            className="h-12 rounded-2xl bg-gradient-primary text-primary-foreground font-bold text-sm shadow-glow tap-highlight-none"
          >
            New Order
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
