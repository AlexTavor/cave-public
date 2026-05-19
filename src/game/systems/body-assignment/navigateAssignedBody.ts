import type {
    CommandBuffer,
    RuntimeCommand,
    RuntimeEntity,
} from "../../../engine/runtime/types";
import { RuntimeCommandType } from "../../../engine/runtime/types";
import type { Snapshot } from "../../../engine/runtime/Snapshot";
import { resolveOrbitRadius } from "./orbitLayout";
import { resolveOwnerResourceProgressBarOutset } from "./resourceProgressBarOrbit";

export const navigateAssignedBody = (input: {
    bodyId: string;
    ownerId: string;
    owner: Readonly<RuntimeEntity>;
    ownerKind: "world" | "pointer" | "power" | "processing" | "other";
    snapshot: Snapshot;
    body: {
        x: number;
        y: number;
        radius: number;
        layer?: string;
        targetId?: string;
    };
    ownerBody: { x: number; y: number; radius: number };
    commands: CommandBuffer<RuntimeCommand>;
}) => {
    if (input.body.layer !== "default") {
        input.commands.enqueue({
            type: RuntimeCommandType.SET_PHYSICS_LAYER,
            payload: { entityId: input.bodyId, layer: "default" },
        });
    }
    if (input.body.targetId !== input.ownerId) {
        input.commands.enqueue({
            type: RuntimeCommandType.SET_TARGET,
            payload: { entityId: input.bodyId, targetId: input.ownerId },
        });
    }
    const distance = Math.hypot(
        input.body.x - input.ownerBody.x,
        input.body.y - input.ownerBody.y,
    );
    const entryRadius = resolveOrbitRadius({
        ownerId: input.ownerId,
        ownerKind: input.ownerKind,
        assignedIds: [input.bodyId],
        bodyId: input.bodyId,
        ownerRadius: input.ownerBody.radius,
        ownerBarOutsetPx: resolveOwnerResourceProgressBarOutset({
            snapshot: input.snapshot,
            owner: input.owner,
            ownerRadius: input.ownerBody.radius,
        }),
        bodyRadius: input.body.radius,
        timeMs: 0,
        progressRatio: 0,
    });
    if (distance > entryRadius + input.body.radius + 8) return;
    input.commands.enqueue({
        type: RuntimeCommandType.UPDATE_BODIES_BATCH,
        payload: {
            updates: [{ entityId: input.bodyId, assignmentStatus: "orbiting" }],
        },
    });
};
