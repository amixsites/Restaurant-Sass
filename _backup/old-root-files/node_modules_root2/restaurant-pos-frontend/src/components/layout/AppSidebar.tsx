import { Link, useLocation } from "react-router-dom";
import { ChevronLeft, Flame, LogOut, LayoutDashboard, PlusCircle } from "lucide-react";
import { navItems } from "./nav-items";
import { cn } from "@/lib/utils";
import { useTenantStore } from "@/store/tenantStore";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

export function AppSidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { pathname } = useLocation();
  const { restaurantName } = useTenantStore();
  const { user, role } = useAuthStore();

  const signOut = async () => await supabase.auth.signOut();

  const activeNavItems = role === 'SUPER_ADMIN'
    ? [
        { to: "/super-admin", label: "Super Admin", icon: LayoutDashboard },
        { to: "/super-admin/create", label: "Create Restaurant", icon: PlusCircle },
        { to: "/super-admin/simulation", label: "Testing Simulator", icon: Flame }
      ]
    : navItems;

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-[width] duration-300 ease-out shrink-0",
        collapsed ? "w-[76px]" : "w-[248px]",
      )}
    >
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
        <div className="size-10 rounded-xl gradient-primary grid place-items-center shadow-glow shrink-0">
          <Flame className="size-5 text-white" />
        </div>
        {!collapsed && (
          <div className="flex flex-col leading-tight min-w-0">
            <span className="font-semibold text-base truncate">{role === 'SUPER_ADMIN' ? 'SaaS Portal' : (restaurantName || 'DineSwift')}</span>
            <span className="text-[11px] text-muted-foreground">Restaurant OS</span>
          </div>
        )}
        <button
          onClick={onToggle}
          className={cn(
            "ml-auto size-7 grid place-items-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition",
            collapsed && "absolute left-1/2 -translate-x-1/2 top-[68px]",
          )}
        >
          <ChevronLeft
            className={cn("size-4 transition-transform", collapsed && "rotate-180")}
          />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {activeNavItems.map(({ to, label, icon: Icon }) => {
          const active = to === '/admin' || to === '/super-admin' ? pathname === to : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-soft"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60",
                collapsed && "justify-center px-0",
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full gradient-primary" />
              )}
              <Icon
                className={cn(
                  "size-[18px] transition-transform group-hover:scale-110",
                  active && "text-primary",
                )}
              />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Profile / Logout Section */}
      <div className="p-3 border-t border-sidebar-border">
        <div className={cn("flex items-center justify-between gap-2", collapsed && "flex-col justify-center")}>
          {!collapsed && (
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-sm font-medium truncate">
                {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Manager'}
              </span>
              <span className="text-[11px] text-muted-foreground uppercase truncate">{role?.replace('_', ' ')}</span>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={signOut} className="rounded-xl shrink-0 hover:bg-sidebar-accent">
            <LogOut className="w-4 h-4 text-muted-foreground hover:text-foreground" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
