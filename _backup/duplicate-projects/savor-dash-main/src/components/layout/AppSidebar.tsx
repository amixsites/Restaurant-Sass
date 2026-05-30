import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronLeft, Flame } from "lucide-react";
import { navItems } from "./nav-items";
import { cn } from "@/lib/utils";

export function AppSidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-[width] duration-300 ease-out shrink-0",
        collapsed ? "w-[76px]" : "w-[248px]",
      )}
    >
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
        <div className="size-10 rounded-xl gradient-primary grid place-items-center shadow-glow shrink-0">
          <Flame className="size-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="flex flex-col leading-tight">
            <span className="font-semibold text-base">Servio</span>
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
        {navItems.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
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

      {!collapsed && (
        <div className="m-3 p-4 rounded-2xl glass border border-sidebar-border">
          <div className="text-xs text-muted-foreground">Shift</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="size-2 rounded-full bg-success pulse-ring" />
            <span className="text-sm font-semibold">Evening · Live</span>
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground">
            12 staff online · 4hr 22m left
          </div>
        </div>
      )}
    </aside>
  );
}
