import {
    normalizeConditionalActivationConfigs,
    type ConditionalActivationAbilityValue,
} from "../../data/schemas/abilities/conditionalActivation";
import {
    hasConditionalActivationTarget,
    isConditionalActivationTargetValid,
} from "../../data/schemas/abilities/conditionalActivationSupport";
import { isConditionalActivationActive } from "../../engine/runtime/conditionalActivationState";
import type { Snapshot } from "../../engine/runtime/Snapshot";
import type { RuntimeEntity } from "../../engine/runtime/types";
import { evaluateStructuredConditionSet } from "../conditions/evaluateStructuredConditionSet";

const isConditionalActivationInactive = (input: {
    snapshot: Snapshot;
    owner: RuntimeEntity;
    conditions: unknown[] | undefined;
    index: number;
}) => {
    const hasConditions =
        Array.isArray(input.conditions) && input.conditions.length > 0;
    return hasConditions
        ? !evaluateStructuredConditionSet(
              input.snapshot,
              input.conditions as any,
              input.owner,
          )
        : !isConditionalActivationActive(input.owner, input.index);
};

const hasInactiveTarget = (
    snapshot: Snapshot,
    owner: RuntimeEntity,
    ability: "assignment" | "cycle",
) => {
    const blueprintId =
        typeof owner.blueprintId === "string" ? owner.blueprintId : "";
    const blueprint = snapshot.getBlueprint(blueprintId);
    const abilities = blueprint?._editor?.abilities as
        | Record<string, unknown>
        | undefined;
    return normalizeConditionalActivationConfigs(
        abilities?.conditionalActivation as ConditionalActivationAbilityValue,
    ).some(
        (config, index) =>
            isConditionalActivationInactive({
                snapshot,
                owner,
                conditions: config.conditions,
                index,
            }) &&
            hasConditionalActivationTarget(config.targets ?? [], { ability }) &&
            isConditionalActivationTargetValid(abilities, { ability }),
    );
};

export const isAssignmentOwnerUsable = (
    snapshot: Snapshot,
    owner: RuntimeEntity | undefined,
): boolean => {
    const depleted = (
        owner as { state?: { is_depleted?: { value?: unknown } } } | undefined
    )?.state?.is_depleted?.value;
    if (owner?.id === "sys_world") return true;
    if (!owner?.id) return false;
    if (depleted === 1) return false;
    if (hasInactiveTarget(snapshot, owner, "assignment")) return false;
    if (hasInactiveTarget(snapshot, owner, "cycle")) return false;
    return true;
};
