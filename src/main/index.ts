import { app, BrowserWindow, globalShortcut } from 'electron';
import path from 'node:path';
import { runMigrations } from './services/db';
import { registerAllHandlers } from './ipc';
import { TransactionsRepository } from './repositories/transactionsRepository';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 650,
    backgroundColor: '#0f172a',
    title: 'Gringotts - Controle Financeiro',
    icon: path.join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const isDev = process.env.NODE_ENV === 'development' || (!app.isPackaged && process.env.NODE_ENV !== 'production');

  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load page:', errorCode, errorDescription, validatedURL);
  });

  win.webContents.on('console-message', (_event, _level, message, line, sourceId) => {
    console.log(`[Renderer]: ${message} (${sourceId}:${line})`);
  });

  if (isDev) {
    win.loadURL('http://localhost:5173').catch(() => {
      // Se o dev server local ainda não estiver respondendo na porta 5173, carrega arquivo compilado
      win.loadFile(path.join(__dirname, '../../renderer/dist/index.html'));
    });
  } else {
    win.loadFile(path.join(__dirname, '../../renderer/dist/index.html'));
  }

  // Register global shortcut for quick add (Ctrl+N or Cmd+N)
  try {
    globalShortcut.register('CommandOrControl+N', () => {
      win.webContents.send('open-quick-add-modal');
    });
  } catch (err) {
    console.warn('Failed to register global shortcut:', err);
  }

  return win;
}

app.whenReady().then(async () => {
  // Inicializa banco de dados e tabelas SQLite
  try {
    runMigrations();
    const txRepo = new TransactionsRepository();
    await txRepo.recalculateAllAccountBalances();
  } catch (err) {
    console.error('Migration/recalculate error:', err);
  }
  
  // Registra todos os handlers IPC seguros
  registerAllHandlers();
  
  // Cria a janela principal
  mainWindow = createWindow();

  mainWindow.on('closed', () => {
    mainWindow = null;
    globalShortcut.unregisterAll();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = createWindow();
  }
});
