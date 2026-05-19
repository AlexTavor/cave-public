import { describe, expect, it } from "vitest";
import { createCartridge } from "../../test/factories";
import { CommandsManager } from "../CommandsManager";
import { Runtime } from "../Runtime";
import { hydrateRuntime } from "./hydrateRuntime";
import { serializeFlyweightEntity } from "./flyweightPersistence";

const makeRuntime = () =>
    new Runtime(
        createCartridge("core", {
            blueprints: {
                explore: {
                    id: "explore",
                    label: "Explore",
                    components: {
                        state: {
                            cycle: {
                                value: 0,
                                max: 500,
                                visible: true,
                                scaleOnMaxChange: true,
                            },
                            cycle_count: { value: 1, visible: false },
                        },
                    },
                },
            } as any,
        }),
        "seed",
        new CommandsManager(),
    );

describe("flyweightPersistence scaleOnMaxChange", () => {
    it("round-trips scaled cycle max for blueprint-backed entries", () => {
        const source = makeRuntime();
        source.addEntity({
            id: "explore-1",
            blueprintId: "explore",
            state: {
                cycle: {
                    value: 1000,
                    max: 11000,
                    visible: true,
                    scaleOnMaxChange: true,
                },
                cycle_count: { value: 22, visible: false },
            },
        } as any);

        const savedEntity = serializeFlyweightEntity(
            source,
            source.getEntity("explore-1") as any,
        );

        expect(savedEntity).toMatchObject({
            state: { cycle: { value: 1000, max: 11000 } },
        });

        const target = makeRuntime();
        hydrateRuntime(target, {
            metadata: {
                version: "1",
                timestamp: 1,
                label: "save",
                seed: "seed",
            },
            state: {
                tick: 0,
                timeScale: 1,
                entities: [savedEntity as any],
                physics: {},
                systems: {
                    automation: {
                        activeCount: 0,
                        nextEventMs: null,
                        nextCommand: null,
                    },
                },
            },
        } as any);

        expect(
            (target.getEntity("explore-1") as any).state.cycle,
        ).toMatchObject({ value: 1000, max: 11000, scaleOnMaxChange: true });
    });
});
