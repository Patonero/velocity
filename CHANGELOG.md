# Changelog

All notable changes to Velocity Launcher are documented here.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [1.5.7] - 2026-09-10

### Fixed
- The settings cog from 1.5.6 had lopsided teeth (its path was
  approximated by hand). Replaced with the exact Heroicons `cog-6-tooth`
  geometry.

## [1.5.6] - 2026-09-10

### Fixed
- The settings icon (header and the Settings modal's "General" tab) was a
  circle with straight radial spokes — nearly indistinguishable from the
  sun theme icon beside it. It's now a proper cog.

### Changed
- "Check for Updates" setting relabelled "Automatic Updates" with copy
  that matches the background-download behaviour introduced in 1.5.5.

## [1.5.5] - 2026-09-10

### Changed
- The splash screen no longer blocks launch on an update check. It's now
  pure branding shown while the main window loads, and the app opens as
  soon as it's ready instead of after a network round-trip to GitHub.
- Updates are fully background: any update downloads silently, then a
  toast ("Update ready — restart to apply") appears in the app with a
  Restart button. Nothing interrupts you mid-use.
- After a silent update, the app shows a brief "Updated to vX.Y.Z" toast
  on next launch instead of the version changing with no acknowledgement.

### Fixed
- Removed the "Update failed" flash that could appear on the splash right
  before the app opened. It was caused by an update check with no update
  available spuriously kicking off a download, which errored. Failed
  background update checks/downloads are now silent — they retry on the
  next launch.

## [1.5.4] - 2026-09-10

### Fixed
- Task Manager now shows the app and its helper processes as "Velocity
  Launcher" instead of the full "A modern, secure emulator launcher for
  Windows" description. The Windows executable's `FileDescription` (which
  Task Manager uses as the process name, and which every Electron child
  process inherits) is now set explicitly rather than derived from the
  npm package description.

## [1.5.3] - 2026-09-10

### Fixed
- Taskbar icon of the running app is no longer clipped/distorted. The
  window icon now uses a square, multi-resolution `.ico` on Windows
  (was a non-square 355x338 PNG that Windows squashed into the square
  taskbar slot); the source icon art is now a proper 512x512 square.
- The window icon file is now actually bundled into the installed app
  (`assets/` was only copied to `resources/`, so the packaged build
  silently fell back to the executable icon).

### Changed
- App now sets an explicit AppUserModelID (`com.velocity.launcher`) so
  Windows associates the running window with the pinned/Start-Menu
  shortcut (shared taskbar button, consistent icon).

## [1.5.2] - 2026-09-09

Maintenance release - no user-facing feature changes.

### Changed
- Release pipeline reworked: releases are now cut from a `vX.Y.Z` git tag
  and published as a single, normal GitHub Release (previously every push
  to `main` created a per-commit pre-release, which broke auto-update
  resolution). Auto-update behaviour for end users is unchanged.
- Project documentation consolidated and corrected (README install steps,
  contributing guide, changelog); stale docs removed.

### Added
- Test coverage for the emulator sort comparator.

## [1.5.1] - 2026-09-09

### Changed
- Auto-updates are now fully silent (Discord/Slack-style): the installer
  runs with no wizard and no clicks, then the app relaunches itself
  automatically

## [1.5.0] - 2026-09-08

### Added
- Searchable System Type combobox in Add/Edit Emulator, replacing the
  50+ option dropdown (type to filter, arrow keys + Enter, click, Escape
  reverts cleanly)
- Full keyboard accessibility pass: modals trap Tab focus and restore it
  on close, confirmation dialogs default focus to Cancel, `aria-label`s
  on every icon-only control
- Jest test suite covering the security-critical validation logic
  (path/argument validation, storage validation, PowerShell invocation,
  update caching) plus CI now runs it on every push before packaging a
  release

### Fixed
- Native `alert()` popups replaced with the in-app toast notifications
  used everywhere else
- The Add/Edit Emulator modal no longer discards a filled-out form on a
  stray backdrop click
- `Escape` now closes whichever modal is open

## [1.4.0] - 2026-09-08

### Changed
- Full UI redesign to a flatter "clean utility" look: single accent
  color, no gradients or glass blur, inline SVG icons throughout
  (replacing emoji), redesigned splash screen
- Grid card size and description visibility are now actually
  configurable (they existed in settings but did nothing before)

### Added
- Search/filter box for the emulator list

## [1.3.1] - 2025-08-28
### Added
- Toast notification system
- Settings for auto-update behavior and launch tracking

## [1.3.0] - 2025-08-04
### Added
- Settings modal with theme and default view mode options

## [1.2.3] - 2025-08-04
### Fixed
- Installer language/locale format corrections
### Changed
- Electron build process improvements (caching, packaging commands)

## [1.2.2] - 2025-08-04
### Added
- Delta patch support for smaller update downloads
- Improved splash screen update messaging

## [1.2.1] - 2025-08-04
### Added
- Update check caching and optimized startup checks

## [1.2.0] - 2025-08-04
### Added
- Splash screen with update-check/download flow and version display

## [1.1.0] - 2025-08-03
### Added
- Automatic update system with in-app notifications
- Hot-reload support for development

## Earlier
Initial implementation: emulator management (add/edit/delete/launch),
automatic icon extraction, theme support (auto/light/dark), security
validation for paths/arguments/input, and the security-hardened
Electron configuration this project is built around.
