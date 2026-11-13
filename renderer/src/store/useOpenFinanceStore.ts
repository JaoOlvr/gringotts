import { create } from 'zustand';

interface OpenFinanceState {
  isOpen: boolean;
  targetAccountId?: string;
  openModal: (targetAccountId?: string) => void;
  closeModal: () => void;
}

export const useOpenFinanceStore = create<OpenFinanceState>((set) => ({
  isOpen: false,
  targetAccountId: undefined,
  openModal: (targetAccountId?: string) => set({ isOpen: true, targetAccountId }),
  closeModal: () => set({ isOpen: false, targetAccountId: undefined }),
}));
