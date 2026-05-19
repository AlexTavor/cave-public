import {
    normalizeConditionalActivationConfigs,
    type ConditionalActivationAbilityValue,
    type ConditionalActivationTarget,
} from "../../../../../data/schemas/abilities/conditionalActivation";
import {
    hasConditionalActivationTarget,
    isConditionalActivationTargetValid,
} from "../../../../../data/schemas/abilities/conditionalActivationSupport";
import { isConditionalActivationActive } from "../../../../../engine/runtime/conditionalActivationState";
import type { Runtime } from "../../../../../engine/runtime/Runtime";
import { resolveBlueprintById } from "../selectionUtils";

export const isConditionalActivationTargetInactive = (
    entityId: string,
    runtime: Runtime | null,
    target: ConditionalActivationTarget,
): boolean => {
    if (!runtime) return false;
    const entity = runtime.getEntity(entityId);
    if (!entity) return false;
    const blueprint = resolveBlueprintById(runtime, entity.blueprintId);
    const abilities = blueprint?._editor?.abilities as
        | Record<string, unknown>
        | undefined;
    return normalizeConditionalActivationConfigs(
        abilities?.conditionalActivation as ConditionalActivationAbilityValue,
    ).some(
        (config, index) =>
            !isConditionalActivationActive(entity, index) &&
            hasConditionalActivationTarget(config.targets ?? [], target) &&
            isConditionalActivationTargetValid(abilities, target),
    );
};
