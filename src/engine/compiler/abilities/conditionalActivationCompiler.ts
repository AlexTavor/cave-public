import type { EditorAbilities } from "../../../data/schemas/abilities";
import {
    normalizeConditionalActivationConfigs,
    type ConditionalActivationAbilityConfig,
    type ConditionalActivationAbilityValue,
    type ConditionalActivationTarget,
} from "../../../data/schemas/abilities/conditionalActivation";
import type { BehaviorRule } from "../../../data/schemas/behavior";
import type { Blueprint } from "../../../data/schemas/blueprint";
import { hasConditionalActivationTarget } from "../../../data/schemas/abilities/conditionalActivationSupport";
import {
    compileConditionalActivationConfig,
    createConditionalActivationActiveStateCondition,
    validateConditionalActivationTargets as validateConditionalActivationTargetsImpl,
} from "./conditionalActivationCompiler/index";

type Target = ConditionalActivationTarget;

export const hasConditionalActivationConditions = (
    config?: ConditionalActivationAbilityConfig,
): boolean => (config?.conditions ?? []).length > 0;

export const isConditionalActivationSelected = (
    config: ConditionalActivationAbilityConfig | undefined,
    target: Target,
): boolean => hasConditionalActivationTarget(config?.targets ?? [], target);

export const appendConditionalActivationActiveStates = (
    rule: BehaviorRule,
    value: ConditionalActivationAbilityValue,
    target: Target,
): void => {
    normalizeConditionalActivationConfigs(value).forEach((config, index) => {
        if (!isConditionalActivationSelected(config, target)) return;
        rule.conditions.push(
            createConditionalActivationActiveStateCondition(index),
        );
    });
};

export const prepareConditionalActivation = (
    draft: Blueprint,
    abilities: EditorAbilities,
): void => {
    const configs = normalizeConditionalActivationConfigs(
        abilities.conditionalActivation,
    );
    validateConditionalActivationTargets(draft.id, abilities, configs);
    configs.forEach((config, index) =>
        compileConditionalActivationConfig(draft, config, index),
    );
};

export const validateConditionalActivationTargets = (
    blueprintId: string,
    abilities: EditorAbilities,
    configs = normalizeConditionalActivationConfigs(
        abilities.conditionalActivation,
    ),
) => validateConditionalActivationTargetsImpl(blueprintId, abilities, configs);

export {
    createConditionalActivationAllActiveGate,
    createConditionalActivationNotAllActiveGate,
} from "./conditionalActivationCompiler/index";
