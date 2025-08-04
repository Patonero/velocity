import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

interface UpdateCacheData {
  lastCheckTime: number;
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  updateInfo?: any;
  ttl: number; // Time to live in milliseconds
}

export class UpdateCache {
  private cacheFilePath: string;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes TTL
  private readonly FAST_CHECK_TTL = 30 * 1000; // 30 seconds for very recent checks

  constructor() {
    const userDataPath = app.getPath('userData');
    this.cacheFilePath = path.join(userDataPath, 'update-cache.json');
  }

  /**
   * Check if we have a recent cached update result
   */
  public getCachedResult(): UpdateCacheData | null {
    try {
      if (!fs.existsSync(this.cacheFilePath)) {
        return null;
      }

      const cacheData = JSON.parse(fs.readFileSync(this.cacheFilePath, 'utf8'));
      const now = Date.now();
      
      // Check if cache is still valid
      if (now - cacheData.lastCheckTime < cacheData.ttl) {
        console.log('Using cached update result:', {
          age: Math.round((now - cacheData.lastCheckTime) / 1000),
          hasUpdate: cacheData.hasUpdate
        });
        return cacheData;
      }

      console.log('Update cache expired, will check for updates');
      return null;
    } catch (error) {
      console.error('Error reading update cache:', error);
      return null;
    }
  }

  /**
   * Cache the result of an update check
   */
  public cacheResult(currentVersion: string, latestVersion: string, hasUpdate: boolean, updateInfo?: any): void {
    try {
      const cacheData: UpdateCacheData = {
        lastCheckTime: Date.now(),
        currentVersion,
        latestVersion,
        hasUpdate,
        updateInfo,
        ttl: hasUpdate ? this.FAST_CHECK_TTL : this.CACHE_TTL // Shorter TTL if update available
      };

      fs.writeFileSync(this.cacheFilePath, JSON.stringify(cacheData, null, 2));
      console.log('Cached update result:', { hasUpdate, ttl: cacheData.ttl / 1000 });
    } catch (error) {
      console.error('Error caching update result:', error);
    }
  }

  /**
   * Check if current version matches cached version
   */
  public isVersionChanged(currentVersion: string): boolean {
    const cached = this.getCachedResult();
    return !cached || cached.currentVersion !== currentVersion;
  }

  /**
   * Clear the cache (useful for testing or force refresh)
   */
  public clearCache(): void {
    try {
      if (fs.existsSync(this.cacheFilePath)) {
        fs.unlinkSync(this.cacheFilePath);
        console.log('Update cache cleared');
      }
    } catch (error) {
      console.error('Error clearing update cache:', error);
    }
  }

  /**
   * Get a quick result for instant startup
   */
  public getInstantResult(currentVersion: string): { shouldCheck: boolean; cachedResult?: UpdateCacheData } {
    const cached = this.getCachedResult();
    
    if (!cached) {
      return { shouldCheck: true };
    }

    // If version changed, we need to check
    if (cached.currentVersion !== currentVersion) {
      return { shouldCheck: true };
    }

    // If we have a very recent result, use it instantly
    const age = Date.now() - cached.lastCheckTime;
    if (age < this.FAST_CHECK_TTL) {
      return { shouldCheck: false, cachedResult: cached };
    }

    // Otherwise, we should check but can show cached result initially
    return { shouldCheck: true, cachedResult: cached };
  }
}