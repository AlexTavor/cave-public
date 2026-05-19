import type { RuntimeEntity } from "../../engine/runtime/types";
import { incrementCaveCounter } from "../systems/cave/caveEventCounters";

const clearAssignment = (station: RuntimeEntity): void => {
    const assignment = (station as { assignment?: any }).assignment;
    if (!assignment || typeof assignment !== "object") return;
    (station as { assignment: Record<string, unknown> }).assignment = {
        ...assignment,
        assignedIds: [],
    };
};

export const finalizeAssignmentStation = (station: RuntimeEntity): void => {
    clearAssignment(station);
    pulseAssignmentCompletion(station);
    markAssignmentNodeDepleted(station);
};

export const pulseAssignmentCompletion = (node: RuntimeEntity): void => {
    const state = ((node as { state?: Record<string, any> }).state ??= {});
    state.assignment_complete_pulse = {
        ...(state.assignment_complete_pulse ?? { visible: false }),
        value: 1,
    };
};

export const markAssignmentNodeDepleted = (node: RuntimeEntity): void => {
    const state = ((node as { state?: Record<string, any> }).state ??= {});
    if (state.is_depleted)
        state.is_depleted = { ...state.is_depleted, value: 1 };
};

export const incrementDestroyedCaveCounters = (
    world: RuntimeEntity,
    station: RuntimeEntity,
    killedCount: number,
) => {
    if (killedCount <= 0) return;
    incrementCaveCounter(world, "cave_evt_absorption_complete", killedCount);
    if (Array.isArray(station.tags) && station.tags.includes("cave_butcher")) {
        incrementCaveCounter(world, "cave_evt_butchered", killedCount);
    }
};
