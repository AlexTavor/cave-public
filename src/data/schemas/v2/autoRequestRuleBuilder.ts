import type { BehaviorRule } from "../behavior";

export interface TransferRuleParams {
    id: string;
    sortKey: string;
    timerCondition: BehaviorRule["conditions"][number];
    needRef: string;
    needOp: string;
    needThreshold: number;
    minReq: number;
    source: string;
    resource: string;
    amount: string | number;
    timerKey: string;
}

export const buildAutoReqTransferRule = (
    p: TransferRuleParams,
): BehaviorRule => ({
    id: p.id,
    sortKey: p.sortKey,
    conditions: [
        p.timerCondition,
        {
            id: "need_above_min",
            sortKey: "1",
            tokens: [
                { t: "ref", v: p.needRef },
                { t: "op", v: ">=" },
                { t: "val", v: p.minReq },
            ],
        },
        {
            id: "need_check",
            sortKey: "2",
            tokens: [
                { t: "ref", v: p.needRef },
                { t: "op", v: p.needOp },
                { t: "val", v: p.needThreshold },
            ],
        },
    ],
    actions: [
        {
            type: "TRANSFER",
            source: p.source,
            target: "self",
            resource: p.resource,
            amount: p.amount,
        },
        {
            type: "MUTATE",
            target: `self.state.${p.timerKey}.value`,
            op: "SET",
            value: 0,
        },
    ],
});
