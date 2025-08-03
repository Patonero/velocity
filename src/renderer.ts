// No imports needed - we'll define types inline for browser compatibility

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
  theme: 'light' | 'dark';
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
}

// Initialize Velocity Launcher

class VelocityLauncher {
  private settings: LauncherSettings | null = null;
  private emulatorGrid: HTMLElement | null = null;
  private emptyState: HTMLElement | null = null;
  private addEmulatorModal: HTMLElement | null = null;
  private emulatorForm: HTMLFormElement | null = null;

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
    await this.loadSettings();
    this.setupElements();
    this.setupEventListeners();
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
  }

  private renderEmulators(): void {
    if (!this.settings || !this.emulatorGrid || !this.emptyState) return;

    const hasEmulators = this.settings.emulators.length > 0;

    if (hasEmulators) {
      this.emptyState.classList.add("hidden");
      this.emulatorGrid.classList.remove("hidden");
      this.emulatorGrid.innerHTML = "";

      this.settings.emulators.forEach((emulator) => {
        const card = this.createEmulatorCard(emulator);
        this.emulatorGrid!.appendChild(card);
      });
    } else {
      this.emptyState.classList.remove("hidden");
      this.emulatorGrid.classList.add("hidden");
    }
  }

  private createEmulatorCard(emulator: EmulatorConfig): HTMLElement {
    const card = document.createElement("div");
    card.className = "emulator-card";
    card.setAttribute("data-emulator-id", emulator.id);

    const formatDate = (date: Date) => {
      return new Date(date).toLocaleDateString();
    };

    card.innerHTML = `
      <div class="emulator-card-header">
        <div class="emulator-info">
          <h3>${emulator.name}</h3>
          <span class="emulator-type">${emulator.emulatorType}</span>
        </div>
        <div class="emulator-actions">
          <button class="icon-btn edit-btn" title="Edit" data-emulator-id="${
            emulator.id
          }">✏️</button>
          <button class="icon-btn delete-btn" title="Delete" data-emulator-id="${
            emulator.id
          }">🗑️</button>
        </div>
      </div>
      <div class="emulator-description">${
        emulator.description || "No description provided"
      }</div>
      <div class="emulator-stats">
        <span>Added: ${formatDate(emulator.dateAdded)}</span>
        <span>Launches: ${emulator.launchCount}</span>
      </div>
    `;

    // Add click to launch
    card.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".emulator-actions")) {
        this.launchEmulator(emulator);
      }
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
    this.emulatorForm?.reset();
  }

  private hideAddEmulatorModal(): void {
    this.addEmulatorModal?.classList.add("hidden");
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
      await (window as any).electronAPI.addEmulator(emulatorData);
      await this.loadSettings();
      this.renderEmulators();
      this.hideAddEmulatorModal();
    } catch (error) {
      console.error("Error adding emulator:", error);
      alert("Failed to add emulator. Please try again.");
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
    // TODO: Implement edit functionality
  }

  private async deleteEmulator(id: string): Promise<void> {
    if (confirm("Are you sure you want to delete this emulator?")) {
      try {
        await (window as any).electronAPI.removeEmulator(id);
        await this.loadSettings();
        this.renderEmulators();
      } catch (error) {
        console.error("Error deleting emulator:", error);
        alert("Failed to delete emulator. Please try again.");
      }
    }
  }
}

new VelocityLauncher();
