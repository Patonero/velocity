# Changelog

All notable changes to Velocity Launcher are documented here.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

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
