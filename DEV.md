# Development Guide

## Hot-Reload Development Setup

### Quick Start
```bash
# Start development with hot-reload (recommended)
npm run dev:watch

# Alternative: manual development
npm run dev
```

### Development Scripts

- `npm run dev:watch` - **Recommended**: Watches TypeScript files and automatically recompiles + restarts
- `npm run dev` - Manual development mode (requires manual rebuild)
- `npm run build:watch` - Only watch and compile TypeScript files
- `npm run build` - One-time TypeScript compilation

### Hot-Reload Behavior

**TypeScript Changes (`src/*.ts`)**:
- Automatically recompiled by `tsc --watch`
- Full Electron app restart via nodemon
- ~2-3 seconds for complete restart

**HTML/CSS Changes (`renderer/*`)**:
- Instant page reload (no app restart needed)
- ~100ms reload time
- Preserves application state where possible

**File Watch Locations**:
- `dist/` - Main process files (nodemon restart)
- `renderer/` - Renderer files (page reload only)

### Development Workflow

1. **Start development server**:
   ```bash
   npm run dev:watch
   ```

2. **Make changes**:
   - Edit TypeScript files in `src/`
   - Edit HTML in `renderer/index.html`
   - Edit CSS in `renderer/styles.css`

3. **See changes automatically**:
   - TypeScript: Wait for compilation + app restart
   - HTML/CSS: Instant reload

4. **Debug**:
   - DevTools automatically opened in development
   - Console logs visible in terminal and DevTools

### Tips

- Keep terminal open to see reload status and errors
- CSS changes are instant - great for UI tweaking
- TypeScript changes take a moment - be patient
- App state is preserved for renderer-only changes

### Troubleshooting

**Hot-reload not working?**
- Ensure you're using `npm run dev:watch`
- Check that `NODE_ENV=development` is set
- Restart the dev server if stuck

**Compilation errors?**
- Check terminal for TypeScript errors
- Fix errors and save - auto-recompilation will trigger
- Use `npm run build` to check for issues manually