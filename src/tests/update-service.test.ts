import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { EventEmitter } from "events";

// jest.mock factories are hoisted above imports, and any outer variable they
// reference must be prefixed "mock" (Jest's hoisting convention) - hence
// mockAutoUpdater rather than something more natural like fakeAutoUpdater.
const mockAutoUpdater = Object.assign(new EventEmitter(), {
  checkForUpdates: jest.fn(),
  downloadUpdate: jest.fn(),
});

jest.mock("electron-updater", () => ({
  autoUpdater: mockAutoUpdater,
}));

jest.mock("electron", () => ({
  app: {
    getVersion: jest.fn(),
    getPath: jest.fn(),
  },
}));

import { app } from "electron";
import { UpdateService } from "../update-service";
import { UpdateCache } from "../update-cache";

const mockGetVersion = app.getVersion as jest.Mock;
const mockGetPath = app.getPath as jest.Mock;

const FAST_CHECK_TTL = 30 * 1000;
const CACHE_TTL = 5 * 60 * 1000;

describe("UpdateService", () => {
  let tmpDir: string;
  let cacheFile: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "velocity-updatesvc-"));
    mockGetPath.mockReturnValue(tmpDir);
    mockGetVersion.mockReturnValue("1.5.0");
    cacheFile = path.join(tmpDir, "update-cache.json");
    // Real electron-updater's downloadUpdate() returns a promise; match
    // that so the source's `.catch()` on it doesn't blow up on undefined.
    mockAutoUpdater.downloadUpdate.mockResolvedValue(undefined);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    mockAutoUpdater.removeAllListeners();
    jest.useRealTimers();
  });

  describe("checkForUpdatesOptimized", () => {
    it("returns a cached result immediately when a very-recent entry exists", async () => {
      new UpdateCache().cacheResult("1.5.0", "1.5.0", false);
      const service = new UpdateService();

      const result = await service.checkForUpdatesOptimized();

      expect(result).toEqual({ available: false, info: undefined, fromCache: true });
      expect(mockAutoUpdater.checkForUpdates).not.toHaveBeenCalled();
    });

    it("resolves as available and auto-triggers a download", async () => {
      mockAutoUpdater.checkForUpdates.mockImplementation(() => {
        const info = { version: "1.6.0" };
        setTimeout(() => mockAutoUpdater.emit("update-available", info), 0);
        return Promise.resolve({ updateInfo: info });
      });

      const service = new UpdateService();
      const result = await service.checkForUpdatesOptimized();

      expect(result.available).toBe(true);
      expect(result.info).toEqual({ version: "1.6.0" });
      expect(mockAutoUpdater.downloadUpdate).toHaveBeenCalled();
    });

    it("resolves as not available and does not trigger a download", async () => {
      mockAutoUpdater.checkForUpdates.mockImplementation(() => {
        setTimeout(() => mockAutoUpdater.emit("update-not-available", {}), 0);
        return Promise.resolve({});
      });

      const service = new UpdateService();
      const result = await service.checkForUpdatesOptimized();

      expect(result.available).toBe(false);
      expect(mockAutoUpdater.downloadUpdate).not.toHaveBeenCalled();
    });

    it("returns an error with no fallback when the check errors and nothing is cached", async () => {
      mockAutoUpdater.checkForUpdates.mockImplementation(() => {
        setTimeout(
          () => mockAutoUpdater.emit("error", new Error("network down")),
          0
        );
        return Promise.resolve({});
      });

      const service = new UpdateService();
      const result = await service.checkForUpdatesOptimized();

      expect(result.available).toBe(false);
      expect(result.error).toBe("network down");
      expect(result.fromCache).toBeUndefined();
    });

    it("falls back to a stale cached result when the check errors", async () => {
      const stale = {
        lastCheckTime: Date.now() - FAST_CHECK_TTL - 1000,
        currentVersion: "1.5.0",
        latestVersion: "1.5.0",
        hasUpdate: false,
        ttl: CACHE_TTL,
      };
      fs.writeFileSync(cacheFile, JSON.stringify(stale));

      mockAutoUpdater.checkForUpdates.mockImplementation(() => {
        setTimeout(
          () => mockAutoUpdater.emit("error", new Error("network down")),
          0
        );
        return Promise.resolve({});
      });

      const service = new UpdateService();
      const result = await service.checkForUpdatesOptimized();

      expect(result.fromCache).toBe(true);
      expect(result.available).toBe(false);
    });

    it("times out after 10s and reports a timeout error", async () => {
      jest.useFakeTimers();
      mockAutoUpdater.checkForUpdates.mockImplementation(
        () => new Promise(() => {}) // never resolves, never emits
      );

      const service = new UpdateService();
      const resultPromise = service.checkForUpdatesOptimized();
      await Promise.resolve();
      jest.advanceTimersByTime(10000);

      const result = await resultPromise;
      expect(result.available).toBe(false);
      expect(result.error).toMatch(/timeout/i);
    });

    it("does not start a second check while one is already in progress", async () => {
      jest.useFakeTimers();
      mockAutoUpdater.checkForUpdates.mockImplementation(
        () => new Promise(() => {}) // hangs for the duration of the test
      );

      const service = new UpdateService();
      // Intentionally not awaited - this leaves isChecking = true.
      void service.checkForUpdatesOptimized();
      await Promise.resolve();

      const second = await service.checkForUpdatesOptimized();

      expect(mockAutoUpdater.checkForUpdates).toHaveBeenCalledTimes(1);
      expect(second.error).toBe("Update check in progress");
    });
  });

  describe("getEstimatedPatchSize", () => {
    it("returns Unknown/0% with no updateInfo", () => {
      const service = new UpdateService();
      expect(service.getEstimatedPatchSize(null)).toEqual({
        estimated: "Unknown",
        savings: "0%",
      });
    });

    it("estimates the delta as 10% of the full file size", () => {
      const service = new UpdateService();
      const result = service.getEstimatedPatchSize({
        files: [{ size: 100 * 1024 * 1024 }],
      });
      expect(result.estimated).toBe("10.0 MB");
    });

    it("always reports 90% savings regardless of actual file size", () => {
      // This isn't a real measurement - deltaSize is hardcoded as 10% of
      // fullSize, so savings = round((1 - 0.1) * 100) is 90% no matter what
      // the input size is. Asserted with two different sizes to make that
      // explicit rather than implying it reflects a real delta calculation.
      const service = new UpdateService();
      const small = service.getEstimatedPatchSize({
        files: [{ size: 10 * 1024 * 1024 }],
      });
      const large = service.getEstimatedPatchSize({
        files: [{ size: 500 * 1024 * 1024 }],
      });
      expect(small.savings).toBe("90% smaller");
      expect(large.savings).toBe("90% smaller");
    });

    it("falls back to a 200MB assumed size when files are missing", () => {
      const service = new UpdateService();
      const result = service.getEstimatedPatchSize({});
      expect(result.estimated).toBe("20.0 MB");
    });
  });

  describe("clearCache", () => {
    it("removes the underlying cache file", () => {
      new UpdateCache().cacheResult("1.5.0", "1.5.0", false);
      expect(fs.existsSync(cacheFile)).toBe(true);

      const service = new UpdateService();
      service.clearCache();

      expect(fs.existsSync(cacheFile)).toBe(false);
    });
  });
});
