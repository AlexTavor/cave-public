import type { ModuleCartridge } from "../../data/schemas/module";
import type { CommandHandlerContext } from "./handlers/types";
import type { CommandsManager } from "./CommandsManager";
import type { ImpulseEngine } from "../physics/impulse/ImpulseEngine";
import type { Snapshot } from "./Snapshot";
import type { RuntimeState } from "./types";
import { tickRuntimeCore } from "./runtimeCoreTick";
import { normalizeDt } from "./runtimeTiming";

interface RuntimeCoreTickState {
    timeScale: number;
    totalAccumulatedTime: number;
    accumulator: number;
    activeSnapshotBuffer: number;
    cartridge: ModuleCartridge;
    commandsManager: CommandsManager;
    context: CommandHandlerContext;
    entityStore: object;
    impulseEngine: ImpulseEngine;
    previousSnapshot: Snapshot | null;
    snapshotBuffers: [Snapshot | null, Snapshot | null];
    state: RuntimeState;
    systemPhaseBuffers: object;
    systemsRegistry: object;
    invalidationSummarySink?: (
        commands: import("./types").RuntimeCommand[],
    ) => void;
}

export const advanceRuntimeCoreTick = (
    core: RuntimeCoreTickState,
    dt: number,
): {
    timeStep: number;
    totalAccumulatedTime: number;
    accumulator: number;
    activeSnapshotBuffer: number;
    previousSnapshot: Snapshot | null;
} | null => {
    const safeDt = normalizeDt(dt);
    if (safeDt <= 0) return null;
    const timeStep = safeDt * core.timeScale;
    const totalAccumulatedTime = core.totalAccumulatedTime + timeStep;
    const next = tickRuntimeCore({
        accumulator: core.accumulator + timeStep,
        activeSnapshotBuffer: core.activeSnapshotBuffer,
        cartridge: core.cartridge,
        commandsManager: core.commandsManager,
        context: core.context,
        entityStore: core.entityStore as never,
        impulseEngine: core.impulseEngine,
        previousSnapshot: core.previousSnapshot,
        snapshotBuffers: core.snapshotBuffers,
        state: core.state,
        systemPhaseBuffers: core.systemPhaseBuffers as never,
        systemsRegistry: core.systemsRegistry as never,
        invalidationSummarySink: core.invalidationSummarySink,
    });
    return {
        timeStep,
        totalAccumulatedTime,
        accumulator: next.accumulator,
        activeSnapshotBuffer: next.activeSnapshotBuffer,
        previousSnapshot: next.previousSnapshot,
    };
};
