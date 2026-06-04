import type { RuntimeEntity } from "../types";

/**
 * Removes a body id from every owner's `assignment.assignedIds`. Referential
 * cleanup on the engine-native assignment component (the same component
 * UpdateAssignmentHandler and assignmentCompiler manage) — run when a body is
 * killed so dead ids don't linger in any node's assigned list. Other assignment
 * fields are preserved; owners that don't reference the id are left untouched.
 */
export const removeBodyFromOwners = (
    entities: RuntimeEntity[],
    bodyId: string,
): void => {
    entities.forEach((entity) => {
        const assignment = (
            entity as { assignment?: { assignedIds?: string[] } }
        ).assignment;
        const assignedIds = assignment?.assignedIds;
        if (!Array.isArray(assignedIds) || !assignedIds.includes(bodyId)) {
            return;
        }
        (entity as { assignment: { assignedIds: string[] } }).assignment = {
            ...assignment,
            assignedIds: assignedIds.filter((id) => id !== bodyId),
        };
    });
};
