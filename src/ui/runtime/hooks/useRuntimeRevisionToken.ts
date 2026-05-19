import { useMemo, useSyncExternalStore } from "react";
import type { RuntimeInvalidationReader } from "../../../engine/runtime/runtimeInvalidationTypes";
import type { HydrationDependencyPlan } from "../world/hydration/hydrationTypes";
import {
    normalizeRuntimeEntityIds,
    resolveRuntimeInvalidationScopes,
} from "./runtimeInvalidationScopes";

type RuntimeWithInvalidation = {
    getInvalidation?: () => RuntimeInvalidationReader;
};

const readInvalidation = (runtime: RuntimeWithInvalidation | null) =>
    runtime?.getInvalidation?.() ?? null;

const buildToken = (
    runtime: RuntimeWithInvalidation | null,
    entityIds: string[],
    plan: HydrationDependencyPlan,
): string => {
    if (!runtime) return "";
    const invalidation = readInvalidation(runtime);
    if (!invalidation) return "runtime";
    const parts = [`world:${invalidation.getWorldRevision()}`];
    if (plan.includeFrameRevision)
        parts.push(`frame:${invalidation.getFrameRevision()}`);
    if (plan.includeMutationRevision)
        parts.push(`mutation:${invalidation.getMutationRevision()}`);
    if (plan.includeEntityListRevision)
        parts.push(`list:${invalidation.getEntityListRevision()}`);
    if (plan.includeBlueprintRevision)
        parts.push(`blueprint:${invalidation.getBlueprintRevision()}`);
    entityIds.forEach((id) =>
        parts.push(`${id}:${invalidation.getEntityRevision(id)}`),
    );
    return parts.join("|");
};

export const useRuntimeRevisionToken = (
    runtime: RuntimeWithInvalidation | null,
    plan: HydrationDependencyPlan,
): string => {
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
    return useSyncExternalStore(
        (listener) =>
            readInvalidation(runtime)?.subscribe(scopes, listener) ??
            (() => undefined),
        () => buildToken(runtime, entityIds, plan),
        () => "",
    );
};
