import { create } from 'zustand';

const STORAGE_KEY = 'impersonation_state';

interface ImpersonationState {
  isImpersonating: boolean;
  impersonatedRestaurantId: string | null;
  impersonatedRestaurantName: string | null;
  impersonatedAt: string | null;

  // Actions
  startImpersonation: (restaurantId: string, restaurantName: string) => void;
  endImpersonation: () => void;
  restoreFromSession: () => { restaurantId: string; restaurantName: string } | null;
}

export const useImpersonationStore = create<ImpersonationState>((set) => ({
  isImpersonating: false,
  impersonatedRestaurantId: null,
  impersonatedRestaurantName: null,
  impersonatedAt: null,

  startImpersonation: (restaurantId, restaurantName) => {
    const impersonatedAt = new Date().toISOString();
    
    // Persist to sessionStorage
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      restaurantId,
      restaurantName,
      impersonatedAt,
    }));

    set({
      isImpersonating: true,
      impersonatedRestaurantId: restaurantId,
      impersonatedRestaurantName: restaurantName,
      impersonatedAt,
    });
  },

  endImpersonation: () => {
    sessionStorage.removeItem(STORAGE_KEY);

    set({
      isImpersonating: false,
      impersonatedRestaurantId: null,
      impersonatedRestaurantName: null,
      impersonatedAt: null,
    });
  },

  restoreFromSession: () => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (!stored) return null;

      const parsed = JSON.parse(stored);
      if (!parsed.restaurantId || !parsed.restaurantName) return null;

      set({
        isImpersonating: true,
        impersonatedRestaurantId: parsed.restaurantId,
        impersonatedRestaurantName: parsed.restaurantName,
        impersonatedAt: parsed.impersonatedAt || new Date().toISOString(),
      });

      return {
        restaurantId: parsed.restaurantId,
        restaurantName: parsed.restaurantName,
      };
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
  },
}));
