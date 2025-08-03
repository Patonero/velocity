import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { EmulatorConfig, LauncherSettings } from './types';

export class StorageService {
  private readonly configPath: string;
  private readonly defaultSettings: LauncherSettings = {
    emulators: [],
    theme: 'dark',
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
    const settings = this.loadSettings();
    const id = this.generateId();
    
    const newEmulator: EmulatorConfig = {
      ...emulator,
      id,
      dateAdded: new Date(),
      launchCount: 0
    };
    
    settings.emulators.push(newEmulator);
    this.saveSettings(settings);
    
    return id;
  }

  public updateEmulator(id: string, updates: Partial<EmulatorConfig>): boolean {
    const settings = this.loadSettings();
    const index = settings.emulators.findIndex(e => e.id === id);
    
    if (index === -1) return false;
    
    settings.emulators[index] = { ...settings.emulators[index], ...updates };
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
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }
}