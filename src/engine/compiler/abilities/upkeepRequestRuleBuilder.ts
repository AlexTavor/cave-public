import type { BehaviorRule } from "../../../data/schemas/behavior";

export const buildUpkeepRequestRule = (
    resource: string,
    index: number,
    source: string,
    isImmediate?: boolean,
): BehaviorRule => ({
    id: `sys_upkeep_request_${resource}_${index}`,
    sortKey: "sys_062",
    conditions: [
        {
            id: "resource_not_full",
            sortKey: "0",
            tokens: [
                { t: "ref", v: `self.state.${resource}.value` },
                { t: "op", v: "<" },
                { t: "ref", v: `self.state.${resource}.max` },
            ],
        },
    ],
    actions: [
        {
            type: "TRANSFER",
            source,
            target: "self",
            resource,
            amount: `self.state.${resource}.max`,
            ...(isImmediate === true && { isImmediate: true }),
        },
    ],
});
