import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  isValidExecutablePath,
  sanitizeArguments,
  isValidWorkingDirectory,
  escapeHtmlForDisplay,
  isValidDisplayPath,
  sanitizeDisplayInput,
} from "../security-utils";

describe("isValidExecutablePath", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "velocity-exe-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("rejects a path that does not exist", () => {
    expect(isValidExecutablePath(path.join(tmpDir, "nope.exe"))).toBe(false);
  });

  it("accepts a real .exe file", () => {
    const file = path.join(tmpDir, "dolphin.exe");
    fs.writeFileSync(file, "");
    expect(isValidExecutablePath(file)).toBe(true);
  });

  it("accepts .msi and .app extensions", () => {
    const msi = path.join(tmpDir, "installer.msi");
    const app = path.join(tmpDir, "Emulator.app");
    fs.writeFileSync(msi, "");
    fs.writeFileSync(app, "");
    expect(isValidExecutablePath(msi)).toBe(true);
    expect(isValidExecutablePath(app)).toBe(true);
  });

  it("is case-insensitive about the extension", () => {
    const file = path.join(tmpDir, "GAME.EXE");
    fs.writeFileSync(file, "");
    expect(isValidExecutablePath(file)).toBe(true);
  });

  it("rejects a disallowed extension even if the file exists", () => {
    const file = path.join(tmpDir, "notes.txt");
    fs.writeFileSync(file, "");
    expect(isValidExecutablePath(file)).toBe(false);
  });

  it("rejects a directory even if it's named like an executable", () => {
    const dir = path.join(tmpDir, "fake.exe");
    fs.mkdirSync(dir);
    expect(isValidExecutablePath(dir)).toBe(false);
  });

  it("rejects a non-existent path traversal attempt", () => {
    expect(isValidExecutablePath("../../../../etc/passwd.exe")).toBe(false);
  });
});

describe("isValidWorkingDirectory", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "velocity-workdir-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("allows an empty/undefined working directory", () => {
    expect(isValidWorkingDirectory("")).toBe(true);
    expect(isValidWorkingDirectory(undefined as unknown as string)).toBe(
      true
    );
  });

  it("accepts a real directory", () => {
    expect(isValidWorkingDirectory(tmpDir)).toBe(true);
  });

  it("rejects a directory that does not exist", () => {
    expect(isValidWorkingDirectory(path.join(tmpDir, "nope"))).toBe(false);
  });

  it("rejects a path that is a file, not a directory", () => {
    const file = path.join(tmpDir, "file.txt");
    fs.writeFileSync(file, "");
    expect(isValidWorkingDirectory(file)).toBe(false);
  });

  it("rejects a non-existent path traversal attempt", () => {
    expect(isValidWorkingDirectory("../../../../etc")).toBe(false);
  });
});

describe("sanitizeArguments", () => {
  it("returns an empty array for empty/null/non-string input", () => {
    expect(sanitizeArguments("")).toEqual([]);
    expect(sanitizeArguments(null as unknown as string)).toEqual([]);
    expect(sanitizeArguments(undefined as unknown as string)).toEqual([]);
    expect(sanitizeArguments(123 as unknown as string)).toEqual([]);
  });

  it("splits and trims a normal argument string", () => {
    expect(sanitizeArguments("--fullscreen --config-path")).toEqual([
      "--fullscreen",
      "--config-path",
    ]);
  });

  it("collapses stray whitespace between arguments", () => {
    expect(sanitizeArguments("  --fullscreen   --vsync  ")).toEqual([
      "--fullscreen",
      "--vsync",
    ]);
  });

  it.each([
    ["semicolon", "--flag;whoami"],
    ["ampersand", "--flag&calc"],
    ["pipe", "--flag|dir"],
    ["backtick", "--flag`whoami`"],
    ["dollar-paren", "--flag$(whoami)"],
    ["angle-brackets", "--flag>out.txt"],
    ["exec-flag", "--exec=calc"],
    ["unix-traversal", "../secrets"],
    ["windows-traversal", "..\\secrets"],
    ["cmd-mention", "cmd.exe"],
    ["powershell-mention", "powershell.exe"],
    ["bash-mention", "bash"],
    ["trailing-sh", "run.sh"],
  ])("drops a token containing a dangerous pattern (%s)", (_label, token) => {
    expect(sanitizeArguments(token)).toEqual([]);
  });

  it("keeps safe tokens alongside a dropped dangerous one", () => {
    expect(sanitizeArguments("--fullscreen --flag;whoami --vsync")).toEqual([
      "--fullscreen",
      "--vsync",
    ]);
  });

  it("caps the number of arguments at 50", () => {
    const args = Array.from({ length: 60 }, (_, i) => `--arg${i}`).join(" ");
    expect(sanitizeArguments(args)).toHaveLength(50);
  });
});

describe("escapeHtmlForDisplay", () => {
  it("returns an empty string for empty/non-string input", () => {
    expect(escapeHtmlForDisplay("")).toBe("");
    expect(escapeHtmlForDisplay(null as unknown as string)).toBe("");
  });

  it("escapes angle brackets so markup can't be injected", () => {
    // Text-node serialization escapes < and & (and > by convention) but not
    // quotes - quotes only matter inside attribute values, not text content.
    expect(escapeHtmlForDisplay('<img src=x onerror="alert(1)">')).toBe(
      '&lt;img src=x onerror="alert(1)"&gt;'
    );
  });

  it("escapes a script injection attempt", () => {
    const escaped = escapeHtmlForDisplay("<script>alert('xss')</script>");
    expect(escaped).not.toContain("<script>");
    expect(escaped).toContain("&lt;script&gt;");
  });

  it("leaves plain text untouched", () => {
    expect(escapeHtmlForDisplay("Dolphin Emulator")).toBe(
      "Dolphin Emulator"
    );
  });
});

describe("isValidDisplayPath", () => {
  it("rejects empty/non-string input", () => {
    expect(isValidDisplayPath("")).toBe(false);
    expect(isValidDisplayPath(null as unknown as string)).toBe(false);
  });

  it("accepts a normal Windows path", () => {
    expect(isValidDisplayPath("C:\\Games\\Dolphin\\Dolphin.exe")).toBe(true);
  });

  it("rejects path traversal sequences", () => {
    expect(isValidDisplayPath("C:\\Games\\..\\..\\Windows\\System32")).toBe(
      false
    );
    expect(isValidDisplayPath("../../etc/passwd")).toBe(false);
  });

  it("rejects protocol injection attempts", () => {
    expect(isValidDisplayPath("javascript:alert(1)")).toBe(false);
    expect(isValidDisplayPath("vbscript:msgbox(1)")).toBe(false);
    expect(isValidDisplayPath("data:text/html,<script>alert(1)</script>")).toBe(
      false
    );
  });

  it("rejects http(s) URLs", () => {
    expect(isValidDisplayPath("https://evil.example/payload.exe")).toBe(
      false
    );
  });

  it("rejects a colon that isn't in drive-letter position", () => {
    expect(isValidDisplayPath("weird:C:\\path")).toBe(false);
  });

  it("rejects control characters", () => {
    expect(isValidDisplayPath("C:\\Games\\file\x00.exe")).toBe(false);
  });
});

describe("sanitizeDisplayInput", () => {
  it("returns an empty string for empty/non-string input", () => {
    expect(sanitizeDisplayInput("")).toBe("");
    expect(sanitizeDisplayInput(undefined as unknown as string)).toBe("");
  });

  it("trims surrounding whitespace", () => {
    expect(sanitizeDisplayInput("  Dolphin  ")).toBe("Dolphin");
  });

  it("strips characters usable for XSS", () => {
    expect(sanitizeDisplayInput("<script>alert('x')</script>")).toBe(
      "scriptalert(x)/script"
    );
  });

  it("truncates to the given max length", () => {
    expect(sanitizeDisplayInput("a".repeat(20), 5)).toBe("aaaaa");
  });

  it("defaults to a 1000 character limit", () => {
    expect(sanitizeDisplayInput("a".repeat(2000))).toHaveLength(1000);
  });
});
