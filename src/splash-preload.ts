import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("splashAPI", {
  // Get current app version
  getCurrentVersion: () => ipcRenderer.invoke("updater:get-version"),

  // Update operations
  checkForUpdates: () => ipcRenderer.invoke("updater:check-for-updates"),
  downloadUpdate: () => ipcRenderer.invoke("updater:download-update"),
  installUpdate: () => ipcRenderer.invoke("updater:install-update"),

  // Window operations
  openMainWindow: () => ipcRenderer.invoke("splash:open-main-window"),

  // Update event listeners
  onUpdateAvailable: (callback: (info: any) => void) =>
    ipcRenderer.on("update-available", (event, info) => callback(info)),
  onUpdateNotAvailable: (callback: (info: any) => void) =>
    ipcRenderer.on("update-not-available", (event, info) => callback(info)),
  onUpdateError: (callback: (error: string) => void) =>
    ipcRenderer.on("update-error", (event, error) => callback(error)),
  onDownloadProgress: (callback: (progress: any) => void) =>
    ipcRenderer.on("download-progress", (event, progress) =>
      callback(progress)
    ),
  onUpdateDownloaded: (callback: (info: any) => void) =>
    ipcRenderer.on("update-downloaded", (event, info) => callback(info)),
  onOpenMainWindow: (callback: () => void) =>
    ipcRenderer.on("open-main-window", () => callback()),
});
