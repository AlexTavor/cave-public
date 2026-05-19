import type { RuntimeEntity } from "../../../../engine/runtime/types";
import type { HydrationDependencyPlan } from "../hydration/hydrationTypes";
import type { DisplayCardData } from "./resolveDisplayCardData";

export const resolveDisplayCardHydrationPlan = (
    entity: RuntimeEntity,
): HydrationDependencyPlan => ({
    entityIds: [entity.id ?? ""],
    includeEntityListRevision: true,
    includeBlueprintRevision: true,
});

export const displayCardDataEqual = (
    left: DisplayCardData | null,
    right: DisplayCardData | null,
) =>
    left === right ||
    (!!left &&
        !!right &&
        left.label === right.label &&
        left.description === right.description &&
        left.subtitle === right.subtitle);
