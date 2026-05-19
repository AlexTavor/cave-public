import {
    advancePhase,
    applyPhase,
    collectPhase,
    snapshotPhase,
    systemPhase,
} from "./runtimePhases";
import type { PhaseContext } from "./runtimePhaseTypes";
import type { AutomationSnapshot } from "./systems/AutomationSystem";
import type { RuntimeCommand, RuntimeState } from "./types";
import type { Snapshot } from "./Snapshot";
import type { RuntimeSystemPhaseBuffers } from "./runtimeSystemPhaseBuffers";
import { LOGIC_STEP_MS, MAX_RUNTIME_SUBSTEPS } from "./runtimeConstants";
import {
    recordAppliedCommands,
    recordEmittedCommands,
} from "./debug/runtimeActivityStats";

export interface TickSnapshotSink {
    setAutomationSnapshot: (snapshot: AutomationSnapshot) => void;
    setPreviousSnapshot: (snapshot: Snapshot) => void;
}

export type TickSnapshotBuilder = (context: PhaseContext) => Snapshot;
export type TickAppliedCommandSink = (commands: RuntimeCommand[]) => void;

export interface RuntimeTickOptions {
    accumulatedTime: number;
    state: RuntimeState;
    createPhaseContext: () => PhaseContext;
    sink: TickSnapshotSink;
    previousSnapshot?: Snapshot | null;
    buildSnapshot?: TickSnapshotBuilder;
    systemPhaseBuffers?: RuntimeSystemPhaseBuffers;
    onAppliedCommands?: TickAppliedCommandSink;
}

export const runRuntimeTick = ({
    accumulatedTime,
    state,
    createPhaseContext,
    sink,
    previousSnapshot = null,
    buildSnapshot,
    systemPhaseBuffers,
    onAppliedCommands,
}: RuntimeTickOptions): number => {
    if (state.status === "paused") return 0;

    let remainingTime = accumulatedTime;
    let steps = 0;
    let loopPrevSnapshot = previousSnapshot;

    while (remainingTime >= LOGIC_STEP_MS && steps < MAX_RUNTIME_SUBSTEPS) {
        remainingTime -= LOGIC_STEP_MS;
        steps += 1;

        const phaseContext = createPhaseContext();
        const applied = applyPhase(phaseContext, LOGIC_STEP_MS);
        onAppliedCommands?.(applied);
        recordAppliedCommands(applied.length);
        const snapshot = buildSnapshot
            ? buildSnapshot(phaseContext)
            : snapshotPhase(phaseContext);

        if (
            loopPrevSnapshot &&
            applied.length > 0 &&
            phaseContext.commandContext.telemetry.onCommandsApplied
        ) {
            phaseContext.commandContext.telemetry.onCommandsApplied(
                applied,
                loopPrevSnapshot,
                snapshot,
            );
        }

        const { emittedCommands, automationSnapshot } = systemPhase(
            snapshot,
            phaseContext,
            LOGIC_STEP_MS,
            systemPhaseBuffers,
        );
        recordEmittedCommands(emittedCommands.length);

        sink.setAutomationSnapshot(automationSnapshot);
        collectPhase(phaseContext, emittedCommands, snapshot);
        advancePhase(state);
        loopPrevSnapshot = snapshot;
    }

    if (loopPrevSnapshot && loopPrevSnapshot !== previousSnapshot) {
        sink.setPreviousSnapshot(loopPrevSnapshot);
    }

    if (steps >= MAX_RUNTIME_SUBSTEPS) return 0;
    return remainingTime;
};

