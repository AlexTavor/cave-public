import type { EditorAbilities } from "../../../../data/schemas/abilities";
import type {
    ConditionalActivationAbilityConfig,
    ConditionalActivationTarget,
} from "../../../../data/schemas/abilities/conditionalActivation";
import {
    isConditionalActivationTargetValid,
    isConditionalActivationTargetableAbility,
} from "../../../../data/schemas/abilities/conditionalActivationSupport";
import type { Blueprint } from "../../../../data/schemas/blueprint";
import {
    compileStructuredConditionAllGate,
    compileStructuredConditionNotAllGate,
} from "../../conditions/compileStructuredConditions";
import { getConditionalActivationActiveStateKey } from "../../../runtime/conditionalActivationState";

const toActiveStateVar = (index: number) =>
    `self.state.${getConditionalActivationActiveStateKey(index)}.value`;

export const compileConditionalActivationConfig = (
    draft: Blueprint,
    config: ConditionalActivationAbilityConfig,
    index: number,
): void => {
    const conditions = config.conditions ?? [];
    if (conditions.length === 0) return;
    const onGate = compileStructuredConditionAllGate(conditions);
    const offGate = compileStructuredConditionNotAllGate(conditions);
    if (!onGate || !offGate) return;
    const stateKey = getConditionalActivationActiveStateKey(index);
    const ruleSuffix = index === 0 ? "" : `_${index}`;
    draft.components ??= {} as Blueprint["components"];
    draft.components.state ??= {};
    draft.components.state[stateKey] ??= { value: 0, visible: false };
    draft.components.behavior ??= { rules: [] };
    draft.components.behavior.rules ??= [];
    draft.components.behavior.rules.push(
        {
            id: `sys_conditional_activation_on${ruleSuffix}`,
            sortKey: `sys_001${ruleSuffix}`,
            conditions: [onGate],
            actions: [
                {
                    type: "MUTATE",
                    target: toActiveStateVar(index),
                    op: "SET",
                    value: 1,
                },
            ],
        },
        {
            id: `sys_conditional_activation_off${ruleSuffix}`,
            sortKey: `sys_001b${ruleSuffix}`,
            conditions: [offGate],
            actions: [
                {
                    type: "MUTATE",
                    target: toActiveStateVar(index),
                    op: "SET",
                    value: 0,
                },
            ],
        },
    );
};

export const validateConditionalActivationTargets = (
    blueprintId: string,
    abilities: EditorAbilities,
    configs: ConditionalActivationAbilityConfig[],
): void => {
    configs.forEach((config, index) => {
        (config.targets ?? []).forEach(
            (target: ConditionalActivationTarget) => {
                if (!isConditionalActivationTargetableAbility(target.ability)) {
                    console.warn(
                        `Conditional Activation[${index}] target on '${blueprintId}' is unsupported: ${target.ability}.`,
                    );
                    return;
                }
                if (!isConditionalActivationTargetValid(abilities, target)) {
                    console.warn(
                        `Conditional Activation[${index}] target on '${blueprintId}' is stale: ${target.ability}:${target.targetId ?? "missing"}.`,
                    );
                }
            },
        );
    });
};
