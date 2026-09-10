import { app, BrowserWindow, Menu, ipcMain, dialog } from "electron";
import { autoUpdater } from "electron-updater";
import log from "electron-log/main";
import { spawn } from "child_process";
import * as path from "path";
import * as fs from "fs";
import { StorageService } from "./storage";
import { IconService } from "./icon-service";
import { UpdateService } from "./update-service";
import { AppState, classifyLaunch, LaunchKind } from "./app-state";
import {
  isValidExecutablePath,
  sanitizeArguments,
  isValidWorkingDirectory,
} from "./security-utils";

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

// Window/taskbar icon. On Windows use the multi-resolution .ico so the taskbar
// can pick a crisp small size; other platforms use the square PNG.
const iconPath = path.join(
  __dirname,
  process.platform === "win32" ? "../assets/icon.ico" : "../assets/icon.png"
);

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let storageService: StorageService;
let iconService: IconService;
let updateService: UpdateService;
let appState: AppState;
let launchKind: LaunchKind = "normal";
const launchedProcesses = new Set<number>();
const runningEmulators = new Map<string, number>(); // emulatorId -> PID

// Send an update-lifecycle event to the main window only. The splash window is
// deliberately not a target - it is a pure branding screen now and never waits
// on or reacts to the updater (see createSplashWindow).
function sendToMainWindow(channel: string, ...args: any[]): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, ...args);
  }
}

// Configure auto-updater
if (process.env.NODE_ENV !== "development") {
  autoUpdater.logger = log;
  log.transports.file.level = "info";

  // Fully silent updates: download in the background as soon as one is found,
  // and fall back to installing on quit if the user never clicks "Restart".
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => {
    console.log("Checking for update...");
  });

  autoUpdater.on("update-available", (info) => {
    console.log("Update available:", info.version, "- downloading in background");
    sendToMainWindow("update-available", info);
  });

  autoUpdater.on("update-not-available", () => {
    console.log("Update not available");
    sendToMainWindow("update-not-available");
  });

  autoUpdater.on("error", (err) => {
    // Update failures must never reach the UI on their own. A failed background
    // check/download is a non-event for the user - they keep using the app and
    // we retry on the next launch. Only an install the user explicitly asked
    // for surfaces an error, and that is handled at the call site.
    console.error("Update error (suppressed from UI):", err);
  });

  autoUpdater.on("download-progress", (progressObj) => {
    const speedMB = (progressObj.bytesPerSecond / 1024 / 1024).toFixed(1);
    const totalMB = (progressObj.total / 1024 / 1024).toFixed(1);
    const transferredMB = (progressObj.transferred / 1024 / 1024).toFixed(1);

    console.log(
      `Update download: ${speedMB} MB/s - ${progressObj.percent.toFixed(1)}% (${transferredMB}/${totalMB} MB)`
    );

    sendToMainWindow("download-progress", {
      ...progressObj,
      isDelta: true,
      estimatedSavings:
        parseFloat(totalMB) < 50
          ? "85% smaller than full download"
          : "Differential patch",
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    console.log("Update downloaded:", info.version);
    sendToMainWindow("update-downloaded", info);
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
    icon: iconPath,
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
    icon: iconPath,
  });

  mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));

  mainWindow.once("ready-to-show", () => {
    // Hand off from the splash - the splash never blocked on anything, it was
    // just branding while this window loaded.
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
    }
    mainWindow?.show();

    // Tell the user we just self-updated (clean update -> restart -> "here's
    // what changed" flow, instead of the version silently changing).
    if (launchKind === "updated") {
      sendToMainWindow("app-updated", app.getVersion());
    }

    // Background update check - fully non-blocking, runs after the window is
    // already interactive. Any update found downloads silently and the renderer
    // gets an "update-downloaded" event when it is ready to install.
    if (process.env.NODE_ENV !== "development") {
      setTimeout(() => {
        const settings = storageService.loadSettings();
        if (settings.autoUpdateCheck !== false) {
          updateService?.backgroundUpdateCheck();
        }
      }, 2000);
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

    try {
      // Silent install, relaunch afterwards. This is the user explicitly
      // clicking "Restart" on the update-ready toast.
      autoUpdater.quitAndInstall(true, true);
      return { success: true };
    } catch (error) {
      console.error("Error installing update:", error);
      return { success: false, error: (error as Error).message };
    }
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
}

app.whenReady().then(() => {
  // Match the installed app's identity so Windows merges the running window with
  // the pinned/Start-Menu shortcut (shared taskbar button, correct icon,
  // working notifications). Must match the NSIS shortcut's AppUserModelID.
  if (process.platform === "win32") {
    app.setAppUserModelId("com.velocity.launcher");
  }

  storageService = new StorageService();
  iconService = new IconService();
  updateService = new UpdateService();

  // Recognise a just-happened self-update before we record the current version.
  appState = new AppState(app.getPath("userData"));
  launchKind = classifyLaunch(appState.readLastLaunchedVersion(), app.getVersion());
  appState.writeLastLaunchedVersion(app.getVersion());

  setupIpcHandlers();

  // Splash and main window come up together. The splash is only branding while
  // the main window loads - it never waits on the update check - and the main
  // window's ready-to-show closes it.
  createSplashWindow();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
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
