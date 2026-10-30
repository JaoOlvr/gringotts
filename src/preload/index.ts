import { contextBridge, ipcRenderer } from 'electron';
import { z } from 'zod';

// Define the API shape with Zod for validation (we'll use it in main later)
const api = {
  // Example method: will be implemented in main
  invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),
  // For sending messages (if needed)
  send: (channel: string, ...args: unknown[]) => ipcRenderer.send(channel, ...args),
  // For receiving (renderer can listen)
  on: (channel: string, func: (...args: unknown[]) => void) => {
    const subscription = (_event: unknown, ...args: unknown[]) => func(...args);
    ipcRenderer.on(channel, subscription);
    return () => ipcRenderer.removeListener(channel, subscription);
  },
  // Remove listener
  off: (channel: string, func: (...args: unknown[]) => void) => {
    ipcRenderer.removeListener(channel, func);
  },
};

// Expose to the world
contextBridge.exposeInMainWorld('api', api);
