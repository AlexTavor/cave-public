import type { Runtime } from "../../../../engine/runtime/Runtime";
import type { RuntimeEntity } from "../../../../engine/runtime/types";
import type { HydrationDependencyPlan } from "../hydration/hydrationTypes";
import type { TransferCardData } from "./resolveTransferCardData";

export const resolveTransferCardHydrationPlan = (
    entity: RuntimeEntity,
    _runtime: Runtime | null,
): HydrationDependencyPlan => {
    const transfer = (entity as { transfer?: any }).transfer ?? {};
    return {
        entityIds: [
            entity.id ?? "",
            transfer.sourceId ?? "",
            transfer.targetId ?? "",
        ],
        includeEntityListRevision: false,
        includeBlueprintRevision: false,
    };
};

export const transferCardDataEqual = (
    left: TransferCardData | null,
    right: TransferCardData | null,
) =>
    left === right ||
    (!!left &&
        !!right &&
        left.summary === right.summary &&
        left.typeLabel === right.typeLabel &&
        left.valueLabel === right.valueLabel &&
        left.sourceLabel === right.sourceLabel &&
        left.targetLabel === right.targetLabel);
