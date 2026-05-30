import { create } from 'zustand';

interface TenantState {
  restaurantId: string | null;
  restaurantName: string | null;
  setTenant: (id: string, name: string) => void;
  clearTenant: () => void;
}

export const useTenantStore = create<TenantState>((set) => ({
  restaurantId: null,
  restaurantName: null,
  setTenant: (id, name) => set({ restaurantId: id, restaurantName: name }),
  clearTenant: () => set({ restaurantId: null, restaurantName: null }),
}));
