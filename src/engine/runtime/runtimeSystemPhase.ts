import type { Snapshot } from "./Snapshot";
import type { RuntimeCommand } from "./types";
import type { PhaseContext } from "./runtimePhaseTypes";
import { createSystemBuffer } from "./runtimeSystemBatch";
import type { AutomationSnapshot } from "./systems/AutomationSystem";
import { isBlockingOverlayActive } from "./runtimePauseState";
import type { RuntimeSystemPhaseBuffers } from "./runtimeSystemPhaseBuffers";
import {
    runRegisteredSystems,
    runTickableReturning,
    runTickableVoid,
} from "./runtimeSystemRunner";

export interface SystemPhaseResult {
    emittedCommands: RuntimeCommand[];
    automationSnapshot: AutomationSnapshot;
}

export const systemPhase = (
    snapshot: Snapshot,
    context: PhaseContext,
    dt: number,
    buffers?: RuntimeSystemPhaseBuffers,
): SystemPhaseResult => {
    const emittedCommands = buffers?.emittedCommands ?? [];
    const reusableBuffer = buffers?.reusableBuffer ?? createSystemBuffer();
    emittedCommands.length = 0;
    reusableBuffer.clear();
    let automationSnapshot: AutomationSnapshot = {
        activeCount: 0,
        nextEventMs: null,
        nextCommand: null,
    };

    if (dt <= 0) return { emittedCommands, automationSnapshot };

    const pauseSystems = isBlockingOverlayActive(snapshot);
    if (!pauseSystems) {
        for (const system of context.systems.preBehaviorSystems) {
            runTickableVoid(
                system,
                snapshot,
                reusableBuffer,
                dt,
                emittedCommands,
                context.state,
            );
        }

        runTickableVoid(
            context.systems.behaviorSystem,
            snapshot,
            reusableBuffer,
            dt,
            emittedCommands,
            context.state,
            "BehaviorSystem",
        );

        automationSnapshot = runTickableReturning(
            context.systems.automationSystem,
            snapshot,
            reusableBuffer,
            dt,
            emittedCommands,
            context.state,
            "AutomationSystem",
        );
    }

    runRegisteredSystems(
        context.systems.registeredSystems,
        snapshot,
        reusableBuffer,
        dt,
        emittedCommands,
        context.state,
        pauseSystems,
    );

    return { emittedCommands, automationSnapshot };
};

