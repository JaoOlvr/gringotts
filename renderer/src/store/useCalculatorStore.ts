import { create } from 'zustand';

export type CalculatorTab = 'standard' | 'compound' | 'split';

export interface CalculationHistoryItem {
  id: string;
  expression: string;
  result: string;
  timestamp: number;
}

interface CalculatorState {
  isOpen: boolean;
  activeTab: CalculatorTab;
  history: CalculationHistoryItem[];
  openCalculator: (tab?: CalculatorTab) => void;
  closeCalculator: () => void;
  toggleCalculator: () => void;
  setActiveTab: (tab: CalculatorTab) => void;
  addHistoryItem: (expression: string, result: string) => void;
  clearHistory: () => void;
}

const STORAGE_KEY_CALC_HISTORY = 'gringotts_calc_history';

const loadSavedHistory = (): CalculationHistoryItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CALC_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const useCalculatorStore = create<CalculatorState>((set) => ({
  isOpen: false,
  activeTab: 'standard',
  history: loadSavedHistory(),

  openCalculator: (tab) => set((state) => ({ 
    isOpen: true, 
    activeTab: tab || state.activeTab 
  })),

  closeCalculator: () => set({ isOpen: false }),

  toggleCalculator: () => set((state) => ({ isOpen: !state.isOpen })),

  setActiveTab: (activeTab) => set({ activeTab }),

  addHistoryItem: (expression, result) => set((state) => {
    const newItem: CalculationHistoryItem = {
      id: Math.random().toString(36).substring(2, 9),
      expression,
      result,
      timestamp: Date.now(),
    };
    const updated = [newItem, ...state.history].slice(0, 30); // Limita aos últimos 30
    localStorage.setItem(STORAGE_KEY_CALC_HISTORY, JSON.stringify(updated));
    return { history: updated };
  }),

  clearHistory: () => {
    localStorage.removeItem(STORAGE_KEY_CALC_HISTORY);
    set({ history: [] });
  },
}));
