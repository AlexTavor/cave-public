import { describe, it, expect } from "vitest";
import type { ModuleCartridge } from "../../data/schemas/module";
import { DEFAULT_GAME_CONFIG } from "../../data/schemas/game/config";
import { DEFAULT_IMPULSE_CONFIG } from "../../data/schemas/physics";
import { DEFAULT_VEIN_CONFIG } from "../../data/schemas/assets";
import { createGameRuntime } from "./createGameRuntime";
import type { Runtime } from "./Runtime";

const makeModule = (): ModuleCartridge => ({
    metadata: { id: "core.json", name: "Core", version: "0.0.1" },
    blueprints: {},
    assets: {
        displays: {},
        icons: {},
        resources: {},
        styles: {},
        traits: {},
        settings: {
            impulse: DEFAULT_IMPULSE_CONFIG,
            game_config: DEFAULT_GAME_CONFIG,
            vein_network: DEFAULT_VEIN_CONFIG,
        },
    },
});

const getWorldEntity = (runtime: Runtime): any =>
    runtime.getWorld().entities.find((e) => e.id === "sys_world");

const getGlobal = (runtime: Runtime, key: string): number => {
    const worldEntity = getWorldEntity(runtime);
    const entry = worldEntity?.state?.[key];
    return typeof entry?.value === "number" ? entry.value : 0;
};

const getStateValue = (runtime: Runtime, id: string, key: string): number => {
    const entity = runtime.getWorld().entities.find((e) => e.id === id) as any;
    const entry = entity?.state?.[key];
    return typeof entry?.value === "number" ? entry.value : 0;
};

describe("Smoke: behavior system scenarios", () => {
    it("updates global values from behavior rules", () => {
        const runtime = createGameRuntime(makeModule(), "seed");
        const world = getWorldEntity(runtime);

        world.behavior = {
            rules: [
                {
                    id: "b1",
                    sortKey: "sk_b1",
                    conditions: [
                        {
                            id: "c1",
                            sortKey: "sk_c1",
                            tokens: [{ t: "val", v: 1 }],
                        },
                    ],
                    actions: [
                        {
                            type: "MUTATE",
                            target: "global.total",
                            op: "SET",
                            value: 1,
                        },
                    ],
                },
            ],
        };

        runtime.tick(40);

        expect(getGlobal(runtime, "total")).toBe(1);
    });

    it("updates entity state from behavior rules", () => {
        const runtime = createGameRuntime(makeModule(), "seed");

        runtime.addEntity({
            id: "e1",
            state: { hp: { value: 0 } },
            behavior: {
                rules: [
                    {
                        id: "b2",
                        sortKey: "sk_b2",
                        conditions: [
                            {
                                id: "c2",
                                sortKey: "sk_c2",
                                tokens: [{ t: "val", v: 1 }],
                            },
                        ],
                        actions: [
                            {
                                type: "MUTATE",
                                target: "self.state.hp",
                                op: "ADD",
                                value: 2,
                            },
                        ],
                    },
                ],
            },
        });

        runtime.tick(40);

        expect(getStateValue(runtime, "e1", "hp")).toBe(2);
    });
});

