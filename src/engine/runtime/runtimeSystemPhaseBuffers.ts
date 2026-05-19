import { createSystemBuffer } from "./runtimeSystemBatch";
import type { CommandBuffer, RuntimeCommand } from "./types";

export interface RuntimeSystemPhaseBuffers {
    emittedCommands: RuntimeCommand[];
    reusableBuffer: CommandBuffer<RuntimeCommand>;
}

export const createRuntimeSystemPhaseBuffers =
    (): RuntimeSystemPhaseBuffers => ({
        emittedCommands: [],
        reusableBuffer: createSystemBuffer(),
    });
