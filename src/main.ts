import { app, BrowserWindow, Menu, ipcMain, dialog } from 'electron';
import { spawn } from 'child_process';
import * as path from 'path';
import { StorageService } from './storage';
import { IconService } from './icon-service';

let mainWindow: BrowserWindow;
let storageService: StorageService;
let iconService: IconService;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'Velocity Launcher',
    show: false,
    icon: path.join(__dirname, '../assets/icon.png')
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null as any;
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

function setupIpcHandlers(): void {
  // Storage handlers
  ipcMain.handle('storage:load-settings', () => {
    return storageService.loadSettings();
  });

  ipcMain.handle('storage:save-settings', (event, settings) => {
    return storageService.saveSettings(settings);
  });

  ipcMain.handle('storage:add-emulator', (event, emulator) => {
    return storageService.addEmulator(emulator);
  });

  ipcMain.handle('storage:update-emulator', (event, id, updates) => {
    return storageService.updateEmulator(id, updates);
  });

  ipcMain.handle('storage:remove-emulator', (event, id) => {
    return storageService.removeEmulator(id);
  });

  ipcMain.handle('storage:increment-launch-count', (event, id) => {
    return storageService.incrementLaunchCount(id);
  });

  // Dialog handlers
  ipcMain.handle('dialog:show-open-dialog', async (event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, options);
    return result;
  });

  // Process handlers
  ipcMain.handle('process:launch-emulator', async (event, executablePath, args, workingDirectory) => {
    try {
      const processArgs = args ? args.split(' ').filter((arg: string) => arg.trim()) : [];
      const options: any = {};
      
      if (workingDirectory) {
        options.cwd = workingDirectory;
      }

      const child = spawn(executablePath, processArgs, options);
      
      child.on('error', (error) => {
        console.error('Failed to launch emulator:', error);
        throw error;
      });

      return { success: true, pid: child.pid };
    } catch (error) {
      console.error('Error launching emulator:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Icon handlers
  ipcMain.handle('icon:extract', async (event, executablePath, emulatorId) => {
    try {
      const iconPath = await iconService.extractIcon(executablePath, emulatorId);
      return iconPath;
    } catch (error) {
      console.error('Error extracting icon:', error);
      return null;
    }
  });

  ipcMain.handle('icon:cleanup', async (event, activeEmulatorIds) => {
    try {
      await iconService.cleanupUnusedIcons(activeEmulatorIds);
      return true;
    } catch (error) {
      console.error('Error cleaning up icons:', error);
      return false;
    }
  });
}

app.whenReady().then(() => {
  storageService = new StorageService();
  iconService = new IconService();
  setupIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

Menu.setApplicationMenu(null);