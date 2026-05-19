import type { CommandBuffer, RuntimeCommand, RuntimeState } from "./types";
import { MAX_COMMANDS_PER_TICK } from "./runtimeConstants";
import { recordEmittedBatch } from "./debug/runtimeActivityStats";

const analyzeBatch = (batch: RuntimeCommand[]): Record<string, number> =>
    batch.reduce<Record<string, number>>((acc, command) => {
        const key = command.type;
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
    }, {});

export const mergeSystemBatch = (
    systemName: string,
    batch: RuntimeCommand[],
    aggregate: RuntimeCommand[],
    state: RuntimeState,
): void => {
    const projectedTotal = aggregate.length + batch.length;
    if (projectedTotal > MAX_COMMANDS_PER_TICK) {
        const analysis = analyzeBatch(batch);
        batch.length = 0;
        state.status = "fatal";
        throw new Error(
            `Command Overflow in ${systemName}: ${JSON.stringify(analysis)}`,
        );
    }

    if (batch.length > 0) {
        recordEmittedBatch(
            systemName,
            batch.map((command) => command.type),
        );
        aggregate.push(...batch);
        batch.length = 0;
    }
};

export const createSystemBuffer = (): CommandBuffer<RuntimeCommand> => {
    let buffer: RuntimeCommand[] = [];
    return {
        enqueue: (command) => buffer.push(command),
        drain: () => {
            const drained = buffer;
            buffer = [];
            return drained;
        },
        clear: () => {
            buffer.length = 0;
        },
        size: () => buffer.length,
    };
};

