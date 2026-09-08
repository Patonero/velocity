// Pure security-validation functions with no Electron dependency, so they can
// be unit tested directly under Jest/Node without mocking the Electron runtime.

import * as fs from "fs";
import * as path from "path";

// --- Main-process (execution-domain) validation ---
// Used by main.ts before launching an emulator process.

export const isValidExecutablePath = (filePath: string): boolean => {
  try {
    if (!fs.existsSync(filePath)) {
      return false;
    }

    const allowedExtensions = [".exe", ".msi", ".app"];
    const hasValidExtension = allowedExtensions.some((ext) =>
      filePath.toLowerCase().endsWith(ext)
    );

    const normalizedPath = path.normalize(filePath);
    const hasPathTraversal = normalizedPath.includes("..");

    const stats = fs.statSync(filePath);
    const isFile = stats.isFile();

    return hasValidExtension && !hasPathTraversal && isFile;
  } catch (error) {
    return false;
  }
};

export const sanitizeArguments = (args: string): string[] => {
  if (!args || typeof args !== "string") {
    return [];
  }

  return args
    .split(" ")
    .map((arg) => arg.trim())
    .filter((arg) => arg.length > 0)
    .filter((arg) => {
      const dangerousPatterns = [
        /[;&|`$(){}[\]<>]/, // Shell metacharacters
        /^-{1,2}exec/i, // Execution flags
        /\.\.\//,
        /\.\.\\/, // Path traversal
        /cmd/i,
        /powershell/i,
        /bash/i,
        /sh$/i, // Shell commands
      ];

      return !dangerousPatterns.some((pattern) => pattern.test(arg));
    })
    .slice(0, 50); // Limit number of arguments
};

export const isValidWorkingDirectory = (dirPath: string): boolean => {
  try {
    if (!dirPath || typeof dirPath !== "string") {
      return true; // Allow empty/undefined working directory
    }

    if (!fs.existsSync(dirPath)) {
      return false;
    }

    const normalizedPath = path.normalize(dirPath);
    if (normalizedPath.includes("..")) {
      return false;
    }

    const stats = fs.statSync(dirPath);
    return stats.isDirectory();
  } catch (error) {
    return false;
  }
};

// --- Renderer-process (display-domain) validation ---
// renderer.ts is loaded as a plain <script> (no bundler, no module system) so
// it keeps its own private copies of this same logic rather than importing
// from here - see src/renderer.ts's escapeHtml/isValidFilePath/sanitizeInput.
// These canonical, tested versions exist so the validation logic itself has
// coverage; keep them in sync with renderer.ts by hand if either changes.

export const escapeHtmlForDisplay = (text: string): string => {
  if (!text || typeof text !== "string") {
    return "";
  }

  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
};

export const isValidDisplayPath = (filePath: string): boolean => {
  if (!filePath || typeof filePath !== "string") {
    return false;
  }

  const dangerousPatterns = [
    /\.\.\//, // Path traversal (Unix)
    /\.\.\\/, // Path traversal (Windows)
    /[<>"|?*]/, // Windows forbidden characters (excluding colon for drive letters)
    /javascript:/i, // Protocol injection
    /data:/i, // Data URLs
    /vbscript:/i, // VBScript injection
    /^https?:/i, // HTTP/HTTPS URLs
    /^file:\/\/\//, // File protocol with network path
    /[\x00-\x1f]/, // Control characters
  ];

  if (filePath.includes(":")) {
    const colonIndex = filePath.indexOf(":");
    if (colonIndex !== 1 || !/^[a-zA-Z]:/.test(filePath)) {
      return false;
    }
  }

  return !dangerousPatterns.some((pattern) => pattern.test(filePath));
};

export const sanitizeDisplayInput = (
  input: string,
  maxLength: number = 1000
): string => {
  if (!input || typeof input !== "string") {
    return "";
  }

  return input
    .trim()
    .substring(0, maxLength)
    .replace(/[<>'"&]/g, ""); // Remove potential XSS characters
};
