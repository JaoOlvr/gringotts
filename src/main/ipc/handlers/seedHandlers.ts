import { ipcMain } from 'electron';
import { populateRealisticSeedData } from '../../services/seedService';

export function registerSeedHandlers() {
  ipcMain.handle('seed:load', async () => {
    return await populateRealisticSeedData();
  });
}
