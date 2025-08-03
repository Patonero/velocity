/**
 * Unit tests for StorageService
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { StorageService } from '../storage';
import { EmulatorConfig, LauncherSettings } from '../types';

// Mock fs module
jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

// Mock app.getPath
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn((name: string) => {
      switch (name) {
        case 'userData':
          return '/mock/user/data';
        default:
          return '/mock/path';
      }
    })
  }
}));

describe('StorageService', () => {
  let storageService: StorageService;
  let mockSettings: LauncherSettings;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Default mock settings
    mockSettings = {
      emulators: [],
      theme: 'auto',
      gridSize: 'medium',
      sortBy: 'name',
      showDescriptions: true
    };

    // Mock fs.existsSync to return false initially (no config file)
    mockedFs.existsSync.mockReturnValue(false);
    
    // Mock fs.writeFileSync
    mockedFs.writeFileSync.mockImplementation(() => {});
    
    // Mock fs.readFileSync to return our mock settings
    mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockSettings));

    storageService = new StorageService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create config path correctly', () => {
      expect(storageService).toBeDefined();
    });

    it('should create default config if none exists', () => {
      mockedFs.existsSync.mockReturnValue(false);
      
      new StorageService();
      
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        '/mock/user/data/velocity-launcher-config.json',
        expect.stringContaining('"emulators":[]'),
        'utf-8'
      );
    });

    it('should not create config if it already exists', () => {
      mockedFs.existsSync.mockReturnValue(true);
      
      new StorageService();
      
      expect(mockedFs.writeFileSync).not.toHaveBeenCalled();
    });
  });

  describe('loadSettings', () => {
    it('should load settings from file', () => {
      const testSettings: LauncherSettings = {
        emulators: [{
          id: 'test-id',
          name: 'Test Emulator',
          executablePath: '/path/to/emulator.exe',
          platform: 'Windows',
          emulatorType: 'Nintendo 64',
          dateAdded: new Date('2024-01-01'),
          launchCount: 5
        }],
        theme: 'dark',
        gridSize: 'large',
        sortBy: 'launchCount',
        showDescriptions: false
      };

      mockedFs.readFileSync.mockReturnValue(JSON.stringify(testSettings));
      
      const result = storageService.loadSettings();
      
      expect(result.theme).toBe('dark');
      expect(result.emulators).toHaveLength(1);
      expect(result.emulators[0].name).toBe('Test Emulator');
      expect(result.emulators[0].dateAdded).toBeInstanceOf(Date);
    });

    it('should return default settings on file read error', () => {
      mockedFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });
      
      const result = storageService.loadSettings();
      
      expect(result.emulators).toEqual([]);
      expect(result.theme).toBe('auto');
      expect(result.gridSize).toBe('medium');
    });

    it('should convert date strings to Date objects', () => {
      const settingsWithDateStrings = {
        ...mockSettings,
        emulators: [{
          id: 'test-id',
          name: 'Test',
          executablePath: '/test.exe',
          platform: 'Windows',
          emulatorType: 'Test',
          dateAdded: '2024-01-01T00:00:00.000Z',
          lastLaunched: '2024-01-02T00:00:00.000Z',
          launchCount: 0
        }]
      };

      mockedFs.readFileSync.mockReturnValue(JSON.stringify(settingsWithDateStrings));
      
      const result = storageService.loadSettings();
      
      expect(result.emulators[0].dateAdded).toBeInstanceOf(Date);
      expect(result.emulators[0].lastLaunched).toBeInstanceOf(Date);
    });
  });

  describe('saveSettings', () => {
    it('should save settings to file', () => {
      const testSettings: LauncherSettings = {
        emulators: [],
        theme: 'dark',
        gridSize: 'small',
        sortBy: 'dateAdded',
        showDescriptions: true
      };
      
      storageService.saveSettings(testSettings);
      
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        '/mock/user/data/velocity-launcher-config.json',
        JSON.stringify(testSettings, null, 2),
        'utf-8'
      );
    });

    it('should throw error if write fails', () => {
      mockedFs.writeFileSync.mockImplementation(() => {
        throw new Error('Write failed');
      });
      
      expect(() => {
        storageService.saveSettings(mockSettings);
      }).toThrow('Write failed');
    });
  });

  describe('addEmulator', () => {
    const validEmulatorData = {
      name: 'Test Emulator',
      description: 'A test emulator',
      executablePath: '/path/to/test.exe',
      arguments: '--fullscreen',
      workingDirectory: '/path/to/dir',
      platform: 'Windows',
      emulatorType: 'Nintendo 64'
    };

    it('should add emulator with valid data', () => {
      const emulatorId = storageService.addEmulator(validEmulatorData);
      
      expect(emulatorId).toBeDefined();
      expect(typeof emulatorId).toBe('string');
      expect(emulatorId.length).toBeGreaterThan(0);
    });

    it('should generate unique IDs for multiple emulators', () => {
      const id1 = storageService.addEmulator(validEmulatorData);
      const id2 = storageService.addEmulator({ ...validEmulatorData, name: 'Second Emulator' });
      
      expect(id1).not.toBe(id2);
    });

    it('should sanitize string inputs', () => {
      const maliciousData = {
        ...validEmulatorData,
        name: 'Test<script>alert("xss")</script>',
        description: 'Description with "quotes" and <tags>',
        arguments: '--arg="value with quotes"'
      };
      
      const emulatorId = storageService.addEmulator(maliciousData);
      expect(emulatorId).toBeDefined();
    });

    it('should reject emulator with missing required fields', () => {
      expect(() => {
        storageService.addEmulator({
          name: '',
          executablePath: '/test.exe',
          platform: 'Windows',
          emulatorType: 'Test'
        } as any);
      }).toThrow('Invalid emulator data: validation failed');
    });

    it('should reject emulator with path traversal', () => {
      expect(() => {
        storageService.addEmulator({
          ...validEmulatorData,
          executablePath: '/path/../../../etc/passwd'
        });
      }).toThrow('Invalid emulator data: validation failed');
    });

    it('should reject emulator with excessively long name', () => {
      expect(() => {
        storageService.addEmulator({
          ...validEmulatorData,
          name: 'a'.repeat(101) // Over 100 character limit
        });
      }).toThrow('Invalid emulator data: validation failed');
    });
  });

  describe('updateEmulator', () => {
    let existingEmulatorId: string;

    beforeEach(() => {
      // Add an emulator to update
      existingEmulatorId = storageService.addEmulator({
        name: 'Original Emulator',
        executablePath: '/original.exe',
        platform: 'Windows',
        emulatorType: 'Nintendo 64'
      });
    });

    it('should update existing emulator', () => {
      const success = storageService.updateEmulator(existingEmulatorId, {
        name: 'Updated Emulator',
        description: 'Updated description'
      });
      
      expect(success).toBe(true);
    });

    it('should return false for non-existent emulator', () => {
      const success = storageService.updateEmulator('non-existent-id', {
        name: 'Updated Name'
      });
      
      expect(success).toBe(false);
    });

    it('should reject update with invalid name length', () => {
      const success = storageService.updateEmulator(existingEmulatorId, {
        name: 'a'.repeat(101)
      });
      
      expect(success).toBe(false);
    });

    it('should sanitize updated string values', () => {
      const success = storageService.updateEmulator(existingEmulatorId, {
        name: 'Name with <script>',
        description: 'Desc with "quotes"'
      });
      
      expect(success).toBe(true);
    });

    it('should allow updating all valid fields', () => {
      const success = storageService.updateEmulator(existingEmulatorId, {
        name: 'New Name',
        description: 'New description',
        arguments: '--new-args',
        executablePath: '/new/path.exe',
        workingDirectory: '/new/dir',
        iconPath: '/new/icon.png',
        emulatorType: 'PlayStation 2',
        platform: 'Windows',
        launchCount: 10,
        lastLaunched: new Date()
      });
      
      expect(success).toBe(true);
    });
  });

  describe('removeEmulator', () => {
    let existingEmulatorId: string;

    beforeEach(() => {
      existingEmulatorId = storageService.addEmulator({
        name: 'To Be Removed',
        executablePath: '/remove.exe',
        platform: 'Windows',
        emulatorType: 'Nintendo 64'
      });
    });

    it('should remove existing emulator', () => {
      const success = storageService.removeEmulator(existingEmulatorId);
      expect(success).toBe(true);
    });

    it('should return false for non-existent emulator', () => {
      const success = storageService.removeEmulator('non-existent-id');
      expect(success).toBe(false);
    });

    it('should remove emulator from settings', () => {
      storageService.removeEmulator(existingEmulatorId);
      const settings = storageService.loadSettings();
      
      expect(settings.emulators.find(e => e.id === existingEmulatorId)).toBeUndefined();
    });
  });

  describe('incrementLaunchCount', () => {
    let existingEmulatorId: string;

    beforeEach(() => {
      existingEmulatorId = storageService.addEmulator({
        name: 'Launch Test',
        executablePath: '/launch.exe',
        platform: 'Windows',
        emulatorType: 'Nintendo 64'
      });
    });

    it('should increment launch count and set last launched date', () => {
      const beforeTime = new Date();
      
      storageService.incrementLaunchCount(existingEmulatorId);
      
      const settings = storageService.loadSettings();
      const emulator = settings.emulators.find(e => e.id === existingEmulatorId);
      
      expect(emulator).toBeDefined();
      expect(emulator!.launchCount).toBe(1);
      expect(emulator!.lastLaunched).toBeInstanceOf(Date);
      expect(emulator!.lastLaunched!.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
    });

    it('should do nothing for non-existent emulator', () => {
      // Should not throw
      storageService.incrementLaunchCount('non-existent-id');
    });

    it('should increment count multiple times', () => {
      storageService.incrementLaunchCount(existingEmulatorId);
      storageService.incrementLaunchCount(existingEmulatorId);
      storageService.incrementLaunchCount(existingEmulatorId);
      
      const settings = storageService.loadSettings();
      const emulator = settings.emulators.find(e => e.id === existingEmulatorId);
      
      expect(emulator!.launchCount).toBe(3);
    });
  });

  describe('edge cases and security', () => {
    it('should handle malformed JSON gracefully', () => {
      mockedFs.readFileSync.mockReturnValue('invalid json{');
      
      const result = storageService.loadSettings();
      
      expect(result.emulators).toEqual([]);
      expect(result.theme).toBe('auto');
    });

    it('should handle extremely large emulator lists', () => {
      const largeEmulatorList = Array.from({ length: 1000 }, (_, i) => ({
        id: `emulator-${i}`,
        name: `Emulator ${i}`,
        executablePath: `/path/to/emulator-${i}.exe`,
        platform: 'Windows',
        emulatorType: 'Test',
        dateAdded: new Date(),
        launchCount: i
      }));

      const largeSettings: LauncherSettings = {
        ...mockSettings,
        emulators: largeEmulatorList
      };

      // Should not throw or hang
      expect(() => {
        storageService.saveSettings(largeSettings);
      }).not.toThrow();
    });

    it('should validate ID parameter for security', () => {
      // Test with various malicious IDs
      const maliciousIds = [
        '../../../etc/passwd',
        '<script>alert("xss")</script>',
        'id'.repeat(100), // Very long ID
        '',
        null as any,
        undefined as any
      ];

      maliciousIds.forEach(id => {
        expect(storageService.updateEmulator(id, { name: 'test' })).toBe(false);
        expect(() => storageService.incrementLaunchCount(id)).not.toThrow();
        expect(storageService.removeEmulator(id)).toBe(false);
      });
    });
  });
});