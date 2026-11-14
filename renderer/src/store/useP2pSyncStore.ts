import { create } from 'zustand';
import { api, type P2pSyncStatus, type SyncResultDetails } from '../lib/ipc';

interface P2pSyncState {
  isOpen: boolean;
  status: P2pSyncStatus | null;
  isLoading: boolean;
  isConnecting: boolean;
  lastResult: SyncResultDetails | null;
  error: string | null;
  pendingDeepLink: { host: string; port: number; pairingCode: string } | null;

  openModal: () => void;
  closeModal: () => void;
  fetchStatus: () => Promise<void>;
  startServer: (preferredPort?: number) => Promise<void>;
  stopServer: () => Promise<void>;
  connectAndSync: (params: { host: string; port: number; pairingCode: string }) => Promise<SyncResultDetails>;
  clearError: () => void;
  clearLastResult: () => void;
  setPendingDeepLink: (link: { host: string; port: number; pairingCode: string } | null) => void;
}

export const useP2pSyncStore = create<P2pSyncState>((set, get) => ({
  isOpen: false,
  status: null,
  isLoading: false,
  isConnecting: false,
  lastResult: null,
  error: null,
  pendingDeepLink: null,

  openModal: () => {
    set({ isOpen: true, error: null });
    get().fetchStatus();
  },

  closeModal: () => set({ isOpen: false }),

  fetchStatus: async () => {
    try {
      const status = await api.sync.getStatus();
      set({ status });
    } catch (err: any) {
      console.error('Falha ao buscar status do sync:', err);
    }
  },

  startServer: async (preferredPort?: number) => {
    set({ isLoading: true, error: null });
    try {
      const status = await api.sync.startServer(preferredPort);
      set({ status, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Falha ao iniciar servidor de sincronização', isLoading: false });
    }
  },

  stopServer: async () => {
    set({ isLoading: true, error: null });
    try {
      const status = await api.sync.stopServer();
      set({ status, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Falha ao parar servidor', isLoading: false });
    }
  },

  connectAndSync: async (params) => {
    set({ isConnecting: true, error: null, lastResult: null });
    try {
      const result = await api.sync.connectAndSync(params);
      set({ lastResult: result, isConnecting: false });
      await get().fetchStatus();
      return result;
    } catch (err: any) {
      const msg = err.message || 'Falha ao sincronizar dados com o outro aparelho';
      set({ error: msg, isConnecting: false });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
  clearLastResult: () => set({ lastResult: null }),
  setPendingDeepLink: (link) => set({ pendingDeepLink: link }),
}));
