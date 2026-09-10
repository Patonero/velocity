import * as fs from "fs";
import * as path from "path";

/**
 * Small persistent bit of app state that is NOT a user setting: the version that
 * was running the last time the app launched. Used to recognise a
 * just-happened self-update so the UI can say "Updated to vX.Y.Z" instead of
 * silently swapping versions.
 *
 * Kept separate from velocity-launcher-config.json because the renderer
 * round-trips that file on every settings save and would clobber any field it
 * does not know about.
 */

const STATE_FILE = "velocity-launcher-state.json";

interface AppStateData {
  lastLaunchedVersion?: string;
}

export type LaunchKind = "first-run" | "updated" | "normal";

/**
 * Pure classifier - given the previously recorded version and the version now
 * running, decide what kind of launch this is.
 */
export function classifyLaunch(
  previousVersion: string | undefined,
  currentVersion: string
): LaunchKind {
  if (!previousVersion) {
    return "first-run";
  }
  if (previousVersion !== currentVersion) {
    return "updated";
  }
  return "normal";
}

export class AppState {
  private readonly stateFilePath: string;

  constructor(userDataPath: string) {
    this.stateFilePath = path.join(userDataPath, STATE_FILE);
  }

  public readLastLaunchedVersion(): string | undefined {
    try {
      if (!fs.existsSync(this.stateFilePath)) {
        return undefined;
      }
      const data = JSON.parse(
        fs.readFileSync(this.stateFilePath, "utf8")
      ) as AppStateData;
      return typeof data.lastLaunchedVersion === "string"
        ? data.lastLaunchedVersion
        : undefined;
    } catch (error) {
      console.error("Error reading app state:", error);
      return undefined;
    }
  }

  public writeLastLaunchedVersion(version: string): void {
    try {
      const data: AppStateData = { lastLaunchedVersion: version };
      fs.writeFileSync(this.stateFilePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Error writing app state:", error);
    }
  }
}
