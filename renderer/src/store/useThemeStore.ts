import { create } from 'zustand';
import { api } from '../lib/ipc';

export type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setTheme: (mode: ThemeMode) => void;
  initTheme: () => () => void;
}

const STORAGE_KEY = 'gringotts_theme_mode';

function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyThemeToDOM(resolved: 'light' | 'dark') {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  }
}

export const useThemeStore = create<ThemeState>((set, get) => {
  // Lê preferência inicial do localStorage ou adota 'system'
  const savedMode = (typeof window !== 'undefined' 
    ? (localStorage.getItem(STORAGE_KEY) as ThemeMode) 
    : null) || 'system';

  const initialSystemDark = getSystemPrefersDark();
  const initialResolved: 'light' | 'dark' = 
    savedMode === 'system' 
      ? (initialSystemDark ? 'dark' : 'light') 
      : savedMode;

  // Aplica imediatamente
  applyThemeToDOM(initialResolved);

  return {
    mode: savedMode,
    resolvedTheme: initialResolved,

    setTheme: (mode: ThemeMode) => {
      const isSystemDark = getSystemPrefersDark();
      const resolved: 'light' | 'dark' = 
        mode === 'system' 
          ? (isSystemDark ? 'dark' : 'light') 
          : mode;

      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, mode);
      }

      applyThemeToDOM(resolved);
      set({ mode, resolvedTheme: resolved });

      // Notifica o processo principal do Electron (nativeTheme)
      api.theme.set(mode).catch((err) => {
        console.warn('Falha ao atualizar nativeTheme do Electron:', err);
      });
    },

    initTheme: () => {
      const currentMode = get().mode;
      const isSystemDark = getSystemPrefersDark();
      const resolved: 'light' | 'dark' = 
        currentMode === 'system' 
          ? (isSystemDark ? 'dark' : 'light') 
          : currentMode;

      applyThemeToDOM(resolved);
      set({ resolvedTheme: resolved });

      // Sincroniza com Electron no boot
      api.theme.set(currentMode).catch(() => {});

      // Listener para alterações no tema do SO pelo navegador/webview
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleMediaChange = (e: MediaQueryListEvent) => {
        const activeMode = get().mode;
        if (activeMode === 'system') {
          const nextResolved = e.matches ? 'dark' : 'light';
          applyThemeToDOM(nextResolved);
          set({ resolvedTheme: nextResolved });
        }
      };

      mediaQuery.addEventListener('change', handleMediaChange);

      // Listener para evento nativo do Electron se disponível
      const unsubscribeIpc = api.on('native-theme-changed', (data: any) => {
        const activeMode = get().mode;
        if (activeMode === 'system' && data && typeof data.shouldUseDarkColors === 'boolean') {
          const nextResolved = data.shouldUseDarkColors ? 'dark' : 'light';
          applyThemeToDOM(nextResolved);
          set({ resolvedTheme: nextResolved });
        }
      });

      return () => {
        mediaQuery.removeEventListener('change', handleMediaChange);
        if (typeof unsubscribeIpc === 'function') {
          unsubscribeIpc();
        }
      };
    },
  };
});
