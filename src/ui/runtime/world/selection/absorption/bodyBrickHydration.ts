import { attributesEqual } from "../../../../../game/systems/body/attributes";
import type { HydrationDependencyPlan } from "../../hydration/hydrationTypes";
import type { BodyBrickRenderData } from "./bodyBrickTypes";

const sameStatusIcons = (
    left: BodyBrickRenderData["statusIcons"],
    right: BodyBrickRenderData["statusIcons"],
) =>
    left.length === right.length &&
    left.every(
        (icon, index) =>
            icon.traitId === right[index]?.traitId &&
            icon.iconId === right[index]?.iconId,
    );

export const resolveBodyBrickHydrationPlan = (
    entityId: string,
): HydrationDependencyPlan => ({
    entityIds: [entityId, "sys_world"],
    includeEntityListRevision: false,
    includeBlueprintRevision: false,
});

export const bodyBrickDataEqual = (
    left: BodyBrickRenderData | null,
    right: BodyBrickRenderData | null,
) =>
    left === right ||
    (!!left &&
        !!right &&
        left.entityId === right.entityId &&
        left.subjectId === right.subjectId &&
        left.fallbackIconId === right.fallbackIconId &&
        left.liveLevel === right.liveLevel &&
        attributesEqual(left.attributes, right.attributes) &&
        left.displayHealth === right.displayHealth &&
        left.displayMaxHealth === right.displayMaxHealth &&
        left.hasUnownedHabiti === right.hasUnownedHabiti &&
        sameStatusIcons(left.statusIcons, right.statusIcons));