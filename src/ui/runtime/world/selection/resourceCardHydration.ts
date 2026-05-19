import type { Runtime } from "../../../../engine/runtime/Runtime";
import type { RuntimeEntity } from "../../../../engine/runtime/types";
import type { HydrationDependencyPlan } from "../hydration/hydrationTypes";
import type { ResourceCardData } from "./resolveResourceCardData";
import { storageModelsEqual } from "./selectionHydrationUtils";

export const resolveResourceCardHydrationPlan = (
    entity: RuntimeEntity,
    _runtime: Runtime | null,
): HydrationDependencyPlan => ({
    entityIds: [entity.id ?? ""],
    includeEntityListRevision: false,
    includeBlueprintRevision: true,
});

export const resourceCardDataEqual = (
    left: ResourceCardData | null,
    right: ResourceCardData | null,
) =>
    left === right ||
    (!!left &&
        !!right &&
        left.label === right.label &&
        left.description === right.description &&
        storageModelsEqual(left.storageModels, right.storageModels));
