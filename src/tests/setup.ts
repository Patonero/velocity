/**
 * Jest setup file for Velocity Launcher tests
 */

import { jest } from '@jest/globals';

// Mock Electron APIs globally
jest.mock('electron', () => require('./__mocks__/electron'));

// Mock Node.js modules
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  unlinkSync: jest.fn(),
  readdirSync: jest.fn(() => []),
  statSync: jest.fn(() => ({
    isFile: () => true,
    isDirectory: () => false
  })),
}));

jest.mock('path', () => ({
  join: jest.fn((...args: string[]) => {
    // For storage tests, return expected Windows-style path format
    if (args.includes('/mock/user/data') && args.includes('velocity-launcher-config.json')) {
      return '/mock/user/data/velocity-launcher-config.json';
    }
    return args.join('/');
  }),
  dirname: jest.fn((path: string) => path.split('/').slice(0, -1).join('/')),
  basename: jest.fn((path: string) => path.split('/').pop() || ''),
  extname: jest.fn((path: string) => {
    const parts = path.split('.');
    return parts.length > 1 ? '.' + parts.pop() : '';
  }),
  resolve: jest.fn((...args: string[]) => '/' + args.join('/').replace(/\/+/g, '/')),
}));

jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));

// Mock global objects that might be used in tests
global.console = {
  ...console,
  // Suppress console.log in tests unless needed
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock DOM globals for renderer tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock window.electronAPI for renderer tests
Object.defineProperty(window, 'electronAPI', {
  value: {
    loadSettings: jest.fn(),
    saveSettings: jest.fn(),
    addEmulator: jest.fn(),
    updateEmulator: jest.fn(),
    removeEmulator: jest.fn(),
    incrementLaunchCount: jest.fn(),
    showOpenDialog: jest.fn(),
    launchEmulator: jest.fn(),
    extractIcon: jest.fn(),
    cleanupIcons: jest.fn(),
  }
});

// Helper to restore all mocks
(global as any).restoreAllMocks = () => {
  jest.restoreAllMocks();
};