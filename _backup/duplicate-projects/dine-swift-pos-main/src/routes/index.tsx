import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { User, Phone, Hash, ArrowRight, ChefHat } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { useOrder } from "@/store/order-store";
import { tableApi } from "@/api/pos-api";
import type { PosTable } from "@/types/pos";

export const Route = createFileRoute("/")({ component: CustomerScreen });

function FloatingInput({
  label,
  value,
  onChange,
  type = "text",
  icon: Icon,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  icon: React.ComponentType<{ className?: string }>;
  inputMode?: "numeric" | "tel" | "text";
}) {
  const [focus, setFocus] = useState(false);
  const float = focus || value.length > 0;
  return (
    <div className="relative">
      <div
        className={`flex items-center gap-3 px-4 pt-6 pb-2 rounded-2xl border-2 transition-all bg-surface ${
          focus ? "border-primary shadow-glow" : "border-border"
        }`}
      >
        <Icon
          className={`size-5 transition-colors ${focus ? "text-primary" : "text-muted-foreground"}`}
        />
        <div className="flex-1 relative">
          <label
            className={`absolute left-0 pointer-events-none transition-all font-medium ${
              float ? "-top-4 text-xs text-primary" : "top-0 text-base text-muted-foreground"
            }`}
          >
            {label}
          </label>
          <input
            type={type}
            inputMode={inputMode}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
            className="w-full bg-transparent outline-none text-base font-semibold text-foreground"
          />
        </div>
      </div>
    </div>
  );
}

function CustomerScreen() {
  const navigate = useNavigate();
  const { customer, setCustomer } = useOrder();
  const [name, setName] = useState(customer.name);
  const [mobile, setMobile] = useState(customer.mobile);
  const [table, setTable] = useState(customer.table);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(customer.tableId ?? null);
  const [time, setTime] = useState("");

  const tablesQuery = useQuery({
    queryKey: ["tables", "active"],
    queryFn: () => tableApi.getTables(),
    staleTime: 30_000,
    retry: 1,
  });

  const tableChips = (
    tablesQuery.data?.length
      ? tablesQuery.data
          .filter((t) => t.status === "AVAILABLE" || t.status === "OCCUPIED")
          .slice(0, 8)
      : []
  ) as PosTable[];

  useEffect(() => {
    const t = () =>
      setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    t();
    const id = setInterval(t, 30000);
    return () => clearInterval(id);
  }, []);

  const valid = name.trim().length > 1 && mobile.length >= 10 && table.length > 0;

  const submit = () => {
    if (!valid) return;

    setCustomer({ name, mobile, table, tableId: selectedTableId });
    navigate({ to: "/menu" });
  };

  const chooseTable = (tableNumber: string, tableId: string | null) => {
    setTable(tableNumber);
    setSelectedTableId(tableId);
  };

  return (
    <MobileShell>
      <div className="flex-1 overflow-y-auto no-scrollbar px-6 pt-10 pb-32">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-2.5">
            <div className="size-11 rounded-2xl bg-gradient-primary grid place-items-center shadow-glow">
              <ChefHat className="size-5 text-primary-foreground" />
            </div>
            <div>
              <div className="font-extrabold text-lg leading-tight">Servo</div>
              <div className="text-[11px] text-muted-foreground font-medium">Restaurant POS</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Now</div>
              <div className="text-sm font-bold">{time}</div>
            </div>
            <div className="size-10 rounded-full bg-accent grid place-items-center font-bold text-accent-foreground border border-border">
              R
            </div>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight">New Order</h1>
          <p className="text-muted-foreground text-sm mt-1">Add customer details to get started</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="rounded-3xl bg-card shadow-card p-5 space-y-5 border border-border/60"
        >
          <FloatingInput label="Customer Name" value={name} onChange={setName} icon={User} />
          <FloatingInput
            label="Mobile Number"
            value={mobile}
            onChange={(v) => setMobile(v.replace(/\D/g, "").slice(0, 10))}
            icon={Phone}
            type="tel"
            inputMode="tel"
          />
          <FloatingInput
            label="Table Number"
            value={table}
            onChange={(v) => {
              setTable(v.replace(/\D/g, "").slice(0, 3));
              setSelectedTableId(null);
            }}
            icon={Hash}
            inputMode="numeric"
          />
        </motion.div>

        <div className="grid grid-cols-4 gap-2 mt-5">
          {(tableChips.length
            ? tableChips.map((t) => ({ id: t.id, tableNumber: t.tableNumber }))
            : [
                { id: null, tableNumber: "01" },
                { id: null, tableNumber: "02" },
                { id: null, tableNumber: "05" },
                { id: null, tableNumber: "08" },
              ]
          ).map((t) => (
            <button
              key={`${t.id ?? "static"}-${t.tableNumber}`}
              onClick={() => chooseTable(String(t.tableNumber), t.id)}
              className={`py-3 rounded-2xl text-sm font-bold border-2 transition-all tap-highlight-none ${
                table === String(t.tableNumber)
                  ? "bg-primary text-primary-foreground border-primary shadow-glow"
                  : "bg-surface border-border text-foreground"
              }`}
            >
              T{t.tableNumber}
            </button>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-5 glass border-t border-border/60">
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={submit}
          disabled={!valid}
          className={`w-full h-14 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all tap-highlight-none ${
            valid
              ? "bg-gradient-primary text-primary-foreground shadow-glow"
              : "bg-muted text-muted-foreground"
          }`}
        >
          Continue to Menu
          <ArrowRight className="size-5" />
        </motion.button>
      </div>
    </MobileShell>
  );
}
