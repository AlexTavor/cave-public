import type { Snapshot } from "../../../engine/runtime/Snapshot";
import type {
    CommandBuffer,
    RuntimeCommand,
    RuntimeEntity,
} from "../../../engine/runtime/types";
import { RuntimeCommandType } from "../../../engine/runtime/types";
import { enqueuePointerState } from "./pointerState";
import {
    resolveEligiblePickupIds,
    resolvePickupCadenceMs,
} from "./pointerResolvers";
import { resolvePickupBodies } from "./pointerPickupBodies";
import { POINTER_PICKUP_LAST_AT_MS } from "../../../utils/pointerTiming";

export const handlePointerPickup = (input: {
    snapshot: Snapshot;
    commands: CommandBuffer<RuntimeCommand>;
    pointer: RuntimeEntity;
    pointerX: number;
    pointerY: number;
    nowMs: number;
    pickupDown: boolean;
    prevPickupDown: boolean;
    pickupHoldMs: number;
    pickupTimerMs: number;
    pickupRadius: number;
}) => {
    enqueuePointerState(input.commands, [
        ["pointer_pickup_timer_ms", input.pickupTimerMs],
    ]);
    if (!input.pickupDown) return;
    if (
        input.prevPickupDown &&
        input.pickupTimerMs < resolvePickupCadenceMs(input.pickupHoldMs)
    )
        return;
    const pickupId = resolveEligiblePickupIds({
        bodies: resolvePickupBodies(input.snapshot),
        pointerX: input.pointerX,
        pointerY: input.pointerY,
        radius: input.pickupRadius,
    })[0];
    if (!pickupId) return;
    input.commands.enqueue({
        type: RuntimeCommandType.ASSIGN_BODIES_BATCH,
        payload: { updates: [{ bodyId: pickupId, ownerId: "sys_pointer" }] },
    });
    enqueuePointerState(input.commands, [
        ["pointer_pickup_timer_ms", 0],
        [POINTER_PICKUP_LAST_AT_MS, input.nowMs],
    ]);
};

export const handlePointerDrop = (input: {
    commands: CommandBuffer<RuntimeCommand>;
    carriedBodies: RuntimeEntity[];
    targetId: string | null;
    targetKind: string;
    nextBodyId: string | null;
    prevDropDown: boolean;
    dropDown: boolean;
    dropHoldMs: number;
    longDropMs: number;
}) => {
    if (
        !input.prevDropDown ||
        input.dropDown ||
        input.carriedBodies.length === 0
    )
        return;
    if (input.dropHoldMs >= input.longDropMs) {
        enqueuePointerState(input.commands, [
            ["pointer_selector_open", true],
            ["pointer_selector_target_id", input.targetId ?? "sys_world"],
            ["pointer_selector_target_kind", input.targetKind],
        ]);
        return;
    }
    if (!input.nextBodyId) return;
    input.commands.enqueue({
        type: RuntimeCommandType.ASSIGN_BODIES_BATCH,
        payload: {
            updates: [
                {
                    bodyId: input.nextBodyId,
                    ownerId: input.targetId ?? "sys_world",
                },
            ],
        },
    });
};
