import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GSTSettings {
  enabled: boolean;
  cgst: number; // percentage e.g. 9
  sgst: number; // percentage e.g. 9
  igst: number; // percentage e.g. 0 (used for inter-state)
  useIGST: boolean; // if true, use IGST instead of CGST+SGST
}

interface SettingsState {
  gst: GSTSettings;
  restaurantGSTIN: string;
  setGST: (gst: Partial<GSTSettings>) => void;
  setGSTIN: (gstin: string) => void;
  resetGST: () => void;
}

const DEFAULT_GST: GSTSettings = {
  enabled: true,
  cgst: 9,
  sgst: 9,
  igst: 18,
  useIGST: false,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      gst: DEFAULT_GST,
      restaurantGSTIN: '',
      setGST: (partial) =>
        set((state) => ({ gst: { ...state.gst, ...partial } })),
      setGSTIN: (gstin) => set({ restaurantGSTIN: gstin }),
      resetGST: () => set({ gst: DEFAULT_GST }),
    }),
    {
      name: 'restaurant-pos-settings',
    }
  )
);
