import { describe, it, expect } from "vitest";
import { SpawnHandler } from "./SpawnHandler";
import { RuntimeCommandType } from "../types";
import { makeHandlerContext } from "./handlerTestUtils";
import { createBlueprint, createCartridge } from "../../test/factories";

describe("SpawnHandler flyweight", () => {
    it("spawns only stateful components and keeps definition components out", () => {
        const handler = new SpawnHandler();
        const cartridge = createCartridge("core.json", {
            blueprints: {
                worker: createBlueprint("worker", {
                    components: {
                        state: { energy: { value: 10, visible: true } },
                        behavior: { rules: [] } as any,
                        passiveEffects: [
                            {
                                op: "ADD",
                                target: "self.state.energy.value",
                                value: 1,
                            },
                        ] as any,
                    },
                }),
            },
        });
        const context = makeHandlerContext(cartridge);

        handler.handle(
            {
                type: RuntimeCommandType.SPAWN,
                payload: { blueprintId: "worker", id: "worker_1" },
            },
            context,
        );

        const spawned = context.world.entities[0] as any;
        expect(spawned.state?.energy?.value).toBe(10);
        expect(spawned.behavior).toBeUndefined();
        expect(spawned.passiveEffects).toBeUndefined();
        expect(spawned.blueprintId).toBe("worker");
    });
});
