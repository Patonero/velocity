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

export type EmulatorSortBy = 'name' | 'dateAdded' | 'lastLaunched' | 'launchCount' | 'emulatorType';

export interface LauncherSettings {
  emulators: EmulatorConfig[];
  theme: 'light' | 'dark' | 'auto';
  viewMode: 'grid' | 'list';
  gridSize: 'small' | 'medium' | 'large';
  sortBy: EmulatorSortBy;
  showDescriptions: boolean;
  autoUpdateCheck: boolean;
  launchTracking: boolean;
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