import type { RuntimeEntity } from "../types";
import type { SerializedPhysicsBody } from "./types";

export type IssueReason =
  | "missing_blueprint_id"
  | "missing_source_blueprint"
  | "missing_source_physics_body"
  | "missing_target_blueprint"
  | "target_id_conflict"
  | "target_physics_conflict"
  | "invalid_target_physics_component";

export interface PassportPermanentCarryoverEntry {
  id: string;
  blueprintId: string;
  state?: RuntimeEntity["state"];
  physics?: SerializedPhysicsBody;
}

export interface PassportPermanentCarryoverIssue {
  entityId: string;
  phase: "extract" | "restore";
  reason: IssueReason;
}

export interface PassportPermanentCarryoverSnapshot {
  entries: PassportPermanentCarryoverEntry[];
  issues: PassportPermanentCarryoverIssue[];
}
