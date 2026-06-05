import { describe, expect, it } from "vitest";
import {
    createCycleCostCondition,
    createCycleCostConsumeRule,
    createCycleCostPowerGateRule,
} from "./cycleResourceCostRuleFactories";

describe("createCycleCostCondition", () => {
    it("builds the full has-cycle-cost condition (deep-equal)", () => {
        const condition = createCycleCostCondition(
            "food",
            "self.state.vals_cycle_cost_total_food.value",
            0,
        );

        expect(condition).toEqual({
            id: "has_cycle_cost_food_0",
            // sortKey is `${index + 1}` -> 0 + 1 -> "1"
            sortKey: "1",
            tokens: [
                { t: "ref", v: "self.state.food.value" },
                { t: "op", v: ">=" },
                { t: "ref", v: "self.state.vals_cycle_cost_total_food.value" },
            ],
            compiled: {
                ">": [
                    { "+": [{ var: "self.state.food.value" }, 1] },
                    { var: "self.state.vals_cycle_cost_total_food.value" },
                ],
            },
        });
    });

    it("uses index+1 for the sortKey and index in the id (arithmetic operator + string interpolation)", () => {
        const condition = createCycleCostCondition("coal", "amt_ref", 4);

        // index 4 -> id suffix "4", sortKey "5" (4 + 1). A swap to -, *, /
        // would yield "3", "16", "1" respectively; assert the exact value.
        expect(condition.id).toBe("has_cycle_cost_coal_4");
        expect(condition.sortKey).toBe("5");
    });
});

describe("createCycleCostConsumeRule", () => {
    it("builds the full consume rule with cycle-complete + cost conditions (deep-equal)", () => {
        const rule = createCycleCostConsumeRule(
            "food",
            "self.state.vals_cycle_cost_total_food.value",
        );

        expect(rule).toEqual({
            id: "sys_cycle_cost_consume_food",
            sortKey: "sys_997",
            conditions: [
                {
                    id: "cycle_complete",
                    sortKey: "0",
                    tokens: [
                        { t: "ref", v: "self.state.cycle.value" },
                        { t: "op", v: ">=" },
                        { t: "ref", v: "self.state.cycle.max" },
                    ],
                },
                {
                    id: "cycle_has_max",
                    sortKey: "1",
                    tokens: [
                        { t: "ref", v: "self.state.cycle.max" },
                        { t: "op", v: ">" },
                        { t: "val", v: 0 },
                    ],
                },
                {
                    id: "has_cycle_cost_food_0",
                    sortKey: "1",
                    tokens: [
                        { t: "ref", v: "self.state.food.value" },
                        { t: "op", v: ">=" },
                        {
                            t: "ref",
                            v: "self.state.vals_cycle_cost_total_food.value",
                        },
                    ],
                    compiled: {
                        ">": [
                            { "+": [{ var: "self.state.food.value" }, 1] },
                            {
                                var: "self.state.vals_cycle_cost_total_food.value",
                            },
                        ],
                    },
                },
            ],
            actions: [
                {
                    type: "MUTATE",
                    target: "self.state.food.value",
                    op: "SUB",
                    value: "self.state.vals_cycle_cost_total_food.value",
                },
            ],
        });
    });
});

describe("createCycleCostPowerGateRule", () => {
    it("builds the full power-gate rule with one MUTATE action per demand attribute (deep-equal)", () => {
        const rule = createCycleCostPowerGateRule(
            "food",
            "self.state.vals_cycle_cost_total_food.value",
            ["body", "mind", "social"],
        );

        expect(rule).toEqual({
            id: "sys_cycle_cost_power_gate_food",
            sortKey: "sys_000",
            conditions: [
                {
                    id: "missing_cycle_cost_food",
                    sortKey: "0",
                    tokens: [
                        { t: "ref", v: "self.state.food.value" },
                        { t: "op", v: "<" },
                        {
                            t: "ref",
                            v: "self.state.vals_cycle_cost_total_food.value",
                        },
                    ],
                    compiled: {
                        "<=": [
                            { "+": [{ var: "self.state.food.value" }, 1] },
                            {
                                var: "self.state.vals_cycle_cost_total_food.value",
                            },
                        ],
                    },
                },
            ],
            actions: [
                {
                    type: "MUTATE",
                    target: "self.powerSink.baseDemand.body",
                    op: "SET",
                    value: 0,
                },
                {
                    type: "MUTATE",
                    target: "self.powerSink.baseDemand.mind",
                    op: "SET",
                    value: 0,
                },
                {
                    type: "MUTATE",
                    target: "self.powerSink.baseDemand.social",
                    op: "SET",
                    value: 0,
                },
            ],
        });
    });

    it("emits zero actions for an empty demandAttributes array (map over [])", () => {
        const rule = createCycleCostPowerGateRule("coal", "coal_amt", []);

        expect(rule.actions).toEqual([]);
        expect(rule.id).toBe("sys_cycle_cost_power_gate_coal");
    });

    it("emits exactly one action for a single demand attribute", () => {
        const rule = createCycleCostPowerGateRule("coal", "coal_amt", ["mind"]);

        expect(rule.actions).toEqual([
            {
                type: "MUTATE",
                target: "self.powerSink.baseDemand.mind",
                op: "SET",
                value: 0,
            },
        ]);
    });
});
