/**
 * Unit tests for IconService
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { IconService } from '../icon-service';

// Mock modules
jest.mock('fs');
jest.mock('child_process');
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/mock/user/data')
  }
}));

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedSpawn = spawn as jest.MockedFunction<typeof spawn>;

// Mock EventEmitter for child process
class MockChildProcess {
  stdout = { on: jest.fn() };
  stderr = { on: jest.fn() };
  on = jest.fn();
  kill = jest.fn();
  killed = false;
  pid = 12345;
}

describe('IconService', () => {
  let iconService: IconService;
  let mockChildProcess: MockChildProcess;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock fs methods
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.mkdirSync.mockImplementation(() => {});
    mockedFs.writeFileSync.mockImplementation(() => {});
    mockedFs.unlinkSync.mockImplementation(() => {});
    mockedFs.statSync.mockReturnValue({
      isFile: () => true,
      isDirectory: () => false
    } as any);
    mockedFs.readdirSync.mockReturnValue([]);

    // Mock spawn
    mockChildProcess = new MockChildProcess();
    mockedSpawn.mockReturnValue(mockChildProcess as any);

    iconService = new IconService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create icons directory if it does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);
      
      new IconService();
      
      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(
        '/mock/user/data/icons',
        { recursive: true }
      );
    });

    it('should not create icons directory if it exists', () => {
      mockedFs.existsSync.mockReturnValue(true);
      
      new IconService();
      
      expect(mockedFs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('extractIcon', () => {
    const validExecutablePath = 'C:\\Windows\\System32\\notepad.exe';
    const validEmulatorId = 'test-emulator-123';

    beforeEach(() => {
      // Mock path validation - file exists and is valid
      mockedFs.existsSync.mockImplementation((path) => {
        if (typeof path === 'string' && path.includes('notepad.exe')) {
          return true;
        }
        if (typeof path === 'string' && path.includes('.png')) {
          return false; // Icon doesn't exist yet
        }
        return false;
      });
    });

    it('should return null for invalid executable path', async () => {
      const result = await iconService.extractIcon('/invalid/path.exe', validEmulatorId);
      expect(result).toBeNull();
    });

    it('should return null for invalid emulator ID', async () => {
      const result = await iconService.extractIcon(validExecutablePath, '');
      expect(result).toBeNull();
    });

    it('should sanitize emulator ID', async () => {
      const maliciousId = 'test<script>alert("xss")</script>';
      
      // Simulate successful PowerShell execution
      setTimeout(() => {
        const closeCallback = mockChildProcess.on.mock.calls.find(call => call[0] === 'close')?.[1];
        if (closeCallback) closeCallback(0);
      }, 10);

      mockedFs.existsSync.mockImplementation((path) => {
        if (typeof path === 'string' && path.includes('notepad.exe')) return true;
        if (typeof path === 'string' && path.includes('testscriptalertxssscript.png')) return true;
        return false;
      });

      const result = await iconService.extractIcon(validExecutablePath, maliciousId);
      
      expect(result).toContain('testscriptalertxssscript.png');
    });

    it('should return existing icon if already extracted', async () => {
      const expectedIconPath = '/mock/user/data/icons/test-emulator-123.png';
      
      mockedFs.existsSync.mockImplementation((path) => {
        if (typeof path === 'string' && path.includes('notepad.exe')) return true;
        if (typeof path === 'string' && path.includes('test-emulator-123.png')) return true;
        return false;
      });

      const result = await iconService.extractIcon(validExecutablePath, validEmulatorId);
      
      expect(result).toBe(expectedIconPath);
      expect(mockedSpawn).not.toHaveBeenCalled();
    });

    it('should extract icon using PowerShell', async () => {
      // Simulate successful PowerShell execution
      setTimeout(() => {
        const closeCallback = mockChildProcess.on.mock.calls.find(call => call[0] === 'close')?.[1];
        if (closeCallback) closeCallback(0);
      }, 10);

      // Mock icon file exists after extraction
      mockedFs.existsSync.mockImplementation((path) => {
        if (typeof path === 'string' && path.includes('notepad.exe')) return true;
        if (typeof path === 'string' && path.includes('.png')) {
          // First call (checking if exists): false, second call (after extraction): true
          const callCount = mockedFs.existsSync.mock.calls.length;
          return callCount > 3; // After several calls, icon exists
        }
        return false;
      });

      const result = await iconService.extractIcon(validExecutablePath, validEmulatorId);
      
      expect(mockedSpawn).toHaveBeenCalledWith(
        'powershell.exe',
        expect.arrayContaining([
          '-NoProfile',
          '-ExecutionPolicy', 'Bypass',
          '-File', expect.stringContaining('extract-icon.ps1'),
          '-InputPath', validExecutablePath,
          '-OutputPath', expect.stringContaining('test-emulator-123.png')
        ]),
        expect.objectContaining({
          windowsHide: true,
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 30000
        })
      );
      
      expect(result).toContain('test-emulator-123.png');
    });

    it('should handle PowerShell execution failure', async () => {
      // Simulate PowerShell failure
      setTimeout(() => {
        const closeCallback = mockChildProcess.on.mock.calls.find(call => call[0] === 'close')?.[1];
        if (closeCallback) closeCallback(1); // Exit code 1
      }, 10);

      const result = await iconService.extractIcon(validExecutablePath, validEmulatorId);
      
      expect(result).toBeNull();
    });

    it('should handle PowerShell timeout', async () => {
      // Don't call the close callback to simulate hanging
      
      const result = await iconService.extractIcon(validExecutablePath, validEmulatorId);
      
      expect(result).toBeNull();
    }, 35000); // Longer timeout for this test

    it('should clean up script file after execution', async () => {
      // Simulate successful execution
      setTimeout(() => {
        const closeCallback = mockChildProcess.on.mock.calls.find(call => call[0] === 'close')?.[1];
        if (closeCallback) closeCallback(0);
      }, 10);

      await iconService.extractIcon(validExecutablePath, validEmulatorId);
      
      expect(mockedFs.unlinkSync).toHaveBeenCalledWith(
        expect.stringContaining('extract-icon.ps1')
      );
    });

    it('should handle script cleanup failure gracefully', async () => {
      mockedFs.unlinkSync.mockImplementation(() => {
        throw new Error('Cleanup failed');
      });

      setTimeout(() => {
        const closeCallback = mockChildProcess.on.mock.calls.find(call => call[0] === 'close')?.[1];
        if (closeCallback) closeCallback(0);
      }, 10);

      // Should not throw despite cleanup failure
      const result = await iconService.extractIcon(validExecutablePath, validEmulatorId);
      expect(result).toBeDefined();
    });

    it('should validate executable file extensions', async () => {
      const invalidExtensions = [
        'C:\\test\\file.txt',
        'C:\\test\\file.bat',
        'C:\\test\\file.cmd',
        'C:\\test\\file.js'
      ];

      for (const invalidPath of invalidExtensions) {
        const result = await iconService.extractIcon(invalidPath, validEmulatorId);
        expect(result).toBeNull();
      }
    });

    it('should validate against path traversal', async () => {
      const pathTraversalPaths = [
        'C:\\Windows\\..\\..\\System32\\notepad.exe',
        '..\\notepad.exe',
        'notepad.exe\\..\\other.exe'
      ];

      for (const maliciousPath of pathTraversalPaths) {
        const result = await iconService.extractIcon(maliciousPath, validEmulatorId);
        expect(result).toBeNull();
      }
    });
  });

  describe('cleanupUnusedIcons', () => {
    beforeEach(() => {
      mockedFs.readdirSync.mockReturnValue([
        'active-emulator-1.png',
        'active-emulator-2.png',
        'unused-emulator-3.png',
        'unused-emulator-4.png',
        'extract-icon.ps1' // Should be ignored
      ] as any);
    });

    it('should remove unused icon files', async () => {
      const activeEmulatorIds = ['active-emulator-1', 'active-emulator-2'];
      
      await iconService.cleanupUnusedIcons(activeEmulatorIds);
      
      expect(mockedFs.unlinkSync).toHaveBeenCalledWith('/mock/user/data/icons/unused-emulator-3.png');
      expect(mockedFs.unlinkSync).toHaveBeenCalledWith('/mock/user/data/icons/unused-emulator-4.png');
      expect(mockedFs.unlinkSync).not.toHaveBeenCalledWith('/mock/user/data/icons/active-emulator-1.png');
      expect(mockedFs.unlinkSync).not.toHaveBeenCalledWith('/mock/user/data/icons/active-emulator-2.png');
    });

    it('should handle cleanup errors gracefully', async () => {
      mockedFs.unlinkSync.mockImplementation(() => {
        throw new Error('File in use');
      });

      // Should not throw
      await expect(iconService.cleanupUnusedIcons(['active-1'])).resolves.not.toThrow();
    });

    it('should handle empty active emulator list', async () => {
      await iconService.cleanupUnusedIcons([]);
      
      // Should attempt to remove all icon files
      expect(mockedFs.unlinkSync).toHaveBeenCalledTimes(4); // 4 .png files
    });

    it('should handle readdir errors gracefully', async () => {
      mockedFs.readdirSync.mockImplementation(() => {
        throw new Error('Directory not accessible');
      });

      // Should not throw
      await expect(iconService.cleanupUnusedIcons(['test'])).resolves.not.toThrow();
    });
  });

  describe('security validations', () => {
    it('should reject executables that do not exist', async () => {
      mockedFs.existsSync.mockReturnValue(false);
      
      const result = await iconService.extractIcon('C:\\nonexistent\\file.exe', 'test');
      
      expect(result).toBeNull();
    });

    it('should reject directories as executables', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.statSync.mockReturnValue({
        isFile: () => false,
        isDirectory: () => true
      } as any);
      
      const result = await iconService.extractIcon('C:\\Windows\\System32', 'test');
      
      expect(result).toBeNull();
    });

    it('should handle stat errors gracefully', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.statSync.mockImplementation(() => {
        throw new Error('Access denied');
      });
      
      const result = await iconService.extractIcon('C:\\restricted\\file.exe', 'test');
      
      expect(result).toBeNull();
    });

    it('should validate output path security', async () => {
      mockedFs.existsSync.mockImplementation((path) => {
        if (typeof path === 'string' && path.includes('notepad.exe')) return true;
        return false;
      });

      // Test with various malicious emulator IDs that could create dangerous paths
      const maliciousIds = [
        '../../../etc/passwd',
        '..\\..\\Windows\\System32\\malware',
        'normal-id../../other-file'
      ];

      for (const maliciousId of maliciousIds) {
        const result = await iconService.extractIcon('C:\\Windows\\System32\\notepad.exe', maliciousId);
        // Should either be null (validation failed) or contain sanitized path
        if (result) {
          expect(result).not.toContain('..');
          expect(result).not.toContain('etc/passwd');
          expect(result).not.toContain('System32');
        }
      }
    });
  });

  describe('PowerShell script generation', () => {
    it('should create secure PowerShell script with parameters', async () => {
      setTimeout(() => {
        const closeCallback = mockChildProcess.on.mock.calls.find(call => call[0] === 'close')?.[1];
        if (closeCallback) closeCallback(0);
      }, 10);

      await iconService.extractIcon('C:\\Windows\\System32\\notepad.exe', 'test-id');
      
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('extract-icon.ps1'),
        expect.stringContaining('param('),
        'utf8'
      );

      const scriptContent = mockedFs.writeFileSync.mock.calls[0][1] as string;
      expect(scriptContent).toContain('[Parameter(Mandatory=$true)]');
      expect(scriptContent).toContain('$InputPath');
      expect(scriptContent).toContain('$OutputPath');
      expect(scriptContent).toContain('ExtractAssociatedIcon');
    });
  });
});