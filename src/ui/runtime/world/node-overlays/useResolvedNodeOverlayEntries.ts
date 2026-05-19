import { useRef } from "react";
import type { Runtime } from "../../../../engine/runtime/Runtime";
import { useRuntimeRevisionToken } from "../../hooks/useRuntimeRevisionToken";
import {
    applyNodeOverlayEntryChanges,
    buildNodeOverlayEntryIndex,
    type NodeOverlayEntryIndex,
} from "./nodeOverlayViewportHydration";
import type { ResolvedNodeOverlayEntry } from "./nodeOverlayTypes";

type EntryCache = {
    runtime: Runtime;
    showValues: boolean;
    worldRevision: number;
    entityListRevision: number;
    blueprintRevision: number;
    mutationRevision: number;
    index: NodeOverlayEntryIndex;
};

const EMPTY_NODE_ENTRIES: ResolvedNodeOverlayEntry[] = [];

export const useResolvedNodeOverlayEntries = (
    runtime: Runtime | null,
    enabled: boolean,
    showValues: boolean,
): ResolvedNodeOverlayEntry[] => {
    useRuntimeRevisionToken(runtime, {
        entityIds: [],
        includeEntityListRevision: true,
        includeBlueprintRevision: true,
        includeMutationRevision: true,
    });
    const cacheRef = useRef<EntryCache | null>(null);
    if (!enabled || !runtime) {
        cacheRef.current = null;
        return EMPTY_NODE_ENTRIES;
    }
    const invalidation = runtime.getInvalidation?.();
    const worldRevision = invalidation?.getWorldRevision() ?? 0;
    const entityListRevision = invalidation?.getEntityListRevision() ?? 0;
    const blueprintRevision = invalidation?.getBlueprintRevision() ?? 0;
    const mutationRevision = invalidation?.getMutationRevision() ?? 0;
    const cached = cacheRef.current;
    if (
        cached?.runtime !== runtime ||
        cached.showValues !== showValues ||
        cached.worldRevision !== worldRevision ||
        cached.entityListRevision !== entityListRevision ||
        cached.blueprintRevision !== blueprintRevision
    ) {
        const index = buildNodeOverlayEntryIndex(runtime, showValues);
        cacheRef.current = {
            runtime,
            showValues,
            worldRevision,
            entityListRevision,
            blueprintRevision,
            mutationRevision,
            index,
        };
        return index.entries;
    }
    if (cached.mutationRevision !== mutationRevision) {
        applyNodeOverlayEntryChanges(
            cached.index,
            runtime,
            invalidation?.getLastChangedEntityIds() ?? [],
            showValues,
        );
        cached.mutationRevision = mutationRevision;
    }
    return cached.index.entries;
};
