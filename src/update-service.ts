import { autoUpdater } from 'electron-updater';
import { app } from 'electron';
import { UpdateCache } from './update-cache';

export class UpdateService {
  private cache: UpdateCache;
  private readonly CHECK_TIMEOUT = 10000; // 10 seconds timeout
  private isChecking = false;

  constructor() {
    this.cache = new UpdateCache();
    
    // Configure auto-updater for optimal delta updates
    if (process.env.NODE_ENV !== 'development') {
      const { autoUpdater } = require('electron-updater');
      
      // Force delta downloads when possible
      autoUpdater.forceDevUpdateConfig = false;
      autoUpdater.allowDowngrade = false;
      autoUpdater.allowPrerelease = false;
    }
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

      // Create update check promise.
      //
      // We resolve off the autoUpdater events rather than the checkForUpdates()
      // promise so the caller gets a clean available/not-available answer.
      // Downloading is NOT triggered here - electron-updater does it itself
      // (autoDownload = true) when an update is actually available. The old code
      // called downloadUpdate() whenever result.updateInfo was truthy, but
      // electron-updater always populates updateInfo (with the latest release,
      // update or not), so on every no-update launch it fired a bogus
      // downloadUpdate() -> "Please check update first" error -> the splash
      // flashed "Update failed".
      const updateCheckPromise = new Promise<{ available: boolean; info?: any }>((resolve, reject) => {
        let settled = false;

        const onAvailable = (info: any) => finish(() => resolve({ available: true, info }));
        const onNotAvailable = (info: any) => finish(() => resolve({ available: false, info }));
        const onError = (error: any) => finish(() => reject(error));

        // Remove only the listeners we added - never touch 'error' wholesale,
        // main.ts keeps a permanent 'error' listener on the same emitter.
        const detach = () => {
          autoUpdater.removeListener('update-available', onAvailable);
          autoUpdater.removeListener('update-not-available', onNotAvailable);
          autoUpdater.removeListener('error', onError);
        };

        function finish(action: () => void) {
          if (settled) return;
          settled = true;
          detach();
          action();
        }

        autoUpdater.on('update-available', onAvailable);
        autoUpdater.on('update-not-available', onNotAvailable);
        autoUpdater.on('error', onError);

        // Start the check; surface a rejected check promise as the failure.
        autoUpdater.checkForUpdates().catch((err) => finish(() => reject(err)));
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

  /**
   * Get estimated patch size for delta updates
   */
  public getEstimatedPatchSize(updateInfo: any): { estimated: string; savings: string } {
    if (!updateInfo) {
      return { estimated: 'Unknown', savings: '0%' };
    }

    // Typical delta update is 5-15% of full size
    const fullSize = updateInfo.files?.[0]?.size || 200 * 1024 * 1024; // 200MB default
    const deltaSize = fullSize * 0.1; // Estimate 10% of full size for delta
    const savings = Math.round((1 - deltaSize / fullSize) * 100);

    return {
      estimated: `${(deltaSize / 1024 / 1024).toFixed(1)} MB`,
      savings: `${savings}% smaller`
    };
  }
}