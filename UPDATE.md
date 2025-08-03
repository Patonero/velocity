# Auto-Update System

## Overview
Velocity Launcher includes an automatic update system that keeps your app current with the latest features and security improvements.

## How Updates Work

### Automatic Checking
- **Startup Check**: The app checks for updates 3 seconds after startup (production only)
- **Silent Check**: Updates are checked in the background without interrupting usage
- **GitHub Integration**: Updates are sourced from GitHub releases automatically

### Update Process
1. **Detection**: When an update is available, a notification appears in the header
2. **Download**: Click the update button to download the new version
3. **Installation**: Once downloaded, restart the app to apply the update

### Visual Indicators
- **Update Button**: Appears in the header with a pulsing green dot
- **Update Modal**: Shows version info, download progress, and installation options
- **Progress Bar**: Real-time download progress with speed indicator

## User Experience

### Update Available
- Notification appears automatically when update is detected
- Shows current vs. new version comparison
- Option to download now or postpone

### Download Process
- Real-time progress bar with percentage and speed
- Download happens in background
- Cancel/retry options if download fails

### Installation
- One-click installation after download completes
- App automatically restarts with new version
- All settings and data preserved

## Development vs. Production

### Development Mode
- Updates are **disabled** during development
- All update functions return safe messages
- No interference with hot-reload functionality

### Production Mode
- Full auto-update functionality enabled
- Secure signature verification (when configured)
- Automatic rollback on failed updates

## Configuration

### GitHub Release Setup
```json
"publish": {
  "provider": "github",
  "owner": "Patonero", 
  "repo": "velocity"
}
```

### Update Settings
- **Check Frequency**: On app startup + manual checks
- **Download Location**: Temporary system folder
- **Install Method**: Replace and restart

## Security Features

### Signature Verification
- Updates are verified against digital signatures
- Only signed releases can be installed
- Protection against malicious update injection

### Safe Rollback
- Failed updates trigger automatic rollback
- Previous version restored if new version crashes
- Settings and data remain intact

## Troubleshooting

### Update Not Appearing
- Ensure you're running a production build
- Check internet connection
- Verify GitHub releases are published correctly

### Download Failures
- Check available disk space
- Verify network connectivity
- Try manual download from GitHub releases

### Installation Issues
- Close all running emulators before updating
- Run as administrator if permission errors occur
- Check antivirus software isn't blocking the update

## Manual Updates

If automatic updates fail, you can always:
1. Download the latest release from GitHub
2. Close Velocity Launcher completely
3. Install the new version over the existing one
4. Restart the application

## Version Information

Current version is always displayed in:
- Update modal (when available)
- Application about section
- Console logs during startup