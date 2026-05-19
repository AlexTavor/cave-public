export const withThrottleCondition = <TRule extends { conditions: any[] }>(
    rule: TRule,
    isThrottled: boolean,
): TRule => {
    if (!isThrottled) return rule;
    return {
        ...rule,
        conditions: [
            ...rule.conditions,
            {
                id: "throttle_active",
                sortKey: "3",
                tokens: [
                    { t: "ref" as const, v: "self.powerSink.throttle" },
                    { t: "op" as const, v: ">" },
                    { t: "val" as const, v: 0 },
                ],
            },
        ],
    };
};
