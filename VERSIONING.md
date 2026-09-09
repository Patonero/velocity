# Versioning & Releasing

Velocity Launcher uses [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`.

- **MAJOR** - breaking changes to config format or behaviour users rely on
- **MINOR** - new features, backwards compatible
- **PATCH** - bug fixes and maintenance

## How a release happens

Releases are **tag-triggered**. Pushing a `vX.Y.Z` tag to GitHub runs
`.github/workflows/release.yml`, which tests, builds the Windows installer,
and publishes a single normal GitHub Release (with `latest.yml` for
auto-update). Plain pushes to `main` only run CI (`.github/workflows/ci.yml`)
- they do **not** create releases.

## Cutting a release

1. Add a `## [X.Y.Z] - YYYY-MM-DD` section to [`CHANGELOG.md`](CHANGELOG.md)
   describing the changes. Commit it to `main`.
2. Run the helper:

   ```bash
   npm run release patch      # 1.5.1 -> 1.5.2   (or: minor | major | X.Y.Z)
   npm run release patch --push
   ```

   It refuses to run on a dirty tree or off `main`, checks that the
   CHANGELOG section exists, then bumps `package.json` + `package-lock.json`,
   commits as `release: vX.Y.Z`, and tags it.
3. `git push --follow-tags` (or pass `--push` above).
4. Watch <https://github.com/Patonero/velocity/actions>. The release appears
   at <https://github.com/Patonero/velocity/releases> when the workflow
   finishes.

The release workflow fails fast if the tag doesn't match `package.json`,
so an accidental tag won't publish a mismatched build.

## Pre-release / nightly channel

Not wired up yet - planned as a follow-up (opt-in "pre-release builds"
toggle in Settings, fed by a separate nightly workflow). Until then there
is only the stable channel.
