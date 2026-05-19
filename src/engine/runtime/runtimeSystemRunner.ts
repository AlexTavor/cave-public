import type { Snapshot } from "./Snapshot";
import { mergeSystemBatch } from "./runtimeSystemBatch";
import type { Tickable } from "./systems/Tickable";
import type { CommandBuffer, RuntimeCommand, RuntimeState } from "./types";

type PauseAwareTickable = Tickable<void> & { runsWhenPaused?: boolean };

const resolveSystemName = (tickable: object, fallback: string): string => {
    return tickable.constructor?.name || fallback;
};

const mergeBufferedCommands = (
    systemName: string,
    reusableBuffer: CommandBuffer<RuntimeCommand>,
    aggregate: RuntimeCommand[],
    state: RuntimeState,
): void => {
    mergeSystemBatch(systemName, reusableBuffer.drain(), aggregate, state);
};

export const runTickableVoid = (
    tickable: Tickable<void>,
    snapshot: Snapshot,
    reusableBuffer: CommandBuffer<RuntimeCommand>,
    dt: number,
    aggregate: RuntimeCommand[],
    state: RuntimeState,
    fallbackName = "System",
): void => {
    tickable.tick(snapshot, reusableBuffer, dt);
    mergeBufferedCommands(
        resolveSystemName(tickable as object, fallbackName),
        reusableBuffer,
        aggregate,
        state,
    );
};

export const runTickableReturning = <TResult>(
    tickable: Tickable<TResult>,
    snapshot: Snapshot,
    reusableBuffer: CommandBuffer<RuntimeCommand>,
    dt: number,
    aggregate: RuntimeCommand[],
    state: RuntimeState,
    fallbackName = "System",
): TResult => {
    const result = tickable.tick(snapshot, reusableBuffer, dt);
    mergeBufferedCommands(
        resolveSystemName(tickable as object, fallbackName),
        reusableBuffer,
        aggregate,
        state,
    );
    return result;
};

export const runRegisteredSystems = (
    systems: ReadonlyArray<PauseAwareTickable>,
    snapshot: Snapshot,
    reusableBuffer: CommandBuffer<RuntimeCommand>,
    dt: number,
    aggregate: RuntimeCommand[],
    state: RuntimeState,
    pauseSystems: boolean,
): void => {
    for (const system of systems) {
        if (pauseSystems && system.runsWhenPaused !== true) continue;
        runTickableVoid(system, snapshot, reusableBuffer, dt, aggregate, state);
    }
};
