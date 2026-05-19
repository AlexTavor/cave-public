import type { Runtime } from "../../../../engine/runtime/Runtime";
import type { RuntimeEntity } from "../../../../engine/runtime/types";
import { resolveAbsorptionPreview } from "../selection/absorption/resolveAbsorptionPreview";

export const resolvePointerSelectorPreview = (input: {
    runtime: Runtime;
    targetEntity?: RuntimeEntity;
    targetKind: string;
    bodyEntities: RuntimeEntity[];
}) => {
    const showExpectedRewards = input.targetKind === "processing";
    const preview = resolveAbsorptionPreview({
        runtime: input.runtime,
        stationEntity: input.targetEntity,
        bodyEntities: showExpectedRewards ? input.bodyEntities : [],
    });
    return { preview, showExpectedRewards };
};
