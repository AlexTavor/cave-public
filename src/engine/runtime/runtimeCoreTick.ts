import type { ModuleCartridge } from "../../data/schemas/module";
import type { PhaseContext } from "./runtimePhaseTypes";
import { buildRuntimePhaseContext } from "./runtimePhaseContextBuilder";
import { runRuntimeTick } from "./runtimeTick";
import { buildRuntimeSnapshot } from "./runtimeCoreHelpers";
import type { CommandsManager } from "./CommandsManager";
import type { CommandHandlerContext } from "./handlers/types";
import type { ImpulseEngine } from "../physics/impulse/ImpulseEngine";
import type { Snapshot } from "./Snapshot";
import type { RuntimeState } from "./types";
import type { RuntimeEntityStore } from "./RuntimeEntityStore";
import type { RuntimeSystemsRegistry } from "./RuntimeSystemsRegistry";

export const tickRuntimeCore = (params: {
    accumulator: number;
    activeSnapshotBuffer: number;
    cartridge: ModuleCartridge;
    commandsManager: CommandsManager;
    context: CommandHandlerContext;
    entityStore: RuntimeEntityStore;
    impulseEngine: ImpulseEngine;
    previousSnapshot: Snapshot | null;
    snapshotBuffers: [Snapshot | null, Snapshot | null];
    state: RuntimeState;
    systemPhaseBuffers: ReturnType<
        typeof import("./runtimeSystemPhaseBuffers").createRuntimeSystemPhaseBuffers
    >;
    systemsRegistry: RuntimeSystemsRegistry;
    invalidationSummarySink?: (
        commands: import("./types").RuntimeCommand[],
    ) => void;
}) => {
    let previousSnapshot = params.previousSnapshot;
    let activeSnapshotBuffer = params.activeSnapshotBuffer;
    const accumulator = runRuntimeTick({
        accumulatedTime: params.accumulator,
        state: params.state,
        createPhaseContext: () =>
            buildRuntimePhaseContext(
                params.entityStore,
                params.commandsManager,
                params.impulseEngine,
                params.context,
                params.state,
                params.cartridge.blueprints,
                params.systemsRegistry,
            ),
        sink: {
            setAutomationSnapshot: (snapshot) =>
                params.systemsRegistry.setAutomationSnapshot(snapshot),
            setPreviousSnapshot: (snapshot) => {
                previousSnapshot = snapshot;
            },
        },
        previousSnapshot,
        buildSnapshot: (context: PhaseContext) => {
            const next = buildRuntimeSnapshot(
                context,
                activeSnapshotBuffer,
                params.snapshotBuffers,
            );
            activeSnapshotBuffer = next.nextIndex;
            return next.snapshot;
        },
        systemPhaseBuffers: params.systemPhaseBuffers,
        onAppliedCommands: params.invalidationSummarySink,
    });

    return { accumulator, activeSnapshotBuffer, previousSnapshot };
};
