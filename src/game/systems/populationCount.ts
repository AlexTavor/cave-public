import type { Snapshot } from "../../engine/runtime/Snapshot";

const isPopulationBody = (entity: Readonly<Record<string, unknown>>) => {
    if (!entity.body) return false;
    const tags = Array.isArray(entity.tags) ? entity.tags : [];
    return !tags.includes("aggregate");
};

export const countPopulationBodies = (snapshot: Snapshot): number =>
    snapshot
        .getEntities()
        .filter((entity) =>
            isPopulationBody(entity as Readonly<Record<string, unknown>>),
        ).length;
