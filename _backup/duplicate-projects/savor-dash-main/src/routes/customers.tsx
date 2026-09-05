import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, Search, Phone, Mail, Star } from "lucide-react";

export const Route = createFileRoute("/customers")({ component: Customers });

const customers = [
  { name: "Arjun Kapoor", phone: "+91 98000 12345", email: "arjun@mail.com", visits: 24, spent: 38400, last: "Today", tier: "Gold" },
  { name: "Meera Iyer", phone: "+91 98000 67890", email: "meera@mail.com", visits: 18, spent: 27600, last: "Yesterday", tier: "Silver" },
  { name: "Rahul Verma", phone: "+91 98000 22334", email: "rahul@mail.com", visits: 41, spent: 72100, last: "2d ago", tier: "Platinum" },
  { name: "Sonia Joshi", phone: "+91 98000 55667", email: "sonia@mail.com", visits: 7, spent: 9800, last: "1w ago", tier: "Silver" },
  { name: "Dev Khanna", phone: "+91 98000 99887", email: "dev@mail.com", visits: 12, spent: 15400, last: "3d ago", tier: "Silver" },
];

const tierCls: Record<string, string> = {
  Platinum: "bg-info/15 text-info border-info/30",
  Gold: "bg-warning/15 text-warning border-warning/30",
  Silver: "bg-muted text-muted-foreground border-border",
};

function Customers() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Customers"
        subtitle="312 total · 184 repeat · 58 new this month"
        actions={<Button variant="premium" size="sm"><Plus /> Add Customer</Button>}
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input placeholder="Search customers..." className="w-full h-10 rounded-xl bg-card/60 border border-border pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
      </div>

      <div className="glass rounded-2xl overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground bg-card/60">
              <tr>
                <th className="text-left font-medium px-5 py-3">Customer</th>
                <th className="text-left font-medium px-5 py-3 hidden md:table-cell">Contact</th>
                <th className="text-center font-medium px-5 py-3">Visits</th>
                <th className="text-right font-medium px-5 py-3">Lifetime</th>
                <th className="text-center font-medium px-5 py-3 hidden sm:table-cell">Tier</th>
                <th className="text-right font-medium px-5 py-3 hidden md:table-cell">Last Visit</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c, i) => (
                <tr key={i} className="border-t border-border hover:bg-card/40 transition">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl gradient-primary grid place-items-center text-primary-foreground font-semibold">
                        {c.name[0]}
                      </div>
                      <div>
                        <div className="font-medium">{c.name}</div>
                        <div className="text-[11px] text-muted-foreground md:hidden">{c.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <div className="flex items-center gap-1.5 text-xs"><Phone className="size-3 text-muted-foreground" />{c.phone}</div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Mail className="size-3" />{c.email}</div>
                  </td>
                  <td className="px-5 py-4 text-center font-medium">{c.visits}</td>
                  <td className="px-5 py-4 text-right font-semibold tabular-nums">₹{c.spent.toLocaleString()}</td>
                  <td className="px-5 py-4 text-center hidden sm:table-cell">
                    <span className={`inline-flex items-center gap-1 text-[10px] uppercase font-medium border px-2 py-0.5 rounded-full ${tierCls[c.tier]}`}>
                      <Star className="size-2.5" />{c.tier}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right text-muted-foreground hidden md:table-cell">{c.last}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
