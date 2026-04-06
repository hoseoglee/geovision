import { create } from 'zustand';
import type { CurrentOilPrice } from '@/providers/OilPriceProvider';

interface FinancialState {
  oilPrice: CurrentOilPrice | null;
  isLoading: boolean;
  showOilPanel: boolean;

  setOilPrice: (data: CurrentOilPrice) => void;
  setLoading: (loading: boolean) => void;
  toggleOilPanel: () => void;
  setShowOilPanel: (show: boolean) => void;
}

export const useFinancialStore = create<FinancialState>((set) => ({
  oilPrice: null,
  isLoading: false,
  showOilPanel: false,

  setOilPrice: (data) => set({ oilPrice: data }),
  setLoading: (loading) => set({ isLoading: loading }),
  toggleOilPanel: () => set((s) => ({ showOilPanel: !s.showOilPanel })),
  setShowOilPanel: (show) => set({ showOilPanel: show }),
}));
