import { apiRequest } from "@/api/http";
import type {
  AuthSession,
  AuthUser,
  BillingInvoice,
  CreateOrderInput,
  CreateOrderResult,
  DashboardSummary,
  KitchenOrder,
  MenuCategory,
  MenuItem,
  PosTable,
} from "@/types/pos";

export const authApi = {
  login: (payload: { username: string; password: string }) =>
    apiRequest<AuthSession>("/auth/login", { method: "POST", body: payload, auth: false }),
  refresh: (payload: { refreshToken: string }) =>
    apiRequest<AuthSession>("/auth/refresh", { method: "POST", body: payload, auth: false }),
  me: () => apiRequest<AuthUser>("/auth/me", { method: "GET" }),
  logout: () => apiRequest<{ success: boolean }>("/auth/logout", { method: "POST" }),
};

export const menuApi = {
  getCategories: () => apiRequest<MenuCategory[]>("/menu/categories", { method: "GET" }),
  getItems: (params?: { categoryId?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.categoryId) query.set("categoryId", params.categoryId);
    if (params?.search) query.set("search", params.search);
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return apiRequest<MenuItem[]>(`/menu/items${suffix}`, { method: "GET" });
  },
};

export const tableApi = {
  getTables: () => apiRequest<PosTable[]>("/tables", { method: "GET" }),
  createTable: (payload: { tableNumber: string }) =>
    apiRequest<PosTable>("/tables", { method: "POST", body: payload }),
  updateTableStatus: (tableId: string, payload: { status: string; waiterId?: string }) =>
    apiRequest<PosTable>(`/tables/${tableId}`, { method: "PATCH", body: payload }),
  transferTable: (payload: { fromTableId: string; toTableId: string }) =>
    apiRequest<{ success: boolean }>("/tables/transfer", { method: "POST", body: payload }),
};

export const orderApi = {
  create: (payload: CreateOrderInput) =>
    apiRequest<CreateOrderResult>("/orders", { method: "POST", body: payload }),
  saveDraft: (payload: CreateOrderInput) =>
    apiRequest<{ draftId: string }>("/orders/draft", { method: "POST", body: payload }),
  listActive: () =>
    apiRequest<Array<{ id: string; status: string }>>("/orders/active", { method: "GET" }),
};

export const kitchenApi = {
  list: () => apiRequest<KitchenOrder[]>("/kitchen/orders", { method: "GET" }),
  updateStatus: (orderId: string, payload: { status: string }) =>
    apiRequest<{ success: boolean }>(`/kitchen/orders/${orderId}`, {
      method: "PATCH",
      body: payload,
    }),
};

export const billingApi = {
  generateInvoice: (payload: {
    orderId: string;
    discount?: number;
    paymentMethod: "CASH" | "UPI" | "CARD";
  }) => apiRequest<BillingInvoice>("/billing/invoices", { method: "POST", body: payload }),
};

export const analyticsApi = {
  getSummary: (params?: { from?: string; to?: string }) => {
    const query = new URLSearchParams();
    if (params?.from) query.set("from", params.from);
    if (params?.to) query.set("to", params.to);
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return apiRequest<DashboardSummary>(`/analytics/summary${suffix}`, { method: "GET" });
  },
};
