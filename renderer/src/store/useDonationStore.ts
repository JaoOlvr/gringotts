import { create } from 'zustand';

export type DonationPromptMode = 'startup' | 'smart' | 'never';

interface DonationState {
  isOpen: boolean;
  promptMode: DonationPromptMode;
  launchCount: number;
  openDonationModal: () => void;
  closeDonationModal: () => void;
  setPromptMode: (mode: DonationPromptMode) => void;
  checkAutoPrompt: () => void;
}

const STORAGE_KEY_MODE = 'gringotts_donation_mode';
const STORAGE_KEY_LAUNCHES = 'gringotts_launch_count';

export const useDonationStore = create<DonationState>((set, get) => ({
  isOpen: false,
  promptMode: (localStorage.getItem(STORAGE_KEY_MODE) as DonationPromptMode) || 'smart',
  launchCount: parseInt(localStorage.getItem(STORAGE_KEY_LAUNCHES) || '0', 10),

  openDonationModal: () => set({ isOpen: true }),
  closeDonationModal: () => set({ isOpen: false }),

  setPromptMode: (mode: DonationPromptMode) => {
    localStorage.setItem(STORAGE_KEY_MODE, mode);
    set({ promptMode: mode });
  },

  checkAutoPrompt: () => {
    // Evita disparar mais de uma vez na mesma sessão
    if (sessionStorage.getItem('gringotts_session_prompted')) {
      return;
    }
    sessionStorage.setItem('gringotts_session_prompted', 'true');

    const currentLaunches = parseInt(localStorage.getItem(STORAGE_KEY_LAUNCHES) || '0', 10) + 1;
    localStorage.setItem(STORAGE_KEY_LAUNCHES, currentLaunches.toString());
    set({ launchCount: currentLaunches });

    const savedMode = (localStorage.getItem(STORAGE_KEY_MODE) as DonationPromptMode) || 'smart';

    // 1. Modo 'never': O usuário marcou para não exibir mais automaticamente
    if (savedMode === 'never') {
      return;
    }

    // 2. Modo 'smart': Gatilho inteligente (ex: na 3ª inicialização e a cada 5 depois)
    if (savedMode === 'smart') {
      if (currentLaunches === 3 || (currentLaunches > 3 && currentLaunches % 5 === 0)) {
        setTimeout(() => {
          set({ isOpen: true });
        }, 1200);
      }
      return;
    }

    // 3. Modo 'startup': Exibir ao abrir o app
    if (savedMode === 'startup') {
      setTimeout(() => {
        set({ isOpen: true });
      }, 1000);
    }
  },
}));
