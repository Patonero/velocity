import { app } from 'electron';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Security validation for icon extraction
const isValidIconPath = (filePath: string): boolean => {
  try {
    // Check if path exists
    if (!fs.existsSync(filePath)) {
      return false;
    }

    // Check for valid executable extensions
    const allowedExtensions = ['.exe', '.dll', '.ico'];
    const hasValidExtension = allowedExtensions.some(ext => 
      filePath.toLowerCase().endsWith(ext)
    );

    // Check for path traversal attempts
    const normalizedPath = path.normalize(filePath);
    const hasPathTraversal = normalizedPath.includes('..');

    // Check if it's actually a file
    const stats = fs.statSync(filePath);
    const isFile = stats.isFile();

    return hasValidExtension && !hasPathTraversal && isFile;
  } catch (error) {
    return false;
  }
};

const isValidOutputPath = (outputPath: string): boolean => {
  try {
    // Validate output directory
    const outputDir = path.dirname(outputPath);
    const normalizedDir = path.normalize(outputDir);
    
    // Check for path traversal
    if (normalizedDir.includes('..')) {
      return false;
    }

    // Check if output has valid image extension
    const ext = path.extname(outputPath).toLowerCase();
    if (ext !== '.png') {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
};

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
    // Security validation
    if (!isValidIconPath(executablePath)) {
      console.error('Invalid executable path for icon extraction:', executablePath);
      return null;
    }

    // Sanitize emulator ID to prevent directory traversal
    const sanitizedId = emulatorId.replace(/[^a-zA-Z0-9\-_]/g, '');
    if (!sanitizedId) {
      console.error('Invalid emulator ID for icon extraction:', emulatorId);
      return null;
    }
    
    // Log warning if ID was modified but allow it to proceed
    if (sanitizedId !== emulatorId) {
      console.warn('Emulator ID was sanitized for icon extraction:', { original: emulatorId, sanitized: sanitizedId });
    }

    const iconFileName = `${sanitizedId}.png`;
    const iconPath = path.join(this.iconsDir, iconFileName);

    // Additional validation for output path
    if (!isValidOutputPath(iconPath)) {
      console.error('Invalid output path for icon:', iconPath);
      return null;
    }

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
      // Create a secure PowerShell script file to avoid injection
      const scriptContent = `
param(
    [Parameter(Mandatory=$true)]
    [string]$InputPath,
    [Parameter(Mandatory=$true)]
    [string]$OutputPath
)

try {
    Add-Type -AssemblyName System.Drawing
    
    # Validate input file exists
    if (-not (Test-Path $InputPath)) {
        throw "Input file does not exist: $InputPath"
    }
    
    # Extract icon
    $icon = [System.Drawing.Icon]::ExtractAssociatedIcon($InputPath)
    if ($icon) {
        $bitmap = $icon.ToBitmap()
        $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $bitmap.Dispose()
        $icon.Dispose()
        Write-Output "Icon extracted successfully"
    } else {
        throw "Failed to extract icon from file"
    }
} catch {
    Write-Error $_.Exception.Message
    exit 1
}
`;

      // Create temporary script file
      const scriptPath = path.join(this.iconsDir, 'extract-icon.ps1');
      
      try {
        fs.writeFileSync(scriptPath, scriptContent, 'utf8');
      } catch (error) {
        reject(new Error(`Failed to create PowerShell script: ${error}`));
        return;
      }

      // Execute PowerShell with parameters (secure from injection)
      const psProcess = spawn('powershell.exe', [
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-File', scriptPath,
        '-InputPath', executablePath,
        '-OutputPath', outputPath
      ], {
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 30000 // 30 second timeout
      });

      let stderr = '';
      let stdout = '';

      psProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      psProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      psProcess.on('close', (code) => {
        // Clean up script file
        try {
          fs.unlinkSync(scriptPath);
        } catch (error) {
          console.warn('Failed to cleanup script file:', error);
        }

        if (code === 0) {
          console.log('Icon extraction output:', stdout);
          resolve();
        } else {
          reject(new Error(`PowerShell process exited with code ${code}: ${stderr}`));
        }
      });

      psProcess.on('error', (error) => {
        // Clean up script file on error
        try {
          fs.unlinkSync(scriptPath);
        } catch (cleanupError) {
          console.warn('Failed to cleanup script file on error:', cleanupError);
        }
        reject(error);
      });

      // Handle timeout
      setTimeout(() => {
        if (!psProcess.killed) {
          psProcess.kill();
          reject(new Error('PowerShell process timed out'));
        }
      }, 30000);
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