import { contextBridge, ipcRenderer } from "electron";

// The splash is a pure branding screen shown while the main window loads. It
// does no update work - that all happens in the main window now - so it only
// needs the current version to display.
contextBridge.exposeInMainWorld("splashAPI", {
  getCurrentVersion: () => ipcRenderer.invoke("updater:get-version"),
});
