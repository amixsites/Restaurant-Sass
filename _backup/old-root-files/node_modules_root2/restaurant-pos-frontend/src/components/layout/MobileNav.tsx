import { Link, useLocation } from "react-router-dom";
import { Plus, X } from "lucide-react";
import { mobileNavItems, navItems, superAdminNavItems, mobileSuperAdminNavItems } from "./nav-items";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useImpersonationStore } from "@/store/impersonationStore";

export function MobileBottomNav() {
  const { pathname } = useLocation();
  const { role } = useAuthStore();
  const { isImpersonating } = useImpersonationStore();

  // When impersonating, show restaurant admin nav items
  const activeMobileNavItems = (role === 'SUPER_ADMIN' && !isImpersonating)
    ? mobileSuperAdminNavItems
    : mobileNavItems;

  return (
    <>
      <nav className="md:hidden fixed bottom-3 inset-x-3 z-40 glass-strong rounded-2xl border border-border shadow-card px-2 py-2 flex items-center justify-between">
        {activeMobileNavItems.map(({ to, label, icon: Icon }) => {
          const active = to === '/admin' || to === '/super-admin' ? pathname === to : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-xl text-[10px] font-medium transition",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <div
                className={cn(
                  "size-9 grid place-items-center rounded-xl transition",
                  active && "gradient-primary text-white shadow-glow",
                )}
              >
                <Icon className="size-[18px]" />
              </div>
              {label}
            </Link>
          );
        })}
      </nav>
      {/* Show FAB for restaurant admin views (including impersonation) */}
      {(role !== 'SUPER_ADMIN' || isImpersonating) && (
        <Link
          to="/admin/take-order"
          className="md:hidden fixed bottom-24 right-4 z-40 size-14 rounded-2xl gradient-primary text-white grid place-items-center shadow-glow active:scale-95 transition"
        >
          <Plus className="size-6" />
        </Link>
      )}
    </>
  );
}

export function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { pathname } = useLocation();
  const { role } = useAuthStore();
  const { isImpersonating, impersonatedRestaurantName } = useImpersonationStore();

  // When impersonating, show restaurant admin nav items
  const activeNavItems = (role === 'SUPER_ADMIN' && !isImpersonating)
    ? superAdminNavItems
    : navItems;

  return (
    <div
      className={cn(
        "md:hidden fixed inset-0 z-50 transition",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
    >
      <div
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-background/70 backdrop-blur-sm transition-opacity",
          open ? "opacity-100" : "opacity-0",
        )}
      />
      <aside
        className={cn(
          "absolute left-0 top-0 bottom-0 w-72 bg-sidebar border-r border-sidebar-border p-4 transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="font-semibold text-foreground">
              {isImpersonating
                ? impersonatedRestaurantName
                : (role === 'SUPER_ADMIN' ? 'SaaS Portal' : 'DineSwift')}
            </div>
            {isImpersonating && (
              <div className="text-[10px] font-semibold text-amber-500">Impersonation Mode</div>
            )}
          </div>
          <button onClick={onClose} className="size-8 grid place-items-center rounded-lg hover:bg-accent text-foreground">
            <X className="size-4" />
          </button>
        </div>
        <nav className="space-y-1">
          {activeNavItems.map(({ to, label, icon: Icon }) => {
            const active = to === '/admin' || to === '/super-admin' ? pathname === to : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium",
                  active
                    ? "bg-sidebar-accent text-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60",
                )}
              >
                <Icon className={cn("size-[18px]", active && "text-primary")} />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}

