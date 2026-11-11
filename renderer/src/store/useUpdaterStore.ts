import { create } from 'zustand';
import { api, type UpdateCheckResult, type DownloadProgress } from '../lib/ipc';

export type DownloadStatus = 'idle' | 'downloading' | 'downloaded' | 'installing' | 'error';

interface UpdaterState {
  isChecking: boolean;
  hasUpdate: boolean;
  updateInfo: UpdateCheckResult | null;
  isModalOpen: boolean;
  lastCheckedAt: number | null;
  ignoredVersion: string | null;
  statusMessage: string | null;

  // Estados de download e instalação em segundo plano
  downloadStatus: DownloadStatus;
  downloadProgress: DownloadProgress | null;
  downloadError: string | null;
  listenersInitialized: boolean;

  // Ações
  checkForUpdates: (manual?: boolean) => Promise<UpdateCheckResult>;
  openModal: () => void;
  closeModal: () => void;
  ignoreCurrentVersion: () => void;
  openDownload: () => Promise<void>;
  openReleasePage: () => Promise<void>;
  startDownload: () => Promise<void>;
  cancelDownload: () => Promise<void>;
  installUpdate: () => Promise<void>;
  initListeners: () => () => void;
}

const STORAGE_KEY_IGNORED = 'gringotts_updater_ignored_version';

export const useUpdaterStore = create<UpdaterState>((set, get) => ({
  isChecking: false,
  hasUpdate: false,
  updateInfo: null,
  isModalOpen: false,
  lastCheckedAt: null,
  ignoredVersion: typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_IGNORED) : null,
  statusMessage: null,

  downloadStatus: 'idle',
  downloadProgress: null,
  downloadError: null,
  listenersInitialized: false,

  initListeners: () => {
    if (get().listenersInitialized) return () => {};
    set({ listenersInitialized: true });

    const unsubProgress = api.on('updater:download-progress', (progress: unknown) => {
      set({
        downloadStatus: 'downloading',
        downloadProgress: progress as DownloadProgress,
        downloadError: null,
      });
    });

    const unsubComplete = api.on('updater:download-complete', () => {
      set({
        downloadStatus: 'downloaded',
        downloadProgress: { percent: 100, transferred: 1, total: 1, bytesPerSecond: 0 },
        downloadError: null,
      });
    });

    const unsubError = api.on('updater:download-error', (payload: unknown) => {
      const err = payload as { error?: string };
      set({
        downloadStatus: 'error',
        downloadError: err?.error || 'Erro ao realizar download da atualização.',
      });
    });

    return () => {
      unsubProgress?.();
      unsubComplete?.();
      unsubError?.();
    };
  },

  checkForUpdates: async (manual = false) => {
    get().initListeners();
    set({ isChecking: true, statusMessage: null });
    try {
      const result = await api.updater.check();
      const currentIgnored = get().ignoredVersion;

      // Verifica se já temos o arquivo baixado
      const downloadInfo = await api.updater.getDownloadStatus();
      const isAlreadyDownloaded = downloadInfo.hasDownloaded && downloadInfo.version === result.latestVersion;

      const isIgnored = !manual && currentIgnored === result.latestVersion;
      const shouldOpenModal = result.hasUpdate && !isIgnored;

      set({
        isChecking: false,
        hasUpdate: result.hasUpdate,
        updateInfo: result,
        downloadStatus: isAlreadyDownloaded ? 'downloaded' : (get().downloadStatus === 'downloading' ? 'downloading' : 'idle'),
        lastCheckedAt: Date.now(),
        isModalOpen: shouldOpenModal,
        statusMessage: result.hasUpdate
          ? `Nova versão ${result.latestVersion} encontrada!`
          : `Gringotts está atualizado (v${result.currentVersion}).`,
      });

      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({
        isChecking: false,
        statusMessage: `Não foi possível verificar atualizações: ${msg}`,
      });
      return {
        hasUpdate: false,
        currentVersion: '1.3.1',
        latestVersion: '1.3.1',
        releaseName: '',
        releaseNotes: '',
        releaseUrl: 'https://github.com/JaoOlvr/gringotts/releases',
        platform: 'linux',
        error: msg,
      };
    }
  },

  openModal: () => set({ isModalOpen: true }),

  closeModal: () => set({ isModalOpen: false }),

  ignoreCurrentVersion: () => {
    const { updateInfo } = get();
    if (updateInfo?.latestVersion) {
      localStorage.setItem(STORAGE_KEY_IGNORED, updateInfo.latestVersion);
      set({ ignoredVersion: updateInfo.latestVersion, isModalOpen: false });
    } else {
      set({ isModalOpen: false });
    }
  },

  openDownload: async () => {
    const { updateInfo } = get();
    if (!updateInfo) return;
    const url = updateInfo.downloadUrl || updateInfo.releaseUrl;
    await api.updater.openExternal(url);
  },

  openReleasePage: async () => {
    const { updateInfo } = get();
    if (!updateInfo) return;
    await api.updater.openExternal(updateInfo.releaseUrl);
  },

  startDownload: async () => {
    const { updateInfo } = get();
    if (!updateInfo?.downloadUrl) return;

    set({ downloadStatus: 'downloading', downloadError: null, downloadProgress: null });
    try {
      const res = await api.updater.startDownload(updateInfo.downloadUrl);
      if (!res.success) {
        set({ downloadStatus: 'error', downloadError: res.error || 'Falha ao iniciar download.' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ downloadStatus: 'error', downloadError: msg });
    }
  },

  cancelDownload: async () => {
    await api.updater.cancelDownload();
    set({ downloadStatus: 'idle', downloadProgress: null, downloadError: null });
  },

  installUpdate: async () => {
    set({ downloadStatus: 'installing', downloadError: null });
    try {
      const res = await api.updater.install();
      if (!res.success) {
        set({ downloadStatus: 'error', downloadError: res.error || 'Falha ao instalar atualização.' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ downloadStatus: 'error', downloadError: msg });
    }
  },
}));
