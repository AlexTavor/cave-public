import { describe, expect, it } from "vitest";
import { createCycleCostRequestRules } from "./cycleResourceCostRequestRules";

const baseParams = {
    resource: "food",
    needRef: "self.state.cycle_cost_req_food_need.value",
    limitRef: "self.state.cycle_cost_req_food_limit.value",
    timerKey: "cycle_cost_req_food_timer",
    requestCadenceSeconds: 2,
    hasSink: false as boolean,
};

describe("createCycleCostRequestRules", () => {
    it("returns exactly two rules: the below-limit then the above-limit (capped) rule", () => {
        const rules = createCycleCostRequestRules(baseParams);

        expect(rules).toHaveLength(2);
        expect(rules.map((r) => r.id)).toEqual([
            "sys_cycle_cost_req_food",
            "sys_cycle_cost_req_cap_food",
        ]);
        expect(rules.map((r) => r.sortKey)).toEqual(["sys_051", "sys_052"]);
    });

    it("builds the full below-limit request rule without a sink (deep-equal)", () => {
        const [below] = createCycleCostRequestRules({
            ...baseParams,
            hasSink: false,
        });

        expect(below).toEqual({
            id: "sys_cycle_cost_req_food",
            sortKey: "sys_051",
            conditions: [
                {
                    id: "timer_ready",
                    sortKey: "0",
                    tokens: [
                        {
                            t: "ref",
                            v: "self.state.cycle_cost_req_food_timer.value",
                        },
                        { t: "op", v: ">=" },
                        // requestCadenceSeconds -> a numeric val token
                        { t: "val", v: 2 },
                    ],
                },
                {
                    id: "need_above_min",
                    sortKey: "1",
                    tokens: [
                        {
                            t: "ref",
                            v: "self.state.cycle_cost_req_food_need.value",
                        },
                        { t: "op", v: ">=" },
                        { t: "val", v: 0.01 },
                    ],
                },
                {
                    // the "check" -> need_check with op "<=" against the limitRef
                    id: "need_check",
                    sortKey: "2",
                    tokens: [
                        {
                            t: "ref",
                            v: "self.state.cycle_cost_req_food_need.value",
                        },
                        { t: "op", v: "<=" },
                        // limitRef is a string -> a ref token (asToken branch)
                        {
                            t: "ref",
                            v: "self.state.cycle_cost_req_food_limit.value",
                        },
                    ],
                },
            ],
            actions: [
                {
                    type: "TRANSFER",
                    source: "tag:storage:food",
                    target: "self",
                    resource: "food",
                    // below-limit transfers the full need amount
                    amount: "self.state.cycle_cost_req_food_need.value",
                },
                {
                    type: "MUTATE",
                    target: "self.state.cycle_cost_req_food_timer.value",
                    op: "SET",
                    value: 0,
                },
            ],
        });
    });

    it("builds the full above-limit (capped) request rule without a sink (deep-equal)", () => {
        const [, above] = createCycleCostRequestRules({
            ...baseParams,
            hasSink: false,
        });

        expect(above).toEqual({
            id: "sys_cycle_cost_req_cap_food",
            sortKey: "sys_052",
            conditions: [
                {
                    id: "timer_ready",
                    sortKey: "0",
                    tokens: [
                        {
                            t: "ref",
                            v: "self.state.cycle_cost_req_food_timer.value",
                        },
                        { t: "op", v: ">=" },
                        { t: "val", v: 2 },
                    ],
                },
                {
                    id: "need_above_min",
                    sortKey: "1",
                    tokens: [
                        {
                            t: "ref",
                            v: "self.state.cycle_cost_req_food_need.value",
                        },
                        { t: "op", v: ">=" },
                        { t: "val", v: 0.01 },
                    ],
                },
                {
                    // above-limit "check" uses op ">" instead of "<="
                    id: "need_check",
                    sortKey: "2",
                    tokens: [
                        {
                            t: "ref",
                            v: "self.state.cycle_cost_req_food_need.value",
                        },
                        { t: "op", v: ">" },
                        {
                            t: "ref",
                            v: "self.state.cycle_cost_req_food_limit.value",
                        },
                    ],
                },
            ],
            actions: [
                {
                    type: "TRANSFER",
                    source: "tag:storage:food",
                    target: "self",
                    resource: "food",
                    // capped rule transfers only the limit amount
                    amount: "self.state.cycle_cost_req_food_limit.value",
                },
                {
                    type: "MUTATE",
                    target: "self.state.cycle_cost_req_food_timer.value",
                    op: "SET",
                    value: 0,
                },
            ],
        });
    });

    it("appends the throttle_active condition to BOTH rules when hasSink is true", () => {
        const rules = createCycleCostRequestRules({
            ...baseParams,
            hasSink: true,
        });

        const throttleCondition = {
            id: "throttle_active",
            sortKey: "3",
            tokens: [
                { t: "ref", v: "self.powerSink.throttle" },
                { t: "op", v: ">" },
                { t: "val", v: 0 },
            ],
        };

        for (const rule of rules) {
            expect(rule.conditions).toHaveLength(4);
            expect(rule.conditions[3]).toEqual(throttleCondition);
        }
    });

    it("omits the throttle_active condition from both rules when hasSink is false", () => {
        const rules = createCycleCostRequestRules({
            ...baseParams,
            hasSink: false,
        });

        for (const rule of rules) {
            expect(rule.conditions).toHaveLength(3);
            expect(
                rule.conditions.some((c) => c.id === "throttle_active"),
            ).toBe(false);
        }
    });

    it("interpolates the resource name into ids, transfer source, and resource fields", () => {
        const [below, above] = createCycleCostRequestRules({
            ...baseParams,
            resource: "ore",
            needRef: "need_ore",
            limitRef: "limit_ore",
            timerKey: "timer_ore",
        });

        expect(below.id).toBe("sys_cycle_cost_req_ore");
        expect(above.id).toBe("sys_cycle_cost_req_cap_ore");
        const belowTransfer = below.actions[0] as Record<string, unknown>;
        expect(belowTransfer.source).toBe("tag:storage:ore");
        expect(belowTransfer.resource).toBe("ore");
    });
});
