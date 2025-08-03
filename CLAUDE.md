# Claude Development Guidelines for Velocity Launcher

## Project Overview
Velocity Launcher is a security-hardened Electron-based emulator management application built with TypeScript. It provides an intuitive interface for Windows users to add, configure, and launch their emulator applications with comprehensive security protections against injection attacks and malicious input.

## Technology Stack
- **Electron** - Cross-platform desktop app framework with enhanced security configuration
- **TypeScript** - Type-safe JavaScript with strict compilation and proper typing
- **Node.js** - Backend runtime for main process with input validation
- **HTML/CSS** - Modern UI with dark theme, responsive design, and Content Security Policy
- **Jest** - Testing framework with jsdom environment for comprehensive test coverage
- **IPC** - Secure communication between main and renderer processes

## Project Structure
```
├── src/
│   ├── main.ts           # Main Electron process with security validation
│   ├── preload.ts        # Secure API bridge for renderer
│   ├── renderer.ts       # Renderer process with XSS protection
│   ├── storage.ts        # Data persistence with input validation
│   ├── icon-service.ts   # Secure icon extraction service
│   ├── types.ts          # TypeScript interface definitions
│   └── tests/            # Jest test suites
│       ├── sorting-jest.test.ts
│       ├── storage.test.ts
│       ├── icon-service.test.ts
│       └── renderer.test.ts
├── renderer/
│   ├── index.html        # Main UI with Content Security Policy
│   └── styles.css        # Dark theme styling
├── dist/                 # Compiled JavaScript output
├── jest.config.js        # Jest testing configuration
├── tsconfig.test.json    # TypeScript config for tests
└── package.json          # Dependencies and build scripts
```

## Development Commands
- `npm run build` - Compile TypeScript files
- `npm run electron` - Run the application
- `npm test` - Run Jest test suite
- `npm run test:watch` - Run tests in watch mode
- `npm run clean` - Clean build artifacts

## Security Architecture (CRITICAL)

### Command Injection Prevention
**Location**: `src/main.ts:82-95`
- All process arguments sanitized through `sanitizeArguments()` function
- Blocks dangerous patterns: `[;&|`$(){}[]<>]`, `--exec`, `../`, `cmd`, `powershell`
- Maximum 50 arguments limit to prevent resource exhaustion
- Validates executable paths against path traversal attacks

### PowerShell Injection Mitigation  
**Location**: `src/icon-service.ts:45-80`
- Icon extraction uses parameterized PowerShell execution
- Script files written to secure temporary location with cleanup
- No direct string interpolation in PowerShell commands
- Comprehensive path validation before execution

### XSS Prevention
**Location**: `src/renderer.ts:4-11, 40-48`
- HTML escaping via `escapeHtml()` function for all user content
- Input sanitization via `sanitizeInput()` function removes XSS characters
- Content Security Policy configured in `renderer/index.html`
- All DOM insertions use escaped content

### Path Validation
**Location**: `src/renderer.ts:13-38`
- Windows-specific path validation in `isValidFilePath()` function
- Allows valid drive letters (C:) while blocking dangerous patterns
- Prevents path traversal, protocol injection, and control characters
- Special handling for colon placement in Windows paths

### Input Validation
**Location**: `src/storage.ts:15-45`
- Comprehensive validation for all emulator data
- Secure ID generation: `emulator-${timestamp}-${random}`
- String sanitization removes potential XSS characters
- File operation validation prevents directory traversal

## Architecture Patterns

### Data Flow
1. **Renderer Process** - UI interactions with input sanitization
2. **IPC Communication** - Secure message passing with validated parameters
3. **Main Process** - File system access with comprehensive security checks
4. **Storage Service** - JSON-based persistence with input validation

### Security Model
- **Context Isolation** - Renderer process isolated from Node.js APIs
- **Web Security Enabled** - `webSecurity: true` in Electron configuration
- **Preload Script** - Controlled API exposure via contextBridge
- **IPC Handlers** - All operations validated before execution
- **Content Security Policy** - Prevents XSS and code injection

## Code Conventions

### TypeScript
- **Strict typing** enabled with full type safety - NEVER use `as any`
- **Interface definitions** in `types.ts` for shared data structures
- **Async/await** for all asynchronous operations
- **Error handling** with try/catch blocks and user feedback
- **Proper type imports** and exports throughout codebase
- **Fix type definitions** instead of using unsafe casting

### Security-First Development
- **Always validate and sanitize user input** before processing
- **Use parameterized execution** for external processes (PowerShell, cmd)
- **Escape HTML content** before DOM insertion to prevent XSS
- **Validate file paths** against traversal attacks and dangerous patterns
- **Test security functions** thoroughly with comprehensive test cases
- **Never commit secrets** or API keys to repository

### File Organization
- **Main process** files handle system operations with security validation
- **Renderer process** files handle UI logic with input sanitization
- **Shared types** defined once and imported where needed
- **Test files** organized in `src/tests/` with proper naming
- **CSS follows** BEM-like methodology with component-based classes

### Naming Conventions
- **PascalCase** for classes and interfaces (`VelocityLauncher`, `EmulatorConfig`)
- **camelCase** for variables, functions, and methods (`addEmulator`, `showModal`)
- **kebab-case** for HTML IDs and CSS classes (`add-emulator-btn`, `.emulator-card`)
- **UPPERCASE** for constants and environment variables

## Testing Framework

### Jest Configuration
- **Test Environment**: jsdom for DOM testing capabilities
- **TypeScript Support**: ts-jest with tsconfig.test.json
- **Coverage Reporting**: Text, LCOV, and HTML formats
- **Test Pattern**: `src/tests/**/*.test.ts`

### Test Suites Overview
- **Sorting Tests** (25 tests): All sorting functionality, performance, edge cases
- **Storage Tests**: CRUD operations, security validation, error handling
- **Icon Service Tests**: PowerShell execution, cleanup, security
- **Renderer Tests**: XSS prevention, path validation, DOM manipulation

### Testing Best Practices
- **Mock external dependencies** (file system, PowerShell, Electron APIs)
- **Test security functions** with malicious input scenarios
- **Verify error handling** and edge cases
- **Use descriptive test names** that explain expected behavior
- **Group related tests** with describe blocks for organization

## Data Persistence
- **Location**: User data directory (`app.getPath('userData')`)
- **Format**: JSON file (`velocity-launcher-config.json`)
- **Schema**: Defined by `LauncherSettings` interface with validation
- **Operations**: Secure CRUD operations via storage service
- **Input Validation**: All data sanitized before storage

## Build and Compilation
- **TypeScript compilation** to CommonJS for Node.js compatibility
- **Source maps** enabled for debugging
- **Type declarations** generated for all modules
- **Strict error checking** with comprehensive TypeScript configuration
- **Jest compilation** via ts-jest for test execution

## Common Issues and Solutions

### Icons Not Displaying After Updates
- **Root Cause**: Path validation blocking Windows drive letters
- **Solution**: Check `isValidFilePath()` function allows `C:` format
- **Prevention**: Test icon extraction after any security changes

### TypeScript Compilation Errors
- **Deprecated Properties**: Remove `enableRemoteModule` from Electron config
- **Type Mismatches**: Update type definitions, never use `as any`
- **Missing Properties**: Add proper type definitions to interfaces

### Sorting Functionality Issues
- **Type Errors**: Ensure `LauncherSettings.sortBy` includes all options
- **Runtime Errors**: Test sorting with comprehensive Jest suite
- **Performance**: Monitor sorting performance with large datasets

### Security Validation Blocking Valid Input
- **Path Issues**: Review path validation for Windows-specific patterns
- **Argument Rejection**: Check sanitization rules aren't too restrictive
- **PowerShell Execution**: Verify parameterized script execution

## Security Best Practices for Future Development

### Input Handling
1. **Validate all user input** at entry points
2. **Sanitize strings** before storage or display
3. **Escape HTML content** before DOM insertion
4. **Check file paths** for traversal attempts

### Process Execution
1. **Use parameterized execution** for external commands
2. **Validate executable paths** before launching
3. **Limit argument count** to prevent resource exhaustion
4. **Clean up temporary files** after operations

### Testing Security
1. **Test with malicious input** in all security functions
2. **Verify XSS prevention** with script injection attempts
3. **Check path validation** with traversal attack patterns
4. **Validate PowerShell injection** protection

## Development Workflow
1. **Write tests first** for new security-critical functionality
2. **Run full test suite** before committing changes
3. **Validate security implications** of all modifications
4. **Update documentation** when adding new security measures
5. **Never bypass security validation** for convenience