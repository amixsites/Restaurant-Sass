import {
  LayoutDashboard,
  ClipboardList,
  Grid3x3,
  ChefHat,
  Receipt,
  UtensilsCrossed,
  Users,
  LineChart,
  QrCode,
} from "lucide-react";

export const navItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/take-order", label: "Take Order", icon: ClipboardList },
  { to: "/admin/tables", label: "Tables", icon: Grid3x3 },
  { to: "/admin/manageqr", label: "QR Codes", icon: QrCode },
  { to: "/kitchen", label: "Kitchen KDS", icon: ChefHat },
  { to: "/admin/billing", label: "Billing", icon: Receipt },
  { to: "/admin/menu", label: "Menu Management", icon: UtensilsCrossed },
  { to: "/admin/staff", label: "Staff Management", icon: Users },
  { to: "/admin/analytics", label: "Analytics", icon: LineChart },
] as const;

export const mobileNavItems = navItems.slice(0, 5);
