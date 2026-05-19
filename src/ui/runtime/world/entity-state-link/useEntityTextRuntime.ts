import { useCallback, useEffect, useRef, useState } from "react";
import type { EntityTextBinding } from "./types";
import {
    syncEntityTextBindings,
    syncSingleEntityTextBinding,
    TEXT_SYNC_INTERVAL_MS,
} from "./entityStateLinkTextRuntime";
import {
    createInternalTextBinding,
    type InternalTextBinding,
} from "./entityStateLinkTextBinding";
import { useEntityLinkInvalidation } from "./useEntityLinkInvalidation";

const updateEntityCount = (
    counts: Map<string, number>,
    entityId: string,
    delta: number,
) => {
    const next = (counts.get(entityId) ?? 0) + delta;
    if (next <= 0) counts.delete(entityId);
    else counts.set(entityId, next);
    return next;
};

export const useEntityTextRuntime = (runtime: any) => {
    const [version, setVersion] = useState(0);
    const registryRef = useRef(new Map<string, InternalTextBinding>());
    const entityIndexRef = useRef(new Map<string, any>());
    const entityCountsRef = useRef(new Map<string, number>());
    const dirtyEntityIdsRef = useRef(new Set<string>());
    const fullRefreshRef = useRef(false);
    useEntityLinkInvalidation(
        runtime,
        registryRef.current.size > 0,
        entityCountsRef,
        dirtyEntityIdsRef,
        fullRefreshRef,
    );

    const registerText = useCallback(
        (id: string, binding: EntityTextBinding, element: HTMLElement) => {
            const previous = registryRef.current.get(id);
            const wasEmpty = registryRef.current.size === 0;
            if (previous)
                updateEntityCount(
                    entityCountsRef.current,
                    previous.entityId,
                    -1,
                );
            registryRef.current.set(
                id,
                createInternalTextBinding(binding, element),
            );
            updateEntityCount(entityCountsRef.current, binding.entityId, 1);
            if (wasEmpty) setVersion((value) => value + 1);
            const current = registryRef.current.get(id);
            if (runtime && current)
                syncSingleEntityTextBinding(
                    runtime,
                    current,
                    entityIndexRef.current,
                );
        },
        [runtime],
    );
    const unregisterText = useCallback((id: string) => {
        const previous = registryRef.current.get(id);
        if (!previous) return;
        registryRef.current.delete(id);
        if (
            updateEntityCount(
                entityCountsRef.current,
                previous.entityId,
                -1,
            ) === 0
        )
            dirtyEntityIdsRef.current.delete(previous.entityId);
        if (registryRef.current.size === 0) setVersion((value) => value + 1);
    }, []);

    useEffect(() => {
        if (!runtime || registryRef.current.size === 0) return undefined;
        const timer = globalThis.setInterval(() => {
            if (!fullRefreshRef.current && dirtyEntityIdsRef.current.size === 0)
                return;
            syncEntityTextBindings(
                runtime,
                registryRef.current,
                entityIndexRef.current,
                dirtyEntityIdsRef.current,
                fullRefreshRef.current,
            );
            fullRefreshRef.current = false;
            dirtyEntityIdsRef.current.clear();
        }, TEXT_SYNC_INTERVAL_MS);
        return () => globalThis.clearInterval(timer);
    }, [runtime, version]);

    return { registerText, unregisterText };
};
