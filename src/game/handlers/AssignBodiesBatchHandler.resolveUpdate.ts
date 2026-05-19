import type { RuntimeEntity } from "../../engine/runtime/types";
import { readAssignmentId } from "../assignment/bodyAssignment";

const findEntity = (entities: RuntimeEntity[], id: string) =>
    entities.find((entity) => entity.id === id);

export const findRuntimeEntity = findEntity;

export const resolveAssignBodiesBatchUpdate = (
    entities: RuntimeEntity[],
    world: RuntimeEntity,
    body: RuntimeEntity,
    update: any,
) => {
    const beforeOwnerId = readAssignmentId(body);
    if (
        update.expectedCurrentOwnerId &&
        beforeOwnerId !== update.expectedCurrentOwnerId
    ) {
        return {
            error: `ASSIGN_BODIES_BATCH rejected: '${update.bodyId}' expected '${update.expectedCurrentOwnerId}' but was '${beforeOwnerId}'.`,
        };
    }
    const nextOwner = findEntity(entities, update.ownerId);
    if (update.mode === "drag_restore" && !nextOwner) {
        return {
            error: `ASSIGN_BODIES_BATCH rejected: missing drag restore owner '${update.ownerId}'.`,
        };
    }
    return { beforeOwnerId, nextOwner: nextOwner || world };
};
