# Contributing to Velocity Launcher

Thanks for considering a contribution! This project is a small, security-conscious
Electron app, so a couple of things matter more here than in a typical project.

## Getting set up

```bash
git clone https://github.com/Patonero/velocity.git
cd velocity
npm install
npm run dev          # build + launch in development mode (devtools enabled)
npm run dev:watch    # same, plus rebuild + relaunch on file changes
```

Other useful commands:

```bash
npm run build        # compile TypeScript
npm test             # run the Jest suite
npm run test:watch   # run tests in watch mode
```

CI runs `npm test` on every push to `main` before packaging a release, so a
failing test blocks the build.

## Before you open a PR

- **Run `npm test` and `npm run build` locally.** Both need to pass.
- **Keep security-critical logic testable.** Path validation, argument
  sanitization, and similar checks belong in a plain module with no Electron
  dependency (see `src/security-utils.ts`) rather than inline in `main.ts`,
  so they can be unit tested without mocking half of Electron.
- **`renderer.ts` has no module system on purpose.** It's loaded as a plain
  `<script>` tag with no bundler, so it can't have real `import`/`export`
  statements - adding one breaks the shipped app (`tsc` emits CommonJS
  boilerplate that has no runtime to run against in a browser `<script>`
  context). If you're touching renderer logic that also needs test coverage,
  follow the existing pattern: a canonical, tested copy in its own module
  (e.g. `sort-utils.ts`), with a comment noting the two need to be kept in
  sync by hand.
- **No `as any`.** If TypeScript is fighting you, that's usually a sign a
  type needs fixing somewhere, not silencing.
- **Validate and sanitize at the boundary.** Anything touching a file path,
  a spawned process, or user-provided text should be validated before it's
  trusted - see the Security Architecture section of `CLAUDE.md` for the
  existing patterns and where they live.

## Reporting bugs / requesting features

Use the issue templates:
- [🐛 Bug report](https://github.com/Patonero/velocity/issues/new?template=bug_report.md)
- [💡 Feature request](https://github.com/Patonero/velocity/issues/new?template=feature_request.md)

## Code style

- TypeScript, strict mode, no implicit `any`
- `PascalCase` for classes/interfaces, `camelCase` for variables/functions,
  `kebab-case` for HTML ids/CSS classes
- Prefer editing existing files and reusing existing patterns over
  introducing new ones - `CLAUDE.md` documents the conventions this
  codebase already follows

That's it - open a PR and we'll go from there.
