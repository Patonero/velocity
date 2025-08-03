/**
 * Unit tests for sorting functionality using Jest
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

interface EmulatorConfig {
  id: string;
  name: string;
  description?: string;
  executablePath: string;
  iconPath?: string;
  arguments?: string;
  workingDirectory?: string;
  platform: string;
  emulatorType: string;
  dateAdded: Date;
  lastLaunched?: Date;
  launchCount: number;
}

type SortBy = 'name' | 'dateAdded' | 'lastLaunched' | 'launchCount' | 'emulatorType';

// Extracted sorting logic for testing (same as in renderer.ts)
function sortEmulators(emulators: EmulatorConfig[], sortBy: SortBy): EmulatorConfig[] {
  return [...emulators].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'dateAdded':
        return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
      case 'lastLaunched':
        if (!a.lastLaunched && !b.lastLaunched) return 0;
        if (!a.lastLaunched) return 1;
        if (!b.lastLaunched) return -1;
        return new Date(b.lastLaunched).getTime() - new Date(a.lastLaunched).getTime();
      case 'launchCount':
        return b.launchCount - a.launchCount;
      case 'emulatorType':
        return a.emulatorType.localeCompare(b.emulatorType);
      default:
        return 0;
    }
  });
}

// Test data factory
const createTestEmulators = (): EmulatorConfig[] => [
  {
    id: 'test1',
    name: 'Zelda Emulator',
    executablePath: 'C:\\test\\zelda.exe',
    platform: 'Windows',
    emulatorType: 'Nintendo 64',
    dateAdded: new Date('2024-01-15'),
    lastLaunched: new Date('2024-08-01'),
    launchCount: 5
  },
  {
    id: 'test2',
    name: 'Another Emulator',
    executablePath: 'C:\\test\\another.exe',
    platform: 'Windows',
    emulatorType: 'PlayStation 2',
    dateAdded: new Date('2024-03-20'),
    lastLaunched: new Date('2024-08-03'),
    launchCount: 10
  },
  {
    id: 'test3',
    name: 'Classic Emulator',
    executablePath: 'C:\\test\\classic.exe',
    platform: 'Windows',
    emulatorType: 'GameCube/Wii',
    dateAdded: new Date('2024-02-10'),
    lastLaunched: undefined, // Never launched
    launchCount: 0
  },
  {
    id: 'test4',
    name: 'Best Emulator',
    executablePath: 'C:\\test\\best.exe',
    platform: 'Windows',
    emulatorType: 'Nintendo 64',
    dateAdded: new Date('2024-04-05'),
    lastLaunched: new Date('2024-07-30'),
    launchCount: 15
  }
];

describe('Emulator Sorting', () => {
  let testEmulators: EmulatorConfig[];

  beforeEach(() => {
    testEmulators = createTestEmulators();
  });

  describe('Sort by name', () => {
    it('should sort emulators alphabetically by name', () => {
      const sorted = sortEmulators(testEmulators, 'name');
      const names = sorted.map(e => e.name);
      
      expect(names).toEqual([
        'Another Emulator',
        'Best Emulator', 
        'Classic Emulator',
        'Zelda Emulator'
      ]);
    });

    it('should handle case-insensitive sorting correctly', () => {
      const caseTestEmulators = [
        { ...testEmulators[0], name: 'zebra' },
        { ...testEmulators[1], name: 'Apple' },
        { ...testEmulators[2], name: 'banana' }
      ];
      
      const sorted = sortEmulators(caseTestEmulators, 'name');
      const names = sorted.map(e => e.name);
      
      expect(names).toEqual(['Apple', 'banana', 'zebra']);
    });

    it('should handle special characters in names', () => {
      const specialCharEmulators = [
        { ...testEmulators[0], name: 'Émulator Café' },
        { ...testEmulators[1], name: 'Emulator-2' },
        { ...testEmulators[2], name: 'Emulator_1' }
      ];
      
      const sorted = sortEmulators(specialCharEmulators, 'name');
      
      expect(sorted).toHaveLength(3);
      expect(sorted[0].name).toBe('Émulator Café');
    });
  });

  describe('Sort by dateAdded', () => {
    it('should sort emulators by date added (newest first)', () => {
      const sorted = sortEmulators(testEmulators, 'dateAdded');
      const dates = sorted.map(e => e.dateAdded.toISOString());
      
      expect(dates).toEqual([
        '2024-04-05T00:00:00.000Z', // Best Emulator
        '2024-03-20T00:00:00.000Z', // Another Emulator
        '2024-02-10T00:00:00.000Z', // Classic Emulator
        '2024-01-15T00:00:00.000Z'  // Zelda Emulator
      ]);
    });

    it('should handle same date correctly', () => {
      const sameDateEmulators = [
        { ...testEmulators[0], dateAdded: new Date('2024-01-01') },
        { ...testEmulators[1], dateAdded: new Date('2024-01-01') },
        { ...testEmulators[2], dateAdded: new Date('2024-01-02') }
      ];
      
      const sorted = sortEmulators(sameDateEmulators, 'dateAdded');
      
      expect(sorted[0].dateAdded).toEqual(new Date('2024-01-02'));
      // First two should maintain relative order (stable sort)
      expect(sorted[1].id).toBe('test1');
      expect(sorted[2].id).toBe('test2');
    });
  });

  describe('Sort by lastLaunched', () => {
    it('should sort emulators by last launched date (most recent first)', () => {
      const sorted = sortEmulators(testEmulators, 'lastLaunched');
      const ids = sorted.map(e => e.id);
      
      expect(ids).toEqual(['test2', 'test1', 'test4', 'test3']);
    });

    it('should put never-launched emulators last', () => {
      const sorted = sortEmulators(testEmulators, 'lastLaunched');
      const lastEmulator = sorted[sorted.length - 1];
      
      expect(lastEmulator.lastLaunched).toBeUndefined();
      expect(lastEmulator.id).toBe('test3');
    });

    it('should handle multiple never-launched emulators', () => {
      const multipleNeverLaunched = [
        { ...testEmulators[0], lastLaunched: undefined },
        { ...testEmulators[1], lastLaunched: new Date('2024-08-03') },
        { ...testEmulators[2], lastLaunched: undefined },
        { ...testEmulators[3], lastLaunched: undefined }
      ];
      
      const sorted = sortEmulators(multipleNeverLaunched, 'lastLaunched');
      
      expect(sorted[0].lastLaunched).toBeDefined();
      expect(sorted[0].id).toBe('test2');
      
      // Last three should all be undefined
      expect(sorted[1].lastLaunched).toBeUndefined();
      expect(sorted[2].lastLaunched).toBeUndefined();
      expect(sorted[3].lastLaunched).toBeUndefined();
    });

    it('should handle all emulators never launched', () => {
      const allNeverLaunched = testEmulators.map(e => ({ ...e, lastLaunched: undefined }));
      
      const sorted = sortEmulators(allNeverLaunched, 'lastLaunched');
      
      expect(sorted).toHaveLength(4);
      sorted.forEach(emulator => {
        expect(emulator.lastLaunched).toBeUndefined();
      });
    });
  });

  describe('Sort by launchCount', () => {
    it('should sort emulators by launch count (highest first)', () => {
      const sorted = sortEmulators(testEmulators, 'launchCount');
      const counts = sorted.map(e => e.launchCount);
      
      expect(counts).toEqual([15, 10, 5, 0]);
    });

    it('should handle zero launch counts', () => {
      const sorted = sortEmulators(testEmulators, 'launchCount');
      const lastEmulator = sorted[sorted.length - 1];
      
      expect(lastEmulator.launchCount).toBe(0);
    });

    it('should handle same launch count', () => {
      const sameLaunchCount = [
        { ...testEmulators[0], launchCount: 5 },
        { ...testEmulators[1], launchCount: 5 },
        { ...testEmulators[2], launchCount: 10 }
      ];
      
      const sorted = sortEmulators(sameLaunchCount, 'launchCount');
      
      expect(sorted[0].launchCount).toBe(10);
      expect(sorted[1].launchCount).toBe(5);
      expect(sorted[2].launchCount).toBe(5);
    });

    it('should handle large launch counts', () => {
      const largeCounts = [
        { ...testEmulators[0], launchCount: 999999 },
        { ...testEmulators[1], launchCount: 1000000 },
        { ...testEmulators[2], launchCount: 0 }
      ];
      
      const sorted = sortEmulators(largeCounts, 'launchCount');
      const counts = sorted.map(e => e.launchCount);
      
      expect(counts).toEqual([1000000, 999999, 0]);
    });
  });

  describe('Sort by emulatorType', () => {
    it('should sort emulators alphabetically by emulator type', () => {
      const sorted = sortEmulators(testEmulators, 'emulatorType');
      const types = sorted.map(e => e.emulatorType);
      
      expect(types).toEqual([
        'GameCube/Wii',
        'Nintendo 64',
        'Nintendo 64',
        'PlayStation 2'
      ]);
    });

    it('should handle mixed case emulator types', () => {
      const mixedCaseTypes = [
        { ...testEmulators[0], emulatorType: 'nintendo 64' },
        { ...testEmulators[1], emulatorType: 'PlayStation 2' },
        { ...testEmulators[2], emulatorType: 'NINTENDO 64' }
      ];
      
      const sorted = sortEmulators(mixedCaseTypes, 'emulatorType');
      
      expect(sorted).toHaveLength(3);
      // Should maintain order based on string comparison
    });

    it('should handle special characters in emulator types', () => {
      const specialTypes = [
        { ...testEmulators[0], emulatorType: 'Game Boy Advance' },
        { ...testEmulators[1], emulatorType: 'Nintendo 3DS' },
        { ...testEmulators[2], emulatorType: 'Arcade (MAME)' }
      ];
      
      const sorted = sortEmulators(specialTypes, 'emulatorType');
      const types = sorted.map(e => e.emulatorType);
      
      expect(types).toEqual([
        'Arcade (MAME)',
        'Game Boy Advance',
        'Nintendo 3DS'
      ]);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle empty array', () => {
      const sorted = sortEmulators([], 'name');
      
      expect(sorted).toEqual([]);
    });

    it('should handle single emulator', () => {
      const singleEmulator = [testEmulators[0]];
      const sorted = sortEmulators(singleEmulator, 'name');
      
      expect(sorted).toEqual(singleEmulator);
      expect(sorted).toHaveLength(1);
    });

    it('should not mutate original array', () => {
      const original = [...testEmulators];
      const sorted = sortEmulators(testEmulators, 'name');
      
      expect(testEmulators).toEqual(original);
      expect(sorted).not.toBe(testEmulators);
    });

    it('should handle invalid sort type gracefully', () => {
      const sorted = sortEmulators(testEmulators, 'invalid' as any);
      
      expect(sorted).toHaveLength(testEmulators.length);
      // Should maintain original order for invalid sort type
    });

    it('should handle corrupted date objects', () => {
      const corruptedDates = [
        { ...testEmulators[0], dateAdded: new Date('invalid') },
        { ...testEmulators[1], dateAdded: new Date('2024-01-01') }
      ];
      
      // Should not throw
      expect(() => {
        sortEmulators(corruptedDates, 'dateAdded');
      }).not.toThrow();
    });
  });

  describe('Performance and stability', () => {
    it('should maintain relative order for equal elements (stable sort)', () => {
      const duplicateNames = [
        { ...testEmulators[0], name: 'Same Name', id: 'first' },
        { ...testEmulators[1], name: 'Same Name', id: 'second' },
        { ...testEmulators[2], name: 'Different Name', id: 'third' }
      ];
      
      const sorted = sortEmulators(duplicateNames, 'name');
      const sameNameItems = sorted.filter(e => e.name === 'Same Name');
      
      // Should maintain relative order
      expect(sameNameItems[0].id).toBe('first');
      expect(sameNameItems[1].id).toBe('second');
    });

    it('should handle large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `emulator-${i}`,
        name: `Emulator ${i}`,
        executablePath: `/path/to/emulator-${i}.exe`,
        platform: 'Windows',
        emulatorType: 'Test',
        dateAdded: new Date(2024, 0, 1 + (i % 365)),
        launchCount: i % 100
      }));

      const startTime = performance.now();
      const sorted = sortEmulators(largeDataset, 'name');
      const endTime = performance.now();

      expect(sorted).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
    });

    it('should be deterministic', () => {
      // Run same sort multiple times
      const results = Array.from({ length: 5 }, () => 
        sortEmulators(testEmulators, 'name').map(e => e.id)
      );

      // All results should be identical
      results.forEach(result => {
        expect(result).toEqual(results[0]);
      });
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle typical emulator library', () => {
      const typicalLibrary = [
        {
          id: 'dolphin-1',
          name: 'Dolphin Emulator',
          executablePath: 'C:\\Emulators\\Dolphin\\Dolphin.exe',
          platform: 'Windows',
          emulatorType: 'GameCube/Wii',
          dateAdded: new Date('2024-01-01'),
          lastLaunched: new Date('2024-08-01'),
          launchCount: 25
        },
        {
          id: 'pcsx2-1',
          name: 'PCSX2',
          executablePath: 'C:\\Emulators\\PCSX2\\pcsx2.exe',
          platform: 'Windows',
          emulatorType: 'PlayStation 2',
          dateAdded: new Date('2024-02-01'),
          lastLaunched: new Date('2024-07-30'),
          launchCount: 15
        },
        {
          id: 'project64-1',
          name: 'Project64',
          executablePath: 'C:\\Emulators\\Project64\\Project64.exe',
          platform: 'Windows',
          emulatorType: 'Nintendo 64',
          dateAdded: new Date('2024-03-01'),
          launchCount: 0
        }
      ];

      const sortedByName = sortEmulators(typicalLibrary, 'name');
      expect(sortedByName[0].name).toBe('Dolphin Emulator');

      const sortedByLaunchCount = sortEmulators(typicalLibrary, 'launchCount');
      expect(sortedByLaunchCount[0].launchCount).toBe(25);

      const sortedByLastLaunched = sortEmulators(typicalLibrary, 'lastLaunched');
      expect(sortedByLastLaunched[sortedByLastLaunched.length - 1].id).toBe('project64-1');
    });
  });
});