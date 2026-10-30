import type { Account, Category, Transaction, Budget, Goal } from '../types';

export type { Account, Category, Transaction, Budget, Goal };

// Interface for Electron Window API
declare global {
  interface Window {
    api?: {
      invoke: (channel: string, ...args: unknown[]) => Promise<any>;
      send: (channel: string, ...args: unknown[]) => void;
      on: (channel: string, func: (...args: unknown[]) => void) => () => void;
      off: (channel: string, func: (...args: unknown[]) => void) => void;
    };
  }
}

// In-memory fallback for web/testing mode when window.api is not present
const isElectron = typeof window !== 'undefined' && Boolean(window.api);

// Fallback in-memory state
let mockAccounts: Account[] = [];
let mockCategories: Category[] = [
  { id: '1', name: 'Alimentação', group: 'Gastos Variáveis', type: 'EXPENSE', color: '#ef4444', createdAt: new Date() },
  { id: '2', name: 'Transporte', group: 'Gastos Variáveis', type: 'EXPENSE', color: '#f59e0b', createdAt: new Date() },
  { id: '3', name: 'Moradia', group: 'Gastos Fixos', type: 'EXPENSE', color: '#3b82f6', createdAt: new Date() },
  { id: '4', name: 'Salário', group: 'Receitas', type: 'INCOME', color: '#10b981', createdAt: new Date() },
  { id: '5', name: 'Investimentos', group: 'Receitas', type: 'INCOME', color: '#8b5cf6', createdAt: new Date() },
];
let mockTransactions: Transaction[] = [];
let mockBudgets: Budget[] = [];
let mockGoals: Goal[] = [];

const listeners = new Map<string, Set<(...args: unknown[]) => void>>();

export const api = {
  accounts: {
    getAll: async (): Promise<Account[]> => {
      if (isElectron) return window.api!.invoke('accounts:getAll');
      return [...mockAccounts];
    },
    create: async (account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Promise<Account> => {
      if (isElectron) return window.api!.invoke('accounts:create', account);
      const newAcc: Account = {
        ...account,
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockAccounts.push(newAcc);
      return newAcc;
    },
    update: async (id: string, account: Partial<Omit<Account, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Account | null> => {
      if (isElectron) return window.api!.invoke('accounts:update', { id, account });
      const idx = mockAccounts.findIndex(a => a.id === id);
      if (idx === -1) return null;
      mockAccounts[idx] = { ...mockAccounts[idx]!, ...account, updatedAt: new Date() };
      return mockAccounts[idx]!;
    },
    delete: async (id: string, secret?: string): Promise<boolean> => {
      if (isElectron) return window.api!.invoke('accounts:delete', id, secret);
      const prevLen = mockAccounts.length;
      mockAccounts = mockAccounts.filter(a => a.id !== id);
      return mockAccounts.length < prevLen;
    },
    setLock: async (id: string, lockType: 'PIN' | 'PASSWORD', secret: string): Promise<boolean> => {
      if (isElectron) return window.api!.invoke('accounts:setLock', { id, lockType, secret });
      const acc = mockAccounts.find(a => a.id === id);
      if (acc) {
        acc.isLocked = true;
        acc.lockType = lockType;
      }
      return true;
    },
    verifyLock: async (id: string, secret: string): Promise<boolean> => {
      if (isElectron) return window.api!.invoke('accounts:verifyLock', { id, secret });
      return true;
    },
    removeLock: async (id: string, secret: string): Promise<boolean> => {
      if (isElectron) return window.api!.invoke('accounts:removeLock', { id, secret });
      const acc = mockAccounts.find(a => a.id === id);
      if (acc) {
        acc.isLocked = false;
        acc.lockType = undefined;
      }
      return true;
    },
  },

  categories: {
    getAll: async (): Promise<Category[]> => {
      if (isElectron) return window.api!.invoke('categories:getAll');
      return [...mockCategories];
    },
    getById: async (id: string): Promise<Category | null> => {
      if (isElectron) return window.api!.invoke('categories:getById', id);
      return mockCategories.find(c => c.id === id) || null;
    },
    create: async (category: Omit<Category, 'id' | 'createdAt'>): Promise<Category> => {
      if (isElectron) return window.api!.invoke('categories:create', category);
      const newCat: Category = {
        ...category,
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        createdAt: new Date(),
      };
      mockCategories.push(newCat);
      return newCat;
    },
    update: async (id: string, category: Partial<Omit<Category, 'id' | 'createdAt'>>): Promise<Category | null> => {
      if (isElectron) return window.api!.invoke('categories:update', { id, category });
      const idx = mockCategories.findIndex(c => c.id === id);
      if (idx === -1) return null;
      mockCategories[idx] = { ...mockCategories[idx]!, ...category };
      return mockCategories[idx]!;
    },
    delete: async (id: string): Promise<boolean> => {
      if (isElectron) return window.api!.invoke('categories:delete', id);
      const prevLen = mockCategories.length;
      mockCategories = mockCategories.filter(c => c.id !== id);
      return mockCategories.length < prevLen;
    },
  },

  transactions: {
    getAll: async (options?: { limit?: number; offset?: number; accountId?: string; categoryId?: string; type?: string }): Promise<Transaction[]> => {
      if (isElectron) return window.api!.invoke('transactions:getAll', options);
      return [...mockTransactions];
    },
    getById: async (id: string): Promise<Transaction | null> => {
      if (isElectron) return window.api!.invoke('transactions:getById', id);
      return mockTransactions.find(t => t.id === id) || null;
    },
    create: async (transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> => {
      if (isElectron) return window.api!.invoke('transactions:create', transaction);
      const newTx: Transaction = {
        ...transaction,
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        createdAt: new Date(),
      };
      mockTransactions.unshift(newTx);
      // update account balance in mock
      const acc = mockAccounts.find(a => a.id === transaction.accountId);
      if (acc) {
        if (transaction.type === 'INCOME') acc.balanceCents += transaction.amountCents;
        else if (transaction.type === 'EXPENSE') acc.balanceCents -= Math.abs(transaction.amountCents);
      }
      return newTx;
    },
    update: async (id: string, transaction: Partial<Omit<Transaction, 'id' | 'createdAt'>>): Promise<Transaction | null> => {
      if (isElectron) return window.api!.invoke('transactions:update', { id, transactionData: transaction });
      const idx = mockTransactions.findIndex(t => t.id === id);
      if (idx === -1) return null;
      mockTransactions[idx] = { ...mockTransactions[idx]!, ...transaction };
      return mockTransactions[idx]!;
    },
    delete: async (id: string): Promise<boolean> => {
      if (isElectron) return window.api!.invoke('transactions:delete', id);
      const prevLen = mockTransactions.length;
      mockTransactions = mockTransactions.filter(t => t.id !== id);
      return mockTransactions.length < prevLen;
    },
  },

  budgets: {
    getAll: async (): Promise<Budget[]> => {
      if (isElectron) return window.api!.invoke('budgets:getAll');
      return [...mockBudgets];
    },
    create: async (budget: Omit<Budget, 'id' | 'createdAt'>): Promise<Budget> => {
      if (isElectron) return window.api!.invoke('budgets:create', budget);
      const newB: Budget = {
        ...budget,
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        createdAt: new Date(),
      };
      mockBudgets.push(newB);
      return newB;
    },
    update: async (id: string, budget: Partial<Omit<Budget, 'id' | 'createdAt'>>): Promise<Budget | null> => {
      if (isElectron) return window.api!.invoke('budgets:update', { id, budgetData: budget });
      const idx = mockBudgets.findIndex(b => b.id === id);
      if (idx === -1) return null;
      mockBudgets[idx] = { ...mockBudgets[idx]!, ...budget };
      return mockBudgets[idx]!;
    },
    delete: async (id: string): Promise<boolean> => {
      if (isElectron) return window.api!.invoke('budgets:delete', id);
      const prevLen = mockBudgets.length;
      mockBudgets = mockBudgets.filter(b => b.id !== id);
      return mockBudgets.length < prevLen;
    },
  },

  goals: {
    getAll: async (): Promise<Goal[]> => {
      if (isElectron) return window.api!.invoke('goals:getAll');
      return [...mockGoals];
    },
    getById: async (id: string): Promise<Goal | null> => {
      if (isElectron) return window.api!.invoke('goals:getById', id);
      return mockGoals.find(g => g.id === id) || null;
    },
    create: async (goal: Omit<Goal, 'id' | 'createdAt'>): Promise<Goal> => {
      if (isElectron) return window.api!.invoke('goals:create', goal);
      const newG: Goal = {
        ...goal,
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        createdAt: new Date(),
      };
      mockGoals.push(newG);
      return newG;
    },
    update: async (id: string, goal: Partial<Omit<Goal, 'id' | 'createdAt'>>): Promise<Goal | null> => {
      if (isElectron) return window.api!.invoke('goals:update', { id, goalData: goal });
      const idx = mockGoals.findIndex(g => g.id === id);
      if (idx === -1) return null;
      mockGoals[idx] = { ...mockGoals[idx]!, ...goal };
      return mockGoals[idx]!;
    },
    delete: async (id: string): Promise<boolean> => {
      if (isElectron) return window.api!.invoke('goals:delete', id);
      const prevLen = mockGoals.length;
      mockGoals = mockGoals.filter(g => g.id !== id);
      return mockGoals.length < prevLen;
    },
    addToGoal: async (id: string, amountCents: number): Promise<Goal | null> => {
      if (isElectron) return window.api!.invoke('goals:addToGoal', { id, amountCents });
      const idx = mockGoals.findIndex(g => g.id === id);
      if (idx === -1) return null;
      mockGoals[idx]!.currentAmountCents += amountCents;
      return mockGoals[idx]!;
    },
  },

  backup: {
    export: async (password?: string): Promise<{ success: boolean; filePath?: string; error?: string }> => {
      if (isElectron) return window.api!.invoke('backup:export', { password });
      return { success: true, filePath: 'mock-backup.json' };
    },
    import: async (filePath: string, password?: string): Promise<{ success: boolean; error?: string }> => {
      if (isElectron) return window.api!.invoke('backup:import', { filePath, password });
      return { success: true };
    },
  },

  seed: {
    loadSeedData: async (): Promise<{ success: boolean }> => {
      if (isElectron) return window.api!.invoke('seed:load');
      return { success: true };
    },
  },

  on: (channel: string, func: (...args: unknown[]) => void) => {
    if (isElectron) {
      return window.api!.on(channel, func);
    }
    if (!listeners.has(channel)) listeners.set(channel, new Set());
    listeners.get(channel)!.add(func);
    return () => {
      listeners.get(channel)?.delete(func);
    };
  },

  off: (channel: string, func: (...args: unknown[]) => void) => {
    if (isElectron) {
      window.api!.off(channel, func);
      return;
    }
    listeners.get(channel)?.delete(func);
  },

  trigger: (channel: string, ...args: unknown[]) => {
    listeners.get(channel)?.forEach(fn => fn(...args));
  },
};
