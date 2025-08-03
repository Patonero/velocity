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
  launchEmulator: (executablePath: string, args?: string, workingDirectory?: string) => 
    ipcRenderer.invoke('process:launch-emulator', executablePath, args, workingDirectory)
});