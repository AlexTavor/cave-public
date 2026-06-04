import { describe, expect, it } from "vitest";
import { initializeWorldState } from "./HeadlessRunner.utils";
import { createBlueprint, createCartridge } from "../test/factories";
import { createGameRuntime } from "../runtime/createGameRuntime";
import type { Runtime } from "../runtime/Runtime";

const sysWorldState = (runtime: Runtime) =>
    (
        runtime.getWorld().entities.find((e) => e.id === "sys_world") as
            | { state?: Record<string, { value?: unknown }> }
            | undefined
    )?.state;

describe("initializeWorldState", () => {
    it("re-establishes the run seed after replacing sys_world.state", () => {
        // sys_world blueprint carries authored state (food) but no worldSeed —
        // exactly the shape that made the wholesale state-replace drop the seed.
        const cartridge = createCartridge("seed-test", {
            blueprints: {
                sys_world: createBlueprint("sys_world", {
                    components: {
                        state: { food: { value: 100, visible: true } },
                    },
                }),
            },
        });
        const runtime = createGameRuntime(cartridge, "my-seed");

        initializeWorldState(runtime, cartridge);

        const state = sysWorldState(runtime);
        // The authored blueprint state is applied…
        expect(state?.food?.value).toBe(100);
        // …and the run seed survives (would be the "world" fallback without the fix).
        expect(state?.worldSeed?.value).toBe("my-seed");
    });

    it("leaves the seed in place when the blueprint has no state to apply", () => {
        const cartridge = createCartridge("seed-test", {
            blueprints: { sys_world: createBlueprint("sys_world") },
        });
        const runtime = createGameRuntime(cartridge, "other-seed");

        initializeWorldState(runtime, cartridge);

        expect(sysWorldState(runtime)?.worldSeed?.value).toBe("other-seed");
    });
});
