import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';

export type UserRole = 'SUPER_ADMIN' | 'RESTAURANT_ADMIN' | 'MANAGER' | 'WAITER' | 'KITCHEN' | 'CASHIER' | 'CUSTOMER';

interface AuthState {
  session: Session | null;
  user: User | null;
  role: UserRole | null;
  restaurantId: string | null;
  isSubscriptionExpired: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  
  // Actions
  setAuth: (payload: {
    session: Session | null;
    user: User | null;
    role: UserRole | null;
    restaurantId: string | null;
    isSubscriptionExpired: boolean;
  }) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  resetAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  role: null,
  restaurantId: null,
  isSubscriptionExpired: false,
  isLoading: true,
  isInitialized: false,

  setAuth: (payload) => set({
    session: payload.session,
    user: payload.user,
    role: payload.role,
    restaurantId: payload.restaurantId,
    isSubscriptionExpired: payload.isSubscriptionExpired,
    isLoading: false,
    isInitialized: true,
  }),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  setInitialized: (initialized) => set({ isInitialized: initialized }),
  
  resetAuth: () => set({
    session: null,
    user: null,
    role: null,
    restaurantId: null,
    isSubscriptionExpired: false,
    isLoading: false,
    isInitialized: true,
  })
}));
