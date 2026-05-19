import { describe, expect, it } from "vitest";
import { createCartridge } from "../test/factories";
import { CommandsManager } from "./CommandsManager";
import { Runtime } from "./Runtime";
import { hydrateRuntime } from "./persistence/hydrateRuntime";

const makeRuntime = (seed = "seed-1") =>
    new Runtime(createCartridge("test"), seed, new CommandsManager());

describe("Runtime worldSeed", () => {
    it("seeds sys_world.state.worldSeed from the runtime seed", () => {
        const runtime = makeRuntime();
        const world = runtime.getEntity("sys_world") as any;
        expect(world?.state?.worldSeed).toEqual({
            value: "seed-1",
            visible: false,
        });
        runtime.reset();
        expect(
            (runtime.getEntity("sys_world") as any)?.state?.worldSeed?.value,
        ).toBe("seed-1");
    });

    it("backfills worldSeed when hydrating older saves", () => {
        const runtime = makeRuntime("seed-2");
        hydrateRuntime(runtime, {
            metadata: {
                version: "2",
                timestamp: 1,
                label: "save",
                seed: "seed-2",
            },
            state: {
                tick: 0,
                timeScale: 1,
                entities: [{ id: "sys_world", state: {} } as any],
                physics: {},
                systems: {
                    automation: {
                        activeCount: 0,
                        nextEventMs: null,
                        nextCommand: null,
                    },
                },
            },
        });
        expect(
            (runtime.getEntity("sys_world") as any)?.state?.worldSeed?.value,
        ).toBe("seed-2");
    });
});
