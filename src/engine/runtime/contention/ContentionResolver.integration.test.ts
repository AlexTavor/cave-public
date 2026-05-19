import { describe, expect, it } from "vitest";
import type { ModuleCartridge } from "../../../data/schemas/module";
import { DEFAULT_GAME_CONFIG } from "../../../data/schemas/game/config";
import { DEFAULT_IMPULSE_CONFIG } from "../../../data/schemas/physics";
import { DEFAULT_VEIN_CONFIG } from "../../../data/schemas/assets";
import { createGameRuntime } from "../createGameRuntime";
import { LOGIC_STEP_MS } from "../runtimeConstants";

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

describe("ContentionResolver integration", () => {
    it("prioritizes high-xp worker for scarce food transfers", () => {
        const cartridge = makeModule();
        (cartridge as any).blueprints.sys_world = {
            id: "sys_world",
            label: "World",
            tags: ["sys_world"],
            components: {},
            settings: {
                contention: [
                    { resource: "food", sortBy: "body.xp", direction: "DESC" },
                ],
            },
        };

        const runtime = createGameRuntime(cartridge, "seed");
        const world = runtime.getEntity("sys_world") as any;
        world.blueprintId = "sys_world";
        world.state.tutorial_mode = { value: 0, visible: false };
        world.state.food = { value: 1, max: 200, visible: true };

        const behavior = {
            rules: [
                {
                    id: "eat",
                    sortKey: "sk-eat",
                    conditions: [
                        {
                            id: "c",
                            sortKey: "sk-c",
                            tokens: [{ t: "val", v: 1 }],
                        },
                    ],
                    actions: [
                        {
                            type: "TRANSFER",
                            source: "sys_world",
                            target: "self",
                            resource: "food",
                            amount: 1,
                        },
                    ],
                },
            ],
        };

        runtime.addEntity({
            id: "worker_a",
            body: { xp: 100 },
            state: { food: { value: 0, max: 1 } },
            behavior,
        });
        runtime.addEntity({
            id: "worker_b",
            body: { xp: 0 },
            state: { food: { value: 0, max: 1 } },
            behavior,
        });

        runtime.tick(LOGIC_STEP_MS);
        runtime.tick(LOGIC_STEP_MS);

        const pending = runtime
            .getWorld()
            .entities.filter((entry: any) =>
                entry.tags?.includes("pending_transfer"),
            );

        expect(world.state.food.value).toBe(0);
        expect(pending).toHaveLength(1);
        expect((pending[0] as any).transfer?.sourceId).toBe("sys_world");
        expect((pending[0] as any).transfer?.targetId).toBe("worker_a");
    });
});

