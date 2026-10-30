import { create } from 'zustand';
import type { Account } from '../types';

interface AccountState {
  accounts: Account[];
  isLoading: boolean;
  error: string | null;
  selectedAccountId: string | null;
  isUnlocked: boolean;
  setAccounts: (accounts: Account[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  selectAccount: (accountId: string) => void;
  unlockAccount: (accountId: string) => void;
  lockSession: () => void;
}

export const useAccountStore = create<AccountState>((set, get) => ({
  accounts: [],
  isLoading: false,
  error: null,
  selectedAccountId: null,
  isUnlocked: false,
  setAccounts: (accounts) => {
    const currentSelected = get().selectedAccountId;
    const exists = accounts.some((a) => a.id === currentSelected);
    set({
      accounts,
      selectedAccountId: exists ? currentSelected : null,
      isUnlocked: exists ? get().isUnlocked : false,
    });
  },
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  selectAccount: (accountId: string) => {
    const acc = get().accounts.find((a) => a.id === accountId);
    if (!acc) return;
    if (get().selectedAccountId === accountId && get().isUnlocked) {
      return;
    }
    if (!acc.isLocked) {
      set({ selectedAccountId: accountId, isUnlocked: true });
    } else {
      set({ selectedAccountId: accountId, isUnlocked: false });
    }
  },
  unlockAccount: (accountId: string) => {
    set({ selectedAccountId: accountId, isUnlocked: true });
  },
  lockSession: () => {
    set({ selectedAccountId: null, isUnlocked: false });
  },
}));
