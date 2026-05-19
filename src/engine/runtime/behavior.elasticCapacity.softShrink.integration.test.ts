import { describe, expect, it } from "vitest";
import { createCartridge } from "../test/factories";
import { createGameRuntime } from "./createGameRuntime";
import { LOGIC_STEP_MS } from "./runtimeConstants";

const makeRuntime = () => {
    const runtime = createGameRuntime(createCartridge("core.json"), "seed");
    runtime.addEntity({
        id: "granary",
        tags: ["storage:food"],
        state: {
            food: { value: 500, max: 500, allowWithdraw: true, priority: 1 },
        },
    });
    return runtime;
};

const primeShrinkingFood = (runtime: ReturnType<typeof createGameRuntime>) => {
    const world = runtime.getEntity("sys_world") as any;
    world.state.food.value = 250;
    world.state.food.max = 300;
    world.state.auto_req_food_timer_0.value = 1;
    world.state.population = { value: 1 };
    return world;
};

const getPendingFoodTransfers = (
    runtime: ReturnType<typeof createGameRuntime>,
) =>
    runtime
        .getWorld()
        .entities.filter((entity) => entity.tags?.includes("pending_transfer"));

describe("elastic cave capacity soft shrink", () => {
    it("shrinks cave food max without consuming surplus or refilling", () => {
        const runtime = makeRuntime();
        const world = primeShrinkingFood(runtime);

        runtime.tick(LOGIC_STEP_MS * 4);
        runtime.tick(LOGIC_STEP_MS * 4);

        expect(world.state.food).toMatchObject({ value: 250, max: 100 });
        expect(getPendingFoodTransfers(runtime)).toHaveLength(0);
    });

    it("resumes food refill after surplus drops below the live target", () => {
        const runtime = makeRuntime();
        const world = primeShrinkingFood(runtime);

        runtime.tick(LOGIC_STEP_MS * 4);
        runtime.tick(LOGIC_STEP_MS * 4);
        world.state.food.value = 90;

        runtime.tick(LOGIC_STEP_MS * 4);

        expect(world.state.food.max).toBe(100);
        expect(getPendingFoodTransfers(runtime)).toEqual([
            expect.objectContaining({
                transfer: expect.objectContaining({
                    sourceId: "granary",
                    targetId: "sys_world",
                }),
            }),
        ]);
    });
});
