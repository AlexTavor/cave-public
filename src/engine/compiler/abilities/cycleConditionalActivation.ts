import type { Blueprint } from "../../../data/schemas/blueprint";
import type { CycleAbilityConfig } from "../../../data/schemas/abilities/cycle";
import type { BehaviorRule } from "../../../data/schemas/behavior";
import {
    normalizeConditionalActivationConfigs,
    type ConditionalActivationAbilityValue,
} from "../../../data/schemas/abilities/conditionalActivation";
import {
    createConditionalActivationAllActiveGate,
    createConditionalActivationNotAllActiveGate,
    hasConditionalActivationConditions,
    isConditionalActivationSelected,
} from "./conditionalActivationCompiler";
import {
    CONDITIONAL_ACTIVATION_HIDE_THROTTLE_STATE_KEY,
    CONDITIONAL_ACTIVATION_SAVED_THROTTLE_STATE_KEY,
} from "../../runtime/conditionalActivationState";

const getCycleConditionalActivationIndexes = (
    conditionalActivation?: ConditionalActivationAbilityValue,
) =>
    normalizeConditionalActivationConfigs(conditionalActivation).flatMap(
        (config, index) =>
            isConditionalActivationSelected(config, { ability: "cycle" }) &&
            hasConditionalActivationConditions(config)
                ? [index]
                : [],
    );

const compileCycleActivationCondition = (
    onGate: NonNullable<
        ReturnType<typeof createConditionalActivationAllActiveGate>
    >,
    savedThrottleKey: string,
    hideThrottleKey: string,
): BehaviorRule => ({
    id: "sys_conditional_activation_cycle_on",
    sortKey: "sys_002",
    conditions: [
        {
            id: "conditional_activation_cycle_on",
            sortKey: "conditional_activation_cycle_on",
            tokens: [],
            compiled: onGate.compiled,
        },
    ],
    actions: [
        {
            type: "MUTATE",
            target: "self.state.cycle_active.value",
            op: "SET",
            value: 1,
        },
        {
            type: "MUTATE",
            target: "self.powerSink.throttle",
            op: "SET",
            value: `self.state.${savedThrottleKey}.value`,
        },
        {
            type: "MUTATE",
            target: `self.state.${hideThrottleKey}.value`,
            op: "SET",
            value: 0,
        },
    ],
});

const compileCycleActivationEffect = (
    offGate: NonNullable<
        ReturnType<typeof createConditionalActivationNotAllActiveGate>
    >,
    hideThrottleKey: string,
): BehaviorRule => ({
    id: "sys_conditional_activation_cycle_off",
    sortKey: "sys_003",
    conditions: [
        {
            id: "conditional_activation_cycle_off",
            sortKey: "conditional_activation_cycle_off",
            tokens: [],
            compiled: offGate.compiled,
        },
    ],
    actions: [
        {
            type: "MUTATE",
            target: "self.state.cycle_active.value",
            op: "SET",
            value: 0,
        },
        {
            type: "MUTATE",
            target: "self.powerSink.throttle",
            op: "SET",
            value: 0,
        },
        {
            type: "MUTATE",
            target: `self.state.${hideThrottleKey}.value`,
            op: "SET",
            value: 1,
        },
    ],
});

export const applyCycleConditionalActivation = (
    draft: Blueprint,
    cycle: CycleAbilityConfig,
    conditionalActivation?: ConditionalActivationAbilityValue,
): void => {
    const indexes = getCycleConditionalActivationIndexes(conditionalActivation);
    const onGate = createConditionalActivationAllActiveGate(indexes);
    const offGate = createConditionalActivationNotAllActiveGate(indexes);
    if (!onGate || !offGate) return;
    const state = draft.components.state ?? {};
    const behavior = draft.components.behavior?.rules ?? [];
    state.cycle_active = { value: 0, visible: false };
    state[CONDITIONAL_ACTIVATION_SAVED_THROTTLE_STATE_KEY] = {
        value: cycle.startActive ? 1 : 0,
        visible: false,
    };
    state[CONDITIONAL_ACTIVATION_HIDE_THROTTLE_STATE_KEY] = {
        value: 1,
        visible: false,
    };
    if (draft.components.powerSink) draft.components.powerSink.throttle = 0;
    behavior.push(
        compileCycleActivationCondition(
            onGate,
            CONDITIONAL_ACTIVATION_SAVED_THROTTLE_STATE_KEY,
            CONDITIONAL_ACTIVATION_HIDE_THROTTLE_STATE_KEY,
        ),
        compileCycleActivationEffect(
            offGate,
            CONDITIONAL_ACTIVATION_HIDE_THROTTLE_STATE_KEY,
        ),
    );
};
