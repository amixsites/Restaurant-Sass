import { create } from 'zustand';

export interface TakeOrderCartItem {
  id: string; // menu item id
  name: string;
  price: number;
  quantity: number;
  notes: string;
}

interface TakeOrderState {
  selectedTableId: string | null;
  customerPhone: string;
  customerName: string;
  items: TakeOrderCartItem[];
  
  setSelectedTable: (id: string | null) => void;
  setCustomerDetails: (phone: string, name?: string) => void;
  
  addItem: (item: { id: string; name: string; price: number }, notes?: string) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  updateNotes: (id: string, notes: string) => void;
  
  clearCart: () => void;
  
  getCartTotal: () => number;
}

export const useTakeOrderCart = create<TakeOrderState>((set, get) => ({
  selectedTableId: null,
  customerPhone: '',
  customerName: '',
  items: [],
  
  setSelectedTable: (id) => set({ selectedTableId: id }),
  setCustomerDetails: (phone, name = '') => set({ customerPhone: phone, customerName: name }),
  
  addItem: (item, notes = '') => set((state) => {
    const existing = state.items.find(i => i.id === item.id);
    if (existing) {
      return {
        items: state.items.map(i => 
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      };
    }
    return {
      items: [...state.items, { ...item, quantity: 1, notes }]
    };
  }),
  
  removeItem: (id) => set((state) => ({
    items: state.items.filter(i => i.id !== id)
  })),
  
  updateQuantity: (id, delta) => set((state) => ({
    items: state.items.map(i => {
      if (i.id === id) {
        const newQ = Math.max(1, i.quantity + delta);
        return { ...i, quantity: newQ };
      }
      return i;
    })
  })),
  
  updateNotes: (id, notes) => set((state) => ({
    items: state.items.map(i => i.id === id ? { ...i, notes } : i)
  })),
  
  clearCart: () => set({
    items: [],
    selectedTableId: null,
    customerPhone: '',
    customerName: ''
  }),
  
  getCartTotal: () => {
    return get().items.reduce((total, item) => total + (item.price * item.quantity), 0);
  }
}));
