import { RuntimeCommandType } from "../../../engine/runtime/types";
import type {
    CommandBuffer,
    RuntimeCommand,
    RuntimeEntity,
} from "../../../engine/runtime/types";

export const enqueueCaveCounterAdjust = (
    commands: CommandBuffer<RuntimeCommand>,
    key: string,
    delta = 1,
): void => {
    commands.enqueue({
        type: RuntimeCommandType.ADJUST_STATE,
        payload: { entityId: "sys_world", key, delta },
    });
};

export const incrementCaveCounter = (
    world: RuntimeEntity | undefined,
    key: string,
    delta = 1,
): void => {
    const entry = (world?.state as Record<string, any> | undefined)?.[key];
    if (!entry || typeof entry.value !== "number") return;
    entry.value += delta;
};
