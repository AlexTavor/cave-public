import type { Snapshot } from "../../engine/runtime/Snapshot";
import type { System } from "../../engine/runtime/systems/System";
import type { CommandBuffer, RuntimeCommand } from "../../engine/runtime/types";
import { readStateNumber } from "../assignment/bodyAssignment";
import { enqueuePointerState, readPointerBool } from "./pointer/pointerState";
import { resolvePointerInteractionState } from "./pointer/pointerInteractionState";
import { resolvePickupRadius } from "./pointer/pointerResolvers";
import {
    handlePointerDrop,
    handlePointerPickup,
} from "./pointer/pointerSystemActions";
import {
    POINTER_DROP_STARTED_AT_MS,
    POINTER_PICKUP_LAST_AT_MS,
    POINTER_PICKUP_STARTED_AT_MS,
    resolvePointerElapsedMs,
    resolvePointerPickupTimerMs,
} from "./pointer/pointerTiming";

const LONG_DROP_MS = 260;

export class PointerSystem implements System {
    public readonly runsWhenPaused = true;

    public tick(
        snapshot: Snapshot,
        commands: CommandBuffer<RuntimeCommand>,
        _dt: number,
    ): void {
        const pointer = snapshot.getEntity("sys_pointer");
        const pointerBody = snapshot.getPhysicsBody("sys_pointer");
        if (!pointer || !pointerBody) return;
        const nowMs = Date.now();
        const pickupDown = readPointerBool(
            pointer as any,
            "pointer_pickup_down",
        );
        const dropDown = readPointerBool(pointer as any, "pointer_drop_down");
        const prevPickupDown = readPointerBool(
            pointer as any,
            "pointer_prev_pickup_down",
        );
        const prevDropDown = readPointerBool(
            pointer as any,
            "pointer_prev_drop_down",
        );
        const pickupHoldMs = resolvePointerElapsedMs(
            pickupDown,
            readStateNumber(pointer, POINTER_PICKUP_STARTED_AT_MS),
            nowMs,
        );
        const dropHoldMs = resolvePointerElapsedMs(
            dropDown,
            readStateNumber(pointer, POINTER_DROP_STARTED_AT_MS),
            nowMs,
        );
        const pickupTimerMs = resolvePointerPickupTimerMs(
            pickupDown,
            readStateNumber(pointer, POINTER_PICKUP_STARTED_AT_MS),
            readStateNumber(pointer, POINTER_PICKUP_LAST_AT_MS),
            nowMs,
        );
        const pickupRadius = resolvePickupRadius(pickupHoldMs);
        const { carriedBodies, target, nextBodyId, preview } =
            resolvePointerInteractionState(snapshot, pointer, pointerBody);
        enqueuePointerState(commands, [
            ["pointer_pickup_hold_ms", pickupHoldMs],
            ["pointer_drop_hold_ms", dropHoldMs],
            ["pointer_pickup_radius", pickupRadius],
            ["pointer_target_id", target?.id ?? ""],
            ["pointer_target_kind", target?.kind ?? "none"],
            ["pointer_preview_amount", preview.amount],
            ["pointer_preview_body", preview.body],
            ["pointer_preview_mind", preview.mind],
            ["pointer_preview_social", preview.social],
            ["pointer_preview_mode", preview.mode],
            ["pointer_preview_body_id", nextBodyId ?? ""],
        ]);

        handlePointerPickup({
            snapshot,
            commands,
            pointer: pointer as any,
            pointerX: pointerBody.x,
            pointerY: pointerBody.y,
            nowMs,
            pickupDown,
            prevPickupDown,
            pickupHoldMs,
            pickupTimerMs,
            pickupRadius,
        });
        handlePointerDrop({
            commands,
            carriedBodies: carriedBodies as any,
            targetId: target?.id ?? null,
            targetKind: target?.kind ?? "world",
            nextBodyId,
            dropDown,
            prevDropDown,
            dropHoldMs,
            longDropMs: LONG_DROP_MS,
        });
        enqueuePointerState(commands, [
            ["pointer_prev_pickup_down", pickupDown],
            ["pointer_prev_drop_down", dropDown],
        ]);
    }
}
