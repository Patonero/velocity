// Splash Screen Controller
interface SplashAPI {
  getCurrentVersion: () => Promise<string>;
  checkForUpdates: () => Promise<{
    available: boolean;
    info?: any;
    error?: string;
  }>;
  downloadUpdate: () => Promise<{ success: boolean; error?: string }>;
  installUpdate: () => Promise<{ success: boolean; error?: string }>;
  openMainWindow: () => Promise<void>;
  onUpdateAvailable?: (callback: (info: any) => void) => void;
  onDownloadProgress?: (callback: (progress: any) => void) => void;
  onUpdateDownloaded?: (callback: (info: any) => void) => void;
  onUpdateError?: (callback: (error: string) => void) => void;
  onOpenMainWindow?: (callback: () => void) => void;
}

class SplashController {
  private currentState: string = "initial";
  private updateInfo: any = null;
  private isRetrying: boolean = false;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    await this.setupEventListeners();
    await this.loadVersion();
    await this.startUpdateCheck();
  }

  private async setupEventListeners(): Promise<void> {
    const splashAPI = (window as any).splashAPI as SplashAPI;

    // Update event listeners
    splashAPI.onUpdateAvailable?.((info: any) => {
      this.updateInfo = info;
      this.showState("update-available");
      this.updateVersionInfo(info.version);

      // Auto-start download after 2 seconds
      setTimeout(() => {
        this.downloadUpdate();
      }, 2000);
    });

    splashAPI.onDownloadProgress?.((progress: any) => {
      this.updateDownloadProgress(progress);
    });

    splashAPI.onUpdateDownloaded?.((info: any) => {
      this.showState("installing");
      // Auto-install after brief pause
      setTimeout(() => {
        this.installUpdate();
      }, 1500);
    });

    splashAPI.onUpdateError?.((error: string) => {
      this.showError(error);
    });

    splashAPI.onOpenMainWindow?.(() => {
      this.openMainWindow();
    });

    // Button event listeners
    const retryBtn = document.getElementById("retry-btn");
    const skipBtn = document.getElementById("skip-btn");

    retryBtn?.addEventListener("click", () => {
      this.retryUpdate();
    });

    skipBtn?.addEventListener("click", () => {
      this.skipUpdate();
    });
  }

  private async loadVersion(): Promise<void> {
    try {
      const version = await (window as any).splashAPI.getCurrentVersion();
      const versionElement = document.getElementById("current-version");
      if (versionElement) {
        versionElement.textContent = `v${version}`;
      }
    } catch (error) {
      console.error("Error loading version:", error);
    }
  }

  private async startUpdateCheck(): Promise<void> {
    // Show checking state
    setTimeout(() => {
      this.showState("checking");
    }, 1000);

    try {
      const result = await (window as any).splashAPI.checkForUpdates();

      if (result.available && result.info) {
        // Update available - event listener will handle this
        console.log("Update available:", result.info);
      } else {
        // No update available or development mode - proceed to main app
        setTimeout(() => {
          this.showState("ready");
          setTimeout(() => {
            this.openMainWindow();
          }, 1500);
        }, 1500);
      }
    } catch (error) {
      console.error("Error checking for updates:", error);
      // In development mode, just proceed to main app after showing the splash
      setTimeout(() => {
        this.showState("ready");
        setTimeout(() => {
          this.openMainWindow();
        }, 1500);
      }, 1000);
    }
  }

  private async downloadUpdate(): Promise<void> {
    this.showState("downloading");

    try {
      const result = await (window as any).splashAPI.downloadUpdate();

      if (!result.success) {
        throw new Error(result.error || "Download failed");
      }
    } catch (error) {
      console.error("Error downloading update:", error);
      this.showError(`Download failed: ${error}`);
    }
  }

  private async installUpdate(): Promise<void> {
    try {
      const result = await (window as any).splashAPI.installUpdate();

      if (!result.success) {
        throw new Error(result.error || "Installation failed");
      }

      // Installation successful - app will restart
    } catch (error) {
      console.error("Error installing update:", error);
      this.showError(`Installation failed: ${error}`);
    }
  }

  private async retryUpdate(): Promise<void> {
    this.isRetrying = true;
    this.showState("checking");
    await this.startUpdateCheck();
  }

  private async skipUpdate(): Promise<void> {
    this.showState("ready");
    setTimeout(() => {
      this.openMainWindow();
    }, 1000);
  }

  private async openMainWindow(): Promise<void> {
    try {
      await (window as any).splashAPI.openMainWindow();
    } catch (error) {
      console.error("Error opening main window:", error);
    }
  }

  private showState(state: string): void {
    // Hide all states
    const states = document.querySelectorAll(".loading-state");
    states.forEach((s) => s.classList.remove("active"));

    // Show target state
    const targetState = document.getElementById(`loading-${state}`);
    if (targetState) {
      targetState.classList.add("active");
      this.currentState = state;
    }
  }

  private updateVersionInfo(newVersion: string): void {
    const versionInfo = document.getElementById("update-version-info");
    if (versionInfo) {
      versionInfo.textContent = `Downloading version ${newVersion}...`;
    }
  }

  private updateDownloadProgress(progress: any): void {
    const percentage = Math.round(progress.percent);
    const speedMB = (progress.bytesPerSecond / 1024 / 1024).toFixed(1);
    const transferredMB = (progress.transferred / 1024 / 1024).toFixed(1);
    const totalMB = (progress.total / 1024 / 1024).toFixed(1);

    // Update circular progress
    const circle = document.querySelector(
      ".progress-ring-circle"
    ) as SVGCircleElement;
    const percentageElement = document.getElementById("download-percentage");
    const speedElement = document.getElementById("download-speed");
    const sizeElement = document.getElementById("download-size");

    if (circle) {
      const circumference = 2 * Math.PI * 36; // radius = 36
      const offset = circumference - (percentage / 100) * circumference;
      circle.style.strokeDashoffset = offset.toString();
    }

    if (percentageElement) {
      percentageElement.textContent = `${percentage}%`;
    }

    if (speedElement) {
      speedElement.textContent = `${speedMB} MB/s`;
    }

    if (sizeElement) {
      sizeElement.textContent = `${transferredMB} MB / ${totalMB} MB`;
    }
  }

  private showError(message: string): void {
    this.showState("error");
    const errorMessageElement = document.getElementById("error-message");
    if (errorMessageElement) {
      errorMessageElement.textContent = message;
    }
  }
}

// Initialize splash controller when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    new SplashController();
  });
} else {
  new SplashController();
}
