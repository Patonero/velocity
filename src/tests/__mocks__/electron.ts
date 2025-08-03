/**
 * Mock Electron APIs for testing
 */

import { jest } from '@jest/globals';

export const app = {
  getPath: jest.fn((name: string) => {
    switch (name) {
      case 'userData':
        return '/mock/user/data';
      case 'home':
        return '/mock/home';
      default:
        return '/mock/path';
    }
  }),
  whenReady: jest.fn(() => Promise.resolve()),
  on: jest.fn(),
  quit: jest.fn(),
};

export const BrowserWindow = jest.fn().mockImplementation(() => ({
  loadFile: jest.fn(),
  on: jest.fn(),
  once: jest.fn(),
  show: jest.fn(),
  webContents: {
    openDevTools: jest.fn(),
  },
}));

export const ipcMain = {
  handle: jest.fn(),
  on: jest.fn(),
  removeHandler: jest.fn(),
};

export const ipcRenderer = {
  invoke: jest.fn(),
  on: jest.fn(),
  removeAllListeners: jest.fn(),
};

export const contextBridge = {
  exposeInMainWorld: jest.fn(),
};

export const shell = {
  openExternal: jest.fn(),
};

export const dialog = {
  showOpenDialog: jest.fn(),
  showSaveDialog: jest.fn(),
  showMessageBox: jest.fn(),
};

export const Menu = {
  setApplicationMenu: jest.fn(),
  buildFromTemplate: jest.fn(),
};

export const getAllWindows = jest.fn(() => []);

// Mock spawn for child_process
export const spawn = jest.fn(() => ({
  on: jest.fn(),
  stdout: {
    on: jest.fn(),
  },
  stderr: {
    on: jest.fn(),
  },
  kill: jest.fn(),
  killed: false,
  pid: 12345,
}));