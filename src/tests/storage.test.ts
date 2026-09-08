import * as fs from "fs";
import * as os from "os";
import * as path from "path";

jest.mock("electron", () => ({
  app: {
    getPath: jest.fn(),
  },
}));

import { app } from "electron";
import { StorageService, isValidEmulatorData, sanitizeString } from "../storage";
import { EmulatorConfig } from "../types";

const mockGetPath = app.getPath as jest.Mock;

const validEmulatorInput = (
  overrides: Partial<Omit<EmulatorConfig, "id" | "dateAdded" | "launchCount">> = {}
) => ({
  name: "Dolphin",
  executablePath: "C:\\Emulators\\Dolphin\\Dolphin.exe",
  emulatorType: "GameCube/Wii",
  platform: "Windows",
  ...overrides,
});

describe("isValidEmulatorData", () => {
  it("accepts a minimal valid emulator", () => {
    expect(isValidEmulatorData(validEmulatorInput())).toBe(true);
  });

  it.each(["name", "executablePath", "emulatorType", "platform"])(
    "rejects a missing required field: %s",
    (field) => {
      const data: any = validEmulatorInput();
      delete data[field];
      expect(isValidEmulatorData(data)).toBe(false);
    }
  );

  it("rejects a name over 100 characters", () => {
    expect(
      isValidEmulatorData(validEmulatorInput({ name: "a".repeat(101) }))
    ).toBe(false);
  });

  it("rejects a description over 500 characters", () => {
    expect(
      isValidEmulatorData(
        validEmulatorInput({ description: "a".repeat(501) })
      )
    ).toBe(false);
  });

  it("rejects arguments over 1000 characters", () => {
    expect(
      isValidEmulatorData(validEmulatorInput({ arguments: "a".repeat(1001) }))
    ).toBe(false);
  });

  it.each(["executablePath", "workingDirectory", "iconPath"])(
    "rejects path traversal in %s",
    (field) => {
      const data = validEmulatorInput({ [field]: "..\\..\\evil.exe" } as any);
      expect(isValidEmulatorData(data)).toBe(false);
    }
  );
});

describe("sanitizeString", () => {
  it("removes HTML/JS injection characters", () => {
    expect(sanitizeString(`<script>alert('x')</script>`)).toBe(
      "scriptalert(x)/script"
    );
  });

  it("trims whitespace", () => {
    expect(sanitizeString("  Dolphin  ")).toBe("Dolphin");
  });

  it("limits length to 1000 characters", () => {
    expect(sanitizeString("a".repeat(2000))).toHaveLength(1000);
  });

  it("returns an empty string for non-string input", () => {
    expect(sanitizeString(null as unknown as string)).toBe("");
    expect(sanitizeString(undefined as unknown as string)).toBe("");
  });
});

describe("StorageService", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "velocity-storage-"));
    mockGetPath.mockReturnValue(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("creates a default config file on first use", () => {
    new StorageService();
    const configFile = path.join(tmpDir, "velocity-launcher-config.json");
    expect(fs.existsSync(configFile)).toBe(true);

    const settings = JSON.parse(fs.readFileSync(configFile, "utf-8"));
    expect(settings.emulators).toEqual([]);
    expect(settings.theme).toBe("auto");
  });

  it("throws when adding invalid emulator data", () => {
    const service = new StorageService();
    expect(() =>
      service.addEmulator(validEmulatorInput({ name: "" }))
    ).toThrow();
  });

  it("adds a valid emulator and generates an id", () => {
    const service = new StorageService();
    const id = service.addEmulator(validEmulatorInput());

    expect(id).toMatch(/^emulator-\d+-\d+$/);

    const settings = service.loadSettings();
    expect(settings.emulators).toHaveLength(1);
    expect(settings.emulators[0].id).toBe(id);
    expect(settings.emulators[0].launchCount).toBe(0);
  });

  it("sanitizes the name and description on add", () => {
    const service = new StorageService();
    const id = service.addEmulator(
      validEmulatorInput({
        name: `<script>alert('x')</script>`,
        description: `hello "world"`,
      })
    );

    const settings = service.loadSettings();
    const saved = settings.emulators.find((e) => e.id === id)!;
    expect(saved.name).toBe("scriptalert(x)/script");
    expect(saved.description).toBe("hello world");
  });

  it("round-trips dateAdded as a real Date after reload", () => {
    const service = new StorageService();
    service.addEmulator(validEmulatorInput());

    const reloaded = new StorageService().loadSettings();
    expect(reloaded.emulators[0].dateAdded).toBeInstanceOf(Date);
  });

  it("updates an existing emulator and persists the change", () => {
    const service = new StorageService();
    const id = service.addEmulator(validEmulatorInput());

    const result = service.updateEmulator(id, { name: "New Name" });
    expect(result).toBe(true);

    const settings = service.loadSettings();
    expect(settings.emulators.find((e) => e.id === id)!.name).toBe(
      "New Name"
    );
  });

  it("rejects updating an unknown id", () => {
    const service = new StorageService();
    expect(service.updateEmulator("does-not-exist", { name: "x" })).toBe(
      false
    );
  });

  it("rejects an oversized name on update without partially writing it", () => {
    const service = new StorageService();
    const id = service.addEmulator(validEmulatorInput());

    const result = service.updateEmulator(id, { name: "a".repeat(200) });
    expect(result).toBe(false);

    const settings = service.loadSettings();
    expect(settings.emulators.find((e) => e.id === id)!.name).toBe(
      "Dolphin"
    );
  });

  it("removes an emulator", () => {
    const service = new StorageService();
    const id = service.addEmulator(validEmulatorInput());

    expect(service.removeEmulator(id)).toBe(true);
    expect(service.loadSettings().emulators).toHaveLength(0);
  });

  it("returns false when removing an unknown id", () => {
    const service = new StorageService();
    expect(service.removeEmulator("does-not-exist")).toBe(false);
  });

  it("increments launch count and sets lastLaunched", () => {
    const service = new StorageService();
    const id = service.addEmulator(validEmulatorInput());

    service.incrementLaunchCount(id);

    const settings = service.loadSettings();
    const emulator = settings.emulators.find((e) => e.id === id)!;
    expect(emulator.launchCount).toBe(1);
    expect(emulator.lastLaunched).toBeInstanceOf(Date);
  });

  it("falls back to defaults when the config file is corrupt", () => {
    const service = new StorageService();
    const configFile = path.join(tmpDir, "velocity-launcher-config.json");
    fs.writeFileSync(configFile, "{ not valid json", "utf-8");

    const settings = service.loadSettings();
    expect(settings.emulators).toEqual([]);
    expect(settings.theme).toBe("auto");
  });
});
