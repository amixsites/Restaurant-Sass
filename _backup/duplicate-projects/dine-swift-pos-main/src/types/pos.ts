export type UserRole = "ADMIN" | "MANAGER" | "WAITER" | "KITCHEN";

export interface AuthUser {
  id: string;
  name: string;
  role: UserRole;
  restaurantId: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: AuthUser;
}

export interface PosTable {
  id: string;
  tableNumber: string;
  status: "AVAILABLE" | "OCCUPIED" | "RESERVED" | "BILLING" | string;
  waiterId?: string | null;
}

export interface MenuCategory {
  id: string;
  name: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  veg: boolean;
  available: boolean;
}

export interface OrderDraftCustomer {
  name: string;
  mobile: string;
  table: string;
  tableId?: string | null;
}

export interface CreateOrderItemInput {
  menuItemId: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export interface CreateOrderInput {
  tableId: string;
  customerName: string;
  customerPhone: string;
  notes?: string;
  items: CreateOrderItemInput[];
}

export interface CreateOrderResult {
  orderId: string;
  kitchenTicketNo?: string;
  status: string;
}

export interface DashboardSummary {
  totalSales: number;
  todaysRevenue: number;
  activeOrders: number;
  occupiedTables: number;
  pendingKitchenOrders: number;
  totalCustomers: number;
}

export interface KitchenOrder {
  id: string;
  status: "PENDING" | "PREPARING" | "READY" | "SERVED" | string;
  tableNumber: string;
  elapsedMinutes: number;
}

export interface BillingInvoice {
  invoiceId: string;
  orderId: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: "CASH" | "UPI" | "CARD";
  pdfUrl?: string;
}
