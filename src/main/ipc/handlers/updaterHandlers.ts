import { ipcMain, app } from 'electron';
import { updaterService } from '../../services/updaterService';

export function registerUpdaterHandlers() {
  // Checar atualizações
  ipcMain.handle('updater:check', async () => {
    return await updaterService.checkForUpdates();
  });

  // Abrir link de download ou release de forma segura
  ipcMain.handle('updater:openExternal', async (_event, url: string) => {
    return await updaterService.openExternalUrl(url);
  });

  // Obter versão e plataforma do app
  ipcMain.handle('updater:getAppInfo', async () => {
    return {
      version: app ? app.getVersion() : '1.0.0',
      platform: process.platform,
      arch: process.arch,
    };
  });
}
