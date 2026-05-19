import { useEffect, useMemo, useRef, useState } from "react";
import type { RuntimeInvalidationReader } from "../../../engine/runtime/runtimeInvalidationTypes";
import type { HydrationDependencyPlan } from "../world/hydration/hydrationTypes";
import {
    normalizeRuntimeEntityIds,
    resolveRuntimeInvalidationScopes,
} from "./runtimeInvalidationScopes";

type RuntimeWithInvalidation = {
    getInvalidation?: () => RuntimeInvalidationReader;
};

const structuralDepsEqual = (
    left: readonly unknown[],
    right: readonly unknown[],
) =>
    left.length === right.length &&
    left.every((value, index) => Object.is(value, right[index]));

export const useImperativeRuntimeDerivedValue = <
    TRuntime extends RuntimeWithInvalidation | null,
    TValue,
>(
    runtime: TRuntime,
    plan: HydrationDependencyPlan,
    structuralDeps: readonly unknown[],
    resolve: (runtime: TRuntime) => TValue,
    isEqual: (left: TValue, right: TValue) => boolean,
): TValue => {
    const entityIds = useMemo(
        () => normalizeRuntimeEntityIds(plan.entityIds),
        [plan.entityIds],
    );
    const scopes = useMemo(
        () => resolveRuntimeInvalidationScopes(entityIds, plan),
        [
            entityIds,
            plan.includeBlueprintRevision,
            plan.includeEntityListRevision,
            plan.includeFrameRevision,
            plan.includeMutationRevision,
        ],
    );
    const valueRef = useRef<TValue | null>(null);
    const initializedRef = useRef(false);
    const runtimeRef = useRef(runtime);
    const depsRef = useRef(structuralDeps);
    const resolveRef = useRef(resolve);
    const equalRef = useRef(isEqual);
    const [, rerender] = useState(0);

    resolveRef.current = resolve;
    equalRef.current = isEqual;
    if (!initializedRef.current) {
        valueRef.current = resolve(runtime);
        initializedRef.current = true;
        runtimeRef.current = runtime;
        depsRef.current = structuralDeps;
    } else if (
        runtimeRef.current !== runtime ||
        !structuralDepsEqual(depsRef.current, structuralDeps)
    ) {
        const nextValue = resolve(runtime);
        if (!equalRef.current(valueRef.current as TValue, nextValue))
            valueRef.current = nextValue;
        runtimeRef.current = runtime;
        depsRef.current = structuralDeps;
    }

    useEffect(() => {
        const invalidation = runtime?.getInvalidation?.();
        if (!invalidation) return undefined;
        return invalidation.subscribe(scopes, () => {
            const next = resolveRef.current(runtime);
            if (equalRef.current(valueRef.current as TValue, next)) return;
            valueRef.current = next;
            rerender((version) => version + 1);
        });
    }, [runtime, scopes]);

    return valueRef.current as TValue;
};
