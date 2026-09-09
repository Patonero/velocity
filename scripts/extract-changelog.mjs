#!/usr/bin/env node
// Print the CHANGELOG.md section for a given version, for use as GitHub release notes.
// Usage: node scripts/extract-changelog.mjs 1.5.2

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const version = process.argv[2];
if (!version) {
  console.error("Usage: node scripts/extract-changelog.mjs <version>");
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const changelog = readFileSync(join(root, "CHANGELOG.md"), "utf8");
const lines = changelog.split(/\r?\n/);

// Section headers look like: ## [1.5.2] - 2026-09-09
const startRe = new RegExp(`^##\\s+\\[${version.replace(/\./g, "\\.")}\\]`);
const nextRe = /^##\s+/;

const start = lines.findIndex((l) => startRe.test(l));
if (start === -1) {
  console.error(`No CHANGELOG.md section found for version ${version}`);
  process.exit(1);
}

const body = [];
for (let i = start + 1; i < lines.length; i++) {
  if (nextRe.test(lines[i])) break;
  body.push(lines[i]);
}

const notes = body.join("\n").trim();
const out = `${notes}\n\n---\n\n**Install:** download \`velocity-${version}-x64.exe\` below and run it. Existing installs update themselves silently.\n\nFull changelog: https://github.com/Patonero/velocity/blob/main/CHANGELOG.md\n`;
process.stdout.write(out);
