import type { Snapshot } from "../../../engine/runtime/Snapshot";
import {
    readAssignedIds,
    readStateNumber,
} from "../../assignment/bodyAssignment";
import { resolveBestDropBodyId } from "./pointerDropChoice";
import { readKnownPickupHabiti } from "./pointerKnownHabiti";
import {
    collectPointerTargets,
    resolvePointerPreviewState,
} from "./pointerState";
import { resolveNearestTarget } from "./pointerResolvers";

export const resolvePointerInteractionState = (
    snapshot: Snapshot,
    pointer: unknown,
    pointerBody: { x: number; y: number },
) => {
    const carriedBodies = readAssignedIds(pointer as any)
        .map((id) => snapshot.getEntity(id))
        .filter(Boolean);
    const target = resolveNearestTarget({
        targets: collectPointerTargets(snapshot),
        pointerX: pointerBody.x,
        pointerY: pointerBody.y,
        radius:
            readStateNumber(pointer as any, "pointer_connection_radius") || 180,
    });
    const targetEntity = target ? snapshot.getEntity(target.id) : undefined;
    const nextBodyId = resolveBestDropBodyId({
        target: (targetEntity as any) ?? null,
        carriedBodies: carriedBodies as any,
        knownHabiti: readKnownPickupHabiti(
            snapshot.getEntity("sys_world") as any,
        ),
    });
    return {
        carriedBodies,
        target,
        nextBodyId,
        preview: resolvePointerPreviewState(
            (nextBodyId ? snapshot.getEntity(nextBodyId) : undefined) as any,
            targetEntity as any,
        ),
    };
};
