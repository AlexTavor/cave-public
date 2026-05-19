import { attributesEqual } from "../../../../../game/systems/body/attributes";
import type { RuntimeEntity } from "../../../../../engine/runtime/types";
import type { HydrationDependencyPlan } from "../../hydration/hydrationTypes";
import type { BodyCardData } from "./bodyCardTypes";
import { resolveBodySelectionTargetId } from "../selectionUtils";
import {
    habitiEntriesEqual,
    modifierTraitDataEqual,
} from "../selectionHydrationUtils";

export const resolveBodyCardHydrationPlan = (
    entity: RuntimeEntity,
): HydrationDependencyPlan => {
    const subjectId = resolveBodySelectionTargetId(entity) ?? entity.id ?? "";
    const entityIds = [entity.id ?? "", subjectId, "sys_world"];
    return {
        entityIds,
        includeEntityListRevision: true,
        includeBlueprintRevision: true,
    };
};

export const bodyCardDataEqual = (
    left: BodyCardData | null,
    right: BodyCardData | null,
) =>
    left === right ||
    (!!left &&
        !!right &&
        left.subjectId === right.subjectId &&
        left.isPermanent === right.isPermanent &&
        left.showIdentityTitle === right.showIdentityTitle &&
        left.displayName === right.displayName &&
        left.description === right.description &&
        left.fallbackIconId === right.fallbackIconId &&
        left.level === right.level &&
        left.xpMax === right.xpMax &&
        left.xpRate === right.xpRate &&
        attributesEqual(left.baseAttributes, right.baseAttributes) &&
        attributesEqual(left.attributes, right.attributes) &&
        habitiEntriesEqual(left.habiti, right.habiti) &&
        modifierTraitDataEqual(left, right));
