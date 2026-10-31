import { ipcMain, nativeTheme, BrowserWindow } from 'electron';

export type ThemeSource = 'system' | 'light' | 'dark';

export function registerThemeHandlers() {
  // Obter configuração de tema atual
  ipcMain.handle('theme:get', () => {
    return {
      themeSource: nativeTheme.themeSource as ThemeSource,
      shouldUseDarkColors: nativeTheme.shouldUseDarkColors,
    };
  });

  // Alterar preferência de tema
  ipcMain.handle('theme:set', (_event, mode: ThemeSource) => {
    if (mode === 'system' || mode === 'light' || mode === 'dark') {
      nativeTheme.themeSource = mode;
    }
    return {
      themeSource: nativeTheme.themeSource as ThemeSource,
      shouldUseDarkColors: nativeTheme.shouldUseDarkColors,
    };
  });

  // Notificar janelas se o tema do SO mudar (especialmente no modo 'system')
  nativeTheme.on('updated', () => {
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.webContents.send('native-theme-changed', {
          themeSource: nativeTheme.themeSource,
          shouldUseDarkColors: nativeTheme.shouldUseDarkColors,
        });
      }
    }
  });
}
