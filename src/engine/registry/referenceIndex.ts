import type { ModuleCartridge } from "../../data/schemas/module";
import type {
    BlueprintId,
    BrokenReference,
    IncomingReference,
    ReferenceIndex,
} from "./types";
import { buildBlueprintHeaders } from "./referenceIndex.headers";
import { walkReferences } from "./referenceIndex.walk";

export { buildBlueprintHeaders } from "./referenceIndex.headers";

export function buildReferenceIndex(
    moduleData: ModuleCartridge,
): ReferenceIndex {
    const headers = buildBlueprintHeaders(moduleData);
    const optionIds = Object.keys(moduleData.draftOptions ?? {});
    const existingIds = new Set([...Object.keys(headers), ...optionIds]);

    const incomingByTarget: Record<BlueprintId, IncomingReference[]> = {};
    const broken: BrokenReference[] = [];

    const blueprints = moduleData.blueprints ?? {};
    const draftOptions = moduleData.draftOptions ?? {};
    const draftPools = moduleData.draftPools ?? {};

    for (const [fromId, bp] of Object.entries(blueprints)) {
        const fromLabel = headers[fromId]?.label ?? fromId;
        walkReferences({
            existingIds,
            incomingByTarget,
            broken,
            fromId,
            fromLabel,
            node: bp,
            path: `blueprints.${fromId}`,
        });
    }

    for (const [optionId, option] of Object.entries(draftOptions)) {
        const fromLabel = option.title || optionId;
        walkReferences({
            existingIds,
            incomingByTarget,
            broken,
            fromId: optionId,
            fromLabel,
            node: option.payload ?? [],
            path: `draftOptions.${optionId}.payload`,
        });
    }

    for (const [poolId, pool] of Object.entries(draftPools)) {
        walkReferences({
            existingIds,
            incomingByTarget,
            broken,
            fromId: poolId,
            fromLabel: poolId,
            node: pool,
            path: `draftPools.${poolId}`,
        });
    }

    const filteredBroken = broken.filter((b) => !existingIds.has(b.missingId));

    return {
        incomingByTarget,
        broken: filteredBroken,
    };
}
