import type { Runtime } from "../../../../../engine/runtime/Runtime";
import type { RuntimeEntity } from "../../../../../engine/runtime/types";
import { useRuntimeSelector } from "../../../hooks/useRuntimeSelector";
import { filterCandidates, sortBodies } from "./absorptionUtils";

const EMPTY_IDS: string[] = [];
const hasBody = (entity: RuntimeEntity) => !!entity.body;
const sameIds = (left: string[], right: string[]) =>
    left.length === right.length &&
    left.every((id, index) => id === right[index]);

const selectCandidateIds = (
    runtime: Runtime | null,
    stationEntityId?: string,
) => {
    if (!runtime) return EMPTY_IDS;
    const stationEntity = stationEntityId
        ? (runtime.getEntity(stationEntityId) ?? undefined)
        : undefined;
    return sortBodies(
        filterCandidates(runtime.getEntities().filter(hasBody), stationEntity),
        "xp",
    ).map((entity) => entity.id ?? "");
};

export const useBodySelectorCandidateIds = (
    runtime: Runtime | null,
    stationEntityId?: string,
) =>
    useRuntimeSelector(
        runtime,
        {
            entityIds: stationEntityId ? [stationEntityId] : [],
            includeEntityListRevision: true,
            includeBlueprintRevision: false,
            includeMutationRevision: true,
        },
        (currentRuntime) => selectCandidateIds(currentRuntime, stationEntityId),
        sameIds,
    );
