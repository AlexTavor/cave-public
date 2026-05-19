import { attributesEqual } from "../../../../../game/systems/body/attributes";
import type { RuntimeEntity } from "../../../../../engine/runtime/types";
import type { PowerSinkComponent } from "../../../../../data/schemas/components";
import type { HydrationDependencyPlan } from "../../hydration/hydrationTypes";
import type { JobCardData } from "./jobCardTypes";
import {
    modifierTraitDataEqual,
    storageModelsEqual,
} from "../selectionHydrationUtils";
import { assignmentJobCardEqual } from "./jobCardAssignmentHydration";
import { suspiciousActivityEqual } from "./jobCardHydrationEquality";

const powerSinkEqual = (left: PowerSinkComponent, right: PowerSinkComponent) =>
    left.throttle === right.throttle &&
    left.showThrottleSlider === right.showThrottleSlider &&
    left.status === right.status &&
    attributesEqual(left.baseDemand, right.baseDemand) &&
    attributesEqual(left.maxDemand, right.maxDemand);

const jobAnalysisEqual = (left: any, right: any) =>
    JSON.stringify(left.nextCycleGroups) ===
    JSON.stringify(right.nextCycleGroups);

export const resolveJobCardHydrationPlan = (
    entity: RuntimeEntity,
): HydrationDependencyPlan => {
    const assignment = (entity as { assignment?: { assignedIds?: unknown } })
        .assignment;
    const assignedIds = Array.isArray(assignment?.assignedIds)
        ? assignment.assignedIds
        : [];
    const entityIds = assignment
        ? [entity.id ?? "", "sys_world", ...assignedIds]
        : [entity.id ?? ""];
    return {
        entityIds,
        includeEntityListRevision: true,
        includeBlueprintRevision: true,
    };
};

export const jobCardDataEqual = (
    left: JobCardData | null,
    right: JobCardData | null,
) => {
    if (left === right) return true;
    if (left?.variant !== right?.variant) return false;
    if (!left || !right) return false;
    if (left.variant === "assignment") {
        return assignmentJobCardEqual(left, right as typeof left);
    }
    const powerLeft = left,
        powerRight = right as typeof powerLeft;
    return (
        powerLeft.label === powerRight.label &&
        powerLeft.description === powerRight.description &&
        powerSinkEqual(powerLeft.sink, powerRight.sink) &&
        jobAnalysisEqual(powerLeft.analysis, powerRight.analysis) &&
        storageModelsEqual(powerLeft.storageModels, powerRight.storageModels) &&
        modifierTraitDataEqual(
            { modifiers: [], traits: powerLeft.traits },
            { modifiers: [], traits: powerRight.traits },
        ) &&
        suspiciousActivityEqual(
            powerLeft.suspiciousActivity,
            powerRight.suspiciousActivity,
        )
    );
};
