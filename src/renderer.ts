// No imports needed - we'll define types inline for browser compatibility

// Security: HTML escaping to prevent XSS
const escapeHtml = (text: string): string => {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

// Security: Validate and sanitize file paths
const isValidFilePath = (path: string): boolean => {
  if (!path || typeof path !== 'string') {
    return false;
  }
  
  // Check for path traversal and dangerous patterns
  const dangerousPatterns = [
    /\.\.\//,         // Path traversal (Unix)
    /\.\.\\/,         // Path traversal (Windows)
    /[<>"|?*]/,       // Windows forbidden characters (excluding colon for drive letters)
    /javascript:/i,   // Protocol injection
    /data:/i,         // Data URLs
    /vbscript:/i,     // VBScript injection
    /^https?:/i,      // HTTP/HTTPS URLs
    /^file:\/\/\//,   // File protocol with network path
    /[\x00-\x1f]/     // Control characters
  ];
  
  // Special handling for colons - allow only at position 1 for drive letters
  if (path.includes(':')) {
    const colonIndex = path.indexOf(':');
    // Allow only if colon is at position 1 and preceded by a single letter (drive letter)
    if (colonIndex !== 1 || !/^[a-zA-Z]:/.test(path)) {
      return false;
    }
  }
  
  return !dangerousPatterns.some(pattern => pattern.test(path));
};

// Security: Sanitize user input
const sanitizeInput = (input: string, maxLength: number = 1000): string => {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  return input
    .trim()
    .substring(0, maxLength)
    .replace(/[<>'"&]/g, ''); // Remove potential XSS characters
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
  theme: 'light' | 'dark' | 'auto';
  gridSize: 'small' | 'medium' | 'large';
  sortBy: 'name' | 'dateAdded' | 'lastLaunched' | 'launchCount';
  showDescriptions: boolean;
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
    executablePath: string,
    args?: string,
    workingDirectory?: string
  ) => Promise<any>;
  extractIcon: (executablePath: string, emulatorId: string) => Promise<string | null>;
  cleanupIcons: (activeEmulatorIds: string[]) => Promise<boolean>;
}

// Initialize Velocity Launcher

class VelocityLauncher {
  private settings: LauncherSettings | null = null;
  private emulatorGrid: HTMLElement | null = null;
  private emptyState: HTMLElement | null = null;
  private addEmulatorModal: HTMLElement | null = null;
  private emulatorForm: HTMLFormElement | null = null;
  private confirmationModal: HTMLElement | null = null;
  private currentEditingId: string | null = null;
  private systemPrefersDark: boolean = false;

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
    this.initializeTheme();
    this.initializeSortSelect();
    this.renderEmulators();
  }

  private async loadSettings(): Promise<void> {
    try {
      this.settings = await (window as any).electronAPI.loadSettings();
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  }

  private setupElements(): void {
    this.emulatorGrid = document.getElementById("emulator-grid");
    this.emptyState = document.getElementById("empty-state");
    this.addEmulatorModal = document.getElementById("add-emulator-modal");
    this.emulatorForm = document.getElementById(
      "emulator-form"
    ) as HTMLFormElement;
    this.confirmationModal = document.getElementById("confirmation-modal");
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
    this.addEmulatorModal?.addEventListener("click", (e) => {
      if (e.target === this.addEmulatorModal) {
        this.hideAddEmulatorModal();
      }
    });

    // Confirmation modal event listeners
    const confirmYesBtn = document.getElementById("confirm-yes-btn");
    const confirmNoBtn = document.getElementById("confirm-no-btn");
    const confirmCloseBtn = document.getElementById("confirm-close-btn");

    confirmYesBtn?.addEventListener("click", () => this.handleConfirmYes());
    confirmNoBtn?.addEventListener("click", () => this.hideConfirmationModal());
    confirmCloseBtn?.addEventListener("click", () => this.hideConfirmationModal());

    this.confirmationModal?.addEventListener("click", (e) => {
      if (e.target === this.confirmationModal) {
        this.hideConfirmationModal();
      }
    });

    // Sort controls
    const sortSelect = document.getElementById("sort-select");
    sortSelect?.addEventListener("change", (e) => {
      const target = e.target as HTMLSelectElement;
      this.sortEmulators(target.value as keyof EmulatorConfig);
    });

    // Theme controls
    const themeToggle = document.getElementById("theme-toggle");
    themeToggle?.addEventListener("click", () => this.toggleTheme());
  }

  private renderEmulators(): void {
    if (!this.settings || !this.emulatorGrid || !this.emptyState) return;

    const hasEmulators = this.settings.emulators.length > 0;
    const sortControls = document.getElementById("sort-controls");

    if (hasEmulators) {
      this.emptyState.classList.add("hidden");
      this.emulatorGrid.classList.remove("hidden");
      sortControls?.classList.remove("hidden");
      this.emulatorGrid.innerHTML = "";

      this.settings.emulators.forEach((emulator) => {
        const card = this.createEmulatorCard(emulator);
        this.emulatorGrid!.appendChild(card);
      });
    } else {
      this.emptyState.classList.remove("hidden");
      this.emulatorGrid.classList.add("hidden");
      sortControls?.classList.add("hidden");
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
    const safeDescription = emulator.description ? escapeHtml(emulator.description) : '';
    const safeId = escapeHtml(emulator.id);
    
    // Validate icon path for security
    const safeIconPath = emulator.iconPath && isValidFilePath(emulator.iconPath) 
      ? emulator.iconPath 
      : null;
      

    // Create icon element with safe data
    const iconElement = safeIconPath
      ? `<img src="file://${safeIconPath}" alt="${safeName}" class="emulator-icon" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
         <div class="emulator-icon-fallback" style="display: none;">🎮</div>`
      : `<div class="emulator-icon-fallback">🎮</div>`;

    card.innerHTML = `
      <div class="emulator-card-content">
        <div class="emulator-main">
          <div class="emulator-icon-container">
            ${iconElement}
          </div>
          <div class="emulator-info">
            <h3 class="emulator-name">${safeName}</h3>
            <span class="emulator-type">${safeType}</span>
            ${safeDescription ? `<p class="emulator-description">${safeDescription}</p>` : ''}
          </div>
        </div>
        <div class="emulator-actions">
          <button class="action-btn edit-btn" title="Edit configuration" data-emulator-id="${safeId}">
            <span class="action-icon">⚙️</span>
          </button>
          <button class="action-btn delete-btn" title="Remove emulator" data-emulator-id="${safeId}">
            <span class="action-icon">🗑️</span>
          </button>
        </div>
      </div>
      <div class="emulator-launch-area">
        <div class="emulator-stats">
          <span class="stat-item">
            <span class="stat-label">Launches:</span>
            <span class="stat-value">${emulator.launchCount}</span>
          </span>
          ${emulator.lastLaunched ? `
            <span class="stat-item">
              <span class="stat-label">Last:</span>
              <span class="stat-value">${formatDate(emulator.lastLaunched)}</span>
            </span>
          ` : ''}
        </div>
        <button class="play-button" title="Launch ${safeName}">
          <span class="play-icon">▶</span>
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

  private showAddEmulatorModal(): void {
    this.addEmulatorModal?.classList.remove("hidden");
    if (!this.currentEditingId) {
      this.emulatorForm?.reset();
      // Reset modal to "Add" mode
      const modalTitle = document.querySelector("#add-emulator-modal .modal-header h2");
      const submitBtn = document.querySelector("#add-emulator-modal .btn-submit");
      if (modalTitle) modalTitle.textContent = "Add New Emulator";
      if (submitBtn) submitBtn.innerHTML = '<span class="btn-icon">✓</span>Add Emulator';
    }
  }

  private hideAddEmulatorModal(): void {
    this.addEmulatorModal?.classList.add("hidden");
    this.currentEditingId = null;
  }

  private async browseExecutable(): Promise<void> {
    try {
      const result = await (window as any).electronAPI.showOpenDialog({
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
      const result = await (window as any).electronAPI.showOpenDialog({
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
        const success = await (window as any).electronAPI.updateEmulator(this.currentEditingId, emulatorData);
        if (success) {
          // Extract icon if executable path changed
          if (emulatorData.executablePath) {
            const iconPath = await (window as any).electronAPI.extractIcon(emulatorData.executablePath, this.currentEditingId);
            if (iconPath) {
              await (window as any).electronAPI.updateEmulator(this.currentEditingId, { iconPath });
            }
          }
        }
      } else {
        // Add new emulator
        const emulatorId = await (window as any).electronAPI.addEmulator(emulatorData);
        
        // Extract icon for the newly added emulator
        if (emulatorData.executablePath) {
          const iconPath = await (window as any).electronAPI.extractIcon(emulatorData.executablePath, emulatorId);
          if (iconPath) {
            await (window as any).electronAPI.updateEmulator(emulatorId, { iconPath });
          }
        }
      }
      
      await this.loadSettings();
      this.renderEmulators();
      this.hideAddEmulatorModal();
    } catch (error) {
      console.error(this.currentEditingId ? "Error updating emulator:" : "Error adding emulator:", error);
      alert(this.currentEditingId ? "Failed to update emulator. Please try again." : "Failed to add emulator. Please try again.");
    }
  }

  private async launchEmulator(emulator: EmulatorConfig): Promise<void> {
    try {
      const result = await (window as any).electronAPI.launchEmulator(
        emulator.executablePath,
        emulator.arguments,
        emulator.workingDirectory
      );

      if (result.success) {
        await (window as any).electronAPI.incrementLaunchCount(emulator.id);
        await this.loadSettings();
        this.renderEmulators();
      } else {
        alert(`Failed to launch emulator: ${result.error}`);
      }
    } catch (error) {
      console.error("Error launching emulator:", error);
      alert("Failed to launch emulator. Please check the executable path.");
    }
  }

  private editEmulator(id: string): void {
    const emulator = this.settings?.emulators.find(e => e.id === id);
    if (!emulator) return;

    this.currentEditingId = id;
    this.showAddEmulatorModal();

    // Populate form with current emulator data
    const nameInput = document.getElementById("emulator-name") as HTMLInputElement;
    const typeSelect = document.getElementById("emulator-type") as HTMLSelectElement;
    const descInput = document.getElementById("emulator-description") as HTMLInputElement;
    const pathInput = document.getElementById("executable-path") as HTMLInputElement;
    const argsInput = document.getElementById("emulator-arguments") as HTMLInputElement;
    const workdirInput = document.getElementById("working-directory") as HTMLInputElement;

    if (nameInput) nameInput.value = emulator.name;
    if (typeSelect) typeSelect.value = emulator.emulatorType;
    if (descInput) descInput.value = emulator.description || "";
    if (pathInput) pathInput.value = emulator.executablePath;
    if (argsInput) argsInput.value = emulator.arguments || "";
    if (workdirInput) workdirInput.value = emulator.workingDirectory || "";

    // Update modal title and button text
    const modalTitle = document.querySelector("#add-emulator-modal .modal-header h2");
    const submitBtn = document.querySelector("#add-emulator-modal .btn-submit");
    if (modalTitle) modalTitle.textContent = "Edit Emulator";
    if (submitBtn) submitBtn.innerHTML = '<span class="btn-icon">✓</span>Update Emulator';
  }

  private async deleteEmulator(id: string): Promise<void> {
    const emulator = this.settings?.emulators.find(e => e.id === id);
    if (!emulator) return;

    this.currentEditingId = id;
    this.showConfirmationModal(
      "Delete Emulator", 
      `Are you sure you want to remove "${emulator.name}"? This action cannot be undone.`,
      "Delete",
      "Cancel"
    );
  }

  private showConfirmationModal(title: string, message: string, confirmText: string, cancelText: string): void {
    const titleEl = document.getElementById("confirm-title");
    const messageEl = document.getElementById("confirm-message");
    const confirmBtn = document.getElementById("confirm-yes-btn");
    const cancelBtn = document.getElementById("confirm-no-btn");

    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;
    if (confirmBtn) confirmBtn.textContent = confirmText;
    if (cancelBtn) cancelBtn.textContent = cancelText;

    this.confirmationModal?.classList.remove("hidden");
  }

  private hideConfirmationModal(): void {
    this.confirmationModal?.classList.add("hidden");
    this.currentEditingId = null;
  }

  private async handleConfirmYes(): Promise<void> {
    if (!this.currentEditingId) return;

    try {
      await (window as any).electronAPI.removeEmulator(this.currentEditingId);
      await this.loadSettings();
      this.renderEmulators();
      this.hideConfirmationModal();
    } catch (error) {
      console.error("Error deleting emulator:", error);
      alert("Failed to delete emulator. Please try again.");
    }
  }

  private sortEmulators(sortBy: keyof EmulatorConfig): void {
    if (!this.settings) return;

    this.settings.emulators.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'dateAdded':
          return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
        case 'lastLaunched':
          if (!a.lastLaunched && !b.lastLaunched) return 0;
          if (!a.lastLaunched) return 1;
          if (!b.lastLaunched) return -1;
          return new Date(b.lastLaunched).getTime() - new Date(a.lastLaunched).getTime();
        case 'launchCount':
          return b.launchCount - a.launchCount;
        case 'emulatorType':
          return a.emulatorType.localeCompare(b.emulatorType);
        default:
          return 0;
      }
    });

    // Update settings with new sort order
    this.settings.sortBy = sortBy as any;
    (window as any).electronAPI.saveSettings(this.settings);
    
    this.renderEmulators();
  }

  private initializeSortSelect(): void {
    const sortSelect = document.getElementById("sort-select") as HTMLSelectElement;
    if (sortSelect && this.settings) {
      sortSelect.value = this.settings.sortBy || 'name';
      // Apply initial sort
      this.sortEmulators(this.settings.sortBy as keyof EmulatorConfig || 'name');
    }
  }

  private detectSystemTheme(): void {
    // Detect system preference
    this.systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      this.systemPrefersDark = e.matches;
      if (this.settings?.theme === 'auto') {
        this.applyTheme('auto');
      }
    });
  }

  private initializeTheme(): void {
    if (this.settings) {
      this.applyTheme(this.settings.theme || 'auto');
    }
  }

  private toggleTheme(): void {
    if (!this.settings) return;

    const themes: Array<'auto' | 'light' | 'dark'> = ['auto', 'light', 'dark'];
    const currentIndex = themes.indexOf(this.settings.theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    
    this.settings.theme = nextTheme;
    this.applyTheme(nextTheme);
    this.saveSettings();
  }

  private applyTheme(theme: 'light' | 'dark' | 'auto'): void {
    const html = document.documentElement;
    html.setAttribute('data-theme', theme);
    
    // Update theme icon
    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
      const effectiveTheme = theme === 'auto' 
        ? (this.systemPrefersDark ? 'dark' : 'light')
        : theme;
      
      switch (theme) {
        case 'auto':
          themeIcon.textContent = '🖥️';
          themeIcon.parentElement?.setAttribute('title', 'Theme: Auto (follows system)');
          break;
        case 'light':
          themeIcon.textContent = '☀️';
          themeIcon.parentElement?.setAttribute('title', 'Theme: Light');
          break;
        case 'dark':
          themeIcon.textContent = '🌙';
          themeIcon.parentElement?.setAttribute('title', 'Theme: Dark');
          break;
      }
    }
  }

  private async saveSettings(): Promise<void> {
    if (this.settings) {
      try {
        await (window as any).electronAPI.saveSettings(this.settings);
      } catch (error) {
        console.error("Error saving settings:", error);
      }
    }
  }
}

new VelocityLauncher();
