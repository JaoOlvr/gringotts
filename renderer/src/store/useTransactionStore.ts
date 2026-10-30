import { create } from 'zustand';
import type { Transaction } from '../types';

interface TransactionState {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  quickAddOpen: boolean;
  setTransactions: (transactions: Transaction[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setQuickAddOpen: (open: boolean) => void;
}

export const useTransactionStore = create<TransactionState>((set) => ({
  transactions: [],
  isLoading: false,
  error: null,
  quickAddOpen: false,
  setTransactions: (transactions) => set({ transactions }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setQuickAddOpen: (open) => set({ quickAddOpen: open }),
}));
