import {
    patchCommandMetadataInPlace,
    type RuntimeCommand,
} from "../../engine/runtime/types";
import {
    ensureAssignmentComponent,
    isBodyEntity,
    readAssignmentStatus,
    resetBodyAssignmentProgress,
    setAssignmentRequiredMs,
    setBodyAssignment,
} from "../assignment/bodyAssignment";
import { removeBodyFromOwners } from "../../engine/runtime/handlers/removeBodyFromOwners";
import { canAssignBodyToOwner } from "../assignment/assignmentAcceptance";
import { readAssignmentDurationMs } from "../assignment/assignmentDurationMs";
import {
    findRuntimeEntity,
    resolveAssignBodiesBatchUpdate,
} from "./AssignBodiesBatchHandler.resolveUpdate";

export const applyAssignBodiesBatchUpdate = (
    command: RuntimeCommand,
    context: any,
    world: any,
    update: any,
): void => {
    const body = findRuntimeEntity(context.world.entities, update.bodyId);
    if (!body || !isBodyEntity(body)) {
        context.telemetry.log(
            "errors",
            `ASSIGN_BODIES_BATCH failed: '${update.bodyId}' is not a body.`,
        );
        return;
    }
    const resolved = resolveAssignBodiesBatchUpdate(
        context.world.entities,
        world,
        body,
        update,
    );
    if ("error" in resolved) {
        context.telemetry.log("errors", resolved.error);
        return;
    }
    const { beforeOwnerId, nextOwner } = resolved;
    if (update.mode !== "drag_restore") {
        const acceptance = canAssignBodyToOwner({
            body,
            owner: nextOwner,
            ignoreBodyId: update.bodyId,
        });
        if (!acceptance.allowed) {
            context.telemetry.log(
                "errors",
                `ASSIGN_BODIES_BATCH rejected: '${update.bodyId}' -> '${nextOwner.id ?? "sys_world"}' (${acceptance.reason}).`,
            );
            return;
        }
    }
    const nextOwnerId = nextOwner.id || "sys_world";
    const nextAssignment = ensureAssignmentComponent(nextOwner);
    const nextStatus =
        beforeOwnerId === nextOwnerId &&
        readAssignmentStatus(body) === "orbiting"
            ? "orbiting"
            : "navigating";
    patchCommandMetadataInPlace(command, {
        assignmentTransitions: [
            ...(((command as any).metadata?.assignmentTransitions as any[]) ??
                []),
            { bodyId: update.bodyId, beforeOwnerId, afterOwnerId: nextOwnerId },
        ],
    });
    removeBodyFromOwners(context.world.entities, update.bodyId);
    nextAssignment.assignedIds = [
        ...new Set([...nextAssignment.assignedIds, update.bodyId]),
    ].sort((left, right) => left.localeCompare(right));
    resetBodyAssignmentProgress(body);
    setAssignmentRequiredMs(body, readAssignmentDurationMs(nextOwner));
    setBodyAssignment(body, nextOwnerId, nextStatus);
};
