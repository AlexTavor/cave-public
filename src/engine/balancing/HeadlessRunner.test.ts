import { describe, it, expect } from "vitest";
import { HeadlessRunner } from "./HeadlessRunner";
import { createBlueprint, createCartridge } from "../test/factories";
import { createGameRuntime } from "../runtime/createGameRuntime";
import { CensusSystem } from "../../game/systems/CensusSystem";

const defaultFactory = (cartridge: any, seed: string) =>
    createGameRuntime(cartridge, seed);

describe("HeadlessRunner", () => {
    it("captures periodic snapshots during simulation", async () => {
        const runner = new HeadlessRunner();
        const result = await runner.run({
            ticks: 120,
            seed: "seed",
            cartridge: createCartridge("core.json"),
            runtimeFactory: defaultFactory,
        });

        expect(result.status).toBe("completed");
        expect(result.history.length).toBe(2);
        expect(result.history[0].tick).toBe(60);
        expect(result.history[1].tick).toBe(120);
    });

    it("spawns initial population and tracks world population", async () => {
        const cartridge = createCartridge("test", {
            blueprints: {
                sys_world: createBlueprint("sys_world", {
                    components: {
                        state: {
                            population: { value: 0, visible: true },
                        },
                    },
                }),
                worker: createBlueprint("worker", {
                    components: {
                        body: { health: 100 } as any,
                    },
                }),
            },
        });

        const runner = new HeadlessRunner();
        const result = await runner.run({
            ticks: 120,
            seed: "test",
            cartridge,
            initialSpawn: {
                blueprintId: "worker",
                count: 10,
            },
            runtimeFactory: (c, s) => {
                const runtime = createGameRuntime(c, s);
                runtime.registerSystem(new CensusSystem());
                return runtime;
            },
        });

        const snapshot = result.history.find((step) => step.tick === 60);

        expect(snapshot).toBeDefined();
        expect(snapshot?.population).toBe(10);
    });
});
