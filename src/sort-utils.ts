// Canonical, unit-tested twin of renderer.ts's sortEmulators comparator.
// renderer.ts is loaded as a plain <script> with no module system - a real
// `import` there would make tsc emit CommonJS boilerplate (`exports.foo =`)
// into dist/renderer.js, which breaks immediately in a browser with no
// CommonJS runtime present. So renderer.ts keeps its own inline copy of this
// same switch statement rather than importing it. If either changes, update
// the other by hand.

import { EmulatorConfig, EmulatorSortBy } from './types';

export const compareEmulators = (
  a: EmulatorConfig,
  b: EmulatorConfig,
  sortBy: EmulatorSortBy
): number => {
  switch (sortBy) {
    case 'name':
      return a.name.localeCompare(b.name);
    case 'dateAdded':
      return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
    case 'lastLaunched':
      if (!a.lastLaunched && !b.lastLaunched) return 0;
      if (!a.lastLaunched) return 1;
      if (!b.lastLaunched) return -1;
      return (
        new Date(b.lastLaunched).getTime() - new Date(a.lastLaunched).getTime()
      );
    case 'launchCount':
      return b.launchCount - a.launchCount;
    case 'emulatorType':
      return a.emulatorType.localeCompare(b.emulatorType);
    default:
      return 0;
  }
};

export const sortEmulators = (
  emulators: EmulatorConfig[],
  sortBy: EmulatorSortBy
): EmulatorConfig[] => [...emulators].sort((a, b) => compareEmulators(a, b, sortBy));
