import { create } from "zustand";
import type { MenuItem, OrderDraftCustomer } from "@/types/pos";

export interface CartItem extends MenuItem {
  qty: number;
  notes?: string;
}

interface OrderState {
  customer: OrderDraftCustomer;
  cart: CartItem[];
  setCustomer: (c: OrderDraftCustomer) => void;
  add: (item: MenuItem) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  setItemNote: (id: string, notes: string) => void;
  reset: () => void;
}

export const useOrder = create<OrderState>((set) => ({
  customer: { name: "", mobile: "", table: "", tableId: null },
  cart: [],
  setCustomer: (customer) => set({ customer }),
  add: (item) =>
    set((s) => {
      const existing = s.cart.find((i) => i.id === item.id);
      if (existing) {
        return {
          cart: s.cart.map((i) => (i.id === item.id ? { ...i, qty: i.qty + 1 } : i)),
        };
      }

      return { cart: [...s.cart, { ...item, qty: 1 }] };
    }),
  remove: (id) => set((s) => ({ cart: s.cart.filter((i) => i.id !== id) })),
  setQty: (id, qty) =>
    set((s) => ({
      cart:
        qty <= 0
          ? s.cart.filter((i) => i.id !== id)
          : s.cart.map((i) => (i.id === id ? { ...i, qty } : i)),
    })),
  setItemNote: (id, notes) =>
    set((s) => ({ cart: s.cart.map((i) => (i.id === id ? { ...i, notes } : i)) })),
  reset: () => set({ customer: { name: "", mobile: "", table: "", tableId: null }, cart: [] }),
}));
