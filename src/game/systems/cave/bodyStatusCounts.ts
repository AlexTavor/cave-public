import type { RuntimeEntity } from "../../../engine/runtime/types";
import { readTraitIds } from "./caveMindReadUtils";

export const resolveBodyStatusCounts = (
    entities: readonly RuntimeEntity[],
): { starvingBodies: number; coldBodies: number } => {
    let starvingBodies = 0;
    let coldBodies = 0;
    for (const entity of entities) {
        if (!(entity as { body?: unknown }).body) continue;
        const traitIds = readTraitIds(entity);
        if (traitIds.includes("starving")) starvingBodies += 1;
        if (traitIds.includes("cold")) coldBodies += 1;
    }
    return { starvingBodies, coldBodies };
};
