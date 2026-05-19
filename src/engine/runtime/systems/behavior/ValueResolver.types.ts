import type { Snapshot } from "../../Snapshot";
import type { RuntimeCommandSourceLane, RuntimeEntity } from "../../types";

export interface BehaviorContext {
  snapshot: Snapshot;
  self: RuntimeEntity;
  globals: Record<string, number>;
  sourceLane: RuntimeCommandSourceLane;
  assignmentMap?: Record<string, string>;
}
