import type { Runtime } from "../../../../engine/runtime/Runtime";
import { useRuntimeSelector } from "../../hooks/useRuntimeSelector";

export function useEntitySelector<T>(
    runtime: Runtime | null,
    entityId: string | undefined,
    selector: (entity: any) => T,
    isEqual: (a: T | undefined, b: T | undefined) => boolean = (a, b) =>
        a === b,
): T | undefined {
    return useRuntimeSelector(
        runtime,
        {
            entityIds: entityId ? [entityId] : [],
            includeEntityListRevision: false,
            includeBlueprintRevision: false,
        },
        (currentRuntime) => {
            if (!currentRuntime || !entityId) return undefined;
            const entity = currentRuntime.getEntity(entityId);
            return entity ? selector(entity) : undefined;
        },
        (left, right) => isEqual(left, right),
    );
}

