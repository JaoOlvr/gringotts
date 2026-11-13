import type {
  Account,
  Category,
  Transaction,
  Budget,
  Goal,
  ParsedStatement,
  ImportTransactionsParams,
  ImportTransactionsResult,
  Debt,
  ParsedReceipt,
  ReceiptDocumentType,
  P2pSyncStatus,
  SyncResultDetails,
} from '../types';

export type {
  Account,
  Category,
  Transaction,
  Budget,
  Goal,
  ParsedStatement,
  ImportTransactionsParams,
  ImportTransactionsResult,
  Debt,
  ParsedReceipt,
  ReceiptDocumentType,
  P2pSyncStatus,
  SyncResultDetails,
};

export interface UpdateCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseName: string;
  releaseNotes: string;
  releaseUrl: string;
  downloadUrl?: string;
  assetName?: string;
  assetSize?: number;
  publishedAt?: string;
  platform: 'linux' | 'win32' | 'darwin' | string;
  arch?: string;
  isAppImage?: boolean;
  error?: string;
}

export interface DownloadProgress {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
}

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

import { mobileStorage } from './mobileStorage';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

// In-memory fallback for web/testing mode when window.api is not present
const isElectron = typeof window !== 'undefined' && Boolean(window.api);

const listeners = new Map<string, Set<(...args: unknown[]) => void>>();

export const api = {
  accounts: {
    getAll: async (): Promise<Account[]> => {
      if (isElectron) return window.api!.invoke('accounts:getAll');
      return mobileStorage.getAccounts();
    },
    create: async (account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Promise<Account> => {
      if (isElectron) return window.api!.invoke('accounts:create', account);
      return mobileStorage.createAccount(account);
    },
    update: async (id: string, account: Partial<Omit<Account, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Account | null> => {
      if (isElectron) return window.api!.invoke('accounts:update', { id, account });
      return mobileStorage.updateAccount(id, account);
    },
    delete: async (id: string, secret?: string): Promise<boolean> => {
      if (isElectron) return window.api!.invoke('accounts:delete', id, secret);
      return mobileStorage.deleteAccount(id);
    },
    setLock: async (id: string, lockType: 'PIN' | 'PASSWORD', secret: string): Promise<boolean> => {
      if (isElectron) return window.api!.invoke('accounts:setLock', { id, lockType, secret });
      const acc = mobileStorage.getAccounts().find(a => a.id === id);
      if (acc) {
        mobileStorage.updateAccount(id, { isLocked: true, lockType });
      }
      return true;
    },
    verifyLock: async (id: string, secret: string): Promise<boolean> => {
      if (isElectron) return window.api!.invoke('accounts:verifyLock', { id, secret });
      return true;
    },
    removeLock: async (id: string, secret: string): Promise<boolean> => {
      if (isElectron) return window.api!.invoke('accounts:removeLock', { id, secret });
      const acc = mobileStorage.getAccounts().find(a => a.id === id);
      if (acc) {
        mobileStorage.updateAccount(id, { isLocked: false, lockType: undefined });
      }
      return true;
    },
  },

  categories: {
    getAll: async (): Promise<Category[]> => {
      if (isElectron) return window.api!.invoke('categories:getAll');
      return mobileStorage.getCategories();
    },
    getById: async (id: string): Promise<Category | null> => {
      if (isElectron) return window.api!.invoke('categories:getById', id);
      return mobileStorage.getCategories().find(c => c.id === id) || null;
    },
    create: async (category: Omit<Category, 'id' | 'createdAt'>): Promise<Category> => {
      if (isElectron) return window.api!.invoke('categories:create', category);
      return mobileStorage.createCategory(category);
    },
    update: async (id: string, category: Partial<Omit<Category, 'id' | 'createdAt'>>): Promise<Category | null> => {
      if (isElectron) return window.api!.invoke('categories:update', { id, category });
      return null;
    },
    delete: async (id: string): Promise<boolean> => {
      if (isElectron) return window.api!.invoke('categories:delete', id);
      return true;
    },
  },

  transactions: {
    getAll: async (options?: { limit?: number; offset?: number; accountId?: string; categoryId?: string; type?: string }): Promise<Transaction[]> => {
      if (isElectron) return window.api!.invoke('transactions:getAll', options);
      return mobileStorage.getTransactions(options);
    },
    getById: async (id: string): Promise<Transaction | null> => {
      if (isElectron) return window.api!.invoke('transactions:getById', id);
      return mobileStorage.getTransactions().find(t => t.id === id) || null;
    },
    create: async (transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> => {
      if (isElectron) return window.api!.invoke('transactions:create', transaction);
      return mobileStorage.createTransaction(transaction);
    },
    createMany: async (transactionsList: Array<Omit<Transaction, 'id' | 'createdAt'>>): Promise<Transaction[]> => {
      if (isElectron) return window.api!.invoke('transactions:createMany', transactionsList);
      const results: Transaction[] = [];
      for (const t of transactionsList) {
        const res = await api.transactions.create(t);
        results.push(res);
      }
      return results;
    },
    update: async (id: string, transaction: Partial<Omit<Transaction, 'id' | 'createdAt'>>): Promise<Transaction | null> => {
      if (isElectron) return window.api!.invoke('transactions:update', { id, transactionData: transaction });
      return null;
    },
    delete: async (id: string): Promise<boolean> => {
      if (isElectron) return window.api!.invoke('transactions:delete', id);
      return mobileStorage.deleteTransaction(id);
    },
  },

  budgets: {
    getAll: async (): Promise<Budget[]> => {
      if (isElectron) return window.api!.invoke('budgets:getAll');
      return mobileStorage.getBudgets();
    },
    create: async (budget: Omit<Budget, 'id' | 'createdAt'>): Promise<Budget> => {
      if (isElectron) return window.api!.invoke('budgets:create', budget);
      return mobileStorage.createBudget(budget);
    },
    update: async (id: string, budget: Partial<Omit<Budget, 'id' | 'createdAt'>>): Promise<Budget | null> => {
      if (isElectron) return window.api!.invoke('budgets:update', { id, budgetData: budget });
      return null;
    },
    delete: async (id: string): Promise<boolean> => {
      if (isElectron) return window.api!.invoke('budgets:delete', id);
      return true;
    },
  },

  goals: {
    getAll: async (): Promise<Goal[]> => {
      if (isElectron) return window.api!.invoke('goals:getAll');
      return mobileStorage.getGoals();
    },
    getById: async (id: string): Promise<Goal | null> => {
      if (isElectron) return window.api!.invoke('goals:getById', id);
      return mobileStorage.getGoals().find(g => g.id === id) || null;
    },
    create: async (goal: Omit<Goal, 'id' | 'createdAt'>): Promise<Goal> => {
      if (isElectron) return window.api!.invoke('goals:create', goal);
      return mobileStorage.createGoal(goal);
    },
    update: async (id: string, goal: Partial<Omit<Goal, 'id' | 'createdAt'>>): Promise<Goal | null> => {
      if (isElectron) return window.api!.invoke('goals:update', { id, goalData: goal });
      return null;
    },
    delete: async (id: string): Promise<boolean> => {
      if (isElectron) return window.api!.invoke('goals:delete', id);
      return true;
    },
    addToGoal: async (id: string, amountCents: number): Promise<Goal | null> => {
      if (isElectron) return window.api!.invoke('goals:addToGoal', { id, amountCents });
      return null;
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

  updater: {
    check: async (): Promise<UpdateCheckResult> => {
      if (isElectron) return window.api!.invoke('updater:check');
      return {
        hasUpdate: false,
        currentVersion: '1.4.0',
        latestVersion: '1.4.0',
        releaseName: 'Gringotts Local Preview',
        releaseNotes: '',
        releaseUrl: 'https://github.com/JaoOlvr/gringotts/releases',
        platform: 'linux',
      };
    },
    openExternal: async (url: string): Promise<boolean> => {
      if (isElectron) return window.api!.invoke('updater:openExternal', url);
      window.open(url, '_blank');
      return true;
    },
    getAppInfo: async (): Promise<{ version: string; platform: string; arch: string; isAppImage?: boolean }> => {
      if (isElectron) return window.api!.invoke('updater:getAppInfo');
      return { version: '1.4.0', platform: 'linux', arch: 'x64', isAppImage: false };
    },
    startDownload: async (url?: string): Promise<{ success: boolean; filePath?: string; error?: string }> => {
      if (isElectron) return window.api!.invoke('updater:startDownload', url);
      return { success: false, error: 'Não suportado no navegador' };
    },
    cancelDownload: async (): Promise<boolean> => {
      if (isElectron) return window.api!.invoke('updater:cancelDownload');
      return true;
    },
    install: async (): Promise<{ success: boolean; error?: string }> => {
      if (isElectron) return window.api!.invoke('updater:install');
      return { success: false, error: 'Não suportado no navegador' };
    },
    getDownloadStatus: async (): Promise<{ hasDownloaded: boolean; filePath?: string; version?: string }> => {
      if (isElectron) return window.api!.invoke('updater:getDownloadStatus');
      return { hasDownloaded: false };
    },
  },

  theme: {
    get: async (): Promise<{ themeSource: 'system' | 'light' | 'dark'; shouldUseDarkColors: boolean }> => {
      if (isElectron) return window.api!.invoke('theme:get');
      const prefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
      return { themeSource: 'system', shouldUseDarkColors: prefersDark };
    },
    set: async (mode: 'system' | 'light' | 'dark'): Promise<{ themeSource: 'system' | 'light' | 'dark'; shouldUseDarkColors: boolean }> => {
      if (isElectron) return window.api!.invoke('theme:set', mode);
      const prefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const shouldUseDark = mode === 'dark' || (mode === 'system' && prefersDark);
      return { themeSource: mode, shouldUseDarkColors: shouldUseDark };
    },
  },

  openFinance: {
    selectFile: async (): Promise<{ canceled: boolean; filePath?: string; fileContent?: string; fileName?: string }> => {
      if (isElectron) return window.api!.invoke('openFinance:selectFile');
      return { canceled: true };
    },
    parseStatement: async (fileContent: string, fileName?: string, accountId?: string): Promise<ParsedStatement> => {
      if (isElectron) return window.api!.invoke('openFinance:parseStatement', { fileContent, fileName, accountId });
      throw new Error('Open Finance indisponível no modo navegador');
    },
    importTransactions: async (params: ImportTransactionsParams): Promise<ImportTransactionsResult> => {
      if (isElectron) return window.api!.invoke('openFinance:importTransactions', params);
      throw new Error('Open Finance indisponível no modo navegador');
    },
  },

  debts: {
    getAll: async (): Promise<Debt[]> => {
      if (isElectron) return window.api!.invoke('debts:getAll');
      return mobileStorage.getDebts();
    },
    create: async (debt: Omit<Debt, 'id' | 'createdAt' | 'updatedAt'>): Promise<Debt> => {
      if (isElectron) return window.api!.invoke('debts:create', debt);
      return mobileStorage.createDebt(debt);
    },
    update: async (id: string, debt: Partial<Omit<Debt, 'id' | 'createdAt'>>): Promise<Debt | null> => {
      if (isElectron) return window.api!.invoke('debts:update', { id, debt });
      return mobileStorage.updateDebt(id, debt);
    },
    recordPayment: async (id: string, paymentAmountCents: number): Promise<Debt | null> => {
      if (isElectron) return window.api!.invoke('debts:recordPayment', { id, paymentAmountCents });
      return mobileStorage.recordDebtPayment(id, paymentAmountCents);
    },
    delete: async (id: string): Promise<boolean> => {
      if (isElectron) return window.api!.invoke('debts:delete', id);
      return mobileStorage.deleteDebt(id);
    },
  },

  receipt: {
    selectFile: async (): Promise<{ canceled: boolean; filePath?: string; fileName?: string; fileBase64?: string }> => {
      if (isElectron) return window.api!.invoke('receipt:selectFile');
      try {
        const photo = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.Base64,
          source: CameraSource.Prompt,
        });
        if (photo && photo.base64String) {
          return {
            canceled: false,
            fileName: 'comprovante-camera.jpg',
            fileBase64: `data:image/${photo.format || 'jpeg'};base64,${photo.base64String}`,
          };
        }
      } catch {
        // Câmera cancelada ou não suportada
      }
      return { canceled: true };
    },
    scanReceipt: async (imageInput: string): Promise<ParsedReceipt> => {
      if (isElectron) return window.api!.invoke('receipt:scanReceipt', { imageInput });
      // Fallback para leitura básica em modo mobile/web
      return {
        rawText: 'Comprovante digital',
        documentType: 'GENERIC_RECEIPT',
        confidence: 0.5,
      };
    },
  },

  sync: {
    getStatus: async (): Promise<P2pSyncStatus> => {
      if (isElectron) return window.api!.invoke('sync:getStatus');
      return {
        isServerRunning: false,
        port: null,
        pairingCode: null,
        ipAddresses: ['127.0.0.1'],
        primaryIp: '127.0.0.1',
        lastSyncResult: null,
        lastSyncTimestamp: null,
        connectedClientsCount: 0,
        errorMessage: null,
      };
    },
    startServer: async (preferredPort?: number): Promise<P2pSyncStatus> => {
      if (isElectron) return window.api!.invoke('sync:startServer', { preferredPort });
      throw new Error('Servidor P2P para escuta requer o aplicativo Desktop.');
    },
    stopServer: async (): Promise<P2pSyncStatus> => {
      if (isElectron) return window.api!.invoke('sync:stopServer');
      return {
        isServerRunning: false,
        port: null,
        pairingCode: null,
        ipAddresses: ['127.0.0.1'],
        primaryIp: '127.0.0.1',
        lastSyncResult: null,
        lastSyncTimestamp: null,
        connectedClientsCount: 0,
        errorMessage: null,
      };
    },
    connectAndSync: async (params: { host: string; port: number; pairingCode: string }): Promise<SyncResultDetails> => {
      if (isElectron) return window.api!.invoke('sync:connectAndSync', params);
      return await mobileStorage.connectAndSync(params);
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
