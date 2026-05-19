import { describe, expect, it } from "vitest";
import {
    buildWorldAutoRequestRules,
    buildWorldAutoRequestState,
} from "./worldRuleBuilders";

describe("worldRuleBuilders", () => {
    it("adds demand-window state keys for world auto-request", () => {
        expect(
            buildWorldAutoRequestState("food", 0, {
                baseDemandPerSecond: 0,
                bodyDemandPerBodyPerSecond: 1,
                windowSeconds: 100,
                minCapacity: 100,
            }),
        ).toMatchObject({
            auto_req_food_base_demand_per_s_0: { value: 0, visible: false },
            auto_req_food_body_demand_per_body_per_s_0: {
                value: 1,
                visible: false,
            },
            auto_req_food_window_s_0: { value: 100, visible: false },
            auto_req_food_min_capacity_0: { value: 100, visible: false },
            auto_req_food_target_0: { value: 0, visible: false },
        });
    });

    it("computes target and need from demand window and population", () => {
        const rule = buildWorldAutoRequestRules("food", 0)[0];
        expect(rule.actions).toEqual([
            expect.objectContaining({
                target: "self.state.auto_req_food_target_0.value",
                value: "(self.state.auto_req_food_base_demand_per_s_0.value + (self.state.auto_req_food_body_demand_per_body_per_s_0.value * global.population)) * self.state.auto_req_food_window_s_0.value",
            }),
            expect.objectContaining({
                target: "self.state.auto_req_food_need_0.value",
                value: "self.state.auto_req_food_target_0.value - self.state.food.value",
            }),
        ]);
    });

    it("builds floor, target, and transfer rules in order", () => {
        const rules = buildWorldAutoRequestRules("food", 0);
        expect(rules.map((rule) => rule.id)).toEqual([
            "sys_auto_req_food_need_0",
            "sys_auto_req_food_set_floor_max_0",
            "sys_auto_req_food_set_target_max_0",
            "sys_auto_req_food_xfer_0",
        ]);
        expect(rules[1]).toMatchObject({
            actions: [
                {
                    target: "self.state.food.max",
                    value: "self.state.auto_req_food_min_capacity_0.value",
                },
            ],
        });
        expect(rules[2]).toMatchObject({
            actions: [
                {
                    target: "self.state.food.max",
                    value: "self.state.auto_req_food_target_0.value",
                },
            ],
        });
    });

    it("builds non-immediate transfers from generic storage", () => {
        const transfer = buildWorldAutoRequestRules("food", 0)[3].actions[0];
        expect(transfer).toMatchObject({
            type: "TRANSFER",
            source: "tag:storage:food",
            target: "self",
            amount: "self.state.auto_req_food_need_0.value",
        });
        expect(transfer).not.toHaveProperty("isImmediate");
    });
});
