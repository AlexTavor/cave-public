import { useEffect, useState } from "react";
import type { RuntimeInvalidationReader } from "../../../../engine/runtime/runtimeInvalidationTypes";

type RuntimeLike = { getInvalidation?: () => RuntimeInvalidationReader };
type Box<T> = { current: T };

export const useEntityLinkInvalidation = (
    runtime: RuntimeLike | null,
    active: boolean,
    entityCountsRef: Box<Map<string, number>>,
    dirtyEntityIdsRef: Box<Set<string>>,
    fullRefreshRef: Box<boolean>,
) => {
    const [lastRuntimeRef] = useState(() => ({ current: runtime }));
    const [revisionRef] = useState(() => ({
        current: { entityListRevision: 0, mutationRevision: 0 },
    }));

    useEffect(() => {
        const invalidation = runtime?.getInvalidation?.();
        const entityListRevision = invalidation?.getEntityListRevision() ?? 0;
        const mutationRevision = invalidation?.getMutationRevision() ?? 0;
        if (!runtime || !active || !invalidation) {
            lastRuntimeRef.current = runtime;
            revisionRef.current = { entityListRevision, mutationRevision };
            return undefined;
        }
        if (lastRuntimeRef.current !== runtime) fullRefreshRef.current = true;
        lastRuntimeRef.current = runtime;
        revisionRef.current = { entityListRevision, mutationRevision };
        return invalidation.subscribe(["entity-list", "mutation"], () => {
            const nextEntityList = invalidation.getEntityListRevision();
            const nextMutation = invalidation.getMutationRevision();
            if (revisionRef.current.entityListRevision !== nextEntityList) {
                fullRefreshRef.current = true;
            } else if (revisionRef.current.mutationRevision !== nextMutation) {
                invalidation.getLastChangedEntityIds().forEach((entityId) => {
                    if (entityCountsRef.current.has(entityId))
                        dirtyEntityIdsRef.current.add(entityId);
                });
            }
            revisionRef.current = {
                entityListRevision: nextEntityList,
                mutationRevision: nextMutation,
            };
        });
    }, [active, dirtyEntityIdsRef, entityCountsRef, fullRefreshRef, runtime]);
};
