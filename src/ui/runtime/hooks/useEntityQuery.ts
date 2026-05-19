import { useEffect, useMemo, useState, useRef } from "react";
import type { World } from "miniplex";
import { useRuntimeStore } from "../state/useRuntimeStore";
import { useRuntimeRevisionToken } from "./useRuntimeRevisionToken";

type Unsubscribe = (() => void) | { unsubscribe: () => void } | void;

type AnyRecord = object;

const cloneEntity = <T extends AnyRecord>(entity: T): T => {
    if (Array.isArray(entity)) {
        return [...entity] as unknown as T;
    }
    return { ...(entity as object) } as T;
};

const cleanupSubscription = (subscription: Unsubscribe): void => {
    if (!subscription) return;
    if (typeof subscription === "function") {
        subscription();
        return;
    }
    if ("unsubscribe" in subscription) {
        subscription.unsubscribe();
    }
};

const sameEntities = <T extends AnyRecord>(
    left: ReadonlyArray<T>,
    right: ReadonlyArray<T>,
) =>
    left.length === right.length &&
    left.every((entity, index) => {
        const other = right[index];
        const keys = Object.keys(entity as object);
        return (
            keys.length === Object.keys(other as object).length &&
            keys.every(
                (key) =>
                    (entity as Record<string, unknown>)[key] ===
                    (other as Record<string, unknown>)[key],
            )
        );
    });

export const useEntityQuery = <T extends AnyRecord>(
    world: World<T>,
    ...components: (keyof T)[]
): ReadonlyArray<T> => {
    const runtime = useRuntimeStore((s) => s.runtime);
    const runtimeToken = useRuntimeRevisionToken(runtime, {
        entityIds: [],
        includeEntityListRevision: true,
        includeBlueprintRevision: false,
        includeMutationRevision: true,
        includeFrameRevision: false,
    });
    const query = useMemo(
        () => world.with(...components),
        [world, ...components],
    );

    const resolveEntities = () => {
        const sourceEntities = (world as { entities?: T[] }).entities;
        let source: T[] = [];
        if (Array.isArray(sourceEntities)) {
            source = sourceEntities;
        } else if (Array.isArray(query.entities)) {
            source = query.entities;
        }

        return source
            .filter((entity) =>
                components.every((component) => {
                    const record = entity as Record<string, unknown>;
                    return record[component as string] !== undefined;
                }),
            )
            .map((entity) => cloneEntity(entity));
    };

    const [entities, setEntities] = useState<ReadonlyArray<T>>(() =>
        resolveEntities(),
    );
    const resolveRef = useRef(resolveEntities);
    resolveRef.current = resolveEntities;

    useEffect(() => {
        const sync = () =>
            setEntities((prev) => {
                const next = resolveRef.current();
                return sameEntities(prev, next) ? prev : next;
            });
        const scheduleSync = () => Promise.resolve().then(sync);
        const onAdd = query.onEntityAdded.subscribe(scheduleSync);
        const onRemove = query.onEntityRemoved.subscribe(scheduleSync);
        sync();

        return () => {
            cleanupSubscription(onAdd);
            cleanupSubscription(onRemove);
        };
    }, [query]);

    useEffect(() => {
        setEntities((prev) => {
            const next = resolveRef.current();
            return sameEntities(prev, next) ? prev : next;
        });
    }, [runtimeToken]);

    return entities;
};

