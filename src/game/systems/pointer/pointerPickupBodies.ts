import type { Snapshot } from "../../../engine/runtime/Snapshot";
import type { RuntimeEntity } from "../../../engine/runtime/types";
import {
    isBodyEntity,
    readAssignmentId,
} from "../../assignment/bodyAssignment";
import {
    isPowerAssignmentNode,
    isProcessingAssignmentNode,
} from "../../assignment/assignmentNodeKinds";

const canPickupFromOwner = (owner: RuntimeEntity | undefined) =>
    owner?.id === "sys_world" ||
    isPowerAssignmentNode(owner) ||
    isProcessingAssignmentNode(owner);

export const readOwnedHabiti = (entity: RuntimeEntity | undefined) => {
    const cave = entity?.cave;
    if (!cave || typeof cave !== "object") return [];
    const ids = (cave as { ownedHabiti?: unknown }).ownedHabiti;
    return Array.isArray(ids)
        ? ids.filter((id): id is string => typeof id === "string")
        : [];
};

export const resolvePickupBodies = (snapshot: Snapshot) =>
    snapshot.getEntities().flatMap((entity) => {
        if (!entity.id || !isBodyEntity(entity as any)) return [];
        const ownerId = readAssignmentId(entity as any);
        const physics = snapshot.getPhysicsBody(entity.id);
        const owner = snapshot.getEntity(ownerId) as RuntimeEntity | undefined;
        return physics && ownerId !== "sys_pointer" && canPickupFromOwner(owner)
            ? [{ id: entity.id, x: physics.x, y: physics.y }]
            : [];
    });
