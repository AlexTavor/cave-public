import { PASSPORT_PERMANENT_TAG } from "../../../data/schemas/abilities/passport";
import { coerceBlueprintId } from "../blueprintId";
import type { Runtime } from "../Runtime";
import type { RuntimeEntity } from "../types";
import { serializePhysicsBody } from "./physicsBodyPersistence";
import { restorePassportPermanentEntries } from "./passportPermanentCarryoverRestore";
import { saveState } from "./flyweightStatePersistence";
import type {
  IssueReason,
  PassportPermanentCarryoverEntry,
  PassportPermanentCarryoverIssue,
  PassportPermanentCarryoverSnapshot,
} from "./passportPermanentCarryover.types";
export type {
  PassportPermanentCarryoverEntry,
  PassportPermanentCarryoverIssue,
  PassportPermanentCarryoverSnapshot,
} from "./passportPermanentCarryover.types";

const issue = (
  entityId: string,
  phase: "extract" | "restore",
  reason: IssueReason,
): PassportPermanentCarryoverIssue => ({ entityId, phase, reason });

const extractEntry = (
  runtime: Runtime,
  entity: RuntimeEntity,
): PassportPermanentCarryoverEntry | PassportPermanentCarryoverIssue => {
  const entityId = String(entity.id ?? "");
  const blueprintId = coerceBlueprintId(entity.blueprintId);
  if (!blueprintId) return issue(entityId, "extract", "missing_blueprint_id");
  const blueprint = runtime.getCartridge().blueprints[blueprintId];
  if (!blueprint) return issue(entityId, "extract", "missing_source_blueprint");
  const physics = entity.physics
    ? serializePhysicsBody(runtime, entityId)
    : null;
  if (entity.physics && !physics) {
    return issue(entityId, "extract", "missing_source_physics_body");
  }
  const state = saveState(blueprint.components?.state, entity.state);
  return {
    id: entityId,
    blueprintId,
    ...(Object.keys(state).length ? { state } : {}),
    ...(physics ? { physics } : {}),
  };
};

export const extractPassportPermanentCarryover = (
  runtime: Runtime,
): PassportPermanentCarryoverSnapshot => {
  const entries: PassportPermanentCarryoverEntry[] = [];
  const issues: PassportPermanentCarryoverIssue[] = [];
  for (const entity of runtime.getEntities()) {
    if (!entity.tags?.includes(PASSPORT_PERMANENT_TAG)) continue;
    const result = extractEntry(runtime, entity);
    if ("phase" in result) issues.push(result);
    else entries.push(result);
  }
  return { entries, issues };
};

export const restorePassportPermanentCarryover = (
  runtime: Runtime,
  snapshot: PassportPermanentCarryoverSnapshot,
): PassportPermanentCarryoverIssue[] =>
  restorePassportPermanentEntries(runtime, snapshot.entries);
