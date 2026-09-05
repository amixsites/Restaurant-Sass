import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Building2, Printer, Bell, CreditCard, Shield, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

const sections = [
  { id: "restaurant", label: "Restaurant", icon: Building2 },
  { id: "billing", label: "Billing & Tax", icon: CreditCard },
  { id: "printers", label: "Printers & KOT", icon: Printer },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
  { id: "locale", label: "Locale", icon: Globe },
];

function SettingsPage() {
  const [active, setActive] = useState("restaurant");
  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        subtitle="Configure your restaurant & POS preferences"
        actions={<Button variant="premium" size="sm">Save Changes</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-5">
        <nav className="glass rounded-2xl p-2 h-fit">
          {sections.map(s => (
            <button key={s.id} onClick={() => setActive(s.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition",
                active === s.id
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent",
              )}>
              <s.icon className="size-4" />
              {s.label}
            </button>
          ))}
        </nav>

        <div className="glass rounded-2xl p-6 space-y-5">
          <Row label="Restaurant Name" defaultValue="Spice Symphony" />
          <Row label="Address" defaultValue="42, Linking Road, Mumbai 400050" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Row label="GST Number" defaultValue="27AABCS1429R1Z2" />
            <Row label="Currency" defaultValue="₹ INR" />
            <Row label="GST Rate" defaultValue="5%" />
            <Row label="Service Charge" defaultValue="0%" />
          </div>
          <div className="pt-4 border-t border-border">
            <h3 className="font-semibold mb-3">Operations</h3>
            <div className="space-y-3">
              {["Auto-send KOT to kitchen", "Print bill on settlement", "SMS receipts to customers", "Round off totals"].map((l, i) => (
                <label key={l} className="flex items-center justify-between p-3 rounded-xl bg-card/60 border border-border cursor-pointer">
                  <span className="text-sm">{l}</span>
                  <Toggle on={i !== 2} />
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, defaultValue }: { label: string; defaultValue: string }) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input defaultValue={defaultValue}
        className="mt-1.5 w-full h-10 rounded-xl bg-background border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
    </label>
  );
}

function Toggle({ on }: { on: boolean }) {
  const [v, setV] = useState(on);
  return (
    <button onClick={() => setV(!v)} className={cn("relative inline-flex h-6 w-11 rounded-full transition", v ? "bg-success" : "bg-muted")}>
      <span className={cn("absolute top-0.5 size-5 rounded-full bg-white transition-transform", v ? "translate-x-5" : "translate-x-0.5")} />
    </button>
  );
}
