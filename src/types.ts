export interface EmulatorConfig {
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

export interface LauncherSettings {
  emulators: EmulatorConfig[];
  theme: 'light' | 'dark' | 'auto';
  gridSize: 'small' | 'medium' | 'large';
  sortBy: 'name' | 'dateAdded' | 'lastLaunched' | 'launchCount' | 'emulatorType';
  showDescriptions: boolean;
}

export interface EmulatorFormData {
  name: string;
  description: string;
  executablePath: string;
  iconPath: string;
  arguments: string;
  workingDirectory: string;
  emulatorType: string;
}