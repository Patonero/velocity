#!/usr/bin/env node
// Cut a release: bump version, tag, and push. CI (release.yml) builds and
// publishes the GitHub Release when the v* tag lands.
//
// Usage:
//   node scripts/release.mjs patch          # 1.5.1 -> 1.5.2
//   node scripts/release.mjs minor          # 1.5.1 -> 1.6.0
//   node scripts/release.mjs major          # 1.5.1 -> 2.0.0
//   node scripts/release.mjs 1.7.3          # explicit
//   node scripts/release.mjs patch --push   # also push immediately

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const run = (cmd) => execSync(cmd, { cwd: root, stdio: "pipe" }).toString().trim();
const die = (msg) => {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
};

const args = process.argv.slice(2);
const bump = args.find((a) => !a.startsWith("--"));
const doPush = args.includes("--push");

if (!bump) die("Specify a bump: patch | minor | major | <x.y.z>");

if (run("git status --porcelain")) {
  die("Working tree is not clean. Commit or stash first.");
}
if (run("git rev-parse --abbrev-ref HEAD") !== "main") {
  die("Releases are cut from main.");
}

const current = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;

function nextVersion(cur, kind) {
  if (/^\d+\.\d+\.\d+$/.test(kind)) return kind;
  const [maj, min, pat] = cur.split(".").map(Number);
  if (kind === "major") return `${maj + 1}.0.0`;
  if (kind === "minor") return `${maj}.${min + 1}.0`;
  if (kind === "patch") return `${maj}.${min}.${pat + 1}`;
  die(`Unknown bump "${kind}"`);
}

const version = nextVersion(current, bump);

const changelog = readFileSync(join(root, "CHANGELOG.md"), "utf8");
if (!new RegExp(`^##\\s+\\[${version.replace(/\./g, "\\.")}\\]`, "m").test(changelog)) {
  die(
    `CHANGELOG.md has no "## [${version}]" section yet.\n` +
      `  Add one (with today's date), commit it, then re-run this script.`
  );
}

console.log(`\n  ${current} → ${version}\n`);
run(`npm version ${version} -m "release: v%s"`);
console.log(`✔ Committed and tagged v${version}`);

if (doPush) {
  run("git push --follow-tags");
  console.log("✔ Pushed. Watch the Release workflow: https://github.com/Patonero/velocity/actions");
} else {
  console.log("\nNext:  git push --follow-tags\n");
}
