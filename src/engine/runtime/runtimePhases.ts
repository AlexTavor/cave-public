import { Snapshot } from "./Snapshot";
import type { RuntimeCommand, RuntimeState } from "./types";
import { MAX_COMMANDS_PER_TICK } from "./runtimeConstants";
import type { PhaseContext } from "./runtimePhaseTypes";
import { handleArrivals } from "./runtimeArrivalHandlers";
import { enqueueCollectedCommands } from "./runtimeCollectCommands";
import { recordSnapshotAllocation } from "./debug/runtimeAllocationStats";

export { systemPhase } from "./runtimeSystemPhase";

export const applyPhase = (
    context: PhaseContext,
    dt: number,
): RuntimeCommand[] => {
    const applied = context.commandsManager.process(context.commandContext);

    if (dt > 0) {
        const arrivals = context.impulseEngine.tick(dt / 1000);
        handleArrivals(arrivals, context.world, context.commands);
        if (arrivals.length > 0 && context.commands.size() > 0) {
            applied.push(
                ...context.commandsManager.process(context.commandContext),
            );
        }
    }

    return applied;
};

export const snapshotPhase = (context: PhaseContext): Snapshot => {
    recordSnapshotAllocation("tick-phase");
    return new Snapshot(
        context.getSortedEntities(),
        context.impulseEngine,
        context.blueprints,
    );
};

export const refreshSnapshotPhase = (
    context: PhaseContext,
    snapshot: Snapshot,
): Snapshot => {
    recordSnapshotAllocation("tick-phase");
    return snapshot.reset(
        context.getSortedEntities(),
        context.impulseEngine,
        context.blueprints,
    );
};

export const collectPhase = (
    context: PhaseContext,
    commands: RuntimeCommand[],
    snapshot: Snapshot,
): void => {
    if (commands.length > MAX_COMMANDS_PER_TICK) {
        context.state.status = "fatal";
        throw new Error(
            `Command budget exceeded: ${commands.length} > ${MAX_COMMANDS_PER_TICK}.`,
        );
    }
    enqueueCollectedCommands(context, commands, snapshot);
};

export const advancePhase = (state: RuntimeState): void => {
    state.tick += 1;
    state.status = "running";
};

