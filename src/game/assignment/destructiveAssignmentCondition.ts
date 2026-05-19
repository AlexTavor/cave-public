import type { Snapshot } from "../../engine/runtime/Snapshot";
import { collectExtantBodyIds } from "./extantBodyIds";

const readAssignedIds = (entity: any): string[] =>
    Array.isArray(entity?.assignment?.assignedIds)
        ? entity.assignment.assignedIds.filter(
              (id: unknown): id is string => typeof id === "string",
          )
        : [];

const destroysAssignedBodies = (entity: any): boolean =>
    entity?.state?.processing_destroys_assigned_bodies?.value === true;

export const evaluateDestructiveAssignmentHasAllBodies = (
    snapshot: Snapshot,
    selfId: string,
): boolean => {
    const self = snapshot.getEntity(selfId) as any;
    if (!self || !destroysAssignedBodies(self)) return false;
    const assignedIds = readAssignedIds(self);
    if (assignedIds.length === 0) return false;
    const extantBodyIds = collectExtantBodyIds(snapshot.getEntities() as any);
    if (extantBodyIds.length === 0) return false;
    const assignedSet = new Set(assignedIds);
    return (
        assignedIds.length === extantBodyIds.length &&
        assignedSet.size === extantBodyIds.length &&
        extantBodyIds.every((id) => assignedSet.has(id))
    );
};
