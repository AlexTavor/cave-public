import { describe, expect, it } from "vitest";
import { buildAutoReqTransferRule } from "./autoRequestRuleBuilder";
import type { BehaviorRule } from "../../../data/schemas/behavior";

const makeTimerCondition = (): BehaviorRule["conditions"][number] => ({
    id: "timer_ready",
    sortKey: "0",
    tokens: [
        { t: "ref", v: "self.state.timer.value" },
        { t: "op", v: ">=" },
        { t: "val", v: 1 },
    ],
});

const makeParams = () => ({
    id: "sys_auto_req_food_xfer_0",
    sortKey: "sys_051",
    timerCondition: makeTimerCondition(),
    needRef: "self.state.auto_req_food_need_0.value",
    needOp: "<=",
    needThreshold: 50,
    minReq: 1,
    source: "tag:storage:food",
    resource: "food",
    amount: "self.state.auto_req_food_need_0.value",
    timerKey: "auto_req_food_timer_0",
});

describe("buildAutoReqTransferRule", () => {
    it("transfer uses physics – no isImmediate flag", () => {
        const rule = buildAutoReqTransferRule(makeParams());

        const transferAction = rule.actions[0];
        expect(transferAction).toMatchObject({
            type: "TRANSFER",
            source: "tag:storage:food",
            target: "self",
            resource: "food",
        });
        expect(transferAction).not.toHaveProperty("isImmediate");
    });

    it("resets timer to 0 after transfer", () => {
        const rule = buildAutoReqTransferRule(makeParams());

        const resetAction = rule.actions.find(
            (a) => a.type === "MUTATE" && (a as any).op === "SET",
        );
        expect(resetAction).toMatchObject({
            target: "self.state.auto_req_food_timer_0.value",
            value: 0,
        });
    });
});
