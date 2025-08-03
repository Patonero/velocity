/**
 * Jest setup file for Velocity Launcher tests
 */

import { jest } from '@jest/globals';

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