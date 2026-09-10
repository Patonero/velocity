import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { AppState, classifyLaunch } from "../app-state";

describe("classifyLaunch", () => {
  it("is a first run when there is no previously recorded version", () => {
    expect(classifyLaunch(undefined, "1.5.5")).toBe("first-run");
  });

  it("is an update when the recorded version differs from the current one", () => {
    expect(classifyLaunch("1.5.4", "1.5.5")).toBe("updated");
  });

  it("treats a downgrade as an update too (version simply changed)", () => {
    expect(classifyLaunch("1.6.0", "1.5.5")).toBe("updated");
  });

  it("is a normal launch when the version is unchanged", () => {
    expect(classifyLaunch("1.5.5", "1.5.5")).toBe("normal");
  });
});

describe("AppState", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "velocity-appstate-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns undefined before anything has been written", () => {
    expect(new AppState(tmpDir).readLastLaunchedVersion()).toBeUndefined();
  });

  it("round-trips the last launched version", () => {
    const state = new AppState(tmpDir);
    state.writeLastLaunchedVersion("1.5.5");
    expect(new AppState(tmpDir).readLastLaunchedVersion()).toBe("1.5.5");
  });

  it("survives a corrupt state file rather than throwing", () => {
    fs.writeFileSync(path.join(tmpDir, "velocity-launcher-state.json"), "{ not json");
    expect(new AppState(tmpDir).readLastLaunchedVersion()).toBeUndefined();
  });

  it("ignores a non-string stored value", () => {
    fs.writeFileSync(
      path.join(tmpDir, "velocity-launcher-state.json"),
      JSON.stringify({ lastLaunchedVersion: 155 })
    );
    expect(new AppState(tmpDir).readLastLaunchedVersion()).toBeUndefined();
  });

  it("models the post-update launch end to end", () => {
    const state = new AppState(tmpDir);

    // First ever launch on 1.5.4
    expect(classifyLaunch(state.readLastLaunchedVersion(), "1.5.4")).toBe("first-run");
    state.writeLastLaunchedVersion("1.5.4");

    // Relaunch, still 1.5.4
    expect(classifyLaunch(state.readLastLaunchedVersion(), "1.5.4")).toBe("normal");

    // Silent update applied, now running 1.5.5
    expect(classifyLaunch(state.readLastLaunchedVersion(), "1.5.5")).toBe("updated");
    state.writeLastLaunchedVersion("1.5.5");

    // Next launch is quiet again
    expect(classifyLaunch(state.readLastLaunchedVersion(), "1.5.5")).toBe("normal");
  });
});
