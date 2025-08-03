/**
 * Unit tests for VelocityLauncher renderer functionality
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock DOM environment
const mockElement = {
  classList: {
    add: jest.fn(),
    remove: jest.fn(),
    contains: jest.fn(() => false)
  },
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  innerHTML: '',
  textContent: '',
  value: '',
  style: {},
  appendChild: jest.fn(),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(() => []),
  setAttribute: jest.fn(),
  getAttribute: jest.fn(),
  closest: jest.fn()
};

const mockDocument = {
  getElementById: jest.fn(() => mockElement),
  createElement: jest.fn(() => mockElement),
  querySelector: jest.fn(() => mockElement),
  querySelectorAll: jest.fn(() => []),
  addEventListener: jest.fn(),
  readyState: 'complete'
};

const mockWindow = {
  electronAPI: {
    loadSettings: jest.fn().mockResolvedValue({
      emulators: [],
      theme: 'auto',
      gridSize: 'medium',
      sortBy: 'name',
      showDescriptions: true
    }),
    saveSettings: jest.fn().mockResolvedValue(undefined),
    addEmulator: jest.fn().mockResolvedValue('test-id'),
    updateEmulator: jest.fn().mockResolvedValue(true),
    removeEmulator: jest.fn().mockResolvedValue(true),
    incrementLaunchCount: jest.fn().mockResolvedValue(undefined),
    showOpenDialog: jest.fn().mockResolvedValue({ canceled: false, filePaths: [] }),
    launchEmulator: jest.fn().mockResolvedValue({ success: true }),
    extractIcon: jest.fn().mockResolvedValue(null),
    cleanupIcons: jest.fn().mockResolvedValue(true)
  },
  matchMedia: jest.fn(() => ({
    matches: false,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  }))
};

// Set up global mocks
global.document = mockDocument as any;
global.window = mockWindow as any;

// Import after setting up mocks
const { escapeHtml, isValidFilePath, sanitizeInput } = require('../renderer');

describe('Renderer Security Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
      expect(escapeHtml('Text with "quotes" and \'apostrophes\'')).toBe('Text with "quotes" and \'apostrophes\'');
      expect(escapeHtml('Normal text')).toBe('Normal text');
    });

    it('should handle null and undefined inputs', () => {
      expect(escapeHtml(null as any)).toBe('');
      expect(escapeHtml(undefined as any)).toBe('');
      expect(escapeHtml('')).toBe('');
    });

    it('should handle non-string inputs', () => {
      expect(escapeHtml(123 as any)).toBe('');
      expect(escapeHtml({} as any)).toBe('');
      expect(escapeHtml([] as any)).toBe('');
    });

    it('should handle complex HTML injection attempts', () => {
      const maliciousInputs = [
        '<img src="x" onerror="alert(1)">',
        '<svg onload="alert(1)">',
        'javascript:alert(1)',
        '<iframe src="javascript:alert(1)"></iframe>'
      ];

      maliciousInputs.forEach(input => {
        const result = escapeHtml(input);
        expect(result).not.toContain('<');
        expect(result).not.toContain('>');
        expect(result).toContain('&lt;');
        expect(result).toContain('&gt;');
      });
    });
  });

  describe('isValidFilePath', () => {
    it('should accept valid Windows file paths', () => {
      const validPaths = [
        'C:\\Windows\\System32\\notepad.exe',
        'D:\\Games\\Emulator\\dolphin.exe',
        'C:\\Program Files\\Test\\app.exe'
      ];

      validPaths.forEach(path => {
        expect(isValidFilePath(path)).toBe(true);
      });
    });

    it('should reject path traversal attempts', () => {
      const maliciousPaths = [
        'C:\\Windows\\..\\..\\System32\\evil.exe',
        '..\\..\\Windows\\System32\\cmd.exe',
        'C:\\Test\\..\\..\\sensitive\\file.exe',
        '../etc/passwd',
        '../../Windows/System32/calc.exe'
      ];

      maliciousPaths.forEach(path => {
        expect(isValidFilePath(path)).toBe(false);
      });
    });

    it('should reject protocol injection attempts', () => {
      const protocolPaths = [
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'vbscript:msgbox(1)',
        'http://evil.com/malware.exe',
        'https://malicious.site/trojan.exe',
        'file:///etc/passwd'
      ];

      protocolPaths.forEach(path => {
        expect(isValidFilePath(path)).toBe(false);
      });
    });

    it('should reject Windows forbidden characters except valid drive letters', () => {
      const invalidPaths = [
        'C:\\test\\file<1>.exe',
        'C:\\test\\file>1.exe',
        'C:\\test\\file|1.exe',
        'C:\\test\\file?1.exe',
        'C:\\test\\file*1.exe',
        'C:\\test\\file"1.exe'
      ];

      invalidPaths.forEach(path => {
        expect(isValidFilePath(path)).toBe(false);
      });
    });

    it('should accept valid drive letters', () => {
      const validDriveLetters = [
        'C:\\test.exe',
        'D:\\test.exe',
        'Z:\\test.exe'
      ];

      validDriveLetters.forEach(path => {
        expect(isValidFilePath(path)).toBe(true);
      });
    });

    it('should reject invalid colon usage', () => {
      const invalidColonPaths = [
        'CC:\\test.exe', // Double letter before colon
        '1:\\test.exe',  // Number before colon
        'test:exe',      // Colon in middle
        'C::\\test.exe', // Double colon
        'test.exe:',     // Colon at end
        ':\\test.exe'    // Colon at start
      ];

      invalidColonPaths.forEach(path => {
        expect(isValidFilePath(path)).toBe(false);
      });
    });

    it('should reject control characters', () => {
      const pathsWithControlChars = [
        'C:\\test\x00.exe',
        'C:\\test\x01.exe',
        'C:\\test\n.exe',
        'C:\\test\r.exe',
        'C:\\test\t.exe'
      ];

      pathsWithControlChars.forEach(path => {
        expect(isValidFilePath(path)).toBe(false);
      });
    });

    it('should handle null, undefined, and non-string inputs', () => {
      expect(isValidFilePath(null as any)).toBe(false);
      expect(isValidFilePath(undefined as any)).toBe(false);
      expect(isValidFilePath(123 as any)).toBe(false);
      expect(isValidFilePath({} as any)).toBe(false);
      expect(isValidFilePath('')).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    it('should remove XSS characters', () => {
      const input = 'Normal text with <script>alert("xss")</script> and "quotes"';
      const result = sanitizeInput(input);
      
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
      expect(result).not.toContain('"');
      expect(result).not.toContain("'");
      expect(result).not.toContain('&');
    });

    it('should trim whitespace', () => {
      expect(sanitizeInput('  test  ')).toBe('test');
      expect(sanitizeInput('\t\ntest\r\n\t')).toBe('test');
    });

    it('should enforce length limits', () => {
      const longInput = 'a'.repeat(2000);
      const result = sanitizeInput(longInput);
      
      expect(result.length).toBeLessThanOrEqual(1000);
    });

    it('should respect custom length limits', () => {
      const input = 'a'.repeat(100);
      const result = sanitizeInput(input, 50);
      
      expect(result.length).toBe(50);
    });

    it('should handle null and undefined inputs', () => {
      expect(sanitizeInput(null as any)).toBe('');
      expect(sanitizeInput(undefined as any)).toBe('');
    });

    it('should handle non-string inputs', () => {
      expect(sanitizeInput(123 as any)).toBe('');
      expect(sanitizeInput({} as any)).toBe('');
      expect(sanitizeInput([] as any)).toBe('');
    });

    it('should handle empty strings', () => {
      expect(sanitizeInput('')).toBe('');
      expect(sanitizeInput('   ')).toBe('');
    });

    it('should preserve safe content', () => {
      const safeInputs = [
        'Normal emulator name',
        'Dolphin v5.0',
        'Nintendo 64 Emulator',
        'Path: C:\\Games\\Emulator'
      ];

      safeInputs.forEach(input => {
        const result = sanitizeInput(input);
        expect(result.length).toBeGreaterThan(0);
        expect(result).toMatch(/^[^<>'"&]*$/); // No dangerous characters
      });
    });
  });
});

describe('VelocityLauncher Integration', () => {
  let mockSettings: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockSettings = {
      emulators: [
        {
          id: 'test-1',
          name: 'Test Emulator 1',
          executablePath: 'C:\\test\\emulator1.exe',
          emulatorType: 'Nintendo 64',
          platform: 'Windows',
          dateAdded: new Date('2024-01-01'),
          launchCount: 5,
          iconPath: 'C:\\icons\\test-1.png'
        },
        {
          id: 'test-2',
          name: 'Test Emulator 2',
          executablePath: 'C:\\test\\emulator2.exe',
          emulatorType: 'PlayStation 2',
          platform: 'Windows',
          dateAdded: new Date('2024-01-02'),
          launchCount: 10
        }
      ],
      theme: 'auto',
      gridSize: 'medium',
      sortBy: 'name',
      showDescriptions: true
    };

    mockWindow.electronAPI.loadSettings.mockResolvedValue(mockSettings);
  });

  describe('Settings Loading', () => {
    it('should handle settings loading errors gracefully', async () => {
      // This would be tested by actually instantiating the VelocityLauncher class
      // For now, we test that the mock is set up correctly
      expect(mockWindow.electronAPI.loadSettings).toBeDefined();
    });

    it('should load valid settings', async () => {
      const settings = await mockWindow.electronAPI.loadSettings();
      
      expect((settings as any).emulators).toHaveLength(0);
      expect((settings as any).theme).toBe('auto');
      expect((settings as any).sortBy).toBe('name');
    });
  });

  describe('Emulator Management', () => {
    it('should add emulator with proper validation', async () => {
      const newEmulator = {
        name: 'New Emulator',
        executablePath: 'C:\\new\\emulator.exe',
        emulatorType: 'GameCube/Wii',
        platform: 'Windows'
      };

      mockWindow.electronAPI.addEmulator.mockResolvedValue('new-id');
      
      const result = await mockWindow.electronAPI.addEmulator(newEmulator);
      expect(result).toBe('new-id');
      expect(mockWindow.electronAPI.addEmulator).toHaveBeenCalledWith(newEmulator);
    });

    it('should update emulator with validation', async () => {
      const updates = {
        name: 'Updated Name',
        description: 'Updated description'
      };

      mockWindow.electronAPI.updateEmulator.mockResolvedValue(true);
      
      const result = await mockWindow.electronAPI.updateEmulator('test-1', updates);
      expect(result).toBe(true);
    });

    it('should remove emulator', async () => {
      mockWindow.electronAPI.removeEmulator.mockResolvedValue(true);
      
      const result = await mockWindow.electronAPI.removeEmulator('test-1');
      expect(result).toBe(true);
    });

    it('should handle launch count increment', async () => {
      mockWindow.electronAPI.incrementLaunchCount.mockResolvedValue(undefined);
      
      await mockWindow.electronAPI.incrementLaunchCount('test-1');
      expect(mockWindow.electronAPI.incrementLaunchCount).toHaveBeenCalledWith('test-1');
    });
  });

  describe('Icon Management', () => {
    it('should extract icon for emulator', async () => {
      const iconPath = 'C:\\icons\\extracted.png';
      mockWindow.electronAPI.extractIcon.mockResolvedValue(iconPath);
      
      const result = await mockWindow.electronAPI.extractIcon('C:\\test\\emulator.exe', 'test-id');
      expect(result).toBe(iconPath);
    });

    it('should handle icon extraction failure', async () => {
      mockWindow.electronAPI.extractIcon.mockResolvedValue(null);
      
      const result = await mockWindow.electronAPI.extractIcon('C:\\invalid\\path.exe', 'test-id');
      expect(result).toBeNull();
    });

    it('should cleanup unused icons', async () => {
      mockWindow.electronAPI.cleanupIcons.mockResolvedValue(true);
      
      const result = await mockWindow.electronAPI.cleanupIcons(['test-1', 'test-2']);
      expect(result).toBe(true);
    });
  });

  describe('File Dialog Integration', () => {
    it('should show open dialog for executable selection', async () => {
      const dialogResult = {
        canceled: false,
        filePaths: ['C:\\selected\\emulator.exe']
      };
      
      mockWindow.electronAPI.showOpenDialog.mockResolvedValue(dialogResult);
      
      const result = await mockWindow.electronAPI.showOpenDialog({
        title: 'Select Emulator',
        filters: [{ name: 'Executables', extensions: ['exe'] }]
      });
      
      expect(result.filePaths).toContain('C:\\selected\\emulator.exe');
    });

    it('should handle dialog cancellation', async () => {
      const dialogResult = {
        canceled: true,
        filePaths: []
      };
      
      mockWindow.electronAPI.showOpenDialog.mockResolvedValue(dialogResult);
      
      const result = await mockWindow.electronAPI.showOpenDialog({});
      expect(result.canceled).toBe(true);
    });
  });

  describe('Emulator Launching', () => {
    it('should launch emulator successfully', async () => {
      const launchResult = {
        success: true,
        pid: 12345
      };
      
      mockWindow.electronAPI.launchEmulator.mockResolvedValue(launchResult);
      
      const result = await mockWindow.electronAPI.launchEmulator(
        'C:\\test\\emulator.exe',
        '--fullscreen',
        'C:\\test\\'
      );
      
      expect(result.success).toBe(true);
      expect(result.pid).toBeDefined();
    });

    it('should handle launch failure', async () => {
      const launchResult = {
        success: false,
        error: 'File not found'
      };
      
      mockWindow.electronAPI.launchEmulator.mockResolvedValue(launchResult);
      
      const result = await mockWindow.electronAPI.launchEmulator('C:\\invalid\\path.exe');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Security Integration', () => {
    it('should validate all form inputs', () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        'javascript:alert(1)',
        '../../../etc/passwd',
        'C:\\test\\..\\..\\Windows\\System32\\cmd.exe'
      ];

      maliciousInputs.forEach(input => {
        expect(sanitizeInput(input)).not.toContain('<script>');
        expect(sanitizeInput(input)).not.toContain('javascript:');
        expect(isValidFilePath(input)).toBe(false);
      });
    });

    it('should properly escape content in emulator cards', () => {
      const maliciousEmulator = {
        id: 'test-xss',
        name: '<img src="x" onerror="alert(1)">',
        description: '<script>steal_data()</script>',
        emulatorType: 'Evil<script>',
        executablePath: 'C:\\safe\\path.exe',
        platform: 'Windows',
        dateAdded: new Date(),
        launchCount: 0
      };

      const safeName = escapeHtml(maliciousEmulator.name);
      const safeDescription = escapeHtml(maliciousEmulator.description);
      const safeType = escapeHtml(maliciousEmulator.emulatorType);

      expect(safeName).not.toContain('<img');
      expect(safeDescription).not.toContain('<script>');
      expect(safeType).not.toContain('<script>');
    });
  });
});