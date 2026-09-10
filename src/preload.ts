import { contextBridge, shell, ipcRenderer, dialog } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  openExternal: (url: string) => shell.openExternal(url),
  
  // Storage operations
  loadSettings: () => ipcRenderer.invoke('storage:load-settings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('storage:save-settings', settings),
  addEmulator: (emulator: any) => ipcRenderer.invoke('storage:add-emulator', emulator),
  updateEmulator: (id: string, updates: any) => ipcRenderer.invoke('storage:update-emulator', id, updates),
  removeEmulator: (id: string) => ipcRenderer.invoke('storage:remove-emulator', id),
  incrementLaunchCount: (id: string) => ipcRenderer.invoke('storage:increment-launch-count', id),
  
  // File operations
  showOpenDialog: (options: any) => ipcRenderer.invoke('dialog:show-open-dialog', options),
  
  // Process operations
  launchEmulator: (emulatorId: string, executablePath: string, args?: string, workingDirectory?: string) => 
    ipcRenderer.invoke('process:launch-emulator', emulatorId, executablePath, args, workingDirectory),
  isEmulatorRunning: (emulatorId: string) =>
    ipcRenderer.invoke('process:is-emulator-running', emulatorId),
  getRunningEmulators: () =>
    ipcRenderer.invoke('process:get-running-emulators'),
  onEmulatorStopped: (callback: (emulatorId: string) => void) =>
    ipcRenderer.on('emulator-stopped', (event, emulatorId) => callback(emulatorId)),
  
  // Icon operations
  extractIcon: (executablePath: string, emulatorId: string) =>
    ipcRenderer.invoke('icon:extract', executablePath, emulatorId),
  cleanupIcons: (activeEmulatorIds: string[]) =>
    ipcRenderer.invoke('icon:cleanup', activeEmulatorIds),

  // Update operations
  checkForUpdates: () => ipcRenderer.invoke('updater:check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('updater:download-update'),
  installUpdate: () => ipcRenderer.invoke('updater:install-update'),
  getVersion: () => ipcRenderer.invoke('updater:get-version'),

  // Update event listeners
  onUpdateAvailable: (callback: (info: any) => void) =>
    ipcRenderer.on('update-available', (event, info) => callback(info)),
  onUpdateNotAvailable: (callback: (info: any) => void) =>
    ipcRenderer.on('update-not-available', (event, info) => callback(info)),
  onDownloadProgress: (callback: (progress: any) => void) =>
    ipcRenderer.on('download-progress', (event, progress) => callback(progress)),
  onUpdateDownloaded: (callback: (info: any) => void) =>
    ipcRenderer.on('update-downloaded', (event, info) => callback(info)),
  // Fired once, just after launch, when this run is on a newer version than the
  // previous run (i.e. a silent update just applied).
  onAppUpdated: (callback: (version: string) => void) =>
    ipcRenderer.on('app-updated', (event, version) => callback(version))
});