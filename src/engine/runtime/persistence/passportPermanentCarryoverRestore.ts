import { PhysicsComponentSchema } from "../../../data/schemas/physics";
import type { ParentComponent } from "../../../data/schemas/components";
import type { Runtime } from "../Runtime";
import type { RuntimeEntity } from "../types";
import { hydrateFlyweightEntity } from "./flyweightPersistence";
import { restorePhysicsBody } from "./physicsBodyPersistence";
import type {
  PassportPermanentCarryoverEntry,
  PassportPermanentCarryoverIssue,
} from "./passportPermanentCarryover.types";

const issue = (
  entityId: string,
  reason: PassportPermanentCarryoverIssue["reason"],
): PassportPermanentCarryoverIssue => ({ entityId, phase: "restore", reason });

const resolveParentId = (runtime: Runtime, parent: ParentComponent) => {
  if ("parentId" in parent) return parent.parentId;
  if (parent.kind === "entity_id")
    return runtime.getEntity(parent.entityId)?.id;
  return runtime
    .getEntities()
    .find((entity) => entity.tags?.includes(parent.tag))?.id;
};

const resolveRestoredParents = (runtime: Runtime, ids: string[]) => {
  for (const id of ids) {
    const entity = runtime.getEntity(id) as RuntimeEntity & {
      parent?: ParentComponent;
    };
    if (!entity?.parent || "parentId" in entity.parent) continue;
    const parentId = resolveParentId(runtime, entity.parent);
    if (parentId) entity.parent = { parentId };
    else delete entity.parent;
  }
};

const restoreEntry = (
  runtime: Runtime,
  entry: PassportPermanentCarryoverEntry,
): PassportPermanentCarryoverIssue | undefined => {
  if (runtime.getEntity(entry.id)) return issue(entry.id, "target_id_conflict");
  if (entry.physics && runtime.getPhysicsBody(entry.id)) {
    return issue(entry.id, "target_physics_conflict");
  }
  const blueprint = runtime.getCartridge().blueprints[entry.blueprintId];
  if (!blueprint) return issue(entry.id, "missing_target_blueprint");
  if (
    entry.physics &&
    !PhysicsComponentSchema.safeParse(blueprint.components?.physics).success
  ) {
    return issue(entry.id, "invalid_target_physics_component");
  }
  runtime.addEntity(
    hydrateFlyweightEntity(runtime, {
      id: entry.id,
      blueprintId: entry.blueprintId,
      ...(entry.state ? { state: entry.state } : {}),
    }),
  );
  if (entry.physics && !restorePhysicsBody(runtime, entry.id, entry.physics)) {
    return issue(entry.id, "invalid_target_physics_component");
  }
};

export const restorePassportPermanentEntries = (
  runtime: Runtime,
  entries: PassportPermanentCarryoverEntry[],
): PassportPermanentCarryoverIssue[] => {
  const issues: PassportPermanentCarryoverIssue[] = [];
  const restoredIds: string[] = [];
  for (const entry of entries) {
    const result = restoreEntry(runtime, entry);
    if (result) issues.push(result);
    else restoredIds.push(entry.id);
  }
  resolveRestoredParents(runtime, restoredIds);
  return issues;
};
