import { app } from 'electron';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export class IconService {
  private readonly iconsDir: string;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.iconsDir = path.join(userDataPath, 'icons');
    this.ensureIconsDirectory();
  }

  private ensureIconsDirectory(): void {
    if (!fs.existsSync(this.iconsDir)) {
      fs.mkdirSync(this.iconsDir, { recursive: true });
    }
  }

  public async extractIcon(executablePath: string, emulatorId: string): Promise<string | null> {
    if (!fs.existsSync(executablePath)) {
      return null;
    }

    const iconFileName = `${emulatorId}.png`;
    const iconPath = path.join(this.iconsDir, iconFileName);

    // If icon already exists, return it
    if (fs.existsSync(iconPath)) {
      return iconPath;
    }

    try {
      await this.extractIconFromExecutable(executablePath, iconPath);
      return fs.existsSync(iconPath) ? iconPath : null;
    } catch (error) {
      console.error('Error extracting icon:', error);
      return null;
    }
  }

  private extractIconFromExecutable(executablePath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Use PowerShell to extract icon from executable
      const psScript = `
        Add-Type -AssemblyName System.Drawing
        $icon = [System.Drawing.Icon]::ExtractAssociatedIcon("${executablePath.replace(/\\/g, '\\\\')}")
        if ($icon) {
          $bitmap = $icon.ToBitmap()
          $bitmap.Save("${outputPath.replace(/\\/g, '\\\\')}", [System.Drawing.Imaging.ImageFormat]::Png)
          $bitmap.Dispose()
          $icon.Dispose()
        }
      `;

      const psProcess = spawn('powershell.exe', [
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-Command', psScript
      ], {
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stderr = '';

      psProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      psProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`PowerShell process exited with code ${code}: ${stderr}`));
        }
      });

      psProcess.on('error', (error) => {
        reject(error);
      });
    });
  }

  public getDefaultEmulatorIcon(): string {
    // Return path to a default emulator icon
    return path.join(__dirname, '../assets/default-emulator.png');
  }

  public async cleanupUnusedIcons(activeEmulatorIds: string[]): Promise<void> {
    try {
      const files = fs.readdirSync(this.iconsDir);
      for (const file of files) {
        const emulatorId = path.parse(file).name;
        if (!activeEmulatorIds.includes(emulatorId)) {
          const filePath = path.join(this.iconsDir, file);
          fs.unlinkSync(filePath);
        }
      }
    } catch (error) {
      console.error('Error cleaning up icons:', error);
    }
  }
}