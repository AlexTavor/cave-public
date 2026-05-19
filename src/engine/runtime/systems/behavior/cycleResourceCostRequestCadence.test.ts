import { describe, expect, it } from "vitest";
import { Snapshot } from "../../Snapshot";
import { RuntimeCommandType } from "../../types";
import { BehaviorSystem } from "../BehaviorSystem";
import { createImpulseConfig } from "../../../test/factories";
import { ImpulseEngine } from "../../../physics/impulse/ImpulseEngine";
import { createCycleCostRequestRules } from "../../../compiler/abilities/cycleResourceCostRequestRules";

const run = (overrides: Partial<any> = {}) => {
    const commands: any[] = [];
    const entity = {
        id: "forge",
        powerSink: {
            throttle: 1,
            baseDemand: { body: 0 },
            maxDemand: { body: 0 },
            allocatedDraw: { body: 0 },
            drawFraction: {},
            efficiency: 1,
            status: "nominal",
            ...overrides.powerSink,
        },
        behavior: {
            rules: createCycleCostRequestRules({
                resource: "food",
                needRef: "self.state.cycle_cost_req_food_need.value",
                limitRef: "self.state.cycle_cost_req_food_limit.value",
                timerKey: "cycle_cost_req_food_timer",
                requestCadenceSeconds: 2,
                hasSink: true,
            }),
        },
        state: {
            cycle_cost_req_food_timer: { value: 2 },
            cycle_cost_req_food_need: { value: 3 },
            cycle_cost_req_food_limit: { value: 8 },
            ...overrides.state,
        },
    };
    const buffer = {
        enqueue: (c: any) => commands.push(c),
        drain: () => [],
        clear: () => undefined,
        size: () => commands.length,
    } as any;
    new BehaviorSystem().tick(
        new Snapshot(
            [
                { id: "sys_world", state: {} } as any,
                {
                    id: "store",
                    tags: ["storage:food"],
                    state: { food: { value: 50 } },
                } as any,
                entity,
            ],
            new ImpulseEngine(createImpulseConfig()),
        ),
        buffer,
        20,
    );
    return commands.find(
        (command) => command.type === RuntimeCommandType.TRANSFER_ASSETS,
    );
};

describe("cycle resource cost request cadence", () => {
    it("does not request before cadence is ready", () => {
        expect(
            run({ state: { cycle_cost_req_food_timer: { value: 1.5 } } }),
        ).toBeUndefined();
    });

    it("requests exact need when need is within the limit", () => {
        expect(run()?.payload.payload.food).toBe(3);
    });

    it("requests the capped limit when need exceeds it", () => {
        expect(
            run({ state: { cycle_cost_req_food_need: { value: 12 } } })?.payload
                .payload.food,
        ).toBe(8);
    });

    it("blocks requests when throttle is zero", () => {
        expect(run({ powerSink: { throttle: 0 } })).toBeUndefined();
    });

    it("uses the throttled request limit deterministically", () => {
        expect(
            run({
                powerSink: { throttle: 0.5 },
                state: {
                    cycle_cost_req_food_need: { value: 12 },
                    cycle_cost_req_food_limit: { value: 4 },
                },
            })?.payload.payload.food,
        ).toBe(4);
    });
});
