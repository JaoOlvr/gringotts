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
      version: app ? app.getVersion() : '1.5.0',
      platform: process.platform,
      arch: process.arch,
      isAppImage: !!process.env.APPIMAGE,
    };
  });

  // Iniciar download em segundo plano
  ipcMain.handle('updater:startDownload', async (_event, customUrl?: string) => {
    return await updaterService.startDownload(customUrl);
  });

  // Cancelar download em andamento
  ipcMain.handle('updater:cancelDownload', async () => {
    return updaterService.cancelDownload();
  });

  // Instalar atualização e reiniciar
  ipcMain.handle('updater:install', async () => {
    return await updaterService.installUpdate();
  });

  // Obter status do download local
  ipcMain.handle('updater:getDownloadStatus', async () => {
    return updaterService.getDownloadStatus();
  });
}
