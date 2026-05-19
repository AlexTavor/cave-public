import { describe, expect, it } from "vitest";
import { createCartridge } from "../test/factories";
import { createGameRuntime } from "./createGameRuntime";
import { LOGIC_STEP_MS } from "./runtimeConstants";

const countPendingTransfers = (runtime: ReturnType<typeof createGameRuntime>) =>
    runtime
        .getWorld()
        .entities.filter((entity) => entity.tags?.includes("pending_transfer"))
        .length;

describe("elastic cave capacity integration", () => {
    it("applies state max mutations without changing current value", () => {
        const runtime = createGameRuntime(createCartridge("core.json"), "seed");
        runtime.addEntity({
            id: "entity_src",
            state: { food: { value: 100, max: 100 } },
            behavior: {
                rules: [
                    {
                        id: "b1",
                        sortKey: "sk_b1",
                        conditions: [
                            {
                                id: "c1",
                                sortKey: "0",
                                tokens: [{ t: "val", v: 1 }],
                            },
                        ],
                        actions: [
                            {
                                type: "MUTATE",
                                target: "self.state.food.max",
                                op: "SET",
                                value: 200,
                            },
                        ],
                    },
                ],
            },
        });

        runtime.tick(LOGIC_STEP_MS * 2);
        expect(
            (runtime.getEntity("entity_src") as any).state.food,
        ).toMatchObject({
            value: 100,
            max: 200,
        });
    });

    it("grows cave food max and resumes world auto-request transfers", () => {
        const runtime = createGameRuntime(createCartridge("core.json"), "seed");
        const world = runtime.getEntity("sys_world") as any;

        world.state.food.value = 0;
        world.state.auto_req_food_timer_0.value = 1;
        world.state.population = { value: 2 };
        runtime.addEntity({
            id: "granary",
            tags: ["storage:food"],
            state: {
                food: {
                    value: 500,
                    max: 500,
                    allowWithdraw: true,
                    priority: 1,
                },
            },
        });

        runtime.tick(LOGIC_STEP_MS * 4);
        expect(world.state.food.max).toBe(200);
        expect(countPendingTransfers(runtime)).toBe(1);
    });
});
