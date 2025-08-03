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
    ipcRenderer.invoke('icon:cleanup', activeEmulatorIds)
});