import { app, BrowserWindow, Menu, ipcMain, dialog } from 'electron';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { StorageService } from './storage';
import { IconService } from './icon-service';

// Security validation functions
const isValidExecutablePath = (filePath: string): boolean => {
  try {
    // Check if path exists
    if (!fs.existsSync(filePath)) {
      return false;
    }

    // Check for valid executable extensions
    const allowedExtensions = ['.exe', '.msi', '.app'];
    const hasValidExtension = allowedExtensions.some(ext => 
      filePath.toLowerCase().endsWith(ext)
    );

    // Check for path traversal attempts
    const normalizedPath = path.normalize(filePath);
    const hasPathTraversal = normalizedPath.includes('..');

    // Check if it's actually a file (not directory)
    const stats = fs.statSync(filePath);
    const isFile = stats.isFile();

    return hasValidExtension && !hasPathTraversal && isFile;
  } catch (error) {
    return false;
  }
};

const sanitizeArguments = (args: string): string[] => {
  if (!args || typeof args !== 'string') {
    return [];
  }

  // Split arguments and filter out potentially dangerous ones
  return args
    .split(' ')
    .map(arg => arg.trim())
    .filter(arg => arg.length > 0)
    .filter(arg => {
      // Block shell metacharacters and dangerous patterns
      const dangerousPatterns = [
        /[;&|`$(){}[\]<>]/,  // Shell metacharacters
        /^-{1,2}exec/i,      // Execution flags
        /\.\.\//, /\.\.\\/, // Path traversal
        /cmd/i, /powershell/i, /bash/i, /sh$/i // Shell commands
      ];
      
      return !dangerousPatterns.some(pattern => pattern.test(arg));
    })
    .slice(0, 50); // Limit number of arguments
};

const isValidWorkingDirectory = (dirPath: string): boolean => {
  try {
    if (!dirPath || typeof dirPath !== 'string') {
      return true; // Allow empty/undefined working directory
    }

    // Check if directory exists
    if (!fs.existsSync(dirPath)) {
      return false;
    }

    // Check for path traversal
    const normalizedPath = path.normalize(dirPath);
    if (normalizedPath.includes('..')) {
      return false;
    }

    // Check if it's actually a directory
    const stats = fs.statSync(dirPath);
    return stats.isDirectory();
  } catch (error) {
    return false;
  }
};

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
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false // Keep false for now due to file:// protocol needs
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
      // Security validation
      if (!isValidExecutablePath(executablePath)) {
        throw new Error('Invalid executable path: Path does not exist, has invalid extension, or contains path traversal');
      }

      if (!isValidWorkingDirectory(workingDirectory)) {
        throw new Error('Invalid working directory: Directory does not exist or contains path traversal');
      }

      // Sanitize arguments
      const processArgs = sanitizeArguments(args);
      
      const options: any = {
        detached: false, // Prevent process from outliving parent
        stdio: ['ignore', 'ignore', 'ignore'] // Don't inherit stdio
      };
      
      if (workingDirectory) {
        options.cwd = workingDirectory;
      }

      console.log('Launching emulator:', {
        executable: executablePath,
        args: processArgs,
        workingDir: workingDirectory
      });

      const child = spawn(executablePath, processArgs, options);
      
      child.on('error', (error) => {
        console.error('Failed to launch emulator:', error);
        throw error;
      });

      // Add timeout to prevent indefinite hanging
      const timeout = setTimeout(() => {
        if (!child.killed) {
          console.log('Emulator launched successfully, pid:', child.pid);
        }
      }, 5000);

      child.on('spawn', () => {
        clearTimeout(timeout);
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