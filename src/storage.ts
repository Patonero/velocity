import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { EmulatorConfig, LauncherSettings } from './types';

// Security validation for storage operations
const isValidEmulatorData = (emulator: any): boolean => {
  // Check required fields
  if (!emulator.name || typeof emulator.name !== 'string' || emulator.name.length > 100) {
    return false;
  }
  
  if (!emulator.executablePath || typeof emulator.executablePath !== 'string') {
    return false;
  }
  
  if (!emulator.emulatorType || typeof emulator.emulatorType !== 'string') {
    return false;
  }
  
  if (!emulator.platform || typeof emulator.platform !== 'string') {
    return false;
  }

  // Validate optional fields
  if (emulator.description && (typeof emulator.description !== 'string' || emulator.description.length > 500)) {
    return false;
  }
  
  if (emulator.arguments && (typeof emulator.arguments !== 'string' || emulator.arguments.length > 1000)) {
    return false;
  }
  
  if (emulator.workingDirectory && typeof emulator.workingDirectory !== 'string') {
    return false;
  }

  // Check for path traversal in paths
  const pathFields = ['executablePath', 'workingDirectory', 'iconPath'];
  for (const field of pathFields) {
    if (emulator[field] && emulator[field].includes('..')) {
      return false;
    }
  }

  return true;
};

const sanitizeString = (str: string): string => {
  if (!str || typeof str !== 'string') {
    return '';
  }
  
  // Remove potentially dangerous characters and limit length
  return str
    .replace(/[<>'"&]/g, '') // Remove HTML/JS injection characters
    .trim()
    .substring(0, 1000); // Limit length
};

export class StorageService {
  private readonly configPath: string;
  private readonly defaultSettings: LauncherSettings = {
    emulators: [],
    theme: 'auto',
    gridSize: 'medium',
    sortBy: 'name',
    showDescriptions: true
  };

  constructor() {
    const userDataPath = app.getPath('userData');
    this.configPath = path.join(userDataPath, 'velocity-launcher-config.json');
    this.ensureConfigExists();
  }

  private ensureConfigExists(): void {
    if (!fs.existsSync(this.configPath)) {
      this.saveSettings(this.defaultSettings);
    }
  }

  public loadSettings(): LauncherSettings {
    try {
      const data = fs.readFileSync(this.configPath, 'utf-8');
      const settings = JSON.parse(data) as LauncherSettings;
      
      // Convert date strings back to Date objects
      settings.emulators = settings.emulators.map(emulator => ({
        ...emulator,
        dateAdded: new Date(emulator.dateAdded),
        lastLaunched: emulator.lastLaunched ? new Date(emulator.lastLaunched) : undefined
      }));
      
      return { ...this.defaultSettings, ...settings };
    } catch (error) {
      console.error('Error loading settings:', error);
      return this.defaultSettings;
    }
  }

  public saveSettings(settings: LauncherSettings): void {
    try {
      const data = JSON.stringify(settings, null, 2);
      fs.writeFileSync(this.configPath, data, 'utf-8');
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  }

  public addEmulator(emulator: Omit<EmulatorConfig, 'id' | 'dateAdded' | 'launchCount'>): string {
    // Validate input data
    if (!isValidEmulatorData(emulator)) {
      throw new Error('Invalid emulator data: validation failed');
    }

    const settings = this.loadSettings();
    const id = this.generateId();
    
    // Sanitize string inputs
    const newEmulator: EmulatorConfig = {
      id,
      name: sanitizeString(emulator.name),
      description: emulator.description ? sanitizeString(emulator.description) : undefined,
      executablePath: emulator.executablePath,
      iconPath: emulator.iconPath,
      arguments: emulator.arguments ? sanitizeString(emulator.arguments) : undefined,
      workingDirectory: emulator.workingDirectory,
      platform: sanitizeString(emulator.platform),
      emulatorType: sanitizeString(emulator.emulatorType),
      dateAdded: new Date(),
      launchCount: 0
    };
    
    settings.emulators.push(newEmulator);
    this.saveSettings(settings);
    
    return id;
  }

  public updateEmulator(id: string, updates: Partial<EmulatorConfig>): boolean {
    // Validate ID
    if (!id || typeof id !== 'string' || id.length > 50) {
      return false;
    }

    const settings = this.loadSettings();
    const index = settings.emulators.findIndex(e => e.id === id);
    
    if (index === -1) return false;

    // Validate and sanitize updates
    const sanitizedUpdates: Partial<EmulatorConfig> = {};
    
    if (updates.name !== undefined) {
      if (typeof updates.name !== 'string' || updates.name.length > 100) {
        return false;
      }
      sanitizedUpdates.name = sanitizeString(updates.name);
    }
    
    if (updates.description !== undefined) {
      if (updates.description && (typeof updates.description !== 'string' || updates.description.length > 500)) {
        return false;
      }
      sanitizedUpdates.description = updates.description ? sanitizeString(updates.description) : undefined;
    }
    
    if (updates.arguments !== undefined) {
      if (updates.arguments && (typeof updates.arguments !== 'string' || updates.arguments.length > 1000)) {
        return false;
      }
      sanitizedUpdates.arguments = updates.arguments ? sanitizeString(updates.arguments) : undefined;
    }

    // Allow path and type updates but don't sanitize them (they're validated elsewhere)
    if (updates.executablePath !== undefined) {
      sanitizedUpdates.executablePath = updates.executablePath;
    }
    if (updates.workingDirectory !== undefined) {
      sanitizedUpdates.workingDirectory = updates.workingDirectory;
    }
    if (updates.iconPath !== undefined) {
      sanitizedUpdates.iconPath = updates.iconPath;
    }
    if (updates.emulatorType !== undefined) {
      sanitizedUpdates.emulatorType = sanitizeString(updates.emulatorType);
    }
    if (updates.platform !== undefined) {
      sanitizedUpdates.platform = sanitizeString(updates.platform);
    }
    if (updates.launchCount !== undefined) {
      sanitizedUpdates.launchCount = updates.launchCount;
    }
    if (updates.lastLaunched !== undefined) {
      sanitizedUpdates.lastLaunched = updates.lastLaunched;
    }
    
    settings.emulators[index] = { ...settings.emulators[index], ...sanitizedUpdates };
    this.saveSettings(settings);
    
    return true;
  }

  public removeEmulator(id: string): boolean {
    const settings = this.loadSettings();
    const index = settings.emulators.findIndex(e => e.id === id);
    
    if (index === -1) return false;
    
    settings.emulators.splice(index, 1);
    this.saveSettings(settings);
    
    return true;
  }

  public incrementLaunchCount(id: string): void {
    const settings = this.loadSettings();
    const emulator = settings.emulators.find(e => e.id === id);
    
    if (emulator) {
      emulator.launchCount++;
      emulator.lastLaunched = new Date();
      this.saveSettings(settings);
    }
  }

  private generateId(): string {
    // Generate ID using only alphanumeric characters and hyphens for compatibility with icon service
    const timestamp = Date.now().toString();
    const random = Math.random().toString().replace('0.', '');
    return `emulator-${timestamp}-${random}`;
  }
}