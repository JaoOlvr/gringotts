import { ipcMain } from 'electron';
import { z } from 'zod';
import { p2pSyncService } from '../../services/p2pSync/p2pSyncService';

const startServerSchema = z.object({
  preferredPort: z.number().int().positive().optional(),
}).optional();

const connectAndSyncSchema = z.object({
  host: z.string().min(1, 'Host/IP é obrigatório'),
  port: z.number().int().positive('Porta inválida'),
  pairingCode: z.string().min(4, 'Código de pareamento é obrigatório'),
});

export function registerSyncHandlers() {
  ipcMain.handle('sync:getStatus', async () => {
    return p2pSyncService.getStatus();
  });

  ipcMain.handle('sync:startServer', async (_event, payload?: unknown) => {
    try {
      const parsed = startServerSchema.parse(payload);
      return await p2pSyncService.startServer(parsed?.preferredPort);
    } catch (error: any) {
      console.error('Erro ao iniciar servidor P2P:', error);
      throw new Error(error.message || 'Falha ao iniciar servidor de sincronização');
    }
  });

  ipcMain.handle('sync:stopServer', async () => {
    try {
      return await p2pSyncService.stopServer();
    } catch (error: any) {
      console.error('Erro ao parar servidor P2P:', error);
      throw new Error(error.message || 'Falha ao encerrar servidor de sincronização');
    }
  });

  ipcMain.handle('sync:connectAndSync', async (_event, payload: unknown) => {
    try {
      const { host, port, pairingCode } = connectAndSyncSchema.parse(payload);
      return await p2pSyncService.connectAndSync({ host, port, pairingCode });
    } catch (error: any) {
      console.error('Erro ao conectar e sincronizar P2P:', error);
      throw new Error(error.message || 'Falha ao sincronizar com o dispositivo');
    }
  });
}

