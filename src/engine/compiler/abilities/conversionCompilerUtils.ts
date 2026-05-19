import type { Blueprint } from "../../../data/schemas/blueprint";
import type { BehaviorRule } from "../../../data/schemas/behavior";
import type { AbilityTriggerKind } from "../../../data/schemas/abilities/triggers";
import { buildAbilityTriggerConditions } from "./abilityTriggerConditions";

export const ensureStateEntry = (draft: Blueprint, key: string): void => {
    draft.components ??= {} as Blueprint["components"];
    draft.components.state ??= {};
    if (!draft.components.state[key]) {
        draft.components.state[key] = { value: 0, visible: false };
    }
};

export const removeCycleResetRule = (draft: Blueprint): void => {
    const behavior = draft.components?.behavior;
    if (!behavior?.rules) return;
    behavior.rules = behavior.rules.filter(
        (rule) => rule.id !== "sys_cycle_reset",
    );
};

const compileConversionConditions = (
    triggers: AbilityTriggerKind[],
    inputRefs: Array<{ resource: string; amountRef: string }>,
): BehaviorRule["conditions"] => [
    ...buildAbilityTriggerConditions(triggers),
    ...inputRefs.map((input, idx) => ({
        id: `has_input_${idx}`,
        sortKey: `1_${idx}`,
        tokens: [
            { t: "ref", v: `self.state.${input.resource}.value` } as const,
            { t: "op", v: ">=" } as const,
            { t: "ref", v: input.amountRef } as const,
        ],
    })),
];

const compileConversionActions = (
    inputRefs: Array<{ resource: string; amountRef: string }>,
    outputRefs: Array<{ resource: string; amountRef: string; target: string }>,
    resetCycle: boolean,
): BehaviorRule["actions"] => {
    const actions: BehaviorRule["actions"] = [
        ...inputRefs.map((input) => ({
            type: "MUTATE" as const,
            target: `self.state.${input.resource}.value`,
            op: "SUB" as const,
            value: input.amountRef,
        })),
        ...outputRefs.map((output) => ({
            type: "MUTATE" as const,
            target: `self.state.${output.resource}.value`,
            op: "ADD" as const,
            value: output.amountRef,
        })),
        ...outputRefs
            .filter((output) => output.target !== "self")
            .map((output) => ({
                type: "TRANSFER" as const,
                source: "self",
                target: output.target,
                resource: output.resource,
                amount: output.amountRef,
            })),
    ];
    if (resetCycle) {
        actions.push({
            type: "MUTATE",
            target: "self.state.cycle.value",
            op: "SET",
            value: 0,
        });
    }
    return actions;
};

export const createConversionRule = (params: {
    id: string;
    index: number;
    inputRefs: Array<{ resource: string; amountRef: string }>;
    outputRefs: Array<{ resource: string; amountRef: string; target: string }>;
    resetCycle: boolean;
    triggers: AbilityTriggerKind[];
}): BehaviorRule => {
    const conditions: BehaviorRule["conditions"] = compileConversionConditions(
        params.triggers,
        params.inputRefs,
    );
    const actions: BehaviorRule["actions"] = compileConversionActions(
        params.inputRefs,
        params.outputRefs,
        params.resetCycle,
    );

    return {
        id: `sys_convert_${params.id}_${params.index}`,
        sortKey: "sys_060",
        conditions,
        actions,
    };
};

export const addInputConditionsToCycleRule = (
    draft: Blueprint,
    inputRefs: Array<{ resource: string; amountRef: string }>,
): void => {
    const rule = draft.components?.behavior?.rules?.find(
        (r) => r.id === "sys_cycle_accumulate",
    );
    if (!rule) return;
    inputRefs.forEach((inp, idx) =>
        rule.conditions.push({
            id: `has_input_${idx}`,
            sortKey: `${idx + 1}`,
            tokens: [
                { t: "ref" as const, v: `self.state.${inp.resource}.value` },
                { t: "op" as const, v: ">=" },
                { t: "ref" as const, v: inp.amountRef },
            ],
        }),
    );
};

