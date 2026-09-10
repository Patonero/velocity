// No imports needed - we'll define types inline for browser compatibility

// Security: HTML escaping to prevent XSS
const escapeHtml = (text: string): string => {
  if (!text || typeof text !== "string") {
    return "";
  }

  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
};

// Static inline SVG icons (trusted, no user data interpolated)
const ICONS = {
  play: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M6 4.5v11l9-5.5-9-5.5Z"/></svg>',
  edit: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13.5 3.5a1.7 1.7 0 0 1 2.4 2.4L7 15l-3.5 1L4.5 12.5l9-9Z"/></svg>',
  delete:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5h12M8 5.5V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M6 5.5 6.6 16a1 1 0 0 0 1 1h4.8a1 1 0 0 0 1-1l.6-10.5"/></svg>',
  controller:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 12h12l1.5 5.5a2 2 0 0 1-1.93 2.5 2 2 0 0 1-1.8-1.13L15 17H9l-.77 1.87A2 2 0 0 1 6.43 20a2 2 0 0 1-1.93-2.5L6 12Z"/><path d="M6 12 7.2 6.6A3 3 0 0 1 10.13 4h3.74a3 3 0 0 1 2.93 2.6L18 12"/><line x1="9" y1="14.5" x2="9" y2="16.5"/><line x1="8" y1="15.5" x2="10" y2="15.5"/><circle cx="15" cy="14.5" r="0.9" fill="currentColor" stroke="none"/><circle cx="17" cy="16.5" r="0.9" fill="currentColor" stroke="none"/></svg>',
  sun: '<svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="10" cy="10" r="3.5"/><path d="M10 2.5v2M10 15.5v2M17.5 10h-2M4.5 10h-2M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4M15.3 15.3l-1.4-1.4M6.1 6.1L4.7 4.7"/></svg>',
  moon: '<svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor"><path d="M15.5 12.6A6.5 6.5 0 0 1 7.4 4.5a6.5 6.5 0 1 0 8.1 8.1Z"/></svg>',
  monitor:
    '<svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4" width="15" height="10" rx="1.2"/><line x1="7" y1="17" x2="13" y2="17"/><line x1="10" y1="14" x2="10" y2="17"/></svg>',
  launching:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="10" cy="10" r="6.5" stroke-dasharray="30 10"/></svg>',
  running: '<svg viewBox="0 0 20 20" fill="currentColor"><rect x="5.5" y="5.5" width="9" height="9" rx="1.5"/></svg>',
};

// Security: Validate and sanitize file paths
const isValidFilePath = (path: string): boolean => {
  if (!path || typeof path !== "string") {
    return false;
  }

  // Check for path traversal and dangerous patterns
  const dangerousPatterns = [
    /\.\.\//, // Path traversal (Unix)
    /\.\.\\/, // Path traversal (Windows)
    /[<>"|?*]/, // Windows forbidden characters (excluding colon for drive letters)
    /javascript:/i, // Protocol injection
    /data:/i, // Data URLs
    /vbscript:/i, // VBScript injection
    /^https?:/i, // HTTP/HTTPS URLs
    /^file:\/\/\//, // File protocol with network path
    /[\x00-\x1f]/, // Control characters
  ];

  // Special handling for colons - allow only at position 1 for drive letters
  if (path.includes(":")) {
    const colonIndex = path.indexOf(":");
    // Allow only if colon is at position 1 and preceded by a single letter (drive letter)
    if (colonIndex !== 1 || !/^[a-zA-Z]:/.test(path)) {
      return false;
    }
  }

  return !dangerousPatterns.some((pattern) => pattern.test(path));
};

// Security: Sanitize user input
const sanitizeInput = (input: string, maxLength: number = 1000): string => {
  if (!input || typeof input !== "string") {
    return "";
  }

  return input
    .trim()
    .substring(0, maxLength)
    .replace(/[<>'"&]/g, ""); // Remove potential XSS characters
};

interface EmulatorConfig {
  id: string;
  name: string;
  description?: string;
  executablePath: string;
  iconPath?: string;
  arguments?: string;
  workingDirectory?: string;
  platform: string;
  emulatorType: string;
  dateAdded: Date;
  lastLaunched?: Date;
  launchCount: number;
}

interface LauncherSettings {
  emulators: EmulatorConfig[];
  theme: "light" | "dark" | "auto";
  viewMode: "grid" | "list";
  gridSize: "small" | "medium" | "large";
  sortBy:
    | "name"
    | "dateAdded"
    | "lastLaunched"
    | "launchCount"
    | "emulatorType";
  showDescriptions: boolean;
  autoUpdateCheck: boolean;
  launchTracking: boolean;
}

interface ElectronAPI {
  openExternal: (url: string) => Promise<void>;
  loadSettings: () => Promise<LauncherSettings>;
  saveSettings: (settings: LauncherSettings) => Promise<void>;
  addEmulator: (
    emulator: Omit<EmulatorConfig, "id" | "dateAdded" | "launchCount">
  ) => Promise<string>;
  updateEmulator: (
    id: string,
    updates: Partial<EmulatorConfig>
  ) => Promise<boolean>;
  removeEmulator: (id: string) => Promise<boolean>;
  incrementLaunchCount: (id: string) => Promise<void>;
  showOpenDialog: (options: any) => Promise<any>;
  launchEmulator: (
    emulatorId: string,
    executablePath: string,
    args?: string,
    workingDirectory?: string
  ) => Promise<any>;
  isEmulatorRunning: (
    emulatorId: string
  ) => Promise<{ isRunning: boolean; pid?: number }>;
  getRunningEmulators: () => Promise<Array<{ id: string; pid: number }>>;
  extractIcon: (
    executablePath: string,
    emulatorId: string
  ) => Promise<string | null>;
  cleanupIcons: (activeEmulatorIds: string[]) => Promise<boolean>;
  onEmulatorStopped?: (callback: (emulatorId: string) => void) => void;

  // Update operations
  checkForUpdates: () => Promise<{
    available: boolean;
    info?: any;
    error?: string;
    message?: string;
  }>;
  downloadUpdate: () => Promise<{
    success: boolean;
    error?: string;
    message?: string;
  }>;
  installUpdate: () => Promise<{
    success: boolean;
    error?: string;
    message?: string;
  }>;
  getVersion: () => Promise<string>;

  // Update event listeners
  onUpdateAvailable?: (callback: (info: any) => void) => void;
  onUpdateNotAvailable?: (callback: (info: any) => void) => void;
  onDownloadProgress?: (callback: (progress: any) => void) => void;
  onUpdateDownloaded?: (callback: (info: any) => void) => void;
  onAppUpdated?: (callback: (version: string) => void) => void;
}

interface Window {
  electronAPI: ElectronAPI;
}

// Initialize Velocity Launcher

class VelocityLauncher {
  private settings: LauncherSettings | null = null;
  private emulatorGrid: HTMLElement | null = null;
  private emulatorList: HTMLElement | null = null;
  private emptyState: HTMLElement | null = null;
  private addEmulatorModal: HTMLElement | null = null;
  private emulatorForm: HTMLFormElement | null = null;
  private confirmationModal: HTMLElement | null = null;
  private updateModal: HTMLElement | null = null;
  private settingsModal: HTMLElement | null = null;
  private currentEditingId: string | null = null;
  private systemPrefersDark: boolean = false;
  private updateInfo: any = null;
  private updateDownloaded: boolean = false;
  private searchQuery: string = "";
  private typeOptions: Array<{ group: string; value: string; label: string }> =
    [];
  private typeActiveIndex: number = -1;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", async () => {
        await this.loadAndSetup();
      });
    } else {
      await this.loadAndSetup();
    }
  }

  private async loadAndSetup(): Promise<void> {
    this.detectSystemTheme();
    await this.loadSettings();
    this.setupElements();
    this.setupEventListeners();
    this.initializeTypeCombobox();
    this.initializeTheme();
    this.initializeSortSelect();
    this.initializeViewMode();
    this.renderEmulators();
    this.setupUpdateListeners();
  }

  private async loadSettings(): Promise<void> {
    try {
      this.settings = await window.electronAPI.loadSettings();
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  }

  private setupElements(): void {
    this.emulatorGrid = document.getElementById("emulator-grid");
    this.emulatorList = document.getElementById("emulator-list");
    this.emptyState = document.getElementById("empty-state");
    this.addEmulatorModal = document.getElementById("add-emulator-modal");
    this.emulatorForm = document.getElementById(
      "emulator-form"
    ) as HTMLFormElement;
    this.confirmationModal = document.getElementById("confirmation-modal");
    this.updateModal = document.getElementById("update-modal");
    this.settingsModal = document.getElementById("settings-modal");
  }

  private setupEventListeners(): void {
    // Add emulator buttons
    const addEmulatorBtn = document.getElementById("add-emulator-btn");
    const addFirstEmulatorBtn = document.getElementById(
      "add-first-emulator-btn"
    );

    addEmulatorBtn?.addEventListener("click", () => {
      this.showAddEmulatorModal();
    });
    addFirstEmulatorBtn?.addEventListener("click", () => {
      this.showAddEmulatorModal();
    });

    // Modal controls
    const closeModalBtn = document.getElementById("close-modal-btn");
    const cancelBtn = document.getElementById("cancel-btn");

    closeModalBtn?.addEventListener("click", () => this.hideAddEmulatorModal());
    cancelBtn?.addEventListener("click", () => this.hideAddEmulatorModal());

    // File browsers
    const browseExecutableBtn = document.getElementById(
      "browse-executable-btn"
    );
    const browseWorkdirBtn = document.getElementById("browse-workdir-btn");

    browseExecutableBtn?.addEventListener("click", () =>
      this.browseExecutable()
    );
    browseWorkdirBtn?.addEventListener("click", () =>
      this.browseWorkingDirectory()
    );

    // Form submission
    this.emulatorForm?.addEventListener("submit", (e) =>
      this.handleFormSubmit(e)
    );

    // Modal backdrop click
    // Note: no backdrop-click-to-close here on purpose - this form can hold
    // several typed fields, and a stray click shouldn't silently discard it.
    // Use the Cancel/close button or Escape instead.

    // Confirmation modal event listeners
    const confirmYesBtn = document.getElementById("confirm-yes-btn");
    const confirmNoBtn = document.getElementById("confirm-no-btn");
    const confirmCloseBtn = document.getElementById("confirm-close-btn");

    confirmYesBtn?.addEventListener("click", () => this.handleConfirmYes());
    confirmNoBtn?.addEventListener("click", () => this.hideConfirmationModal());
    confirmCloseBtn?.addEventListener("click", () =>
      this.hideConfirmationModal()
    );

    this.confirmationModal?.addEventListener("click", (e) => {
      if (e.target === this.confirmationModal) {
        this.hideConfirmationModal();
      }
    });

    // Sort controls
    const sortSelect = document.getElementById("sort-select");
    sortSelect?.addEventListener("change", (e) => {
      const target = e.target as HTMLSelectElement;
      this.sortEmulators(target.value as LauncherSettings["sortBy"]);
    });

    // Search
    const searchInput = document.getElementById("search-input");
    searchInput?.addEventListener("input", (e) => {
      const target = e.target as HTMLInputElement;
      this.searchQuery = target.value;
      this.renderEmulators();
    });

    // View controls
    const gridViewBtn = document.getElementById("grid-view-btn");
    const listViewBtn = document.getElementById("list-view-btn");

    gridViewBtn?.addEventListener("click", () => this.setViewMode("grid"));
    listViewBtn?.addEventListener("click", () => this.setViewMode("list"));

    // Theme controls
    const themeToggle = document.getElementById("theme-toggle");
    themeToggle?.addEventListener("click", () => this.toggleTheme());

    // Settings button
    const settingsBtn = document.getElementById("settings-btn");
    settingsBtn?.addEventListener("click", () => this.showSettingsModal());

    // Listen for emulator stopped events from main process
    window.electronAPI.onEmulatorStopped?.((emulatorId: string) => {
      this.setEmulatorButtonState(emulatorId, "stopped");
    });

    // Update button event listener
    const updateBtn = document.getElementById("update-btn");
    updateBtn?.addEventListener("click", () => this.showUpdateModal());

    // Update modal event listeners
    const updateCloseBtn = document.getElementById("update-close-btn");
    const updateLaterBtn = document.getElementById("update-later-btn");
    const updateDownloadBtn = document.getElementById("update-download-btn");
    const updateInstallBtn = document.getElementById("update-install-btn");

    updateCloseBtn?.addEventListener("click", () => this.hideUpdateModal());
    updateLaterBtn?.addEventListener("click", () => this.hideUpdateModal());
    updateDownloadBtn?.addEventListener("click", () => this.downloadUpdate());
    updateInstallBtn?.addEventListener("click", () => this.installUpdate());

    this.updateModal?.addEventListener("click", (e) => {
      if (e.target === this.updateModal) {
        this.hideUpdateModal();
      }
    });

    // Settings modal event listeners
    const settingsCloseBtn = document.getElementById("settings-close-btn");
    const settingsResetBtn = document.getElementById("settings-reset");
    const settingsSaveBtn = document.getElementById("settings-save");

    settingsCloseBtn?.addEventListener("click", () => this.hideSettingsModal());
    settingsResetBtn?.addEventListener("click", () =>
      this.resetSettingsToDefaults()
    );
    settingsSaveBtn?.addEventListener("click", () =>
      this.saveSettingsChanges()
    );

    // Settings tabs
    const settingsNavBtns = document.querySelectorAll(".settings-nav-btn");
    settingsNavBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const target = e.target as HTMLButtonElement;
        const tabId = target.getAttribute("data-tab");
        if (tabId) {
          this.switchSettingsTab(tabId);
        }
      });
    });

    // Settings controls
    const themeSelect = document.getElementById(
      "theme-select"
    ) as HTMLSelectElement;
    const defaultViewSelect = document.getElementById(
      "default-view"
    ) as HTMLSelectElement;
    const gridSizeSelect = document.getElementById(
      "grid-size-select"
    ) as HTMLSelectElement;
    const showDescriptionsToggle = document.getElementById(
      "show-descriptions-toggle"
    ) as HTMLInputElement;
    const autoUpdateCheck = document.getElementById(
      "auto-update-check"
    ) as HTMLInputElement;
    const launchTrackingCheck = document.getElementById(
      "launch-tracking"
    ) as HTMLInputElement;
    const manualUpdateBtn = document.getElementById("manual-update-check");

    themeSelect?.addEventListener("change", (e) => {
      const target = e.target as HTMLSelectElement;
      this.updateThemeSetting(target.value as "light" | "dark" | "auto");
    });

    defaultViewSelect?.addEventListener("change", (e) => {
      const target = e.target as HTMLSelectElement;
      this.updateViewModeSetting(target.value as "grid" | "list");
    });

    gridSizeSelect?.addEventListener("change", (e) => {
      const target = e.target as HTMLSelectElement;
      this.updateGridSizeSetting(target.value as "small" | "medium" | "large");
    });

    showDescriptionsToggle?.addEventListener("change", (e) => {
      const target = e.target as HTMLInputElement;
      this.updateShowDescriptionsSetting(target.checked);
    });

    manualUpdateBtn?.addEventListener("click", () =>
      this.checkForUpdatesManually()
    );

    // Auto-update checkbox
    autoUpdateCheck?.addEventListener("change", (e) => {
      const target = e.target as HTMLInputElement;
      this.updateAutoUpdateSetting(target.checked);
    });

    // Launch tracking checkbox
    launchTrackingCheck?.addEventListener("change", (e) => {
      const target = e.target as HTMLInputElement;
      this.updateLaunchTrackingSetting(target.checked);
    });

    // About section links
    const githubLink = document.getElementById("github-link");
    const donateLink = document.getElementById("donate-link");

    githubLink?.addEventListener("click", (e) => {
      e.preventDefault();
      this.openExternalLink("https://github.com/Patonero/velocity");
    });

    donateLink?.addEventListener("click", (e) => {
      e.preventDefault();
      this.openExternalLink("https://ko-fi.com/vonnycakes");
    });

    this.settingsModal?.addEventListener("click", (e) => {
      if (e.target === this.settingsModal) {
        this.hideSettingsModal();
      }
    });

    // Escape closes whichever modal is currently open
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;

      if (
        this.confirmationModal &&
        !this.confirmationModal.classList.contains("hidden")
      ) {
        this.hideConfirmationModal();
      } else if (
        this.addEmulatorModal &&
        !this.addEmulatorModal.classList.contains("hidden")
      ) {
        this.hideAddEmulatorModal();
      } else if (
        this.settingsModal &&
        !this.settingsModal.classList.contains("hidden")
      ) {
        this.hideSettingsModal();
      } else if (
        this.updateModal &&
        !this.updateModal.classList.contains("hidden")
      ) {
        this.hideUpdateModal();
      }
    });
  }

  private renderEmulators(): void {
    if (
      !this.settings ||
      !this.emulatorGrid ||
      !this.emulatorList ||
      !this.emptyState
    )
      return;

    const hasEmulators = this.settings.emulators.length > 0;
    const sortControls = document.getElementById("sort-controls");
    const noResultsState = document.getElementById("no-results-state");

    const query = this.searchQuery.trim().toLowerCase();
    const visibleEmulators = query
      ? this.settings.emulators.filter(
          (emulator) =>
            emulator.name.toLowerCase().includes(query) ||
            emulator.emulatorType.toLowerCase().includes(query)
        )
      : this.settings.emulators;

    this.applyGridSize();

    if (hasEmulators) {
      this.emptyState.classList.add("hidden");
      sortControls?.classList.remove("hidden");

      // Clear both views
      this.emulatorGrid.innerHTML = "";
      const listItems = document.getElementById("emulator-list-items");
      if (listItems) listItems.innerHTML = "";

      if (visibleEmulators.length === 0) {
        noResultsState?.classList.remove("hidden");
        this.emulatorGrid.classList.add("hidden");
        this.emulatorList.classList.add("hidden");
        return;
      }

      noResultsState?.classList.add("hidden");

      // Populate both views
      visibleEmulators.forEach(async (emulator) => {
        // Create grid card
        const card = this.createEmulatorCard(emulator);
        this.emulatorGrid!.appendChild(card);

        // Create list item
        const listItem = this.createEmulatorListItem(emulator);
        listItems?.appendChild(listItem);

        // Check if emulator is currently running and update button state
        try {
          const runningStatus = await window.electronAPI.isEmulatorRunning(
            emulator.id
          );
          if (runningStatus.isRunning) {
            this.setEmulatorButtonState(emulator.id, "running");
          }
        } catch (error) {
          console.error(
            `Error checking running status for ${emulator.id}:`,
            error
          );
        }
      });

      // Show the appropriate view based on current mode
      this.updateViewDisplay();
    } else {
      this.emptyState.classList.remove("hidden");
      this.emulatorGrid.classList.add("hidden");
      this.emulatorList.classList.add("hidden");
      sortControls?.classList.add("hidden");
      noResultsState?.classList.add("hidden");
    }
  }

  private createEmulatorCard(emulator: EmulatorConfig): HTMLElement {
    const card = document.createElement("div");
    card.className = "emulator-card";
    card.setAttribute("data-emulator-id", emulator.id);

    const formatDate = (date: Date) => {
      return new Date(date).toLocaleDateString();
    };

    // Security: Validate and escape all user-provided data
    const safeName = escapeHtml(emulator.name);
    const safeType = escapeHtml(emulator.emulatorType);
    const showDescriptions = this.settings?.showDescriptions !== false;
    const safeDescription =
      emulator.description && showDescriptions
        ? escapeHtml(emulator.description)
        : "";
    const safeId = escapeHtml(emulator.id);

    // Validate icon path for security
    const safeIconPath =
      emulator.iconPath && isValidFilePath(emulator.iconPath)
        ? emulator.iconPath
        : null;

    // Create icon element with safe data
    const iconElement = safeIconPath
      ? `<img src="file://${safeIconPath}" alt="${safeName}" class="emulator-icon" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
         <div class="emulator-icon-fallback" style="display: none;">${ICONS.controller}</div>`
      : `<div class="emulator-icon-fallback">${ICONS.controller}</div>`;

    const statsLine = emulator.lastLaunched
      ? `${emulator.launchCount} launches · last ${formatDate(emulator.lastLaunched)}`
      : `${emulator.launchCount} launches`;

    card.innerHTML = `
      <div class="emulator-card-content">
        <div class="emulator-main">
          <div class="emulator-icon-container">
            ${iconElement}
          </div>
          <div class="emulator-info">
            <h3 class="emulator-name">${safeName}</h3>
            <span class="emulator-type">${safeType}</span>
            ${
              safeDescription
                ? `<p class="emulator-description">${safeDescription}</p>`
                : ""
            }
          </div>
        </div>
        <div class="emulator-actions">
          <button class="action-btn edit-btn" title="Edit configuration" aria-label="Edit ${safeName}" data-emulator-id="${safeId}">
            <span class="action-icon">${ICONS.edit}</span>
          </button>
          <button class="action-btn delete-btn" title="Remove emulator" aria-label="Delete ${safeName}" data-emulator-id="${safeId}">
            <span class="action-icon">${ICONS.delete}</span>
          </button>
        </div>
      </div>
      <div class="emulator-launch-area">
        <div class="emulator-stats">${statsLine}</div>
        <button class="play-button" title="Launch ${safeName}" aria-label="Launch ${safeName}">
          <span class="play-icon">${ICONS.play}</span>
        </button>
      </div>
    `;

    // Add click to launch
    card.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".emulator-actions")) {
        this.launchEmulator(emulator);
      }
    });

    // Add play button event listener
    const playButton = card.querySelector(".play-button");
    playButton?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.launchEmulator(emulator);
    });

    // Add button event listeners
    const editBtn = card.querySelector(".edit-btn");
    const deleteBtn = card.querySelector(".delete-btn");

    editBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.editEmulator(emulator.id);
    });

    deleteBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.deleteEmulator(emulator.id);
    });

    return card;
  }

  // Keyboard focus management for modals: traps Tab/Shift+Tab inside the
  // topmost open modal and restores focus to whatever triggered it on
  // close. A stack (not a single slot) because the confirmation modal can
  // open on top of the settings modal (the "reset settings" flow).
  private focusTrapStack: Array<() => void> = [];

  private getFocusableElements(container: HTMLElement): HTMLElement[] {
    return Array.from(
      container.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => el.offsetParent !== null);
  }

  private trapFocus(modal: HTMLElement, defaultFocusEl?: HTMLElement | null): void {
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = this.getFocusableElements(modal);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    modal.addEventListener("keydown", handleKeydown);
    (defaultFocusEl ?? this.getFocusableElements(modal)[0])?.focus();

    this.focusTrapStack.push(() => {
      modal.removeEventListener("keydown", handleKeydown);
      previouslyFocused?.focus();
    });
  }

  private releaseFocusTrap(): void {
    this.focusTrapStack.pop()?.();
  }

  private showAddEmulatorModal(): void {
    if (!this.addEmulatorModal) return;
    this.addEmulatorModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";

    if (!this.currentEditingId) {
      this.emulatorForm?.reset();
      // Reset modal to "Add" mode
      const modalTitle = document.querySelector(
        "#add-emulator-modal .modal-header h2"
      );
      const submitBtn = document.querySelector(
        "#add-emulator-modal .btn-submit"
      );
      if (modalTitle) modalTitle.textContent = "Add New Emulator";
      if (submitBtn)
        submitBtn.innerHTML = '<span class="btn-icon">✓</span>Add Emulator';

      if (this.typeOptions.length > 0) {
        this.selectTypeOption(
          this.typeOptions[0].value,
          this.typeOptions[0].label
        );
      }
    }

    const nameInput = document.getElementById(
      "emulator-name"
    ) as HTMLElement | null;
    this.trapFocus(this.addEmulatorModal, nameInput);
  }

  private hideAddEmulatorModal(): void {
    this.addEmulatorModal?.classList.add("hidden");
    this.currentEditingId = null;
    document.body.style.overflow = "";
    this.releaseFocusTrap();
  }

  // System Type combobox: a searchable stand-in for the ~50-option <select>
  // (still in the DOM as #emulator-type-source, hidden, used only as this
  // combobox's data source so the option list has one place to live).
  private initializeTypeCombobox(): void {
    const source = document.getElementById(
      "emulator-type-source"
    ) as HTMLSelectElement | null;
    const searchInput = document.getElementById(
      "emulator-type-search"
    ) as HTMLInputElement | null;
    const hiddenInput = document.getElementById(
      "emulator-type"
    ) as HTMLInputElement | null;
    const listbox = document.getElementById("emulator-type-listbox");
    const combobox = document.getElementById("emulator-type-combobox");
    if (!source || !searchInput || !hiddenInput || !listbox || !combobox)
      return;

    Array.from(source.children).forEach((child) => {
      if (!(child instanceof HTMLOptGroupElement)) return;
      Array.from(child.children).forEach((opt) => {
        if (opt instanceof HTMLOptionElement) {
          this.typeOptions.push({
            group: child.label,
            value: opt.value,
            label: opt.textContent?.trim() || opt.value,
          });
        }
      });
    });

    searchInput.addEventListener("input", () => {
      this.renderTypeOptions(searchInput.value);
      this.openTypeListbox();
    });

    searchInput.addEventListener("focus", () => {
      this.renderTypeOptions(searchInput.value);
      this.openTypeListbox();
    });

    searchInput.addEventListener("keydown", (e) => {
      const options = Array.from(
        listbox.querySelectorAll<HTMLElement>(".combobox-option")
      );

      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (options.length === 0) return;
        this.typeActiveIndex = (this.typeActiveIndex + 1) % options.length;
        this.highlightTypeOption(options);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (options.length === 0) return;
        this.typeActiveIndex =
          (this.typeActiveIndex - 1 + options.length) % options.length;
        this.highlightTypeOption(options);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const target = options[this.typeActiveIndex] ?? options[0];
        if (target?.dataset.value !== undefined) {
          this.selectTypeOption(
            target.dataset.value,
            target.dataset.label || target.dataset.value
          );
          this.closeTypeListbox();
        }
      } else if (e.key === "Escape") {
        this.revertTypeInput();
        this.closeTypeListbox();
      }
    });

    searchInput.addEventListener("blur", () => {
      // Deferred: a mousedown-selection on an option runs first (it calls
      // preventDefault so the input never actually loses focus for a
      // click), so this only fires for a genuine focus-away.
      setTimeout(() => {
        this.revertTypeInput();
        this.closeTypeListbox();
      }, 0);
    });

    document.addEventListener("click", (e) => {
      if (!combobox.contains(e.target as Node)) {
        this.closeTypeListbox();
      }
    });
  }

  private renderTypeOptions(filter: string): void {
    const listbox = document.getElementById("emulator-type-listbox");
    const hiddenInput = document.getElementById(
      "emulator-type"
    ) as HTMLInputElement | null;
    if (!listbox) return;

    const query = filter.trim().toLowerCase();
    const matches = query
      ? this.typeOptions.filter((opt) =>
          opt.label.toLowerCase().includes(query)
        )
      : this.typeOptions;

    this.typeActiveIndex = -1;

    if (matches.length === 0) {
      listbox.innerHTML = `<li class="combobox-empty">No matching system type</li>`;
      return;
    }

    const selectedValue = hiddenInput?.value;
    let html = "";
    let currentGroup = "";
    matches.forEach((opt) => {
      if (opt.group !== currentGroup) {
        currentGroup = opt.group;
        html += `<li class="combobox-group-label">${escapeHtml(currentGroup)}</li>`;
      }
      const selectedClass = opt.value === selectedValue ? " selected" : "";
      html += `<li class="combobox-option${selectedClass}" role="option" data-value="${escapeHtml(
        opt.value
      )}" data-label="${escapeHtml(opt.label)}">${escapeHtml(opt.label)}</li>`;
    });
    listbox.innerHTML = html;

    listbox
      .querySelectorAll<HTMLElement>(".combobox-option")
      .forEach((el) => {
        el.addEventListener("mousedown", (e) => {
          e.preventDefault(); // keep focus in the input so blur doesn't fire first
          if (el.dataset.value !== undefined) {
            this.selectTypeOption(
              el.dataset.value,
              el.dataset.label || el.dataset.value
            );
          }
          this.closeTypeListbox();
        });
      });
  }

  private highlightTypeOption(options: HTMLElement[]): void {
    options.forEach((el, i) =>
      el.classList.toggle("active", i === this.typeActiveIndex)
    );
    options[this.typeActiveIndex]?.scrollIntoView({ block: "nearest" });
  }

  private selectTypeOption(value: string, label: string): void {
    const hiddenInput = document.getElementById(
      "emulator-type"
    ) as HTMLInputElement | null;
    const searchInput = document.getElementById(
      "emulator-type-search"
    ) as HTMLInputElement | null;
    if (hiddenInput) hiddenInput.value = value;
    if (searchInput) searchInput.value = label;
  }

  private setTypeComboboxValue(value: string): void {
    const match = this.typeOptions.find((opt) => opt.value === value);
    this.selectTypeOption(value, match?.label ?? value);
  }

  private revertTypeInput(): void {
    const hiddenInput = document.getElementById(
      "emulator-type"
    ) as HTMLInputElement | null;
    const searchInput = document.getElementById(
      "emulator-type-search"
    ) as HTMLInputElement | null;
    if (!hiddenInput || !searchInput) return;
    const match = this.typeOptions.find((opt) => opt.value === hiddenInput.value);
    searchInput.value = match?.label ?? "";
  }

  private openTypeListbox(): void {
    document.getElementById("emulator-type-listbox")?.classList.remove("hidden");
    document
      .getElementById("emulator-type-search")
      ?.setAttribute("aria-expanded", "true");
  }

  private closeTypeListbox(): void {
    document.getElementById("emulator-type-listbox")?.classList.add("hidden");
    document
      .getElementById("emulator-type-search")
      ?.setAttribute("aria-expanded", "false");
  }

  private async browseExecutable(): Promise<void> {
    try {
      const result = await window.electronAPI.showOpenDialog({
        title: "Select Emulator Executable",
        filters: [
          { name: "Executable Files", extensions: ["exe", "app"] },
          { name: "All Files", extensions: ["*"] },
        ],
        properties: ["openFile"],
      });

      if (!result.canceled && result.filePaths.length > 0) {
        const pathInput = document.getElementById(
          "executable-path"
        ) as HTMLInputElement;
        if (pathInput) {
          pathInput.value = result.filePaths[0];
        }
      }
    } catch (error) {
      console.error("Error browsing for executable:", error);
    }
  }

  private async browseWorkingDirectory(): Promise<void> {
    try {
      const result = await window.electronAPI.showOpenDialog({
        title: "Select Working Directory",
        properties: ["openDirectory"],
      });

      if (!result.canceled && result.filePaths.length > 0) {
        const pathInput = document.getElementById(
          "working-directory"
        ) as HTMLInputElement;
        if (pathInput) {
          pathInput.value = result.filePaths[0];
        }
      }
    } catch (error) {
      console.error("Error browsing for directory:", error);
    }
  }

  private async handleFormSubmit(e: Event): Promise<void> {
    e.preventDefault();

    if (!this.emulatorForm) return;

    const formData = new FormData(this.emulatorForm);
    const emulatorData: Omit<
      EmulatorConfig,
      "id" | "dateAdded" | "launchCount"
    > = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      executablePath: formData.get("executablePath") as string,
      emulatorType: formData.get("emulatorType") as string,
      arguments: formData.get("arguments") as string,
      workingDirectory: formData.get("workingDirectory") as string,
      platform: "Windows",
    };

    try {
      if (this.currentEditingId) {
        // Update existing emulator
        const success = await window.electronAPI.updateEmulator(
          this.currentEditingId,
          emulatorData
        );
        if (success) {
          // Extract icon if executable path changed
          if (emulatorData.executablePath) {
            const iconPath = await window.electronAPI.extractIcon(
              emulatorData.executablePath,
              this.currentEditingId
            );
            if (iconPath) {
              await window.electronAPI.updateEmulator(
                this.currentEditingId,
                { iconPath }
              );
            }
          }
        }
      } else {
        // Add new emulator
        const emulatorId = await window.electronAPI.addEmulator(
          emulatorData
        );

        // Extract icon for the newly added emulator
        if (emulatorData.executablePath) {
          const iconPath = await window.electronAPI.extractIcon(
            emulatorData.executablePath,
            emulatorId
          );
          if (iconPath) {
            await window.electronAPI.updateEmulator(emulatorId, {
              iconPath,
            });
          }
        }
      }

      await this.loadSettings();
      this.renderEmulators();
      this.hideAddEmulatorModal();
    } catch (error) {
      console.error(
        this.currentEditingId
          ? "Error updating emulator:"
          : "Error adding emulator:",
        error
      );
      this.showNotification(
        this.currentEditingId
          ? "Failed to update emulator. Please try again."
          : "Failed to add emulator. Please try again.",
        "error"
      );
    }
  }

  private async launchEmulator(emulator: EmulatorConfig): Promise<void> {
    try {
      // Check if emulator is already running
      const runningStatus = await window.electronAPI.isEmulatorRunning(
        emulator.id
      );
      if (runningStatus.isRunning) {
        this.showNotification(
          `${emulator.name} is already running (PID: ${runningStatus.pid}). Close it first to launch again.`,
          "error"
        );
        return;
      }

      // Disable the play button while launching
      this.setEmulatorButtonState(emulator.id, "launching");

      const result = await window.electronAPI.launchEmulator(
        emulator.id,
        emulator.executablePath,
        emulator.arguments,
        emulator.workingDirectory
      );

      if (result.success) {
        await window.electronAPI.incrementLaunchCount(emulator.id);
        await this.loadSettings();
        this.setEmulatorButtonState(emulator.id, "running");
        this.renderEmulators();
      } else {
        this.setEmulatorButtonState(emulator.id, "stopped");
        if (result.isAlreadyRunning) {
          this.showNotification(
            `${emulator.name} is already running. Close it first to launch again.`,
            "error"
          );
        } else {
          this.showNotification(
            `Failed to launch emulator: ${result.error}`,
            "error"
          );
        }
      }
    } catch (error) {
      console.error("Error launching emulator:", error);
      this.setEmulatorButtonState(emulator.id, "stopped");
      this.showNotification(
        "Failed to launch emulator. Please check the executable path.",
        "error"
      );
    }
  }

  private setEmulatorButtonState(
    emulatorId: string,
    state: "stopped" | "launching" | "running"
  ): void {
    const playButton = document.querySelector(
      `[data-emulator-id="${emulatorId}"] .play-button`
    ) as HTMLButtonElement;
    const card = document.querySelector(
      `[data-emulator-id="${emulatorId}"]`
    ) as HTMLElement;

    if (!playButton || !card) return;

    // Remove all state classes
    playButton.classList.remove("btn-launching", "btn-running");
    card.classList.remove("emulator-launching", "emulator-running");

    switch (state) {
      case "launching":
        playButton.disabled = true;
        playButton.innerHTML = `<span class="play-icon">${ICONS.launching}</span>`;
        playButton.classList.add("btn-launching");
        card.classList.add("emulator-launching");
        break;
      case "running":
        playButton.disabled = true;
        playButton.innerHTML = `<span class="play-icon">${ICONS.running}</span>`;
        playButton.classList.add("btn-running");
        card.classList.add("emulator-running");
        break;
      case "stopped":
      default:
        playButton.disabled = false;
        playButton.innerHTML = `<span class="play-icon">${ICONS.play}</span>`;
        break;
    }
  }

  private editEmulator(id: string): void {
    const emulator = this.settings?.emulators.find((e) => e.id === id);
    if (!emulator) return;

    this.currentEditingId = id;
    this.showAddEmulatorModal();

    // Populate form with current emulator data
    const nameInput = document.getElementById(
      "emulator-name"
    ) as HTMLInputElement;
    const descInput = document.getElementById(
      "emulator-description"
    ) as HTMLInputElement;
    const pathInput = document.getElementById(
      "executable-path"
    ) as HTMLInputElement;
    const argsInput = document.getElementById(
      "emulator-arguments"
    ) as HTMLInputElement;
    const workdirInput = document.getElementById(
      "working-directory"
    ) as HTMLInputElement;

    if (nameInput) nameInput.value = emulator.name;
    this.setTypeComboboxValue(emulator.emulatorType);
    if (descInput) descInput.value = emulator.description || "";
    if (pathInput) pathInput.value = emulator.executablePath;
    if (argsInput) argsInput.value = emulator.arguments || "";
    if (workdirInput) workdirInput.value = emulator.workingDirectory || "";

    // Update modal title and button text
    const modalTitle = document.querySelector(
      "#add-emulator-modal .modal-header h2"
    );
    const submitBtn = document.querySelector("#add-emulator-modal .btn-submit");
    if (modalTitle) modalTitle.textContent = "Edit Emulator";
    if (submitBtn)
      submitBtn.innerHTML = '<span class="btn-icon">✓</span>Update Emulator';
  }

  private async deleteEmulator(id: string): Promise<void> {
    const emulator = this.settings?.emulators.find((e) => e.id === id);
    if (!emulator) return;

    this.currentEditingId = id;
    this.showConfirmationModal(
      "Delete Emulator",
      `Are you sure you want to remove "${emulator.name}"? This action cannot be undone.`,
      "Delete",
      "Cancel"
    );
  }

  private showConfirmationModal(
    title: string,
    message: string,
    confirmText: string,
    cancelText: string
  ): void {
    const titleEl = document.getElementById("confirm-title");
    const messageEl = document.getElementById("confirm-message");
    const confirmBtn = document.getElementById("confirm-yes-btn");
    const cancelBtn = document.getElementById("confirm-no-btn");

    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;
    if (confirmBtn) confirmBtn.textContent = confirmText;
    if (cancelBtn) cancelBtn.textContent = cancelText;

    if (!this.confirmationModal) return;
    this.confirmationModal.classList.remove("hidden");
    // Default focus to Cancel, not the destructive action, on a
    // confirmation prompt.
    this.trapFocus(this.confirmationModal, cancelBtn as HTMLElement | null);
  }

  private hideConfirmationModal(): void {
    this.confirmationModal?.classList.add("hidden");
    this.currentEditingId = null;
    this.releaseFocusTrap();
  }

  private async handleConfirmYes(): Promise<void> {
    if (!this.currentEditingId) return;

    if (this.currentEditingId === 'reset-settings') {
      // Handle settings reset
      await this.executeSettingsReset();
      this.hideConfirmationModal();
    } else {
      // Handle emulator deletion
      try {
        await window.electronAPI.removeEmulator(this.currentEditingId);
        await this.loadSettings();
        this.renderEmulators();
        this.hideConfirmationModal();
      } catch (error) {
        console.error("Error deleting emulator:", error);
        this.showNotification("Failed to delete emulator. Please try again.", "error");
      }
    }
  }

  private sortEmulators(sortBy: LauncherSettings["sortBy"]): void {
    if (!this.settings) return;

    this.settings.emulators.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "dateAdded":
          return (
            new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
          );
        case "lastLaunched":
          if (!a.lastLaunched && !b.lastLaunched) return 0;
          if (!a.lastLaunched) return 1;
          if (!b.lastLaunched) return -1;
          return (
            new Date(b.lastLaunched).getTime() -
            new Date(a.lastLaunched).getTime()
          );
        case "launchCount":
          return b.launchCount - a.launchCount;
        case "emulatorType":
          return a.emulatorType.localeCompare(b.emulatorType);
        default:
          return 0;
      }
    });

    // Update settings with new sort order
    this.settings.sortBy = sortBy;
    window.electronAPI.saveSettings(this.settings);

    this.renderEmulators();
  }

  private initializeSortSelect(): void {
    const sortSelect = document.getElementById(
      "sort-select"
    ) as HTMLSelectElement;
    if (sortSelect && this.settings) {
      sortSelect.value = this.settings.sortBy || "name";
      // Apply initial sort
      this.sortEmulators(this.settings.sortBy || "name");
    }
  }

  private detectSystemTheme(): void {
    // Detect system preference
    this.systemPrefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;

    // Listen for system theme changes
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (e) => {
        this.systemPrefersDark = e.matches;
        if (this.settings?.theme === "auto") {
          this.applyTheme("auto");
        }
      });
  }

  private initializeTheme(): void {
    if (this.settings) {
      this.applyTheme(this.settings.theme || "auto");
    }
  }

  private toggleTheme(): void {
    if (!this.settings) return;

    const themes: Array<"auto" | "light" | "dark"> = ["auto", "light", "dark"];
    const currentIndex = themes.indexOf(this.settings.theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];

    this.settings.theme = nextTheme;
    this.applyTheme(nextTheme);
    this.saveSettings();
  }

  private applyTheme(theme: "light" | "dark" | "auto"): void {
    const html = document.documentElement;
    html.setAttribute("data-theme", theme);

    // Update theme icon
    const themeIcon = document.getElementById("theme-icon");
    if (themeIcon) {
      const effectiveTheme =
        theme === "auto" ? (this.systemPrefersDark ? "dark" : "light") : theme;

      const setLabel = (text: string) => {
        themeIcon.parentElement?.setAttribute("title", text);
        themeIcon.parentElement?.setAttribute("aria-label", text);
      };

      switch (theme) {
        case "auto":
          themeIcon.innerHTML = ICONS.monitor;
          setLabel("Theme: Auto (follows system)");
          break;
        case "light":
          themeIcon.innerHTML = ICONS.sun;
          setLabel("Theme: Light");
          break;
        case "dark":
          themeIcon.innerHTML = ICONS.moon;
          setLabel("Theme: Dark");
          break;
      }
    }
  }

  private async saveSettings(): Promise<void> {
    if (this.settings) {
      try {
        await window.electronAPI.saveSettings(this.settings);
      } catch (error) {
        console.error("Error saving settings:", error);
      }
    }
  }

  // Update-related methods
  private setupUpdateListeners(): void {
    const electronAPI = window.electronAPI;

    // An update was found. Download happens silently in the background - don't
    // interrupt the user. Just surface the quiet header cue; the modal (opened
    // from that button) will show details if they want them.
    electronAPI.onUpdateAvailable?.((info: any) => {
      console.log("Update available (downloading in background):", info);
      this.updateInfo = info;
      this.updateDownloaded = false;
      this.showUpdateButton();
    });

    electronAPI.onUpdateNotAvailable?.(() => {
      console.log("No update available");
    });

    electronAPI.onDownloadProgress?.((progress: any) => {
      this.updateDownloadProgress(progress);
    });

    // Update is downloaded and ready. Now we prompt - a persistent toast with a
    // Restart action, plus the modal flips to its install-ready state.
    electronAPI.onUpdateDownloaded?.((info: any) => {
      console.log("Update downloaded:", info);
      this.updateInfo = info;
      this.updateDownloaded = true;
      this.showUpdateButton();
      this.showInstallButton();
      const version = info?.version ? ` (v${info.version})` : "";
      this.showActionNotification(
        `Update ready${version} — restart to apply`,
        "Restart",
        () => this.installUpdate()
      );
    });

    // We just came back up on a newer version than last launch.
    electronAPI.onAppUpdated?.((version: string) => {
      this.showNotification(`Updated to v${version}`, "success");
    });

    // Get current version and display it
    this.loadCurrentVersion();
  }

  private async loadCurrentVersion(): Promise<void> {
    try {
      const version = await window.electronAPI.getVersion();
      const currentVersionElement = document.getElementById("current-version");
      if (currentVersionElement) {
        currentVersionElement.textContent = version;
      }
    } catch (error) {
      console.error("Error getting version:", error);
    }
  }

  private showUpdateButton(): void {
    const updateBtn = document.getElementById("update-btn");
    if (updateBtn) {
      updateBtn.classList.remove("hidden");
    }
  }

  private hideUpdateButton(): void {
    const updateBtn = document.getElementById("update-btn");
    if (updateBtn) {
      updateBtn.classList.add("hidden");
    }
  }

  private showUpdateModal(): void {
    if (!this.updateModal) return;

    const newVersionElement = document.getElementById("new-version");
    const updateMessageElement = document.getElementById("update-message");
    const updateDetailsElement = document.getElementById("update-details");
    // Downloads are automatic now - the modal is a status view, not a
    // "click to download" prompt.
    const downloadBtn = document.getElementById("update-download-btn");
    const installBtn = document.getElementById("update-install-btn");

    if (this.updateInfo && newVersionElement) {
      newVersionElement.textContent = this.updateInfo.version;
    }
    if (updateDetailsElement) {
      updateDetailsElement.classList.remove("hidden");
    }
    downloadBtn?.classList.add("hidden");

    if (this.updateDownloaded) {
      installBtn?.classList.remove("hidden");
      if (updateMessageElement) {
        updateMessageElement.textContent = this.updateInfo?.version
          ? `Version ${this.updateInfo.version} is ready to install.`
          : "Update is ready to install.";
      }
    } else {
      installBtn?.classList.add("hidden");
      if (updateMessageElement) {
        updateMessageElement.textContent = this.updateInfo?.version
          ? `Downloading version ${this.updateInfo.version} in the background…`
          : "Downloading update in the background…";
      }
    }

    this.updateModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    this.trapFocus(this.updateModal);
  }

  private hideUpdateModal(): void {
    if (!this.updateModal) return;
    this.updateModal.classList.add("hidden");
    document.body.style.overflow = "";
    this.releaseFocusTrap();
  }

  private async downloadUpdate(): Promise<void> {
    try {
      const downloadBtn = document.getElementById(
        "update-download-btn"
      ) as HTMLButtonElement;
      const progressContainer = document.getElementById("download-progress");

      if (downloadBtn) {
        downloadBtn.disabled = true;
        downloadBtn.textContent = "Downloading...";
      }

      if (progressContainer) {
        progressContainer.classList.remove("hidden");
      }

      const result = await window.electronAPI.downloadUpdate();

      if (!result.success) {
        throw new Error(result.error || result.message || "Download failed");
      }
    } catch (error) {
      console.error("Error downloading update:", error);
      this.showNotification(`Failed to download update: ${error}`, "error");

      // Reset button state
      const downloadBtn = document.getElementById(
        "update-download-btn"
      ) as HTMLButtonElement;
      if (downloadBtn) {
        downloadBtn.disabled = false;
        downloadBtn.textContent = "Download Update";
      }
    }
  }

  private updateDownloadProgress(progress: any): void {
    const progressFill = document.getElementById("progress-fill");
    const progressPercent = document.getElementById("progress-percent");
    const progressSpeed = document.getElementById("progress-speed");

    if (progressFill) {
      progressFill.style.width = `${progress.percent}%`;
    }

    if (progressPercent) {
      progressPercent.textContent = `${Math.round(progress.percent)}%`;
    }

    if (progressSpeed && progress.bytesPerSecond) {
      const speedMB = (progress.bytesPerSecond / 1024 / 1024).toFixed(1);
      progressSpeed.textContent = `${speedMB} MB/s`;
    }
  }

  private showInstallButton(): void {
    const downloadBtn = document.getElementById("update-download-btn");
    const installBtn = document.getElementById("update-install-btn");
    const updateMessage = document.getElementById("update-message");

    if (downloadBtn) {
      downloadBtn.classList.add("hidden");
    }

    if (installBtn) {
      installBtn.classList.remove("hidden");
    }

    if (updateMessage) {
      updateMessage.textContent =
        "Update downloaded successfully! Ready to install.";
    }
  }

  private async installUpdate(): Promise<void> {
    try {
      const result = await window.electronAPI.installUpdate();

      if (!result.success) {
        throw new Error(result.error || result.message || "Install failed");
      }

      // The app will restart automatically after this
    } catch (error) {
      console.error("Error installing update:", error);
      this.showNotification(`Failed to install update: ${error}`, "error");
    }
  }

  // Settings Modal Methods
  private showSettingsModal(): void {
    if (!this.settingsModal) return;

    this.settingsModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";

    // Initialize settings content
    this.initializeSettingsContent();
    this.trapFocus(this.settingsModal);
  }

  private hideSettingsModal(): void {
    if (!this.settingsModal) return;

    this.settingsModal.classList.add("hidden");
    document.body.style.overflow = "";
    this.releaseFocusTrap();
  }

  private switchSettingsTab(tabId: string): void {
    // Remove active class from all nav buttons and tabs
    const navBtns = document.querySelectorAll(".settings-nav-btn");
    const tabs = document.querySelectorAll(".settings-tab");

    navBtns.forEach((btn) => btn.classList.remove("active"));
    tabs.forEach((tab) => tab.classList.remove("active"));

    // Add active class to selected nav button and tab
    const selectedNavBtn = document.querySelector(`[data-tab="${tabId}"]`);
    const selectedTab = document.getElementById(`${tabId}-tab`);

    selectedNavBtn?.classList.add("active");
    selectedTab?.classList.add("active");
  }

  private async initializeSettingsContent(): Promise<void> {
    // Load current version
    await this.loadCurrentVersionInSettings();

    // Initialize theme select
    const themeSelect = document.getElementById(
      "theme-select"
    ) as HTMLSelectElement;
    if (themeSelect && this.settings) {
      themeSelect.value = this.settings.theme || "auto";
    }

    // Initialize default view select
    const defaultViewSelect = document.getElementById(
      "default-view"
    ) as HTMLSelectElement;
    if (defaultViewSelect && this.settings) {
      defaultViewSelect.value = this.settings.viewMode || "grid";
    }

    // Initialize grid size select
    const gridSizeSelect = document.getElementById(
      "grid-size-select"
    ) as HTMLSelectElement;
    if (gridSizeSelect && this.settings) {
      gridSizeSelect.value = this.settings.gridSize || "medium";
    }

    // Initialize show descriptions toggle
    const showDescriptionsToggle = document.getElementById(
      "show-descriptions-toggle"
    ) as HTMLInputElement;
    if (showDescriptionsToggle && this.settings) {
      showDescriptionsToggle.checked = this.settings.showDescriptions !== false;
    }

    // Initialize auto-update checkbox
    const autoUpdateCheck = document.getElementById(
      "auto-update-check"
    ) as HTMLInputElement;
    if (autoUpdateCheck && this.settings) {
      autoUpdateCheck.checked = this.settings.autoUpdateCheck !== false; // Default to true
    }

    // Initialize launch tracking checkbox
    const launchTrackingCheck = document.getElementById(
      "launch-tracking"
    ) as HTMLInputElement;
    if (launchTrackingCheck && this.settings) {
      launchTrackingCheck.checked = this.settings.launchTracking !== false; // Default to true
    }
  }

  private async loadCurrentVersionInSettings(): Promise<void> {
    try {
      const version = await window.electronAPI.getVersion();
      const settingsVersionEl = document.getElementById(
        "settings-current-version"
      );
      const aboutVersionEl = document.getElementById("about-version");

      if (settingsVersionEl) {
        settingsVersionEl.textContent = version;
      }
      if (aboutVersionEl) {
        aboutVersionEl.textContent = version;
      }
    } catch (error) {
      console.error("Error getting version for settings:", error);
    }
  }

  private updateThemeSetting(theme: "light" | "dark" | "auto"): void {
    if (!this.settings) return;

    this.settings.theme = theme;
    this.applyTheme(theme);
    this.saveSettings();
  }

  private async checkForUpdatesManually(): Promise<void> {
    const manualUpdateBtn = document.getElementById(
      "manual-update-check"
    ) as HTMLButtonElement;
    if (!manualUpdateBtn) return;

    // Update button state
    const originalText = manualUpdateBtn.textContent;
    manualUpdateBtn.disabled = true;
    manualUpdateBtn.textContent = "Checking...";

    try {
      const result = await window.electronAPI.checkForUpdates();

      if (result.available) {
        // The background flow takes over from here (silent download, then the
        // "Update ready - restart" toast on completion).
        this.showNotification(
          `Update available${result.info?.version ? ` (v${result.info.version})` : ""} — downloading…`,
          "info"
        );
      } else if (result.error) {
        this.showNotification(
          "Couldn't check for updates. Try again later.",
          "error"
        );
      } else {
        this.showNotification("You're on the latest version.", "success");
      }
    } catch (error) {
      console.error("Error checking for updates:", error);
      this.showNotification(
        "Couldn't check for updates. Try again later.",
        "error"
      );
    } finally {
      manualUpdateBtn.disabled = false;
      manualUpdateBtn.textContent = originalText;
    }
  }

  private async resetSettingsToDefaults(): Promise<void> {
    this.currentEditingId = 'reset-settings'; // Use a special ID for settings reset
    this.showConfirmationModal(
      "Reset Settings",
      "Are you sure you want to reset all settings to their default values? This action cannot be undone.",
      "Reset Settings",
      "Cancel"
    );
  }

  private async executeSettingsReset(): Promise<void> {
    try {
      // Reset settings to defaults (keep emulators)
      if (this.settings) {
        this.settings.theme = "auto";
        this.settings.viewMode = "grid";
        this.settings.sortBy = "name";
        this.settings.showDescriptions = true;
        this.settings.gridSize = "medium";
        this.settings.autoUpdateCheck = true;
        this.settings.launchTracking = true;

        await this.saveSettings();

        // Reinitialize UI
        this.initializeTheme();
        this.initializeViewMode();
        this.initializeSortSelect();
        this.initializeSettingsContent();

        // Show success message using a simple notification instead of alert
        this.showNotification("Settings have been reset to defaults.", "success");
      }
    } catch (error) {
      console.error("Error resetting settings:", error);
      this.showNotification("Failed to reset settings. Please try again.", "error");
    }
  }

  private async saveSettingsChanges(): Promise<void> {
    // Settings are applied automatically, just close the modal
    this.hideSettingsModal();
  }

  // View Mode Methods
  private initializeViewMode(): void {
    if (this.settings) {
      this.setViewMode(this.settings.viewMode || "grid");
    }
  }

  private setViewMode(mode: "grid" | "list"): void {
    if (!this.settings) return;

    this.settings.viewMode = mode;
    this.saveSettings();

    // Update button states
    const gridBtn = document.getElementById("grid-view-btn");
    const listBtn = document.getElementById("list-view-btn");

    gridBtn?.classList.toggle("active", mode === "grid");
    listBtn?.classList.toggle("active", mode === "list");
    gridBtn?.setAttribute("aria-pressed", String(mode === "grid"));
    listBtn?.setAttribute("aria-pressed", String(mode === "list"));

    // Update view display
    this.updateViewDisplay();
  }

  private updateViewDisplay(): void {
    if (!this.settings) return;

    const hasEmulators = this.settings.emulators.length > 0;

    if (hasEmulators) {
      if (this.settings.viewMode === "list") {
        this.emulatorGrid?.classList.add("hidden");
        this.emulatorList?.classList.remove("hidden");
      } else {
        this.emulatorGrid?.classList.remove("hidden");
        this.emulatorList?.classList.add("hidden");
      }
    }
  }

  private updateViewModeSetting(viewMode: "grid" | "list"): void {
    if (!this.settings) return;

    this.settings.viewMode = viewMode;
    this.saveSettings();
    this.setViewMode(viewMode);
  }

  private updateGridSizeSetting(gridSize: "small" | "medium" | "large"): void {
    if (!this.settings) return;

    this.settings.gridSize = gridSize;
    this.saveSettings();
    this.applyGridSize();
  }

  private applyGridSize(): void {
    if (!this.settings || !this.emulatorGrid) return;

    this.emulatorGrid.classList.remove("grid-small", "grid-large");
    if (this.settings.gridSize === "small") {
      this.emulatorGrid.classList.add("grid-small");
    } else if (this.settings.gridSize === "large") {
      this.emulatorGrid.classList.add("grid-large");
    }
  }

  private updateShowDescriptionsSetting(enabled: boolean): void {
    if (!this.settings) return;

    this.settings.showDescriptions = enabled;
    this.saveSettings();
    this.renderEmulators();
  }

  private updateAutoUpdateSetting(enabled: boolean): void {
    if (!this.settings) return;

    this.settings.autoUpdateCheck = enabled;
    this.saveSettings();
  }

  private updateLaunchTrackingSetting(enabled: boolean): void {
    if (!this.settings) return;

    this.settings.launchTracking = enabled;
    this.saveSettings();
  }

  private createEmulatorListItem(emulator: EmulatorConfig): HTMLElement {
    const listItem = document.createElement("div");
    listItem.className = "list-item";
    listItem.setAttribute("data-emulator-id", emulator.id);

    // Security: Escape all user-provided data
    const safeName = escapeHtml(emulator.name);
    const safeType = escapeHtml(emulator.emulatorType);
    const safeId = escapeHtml(emulator.id);

    // Validate icon path for security
    const safeIconPath =
      emulator.iconPath && isValidFilePath(emulator.iconPath)
        ? emulator.iconPath
        : null;

    const iconElement = safeIconPath
      ? `<img src="file://${safeIconPath}" alt="${safeName}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"><span class="list-item-icon-fallback" style="display:none;">${ICONS.controller}</span>`
      : `<span class="list-item-icon-fallback">${ICONS.controller}</span>`;

    const formatDate = (date: Date) => {
      return new Date(date).toLocaleDateString();
    };

    listItem.innerHTML = `
      <div class="list-item-icon">${iconElement}</div>
      <div class="list-item-name">${safeName}</div>
      <div class="list-item-type">${safeType}</div>
      <div class="list-item-stats">${emulator.launchCount} launches</div>
      <div class="list-item-last">${
        emulator.lastLaunched ? formatDate(emulator.lastLaunched) : "Never"
      }</div>
      <div class="list-item-actions">
        <button class="btn btn-secondary edit-btn" title="Edit" aria-label="Edit ${safeName}" data-emulator-id="${safeId}">
          <span class="btn-icon">${ICONS.edit}</span>
        </button>
        <button class="btn btn-danger delete-btn" title="Delete" aria-label="Delete ${safeName}" data-emulator-id="${safeId}">
          <span class="btn-icon">${ICONS.delete}</span>
        </button>
      </div>
    `;

    // Add click to launch
    listItem.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".list-item-actions")) {
        this.launchEmulator(emulator);
      }
    });

    // Add button event listeners
    const editBtn = listItem.querySelector(".edit-btn");
    const deleteBtn = listItem.querySelector(".delete-btn");

    editBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.editEmulator(emulator.id);
    });

    deleteBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.deleteEmulator(emulator.id);
    });

    return listItem;
  }

  private async openExternalLink(url: string): Promise<void> {
    try {
      await window.electronAPI.openExternal(url);
    } catch (error) {
      console.error("Failed to open external link:", error);
    }
  }

  private showNotification(message: string, type: "success" | "error" | "info" = "info"): void {
    // Create notification element
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // Add to body
    document.body.appendChild(notification);

    // Show with animation
    setTimeout(() => notification.classList.add("show"), 100);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  // A persistent notification with an action button - stays until the user acts
  // on it or dismisses it. Used for "Update ready - restart to apply".
  private showActionNotification(
    message: string,
    actionLabel: string,
    onAction: () => void
  ): void {
    // Only ever one of these at a time.
    document
      .querySelectorAll(".notification-action")
      .forEach((n) => n.remove());

    const notification = document.createElement("div");
    notification.className = "notification notification-info notification-action";

    const text = document.createElement("span");
    text.className = "notification-action-text";
    text.textContent = message;

    const actionBtn = document.createElement("button");
    actionBtn.className = "notification-action-btn";
    actionBtn.textContent = actionLabel;
    actionBtn.addEventListener("click", () => {
      onAction();
    });

    const dismissBtn = document.createElement("button");
    dismissBtn.className = "notification-dismiss-btn";
    dismissBtn.setAttribute("aria-label", "Dismiss");
    dismissBtn.textContent = "×";
    dismissBtn.addEventListener("click", () => {
      notification.classList.remove("show");
      setTimeout(() => notification.remove(), 300);
    });

    notification.appendChild(text);
    notification.appendChild(actionBtn);
    notification.appendChild(dismissBtn);
    document.body.appendChild(notification);

    setTimeout(() => notification.classList.add("show"), 100);
  }
}

new VelocityLauncher();

// Export functions for testing
if (typeof module !== "undefined" && module.exports) {
  module.exports = { escapeHtml, isValidFilePath, sanitizeInput };
}
