import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Users, Clock, IndianRupee, ArrowLeftRight, Plus } from "lucide-react";

export const Route = createFileRoute("/tables")({ component: TablesPage });

type Status = "available" | "occupied" | "reserved" | "cleaning";
const tables: Array<{ id: number; seats: number; status: Status; guests?: number; amount?: number; waiter?: string; duration?: string }> = [
  { id: 1, seats: 2, status: "occupied", guests: 2, amount: 980, waiter: "Asha", duration: "32m" },
  { id: 2, seats: 4, status: "available", guests: 0 },
  { id: 3, seats: 4, status: "reserved" },
  { id: 4, seats: 6, status: "occupied", guests: 5, amount: 3240, waiter: "Vikram", duration: "1h 12m" },
  { id: 5, seats: 2, status: "cleaning" },
  { id: 6, seats: 4, status: "occupied", guests: 3, amount: 1620, waiter: "Asha", duration: "18m" },
  { id: 7, seats: 8, status: "occupied", guests: 7, amount: 5420, waiter: "Neha", duration: "45m" },
  { id: 8, seats: 2, status: "available" },
  { id: 9, seats: 4, status: "available" },
  { id: 10, seats: 4, status: "occupied", guests: 4, amount: 2180, waiter: "Vikram", duration: "22m" },
  { id: 11, seats: 6, status: "reserved" },
  { id: 12, seats: 2, status: "occupied", guests: 2, amount: 760, waiter: "Neha", duration: "8m" },
];

const statusMap: Record<Status, { label: string; cls: string; dot: string }> = {
  available: { label: "Available", cls: "border-success/40 bg-success/10", dot: "bg-success" },
  occupied: { label: "Occupied", cls: "border-destructive/40 bg-destructive/10", dot: "bg-destructive" },
  reserved: { label: "Reserved", cls: "border-warning/40 bg-warning/10", dot: "bg-warning" },
  cleaning: { label: "Cleaning", cls: "border-muted-foreground/30 bg-muted/40", dot: "bg-muted-foreground" },
};

function TablesPage() {
  const counts = tables.reduce((a, t) => ({ ...a, [t.status]: (a[t.status] ?? 0) + 1 }), {} as Record<Status, number>);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tables"
        subtitle="Floor plan · live status of every table"
        actions={
          <>
            <Button variant="outline" size="sm"><ArrowLeftRight /> Transfer</Button>
            <Button variant="premium" size="sm"><Plus /> Add Table</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(Object.keys(statusMap) as Status[]).map((s) => (
          <div key={s} className="glass rounded-2xl p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className={cn("size-2 rounded-full", statusMap[s].dot)} />
              {statusMap[s].label}
            </div>
            <div className="text-2xl font-semibold mt-1">{counts[s] ?? 0}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3 md:gap-4">
        {tables.map((t) => {
          const meta = statusMap[t.status];
          return (
            <button
              key={t.id}
              className={cn(
                "group text-left rounded-2xl border p-4 transition-all hover-lift relative overflow-hidden",
                meta.cls,
              )}
            >
              {t.status === "occupied" && (
                <span className="absolute top-3 right-3 size-2 rounded-full bg-destructive pulse-ring" />
              )}
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Table</div>
                <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-md", meta.cls)}>
                  {meta.label}
                </span>
              </div>
              <div className="text-3xl font-bold mt-1">{t.id.toString().padStart(2, "0")}</div>
              <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="size-3" /> {t.guests ?? 0}/{t.seats}
              </div>
              {t.status === "occupied" && (
                <div className="mt-3 pt-3 border-t border-border/60 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground inline-flex items-center gap-1"><Clock className="size-3" /> {t.duration}</span>
                    <span className="font-semibold inline-flex items-center"><IndianRupee className="size-3" />{t.amount}</span>
                  </div>
                  <div className="text-muted-foreground">Waiter: <span className="text-foreground">{t.waiter}</span></div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
