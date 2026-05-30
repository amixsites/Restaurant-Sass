import {
  LayoutDashboard,
  ClipboardList,
  Grid3x3,
  ChefHat,
  Receipt,
  UtensilsCrossed,
  Users,
  LineChart,
  UserSquare2,
  Settings,
} from "lucide-react";

export const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/take-order", label: "Take Order", icon: ClipboardList },
  { to: "/tables", label: "Tables", icon: Grid3x3 },
  { to: "/kitchen", label: "Kitchen", icon: ChefHat },
  { to: "/billing", label: "Billing", icon: Receipt },
  { to: "/menu", label: "Menu", icon: UtensilsCrossed },
  { to: "/waiters", label: "Waiters", icon: Users },
  { to: "/analytics", label: "Analytics", icon: LineChart },
  { to: "/customers", label: "Customers", icon: UserSquare2 },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export const mobileNavItems = navItems.slice(0, 5);
