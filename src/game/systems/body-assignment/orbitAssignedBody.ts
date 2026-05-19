import type { Snapshot } from "../../../engine/runtime/Snapshot";
import type {
    CommandBuffer,
    RuntimeCommand,
} from "../../../engine/runtime/types";
import { RuntimeCommandType } from "../../../engine/runtime/types";
import {
    readAssignedIds,
    readBodyOrbitOffsets,
    readStateNumber,
} from "../../assignment/bodyAssignment";
import { resolveAssignmentOwnerKind } from "../../assignment/assignmentNodeKinds";
import { resolveOrbitOffsets, resolveOrbitPosition } from "./orbitLayout";
import { settleOrbitRadiusOffset } from "./orbitRadiusBand";
import { resolveOwnerResourceProgressBarOutset } from "./resourceProgressBarOrbit";
const samePosition = (left: number, right: number) =>
    Math.abs(left - right) < 0.5;
const enqueueOrbitOffsets = (
    commands: CommandBuffer<RuntimeCommand>,
    bodyId: string,
    phaseOffset: number,
    radiusOffset: number,
) =>
    (
        [
            ["assignment_orbit_phase_offset", phaseOffset],
            ["assignment_orbit_radius_offset", radiusOffset],
        ] as Array<[string, number]>
    ).forEach(([key, value]) =>
        commands.enqueue({
            type: RuntimeCommandType.UPDATE_STATE,
            payload: { entityId: bodyId, key, value, visible: false },
        }),
    );

export const orbitAssignedBody = (input: {
    bodyId: string;
    owner: Readonly<Record<string, any>>;
    body: {
        x: number;
        y: number;
        radius: number;
        layer?: string;
        targetId?: string;
    };
    ownerBody: { x: number; y: number; radius: number };
    snapshot: Snapshot;
    commands: CommandBuffer<RuntimeCommand>;
    timeMs: number;
}) => {
    const ownerKind = resolveAssignmentOwnerKind(input.owner as any);
    const entity = input.snapshot.getEntity(input.bodyId) as any;
    const ownerBarOutsetPx = resolveOwnerResourceProgressBarOutset({
        snapshot: input.snapshot,
        owner: input.owner as any,
        ownerRadius: input.ownerBody.radius,
    });
    const progressRatio = readStateNumber(entity, "assignment_progress_ratio");
    const progressMs = readStateNumber(entity, "assignment_progress_ms");
    const orbitTime = ownerKind === "processing" ? progressMs : input.timeMs;
    if (input.body.layer !== "phantom")
        input.commands.enqueue({
            type: RuntimeCommandType.SET_PHYSICS_LAYER,
            payload: { entityId: input.bodyId, layer: "phantom" },
        });
    if (input.body.targetId)
        input.commands.enqueue({
            type: RuntimeCommandType.SET_TARGET,
            payload: { entityId: input.bodyId, targetId: null },
        });
    const orbit = readBodyOrbitOffsets(entity);
    if (!orbit) {
        const seeded = resolveOrbitOffsets({
            ownerId: input.owner.id,
            ownerKind,
            ownerX: input.ownerBody.x,
            ownerY: input.ownerBody.y,
            ownerRadius: input.ownerBody.radius,
            ownerBarOutsetPx,
            assignedIds: readAssignedIds(input.owner as any),
            bodyId: input.bodyId,
            bodyX: input.body.x,
            bodyY: input.body.y,
            bodyRadius: input.body.radius,
            timeMs: orbitTime,
            progressRatio,
        });
        enqueueOrbitOffsets(
            input.commands,
            input.bodyId,
            seeded.phaseOffset,
            seeded.radiusOffset,
        );
        return;
    }
    const radiusOffset = settleOrbitRadiusOffset({
        ownerId: input.owner.id,
        ownerKind,
        bodyId: input.bodyId,
        radiusOffset: orbit.radiusOffset,
    });
    if (radiusOffset !== orbit.radiusOffset)
        input.commands.enqueue({
            type: RuntimeCommandType.UPDATE_STATE,
            payload: {
                entityId: input.bodyId,
                key: "assignment_orbit_radius_offset",
                value: radiusOffset,
                visible: false,
            },
        });
    const next = resolveOrbitPosition({
        ownerId: input.owner.id,
        ownerKind,
        ownerX: input.ownerBody.x,
        ownerY: input.ownerBody.y,
        ownerRadius: input.ownerBody.radius,
        ownerBarOutsetPx,
        assignedIds: readAssignedIds(input.owner as any),
        bodyId: input.bodyId,
        bodyRadius: input.body.radius,
        timeMs: orbitTime,
        progressRatio,
        phaseOffset: orbit.phaseOffset,
        radiusOffset,
    });
    if (
        samePosition(input.body.x, next.x) &&
        samePosition(input.body.y, next.y)
    )
        return;
    input.commands.enqueue({
        type: RuntimeCommandType.POSITION_ENTITY,
        payload: { id: input.bodyId, x: next.x, y: next.y },
    });
};
