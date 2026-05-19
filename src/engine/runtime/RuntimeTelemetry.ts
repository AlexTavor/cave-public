import type { Snapshot } from "./Snapshot";
import type { RuntimeCommand } from "./types";

export interface RuntimeTelemetryAdapter {
  log: (channel: "tick" | "systems" | "errors", message: string) => void;
  onCommandsApplied?: (
    commands: RuntimeCommand[],
    previousSnapshot: Snapshot,
    currentSnapshot: Snapshot,
  ) => void;
}
