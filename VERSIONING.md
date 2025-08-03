# Velocity Launcher Versioning

Velocity Launcher uses [Semantic Versioning](https://semver.org/) (SemVer) for version management.

## Version Format

Versions follow the format: `MAJOR.MINOR.PATCH`

- **MAJOR**: Incremented for incompatible API changes or breaking changes
- **MINOR**: Incremented for new functionality that is backwards compatible
- **PATCH**: Incremented for backwards compatible bug fixes

## Automatic Version Bumping

The GitHub Actions release workflow automatically determines the version bump type based on commit messages:

### Commit Message Conventions

- **Major Version Bump**: Include `BREAKING CHANGE` or `major:` in commit message

  ```
  feat: major redesign of UI BREAKING CHANGE
  major: remove deprecated features
  ```

- **Minor Version Bump**: Include `feat:`, `feature:`, or `minor:` in commit message

  ```
  feat: add theme editor functionality
  feature: implement auto-discovery
  minor: add new sorting options
  ```

- **Patch Version Bump**: Default for all other commits
  ```
  fix: resolve icon extraction issue
  chore: update dependencies
  docs: improve README
  ```

## Manual Version Bumping

You can manually bump the version using the provided PowerShell script:

```powershell
# Bump patch version (1.0.0 -> 1.0.1)
.\scripts\bump-version.ps1 patch

# Bump minor version (1.0.1 -> 1.1.0)
.\scripts\bump-version.ps1 minor

# Bump major version (1.1.0 -> 2.0.0)
.\scripts\bump-version.ps1 major
```

## Release Process

1. **Automatic Releases**: Push commits to `main` branch

   - Workflow analyzes commit messages
   - Determines appropriate version bump
   - Updates `package.json`
   - Builds and packages the application
   - Creates GitHub release with changelog

2. **Manual Releases**: Use the manual script then push
   ```powershell
   .\scripts\bump-version.ps1 minor
   git add package.json
   git commit -m "chore: bump version to X.Y.Z"
   git push origin main
   ```

## Version History

See [CHANGELOG.md](CHANGELOG.md) for detailed version history and changes.

## Skip CI

To prevent the workflow from running on certain commits (like documentation updates), include `[skip ci]` in the commit message:

```
docs: update README [skip ci]
```

Note: Version bump commits automatically include `[skip ci]` to prevent infinite loops.
