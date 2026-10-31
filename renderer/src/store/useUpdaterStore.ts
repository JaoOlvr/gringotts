import { create } from 'zustand';
import { api, type UpdateCheckResult } from '../lib/ipc';

interface UpdaterState {
  isChecking: boolean;
  hasUpdate: boolean;
  updateInfo: UpdateCheckResult | null;
  isModalOpen: boolean;
  lastCheckedAt: number | null;
  ignoredVersion: string | null;
  statusMessage: string | null;

  // Ações
  checkForUpdates: (manual?: boolean) => Promise<UpdateCheckResult>;
  openModal: () => void;
  closeModal: () => void;
  ignoreCurrentVersion: () => void;
  openDownload: () => Promise<void>;
  openReleasePage: () => Promise<void>;
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

  checkForUpdates: async (manual = false) => {
    set({ isChecking: true, statusMessage: null });
    try {
      const result = await api.updater.check();
      const currentIgnored = get().ignoredVersion;

      const isIgnored = !manual && currentIgnored === result.latestVersion;
      const shouldOpenModal = result.hasUpdate && !isIgnored;

      set({
        isChecking: false,
        hasUpdate: result.hasUpdate,
        updateInfo: result,
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
        currentVersion: '1.1.0',
        latestVersion: '1.1.0',
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
}));
