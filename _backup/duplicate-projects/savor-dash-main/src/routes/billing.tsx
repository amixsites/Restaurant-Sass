import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { IndianRupee, Printer, Share2, CreditCard, Wallet, Banknote, Smartphone, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/billing")({ component: Billing });

const lineItems = [
  { name: "Butter Chicken", qty: 1, price: 380 },
  { name: "Butter Naan", qty: 4, price: 60 },
  { name: "Veg Biryani", qty: 1, price: 280 },
  { name: "Paneer Tikka", qty: 1, price: 280 },
  { name: "Masala Chai", qty: 3, price: 60 },
];

function Billing() {
  const [method, setMethod] = useState<"cash" | "upi" | "card" | "wallet">("upi");
  const [discount, setDiscount] = useState(5);
  const subtotal = lineItems.reduce((s, i) => s + i.qty * i.price, 0);
  const disc = Math.round((subtotal * discount) / 100);
  const taxable = subtotal - disc;
  const tax = Math.round(taxable * 0.05);
  const total = taxable + tax;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Billing"
        subtitle="Invoice #INV-2841 · Table T-07"
        actions={
          <>
            <Button variant="outline" size="sm"><Share2 /> Share</Button>
            <Button variant="outline" size="sm"><Printer /> Print</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5">
        <div className="glass rounded-2xl p-6 shadow-card">
          <div className="flex justify-between items-start pb-4 border-b border-border">
            <div>
              <div className="text-xs text-muted-foreground">Spice Symphony</div>
              <h2 className="text-2xl font-semibold">Invoice</h2>
              <div className="text-xs text-muted-foreground mt-1">INV-2841 · {new Date().toLocaleDateString()}</div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <div>Table <span className="text-foreground font-medium">T-07</span></div>
              <div>Waiter <span className="text-foreground font-medium">Asha</span></div>
              <div>Guests <span className="text-foreground font-medium">2</span></div>
            </div>
          </div>

          <table className="w-full mt-5 text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border">
                <th className="text-left font-medium pb-2">Item</th>
                <th className="text-center font-medium pb-2 w-16">Qty</th>
                <th className="text-right font-medium pb-2 w-24">Price</th>
                <th className="text-right font-medium pb-2 w-24">Total</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((i, idx) => (
                <tr key={idx} className="border-b border-border/50">
                  <td className="py-3">{i.name}</td>
                  <td className="text-center">{i.qty}</td>
                  <td className="text-right tabular-nums">₹{i.price}</td>
                  <td className="text-right tabular-nums font-medium">₹{i.qty * i.price}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-5 ml-auto max-w-xs space-y-2 text-sm">
            <Row label="Subtotal" value={subtotal} />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Discount</span>
              <div className="flex items-center gap-2">
                <input type="number" min={0} max={50} value={discount}
                  onChange={e => setDiscount(Number(e.target.value))}
                  className="w-14 h-7 text-right px-2 rounded-md bg-background border border-border text-xs" />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            </div>
            <Row label="Discount applied" value={-disc} />
            <Row label="GST (5%)" value={tax} />
            <div className="flex justify-between pt-2 border-t border-border text-lg font-semibold">
              <span>Total</span>
              <span className="inline-flex items-center"><IndianRupee className="size-4" />{total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start glass-strong rounded-2xl p-5 shadow-card">
          <h3 className="font-semibold mb-3">Payment</h3>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {([
              { k: "cash", label: "Cash", icon: Banknote },
              { k: "upi", label: "UPI", icon: Smartphone },
              { k: "card", label: "Card", icon: CreditCard },
              { k: "wallet", label: "Wallet", icon: Wallet },
            ] as const).map(p => (
              <button key={p.k} onClick={() => setMethod(p.k)}
                className={cn(
                  "rounded-xl p-3 border text-sm flex flex-col items-center gap-1 transition",
                  method === p.k
                    ? "border-primary bg-primary/10 text-primary shadow-glow"
                    : "border-border bg-card/50 text-muted-foreground hover:text-foreground"
                )}>
                <p.icon className="size-5" />
                {p.label}
              </button>
            ))}
          </div>

          <div className="rounded-xl bg-card/60 border border-border p-4 mb-4">
            <div className="text-xs text-muted-foreground">Amount Due</div>
            <div className="text-3xl font-bold tracking-tight inline-flex items-center"><IndianRupee className="size-6" />{total.toLocaleString()}</div>
          </div>

          <Button variant="premium" className="w-full h-12 text-base"
            onClick={() => toast.success("Payment Successful", { icon: <CheckCircle2 className="size-4" /> })}>
            Collect Payment
          </Button>
          <Button variant="outline" className="w-full mt-2 h-10">Split Bill</Button>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span className={cn("inline-flex items-center tabular-nums", value < 0 ? "text-success" : "text-foreground")}>
        {value < 0 ? "−" : ""}<IndianRupee className="size-3" />{Math.abs(value)}
      </span>
    </div>
  );
}
