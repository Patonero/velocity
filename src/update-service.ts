import { autoUpdater } from 'electron-updater';
import { app } from 'electron';
import { UpdateCache } from './update-cache';

export class UpdateService {
  private cache: UpdateCache;
  private readonly CHECK_TIMEOUT = 10000; // 10 seconds timeout
  private isChecking = false;

  constructor() {
    this.cache = new UpdateCache();
  }

  /**
   * Fast update check with caching and timeout
   */
  public async checkForUpdatesOptimized(): Promise<{
    available: boolean;
    info?: any;
    error?: string;
    fromCache?: boolean;
  }> {
    const currentVersion = app.getVersion();
    
    // Get instant result from cache
    const { shouldCheck, cachedResult } = this.cache.getInstantResult(currentVersion);
    
    // If we have a very recent cached result, return it immediately
    if (!shouldCheck && cachedResult) {
      return {
        available: cachedResult.hasUpdate,
        info: cachedResult.updateInfo,
        fromCache: true
      };
    }

    // If already checking, don't start another check
    if (this.isChecking) {
      return cachedResult ? {
        available: cachedResult.hasUpdate,
        info: cachedResult.updateInfo,
        fromCache: true
      } : {
        available: false,
        error: 'Update check in progress'
      };
    }

    // Perform actual update check with timeout
    return this.performUpdateCheck(currentVersion, cachedResult);
  }

  /**
   * Perform the actual update check with timeout
   */
  private async performUpdateCheck(currentVersion: string, fallbackResult?: any): Promise<{
    available: boolean;
    info?: any;
    error?: string;
    fromCache?: boolean;
  }> {
    this.isChecking = true;

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Update check timeout')), this.CHECK_TIMEOUT);
      });

      // Create update check promise
      const updateCheckPromise = new Promise<{ available: boolean; info?: any }>((resolve, reject) => {
        let resolved = false;

        const cleanup = () => {
          if (!resolved) {
            autoUpdater.removeAllListeners('update-available');
            autoUpdater.removeAllListeners('update-not-available');
            autoUpdater.removeAllListeners('error');
          }
        };

        autoUpdater.once('update-available', (info) => {
          if (!resolved) {
            resolved = true;
            cleanup();
            resolve({ available: true, info });
          }
        });

        autoUpdater.once('update-not-available', (info) => {
          if (!resolved) {
            resolved = true;
            cleanup();
            resolve({ available: false, info });
          }
        });

        autoUpdater.once('error', (error) => {
          if (!resolved) {
            resolved = true;
            cleanup();
            reject(error);
          }
        });

        // Start the check
        autoUpdater.checkForUpdates().catch(reject);
      });

      // Race between timeout and update check
      const result = await Promise.race([updateCheckPromise, timeoutPromise]);
      
      // Cache the successful result
      this.cache.cacheResult(
        currentVersion,
        result.info?.version || currentVersion,
        result.available,
        result.info
      );

      return result;

    } catch (error) {
      console.error('Update check failed:', error);
      
      // If we have fallback cached result, use it
      if (fallbackResult) {
        console.log('Using fallback cached result due to error');
        return {
          available: fallbackResult.hasUpdate,
          info: fallbackResult.updateInfo,
          fromCache: true
        };
      }

      return {
        available: false,
        error: error instanceof Error ? error.message : 'Update check failed'
      };
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Clear cache for testing
   */
  public clearCache(): void {
    this.cache.clearCache();
  }

  /**
   * Background update check (non-blocking)
   */
  public async backgroundUpdateCheck(): Promise<void> {
    try {
      await this.checkForUpdatesOptimized();
    } catch (error) {
      console.log('Background update check failed:', error);
    }
  }
}