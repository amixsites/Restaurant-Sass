import { Bell, Search, Menu as MenuIcon, ChevronDown, Sun, Moon, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useTheme } from "@/hooks/use-theme";
import { useTenantStore } from "@/store/tenantStore";
import { useAuthStore } from "@/store/authStore";
import { useImpersonationStore } from "@/store/impersonationStore";
import { supabase } from "@/lib/supabase";

export function TopBar({ onMobileMenu }: { onMobileMenu: () => void }) {
  const [now, setNow] = useState(() => new Date());
  const { theme, toggleTheme } = useTheme();
  const { restaurantName } = useTenantStore();
  const { user, role } = useAuthStore();
  const { isImpersonating, impersonatedRestaurantName } = useImpersonationStore();

  const signOut = async () => await supabase.auth.signOut();

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const fullName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Manager';
  const avatarLetter = fullName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-30 h-16 glass-strong border-b border-border flex items-center gap-3 px-4 md:px-6">
      <button
        onClick={onMobileMenu}
        className="md:hidden size-9 grid place-items-center rounded-lg hover:bg-accent text-foreground"
      >
        <MenuIcon className="size-5" />
      </button>

      <div className="hidden md:flex items-center gap-3">
        <div>
          <div className="text-sm font-semibold leading-tight text-foreground">
            {isImpersonating ? impersonatedRestaurantName : (restaurantName || "Spice Symphony")}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
            {" · "}
            {now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </div>

      <div className="relative ml-auto md:ml-6 flex-1 max-w-md hidden sm:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          placeholder="Search orders, tables, menu..."
          className="w-full h-10 rounded-xl bg-card/60 border border-border pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground text-foreground"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/30">
          <span className="size-1.5 rounded-full bg-green-500 animate-pulse" /> Live
        </span>
        <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-lg text-foreground hover:bg-accent">
          {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
        </Button>
        <Button variant="ghost" size="icon" className="relative rounded-lg text-foreground hover:bg-accent">
          <Bell className="size-5" />
          <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary pulse-ring" />
        </Button>
        <div className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl">
          <div className="size-8 rounded-lg gradient-primary grid place-items-center text-white font-semibold text-sm shadow-glow shrink-0">
            {avatarLetter}
          </div>
          <div className="hidden md:block text-left leading-tight min-w-0">
            <div className="text-sm font-medium truncate max-w-[120px] text-foreground">{fullName}</div>
            <div className="text-[11px] text-muted-foreground uppercase truncate max-w-[120px]">
              {isImpersonating ? 'impersonating admin' : role?.toLowerCase()?.replace('_', ' ')}
            </div>
          </div>
          <ChevronDown className="size-4 text-muted-foreground hidden md:block" />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={signOut}
          className="rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
          title="Log Out"
        >
          <LogOut className="size-5" />
        </Button>
      </div>
    </header>
  );
}
