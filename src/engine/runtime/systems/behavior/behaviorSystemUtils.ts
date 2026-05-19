import type { Snapshot } from "../../Snapshot";
import type { RuntimeEntity } from "../../types";

export const normalizeTruthiness = (value: unknown): boolean => {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value > 0;
    return Boolean(value);
};

export const updateGlobalsBuffer = (
    globalsBuffer: Record<string, number>,
    snapshot: Snapshot,
    dt: number,
): void => {
    for (const key in globalsBuffer) {
        delete globalsBuffer[key];
    }

    const world = snapshot.getEntity("sys_world") as
        | { state?: Record<string, { value?: number }> }
        | undefined;

    const state = world?.state ?? {};
    for (const [key, entry] of Object.entries(state)) {
        if (typeof entry?.value === "number") {
            globalsBuffer[key] = entry.value;
        }
    }

    globalsBuffer.dt = dt;
    globalsBuffer.dt_s = dt / 1000;
};

export const buildAssignmentMap = (
    snapshot: Snapshot,
): Record<string, string> => {
    const assignmentMap: Record<string, string> = {};

    for (const entity of snapshot.getEntities()) {
        const assignment = (
            entity as RuntimeEntity & {
                assignment?: { assignedIds?: string[] };
            }
        ).assignment;
        const assignedIds = assignment?.assignedIds ?? [];
        for (const childId of assignedIds) {
            if (childId) assignmentMap[childId] = entity.id ?? "";
        }
    }

    return assignmentMap;
};

