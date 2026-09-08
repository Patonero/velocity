import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { EventEmitter } from "events";

jest.mock("electron", () => ({
  app: {
    getPath: jest.fn(),
  },
}));

jest.mock("child_process", () => ({
  spawn: jest.fn(),
}));

import { app } from "electron";
import { spawn } from "child_process";
import {
  IconService,
  isValidIconPath,
  isValidOutputPath,
} from "../icon-service";

const mockGetPath = app.getPath as jest.Mock;
const mockSpawn = spawn as jest.Mock;

class FakeChildProcess extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  killed = false;
  kill = jest.fn(() => {
    this.killed = true;
  });
}

const argAfterFlag = (args: string[], flag: string): string =>
  args[args.indexOf(flag) + 1];

describe("isValidIconPath", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "velocity-icon-src-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("rejects a path that does not exist", () => {
    expect(isValidIconPath(path.join(tmpDir, "nope.exe"))).toBe(false);
  });

  it("accepts .exe, .dll and .ico files", () => {
    const exe = path.join(tmpDir, "a.exe");
    const dll = path.join(tmpDir, "b.dll");
    const ico = path.join(tmpDir, "c.ico");
    [exe, dll, ico].forEach((f) => fs.writeFileSync(f, ""));

    expect(isValidIconPath(exe)).toBe(true);
    expect(isValidIconPath(dll)).toBe(true);
    expect(isValidIconPath(ico)).toBe(true);
  });

  it("rejects a disallowed extension", () => {
    const file = path.join(tmpDir, "notes.txt");
    fs.writeFileSync(file, "");
    expect(isValidIconPath(file)).toBe(false);
  });

  it("rejects a directory", () => {
    const dir = path.join(tmpDir, "fake.exe");
    fs.mkdirSync(dir);
    expect(isValidIconPath(dir)).toBe(false);
  });
});

describe("isValidOutputPath", () => {
  it("accepts a clean .png path", () => {
    expect(isValidOutputPath("C:\\Users\\me\\icons\\abc.png")).toBe(true);
  });

  it("rejects a non-.png extension", () => {
    expect(isValidOutputPath("C:\\Users\\me\\icons\\abc.exe")).toBe(false);
  });

  it("rejects a relative path that traverses above its base directory", () => {
    expect(isValidOutputPath("..\\..\\evil\\abc.png")).toBe(false);
  });

  it("does not catch traversal segments that path.normalize resolves away first (rooted path)", () => {
    // path.normalize() resolves ".." against a preceding real segment before
    // the includes('..') check ever runs, so a *rooted* Windows path like
    // this one normalizes straight to "C:\icons" and passes. The traversal
    // check only bites for a *relative* path with no anchor to resolve
    // against (see the test above) - documented here since it's a real gap,
    // not a mistake in this test.
    expect(isValidOutputPath("C:\\Users\\me\\..\\..\\icons\\abc.png")).toBe(
      true
    );
  });
});

describe("IconService", () => {
  let tmpDir: string;
  let service: IconService;
  let iconsDir: string;
  let sourceExe: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "velocity-iconsvc-"));
    mockGetPath.mockReturnValue(tmpDir);
    service = new IconService();
    iconsDir = path.join(tmpDir, "icons");

    sourceExe = path.join(tmpDir, "Dolphin.exe");
    fs.writeFileSync(sourceExe, "");
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("creates the icons directory on construction", () => {
    expect(fs.existsSync(iconsDir)).toBe(true);
  });

  it("rejects extraction from an invalid executable path without spawning", async () => {
    const result = await service.extractIcon(
      path.join(tmpDir, "nope.exe"),
      "emu-1"
    );
    expect(result).toBeNull();
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  it("rejects an emulator id that sanitizes to empty without spawning", async () => {
    const result = await service.extractIcon(sourceExe, "///");
    expect(result).toBeNull();
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  it("returns a cached icon without spawning if it already exists", async () => {
    fs.mkdirSync(iconsDir, { recursive: true });
    const cached = path.join(iconsDir, "emu-1.png");
    fs.writeFileSync(cached, "cached-png");

    const result = await service.extractIcon(sourceExe, "emu-1");
    expect(result).toBe(cached);
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  it("invokes PowerShell with parameters as separate argv entries, not a concatenated string", async () => {
    mockSpawn.mockImplementation((_cmd: string, args: string[]) => {
      const proc = new FakeChildProcess();
      const outputPath = argAfterFlag(args, "-OutputPath");
      setTimeout(() => {
        fs.writeFileSync(outputPath, "fake-png-data");
        proc.emit("close", 0);
      });
      return proc;
    });

    const result = await service.extractIcon(sourceExe, "emu-1");

    expect(result).toBe(path.join(iconsDir, "emu-1.png"));
    expect(mockSpawn).toHaveBeenCalledTimes(1);

    const [command, args] = mockSpawn.mock.calls[0];
    expect(command).toBe("powershell.exe");
    expect(Array.isArray(args)).toBe(true);
    expect(argAfterFlag(args, "-InputPath")).toBe(sourceExe);
    expect(argAfterFlag(args, "-OutputPath")).toBe(
      path.join(iconsDir, "emu-1.png")
    );
    // Every element is its own argv entry (never a single shell string),
    // which is what makes this safe from injection.
    args.forEach((arg: unknown) => expect(typeof arg).toBe("string"));
  });

  it("returns null when the PowerShell process exits with a non-zero code", async () => {
    mockSpawn.mockImplementation(() => {
      const proc = new FakeChildProcess();
      setTimeout(() => proc.emit("close", 1), 0);
      return proc;
    });

    const result = await service.extractIcon(sourceExe, "emu-1");
    expect(result).toBeNull();
  });

  it("returns null when spawn itself errors", async () => {
    mockSpawn.mockImplementation(() => {
      const proc = new FakeChildProcess();
      setTimeout(() => proc.emit("error", new Error("spawn failed")), 0);
      return proc;
    });

    const result = await service.extractIcon(sourceExe, "emu-1");
    expect(result).toBeNull();
  });

  it("kills the process and gives up after a 30s timeout", async () => {
    jest.useFakeTimers();
    let fakeProc!: FakeChildProcess;
    mockSpawn.mockImplementation(() => {
      fakeProc = new FakeChildProcess();
      return fakeProc; // never emits close/error
    });

    const resultPromise = service.extractIcon(sourceExe, "emu-1");
    await Promise.resolve(); // let the promise executor run and register spawn
    jest.advanceTimersByTime(30000);

    const result = await resultPromise;
    expect(result).toBeNull();
    expect(fakeProc.kill).toHaveBeenCalled();
    jest.useRealTimers();
  });

  describe("cleanupUnusedIcons", () => {
    it("removes icon files whose id is no longer active and keeps the rest", async () => {
      fs.mkdirSync(iconsDir, { recursive: true });
      fs.writeFileSync(path.join(iconsDir, "emu-1.png"), "a");
      fs.writeFileSync(path.join(iconsDir, "emu-2.png"), "b");
      fs.writeFileSync(path.join(iconsDir, "emu-3.png"), "c");

      await service.cleanupUnusedIcons(["emu-1", "emu-3"]);

      const remaining = fs.readdirSync(iconsDir).sort();
      expect(remaining).toEqual(["emu-1.png", "emu-3.png"]);
    });
  });
});
