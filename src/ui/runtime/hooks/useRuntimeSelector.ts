import { useRef } from "react";
import type { HydrationDependencyPlan } from "../world/hydration/hydrationTypes";
import { useRuntimeRevisionToken } from "./useRuntimeRevisionToken";

type RuntimeWithInvalidation = Parameters<typeof useRuntimeRevisionToken>[0];

export const useRuntimeSelector = <TRuntime extends RuntimeWithInvalidation, T>(
    runtime: TRuntime | null,
    plan: HydrationDependencyPlan,
    selector: (runtime: TRuntime | null) => T,
    isEqual: (left: T, right: T) => boolean = Object.is,
): T => {
    const token = useRuntimeRevisionToken(runtime, plan);
    const cacheRef = useRef<{
        runtime: TRuntime | null;
        token: string;
        value: T;
    } | null>(null);
    const cached = cacheRef.current;
    if (cached?.runtime !== runtime || cached?.token !== token) {
        const nextValue = selector(runtime);
        cacheRef.current =
            cached?.runtime === runtime && isEqual(cached.value, nextValue)
                ? { runtime, token, value: cached.value }
                : { runtime, token, value: nextValue };
    }
    return cacheRef.current?.value ?? selector(runtime);
};
