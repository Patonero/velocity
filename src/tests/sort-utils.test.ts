import { compareEmulators, sortEmulators } from "../sort-utils";
import { EmulatorConfig } from "../types";

const makeEmulator = (overrides: Partial<EmulatorConfig> = {}): EmulatorConfig => ({
  id: "emu-1",
  name: "Dolphin",
  executablePath: "C:\\Dolphin.exe",
  platform: "Windows",
  emulatorType: "GameCube/Wii",
  dateAdded: new Date("2026-01-01"),
  launchCount: 0,
  ...overrides,
});

describe("compareEmulators", () => {
  it("sorts by name alphabetically", () => {
    const apple = makeEmulator({ name: "Apple" });
    const banana = makeEmulator({ name: "Banana" });

    expect(compareEmulators(apple, banana, "name")).toBeLessThan(0);
    expect(compareEmulators(banana, apple, "name")).toBeGreaterThan(0);
    expect(compareEmulators(apple, apple, "name")).toBe(0);
  });

  it("sorts by dateAdded with the newest first", () => {
    const older = makeEmulator({ dateAdded: new Date("2026-01-01") });
    const newer = makeEmulator({ dateAdded: new Date("2026-06-01") });

    // older sorts after newer, so comparing (older, newer) is positive
    expect(compareEmulators(older, newer, "dateAdded")).toBeGreaterThan(0);
    expect(compareEmulators(newer, older, "dateAdded")).toBeLessThan(0);
  });

  it("sorts by lastLaunched with the most recent first, never-launched last", () => {
    const recentlyLaunched = makeEmulator({ lastLaunched: new Date("2026-06-01") });
    const launchedLongAgo = makeEmulator({ lastLaunched: new Date("2026-01-01") });
    const neverLaunched = makeEmulator({ lastLaunched: undefined });

    expect(
      compareEmulators(launchedLongAgo, recentlyLaunched, "lastLaunched")
    ).toBeGreaterThan(0);
    expect(compareEmulators(neverLaunched, recentlyLaunched, "lastLaunched")).toBeGreaterThan(0);
    expect(compareEmulators(recentlyLaunched, neverLaunched, "lastLaunched")).toBeLessThan(0);
    expect(compareEmulators(neverLaunched, neverLaunched, "lastLaunched")).toBe(0);
  });

  it("sorts by launchCount with the highest count first", () => {
    const playedALot = makeEmulator({ launchCount: 50 });
    const playedOnce = makeEmulator({ launchCount: 1 });

    expect(compareEmulators(playedOnce, playedALot, "launchCount")).toBeGreaterThan(0);
    expect(compareEmulators(playedALot, playedOnce, "launchCount")).toBeLessThan(0);
  });

  it("sorts by emulatorType alphabetically", () => {
    const gba = makeEmulator({ emulatorType: "Game Boy Advance" });
    const psx = makeEmulator({ emulatorType: "PlayStation 1" });

    expect(compareEmulators(gba, psx, "emulatorType")).toBeLessThan(0);
    expect(compareEmulators(psx, gba, "emulatorType")).toBeGreaterThan(0);
  });

  it("returns 0 for an unrecognized sort key", () => {
    const a = makeEmulator();
    const b = makeEmulator({ name: "Different" });
    expect(compareEmulators(a, b, "bogus" as any)).toBe(0);
  });
});

describe("sortEmulators", () => {
  it("returns emulators ordered by the given key", () => {
    const banana = makeEmulator({ id: "1", name: "Banana" });
    const apple = makeEmulator({ id: "2", name: "Apple" });
    const cherry = makeEmulator({ id: "3", name: "Cherry" });

    const sorted = sortEmulators([banana, apple, cherry], "name");

    expect(sorted.map((e) => e.name)).toEqual(["Apple", "Banana", "Cherry"]);
  });

  it("does not mutate the input array", () => {
    const banana = makeEmulator({ id: "1", name: "Banana" });
    const apple = makeEmulator({ id: "2", name: "Apple" });
    const original = [banana, apple];

    sortEmulators(original, "name");

    expect(original).toEqual([banana, apple]);
  });
});
