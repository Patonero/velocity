import * as fs from "fs";
import * as os from "os";
import * as path from "path";

jest.mock("electron", () => ({
  app: {
    getPath: jest.fn(),
  },
}));

import { app } from "electron";
import { UpdateCache } from "../update-cache";

const mockGetPath = app.getPath as jest.Mock;

const FAST_CHECK_TTL = 30 * 1000;
const CACHE_TTL = 5 * 60 * 1000;

describe("UpdateCache", () => {
  let tmpDir: string;
  let cache: UpdateCache;
  let cacheFile: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "velocity-updatecache-"));
    mockGetPath.mockReturnValue(tmpDir);
    cache = new UpdateCache();
    cacheFile = path.join(tmpDir, "update-cache.json");
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("getCachedResult", () => {
    it("returns null when no cache file exists", () => {
      expect(cache.getCachedResult()).toBeNull();
    });

    it("returns null and does not throw on corrupt JSON", () => {
      fs.writeFileSync(cacheFile, "{ not valid json");
      expect(cache.getCachedResult()).toBeNull();
    });

    it("returns the cached entry when still within its TTL", () => {
      cache.cacheResult("1.5.0", "1.5.0", false);
      const result = cache.getCachedResult();
      expect(result).not.toBeNull();
      expect(result?.currentVersion).toBe("1.5.0");
    });

    it("returns null once the entry has expired", () => {
      const expired = {
        lastCheckTime: Date.now() - CACHE_TTL - 1000,
        currentVersion: "1.5.0",
        latestVersion: "1.5.0",
        hasUpdate: false,
        ttl: CACHE_TTL,
      };
      fs.writeFileSync(cacheFile, JSON.stringify(expired));
      expect(cache.getCachedResult()).toBeNull();
    });
  });

  describe("cacheResult", () => {
    it("writes the expected shape", () => {
      cache.cacheResult("1.5.0", "1.5.1", true, { version: "1.5.1" });
      const written = JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
      expect(written).toMatchObject({
        currentVersion: "1.5.0",
        latestVersion: "1.5.1",
        hasUpdate: true,
        updateInfo: { version: "1.5.1" },
      });
      expect(typeof written.lastCheckTime).toBe("number");
    });

    it("uses the short TTL when an update is available", () => {
      cache.cacheResult("1.5.0", "1.5.1", true);
      const written = JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
      expect(written.ttl).toBe(FAST_CHECK_TTL);
    });

    it("uses the long TTL when no update is available", () => {
      cache.cacheResult("1.5.0", "1.5.0", false);
      const written = JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
      expect(written.ttl).toBe(CACHE_TTL);
    });
  });

  describe("isVersionChanged", () => {
    it("is true when there is no cache", () => {
      expect(cache.isVersionChanged("1.5.0")).toBe(true);
    });

    it("is true when the cached version differs", () => {
      cache.cacheResult("1.4.0", "1.4.0", false);
      expect(cache.isVersionChanged("1.5.0")).toBe(true);
    });

    it("is false when the version matches and the cache is still valid", () => {
      cache.cacheResult("1.5.0", "1.5.0", false);
      expect(cache.isVersionChanged("1.5.0")).toBe(false);
    });

    it("is true once the cache expires, even with the same version", () => {
      // getCachedResult() returns null for an expired entry, and
      // isVersionChanged treats "no cache" the same as "version changed" -
      // so an expired-but-same-version cache reads as changed.
      const expired = {
        lastCheckTime: Date.now() - CACHE_TTL - 1000,
        currentVersion: "1.5.0",
        latestVersion: "1.5.0",
        hasUpdate: false,
        ttl: CACHE_TTL,
      };
      fs.writeFileSync(cacheFile, JSON.stringify(expired));
      expect(cache.isVersionChanged("1.5.0")).toBe(true);
    });
  });

  describe("clearCache", () => {
    it("removes an existing cache file", () => {
      cache.cacheResult("1.5.0", "1.5.0", false);
      expect(fs.existsSync(cacheFile)).toBe(true);

      cache.clearCache();
      expect(fs.existsSync(cacheFile)).toBe(false);
    });

    it("does not throw when there is nothing to clear", () => {
      expect(() => cache.clearCache()).not.toThrow();
    });
  });

  describe("getInstantResult", () => {
    it("says to check with no cached result when there is no cache", () => {
      expect(cache.getInstantResult("1.5.0")).toEqual({ shouldCheck: true });
    });

    it("says to check with no cached result when the version changed", () => {
      cache.cacheResult("1.4.0", "1.4.0", false);
      // Even though a cache entry exists, it's for a different version, so
      // it's intentionally not handed back as a usable fallback here.
      expect(cache.getInstantResult("1.5.0")).toEqual({ shouldCheck: true });
    });

    it("says not to check and returns the result when very recent", () => {
      cache.cacheResult("1.5.0", "1.5.0", false);
      const result = cache.getInstantResult("1.5.0");
      expect(result.shouldCheck).toBe(false);
      expect(result.cachedResult?.currentVersion).toBe("1.5.0");
    });

    it("says to check but still returns a stale-but-valid cached result", () => {
      const stale = {
        lastCheckTime: Date.now() - FAST_CHECK_TTL - 1000,
        currentVersion: "1.5.0",
        latestVersion: "1.5.0",
        hasUpdate: false,
        ttl: CACHE_TTL,
      };
      fs.writeFileSync(cacheFile, JSON.stringify(stale));

      const result = cache.getInstantResult("1.5.0");
      expect(result.shouldCheck).toBe(true);
      expect(result.cachedResult?.currentVersion).toBe("1.5.0");
    });
  });
});
