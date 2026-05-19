import {
    normalizeConditionalActivationConfigs,
    type ConditionalActivationAbilityValue,
} from "../../../data/schemas/abilities/conditionalActivation";
import { isConditionalActivationTargetValid } from "../../../data/schemas/abilities/conditionalActivationSupport";
import { isConditionalActivationActive } from "../../../engine/runtime/conditionalActivationState";
import type { Snapshot } from "../../../engine/runtime/Snapshot";
import type { RuntimeEntity } from "../../../engine/runtime/types";

const isBlockedTarget = (ability: string) =>
    ability === "assignment" || ability === "cycle";

export const isPointerAssignmentBlocked = (
    snapshot: Snapshot,
    entity: RuntimeEntity,
): boolean => {
    const blueprintId =
        typeof entity.blueprintId === "string" ? entity.blueprintId : "";
    const blueprint =
        typeof snapshot.getBlueprint === "function"
            ? snapshot.getBlueprint(blueprintId)
            : undefined;
    const abilities = blueprint?._editor?.abilities as
        | Record<string, unknown>
        | undefined;
    return normalizeConditionalActivationConfigs(
        abilities?.conditionalActivation as ConditionalActivationAbilityValue,
    ).some(
        (config, index) =>
            !isConditionalActivationActive(entity, index) &&
            (config.targets ?? []).some(
                (target) =>
                    isBlockedTarget(target.ability) &&
                    isConditionalActivationTargetValid(abilities, target),
            ),
    );
};
