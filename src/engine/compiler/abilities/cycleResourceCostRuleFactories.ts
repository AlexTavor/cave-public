import { cycleCompleteConditions } from "./cycleConditions";
import type { BehaviorRule } from "../../../data/schemas/behavior";

const withGraceUnit = (resource: string) => ({
    "+": [{ var: `self.state.${resource}.value` }, 1],
});

const readAmount = (amountRef: string) => ({ var: amountRef });

export const createCycleCostCondition = (
    resource: string,
    amountRef: string,
    index: number,
) => ({
    id: `has_cycle_cost_${resource}_${index}`,
    sortKey: `${index + 1}`,
    tokens: [
        { t: "ref" as const, v: `self.state.${resource}.value` },
        { t: "op" as const, v: ">=" },
        { t: "ref" as const, v: amountRef },
    ],
    compiled: {
        ">": [withGraceUnit(resource), readAmount(amountRef)],
    },
});

export const createCycleCostConsumeRule = (
    resource: string,
    amountRef: string,
) => ({
    id: `sys_cycle_cost_consume_${resource}`,
    sortKey: "sys_997",
    conditions: [
        ...cycleCompleteConditions(),
        createCycleCostCondition(resource, amountRef, 0),
    ],
    actions: [
        {
            type: "MUTATE" as const,
            target: `self.state.${resource}.value`,
            op: "SUB" as const,
            value: amountRef,
        },
    ],
});

export const createCycleCostPowerGateRule = (
    resource: string,
    amountRef: string,
    demandAttributes: Array<"body" | "mind" | "social">,
): BehaviorRule => ({
    id: `sys_cycle_cost_power_gate_${resource}`,
    sortKey: "sys_000",
    conditions: [
        {
            id: `missing_cycle_cost_${resource}`,
            sortKey: "0",
            tokens: [
                { t: "ref", v: `self.state.${resource}.value` },
                { t: "op", v: "<" },
                { t: "ref", v: amountRef },
            ],
            compiled: {
                "<=": [withGraceUnit(resource), readAmount(amountRef)],
            },
        },
    ],
    actions: demandAttributes.map((attribute) => ({
        type: "MUTATE",
        target: `self.powerSink.baseDemand.${attribute}`,
        op: "SET",
        value: 0,
    })),
});
