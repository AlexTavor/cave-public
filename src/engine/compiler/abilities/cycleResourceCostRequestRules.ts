import type { BehaviorRule } from "../../../data/schemas/behavior";

const asToken = (value: number | string) =>
    typeof value === "number"
        ? { t: "val" as const, v: value }
        : { t: "ref" as const, v: value };

const createTimerCondition = (timerKey: string, cadence: number) => ({
    id: "timer_ready",
    sortKey: "0",
    tokens: [
        { t: "ref" as const, v: `self.state.${timerKey}.value` },
        { t: "op" as const, v: ">=" },
        { t: "val" as const, v: cadence },
    ],
});

const createNeedCondition = (
    id: string,
    sortKey: string,
    needRef: string,
    op: string,
    right: number | string,
) => ({
    id,
    sortKey,
    tokens: [
        { t: "ref" as const, v: needRef },
        { t: "op" as const, v: op },
        asToken(right),
    ],
});

const createCycleCostRequestRule = (params: {
    id: string;
    sortKey: string;
    resource: string;
    needRef: string;
    amount: string;
    timerKey: string;
    requestCadenceSeconds: number;
    check: BehaviorRule["conditions"][number];
    hasSink: boolean;
}): BehaviorRule => ({
    id: params.id,
    sortKey: params.sortKey,
    conditions: [
        createTimerCondition(params.timerKey, params.requestCadenceSeconds),
        createNeedCondition("need_above_min", "1", params.needRef, ">=", 0.01),
        params.check,
        ...(params.hasSink
            ? [
                  createNeedCondition(
                      "throttle_active",
                      "3",
                      "self.powerSink.throttle",
                      ">",
                      0,
                  ),
              ]
            : []),
    ],
    actions: [
        {
            type: "TRANSFER",
            source: `tag:storage:${params.resource}`,
            target: "self",
            resource: params.resource,
            amount: params.amount,
        },
        {
            type: "MUTATE",
            target: `self.state.${params.timerKey}.value`,
            op: "SET",
            value: 0,
        },
    ],
});

type CostRequestRuleParams = {
    resource: string;
    needRef: string;
    limitRef: string;
    timerKey: string;
    requestCadenceSeconds: number;
    hasSink: boolean;
};

const createNeedBelowLimitRequestRule = (
    params: CostRequestRuleParams,
): BehaviorRule =>
    createCycleCostRequestRule({
        id: `sys_cycle_cost_req_${params.resource}`,
        sortKey: "sys_051",
        resource: params.resource,
        needRef: params.needRef,
        amount: params.needRef,
        timerKey: params.timerKey,
        requestCadenceSeconds: params.requestCadenceSeconds,
        check: createNeedCondition(
            "need_check",
            "2",
            params.needRef,
            "<=",
            params.limitRef,
        ),
        hasSink: params.hasSink,
    });

const createNeedAboveLimitRequestRule = (
    params: CostRequestRuleParams,
): BehaviorRule =>
    createCycleCostRequestRule({
        id: `sys_cycle_cost_req_cap_${params.resource}`,
        sortKey: "sys_052",
        resource: params.resource,
        needRef: params.needRef,
        amount: params.limitRef,
        timerKey: params.timerKey,
        requestCadenceSeconds: params.requestCadenceSeconds,
        check: createNeedCondition(
            "need_check",
            "2",
            params.needRef,
            ">",
            params.limitRef,
        ),
        hasSink: params.hasSink,
    });

export const createCycleCostRequestRules = (
    params: CostRequestRuleParams,
): BehaviorRule[] => [
    createNeedBelowLimitRequestRule(params),
    createNeedAboveLimitRequestRule(params),
];
