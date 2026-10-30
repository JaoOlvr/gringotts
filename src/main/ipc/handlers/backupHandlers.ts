import { ipcMain } from 'electron';
import { z } from 'zod';
import { backupService } from '../../services/backup';

// Define Zod schemas for validation
const backupOptionsSchema = z.object({
  encrypt: z.boolean().default(false),
  password: z.string().optional().nullable(),
});

const restoreOptionsSchema = z.object({
  encrypt: z.boolean().default(false),
  password: z.string().optional().nullable(),
});

// Handler functions
export function registerBackupHandlers() {
  // Create backup
  ipcMain.handle('backup:create', async (event, options: unknown) => {
    // Validate input
    const parsed = backupOptionsSchema.parse(options);
    const backupPath = await backupService.createBackup(parsed);
    return { success: true, backupPath };
  });

  // Restore backup
  ipcMain.handle('backup:restore', async (event, { backupPath, options }: { backupPath: string; options: unknown }) => {
    // Validate input
    const parsed = restoreOptionsSchema.parse(options);
    const success = await backupService.restoreBackup(backupPath, parsed);
    return { success };
  });

  // List backups
  ipcMain.handle('backup:list', async () => {
    const backups = backupService.listBackups();
    return { success: true, backups };
  });

  // Delete backup
  ipcMain.handle('backup:delete', async (event, backupPath: string) => {
    const success = backupService.deleteBackup(backupPath);
    return { success };
  });
}
