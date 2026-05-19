import type { Snapshot } from "../../engine/runtime/Snapshot";
import type { System } from "../../engine/runtime/systems/System";
import type { CommandBuffer, RuntimeCommand } from "../../engine/runtime/types";
import { RuntimeCommandType } from "../../engine/runtime/types";
import {
    readAssignedIds,
    readAssignmentId,
    readAssignmentRequiredMs,
    readAssignmentStatus,
    readStateNumber,
} from "../assignment/bodyAssignment";
import { satisfiesAssignmentMinimums } from "../assignment/assignmentMinimums";
import { isProcessingAssignmentNode } from "../assignment/assignmentNodeKinds";
import {
    enqueueAssignmentProgress,
    hasReachedProcessingCompletion,
} from "./processingProgress";

export class ProcessingNodeSystem implements System {
    public tick(
        snapshot: Snapshot,
        commands: CommandBuffer<RuntimeCommand>,
        dt: number,
    ): void {
        snapshot.getEntities().forEach((entity) => {
            if (!entity.id || !isProcessingAssignmentNode(entity as any))
                return;
            const assignedIds = readAssignedIds(entity as any);
            const ready = satisfiesAssignmentMinimums(
                (id) => snapshot.getEntity(id) ?? undefined,
                assignedIds,
                (entity as any).assignment?.minimums ?? [],
            );
            if (!ready) return;
            assignedIds.forEach((bodyId) => {
                const body = snapshot.getEntity(bodyId);
                if (
                    !body ||
                    readAssignmentId(body as any) !== entity.id ||
                    readAssignmentStatus(body as any) !== "orbiting"
                )
                    return;
                const durationMs = readAssignmentRequiredMs(body as any);
                if (durationMs <= 0) return;
                const nextMs = Math.min(
                    durationMs,
                    readStateNumber(body as any, "assignment_progress_ms") + dt,
                );
                const nextRatio = durationMs > 0 ? nextMs / durationMs : 0;
                enqueueAssignmentProgress(commands, bodyId, nextMs, nextRatio);
                if (
                    nextMs < durationMs ||
                    !hasReachedProcessingCompletion({
                        snapshot,
                        node: entity as any,
                        bodyId,
                        nextMs,
                        nextRatio,
                    })
                )
                    return;
                commands.enqueue({
                    type: RuntimeCommandType.RESOLVE_BODY_PROCESSING,
                    payload: { nodeId: entity.id ?? "", bodyId },
                });
            });
        });
        snapshot.getEntities().forEach((entity) => {
            if (!(entity as { body?: unknown }).body || !entity.id) return;
            const progress = readStateNumber(
                entity as any,
                "assignment_progress_ms",
            );
            if (progress === 0) return;
            const owner = snapshot.getEntity(readAssignmentId(entity as any));
            if (
                isProcessingAssignmentNode(owner as any) &&
                readAssignmentStatus(entity as any) === "orbiting"
            )
                return;
            enqueueAssignmentProgress(commands, entity.id, 0, 0);
        });
    }
}
