import { attributesEqual } from "../../../../../game/systems/body/attributes";
import type { RuntimeEntity } from "../../../../../engine/runtime/types";
import type { HydrationDependencyPlan } from "../../hydration/hydrationTypes";
import type { CaveCardData } from "./caveCardTypes";
import {
    habitiEntriesEqual,
    modifierTraitDataEqual,
} from "../selectionHydrationUtils";

export const resolveCaveCardHydrationPlan = (
    _entity: RuntimeEntity,
): HydrationDependencyPlan => ({
    entityIds: ["sys_world"],
    includeEntityListRevision: true,
    includeBlueprintRevision: true,
});

export const caveCardDataEqual = (
    left: CaveCardData | null,
    right: CaveCardData | null,
) =>
    left === right ||
    (!!left &&
        !!right &&
        left.label === right.label &&
        left.targetId === right.targetId &&
        left.level === right.level &&
        left.xpMax === right.xpMax &&
        attributesEqual(left.attributes, right.attributes) &&
        habitiEntriesEqual(left.habiti, right.habiti) &&
        habitiEntriesEqual(left.understanding, right.understanding) &&
        modifierTraitDataEqual(left, right));
