import { describe, it, expect } from "vitest";
import { SpawnHandler } from "./SpawnHandler";
import { RuntimeCommandType } from "../types";
import { makeHandlerContext } from "./handlerTestUtils";
import { createBlueprint, createCartridge } from "../../test/factories";

describe("SpawnHandler Reference Isolation", () => {
    it("ensures multiple spawns from the same blueprint have distinct component references", () => {
        const handler = new SpawnHandler();
        const cartridge = createCartridge("core.json", {
            blueprints: {
                // A blueprint with a nested object (state) to test deep cloning
                worker: createBlueprint("worker", {
                    components: {
                        state: {
                            energy: { value: 100, visible: true },
                        },
                        body: {
                            attributes: { body: 1, mind: 1, social: 1 },
                        } as any,
                    },
                }),
            },
        });
        const context = makeHandlerContext(cartridge);

        // Spawn first entity
        handler.handle(
            {
                type: RuntimeCommandType.SPAWN,
                payload: { blueprintId: "worker", id: "worker_1" },
            },
            context,
        );

        // Spawn second entity
        handler.handle(
            {
                type: RuntimeCommandType.SPAWN,
                payload: { blueprintId: "worker", id: "worker_2" },
            },
            context,
        );

        const worker1 = context.world.entities.find((e) => e.id === "worker_1");
        const worker2 = context.world.entities.find((e) => e.id === "worker_2");

        if (!worker1 || !worker2) throw new Error("Workers not spawned");

        // 1. Verify they look the same initially
        expect((worker1.state as any).energy.value).toBe(100);
        expect((worker2.state as any).energy.value).toBe(100);

        // 2. Verify References are DIFFERENT
        expect(worker1.state).not.toBe(worker2.state);
        expect(worker1.body).not.toBe(worker2.body);

        // 3. Verify Mutation Isolation
        // Mutate worker 1
        (worker1.state as any).energy.value = 50;

        // Worker 2 should remain unchanged
        expect((worker2.state as any).energy.value).toBe(100);
    });
});
