import type { Snapshot } from "../../engine/runtime/Snapshot";
import type { CommandBuffer, RuntimeCommand } from "../../engine/runtime/types";
import { RuntimeCommandType } from "../../engine/runtime/types";
import {
    readAssignedIds,
    readBodyOrbitOffsets,
} from "../assignment/bodyAssignment";
import {
    resolveOrbitPositionAtProgress,
    resolveOrbitRadius,
} from "./body-assignment/orbitLayout";
import { resolveOwnerResourceProgressBarOutset } from "./body-assignment/resourceProgressBarOrbit";

export const enqueueAssignmentProgress = (
    commands: CommandBuffer<RuntimeCommand>,
    entityId: string,
    elapsedMs: number,
    ratio: number,
) =>
    (
        [
            ["assignment_progress_ms", elapsedMs],
            ["assignment_progress_ratio", ratio],
        ] as Array<[string, number]>
    ).forEach(([key, value]) =>
        commands.enqueue({
            type: RuntimeCommandType.UPDATE_STATE,
            payload: { entityId, key, value, visible: false },
        }),
    );

export const hasReachedProcessingCompletion = (input: {
    snapshot: Snapshot;
    node: { id?: string; assignment?: { assignedIds?: string[] } };
    bodyId: string;
    nextMs: number;
    nextRatio: number;
}) => {
    const ownerId = input.node.id;
    const bodyEntity = input.snapshot.getEntity(input.bodyId);
    const body = input.snapshot.getPhysicsBody(input.bodyId);
    const ownerBody = ownerId ? input.snapshot.getPhysicsBody(ownerId) : null;
    if (!ownerId || !bodyEntity || !body || !ownerBody) return false;
    const ownerBarOutsetPx = resolveOwnerResourceProgressBarOutset({
        snapshot: input.snapshot,
        owner: input.node as any,
        ownerRadius: ownerBody.radius,
    });
    const orbit = readBodyOrbitOffsets(bodyEntity as any);
    const next = resolveOrbitPositionAtProgress({
        ownerId,
        ownerKind: "processing",
        ownerX: ownerBody.x,
        ownerY: ownerBody.y,
        ownerRadius: ownerBody.radius,
        ownerBarOutsetPx,
        assignedIds: readAssignedIds(input.node as any),
        bodyId: input.bodyId,
        bodyRadius: body.radius,
        timeMs: input.nextMs,
        progressRatio: input.nextRatio,
        phaseOffset: orbit?.phaseOffset,
        radiusOffset: orbit?.radiusOffset,
    });
    const targetRadius = resolveOrbitRadius({
        ownerId,
        ownerKind: "processing",
        assignedIds: readAssignedIds(input.node as any),
        bodyId: input.bodyId,
        ownerRadius: ownerBody.radius,
        ownerBarOutsetPx,
        bodyRadius: body.radius,
        timeMs: input.nextMs,
        progressRatio: input.nextRatio,
    });
    return (
        Math.hypot(next.x - ownerBody.x, next.y - ownerBody.y) <=
        targetRadius + 0.5
    );
};
