import type { BehaviorRule } from "../../../data/schemas/behavior";
import { cycleCompleteConditions } from "./cycleConditions";

const ATTRIBUTES = ["body", "mind", "social"] as const;

const createOneOffSinkResetActions = () => [
    {
        type: "MUTATE" as const,
        target: "self.powerSink.throttle",
        op: "SET" as const,
        value: 0,
    },
    ...ATTRIBUTES.flatMap((attribute) => [
        {
            type: "MUTATE" as const,
            target: `self.powerSink.baseDemand.${attribute}`,
            op: "SET" as const,
            value: 0,
        },
        {
            type: "MUTATE" as const,
            target: `self.powerSink.maxDemand.${attribute}`,
            op: "SET" as const,
            value: 0,
        },
    ]),
];

export const createCycleRule = (value: string): BehaviorRule => ({
    id: "sys_cycle_accumulate",
    sortKey: "sys_001",
    conditions: [
        {
            id: "is_active",
            sortKey: "0",
            tokens: [{ t: "ref", v: "self.state.cycle_active" }],
        },
    ],
    actions: [
        {
            type: "MUTATE",
            target: "self.state.cycle.value",
            op: "ADD",
            value,
        },
    ],
});

export const createCycleResetRule = (opts: {
    oneOff?: boolean;
    costMultPerCycle?: boolean;
}): BehaviorRule => {
    return {
        id: "sys_cycle_reset",
        sortKey: "sys_999",
        conditions: cycleCompleteConditions(),
        actions: [
            {
                type: "MUTATE",
                target: "self.state.cycle.value",
                op: "SET",
                value: 0,
            },
            ...(opts.oneOff
                ? [
                      {
                          type: "MUTATE" as const,
                          target: "self.state.is_depleted.value",
                          op: "SET" as const,
                          value: 1,
                      },
                      ...createOneOffSinkResetActions(),
                  ]
                : []),
            ...(opts.costMultPerCycle
                ? [
                      {
                          type: "MUTATE" as const,
                          target: "self.state.cycle_count.value",
                          op: "ADD" as const,
                          value: 1,
                      },
                  ]
                : []),
        ],
    };
};

export const createCycleTransitionRule = (
    blueprintId: string,
): BehaviorRule => ({
    id: "sys_cycle_transition",
    sortKey: "sys_995",
    conditions: cycleCompleteConditions(),
    actions: [
        {
            type: "PATCH_BLUEPRINT",
            blueprintId,
            components: {},
        },
    ],
});

