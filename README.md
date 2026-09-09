<div align="center">

# Velocity Launcher

**A dead-simple launcher for your emulators.** Add your emulator executables once,
then launch them from one clean window - with icons, search, sort, and usage stats.

[![Latest release](https://img.shields.io/github/v/release/Patonero/velocity?sort=semver)](https://github.com/Patonero/velocity/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/Patonero/velocity/total)](https://github.com/Patonero/velocity/releases)
[![CI](https://img.shields.io/github/actions/workflow/status/Patonero/velocity/ci.yml?branch=main&label=CI)](https://github.com/Patonero/velocity/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/github/license/Patonero/velocity)](LICENSE)

[![Download for Windows](https://img.shields.io/badge/⬇%20Download-Windows%20installer-2563eb?style=for-the-badge&logo=windows)](https://github.com/Patonero/velocity/releases/latest)

![Velocity Launcher](docs/images/velocity-main.png)

</div>

## Why Velocity?

Playnite and LaunchBox are powerful, but they're whole game-library managers -
box art, metadata scraping, ROM folders, plugins. If you just want a tidy way to
**start the emulators you already have installed**, that's a lot of app to carry.

Velocity does one thing: you point it at an emulator's `.exe` (with optional
arguments and working directory), it pulls the icon, and it gives you a fast
grid or list to launch from. Free, open source, no account, no telemetry.

## Features

- **Any emulator** - anything with an executable, plus custom arguments and a working directory
- **Automatic icons** - extracted straight from the emulator's `.exe`
- **Search & sort** - filter instantly; sort by name, date added, last launched, launch count, or system type
- **Grid or list view** - with adjustable card density
- **Auto, light & dark themes** - follows your system by default
- **Usage stats** - launch counts and last-played dates
- **Silent auto-updates** - new versions install in the background, no wizard, no clicks
- **Keyboard friendly** - full focus management and screen-reader labels
- **Security-hardened** - input validation, path-traversal checks, and safe process spawning throughout, with automated tests on the security-critical logic

## Install

1. Download **`velocity-<version>-x64.exe`** from the
   [latest release](https://github.com/Patonero/velocity/releases/latest).
2. Run it. It installs per-user (no admin prompt), adds Start Menu and desktop
   shortcuts, and launches automatically.

> **"Windows protected your PC"?** The installer isn't code-signed yet, so
> SmartScreen may warn about an unknown publisher. Click **More info → Run anyway**.
> Code signing is on the [roadmap](ROADMAP.md).

Requires Windows 10 or later. Config lives in `%APPDATA%\velocity\` and is created
on first launch.

## Adding an emulator

1. Click **Add Emulator**.
2. Fill in:
   - **Name** - e.g. "PlayStation 2"
   - **Type** - type to filter the system list instead of scrolling it
   - **Executable Path** - browse to the emulator's `.exe`
   - **Arguments** *(optional)* - e.g. `--fullscreen`
   - **Working Directory** *(optional)* - usually the emulator's own folder
3. Click **Add Emulator** to save.

![Searching for a system type](docs/images/add-emulator-dialog.png)

Then click any card to launch, or the play button for an explicit launch. Edit
with the pencil icon, remove with the trash icon (with a confirmation).

![List view](docs/images/list-view.png)

![Light theme](docs/images/light-theme.png)

## Configuration

| What | Where |
| --- | --- |
| Config | `%APPDATA%\velocity\velocity-launcher-config.json` |
| Icon cache | `%APPDATA%\velocity\icons\` |

To back up, copy the whole `%APPDATA%\velocity\` folder. Advanced users can edit
the JSON directly - each emulator entry looks like:

```json
{
  "id": "unique-identifier",
  "name": "PlayStation 2",
  "executablePath": "C:\\Emulators\\PCSX2\\pcsx2-qt.exe",
  "workingDirectory": "C:\\Emulators\\PCSX2\\",
  "emulatorType": "PlayStation 2",
  "arguments": "--fullscreen",
  "dateAdded": "2024-01-01T00:00:00.000Z",
  "launchCount": 5,
  "lastLaunched": "2024-01-15T12:30:00.000Z"
}
```

## How updates work

The app checks GitHub for a newer release shortly after startup. If there is one,
it downloads and installs it silently in the background (delta patches when
possible) and applies it on the next launch - no prompts. Update behaviour can be
adjusted in **Settings → General**.

## Security

Velocity treats every emulator path, launch argument, and piece of typed text as
untrusted input:

- **Input & path validation** - traversal attempts, protocol injection, and
  control characters are rejected before anything is trusted
- **Safe process spawning** - arguments are sanitized and launches never go
  through a shell
- **Safe icon extraction** - parameterized PowerShell, no string interpolation
- **XSS protection** - HTML escaping plus a Content Security Policy in the renderer
- **Tested** - the path/argument/storage validation logic has automated coverage,
  and CI runs the suite on every push

See [`CLAUDE.md`](CLAUDE.md) for the full security architecture.

## Building from source

```bash
git clone https://github.com/Patonero/velocity.git
cd velocity
npm install
npm run build        # compile TypeScript
npm run electron     # run the app
npm test             # run the Jest suite
npm run dist:win     # build the installer locally into dist/
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow and
[VERSIONING.md](VERSIONING.md) for how releases are cut.

## Contributing

Contributions welcome - see [CONTRIBUTING.md](CONTRIBUTING.md). Good places to
start: localization, themes, macOS/Linux support, bug reports. Longer-term plans
are in [ROADMAP.md](ROADMAP.md).

- 🐛 [Report a bug](https://github.com/Patonero/velocity/issues/new?template=bug_report.md)
- 💡 [Request a feature](https://github.com/Patonero/velocity/issues/new?template=feature_request.md)
- 💬 [Discussions](https://github.com/Patonero/velocity/discussions)

## License

[MIT](LICENSE). Built with [Electron](https://www.electronjs.org/).

<div align="center">

**[⭐ Star this repo](https://github.com/Patonero/velocity)** if it's useful to you.

</div>
