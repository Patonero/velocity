/**
 * Unit tests for sorting functionality
 */

// Extracted sorting logic for testing
function sortEmulators(emulators, sortBy) {
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

// Test data
const createTestEmulators = () => [
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

// Simple test framework
function assertEquals(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertTrue(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function runTest(testName, testFunction) {
  try {
    testFunction();
    console.log(`✓ ${testName}`);
    return true;
  } catch (error) {
    console.log(`✗ ${testName}: ${error.message}`);
    return false;
  }
}

function runTestSuite() {
  console.log('Running Emulator Sorting Tests...\n');
  
  let passed = 0;
  let total = 0;
  
  function test(name, fn) {
    total++;
    if (runTest(name, fn)) {
      passed++;
    }
  }

  // Test data for each test
  let testEmulators;
  
  function beforeEach() {
    testEmulators = createTestEmulators();
  }

  // Sort by name tests
  console.log('\n=== Sort by name ===');
  beforeEach();
  test('should sort emulators alphabetically by name', () => {
    const sorted = sortEmulators(testEmulators, 'name');
    const names = sorted.map(e => e.name);
    assertEquals(names, ['Another Emulator', 'Best Emulator', 'Classic Emulator', 'Zelda Emulator'], 'Names should be sorted alphabetically');
  });

  beforeEach();
  test('should handle case-insensitive sorting', () => {
    const caseTestEmulators = [
      { ...testEmulators[0], name: 'zebra' },
      { ...testEmulators[1], name: 'Apple' },
      { ...testEmulators[2], name: 'banana' }
    ];
    const sorted = sortEmulators(caseTestEmulators, 'name');
    const names = sorted.map(e => e.name);
    assertEquals(names, ['Apple', 'banana', 'zebra'], 'Case-insensitive sorting should work');
  });

  // Sort by dateAdded tests
  console.log('\n=== Sort by dateAdded ===');
  beforeEach();
  test('should sort emulators by date added (newest first)', () => {
    const sorted = sortEmulators(testEmulators, 'dateAdded');
    const dates = sorted.map(e => e.dateAdded.toISOString());
    assertEquals(dates, [
      '2024-04-05T00:00:00.000Z', // Best Emulator
      '2024-03-20T00:00:00.000Z', // Another Emulator
      '2024-02-10T00:00:00.000Z', // Classic Emulator
      '2024-01-15T00:00:00.000Z'  // Zelda Emulator
    ], 'Should sort by date added, newest first');
  });

  // Sort by lastLaunched tests
  console.log('\n=== Sort by lastLaunched ===');
  beforeEach();
  test('should sort emulators by last launched date (most recent first)', () => {
    const sorted = sortEmulators(testEmulators, 'lastLaunched');
    const ids = sorted.map(e => e.id);
    assertEquals(ids, ['test2', 'test1', 'test4', 'test3'], 'Should sort by last launched, most recent first');
  });

  beforeEach();
  test('should handle emulators with no launch date (put them last)', () => {
    const sorted = sortEmulators(testEmulators, 'lastLaunched');
    const lastEmulator = sorted[sorted.length - 1];
    assertTrue(lastEmulator.lastLaunched === undefined, 'Last emulator should have no launch date');
    assertEquals(lastEmulator.id, 'test3', 'Last emulator should be test3');
  });

  // Sort by launchCount tests
  console.log('\n=== Sort by launchCount ===');
  beforeEach();
  test('should sort emulators by launch count (highest first)', () => {
    const sorted = sortEmulators(testEmulators, 'launchCount');
    const counts = sorted.map(e => e.launchCount);
    assertEquals(counts, [15, 10, 5, 0], 'Should sort by launch count, highest first');
  });

  // Sort by emulatorType tests
  console.log('\n=== Sort by emulatorType ===');
  beforeEach();
  test('should sort emulators alphabetically by emulator type', () => {
    const sorted = sortEmulators(testEmulators, 'emulatorType');
    const types = sorted.map(e => e.emulatorType);
    assertEquals(types, ['GameCube/Wii', 'Nintendo 64', 'Nintendo 64', 'PlayStation 2'], 'Should sort by emulator type alphabetically');
  });

  // Edge cases
  console.log('\n=== Edge cases ===');
  test('should handle empty array', () => {
    const sorted = sortEmulators([], 'name');
    assertEquals(sorted, [], 'Empty array should remain empty');
  });

  beforeEach();
  test('should handle single emulator', () => {
    const singleEmulator = [testEmulators[0]];
    const sorted = sortEmulators(singleEmulator, 'name');
    assertEquals(sorted, singleEmulator, 'Single emulator should remain unchanged');
  });

  beforeEach();
  test('should not mutate original array', () => {
    const original = [...testEmulators];
    const sorted = sortEmulators(testEmulators, 'name');
    assertEquals(testEmulators, original, 'Original array should not be mutated');
    assertTrue(sorted !== testEmulators, 'Sorted array should be a different reference');
  });

  beforeEach();
  test('should handle invalid sort type gracefully', () => {
    const sorted = sortEmulators(testEmulators, 'invalid');
    assertTrue(sorted.length === testEmulators.length, 'Invalid sort should not change array length');
  });

  // Results
  console.log(`\n=== Test Results ===`);
  console.log(`Passed: ${passed}/${total}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
  
  if (passed === total) {
    console.log('\n🎉 All tests passed!');
    return true;
  } else {
    console.log('\n❌ Some tests failed!');
    return false;
  }
}

// Run the tests
if (require.main === module) {
  const success = runTestSuite();
  process.exit(success ? 0 : 1);
}

module.exports = { sortEmulators, createTestEmulators, runTestSuite };