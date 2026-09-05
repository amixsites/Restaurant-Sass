import { create } from 'zustand';

export interface CartItem {
  id: string; // unique ID for cart entry
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  type?: string;
  image_url?: string;
}

interface CartState {
  items: CartItem[];
  customerName: string;
  customerPhone: string;
  sessionId: string;
  restaurantId: string;
  tableId: string;
  setCustomerDetails: (name: string, phone: string) => void;
  setSessionDetails: (sessionId: string, restaurantId: string, tableId: string) => void;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  resetCart: () => void;
  total: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customerName: '',
  customerPhone: '',
  sessionId: '',
  restaurantId: '',
  tableId: '',
  setCustomerDetails: (name, phone) => set({ customerName: name, customerPhone: phone }),
  setSessionDetails: (sessionId, restaurantId, tableId) => set({ sessionId, restaurantId, tableId }),
  addItem: (item) => set((state) => {
    const existingItem = state.items.find(i => i.menu_item_id === item.menu_item_id && i.notes === item.notes);
    if (existingItem) {
      return {
        items: state.items.map(i => 
          i.id === existingItem.id ? { ...i, quantity: i.quantity + item.quantity } : i
        )
      };
    }
    return { items: [...state.items, { ...item, id: Math.random().toString(36).substring(7) }] };
  }),
  removeItem: (id) => set((state) => ({
    items: state.items.filter(i => i.id !== id)
  })),
  updateQuantity: (id, quantity) => set((state) => {
    if (quantity <= 0) {
      return { items: state.items.filter(i => i.id !== id) };
    }
    return {
      items: state.items.map(i => i.id === id ? { ...i, quantity } : i)
    };
  }),
  clearCart: () => set({ items: [] }),
  resetCart: () => set({ items: [], customerName: '', customerPhone: '' }),
  total: () => {
    return get().items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  }
}));
