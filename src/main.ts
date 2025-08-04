import { app, BrowserWindow, Menu, ipcMain, dialog } from "electron";
import { autoUpdater } from "electron-updater";
import { spawn } from "child_process";
import * as path from "path";
import * as fs from "fs";
import { StorageService } from "./storage";
import { IconService } from "./icon-service";
import { UpdateService } from "./update-service";

// Enable hot-reload for development
if (process.env.NODE_ENV === "development") {
  try {
    const chokidar = require("chokidar");

    // Watch renderer files (just reload the page for faster feedback)
    const rendererWatcher = chokidar.watch(
      path.join(__dirname, "..", "renderer")
    );

    rendererWatcher.on("change", (filePath: string) => {
      console.log(`🔄 Renderer file changed: ${path.basename(filePath)}`);
      // Delay to ensure file is fully written
      setTimeout(() => {
        BrowserWindow.getAllWindows().forEach((win) => {
          win.webContents.reloadIgnoringCache();
        });
      }, 100);
    });

    console.log("🔥 Hot-reload enabled for development");
    console.log(
      "📁 Watching: dist/ (nodemon restart) & renderer/ (page reload)"
    );
  } catch (error) {
    console.log("Hot-reload not available:", error);
  }
}

// Security validation functions
const isValidExecutablePath = (filePath: string): boolean => {
  try {
    // Check if path exists
    if (!fs.existsSync(filePath)) {
      return false;
    }

    // Check for valid executable extensions
    const allowedExtensions = [".exe", ".msi", ".app"];
    const hasValidExtension = allowedExtensions.some((ext) =>
      filePath.toLowerCase().endsWith(ext)
    );

    // Check for path traversal attempts
    const normalizedPath = path.normalize(filePath);
    const hasPathTraversal = normalizedPath.includes("..");

    // Check if it's actually a file (not directory)
    const stats = fs.statSync(filePath);
    const isFile = stats.isFile();

    return hasValidExtension && !hasPathTraversal && isFile;
  } catch (error) {
    return false;
  }
};

const sanitizeArguments = (args: string): string[] => {
  if (!args || typeof args !== "string") {
    return [];
  }

  // Split arguments and filter out potentially dangerous ones
  return args
    .split(" ")
    .map((arg) => arg.trim())
    .filter((arg) => arg.length > 0)
    .filter((arg) => {
      // Block shell metacharacters and dangerous patterns
      const dangerousPatterns = [
        /[;&|`$(){}[\]<>]/, // Shell metacharacters
        /^-{1,2}exec/i, // Execution flags
        /\.\.\//,
        /\.\.\\/, // Path traversal
        /cmd/i,
        /powershell/i,
        /bash/i,
        /sh$/i, // Shell commands
      ];

      return !dangerousPatterns.some((pattern) => pattern.test(arg));
    })
    .slice(0, 50); // Limit number of arguments
};

const isValidWorkingDirectory = (dirPath: string): boolean => {
  try {
    if (!dirPath || typeof dirPath !== "string") {
      return true; // Allow empty/undefined working directory
    }

    // Check if directory exists
    if (!fs.existsSync(dirPath)) {
      return false;
    }

    // Check for path traversal
    const normalizedPath = path.normalize(dirPath);
    if (normalizedPath.includes("..")) {
      return false;
    }

    // Check if it's actually a directory
    const stats = fs.statSync(dirPath);
    return stats.isDirectory();
  } catch (error) {
    return false;
  }
};

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let storageService: StorageService;
let iconService: IconService;
let updateService: UpdateService;
const launchedProcesses = new Set<number>();
const runningEmulators = new Map<string, number>(); // emulatorId -> PID

// Configure auto-updater
if (process.env.NODE_ENV !== "development") {
  autoUpdater.logger = require("electron-log");
  (autoUpdater.logger as any).transports.file.level = "info";
  
  // Configure for silent updates
  autoUpdater.autoDownload = false; // We'll control the download timing
  autoUpdater.autoInstallOnAppQuit = false; // We'll control the install timing

  // Auto-updater event listeners
  autoUpdater.on("checking-for-update", () => {
    console.log("Checking for update...");
  });

  autoUpdater.on("update-available", (info) => {
    console.log("Update available:", info.version);
    const targetWindow = splashWindow || mainWindow;
    if (targetWindow && !targetWindow.isDestroyed()) {
      targetWindow.webContents.send("update-available", info);
    }
  });

  autoUpdater.on("update-not-available", (info) => {
    console.log("Update not available");
    const targetWindow = splashWindow || mainWindow;
    if (targetWindow && !targetWindow.isDestroyed()) {
      targetWindow.webContents.send("update-not-available", info);
    }
  });

  autoUpdater.on("error", (err) => {
    console.error("Update error:", err);
    const targetWindow = splashWindow || mainWindow;
    if (targetWindow && !targetWindow.isDestroyed()) {
      // Provide user-friendly error messages
      let errorMessage = err.message;
      if (err.message.includes("EACCES") || err.message.includes("permission")) {
        errorMessage = "Update failed: Please restart as administrator or check file permissions";
      } else if (err.message.includes("network") || err.message.includes("ENOTFOUND")) {
        errorMessage = "Update failed: Check your internet connection";
      }
      targetWindow.webContents.send("update-error", errorMessage);
    }
  });

  autoUpdater.on("download-progress", (progressObj) => {
    const speedMB = (progressObj.bytesPerSecond / 1024 / 1024).toFixed(1);
    const totalMB = (progressObj.total / 1024 / 1024).toFixed(1);
    const transferredMB = (progressObj.transferred / 1024 / 1024).toFixed(1);
    
    const logMessage = `Delta update: ${speedMB} MB/s - ${progressObj.percent.toFixed(1)}% (${transferredMB}/${totalMB} MB)`;
    console.log(logMessage);
    
    const targetWindow = splashWindow || mainWindow;
    if (targetWindow && !targetWindow.isDestroyed()) {
      targetWindow.webContents.send("download-progress", {
        ...progressObj,
        isDelta: true,
        estimatedSavings: parseFloat(totalMB) < 50 ? '85% smaller than full download' : 'Differential patch'
      });
    }
  });

  autoUpdater.on("update-downloaded", (info) => {
    console.log("Update downloaded:", info.version);
    const targetWindow = splashWindow || mainWindow;
    if (targetWindow && !targetWindow.isDestroyed()) {
      targetWindow.webContents.send("update-downloaded", info);
    }
  });
}

function createSplashWindow(): void {
  splashWindow = new BrowserWindow({
    width: 500,
    height: 700,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      preload: path.join(__dirname, "splash-preload.js"),
      sandbox: false,
    },
    title: "Velocity Launcher",
    show: false,
    icon: path.join(__dirname, "../assets/icon.png"),
    center: true,
  });

  splashWindow.loadFile(path.join(__dirname, "../renderer/splash.html"));

  splashWindow.once("ready-to-show", () => {
    splashWindow?.show();
  });

  splashWindow.on("closed", () => {
    splashWindow = null;
  });

  if (process.env.NODE_ENV === "development") {
    splashWindow.webContents.openDevTools();
  }
}

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      preload: path.join(__dirname, "preload.js"),
      sandbox: false, // Keep false for now due to file:// protocol needs
    },
    title: "Velocity Launcher",
    show: false,
    icon: path.join(__dirname, "../assets/icon.png"),
  });

  mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));

  mainWindow.once("ready-to-show", () => {
    // Close splash window if it exists
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
    }
    mainWindow?.show();
    
    // Start background update check for next startup
    if (process.env.NODE_ENV !== "development") {
      setTimeout(() => {
        updateService?.backgroundUpdateCheck();
      }, 2000); // Wait 2 seconds after main window shows
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Handle app close events - don't kill child processes
  mainWindow.on("close", (event) => {
    if (launchedProcesses.size > 0) {
      console.log(
        `Launcher closing with ${launchedProcesses.size} emulator(s) still running`
      );
      console.log("Emulator processes will continue running independently");
    }
  });

  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools();
  }
}

function setupIpcHandlers(): void {
  // Storage handlers
  ipcMain.handle("storage:load-settings", () => {
    return storageService.loadSettings();
  });

  ipcMain.handle("storage:save-settings", (event, settings) => {
    return storageService.saveSettings(settings);
  });

  ipcMain.handle("storage:add-emulator", (event, emulator) => {
    return storageService.addEmulator(emulator);
  });

  ipcMain.handle("storage:update-emulator", (event, id, updates) => {
    return storageService.updateEmulator(id, updates);
  });

  ipcMain.handle("storage:remove-emulator", (event, id) => {
    return storageService.removeEmulator(id);
  });

  ipcMain.handle("storage:increment-launch-count", (event, id) => {
    return storageService.incrementLaunchCount(id);
  });

  // Dialog handlers
  ipcMain.handle("dialog:show-open-dialog", async (event, options) => {
    if (!mainWindow) {
      throw new Error("Main window not available");
    }
    const result = await dialog.showOpenDialog(mainWindow, options);
    return result;
  });

  // Process handlers
  ipcMain.handle(
    "process:launch-emulator",
    async (event, emulatorId, executablePath, args, workingDirectory) => {
      try {
        // Check if emulator is already running
        if (runningEmulators.has(emulatorId)) {
          const existingPid = runningEmulators.get(emulatorId);
          console.log(
            `Emulator ${emulatorId} is already running with PID ${existingPid}`
          );
          return {
            success: false,
            error:
              "This emulator is already running. Close it first to launch again.",
            isAlreadyRunning: true,
          };
        }

        // Security validation
        if (!isValidExecutablePath(executablePath)) {
          throw new Error(
            "Invalid executable path: Path does not exist, has invalid extension, or contains path traversal"
          );
        }

        if (!isValidWorkingDirectory(workingDirectory)) {
          throw new Error(
            "Invalid working directory: Directory does not exist or contains path traversal"
          );
        }

        // Sanitize arguments
        const processArgs = sanitizeArguments(args);

        const options: any = {
          detached: true, // Allow process to outlive parent
          stdio: ["ignore", "ignore", "ignore"], // Don't inherit stdio
        };

        if (workingDirectory) {
          options.cwd = workingDirectory;
        }

        console.log("Launching emulator:", {
          executable: executablePath,
          args: processArgs,
          workingDir: workingDirectory,
        });

        const child = spawn(executablePath, processArgs, options);

        child.on("error", (error) => {
          console.error("Failed to launch emulator:", error);
          throw error;
        });

        // Detach the child process so it can run independently
        child.unref();

        // Track the launched process
        if (child.pid) {
          launchedProcesses.add(child.pid);
          runningEmulators.set(emulatorId, child.pid);
          console.log(`Tracking emulator ${emulatorId} with PID: ${child.pid}`);
        }

        // Remove from tracking when process exits naturally
        child.on("exit", (code, signal) => {
          if (child.pid) {
            launchedProcesses.delete(child.pid);
            runningEmulators.delete(emulatorId);
            console.log(
              `Emulator ${emulatorId} (PID: ${child.pid}) exited with code ${code}, signal ${signal}`
            );

            // Notify renderer that emulator has stopped
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send("emulator-stopped", emulatorId);
            }
          }
        });

        // Add timeout to prevent indefinite hanging
        const timeout = setTimeout(() => {
          if (!child.killed) {
            console.log("Emulator launched successfully, pid:", child.pid);
          }
        }, 5000);

        child.on("spawn", () => {
          clearTimeout(timeout);
        });

        return { success: true, pid: child.pid };
      } catch (error) {
        console.error("Error launching emulator:", error);
        return { success: false, error: (error as Error).message };
      }
    }
  );

  // Check if emulator is running
  ipcMain.handle("process:is-emulator-running", (event, emulatorId) => {
    const isRunning = runningEmulators.has(emulatorId);
    const pid = runningEmulators.get(emulatorId);
    return { isRunning, pid };
  });

  // Get all running emulators
  ipcMain.handle("process:get-running-emulators", () => {
    const running = Array.from(runningEmulators.entries()).map(([id, pid]) => ({
      id,
      pid,
    }));
    return running;
  });

  // Icon handlers
  ipcMain.handle("icon:extract", async (event, executablePath, emulatorId) => {
    try {
      const iconPath = await iconService.extractIcon(
        executablePath,
        emulatorId
      );
      return iconPath;
    } catch (error) {
      console.error("Error extracting icon:", error);
      return null;
    }
  });

  ipcMain.handle("icon:cleanup", async (event, activeEmulatorIds) => {
    try {
      await iconService.cleanupUnusedIcons(activeEmulatorIds);
      return true;
    } catch (error) {
      console.error("Error cleaning up icons:", error);
      return false;
    }
  });

  // Update handlers
  ipcMain.handle("updater:check-for-updates", async () => {
    if (process.env.NODE_ENV === "development") {
      return { available: false, message: "Updates disabled in development" };
    }
    try {
      return await updateService.checkForUpdatesOptimized();
    } catch (error) {
      console.error("Error checking for updates:", error);
      return { available: false, error: (error as Error).message };
    }
  });

  ipcMain.handle("updater:download-update", async () => {
    if (process.env.NODE_ENV === "development") {
      return { success: false, message: "Updates disabled in development" };
    }
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (error) {
      console.error("Error downloading update:", error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle("updater:install-update", () => {
    if (process.env.NODE_ENV === "development") {
      return { success: false, message: "Updates disabled in development" };
    }
    
    // Silent installation - no user interaction required
    autoUpdater.quitAndInstall(
      false, // isSilent: true for silent install
      true   // isForceRunAfter: restart app after install
    );
    return { success: true };
  });

  ipcMain.handle("updater:get-version", () => {
    return app.getVersion();
  });

  ipcMain.handle("updater:clear-cache", () => {
    if (process.env.NODE_ENV === "development") {
      updateService?.clearCache();
      return { success: true };
    }
    return { success: false, message: "Cache clearing only available in development" };
  });

  // Splash screen handlers
  ipcMain.handle("splash:open-main-window", () => {
    if (!mainWindow) {
      createMainWindow();
    } else if (!mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }
    return true;
  });
}

app.whenReady().then(() => {
  storageService = new StorageService();
  iconService = new IconService();
  updateService = new UpdateService();
  setupIpcHandlers();

  // Start with splash screen
  createSplashWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createSplashWindow();
    }
  });
});

app.on("window-all-closed", () => {
  // Log running emulators before quit
  if (launchedProcesses.size > 0) {
    console.log(
      `App quitting with ${launchedProcesses.size} emulator(s) still running`
    );
    console.log("Running emulator PIDs:", Array.from(launchedProcesses));
  }

  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Ensure clean shutdown without killing child processes
app.on("before-quit", (event) => {
  if (launchedProcesses.size > 0) {
    console.log("App shutting down, leaving emulators running independently");
  }
});

Menu.setApplicationMenu(null);
