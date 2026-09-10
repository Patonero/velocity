// Splash screen controller.
//
// The splash is now purely a branding screen shown while the main window loads.
// It does no update checking, downloading, or IPC beyond reading the version to
// display. The main process closes it as soon as the main window is ready.

interface SplashAPI {
  getCurrentVersion: () => Promise<string>;
}

interface Window {
  splashAPI: SplashAPI;
}

async function showVersion(): Promise<void> {
  try {
    const version = await window.splashAPI.getCurrentVersion();
    const el = document.getElementById("current-version");
    if (el) {
      el.textContent = `v${version}`;
    }
  } catch (error) {
    console.error("Error loading version:", error);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    void showVersion();
  });
} else {
  void showVersion();
}
