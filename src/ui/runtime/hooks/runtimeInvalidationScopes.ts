import type { RuntimeInvalidationScope } from "../../../engine/runtime/runtimeInvalidationTypes";
import type { HydrationDependencyPlan } from "../world/hydration/hydrationTypes";

export const normalizeRuntimeEntityIds = (entityIds: string[]) =>
    [...new Set(entityIds.filter((id) => id.length > 0))].sort((left, right) =>
        left.localeCompare(right),
    );

export const resolveRuntimeInvalidationScopes = (
    entityIds: string[],
    plan: HydrationDependencyPlan,
): RuntimeInvalidationScope[] => [
    "world",
    ...(plan.includeFrameRevision ? (["frame"] as const) : []),
    ...(plan.includeMutationRevision ? (["mutation"] as const) : []),
    ...(plan.includeEntityListRevision ? (["entity-list"] as const) : []),
    ...(plan.includeBlueprintRevision ? (["blueprint"] as const) : []),
    ...entityIds.map((id) => `entity:${id}` as const),
];
